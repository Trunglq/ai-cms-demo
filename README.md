
# AI CMS Demo

<!-- Dummy comment for Vercel refresh -->

## Mô tả dự án

Đây là một trang demo tính năng AI ứng dụng vào CMS với cấu trúc đơn giản. Menu bên trái là danh sách các tính năng, ví dụ:

- AI viết bài tự động
- Kiểm tra lỗi chính tả
- Gợi ý chủ đề HOT dựa trên MXH / Google Trends
- Text to Speech
- Speech to Text
- Dịch bài báo từ Anh sang Việt
- Dịch từ Việt sang Anh
- Xuất bản đa nền tảng
- Chấm điểm chất lượng bài báo (dựa trên số từ, chủ đề, cấu trúc, SEO, v.v.)
- Quản lý ảnh bằng AI: Tự động nhận diện gương mặt, địa điểm, sự kiện...

## Công nghệ sử dụng

- Frontend: Bootstrap
- AI: Grok API
- Triển khai: Sử dụng GitHub để upload và chạy prototype trên Vercel 

## Yêu cầu hệ thống

- Node.js phiên bản 14 hoặc cao hơn (nếu sử dụng scripts build)
- Trình duyệt hiện đại (Chrome, Firefox, v.v.)
- Tài khoản Grok API để sử dụng các tính năng AI
- Git và GitHub account để deploy

## Cài đặt

1. Clone repository từ GitHub: `git clone https://github.com/Trunglq/ai-cms-demo.git`
2. Chuyển đến thư mục dự án: `cd ai-cms-demo`
3. Cài đặt dependencies (nếu có): `npm install` (giả sử sử dụng npm cho Bootstrap và các thư viện khác)
4. Thiết lập API key: Tạo file `.env` và thêm `GROK_API_KEY=your-key`

## Hướng dẫn sử dụng

1. Chạy ứng dụng locally: `npm start` (hoặc tương tự tùy theo setup)
2. Truy cập qua trình duyệt tại `http://localhost:3000` (giả sử port mặc định)
3. Sử dụng menu bên trái để chọn tính năng, ví dụ: Nhập văn bản để dịch hoặc kiểm tra lỗi chính tả.
4. Để deploy: Push lên GitHub và liên kết với Vercel để chạy prototype.

(Thêm screenshot hoặc video demo nếu có)

## Tính năng mở rộng

Một số ý tưởng để mở rộng dự án:
- Tích hợp AI tạo hình ảnh (sử dụng Grok hoặc API khác)
- Phân tích sentiment của bài viết
- Tự động tối ưu hóa SEO cho bài báo

## License

Dự án này được cấp phép dưới MIT License. Xem file LICENSE để biết chi tiết.

## Contributing

Chúng tôi hoan nghênh đóng góp! Để tham gia:
1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Commit thay đổi: `git commit -m 'Thêm tính năng XYZ'`
4. Push branch: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

## Demo Link

- Prototype chạy trên Vercel: [Link demo](https://ai-cms-demo.vercel.app)

## Thông tin GitHub

- Repository: [github.com/Trunglq/ai-cms-demo](https://github.com/Trunglq/ai-cms-demo)
- Owner: Trunglq
- Branch chính: main 
