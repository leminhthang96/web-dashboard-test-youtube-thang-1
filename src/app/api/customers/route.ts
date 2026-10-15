import { NextResponse } from "next/server"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { customerFormSchema } from "@/modules/customers/services/types/customer-types"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Public lead capture: no session, token, or Admin SDK credentials required.
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: "Nội dung yêu cầu phải là JSON hợp lệ." },
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
    const customer = await addDoc(collection(db, "customers"), {
      ...result.data,
      // Public submissions cannot choose another account as their owner.
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
