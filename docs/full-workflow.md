# Chạy toàn bộ luồng chức năng FoodGo (MongoDB)

## Quyết định và phạm vi

Theo lựa chọn của người dùng, tiếp tục **MongoDB** và hoàn thiện chức năng trước. Chưa chuyển PostgreSQL, chưa thêm Redis. Vì vậy không khẳng định đáp ứng ràng buộc PostgreSQL/Redis của đề bài gốc hoặc toàn bộ kiến trúc Next/Nest/PostGIS đề xuất ở README. Frontend React/Vite, backend Express, MongoDB 8 và WebSocket `ws`; bản đồ Leaflet/OpenStreetMap.

Các mục FR-1 đến FR-26 đã có luồng nghiệp vụ tương ứng bên dưới. Đây là bản chạy đồ án có giới hạn được nêu rõ, không phải hệ thống thanh toán/vận hành sản xuất. Những tác vụ ghi nhận thanh toán, hoàn tiền và thu/chi đối soát đều **giả lập**, không chuyển tiền thật.

## Cập nhật trên máy đang dùng

Lấy đúng nhánh `codex/restaurant-api-swagger` từ GitHub. Giữ lại `.env` cũ của mình; không sao chép `.env` lên GitHub.

Dừng backend/frontend cũ bằng Ctrl+C trước khi chạy bản mới:

```bash
cd backend
npm ci
npm run dev
```

Mở terminal khác ở thư mục dự án:

```bash
cd frontend
npm ci
npm run dev
```

- `backend/.env`: cần `MONGO_URI`, `JWT_SECRET`, `PORT=5000` (hoặc cổng mong muốn). Không đổi JWT_SECRET chỉ để thử API: đổi secret sẽ làm các token đã cấp mất hiệu lực.
- Khuyến nghị MongoDB 8 (local hoặc Atlas). Server khởi tạo index đơn/địa lý/notification/review/adjustment trước khi nghe cổng. Nếu index báo trùng tài xế active, phải kiểm tra dữ liệu cũ; không xóa index để bỏ điều kiện an toàn.
- Backend: `http://localhost:5000`; Swagger: `/api-docs/`; JSON: `/api-docs/openapi.json`.
- Frontend: dùng địa chỉ Vite in trong terminal, thường cổng 5173. API frontend hiện trỏ localhost:5000; sửa `frontend/src/api.js` khi triển khai cổng/host khác.
- Worker chạy cùng backend, mỗi 2 giây; không cần chạy một terminal worker khác. Sau khi server khởi động lại, worker xử lý outbox và tác vụ còn lưu trong MongoDB.
- Không cần Redis để chạy phiên bản hiện tại. GPS mới nhất lưu trong MongoDB với index 2dsphere; điều này chưa đáp ứng yêu cầu Redis gốc.

### Admin cho database mới

Nếu database đã có tài khoản admin thì đăng nhập lại bằng tài khoản đó. Public registration không còn cho tự đăng ký admin.

Với database hoàn toàn mới, cấu hình `ADMIN_EMAIL`, `ADMIN_PASSWORD` (ít nhất 12 ký tự) trong `.env` riêng rồi chạy trong backend:

```bash
node scripts/create-admin.js
```

Script không ghi đè/nâng quyền tài khoản có sẵn, không in mật khẩu. Xóa ADMIN_PASSWORD khỏi cấu hình sau khi tạo xong. Không dùng script này để thay mật khẩu tài khoản cũ.

## Các màn hình và chức năng

