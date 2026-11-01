// Runs ONLY against a local emulator; never creates fixtures in production.
const fs = require("node:fs")
const path = require("node:path")
const { createRequire } = require("node:module")
const assert = require("node:assert/strict")
const toolsRequire = createRequire(path.resolve(".cache/rbac-tools/package.json"))
const { initializeTestEnvironment, assertSucceeds, assertFails } = toolsRequire("@firebase/rules-unit-testing")
const firebase = toolsRequire("firebase/compat/app")
toolsRequire("firebase/compat/firestore")

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:")) {
    throw new Error("A local Firestore emulator is required")
  }
  const env = await initializeTestEnvironment({
    projectId: "demo-dashboard-rbac",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  })
  try {
    await env.clearFirestore()
    const roles = { admin: "role-admin", director: "role-directors", accountant: "role-accounting", staff: "role-staffs", customer: "role-customers", otherAdmin: "role-admin" }
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      const batch = db.batch()
      for (const roleId of new Set(Object.values(roles))) batch.set(db.doc(`roles/${roleId}`), { id: roleId })
      for (const [uid, roleId] of Object.entries(roles)) batch.set(db.doc(`users_roles/ur-${uid}-${roleId}`), { uid, roleId })
      for (const collection of ["documents", "folders", "customers", "messages", "conversations", "chatUsers", "events", "eventDates", "calendars"]) {
        batch.set(db.doc(`${collection}/existing`), { title: "Existing fixture" })
      }
      batch.set(db.doc("documents/existing/attachments/file"), { name: "Attachment" })
      batch.set(db.doc("tasks/owned"), { createdBy: "admin", reporter: "otherAdmin", title: "Owned" })
      batch.set(db.doc("tasks/other"), { createdBy: "otherAdmin", reporter: "", title: "Other" })
      batch.set(db.doc("tasks/legacy"), { title: "No creator" })
      batch.set(db.doc("users/staff"), { name: "Staff" })
      await batch.commit()
    })
    const dbFor = uid => env.authenticatedContext(uid).firestore()
    for (const uid of ["admin", "director", "accountant", "staff", "customer", "no-role"]) {
      const db = dbFor(uid)
      const documentsAllowed = ["admin", "director", "accountant", "staff"].includes(uid)
      const chatAllowed = ["admin", "customer"].includes(uid)
      for (const collection of ["documents", "folders"]) {
        await (documentsAllowed ? assertSucceeds : assertFails)(db.collection(collection).get())
        await (uid === "admin" ? assertSucceeds : assertFails)(db.doc(`${collection}/write-${uid}`).set({ title: "Write" }))
      }
      await (documentsAllowed ? assertSucceeds : assertFails)(db.doc("documents/existing/attachments/file").get())
      for (const collection of ["messages", "conversations", "chatUsers"]) {
        await (chatAllowed ? assertSucceeds : assertFails)(db.collection(collection).get())
      }
      for (const collection of ["customers", "events", "eventDates", "calendars"]) {
        await (uid === "admin" ? assertSucceeds : assertFails)(db.collection(collection).get())
      }
      await assertFails(db.doc(`users_roles/ur-${uid}-role-admin`).set({ uid, roleId: "role-admin" }))
      await assertFails(db.doc("roles/role-admin").set({ name: "Spoof" }))
    }
    const admin = dbFor("admin"), other = dbFor("otherAdmin")
    await assertSucceeds(admin.collection("tasks").where("createdBy", "==", "admin").get())
    await assertSucceeds(other.collection("tasks").where("reporter", "==", "otherAdmin").get())
    await assertFails(admin.collection("tasks").get())
    await assertFails(admin.doc("tasks/other").get())
    await assertFails(admin.doc("tasks/legacy").get())
    await assertSucceeds(other.doc("tasks/owned").get())
    await assertFails(other.doc("tasks/owned").update({ title: "Reporter cannot edit" }))
    await assertFails(admin.doc("tasks/owned").update({ createdBy: "otherAdmin" }))
    await assertSucceeds(admin.runTransaction(async tx => {
      const ref = admin.doc("tasks/new-task")
      const existing = await tx.get(ref)
      assert.equal(existing.exists, false)
      tx.set(ref, { createdBy: "admin", reporter: "", title: "New" })
    }))
    await assertFails(dbFor("staff").doc("tasks/staff-task").set({ createdBy: "staff", reporter: "staff" }))
    await assertSucceeds(dbFor("staff").doc("users/staff").update({ name: "Changed" }))
    await assertFails(dbFor("staff").doc("users/staff").update({ roles: ["role-admin"], isAdmin: true }))
    await assertFails(dbFor("staff").doc("users/admin").get())
    const anonymous = env.unauthenticatedContext().firestore()
    const lead = { fullName: "Form submission", email: "test@example.com", phoneNumber: "0123456789", serviceName: "Service", userId: "", createdAt: firebase.firestore.FieldValue.serverTimestamp() }
    await assertSucceeds(anonymous.collection("customers").add(lead))
    await assertFails(anonymous.collection("customers").get())
    await assertFails(anonymous.doc("customers/existing").update({ fullName: "Changed" }))
    await assertFails(anonymous.doc("customers/existing").delete())
    await assertFails(anonymous.collection("customers").add({ ...lead, isAdmin: true }))
    await assertFails(anonymous.doc("documents/existing").get())
    await assertFails(dbFor("no-role").doc("documents/existing").get())
    // An email/display name is not an administrator assignment.
    await assertFails(env.authenticatedContext("fake", { email: "admin@claudecode.ai" }).firestore().doc("customers/existing").get())
    await env.withSecurityRulesDisabled(context => context.firestore().doc("users_roles/ur-staff-role-staffs").delete())
    await assertFails(dbFor("staff").doc("documents/existing").get())
    console.log("PASS: 5-role data matrix, no-role/anonymous denial, task RLS and create transaction, immutable creator, reporter read-only, profile/role escalation denied, public lead capture, immediate role revocation.")
  } finally {
    await env.cleanup()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
