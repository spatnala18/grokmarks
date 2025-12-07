// ============================================
// Grokmarks Frontend Types
// ============================================

export interface User {
  xUserId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
}

/**
 * Type of topic - auto-discovered by Grok or custom user-defined
 */
export type TopicType = 'auto' | 'custom';

export interface Post {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  createdAt: string;
  source: 'bookmark' | 'timeline' | 'search';
  url: string;
  topicLabels?: string[];  // Can have multiple topics
  summary?: string;
  publicMetrics?: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
  };
}

export interface TopicSpace {
  id: string;
  title: string;
  description: string;
  type: TopicType;
  postCount: number;
  newPostCount: number;
  bookmarkTweetIds: string[];
  lastBookmarkTime: string;
  createdAt: string;
  updatedAt: string;
}

// Trending types
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

export interface TopicSpaceWithPosts extends TopicSpace {
  posts: Post[];
  trending?: TrendingData;
}

export interface ActionResult {
  id: string;
  topicSpaceId: string;
  actionType: 'briefing' | 'podcast' | 'qa' | 'thread';
  input?: string;
  output: string;
  createdAt: string;
  groundedPostIds: string[];
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  groundedPostIds?: string[];
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

export interface SyncResult {
  totalPosts: number;
  bookmarksCount: number;
  topicSpacesCount: number;
  topicSpaces: TopicSpace[];
}

// ============================================
// Podcast/Grokcast Types
// ============================================

/**
 * A single segment of a podcast script
 */
export interface PodcastSegment {
  segmentId: string;
  text: string;
  tweetIds: string[];
  segmentType: 'intro' | 'theme' | 'wrapup';
  themeTitle?: string;
}

/**
 * Full segmented podcast script from Grok
 */
export interface SegmentedPodcastScript {
  title: string;
  segments: PodcastSegment[];
  mentionedHandles: string[];
  allTweetIds: string[];
}

/**
 * Timeline entry for a segment with computed timing
 */
export interface TimelineEntry {
  segmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  tweetIds: string[];
  themeTitle?: string;
}

/**
 * Complete timeline manifest for audio sync
 */
export interface TimelineManifest {
  totalDuration: number;
  entries: TimelineEntry[];
  generatedAt: string;
}

/**
 * Podcast audio result with timeline
 */
export interface PodcastAudio {
  podcastUrl: string;
  duration: number;
  voice: string;
  createdAt: string;
  timeline?: TimelineManifest;
}

/**
 * Response from POST /podcast endpoint
 */
export interface PodcastScriptResponse {
  actionResult: ActionResult;
  segmentedScript: SegmentedPodcastScript;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Live Tweets Types
// ============================================

/**
 * Time range options for live tweets
 */
export type LiveTimeRange = '30min' | '2hr' | '6hr' | '12hr' | '24hr' | 'since_bookmark';

/**
 * Response from GET /topics/:id/live
 */
export interface LiveTweetsResponse {
  tweets: Post[];
  query: string;
  timeRange: LiveTimeRange;
  cachedAt: string;
  fromCache: boolean;
  stale?: boolean;
  error?: string;
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}
