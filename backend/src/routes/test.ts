import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /test
 * 
 * Simple HTML page to test all API endpoints.
 * This is for development/demo purposes only.
 */
router.get('/', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grokmarks - API Test Page</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #0f0f0f;
      color: #e7e9ea;
    }
    h1 { color: #1d9bf0; }
    h2 { color: #71767b; border-bottom: 1px solid #2f3336; padding-bottom: 10px; }
    button {
      background: #1d9bf0;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      margin: 5px;
    }
    button:hover { background: #1a8cd8; }
    button:disabled { background: #71767b; cursor: not-allowed; }
    button.danger { background: #f4212e; }
    button.danger:hover { background: #dc1d28; }
    .card {
      background: #16181c;
      border: 1px solid #2f3336;
      border-radius: 16px;
      padding: 16px;
      margin: 16px 0;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-info img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }
    .output {
      background: #000;
      border: 1px solid #2f3336;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      max-height: 400px;
      overflow: auto;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .post {
      background: #16181c;
      border: 1px solid #2f3336;
      border-radius: 12px;
      padding: 12px;
      margin: 8px 0;
    }
    .post-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .post-header img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }
    .post-author { font-weight: bold; }
    .post-username { color: #71767b; }
    .post-text { line-height: 1.4; }
    .post-meta { color: #71767b; font-size: 12px; margin-top: 8px; }
    .stats { display: flex; gap: 20px; margin: 10px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #1d9bf0; }
    .stat-label { font-size: 12px; color: #71767b; }
    .loading { color: #71767b; font-style: italic; }
    a { color: #1d9bf0; }
  </style>
</head>
<body>
  <h1>🔖 Grokmarks - API Test Page</h1>
  
  <div class="card">
    <h2>Authentication</h2>
    <div id="auth-status">Checking...</div>
    <div id="auth-actions" style="margin-top: 12px;">
      <button onclick="login()">Login with X</button>
      <button onclick="logout()" class="danger">Logout</button>
    </div>
  </div>

  <div class="card">
    <h2>X Data Sync</h2>
    <p>Fetch your bookmarks and timeline from X.</p>
    <button onclick="syncData()" id="sync-btn">🔄 Sync All Data</button>
    <button onclick="refreshData()" id="refresh-btn">⚡ Refresh (New Posts Only)</button>
    <button onclick="getPosts()">📋 View Cached Posts</button>
    
    <div class="stats" id="sync-stats" style="display: none;">
      <div class="stat">
        <div class="stat-value" id="stat-total">0</div>
        <div class="stat-label">Total Posts</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="stat-bookmarks">0</div>
        <div class="stat-label">Bookmarks</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="stat-timeline">0</div>
        <div class="stat-label">Timeline</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Output</h2>
    <div id="output" class="output">Results will appear here...</div>
  </div>

  <div class="card">
    <h2>Posts Preview</h2>
    <div id="posts-container">No posts loaded yet. Click "Sync All Data" above.</div>
  </div>

  <script>
    const API_BASE = 'http://localhost:8000';
    
    // Helper to make API calls
    async function api(method, path, body = null) {
      const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);
      
      const res = await fetch(API_BASE + path, options);
      return res.json();
    }

    // Display output
    function output(data) {
      document.getElementById('output').textContent = JSON.stringify(data, null, 2);
    }

    // Check auth status
    async function checkAuth() {
      try {
        const data = await api('GET', '/auth/me');
        if (data.success) {
          document.getElementById('auth-status').innerHTML = \`
            <div class="user-info">
              <img src="\${data.data.profileImageUrl}" alt="Avatar">
              <div>
                <div class="post-author">\${data.data.displayName}</div>
                <div class="post-username">@\${data.data.username}</div>
              </div>
            </div>
          \`;
        } else {
          document.getElementById('auth-status').innerHTML = '<span style="color: #f4212e;">Not logged in</span>';
        }
      } catch (e) {
        document.getElementById('auth-status').innerHTML = '<span style="color: #f4212e;">Not logged in</span>';
      }
    }

    // Login
    function login() {
      window.location.href = API_BASE + '/auth/login';
    }

    // Logout
    async function logout() {
      await api('POST', '/auth/logout');
      checkAuth();
      output({ message: 'Logged out' });
    }

    // Sync data
    async function syncData() {
      const btn = document.getElementById('sync-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Syncing...';
      output({ message: 'Syncing data from X...' });
      
      try {
        const data = await api('POST', '/api/x/sync');
        output(data);
        
        if (data.success) {
          document.getElementById('sync-stats').style.display = 'flex';
          document.getElementById('stat-total').textContent = data.data.totalPosts;
          document.getElementById('stat-bookmarks').textContent = data.data.bookmarksCount;
          document.getElementById('stat-timeline').textContent = data.data.timelineCount;
          displayPosts(data.data.posts);
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Sync All Data';
      }
    }

    // Refresh data
    async function refreshData() {
      const btn = document.getElementById('refresh-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Refreshing...';
      output({ message: 'Checking for new posts...' });
      
      try {
        const data = await api('POST', '/api/x/refresh');
        output(data);
        
        if (data.success && data.data.newPostsCount > 0) {
          // Reload all posts to show updated list
          await getPosts();
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Refresh (New Posts Only)';
      }
    }

    // Get cached posts
    async function getPosts() {
      try {
        const data = await api('GET', '/api/x/posts');
        output(data);
        
        if (data.success) {
          document.getElementById('sync-stats').style.display = 'flex';
          document.getElementById('stat-total').textContent = data.data.totalPosts;
          displayPosts(data.data.posts);
        }
      } catch (e) {
        output({ error: e.message });
      }
    }

    // Display posts
    function displayPosts(posts) {
      if (!posts || posts.length === 0) {
        document.getElementById('posts-container').innerHTML = '<p class="loading">No posts found.</p>';
        return;
      }

      const html = posts.slice(0, 20).map(post => \`
        <div class="post">
          <div class="post-header">
            <img src="\${post.authorProfileImageUrl || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}" alt="Avatar">
            <div>
              <span class="post-author">\${post.authorDisplayName}</span>
              <span class="post-username">@\${post.authorUsername}</span>
            </div>
          </div>
          <div class="post-text">\${escapeHtml(post.text)}</div>
          <div class="post-meta">
            Source: \${post.source} · 
            <a href="\${post.url}" target="_blank">View on X</a>
          </div>
        </div>
      \`).join('');

      document.getElementById('posts-container').innerHTML = 
        \`<p style="color: #71767b;">Showing \${Math.min(posts.length, 20)} of \${posts.length} posts</p>\` + html;
    }

    // Escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initialize
    checkAuth();
  </script>
</body>
</html>
  `);
});

export default router;
