// Mark a challenge as completed for the current user
import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { elementMatchesCategory } from '@/lib/challenge-elements';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is anonymous - only registered users can complete challenges
    const { data: dbUser } = await supabase.from('users').select('is_anonymous').eq('id', user.id).single();
    if (dbUser?.is_anonymous) {
      return NextResponse.json({ 
        error: 'Anonymous users cannot complete challenges' 
      }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { challengeId, elementDiscovered, gameMode } = body;
    
    if (!challengeId || !elementDiscovered) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Verify the challenge exists and is active
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
    
    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    
    // Check if challenge is still active
    const now = new Date();
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    
    if (now < startDate || now > endDate) {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 });
    }
    
    // Check if user already completed this challenge
    const { data: existingCompletion } = await supabase
      .from('challenge_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .single();
    
    if (existingCompletion) {
      return NextResponse.json({ error: 'Challenge already completed' }, { status: 400 });
    }
    
    // Validate that the discovered element meets the challenge criteria
    let challengeMet = false;
    
    if (challenge.challenge_type === 'daily' && challenge.target_category) {
      // For daily challenges, verify the user actually discovered this element and get server-side tags
      const { data: userElement, error: elementError } = await supabase
        .from('user_elements')
        .select('element_name, tags')
        .eq('user_id', user.id)
        .ilike('element_name', elementDiscovered)
        .single();
      
      if (!elementError && userElement && userElement.tags) {
        // Use server-side tags instead of trusting client
        const serverTags = Array.isArray(userElement.tags) ? userElement.tags : [];
        challengeMet = elementMatchesCategory(serverTags, challenge.target_category);
      }
    } else if (challenge.challenge_type === 'weekly' && challenge.target_element) {
      // For weekly challenges, verify the user actually discovered this element
      const { data: userElement, error: elementError } = await supabase
        .from('user_elements')
        .select('element_name')
        .eq('user_id', user.id)
        .ilike('element_name', elementDiscovered)
        .single();
      
      if (!elementError && userElement) {
        challengeMet = elementDiscovered.toLowerCase() === challenge.target_element.toLowerCase();
      }
    }
    
    if (!challengeMet) {
      return NextResponse.json({ 
        error: 'Element does not meet challenge criteria',
        challengeType: challenge.challenge_type,
        targetCategory: challenge.target_category,
        targetElement: challenge.target_element
      }, { status: 400 });
    }
    
    // Insert completion record
    const { data: completion, error: completionError } = await supabase
      .from('challenge_completions')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        element_discovered: elementDiscovered,
        game_mode: gameMode || 'science',
        completed_at: now.toISOString()
      })
      .select()
      .single();
    
    if (completionError) {
      console.error('Error inserting completion:', completionError);
      return NextResponse.json({ error: 'Failed to mark challenge as completed' }, { status: 500 });
    }
    
    // Award tokens to user if the challenge has a reward
    if (challenge.reward_tokens > 0) {
      const { data: newBalance, error: tokenError } = await supabase
        .rpc('increment_user_tokens', {
          p_user_id: user.id,
          p_amount: challenge.reward_tokens
        });
      
      if (!tokenError) {
        // Return the new token balance so the frontend can update
        return NextResponse.json({ 
          success: true,
          completion,
          tokensAwarded: challenge.reward_tokens,
          newTokenBalance: newBalance
        });
      } else {
        console.error('Error awarding tokens:', tokenError);
        // Still return success for completion, just warn about tokens
        return NextResponse.json({ 
          success: true,
          completion,
          tokensAwarded: 0,
          warning: 'Challenge completed but tokens could not be awarded'
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      completion,
      tokensAwarded: 0
    });
    
  } catch (error) {
    console.error('Error in challenges/complete:', error);
    return NextResponse.json(
      { error: 'Failed to complete challenge' },
      { status: 500 }
    );
  }
}
