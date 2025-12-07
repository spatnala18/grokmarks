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
    .citation {
      color: #1d9bf0;
      font-size: 11px;
      font-weight: bold;
      text-decoration: none;
      vertical-align: super;
      padding: 0 2px;
      background: rgba(29, 155, 240, 0.1);
      border-radius: 3px;
      margin-left: 1px;
    }
    .citation:hover {
      background: rgba(29, 155, 240, 0.3);
      text-decoration: none;
    }
    .input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }
    .input-group label {
      color: #71767b;
      min-width: 120px;
    }
    .input-group input {
      background: #000;
      border: 1px solid #2f3336;
      border-radius: 8px;
      padding: 8px 12px;
      color: #e7e9ea;
      width: 100px;
      font-size: 14px;
    }
    .input-group input:focus {
      outline: none;
      border-color: #1d9bf0;
    }
    .settings-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
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
    <p>Fetch your bookmarks and timeline from X, then classify into Topic Spaces using Grok.</p>
    
    <div class="settings-row">
      <div class="input-group">
        <label for="maxBookmarks">Max Bookmarks:</label>
        <input type="number" id="maxBookmarks" value="50" min="10" max="1000" step="10">
      </div>
      <div class="input-group">
        <label for="maxTimeline">Max Timeline:</label>
        <input type="number" id="maxTimeline" value="30" min="10" max="500" step="10">
      </div>
    </div>
    
    <button onclick="syncData()" id="sync-btn">🔄 Sync & Classify</button>
    <button onclick="syncDataNoClassify()" id="sync-no-classify-btn">📥 Sync Only (No Grok)</button>
    <button onclick="getTopics()">📚 View Topic Spaces</button>
    
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
      <div class="stat">
        <div class="stat-value" id="stat-topics">0</div>
        <div class="stat-label">Topic Spaces</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Topic Spaces</h2>
    <div id="topics-container">No topics yet. Click "Sync & Classify" above.</div>
  </div>

  <div class="card" id="actions-card" style="display: none;">
    <h2>🎯 Actions for: <span id="selected-topic-name">-</span></h2>
    <input type="hidden" id="selected-topic-id" value="">
    
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
      <button onclick="generateBriefing()" id="briefing-btn">📋 Generate Briefing</button>
      <button onclick="generatePodcast()" id="podcast-btn">🎙️ Podcast Script</button>
    </div>
    
    <div style="display: flex; gap: 10px; align-items: flex-end;">
      <div class="input-group" style="flex: 1;">
        <label for="question">Ask a Question:</label>
        <input type="text" id="question" placeholder="What are the main points being discussed?" style="width: 100%;">
      </div>
      <button onclick="askQuestion()" id="qa-btn">❓ Ask</button>
    </div>
    
    <div id="action-result" style="margin-top: 15px; padding: 15px; background: #1a1a1a; border-radius: 8px; display: none;">
      <div id="action-result-content" style="white-space: pre-wrap;"></div>
    </div>
  </div>

  <div class="card">
    <h2>Output</h2>
    <div id="output" class="output">Results will appear here...</div>
  </div>

  <div class="card">
    <h2>Posts Preview</h2>
    <div id="posts-container">No posts loaded yet.</div>
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
      
      const maxBookmarks = document.getElementById('maxBookmarks').value;
      const maxTimeline = document.getElementById('maxTimeline').value;
      output({ message: \`Syncing & classifying (up to \${maxBookmarks} bookmarks, \${maxTimeline} timeline)... This may take a minute.\` });
      
      try {
        const data = await api('POST', \`/api/x/sync?maxBookmarks=\${maxBookmarks}&maxTimeline=\${maxTimeline}\`);
        output(data);
        
        if (data.success) {
          document.getElementById('sync-stats').style.display = 'flex';
          document.getElementById('stat-total').textContent = data.data.totalPosts;
          document.getElementById('stat-bookmarks').textContent = data.data.bookmarksCount;
          document.getElementById('stat-timeline').textContent = data.data.timelineCount;
          document.getElementById('stat-topics').textContent = data.data.topicSpacesCount || 0;
          displayTopics(data.data.topicSpaces || []);
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Sync & Classify';
      }
    }

    // Sync without classification
    async function syncDataNoClassify() {
      const btn = document.getElementById('sync-no-classify-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Syncing...';
      
      const maxBookmarks = document.getElementById('maxBookmarks').value;
      const maxTimeline = document.getElementById('maxTimeline').value;
      output({ message: \`Syncing data (no classification)...\` });
      
      try {
        const data = await api('POST', \`/api/x/sync?maxBookmarks=\${maxBookmarks}&maxTimeline=\${maxTimeline}&classify=false\`);
        output(data);
        
        if (data.success) {
          document.getElementById('sync-stats').style.display = 'flex';
          document.getElementById('stat-total').textContent = data.data.totalPosts;
          document.getElementById('stat-bookmarks').textContent = data.data.bookmarksCount;
          document.getElementById('stat-timeline').textContent = data.data.timelineCount;
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '📥 Sync Only (No Grok)';
      }
    }

    // Get topic spaces
    async function getTopics() {
      try {
        const data = await api('GET', '/api/topics');
        output(data);
        
        if (data.success) {
          document.getElementById('stat-topics').textContent = data.data.count;
          displayTopics(data.data.topicSpaces || []);
        }
      } catch (e) {
        output({ error: e.message });
      }
    }

    // View a single topic
    async function viewTopic(topicId, topicTitle) {
      try {
        const data = await api('GET', \`/api/topics/\${topicId}\`);
        output(data);
        
        if (data.success) {
          displayPosts(data.data.posts);
          selectTopic(topicId, topicTitle || data.data.title);
        }
      } catch (e) {
        output({ error: e.message });
      }
    }

    // Select a topic for actions
    function selectTopic(topicId, topicTitle) {
      document.getElementById('selected-topic-id').value = topicId;
      document.getElementById('selected-topic-name').textContent = topicTitle;
      document.getElementById('actions-card').style.display = 'block';
      document.getElementById('action-result').style.display = 'none';
    }

    // Display topics
    function displayTopics(topics) {
      if (!topics || topics.length === 0) {
        document.getElementById('topics-container').innerHTML = '<p class="loading">No topics found. Run Sync & Classify first.</p>';
        document.getElementById('actions-card').style.display = 'none';
        return;
      }

      const html = topics.map(topic => \`
        <div class="post" style="cursor: pointer;" onclick="viewTopic('\${topic.id}', '\${topic.title.replace(/'/g, "\\\\'")}')">
          <div class="post-header">
            <div>
              <span class="post-author">\${topic.title}</span>
              <span class="post-username">\${topic.postCount} posts</span>
            </div>
          </div>
          <div class="post-text" style="color: #71767b;">\${topic.description}</div>
        </div>
      \`).join('');

      document.getElementById('topics-container').innerHTML = html;
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

    // Generate briefing
    async function generateBriefing() {
      const topicId = document.getElementById('selected-topic-id').value;
      if (!topicId) return alert('Select a topic first');
      
      const btn = document.getElementById('briefing-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Generating...';
      
      try {
        const data = await api('POST', \`/api/topics/\${topicId}/briefing\`);
        output(data);
        
        if (data.success) {
          showActionResult(data.data.output);
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '📋 Generate Briefing';
      }
    }

    // Generate podcast script
    async function generatePodcast() {
      const topicId = document.getElementById('selected-topic-id').value;
      if (!topicId) return alert('Select a topic first');
      
      const btn = document.getElementById('podcast-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Generating...';
      
      try {
        const data = await api('POST', \`/api/topics/\${topicId}/podcast\`);
        output(data);
        
        if (data.success) {
          showActionResult(data.data.output);
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '🎙️ Podcast Script';
      }
    }

    // Ask question
    async function askQuestion() {
      const topicId = document.getElementById('selected-topic-id').value;
      const question = document.getElementById('question').value.trim();
      
      if (!topicId) return alert('Select a topic first');
      if (!question) return alert('Enter a question');
      
      const btn = document.getElementById('qa-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Thinking...';
      
      try {
        const data = await api('POST', \`/api/topics/\${topicId}/qa\`, { question });
        output(data);
        
        if (data.success) {
          showActionResult(data.data.output);
        }
      } catch (e) {
        output({ error: e.message });
      } finally {
        btn.disabled = false;
        btn.textContent = '❓ Ask';
      }
    }

    // Show action result with clickable citations
    function showActionResult(content, groundedPostIds = []) {
      document.getElementById('action-result').style.display = 'block';
      
      // Parse and convert [tweetId] citations to clickable links
      const processedContent = content.replace(/\\[(\\d{15,25})\\]/g, (match, tweetId) => {
        // Create a clickable link that opens the tweet
        return \`<a href="https://x.com/i/status/\${tweetId}" target="_blank" class="citation" title="View tweet \${tweetId}">[↗]</a>\`;
      });
      
      // Convert markdown-style headers and bullets to HTML
      const htmlContent = processedContent
        .replace(/^# (.+)$/gm, '<h3 style="color: #1d9bf0; margin-top: 0;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h4 style="color: #71767b; margin-bottom: 8px;">$1</h4>')
        .replace(/^• (.+)$/gm, '<li style="margin: 8px 0;">$1</li>')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\n\\n/g, '</p><p>')
        .replace(/\\n/g, '<br>');
      
      document.getElementById('action-result-content').innerHTML = '<p>' + htmlContent + '</p>';
    }

    // Initialize
    checkAuth();
  </script>
</body>
</html>
  `);
});

export default router;
