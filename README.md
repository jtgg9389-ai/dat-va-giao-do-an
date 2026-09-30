# dat-va-giao-do-an
Nguyễn Minh Đưc 2506022014
Nguyễn Trong Khang 2513022003
Nguyễn Gia Huy 2506022010


Yêu cầu đồ án: Hệ thống Đặt và Giao đồ ăn
1. Yêu cầu chức năng (Functional Requirements)
1.1. Khách hàng (Customer)
FR-1: Đăng ký/đăng nhập tài khoản
FR-2: Tìm kiếm, lọc nhà hàng (theo khu vực, loại món, đánh giá)
FR-3: Xem menu, thêm món vào giỏ hàng, đặt đơn
FR-4: Thanh toán đơn hàng (giả lập cổng thanh toán hoặc COD)
FR-5: Theo dõi trạng thái đơn hàng theo thời gian thực (real-time)
FR-6: Xem vị trí tài xế trên bản đồ trong lúc giao hàng
FR-7: Hủy đơn (trong điều kiện cho phép theo trạng thái)
FR-8: Đánh giá nhà hàng/tài xế sau khi hoàn tất đơn
FR-9: Xem lịch sử đơn hàng
1.2. Nhà hàng (Restaurant)
FR-10: Quản lý menu (thêm/sửa/xóa món, cập nhật tình trạng còn/hết hàng)
FR-11: Nhận thông báo đơn hàng mới theo thời gian thực
FR-12: Xác nhận hoặc từ chối đơn hàng
FR-13: Cập nhật trạng thái chế biến (đang làm → sẵn sàng giao)
FR-14: Xem báo cáo doanh thu, lịch sử đối soát
1.3. Tài xế (Driver)
FR-15: Bật/tắt trạng thái sẵn sàng nhận đơn (online/offline)
FR-16: Nhận thông báo cuốc giao hàng, chấp nhận/từ chối trong thời gian giới hạn
FR-17: Cập nhật vị trí GPS liên tục trong lúc giao hàng
FR-18: Cập nhật trạng thái đơn (đã lấy hàng, đang giao, đã giao)
FR-19: Xem thu nhập theo ngày/kỳ đối soát
1.4. Hệ thống/Admin
FR-20: Quản lý người dùng, nhà hàng, tài xế (duyệt, khóa tài khoản)
FR-21: Thuật toán gán tài xế tự động dựa trên khoảng cách, trạng thái, tải công việc
FR-22: Quản lý toàn bộ vòng đời đơn hàng (state machine), ghi log lịch sử trạng thái
FR-23: Đối soát định kỳ (theo ngày/tuần): tính tiền trả cho nhà hàng, tài xế, hoa hồng hệ thống
FR-24: Xử lý khiếu nại, sai lệch số liệu đối soát (VD: COD không khớp)
FR-25: Gửi thông báo cho các bên liên quan (email/push/socket) khi trạng thái đơn thay đổi
FR-26: Thống kê, báo cáo tổng quan (doanh thu, số đơn, hiệu suất tài xế...)
2. Yêu cầu phi chức năng (Non-Functional Requirements)
Mã	Yêu cầu	Mô tả
NFR-1	Real-time	Cập nhật vị trí tài xế và trạng thái đơn phải hiển thị gần như tức thời (WebSocket, độ trễ < 5s)
NFR-2	Khả năng mở rộng	Kiến trúc module hóa, có thể tách thành microservices sau này
NFR-3	Bảo mật	Xác thực JWT, phân quyền theo vai trò (RBAC), mã hóa mật khẩu
NFR-4	Tính nhất quán dữ liệu	Giao dịch (transaction) đảm bảo khi tạo đơn, thanh toán, đối soát không bị mất mát/trùng lặp
NFR-5	Khả năng chịu lỗi	Xử lý khi tài xế mất kết nối, đơn không tìm được tài xế (timeout, retry, fallback)
NFR-6	Hiệu năng	Truy vấn tài xế gần nhất phải tối ưu (index địa lý, giới hạn bán kính tìm kiếm)
NFR-7	Khả năng kiểm thử/theo dõi	Log đầy đủ lịch sử trạng thái đơn để phục vụ audit và đối soát
NFR-8	UI/UX	Giao diện responsive, riêng biệt/rõ ràng cho từng vai trò (customer/restaurant/driver/admin)
3. Yêu cầu về phạm vi kỹ thuật (Scope/Constraints)
Ràng buộc công nghệ: dùng Postgres (có thể kèm PostGIS), Redis cho cache vị trí realtime, WebSocket cho tracking
Ràng buộc nghiệp vụ:
Một đơn hàng chỉ được gán cho 1 tài xế tại một thời điểm
Trạng thái đơn chỉ được chuyển theo đúng luồng đã định nghĩa (không nhảy cóc trạng thái)
Đối soát chỉ tính trên các đơn đã ở trạng thái COMPLETED
Giới hạn đồ án : không tích hợp cổng thanh toán thật (dùng giả lập), dùng OpenStreetMap/Leaflet thay vì Google Maps trả phí, không triển khai app mobile thật (có thể làm web responsive giả lập)
