import { NextResponse } from "next/server"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
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

// Public lead capture into the dashboard's shared customer collection.
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

  try {
    const { db } = await import("@/lib/firebase/client")
    const customer = await addDoc(collection(db, "customers"), {
      ...result.data,
      // Kept for compatibility with public-create rules; never used to filter.
      userId: "",
      createdAt: serverTimestamp(),
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
