// ============================================
// Center Panel - Three-Tab Topic View
// Tabs: Overview | Research | Grokcast
// ============================================

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  X,
  FileText,
  Search,
  Mic,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post, ActionResult, TimelineEntry, SegmentedPodcastScript, PodcastAudio } from '../types';
import { parseCitations } from '../utils';
import './CenterPanel.css';

// Helper to get full URL
const getFullUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

// Tab types (3 tabs: Overview, Research, Grokcast)
type TabId = 'overview' | 'research' | 'grokcast';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
  { id: 'research', label: 'Research', icon: <Search size={16} /> },
  { id: 'grokcast', label: 'Grokcast', icon: <Mic size={16} /> },
];

interface CenterPanelProps {
  topic: TopicSpaceWithPosts | null;
  qaHistory: ActionResult[];
  briefing: ActionResult | null;
  isLoadingTopic: boolean;
  isAskingQuestion: boolean;
  isGeneratingBriefing: boolean;
  onAskQuestion: (question: string) => void;
  onGenerateBriefing: () => void;
  highlightedTweetIds?: string[];
  grokcastMode?: boolean;
  currentSegment?: TimelineEntry | null;
  segmentedScript?: SegmentedPodcastScript | null;
  onExitGrokcast?: () => void;
  // Podcast/Grokcast props
  podcast?: ActionResult | null;
  podcastAudio?: PodcastAudio | null;
  isGeneratingPodcast?: boolean;
  isGeneratingPodcastAudio?: boolean;
  onGeneratePodcast?: () => void;
  onGeneratePodcastAudio?: () => void;
  onHighlightTweets?: (tweetIds: string[]) => void;
  onSegmentChange?: (segment: TimelineEntry | null) => void;
  onGrokcastStart?: () => void;
  onGrokcastEnd?: () => void;
}

