// ============================================
// Grok Actions Service
// ============================================
// Briefing, Podcast Script, and Q&A actions for Topic Spaces

import { v4 as uuidv4 } from 'uuid';
import { grokStrong, parseJsonResponse, ChatMessage } from './grok';
import { HYPERPARAMS } from '../config/hyperparams';
import { Post, ActionResult, ActionType } from '../types';

/**
 * Briefing response from Grok - with inline citations
 */
interface BriefingResponse {
  title: string;
  intro: string;           // Introduction paragraph with [tweetId] citations
  keyPoints: string[];     // Key points with [tweetId] citations inline
  citedTweetIds: string[]; // All tweet IDs that were cited
}

/**
 * Podcast script response from Grok
 */
interface PodcastResponse {
  title: string;
  script: string;
  mentionedHandles: string[];  // @handles mentioned in the script
  relatedTweetIds: string[];   // Tweet IDs for "show notes"
}

/**
 * Q&A response from Grok
 */
interface QAResponse {
  answer: string;          // Answer with [tweetId] citations inline
  citedTweetIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Format posts for inclusion in prompts - includes ID for citation
 */
function formatPostsForPrompt(posts: Post[], maxPosts: number = 20): string {
  const selected = posts.slice(0, maxPosts);
  return selected.map((p, i) => 
    `[Tweet ID: ${p.id}] @${p.authorUsername}:\n"${p.text}"`
  ).join('\n\n---\n\n');
}

/**
 * Get list of valid tweet IDs for grounding check
 */
function getValidTweetIds(posts: Post[]): Set<string> {
  return new Set(posts.map(p => p.id));
}

/**
 * Generate a briefing for a Topic Space - with inline citations
 */
export async function generateBriefing(
  topicTitle: string,
  posts: Post[]
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  const systemPrompt = `You are a senior research analyst creating an insightful briefing from Twitter/X discussions.

YOUR GOAL: Extract the most interesting, specific, and actionable insights from these tweets. Don't be generic - capture what makes these discussions unique and valuable.

WRITING STYLE:
- Be specific: Include names, numbers, paper titles, tool names, concrete claims
- Be opinionated: Highlight what's controversial, surprising, or important
- Be useful: What would a busy professional want to know from skimming this?
- Capture the "hot takes" and unique perspectives
- Quote memorable phrases when they're pithy

CITATION REQUIREMENTS:
- Cite tweets inline using [tweetId] format (the exact Tweet ID provided)
- Place citations at the end of claims: "Reward should live in the agent [1997071224774517003]."
- Multiple citations are fine: "This view is contested [id1] [id2]."
- ONLY use Tweet IDs from the provided list. Never invent IDs.

OUTPUT STRUCTURE:
{
  "title": "Catchy, specific title that captures the theme",
  "intro": "2-3 sentences that hook the reader with the most interesting finding or debate. Include citations.",
  "keyPoints": [
    "Specific insight #1 with details and [citations]",
    "Specific insight #2 - include names, tools, or claims [citations]",
    "Specific insight #3 - what's the controversy or hot take? [citations]",
    "Specific insight #4 - any practical implications? [citations]"
  ],
  "citedTweetIds": ["id1", "id2", ...]
}

BAD EXAMPLE (too generic): "Researchers are discussing AI topics and sharing interesting findings."
GOOD EXAMPLE (specific): "@yoavgo argues reward computation belongs in the agent, not environment—flipping decades of RL orthodoxy [id]. Meanwhile @swyx sees gold in RL fine-tuning open weights for specialized agents [id]."`;

  const userPrompt = `Topic: "${topicTitle}"
Number of tweets: ${posts.length}

Create a briefing from these tweets. Extract SPECIFIC insights, names, claims, and debates:

${postsText}`;

  try {
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<BriefingResponse>(response.content);
    
    // Validate cited IDs are real
    const validCitations = parsed.citedTweetIds.filter(id => validIds.has(id));
    
    // Format the output with citations preserved
    const keyPointsText = parsed.keyPoints.map(p => `• ${p}`).join('\n\n');
    const output = `# ${parsed.title}\n\n${parsed.intro}\n\n## Key Points\n\n${keyPointsText}`;

    return {
      id: uuidv4(),
      topicSpaceId: '', // Will be set by caller
      actionType: 'briefing',
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: validCitations,
    };
  } catch (error) {
    console.error('Error generating briefing:', error);
    throw new Error('Failed to generate briefing');
  }
}

/**
 * Generate a podcast script for a Topic Space - conversational, no inline IDs
 */
export async function generatePodcastScript(
  topicTitle: string,
  posts: Post[]
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  // Collect handles for reference
  const handles = [...new Set(posts.map(p => `@${p.authorUsername}`))];
  
  const systemPrompt = `You are Grok, hosting "Grokcast" - a podcast where you discuss interesting topics from Twitter/X.

STYLE:
- Open with: "Hey everyone, welcome back to Grokcast! Today we're diving into [topic]..."
- Be conversational, engaging, and slightly witty
- Speak naturally as if talking to listeners
- Reference specific people by their @handles when discussing their points
- Add your own perspective and synthesis
- End with a wrap-up and "Until next time!" sign-off

IMPORTANT:
- Do NOT use [tweetId] style citations - this is spoken word
- DO mention @handles naturally in conversation (e.g., "@swyx points out that...")
- Keep it 3-5 minutes when read aloud (~500-800 words)
- Base everything ONLY on the provided tweets

Return JSON:
{
  "title": "Episode title",
  "script": "Full podcast script",
  "mentionedHandles": ["@handle1", "@handle2", ...],
  "relatedTweetIds": ["id1", "id2", ...] // IDs of tweets you discussed (for show notes)
}`;

  const userPrompt = `Topic: "${topicTitle}"
Number of tweets: ${posts.length}
Handles in this topic: ${handles.slice(0, 15).join(', ')}

Tweets to discuss:
${postsText}`;

  try {
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7, // Higher for more creative output
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<PodcastResponse>(response.content);
    
    // Validate related IDs
    const validRelated = parsed.relatedTweetIds.filter(id => validIds.has(id));
    
    const output = `# 🎙️ Grokcast: ${parsed.title}\n\n${parsed.script}`;

    return {
      id: uuidv4(),
      topicSpaceId: '',
      actionType: 'podcast',
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: validRelated,
    };
  } catch (error) {
    console.error('Error generating podcast script:', error);
    throw new Error('Failed to generate podcast script');
  }
}

/**
 * Answer a question about a Topic Space - with inline citations
 */
export async function answerQuestion(
  topicTitle: string,
  posts: Post[],
  question: string
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  const systemPrompt = `You are answering a question based ONLY on the provided tweets. Be specific and substantive.

ANSWER STYLE:
- Be direct and specific - don't hedge unnecessarily
- Include names, claims, and concrete details from the tweets
- If there are different viewpoints, lay them out clearly
- Quote memorable phrases when relevant
- If the tweets don't fully answer the question, say what they DO tell us

CITATION REQUIREMENTS:
- Cite tweets inline using [tweetId] format
- Place citations after claims: "The consensus is X [id1] [id2]."
- ONLY use Tweet IDs from the provided list

OUTPUT:
{
  "answer": "Substantive answer with specific details and [citations]",
  "citedTweetIds": ["id1", "id2", ...],
  "confidence": "high" | "medium" | "low"
}

Confidence guide:
- high: Multiple tweets directly address the question
- medium: Some relevant info but not comprehensive
- low: Tangential mentions only`;

  const userPrompt = `Topic: "${topicTitle}"
Question: "${question}"

Answer based on these tweets:

${postsText}`;

  try {
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<QAResponse>(response.content);
    
    // Validate cited IDs
    const validCitations = parsed.citedTweetIds.filter(id => validIds.has(id));
    
    const confidenceEmoji = parsed.confidence === 'high' ? '🟢' : parsed.confidence === 'medium' ? '🟡' : '🔴';
    const output = `**Q: ${question}**\n\n${parsed.answer}\n\n${confidenceEmoji} Confidence: ${parsed.confidence}`;

    return {
      id: uuidv4(),
      topicSpaceId: '',
      actionType: 'qa',
      input: question,
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: validCitations,
    };
  } catch (error) {
    console.error('Error answering question:', error);
    throw new Error('Failed to answer question');
  }
}