| Vai trò | Màn hình | Chức năng |
| --- | --- | --- |
| Customer | `/restaurants` | Tìm tên/khu vực theo địa chỉ, lọc loại món và điểm đánh giá |
| Customer | `/restaurants/:id` | Thực đơn có ảnh, review, chọn số lượng, giỏ lưu local theo quán/tài khoản, địa chỉ/GPS, COD hoặc payment giả lập |
| Customer | `/orders` | Lịch sử tối đa 200 đơn gần nhất |
| Customer | `/orders/:id` | Trạng thái/timeline trực tiếp, thanh toán giả lập, hủy trước xác nhận, tài xế đang giao trên bản đồ, đánh giá sau hoàn tất |
| Restaurant | `/restaurant` | Hồ sơ, loại món, tọa độ, mở/đóng, menu có ảnh, nhận/từ chối/làm món, báo cáo, lịch sử đối soát |
| Driver | `/driver` | Hồ sơ chờ duyệt, online/offline, GPS, đề nghị cuốc hết hạn, nhận/từ chối, pickup/giao/complete, báo sự cố, thu nhập và đối soát |
| Admin | `/admin/users` | Vai trò, khóa/mở khóa tài khoản có lý do/audit |
| Admin | `/admin/partners` | Duyệt/thu hồi duyệt quán |
| Admin | `/admin/operations` | Duyệt tài xế, xem đơn, tìm lại tài xế, hủy ngoại lệ, giải quyết sự cố/giao thất bại, báo cáo, chốt ngày, ghi nhận thu/chi, điều chỉnh sau chốt |
| Customer/Restaurant/Driver | `/support` | Khiếu nại, liên kết ID đơn thuộc quyền, phản hồi và theo dõi kết quả |
| Admin | `/admin/complaints` | Phản hồi, xử lý và đóng khiếu nại |
| Đăng nhập | `/notifications` | Thông báo đã lưu, đánh dấu đọc; liên kết đơn chỉ mở được theo quyền thực tế |

### Ảnh món ăn

Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB, xem trước, bỏ ảnh khi sửa. Lưu data URL trong menu document, không cần dịch vụ lưu trữ ngoài hoặc thư mục uploads. Backend kiểm tra base64, chữ ký định dạng và dung lượng; không nhận SVG/HTML. Ảnh xuất hiện ở quản lý và menu khách, không đưa vào snapshot/order stream để tránh phình dữ liệu.

### Tọa độ và phí

Quán cần lưu vĩ độ/kinh độ ở trang nhà hàng. Khách chọn tọa độ giao (nhập hoặc bấm lấy vị trí hiện tại); browser có thể yêu cầu cho phép geolocation. Địa chỉ chữ vẫn bắt buộc để tài xế liên hệ. Cách tính dựa khoảng cách thẳng:

- ≤2 km: 15.000 VND; mỗi km vượt làm tròn lên cộng 5.000 VND; từ chối giao ngoài 30 km.
- Tiền món = tổng giá × số lượng; hoa hồng demo 10% tiền món; nhà hàng hưởng tiền món − hoa hồng; tài xế hưởng phí giao.
- Server tính và snapshot tiền; nếu `expectedSubtotal` của client không khớp giá mới thì trả 409, không tự đặt theo giá cũ.
- Giỏ phía browser lưu theo quán và tài khoản, không phải giỏ đồng bộ đa thiết bị. Món hết hàng hoặc giá đổi phải được xác nhận lại; giá/tình trạng lúc tạo đơn do backend kiểm tra.

## Kịch bản demo bốn vai trò

