# Grokmarks - UI/UX Documentation

## Overview

Grokmarks uses a three-panel layout inspired by NotebookLM, designed for efficient navigation and content consumption. The interface prioritizes clarity, progressive disclosure, and seamless transitions between reading and listening modes.

---

## Visual Design Language

### Color Palette
- **Background**: Dark theme (`#0a0a0a` to `#1a1a1a`)
- **Cards/Panels**: Slightly elevated (`#1e1e1e` to `#2a2a2a`)
- **Primary Accent**: Electric blue (`#3b82f6`)
- **Secondary Accent**: Purple gradient for AI features
- **Success**: Green (`#22c55e`)
- **Warning**: Amber (`#f59e0b`)
- **Text Primary**: White (`#ffffff`)
- **Text Secondary**: Gray (`#9ca3af`)

### Typography
- **Headings**: Inter/System font, semibold
- **Body**: Inter/System font, regular
- **Monospace**: For code/technical content

### Spacing System
- Base unit: 4px
- Consistent padding: 16px (cards), 24px (panels)
- Gap between elements: 8px, 12px, 16px

### Border Radius
- Cards: 12px
- Buttons: 8px
- Avatars: 50% (circular)

---

## Layout Structure

### Desktop Layout (>1024px)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           TOP NAVIGATION                             │
│  [Logo] Grokmarks                    [Sync] [User Avatar] [Logout]  │
├──────────────┬────────────────────────────────┬─────────────────────┤
│              │                                │                     │
│   SIDEBAR    │        CENTER PANEL            │    RIGHT PANEL      │
│   (280px)    │        (flexible)              │    (380px)          │
│              │                                │                     │
│  ┌────────┐  │  ┌──────────────────────────┐  │  ┌───────────────┐  │
│  │Topic 1 │  │  │     Topic Header         │  │  │  Tab Bar      │  │
│  │  (12)  │  │  │     Title + Meta         │  │  │ Guide|Pulse   │  │
│  ├────────┤  │  ├──────────────────────────┤  │  ├───────────────┤  │
│  │Topic 2 │  │  │                          │  │  │               │  │
│  │  (8) 🔴│  │  │     Topic Overview       │  │  │  Content      │  │
│  ├────────┤  │  │     or Q&A History       │  │  │  Actions      │  │
│  │Topic 3 │  │  │     or Grokcast View     │  │  │  Audio Player │  │
│  │  (5)   │  │  │                          │  │  │               │  │
│  └────────┘  │  ├──────────────────────────┤  │  └───────────────┘  │
│              │  │     Q&A Input Box        │  │                     │
│              │  └──────────────────────────┘  │                     │
│              │                                │                     │
└──────────────┴────────────────────────────────┴─────────────────────┘
```

### Responsive Behavior

**Tablet (768px - 1024px):**
- Sidebar collapses to icons only
- Right panel becomes overlay/drawer
- Center panel takes remaining space

**Mobile (<768px):**
- Single panel view with bottom navigation
- Swipe gestures between panels
- Floating action buttons for key actions

---

## Component Specifications

### 1. Top Navigation Bar

**Layout:**
```
[Logo + Name]                              [Sync Button] [User Info] [Logout]
```

**Elements:**
- **Logo**: Grokmarks icon + text
- **Sync Button**: 
  - Default: "Sync from X" with refresh icon
  - Loading: Spinning icon + "Syncing..."
  - Success: Brief checkmark animation
- **User Info**: Avatar + username dropdown
- **Logout**: Icon button, requires confirmation

**Behavior:**
- Fixed position, always visible
- Sync button disabled during sync operation
- Toast notification on sync completion

---

### 2. Sidebar (Left Panel)

**Purpose:** Topic Space navigation and overview

**Layout:**
```
┌──────────────────────────┐
│  📚 Topic Spaces    [+]  │  ← Header with add button (future)
├──────────────────────────┤
│  🔍 Search topics...     │  ← Filter input (future)
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 🤖 AI Agents         │ │  ← Topic card
│ │    12 posts    🔴 3  │ │  ← Count + new badge
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 📊 ML Research       │ │
│ │    8 posts           │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 💻 CUDA Programming  │ │
│ │    5 posts     🔴 1  │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**Topic Card States:**
- **Default**: Gray background, white text
- **Hover**: Slight elevation, border highlight
- **Selected**: Blue left border, lighter background
- **New Content**: Red dot with count

