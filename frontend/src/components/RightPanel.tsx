// ============================================
// Right Panel - Guide / Live Pulse / Creator Tabs
// ============================================

import { useState } from 'react';
import {
  BookOpen,
  Zap,
  Wand2,
  FileText,
  HelpCircle,
  Users,
  RefreshCw,
  Mic,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { TopicSpaceWithPosts, ActionResult, Post } from '../types';
import { parseCitations } from '../utils';
import './RightPanel.css';

type TabId = 'guide' | 'pulse' | 'creator';

interface RightPanelProps {
  topic: TopicSpaceWithPosts | null;
  qaHistory: ActionResult[];
  briefing: ActionResult | null;
  podcast: ActionResult | null;
  isGeneratingBriefing: boolean;
  isGeneratingPodcast: boolean;
  onGenerateBriefing: () => void;
  onGeneratePodcast: () => void;
  onRefreshTopic: () => void;
}

export function RightPanel({
  topic,
  qaHistory,
  briefing,
  podcast,
  isGeneratingBriefing,
  isGeneratingPodcast,
  onGenerateBriefing,
  onGeneratePodcast,
  onRefreshTopic,
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
            isGeneratingBriefing={isGeneratingBriefing}
            onGenerateBriefing={onGenerateBriefing}
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
            podcast={podcast}
            isGeneratingPodcast={isGeneratingPodcast}
            onGeneratePodcast={onGeneratePodcast}
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
  isGeneratingBriefing: boolean;
  onGenerateBriefing: () => void;
}

function GuideTab({ topic, qaHistory, briefing, isGeneratingBriefing, onGenerateBriefing }: GuideTabProps) {
  // Get unique authors
  const uniqueAuthors = [...new Map(topic.posts.map(p => [p.authorUsername, p])).values()].slice(0, 8);
  
  // Get recent Q&As for FAQ
  const recentQAs = qaHistory.filter(a => a.actionType === 'qa').slice(0, 3);

  return (
    <div className="tab-content fade-in">
      {/* Cheat Sheet Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <FileText size={16} />
          <span>Cheat Sheet</span>
        </div>
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
                {briefing ? 'Regenerate' : 'Generate'} Cheat Sheet
              </>
            )}
          </button>
        </div>
      </div>

      {/* FAQ Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <HelpCircle size={16} />
          <span>FAQ</span>
        </div>
        <div className="panel-card-body">
          {recentQAs.length > 0 ? (
            <div className="faq-list">
              {recentQAs.map((qa) => (
                <div key={qa.id} className="faq-item">
                  <div className="faq-question">{qa.input}</div>
                  <div 
                    className="faq-answer"
                    dangerouslySetInnerHTML={{ __html: parseCitations(qa.output).slice(0, 200) + '…' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-card-placeholder">
              Ask questions in the main panel to build your FAQ
            </p>
          )}
        </div>
      </div>

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

      {/* Trending in Topic - Placeholder */}
      <div className="panel-card">
        <div className="panel-card-header">
          <span>Trending in Topic</span>
        </div>
        <div className="panel-card-body">
          <p className="panel-card-placeholder">
            Coming soon: See what's trending in this topic space
          </p>
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
// Creator Tab
// ============================================
interface CreatorTabProps {
  topic: TopicSpaceWithPosts;
  podcast: ActionResult | null;
  isGeneratingPodcast: boolean;
  onGeneratePodcast: () => void;
}

function CreatorTab({ topic, podcast, isGeneratingPodcast, onGeneratePodcast }: CreatorTabProps) {
  return (
    <div className="tab-content fade-in">
      {/* Podcast Script Card */}
      <div className="panel-card">
        <div className="panel-card-header">
          <Mic size={16} />
          <span>Grokcast Script</span>
        </div>
        <div className="panel-card-body">
          {podcast ? (
            <div className="podcast-content">
              <div 
                className="podcast-script"
                dangerouslySetInnerHTML={{ __html: formatPodcastScript(podcast.output) }}
              />
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
                {podcast ? 'Regenerate' : 'Generate'} Podcast Script
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thread Writer - Placeholder */}
      <div className="panel-card">
        <div className="panel-card-header">
          <FileText size={16} />
          <span>Thread Writer</span>
        </div>
        <div className="panel-card-body">
          <p className="panel-card-placeholder">
            Coming soon: Generate a Twitter thread summarizing this topic
          </p>
          <button className="panel-action-button" disabled>
            <Wand2 size={14} />
            Generate Thread
          </button>
        </div>
      </div>

      {/* Newsletter - Placeholder */}
      <div className="panel-card">
        <div className="panel-card-header">
          <FileText size={16} />
          <span>Newsletter Draft</span>
        </div>
        <div className="panel-card-body">
          <p className="panel-card-placeholder">
            Coming soon: Create a newsletter section from this topic
          </p>
          <button className="panel-action-button" disabled>
            <Wand2 size={14} />
            Draft Newsletter
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

function formatPodcastScript(output: string): string {
  return output
    .replace(/^# (.+)$/gm, '<h3 class="podcast-title">$1</h3>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}