1. Đăng ký customer, restaurant và driver; dùng phiên trình duyệt riêng cho từng tài khoản. Giữ một phiên admin.
2. Nhà hàng tạo quán, lưu tọa độ, loại món, thêm món/ảnh. Admin duyệt quán.
3. Tài xế mở `/driver` để tạo hồ sơ, bật gửi GPS; admin duyệt tài xế. Tài xế bấm Sẵn sàng nhận đơn sau khi có GPS mới.
4. Khách chọn quán, thêm số lượng, nhập địa chỉ/điện thoại/tọa độ, xem phí và đặt COD. Với MOCK_PREPAID, mở đơn rồi bấm kết quả giả lập; chỉ sau success đơn mới chờ quán.
5. Nhà hàng nhận thông báo, xác nhận, bắt đầu làm, sẵn sàng giao.
6. Hệ thống đề nghị cuốc cho tài xế phù hợp. Tài xế phải nhận trước hạn 30 giây. Sau khi quán sẵn sàng: Đã lấy hàng → Bắt đầu giao.
7. Khách mở chi tiết đơn thấy vị trí tài xế. GPS gửi mỗi 3 giây khi tài xế giữ trang mở; cập nhật đơn/notification qua WebSocket, fallback REST 5 giây.
8. Tài xế xác nhận giao và đủ COD. Khách đánh giá nhà hàng/tài xế; điểm quán cập nhật từ dữ liệu review.
9. Admin xem báo cáo, chọn khoảng ngày và chốt. Worker tự chốt các ngày đã kết thúc theo giờ Việt Nam; admin có thể kích hoạt chốt sớm/ngày hiện tại cho demo.
10. Admin ghi nhận chi nhà hàng và thu/chi tài xế **giả lập**. Đối tác xem lịch sử; chốt kỳ khác với đã ghi nhận tiền.
11. Thử nhánh lỗi: khách hủy trước xác nhận; giả lập thanh toán fail; tài xế từ chối/offer hết hạn; COD sai lệch báo sự cố; admin xác nhận giao thất bại hoặc giải quyết để tiếp tục.

## Bảo vệ dữ liệu và cạnh tranh

- JWT/bcrypt/RBAC; không chấp nhận public role admin. Chủ đơn/quán/cuốc/notification/complaint kiểm tra từ user hiện tại, không chỉ ẩn nút trên UI.
- `Idempotency-Key` bắt buộc khi tạo đơn; unique customer+key và request hash. Cùng key khác nội dung trả 409.
- Chuyển trạng thái và history/outbox/tiền liên quan nằm trong **cùng order document**, cập nhật có điều kiện trạng thái trước; MongoDB atomic single-document thay cho transaction đa bảng ở kiến trúc PostgreSQL.
- Index partial unique `driver` trên các status active bảo vệ một tài xế tối đa một cuốc; update order có driver trống bảo vệ một đơn tối đa một tài xế. Không chỉ kiểm tra bằng lệnh read trước update.
- Thanh toán/hoàn tiền giả lập lưu trạng thái ngay trong order; retry không cộng tiền hoặc hoàn lần hai. Hủy chạy đua payment dùng trạng thái đọc cụ thể để tránh mất hoàn tiền.
- Chốt từng đơn một lần bằng điều kiện chưa có settlement reference. Số tiền/chủ thể/ngày đã chốt không bị sửa. Bulk chốt là tập các order atomic độc lập, **không phải transaction tất cả-hoặc-không cho toàn kỳ**; nếu lỗi giữa chừng, chạy lại hoàn tất các đơn còn lại.
- Mỗi khoản thu/chi toàn bộ dùng `paidAt` conditional; retry không ghi nhận tiền lần hai. Điều chỉnh sau chốt là document độc lập có reference unique theo party, actor và lý do; thu/chi điều chỉnh cũng conditional, không sửa snapshot kỳ cũ.
- `outbox` được ghi cùng trạng thái; worker upsert notification theo unique user+eventId rồi đánh published. Worker chết giữa chừng có thể phát lại WebSocket nhưng không tạo thêm notification. REST luôn là nguồn trạng thái cuối.

## Phân công và lỗi kết nối

