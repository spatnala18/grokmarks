// ============================================
// Grokmarks - Main App Component
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { LoginPage } from './components/LoginPage';
import { authApi, syncApi, topicsApi } from './api';
import type { 
  User, 
  TopicSpace, 
  TopicSpaceWithPosts, 
  ActionResult 
} from './types';
import './App.css';

function App() {
  // Auth state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Topics state
  const [topics, setTopics] = useState<TopicSpace[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicSpaceWithPosts | null>(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Actions state
  const [qaHistory, setQaHistory] = useState<ActionResult[]>([]);
  const [briefing, setBriefing] = useState<ActionResult | null>(null);
  const [podcast, setPodcast] = useState<ActionResult | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authApi.getStatus();
      if (response.success && response.data?.authenticated && response.data.user) {
        setUser(response.data.user);
        // Load topics after auth
        loadTopics();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = () => {
    authApi.login();
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setTopics([]);
    setSelectedTopic(null);
  };

  const loadTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const response = await topicsApi.getAll();
      if (response.success && response.data) {
        setTopics(response.data.topicSpaces);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await syncApi.sync(50, 30, true);
      if (response.success && response.data) {
        setTopics(response.data.topicSpaces);
        // Refresh selected topic if we have one
        if (selectedTopic) {
          const updated = response.data.topicSpaces.find(t => t.id === selectedTopic.id);
          if (updated) {
            handleSelectTopic(updated);
          }
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectTopic = async (topic: TopicSpace) => {
    setIsLoadingTopic(true);
    // Reset actions state for new topic
    setQaHistory([]);
    setBriefing(null);
    setPodcast(null);

    try {
      const response = await topicsApi.getOne(topic.id);
      if (response.success && response.data) {
        setSelectedTopic(response.data);
        // Mark as seen
        topicsApi.markSeen(topic.id);
        // Load action history
        loadActionHistory(topic.id);
      }
    } catch (error) {
      console.error('Failed to load topic:', error);
    } finally {
      setIsLoadingTopic(false);
    }
  };

  const loadActionHistory = async (topicId: string) => {
    try {
      const response = await topicsApi.getHistory(topicId);
      if (response.success && response.data) {
        const actions = response.data.actions;
        // Separate Q&A from briefing/podcast
        setQaHistory(actions.filter(a => a.actionType === 'qa'));
        setBriefing(actions.find(a => a.actionType === 'briefing') || null);
        setPodcast(actions.find(a => a.actionType === 'podcast') || null);
      }
    } catch (error) {
      console.error('Failed to load action history:', error);
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!selectedTopic) return;
    setIsAskingQuestion(true);
    try {
      const response = await topicsApi.askQuestion(selectedTopic.id, question);
      if (response.success && response.data) {
        setQaHistory(prev => [...prev, response.data!]);
      }
    } catch (error) {
      console.error('Failed to ask question:', error);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleGenerateBriefing = async () => {
    if (!selectedTopic) return;
    setIsGeneratingBriefing(true);
    try {
      const response = await topicsApi.generateBriefing(selectedTopic.id);
      if (response.success && response.data) {
        setBriefing(response.data);
      }
    } catch (error) {
      console.error('Failed to generate briefing:', error);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!selectedTopic) return;
    setIsGeneratingPodcast(true);
    try {
      const response = await topicsApi.generatePodcast(selectedTopic.id);
      if (response.success && response.data) {
        setPodcast(response.data);
      }
    } catch (error) {
      console.error('Failed to generate podcast:', error);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const handleRefreshTopic = useCallback(() => {
    handleSync();
  }, []);

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Loading Grokmarks…</span>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Main app layout
  return (
    <div className="app-layout">
      <TopNav
        user={user}
        isSyncing={isSyncing}
        onSync={handleSync}
        onLogout={handleLogout}
      />
      <div className="app-content">
        <Sidebar
          topics={topics}
          selectedTopicId={selectedTopic?.id || null}
          onSelectTopic={handleSelectTopic}
          isLoading={isLoadingTopics}
        />
        <CenterPanel
          topic={selectedTopic}
          qaHistory={qaHistory}
          isLoadingTopic={isLoadingTopic}
          isAskingQuestion={isAskingQuestion}
          onAskQuestion={handleAskQuestion}
        />
        <RightPanel
          topic={selectedTopic}
          qaHistory={qaHistory}
          briefing={briefing}
          podcast={podcast}
          isGeneratingBriefing={isGeneratingBriefing}
          isGeneratingPodcast={isGeneratingPodcast}
          onGenerateBriefing={handleGenerateBriefing}
          onGeneratePodcast={handleGeneratePodcast}
          onRefreshTopic={handleRefreshTopic}
        />
      </div>
    </div>
  );
}

export default App;
