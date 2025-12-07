// ============================================
// Trending Extraction Service
// ============================================

import type { Post } from '../types/index.js';

export interface TrendingItem {
  text: string;
  type: 'hashtag' | 'mention' | 'keyword';
  count: number;
  percentage: number;
}

export interface TrendingData {
  hashtags: TrendingItem[];
  mentions: TrendingItem[];
  keywords: TrendingItem[];
  totalPosts: number;
  timeRange: {
    earliest: string;
    latest: string;
  };
}

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your',
  'i', 'me', 'my', 'he', 'him', 'his', 'she', 'her', 'who', 'what', 'when',
  'where', 'why', 'how', 'which', 'there', 'here', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'only', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'also',
  'if', 'then', 'else', 'while', 'because', 'though', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'into', 'out', 'up',
  'down', 'over', 'under', 'again', 'further', 'once', 'like', 'get',
  'got', 'make', 'made', 'know', 'think', 'see', 'want', 'use', 'using',
  'new', 'one', 'two', 'first', 'last', 'long', 'great', 'little', 'own',
  'way', 'even', 'back', 'much', 'well', 'now', 'still', 'going', 'come',
  'https', 'http', 'www', 'com', 'co', 'amp', 'rt'
]);

/**
 * Extract trending items from a collection of posts
 */
export function extractTrending(posts: Post[]): TrendingData {
  if (!posts.length) {
    return {
      hashtags: [],
      mentions: [],
      keywords: [],
      totalPosts: 0,
      timeRange: { earliest: '', latest: '' }
    };
  }

  const hashtagCounts = new Map<string, number>();
  const mentionCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();

  // Sort posts by date to get time range
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const post of posts) {
    const text = post.text;

    // Extract hashtags
    const hashtags = text.match(/#[\w]+/g) || [];
    for (const tag of hashtags) {
      const normalized = tag.toLowerCase();
      hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
    }

    // Extract mentions
    const mentions = text.match(/@[\w]+/g) || [];
    for (const mention of mentions) {
      const normalized = mention.toLowerCase();
      mentionCounts.set(normalized, (mentionCounts.get(normalized) || 0) + 1);
    }

    // Extract keywords (words with 4+ chars, not stop words)
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '')  // Remove URLs
      .replace(/#[\w]+/g, '')           // Remove hashtags
      .replace(/@[\w]+/g, '')           // Remove mentions
      .replace(/[^\w\s]/g, ' ')         // Remove punctuation
      .toLowerCase();
    
    const words = cleanText.split(/\s+/).filter(word => 
      word.length >= 4 && 
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word)  // Not pure numbers
    );

    for (const word of words) {
      keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
    }
  }

  // Convert to sorted arrays
  const totalPosts = posts.length;
  
  const toTrendingItems = (
    counts: Map<string, number>, 
    type: 'hashtag' | 'mention' | 'keyword'
  ): TrendingItem[] => {
    return Array.from(counts.entries())
      .filter(([_, count]) => count >= 2 || totalPosts <= 5)  // At least 2 occurrences (or show all for small sets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([text, count]) => ({
        text,
        type,
        count,
        percentage: Math.round((count / totalPosts) * 100)
      }));
  };

  return {
    hashtags: toTrendingItems(hashtagCounts, 'hashtag'),
    mentions: toTrendingItems(mentionCounts, 'mention'),
    keywords: toTrendingItems(keywordCounts, 'keyword'),
    totalPosts,
    timeRange: {
      earliest: sortedPosts[0]?.createdAt || '',
      latest: sortedPosts[sortedPosts.length - 1]?.createdAt || ''
    }
  };
}
