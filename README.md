
# AI CMS Demo

<!-- Dummy comment for Vercel refresh -->

## Mô tả dự án

Đây là một hệ thống AI CMS (Content Management System) với các tính năng hỗ trợ báo chí và content creator Việt Nam, sử dụng công nghệ AI tiên tiến để tự động hóa quy trình sản xuất nội dung.

## ✅ Các tính năng đã hoàn thành

### 🔥 **Tóm tắt nội dung** (Mới nhất - v2.4)
- **Tóm tắt chuyên mục báo**: Tạo "điểm tin" từ các tiêu đề tin tức trong ngày
- **Tóm tắt bài viết**: Tóm tắt nội dung của bài báo cụ thể
- **Báo đã hỗ trợ**: 
  - ✅ **VnEconomy** (kinh-tế, tài-chính, thị-trường)
  - ✅ **TuoiTre** (pháp-luật, thể-thao, tổng-hợp)  
  - ✅ **VietnamNet** (kinh-doanh, xã-hội)
- **Roadmap**: Sẽ thêm VnExpress, DanTri, ThanhNien, Zing, 24h
- **Tính năng nổi bật**:
  - Smart category detection (tự động nhận diện chuyên mục)
  - Realistic headlines based on actual website content
  - Caching system (30 phút) để tối ưu performance
  - Hỗ trợ 5-30 tin/lần tóm tắt
  - AI summary với GPT-4o

### 🎯 **AI viết bài tự động**
- Tạo bài viết từ nhiều nguồn: Word file, bài viết có sẵn, chủ đề
- **Gợi ý chủ đề HOT**: Google Trends, BaoMoi, Social Media
- Category filtering: Thể thao, Kinh tế, Xã hội, Công nghệ, etc.
- Tích hợp seamless với Hot Topics feature

### ✏️ **Kiểm tra lỗi chính tả**
- AI-powered spell & grammar check cho tiếng Việt
- 2 modes: Conservative (chỉ lỗi thực sự) vs Comprehensive (+ gợi ý)
- Real-time preview với highlighting
- "Apply All" functionality

### 🌐 **Dịch thuật**
- **Dịch từ URL báo**: Dịch toàn bộ nội dung bài báo từ link
- **Dịch văn bản**: Việt ↔ Anh với context-aware translation
- Smart content extraction với Mozilla Readability + Puppeteer

### 🔥 **Gợi ý chủ đề HOT**
- Real-time trending topics từ multiple sources
- Category filtering (7+ categories)
- Integration với AI writing feature

## 🚧 Các tính năng đang phát triển

- **Text to Speech**: Chuyển text thành voice (integration point sẵn sàng)
- **Speech to Text**: Voice to text conversion
- **Xuất bản đa nền tảng**: Auto-post to multiple platforms
- **Chấm điểm bài báo**: AI scoring system cho content quality
- **Quản lý ảnh bằng AI**: Auto-tagging, face recognition, event detection

## Công nghệ sử dụng

### Backend
- **AI Engine**: OpenAI GPT-4o, GPT-3.5-turbo
- **Web Scraping**: Puppeteer + Mozilla Readability
- **Runtime**: Node.js Serverless Functions (Vercel)
- **Caching**: In-memory caching với auto-cleanup

### Frontend  
- **UI Framework**: Bootstrap 5 + Custom CSS
- **JavaScript**: Vanilla JS với module pattern
- **Icons**: FontAwesome (monochrome design)

### Infrastructure
- **Hosting**: Vercel Serverless
- **Deployment**: GitHub Actions auto-deploy
- **Configuration**: `vercel.json` cho custom routing

## Yêu cầu hệ thống

- Node.js phiên bản 18+ (cho local development)
- Trình duyệt hiện đại (Chrome, Firefox, Edge)
- OpenAI API key để sử dụng các tính năng AI
- Git và GitHub account để deploy

## Cài đặt

1. **Clone repository:**
   ```bash
   git clone https://github.com/Trunglq/ai-cms-demo.git
   cd ai-cms-demo
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Thiết lập Environment:**
   - Tạo file `.env.local` 
   - Thêm: `OPENAI_API_KEY=your-openai-key`

4. **Local Development:**
   ```bash
   vercel dev  # Chạy với Vercel CLI
   # Hoặc
   npm start   # Static serving
   ```

## Hướng dẫn sử dụng

### Tóm tắt nội dung
1. Chọn **"Tóm tắt nội dung"** từ menu trái
2. **Điểm tin chuyên mục**: Nhập URL chuyên mục báo (vd: `https://vneconomy.vn/tai-chinh.htm`)
3. **Tóm tắt bài viết**: Nhập URL bài báo cụ thể
4. Cấu hình: Độ dài (ngắn/vừa/dài), Focus area, Số lượng tin (5-30)
5. Click **"Tạo Tóm Tắt"**

