# English Learning Application System

## I. Giới thiệu

### 1. Tổng quan

Hệ thống ứng dụng học tiếng Anh là một nền tảng toàn diện được phát triển để hỗ trợ người học Việt Nam cải thiện kỹ năng tiếng Anh một cách hiệu quả. Ứng dụng cung cấp các bài thi nghe, nói, và từ vựng với sự hỗ trợ của công nghệ AI để tạo ra trải nghiệm học tập tương tác và cá nhân hóa.

Hệ thống bao gồm một ứng dụng di động/web xây dựng bằng React Native (phía client) và một máy chủ backend sử dụng Flask (Python). Kiến trúc này cho phép người dùng học tiếng Anh mọi lúc, mọi nơi trên nhiều thiết bị khác nhau.

### 2. Thành phần và các công nghệ dùng

**Front-end (Client)**:
- React Native / React Native Web
- Navigation (React Navigation)
- Axios cho gọi API
- Expo cho phát triển và triển khai ứng dụng

**Back-end (Server)**:
- Flask (Python) làm web framework
- SQLAlchemy làm ORM
- Flask-Admin cho quản trị hệ thống
- JWT cho xác thực
- Vosk cho nhận dạng giọng nói (STT - Speech to Text)
- KokoroTTS cho tổng hợp giọng nói (TTS - Text to Speech)
- Google Gemini AI cho đánh giá và tạo nội dung học tập

**Cơ sở dữ liệu**:
- MySQL

### 3. Giới thiệu thành viên

**Thành viên nhóm nghiên cứu**:
- Nguyễn Thanh Triều (chủ nhiệm đề tài)
- Lê Việt Hải Quân

**Giảng viên hướng dẫn**: 
- Ths Nguyễn Trung Hậu

### 4. Tính năng chính

1. **Bài thi nghe (Listening Exam)**
   - Tạo bài thi nghe tự động với AI
   - Nhiều dạng câu hỏi: trắc nghiệm, điền khuyết, đúng/sai
   - Tự động chấm điểm và giải thích

2. **Bài thi nói (Speaking Exam)**
   - Nhận diện giọng nói và đánh giá phát âm
   - Phân tích độ chính xác và lỗi phát âm
   - Gợi ý cải thiện cho người học

3. **Luyện tập từ vựng**
   - Bài tập từ vựng theo chủ đề
   - Học từ mới trong ngữ cảnh

4. **Trò chuyện với AI (Conversation)**
   - Luyện tập hội thoại với AI
   - Nhận phản hồi ngay lập tức về ngữ pháp và phát âm

5. **Hệ thống quản lý học tập**
   - Theo dõi tiến độ học tập
   - Phân tích điểm mạnh, điểm yếu của người học
   - Gợi ý nội dung học tập phù hợp

## II. Triển khai

### 1. Yêu cầu hệ thống

#### Phía Client:
- Node.js (v14 trở lên)
- npm hoặc yarn

#### Phía Server:
- Python 3.8 trở lên
- MySQL Server
- eSpeak (cho Text-to-Speech)
- Môi trường Linux/Windows với quyền admin

### 2. Cài đặt phía Client

```bash
# Clone repository
git clone [repository-url]
cd NCKH_2425/client

# Cài đặt thư viện
npm install

# Chạy ứng dụng trên web
npm start

# Chạy ứng dụng trên Android
npm run android

# Chạy ứng dụng trên iOS
npm run ios
```

Tạo file `.env` trong thư mục client với nội dung:

```
API_URL=http://localhost:5000
```

### 3. Cài đặt phía Server

```bash
# Di chuyển vào thư mục server
cd NCKH_2425/server

# Tạo môi trường ảo Python
python -m venv venv

# Kích hoạt môi trường ảo
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Cài đặt eSpeak (trên Ubuntu/Debian)
sudo apt-get install espeak

# Cài đặt eSpeak (trên Windows)
# Tải và cài đặt từ http://espeak.sourceforge.net/download.html
```

Tạo file `.env` trong thư mục server với nội dung:

```
SECRET_KEY=your-secret-key
DATABASE_URL=mysql://username:password@localhost/dbname
GEMINI_API_KEY=your-gemini-api-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Tạo cơ sở dữ liệu

```bash
# Kích hoạt môi trường ảo nếu chưa
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Tạo cơ sở dữ liệu và dữ liệu ban đầu
python -m myapp.create_db
```

### 5. Chạy Server

```bash
# Kích hoạt môi trường ảo nếu chưa
flask run --debug
```

## III. Thành quả

### Giao diện ứng dụng

Bổ sung sau

[Link đến video demo trên YouTube](https://youtu.be/your-video-id)

## IV. KẾT

Hệ thống ứng dụng học tiếng Anh đã được phát triển thành công với các tính năng cốt lõi như bài thi nghe, nói và từ vựng. Việc tích hợp công nghệ AI như Google Gemini, nhận dạng giọng nói và tổng hợp giọng nói đã tạo ra một nền tảng học tập tương tác, hiện đại và hiệu quả.

Tuy nhiên, dự án vẫn có thể phát triển thêm nhiều tính năng trong tương lai như:
- Tích hợp nhiều dạng bài tập hơn
- Hệ thống đề xuất học tập thông minh hơn
- Cải thiện độ chính xác của đánh giá phát âm
- Phát triển các tính năng xã hội để người học có thể kết nối và học tập cùng nhau

Kết quả nghiên cứu cho thấy ứng dụng có tiềm năng trở thành công cụ hỗ trợ đắc lực cho việc học tiếng Anh của người Việt Nam, góp phần nâng cao chất lượng dạy và học ngoại ngữ tại Việt Nam.

---

*Dự án này được phát triển trong khuôn khổ Nghiên cứu khoa học sinh viên năm học 2024-2025, Trường Đại học Mở Thành phố Hồ Chí Minh.*