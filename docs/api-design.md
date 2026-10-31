# Thiết kế API ứng dụng Đặt và Giao đồ ăn

## Tài liệu và phiên bản

- [OpenAPI hiện tại](openapi.yaml): 58 thao tác HTTP đã có route trong Express, gồm request/response, quyền và mã lỗi. Swagger tải trực tiếp từ tệp này.
- [Luồng vận hành, bất biến và giới hạn](full-workflow.md): thiết kế và cách chạy toàn bộ FR-1 đến FR-26 trên MongoDB theo lựa chọn hiện tại.
- README mục 13–14: kiến trúc đích `/api/v1`/PostgreSQL/Redis; một số tên route/envelope/loại dữ liệu khác với API `/api` hiện tại. Không xem bảng đề xuất là bằng chứng API đó đã tồn tại.

API hiện tại giữ đường dẫn `/api` để frontend và các tài khoản sẵn có tiếp tục sử dụng. Không chuyển database hay đổi ObjectId sang UUID.

## Quy ước hiện tại

| Nội dung | Hợp đồng |
| --- | --- |
| Server | `http://localhost:5000/api`; Swagger dùng `/api` tương đối để tự theo host/port |
| Xác thực | `Authorization: Bearer <token>`; `/auth/register`, `/auth/login` public; Swagger có nút Authorize |
| Vai trò | customer, restaurant, driver, admin; kiểm tra activeRole của JWT với các chế độ được phép và trạng thái user trong MongoDB mỗi request |
| Dữ liệu | JSON, ID ObjectId 24 hex, VND number nguyên, thời điểm ISO UTC; lọc ngày UTC+7 |
| Response | `{user}`, `{orders}`, `{order}`, `{profile}`, `{message, ...}` theo từng endpoint; chưa envelope v1 |
| Lỗi | `{message}` tiếng Việt; tài khoản khóa thêm locked/reason; không trả stack trace |
| Chống lặp | Tạo đơn có Idempotency-Key + hash; trạng thái/tiền cập nhật conditional atomic; review, notification và adjustment có unique index |
| Realtime | SSE nhà hàng hiện có; WebSocket `/api/ws` cho cập nhật đơn, offer, GPS và notifications; REST fallback 5 giây |
| HTTP | 200 đọc/cập nhật/retry, 201 tạo, 400 validation, 401 JWT sai, 403 sai quyền, 404 không thấy, 409 sai điều kiện, 413 request quá lớn, 429 giới hạn khiếu nại, 500 lỗi ngoài dự kiến |

## Các nhóm API

Đường dẫn tính từ `/api`; xem OpenAPI để biết chính xác request body/response.

| Nhóm | Endpoint chính | Quyền |
| --- | --- | --- |
| Auth | POST `/auth/register`, POST `/auth/login`, GET/PUT `/auth/profile`, PUT `/auth/change-password` | Public/chủ phiên |
| Khám phá | GET `/restaurants`, GET `/restaurants/{id}`, GET `/restaurants/{id}/reviews` | Đăng nhập |
| Nhà hàng | GET/PUT `/restaurants/mine`, POST menu, PUT/DELETE `/restaurants/mine/menu/{itemId}` | Chủ quán |
| Đặt món | POST `/orders` (Idempotency-Key) | Customer |
| Theo dõi | GET `/orders`, GET `/orders/{id}` | Khách/chủ quán/tài xế của đơn/admin theo quyền |
| Hủy, thanh toán, đánh giá | POST `/orders/{id}/cancel`, `/mock-payment`, `/review` | Chủ đơn |
| Chế biến | GET `/restaurants/mine/orders`, GET stream, PATCH `/restaurants/mine/orders/{orderId}/status` | Chủ quán |
| Báo cáo nhà hàng | GET `/restaurants/mine/report?from=...&to=...` | Chủ quán |
| Tài xế | GET `/driver/profile`, PUT availability, POST location/offers, PATCH jobs status, POST issue, GET earnings | Driver |
| Thông báo | GET `/notifications`, POST `/notifications/{id}/read` | Chủ thông báo |
| Chuyển chế độ | POST `/auth/switch-role` với `{role: customer/driver/restaurant}` | Cùng tài khoản; giữ duyệt đối tác; không cho admin; đang có cuốc trả 409 |
| Đối soát | GET `/settlements` | Nhà hàng/tài xế xem của mình; admin xem toàn bộ |
| Admin hiện có | users, restaurants review, stats, complaints | Admin |
| Vận hành | GET `/admin/drivers`, PATCH driver review, GET `/admin/orders`, POST order action | Admin |
| Tiền | POST `/admin/settlements/finalize`, POST `/admin/settlements/{id}/transfer`, POST adjustments, POST adjustment transfer | Admin, ghi nhận giả lập |
| Báo cáo tổng | GET `/admin/reports?from=...&to=...` | Admin |
| Hỗ trợ | POST/GET complaints, GET detail, POST messages, admin PATCH xử lý | Người gửi/admin |

