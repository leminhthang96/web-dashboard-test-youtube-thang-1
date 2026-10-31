import { NextResponse } from "next/server"

import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import { getAdminApp, getAdminDb } from "@/lib/firebase/admin"
import { taskMockData } from "@/modules/tasks/services/task-mock-data"
import { isLegacySeedTask } from "@/modules/tasks/services/task-seed-data"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export const runtime = "nodejs"

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function DELETE() {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const hasSplitCredentials = Boolean(
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
    )
    if (
      process.env.VERCEL &&
      !hasSplitCredentials &&
      !process.env.FIREBASE_SERVICE_ACCOUNT_KEY &&
      !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "FIREBASE_ADMIN_NOT_CONFIGURED",
          message:
            "Vercel chưa có cấu hình Firebase Admin để xóa mẫu cũ. Thêm FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY vào môi trường Production rồi Redeploy.",
        },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    const db = getAdminDb()
    const adminProjectId = getAdminApp().options.projectId
    if (
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      adminProjectId &&
      adminProjectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "FIREBASE_PROJECT_MISMATCH",
          message:
            "Firebase Admin đang trỏ sang dự án khác. Kiểm tra cấu hình trên Vercel.",
        },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    // Fixed fixture IDs only; no arbitrary IDs or collection-wide deletes.
    const references = taskMockData.map((task) =>
      db.collection("tasks").doc(task.id)
    )
    const deletedCount = await db.runTransaction(async (transaction) => {
      const documents = await transaction.getAll(...references)
      const samples = documents.filter(
        (item) => item.exists && isLegacySeedTask(item.id, item.data()!)
      )
      samples.forEach((item) => transaction.delete(item.ref))
      return samples.length
    })
    return NextResponse.json(
      { success: true, message: "Đã xóa dữ liệu mẫu cũ.", data: { deletedCount } },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "unknown"
    const permissionDenied = code === "7" || code === "permission-denied"
    // Log a stable code only; never return credentials or raw SDK errors.
    console.error("[Tasks legacy seed cleanup]", { code })
    return NextResponse.json(
      {
        success: false,
        code: permissionDenied
          ? "FIREBASE_ADMIN_PERMISSION_DENIED"
          : "FIREBASE_ADMIN_CLEANUP_FAILED",
        message: permissionDenied
          ? "Tài khoản Firebase Admin trên máy chủ chưa có quyền xóa dữ liệu Firestore. Kiểm tra quyền IAM của service account."
          : "Máy chủ không thể xóa mẫu cũ. Kiểm tra Firebase Admin trong Vercel Production (project ID, client email, private key), Redeploy và xem Logs [Tasks legacy seed cleanup].",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
