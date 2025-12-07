# Grokmarks - Comprehensive Progress Document

## Project Overview

**Grokmarks** is a web application built for the xAI Hackathon that transforms your X (Twitter) bookmarks and timeline into an intelligent, organized knowledge system. It uses Grok AI to:

1. **Classify** posts into meaningful Topic Spaces
2. **Generate** briefings, podcast scripts, and Q&A responses
3. **Create** audio podcasts with real-time tweet synchronization ("Grokcast")

The flagship feature is **Grokcast** - an audio podcast experience that automatically highlights relevant tweets as you listen, providing a NotebookLM-style interactive experience.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + TypeScript (port 5173) |
| **Backend** | Node.js + Express + TypeScript (port 8000) |
| **Database** | In-memory (Maps) - no persistence yet |
| **Auth** | X OAuth 2.0 PKCE Flow |
| **AI Models** | `grok-4-1-fast-non-reasoning` (classification), `grok-4-1-fast-reasoning` (actions) |
| **TTS** | xAI TTS API (`https://api.x.ai/v1/audio/speech`) |

---

## Current State: ✅ FULLY WORKING

The app is end-to-end functional:
1. Login with X OAuth
2. Sync bookmarks + timeline
3. Auto-classify posts into Topic Spaces
4. Generate Briefings, Podcasts, Threads, Q&A
5. **Generate audio with real-time tweet sync (Grokcast)**

---

## Architecture

### File Structure

```
grokmarks/
├── backend/src/
│   ├── config.ts                    # Environment variables
│   ├── config/hyperparams.ts        # Tunable parameters
│   ├── index.ts                     # Express server entry point
│   ├── types/index.ts               # TypeScript types
│   ├── store/
│   │   ├── memory-store.ts          # In-memory sessions, posts, topics
│   │   └── classification-cache.ts  # Per-post classification cache
│   ├── services/
│   │   ├── x-auth.ts                # X OAuth 2.0 PKCE flow
│   │   ├── x-api.ts                 # X API client (bookmarks, timeline)
│   │   ├── grok.ts                  # xAI chat completions wrapper
│   │   ├── grok-actions.ts          # Briefing, Podcast, Q&A generation
│   │   ├── grok-voice.ts            # TTS audio generation with timeline
│   │   ├── topic-classifier.ts      # Post classification pipeline
│   │   ├── label-normalizer.ts      # Merge similar topic labels
│   │   └── trending.ts              # Extract trending hashtags/mentions
│   └── routes/
│       ├── auth.ts                  # /auth/* endpoints
│       ├── x-data.ts                # /api/x/sync, /api/x/posts
│       ├── topics.ts                # /api/topics/* + actions
│       └── test.ts                  # /test HTML page
│
├── frontend/src/
│   ├── api.ts                       # Backend API client
│   ├── types.ts                     # TypeScript types (mirrored from backend)
│   ├── utils.ts                     # Citation parsing, helpers
│   ├── App.tsx                      # Main app with state management
│   ├── App.css                      # App-level styles
│   ├── contexts/
│   │   └── ToastContext.tsx         # Toast notification system
│   └── components/
│       ├── TopNav.tsx/css           # Navigation bar
│       ├── Sidebar.tsx/css          # Topic Spaces list
│       ├── CenterPanel.tsx/css      # Main content + Grokcast view
│       ├── RightPanel.tsx/css       # Guide + Audio Player
│       ├── LoginPage.tsx/css        # Login screen
│       └── Toast.tsx/css            # Toast notifications
│
└── podcasts/                        # Generated audio files (gitignored)
```

---

## Core Features

### 1. X OAuth 2.0 PKCE Authentication

**Files:** `backend/src/services/x-auth.ts`, `backend/src/routes/auth.ts`

The app uses X's OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication without exposing client secrets.

```typescript
// x-auth.ts - Key functions
export function generateAuthUrl(): { url: string; state: string }
export async function handleCallback(code: string, state: string): Promise<UserSession>
export async function refreshAccessToken(session: UserSession): Promise<UserSession>
```

