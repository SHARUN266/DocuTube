# 🚀 DocuTube - AI-Powered YouTube to Document Generator

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-Backend-orange?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-AI-blue?style=for-the-badge&logo=google)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss)

**DocuTube** is an intelligent web application that seamlessly converts any YouTube video into structured, easy-to-read documents, study notes, or comprehensive summaries. Powered by Google's cutting-edge **Gemini 2.5 Flash** model and built on a high-performance **Next.js + Convex** stack.

---

## ✨ Features

- **📺 Instant Transcript Extraction**: Automatically fetches captions and transcripts directly from YouTube URLs.
- **🧠 AI Document Generation**: Uses Gemini 1.5/2.5 Flash to process lengthy transcripts and convert them into organized, formatted markdown documents.
- **⚡ Real-time Database**: Powered by Convex for instant data synchronization, workspace management, and fast querying.
- **🎨 Modern UI/UX**: Designed with TailwindCSS for a beautiful, responsive, and highly interactive user experience.
- **🛡️ Secure API Key Management**: Users can securely input their own Gemini API keys via the UI.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Lucide Icons
- **Backend & Database**: Convex (Serverless Real-time Database & Functions)
- **AI & Processing**: Google Generative AI (`@google/generative-ai`), YouTube Transcript Scraper

---

## 💻 Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/SHARUN266/DocuTube.git
cd DocuTube
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory and add your Convex and Gemini credentials:
```env
# Convex Deployment URL
NEXT_PUBLIC_CONVEX_URL="your-convex-url"

# Google Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Start the Convex Backend
Run Convex in a separate terminal to initialize your real-time database:
```bash
npx convex dev
```

### 5. Start the Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action!

---

## ⚠️ Important Developer Note on Production Deployment
If you deploy this application to a serverless provider like Vercel or AWS, the automatic YouTube transcript extraction might fail due to **YouTube's aggressive IP/Bot Blocking (CAPTCHA)** on data center IPs. 

**For the best and most reliable experience, it is highly recommended to run this project locally (Localhost)**, as residential IP addresses are not blocked by YouTube's bot protection.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/SHARUN266/DocuTube/issues).

## 📄 License
This project is open-source and available under the MIT License.
