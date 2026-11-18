# IELTS Study Room

Trang tự học IELTS với 15 chương, 578 video, 75 tài liệu và 535 tệp phụ đề gốc từ Google Drive. Danh sách gồm 653 bài, với phụ đề được liên kết dưới video tương ứng khi tên tệp khớp.

## Mở trang học

Tải mã nguồn về và giải nén. Mở `index.html` trong trình duyệt, hoặc chạy `python -m http.server 8000` từ thư mục chứa `index.html` và mở `http://localhost:8000` để dùng qua HTTP.

Video và tài liệu lấy từ Drive theo quyền xem gốc. Nếu phần nhúng hiện yêu cầu đăng nhập hoặc không phát được, hãy bấm **Mở bài trong Drive** rồi dùng tài khoản Google có quyền. Tệp `.srt` có liên kết riêng. Tiến độ, bài đang học và ghi chú lưu trong trình duyệt theo địa chỉ của trang. Các câu hỏi luyện tập do trang bổ sung và có giải thích đáp án.

## Cấu trúc

- `index.html` và `styles.css` tạo giao diện.
- `app.js` xử lý lộ trình, lọc bài, điều hướng, tiến độ, ghi chú và luyện tập.
- `course.js` là danh mục liên kết. Video và tài liệu gốc được lưu trên Drive theo quyền hiện có.

Repository công khai và dùng GitHub Pages để xuất bản trang học từ nhánh `main`. Quyền xem từng video và tài liệu được quản lý trên Google Drive.