**Flow:**
1. User clicks "Login with X" → redirects to X authorization
2. X redirects back to `/auth/callback` with code
3. Backend exchanges code for access token
4. Session stored in memory with tokens

### 2. Post Classification Pipeline

**Files:** `backend/src/services/topic-classifier.ts`, `backend/src/services/label-normalizer.ts`

Posts are classified into topics using a multi-step pipeline:

```
Posts → [1] Check Cache → [2] Classify New → [3] Normalize Labels → [4] Apply Cap → [5] Create TopicSpaces
```

**Key Code:**

```typescript
// topic-classifier.ts
export async function classifyPosts(
  posts: Post[],
  options?: ClassificationOptions
): Promise<TopicSpace[]>
```

**Hyperparameters** (`backend/src/config/hyperparams.ts`):

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `ENABLE_CACHE` | true | Skip re-classifying cached posts |
| `ENABLE_NORMALIZATION` | true | Merge similar topic labels |
| `NORMALIZATION_TARGET_LABELS` | 12 | Target canonical topic count |
| `MAX_TOPICS` | 20 | Max visible topics |
| `MIN_POSTS_PER_TOPIC` | 2 | Below this → "Long Tail / Misc" |
| `CLASSIFICATION_BATCH_SIZE` | 20 | Posts per Grok API call |

### 3. Grok Actions (Briefing, Podcast, Q&A)

**File:** `backend/src/services/grok-actions.ts`

#### Briefing Generation

Generates a research-style briefing with inline citations:

```typescript
export async function generateBriefing(
  topicTitle: string,
  posts: Post[]
): Promise<ActionResult>
```

**Output format:**
```markdown
# Catchy Title

Opening paragraph with [tweetId] citations.

## Key Points

• Specific insight #1 [tweetId]
• Specific insight #2 [tweetId]
```

#### Podcast Script Generation (Segmented)

Generates a conversational podcast script broken into themed segments:

```typescript
export async function generatePodcastScript(
  topicTitle: string,
  posts: Post[]
): Promise<{ actionResult: ActionResult; segmentedScript: SegmentedPodcastScript }>
```

**Prompt Design (Critical for Quality):**

The podcast prompt was specifically designed to avoid a "laundry list" of names. Key instructions:

```
=== CRITICAL: WHAT NOT TO DO ===
❌ DO NOT list people's names one after another
❌ DO NOT say "Person X said this, Person Y said that"  
❌ DO NOT mention more than 2-3 names in the ENTIRE podcast

=== WHAT TO DO INSTEAD ===
✅ Talk about TRENDS and PATTERNS you see
✅ Tell a STORY about what's happening in the space
✅ Use phrases like "teams are hunting for...", "the vibe is..."
```

**Output Structure:**

```typescript
interface SegmentedPodcastScript {
  title: string;
  segments: PodcastSegment[];    // 3-4 segments: intro, theme_1, theme_2, wrapup
  mentionedHandles: string[];
  allTweetIds: string[];
}

interface PodcastSegment {
  segmentId: string;             // "intro", "theme_1", "wrapup"
  segmentType: 'intro' | 'theme' | 'wrapup';
  text: string;                  // The spoken text
  tweetIds: string[];            // Max 3 tweets per segment
  themeTitle?: string;           // For theme segments only
}
```

### 4. Text-to-Speech Audio Generation

**File:** `backend/src/services/grok-voice.ts`

Converts podcast scripts to audio using xAI's TTS API with per-segment timeline tracking.

```typescript
export async function generateSegmentedPodcastAudio(
  topicSpaceId: string,
  segmentedScript: SegmentedPodcastScript,
  config: Partial<TTSConfig> = {}
): Promise<PodcastAudioResult>
```

**Key Implementation Details:**

1. **Per-Segment Processing:** Each segment is sent to TTS separately to get accurate timing
2. **Duration Estimation:** XAI TTS uses ~32kbps bitrate (~4KB/second)
3. **Timeline Manifest:** Stored alongside audio for frontend sync

```typescript
// Duration calculation (critical fix)
function estimateDurationFromBuffer(buffer: Buffer, format: AudioFormat): number {
  if (format === 'mp3') {
    // XAI TTS appears to use ~32kbps = 4KB/s
    return buffer.length / 4000;  // NOT 15000!
  }
  return buffer.length / 5000;
}
```

