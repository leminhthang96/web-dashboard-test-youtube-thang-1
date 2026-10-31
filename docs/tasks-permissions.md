# Quyền sửa và xóa công việc

- UID lấy từ Firebase Auth của người đang đăng nhập, không lấy từ email hoặc
  trường owner do người dùng nhập.
- Chỉ hiện Edit Task và Delete khi `task.createdBy === uid` và UID không rỗng.
- Service đọc bản ghi hiện tại trong transaction trước khi sửa/xóa. Không tin
  `createdBy` trong dữ liệu gửi từ giao diện và không cho đổi người tạo.
- Firestore Rules áp dụng cùng điều kiện trên server, kể cả khi gọi SDK trực tiếp.
- Tạo mới, Duplicate và Seed Data tự gắn `createdBy` bằng UID hiện tại.
  Seed tạo document mới để không ghi đè hoặc chiếm task của tài khoản khác.
- Chỉ được xem task khi `createdBy === uid` **hoặc** `reporter === uid`.
  Áp dụng cả admin; không có ngoại lệ đọc tất cả task theo vai trò.
- Trường `reporter` là một Firebase Auth UID (tối đa 128 ký tự). Người tạo có
  thể nhập hoặc đổi/xóa UID trong form Add/Edit. Để trống nghĩa là chỉ người tạo
  được xem. Reporter không có quyền sửa/xóa hoặc tự chuyển quyền cho mình.
- Danh sách dùng hai truy vấn Firestore theo UID rồi gộp theo document ID,
  không tải toàn collection về trình duyệt. Thống kê dùng cùng danh sách này.
- Task cũ thiếu `createdBy` chỉ được xem nếu `reporter` trùng UID, không được
  sửa/xóa. Task thiếu cả hai trường không xuất hiện; không tự gán người tạo.
- Khi đổi tài khoản/đăng xuất, xóa danh sách cũ và bỏ kết quả truy vấn cũ.
- Duplicate chỉ có trên task được xem; bản sao thuộc người sao chép và giữ
  reporter của bản gốc. Người tạo bản sao có thể đổi reporter.
- `/api/tasks` là API dữ liệu mẫu chỉ đọc, không có thao tác sửa/xóa Firestore.

## Tạo và dọn dữ liệu mẫu

- Mỗi lần Seed Data chỉ tạo 10 task với ID mới, ghi `createdBy` từ Firebase Auth
  và `reporter` cùng UID hiện tại, `isSeedData: true`. Giữ đủ 50 fixture gốc
  để nhận diện/xóa mẫu cũ.
- Bảng hiển thị cột Người tạo (UID), đánh dấu Bạn khi trùng UID hiện tại.
  Task thiếu UID được ghi rõ; danh sách ưu tiên task của người đang đăng nhập.
- Xóa mẫu của tôi chỉ xóa task có cả `createdBy === uid` và `isSeedData === true`,
  sau khi người dùng xác nhận. Kiểm tra lại dữ liệu trong transaction trước khi xóa.
- Sửa task mẫu giữ nguyên dấu mẫu (vẫn có thể xóa cùng bộ mẫu). Add và Duplicate
  ghi `isSeedData: false`, nên không bị xóa khi dọn dữ liệu mẫu.
- Xóa mẫu cũ chỉ dành cho admin qua `DELETE /api/admin/tasks/seed-data`.
  Server kiểm tra phiên đăng nhập và quyền admin; chỉ xóa ID mẫu cố định với
  đúng 5 trường nguyên bản khớp hoàn toàn bộ mẫu. Task có `createdBy`, thêm trường
  hoặc đã sửa nội dung đều được giữ lại. Không gán chủ sở hữu cho mẫu cũ.
- Đây là thao tác riêng dọn fixture cũ, không mở quyền Edit/Delete task của
  tài khoản khác cho admin. Không tự xóa dữ liệu khi mở trang hoặc deploy.
- API dọn mẫu cũ cần Firebase Admin trên máy chủ. `.env.local` trên máy không
  tự đồng bộ sang Vercel. Thiếu cấu hình, sai project hoặc thiếu quyền IAM sẽ
  có thông báo lỗi riêng; UI giữ thông báo trên trang để dễ kiểm tra.

Triển khai phần `match /tasks/{taskId}` trong `firestore.rules` lên Firebase.
Không để một rule wildcard rộng hơn tiếp tục cho phép ghi vào tasks, vì các
quy tắc Firestore kết hợp theo phép OR. Giữ nguyên quyền các collection khác.
Triển khai mã Next.js mới để giao diện cập nhật các menu theo UID.
