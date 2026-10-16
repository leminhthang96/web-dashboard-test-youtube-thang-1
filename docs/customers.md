# Quản lý khách hàng

`/customer` chuyển đến `/customers`. Dashboard hiển thị danh sách khách hàng
chung cho người đã đăng nhập, gồm đăng ký từ landing page và khách thêm trực
tiếp. Cả hai luồng đều lưu trong collection `customers` của Firestore.

## Dữ liệu và thao tác

- Bốn trường bắt buộc: fullName, email, phoneNumber, serviceName.
- Firestore tự sinh ID. userId là metadata tùy chọn, không dùng để lọc danh sách.
- Timestamp Firestore được chuyển sang ISO khi đọc dữ liệu.
- Thêm/sửa kiểm tra dữ liệu trước khi ghi; sửa giữ nguyên metadata.
- Xóa cần xác nhận; lỗi Firestore không được coi là thành công.
- Có tìm kiếm, lọc, sắp xếp, phân trang, xuất file và ẩn/hiện cột.
- Tải lại mỗi 15 giây khi tab hiển thị, khi quay lại tab hoặc bấm Tải lại.
- Không cần gán UID hoặc migration dữ liệu cũ. Không dùng dữ liệu mẫu khi lỗi.

## Phân quyền

API public chỉ tạo khách hàng; xem [hướng dẫn API](./customers-public-api.md).
Dashboard yêu cầu đăng nhập để đọc/thêm/sửa/xóa. Các tài khoản dashboard cùng
quản lý danh sách của ứng dụng. Rules tương ứng nằm trong firestore.rules;
người chưa đăng nhập không được đọc, cập nhật hoặc xóa danh sách.

## Kiểm tra

```sh
npx tsc --noEmit
npm run build
```

Gửi API với bốn trường, xác nhận trả 201 và xuất hiện trên dashboard.
Thêm/sửa/xóa trên dashboard rồi kiểm tra Firestore tương ứng.
