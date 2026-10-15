import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { customerFormSchema } from "@/modules/customers/services/types/customer-types"

export const runtime = "nodejs"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Public callers need no login. Ownership is controlled by server configuration.
export async function POST(request: Request) {
  const contentType = (request.headers.get("content-type") ?? "application/json")
    .split(";")[0]
    .trim()
    .toLowerCase()
  const isForm =
    contentType === "multipart/form-data" ||
    contentType === "application/x-www-form-urlencoded"

  if (contentType !== "application/json" && !isForm) {
    return NextResponse.json(
      {
        success: false,
        message: "Vui lòng gửi JSON, form-data hoặc x-www-form-urlencoded.",
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let body: unknown
  try {
    if (isForm) {
      const form = await request.formData()
      body = {
        fullName: form.get("fullName"),
        email: form.get("email"),
        phoneNumber: form.get("phoneNumber"),
        serviceName: form.get("serviceName"),
      }
    } else {
      body = await request.json()
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Không đọc được dữ liệu. Kiểm tra định dạng gửi." },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const result = customerFormSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Thông tin khách hàng không hợp lệ.",
        errors: result.error.flatten().fieldErrors,
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const ownerId = process.env.CUSTOMER_OWNER_UID?.trim()
  if (!ownerId) {
    console.error("[Public customers POST] CUSTOMER_OWNER_UID is missing")
    return NextResponse.json(
      {
        success: false,
        message: "Chưa cấu hình tài khoản nhận khách hàng. Vui lòng liên hệ quản trị viên.",
      },
      { status: 503, headers: CORS_HEADERS }
    )
  }

  try {
    // Verify the configured recipient before writing; never trust a body userId.
    const owner = await getAdminAuth().getUser(ownerId)
    if (owner.disabled) {
      return NextResponse.json(
        { success: false, message: "Tài khoản nhận khách hàng đang bị vô hiệu hóa." },
        { status: 503, headers: CORS_HEADERS }
      )
    }
    const customer = await getAdminDb().collection("customers").add({
      ...result.data,
      userId: owner.uid,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json(
      {
        success: true,
        message: "Đã gửi thông tin khách hàng thành công.",
        data: { id: customer.id },
      },
      { status: 201, headers: CORS_HEADERS }
    )
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown"
    console.error("[Public customers POST] Firestore write failed:", code)

    return NextResponse.json(
      {
        success: false,
        message: "Không thể lưu thông tin khách hàng. Vui lòng thử lại sau.",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
