// ============================================
// API Client for Grokmarks Backend
// ============================================

import type {
  ApiResponse,
  AuthStatus,
  TopicSpace,
  TopicSpaceWithPosts,
  SyncResult,
  ActionResult,
  PodcastScriptResponse,
  PodcastAudio,
  SegmentedPodcastScript,
  TopicType,
  LiveTweetsResponse,
  LiveTimeRange,
  ChatMessage,
} from './types';

const API_BASE = 'http://localhost:8000';

// Export for use in components that need the full URL (e.g., audio player)
export const getFullUrl = (path: string) => `${API_BASE}${path}`;

async function fetchApi<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  return res.json();
}

// Auth
export const authApi = {
  getStatus: () => fetchApi<AuthStatus>('GET', '/auth/status'),
  login: () => {
    window.location.href = `${API_BASE}/auth/login`;
  },
  logout: () => fetchApi<void>('POST', '/auth/logout'),
};

// Sync
export interface SyncOptions {
  maxBookmarks?: number;
  classify?: boolean;
  topicType?: TopicType;
  customTopicNames?: string[];
}

export const syncApi = {
  sync: (options: SyncOptions = {}) => {
    const { maxBookmarks = 50, classify = true, topicType = 'auto', customTopicNames = [] } = options;
    return fetchApi<SyncResult>(
      'POST',
      `/api/x/sync?maxBookmarks=${maxBookmarks}&classify=${classify}`,
      { topicType, customTopicNames }
    );
  },
};

// Topics
export const topicsApi = {
  getAll: () =>
    fetchApi<{ count: number; topicSpaces: TopicSpace[] }>('GET', '/api/topics'),
  
  getOne: (id: string) =>
    fetchApi<TopicSpaceWithPosts>('GET', `/api/topics/${id}`),
  
  markSeen: (id: string) =>
    fetchApi<void>('POST', `/api/topics/${id}/mark-seen`),
  
  generateBriefing: (id: string) =>
    fetchApi<ActionResult>('POST', `/api/topics/${id}/briefing`),
  
  generatePodcast: (id: string) =>
    fetchApi<PodcastScriptResponse>('POST', `/api/topics/${id}/podcast`),
  
  generateThread: (id: string) =>
    fetchApi<ActionResult>('POST', `/api/topics/${id}/thread`),
  
  generatePodcastAudio: (id: string, segmentedScript: SegmentedPodcastScript, voice?: string) =>
    fetchApi<PodcastAudio>(
      'POST', 
      `/api/topics/${id}/podcast-audio`, 
      { segmentedScript, voice }
    ),
  
  askQuestion: (id: string, question: string, chatHistory?: ChatMessage[]) =>
    fetchApi<ActionResult>('POST', `/api/topics/${id}/qa`, { question, chatHistory }),
  
  getHistory: (id: string) =>
    fetchApi<{ actions: ActionResult[] }>('GET', `/api/topics/${id}/history`),
  
  // Live tweets - fetch recent tweets related to topic
  getLiveTweets: (id: string, range: LiveTimeRange = '6hr', force: boolean = false) =>
    fetchApi<LiveTweetsResponse>(
      'GET', 
      `/api/topics/${id}/live?range=${range}&force=${force}`
    ),
  
  // Create a new empty topic
  createTopic: (title: string, description?: string) =>
    fetchApi<{ topic: TopicSpace; message: string }>(
      'POST',
      '/api/topics/create',
      { title, description }
    ),
  
  // Add a tweet to a topic by URL
  addTweet: (id: string, tweetUrl: string) =>
    fetchApi<{ post: unknown; topicId: string; message: string }>(
      'POST',
      `/api/topics/${id}/add-tweet`,
      { tweetUrl }
    ),
  
  // Move a tweet from one topic to another
  moveTweet: (toTopicId: string, postId: string, fromTopicId: string) =>
    fetchApi<{ postId: string; fromTopicId: string; toTopicId: string; message: string }>(
      'POST',
      `/api/topics/${toTopicId}/move-tweet`,
      { postId, fromTopicId }
    ),
};
