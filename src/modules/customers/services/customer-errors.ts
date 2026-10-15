export function getCustomerErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined

  switch (code) {
    case "permission-denied":
      return "Bạn không có quyền truy cập khách hàng này. Vui lòng kiểm tra tài khoản và quyền truy cập dữ liệu."
    case "unauthenticated":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    case "unavailable":
    case "deadline-exceeded":
      return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại."
    case "not-found":
      return "Khách hàng không còn tồn tại. Vui lòng tải lại danh sách."
    default:
      return error instanceof Error && !code
        ? error.message
        : "Không thể thực hiện thao tác. Vui lòng thử lại."
  }
}
