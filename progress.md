# Grokmarks - Progress Document

## What This Is
Web app for xAI hackathon. Connects to X account, pulls bookmarks/timeline, groups posts into "Topic Spaces" using Grok, enables actions (Briefing, Podcast Script, Q&A).

## Tech Stack
- **Backend**: Node.js + Express + TypeScript (port 8000)
- **APIs**: X API v2 (OAuth 2.0 PKCE), xAI Grok API
- **Storage**: In-memory (Maps)
- **Models**: `grok-4-1-fast-non-reasoning` (classification), `grok-4-1-fast-reasoning` (normalization, actions)

## Current State
✅ Working end-to-end: Login → Fetch posts → Classify → View Topic Spaces → Actions

### Completed
1. **X OAuth 2.0 PKCE** - `/auth/login`, `/auth/callback`, `/auth/logout`
2. **X API Client** - Bookmarks + Timeline fetching with pagination
3. **Grok API Client** - Chat completions with model fallback
4. **Topic Classification Pipeline**:
   - Batch classification (20 posts/batch)
   - Per-post caching (reduces repeat Grok calls)
   - Label normalization (merges similar topics → ~12 canonical)
   - Topic cap (MAX_TOPICS=20, MIN_POSTS=2, overflow → "Long Tail / Misc")
5. **Topic Spaces** - Created from classified posts with Grok-generated titles/descriptions
6. **Grok Actions** - Briefing, Podcast Script, Q&A with grounding
7. **Inline Citations** - Briefing and Q&A include `[tweetId]` citations rendered as clickable links
8. **Podcast Script** - Grokcast-style conversational script with @handles (no inline citations)
9. **Test Page** - `/test` for manual testing with citation rendering
10. **Frontend UI** - React + Vite + TypeScript app with NotebookLM-inspired layout:
    - Login page with feature highlights
    - Top navigation with sync button and user info
    - Left sidebar with Topic Spaces list
    - Center panel with Topic overview and Q&A
    - Right panel with Guide/Live Pulse/Creator tabs

### To Come Back To
- [ ] **Summarization quality** - Briefings still too generic, need richer prompts or multi-pass synthesis

### Not Yet Built
- [ ] Refresh with incremental classification
- [ ] Persistent storage

---

## File Structure
```
backend/src/
├── config.ts                    # Env vars (X_CLIENT_ID, XAI_API_KEY, etc.)
├── config/
│   └── hyperparams.ts           # All tunable parameters
├── index.ts                     # Express app entry
├── types/index.ts               # Post, TopicSpace, UserSession, etc.
├── store/
│   ├── memory-store.ts          # Sessions, posts, topic spaces
│   └── classification-cache.ts  # Per-post classification cache
├── services/
│   ├── x-auth.ts                # X OAuth 2.0 PKCE flow
│   ├── x-api.ts                 # Bookmarks, timeline fetching
│   ├── grok.ts                  # xAI chat completions
│   ├── grok-actions.ts          # Briefing, Podcast, Q&A
│   ├── topic-classifier.ts      # Classification pipeline
│   └── label-normalizer.ts      # Merge similar labels
└── routes/
    ├── auth.ts                  # /auth/* endpoints
    ├── x-data.ts                # /api/x/sync, /api/x/posts
    ├── topics.ts                # /api/topics/* + actions
    └── test.ts                  # /test HTML page

frontend/src/
├── api.ts                       # Backend API client
├── types.ts                     # TypeScript types
├── utils.ts                     # Utility functions (citations, etc.)
├── App.tsx                      # Main app component
├── App.css                      # App styles
├── index.css                    # Global styles
└── components/
    ├── TopNav.tsx/css           # Top navigation bar
    ├── Sidebar.tsx/css          # Left sidebar (Topic Spaces)
    ├── CenterPanel.tsx/css      # Main content area
    ├── RightPanel.tsx/css       # Guide/Pulse/Creator tabs
    └── LoginPage.tsx/css        # Login page
```

---

## Key Hyperparameters
Location: `backend/src/config/hyperparams.ts`

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `ENABLE_CACHE` | true | Skip re-classifying cached posts |
| `ENABLE_NORMALIZATION` | true | Merge similar topic labels |
| `NORMALIZATION_TARGET_LABELS` | 12 | Target canonical topic count |
| `MAX_TOPICS` | 20 | Max visible topics |
| `MIN_POSTS_PER_TOPIC` | 2 | Below this → Long Tail |
| `CLASSIFICATION_BATCH_SIZE` | 20 | Posts per Grok call |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Redirects to X OAuth |
| GET | `/auth/callback` | OAuth callback, creates session |
| POST | `/auth/logout` | Clears session |
| GET | `/auth/status` | Returns auth state + user info |

### X Data
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/x/sync?maxBookmarks=50&maxTimeline=30&classify=true` | Fetch + classify |
| GET | `/api/x/posts` | Get cached posts |

### Topics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | List all topic spaces |
| GET | `/api/topics/:id` | Get topic with posts |
| POST | `/api/topics/:id/mark-seen` | Reset new post count |
| POST | `/api/topics/:id/briefing` | Generate briefing summary |
| POST | `/api/topics/:id/podcast` | Generate podcast script |
| POST | `/api/topics/:id/qa` | Answer question (body: `{question}`) |
| GET | `/api/topics/:id/history` | Get action history |

---

## Inline Citation System

**Briefing & Q&A**: Use research-paper style inline citations
- Grok outputs text with `[tweetId]` markers
- Example: `"RL reward should be in the environment [1997071224774517003]."`
- Frontend converts `[tweetId]` → clickable `[↗]` link opening `https://x.com/i/status/{tweetId}`
- No separate "References" section - citations are fully inline

**Podcast Script**: Conversational, no inline citations
- Opens with "Hey everyone, welcome back to Grokcast!"
- References people by @handle naturally
- Returns `relatedTweetIds` for "show notes" display
- Hosted from Grok's perspective

---

## Classification Pipeline Flow
```
Posts → [1] Check Cache → [2] Classify New → [3] Normalize Labels → [4] Apply Cap → [5] Create TopicSpaces
```

1. **Cache Check**: Reuse cached `{topicLabel, summary}` for unchanged posts
2. **Classify**: Batch 20 posts → Grok → `{id, topic, summary}` per post
3. **Normalize**: Raw labels + counts → Grok → canonical label mapping
4. **Cap**: Sort by count, enforce MAX_TOPICS, merge small → "Long Tail / Misc"
5. **TopicSpaces**: Group by canonical label, generate title/description

---

## X API Endpoints Used
```
GET https://api.x.com/2/users/{id}/bookmarks
GET https://api.x.com/2/users/{id}/timelines/reverse_chronological
POST https://api.x.com/2/oauth2/token
GET https://api.x.com/2/users/me
```

Fields: `tweet.fields=id,text,author_id,created_at`
Expansions: `author_id` with `user.fields=id,name,username,profile_image_url`

## xAI API Endpoint
```
POST https://api.x.ai/v1/chat/completions
```

---

## Environment Variables
```
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=http://localhost:8000/auth/callback
XAI_API_KEY=...
PORT=8000
FRONTEND_URL=http://localhost:5173
```

---

## Testing
1. Start server: `cd backend && npm run dev`
2. Open: http://localhost:8000/test
3. Click "Login with X"
4. Click "Sync & Classify"
5. View Topic Spaces

---

## Next Steps
1. **Frontend** - React/Vite UI
2. **Refresh** - Incremental classification for new posts
3. **Polish** - Error handling, loading states, rate limit handling
