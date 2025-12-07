# Grokmarks - Feature Documentation

## Overview

Grokmarks is an intelligent bookmark management system that transforms your X (Twitter) bookmarks and timeline into organized, actionable knowledge using xAI's Grok AI. The app provides AI-powered classification, content generation, and an innovative audio podcast experience with real-time tweet synchronization.

---

## Core Features

### 1. X OAuth Authentication

**Description:**
Secure authentication using X's OAuth 2.0 PKCE (Proof Key for Code Exchange) flow. Users log in with their X account to grant the app read access to their bookmarks and timeline.

**How it works:**
- User clicks "Login with X" button
- Redirected to X's authorization page
- After approval, redirected back with authorization code
- Backend exchanges code for access token
- Session created and stored server-side

**Technical Details:**
- Scopes: `tweet.read`, `users.read`, `bookmark.read`, `offline.access`
- Token refresh supported for long sessions
- Session persists via HTTP-only cookies

**User Value:**
- No password to remember
- Secure, industry-standard authentication
- Granular permission control

---

### 2. Bookmark & Timeline Sync

**Description:**
Fetches user's bookmarks and recent timeline posts from X API, storing them for classification and analysis.

**How it works:**
- User clicks "Sync from X" button in navigation
- Backend fetches up to 50 bookmarks and 30 timeline posts
- Posts normalized with author info, timestamps, and URLs
- Duplicate detection prevents re-fetching same posts

**Technical Details:**
- X API v2 endpoints used
- Pagination supported for large collections
- Rate limit handling with exponential backoff
- Posts include: text, author handle/name/avatar, creation date, source (bookmark/timeline)

**User Value:**
- One-click import of all saved content
- Combines bookmarks and timeline for comprehensive view
- Author context preserved for attribution

---

### 3. AI-Powered Topic Classification

**Description:**
Automatically organizes posts into thematic "Topic Spaces" using Grok AI. Each post is analyzed and assigned to a relevant topic cluster.

**How it works:**
1. Posts sent to Grok in batches of 20
2. Grok analyzes content and assigns topic labels
3. Similar labels normalized (e.g., "ML" → "Machine Learning")
4. Posts grouped into Topic Spaces with AI-generated titles and descriptions
5. Small topics merged into "Long Tail / Misc"

**Classification Pipeline:**
```
Posts → Cache Check → Batch Classify → Normalize Labels → Apply Caps → Create Topic Spaces
```

**Technical Details:**
- Model: `grok-4-1-fast-non-reasoning` for classification
- Per-post caching prevents re-classification
- Target: ~12 canonical topics
- Minimum 2 posts per topic (otherwise merged)
- Maximum 20 visible topics

**User Value:**
- Zero manual organization required
- Discovers themes you didn't know existed in your bookmarks
- Intelligent grouping saves hours of manual curation

---

### 4. Topic Spaces

**Description:**
Visual containers for related posts. Each Topic Space has a title, description, post count, and "new" badge for unread content.

**Attributes:**
- **Title**: AI-generated, descriptive name (e.g., "CUDA & GPU Programming")
- **Description**: 2-3 sentence summary of the topic's content
- **Post Count**: Number of posts in this topic
- **New Badge**: Shows count of posts added since last view
- **Trending Data**: Top hashtags, mentions, and keywords within the topic

**User Value:**
- At-a-glance understanding of bookmark themes
- Easy navigation between interest areas
- "New" badges highlight fresh content

---

### 5. Briefing Generation

**Description:**
Generates a research-style briefing document from a Topic Space's posts. Includes executive summary, key insights, and inline citations linking back to source tweets.

**How it works:**
- User clicks "Briefing" button on a Topic Space
- Grok analyzes all posts in the topic
- Generates structured briefing with:
  - Catchy, specific title
  - Introduction paragraph with key finding
  - 4-6 bullet points with specific insights
  - Inline citations as `[tweetId]` markers

