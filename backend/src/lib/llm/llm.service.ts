// LLM service for intelligent sub-niche extraction using LangChain

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { z } from 'zod';

// Schema for extracted sub-niches
const SubNicheSchema = z.object({
  label: z.string().describe('The sub-niche name'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  reasoning: z.string().describe('Why this is a valid sub-niche'),
});

const SubNichesResponseSchema = z.object({
  subNiches: z.array(SubNicheSchema).describe('List of extracted sub-niches'),
});

export type SubNiche = z.infer<typeof SubNicheSchema>;
export type SubNichesResponse = z.infer<typeof SubNichesResponseSchema>;

export interface LLMService {
  extractSubNichesFromSubreddit(
    subredditName: string, 
    subredditDescription: string, 
    parentNiche: string,
    maxSubNiches?: number
  ): Promise<SubNiche[]>;
  
  extractTopicsFromPosts(
    posts: Array<{ title: string; content: string; score: number }>,
    parentSubNiche: string,
    originalNiche: string,
    maxTopics?: number
  ): Promise<SubNiche[]>;
  
  isAvailable(): boolean;
}

export class OpenAILLMService implements LLMService {
  private llm: ChatOpenAI | null = null;
  private subredditAnalysisChain: LLMChain | null = null;
  private topicExtractionChain: LLMChain | null = null;

  constructor(private apiKey?: string) {
    if (apiKey) {
      this.initializeChains();
    }
  }

  private initializeChains(): void {
    if (!this.apiKey) return;

    this.llm = new ChatOpenAI({
      openAIApiKey: this.apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3, // Lower temperature for more consistent results
      maxTokens: 1000,
    });

    // Chain for analyzing subreddit and extracting sub-niches
    const subredditAnalysisPrompt = PromptTemplate.fromTemplate(`
You are an expert market researcher analyzing Reddit communities to identify sub-niches.

PARENT NICHE: {parentNiche}
SUBREDDIT: r/{subredditName}
DESCRIPTION: {subredditDescription}

Based on this subreddit's focus and description, identify 3-5 specific sub-niches that would be relevant to the parent niche "{parentNiche}".

Requirements:
- Sub-niches should be specific, actionable market segments
- Each should represent a distinct opportunity or problem area
- Focus on business/product opportunities, not just general topics
- Avoid generic terms, be specific and descriptive

For each sub-niche, provide:
1. A clear, specific name (2-4 words)
2. Confidence score (0.0-1.0) based on market potential and specificity
3. Brief reasoning why this is a valid sub-niche

Respond in JSON format:
{{
  "subNiches": [
    {{
      "label": "specific sub-niche name",
      "confidence": 0.8,
      "reasoning": "why this represents a valid market opportunity"
    }}
  ]
}}
`);

    // Chain for extracting topics from Reddit posts
    const topicExtractionPrompt = PromptTemplate.fromTemplate(`
You are an expert at analyzing social media discussions to identify trending sub-topics and business micro-niches.

ORIGINAL NICHE CONTEXT: {originalNiche}
PARENT SUB-NICHE: {parentSubNiche}
REDDIT POSTS FROM COMMUNITY:
{posts}

IMPORTANT: Analyze these Reddit posts to identify 2-4 specific sub-topics that are BOTH:
1. Related to the original niche "{originalNiche}"
2. Specialized areas within "{parentSubNiche}"

The goal is to find the intersection between "{originalNiche}" and "{parentSubNiche}" - NOT general topics about "{parentSubNiche}".

Example: If originalNiche="AI" and parentSubNiche="C Programming", find topics like:
- "AI algorithms in C"
- "Machine learning with C libraries" 
- "Neural networks in C"
NOT general C programming topics like "C syntax" or "C debugging"

Requirements:
- MUST maintain connection to the original niche "{originalNiche}"
- Focus on specialized applications of "{parentSubNiche}" within "{originalNiche}"
- Look for discussions that bridge both concepts
- Identify specific tools, methods, or applications that combine both areas
- Each sub-topic should represent a viable micro-niche at the intersection

For each sub-topic, provide:
1. A clear, specific name (3-5 words) that shows the connection to both the original niche and parent sub-niche
2. Confidence score (0.0-1.0) based on frequency, engagement, and relevance to BOTH contexts
3. Brief reasoning explaining how this bridges the original niche and parent sub-niche

Respond in JSON format:
{{
  "subNiches": [
    {{
      "label": "specific micro-niche name",
      "confidence": 0.7,
      "reasoning": "based on post analysis and why this is a distinct sub-segment"
    }}
  ]
}}
`);

    this.subredditAnalysisChain = new LLMChain({
      llm: this.llm,
      prompt: subredditAnalysisPrompt,
    });

    this.topicExtractionChain = new LLMChain({
      llm: this.llm,
      prompt: topicExtractionPrompt,
    });
  }

  isAvailable(): boolean {
    return !!this.apiKey && !!this.llm;
  }

  async extractSubNichesFromSubreddit(
    subredditName: string,
    subredditDescription: string,
    parentNiche: string,
    maxSubNiches: number = 5
  ): Promise<SubNiche[]> {
    if (!this.subredditAnalysisChain) {
      throw new Error('LLM service not available - missing OpenAI API key');
    }

    try {
      const result = await this.subredditAnalysisChain.call({
        parentNiche,
        subredditName,
        subredditDescription: subredditDescription || `Discussion community for ${subredditName}`,
      });

      const parsed = this.parseJsonResponse(result.text);
      
      // Validate the parsed result
      try {
        const validated = SubNichesResponseSchema.parse(parsed);
        return validated.subNiches
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxSubNiches);
      } catch (validationError) {
        console.warn(`Schema validation failed for r/${subredditName}:`, validationError);
        // If validation fails but we have some data, try to use it
        if (parsed && parsed.subNiches && Array.isArray(parsed.subNiches)) {
          return parsed.subNiches
            .filter((item: any) => item && item.label)
            .map((item: any) => ({
              label: item.label,
              confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
              reasoning: item.reasoning || 'Generated by LLM'
            }))
            .slice(0, maxSubNiches);
        }
        throw validationError;
      }

    } catch (error) {
      console.warn(`LLM extraction failed for r/${subredditName}:`, error instanceof Error ? error.message : error);
      // Fallback to simple extraction
      return this.fallbackSubNicheExtraction(subredditName, parentNiche);
    }
  }

  async extractTopicsFromPosts(
    posts: Array<{ title: string; content: string; score: number }>,
    parentSubNiche: string,
    originalNiche: string,
    maxTopics: number = 4
  ): Promise<SubNiche[]> {
    if (!this.topicExtractionChain) {
      throw new Error('LLM service not available - missing OpenAI API key');
    }

    if (posts.length === 0) {
      return [];
    }

    try {
      // Format posts for analysis
      const formattedPosts = posts
        .slice(0, 10) // Limit to top 10 posts to stay within token limits
        .map((post, index) => 
          `${index + 1}. [${post.score} upvotes] ${post.title}\n${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}`
        )
        .join('\n\n');

      const result = await this.topicExtractionChain.call({
        parentSubNiche,
        originalNiche,
        posts: formattedPosts,
      });

      const parsed = this.parseJsonResponse(result.text);
      
      // Validate the parsed result
      try {
        const validated = SubNichesResponseSchema.parse(parsed);
        return validated.subNiches
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxTopics);
      } catch (validationError) {
        console.warn(`Topic schema validation failed for ${parentSubNiche}:`, validationError);
        // If validation fails but we have some data, try to use it
        if (parsed && parsed.subNiches && Array.isArray(parsed.subNiches)) {
          return parsed.subNiches
            .filter((item: any) => item && item.label)
            .map((item: any) => ({
              label: item.label,
              confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
              reasoning: item.reasoning || 'Generated by LLM'
            }))
            .slice(0, maxTopics);
        }
        throw validationError;
      }

    } catch (error) {
      console.warn(`LLM topic extraction failed for ${parentSubNiche}:`, error);
      // Fallback to simple keyword extraction
      return this.fallbackTopicExtraction(posts, maxTopics);
    }
  }

  private parseJsonResponse(text: string): any {
    // Clean up the response text and extract JSON
    const cleanText = text.trim();
    
    console.log('LLM Raw Response:', cleanText.substring(0, 200) + '...');
    
    // Try multiple parsing strategies
    const strategies = [
      // Strategy 1: Find JSON object in response
      () => {
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON object found');
      },
      
      // Strategy 2: Try parsing entire response
      () => JSON.parse(cleanText),
      
      // Strategy 3: Look for JSON between code blocks
      () => {
        const codeBlockMatch = cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1]);
        }
        throw new Error('No JSON in code blocks');
      },
      
      // Strategy 4: Extract JSON after cleaning common issues
      () => {
        const cleaned = cleanText
          .replace(/```json\s*/, '')
          .replace(/```\s*$/, '')
          .replace(/^[^{]*/, '')
          .replace(/[^}]*$/, '');
        return JSON.parse(cleaned);
      }
    ];
    
    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]();
        console.log(`JSON parsing succeeded with strategy ${i + 1}`);
        return result;
      } catch (error) {
        console.warn(`JSON parsing strategy ${i + 1} failed:`, error instanceof Error ? error.message : error);
      }
    }
    
    // All strategies failed - return fallback structure
    console.error('All JSON parsing strategies failed, using fallback');
    return {
      subNiches: [
        {
          label: 'Generated Topic',
          confidence: 0.4,
          reasoning: 'LLM response could not be parsed, using fallback'
        }
      ]
    };
  }

  private fallbackSubNicheExtraction(subredditName: string, _parentNiche: string): SubNiche[] {
    // Simple fallback when LLM fails
    const cleanName = subredditName.replace(/[_-]/g, ' ').toLowerCase();
    return [{
      label: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      confidence: 0.5,
      reasoning: `Fallback extraction from r/${subredditName}`,
    }];
  }

  private fallbackTopicExtraction(
    posts: Array<{ title: string; content: string; score: number }>,
    maxTopics: number
  ): SubNiche[] {
    // Simple keyword frequency analysis as fallback
    const wordCounts = new Map<string, number>();
    
    posts.forEach(post => {
      const words = post.title.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['with', 'from', 'that', 'this'].includes(word));
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTopics)
      .map(([word, count]) => ({
        label: word.charAt(0).toUpperCase() + word.slice(1),
        confidence: Math.min(0.7, count / posts.length),
        reasoning: `Mentioned ${count} times in posts`,
      }));
  }
}

