// ============================================
// Core Types for Grokmarks
// ============================================

/**
 * Source of a post - where it was fetched from
 */
export type PostSource = 'bookmark' | 'timeline' | 'like' | 'list' | 'search';

/**
 * Type of topic - auto-discovered by Grok or custom user-defined
 */
export type TopicType = 'auto' | 'custom';

/**
 * Post - normalized tweet with metadata
 */
export interface Post {
  id: string;                    // Tweet ID
  text: string;                  // Tweet text content
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl?: string;
  createdAt: string;             // ISO timestamp
  url: string;                   // Link to tweet on X
  source: PostSource;
  
  // Engagement metrics (for ranking in Live tab)
  publicMetrics?: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
  };
  
  // Grok-generated fields (populated after classification)
  summary?: string;              // 1-2 sentence summary
  topicLabels?: string[];        // Assigned topic labels (can be multiple)
}

/**
 * TopicSpace - a cluster of related bookmarked posts
 */
export interface TopicSpace {
  id: string;                    // Generated unique ID
  title: string;                 // e.g., "CUDA & GPU Programming"
  description: string;           // Grok-generated description
  type: TopicType;               // 'auto' or 'custom'
  bookmarkTweetIds: string[];    // References to bookmarked Post IDs only
  lastBookmarkTime: string;      // ISO timestamp of the most recent bookmark in this topic
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  newPostCount: number;          // Posts added since last view (for "new" badge)
}

/**
 * ActionType - types of Grok operations
 */
export type ActionType = 'briefing' | 'podcast' | 'qa' | 'thread';

/**
 * ActionResult - result of a Grok action on a TopicSpace
 */
export interface ActionResult {
  id: string;
  topicSpaceId: string;
  actionType: ActionType;
  input?: string;                // For Q&A: user's question
  output: string;                // Grok's response
  createdAt: string;
  groundedPostIds: string[];     // Which posts were used as context
}

/**
 * UserSession - stored per authenticated user
 */
export interface UserSession {
  // Session
  sessionId: string;
  
  // X User info
  xUserId: string;
  xUsername: string;
  xDisplayName: string;
  xProfileImageUrl?: string;
  
  // OAuth tokens
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: number;       // Unix timestamp in ms
  
  // Pagination cursors for X API
  bookmarksPaginationToken?: string;
  timelineSinceId?: string;
  
  // Timestamps
  createdAt: string;
  lastSyncAt?: string;
}

/**
 * UserData - all cached data for a user
 */
export interface UserData {
  posts: Map<string, Post>;           // postId -> Post
  topicSpaces: Map<string, TopicSpace>; // topicSpaceId -> TopicSpace
  actionResults: ActionResult[];       // History of action results
}

/**
 * OAuth state for PKCE flow
 */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

// ============================================
// Trending Types
// ============================================

export interface TrendingItem {
  text: string;
  type: 'hashtag' | 'mention' | 'keyword';
  count: number;
  percentage: number;
}

export interface TrendingData {
  hashtags: TrendingItem[];
  mentions: TrendingItem[];
  keywords: TrendingItem[];
  totalPosts: number;
  timeRange: {
    earliest: string;
    latest: string;
  };
}

// ============================================
// Podcast/Grokcast Types
// ============================================

/**
 * A single segment of a podcast script
 * Each segment is a thematic chunk tied to specific tweets
 */
export interface PodcastSegment {
  segmentId: string;             // Unique identifier (e.g., "intro", "theme_agents", "wrapup")
  text: string;                  // The narration text for this segment
  tweetIds: string[];            // Tweet IDs referenced in this segment (can be empty for intro/outro)
  segmentType: 'intro' | 'theme' | 'wrapup';  // Type of segment for styling
  themeTitle?: string;           // For theme segments: "Big Labs Hiring", "Agent Fever", etc.
}

/**
 * The full segmented podcast script from Grok
 */
export interface SegmentedPodcastScript {
  title: string;                 // Episode title
  segments: PodcastSegment[];    // Ordered array of segments
  mentionedHandles: string[];    // All @handles mentioned across the script
  allTweetIds: string[];         // All tweet IDs referenced (union of all segment tweetIds)
}

/**
 * Timeline entry for a single segment with computed timing
 */
export interface TimelineEntry {
  segmentId: string;
  startTime: number;             // Seconds from start of podcast
  endTime: number;               // Seconds from start of podcast
  duration: number;              // Duration in seconds
  tweetIds: string[];            // Tweet IDs to highlight during this segment
  themeTitle?: string;           // Optional theme title for UI display
}

/**
 * Complete timeline manifest returned with podcast audio
 */
export interface TimelineManifest {
  totalDuration: number;         // Total podcast duration in seconds
  entries: TimelineEntry[];      // Ordered timeline entries
  generatedAt: string;           // ISO timestamp
}

/**
 * Full podcast audio result with timeline
 */
export interface PodcastAudioResult {
  podcastUrl: string;            // URL to the audio file
  duration: number;              // Total duration in seconds
  voice: string;                 // Voice used (Ara, Rex, etc.)
  createdAt: string;             // ISO timestamp
  filePath: string;              // Server file path
  timeline: TimelineManifest;    // Segment timing manifest for frontend sync
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SyncResponse {
  posts: Post[];
  topicSpaces: TopicSpace[];
  newPostsCount: number;
}

export interface TopicSpaceDetailResponse extends TopicSpace {
  posts: Post[];
  trending?: TrendingData;
}
