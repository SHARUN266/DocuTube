# 🚀 DocuTube - AI-Powered Tech Lead & PM in your Browser

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-Backend-orange?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-AI-blue?style=for-the-badge&logo=google)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss)

**DocuTube** is an intelligent AI workspace that takes ANY YouTube video link (especially coding tutorials, system design videos, or project builds) and instantly converts it into a full suite of **Production-Ready Engineering Documents**. 

Stop pausing, rewinding, and taking notes from 4-hour long YouTube coding tutorials. Get the complete blueprint upfront, and start "vibe coding" easily.

---

## ✨ Features

- **📄 Complete Project Blueprint**: Generates 7 critical documents in under 60 seconds:
  - PRD (Product Requirements Document)
  - TRD (Technical Requirements Document & Architecture)
  - SRS (Software Requirements Specification)
  - API Documentation (REST endpoints, payloads)
  - Database Schema
  - QA Test Cases
  - Setup & Deployment Guides
- **🤖 Interactive Video Chat**: Chat directly with the AI about the video. It has full context of the video's transcript and the generated docs.
- **🛡️ Graceful Manual Fallback**: If YouTube aggressively blocks our automated scrapers from cloud IPs, the UI seamlessly shifts to a manual transcript input state, preserving your context without breaking the experience.
- **⚡ Real-time Database**: Powered by Convex for instant data synchronization and workspace management.
- **🔐 Secure API Key Management**: Bring your own Gemini API key. Keys are encrypted and stored locally in your browser.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Framer Motion
- **Backend & Database**: Convex (Serverless Real-time Database & Functions)
- **Authentication**: Clerk (with JWT template integration for Convex)
- **AI & Processing**: Google Generative AI (`@google/generative-ai`) Gemini 2.5 Flash

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
Create a `.env.local` file by copying the provided example:
```bash
cp .env.example .env.local
```
Fill in your Convex and Clerk credentials in `.env.local`. 
*(Note: Gemini API keys are entered directly in the UI, not in the env file)*

### 4. Start the Convex Backend
Run Convex to initialize your real-time database and sync your schema:
```bash
npx convex dev
```

### 5. Start the Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action!

---

## ⚠️ Important Note on Production Deployment
If you deploy this application to a serverless provider like Vercel or AWS, the automatic YouTube transcript extraction might fail due to **YouTube's aggressive IP/Bot Blocking** on data center IPs. 

We have engineered a **Graceful Fallback UI** so that if the extraction fails, the user is prompted to paste the transcript manually, and the application resumes the AI generation seamlessly. 

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/SHARUN266/DocuTube/issues).

## 📄 License
This project is open-source and available under the MIT License.