**Output Files:**
- `podcasts/podcast_{topicId}_{timestamp}.mp3` - Audio file
- `podcasts/podcast_{topicId}_{timestamp}_timeline.json` - Timeline manifest

**Timeline Manifest Structure:**

```json
{
  "totalDuration": 66.213,
  "entries": [
    {"segmentId": "intro", "startTime": 0, "endTime": 8.17, "tweetIds": []},
    {"segmentId": "theme_1", "startTime": 8.17, "endTime": 31.85, "tweetIds": ["123", "456", "789"], "themeTitle": "Agent Builder Frenzy"},
    {"segmentId": "theme_2", "startTime": 31.85, "endTime": 55.86, "tweetIds": ["111", "222", "333"], "themeTitle": "RL and Scaling Surge"},
    {"segmentId": "wrapup", "startTime": 55.86, "endTime": 66.21, "tweetIds": []}
  ],
  "generatedAt": "2024-12-07T..."
}
```

---

## Grokcast Feature (Audio + Tweet Sync)

The signature feature: audio playback with synchronized tweet highlighting.

### Frontend Architecture

**State Management** (`App.tsx`):

```typescript
// Key state for Grokcast
const [grokcastMode, setGrokcastMode] = useState(false);
const [currentSegment, setCurrentSegment] = useState<TimelineEntry | null>(null);
const [highlightedTweetIds, setHighlightedTweetIds] = useState<string[]>([]);
const [segmentedScript, setSegmentedScript] = useState<SegmentedPodcastScript | null>(null);
const [podcastAudio, setPodcastAudio] = useState<PodcastAudio | null>(null);

// Memoized callbacks to prevent infinite loops (CRITICAL)
const handleSegmentChange = useCallback((segment: TimelineEntry | null) => {
  setCurrentSegment(segment);
  if (segment) {
    setHighlightedTweetIds(segment.tweetIds);
  }
}, []);

const handleGrokcastStart = useCallback(() => {
  setGrokcastMode(true);
}, []);

const handleGrokcastEnd = useCallback(() => {
  setGrokcastMode(false);
  setCurrentSegment(null);
  setHighlightedTweetIds([]);
}, []);
```

**Audio Player Component** (`RightPanel.tsx`):

```typescript
function GrokcastAudioPlayer({ podcastAudio, onSegmentChange, ... }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSegmentIdRef = useRef<string | null>(null);
  
  // Find segment for current audio time
  const findCurrentSegment = useCallback((currentTime: number) => {
    const entries = podcastAudio.timeline?.entries;
    if (!entries) return null;
    
    for (const entry of entries) {
      if (currentTime >= entry.startTime && currentTime < entry.endTime) {
        return entry;
      }
    }
    // Handle audio playing past timeline end
    const lastEntry = entries[entries.length - 1];
    if (currentTime >= lastEntry.startTime) {
      return lastEntry;
    }
    return null;
  }, [podcastAudio.timeline]);
  
  // Handle audio timeupdate event
  const handleTimeUpdate = useCallback(() => {
    const currentTime = audioRef.current?.currentTime || 0;
    const segment = findCurrentSegment(currentTime);
    const newSegmentId = segment?.segmentId || null;
    
    // Only update if segment changed (avoids excessive re-renders)
    if (newSegmentId !== currentSegmentIdRef.current) {
      currentSegmentIdRef.current = newSegmentId;
      onSegmentChange(segment);
    }
  }, [findCurrentSegment, onSegmentChange]);
  
  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onPlay={() => { onGrokcastStart(); handleTimeUpdate(); }}
      onEnded={onGrokcastEnd}
      ...
    />
  );
}
```

**Grokcast Mode View** (`CenterPanel.tsx`):

When `grokcastMode=true`, CenterPanel switches to a focused view showing only the current segment's tweets:

