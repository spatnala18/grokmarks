// ============================================
// Right Panel - Guide / Live Pulse / Creator Tabs
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Zap,
  Wand2,
  FileText,
  MessageCircle,
  Users,
  RefreshCw,
  Mic,
  ExternalLink,
  Sparkles,
  Send,
  Copy,
  Check,
  Volume2,
  Loader2,
} from 'lucide-react';
import type { TopicSpaceWithPosts, ActionResult, Post, PodcastAudio, TimelineEntry } from '../types';
import { parseCitations } from '../utils';
import { getFullUrl } from '../api';
import './RightPanel.css';

type TabId = 'guide' | 'pulse' | 'creator';

interface RightPanelProps {
  topic: TopicSpaceWithPosts | null;
  qaHistory: ActionResult[];
  briefing: ActionResult | null;
  podcast: ActionResult | null;
  podcastAudio: PodcastAudio | null;
  thread: ActionResult | null;
  isGeneratingBriefing: boolean;
  isGeneratingPodcast: boolean;
  isGeneratingPodcastAudio: boolean;
  isGeneratingThread: boolean;
  isAskingQuestion: boolean;
  onGenerateBriefing: () => void;
  onGeneratePodcast: () => void;
  onGeneratePodcastAudio: () => void;
  onGenerateThread: () => void;
  onRefreshTopic: () => void;
  onAskQuestion: (question: string) => void;
  onHighlightTweets: (tweetIds: string[]) => void;
  onSegmentChange: (segment: TimelineEntry | null) => void;
  onGrokcastStart: () => void;
  onGrokcastEnd: () => void;
}

