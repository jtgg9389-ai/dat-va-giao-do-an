# dat-va-giao-do-an
Nguyễn Minh Đưc 2506022014
Nguyễn Trong Khang 2513022003
Nguyễn Gia Huy 2506022010
Vòng đời đơn nhiều tác nhân, gán tài xế, đối soát

1. Phân hệ Khách hàng (User App)
Tài khoản & Hồ sơ: Đăng ký/đăng nhập (SĐT, Email, OTP, Social Login), quản lý địa chỉ nhận hàng, phương thức thanh toán.

Tìm kiếm & Gợi ý:

Định vị GPS tự động xác định vị trí.

Lọc theo món ăn, danh mục, khoảng cách, đánh giá, khuyến mãi.

Đặt hàng & Giỏ hàng:

Chọn món, tùy chỉnh (topping, mức đường/đá, ghi chú cho bếp).

Áp dụng mã giảm giá, voucher.

Thanh toán: Tích hợp ví điện tử (Momo, VNPay, ZaloPay), thẻ ngân hàng (Visa/Mastercard) và COD (tiền mặt).

Theo dõi đơn hàng (Real-time Tracking): Trạng thái đơn (Đã nhận -> Đang nấu -> Đang giao -> Đã giao) và bản đồ theo dõi vị trí tài xế theo thời gian thực.

Đánh giá & Phản hồi: Đánh giá chất lượng món ăn và dịch vụ tài xế (sao + nhận xét).

2. Phân hệ Nhà hàng (Merchant App / Dashboard)
Quản lý Thực đơn: Tạo, chỉnh sửa danh mục, món ăn, giá tiền, topping và bật/tắt trạng thái món (còn hàng/hết hàng).

Quản lý Đơn hàng: Nhận thông báo đơn mới, chấp nhận/từ chối đơn, cập nhật trạng thái "Đang chuẩn bị" hoặc "Đã xong".

Quản lý Hoạt động: Cấu hình giờ mở/đóng cửa, tạm ngưng nhận đơn.

Báo cáo & Doanh thu: Thống kê doanh thu, số lượng đơn theo ngày/tuần/tháng, quản lý rút tiền.

3. Phân hệ Tài xế (Driver App)
Quản lý Đơn giao: Nhận thông báo đơn mới (chấp nhận/từ chối trong thời gian quy định).

Điều hướng & Bản đồ: Tích hợp bản đồ (Google Maps API) dẫn đường từ nhà hàng đến nhà khách.

Trạng thái Đơn hàng: Cập nhật các bước: Đã đến nhà hàng -> Đã lấy hàng -> Đã giao hàng.

Ví & Thu nhập: Theo dõi thu nhập hàng ngày, lịch sử cuốc xe, quản lý tiền nạp/rút từ hệ thống.

4. Hệ thống Quản trị (Admin Web Panel)
Quản lý Người dùng: Quản lý thông tin và phân quyền tài khoản (Khách hàng, Nhà hàng, Tài xế).

Điều phối Đơn hàng: Tự động hoặc thủ công gán đơn cho tài xế tối ưu nhất dựa trên khoảng cách.

Quản lý Khuyến mãi & Chiết khấu: Cấu hình hoa hồng chiết khấu, tạo chương trình giảm giá, mã freeship.

Quản lý Dòng tiền & Đối soát: Quản lý doanh thu toàn hệ thống, tự động tính toán chiết khấu với nhà hàng/tài xế.

Hỗ trợ & Giải quyết khiếu nại: Xử lý hủy đơn, hoàn tiền, phản ánh về chất lượng dịch vụ.

5. Yêu cầu Kỹ thuật & Hạ tầng (Backend & Infrastructure)
Kiến trúc Hệ thống: Microservices hoặc Monolith tối ưu hóa cho bài toán tải cao (High Concurrency) khi có nhiều đơn cùng lúc.

Real-time Engine: Sử dụng WebSocket hoặc Firebase/Socket.io để đẩy thông báo trạng thái đơn và cập nhật tọa độ tài xế liên tục.

Bản đồ & Tọa độ: Tích hợp API Maps (Google Maps, Goong, Mapbox) để tính khoảng cách, định tuyến và tính phí ship.

Hệ thống Thông báo (Push Notification): Firebase Cloud Messaging (FCM) gửi thông báo về ứng dụng.

Bảo mật & Luật pháp: Bảo mật dữ liệu thanh toán (PCI-DSS), mã hóa mật khẩu, đăng ký Bộ Công Thương (nếu hoạt động tại Việt Nam).
