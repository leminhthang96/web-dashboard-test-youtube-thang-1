# Phân quyền menu và trang

| Role ID | Tên | Menu |
| --- | --- | --- |
| role-admin | Administrators | Tất cả |
| role-directors | Directors | Dashboard 1, Dashboard 2, Dashboard 3, ISO Documents |
| role-accounting | Accounting | Dashboard 3, ISO Documents |
| role-staffs | Staffs | ISO Documents |
| role-customers | Customers | Chat |

- Nhiều role: hợp các quyền. Không có role hợp lệ: vẫn đăng nhập được,
  vào hồ sơ cá nhân `/settings/user`, không có menu nghiệp vụ.
- ISO Documents dùng `/documents`. Dashboard 3 dùng `/dashboard-3`, hiện là
  trang chờ nội dung báo cáo, không hiển thị số liệu giả.
- Sidebar và tìm kiếm menu dùng cùng `canAccessPage`. Proxy và lớp bảo vệ
  giao diện dùng `canAccessPrivatePage`. Mở URL ngoài quyền sẽ chuyển về trang
  được phép theo role, không hiển thị 403. Trang tài khoản cá nhân `/settings/*`
  vẫn dùng được. Các trang lỗi mẫu có sẵn được giữ nguyên.
- Trang vào sau đăng nhập chọn theo role; không mặc định đưa mọi người vào Dashboard 1.
- `users_roles`: `{ id, uid, roleId, createdAt }`. `uid` là Firebase Auth UID.
  ID liên kết ổn định: `ur-<uid>-<roleId>`. Timestamp do server tạo.
- Chỉ API `/api/admin/roles` và `/api/admin/user-roles` có kiểm tra session admin
  mới ghi phân quyền. Không lấy role từ dữ liệu mẫu khi Firestore lỗi.
- Quyền chỉ lấy từ liên kết `users_roles` hợp lệ và role tồn tại trong `roles`.
  Email, tên hiển thị và cờ `isAdmin` trong profile không tự cấp quyền admin.
- Tải role bằng Firestore REST với Firebase ID token của người đăng nhập, cùng
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID` với trình duyệt. Không cần Admin SDK để tải
  menu; Admin SDK vẫn cần cho các API quản trị. REST dùng Firebase Security Rules:
  https://firebase.google.com/docs/firestore/use-rest-api
- ID token chỉ nằm trong JWT mã hóa của NextAuth, không trả qua session JSON.
  Khi đồng bộ token, server xác minh UID phải trùng phiên hiện tại; không nhận
  role hoặc cờ admin do client gửi lên. Token được làm mới từ Firebase Auth.
- Lỗi tải role được phân biệt với tài khoản chưa có role: không chuyển nhầm
  sang Profile Settings và không tự cấp quyền. Phiên cũ được đồng bộ lại bằng
  Firebase Auth; sau khi phục hồi, chuyển về trang tương ứng với role.
- Session cập nhật khi quay lại cửa sổ và mỗi 30 giây. Khi đổi tài khoản hoặc
  role, nội dung riêng được tải lại theo danh tính mới; bộ nhớ Chat được xóa khi
  Firebase Auth đổi trạng thái. Không dựng trang ngoài quyền trong lúc chuyển trang.

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
`firestore.rules` đã được kiểm thử bằng Firebase Emulator và xuất bản vào
project `dashboard-test--thang-1` ngày 02/11/2026, ruleset
`dbc849a3-6e9e-48cc-be3b-bb9d119dd1e2`. Bản sao Rules trước khi xuất bản ở
`.cache/firestore-rbac-publish-backup.json` (không đưa vào Git).

- Client không được ghi trực tiếp `roles`/`users_roles`; API quản trị kiểm tra
  session admin trước khi dùng Admin SDK.
- Documents: các role có menu ISO Documents được đọc; ghi theo quyền quản lý
  tài liệu hiện có. Chat: Administrators và Customers.
- Tasks: Administrators có quyền module, đồng thời giữ RLS `createdBy`/`reporter`
  khi đọc và chỉ người tạo được sửa/xóa.
- Customers, Calendar: Administrators. API nhận lead công khai vẫn được tạo
  khách hàng với dữ liệu hợp lệ, không được đọc/sửa/xóa dữ liệu.
- Mỗi tài khoản được đọc/sửa hồ sơ của mình, không được tự gán role.

Firestore Rules kiểm soát dữ liệu Firestore; không thay thế Storage Rules cho
file nhị phân. Admin SDK sử dụng IAM, nên API phải tự kiểm tra quyền.

Thay đổi mã Sidebar/điều hướng cần được deploy lên Vercel riêng. Không seed lại
dữ liệu để áp dụng RBAC. Kiểm thử điều hướng: đủ 5 role, hợp nhiều role,
tài khoản chưa có role, URL trực tiếp và đăng nhập/đăng xuất.

`scripts/verify-rbac-session.cjs` kiểm thử Firestore REST và phiên NextAuth trên
Firebase Emulator: 5 role, phục hồi phiên cũ, lỗi kết nối, chống giả mạo role/UID,
thu hồi role. Script chỉ chạy với `FIRESTORE_EMULATOR_HOST=127.0.0.1:<port>`,
không đăng nhập hoặc ghi dữ liệu lên production.
