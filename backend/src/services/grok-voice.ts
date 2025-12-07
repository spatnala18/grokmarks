// ============================================
// Grok Voice Service - Text to Audio Pipeline
// ============================================
// Converts podcast scripts to audio using XAI's TTS API
// Uses the simple HTTP API: POST https://api.x.ai/v1/audio/speech
// NEW: Supports per-segment TTS with timeline manifest for sync

import fs from 'fs';
import path from 'path';
import { PodcastSegment, SegmentedPodcastScript, TimelineManifest, TimelineEntry, PodcastAudioResult } from '../types';

// Voice options available in the API
// Based on xai-voice-examples: Ara, Rex, Sal, Eve, Una, Leo
export type VoiceId = 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Una' | 'Leo';

// Audio format options
export type AudioFormat = 'mp3' | 'wav' | 'opus' | 'flac' | 'pcm';

// Configuration options
export interface TTSConfig {
  voice: VoiceId;
  responseFormat: AudioFormat;
}

// Default configuration - Ara is clear and neutral for podcasts
const DEFAULT_CONFIG: TTSConfig = {
  voice: 'Ara',         // Female, clear voice good for narration
  responseFormat: 'mp3', // MP3 for browser compatibility
};

// Directory for storing podcast audio files
const PODCASTS_DIR = path.join(process.cwd(), 'podcasts');

// Ensure podcasts directory exists
if (!fs.existsSync(PODCASTS_DIR)) {
  fs.mkdirSync(PODCASTS_DIR, { recursive: true });
}

// XAI TTS API endpoint
const TTS_API_URL = 'https://api.x.ai/v1/audio/speech';

// Maximum characters per API call (conservative limit)
const MAX_CHUNK_SIZE = 3000;

/**
 * Estimate audio duration from text length
 * Average speaking rate is about 150 words per minute
 */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerSecond = 150 / 60; // 2.5 words per second
  return Math.ceil(words / wordsPerSecond);
}

/**
 * Split text into chunks at sentence boundaries
 */