**Interactions:**
- Click: Select topic, load in center panel
- New badge: Cleared after viewing topic

---

### 3. Center Panel

**Purpose:** Primary content display area

#### 3A. Empty State (No Topic Selected)

```
┌──────────────────────────────────────┐
│                                      │
│           ✨ (sparkle icon)          │
│                                      │
│      Select a Topic Space            │
│                                      │
│   Choose a topic from the sidebar    │
│   to view its overview and ask       │
│   questions                          │
│                                      │
└──────────────────────────────────────┘
```

#### 3B. Topic Overview (Default View)

```
┌──────────────────────────────────────┐
│  AI Agents & Autonomous Systems      │  ← Topic title (h1)
│  📚 12 posts  •  🕐 Updated Dec 7    │  ← Meta info
│                                      │
│  [Avatar] [Avatar] [Avatar] +2 more  │  ← Top contributors
├──────────────────────────────────────┤
│  📝 About this topic                 │  ← Description section
│                                      │
│  • Teams are racing to build...      │
│  • Focus shifting from chat to...    │
│  • Open source models gaining...     │
│                                      │
├──────────────────────────────────────┤
│  📮 Posts (12)              [Show ▼] │  ← Collapsible posts
│  ┌────────────────────────────────┐  │
│  │ @username • 2h ago             │  │
│  │ Tweet text preview here...     │  │
│  │                         [↗]    │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  💬 Ask a question...          [→]  │  ← Q&A input
└──────────────────────────────────────┘
```

#### 3C. Q&A Conversation View

```
┌──────────────────────────────────────┐
│  🗨️ Conversation                     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 👤 You                         │  │
│  │ What are people saying about   │  │
│  │ RL for agents?                 │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🤖 Grok                        │  │
│  │ There's significant excitement │  │
│  │ about RL fine-tuning [↗]...    │  │  ← Clickable citations
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  💬 Follow-up question...      [→]  │
└──────────────────────────────────────┘
```

#### 3D. Grokcast Mode (Audio Playing)