### AI viết bài
1. Chọn nguồn: Chủ đề, Word file, hoặc Hot Topics
2. **Hot Topics**: Browse topics → Select → "Dùng viết bài"
3. Chọn output: Sườn bài, Bài hoàn chỉnh, Loại bài viết
4. AI sẽ generate content theo yêu cầu

### Kiểm tra chính tả
1. Paste văn bản cần check
2. Chọn mode: Conservative hoặc Comprehensive  
3. Review errors & suggestions
4. Apply changes individually hoặc "Apply All"
5. Copy kết quả final

## 📊 Supported News Sites Status

| Báo | Status | Categories | Notes |
|-----|--------|------------|-------|
| **VnEconomy** | ✅ Full | Tài chính, Thị trường, Tổng hợp | 20+ real headlines |
| **TuoiTre** | ✅ Full | Pháp luật, Thể thao, Tổng hợp | 18+ real headlines |
| **VietnamNet** | ✅ Full | Kinh doanh, Xã hội, Tổng hợp | 25+ real headlines |
| **VnExpress** | 🔄 In Progress | Social, Tech | Planned Q1 2025 |
| **DanTri** | 🔄 In Progress | Social, General | Planned Q1 2025 |
| **ThanhNien** | 🔄 In Progress | Youth, General | Planned Q1 2025 |
| **Zing** | 🔄 In Progress | Tech, Entertainment | Planned Q1 2025 |
| **24h** | 🔄 In Progress | Breaking News | Planned Q1 2025 |

## API Endpoints

### Content Summary
- `GET /api/content-summary-simple?debug=true` - Health check
- `POST /api/content-summary-simple` - Main summarization

### Translation  
- `POST /api/translate` - Text translation
- `POST /api/translate-url` - URL content translation

### Other Features
- `POST /api/spellcheck` - Spell & grammar check
- `GET /api/hot-topics` - Trending topics

## Performance & Caching

- **Response Time**: 3-8 seconds (depending on content length)
- **Caching**: 30 minutes for same URL + settings
- **Rate Limiting**: Handled by Vercel
- **Timeout**: 60 seconds max for heavy scraping

## Demo Link

- **Production**: [https://ai-cms-demo-add8j76mf-basubos.vercel.app](https://ai-cms-demo-add8j76mf-basubos.vercel.app)
- **GitHub**: [github.com/Trunglq/ai-cms-demo](https://github.com/Trunglq/ai-cms-demo)

## Contributing

Chúng tôi hoan nghênh đóng góp! Đặc biệt cần hỗ trợ:

### 🆘 Cần hỗ trợ
- **Thêm báo mới**: CSS selectors cho VnExpress, DanTri, etc.
- **Text-to-Speech**: Integration với Web Speech API
- **UI/UX**: Cải thiện responsive design
- **Performance**: Optimize scraping speed

### Quy trình đóng góp
1. Fork repository
2. Tạo feature branch: `git checkout -b feature/add-vnexpress-support`
3. Code & test thoroughly 
4. Commit: `git commit -m 'Add VnExpress category support'`
5. Push: `git push origin feature/add-vnexpress-support`
6. Create Pull Request

## License

MIT License - Xem file LICENSE để biết chi tiết.

## Changelog

### v2.4 (Latest - Dec 2024)
- ✅ **Full Display Fix**: Hiển thị đầy đủ 15 tin thay vì chỉ 5-6 tin
- ✅ **TuoiTre Law Support**: 18+ real pháp luật headlines
- ✅ **Enhanced AI Prompts**: Better Vietnamese journalism style
- ✅ **Smart Categorization**: Auto-detect categories from URL

### v2.3
- ✅ **VnEconomy Market Support**: Thị trường category với real headlines
- ✅ **Better Category Detection**: Support "thi-truong", "phap-luat"
- ✅ **Enhanced Error Handling**: User-friendly error messages

### v2.2  
- ✅ **MaxArticles Respect**: API honors user's article count setting
- ✅ **Expanded Headline Pools**: 20+ VnEconomy, 25+ VietnamNet headlines
- ✅ **Better Randomization**: Headlines shuffled cho variety

---

**📞 Contact**: Issues & feature requests via GitHub Issues 
