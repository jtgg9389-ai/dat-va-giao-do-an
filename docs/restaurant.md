# Chức năng nhà hàng (README mục 1.2)

## Chạy và sử dụng

Dự án hiện dùng Express/MongoDB và React/Vite. Kiến trúc PostgreSQL/Redis trong bản thiết kế README chưa được chuyển vào mã nguồn.

1. Chạy MongoDB cục bộ (môi trường cloud đã chuẩn bị container `dat-va-giao-do-an-mongo`: `docker start dat-va-giao-do-an-mongo`).
2. Cấu hình `backend/.env` với `MONGO_URI`, `JWT_SECRET`, `PORT=5000`. Không đưa file này lên Git.
3. Trong `backend`: `npm ci`, sau đó `npm run dev`.
4. Trong `frontend`: `npm ci`, sau đó `npm run dev`. API frontend hiện dùng `http://localhost:5000/api`.
5. Đăng nhập tài khoản `restaurant`, mở `/restaurant`, tạo thông tin quán và thêm món. Admin duyệt quán ở trang quản lý đối tác để khách thấy và đặt được.
6. Khách đăng nhập, vào `/restaurants/:id`, chọn số lượng, nhập địa chỉ/điện thoại và gửi đơn COD. Mã yêu cầu chống lặp được giữ lại khi thử gửi lại cùng nội dung sau lỗi mạng.
7. Nhà hàng đang mở `/restaurant` sẽ nhận đơn mới trực tiếp, xác nhận hoặc từ chối có lý do. Đơn được xác nhận chuyển lần lượt sang **Đang làm → Sẵn sàng giao**. Không có nút tự đánh dấu giao thành công cho nhà hàng.

## Phạm vi đã triển khai

| Yêu cầu | Hành vi |
| --- | --- |
| FR-10 | Tạo/sửa/xóa món, bật/tắt còn hàng, kiểm tra quyền sở hữu. Sửa lỗi thiếu import `MenuItem` trong controller cũ. |
| FR-11 | Kết nối SSE có JWT qua header; kiểm tra dữ liệu MongoDB mỗi 2 giây, gửi snapshot khi thay đổi; cảnh báo đơn mới, tự kết nối lại sau 3 giây, có nút tải lại. Khóa tài khoản/đổi vai trò/token hết hạn sẽ đóng stream. |
| FR-12 | Nhận hoặc từ chối đơn đang chờ; bắt buộc lý do khi từ chối; cập nhật có điều kiện trạng thái trong một thao tác MongoDB, chống hai hành động cùng thắng. |
| FR-13 | Chỉ cho `CONFIRMED → PREPARING → READY_FOR_PICKUP`; lưu lịch sử kèm người thao tác và thời điểm; chặn nhảy bước/đổi đơn của quán khác. |
| FR-14 | Bộ lọc ngày theo Việt Nam; tổng tiền món, hoa hồng demo 10%, phần nhà hàng được hưởng chỉ từ `COMPLETED`; chi tiết đơn; đọc lịch sử kỳ đối soát đã chốt và phân biệt đã/chưa ghi nhận chi giả lập. |

Danh sách đơn/stream hiển thị tối đa 200 đơn mới nhất. Snapshot đầu tiên là trạng thái hiện tại; các đơn mới xuất hiện sau đó được báo riêng. Đơn tạo trong lúc mất kết nối được lấy lại khi nối lại. SSE cung cấp cập nhật cho dashboard nhà hàng; chưa thay thế hệ thống WebSocket tracking trong thiết kế tổng thể. Không có push/email khi đóng trang.

Đơn lưu snapshot tên, giá, số lượng, tiền món, hoa hồng và tiền được hưởng tại lúc tạo. Backend tự tính các khoản này, không nhận tổng tiền do client gửi. Chỉ cho đặt quán đã duyệt, đang mở, chủ quán không bị khóa, món còn hàng và thuộc quán. Đặt COD ở đây là luồng tối thiểu phục vụ nhận đơn; chưa tính phí vận chuyển, thanh toán trực tuyến hay gán tài xế.

## API

Tất cả endpoint yêu cầu `Authorization: Bearer <JWT>`; quyền lấy từ tài khoản hiện tại trong database.

| Endpoint | Vai trò | Chức năng |
| --- | --- | --- |
| `POST /api/orders` | customer | Tạo đơn; header `Idempotency-Key` 8–100 ký tự chữ/số/gạch ngang/gạch dưới; body `{restaurantId, items: [{menuItem, quantity}], address, phone, note?}`. |
| `GET /api/restaurants/mine/orders` | restaurant | Danh sách đơn quán mình. |
| `GET /api/restaurants/mine/orders/stream` | restaurant | SSE snapshot `{orders}`; client dùng authenticated `fetch`, không đặt JWT trong URL. |
| `PATCH /api/restaurants/mine/orders/:orderId/status` | restaurant | Body `{status, reason?}`; `CONFIRMED`, `REJECTED`, `PREPARING`, `READY_FOR_PICKUP`. |
| `GET /api/restaurants/mine/report?from=YYYY-MM-DD&to=YYYY-MM-DD` | restaurant | Doanh thu theo `completedAt`, lịch sử đối soát theo `settlement.finalizedAt`. Hai đầu ngày bao gồm, múi giờ Việt Nam. |

## Điểm tích hợp còn lại của các vai trò khác

Phần giao hàng của tài xế và phần chốt/chi đối soát của admin chưa có trong dự án. Vì vậy, đơn mới đi được đến `READY_FOR_PICKUP` qua giao diện hiện tại; không tạo doanh thu hoặc kỳ đối soát giả để lấp dữ liệu trống.

Module giao hàng sau này phải cập nhật `status=COMPLETED`, `completedAt`, lịch sử và `codConfirmed` sau khi thực sự giao/thu COD. Module đối soát phải kiểm tra đủ điều kiện, chốt một lần và ghi `settlement.reference`, `settlement.finalizedAt`; chỉ ghi `settlement.paidAt` khi ghi nhận chi giả lập. Báo cáo chỉ đọc dữ liệu này, không có quyền chốt kỳ/chi tiền. Đơn hoàn tất chưa xác nhận COD được ghi chú giữ lại. Chưa có worker tạo kỳ, sổ điều chỉnh hay giải quyết tranh chấp.

## Kiểm thử

- `cd backend && npm test`: 6 nhóm kiểm thử tích hợp, cần MongoDB; có thể dùng `TEST_MONGO_URI` để chọn máy chủ thử riêng. Mỗi lần chạy tạo database ngẫu nhiên tiền tố `restaurant_test_`, chỉ xóa database đó khi kết thúc. Không dùng database ứng dụng để seed test.
- Kiểm tra CRUD menu/quyền, giá snapshot, yêu cầu tạo đơn trùng đồng thời, món/quán không hợp lệ, trạng thái đồng thời, SSE và khóa tài khoản, báo cáo/mốc ngày Việt Nam/lịch sử đối soát.
- `cd frontend && npm run build && npm run lint`.
- Đã kiểm tra trình duyệt Chromium: khách đặt → nhà hàng nhận SSE → xác nhận → làm món → sẵn sàng giao; báo cáo trống; bố cục chiều rộng 390px; không phát sinh lỗi JavaScript.
