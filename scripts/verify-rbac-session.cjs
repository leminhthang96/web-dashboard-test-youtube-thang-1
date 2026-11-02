// Local emulator only. No production sign-in or data changes.
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const assert = require("node:assert/strict")
const ts = require("typescript")
const { createRequire } = require("node:module")
const tools = createRequire(path.resolve(".cache/rbac-tools/package.json"))
const { initializeTestEnvironment } = tools("@firebase/rules-unit-testing")
const { createMockUserToken } = tools("@firebase/util")

async function main() {
  const host = process.env.FIRESTORE_EMULATOR_HOST
  if (!host?.startsWith("127.0.0.1:")) throw Error("Local emulator required")
  const projectId = "demo-dashboard-rbac"
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  })
  let networkFailure = false
  const mockToken = (uid) =>
    createMockUserToken({ sub: uid, user_id: uid }, projectId)
  async function localFetch(url, options) {
    if (networkFailure) return new Response("", { status: 503 })
    if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
      const { idToken } = JSON.parse(options.body)
      if (idToken === "invalid") return new Response("", { status: 401 })
      const claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url"))
      return Response.json({
        users: [{ localId: claims.sub, email: `${claims.sub}@example.test` }],
      })
    }
    assert.ok(
      url.startsWith(
        `https://firestore.googleapis.com/v1/projects/${projectId}/`
      )
    )
    return fetch(
      url.replace("https://firestore.googleapis.com", `http://${host}`),
      options
    )
  }
  function load(file, imports) {
    const module = { exports: {} }
    vm.runInNewContext(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      {
        module,
        exports: module.exports,
        require: (name) => {
          if (name in imports) return imports[name]
          throw Error(`Unexpected dependency ${name}`)
        },
        process: {
          env: {
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
            NEXT_PUBLIC_FIREBASE_API_KEY: "emulator-only",
          },
        },
        fetch: localFetch,
        AbortSignal,
        console: { ...console, error: () => {} },
      }
    )
    return module.exports
  }
  try {
    await env.clearFirestore()
    const matrix = {
      admin: "role-admin",
      director: "role-directors",
      accounting: "role-accounting",
      staff: "role-staffs",
      customer: "role-customers",
    }
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      const batch = db.batch()
      for (const [uid, roleId] of Object.entries(matrix)) {
        batch.set(db.doc(`roles/${roleId}`), { name: roleId })
        batch.set(db.doc(`users_roles/ur-${uid}-${roleId}`), { uid, roleId })
      }
      await batch.commit()
    })
    const permissions = load("src/lib/auth/permissions.ts", {})
    const access = load("src/lib/auth/user-access.ts", {
      "@/lib/auth/permissions": permissions,
    })
    const homes = {
      admin: "/dashboard",
      director: "/dashboard",
      accounting: "/dashboard-3",
      staff: "/documents",
      customer: "/chat",
    }
    for (const [uid, roleId] of Object.entries(matrix)) {
      const result = await access.getUserAuthorization(uid, mockToken(uid))
      assert.equal(JSON.stringify(result.roles), JSON.stringify([roleId]), uid)
      assert.equal(result.authorizationError, false)
      assert.equal(permissions.getHomePage(result), homes[uid])
    }
    const noRole = await access.getUserAuthorization(
      "unassigned",
      mockToken("unassigned")
    )
    assert.equal(noRole.roles.length, 0)
    assert.equal(noRole.authorizationError, false)
    const forbidden = await access.getUserAuthorization(
      "admin",
      mockToken("staff")
    )
    assert.equal(forbidden.authorizationError, true)
    assert.equal(forbidden.isAdmin, false)
    networkFailure = true
    const outage = await access.getUserAuthorization(
      "admin",
      mockToken("admin")
    )
    assert.equal(outage.authorizationError, true)
    assert.equal(permissions.getHomePage(outage), "/dashboard")
    assert.equal(permissions.hasAdminAccess(outage), false)
    networkFailure = false
    let config
    load("src/auth.ts", {
      "next-auth": (options) => {
        config = options
        return {}
      },
      "next-auth/providers/credentials": (options) => options,
      "@/lib/auth/user-access": access,
      "./auth.config": { authConfig: {} },
    })
    const user = await config.providers[0].authorize({
      idToken: mockToken("admin"),
    })
    assert.equal(user.isAdmin, true)
    let token = await config.callbacks.jwt({ token: {}, user })
    const session = await config.callbacks.session({
      session: { user: {} },
      token,
    })
    assert.equal(session.user.isAdmin, true)
    assert.equal(session.user.firebaseIdToken, undefined)
    const oldToken = token.firebaseIdToken
    token = await config.callbacks.jwt({
      token,
      trigger: "update",
      session: { firebaseIdToken: mockToken("staff"), roles: ["role-admin"] },
    })
    assert.equal(token.firebaseIdToken, oldToken)
    const legacy = await config.callbacks.jwt({
      token: { uid: "admin", roles: [] },
      trigger: "update",
      session: { firebaseIdToken: mockToken("admin") },
    })
    assert.equal(legacy.isAdmin, true)
    assert.equal(legacy.authorizationError, false)
    const staff = await config.callbacks.jwt({
      token: { uid: "staff", firebaseIdToken: mockToken("staff") },
      trigger: "update",
      session: { roles: ["role-admin"], isAdmin: true },
    })
    assert.equal(staff.isAdmin, false)
    await env.withSecurityRulesDisabled((context) =>
      context.firestore().doc("users_roles/ur-admin-role-admin").delete()
    )
    token = await config.callbacks.jwt({ token })
    assert.equal(token.isAdmin, false)
    assert.equal(token.roles.length, 0)
    assert.equal(token.authorizationError, false)
    console.log(
      "PASS: real REST reads under emulator Rules for all 5 roles; homepage mapping; no-role vs failure; cross-user denied; legacy-session recovery; client role spoof rejected; private token omitted from session; immediate role revocation"
    )
  } finally {
    await env.cleanup()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
