// ============================================
// Core Types for Grokmarks
// ============================================

/**
 * Source of a post - where it was fetched from
 */
export type PostSource = 'bookmark' | 'timeline' | 'like' | 'list' | 'search';

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
  
  // Grok-generated fields (populated after classification)
  summary?: string;              // 1-2 sentence summary
  topicLabel?: string;           // Assigned topic label
}

/**
 * TopicSpace - a cluster of related posts
 */
export interface TopicSpace {
  id: string;                    // Generated unique ID
  title: string;                 // e.g., "CUDA & GPU Programming"
  description: string;           // Grok-generated description
  postIds: string[];             // References to Post IDs
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  newPostCount: number;          // Posts added since last view (for "new" badge)
}

/**
 * ActionType - types of Grok operations
 */
export type ActionType = 'briefing' | 'podcast' | 'qa';

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
}
