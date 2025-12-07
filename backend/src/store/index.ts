// ============================================
// Store Index - Select Memory or SQLite store
// ============================================

import type {
  UserSession,
  Post,
  TopicSpace,
  ActionResult,
  OAuthState,
} from '../types';

/**
 * Store interface that both MemoryStore and SQLiteStore implement
 */
export interface Store {
  // Session Management
  createSession(session: UserSession): void;
  getSession(sessionId: string): UserSession | undefined;
  getSessionByXUserId(xUserId: string): UserSession | undefined;
  updateSession(sessionId: string, updates: Partial<UserSession>): void;
  deleteSession(sessionId: string): void;

  // OAuth State Management
  saveOAuthState(oauthState: OAuthState): void;
  getOAuthState(state: string): OAuthState | undefined;
  deleteOAuthState(state: string): void;

  // Post Management
  savePosts(xUserId: string, posts: Post[]): void;
  getPost(xUserId: string, postId: string): Post | undefined;
  getAllPosts(xUserId: string): Post[];
  getPostsByIds(xUserId: string, postIds: string[]): Post[];
  updatePost(xUserId: string, postId: string, updates: Partial<Post>): void;

  // TopicSpace Management
  saveTopicSpaces(xUserId: string, topicSpaces: TopicSpace[]): void;
  getTopicSpace(xUserId: string, topicSpaceId: string): TopicSpace | undefined;
  getAllTopicSpaces(xUserId: string): TopicSpace[];
  updateTopicSpace(xUserId: string, topicSpaceId: string, updates: Partial<TopicSpace>): void;
  addPostsToTopicSpace(xUserId: string, topicSpaceId: string, postIds: string[]): void;
  clearTopicSpaces(xUserId: string): void;

  // Action Results Management
  saveActionResult(xUserId: string, result: ActionResult): void;
  getActionResults(xUserId: string, topicSpaceId?: string): ActionResult[];

  // Debug / Stats
  getStats(): Record<string, number>;
  clearAll(): void;
}

// Check if SQLite should be used
const USE_SQLITE = process.env.USE_SQLITE === 'true';

// Create and export the appropriate store
let store: Store;

if (USE_SQLITE) {
  // Use SQLite store
  const { sqliteStore } = require('./sqlite-store');
  store = sqliteStore;
} else {
  // Use memory store
  const { store: memoryStore } = require('./memory-store');
  store = memoryStore;
}

export { store };