```
┌──────────────────────────────────────┐
│  🎧 Grokcast: Agent Fever      [✕]  │  ← Header with exit
│     Following along with podcast     │
├──────────────────────────────────────┤
│                                      │
│  💡 The Hiring Frenzy                │  ← Current segment badge
│                                      │
│  Related posts (3)                   │
│  ┌────────────────────────────────┐  │
│  │ [Avatar] @researcher           │  │
│  │ "The agent hiring is insane    │  │
│  │  right now..."              [↗]│  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ [Avatar] @aidev                │  │
│  │ "Every lab wants agent         │  │
│  │  builders..."               [↗]│  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Grokcast Segment Transitions:**
- Smooth fade between segments
- Tweet cards animate in with stagger delay
- Segment badge updates instantly

**Waiting State (Before Play):**
```
┌──────────────────────────────────────┐
│           🎧 (pulsing)               │
│                                      │
│    Waiting for audio to start...     │
│                                      │
│    Press play in the audio player    │
│    to begin                          │
└──────────────────────────────────────┘
```

---

### 4. Right Panel

**Purpose:** Actions, tools, and audio playback

#### Tab Navigation

```
┌─────────────┬─────────────┐
│    Guide    │  Live Pulse │  ← Two tabs
└─────────────┴─────────────┘
```

#### 4A. Guide Tab (Actions)

```
┌──────────────────────────────────────┐
│  📖 Guide                            │
│  Generate insights from this topic   │
├──────────────────────────────────────┤
│                                      │
│  [📋 Briefing                    ]   │  ← Action buttons
│  Generate executive summary          │
│                                      │
│  [🎙️ Podcast                     ]   │
│  Create audio episode                │
│                                      │
│  [🧵 Thread                      ]   │
│  Generate X thread                   │
│                                      │
├──────────────────────────────────────┤
│  Generated Content                   │  ← Results section
│  ┌────────────────────────────────┐  │
│  │ 📋 Briefing • Just now         │  │
│  │ "The Agent Gold Rush..."       │  │
│  │                      [Expand]  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🎙️ Podcast Script • 2m ago     │  │
│  │ "Agent Fever Hits..."          │  │
│  │               [▶ Generate Audio]│  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  🎧 Audio Player                     │  ← Appears after audio gen
│  ┌────────────────────────────────┐  │
│  │ 🎧 Audio Ready           1:06  │  │
│  │ [▶───────────────────────────] │  │  ← HTML5 audio controls
│  │ Voice: Ara  •  🔗 Tweet sync   │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Action Button States:**
- **Default**: Blue outline, icon + text
- **Hover**: Filled blue background
- **Loading**: Spinner replacing icon, "Generating..."
- **Disabled**: Grayed out (during other operations)

#### 4B. Live Pulse Tab (Trending)

```
┌──────────────────────────────────────┐
│  📊 Live Pulse                       │
│  Trending in this topic              │
├──────────────────────────────────────┤
│                                      │
│  #️⃣ Top Hashtags                     │
│  ┌────────────────────────────────┐  │
│  │ #AI          ████████████  48% │  │
│  │ #LLM         ██████        24% │  │
│  │ #Agents      ████          16% │  │
│  └────────────────────────────────┘  │
│                                      │
│  👤 Top Mentions                     │
│  ┌────────────────────────────────┐  │
│  │ @OpenAI      ██████████    40% │  │
│  │ @AnthropicAI ██████        24% │  │
│  └────────────────────────────────┘  │
│                                      │
│  🔤 Keywords                         │
│  ┌────────────────────────────────┐  │
│  │ agents, RL, fine-tuning, API   │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

---

### 5. Login Page

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         🔖 Grokmarks                                │
│                                                                     │
│              Transform your X bookmarks into                        │
│                 organized knowledge                                 │
│                                                                     │
│              ┌─────────────────────────┐                           │
│              │   🐦 Login with X       │                           │
│              └─────────────────────────┘                           │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  🤖 AI      │  │  🎙️ Audio   │  │  💬 Chat    │                 │
│  │  Topics     │  │  Podcasts   │  │  with Data  │                 │
│  │  Auto-sort  │  │  Listen to  │  │  Ask about  │                 │
│  │  your saves │  │  your feed  │  │  bookmarks  │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│                    Powered by xAI Grok                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6. Toast Notifications

**Position:** Bottom-right corner, stacked

**Types:**
```
┌────────────────────────────────┐
│ ✅ Success                  ✕ │  ← Green accent
│ Synced 50 posts into 8 topics │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ❌ Error                    ✕ │  ← Red accent
│ Failed to generate audio      │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ℹ️ Info                     ✕ │  ← Blue accent
│ Audio generation started      │
└────────────────────────────────┘
```

**Behavior:**
- Auto-dismiss after 5 seconds
- Manual dismiss via X button
- Stack from bottom, max 3 visible

---

## User Flows

### Flow 1: First-Time User

```
1. Land on Login Page
   ↓
2. Click "Login with X"
   ↓
3. Authorize on X.com
   ↓
4. Redirect back to app
   ↓
5. See empty Topic Spaces
   ↓
6. Click "Sync from X"
   ↓
7. Wait for classification (~10-30s)
   ↓