**Output Format:**
```markdown
# The Agent Gold Rush: Labs Race to Ship

The AI landscape is experiencing a hiring frenzy unlike anything seen before [1234567890].

## Key Points

• Major labs are specifically hunting agent-building talent, not just ML researchers [1234567890]
• Open-source models are becoming viable for production agent systems [0987654321]
• RL fine-tuning emerges as the secret sauce for agent behavior [1122334455]
```

**Technical Details:**
- Model: `grok-4-1-fast-reasoning`
- Temperature: 0.5 (balanced creativity/accuracy)
- Citations validated against actual post IDs
- Frontend renders `[tweetId]` as clickable `[↗]` links

**User Value:**
- Instant executive summary of any topic
- Research-paper quality with proper attribution
- Clickable citations for fact-checking

---

### 6. Podcast Script Generation (Grokcast)

**Description:**
Creates a conversational podcast script in the style of a tech podcast host. The script is segmented into themes for audio synchronization.

**How it works:**
- User clicks "Podcast" button on a Topic Space
- Grok generates a narrative script with:
  - Introduction segment
  - 2-3 thematic segments
  - Wrap-up segment
- Each segment tagged with related tweet IDs (max 3 per segment)

**Script Style Guidelines:**
- Storytelling over listing ("the vibe is..." not "Person A said, Person B said")
- Trends and patterns over individual quotes
- Opinion and analysis encouraged
- TTS-friendly formatting (spelled out acronyms, short sentences)

**Output Structure:**
```json
{
  "title": "Agent Fever Hits the Labs",
  "segments": [
    {
      "segmentId": "intro",
      "segmentType": "intro",
      "text": "Hey everyone, welcome back to Grokcast!...",
      "tweetIds": []
    },
    {
      "segmentId": "theme_1",
      "segmentType": "theme",
      "themeTitle": "The Hiring Frenzy",
      "text": "If you walked NeurIPS this week...",
      "tweetIds": ["123", "456", "789"]
    }
  ]
}
```

**User Value:**
- Transforms dry bookmarks into engaging narrative
- Perfect for listening while commuting/exercising
- Captures the "vibe" of conversations, not just facts

---

### 7. Text-to-Speech Audio Generation

**Description:**
Converts podcast scripts into spoken audio using xAI's TTS API. Generates per-segment audio with accurate timing for synchronization.

**How it works:**
- User clicks "Generate Audio" after script is created
- Each segment sent to TTS API separately
- Audio buffers concatenated into single MP3
- Timeline manifest created with segment start/end times

**Voice Options:**
- Ara (default) - Clear, neutral female voice
- Rex - Male voice
- Sal, Eve, Una, Leo - Additional options

**Technical Details:**
- API: `https://api.x.ai/v1/audio/speech`
- Format: MP3 (browser-compatible)
- Bitrate: ~32kbps (~4KB/second)
- Max chunk size: 3000 characters
- Duration estimated from buffer size

**Timeline Manifest:**
```json
{
  "totalDuration": 66.213,
  "entries": [
    {"segmentId": "intro", "startTime": 0, "endTime": 8.17, "tweetIds": []},
    {"segmentId": "theme_1", "startTime": 8.17, "endTime": 31.85, "tweetIds": ["123", "456", "789"]}
  ]
}
```

**User Value:**
- Hands-free consumption of bookmark content
- Professional-quality AI narration
- Accurate segment timing for visual sync

---

### 8. Grokcast Mode (Audio + Tweet Sync)

**Description:**
Immersive listening experience that synchronizes audio playback with visual tweet display. As each segment plays, the relevant tweets appear on screen.

**How it works:**
- User presses play on audio player
- App enters "Grokcast Mode" - full-screen listening view
- Audio `timeupdate` events trigger segment detection
- Current segment's tweets displayed with author info
- Segment type badge shows context (intro/theme/wrapup)

**Sync Logic:**
```typescript
// Find current segment based on audio time
for (const entry of timeline.entries) {
  if (currentTime >= entry.startTime && currentTime < entry.endTime) {
    return entry; // This segment is playing
  }
}
```

**Visual States:**
- **Waiting**: Pulsing headphones icon, "Press play to begin"
- **Intro Playing**: "🎙️ Introduction" badge, no tweets
- **Theme Playing**: "💡 Theme Title" badge, 1-3 tweet cards
- **Wrapup Playing**: "🎯 Wrap Up" badge, no tweets

