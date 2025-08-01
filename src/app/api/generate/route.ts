import { NextRequest, NextResponse } from 'next/server';
import { resolveEmoji } from '@/lib/openmoji-service';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { prompt, apiKey, useProModel } = await req.json();

    // Use custom API key if provided, otherwise use server's key
    const activeApiKey = apiKey || OPENROUTER_API_KEY;

    if (!activeApiKey) {
      console.error('No API key available');
      return NextResponse.json(
        { error: 'No API key configured' },
        { status: 500 }
      );
    }

    // Model selection logic:
    // - If custom API key: user can choose between Flash and Pro
    // - If no custom key: Flash for freemium, Pro for paying (with tokens)
    let model;
    let userType;
    let reason;
    
    if (apiKey) {
      // User has their own API key, use their preference
      model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
      userType = 'API Key User';
      reason = `User preference (${useProModel ? 'Pro' : 'Flash'} selected)`;
    } else {
      // Server's API key: Flash for freemium, Pro for paying users
      model = useProModel ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
      userType = useProModel ? 'Token User' : 'Freemium User';
      reason = useProModel ? 'Has tokens (Pro model)' : 'Daily limit user (Flash model)';
    }
    
    // Log model selection for debugging
    console.log(`[LLM-Alchemy API] User Type: ${userType} | Model: ${model} | Reason: ${reason}`);

    // Use standard text format for both models
    const messageContent = prompt;

    // Adjust max_tokens based on model - Pro needs more tokens due to reasoning mode
    const maxTokens = model.includes('gemini-2.5-pro') ? 1500 : 500;
    
    // Build request body with reasoning control for Pro model
    const requestBody: {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens: number;
      top_p: number;
      reasoning?: { effort: string };
    } = {
      model,
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      top_p: 0.9,
    };

    // Add reasoning control for Pro model to reduce costs
    if (model.includes('gemini-2.5-pro')) {
      requestBody.reasoning = {
        effort: 'low' // Uses ~20% of max_tokens for reasoning instead of default 80%
      };
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LLM Alchemy Game',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Enhanced debugging for model comparison
    console.log(`[LLM-Alchemy API] Model used: ${model}`);
    console.log(`[LLM-Alchemy API] OpenRouter response:`, {
      model: data.model,
      usage: data.usage,
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length
    });
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure:', data);
      return NextResponse.json(
        { error: 'Invalid response from OpenRouter' },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content;
    const reasoning = data.choices[0].message.reasoning;
    
    // Log the raw content and reasoning for debugging differences between models
    console.log(`[LLM-Alchemy API] Raw response content for ${model}:`, content);
    if (reasoning) {
      console.log(`[LLM-Alchemy API] Reasoning tokens for ${model}:`, reasoning.substring(0, 200) + '...');
      console.log(`[LLM-Alchemy API] Reasoning length: ${reasoning.length} characters`);
    }
    
    // Parse the JSON response from the LLM
    let parsedResult;
    try {
      // Extract JSON from the response if it's wrapped in code blocks or other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log(`[LLM-Alchemy API] Extracted JSON for ${model}:`, jsonMatch[0]);
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        console.log(`[LLM-Alchemy API] Parsing content directly for ${model}`);
        parsedResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error(`[LLM-Alchemy API] Failed to parse ${model} response:`, content);
      console.error('Parse error:', parseError);
      
      // Fallback to null result
      return NextResponse.json({
        result: null,
        emoji: '❌',
        color: '#808080',
        rarity: 'common',
        reasoning: 'Failed to parse response',
        tags: [],
        isEndElement: false
      });
    }

    // Handle the new multi-outcome format from the LLM
    if (parsedResult.outcomes !== undefined) {
      // New format: {"outcomes": [...]} or {"outcomes": null, "reasoning": "..."}
      if (parsedResult.outcomes === null) {
        // No valid combination found
        return NextResponse.json({
          outcomes: null,
          reasoning: parsedResult.reasoning || 'No reaction'
        });
      } else if (Array.isArray(parsedResult.outcomes)) {
        // Valid outcomes found - validate each outcome and resolve emojis
        const validatedOutcomes = parsedResult.outcomes.map((outcome: {
          result: string;
          emoji: string;
          emojiConfidence?: number;
          color: string;
          rarity: string;
          reasoning: string;
          tags: string[];
          emojiTags?: string[];
          isEndElement: boolean;
        }) => {
          // Extract and clamp confidence
          const raw = outcome.emojiConfidence;
          const confidence = typeof raw === 'number' ? Math.min(Math.max(raw, 0), 1) : 0.5;
          
          // Resolve emoji using OpenMoji service
          const emojiResult = resolveEmoji({
            unicodeEmoji: outcome.emoji || '✨',
            name: outcome.result || 'Unknown',
            tags: outcome.emojiTags || [],
            confidence
          });

          return {
            result: outcome.result || 'Unknown',
            emoji: outcome.emoji || '✨',
            emojiHexcode: emojiResult.hexcode,
            emojiSvgPath: emojiResult.svgPath,
            emojiIsExtra: emojiResult.isExtra,
            color: outcome.color || '#808080',
            rarity: outcome.rarity || 'common',
            reasoning: outcome.reasoning || '',
            tags: Array.isArray(outcome.tags) ? outcome.tags : [],
            emojiTags: Array.isArray(outcome.emojiTags) ? outcome.emojiTags : [],
            isEndElement: outcome.isEndElement || false
          };
        });
        
        return NextResponse.json({
          outcomes: validatedOutcomes
        });
      }
    }
    
    // Fallback for old format or malformed response
    const validatedEmoji = parsedResult.emoji || '✨';
    const validatedResult = {
      result: parsedResult.result || null,
      emoji: validatedEmoji,
      color: parsedResult.color || '#808080',
      rarity: parsedResult.rarity || 'common',
      reasoning: parsedResult.reasoning || '',
      tags: Array.isArray(parsedResult.tags) ? parsedResult.tags : [],
      isEndElement: parsedResult.isEndElement || false
    };

    return NextResponse.json(validatedResult);

  } catch (error) {
    console.error('Generation error:', error);
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error: Unable to connect to OpenRouter' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate combination' },
      { status: 500 }
    );
  }
}