8. Topic Spaces appear in sidebar
   ↓
9. Click a Topic Space
   ↓
10. Explore overview and posts
```

### Flow 2: Generate Podcast

```
1. Select Topic Space
   ↓
2. Click "Podcast" in Guide tab
   ↓
3. Wait for script generation (~5-10s)
   ↓
4. Script appears in results
   ↓
5. Click "Generate Audio"
   ↓
6. Wait for TTS (~20-60s)
   ↓
7. Audio player appears
   ↓
8. Click Play
   ↓
9. Grokcast mode activates
   ↓
10. Tweets sync with audio
```

### Flow 3: Ask a Question

```
1. Select Topic Space
   ↓
2. Type question in input box
   ↓
3. Press Enter or click Send
   ↓
4. Loading indicator shows
   ↓
5. Answer appears with citations
   ↓
6. Click citation [↗] to view source tweet
   ↓
7. Ask follow-up questions
```

---

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons/links
- Escape to close modals/exit Grokcast
- Arrow keys to navigate sidebar topics

### Screen Reader Support
- Semantic HTML structure
- ARIA labels on icon buttons
- Live regions for toast notifications
- Alt text for all images

### Visual Accessibility
- Minimum contrast ratio 4.5:1
- Focus indicators on all interactive elements
- No information conveyed by color alone
- Supports system dark/light mode (planned)

---

## Loading States

### Sync Operation
```
┌──────────────┐
│ ⟳ Syncing... │  ← Button shows spinner
└──────────────┘
```

### Content Generation
```
┌────────────────────────────────┐
│  [⟳] Generating briefing...   │  ← Button disabled, spinner
└────────────────────────────────┘

Results section shows:
┌────────────────────────────────┐
│  ⟳ Creating your briefing...  │  ← Placeholder card
│     This may take a moment     │
└────────────────────────────────┘
```

### Topic Loading
```
Center panel shows:
┌────────────────────────────────┐
│           ⟳                    │
│     Loading topic...           │
└────────────────────────────────┘
```

---

## Error States

### Network Error
```
Toast notification:
┌────────────────────────────────┐
│ ❌ Connection failed           │
│ Please check your internet     │
└────────────────────────────────┘
```

### API Error
```
Toast notification:
┌────────────────────────────────┐
│ ❌ Generation failed           │
│ Grok is busy. Try again later  │
└────────────────────────────────┘
```

### No Topics After Sync
```
Sidebar shows:
┌────────────────────────────────┐
│  No topics found               │
│  Bookmark more posts on X      │
│  then sync again               │
└────────────────────────────────┘
```

---

## Animation Guidelines

### Transitions
- Panel transitions: 200ms ease-out
- Card hover: 150ms ease
- Toast slide-in: 300ms ease-out
- Grokcast mode: 400ms fade

### Micro-interactions
- Button press: Scale down to 0.98
- Loading spinner: Continuous rotation
- New badge pulse: Subtle scale animation
- Audio visualizer: Responds to playback (future)

---

## Mobile Considerations

### Bottom Navigation
```
┌─────────┬─────────┬─────────┐
│ Topics  │ Content │ Actions │
│   📚    │   📄    │   ✨    │
└─────────┴─────────┴─────────┘
```

### Gestures
- Swipe right: Open sidebar
- Swipe left: Close sidebar
- Pull down: Refresh current view
- Long press: Context menu (future)

### Compact Views
- Topic cards: Single line, icon + name
- Posts: Truncated to 2 lines
- Actions: Icon-only buttons

---

## Future UI Enhancements

1. **Dark/Light Mode Toggle**
2. **Audio Visualizer** during Grokcast
3. **Video Intros** via Grok Imagine
4. **Drag-and-Drop** topic organization
5. **Custom Themes** per topic
6. **Export Options** (PDF, Markdown)
7. **Collaborative Features** (shared topics)
