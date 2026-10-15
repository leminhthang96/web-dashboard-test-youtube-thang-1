# Quản lý khách hàng

Trang `/customers` sử dụng Firebase Client SDK với cấu hình có sẵn trong
`.env.local` (hoặc Environment Variables trên Vercel). Các thao tác đọc, thêm,
sửa, xóa làm việc trực tiếp với collection `customers`.

## Dữ liệu và quyền sở hữu

Mỗi document có bốn trường nghiệp vụ dạng chuỗi và trường sở hữu `userId`:

```json
{
  "fullName": "Lê Minh Thắng",
  "email": "thanglmt@softech.vn",
  "phoneNumber": "1234567890",
  "serviceName": "Text",
  "userId": "UID_FIREBASE_CUA_NGUOI_SO_HUU"
}
```

- `userId` là UID từ Firebase Authentication, không phải email. Khi tạo mới,
  ứng dụng tự gắn UID của người đang đăng nhập; form không cho chỉnh trường này.
- Firestore tự sinh document ID. Không cần thêm trường `id` vào dữ liệu.
- Khi sửa, chỉ bốn trường nghiệp vụ được cập nhật; các metadata cũ được giữ lại.
- Danh sách truy vấn `where("userId", "==", uid)`. Firestore Security Rules phải
  áp dụng quy tắc sở hữu trong `firestore.rules` của project. Lọc ở giao diện
  không thay thế việc triển khai Rules lên Firebase.
- Bản ghi cũ chỉ có bốn trường sẽ chưa hiển thị. Trong Firebase Console, lấy
  UID của tài khoản sở hữu từ Authentication rồi thêm `userId` tương ứng vào
  từng document. Không tự gán toàn bộ dữ liệu cũ cho người đang đăng nhập.
- Không tự tạo dữ liệu mẫu, không sử dụng dữ liệu giả khi đọc Firestore lỗi.

## Thao tác

- Thêm và sửa trong Dialog, kiểm tra dữ liệu trước khi lưu.
- Cột Họ và tên (`fullName`) và Email có chu kỳ: tăng dần → giảm dần → bỏ sắp xếp.
- Dịch vụ là văn bản tự do. Số điện thoại được giữ dạng chuỗi để không mất số 0 đầu.
- Nút Xóa mở Alert Dialog với tên/email khách hàng và nút xác nhận màu đỏ.
  Chỉ xóa sau khi xác nhận; nếu Firestore trả lỗi, hộp thoại giữ nguyên để thử lại.
- Có tìm kiếm, phân trang, chọn cột, trạng thái đang tải, danh sách trống và lỗi.

## Kiểm tra

```sh
npx tsc --noEmit
npm run build
```

Để kiểm tra kết nối thực tế, đăng nhập, thêm một khách hàng thử nghiệm, tải lại
trang, sửa và tải lại lần nữa; cuối cùng kiểm tra Hủy/Xác nhận trong hộp thoại
xóa. Dùng hai tài khoản khác nhau để xác nhận danh sách được tách theo UID.