// Fallback service when no LLM is available
export class FallbackLLMService implements LLMService {
  isAvailable(): boolean {
    return true; // Always available as fallback
  }

  async extractSubNichesFromSubreddit(
    subredditName: string,
    _subredditDescription: string,
    _parentNiche: string,
    maxSubNiches: number = 5
  ): Promise<SubNiche[]> {
    // Simple name-based extraction
    const cleanName = subredditName.replace(/[_-]/g, ' ').toLowerCase();
    return [{
      label: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      confidence: 0.6,
      reasoning: `Extracted from subreddit name r/${subredditName}`,
    }].slice(0, maxSubNiches);
  }

  async extractTopicsFromPosts(
    posts: Array<{ title: string; content: string; score: number }>,
    _parentSubNiche: string,
    _originalNiche: string,
    maxTopics: number = 4
  ): Promise<SubNiche[]> {
    // Simple keyword extraction
    const wordCounts = new Map<string, number>();
    
    posts.forEach(post => {
      const words = post.title.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['with', 'from', 'that', 'this', 'have', 'been'].includes(word));
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTopics)
      .map(([word, count]) => ({
        label: word.charAt(0).toUpperCase() + word.slice(1),
        confidence: Math.min(0.6, count / posts.length),
        reasoning: `Appeared ${count} times in post titles`,
      }));
  }
}
