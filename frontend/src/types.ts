// ============================================
// Grokmarks Frontend Types
// ============================================

export interface User {
  xUserId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
}

export interface Post {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  createdAt: string;
  source: 'bookmark' | 'timeline';
  url: string;
  topicLabel?: string;
  summary?: string;
}

export interface TopicSpace {
  id: string;
  title: string;
  description: string;
  postCount: number;
  newPostCount: number;
  postIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TopicSpaceWithPosts extends TopicSpace {
  posts: Post[];
}

export interface ActionResult {
  id: string;
  topicSpaceId: string;
  actionType: 'briefing' | 'podcast' | 'qa';
  input?: string;
  output: string;
  createdAt: string;
  groundedPostIds: string[];
}

export interface AuthStatus {
  authenticated: boolean;
  user?: User;
}

export interface SyncResult {
  totalPosts: number;
  bookmarksCount: number;
  timelineCount: number;
  topicSpacesCount: number;
  topicSpaces: TopicSpace[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
