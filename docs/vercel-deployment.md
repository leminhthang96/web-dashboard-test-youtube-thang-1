# Triển khai trên Vercel

## Runtime Node.js

Project sử dụng Node.js 24.x, được khai báo trong `package.json`.
Vercel dùng trường `engines.node` này để chọn phiên bản cho deployment mới.

Firebase Admin 14 tải `jwks-rsa` 4, thư viện này gọi `require("jose")` trong
khi `jose` 6 là module ESM. Vercel mặc định tắt `require(ESM)`, nên server
có thể build thành công nhưng trả về 500 với `ERR_REQUIRE_ESM` khi nhận request.
Chuỗi import từ `src/proxy.ts` đến Firebase Admin khiến lỗi xuất hiện cả ở `/`.

`vercel.json` truyền `NODE_OPTIONS=--experimental-require-module` cho các
Vercel Functions để bật khả năng nạp module cần thiết. Đây là cấu hình runtime,
không chứa secret. Chỉ đổi phiên bản Node.js hoặc chỉ sửa lệnh build là chưa đủ.

Nếu quản lý `NODE_OPTIONS` trong Vercel Project Settings, bảo đảm giá trị có
`--experimental-require-module` và không có `--no-experimental-require-module`.
Giữ các tùy chọn Node khác nếu project đang cần chúng. Có thể chuyển cấu hình
này từ `vercel.json` sang Project Settings, áp dụng cho Production và Preview.

## Sau khi cập nhật mã nguồn

1. Đẩy commit lên nhánh được Vercel theo dõi và đợi deployment mới hoàn tất.
2. Nếu cần triển khai thủ công, chọn deployment của commit mới rồi Redeploy.
3. Kiểm tra `/` chuyển đến `/sign-in` khi chưa đăng nhập và trang đăng nhập tải
   được. Kiểm tra thêm `/api/auth/session` không trả về 500.
4. Đăng nhập và kiểm tra quyền truy cập trang quản trị bằng tài khoản phù hợp.

Các biến Firebase, `AUTH_SECRET` và thông tin Firebase Admin vẫn được cấu hình
riêng trong Vercel Environment Variables theo `.env.example`. Không đưa giá trị
thật của các biến này vào Git. Thay đổi runtime không thay thế cấu hình dịch vụ.

## Kiểm tra tại máy

```powershell
npx tsc --noEmit
npm run build
node --experimental-require-module -e "require('firebase-admin/auth'); require('firebase-admin/firestore'); console.log('Firebase Admin OK')"
```

Để tái hiện lỗi cũ trên Node.js 24:

```powershell
node --no-experimental-require-module -e "require('firebase-admin/auth')"
```

## Tài liệu

- [Vercel: require() of ES Module](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module)
- [Vercel: Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [jwks-rsa: lỗi tương thích ESM](https://github.com/auth0/node-jwks-rsa/issues/507)
