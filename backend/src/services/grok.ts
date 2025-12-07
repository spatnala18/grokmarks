import axios, { AxiosError } from 'axios';
import { config } from '../config';

// ============================================
// xAI Grok API Client
// ============================================

const XAI_API_BASE = 'https://api.x.ai/v1';

/**
 * Model selection strategy:
 * - All tasks now use grok-4-1-fast-non-reasoning for speed
 */
export const MODELS = {
  FAST: 'grok-4-1-fast-non-reasoning',      // For classification, per-tweet summaries
  FAST_FALLBACK: 'grok-2',
  STRONG: 'grok-4-1-fast-non-reasoning',    // For briefings, podcast scripts, Q&A (same as fast for speed)
  STRONG_FALLBACK: 'grok-2',
};

/**
 * Chat message format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat completion request options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

/**
 * Chat completion response
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a chat completion request to xAI Grok API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<{ content: string; model: string; usage: ChatCompletionResponse['usage'] }> {
  const model = options.model || MODELS.FAST;
  
  try {
    const response = await axios.post<ChatCompletionResponse>(
      `${XAI_API_BASE}/chat/completions`,
      {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
        ...(options.response_format && { response_format: options.response_format }),
      },
      {
        headers: {
          'Authorization': `Bearer ${config.xai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const choice = response.data.choices[0];
    return {
      content: choice.message.content,
      model: response.data.model,
      usage: response.data.usage,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const status = axiosError.response?.status;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.message;
      
      // Check if model not found - try fallback
      if (status === 404 || errorMessage?.includes('model')) {
        console.warn(`Model ${model} not available, trying fallback...`);
        
        const fallbackModel = model === MODELS.FAST ? MODELS.FAST_FALLBACK : 
                              model === MODELS.STRONG ? MODELS.STRONG_FALLBACK : null;
        
        if (fallbackModel && fallbackModel !== model) {
          return chatCompletion(messages, { ...options, model: fallbackModel });
        }
      }
      
      throw new Error(`Grok API error (${status}): ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Helper for fast model (classification, summaries)
 */
export async function grokFast(
  messages: ChatMessage[],
  options: Omit<ChatCompletionOptions, 'model'> = {}
): Promise<{ content: string; model: string; usage: ChatCompletionResponse['usage'] }> {
  return chatCompletion(messages, { ...options, model: MODELS.FAST });
}

/**
 * Helper for strong model (briefings, podcast, Q&A)
 */
export async function grokStrong(
  messages: ChatMessage[],
  options: Omit<ChatCompletionOptions, 'model'> = {}
): Promise<{ content: string; model: string; usage: ChatCompletionResponse['usage'] }> {
  return chatCompletion(messages, { ...options, model: MODELS.STRONG });
}

/**
 * Parse JSON from Grok response (handles markdown code blocks)
 */
export function parseJsonResponse<T>(content: string): T {
  // Remove markdown code blocks if present
  let cleaned = content.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  return JSON.parse(cleaned) as T;
}