- MongoDB index 2dsphere chọn tài xế online/đã duyệt/không bị khóa, GPS trong 60 giây, chưa có cuốc active; gần quán nhất trong bán kính tìm kiếm.
- Bán kính bắt đầu 3 km, tăng đến 15 km khi tìm lại. Offer 30 giây; tài xế từ chối/hết hạn được loại khỏi vòng tìm của đơn. Chưa có người phù hợp → NO_DRIVER và thử lại mỗi 30 giây; admin có thể tìm lại để mở vòng mới.
- GPS sequence chỉ được tăng; không chấp nhận gói vị trí cũ đè mới.
- Mất GPS >120 giây trước pickup: bỏ gán và tìm người khác. Sau pickup: giữ gán, tạo sự cố, yêu cầu admin; không tự đánh COMPLETED.
- Tắt online ngừng nhận cuốc mới; cuốc đã nhận vẫn phải xử lý. Khi vẫn có cuốc, giữ gửi GPS cho đến kết thúc.
- Khi hết hạn chờ thanh toán/xác nhận 15 phút, worker hủy theo trạng thái hiện tại; nếu đã trả thì ghi nhận refund giả lập.
- Thông báo WebSocket chỉ gửi cho user nhận. GPS chỉ phát cho chủ đơn đang DELIVERING; socket không nhận room tùy ý. WebSocket không lưu token trong URL, xác thực qua frame đầu, kiểm tra khóa/hết hạn sau đó.

## Đối soát và COD

- Chỉ COMPLETED, COD đã xác nhận hoặc MOCK_PREPAID đã PAID, không giữ sự cố/khiếu nại tài chính mới được chốt.
- Mỗi đơn có `settlement.reference = DAY-YYYY-MM-DD` theo ngày completedAt Việt Nam. Cùng reference nhóm các đơn để xem lịch sử; yêu cầu khoảng ngày/tuần chốt các ngày trong khoảng, không nhân đôi nghĩa vụ.
- Nhà hàng nhận `subtotal - commissionAmount`.
- Tài xế: `netPayable = deliveryFee - codCollected` với COD; MOCK_PREPAID chỉ nhận deliveryFee. Dương hệ thống trả tài xế, âm tài xế nộp hệ thống. Không coi COD thu hộ là thu nhập.
- Khiếu nại loại payment với ID đơn đầy đủ phải thuộc quyền người gửi. Trước chốt: giữ đối soát, admin đóng hồ sơ thì bỏ giữ khi không còn khiếu nại tài chính mở. Sau chốt: admin tạo khoản điều chỉnh riêng, không sửa kỳ cũ.
- Hiện chỉ thu/chi toàn bộ một khoản, không hỗ trợ thanh toán một phần. Không có tích hợp ngân hàng/gateway thật.

## Kiểm thử và giới hạn

```bash
cd backend
npm test
```

Cần MongoDB; `TEST_MONGO_URI` tùy chọn để chọn máy chủ thử. Các suite tạo database ngẫu nhiên `restaurant_test_*`/`flow_test_*` và chỉ xóa database đó. Test không lấy database ứng dụng làm fixture. Kiểm thử cạnh tranh chạy trên MongoDB thật, không mock model.

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

17 nhóm kiểm thử tích hợp đã chạy đạt, gồm API/phân quyền/trạng thái/tiền/GPS/outbox/complaint và ảnh món. Kiểm tra trình duyệt luồng bốn vai trò dùng Chromium và GPS trình duyệt giả lập cho test; tile bản đồ được mock, do đó không khẳng định đã đo độ sẵn sàng hoặc độ trễ mạng OpenStreetMap thật. Ảnh món có kiểm tra chọn/preview/lưu/reload/khách xem/bỏ ảnh và chặn SVG.

Giới hạn: chưa PostgreSQL/Redis; giỏ local theo thiết bị; list có giới hạn (200 đơn, 100 notifications/reviews, 500 khoản đối soát); không có push/email ngoài ứng dụng; không có lưu lịch sử GPS dài hạn, routing đường đi thực, background geolocation khi đóng trang, sandbox payment gateway ngoài, transaction toàn kỳ, hoặc API version v1 chuẩn hóa như bản thiết kế tương lai. Đây là các khác biệt kỹ thuật, không được ghi là đã triển khai.
