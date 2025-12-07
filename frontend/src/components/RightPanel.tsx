// ============================================
// Right Panel - Live Feed with Real-Time Updates
// Shows live tweets related to the topic
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap,
  RefreshCw,
  Sparkles,
  Radio,
  ChevronDown,
  Clock,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post, LiveTimeRange } from '../types';
import { topicsApi } from '../api';
import './RightPanel.css';

// Time range options
const TIME_RANGE_OPTIONS: { value: LiveTimeRange; label: string }[] = [
  { value: '30min', label: 'Last 30 min' },
  { value: '2hr', label: 'Last 2 hours' },
  { value: '6hr', label: 'Last 6 hours' },
  { value: '12hr', label: 'Last 12 hours' },
  { value: '24hr', label: 'Last 24 hours' },
  { value: 'since_bookmark', label: 'Since last bookmark' },
];

// Auto-refresh interval (2 minutes)
const AUTO_REFRESH_INTERVAL = 2 * 60 * 1000;

interface RightPanelProps {
  topic: TopicSpaceWithPosts | null;
  highlightedTweetIds?: string[];
}

export function RightPanel({
  topic,
  highlightedTweetIds = [],
}: RightPanelProps) {
  const [timeRange, setTimeRange] = useState<LiveTimeRange>('6hr');
  const [liveTweets, setLiveTweets] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Ref to track current topic ID for cleanup
  const currentTopicIdRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live tweets
  const fetchLiveTweets = useCallback(async (force: boolean = false) => {
    if (!topic) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await topicsApi.getLiveTweets(topic.id, timeRange, force);
      
      if (response.success && response.data) {
        setLiveTweets(response.data.tweets);
        setLastFetched(new Date(response.data.cachedAt));
        setFromCache(response.data.fromCache);
        setSearchQuery(response.data.query);
        
        if (response.data.stale) {
          setError('Using cached data - API limit reached');
        }
      } else {
        setError(response.error || 'Failed to fetch live tweets');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live tweets');
    } finally {
      setIsLoading(false);
    }
  }, [topic, timeRange]);

  // Fetch on topic change or time range change
  useEffect(() => {
    if (topic && topic.id !== currentTopicIdRef.current) {
      currentTopicIdRef.current = topic.id;
      setLiveTweets([]);
      setError(null);
      fetchLiveTweets();
    }
  }, [topic, fetchLiveTweets]);

  // Fetch on time range change
  useEffect(() => {
    if (topic) {
      fetchLiveTweets();
    }
  }, [timeRange]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!topic) return;

    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval
    refreshIntervalRef.current = setInterval(() => {
      console.log('Auto-refreshing live tweets...');
      fetchLiveTweets();
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup on unmount or topic change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [topic, fetchLiveTweets]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchLiveTweets(true); // Force refresh (skip cache)
  };

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

  const trending = topic.trending;

  return (
    <aside className="right-panel">
      {/* Live Header */}
      <div className="right-panel-header">
        <div className="live-header-title">
          <Radio size={18} className="live-icon pulse" />
          <span>Live Feed</span>
        </div>
        <div className="header-actions">
          <button 
            className={`refresh-button ${isLoading ? 'spinning' : ''}`} 
            onClick={handleRefresh} 
            title="Refresh live tweets"
            disabled={isLoading}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="right-panel-content">
        {/* Time Range Selector */}
        <div className="time-range-selector">
          <Clock size={14} />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as LiveTimeRange)}
            className="time-range-dropdown"
          >
            {TIME_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="dropdown-arrow" />
        </div>

        {/* Live Tweets Section */}
        <div className="live-tweets-section">
          <div className="section-header">
            <Zap size={14} className="live-zap" />
            <span>Recent Related Tweets</span>
            {liveTweets.length > 0 && (
              <span className="tweet-count">({liveTweets.length})</span>
            )}
            {lastFetched && (
              <span className="last-updated">
                {fromCache ? 'cached' : 'updated'} {getTimeAgo(lastFetched)}
              </span>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="live-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && liveTweets.length === 0 && (
            <div className="live-loading">
              <div className="spinner-small" />
              <span>Searching X...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && liveTweets.length === 0 && (
            <div className="live-empty">
              <Radio size={24} />
              <p>No recent tweets found</p>
              <span className="live-empty-hint">Try a longer time range</span>
            </div>
          )}

          {/* Tweet List - Scrollable, chronological order (oldest first, newest at bottom) */}
          {liveTweets.length > 0 && (
            <div className="live-tweets-list">
              {liveTweets.map((post) => (
                <LivePostCard 
                  key={post.id} 
                  post={post} 
                  isHighlighted={highlightedTweetIds.includes(post.id)}
                />
              ))}
            </div>
          )}

          {/* Search Query Info */}
          {searchQuery && (
            <div className="search-query-info">
              <span className="query-label">Query:</span>
              <span className="query-text">{searchQuery.slice(0, 50)}...</span>
            </div>
          )}
        </div>

        {/* Trending Section */}
        {trending && (trending.hashtags.length > 0 || trending.mentions.length > 0 || trending.keywords.length > 0) && (
          <div className="trending-section">
            <div className="section-header">
              <Sparkles size={14} />
              <span>Trending in Bookmarks</span>
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
      className={`live-post-card ${isHighlighted ? 'highlighted' : ''} ${post.source === 'search' ? 'live-tweet' : ''}`}
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
        {post.source === 'search' && (
          <ExternalLink size={12} className="external-icon" />
        )}
      </div>
      <p className="live-post-text">{post.text.slice(0, 140)}{post.text.length > 140 ? '…' : ''}</p>
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