## Ví dụ tạo đơn hiện tại

```http
POST /api/orders
Authorization: Bearer <JWT khách>
Idempotency-Key: order-demo-0001
Content-Type: application/json

{
  "restaurantId": "507f1f77bcf86cd799439012",
  "items": [{"menuItem":"507f1f77bcf86cd799439013","quantity":2}],
  "address": "123 Đường thử nghiệm",
  "phone": "0901234567",
  "deliveryLocation": {"latitude":10.771,"longitude":106.691},
  "paymentMethod": "COD",
  "expectedSubtotal": 200000,
  "note": "Không cay"
}
```

Server tính lại giá/menu/phí khoảng cách; không tin các trường tổng tiền do client gửi. Cùng key khác body trả 409. Dùng cùng key và cùng body khi retry sau lỗi mạng.

`MOCK_PREPAID` tạo `PENDING_PAYMENT`, sau đó chủ đơn gọi `POST /orders/{id}/mock-payment` với `{outcome:"success"}` hoặc `"fail"`. Chỉ success chuyển chờ nhà hàng; không thu tiền thật. COD tạo thẳng PENDING_CONFIRMATION.

Chuỗi trạng thái: PENDING_PAYMENT (nếu trả trước) → PENDING_CONFIRMATION → CONFIRMED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERING → COMPLETED. Nhánh hủy/từ chối/giao thất bại không được nhảy lại trạng thái kết thúc. Khách chỉ tự hủy trước xác nhận; driver complete COD phải gửi đúng codCollectedAmount.

## Xem trực tiếp trong backend bằng Swagger UI

1. Chạy MongoDB, `cd backend`, `npm ci`, `npm run dev`.
2. Mở `http://localhost:5000/api-docs/`.
3. Auth → POST login → Try it out → nhập tài khoản thử → Execute.
4. Sao chép `token`, bấm Authorize, dán riêng token không thêm chữ Bearer.
5. Mở endpoint cần thử, điền body/tham số, Execute. Các thao tác ghi sẽ thay đổi dữ liệu đang cấu hình.

Postman: Import URL `http://localhost:5000/api-docs/openapi.json` hoặc tệp OpenAPI. Body chọn raw → JSON; Bearer Token là token nhận từ login, **không phải JWT_SECRET**. GET profile dùng `/api/auth/profile`, không dùng GET login.

SSE là response dài hạn; dùng fetch/curl -N để xem frame. Swagger UI dùng package local, không gửi spec ra validator ngoài và không lưu token qua reload.

## Hợp đồng WebSocket hiện tại

Kết nối `ws://localhost:5000/api/ws` (wss khi HTTPS), gửi frame đầu `{"token":"<JWT>"}` trong 5 giây. Server trả `{"type":"connected"}`. Không đặt JWT trong URL, không cho client join room tùy ý.

Các frame server: `order.changed` (orderId, status, eventId), `driver.offer` (orderId), `driver.location` (orderId, latitude, longitude, at). Offer/đơn được lấy chi tiết bằng REST theo quyền, tránh rò liên hệ trước nhận cuốc. Khi reconnect phải GET lại dữ liệu; event có thể phát lại, MongoDB là nguồn trạng thái.

## Thiết kế đích vẫn chưa chuyển đổi

README mục 13–14 giữ bản thiết kế `/api/v1`, quote/cart server, refresh/revoke phiên, UUID/tiền chuỗi, PostgreSQL/Redis, payment-attempt model, batch settlement transaction và WebSocket event/version chuẩn hóa. Không tự mở các route đó trên backend hiện tại. Nếu chuyển đổi, cần migration dữ liệu, adapter frontend và cập nhật OpenAPI trước khi làm song song; không đổi âm thầm định dạng tiền/ID.
