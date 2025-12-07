// ============================================
// Right Panel - Live Feed (Always Visible)
// Shows trending topics and recent posts
// ============================================

import { 
  Zap,
  RefreshCw,
  Sparkles,
  Radio,
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post } from '../types';
import './RightPanel.css';

interface RightPanelProps {
  topic: TopicSpaceWithPosts | null;
  onRefreshTopic: () => void;
  highlightedTweetIds?: string[];
}

export function RightPanel({
  topic,
  onRefreshTopic,
  highlightedTweetIds = [],
}: RightPanelProps) {
  if (!topic) {
    return (
      <aside className="right-panel">
        <div className="right-panel-empty">
          <Radio size={32} />
          <p>Select a topic to see live updates</p>
        </div>
      </aside>
    );
  }

  // Sort posts by date, newest first
  const sortedPosts = [...topic.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentPosts = sortedPosts.slice(0, 8);
  const trending = topic.trending;

  return (
    <aside className="right-panel">
      {/* Live Header */}
      <div className="right-panel-header">
        <div className="live-header-title">
          <Radio size={18} className="live-icon pulse" />
          <span>Live Feed</span>
        </div>
        <button className="refresh-button" onClick={onRefreshTopic} title="Refresh from X">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="right-panel-content">
        {/* Status Card */}
        <div className="live-status-card">
          <div className="status-header">
            <Zap size={16} className="status-icon" />
            <span>Topic Activity</span>
          </div>
          {topic.newPostCount > 0 ? (
            <p className="status-count">{topic.newPostCount} new posts since last visit</p>
          ) : (
            <p className="status-count text-secondary">All caught up!</p>
          )}
        </div>

        {/* Trending Section */}
        {trending && (trending.hashtags.length > 0 || trending.mentions.length > 0 || trending.keywords.length > 0) && (
          <div className="trending-section">
            <div className="section-header">
              <Sparkles size={14} />
              <span>Trending</span>
            </div>
            
            {/* Hashtags */}
            {trending.hashtags.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-label">Hashtags</h5>
                <div className="trending-tags">
                  {trending.hashtags.slice(0, 5).map((item) => (
                    <a 
                      key={item.text}
                      href={`https://x.com/search?q=${encodeURIComponent(item.text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trending-tag hashtag"
                      title={`${item.count} posts`}
                    >
                      {item.text}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Mentions */}
            {trending.mentions.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-label">Active Users</h5>
                <div className="trending-tags">
                  {trending.mentions.slice(0, 5).map((item) => (
                    <a 
                      key={item.text}
                      href={`https://x.com/${item.text.slice(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trending-tag mention"
                      title={`Mentioned ${item.count} times`}
                    >
                      {item.text}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {trending.keywords.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-label">Keywords</h5>
                <div className="trending-tags">
                  {trending.keywords.slice(0, 6).map((item) => (
                    <span 
                      key={item.text}
                      className="trending-tag keyword"
                      title={`${item.count} posts`}
                    >
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Posts */}
        <div className="recent-posts-section">
          <div className="section-header">
            <span>Recent Bookmarks</span>
          </div>
          <div className="recent-posts-list">
            {recentPosts.map((post) => (
              <LivePostCard 
                key={post.id} 
                post={post} 
                isHighlighted={highlightedTweetIds.includes(post.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================
// Live Post Card
// ============================================
interface LivePostCardProps {
  post: Post;
  isHighlighted?: boolean;
}

function LivePostCard({ post, isHighlighted = false }: LivePostCardProps) {
  const timeAgo = getTimeAgo(new Date(post.createdAt));
  
  return (
    <a 
      href={post.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`live-post-card ${isHighlighted ? 'highlighted' : ''}`}
    >
      <div className="live-post-header">
        <img src={post.authorProfileImageUrl} alt="" className="live-post-avatar" />
        <div className="live-post-meta">
          <span className="live-post-author">@{post.authorUsername}</span>
          <span className="live-post-time">{timeAgo}</span>
        </div>
        {isHighlighted && (
          <span className="live-highlight-badge">🎧</span>
        )}
      </div>
      <p className="live-post-text">{post.text.slice(0, 120)}{post.text.length > 120 ? '…' : ''}</p>
    </a>
  );
}

// ============================================
// Utility Functions
// ============================================
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
