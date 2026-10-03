**TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)**

**HỆ THỐNG ĐẶT VÀ GIAO ĐỒ ĂN**

Phiên bản: 1.0\
Vai trò lập tài liệu: Business Analyst (BA)\
Phạm vi: Hệ thống khách hàng -- nhà hàng -- shipper -- quản trị viên

# 1. Giới thiệu

## 1.1. Mục đích

Tài liệu SRS mô tả các yêu cầu nghiệp vụ, yêu cầu chức năng, yêu cầu phi
chức năng, quy tắc nghiệp vụ, dữ liệu và tiêu chí nghiệm thu của Hệ
thống Đặt và Giao Đồ Ăn. Đây là cơ sở cho thiết kế, lập trình, kiểm thử
và nghiệm thu.

## 1.2. Phạm vi

-   Khách hàng: đăng ký, đăng nhập, tìm kiếm, xem món, giỏ hàng, đặt
    hàng, thanh toán, theo dõi và đánh giá.

-   Nhà hàng: quản lý thông tin, danh mục/món ăn và xử lý đơn.

-   Shipper: nhận đơn, lấy món, giao hàng và cập nhật trạng thái.

-   Admin: quản lý người dùng, nhà hàng, shipper, món ăn, đơn hàng, đánh
    giá và báo cáo.

## 1.3. Thuật ngữ

  -----------------------------------------------------------------------
  **Thuật ngữ**                       **Ý nghĩa**
  ----------------------------------- -----------------------------------
  BA                                  Business Analyst -- người phân tích
                                      nghiệp vụ

  SRS                                 Software Requirements Specification

  COD                                 Thanh toán khi nhận hàng

  Actor                               Tác nhân tương tác với hệ thống

  Order                               Đơn hàng

  FR                                  Functional Requirement -- yêu cầu
                                      chức năng

  NFR                                 Non-functional Requirement -- yêu
                                      cầu phi chức năng

  AC                                  Acceptance Criteria -- tiêu chí
                                      nghiệm thu
  -----------------------------------------------------------------------

# 2. Tổng quan hệ thống

## 2.1. Actor

  -----------------------------------------------------------------------
  **Actor**                           **Mô tả**
  ----------------------------------- -----------------------------------
  Khách hàng                          Người đặt và nhận đồ ăn.

  Nhà hàng                            Cung cấp món ăn và xử lý đơn.

  Shipper                             Nhận, lấy và giao đơn.

  Admin                               Quản trị và giám sát hệ thống.
  -----------------------------------------------------------------------

## 2.2. Quy trình nghiệp vụ tổng quát

Khách hàng → tìm nhà hàng/món → thêm giỏ hàng → nhập địa chỉ → chọn
thanh toán → tạo đơn → nhà hàng xác nhận → chuẩn bị món → shipper nhận →
giao hàng → hoàn tất → khách hàng đánh giá.

# 3. Danh sách Use Case

  -----------------------------------------------------------------------
  **Mã**                  **Use Case**            **Actor chính**
  ----------------------- ----------------------- -----------------------
  UC01                    Đăng ký tài khoản       Khách hàng

  UC02                    Đăng nhập               Tất cả actor

  UC03                    Quản lý hồ sơ/địa chỉ   Khách hàng

  UC04                    Tìm kiếm nhà hàng/món   Khách hàng

  UC05                    Xem chi tiết món        Khách hàng

  UC06                    Quản lý giỏ hàng        Khách hàng

  UC07                    Đặt hàng                Khách hàng

  UC08                    Thanh toán              Khách hàng

  UC09                    Theo dõi/Hủy đơn        Khách hàng

  UC10                    Đánh giá đơn hàng       Khách hàng

  UC11                    Quản lý món ăn          Nhà hàng

  UC12                    Xử lý đơn hàng          Nhà hàng

  UC13                    Nhận và giao đơn        Shipper

  UC14                    Quản trị hệ thống       Admin

  UC15                    Xem báo cáo             Admin
  -----------------------------------------------------------------------