export function RightPanel({
  topic,
  qaHistory,
  briefing,
  podcast,
  podcastAudio,
  thread,
  isGeneratingBriefing,
  isGeneratingPodcast,
  isGeneratingPodcastAudio,
  isGeneratingThread,
  isAskingQuestion,
  onGenerateBriefing,
  onGeneratePodcast,
  onGeneratePodcastAudio,
  onGenerateThread,
  onRefreshTopic,
  onAskQuestion,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('guide');

  if (!topic) {
    return (
      <aside className="right-panel">
        <div className="right-panel-empty">
          <Sparkles size={32} />
          <p>Select a topic to see tools</p>
        </div>
      </aside>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'guide', label: 'Guide', icon: <BookOpen size={16} /> },
    { id: 'pulse', label: 'Live Pulse', icon: <Zap size={16} /> },
    { id: 'creator', label: 'Creator', icon: <Wand2 size={16} /> },
  ];

  return (
    <aside className="right-panel">
      {/* Tabs */}
      <div className="right-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="right-panel-content">
        {activeTab === 'guide' && (
          <GuideTab
            topic={topic}
            qaHistory={qaHistory}
            briefing={briefing}
            podcast={podcast}
            podcastAudio={podcastAudio}
            isGeneratingBriefing={isGeneratingBriefing}
            isGeneratingPodcast={isGeneratingPodcast}
            isGeneratingPodcastAudio={isGeneratingPodcastAudio}
            isAskingQuestion={isAskingQuestion}
            onGenerateBriefing={onGenerateBriefing}
            onGeneratePodcast={onGeneratePodcast}
            onGeneratePodcastAudio={onGeneratePodcastAudio}
            onAskQuestion={onAskQuestion}
            onHighlightTweets={onHighlightTweets}
            onSegmentChange={onSegmentChange}
            onGrokcastStart={onGrokcastStart}
            onGrokcastEnd={onGrokcastEnd}
          />
        )}
        {activeTab === 'pulse' && (
          <LivePulseTab
            topic={topic}
            onRefresh={onRefreshTopic}
          />
        )}
        {activeTab === 'creator' && (
          <CreatorTab 
            topic={topic}
            thread={thread}
            isGeneratingThread={isGeneratingThread}
            onGenerateThread={onGenerateThread}
          />
        )}
      </div>
    </aside>
  );
}

// ============================================
// Guide Tab
// ============================================
interface GuideTabProps {
  topic: TopicSpaceWithPosts;
  qaHistory: ActionResult[];
  briefing: ActionResult | null;
  podcast: ActionResult | null;
  podcastAudio: PodcastAudio | null;
  isGeneratingBriefing: boolean;
  isGeneratingPodcast: boolean;
  isGeneratingPodcastAudio: boolean;
  isAskingQuestion: boolean;
  onGenerateBriefing: () => void;
  onGeneratePodcast: () => void;
  onGeneratePodcastAudio: () => void;
  onAskQuestion: (question: string) => void;
  onHighlightTweets: (tweetIds: string[]) => void;
  onSegmentChange: (segment: TimelineEntry | null) => void;
  onGrokcastStart: () => void;
  onGrokcastEnd: () => void;
}

function GuideTab({ 
  topic, 
  qaHistory, 
  briefing, 
  podcast,
  podcastAudio,
  isGeneratingBriefing, 
  isGeneratingPodcast,
  isGeneratingPodcastAudio,
  isAskingQuestion,
  onGenerateBriefing,
  onGeneratePodcast,
  onGeneratePodcastAudio,
  onAskQuestion,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
}: GuideTabProps) {
  // Get unique authors
  const uniqueAuthors = [...new Map(topic.posts.map(p => [p.authorUsername, p])).values()].slice(0, 8);
  
  // Filter Q&A entries
  const qaEntries = qaHistory.filter(a => a.actionType === 'qa');

  return (
    <div className="tab-content fade-in">
      {/* Grok Brief Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <FileText size={16} />
          <span>Grok Brief</span>
        </div>
        <p className="panel-card-subtitle">Concise, Grok-generated briefing for this Topic Space.</p>
        <div className="panel-card-body">
          {briefing ? (
            <div 
              className="briefing-content"
              dangerouslySetInnerHTML={{ __html: parseCitations(briefing.output) }}
            />
          ) : (
            <p className="panel-card-placeholder">
              Generate a quick reference guide for this topic
            </p>
          )}
          <button
            className="panel-action-button"
            onClick={onGenerateBriefing}
            disabled={isGeneratingBriefing}
          >
            {isGeneratingBriefing ? (
              <>
                <div className="spinner small" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                {briefing ? 'Regenerate' : 'Generate'} Brief
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grokcast Card - Moved from Creator */}
      <div className="panel-card">
        <div className="panel-card-header">
          <Mic size={16} />
          <span>Grokcast</span>
        </div>
        <p className="panel-card-subtitle">Listen-ready podcast script about this topic.</p>
        <div className="panel-card-body">
          {podcast ? (
            <div className="podcast-content">
              <div 
                className="podcast-script"
                dangerouslySetInnerHTML={{ __html: formatPodcastScript(podcast.output) }}
              />
              
              {/* Audio Player or Generate Button */}
              {podcastAudio && podcastAudio.podcastUrl ? (
                <GrokcastAudioPlayer
                  podcastAudio={podcastAudio}
                  onHighlightTweets={onHighlightTweets}
                  onSegmentChange={onSegmentChange}
                  onGrokcastStart={onGrokcastStart}
                  onGrokcastEnd={onGrokcastEnd}
                />
              ) : (
                <button
                  className="panel-action-button secondary"
                  onClick={onGeneratePodcastAudio}
                  disabled={isGeneratingPodcastAudio}
                  style={{ marginTop: '12px' }}
                >
                  {isGeneratingPodcastAudio ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Generating Audio…
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} />
                      🎧 Generate Audio
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="panel-card-placeholder">
              Generate a podcast-style script discussing this topic
            </p>
          )}
          <button
            className="panel-action-button"
            onClick={onGeneratePodcast}
            disabled={isGeneratingPodcast}
          >
            {isGeneratingPodcast ? (
              <>
                <div className="spinner small" />
                Generating…
              </>
            ) : (
              <>
                <Mic size={14} />
                {podcast ? 'Regenerate' : 'Generate'} Grokcast
              </>
            )}
          </button>
        </div>
      </div>

      {/* Q&A Card - Interactive with history */}
      <QACard 
        qaHistory={qaEntries}
        isAskingQuestion={isAskingQuestion}
        onAskQuestion={onAskQuestion}
      />

      {/* Who to Follow Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <Users size={16} />
          <span>Who to Follow</span>
        </div>
        <div className="panel-card-body">
          <div className="follow-list">
            {uniqueAuthors.map((author) => (
              <a
                key={author.authorId}
                href={`https://x.com/${author.authorUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="follow-item"
              >
                <img src={author.authorProfileImageUrl} alt="" className="follow-avatar" />
                <div className="follow-info">
                  <span className="follow-name">{author.authorDisplayName}</span>
                  <span className="follow-handle">@{author.authorUsername}</span>
                </div>
                <ExternalLink size={14} className="follow-link-icon" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Q&A Card Component
// ============================================
interface QACardProps {
  qaHistory: ActionResult[];
  isAskingQuestion: boolean;
  onAskQuestion: (question: string) => void;
}

function QACard({ qaHistory, isAskingQuestion, onAskQuestion }: QACardProps) {
  const [question, setQuestion] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new Q&A is added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [qaHistory.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isAskingQuestion) {
      onAskQuestion(question.trim());
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="panel-card qa-card">
      <div className="panel-card-header">
        <MessageCircle size={16} />
        <span>Q&A</span>
      </div>
      <div className="panel-card-body">
        {/* Q&A History */}
        <div className="qa-history" ref={listRef}>
          {qaHistory.length > 0 ? (
            qaHistory.map((qa) => (
              <div key={qa.id} className="qa-item">
                <div className="qa-question">
                  <span className="qa-label">Q:</span>
                  <span>{qa.input}</span>
                </div>
                <div 
                  className="qa-answer"
                  dangerouslySetInnerHTML={{ __html: parseCitations(qa.output) }}
                />
              </div>
            ))
          ) : (
            <p className="panel-card-placeholder">
              Ask questions about this topic to build your Q&A history
            </p>
          )}
          {isAskingQuestion && (
            <div className="qa-item loading">
              <div className="spinner small" />
              <span>Grok is thinking…</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form className="qa-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="qa-input"
            placeholder="Ask a follow-up question about this topic…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAskingQuestion}
          />
          <button 
            type="submit" 
            className="qa-submit-btn"
            disabled={!question.trim() || isAskingQuestion}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Live Pulse Tab
// ============================================
interface LivePulseTabProps {
  topic: TopicSpaceWithPosts;
  onRefresh: () => void;
}

function LivePulseTab({ topic, onRefresh }: LivePulseTabProps) {
  // Sort posts by date, newest first
  const sortedPosts = [...topic.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentPosts = sortedPosts.slice(0, 5);
  const trending = topic.trending;

  return (
    <div className="tab-content fade-in">
      {/* Status Card */}
      <div className="panel-card pulse-status">
        <div className="pulse-header">
          <Zap size={20} className="pulse-icon" />
          <div>
            <h4>Since you last checked…</h4>
            {topic.newPostCount > 0 ? (
              <p className="pulse-new-count">{topic.newPostCount} new posts added</p>
            ) : (
              <p className="text-secondary">All caught up!</p>
            )}
          </div>
        </div>
        <button className="panel-action-button secondary" onClick={onRefresh}>
          <RefreshCw size={14} />
          Refresh from X
        </button>
      </div>

      {/* Trending Section */}
      {trending && (trending.hashtags.length > 0 || trending.mentions.length > 0 || trending.keywords.length > 0) && (
        <div className="panel-card">
          <div className="panel-card-header">
            <Sparkles size={16} />
            <span>Trending in Topic</span>
          </div>
          <div className="panel-card-body trending-section">
            {/* Hashtags */}
            {trending.hashtags.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-group-title">Hashtags</h5>
                <div className="trending-tags">
                  {trending.hashtags.slice(0, 5).map((item) => (
                    <a 
                      key={item.text}
                      href={`https://x.com/search?q=${encodeURIComponent(item.text)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trending-tag hashtag"
                      title={`${item.count} posts (${item.percentage}%)`}
                    >
                      {item.text}
                      <span className="trending-count">{item.count}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Mentions */}
            {trending.mentions.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-group-title">Active Users</h5>
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
                      <span className="trending-count">{item.count}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {trending.keywords.length > 0 && (
              <div className="trending-group">
                <h5 className="trending-group-title">Hot Keywords</h5>
                <div className="trending-tags">
                  {trending.keywords.slice(0, 6).map((item) => (
                    <span 
                      key={item.text}
                      className="trending-tag keyword"
                      title={`${item.count} posts (${item.percentage}%)`}
                    >
                      {item.text}
                      <span className="trending-count">{item.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div className="panel-card">
        <div className="panel-card-header">
          <span>Recent Activity</span>
        </div>
        <div className="panel-card-body">
          <div className="pulse-posts">
            {recentPosts.map((post) => (
              <PulsePostItem key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PulsePostItem({ post }: { post: Post }) {
  const timeAgo = getTimeAgo(new Date(post.createdAt));
  
  return (
    <a 
      href={post.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="pulse-post-item"
    >
      <img src={post.authorProfileImageUrl} alt="" className="pulse-post-avatar" />
      <div className="pulse-post-content">
        <div className="pulse-post-header">
          <span className="pulse-post-author">@{post.authorUsername}</span>
          <span className="pulse-post-time">{timeAgo}</span>
        </div>
        <p className="pulse-post-text">{post.text.slice(0, 100)}…</p>
      </div>
    </a>
  );
}

// ============================================
// Creator Tab - Outgoing content only
// ============================================
interface CreatorTabProps {
  topic: TopicSpaceWithPosts;
  thread: ActionResult | null;
  isGeneratingThread: boolean;
  onGenerateThread: () => void;
}

function CreatorTab({ topic: _topic, thread, isGeneratingThread, onGenerateThread }: CreatorTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyThread = async () => {
    if (!thread) return;
    
    // Extract just the tweets (remove the title line)
    const text = thread.output
      .replace(/^# 🧵 .+\n\n/, '') // Remove title
      .replace(/\n\n---\n\n/g, '\n\n') // Replace dividers with double newlines
      .replace(/ ⚠️ \(\d+ chars\)/g, ''); // Remove character warnings
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="tab-content fade-in">
      {/* Thread Writer */}
      <div className="panel-card">
        <div className="panel-card-header">
          <FileText size={16} />
          <span>Thread Writer</span>
        </div>
        <p className="panel-card-subtitle">Generate a Twitter/X thread summarizing this topic.</p>
        <div className="panel-card-body">
          {thread ? (
            <div className="thread-content">
              <div 
                className="thread-output"
                dangerouslySetInnerHTML={{ __html: formatThread(thread.output) }}
              />
              <button 
                className="panel-action-button secondary copy-btn"
                onClick={handleCopyThread}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Thread'}
              </button>
            </div>
          ) : (
            <p className="panel-card-placeholder">
              Create an engaging thread from your topic insights
            </p>
          )}
          <button 
            className="panel-action-button"
            onClick={onGenerateThread}
            disabled={isGeneratingThread}
          >
            {isGeneratingThread ? (
              <>
                <div className="spinner small" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 size={14} />
                {thread ? 'Regenerate' : 'Generate'} Thread
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================
// Grokcast Audio Player with Timeline Sync
// ============================================
interface GrokcastAudioPlayerProps {
  podcastAudio: PodcastAudio;
  onHighlightTweets: (tweetIds: string[]) => void;
  onSegmentChange: (segment: TimelineEntry | null) => void;
  onGrokcastStart: () => void;
  onGrokcastEnd: () => void;
}

function GrokcastAudioPlayer({ 
  podcastAudio, 
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
}: GrokcastAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSegmentIdRef = useRef<string | null>(null);
  
  // Find the current segment based on audio time
  const findCurrentSegment = useCallback((currentTime: number): TimelineEntry | null => {
    const entries = podcastAudio.timeline?.entries;
    if (!entries || entries.length === 0) {
      return null;
    }
    
    for (const entry of entries) {
      if (currentTime >= entry.startTime && currentTime < entry.endTime) {
        return entry;
      }
    }
    // If past last segment, return the last segment (wrapup)
    const lastEntry = entries[entries.length - 1];
    if (currentTime >= lastEntry.startTime) {
      return lastEntry;
    }
    return null;
  }, [podcastAudio.timeline]);
  
  // Handle time updates - use ref to avoid stale closure
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    
    const currentTime = audioRef.current.currentTime;
    const segment = findCurrentSegment(currentTime);
    const newSegmentId = segment?.segmentId || null;
    
    // Only update if segment changed
    if (newSegmentId !== currentSegmentIdRef.current) {
      currentSegmentIdRef.current = newSegmentId;
      // Segment changed - update parent
      if (segment) {
        onHighlightTweets(segment.tweetIds);
        onSegmentChange(segment);
      } else {
        onHighlightTweets([]);
        onSegmentChange(null);
      }
    }
  }, [findCurrentSegment, onHighlightTweets, onSegmentChange]);
  
  // Handle play/pause events
  const handlePlay = useCallback(() => {
    onGrokcastStart(); // Enter grokcast mode when audio starts
    // Immediate update
    handleTimeUpdate();
  }, [handleTimeUpdate, onGrokcastStart]);
  
  const handlePause = useCallback(() => {
    // Don't exit grokcast mode on pause - user might just be pausing briefly
  }, []);
  
  const handleEnded = useCallback(() => {
    currentSegmentIdRef.current = null;
    onHighlightTweets([]); // Clear highlights when audio ends
    onSegmentChange(null);
    onGrokcastEnd(); // Exit grokcast mode when audio ends
  }, [onHighlightTweets, onSegmentChange, onGrokcastEnd]);
  
  // Clear highlights when component unmounts or audio changes
  useEffect(() => {
    return () => {
      onHighlightTweets([]);
      onSegmentChange(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastAudio.podcastUrl]);
  
  const hasTimeline = podcastAudio.timeline && podcastAudio.timeline.entries.length > 0;
  
  return (
    <div className="podcast-audio-player">
      <div className="audio-player-header">
        <Volume2 size={14} />
        <span>🎧 Audio Ready</span>
        <span className="audio-duration">
          {Math.floor(podcastAudio.duration / 60)}:{String(Math.floor(podcastAudio.duration % 60)).padStart(2, '0')}
        </span>
      </div>
      
      <audio 
        ref={audioRef}
        controls 
        className="podcast-audio-element"
        src={getFullUrl(podcastAudio.podcastUrl)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        Your browser does not support the audio element.
      </audio>
      
      <div className="audio-meta">
        <span className="audio-voice">Voice: {podcastAudio.voice}</span>
        {hasTimeline && (
          <span className="audio-sync-badge">
            🔗 Tweet sync enabled
          </span>
        )}
      </div>
    </div>
  );
}

function formatPodcastScript(output: string): string {
  return output
    .replace(/^# (.+)$/gm, '<h3 class="podcast-title">$1</h3>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function formatThread(output: string): string {
  // Parse the thread output
  const lines = output.split('\n');
  let html = '';
  let tweetContent = '';
  
  for (const line of lines) {
    if (line.startsWith('# 🧵')) {
      html += `<h3 class="thread-title">${line.replace('# 🧵 ', '')}</h3>`;
    } else if (line === '---') {
      if (tweetContent) {
        html += `<div class="thread-tweet">${tweetContent}</div>`;
        tweetContent = '';
      }
    } else if (line.trim()) {
      // Check for character count warning
      const warningMatch = line.match(/ ⚠️ \((\d+) chars\)$/);
      if (warningMatch) {
        const cleanLine = line.replace(/ ⚠️ \(\d+ chars\)$/, '');
        tweetContent += `<p>${cleanLine}</p><span class="char-warning">⚠️ ${warningMatch[1]} chars</span>`;
      } else {
        tweetContent += `<p>${line}</p>`;
      }
    }
  }
  
  // Don't forget the last tweet
  if (tweetContent) {
    html += `<div class="thread-tweet">${tweetContent}</div>`;
  }
  
  return html;
}
