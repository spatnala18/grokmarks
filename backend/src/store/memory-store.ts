import {
  UserSession,
  UserData,
  Post,
  TopicSpace,
  ActionResult,
  OAuthState,
} from '../types';

// ============================================
// In-Memory Store for Grokmarks
// ============================================

/**
 * Simple in-memory store for hackathon demo.
 * Data is lost when server restarts.
 */
class MemoryStore {
  // Session storage: sessionId -> UserSession
  private sessions: Map<string, UserSession> = new Map();

  // User data storage: xUserId -> UserData
  private userData: Map<string, UserData> = new Map();

  // OAuth state storage: state -> OAuthState (for PKCE flow)
  private oauthStates: Map<string, OAuthState> = new Map();

  // ============================================
  // Session Management
  // ============================================

  createSession(session: UserSession): void {
    this.sessions.set(session.sessionId, session);
    
    // Initialize user data if not exists
    if (!this.userData.has(session.xUserId)) {
      this.userData.set(session.xUserId, {
        posts: new Map(),
        topicSpaces: new Map(),
        actionResults: [],
      });
    }
  }

  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByXUserId(xUserId: string): UserSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.xUserId === xUserId) {
        return session;
      }
    }
    return undefined;
  }

  updateSession(sessionId: string, updates: Partial<UserSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates });
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // ============================================
  // OAuth State Management (for PKCE)
  // ============================================

  saveOAuthState(oauthState: OAuthState): void {
    this.oauthStates.set(oauthState.state, oauthState);
    
    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [state, data] of this.oauthStates.entries()) {
      if (data.createdAt < tenMinutesAgo) {
        this.oauthStates.delete(state);
      }
    }
  }

  getOAuthState(state: string): OAuthState | undefined {
    return this.oauthStates.get(state);
  }

  deleteOAuthState(state: string): void {
    this.oauthStates.delete(state);
  }

  // ============================================
  // Post Management
  // ============================================

  getUserData(xUserId: string): UserData | undefined {
    return this.userData.get(xUserId);
  }

  savePosts(xUserId: string, posts: Post[]): void {
    const data = this.userData.get(xUserId);
    if (!data) return;

    for (const post of posts) {
      data.posts.set(post.id, post);
    }
  }

  getPost(xUserId: string, postId: string): Post | undefined {
    const data = this.userData.get(xUserId);
    return data?.posts.get(postId);
  }

  getAllPosts(xUserId: string): Post[] {
    const data = this.userData.get(xUserId);
    return data ? Array.from(data.posts.values()) : [];
  }

  getPostsByIds(xUserId: string, postIds: string[]): Post[] {
    const data = this.userData.get(xUserId);
    if (!data) return [];
    
    return postIds
      .map(id => data.posts.get(id))
      .filter((post): post is Post => post !== undefined);
  }

  updatePost(xUserId: string, postId: string, updates: Partial<Post>): void {
    const data = this.userData.get(xUserId);
    const post = data?.posts.get(postId);
    if (post) {
      data!.posts.set(postId, { ...post, ...updates });
    }
  }

  // ============================================
  // TopicSpace Management
  // ============================================

  saveTopicSpaces(xUserId: string, topicSpaces: TopicSpace[]): void {
    const data = this.userData.get(xUserId);
    if (!data) return;

    for (const ts of topicSpaces) {
      data.topicSpaces.set(ts.id, ts);
    }
  }

  getTopicSpace(xUserId: string, topicSpaceId: string): TopicSpace | undefined {
    const data = this.userData.get(xUserId);
    return data?.topicSpaces.get(topicSpaceId);
  }

  getAllTopicSpaces(xUserId: string): TopicSpace[] {
    const data = this.userData.get(xUserId);
    return data ? Array.from(data.topicSpaces.values()) : [];
  }

  updateTopicSpace(xUserId: string, topicSpaceId: string, updates: Partial<TopicSpace>): void {
    const data = this.userData.get(xUserId);
    const ts = data?.topicSpaces.get(topicSpaceId);
    if (ts) {
      data!.topicSpaces.set(topicSpaceId, { ...ts, ...updates });
    }
  }

  addPostsToTopicSpace(xUserId: string, topicSpaceId: string, postIds: string[]): void {
    const data = this.userData.get(xUserId);
    const ts = data?.topicSpaces.get(topicSpaceId);
    if (ts) {
      const newPostIds = postIds.filter(id => !ts.bookmarkTweetIds.includes(id));
      ts.bookmarkTweetIds = [...ts.bookmarkTweetIds, ...newPostIds];
      ts.newPostCount += newPostIds.length;
      ts.updatedAt = new Date().toISOString();
      
      // Update lastBookmarkTime if we have new posts
      if (newPostIds.length > 0) {
        const posts = this.getPostsByIds(xUserId, newPostIds);
        const maxTime = posts.reduce((max, p) => {
          const t = new Date(p.createdAt).getTime();
          return t > max ? t : max;
        }, new Date(ts.lastBookmarkTime).getTime());
        ts.lastBookmarkTime = new Date(maxTime).toISOString();
      }
    }
  }

  clearTopicSpaces(xUserId: string): void {
    const data = this.userData.get(xUserId);
    if (data) {
      data.topicSpaces.clear();
    }
  }

  // ============================================
  // Action Results Management
  // ============================================

  saveActionResult(xUserId: string, result: ActionResult): void {
    const data = this.userData.get(xUserId);
    if (data) {
      data.actionResults.push(result);
    }
  }

  getActionResults(xUserId: string, topicSpaceId?: string): ActionResult[] {
    const data = this.userData.get(xUserId);
    if (!data) return [];
    
    if (topicSpaceId) {
      return data.actionResults.filter(r => r.topicSpaceId === topicSpaceId);
    }
    return data.actionResults;
  }

  // ============================================
  // Debug / Stats
  // ============================================

  getStats(): {
    sessions: number;
    users: number;
    oauthStates: number;
  } {
    return {
      sessions: this.sessions.size,
      users: this.userData.size,
      oauthStates: this.oauthStates.size,
    };
  }

  clearAll(): void {
    this.sessions.clear();
    this.userData.clear();
    this.oauthStates.clear();
  }
}

// Export singleton instance
export const store = new MemoryStore();