function chunkText(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > maxSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Call TTS API for a single chunk of text
 */
async function generateAudioChunk(
  text: string,
  voice: VoiceId,
  responseFormat: AudioFormat,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(TTS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      voice: voice,
      response_format: responseFormat,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API Error: ${response.status} - ${errorText}`);
  }
  
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Generate podcast audio from a script using XAI TTS HTTP API
 * This is the simple, reliable approach using the standard TTS endpoint
 */
export async function generatePodcastAudio(
  topicSpaceId: string,
  script: string,
  config: Partial<TTSConfig> = {}
): Promise<PodcastAudioResult> {
  // Filter out undefined values from config before merging
  const cleanConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v !== undefined)
  );
  const fullConfig: TTSConfig = { ...DEFAULT_CONFIG, ...cleanConfig };
  const { voice, responseFormat } = fullConfig;
  
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }
  
  console.log(`🎙️ Starting podcast audio generation for topic ${topicSpaceId}`);
  console.log(`   Voice: ${voice}, Format: ${responseFormat}`);
  console.log(`   Script length: ${script.length} characters`);
  
  // Clean up the script - remove markdown formatting, keep plain text
  const cleanScript = script
    .replace(/^#+\s*/gm, '')           // Remove markdown headers
    .replace(/\*\*(.+?)\*\*/g, '$1')   // Remove bold
    .replace(/\*(.+?)\*/g, '$1')       // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/\n{3,}/g, '\n\n')        // Normalize multiple newlines
    .trim();
  
  console.log(`   Cleaned script length: ${cleanScript.length} characters`);
  
  try {
    // Split into chunks if text is too long
    const chunks = cleanScript.length > MAX_CHUNK_SIZE 
      ? chunkText(cleanScript, MAX_CHUNK_SIZE)
      : [cleanScript];
    
    console.log(`   Split into ${chunks.length} chunk(s)`);
    
    const audioBuffers: Buffer[] = [];
    const startTime = Date.now();
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
      
      const audioBuffer = await generateAudioChunk(chunk, voice, responseFormat, apiKey);
      audioBuffers.push(audioBuffer);
      console.log(`   Chunk ${i + 1} complete: ${audioBuffer.length} bytes`);
    }
    
    const elapsedMs = Date.now() - startTime;
    console.log(`   All chunks processed in ${elapsedMs}ms`);
    
    // Concatenate all audio buffers
    // Note: For MP3, simple concatenation works for playback
    const finalAudio = Buffer.concat(audioBuffers);
    console.log(`   Total audio size: ${finalAudio.length} bytes`);
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `podcast_${topicSpaceId}_${timestamp}.${responseFormat}`;
    const filePath = path.join(PODCASTS_DIR, filename);
    
    // Write file
    fs.writeFileSync(filePath, finalAudio);
    console.log(`   Audio saved to ${filePath}`);
    
    // Estimate duration
    const duration = estimateDuration(cleanScript);
    console.log(`   Estimated duration: ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`);
    
    // Return result
    const result: PodcastAudioResult = {
      podcastUrl: `/api/podcasts/${filename}`,
      duration,
      voice,
      createdAt: new Date().toISOString(),
      filePath,
      timeline: {
        totalDuration: duration,
        entries: [],
        generatedAt: new Date().toISOString(),
      },
    };
    
    console.log(`✅ Podcast audio generated successfully`);
    return result;
    
  } catch (error) {
    console.error('❌ Error generating podcast audio:', error);
    throw error;
  }
}

/**
 * Estimate duration from MP3 buffer
 * XAI TTS uses a lower bitrate than typical 128kbps
 * Based on observation: ~280KB for ~70s = ~4KB/s (~32kbps)
 */
function estimateDurationFromBuffer(buffer: Buffer, format: AudioFormat): number {
  if (format === 'mp3') {
    // XAI TTS appears to use ~32kbps = 4KB/s
    return buffer.length / 4000;
  }
  // For other formats, fall back to size-based approximation
  return buffer.length / 5000;
}

/**
 * Clean text for TTS - remove markdown, normalize whitespace
 */
function cleanTextForTTS(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')           // Remove markdown headers
    .replace(/\*\*(.+?)\*\*/g, '$1')   // Remove bold
    .replace(/\*(.+?)\*/g, '$1')       // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/\n{3,}/g, '\n\n')        // Normalize multiple newlines
    .trim();
}

/**
 * Generate podcast audio from SEGMENTED script
 * Processes each segment separately to build an accurate timeline manifest
 */
export async function generateSegmentedPodcastAudio(
  topicSpaceId: string,
  segmentedScript: SegmentedPodcastScript,
  config: Partial<TTSConfig> = {}
): Promise<PodcastAudioResult> {
  // Filter out undefined values from config before merging
  const cleanConfig = Object.fromEntries(
    Object.entries(config).filter(([_, v]) => v !== undefined)
  );
  const fullConfig: TTSConfig = { ...DEFAULT_CONFIG, ...cleanConfig };
  const { voice, responseFormat } = fullConfig;
  
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not configured');
  }
  
  const segments = segmentedScript.segments;
  console.log(`🎙️ Starting SEGMENTED podcast audio generation for topic ${topicSpaceId}`);
  console.log(`   Voice: ${voice}, Format: ${responseFormat}`);
  console.log(`   Segments: ${segments.length}`);
  
  try {
    const audioBuffers: Buffer[] = [];
    const timelineEntries: TimelineEntry[] = [];
    let cumulativeTime = 0;
    const startTime = Date.now();
    
    // Process each segment individually
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const cleanText = cleanTextForTTS(segment.text);
      
      console.log(`   [${i + 1}/${segments.length}] Processing segment "${segment.segmentId}" (${cleanText.length} chars)...`);
      
      // If segment is too long, we need to chunk it (but keep timeline for whole segment)
      let segmentAudio: Buffer;
      
      if (cleanText.length > MAX_CHUNK_SIZE) {
        // Split into chunks but treat as single segment for timeline
        const chunks = chunkText(cleanText, MAX_CHUNK_SIZE);
        const chunkBuffers: Buffer[] = [];
        
        for (let j = 0; j < chunks.length; j++) {
          const chunkBuffer = await generateAudioChunk(chunks[j], voice, responseFormat, apiKey);
          chunkBuffers.push(chunkBuffer);
        }
        
        segmentAudio = Buffer.concat(chunkBuffers);
      } else {
        // Single API call for this segment
        segmentAudio = await generateAudioChunk(cleanText, voice, responseFormat, apiKey);
      }
      
      audioBuffers.push(segmentAudio);
      
      // Calculate duration from actual audio buffer
      const segmentDuration = estimateDurationFromBuffer(segmentAudio, responseFormat);
      
      // Build timeline entry
      const entry: TimelineEntry = {
        segmentId: segment.segmentId,
        startTime: cumulativeTime,
        endTime: cumulativeTime + segmentDuration,
        duration: segmentDuration,
        tweetIds: segment.tweetIds,
        themeTitle: segment.themeTitle,
      };
      timelineEntries.push(entry);
      
      console.log(`   [${i + 1}/${segments.length}] Done: ${segmentAudio.length} bytes, ${segmentDuration.toFixed(2)}s (${cumulativeTime.toFixed(2)}s - ${(cumulativeTime + segmentDuration).toFixed(2)}s)`);
      
      cumulativeTime += segmentDuration;
    }
    
    const elapsedMs = Date.now() - startTime;
    console.log(`   All ${segments.length} segments processed in ${elapsedMs}ms`);
    
    // Concatenate all audio buffers
    const finalAudio = Buffer.concat(audioBuffers);
    console.log(`   Total audio size: ${finalAudio.length} bytes`);
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `podcast_${topicSpaceId}_${timestamp}.${responseFormat}`;
    const filePath = path.join(PODCASTS_DIR, filename);
    
    // Write audio file
    fs.writeFileSync(filePath, finalAudio);
    console.log(`   Audio saved to ${filePath}`);
    
    // Build timeline manifest
    const timeline: TimelineManifest = {
      totalDuration: cumulativeTime,
      entries: timelineEntries,
      generatedAt: new Date().toISOString(),
    };
    
    // Also save timeline manifest as JSON for debugging/inspection
    const manifestFilename = `podcast_${topicSpaceId}_${timestamp}_timeline.json`;
    const manifestPath = path.join(PODCASTS_DIR, manifestFilename);
    fs.writeFileSync(manifestPath, JSON.stringify(timeline, null, 2));
    console.log(`   Timeline manifest saved to ${manifestPath}`);
    
    const durationStr = `${Math.floor(cumulativeTime / 60)}:${String(Math.floor(cumulativeTime % 60)).padStart(2, '0')}`;
    console.log(`   Total duration: ${durationStr}`);
    
    // Return result
    const result: PodcastAudioResult = {
      podcastUrl: `/api/podcasts/${filename}`,
      duration: cumulativeTime,
      voice,
      createdAt: new Date().toISOString(),
      filePath,
      timeline,
    };
    
    console.log(`✅ Segmented podcast audio generated successfully`);
    return result;
    
  } catch (error) {
    console.error('❌ Error generating segmented podcast audio:', error);
    throw error;
  }
}

/**
 * List all generated podcasts
 */
export function listPodcasts(): string[] {
  if (!fs.existsSync(PODCASTS_DIR)) {
    return [];
  }
  return fs.readdirSync(PODCASTS_DIR).filter(f => 
    f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.opus') || f.endsWith('.flac')
  );
}

/**
 * Get podcast file path
 */
export function getPodcastPath(filename: string): string | null {
  const filePath = path.join(PODCASTS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * Delete a podcast file
 */
export function deletePodcast(filename: string): boolean {
  const filePath = path.join(PODCASTS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
