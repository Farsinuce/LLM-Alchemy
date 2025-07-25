// Get current active challenges with user completion status
import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is anonymous - only registered users can access challenges
    const { data: dbUser } = await supabase.from('users').select('is_anonymous').eq('id', user.id).single();
    if (dbUser?.is_anonymous) {
      return NextResponse.json({ 
        challenges: [],
        message: 'Register to access challenges' 
      }, { status: 403 });
    }

    const now = new Date();
    
    // Get active challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('*')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .order('challenge_type', { ascending: true })
      .order('start_date', { ascending: false });
    
    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }
    
    // Get user's completions for active challenges
    const challengeIds = challenges?.map(c => c.id) || [];
    const { data: completions } = await supabase
      .from('challenge_completions')
      .select('*')
      .eq('user_id', user.id)
      .in('challenge_id', challengeIds);
    
    // Merge completion status with challenges
    const challengesWithStatus = challenges?.map(challenge => ({
      ...challenge,
      isCompleted: completions?.some(c => c.challenge_id === challenge.id) || false,
      completionDetails: completions?.find(c => c.challenge_id === challenge.id) || null
    })) || [];
    
    return NextResponse.json({ 
      challenges: challengesWithStatus,
      userId: user.id
    });
    
  } catch (error) {
    console.error('Error in challenges/current:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
