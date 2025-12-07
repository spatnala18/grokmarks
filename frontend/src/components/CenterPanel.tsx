// ============================================
// Center Panel - Main Topic View
// ============================================

import { useState, useMemo } from 'react';
import { 
  Clock, 
  Bookmark, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Send,
  Sparkles,
  MessageCircle,
  Headphones,
  X
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post, ActionResult, TimelineEntry, SegmentedPodcastScript } from '../types';
import { parseCitations } from '../utils';
import './CenterPanel.css';

interface CenterPanelProps {
  topic: TopicSpaceWithPosts | null;
  qaHistory: ActionResult[];
  isLoadingTopic: boolean;
  isAskingQuestion: boolean;
  onAskQuestion: (question: string) => void;
  highlightedTweetIds?: string[];
  grokcastMode?: boolean;
  currentSegment?: TimelineEntry | null;
  segmentedScript?: SegmentedPodcastScript | null;
  onExitGrokcast?: () => void;
}

export function CenterPanel({ 
  topic, 
  qaHistory, 
  isLoadingTopic, 
  isAskingQuestion,
  onAskQuestion,
  highlightedTweetIds = [],
  grokcastMode = false,
  currentSegment = null,
  segmentedScript = null,
  onExitGrokcast,
}: CenterPanelProps) {
  const [showPosts, setShowPosts] = useState(false);
  const [question, setQuestion] = useState('');

  // Get tweets for the current segment during grokcast mode
  const segmentTweets = useMemo(() => {
    if (!grokcastMode || !topic || !currentSegment) {
      return [];
    }
    const tweetIds = currentSegment.tweetIds.slice(0, 3); // Cap at 3 tweets per segment
    return tweetIds
      .map(id => topic.posts.find(p => p.id === id))
      .filter((p): p is Post => !!p);
  }, [grokcastMode, topic, currentSegment]);

  // Get current segment details from the script
  const currentScriptSegment = useMemo(() => {
    if (!segmentedScript || !currentSegment) return null;
    return segmentedScript.segments.find(s => s.segmentId === currentSegment.segmentId);
  }, [segmentedScript, currentSegment]);

  const handleSubmitQuestion = () => {
    if (question.trim() && !isAskingQuestion) {
      onAskQuestion(question.trim());
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion();
    }
  };

  if (isLoadingTopic) {
    return (
      <main className="center-panel">
        <div className="center-loading">
          <div className="spinner" />
          <span>Loading topic…</span>
        </div>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="center-panel">
        <div className="center-empty">
          <Sparkles size={48} className="empty-icon" />
          <h2>Select a Topic Space</h2>
          <p className="text-secondary">
            Choose a topic from the sidebar to view its overview and ask questions
          </p>
        </div>
      </main>
    );
  }

  // Get unique authors from posts
  const uniqueAuthors = [...new Map(topic.posts.map(p => [p.authorUsername, p])).values()].slice(0, 5);
  
  // Extract bullet points from description
  const descriptionBullets = topic.description
    .split(/[.!?]/)
    .filter(s => s.trim().length > 20)
    .slice(0, 4)
    .map(s => s.trim());

  // ============================================
  // GROKCAST MODE - Show segment-by-segment view
  // ============================================
  if (grokcastMode) {
    return (
      <main className="center-panel grokcast-mode">
        <div className="grokcast-view">
          {/* Grokcast Header */}
          <div className="grokcast-header">
            <div className="grokcast-header-left">
              <Headphones size={24} className="grokcast-icon pulse" />
              <div>
                <h2 className="grokcast-title">
                  {segmentedScript?.title || 'Grokcast Playing'}
                </h2>
                <span className="grokcast-subtitle">
                  Following along with the podcast
                </span>
              </div>
            </div>
            <button className="grokcast-exit" onClick={onExitGrokcast}>
              <X size={18} />
              Exit
            </button>
          </div>

          {/* Current Segment Display */}
          {currentSegment ? (
            <div className="grokcast-segment fade-in">
              {/* Segment Theme/Type */}
              <div className="segment-header">
                {currentScriptSegment?.segmentType === 'intro' && (
                  <span className="segment-type intro">🎙️ Introduction</span>
                )}
                {currentScriptSegment?.segmentType === 'theme' && (
                  <span className="segment-type theme">
                    💡 {currentScriptSegment?.themeTitle || 'Theme'}
                  </span>
                )}
                {currentScriptSegment?.segmentType === 'wrapup' && (
                  <span className="segment-type wrapup">🎯 Wrap Up</span>
                )}
              </div>

              {/* Segment Tweets - Only show if there are tweets for this segment */}
              {segmentTweets.length > 0 ? (
                <div className="segment-tweets">
                  <div className="segment-tweets-label">
                    Related posts ({segmentTweets.length})
                  </div>
                  <div className="segment-tweets-grid">
                    {segmentTweets.map((post, index) => (
                      <div 
                        key={post.id} 
                        className="segment-tweet-card fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="segment-tweet-header">
                          <img src={post.authorProfileImageUrl} alt="" className="segment-tweet-avatar" />
                          <div className="segment-tweet-author">
                            <span className="segment-tweet-name">{post.authorDisplayName}</span>
                            <span className="segment-tweet-handle">@{post.authorUsername}</span>
                          </div>
                        </div>
                        <p className="segment-tweet-text">{post.text}</p>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="segment-tweet-link"
                        >
                          <ExternalLink size={12} />
                          View on X
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="segment-no-tweets">
                  <Sparkles size={32} className="sparkle-icon" />
                  <p>
                    {currentScriptSegment?.segmentType === 'intro' 
                      ? 'Setting the stage...' 
                      : currentScriptSegment?.segmentType === 'wrapup'
                      ? 'Wrapping up the discussion...'
                      : 'No specific tweets for this segment'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grokcast-waiting">
              <div className="grokcast-pulse-ring"></div>
              <Headphones size={48} />
              <p>Waiting for audio to start...</p>
              <span className="grokcast-hint">Press play in the audio player to begin</span>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ============================================
  // NORMAL MODE - Standard topic view
  // ============================================

  return (
    <main className="center-panel">
      <div className="center-content">
        {/* Topic Header */}
        <div className="topic-header">
          <h1 className="topic-title">{topic.title}</h1>
          <div className="topic-meta">
            <span className="meta-item">
              <Bookmark size={14} />
              Based on {topic.postCount} posts
            </span>
            <span className="meta-item">
              <Clock size={14} />
              Updated {new Date(topic.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="topic-authors">
            {uniqueAuthors.map((post) => (
              <a
                key={post.authorId}
                href={`https://x.com/${post.authorUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="author-chip"
              >
                <img src={post.authorProfileImageUrl} alt="" className="author-avatar" />
                @{post.authorUsername}
              </a>
            ))}
          </div>
        </div>

        {/* Topic Overview Card */}
        <div className="card topic-overview">
          <h3 className="card-title">Topic Overview</h3>
          <ul className="overview-bullets">
            {descriptionBullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>

          {/* Collapsible Posts Section */}
          <button 
            className="posts-toggle"
            onClick={() => setShowPosts(!showPosts)}
          >
            {showPosts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>Representative posts ({topic.posts.length})</span>
          </button>

          {showPosts && (
            <div className="posts-list">
              {topic.posts.slice(0, 10).map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  isHighlighted={highlightedTweetIds.includes(post.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ask Grok Section */}
        <div className="card ask-grok">
          <h3 className="card-title">
            <MessageCircle size={18} />
            Ask Grok about this topic
          </h3>

          {/* Q&A History */}
          {qaHistory.length > 0 && (
            <div className="qa-history">
              {qaHistory.map((qa) => (
                <div key={qa.id} className="qa-item fade-in">
                  <div className="qa-question">
                    <span className="qa-label">Q:</span>
                    {qa.input}
                  </div>
                  <div 
                    className="qa-answer"
                    dangerouslySetInnerHTML={{ __html: parseCitations(qa.output) }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Thinking indicator */}
          {isAskingQuestion && (
            <div className="qa-thinking">
              <div className="spinner" />
              <span>Grok is thinking…</span>
            </div>
          )}

          {/* Question Input */}
          <div className="question-input-wrapper">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this topic…"
              className="question-input"
              disabled={isAskingQuestion}
            />
            <button
              className="question-submit"
              onClick={handleSubmitQuestion}
              disabled={!question.trim() || isAskingQuestion}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// Post Card Component
interface PostCardProps {
  post: Post;
  isHighlighted?: boolean;
}

function PostCard({ post, isHighlighted = false }: PostCardProps) {
  return (
    <div className={`post-card ${isHighlighted ? 'highlighted' : ''}`}>
      <div className="post-header">
        <img src={post.authorProfileImageUrl} alt="" className="post-avatar" />
        <div className="post-author-info">
          <span className="post-author-name">{post.authorDisplayName}</span>
          <span className="post-author-handle">@{post.authorUsername}</span>
        </div>
        {isHighlighted && (
          <span className="highlight-badge">🎧 Now playing</span>
        )}
      </div>
      <p className="post-text">{post.text}</p>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="post-link"
      >
        <ExternalLink size={12} />
        View on X
      </a>
    </div>
  );
}
