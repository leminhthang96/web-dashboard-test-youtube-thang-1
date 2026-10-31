# Quyền sửa và xóa công việc

- UID lấy từ Firebase Auth của người đang đăng nhập, không lấy từ email hoặc
  trường owner do người dùng nhập.
- Chỉ hiện Edit Task và Delete khi `task.createdBy === uid` và UID không rỗng.
- Service đọc bản ghi hiện tại trong transaction trước khi sửa/xóa. Không tin
  `createdBy` trong dữ liệu gửi từ giao diện và không cho đổi người tạo.
- Firestore Rules áp dụng cùng điều kiện trên server, kể cả khi gọi SDK trực tiếp.
- Tạo mới, Duplicate và Seed Data tự gắn `createdBy` bằng UID hiện tại.
  Seed tạo document mới để không ghi đè hoặc chiếm task của tài khoản khác.
- Task cũ thiếu `createdBy` vẫn được đọc nhưng không được sửa/xóa. Chỉ bổ sung
  UID khi đã xác minh đúng người tạo; không tự nhận task cũ về tài khoản hiện tại.
- Quyền xem danh sách và Duplicate giữ nguyên cho người đã đăng nhập.
- `/api/tasks` là API dữ liệu mẫu chỉ đọc, không có thao tác sửa/xóa Firestore.

## Tạo và dọn dữ liệu mẫu

- Seed Data tạo ID mới, ghi `createdBy` từ Firebase Auth và `isSeedData: true`.
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

Triển khai phần `match /tasks/{taskId}` trong `firestore.rules` lên Firebase.
Không để một rule wildcard rộng hơn tiếp tục cho phép ghi vào tasks, vì các
quy tắc Firestore kết hợp theo phép OR. Giữ nguyên quyền các collection khác.
Triển khai mã Next.js mới để giao diện cập nhật các menu theo UID.
