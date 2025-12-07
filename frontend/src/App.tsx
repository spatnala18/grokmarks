// ============================================
// Grokmarks - Main App Component
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { LoginPage } from './components/LoginPage';
import { SyncDialog } from './components/SyncDialog';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { authApi, syncApi, topicsApi } from './api';
import type { 
  User, 
  TopicSpace, 
  TopicSpaceWithPosts, 
  ActionResult,
  PodcastAudio,
  SegmentedPodcastScript,
  TimelineEntry,
  TopicType,
} from './types';
import './App.css';

function AppContent() {
  const { showToast } = useToast();
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
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // Actions state
  const [qaHistory, setQaHistory] = useState<ActionResult[]>([]);
  const [briefing, setBriefing] = useState<ActionResult | null>(null);
  const [podcast, setPodcast] = useState<ActionResult | null>(null);
  const [segmentedScript, setSegmentedScript] = useState<SegmentedPodcastScript | null>(null);
  const [podcastAudio, setPodcastAudio] = useState<PodcastAudio | null>(null);
  const [thread, setThread] = useState<ActionResult | null>(null);
  const [highlightedTweetIds, setHighlightedTweetIds] = useState<string[]>([]);
  const [grokcastMode, setGrokcastMode] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<TimelineEntry | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isGeneratingPodcastAudio, setIsGeneratingPodcastAudio] = useState(false);
  const [isGeneratingThread, setIsGeneratingThread] = useState(false);

  // Memoized callbacks for audio player to prevent infinite loops
  const handleSegmentChange = useCallback((segment: TimelineEntry | null) => {
    setCurrentSegment(segment);
    if (segment) {
      setHighlightedTweetIds(segment.tweetIds);
    }
  }, []);

  const handleGrokcastStart = useCallback(() => {
    setGrokcastMode(true);
  }, []);

  const handleGrokcastEnd = useCallback(() => {
    setGrokcastMode(false);
    setCurrentSegment(null);
    setHighlightedTweetIds([]);
  }, []);

  const handleExitGrokcast = useCallback(() => {
    setGrokcastMode(false);
    setCurrentSegment(null);
    setHighlightedTweetIds([]);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('Checking auth status...');
    try {
      const response = await authApi.getStatus();
      console.log('Auth response:', response);
      if (response.success && response.data?.authenticated && response.data.user) {
        console.log('User authenticated:', response.data.user);
        setUser(response.data.user);
        // Load topics after auth
        loadTopics();
      } else {
        console.log('User not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      showToast('error', 'Failed to check authentication status');
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
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to load topics');
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
      showToast('error', 'Failed to load topics');
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Open sync dialog instead of syncing directly
  const handleOpenSyncDialog = () => {
    setShowSyncDialog(true);
  };

  // Handle actual sync with topic type
  const handleSync = async (topicType: TopicType, customTopicNames: string[]) => {
    setIsSyncing(true);
    try {
      const response = await syncApi.sync({
        maxBookmarks: 50,
        classify: true,
        topicType,
        customTopicNames,
      });
      if (response.success && response.data) {
        setTopics(response.data.topicSpaces);
        showToast('success', `Synced ${response.data.totalPosts || 0} bookmarks into ${response.data.topicSpaces.length} topics`);
        setShowSyncDialog(false);
        // Refresh selected topic if we have one
        if (selectedTopic) {
          const updated = response.data.topicSpaces.find(t => t.id === selectedTopic.id);
          if (updated) {
            handleSelectTopic(updated);
          }
        }
      } else if (!response.success) {
        showToast('error', response.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('error', 'Failed to sync from X. Please try again.');
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
    setSegmentedScript(null);  // Clear segmented script
    setPodcastAudio(null);  // Clear audio when switching topics
    setHighlightedTweetIds([]);  // Clear highlighted tweets
    setGrokcastMode(false);  // Exit grokcast mode
    setCurrentSegment(null);  // Clear current segment
    setThread(null);

    try {
      const response = await topicsApi.getOne(topic.id);
      if (response.success && response.data) {
        setSelectedTopic(response.data);
        // Mark as seen
        topicsApi.markSeen(topic.id);
        // Load action history
        loadActionHistory(topic.id);
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to load topic');
      }
    } catch (error) {
      console.error('Failed to load topic:', error);
      showToast('error', 'Failed to load topic');
    } finally {
      setIsLoadingTopic(false);
    }
  };

  const loadActionHistory = async (topicId: string) => {
    try {
      const response = await topicsApi.getHistory(topicId);
      if (response.success && response.data) {
        const actions = response.data.actions;
        // Separate Q&A from briefing/podcast/thread
        setQaHistory(actions.filter(a => a.actionType === 'qa'));
        setBriefing(actions.find(a => a.actionType === 'briefing') || null);
        setPodcast(actions.find(a => a.actionType === 'podcast') || null);
        setThread(actions.find(a => a.actionType === 'thread') || null);
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
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to get answer');
      }
    } catch (error) {
      console.error('Failed to ask question:', error);
      showToast('error', 'Failed to ask question. Please try again.');
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
        showToast('success', 'Brief generated successfully');
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to generate brief');
      }
    } catch (error) {
      console.error('Failed to generate briefing:', error);
      showToast('error', 'Failed to generate brief. Please try again.');
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
        // Store both the action result and the segmented script
        setPodcast(response.data.actionResult);
        setSegmentedScript(response.data.segmentedScript);
        setPodcastAudio(null);  // Clear old audio when regenerating script
        setHighlightedTweetIds([]);  // Clear highlights
        showToast('success', 'Grokcast generated successfully');
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to generate Grokcast');
      }
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      showToast('error', 'Failed to generate Grokcast. Please try again.');
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const handleGenerateThread = async () => {
    if (!selectedTopic) return;
    setIsGeneratingThread(true);
    try {
      const response = await topicsApi.generateThread(selectedTopic.id);
      if (response.success && response.data) {
        setThread(response.data);
        showToast('success', 'Thread generated successfully');
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to generate thread');
      }
    } catch (error) {
      console.error('Failed to generate thread:', error);
      showToast('error', 'Failed to generate thread. Please try again.');
    } finally {
      setIsGeneratingThread(false);
    }
  };

  const handleGeneratePodcastAudio = async () => {
    if (!selectedTopic) return;
    
    // Need a segmented script first
    if (!segmentedScript) {
      showToast('warning', 'Generate a podcast script first before creating audio');
      return;
    }
    
    setIsGeneratingPodcastAudio(true);
    try {
      const response = await topicsApi.generatePodcastAudio(selectedTopic.id, segmentedScript);
      if (response.success && response.data) {
        setPodcastAudio(response.data);
        showToast('success', 'Podcast audio generated successfully');
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to generate podcast audio');
      }
    } catch (error) {
      console.error('Failed to generate podcast audio:', error);
      showToast('error', 'Failed to generate podcast audio. Please try again.');
    } finally {
      setIsGeneratingPodcastAudio(false);
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
        onSync={handleOpenSyncDialog}
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
          highlightedTweetIds={highlightedTweetIds}
          grokcastMode={grokcastMode}
          currentSegment={currentSegment}
          segmentedScript={segmentedScript}
          onExitGrokcast={handleExitGrokcast}
        />
        <RightPanel
          topic={selectedTopic}
          qaHistory={qaHistory}
          briefing={briefing}
          podcast={podcast}
          podcastAudio={podcastAudio}
          thread={thread}
          isGeneratingBriefing={isGeneratingBriefing}
          isGeneratingPodcast={isGeneratingPodcast}
          isGeneratingPodcastAudio={isGeneratingPodcastAudio}
          isGeneratingThread={isGeneratingThread}
          isAskingQuestion={isAskingQuestion}
          onGenerateBriefing={handleGenerateBriefing}
          onGeneratePodcast={handleGeneratePodcast}
          onGeneratePodcastAudio={handleGeneratePodcastAudio}
          onGenerateThread={handleGenerateThread}
          onRefreshTopic={handleRefreshTopic}
          onAskQuestion={handleAskQuestion}
          onHighlightTweets={setHighlightedTweetIds}
          onSegmentChange={handleSegmentChange}
          onGrokcastStart={handleGrokcastStart}
          onGrokcastEnd={handleGrokcastEnd}
        />
      </div>
      
      {/* Sync Dialog */}
      <SyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
    </div>
  );
}

// Wrap AppContent with ToastProvider
function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
