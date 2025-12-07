import axios, { AxiosError } from 'axios';
import { Post, PostSource } from '../types';

// ============================================
// X API v2 Client
// ============================================

const X_API_BASE = 'https://api.x.com/2';

// Default fields to request
const TWEET_FIELDS = 'id,text,author_id,created_at';
const USER_FIELDS = 'id,name,username,profile_image_url';
const EXPANSIONS = 'author_id';

/**
 * X API Error response structure
 */
interface XApiError {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
}

/**
 * Rate limit info from response headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

/**
 * Extract rate limit info from response headers
 */
function extractRateLimitInfo(headers: Record<string, any>): RateLimitInfo | undefined {
  const limit = headers['x-rate-limit-limit'];
  const remaining = headers['x-rate-limit-remaining'];
  const reset = headers['x-rate-limit-reset'];

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
  }
  return undefined;
}

/**
 * X API Tweet object (from API response)
 */
interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
}

/**
 * X API User object (from API response)
 */
interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

/**
 * X API response with tweets
 */
interface XTweetsResponse {
  data?: XTweet[];
  includes?: {
    users?: XUser[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
  errors?: XApiError[];
}

/**
 * Result from fetching tweets
 */
export interface FetchTweetsResult {
  posts: Post[];
  nextToken?: string;
  rateLimitInfo?: RateLimitInfo;
}

/**
 * Convert X API tweet to our Post type
 */
function convertToPost(
  tweet: XTweet,
  users: Map<string, XUser>,
  source: PostSource
): Post {
  const author = users.get(tweet.author_id);
  
  return {
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    authorUsername: author?.username || 'unknown',
    authorDisplayName: author?.name || 'Unknown',
    authorProfileImageUrl: author?.profile_image_url,
    createdAt: tweet.created_at || new Date().toISOString(),
    url: `https://x.com/${author?.username || 'i'}/status/${tweet.id}`,
    source,
  };
}

/**
 * Build a map of user ID -> user object for quick lookup
 */
function buildUserMap(users?: XUser[]): Map<string, XUser> {
  const map = new Map<string, XUser>();
  if (users) {
    for (const user of users) {
      map.set(user.id, user);
    }
  }
  return map;
}

/**
 * Handle X API errors
 */
function handleXApiError(error: AxiosError): never {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;
    
    if (status === 429) {
      const resetTime = error.response.headers['x-rate-limit-reset'];
      const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000) : null;
      throw new Error(
        `Rate limited by X API. ${resetDate ? `Resets at ${resetDate.toLocaleTimeString()}` : ''}`
      );
    }
    
    if (status === 401) {
      throw new Error('X API authentication failed. Please re-login.');
    }
    
    if (status === 403) {
      throw new Error('X API access forbidden. Check your app permissions.');
    }
    
    const errorMessage = data?.detail || data?.error || data?.title || 'Unknown error';
    throw new Error(`X API error (${status}): ${errorMessage}`);
  }
  
  throw new Error(`X API request failed: ${error.message}`);
}

// ============================================
// API Methods
// ============================================

/**
 * Fetch user's bookmarks
 * 
 * @param userId - X user ID
 * @param accessToken - OAuth 2.0 access token
 * @param paginationToken - Optional pagination token for next page
 * @param maxResults - Max results per request (1-100, default 100)
 */
export async function getBookmarks(
  userId: string,
  accessToken: string,
  paginationToken?: string,
  maxResults: number = 100
): Promise<FetchTweetsResult> {
  try {
    const params: Record<string, string> = {
      'tweet.fields': TWEET_FIELDS,
      'user.fields': USER_FIELDS,
      'expansions': EXPANSIONS,
      'max_results': Math.min(maxResults, 100).toString(),
    };

    if (paginationToken) {
      params['pagination_token'] = paginationToken;
    }

    const response = await axios.get<XTweetsResponse>(
      `${X_API_BASE}/users/${userId}/bookmarks`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params,
      }
    );

    const data = response.data;
    const userMap = buildUserMap(data.includes?.users);
    
    const posts: Post[] = (data.data || []).map(tweet => 
      convertToPost(tweet, userMap, 'bookmark')
    );

    return {
      posts,
      nextToken: data.meta?.next_token,
      rateLimitInfo: extractRateLimitInfo(response.headers),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleXApiError(error);
    }
    throw error;
  }
}