# 4. Yêu cầu chức năng

  -----------------------------------------------------------------------
  **Mã**                  **Chức năng**           **Mô tả**
  ----------------------- ----------------------- -----------------------
  FR-01                   Đăng ký                 Hệ thống cho phép tạo
                                                  tài khoản bằng email/số
                                                  điện thoại và mật khẩu;
                                                  không cho trùng tài
                                                  khoản.

  FR-02                   Đăng nhập               Kiểm tra thông tin xác
                                                  thực và phân quyền theo
                                                  vai trò.

  FR-03                   Quản lý hồ sơ           Cho phép xem/sửa họ
                                                  tên, số điện thoại và
                                                  địa chỉ giao hàng.

  FR-04                   Tìm kiếm                Tìm theo tên món, nhà
                                                  hàng hoặc danh mục; hỗ
                                                  trợ lọc cơ bản.

  FR-05                   Chi tiết món            Hiển thị tên, ảnh, giá,
                                                  mô tả, nhà hàng, trạng
                                                  thái còn hàng và đánh
                                                  giá.

  FR-06                   Giỏ hàng                Thêm/xóa món, thay đổi
                                                  số lượng, tính tạm
                                                  tính.

  FR-07                   Đặt hàng                Kiểm tra giỏ hàng, địa
                                                  chỉ, giá và tạo mã đơn
                                                  duy nhất.

  FR-08                   Thanh toán              Hỗ trợ COD và phương
                                                  thức online nếu được
                                                  tích hợp; lưu trạng
                                                  thái thanh toán.

  FR-09                   Theo dõi/Hủy            Hiển thị trạng thái
                                                  đơn; chỉ cho hủy ở
                                                  trạng thái được phép.

  FR-10                   Đánh giá                Cho phép đánh giá sau
                                                  khi đơn hoàn thành.

  FR-11                   Quản lý món             Nhà hàng
                                                  thêm/sửa/xóa/ẩn món,
                                                  cập nhật giá và trạng
                                                  thái.

  FR-12                   Xử lý đơn               Nhà hàng xác nhận, từ
                                                  chối và cập nhật tiến
                                                  độ chuẩn bị.

  FR-13                   Giao hàng               Shipper xem đơn được
                                                  phân công và cập nhật
                                                  nhận món/đang giao/đã
                                                  giao.

  FR-14                   Quản trị                Admin quản lý tài
                                                  khoản, nhà hàng, món,
                                                  đơn, đánh giá và danh
                                                  mục.

  FR-15                   Báo cáo                 Admin xem số đơn, doanh
                                                  thu và các chỉ số theo
                                                  khoảng thời gian.
  -----------------------------------------------------------------------

# 5. Yêu cầu phi chức năng

  -----------------------------------------------------------------------
  **Mã**                  **Nhóm**                **Yêu cầu**
  ----------------------- ----------------------- -----------------------
  NFR-01                  Hiệu năng               Các thao tác thông
                                                  thường mục tiêu phản
                                                  hồi ≤ 3 giây trong điều
                                                  kiện tải bình thường.

  NFR-02                  Bảo mật                 Mật khẩu phải được băm;
                                                  phân quyền theo vai
                                                  trò; bảo vệ API và dữ
                                                  liệu cá nhân.

  NFR-03                  Khả dụng                Hệ thống hoạt động ổn
                                                  định, có xử lý lỗi và
                                                  thông báo rõ ràng.

  NFR-04                  Usability               Giao diện dễ hiểu, nhất
                                                  quán, responsive trên
                                                  desktop/mobile.

  NFR-05                  Mở rộng                 Có thể bổ sung voucher,
                                                  ví điện tử, tích điểm
                                                  và nhiều phương thức
                                                  giao hàng.

  NFR-06                  Sao lưu                 Dữ liệu quan trọng cần
                                                  có cơ chế sao lưu và
                                                  khôi phục theo chính
                                                  sách vận hành.
  -----------------------------------------------------------------------

# 6. Quy tắc nghiệp vụ

  -----------------------------------------------------------------------
  **Mã**                              **Quy tắc**
  ----------------------------------- -----------------------------------
  BR-01                               Phải đăng nhập trước khi đặt hàng.

  BR-02                               Giỏ hàng phải có ít nhất một món.

  BR-03                               Không được đặt món đang hết hàng.

  BR-04                               Tổng thanh toán = tiền món + phí
                                      giao hàng -- giảm giá.

  BR-05                               Chỉ đơn hoàn thành mới được đánh
                                      giá.

  BR-06                               Khách chỉ được hủy đơn trong các
                                      trạng thái được quy định.

  BR-07                               Nhà hàng chỉ được quản lý món thuộc
                                      nhà hàng đó.

  BR-08                               Shipper chỉ cập nhật đơn được hệ
                                      thống phân công.

  BR-09                               Mỗi đơn có một mã duy nhất.

  BR-10                               Admin có quyền khóa/mở khóa tài
                                      khoản theo chính sách hệ thống.
  -----------------------------------------------------------------------