```typescript
// Get tweets for current segment
const segmentTweets = useMemo(() => {
  if (!grokcastMode || !topic || !currentSegment) return [];
  const tweetIds = currentSegment.tweetIds.slice(0, 3);
  return tweetIds
    .map(id => topic.posts.find(p => p.id === id))
    .filter((p): p is Post => !!p);
}, [grokcastMode, topic, currentSegment]);

// UI shows:
// - Segment type badge (🎙️ Introduction, 💡 Theme Title, 🎯 Wrap Up)
// - Related tweets with avatars and text
// - "Waiting for audio to start..." when paused
```

### Critical Bug Fixes Applied

1. **Infinite Loop Fix:** Callbacks were recreated on every render, causing `useEffect` cleanup to loop. Fixed by wrapping callbacks in `useCallback` in `App.tsx`.

2. **Timeline Duration Mismatch:** Initial duration calculation assumed 128kbps (~15KB/s) but XAI TTS uses ~32kbps (~4KB/s). Timeline said 17s, audio was actually 66s. Fixed in `estimateDurationFromBuffer`.

3. **Audio Playing Past Timeline:** When audio exceeded timeline's last segment `endTime`, `findCurrentSegment` returned `null`. Fixed by returning last segment when `currentTime >= lastEntry.startTime`.

---

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Redirects to X OAuth |
| GET | `/auth/callback` | OAuth callback |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/status` | Get auth state + user |

### Data Sync

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/x/sync?maxBookmarks=50&maxTimeline=30&classify=true` | Fetch & classify |
| GET | `/api/x/posts` | Get cached posts |

### Topics & Actions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | List all topic spaces |
| GET | `/api/topics/:id` | Get topic with posts |
| POST | `/api/topics/:id/briefing` | Generate briefing |
| POST | `/api/topics/:id/podcast` | Generate podcast script |
| POST | `/api/topics/:id/podcast/audio` | Generate audio from script |
| POST | `/api/topics/:id/qa` | Answer question |
| GET | `/api/podcasts/:filename` | Serve audio file |

---

## Environment Variables

```bash
# X API Credentials
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=http://localhost:8000/auth/callback

# xAI API
XAI_API_KEY=...

# Server
PORT=8000
FRONTEND_URL=http://localhost:5173
```

---

## Running the App

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev
# Server runs on http://localhost:8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## Known Issues / Future Work

### Not Yet Implemented
- [ ] Persistent storage (currently in-memory)
- [ ] Incremental refresh (re-classify only new posts)
- [ ] Rate limit handling for X API
- [ ] Multiple voices for podcast (dialogue style)

### Quality Improvements Needed
- [ ] Briefing quality - sometimes too generic
- [ ] Better error handling in frontend
- [ ] Loading states could be smoother

### Nice to Have
- [ ] Export podcast as shareable link
- [ ] Embed tweets directly (X embed API)
- [ ] Dark mode toggle

---

## Key Type Definitions

```typescript
// Timeline entry for audio sync
interface TimelineEntry {
  segmentId: string;       // "intro", "theme_1", etc.
  startTime: number;       // Seconds from start
  endTime: number;         // Seconds from start
  duration: number;        // Segment length in seconds
  tweetIds: string[];      // Max 3 tweets to show
  themeTitle?: string;     // For theme segments
}

// Full podcast audio result
interface PodcastAudio {
  podcastUrl: string;      // "/api/podcasts/podcast_xxx.mp3"
  duration: number;        // Total seconds
  voice: string;           // "Ara", "Rex", etc.
  createdAt: string;
  timeline?: TimelineManifest;
}

// Podcast script structure
interface SegmentedPodcastScript {
  title: string;
  segments: PodcastSegment[];
  mentionedHandles: string[];
  allTweetIds: string[];
}
```

---

## Summary

Grokmarks successfully demonstrates:

1. **OAuth Integration** with X's PKCE flow
2. **AI Classification** using Grok for intelligent topic grouping
3. **Content Generation** (briefings, podcasts, Q&A)
4. **Audio Synthesis** using xAI TTS with accurate segment timing
5. **Real-time Sync** between audio playback and tweet highlighting

The Grokcast feature is the showcase - it transforms static tweets into an engaging audio experience with synchronized visual context, similar to NotebookLM's podcast feature but built entirely on xAI's stack.
