// ============================================
// Left Sidebar - Topic Spaces List
// ============================================

import { useState } from 'react';
import { Layers, Sparkles, Hash, ChevronRight, PanelLeftClose, PanelLeft, Plus, X } from 'lucide-react';
import type { TopicSpace } from '../types';
import './Sidebar.css';

// Generate a consistent color for a topic based on its title
function getTopicColor(title: string): string {
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#F59E0B', // amber
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#EF4444', // red
    '#6366F1', // indigo
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface SidebarProps {
  topics: TopicSpace[];
  selectedTopicId: string | null;
  onSelectTopic: (topic: TopicSpace) => void;
  onCreateTopic: (title: string) => Promise<void>;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isCreatingTopic?: boolean;
}

export function Sidebar({ 
  topics, 
  selectedTopicId, 
  onSelectTopic, 
  onCreateTopic,
  isLoading, 
  isCollapsed, 
  onToggleCollapse,
  isCreatingTopic = false,
}: SidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const handleCreateTopic = async () => {
    if (newTopicName.trim()) {
      await onCreateTopic(newTopicName.trim());
      setNewTopicName('');
      setShowCreateModal(false);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <>
            <div className="sidebar-header-icon">
              <Layers size={16} />
            </div>
            <span>Topics</span>
            <span className="topic-count-badge">{topics.length}</span>
          </>
        )}
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="sidebar-content">
          {/* Create Topic Button */}
          <button 
            className="create-topic-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>New Topic</span>
          </button>

        {isLoading ? (
          <div className="sidebar-loading">
            <div className="spinner" />
            <span>Loading topics…</span>
          </div>
        ) : topics.length === 0 ? (
          <div className="sidebar-empty">
            <Sparkles size={32} className="empty-icon" />
            <p>No Topic Spaces yet</p>
            <p className="text-secondary">Click "Modify Topics" to get started</p>
          </div>
        ) : (
          <ul className="topic-list">
            {topics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;
              const isMisc = topic.title.toLowerCase().includes('long tail');
              const color = getTopicColor(topic.title);
              
              return (
                <li key={topic.id}>
                  <button
                    className={`topic-item ${isSelected ? 'selected' : ''} ${isMisc ? 'misc' : ''}`}
                    onClick={() => onSelectTopic(topic)}
                  >
                    <div 
                      className="topic-color-bar" 
                      style={{ backgroundColor: color }}
                    />
                    <div className="topic-content">
                      <div className="topic-main">
                        <Hash size={14} className="topic-icon" style={{ color }} />
                        <span className="topic-title">{topic.title}</span>
                      </div>
                      <div className="topic-meta">
                        <span className="topic-post-count">{topic.postCount}</span>
                        {topic.newPostCount > 0 && (
                          <span className="topic-new-badge">+{topic.newPostCount}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="topic-arrow" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      )}

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal create-topic-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Topic</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-content">
              <label htmlFor="topic-name">Topic Name</label>
              <input
                id="topic-name"
                type="text"
                placeholder="e.g., Machine Learning, Web Dev..."
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTopic()}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateTopic}
                disabled={!newTopicName.trim() || isCreatingTopic}
              >
                {isCreatingTopic ? (
                  <>
                    <div className="spinner-small" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Topic
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
