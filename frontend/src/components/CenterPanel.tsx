// ============================================
// Center Panel - Main Topic View
// ============================================

import { useState } from 'react';
import { 
  Clock, 
  Bookmark, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Send,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post, ActionResult } from '../types';
import { parseCitations } from '../utils';
import './CenterPanel.css';

interface CenterPanelProps {
  topic: TopicSpaceWithPosts | null;
  qaHistory: ActionResult[];
  isLoadingTopic: boolean;
  isAskingQuestion: boolean;
  onAskQuestion: (question: string) => void;
}

export function CenterPanel({ 
  topic, 
  qaHistory, 
  isLoadingTopic, 
  isAskingQuestion,
  onAskQuestion 
}: CenterPanelProps) {
  const [showPosts, setShowPosts] = useState(false);
  const [question, setQuestion] = useState('');

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
                <PostCard key={post.id} post={post} />
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
function PostCard({ post }: { post: Post }) {
  return (
    <div className="post-card">
      <div className="post-header">
        <img src={post.authorProfileImageUrl} alt="" className="post-avatar" />
        <div className="post-author-info">
          <span className="post-author-name">{post.authorDisplayName}</span>
          <span className="post-author-handle">@{post.authorUsername}</span>
        </div>
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