**User Value:**
- NotebookLM-style interactive podcast experience
- Visual context enhances audio comprehension
- Easy access to source tweets while listening

---

### 9. Q&A with Grounding

**Description:**
Ask questions about any Topic Space and receive answers grounded in the actual tweets. Responses include inline citations for verification.

**How it works:**
- User types question in chat input
- Question sent to Grok with topic's tweets as context
- Grok answers based ONLY on provided tweets
- Response includes `[tweetId]` citations
- Confidence level indicated (high/medium/low)

**Example:**
```
User: "What are people saying about RL for agents?"

Grok: "There's significant excitement about RL fine-tuning for agent behavior. 
One researcher argues that reward computation should live in the agent, not 
the environment [1234567890]. Meanwhile, others see gold in combining RL with 
open-weight models for specialized agents [0987654321]."
```

**Technical Details:**
- Model: `grok-4-1-fast-reasoning`
- Context: Up to 25 posts from the topic
- Citations validated against actual post IDs
- Answers explicitly grounded - won't make up information

**User Value:**
- Instant answers about your bookmarked content
- No hallucination - only cites real tweets
- Great for research and fact-finding

---

### 10. Trending Analysis

**Description:**
Extracts trending hashtags, mentions, and keywords from each Topic Space to show what's hot within that theme.

**How it works:**
- Posts analyzed for patterns:
  - Hashtags: `#AI`, `#LLM`, etc.
  - Mentions: `@OpenAI`, `@AnthropicAI`, etc.
  - Keywords: Common significant terms
- Frequency and percentage calculated
- Top items displayed in "Live Pulse" section

**Output:**
```json
{
  "hashtags": [{"text": "#AI", "count": 12, "percentage": 48}],
  "mentions": [{"text": "@OpenAI", "count": 8, "percentage": 32}],
  "keywords": [{"text": "agents", "count": 15, "percentage": 60}]
}
```

**User Value:**
- Quick pulse check on what's trending
- Identifies key players and topics
- Surfaces patterns you might miss

---

### 11. Thread Generation

**Description:**
Transforms a Topic Space into a Twitter/X thread format, ready to post. Creates an engaging, shareable summary of the topic.

**How it works:**
- User clicks "Thread" button
- Grok generates a series of connected tweets
- Each tweet under 280 characters
- Includes hooks, insights, and call-to-action
- References original tweets for attribution

**User Value:**
- Easy content creation from curated bookmarks
- Shareable format for building audience
- Proper attribution to original authors

---

## Future Features (Planned)

### 12. Topic Video Trailers (Grok Imagine)

**Description:**
Generate 6-second video intros for Topic Spaces or Grokcast episodes using Grok Imagine.

**Planned Use Cases:**
- Animated intro before podcast plays
- Topic Space thumbnail/preview
- Segment transition videos
- "Vibe check" visual summaries

**Status:** API access available, implementation pending

---

## Technical Architecture Summary

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Authentication | X OAuth 2.0 PKCE |
| AI Classification | Grok `grok-4-1-fast-non-reasoning` |
| AI Generation | Grok `grok-4-1-fast-reasoning` |
| Text-to-Speech | xAI TTS API |
| Storage | In-memory (Maps) |

---

## API Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Initiate X OAuth |
| `/auth/callback` | GET | OAuth callback |
| `/auth/status` | GET | Check auth state |
| `/api/x/sync` | POST | Fetch bookmarks/timeline |
| `/api/topics` | GET | List all Topic Spaces |
| `/api/topics/:id` | GET | Get topic with posts |
| `/api/topics/:id/briefing` | POST | Generate briefing |
| `/api/topics/:id/podcast` | POST | Generate podcast script |
| `/api/topics/:id/podcast/audio` | POST | Generate audio |
| `/api/topics/:id/qa` | POST | Answer question |
| `/api/topics/:id/thread` | POST | Generate thread |
| `/api/podcasts/:filename` | GET | Serve audio file |
