# 🔖 Grokmarks

**AI-powered bookmark organizer for X (Twitter)** - Automatically organize your bookmarks into smart topics, chat with your saved content, and generate audio overviews.

## ✨ Features

- **Smart Topic Classification** - AI automatically groups your bookmarks into relevant topics
- **Chat with Bookmarks** - Ask questions about your saved tweets and get AI-powered answers
- **Audio Overview** - Generate podcast-style audio summaries with tweet synchronization
- **Live Feed** - See real-time tweets related to your topics
- **Add & Move Tweets** - Manually add tweets by URL and organize them between topics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- X (Twitter) Developer Account with API credentials
- xAI API key (for Grok)

### 1. Clone the Repository

```bash
git clone https://github.com/spatnala18/grokmarks.git
cd grokmarks
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend` folder:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# X API Credentials (from developer.x.com)
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_CALLBACK_URL=http://localhost:8000/auth/callback

# xAI API Key (from x.ai)
XAI_API_KEY=your_xai_api_key

# Session Secret (any random string)
SESSION_SECRET=your_random_secret_string
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Run the App

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open in Browser

Go to: **http://localhost:5173**

Click "Connect with X" to log in and start organizing your bookmarks!

## 📁 Project Structure

```
grokmarks/
├── backend/          # Node.js + Express API server
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Grok AI, X API integrations
│   │   └── store/    # SQLite database
│   └── data/         # Database files
├── frontend/         # React + Vite app
│   └── src/
│       ├── components/
│       └── api.ts    # API client
└── docs/             # Documentation
```

## 🔧 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite (better-sqlite3)
- **AI:** xAI Grok API (grok-4-1-fast-non-reasoning)
- **Auth:** X OAuth 2.0

## 🎙️ Audio Overview Feature

The Audio Overview feature uses xAI's Grok Voice API to generate podcast-style summaries:

1. Select a topic
2. Go to the "Audio Overview" tab
3. Click "Generate Audio Overview"
4. Listen while tweets are highlighted in sync with the audio!

## 📝 License

MIT

---

Built for the xAI Hackathon 2025
