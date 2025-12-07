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
  ChatMessage,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // Actions state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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

  // Tweet management state
  const [isAddingTweet, setIsAddingTweet] = useState(false);
  const [isMovingTweet, setIsMovingTweet] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

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
    setChatMessages([]);  // Clear chat history when switching topics
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
        // Load briefing/podcast/thread (not QA - that's now handled by chat)
        setBriefing(actions.find(a => a.actionType === 'briefing') || null);
        setPodcast(actions.find(a => a.actionType === 'podcast') || null);
        setThread(actions.find(a => a.actionType === 'thread') || null);
      }
    } catch (error) {
      console.error('Failed to load action history:', error);
    }
  };

  const handleAskQuestion = async (question: string, chatHistory: ChatMessage[]) => {
    if (!selectedTopic) return;
    
    // Add user message to chat immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    setIsAskingQuestion(true);
    try {
      const response = await topicsApi.askQuestion(selectedTopic.id, question, chatHistory);
      if (response.success && response.data) {
        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          id: response.data.id,
          role: 'assistant',
          content: response.data.output,
          createdAt: response.data.createdAt,
          groundedPostIds: response.data.groundedPostIds,
        };
        setChatMessages(prev => [...prev, assistantMessage]);
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
      // Step 1: Generate script
      const response = await topicsApi.generatePodcast(selectedTopic.id);
      if (response.success && response.data) {
        // Store both the action result and the segmented script
        setPodcast(response.data.actionResult);
        setSegmentedScript(response.data.segmentedScript);
        setPodcastAudio(null);  // Clear old audio when regenerating script
        setHighlightedTweetIds([]);  // Clear highlights
        
        // Step 2: Automatically generate audio
        setIsGeneratingPodcast(false);
        setIsGeneratingPodcastAudio(true);
        
        const audioResponse = await topicsApi.generatePodcastAudio(selectedTopic.id, response.data.segmentedScript);
        if (audioResponse.success && audioResponse.data) {
          setPodcastAudio(audioResponse.data);
          showToast('success', 'Audio Overview ready! Press play to listen.');
        } else if (!audioResponse.success) {
          showToast('error', audioResponse.error || 'Failed to generate podcast audio');
        }
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to generate Audio Overview');
      }
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      showToast('error', 'Failed to generate Audio Overview. Please try again.');
    } finally {
      setIsGeneratingPodcast(false);
      setIsGeneratingPodcastAudio(false);
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

  const handleAddTweet = async (tweetUrl: string) => {
    if (!selectedTopic) return;
    setIsAddingTweet(true);
    try {
      const response = await topicsApi.addTweet(selectedTopic.id, tweetUrl);
      if (response.success && response.data) {
        showToast('success', response.data.message);
        // Refresh the selected topic to get updated posts
        const refreshResponse = await topicsApi.getOne(selectedTopic.id);
        if (refreshResponse.success && refreshResponse.data) {
          setSelectedTopic(refreshResponse.data);
        }
        // Refresh topics list for updated counts
        loadTopics();
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to add tweet');
      }
    } catch (error) {
      console.error('Failed to add tweet:', error);
      showToast('error', 'Failed to add tweet. Please try again.');
    } finally {
      setIsAddingTweet(false);
    }
  };

  const handleMoveTweet = async (postId: string, toTopicId: string) => {
    if (!selectedTopic) return;
    setIsMovingTweet(true);
    try {
      const response = await topicsApi.moveTweet(toTopicId, postId, selectedTopic.id);
      if (response.success && response.data) {
        showToast('success', response.data.message);
        // Refresh the selected topic to get updated posts
        const refreshResponse = await topicsApi.getOne(selectedTopic.id);
        if (refreshResponse.success && refreshResponse.data) {
          setSelectedTopic(refreshResponse.data);
        }
        // Refresh topics list for updated counts
        loadTopics();
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to move tweet');
      }
    } catch (error) {
      console.error('Failed to move tweet:', error);
      showToast('error', 'Failed to move tweet. Please try again.');
    } finally {
      setIsMovingTweet(false);
    }
  };

  const handleCreateTopic = async (title: string) => {
    setIsCreatingTopic(true);
    try {
      const response = await topicsApi.createTopic(title);
      if (response.success && response.data) {
        showToast('success', response.data.message);
        // Refresh topics list
        await loadTopics();
        // Select the newly created topic
        if (response.data.topic) {
          handleSelectTopic(response.data.topic);
        }
      } else if (!response.success) {
        showToast('error', response.error || 'Failed to create topic');
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
      showToast('error', 'Failed to create topic. Please try again.');
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleRefreshTopic = useCallback(() => {
    // Open sync dialog for refresh
    setShowSyncDialog(true);
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
          onCreateTopic={handleCreateTopic}
          isLoading={isLoadingTopics}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCreatingTopic={isCreatingTopic}
        />
        <CenterPanel
          topic={selectedTopic}
          chatMessages={chatMessages}
          onClearChat={() => setChatMessages([])}
          briefing={briefing}
          isLoadingTopic={isLoadingTopic}
          isAskingQuestion={isAskingQuestion}
          isGeneratingBriefing={isGeneratingBriefing}
          onAskQuestion={handleAskQuestion}
          onGenerateBriefing={handleGenerateBriefing}
          highlightedTweetIds={highlightedTweetIds}
          grokcastMode={grokcastMode}
          currentSegment={currentSegment}
          segmentedScript={segmentedScript}
          onExitGrokcast={handleExitGrokcast}
          // Podcast/Grokcast props
          podcastAudio={podcastAudio}
          isGeneratingPodcast={isGeneratingPodcast}
          isGeneratingPodcastAudio={isGeneratingPodcastAudio}
          onGeneratePodcast={handleGeneratePodcast}
          onHighlightTweets={setHighlightedTweetIds}
          onSegmentChange={handleSegmentChange}
          onGrokcastStart={handleGrokcastStart}
          onGrokcastEnd={handleGrokcastEnd}
          // Tweet management props
          allTopics={topics}
          onAddTweet={handleAddTweet}
          onMoveTweet={handleMoveTweet}
          isAddingTweet={isAddingTweet}
          isMovingTweet={isMovingTweet}
        />
        <RightPanel
          topic={selectedTopic}
          highlightedTweetIds={highlightedTweetIds}
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
