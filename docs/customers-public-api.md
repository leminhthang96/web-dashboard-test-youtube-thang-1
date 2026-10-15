# API nhận khách hàng từ landing page

`POST /api/customers` là API public, không yêu cầu đăng nhập, cookie,
Authorization header hoặc Firebase Admin service account. Route dùng Firebase
Client SDK và các biến `NEXT_PUBLIC_FIREBASE_*` hiện có của dashboard.

## Gửi dữ liệu

Nhận cả ba kiểu body: JSON (`application/json`), `form-data`
(`multipart/form-data`) và `x-www-form-urlencoded`. Cả 4 trường đều bắt buộc;
`phoneNumber` phải là chuỗi để giữ số 0 đầu. Email phải đúng định dạng.
`serviceName` là văn bản tự do.

Trong Postman, đặt Authorization thành **No Auth**, chọn **Body → raw → JSON**
hoặc một trong hai kiểu form trên. Với `form-data`, để Postman tự đặt
Content-Type và boundary, các trường đều có kiểu **Text**.

```js
// Gọi trong submit handler của form trên landing page.
async function submitCustomer(form) {
  const formData = new FormData(form)
  const response = await fetch("https://YOUR-DASHBOARD-DOMAIN/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phoneNumber: formData.get("phoneNumber"),
      serviceName: formData.get("serviceName"),
    }),
  })
  const result = await response.json()
  if (!response.ok) {
    // result.errors có lỗi theo từng trường khi status là 400.
    throw new Error(result.message)
  }
  return result
}
```

Thay domain bằng URL dashboard đã deploy; khi chạy local dùng
`http://localhost:3000/api/customers`. Các input của form cần có `name`
trùng với 4 tên trường trên. API hỗ trợ CORS cho mọi origin và preflight
`OPTIONS` trả về 204. Không gửi `credentials: "include"`.

## Kết quả

- **201**: lưu thành công, trả ID document vừa tạo:

  ```json
  {
    "success": true,
    "message": "Đã gửi thông tin khách hàng thành công.",
    "data": { "id": "FIRESTORE_DOCUMENT_ID" }
  }
  ```

- **400**: JSON/form sai, Content-Type không hỗ trợ hoặc dữ liệu không hợp lệ,
  `success: false` và thông báo
  tiếng Việt; lỗi validation có thêm `errors` theo trường.
- **500**: Firestore không lưu được, `success: false`. Xem mã lỗi trong log
  server để kiểm tra kết nối hoặc Firestore Rules.

## Dữ liệu Firestore và phân quyền

Mỗi request hợp lệ tạo một document mới trong `customers` với 4 trường đã
trim, `userId: ""` và `createdAt: serverTimestamp()`. Các trường dư do client
gửi, kể cả `userId`, không được dùng để gán chủ sở hữu hay quyền truy cập.
API chỉ cung cấp thao tác tạo; không cung cấp danh sách, sửa hoặc xóa public.

Firebase Client SDK vẫn tuân theo Firestore Security Rules. File
`firestore.rules` của project đã có điều kiện cho phép public create khi
`request.auth == null` và `request.resource.data.userId == ""`. Quy tắc này
cần có trên Firebase project đang sử dụng; nếu chưa publish, cập nhật trong
Firebase Console → Firestore Database → Rules trước khi thử gửi form thật.
Không cần mở public read/update/delete.

Trang `/customers` hiện chỉ tải document có `userId` bằng UID tài khoản đang
đăng nhập. Khách hàng gửi từ API có `userId` rỗng nên chưa xuất hiện trên trang
này. Có thể gán UID tài khoản phụ trách trong Firebase Console để đưa bản ghi
vào danh sách riêng của tài khoản đó.
