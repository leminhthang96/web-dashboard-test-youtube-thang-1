import type { CustomerFormValues } from "@/modules/customers/services/types/customer-types"

function messageValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 500)
}

// Called only by the server after Firestore confirms the customer was saved.
// Notification failures must not make the landing page resubmit a saved lead.
export async function notifyCustomerRegistration(
  customerId: string,
  customer: CustomerFormValues
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!token || !chatId) {
    console.warn("[Customer Telegram] Thiếu cấu hình bot hoặc nhóm nhận tin.")
    return false
  }

  const text = [
    "📩 KHÁCH HÀNG ĐĂNG KÝ MỚI",
    "",
    `Họ tên: ${messageValue(customer.fullName)}`,
    `Email: ${messageValue(customer.email)}`,
    `Số điện thoại: ${messageValue(customer.phoneNumber)}`,
    `Dịch vụ: ${messageValue(customer.serviceName)}`,
    "",
    `Mã đăng ký: ${messageValue(customerId)}`,
  ].join("\n")

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    const result = (await response.json()) as {
      ok?: boolean
      error_code?: number
    }

    if (!response.ok || result?.ok !== true) {
      console.warn("[Customer Telegram] Gửi thông báo thất bại.", {
        status: response.status,
        errorCode: result?.error_code,
      })
      return false
    }
    return true
  } catch {
    // Fetch errors can contain the URL/token; never log the raw error.
    console.warn("[Customer Telegram] Lỗi kết nối hoặc hết thời gian gửi tin.")
    return false
  }
}
