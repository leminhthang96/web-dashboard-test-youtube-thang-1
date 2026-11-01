// Usage: node scripts/seed-rbac.cjs [--apply]
// Run locally with the existing Firebase Admin configuration; never commit keys.
const fs = require("node:fs")
const { initializeApp, cert } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
require("@next/env").loadEnvConfig(process.cwd())

const catalog = require("../src/modules/users/services/data/roles.json")
// Explicitly requested assignments for this project.
const assignments = [
  ["admin@claudecode.ai", "role-admin"],
  ["leminhthang78962@gmail.com", "role-accounting"],
  ["minhthangai@gmail.com", "role-staffs"],
]

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  if (projectId !== "dashboard-test--thang-1")
    throw new Error("Unexpected Firebase project")
  initializeApp({
    projectId,
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  })
  const db = getFirestore()
  const targets = await Promise.all(
    assignments.map(async ([email, roleId]) => {
      const user = await getAuth().getUserByEmail(email)
      return { email, uid: user.uid, roleId, id: `ur-${user.uid}-${roleId}` }
    })
  )
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify(
        { projectId, roles: catalog, assignments: targets },
        null,
        2
      )
    )
    return
  }
  const [oldRoles, oldAssignments] = await Promise.all([
    db.collection("roles").get(),
    db.collection("users_roles").get(),
  ])
  fs.mkdirSync(".cache", { recursive: true })
  const backup = `.cache/rbac-before-seed-${Date.now()}.json`
  fs.writeFileSync(
    backup,
    JSON.stringify(
      {
        projectId,
        roles: oldRoles.docs.map((d) => ({ id: d.id, data: d.data() })),
        assignments: oldAssignments.docs.map((d) => ({
          id: d.id,
          data: d.data(),
        })),
      },
      null,
      2
    )
  )
  await db.runTransaction(async (tx) => {
    const roleRefs = catalog.map((role) => db.collection("roles").doc(role.id))
    const existingRoles = await tx.getAll(...roleRefs)
    const existingAssignments = await Promise.all(
      targets.map((target) =>
        tx.get(db.collection("users_roles").where("uid", "==", target.uid))
      )
    )
    catalog.forEach((role, i) =>
      tx.set(
        roleRefs[i],
        {
          ...role,
          createdAt:
            existingRoles[i].data()?.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    )
    targets.forEach((target, i) => {
      existingAssignments[i].docs.forEach((doc) => {
        if (doc.id !== target.id) tx.delete(doc.ref)
      })
      const old = existingAssignments[i].docs.find(
        (doc) => doc.id === target.id
      )
      tx.set(db.collection("users_roles").doc(target.id), {
        id: target.id,
        uid: target.uid,
        roleId: target.roleId,
        createdAt: old?.data().createdAt ?? FieldValue.serverTimestamp(),
      })
    })
  })
  const [roles, links] = await Promise.all([
    db.collection("roles").get(),
    db.collection("users_roles").get(),
  ])
  for (const target of targets) {
    const actual = links.docs.filter((doc) => doc.data().uid === target.uid)
    if (actual.length !== 1 || actual[0].data().roleId !== target.roleId) {
      throw new Error("Assignment verification failed")
    }
  }
  console.log(
    JSON.stringify(
      {
        verified: true,
        roles: roles.docs.map((d) => ({ id: d.id, name: d.data().name })),
        assignments: targets,
        backup,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error("RBAC seed failed:", error.code || error.name)
  process.exitCode = 1
})
