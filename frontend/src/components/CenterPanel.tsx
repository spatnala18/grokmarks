// ============================================
// Center Panel - Three-Tab Topic View
// Tabs: Overview | Chat | Grokcast
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
  RotateCcw,
  Plus,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import type { TopicSpaceWithPosts, Post, ActionResult, TimelineEntry, SegmentedPodcastScript, PodcastAudio, ChatMessage, TopicSpace } from '../types';
import { parseCitations } from '../utils';
import { GrokBrand } from './GrokBrand';
import './CenterPanel.css';

// Helper to get full URL
const getFullUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

// Tab types (3 tabs: Overview, Chat, Grokcast)
type TabId = 'overview' | 'chat' | 'grokcast';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
  { id: 'chat', label: 'Chat', icon: <MessageCircle size={16} /> },
  { id: 'grokcast', label: 'Audio Overview', icon: <Headphones size={16} /> },
];

interface CenterPanelProps {
  topic: TopicSpaceWithPosts | null;
  briefing: ActionResult | null;
  isLoadingTopic: boolean;
  isAskingQuestion: boolean;
  isGeneratingBriefing: boolean;
  onAskQuestion: (question: string, chatHistory: ChatMessage[]) => void;
  onGenerateBriefing: () => void;
  highlightedTweetIds?: string[];
  grokcastMode?: boolean;
  currentSegment?: TimelineEntry | null;
  segmentedScript?: SegmentedPodcastScript | null;
  onExitGrokcast?: () => void;
  // Chat props
  chatMessages: ChatMessage[];
  onClearChat: () => void;
  // Podcast/Grokcast props
  podcastAudio?: PodcastAudio | null;
  isGeneratingPodcast?: boolean;
  isGeneratingPodcastAudio?: boolean;
  onGeneratePodcast?: () => void;
  onHighlightTweets?: (tweetIds: string[]) => void;
  onSegmentChange?: (segment: TimelineEntry | null) => void;
  onGrokcastStart?: () => void;
  onGrokcastEnd?: () => void;
  // Tweet management props
  allTopics?: TopicSpace[];
  onAddTweet?: (tweetUrl: string) => Promise<void>;
  onMoveTweet?: (postId: string, toTopicId: string) => Promise<void>;
  isAddingTweet?: boolean;
  isMovingTweet?: boolean;
}

