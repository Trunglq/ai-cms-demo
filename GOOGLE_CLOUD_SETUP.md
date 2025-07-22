# 🎤 Google Cloud Text-to-Speech API Setup Guide

## 📋 Prerequisites

1. **Google Cloud Account**: https://cloud.google.com/
2. **Billing Account**: Must be enabled (Free tier available)
3. **Text-to-Speech API**: Must be enabled in your project

---

## 🚀 Step-by-Step Setup

### **1. Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `ai-cms-tts-demo`
4. Click **"Create"**

### **2. Enable Text-to-Speech API**

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Cloud Text-to-Speech API"**
3. Click on it → Click **"Enable"**
4. Wait for API to be enabled (1-2 minutes)

### **3. Create Service Account**

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Fill in details:
   - **Name**: `tts-api-service`
   - **Description**: `Service account for Text-to-Speech API`
4. Click **"Create and Continue"**
5. Grant role: **"Cloud Text-to-Speech User"**
6. Click **"Continue"** → **"Done"**

### **4. Generate Service Account Key**

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create New Key"**
4. Select **JSON** format
5. Click **"Create"**
6. A JSON file will be downloaded automatically
7. **Keep this file safe and never commit it to Git!**

---

## 🔧 Local Development Setup

### **Option 1: Environment Variable (Recommended)**

1. Open the downloaded JSON key file
2. Copy the entire JSON content
3. Set environment variable:

**Windows (PowerShell):**
```powershell
$env:GOOGLE_CLOUD_KEY_JSON='{"type":"service_account","project_id":"your-project",...}'
```

**Windows (Command Prompt):**
```cmd
set GOOGLE_CLOUD_KEY_JSON={"type":"service_account","project_id":"your-project",...}
```

**macOS/Linux:**
```bash
export GOOGLE_CLOUD_KEY_JSON='{"type":"service_account","project_id":"your-project",...}'
```

### **Option 2: Create .env File (Alternative)**

1. Create `.env` file in project root:
```bash
GOOGLE_CLOUD_KEY_JSON={"type":"service_account","project_id":"your-project",...}
```

2. Add to .gitignore:
```gitignore
.env
*.json
service-account-key*.json
```

---

## 🌐 Production Deployment (Vercel)

### **Set Environment Variable in Vercel:**

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add new variable:
   - **Name**: `GOOGLE_CLOUD_KEY_JSON`
   - **Value**: Paste your entire JSON key content
   - **Environment**: Production, Preview, Development
4. Click **"Save"**
5. Redeploy your project

---

## ✅ Verify Setup

### **Test API Status:**
```bash
curl -X GET https://your-app.vercel.app/api/text-to-speech
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Google Cloud Text-to-Speech API is working",
  "status": "Connected",
  "supportedLanguages": {
    "vi-VN": "Vietnamese",
    "en-US": "English (US)",
    ...
  }
}
```

### **Test TTS Generation:**
```bash
curl -X POST https://your-app.vercel.app/api/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào từ Google Cloud Text-to-Speech!",
    "language": "vi-VN",
    "voice": "vi-VN-Standard-A",
    "speed": 1.0
  }'
```

---

## 💰 Pricing Information

### **Google Cloud TTS Pricing (as of 2024):**
- **Standard voices**: $4.00 per 1 million characters
- **WaveNet voices**: $16.00 per 1 million characters  
- **Free tier**: 1 million characters per month (Standard voices)

### **Estimated Usage:**
- **Small article (500 chars)**: ~$0.002 (Standard) / $0.008 (WaveNet)
- **Large article (5000 chars)**: ~$0.02 (Standard) / $0.08 (WaveNet)
- **Monthly limit**: ~2000 small articles or 200 large articles (free tier)

---

## 🔒 Security Best Practices

### **DO:**
✅ Use environment variables for credentials
✅ Set up proper IAM roles (minimum required permissions)
✅ Monitor API usage in Google Cloud Console
✅ Enable API quotas and alerts
✅ Use different service accounts for dev/prod

### **DON'T:**
❌ Commit service account keys to Git
❌ Share credentials in chat/email
❌ Use admin/owner roles for service accounts
❌ Store credentials in client-side code
❌ Use same credentials across multiple projects

---

## 🐛 Troubleshooting

### **Common Issues:**

**1. "Permission Denied" Error:**
- Check if Text-to-Speech API is enabled
- Verify service account has correct role
- Ensure JSON key is valid

**2. "Quota Exceeded" Error:**
- Check usage in Google Cloud Console
- Upgrade to paid plan if needed
- Implement caching to reduce API calls

**3. "Invalid Voice/Language" Error:**
- Verify voice name matches language code
- Use supported voice names from official docs
- Check language code format (e.g., 'vi-VN' not 'vi')

**4. "Authentication Failed" Error:**
- Check if environment variable is set correctly
- Verify JSON format is valid
- Ensure no extra spaces/characters in JSON

---

## 🔗 Useful Resources

- [Google Cloud TTS Documentation](https://cloud.google.com/text-to-speech/docs)
- [Voice List & Samples](https://cloud.google.com/text-to-speech/docs/voices)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [API Quotas & Limits](https://cloud.google.com/text-to-speech/quotas)

---

## 🎉 Next Steps After Setup

1. **Test TTS API** with real credentials
2. **Fine-tune voice settings** for Vietnamese content
3. **Implement caching** to reduce API costs  
4. **Add error handling** for production use
5. **Monitor usage** and set up billing alerts 