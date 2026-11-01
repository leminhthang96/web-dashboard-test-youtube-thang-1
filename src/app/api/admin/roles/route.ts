import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import { getAdminDb } from "@/lib/firebase/admin"
import catalog from "@/modules/users/services/data/roles.json"
import { roleSchema } from "@/modules/users/services/types/user-types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
const payloadSchema = roleSchema.extend({
  id: z.string().regex(/^role-[a-z0-9-]+$/),
})
const respond = (data: object, status = 200) =>
  NextResponse.json(data, { status, headers: CORS_HEADERS })

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  const denied = await getAdminApiErrorResponse(CORS_HEADERS)
  if (denied) return denied
  try {
    const snapshot = await getAdminDb().collection("roles").get()
    const roles = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? data.updatedAt,
      }
    })
    return respond({ success: true, data: roles })
  } catch {
    return respond(
      { success: false, message: "Không tải được roles từ Firestore." },
      500
    )
  }
}

async function save(request: NextRequest, update: boolean) {
  const denied = await getAdminApiErrorResponse(CORS_HEADERS)
  if (denied) return denied
  try {
    const body = await request.json()
    const db = getAdminDb()
    if (!update && body.seed === true) {
      await db.runTransaction(async (tx) => {
        const refs = catalog.map((role) => db.collection("roles").doc(role.id))
        const existing = await tx.getAll(...refs)
        catalog.forEach((role, index) =>
          tx.set(
            refs[index],
            {
              ...role,
              createdAt:
                existing[index].data()?.createdAt ??
                FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        )
      })
      return respond({ success: true, message: "Đã seed 5 roles." })
    }
    const parsed = payloadSchema.safeParse(body.role)
    if (!parsed.success)
      return respond(
        {
          success: false,
          message: "Role không hợp lệ.",
          errors: parsed.error.flatten().fieldErrors,
        },
        400
      )
    const { id, name, description } = parsed.data
    const ref = db.collection("roles").doc(id)
    if (update) {
      await ref.update({
        name,
        description,
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      await ref.create({
        id,
        name,
        description,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    return respond({ success: true, data: parsed.data }, update ? 200 : 201)
  } catch {
    return respond(
      {
        success: false,
        message: "Không lưu được role. Kiểm tra ID và cấu hình Firebase Admin.",
      },
      500
    )
  }
}

export async function POST(request: NextRequest) {
  return save(request, false)
}
export async function PATCH(request: NextRequest) {
  return save(request, true)
}

export async function DELETE(request: NextRequest) {
  const denied = await getAdminApiErrorResponse(CORS_HEADERS)
  if (denied) return denied
  const id = request.nextUrl.searchParams.get("id")
  if (!id || !/^role-[a-z0-9-]+$/.test(id))
    return respond({ success: false, message: "ID role không hợp lệ." }, 400)
  if (catalog.some((role) => role.id === id))
    return respond(
      { success: false, message: "Không thể xóa 5 role hệ thống." },
      400
    )
  try {
    const db = getAdminDb()
    await db.runTransaction(async (tx) => {
      const assignments = await tx.get(
        db.collection("users_roles").where("roleId", "==", id)
      )
      assignments.docs.forEach((doc) => tx.delete(doc.ref))
      tx.delete(db.collection("roles").doc(id))
    })
    return respond({ success: true, message: "Đã xóa role." })
  } catch {
    return respond({ success: false, message: "Không xóa được role." }, 500)
  }
}