/**
 * Fetch user's home timeline (reverse chronological)
 * 
 * @param userId - X user ID
 * @param accessToken - OAuth 2.0 access token
 * @param sinceId - Only return tweets after this ID
 * @param paginationToken - Optional pagination token for next page
 * @param maxResults - Max results per request (1-100, default 100)
 */
export async function getHomeTimeline(
  userId: string,
  accessToken: string,
  sinceId?: string,
  paginationToken?: string,
  maxResults: number = 100
): Promise<FetchTweetsResult> {
  try {
    const params: Record<string, string> = {
      'tweet.fields': TWEET_FIELDS,
      'user.fields': USER_FIELDS,
      'expansions': EXPANSIONS,
      'max_results': Math.min(maxResults, 100).toString(),
    };

    if (sinceId) {
      params['since_id'] = sinceId;
    }

    if (paginationToken) {
      params['pagination_token'] = paginationToken;
    }

    const response = await axios.get<XTweetsResponse>(
      `${X_API_BASE}/users/${userId}/timelines/reverse_chronological`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params,
      }
    );

    const data = response.data;
    const userMap = buildUserMap(data.includes?.users);
    
    const posts: Post[] = (data.data || []).map(tweet => 
      convertToPost(tweet, userMap, 'timeline')
    );

    return {
      posts,
      nextToken: data.meta?.next_token,
      rateLimitInfo: extractRateLimitInfo(response.headers),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleXApiError(error);
    }
    throw error;
  }
}

/**
 * Fetch all bookmarks with pagination (up to maxTotal)
 * 
 * @param userId - X user ID
 * @param accessToken - OAuth 2.0 access token
 * @param maxTotal - Maximum total bookmarks to fetch (default 200)
 */
export async function getAllBookmarks(
  userId: string,
  accessToken: string,
  maxTotal: number = 200
): Promise<{ posts: Post[]; rateLimitInfo?: RateLimitInfo }> {
  const allPosts: Post[] = [];
  let nextToken: string | undefined;
  let rateLimitInfo: RateLimitInfo | undefined;

  while (allPosts.length < maxTotal) {
    const remaining = maxTotal - allPosts.length;
    const result = await getBookmarks(
      userId,
      accessToken,
      nextToken,
      Math.min(remaining, 100)
    );

    allPosts.push(...result.posts);
    rateLimitInfo = result.rateLimitInfo;
    nextToken = result.nextToken;

    // No more pages
    if (!nextToken || result.posts.length === 0) {
      break;
    }

    // Check rate limit - if low, stop early
    if (rateLimitInfo && rateLimitInfo.remaining < 2) {
      console.warn('Rate limit nearly exhausted, stopping bookmark fetch');
      break;
    }
  }

  return { posts: allPosts, rateLimitInfo };
}

/**
 * Fetch home timeline posts with pagination (up to maxTotal)
 * 
 * @param userId - X user ID
 * @param accessToken - OAuth 2.0 access token
 * @param sinceId - Only return tweets after this ID
 * @param maxTotal - Maximum total posts to fetch (default 100)
 */
export async function getTimelinePosts(
  userId: string,
  accessToken: string,
  sinceId?: string,
  maxTotal: number = 100
): Promise<{ posts: Post[]; newestId?: string; rateLimitInfo?: RateLimitInfo }> {
  const allPosts: Post[] = [];
  let nextToken: string | undefined;
  let rateLimitInfo: RateLimitInfo | undefined;
  let newestId: string | undefined;

  while (allPosts.length < maxTotal) {
    const remaining = maxTotal - allPosts.length;
    const result = await getHomeTimeline(
      userId,
      accessToken,
      sinceId,
      nextToken,
      Math.min(remaining, 100)
    );

    // Track the newest ID from first page
    if (!newestId && result.posts.length > 0) {
      newestId = result.posts[0].id;
    }

    allPosts.push(...result.posts);
    rateLimitInfo = result.rateLimitInfo;
    nextToken = result.nextToken;

    // No more pages
    if (!nextToken || result.posts.length === 0) {
      break;
    }

    // Check rate limit - if low, stop early
    if (rateLimitInfo && rateLimitInfo.remaining < 2) {
      console.warn('Rate limit nearly exhausted, stopping timeline fetch');
      break;
    }
  }

  return { posts: allPosts, newestId, rateLimitInfo };
}
