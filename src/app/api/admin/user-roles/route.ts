import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminApiErrorResponse } from "@/lib/auth/admin-api"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { ADMIN_EMAIL, ADMIN_ROLE_ID } from "@/lib/auth/permissions"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
const schema = z.object({
  uid: z
    .string()
    .min(1)
    .max(128)
    .refine((uid) => !uid.includes("/")),
  roleIds: z.array(z.string().regex(/^role-[a-z0-9-]+$/)).max(20),
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
    const snapshot = await getAdminDb().collection("users_roles").get()
    return respond({
      success: true,
      data: snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.().toISOString() ?? data.createdAt,
        }
      }),
    })
  } catch {
    return respond(
      { success: false, message: "Không tải được phân quyền." },
      500
    )
  }
}

export async function PUT(request: NextRequest) {
  const denied = await getAdminApiErrorResponse(CORS_HEADERS)
  if (denied) return denied
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success)
      return respond(
        {
          success: false,
          message: "Dữ liệu phân quyền không hợp lệ.",
          errors: parsed.error.flatten().fieldErrors,
        },
        400
      )
    const { uid } = parsed.data
    const roleIds = [...new Set(parsed.data.roleIds)]
    const user = await getAdminAuth().getUser(uid)
    if (user.email === ADMIN_EMAIL && !roleIds.includes(ADMIN_ROLE_ID)) {
      return respond(
        {
          success: false,
          message: "Tài khoản quản trị gốc phải giữ role Administrators.",
        },
        400
      )
    }
    const db = getAdminDb()
    await db.runTransaction(async (tx) => {
      const roles = roleIds.length
        ? await tx.getAll(
            ...roleIds.map((id) => db.collection("roles").doc(id))
          )
        : []
      if (roles.some((role) => !role.exists)) throw new Error("Unknown role")
      const old = await tx.get(
        db.collection("users_roles").where("uid", "==", uid)
      )
      old.docs.forEach((doc) => {
        const roleId = doc.data().roleId
        if (!roleIds.includes(roleId) || doc.id !== `ur-${uid}-${roleId}`) {
          tx.delete(doc.ref)
        }
      })
      roleIds.forEach((roleId) => {
        const id = `ur-${uid}-${roleId}`
        if (old.docs.some((doc) => doc.id === id && doc.data().roleId === roleId)) return
        tx.set(db.collection("users_roles").doc(id), {
          id,
          uid,
          roleId,
          createdAt: FieldValue.serverTimestamp(),
        })
      })
    })
    return respond({ success: true, message: "Đã cập nhật phân quyền." })
  } catch {
    return respond(
      {
        success: false,
        message:
          "Không cập nhật được phân quyền. Kiểm tra người dùng và role tồn tại.",
      },
      500
    )
  }
}
