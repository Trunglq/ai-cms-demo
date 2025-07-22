# 🎤 TTS Quick Start Guide - 5 phút setup!

## ⚡ TL;DR - Muốn test ngay?

**Hiện tại TTS đã hoạt động ở DEMO MODE!** Bạn có thể test ngay:

1. **Open browser:** http://localhost:3000 (nếu server đang chạy)
2. **Click:** "Text to Speech" 
3. **Nhập text:** "Xin chào, đây là test Google Text-to-Speech!"
4. **Click:** "Tạo giọng nói"

→ **Kết quả:** Demo audio sẽ được tạo ngay lập tức!

---

## 🚀 Setup Real Google Cloud TTS (5 phút)

### **Bước 1: Tạo Google Cloud Project (2 phút)**
1. https://console.cloud.google.com/ → **New Project**
2. **Project name:** `tts-demo-[yourname]`
3. **Enable:** Cloud Text-to-Speech API
4. **Setup:** Billing account (cần có nhưng không charge với free tier)

### **Bước 2: Tạo Service Account (2 phút)**
1. **IAM & Admin** → **Service Accounts** → **Create**
2. **Name:** `tts-service` 
3. **Role:** `Cloud Text-to-Speech User`
4. **Keys** → **Add Key** → **JSON** → **Download**

### **Bước 3: Setup Local (1 phút)**

**Windows:**
```cmd
# Chạy script tự động
setup-tts-credentials.bat

# Hoặc manual:
set GOOGLE_CLOUD_KEY_JSON={"type":"service_account",...}
```

**Mac/Linux:**
```bash
export GOOGLE_CLOUD_KEY_JSON='{"type":"service_account",...}'
```

### **Bước 4: Test**
```bash
# Start server
vercel dev --port 3000

# Test API
curl http://localhost:3000/api/text-to-speech

# Comprehensive test  
node test-tts-comprehensive.js
```

---

## 🎯 Expected Results

### **Demo Mode (No setup required):**
```json
{
  "success": true,
  "mode": "Demo/Fallback Mode",
  "note": "This is a demo endpoint",
  "demoMode": true
}
```

### **Production Mode (With Google Cloud):**
```json
{
  "success": true,
  "mode": "Production Mode", 
  "status": "Connected",
  "supportedLanguages": {...}
}
```

---

## 🔍 Troubleshooting

### **❌ "Permission Denied"**
- ✅ Check: TTS API enabled?
- ✅ Check: Service account có đúng role?
- ✅ Check: JSON key valid?

### **❌ "Quota Exceeded"** 
- ✅ Check: Billing account enabled?
- ✅ Check: Free tier limit (1M chars/month)

### **❌ "Server Connection Failed"**
```bash
# Start server first:
vercel dev --port 3000

# Wait 30 seconds, then test:
curl http://localhost:3000/api/text-to-speech
```

### **❌ "Invalid JSON credentials"**
- ✅ Copy entire JSON content (must be single line)
- ✅ No extra spaces or quotes
- ✅ Include all curly braces: `{"type":"service_account",...}`

---

## 📊 Free Tier Limits

**Google Cloud TTS Free Tier:**
- **Standard voices:** 1,000,000 characters/month
- **WaveNet voices:** First 1M chars free, then $16/1M chars
- **Typical usage:** ~500 articles of 2000 chars each

**Cost estimate:**
- Small article (500 chars): FREE
- Large article (5000 chars): FREE  
- Total: ~200 large articles/month on free tier

---

## 🚀 Next Steps After Setup

1. **✅ Test different voices:**
   - Vietnamese: `vi-VN-Wavenet-A` (female, high quality)
   - English: `en-US-Wavenet-B` (male, high quality)

2. **✅ Integration testing:**
   ```bash
   # Test Vietnamese 
   curl -X POST http://localhost:3000/api/text-to-speech \
     -H "Content-Type: application/json" \
     -d '{"text":"Xin chào từ Google Cloud TTS!","language":"vi-VN","voice":"vi-VN-Wavenet-A"}'
   ```

3. **✅ Frontend testing:**
   - Open http://localhost:3000
   - Go to "Text to Speech" 
   - Paste content from "Content Summary"
   - Generate and download MP3

4. **✅ Production deployment:**
   - Set environment variable in Vercel dashboard
   - Deploy to https://your-app.vercel.app
   - Test live TTS

---

## 💡 Pro Tips

- **Cache:** TTS responses cached 30 mins → faster repeat requests
- **Speed:** Use Standard voices for development, WaveNet for production
- **Integration:** TTS button in Content Summary automatically transfers text
- **Download:** All generated audio can be downloaded as MP3
- **Languages:** Support 5 languages with 24+ voice options

**🎉 Happy Text-to-Speech! 🎤** 

## 🎯 **Cách Debug TTS Production**

### **Bước 1: Deploy Test Page**
```bash
git add .
git commit -m "Add TTS debug test page"
git push origin main
```

### **Bước 2: Chạy Debug Test**
Sau khi Vercel deploy (~2-3 phút), truy cập:
```
https://ai-cms-demo-hnsiunox9-basubos.vercel.app/test-tts-live.html
```

### **Bước 3: Chạy Tests**
1. Click **"4. Run All Tests"** để chạy tất cả
2. Hoặc chạy từng test riêng lẻ

### **Bước 4: Phân Tích Kết Quả**

**🔍 Key Indicators để tìm:**

| Indicator | Meaning | Action |
|-----------|---------|--------|
| `"mode": "Demo/Fallback Mode"` | ❌ **Demo mode** | Credentials missing/invalid |
| `"mode": "Production Mode"` | ✅ **Real mode** | Should work |
| `"demoMode": true` | ❌ **Fake audio** | This is your issue! |
| `"note": "This is demo audio"` | ❌ **Fallback active** | Google Cloud not connected |

## 🔧 **Common Fixes Based on Results**

**❌ Nếu thấy Demo Mode:**
1. **Check Vercel Environment Variables:**
   - Vào Vercel Dashboard → Settings → Environment Variables
   - Xem có `GOOGLE_CLOUD_KEY_JSON` không?

**❌ Nếu JSON Parse Error:**
```bash
# Fix: Convert JSON to single line
cat service-account-key.json | jq -c . | base64
```

**❌ Nếu TTS Client Error:**
- Google Cloud project chưa enable TTS API
- Service Account thiếu permission `Cloud Text-to-Speech User`

---

**🎯 Hãy chạy test và share kết quả với tôi!** 

Tôi sẽ giúp phân tích chính xác issue và đưa ra solution cụ thể để có audio thật thay vì demo. 📊