# Phân quyền menu và trang

| Role ID | Tên | Menu |
| --- | --- | --- |
| role-admin | Administrators | Tất cả |
| role-directors | Directors | Dashboard 1, Dashboard 2, Dashboard 3, ISO Documents |
| role-accounting | Accounting | Dashboard 3, ISO Documents |
| role-staffs | Staffs | ISO Documents |
| role-customers | Customers | Chat |

- Nhiều role: hợp các quyền. Không có role hợp lệ: không có menu nghiệp vụ.
- ISO Documents dùng `/documents`. Dashboard 3 dùng `/dashboard-3`, hiện là
  trang chờ nội dung báo cáo, không hiển thị số liệu giả.
- Sidebar và proxy dùng cùng `canAccessPage`. Mở URL trực tiếp cũng phải qua
  kiểm tra role. Trang tài khoản cá nhân `/settings/*` và trang lỗi vẫn dùng được.
- Trang vào sau đăng nhập chọn theo role; không mặc định đưa mọi người vào Dashboard 1.
- `users_roles`: `{ id, uid, roleId, createdAt }`. `uid` là Firebase Auth UID.
  ID liên kết ổn định: `ur-<uid>-<roleId>`. Timestamp do server tạo.
- Chỉ API `/api/admin/roles` và `/api/admin/user-roles` có kiểm tra session admin
  mới ghi phân quyền. Không lấy role từ dữ liệu mẫu khi Firestore lỗi.
- Email quản trị gốc `admin@claudecode.ai` được giữ để tránh khóa quản trị.
  Tên hiển thị và các trường profile người dùng tự sửa không cấp quyền admin.
- Thay đổi role được tải lại khi NextAuth cập nhật session. Reload trang để
  sidebar nhận session mới sau khi quản trị viên thay quyền.

## Seed

`node scripts/seed-rbac.cjs` xem kế hoạch; thêm `--apply` để ghi. Script dùng
Firebase Admin trên máy, xác minh project, sao lưu dữ liệu trước khi ghi và
đối chiếu Firebase Auth UID theo email. Chạy lại không nhân đôi liên kết.

Ba tài khoản đã được người dùng chỉ định:

- admin@claudecode.ai → Administrators
- leminhthang78962@gmail.com → Accounting
- minhthangai@gmail.com → Staffs

## Triển khai

Deploy mã lên Vercel với Firebase Admin được cấu hình trong Production.
Phải xuất bản Rules chặn client ghi trực tiếp `roles`/`users_roles`; kiểm tra
không có wildcard khác cấp lại quyền ghi hai collection này. Admin SDK trong
API sử dụng IAM, không phụ thuộc quyền ghi client.

Đổi sidebar/proxy không thay thế Firestore Rules hoặc kiểm tra quyền riêng
của từng API. Các API công khai nhận lead và quy tắc dữ liệu của module khác
không được thay đổi bởi cấu hình menu này.
