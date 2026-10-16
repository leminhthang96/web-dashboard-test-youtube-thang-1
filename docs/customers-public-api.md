# API nhận khách hàng từ landing page

`POST /api/customers` nhận đăng ký và lưu vào collection `customers` trên
Firestore. Không cần đăng nhập, token, cookie hay UID tài khoản nhận.
Landing page chỉ gửi bốn trường: fullName, email, phoneNumber, serviceName.

## Ví dụ cURL

```sh
curl --request POST 'https://web-dashboard-test-youtube-thang-1.vercel.app/api/customers' \
  --header 'Content-Type: application/json' \
  --data-raw '{"fullName":"Lê Minh Thắng","email":"thanglmt@softech.vn","phoneNumber":"0123456789","serviceName":"Text"}'
```

Nhận JSON, form-data và x-www-form-urlencoded. Bốn trường đều bắt buộc;
số điện thoại là chuỗi để giữ số 0 đầu. Trong Postman chọn No Auth.
API hỗ trợ CORS cho mọi origin; OPTIONS trả 204. Không cần gửi cookie.

## Kết quả

- 201: Firestore đã lưu thành công; trả `{ success: true, message, data: { id } }`.
- 400: dữ liệu hoặc định dạng không hợp lệ, có thông báo tiếng Việt.
- 500: không lưu được Firestore; kiểm tra cấu hình Firebase và Rules.

## Dashboard và Firestore

`/customer` chuyển đến `/customers`. Người đã đăng nhập dashboard cùng xem
và quản lý danh sách khách hàng, không lọc theo userId. API lưu userId rỗng
để tương thích quy tắc public create; đây không còn là điều kiện hiển thị.
Các trường dư trong request, kể cả userId, bị bỏ qua. createdAt là timestamp
server; dashboard chuyển sang chuỗi ISO khi đọc dữ liệu.

Dashboard tải dữ liệu mỗi 15 giây khi tab đang hiển thị, khi quay lại tab,
hoặc khi bấm Tải lại. Thêm/sửa/xóa ghi trực tiếp vào cùng collection.
Không cần chạy migration hoặc gán tài khoản cho khách gửi từ API.

## Thông báo Telegram

Sau khi Firestore lưu thành công, API gửi thông báo gồm họ tên, email, số điện
thoại, dịch vụ và mã đăng ký đến nhóm được cấu hình bởi `TELEGRAM_CHAT_ID`.
Đặt `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trong `.env.local` khi chạy local,
hoặc trong Environment Variables trên Vercel khi triển khai. Bot phải là thành
viên của nhóm và có quyền gửi tin. Không gửi token từ landing page.

API chờ gửi tin tối đa 8 giây. Thiếu cấu hình, Telegram từ chối hoặc lỗi mạng
đều được ghi log nhưng không thay đổi phản hồi 201 của khách đã lưu thành công.
Không tự gửi lại khi lỗi; không gửi thông báo cho dữ liệu không hợp lệ hoặc
khi Firestore lưu thất bại. Request của landing page vẫn giữ bốn trường cũ.

Tích hợp sử dụng [Telegram Bot API sendMessage](https://core.telegram.org/bots/api#sendmessage).

## Triển khai ứng dụng

- Local và Vercel cần NEXT_PUBLIC_FIREBASE_* của cùng Firebase project.
- API này dùng Firebase Client SDK, không cần Firebase Admin hoặc UID nhận.
  Các chức năng quản trị khác của ứng dụng vẫn có thể cần Firebase Admin.
- Rules phải cho phép public tạo bản ghi có userId rỗng và cho người đã đăng
  nhập đọc/sửa/xóa khách hàng chung. File firestore.rules chứa quy tắc này.
  Không mở public đọc/sửa/xóa danh sách khách hàng.
- Triển khai mã mới lên Vercel để URL online chạy bản sửa. Chỉnh file local
  không tự cập nhật deployment đang chạy.
