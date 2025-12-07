import Database from 'better-sqlite3';
import path from 'path';
import type {
  UserSession,
  Post,
  TopicSpace,
  ActionResult,
  OAuthState,
} from '../types';

// ============================================
// SQLite Store for Grokmarks
// ============================================

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'grokmarks.db');

/**
 * SQLite-based persistent store for Grokmarks.
 * Data persists across server restarts.
 */
class SQLiteStore {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const fs = require('fs');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
    console.log(`📦 SQLite database initialized at ${DB_PATH}`);
  }

  private initializeTables(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        x_user_id TEXT NOT NULL,
        x_username TEXT NOT NULL,
        x_display_name TEXT NOT NULL,
        x_profile_image_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at INTEGER,
        bookmarks_pagination_token TEXT,
        timeline_since_id TEXT,
        created_at TEXT NOT NULL,
        last_sync_at TEXT
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_x_user_id ON sessions(x_user_id)`);

    // OAuth states table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        code_verifier TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT NOT NULL,
        x_user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_username TEXT NOT NULL,
        author_display_name TEXT NOT NULL,
        author_profile_image_url TEXT,
        created_at TEXT NOT NULL,
        url TEXT NOT NULL,
        source TEXT NOT NULL,
        summary TEXT,
        topic_label TEXT,
        PRIMARY KEY (id, x_user_id)
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_x_user_id ON posts(x_user_id)`);

    // TopicSpaces table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS topic_spaces (
        id TEXT NOT NULL,
        x_user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        post_ids TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        new_post_count INTEGER DEFAULT 0,
        PRIMARY KEY (id, x_user_id)
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_topic_spaces_x_user_id ON topic_spaces(x_user_id)`);

    // ActionResults table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_results (
        id TEXT NOT NULL,
        x_user_id TEXT NOT NULL,
        topic_space_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        input TEXT,
        output TEXT NOT NULL,
        created_at TEXT NOT NULL,
        grounded_post_ids TEXT NOT NULL,
        PRIMARY KEY (id, x_user_id)
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_action_results_x_user_id ON action_results(x_user_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_action_results_topic ON action_results(x_user_id, topic_space_id)`);
  }

  // ============================================
  // Session Management
  // ============================================

  createSession(session: UserSession): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        session_id, x_user_id, x_username, x_display_name, x_profile_image_url,
        access_token, refresh_token, token_expires_at,
        bookmarks_pagination_token, timeline_since_id, created_at, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      session.sessionId,
      session.xUserId,
      session.xUsername,
      session.xDisplayName,
      session.xProfileImageUrl || null,
      session.accessToken,
      session.refreshToken || null,
      session.tokenExpiresAt || null,
      session.bookmarksPaginationToken || null,
      session.timelineSinceId || null,
      session.createdAt,
      session.lastSyncAt || null
    );
  }

  getSession(sessionId: string): UserSession | undefined {
    const row = this.db.prepare(`SELECT * FROM sessions WHERE session_id = ?`).get(sessionId) as any;
    return row ? this.rowToSession(row) : undefined;
  }

  getSessionByXUserId(xUserId: string): UserSession | undefined {
    const row = this.db.prepare(`SELECT * FROM sessions WHERE x_user_id = ? LIMIT 1`).get(xUserId) as any;
    return row ? this.rowToSession(row) : undefined;
  }

  updateSession(sessionId: string, updates: Partial<UserSession>): void {
    const session = this.getSession(sessionId);
    if (session) {
      this.createSession({ ...session, ...updates });
    }
  }

  deleteSession(sessionId: string): void {
    this.db.prepare(`DELETE FROM sessions WHERE session_id = ?`).run(sessionId);
  }

  private rowToSession(row: any): UserSession {
    return {
      sessionId: row.session_id,
      xUserId: row.x_user_id,
      xUsername: row.x_username,
      xDisplayName: row.x_display_name,
      xProfileImageUrl: row.x_profile_image_url || undefined,
      accessToken: row.access_token,
      refreshToken: row.refresh_token || undefined,
      tokenExpiresAt: row.token_expires_at || undefined,
      bookmarksPaginationToken: row.bookmarks_pagination_token || undefined,
      timelineSinceId: row.timeline_since_id || undefined,
      createdAt: row.created_at,
      lastSyncAt: row.last_sync_at || undefined,
    };
  }

  // ============================================
  // OAuth State Management (for PKCE)
  // ============================================

  saveOAuthState(oauthState: OAuthState): void {
    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    this.db.prepare(`DELETE FROM oauth_states WHERE created_at < ?`).run(tenMinutesAgo);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO oauth_states (state, code_verifier, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(oauthState.state, oauthState.codeVerifier, oauthState.createdAt);
  }

  getOAuthState(state: string): OAuthState | undefined {
    const row = this.db.prepare(`SELECT * FROM oauth_states WHERE state = ?`).get(state) as any;
    return row ? {
      state: row.state,
      codeVerifier: row.code_verifier,
      createdAt: row.created_at,
    } : undefined;
  }

  deleteOAuthState(state: string): void {
    this.db.prepare(`DELETE FROM oauth_states WHERE state = ?`).run(state);
  }

  // ============================================
  // Post Management
  // ============================================

  savePosts(xUserId: string, posts: Post[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO posts (
        id, x_user_id, text, author_id, author_username, author_display_name,
        author_profile_image_url, created_at, url, source, summary, topic_label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((posts: Post[]) => {
      for (const post of posts) {
        stmt.run(
          post.id,
          xUserId,
          post.text,
          post.authorId,
          post.authorUsername,
          post.authorDisplayName,
          post.authorProfileImageUrl || null,
          post.createdAt,
          post.url,
          post.source,
          post.summary || null,
          post.topicLabel || null
        );
      }
    });

    insertMany(posts);
  }

  getPost(xUserId: string, postId: string): Post | undefined {
    const row = this.db.prepare(`SELECT * FROM posts WHERE x_user_id = ? AND id = ?`).get(xUserId, postId) as any;
    return row ? this.rowToPost(row) : undefined;
  }

  getAllPosts(xUserId: string): Post[] {
    const rows = this.db.prepare(`SELECT * FROM posts WHERE x_user_id = ?`).all(xUserId) as any[];
    return rows.map(row => this.rowToPost(row));
  }

  getPostsByIds(xUserId: string, postIds: string[]): Post[] {
    if (postIds.length === 0) return [];
    const placeholders = postIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM posts WHERE x_user_id = ? AND id IN (${placeholders})
    `).all(xUserId, ...postIds) as any[];
    return rows.map(row => this.rowToPost(row));
  }

  updatePost(xUserId: string, postId: string, updates: Partial<Post>): void {
    const post = this.getPost(xUserId, postId);
    if (post) {
      const updated = { ...post, ...updates };
      this.savePosts(xUserId, [updated]);
    }
  }

  private rowToPost(row: any): Post {
    return {
      id: row.id,
      text: row.text,
      authorId: row.author_id,
      authorUsername: row.author_username,
      authorDisplayName: row.author_display_name,
      authorProfileImageUrl: row.author_profile_image_url || undefined,
      createdAt: row.created_at,
      url: row.url,
      source: row.source as Post['source'],
      summary: row.summary || undefined,
      topicLabel: row.topic_label || undefined,
    };
  }

  // ============================================
  // TopicSpace Management
  // ============================================

  saveTopicSpaces(xUserId: string, topicSpaces: TopicSpace[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO topic_spaces (
        id, x_user_id, title, description, post_ids, created_at, updated_at, new_post_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((topicSpaces: TopicSpace[]) => {
      for (const ts of topicSpaces) {
        stmt.run(
          ts.id,
          xUserId,
          ts.title,
          ts.description,
          JSON.stringify(ts.postIds),
          ts.createdAt,
          ts.updatedAt,
          ts.newPostCount
        );
      }
    });

    insertMany(topicSpaces);
  }

  getTopicSpace(xUserId: string, topicSpaceId: string): TopicSpace | undefined {
    const row = this.db.prepare(`SELECT * FROM topic_spaces WHERE x_user_id = ? AND id = ?`).get(xUserId, topicSpaceId) as any;
    return row ? this.rowToTopicSpace(row) : undefined;
  }

  getAllTopicSpaces(xUserId: string): TopicSpace[] {
    const rows = this.db.prepare(`SELECT * FROM topic_spaces WHERE x_user_id = ?`).all(xUserId) as any[];
    return rows.map(row => this.rowToTopicSpace(row));
  }

  updateTopicSpace(xUserId: string, topicSpaceId: string, updates: Partial<TopicSpace>): void {
    const ts = this.getTopicSpace(xUserId, topicSpaceId);
    if (ts) {
      this.saveTopicSpaces(xUserId, [{ ...ts, ...updates }]);
    }
  }

  addPostsToTopicSpace(xUserId: string, topicSpaceId: string, postIds: string[]): void {
    const ts = this.getTopicSpace(xUserId, topicSpaceId);
    if (ts) {
      const newPostIds = postIds.filter(id => !ts.postIds.includes(id));
      ts.postIds = [...ts.postIds, ...newPostIds];
      ts.newPostCount += newPostIds.length;
      ts.updatedAt = new Date().toISOString();
      this.saveTopicSpaces(xUserId, [ts]);
    }
  }

  clearTopicSpaces(xUserId: string): void {
    this.db.prepare(`DELETE FROM topic_spaces WHERE x_user_id = ?`).run(xUserId);
  }

  private rowToTopicSpace(row: any): TopicSpace {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      postIds: JSON.parse(row.post_ids),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      newPostCount: row.new_post_count,
    };
  }

  // ============================================
  // Action Results Management
  // ============================================

  saveActionResult(xUserId: string, result: ActionResult): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO action_results (
        id, x_user_id, topic_space_id, action_type, input, output, created_at, grounded_post_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      result.id,
      xUserId,
      result.topicSpaceId,
      result.actionType,
      result.input || null,
      result.output,
      result.createdAt,
      JSON.stringify(result.groundedPostIds)
    );
  }

  getActionResults(xUserId: string, topicSpaceId?: string): ActionResult[] {
    let rows: any[];
    if (topicSpaceId) {
      rows = this.db.prepare(`
        SELECT * FROM action_results WHERE x_user_id = ? AND topic_space_id = ? ORDER BY created_at DESC
      `).all(xUserId, topicSpaceId) as any[];
    } else {
      rows = this.db.prepare(`
        SELECT * FROM action_results WHERE x_user_id = ? ORDER BY created_at DESC
      `).all(xUserId) as any[];
    }
    return rows.map(row => this.rowToActionResult(row));
  }

  private rowToActionResult(row: any): ActionResult {
    return {
      id: row.id,
      topicSpaceId: row.topic_space_id,
      actionType: row.action_type as ActionResult['actionType'],
      input: row.input || undefined,
      output: row.output,
      createdAt: row.created_at,
      groundedPostIds: JSON.parse(row.grounded_post_ids),
    };
  }

  // ============================================
  // Unused by SQLite but required for interface
  // ============================================

  getUserData(_xUserId: string): undefined {
    // SQLite doesn't use UserData structure
    return undefined;
  }

  // ============================================
  // Debug / Stats
  // ============================================

  getStats(): {
    sessions: number;
    users: number;
    oauthStates: number;
    posts: number;
    topicSpaces: number;
    actionResults: number;
  } {
    const sessionsCount = (this.db.prepare(`SELECT COUNT(*) as count FROM sessions`).get() as any).count;
    const usersCount = (this.db.prepare(`SELECT COUNT(DISTINCT x_user_id) as count FROM sessions`).get() as any).count;
    const oauthCount = (this.db.prepare(`SELECT COUNT(*) as count FROM oauth_states`).get() as any).count;
    const postsCount = (this.db.prepare(`SELECT COUNT(*) as count FROM posts`).get() as any).count;
    const topicSpacesCount = (this.db.prepare(`SELECT COUNT(*) as count FROM topic_spaces`).get() as any).count;
    const actionsCount = (this.db.prepare(`SELECT COUNT(*) as count FROM action_results`).get() as any).count;

    return {
      sessions: sessionsCount,
      users: usersCount,
      oauthStates: oauthCount,
      posts: postsCount,
      topicSpaces: topicSpacesCount,
      actionResults: actionsCount,
    };
  }

  clearAll(): void {
    this.db.exec(`DELETE FROM sessions`);
    this.db.exec(`DELETE FROM oauth_states`);
    this.db.exec(`DELETE FROM posts`);
    this.db.exec(`DELETE FROM topic_spaces`);
    this.db.exec(`DELETE FROM action_results`);
  }

  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const sqliteStore = new SQLiteStore();