export function CenterPanel({ 
  topic, 
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
  // Chat props
  chatMessages,
  onClearChat,
  // Podcast/Grokcast props
  podcastAudio = null,
  isGeneratingPodcast = false,
  isGeneratingPodcastAudio = false,
  onGeneratePodcast,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
  // Tweet management props
  allTopics = [],
  onAddTweet,
  onMoveTweet,
  isAddingTweet = false,
  isMovingTweet = false,
}: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showPosts, setShowPosts] = useState(false);
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showAddTweetModal, setShowAddTweetModal] = useState(false);
  const [addTweetUrl, setAddTweetUrl] = useState('');

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Auto-generate briefing when topic is selected for the first time
  useEffect(() => {
    if (topic && !briefing && !isGeneratingBriefing) {
      onGenerateBriefing();
    }
  }, [topic?.id]); // Only trigger when topic ID changes

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

  // Get other topics for move functionality
  const otherTopics = useMemo(() => {
    if (!topic || !allTopics) return [];
    return allTopics.filter(t => t.id !== topic.id);
  }, [topic, allTopics]);

  const handleSubmitQuestion = () => {
    if (question.trim() && !isAskingQuestion) {
      onAskQuestion(question.trim(), chatMessages);
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion();
    }
  };

  const handleAddTweet = async () => {
    if (addTweetUrl.trim() && onAddTweet) {
      await onAddTweet(addTweetUrl.trim());
      setAddTweetUrl('');
      setShowAddTweetModal(false);
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

      {/* Add Tweet Modal */}
      {showAddTweetModal && (
        <div className="modal-overlay" onClick={() => setShowAddTweetModal(false)}>
          <div className="modal add-tweet-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Tweet</h3>
              <button className="modal-close" onClick={() => setShowAddTweetModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-content">
              <label htmlFor="tweet-url">Paste X/Twitter URL or Tweet ID</label>
              <input
                id="tweet-url"
                type="text"
                placeholder="https://x.com/user/status/123..."
                value={addTweetUrl}
                onChange={(e) => setAddTweetUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTweet()}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowAddTweetModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddTweet}
                disabled={!addTweetUrl.trim() || isAddingTweet}
              >
                {isAddingTweet ? (
                  <>
                    <div className="spinner-small" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add to Topic
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="center-content">
        {effectiveTab === 'overview' && (
          <OverviewTab
            topic={topic}
            uniqueAuthors={uniqueAuthors}
            showPosts={showPosts}
            setShowPosts={setShowPosts}
            highlightedTweetIds={highlightedTweetIds}
            briefing={briefing}
            isGeneratingBriefing={isGeneratingBriefing}
            onShowAddTweetModal={() => setShowAddTweetModal(true)}
            otherTopics={otherTopics}
            onMoveTweet={onMoveTweet}
            isMovingTweet={isMovingTweet}
          />
        )}

        {effectiveTab === 'chat' && (
          <ChatTab
            topic={topic}
            chatMessages={chatMessages}
            isAskingQuestion={isAskingQuestion}
            question={question}
            setQuestion={setQuestion}
            handleSubmitQuestion={handleSubmitQuestion}
            handleKeyDown={handleKeyDown}
            onClearChat={onClearChat}
            chatEndRef={chatEndRef}
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
            podcastAudio={podcastAudio}
            isGeneratingPodcast={isGeneratingPodcast}
            isGeneratingPodcastAudio={isGeneratingPodcastAudio}
            onGeneratePodcast={onGeneratePodcast}
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
  showPosts: boolean;
  setShowPosts: (show: boolean) => void;
  highlightedTweetIds: string[];
  briefing: ActionResult | null;
  isGeneratingBriefing: boolean;
  onShowAddTweetModal: () => void;
  otherTopics: TopicSpace[];
  onMoveTweet?: (postId: string, toTopicId: string) => Promise<void>;
  isMovingTweet?: boolean;
}

function OverviewTab({
  topic,
  uniqueAuthors,
  showPosts,
  setShowPosts,
  highlightedTweetIds,
  briefing,
  isGeneratingBriefing,
  onShowAddTweetModal,
  otherTopics,
  onMoveTweet,
  isMovingTweet = false,
}: OverviewTabProps) {
  // Check if topic is empty (no tweets)
  const isEmpty = topic.posts.length === 0;

  // If empty, show empty state UI
  if (isEmpty) {
    return (
      <div className="tab-content overview-tab empty-topic">
        <div className="empty-topic-content">
          <div className="empty-topic-icon">
            <Bookmark size={48} />
          </div>
          <h3>No tweets in this topic yet</h3>
          <p>Add tweets to this topic by pasting their X/Twitter URL</p>
          <button 
            className="add-tweet-btn-large"
            onClick={onShowAddTweetModal}
          >
            <Plus size={20} />
            Add Your First Tweet
          </button>
        </div>
      </div>
    );
  }

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

      {/* AI-Generated Briefing */}
      <div className="card briefing-card overview-briefing">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} />
            AI Summary
          </h3>
          <GrokBrand variant="created-with" size="small" />
        </div>

        {isGeneratingBriefing ? (
          <div className="briefing-generating">
            <div className="spinner" />
            <span>Generating summary...</span>
          </div>
        ) : briefing ? (
          <div 
            className="briefing-content"
            dangerouslySetInnerHTML={{ __html: parseCitations(briefing.output) }}
          />
        ) : (
          <div className="briefing-empty">
            <p>Loading summary...</p>
          </div>
        )}
      </div>

      {/* Bookmarked Posts */}
      <div className="card topic-posts">
        <div className="posts-header">
          <button 
            className="posts-toggle"
            onClick={() => setShowPosts(!showPosts)}
          >
            {showPosts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>
              <Bookmark size={14} />
              Tweets in topic ({topic.posts.length})
            </span>
          </button>
          <button 
            className="add-tweet-btn"
            onClick={onShowAddTweetModal}
            title="Add tweet by URL"
          >
            <Plus size={16} />
            Add Tweet
          </button>
        </div>

        {showPosts && (
          <div className="posts-list">
            {topic.posts.slice(0, 10).map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                isHighlighted={highlightedTweetIds.includes(post.id)}
                otherTopics={otherTopics}
                onMoveTweet={onMoveTweet}
                isMovingTweet={isMovingTweet}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CHAT TAB - Multi-turn conversation with Grok
// ============================================
interface ChatTabProps {
  topic: TopicSpaceWithPosts;
  chatMessages: ChatMessage[];
  isAskingQuestion: boolean;
  question: string;
  setQuestion: (q: string) => void;
  handleSubmitQuestion: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  onClearChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

function ChatTab({
  topic,
  chatMessages,
  isAskingQuestion,
  question,
  setQuestion,
  handleSubmitQuestion,
  handleKeyDown,
  onClearChat,
  chatEndRef,
}: ChatTabProps) {
  return (
    <div className="tab-content chat-tab">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <GrokBrand variant="powered-by" size="small" />
        </div>
        {chatMessages.length > 0 && (
          <button className="new-chat-button" onClick={onClearChat}>
            <RotateCcw size={14} />
            New Chat
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {chatMessages.length === 0 ? (
          <div className="chat-empty">
            <MessageCircle size={48} className="chat-empty-icon" />
            <h3>Chat with Grok about "{topic.title}"</h3>
            <p>Ask questions about your bookmarked posts on this topic. Grok will answer based on your saved content.</p>
            <div className="chat-suggestions">
              <button 
                className="chat-suggestion"
                onClick={() => setQuestion("What are the main themes in these posts?")}
              >
                What are the main themes?
              </button>
              <button 
                className="chat-suggestion"
                onClick={() => setQuestion("Who are the key people mentioned?")}
              >
                Who are the key people?
              </button>
              <button 
                className="chat-suggestion"
                onClick={() => setQuestion("What are the different viewpoints?")}
              >
                What are the different viewpoints?
              </button>
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="message-avatar">
                    <img 
                      src="/assets/xai-grok/Grok_Logomark_Light.svg" 
                      alt="Grok" 
                      className="grok-avatar"
                    />
                  </div>
                )}
                <div className="message-content">
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ 
                      __html: msg.role === 'assistant' 
                        ? parseCitations(msg.content) 
                        : msg.content 
                    }}
                  />
                </div>
              </div>
            ))}
            
            {/* Thinking indicator */}
            {isAskingQuestion && (
              <div className="chat-message assistant-message thinking">
                <div className="message-avatar">
                  <img 
                    src="/assets/xai-grok/Grok_Logomark_Light.svg" 
                    alt="Grok" 
                    className="grok-avatar"
                  />
                </div>
                <div className="message-content">
                  <div className="message-role">Grok</div>
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <div className="chat-input-wrapper">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Grok..."
          className="chat-input"
          disabled={isAskingQuestion}
        />
        <button
          className="chat-submit"
          onClick={handleSubmitQuestion}
          disabled={!question.trim() || isAskingQuestion}
        >
          <Send size={18} />
        </button>
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
  podcastAudio?: PodcastAudio | null;
  isGeneratingPodcast?: boolean;
  isGeneratingPodcastAudio?: boolean;
  onGeneratePodcast?: () => void;
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
  podcastAudio,
  isGeneratingPodcast = false,
  isGeneratingPodcastAudio = false,
  onGeneratePodcast,
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
            segmentedScript={segmentedScript}
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
          <div className="grokcast-hero-icon-wrapper">
            <Headphones size={48} className="grokcast-hero-icon" />
          </div>
          <h2>Grokcast</h2>
          <p className="grokcast-hero-description">
            Generate an AI-powered podcast about "{topic.title}" based on tweets in the topic.
            The audio will sync with your tweets as it plays.
          </p>
          <GrokBrand variant="powered-by-voice" size="medium" />
        </div>

        {/* Single Generate Button */}
        {!podcastAudio ? (
          <div className="grokcast-generate-section">
            <button
              className="grokcast-generate-btn"
              onClick={onGeneratePodcast}
              disabled={isGeneratingPodcast || isGeneratingPodcastAudio}
            >
              {isGeneratingPodcast ? (
                <>
                  <div className="spinner-grokcast" />
                  <span>Generating script...</span>
                </>
              ) : isGeneratingPodcastAudio ? (
                <>
                  <div className="spinner-grokcast" />
                  <span>Generating audio...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Generate Audio Overview</span>
                </>
              )}
            </button>
            <p className="grokcast-generate-hint">
              This will take about 30-60 seconds to generate
            </p>
          </div>
        ) : (
          /* Audio Player Ready - Compact layout with inline tweet sync */
          <div className="grokcast-player-ready-compact">
            {/* Compact Player with integrated tweet display */}
            <GrokcastAudioPlayer
              podcastAudio={podcastAudio}
              segmentedScript={segmentedScript}
              onHighlightTweets={onHighlightTweets || (() => {})}
              onSegmentChange={onSegmentChange || (() => {})}
              onGrokcastStart={onGrokcastStart || (() => {})}
              onGrokcastEnd={onGrokcastEnd || (() => {})}
              showInlineTweets={true}
              topic={topic}
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
  segmentedScript?: SegmentedPodcastScript | null;
  onHighlightTweets: (tweetIds: string[]) => void;
  onSegmentChange: (segment: TimelineEntry | null) => void;
  onGrokcastStart: () => void;
  onGrokcastEnd: () => void;
  showInlineTweets?: boolean;
  topic?: TopicSpaceWithPosts;
}

function GrokcastAudioPlayer({ 
  podcastAudio, 
  segmentedScript,
  onHighlightTweets,
  onSegmentChange,
  onGrokcastStart,
  onGrokcastEnd,
  showInlineTweets = false,
  topic,
}: GrokcastAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSegmentIdRef = useRef<string | null>(null);
  const [currentSegmentState, setCurrentSegmentState] = useState<TimelineEntry | null>(null);
  
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
      setCurrentSegmentState(segment);
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

  // Get current tweets for inline display
  const inlineTweets = useMemo(() => {
    if (!showInlineTweets || !topic || !currentSegmentState) return [];
    const tweetIds = currentSegmentState.tweetIds.slice(0, 2); // Max 2 tweets inline
    return tweetIds
      .map(id => topic.posts.find(p => p.id === id))
      .filter((p): p is Post => !!p);
  }, [showInlineTweets, topic, currentSegmentState]);
  
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
  
  return (
    <div className="podcast-player-container">
      {/* Inline Tweet Display - Shows currently discussed tweets */}
      {showInlineTweets && (
        <div className="inline-tweet-sync">
          {inlineTweets.length > 0 ? (
            <>
              <div className="inline-sync-header">
                <Sparkles size={12} />
                <span>Now discussing</span>
              </div>
              <div className="inline-tweets-list">
                {inlineTweets.map((post) => (
                  <div key={post.id} className="inline-tweet-card">
                    <img src={post.authorProfileImageUrl} alt="" className="inline-tweet-avatar" />
                    <div className="inline-tweet-content">
                      <span className="inline-tweet-author">@{post.authorUsername}</span>
                      <p className="inline-tweet-text">{post.text.slice(0, 120)}{post.text.length > 120 ? '...' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="inline-sync-waiting">
              <span>▶ Play to see synced tweets</span>
            </div>
          )}
        </div>
      )}

      {/* Compact Horizontal Player */}
      <div className="podcast-player-compact">
        <div className="player-icon-small">
          <Headphones size={24} />
        </div>
        <div className="player-info-compact">
          <div className="player-title-compact">
            {segmentedScript?.title || 'Audio Overview'}
          </div>
        </div>
        <audio 
          ref={audioRef}
          controls 
          className="audio-element-compact"
          src={getFullUrl(podcastAudio.podcastUrl)}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        >
          Your browser does not support the audio element.
        </audio>
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
  otherTopics?: TopicSpace[];
  onMoveTweet?: (postId: string, toTopicId: string) => Promise<void>;
  isMovingTweet?: boolean;
}

function PostCard({ 
  post, 
  isHighlighted = false,
  otherTopics = [],
  onMoveTweet,
  isMovingTweet = false,
}: PostCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    if (showMoveMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  const handleMove = async (toTopicId: string) => {
    if (onMoveTweet) {
      await onMoveTweet(post.id, toTopicId);
      setShowMoveMenu(false);
    }
  };

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
        {otherTopics.length > 0 && onMoveTweet && (
          <div className="post-actions" ref={menuRef}>
            <button 
              className="post-action-btn"
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              title="Move to another topic"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMoveMenu && (
              <div className="post-action-menu">
                <div className="post-action-menu-header">Move to:</div>
                {otherTopics.map(topic => (
                  <button
                    key={topic.id}
                    className="post-action-menu-item"
                    onClick={() => handleMove(topic.id)}
                    disabled={isMovingTweet}
                  >
                    <ArrowRight size={14} />
                    {topic.title}
                  </button>
                ))}
              </div>
            )}
          </div>
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
