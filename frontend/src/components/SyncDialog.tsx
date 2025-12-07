// ============================================
// Sync Dialog Component
// Choose between auto-discover and custom topics
// ============================================

import { useState } from 'react';
import { X, Sparkles, Tags, Plus, Trash2 } from 'lucide-react';
import type { TopicType } from '../types';
import './SyncDialog.css';

interface SyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (topicType: TopicType, customTopicNames: string[]) => void;
  isSyncing: boolean;
}

export function SyncDialog({ isOpen, onClose, onSync, isSyncing }: SyncDialogProps) {
  const [topicType, setTopicType] = useState<TopicType>('auto');
  const [customTopics, setCustomTopics] = useState<string[]>(['']);
  const [newTopic, setNewTopic] = useState('');

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (newTopic.trim() && !customTopics.includes(newTopic.trim())) {
      setCustomTopics([...customTopics.filter(t => t), newTopic.trim()]);
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setCustomTopics(customTopics.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTopic();
    }
  };

  const handleSync = () => {
    const topics = customTopics.filter(t => t.trim());
    onSync(topicType, topics);
  };

  const canSync = topicType === 'auto' || customTopics.filter(t => t.trim()).length > 0;

  return (
    <div className="sync-dialog-overlay" onClick={onClose}>
      <div className="sync-dialog" onClick={e => e.stopPropagation()}>
        <div className="sync-dialog-header">
          <h2>Sync Bookmarks</h2>
          <button className="close-button" onClick={onClose} disabled={isSyncing}>
            <X size={20} />
          </button>
        </div>

        <div className="sync-dialog-content">
          <p className="sync-description">
            Choose how you want to organize your bookmarked tweets into topics.
          </p>

          <div className="topic-type-options">
            <label 
              className={`topic-type-option ${topicType === 'auto' ? 'selected' : ''}`}
              onClick={() => !isSyncing && setTopicType('auto')}
            >
              <div className="option-radio">
                <input
                  type="radio"
                  name="topicType"
                  value="auto"
                  checked={topicType === 'auto'}
                  onChange={() => setTopicType('auto')}
                  disabled={isSyncing}
                />
              </div>
              <div className="option-icon">
                <Sparkles size={24} />
              </div>
              <div className="option-content">
                <span className="option-title">Auto-discover topics</span>
                <span className="option-description">
                  Let Grok AI analyze your bookmarks and automatically create relevant topic categories
                </span>
              </div>
            </label>

            <label 
              className={`topic-type-option ${topicType === 'custom' ? 'selected' : ''}`}
              onClick={() => !isSyncing && setTopicType('custom')}
            >
              <div className="option-radio">
                <input
                  type="radio"
                  name="topicType"
                  value="custom"
                  checked={topicType === 'custom'}
                  onChange={() => setTopicType('custom')}
                  disabled={isSyncing}
                />
              </div>
              <div className="option-icon">
                <Tags size={24} />
              </div>
              <div className="option-content">
                <span className="option-title">Custom topics</span>
                <span className="option-description">
                  Define your own topic categories and Grok will sort bookmarks into them
                </span>
              </div>
            </label>
          </div>

          {topicType === 'custom' && (
            <div className="custom-topics-section">
              <h3>Your Topics</h3>
              <div className="custom-topics-input">
                <input
                  type="text"
                  placeholder="Enter a topic name (e.g., AI Research, Startup Tips)"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSyncing}
                />
                <button 
                  className="add-topic-button" 
                  onClick={handleAddTopic}
                  disabled={!newTopic.trim() || isSyncing}
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {customTopics.filter(t => t).length > 0 && (
                <div className="custom-topics-list">
                  {customTopics.filter(t => t).map((topic, index) => (
                    <div key={index} className="custom-topic-tag">
                      <span>{topic}</span>
                      <button 
                        onClick={() => handleRemoveTopic(index)}
                        disabled={isSyncing}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {customTopics.filter(t => t).length === 0 && (
                <p className="custom-topics-hint">
                  Add at least one topic to continue
                </p>
              )}
            </div>
          )}
        </div>

        <div className="sync-dialog-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isSyncing}
          >
            Cancel
          </button>
          <button 
            className="sync-button-primary"
            onClick={handleSync}
            disabled={!canSync || isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Bookmarks'}
          </button>
        </div>
      </div>
    </div>
  );
}
