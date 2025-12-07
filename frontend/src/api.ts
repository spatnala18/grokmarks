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
} from './types';

const API_BASE = 'http://localhost:8000';

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
export const syncApi = {
  sync: (maxBookmarks = 50, maxTimeline = 30, classify = true) =>
    fetchApi<SyncResult>(
      'POST',
      `/api/x/sync?maxBookmarks=${maxBookmarks}&maxTimeline=${maxTimeline}&classify=${classify}`
    ),
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
    fetchApi<ActionResult>('POST', `/api/topics/${id}/podcast`),
  
  askQuestion: (id: string, question: string) =>
    fetchApi<ActionResult>('POST', `/api/topics/${id}/qa`, { question }),
  
  getHistory: (id: string) =>
    fetchApi<{ actions: ActionResult[] }>('GET', `/api/topics/${id}/history`),
};
