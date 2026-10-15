# API nhận khách hàng từ landing page

`POST /api/customers` là API public, không yêu cầu đăng nhập, cookie,
Authorization header từ landing page. Server dùng Firebase Admin SDK để lưu
khách hàng và tự gán cho UID cấu hình trong `CUSTOMER_OWNER_UID`. Khách gọi API
không được chọn tài khoản nhận khách hàng.

## Cấu hình server (local và Vercel)

1. Lấy UID tài khoản đăng nhập dashboard trong Firebase Authentication → Users.
2. Đặt `CUSTOMER_OWNER_UID` bằng UID đó, không phải email của khách điền form.
3. Cấu hình `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` và
   `FIREBASE_ADMIN_PRIVATE_KEY` từ service account của cùng Firebase project
   (hoặc dùng `FIREBASE_SERVICE_ACCOUNT_KEY`). Private key giữ các dấu `\n`.
4. Local: đặt trong `.env.local` rồi khởi động lại server. Vercel: đặt các biến
   server trong Environment Variables cho Production rồi deploy mã mới.

API kiểm tra tài khoản nhận tồn tại và không bị vô hiệu hóa trước khi ghi.
Thiếu UID sẽ trả 503 và không tạo bản ghi không có chủ sở hữu. Không thêm
tiền tố `NEXT_PUBLIC_` vào biến server hoặc gửi khóa service account từ landing page.

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
- **503**: chưa cấu hình UID nhận khách hàng hoặc tài khoản đó bị vô hiệu hóa.
- **500**: không xác minh được tài khoản nhận hoặc không lưu được Firestore.
  Xem mã lỗi trong log server; kiểm tra UID, service account và quyền IAM.

## Dữ liệu Firestore và phân quyền

Mỗi request hợp lệ tạo một document mới trong `customers` với 4 trường đã
trim, `userId: CUSTOMER_OWNER_UID` và timestamp của server. Các trường dư do client
gửi, kể cả `userId`, không được dùng để gán chủ sở hữu hay quyền truy cập.
API chỉ cung cấp thao tác tạo; không cung cấp danh sách, sửa hoặc xóa public.

Firebase Admin SDK ghi dữ liệu phía server bằng service account. API mới không
phụ thuộc vào quy tắc public create trong Firestore Rules. Trang dashboard vẫn
dùng Client SDK và truy vấn theo UID; giữ các quy tắc giới hạn quyền sở hữu,
không mở public read/update/delete.

Trang `/customers` hiện chỉ tải document có `userId` bằng UID tài khoản đang
đăng nhập. Đăng nhập đúng tài khoản `CUSTOMER_OWNER_UID` để xem. `/customer`
chuyển đến `/customers`. Trang tự tải dữ liệu mỗi 15 giây khi tab đang hiển thị,
khi quay lại tab, hoặc ngay khi bấm **Tải lại**; không dùng Firestore realtime.
Timestamp được chuyển sang chuỗi ISO khi đọc, tương thích cả dữ liệu API cũ.

## Chuyển khách hàng API cũ về tài khoản nhận

Sau khi cấu hình `.env.local`, xem trước rồi áp dụng:

```powershell
node scripts/assign-customer-owner.cjs
node scripts/assign-customer-owner.cjs --apply
```

Script chỉ cập nhật document có `userId == ""`, giữ nguyên ID và thông tin khách,
không đổi chủ những bản ghi đã thuộc tài khoản khác. Có thể chạy lại an toàn.
Nếu có người sửa bản ghi trong lúc chạy, batch đó dừng để tránh ghi đè; các batch
đã hoàn tất được giữ nguyên. Không chạy migration trong mỗi request public.

## Ví dụ cURL

```sh
curl --request POST 'https://web-dashboard-test-youtube-thang-1.vercel.app/api/customers' \
  --header 'Content-Type: application/json' \
  --data-raw '{"fullName":"Lê Minh Thắng","email":"thanglmt@softech.vn","phoneNumber":"0123456789","serviceName":"Text"}'
```

Chỉ trả 201 sau khi Firestore đã lưu thành công. Kiểm tra bản ghi có `userId`
trùng UID nhận, sau đó mở dashboard bằng tài khoản đó để xem khách hàng.
