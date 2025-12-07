// ============================================
// Left Sidebar - Topic Spaces List
// ============================================

import { Folder, Sparkles } from 'lucide-react';
import type { TopicSpace } from '../types';
import './Sidebar.css';

interface SidebarProps {
  topics: TopicSpace[];
  selectedTopicId: string | null;
  onSelectTopic: (topic: TopicSpace) => void;
  isLoading: boolean;
}

export function Sidebar({ topics, selectedTopicId, onSelectTopic, isLoading }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Folder size={18} />
        <span>Topic Spaces</span>
      </div>

      <div className="sidebar-content">
        {isLoading ? (
          <div className="sidebar-loading">
            <div className="spinner" />
            <span>Loading topics…</span>
          </div>
        ) : topics.length === 0 ? (
          <div className="sidebar-empty">
            <Sparkles size={32} className="empty-icon" />
            <p>No Topic Spaces yet</p>
            <p className="text-secondary">Use "Sync from X" to fetch posts</p>
          </div>
        ) : (
          <ul className="topic-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  className={`topic-item ${selectedTopicId === topic.id ? 'selected' : ''}`}
                  onClick={() => onSelectTopic(topic)}
                >
                  <div className="topic-item-main">
                    <span className="topic-title">{topic.title}</span>
                    <span className="topic-count">{topic.postCount} posts</span>
                  </div>
                  {topic.newPostCount > 0 && (
                    <span className="topic-new-badge">+{topic.newPostCount} new</span>
                  )}
                  {topic.title.toLowerCase().includes('long tail') && (
                    <span className="topic-misc-badge">Misc</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
