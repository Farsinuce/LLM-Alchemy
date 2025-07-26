import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all completed challenges for the user
    const { data: completedChallenges, error } = await supabase
      .from('challenge_completions')
      .select(`
        id,
        challenge_id,
        element_discovered,
        game_mode,
        completed_at,
        tokens_awarded,
        challenges (
          challenge_type,
          title,
          target_element,
          target_category,
          reward_tokens,
          start_date,
          end_date
        )
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed challenges:', error);
      return NextResponse.json({ error: 'Failed to fetch completed challenges' }, { status: 500 });
    }

    return NextResponse.json({ 
      completedChallenges: completedChallenges || []
    });
    
  } catch (error) {
    console.error('Error in completed challenges API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