export function CenterPanel({ 
  topic, 
  qaHistory, 
  briefing,
  isLoadingTopic, 
  isAskingQuestion,
  isGeneratingBriefing,
  onAskQuestion,
  onGenerateBriefing,
  highlightedTweetIds = [],
  grokcastMode = false,
  currentSegment = null,
  segmentedScript = null,
  onExitGrokcast,
  // Podcast/Grokcast props
  podcast = null,
  podcastAudio = null,
  isGeneratingPodcast = false,
  isGeneratingPodcastAudio = false,
  onGeneratePodcast,
  onGeneratePodcastAudio,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
}: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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

  // Switch to grokcast tab when grokcast mode is active
  const effectiveTab = grokcastMode ? 'grokcast' : activeTab;

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
      {/* Topic Header - Always visible */}
      <div className="center-header">
        <div className="topic-header-compact">
          <h1 className="topic-title">{topic.title}</h1>
          <div className="topic-meta">
            <span className="meta-item">
              <Bookmark size={14} />
              {topic.postCount} posts
            </span>
            <span className="meta-item">
              <Clock size={14} />
              {new Date(topic.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${effectiveTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'grokcast' && grokcastMode && (
                <span className="tab-live-dot" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="center-content">
        {effectiveTab === 'overview' && (
          <OverviewTab
            topic={topic}
            uniqueAuthors={uniqueAuthors}
            descriptionBullets={descriptionBullets}
            showPosts={showPosts}
            setShowPosts={setShowPosts}
            highlightedTweetIds={highlightedTweetIds}
          />
        )}

        {effectiveTab === 'research' && (
          <ResearchTab
            topic={topic}
            briefing={briefing}
            qaHistory={qaHistory}
            isAskingQuestion={isAskingQuestion}
            isGeneratingBriefing={isGeneratingBriefing}
            question={question}
            setQuestion={setQuestion}
            handleSubmitQuestion={handleSubmitQuestion}
            handleKeyDown={handleKeyDown}
            onGenerateBriefing={onGenerateBriefing}
          />
        )}

        {effectiveTab === 'grokcast' && (
          <GrokcastTab
            topic={topic}
            grokcastMode={grokcastMode}
            currentSegment={currentSegment}
            currentScriptSegment={currentScriptSegment}
            segmentTweets={segmentTweets}
            segmentedScript={segmentedScript}
            podcast={podcast}
            podcastAudio={podcastAudio}
            isGeneratingPodcast={isGeneratingPodcast}
            isGeneratingPodcastAudio={isGeneratingPodcastAudio}
            onGeneratePodcast={onGeneratePodcast}
            onGeneratePodcastAudio={onGeneratePodcastAudio}
            onHighlightTweets={onHighlightTweets}
            onSegmentChange={onSegmentChange}
            onGrokcastStart={onGrokcastStart}
            onGrokcastEnd={onGrokcastEnd}
            onExitGrokcast={onExitGrokcast}
          />
        )}
      </div>
    </main>
  );
}

// ============================================
// OVERVIEW TAB
// ============================================
interface OverviewTabProps {
  topic: TopicSpaceWithPosts;
  uniqueAuthors: Post[];
  descriptionBullets: string[];
  showPosts: boolean;
  setShowPosts: (show: boolean) => void;
  highlightedTweetIds: string[];
}

function OverviewTab({
  topic,
  uniqueAuthors,
  descriptionBullets,
  showPosts,
  setShowPosts,
  highlightedTweetIds,
}: OverviewTabProps) {
  return (
    <div className="tab-content overview-tab">
      {/* Contributors */}
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

      {/* Topic Overview Card */}
      <div className="card topic-overview">
        <h3 className="card-title">
          <Sparkles size={18} />
          About this topic
        </h3>
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
          <span>Bookmarked posts ({topic.posts.length})</span>
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
    </div>
  );
}

// ============================================
// RESEARCH TAB
// ============================================
interface ResearchTabProps {
  topic: TopicSpaceWithPosts;
  briefing: ActionResult | null;
  qaHistory: ActionResult[];
  isAskingQuestion: boolean;
  isGeneratingBriefing: boolean;
  question: string;
  setQuestion: (q: string) => void;
  handleSubmitQuestion: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  onGenerateBriefing: () => void;
}

function ResearchTab({
  briefing,
  qaHistory,
  isAskingQuestion,
  isGeneratingBriefing,
  question,
  setQuestion,
  handleSubmitQuestion,
  handleKeyDown,
  onGenerateBriefing,
}: ResearchTabProps) {
  return (
    <div className="tab-content research-tab">
      {/* Briefing Section */}
      <div className="card briefing-card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} />
            Research Briefing
          </h3>
          <button
            className="generate-button"
            onClick={onGenerateBriefing}
            disabled={isGeneratingBriefing}
          >
            {isGeneratingBriefing ? (
              <>
                <div className="spinner-small" />
                Generating...
              </>
            ) : briefing ? (
              <>
                <RefreshCw size={14} />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate
              </>
            )}
          </button>
        </div>

        {briefing ? (
          <div 
            className="briefing-content"
            dangerouslySetInnerHTML={{ __html: parseCitations(briefing.output) }}
          />
        ) : (
          <div className="briefing-empty">
            <p>Generate a research-style briefing from your bookmarked posts about this topic.</p>
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
  );
}

// ============================================
// GROKCAST TAB - with Audio Player and Generation
// ============================================
interface GrokcastTabProps {
  topic: TopicSpaceWithPosts;
  grokcastMode: boolean;
  currentSegment: TimelineEntry | null;
  currentScriptSegment: any;
  segmentTweets: Post[];
  segmentedScript: SegmentedPodcastScript | null;
  podcast?: ActionResult | null;
  podcastAudio?: PodcastAudio | null;
  isGeneratingPodcast?: boolean;
  isGeneratingPodcastAudio?: boolean;
  onGeneratePodcast?: () => void;
  onGeneratePodcastAudio?: () => void;
  onHighlightTweets?: (tweetIds: string[]) => void;
  onSegmentChange?: (segment: TimelineEntry | null) => void;
  onGrokcastStart?: () => void;
  onGrokcastEnd?: () => void;
  onExitGrokcast?: () => void;
}

function GrokcastTab({
  topic,
  grokcastMode,
  currentSegment,
  currentScriptSegment,
  segmentTweets,
  segmentedScript,
  podcast,
  podcastAudio,
  isGeneratingPodcast = false,
  isGeneratingPodcastAudio = false,
  onGeneratePodcast,
  onGeneratePodcastAudio,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
  onExitGrokcast,
}: GrokcastTabProps) {
  // If we have audio and are in grokcast mode, show the playing view
  if (grokcastMode && podcastAudio) {
    return (
      <div className="tab-content grokcast-tab grokcast-active">
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

        {/* Audio Player at bottom */}
        <div className="grokcast-player-section">
          <GrokcastAudioPlayer
            podcastAudio={podcastAudio}
            onHighlightTweets={onHighlightTweets || (() => {})}
            onSegmentChange={onSegmentChange || (() => {})}
            onGrokcastStart={onGrokcastStart || (() => {})}
            onGrokcastEnd={onGrokcastEnd || (() => {})}
          />
        </div>
      </div>
    );
  }

  // Default view: Generation UI
  return (
    <div className="tab-content grokcast-tab">
      <div className="grokcast-generation-ui">
        <div className="grokcast-hero">
          <Headphones size={64} className="grokcast-hero-icon" />
          <h2>Grokcast</h2>
          <p className="grokcast-hero-description">
            Generate an AI-powered podcast about "{topic.title}" based on your bookmarked posts.
            The audio will sync with your tweets as it plays.
          </p>
        </div>

        {/* Generation Steps */}
        <div className="grokcast-steps">
          {/* Step 1: Generate Script */}
          <div className={`grokcast-step ${podcast ? 'completed' : ''} ${isGeneratingPodcast ? 'loading' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Generate Script</h3>
              <p>Create an engaging podcast script from your bookmarks</p>
              {podcast ? (
                <div className="step-status success">
                  <Sparkles size={14} />
                  Script ready
                </div>
              ) : (
                <button
                  className="generate-button"
                  onClick={onGeneratePodcast}
                  disabled={isGeneratingPodcast}
                >
                  {isGeneratingPodcast ? (
                    <>
                      <div className="spinner-small" />
                      Generating script...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Script
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Step 2: Generate Audio */}
          <div className={`grokcast-step ${podcastAudio ? 'completed' : ''} ${isGeneratingPodcastAudio ? 'loading' : ''} ${!podcast ? 'disabled' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Generate Audio</h3>
              <p>Convert the script to speech with xAI TTS</p>
              {podcastAudio ? (
                <div className="step-status success">
                  <Volume2 size={14} />
                  Audio ready ({Math.floor(podcastAudio.duration / 60)}:{String(Math.floor(podcastAudio.duration % 60)).padStart(2, '0')})
                </div>
              ) : (
                <button
                  className="generate-button"
                  onClick={onGeneratePodcastAudio}
                  disabled={!podcast || isGeneratingPodcastAudio}
                >
                  {isGeneratingPodcastAudio ? (
                    <>
                      <div className="spinner-small" />
                      Generating audio...
                    </>
                  ) : (
                    <>
                      <Mic size={14} />
                      Generate Audio
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audio Player - Show when audio is ready */}
        {podcastAudio && onHighlightTweets && onSegmentChange && onGrokcastStart && onGrokcastEnd && (
          <div className="grokcast-player-ready">
            <h3>🎧 Ready to Play</h3>
            <p>Press play to start the Grokcast. Tweets will highlight as they're discussed.</p>
            <GrokcastAudioPlayer
              podcastAudio={podcastAudio}
              onHighlightTweets={onHighlightTweets}
              onSegmentChange={onSegmentChange}
              onGrokcastStart={onGrokcastStart}
              onGrokcastEnd={onGrokcastEnd}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// GROKCAST AUDIO PLAYER - Syncs tweets with audio
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

// ============================================
// Post Card Component (reused from original)
// ============================================
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
