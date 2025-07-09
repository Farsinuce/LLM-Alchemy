import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { prompt, gameMode } = await req.json();

    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not configured');
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini Flash for cost-effective generation
    const model = gameMode === 'creative' ? 'google/gemini-2.5-flash' : 'google/gemini-2.5-flash';

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LLM Alchemy Game',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
      }),
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
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure:', data);
      return NextResponse.json(
        { error: 'Invalid response from OpenRouter' },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content;
    
    // Parse the JSON response from the LLM
    let parsedResult;
    try {
      // Extract JSON from the response if it's wrapped in code blocks or other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
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

    // Validate the parsed result
    const validatedResult = {
      result: parsedResult.result || null,
      emoji: parsedResult.emoji || '✨',
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
