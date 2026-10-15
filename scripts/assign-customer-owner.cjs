// Preview: node scripts/assign-customer-owner.cjs
// Apply:   node scripts/assign-customer-owner.cjs --apply
const { loadEnvConfig } = require("@next/env")
const { cert, initializeApp, deleteApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore } = require("firebase-admin/firestore")

loadEnvConfig(process.cwd(), true)

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== "--apply")) {
    throw new Error("Chỉ hỗ trợ --apply; bỏ cờ này để xem trước.")
  }
  const ownerId = process.env.CUSTOMER_OWNER_UID?.trim()
  if (!ownerId) throw new Error("Cần cấu hình CUSTOMER_OWNER_UID trong .env.local.")

  const env = process.env
  let credential
  if (
    env.FIREBASE_ADMIN_PROJECT_ID &&
    env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    credential = cert({
      projectId: env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    })
  } else if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    credential = cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY))
  } else {
    throw new Error("Cần cấu hình Firebase Admin trước khi gán dữ liệu cũ.")
  }

  const app = initializeApp({
    credential,
    projectId:
      env.FIREBASE_ADMIN_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  try {
    const owner = await getAuth(app).getUser(ownerId)
    if (owner.disabled) throw new Error("Tài khoản nhận khách hàng bị vô hiệu hóa.")
    const db = getFirestore(app)
    // Only legacy public submissions; never reassign another user's customers.
    const query = db.collection("customers").where("userId", "==", "")
    const count = (await query.count().get()).data().count
    console.log(`Tài khoản nhận: ${owner.uid}; số khách hàng chưa có chủ: ${count}.`)
    if (!args.includes("--apply")) {
      console.log("Chỉ xem trước. Chạy lại với --apply để cập nhật userId.")
      return
    }

    let updated = 0
    while (true) {
      const snapshot = await query.limit(400).get()
      if (snapshot.empty) break
      const batch = db.batch()
      for (const document of snapshot.docs) {
        // Abort this batch if someone changed a record after it was read.
        batch.update(document.ref, { userId: owner.uid }, {
          lastUpdateTime: document.updateTime,
        })
      }
      await batch.commit()
      updated += snapshot.size
      console.log(`Đã gán ${updated} khách hàng.`)
    }
  } finally {
    await deleteApp(app)
  }
}

main().catch((error) => {
  console.error("Không thể gán khách hàng:", error.code || error.message)
  process.exitCode = 1
})
