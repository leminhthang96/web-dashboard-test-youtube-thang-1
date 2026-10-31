import { NextResponse } from "next/server"

import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import { getAdminDb } from "@/lib/firebase/admin"
import { taskMockData } from "@/modules/tasks/services/task-mock-data"
import { isLegacySeedTask } from "@/modules/tasks/services/task-seed-data"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function DELETE() {
  const authError = await getAdminApiErrorResponse(CORS_HEADERS)
  if (authError) return authError

  try {
    const db = getAdminDb()
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
  } catch {
    return NextResponse.json(
      { success: false, message: "Không thể xóa dữ liệu mẫu cũ. Vui lòng thử lại." },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