# 7. Đặc tả Use Case quan trọng

## UC07 -- Đặt hàng

  -----------------------------------------------------------------------
  **Thuộc tính**                      **Nội dung**
  ----------------------------------- -----------------------------------
  Actor                               Khách hàng

  Tiền điều kiện                      Đã đăng nhập; giỏ có món còn hàng.

  Luồng chính                         1\. Mở giỏ hàng.\
                                      2. Kiểm tra món và số lượng.\
                                      3. Chọn/nhập địa chỉ giao hàng.\
                                      4. Chọn phương thức thanh toán.\
                                      5. Hệ thống tính tổng tiền.\
                                      6. Khách xác nhận đặt hàng.\
                                      7. Hệ thống tạo Order và gửi đến
                                      nhà hàng.

  Luồng thay thế/ngoại lệ             \[\'Món hết hàng → yêu cầu thay
                                      đổi/xóa món.\', \'Địa chỉ thiếu →
                                      yêu cầu bổ sung.\', \'Thanh toán
                                      online thất bại → giữ đơn ở trạng
                                      thái phù hợp hoặc yêu cầu thanh
                                      toán lại.\'\]

  Hậu điều kiện                       Đơn được tạo với mã duy nhất và
                                      trạng thái PENDING.
  -----------------------------------------------------------------------

## UC12 -- Xử lý đơn hàng

  -----------------------------------------------------------------------
  **Thuộc tính**                      **Nội dung**
  ----------------------------------- -----------------------------------
  Actor                               Nhà hàng

  Tiền điều kiện                      Đăng nhập với vai trò nhà hàng; có
                                      đơn mới.

  Luồng chính                         1\. Mở danh sách đơn.\
                                      2. Xem chi tiết.\
                                      3. Xác nhận hoặc từ chối.\
                                      4. Nếu xác nhận, chuyển sang
                                      PREPARING.\
                                      5. Khi hoàn tất món, chuyển READY.

  Luồng thay thế/ngoại lệ             \[\'Hết món → từ chối hoặc đề xuất
                                      xử lý theo chính sách.\'\]

  Hậu điều kiện                       Trạng thái đơn được cập nhật và
                                      khách nhận được thông tin mới.
  -----------------------------------------------------------------------

## UC13 -- Nhận và giao đơn

  -----------------------------------------------------------------------
  **Thuộc tính**                      **Nội dung**
  ----------------------------------- -----------------------------------
  Actor                               Shipper

  Tiền điều kiện                      Đã đăng nhập và có đơn được phân
                                      công.

  Luồng chính                         1\. Xem đơn.\
                                      2. Nhận đơn.\
                                      3. Đến nhà hàng và lấy món.\
                                      4. Chuyển PICKED_UP.\
                                      5. Di chuyển đến khách.\
                                      6. Chuyển DELIVERING.\
                                      7. Giao hàng và xác nhận DELIVERED.

  Luồng thay thế/ngoại lệ             \[\'Không liên lạc được khách → xử
                                      lý theo chính sách giao hàng.\',
                                      \'Sự cố giao hàng → báo hệ
                                      thống/điều phối.\'\]

  Hậu điều kiện                       Đơn hoàn thành; thời điểm giao hàng
                                      được lưu.
  -----------------------------------------------------------------------

# 8. Trạng thái đơn hàng

PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → PICKED_UP →
DELIVERING → DELIVERED

Trạng thái kết thúc ngoài luồng: CANCELLED, REJECTED. Quyền chuyển trạng
thái phải được kiểm soát theo actor.

# 9. Mô hình dữ liệu

  -----------------------------------------------------------------------
  **Entity**                          **Thuộc tính chính**
  ----------------------------------- -----------------------------------
  User                                user_id, full_name, email, phone,
                                      password_hash, role, status,
                                      created_at

  Address                             address_id, user_id, receiver_name,
                                      phone, address_detail, is_default

  Restaurant                          restaurant_id, owner_id, name,
                                      address, phone, status, rating

  Category                            category_id, name, status

  Food                                food_id, restaurant_id,
                                      category_id, name, price, image,
                                      description, stock_status

  Cart                                cart_id, user_id, updated_at

  CartItem                            cart_item_id, cart_id, food_id,
                                      quantity, unit_price

  Order                               order_id, user_id, restaurant_id,
                                      address_id, subtotal, delivery_fee,
                                      discount, total, status, created_at

  OrderItem                           order_item_id, order_id, food_id,
                                      quantity, unit_price

  Payment                             payment_id, order_id, method,
                                      amount, status, paid_at

  Delivery                            delivery_id, order_id, shipper_id,
                                      picked_up_at, delivered_at, status

  Review                              review_id, order_id, user_id,
                                      food_id, rating, comment,
                                      created_at

  Voucher                             voucher_id, code, discount_type,
                                      value, start_at, end_at,
                                      usage_limit, status
  -----------------------------------------------------------------------

# 10. Quan hệ dữ liệu / ERD mức khái niệm

User 1--N Address; User 1--N Order; Restaurant 1--N Food; Category 1--N
Food; Cart 1--N CartItem; Food 1--N CartItem; Order 1--N OrderItem; Food
1--N OrderItem; Order 1--1 Payment; Order 1--1 Delivery; User 1--N
Review; Order 1--N Review (tùy chính sách có thể giới hạn 1 review/đơn).

# 11. Activity Flow -- Đặt hàng

Start → Đăng nhập → Chọn món → Thêm giỏ → Kiểm tra giỏ → \[Giỏ hợp lệ?\]
Không: sửa giỏ → Có: nhập địa chỉ → chọn thanh toán → \[Thanh toán hợp
lệ?\] Không: xử lý lại → Có: tạo đơn → gửi nhà hàng → End.

# 12. Sequence Flow -- Đặt hàng

Khách hàng → UI: Chọn đặt hàng\
UI → Order Service: Tạo đơn\
Order Service → Food/Inventory: Kiểm tra tồn\
Order Service → Payment Service: Xử lý thanh toán\
Payment Service → Order Service: Kết quả\
Order Service → Database: Lưu đơn\
Order Service → Restaurant: Thông báo đơn mới\
Restaurant → Order Service: Xác nhận\
Order Service → UI: Trả mã đơn/trạng thái.

# 13. Yêu cầu giao diện

  -----------------------------------------------------------------------
  **Màn hình**                        **Thành phần chính**
  ----------------------------------- -----------------------------------
  Đăng nhập                           Email/SĐT, mật khẩu, Đăng nhập,
                                      Quên mật khẩu, Đăng ký

  Trang chủ                           Tìm kiếm, danh mục, nhà hàng, món
                                      nổi bật

  Chi tiết món                        Ảnh, tên, giá, mô tả, đánh giá, số
                                      lượng, Thêm vào giỏ

  Giỏ hàng                            Danh sách món, số lượng, tạm tính,
                                      phí giao, giảm giá, tổng

  Checkout                            Địa chỉ, phương thức thanh toán,
                                      ghi chú, Xác nhận

  Theo dõi đơn                        Mã đơn, timeline trạng thái, thông
                                      tin nhà hàng/shipper

  Nhà hàng                            Dashboard, món ăn, đơn mới, đơn
                                      đang xử lý

  Shipper                             Đơn được giao, bản đồ/địa chỉ, cập
                                      nhật trạng thái

  Admin                               Dashboard, người dùng, nhà hàng,
                                      món, đơn, báo cáo
  -----------------------------------------------------------------------

# 14. Phân quyền

  --------------------------------------------------------------------------
  **Chức năng**  **Khách**      **Nhà hàng**   **Shipper**    **Admin**
  -------------- -------------- -------------- -------------- --------------
  Đặt hàng       ✓              \-             \-             \-

  Quản lý món    \-             ✓              \-             ✓

  Xử lý đơn nhà  \-             ✓              \-             ✓
  hàng                                                        

  Giao hàng      \-             \-             ✓              ✓

  Quản lý người  \-             \-             \-             ✓
  dùng                                                        

  Báo cáo        \-             Theo quyền     Theo quyền     ✓
  --------------------------------------------------------------------------

# 15. Acceptance Criteria

  -----------------------------------------------------------------------
  **Mã**            **Chức năng**     **Điều kiện**     **Kết quả mong
                                                        đợi**
  ----------------- ----------------- ----------------- -----------------
  AC-01             Đăng ký           Email/SĐT chưa    Tạo tài khoản
                                      tồn tại           thành công

  AC-02             Đăng ký           Tài khoản đã tồn  Thông báo lỗi,
                                      tại               không tạo trùng

  AC-03             Đặt hàng          Giỏ có món hợp lệ Tạo mã đơn và
                                                        trạng thái
                                                        PENDING

  AC-04             Đặt hàng          Giỏ trống         Không cho tạo đơn

  AC-05             Đặt hàng          Món hết hàng      Không cho đặt món
                                                        đó

  AC-06             Hủy đơn           Đơn ở trạng thái  Đơn chuyển
                                      cho phép hủy      CANCELLED

  AC-07             Đánh giá          Đơn DELIVERED     Cho phép đánh giá

  AC-08             Đánh giá          Đơn chưa hoàn     Không cho đánh
                                      thành             giá

  AC-09             Nhà hàng          Đơn mới           Có thể xác
                                                        nhận/từ chối

  AC-10             Shipper           Đơn được phân     Có thể cập nhật
                                      công              tiến trình giao
  -----------------------------------------------------------------------

# 16. Tiêu chí nghiệm thu hệ thống

-   Tất cả chức năng trong phạm vi phải có luồng thành công và xử lý lỗi
    cơ bản.

-   Phân quyền không cho actor truy cập chức năng ngoài quyền.

-   Dữ liệu đơn hàng, thanh toán và trạng thái phải nhất quán.

-   Giao diện đáp ứng desktop/mobile theo thiết kế.

-   Các Acceptance Criteria quan trọng phải được kiểm thử trước nghiệm
    thu.

# 17. Rủi ro và giả định

  -----------------------------------------------------------------------
  **Loại**                **Nội dung**            **Hướng xử lý**
  ----------------------- ----------------------- -----------------------
  Rủi ro                  Thanh toán online lỗi   Có trạng thái thanh
                                                  toán rõ ràng và cơ chế
                                                  thử lại.

  Rủi ro                  Nhà hàng hết món sau    Kiểm tra tồn trước khi
                          khi khách đặt           xác nhận và cho phép xử
                                                  lý ngoại lệ.

  Rủi ro                  Shipper không nhận đơn  Có cơ chế điều phối/gán
                                                  lại.

  Giả định                Người dùng có internet  Hiển thị lỗi khi mất
                                                  kết nối.

  Giả định                Địa chỉ giao hàng hợp   Cho phép chỉnh sửa và
                          lệ                      xác nhận địa chỉ.
  -----------------------------------------------------------------------

# 18. Backlog gợi ý cho phát triển

  -----------------------------------------------------------------------
  **Epic**                **User Story mẫu**      **Ưu tiên**
  ----------------------- ----------------------- -----------------------
  Tài khoản               Là khách hàng, tôi muốn Must
                          đăng ký/đăng nhập để sử 
                          dụng hệ thống.          

  Khám phá                Là khách hàng, tôi muốn Must
                          tìm món/nhà hàng để     
                          chọn món.               

  Giỏ hàng                Là khách hàng, tôi muốn Must
                          sửa giỏ hàng trước khi  
                          đặt.                    

  Đặt hàng                Là khách hàng, tôi muốn Must
                          đặt và thanh toán đơn.  

  Theo dõi                Là khách hàng, tôi muốn Must
                          theo dõi trạng thái     
                          đơn.                    

  Nhà hàng                Là nhà hàng, tôi muốn   Must
                          quản lý món và xử lý    
                          đơn.                    

  Giao hàng               Là shipper, tôi muốn    Must
                          nhận và cập nhật đơn    
                          giao.                   

  Đánh giá                Là khách hàng, tôi muốn Should
                          đánh giá sau khi nhận   
                          hàng.                   

  Admin                   Là admin, tôi muốn quản Must
                          lý hệ thống và xem báo  
                          cáo.                    

  Khuyến mãi              Là khách hàng, tôi muốn Could
                          áp dụng voucher.        
  -----------------------------------------------------------------------

# 19. Kết luận

SRS này là baseline cho phân tích và phát triển Hệ thống Đặt và Giao Đồ
Ăn. Khi triển khai thực tế, BA cần xác nhận thêm các chính sách về phí
giao hàng, thời gian hủy đơn, hoàn tiền, khuyến mãi, phân công shipper,
thanh toán online và xử lý khiếu nại với stakeholder trước khi chốt
phiên bản yêu cầu.
