// Challenge generation endpoint - called by Vercel Cron daily at midnight Copenhagen time
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRandomDailyCategories, getRandomWeeklyElement } from '@/lib/challenge-elements';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    // Check for debug trigger
    const { searchParams } = new URL(request.url);
    const debugSecret = searchParams.get('secret');
    const isDebugRequest = debugSecret === 'my-llm-alchemy-cron-secret-2025-xyz789';
    
    // Verify cron secret to prevent unauthorized calls (skip if debug request)
    if (!isDebugRequest) {
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;
      
      // In development, allow calls without secret
      if (process.env.NODE_ENV === 'production' && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createServerSupabaseClient();
    const now = new Date();
    
    // Get Copenhagen timezone midnight using proper timezone handling
    const copenhagenNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
    const today = new Date(copenhagenNow.getFullYear(), copenhagenNow.getMonth(), copenhagenNow.getDate());
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if daily challenges already exist for today
    const { data: existingDaily } = await supabase
      .from('challenges')
      .select('id')
      .eq('challenge_type', 'daily')
      .gte('start_date', today.toISOString())
      .lt('start_date', tomorrow.toISOString());
    
    // Generate 2 daily challenges if none exist
    if (!existingDaily || existingDaily.length === 0) {
      // Generate challenges for different game modes
      const scienceCategories = getRandomDailyCategories('science', 1);
      const creativeCategories = getRandomDailyCategories('creative', 1);
      const allCategories = [...scienceCategories, ...creativeCategories];
      
      for (const category of allCategories) {
        const gameMode = scienceCategories.includes(category) ? 'science' : 'creative';
        await supabase.from('challenges').insert({
          challenge_type: 'daily',
          title: category.title,
          target_category: category.category,
          game_mode: gameMode,
          reward_tokens: 5,
          start_date: today.toISOString(),
          end_date: tomorrow.toISOString()
        });
      }
      
      console.log(`Generated ${allCategories.length} daily challenges`);
    }
    
    // Generate weekly challenge on Mondays
    const dayOfWeek = today.getUTCDay();
    if (dayOfWeek === 1) { // Monday
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      // Check if weekly challenge already exists
      const { data: existingWeekly } = await supabase
        .from('challenges')
        .select('id')
        .eq('challenge_type', 'weekly')
        .gte('start_date', today.toISOString())
        .lt('start_date', tomorrow.toISOString());
      
      if (!existingWeekly || existingWeekly.length === 0) {
        // Get recent weekly challenges to avoid repeats
        const fourWeeksAgo = new Date(today);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        
        const { data: recentChallenges } = await supabase
          .from('challenges')
          .select('target_element')
          .eq('challenge_type', 'weekly')
          .gte('start_date', fourWeeksAgo.toISOString())
          .not('target_element', 'is', null);
        
        const recentElements = recentChallenges?.map(c => c.target_element).filter(Boolean) || [];
        // Randomly choose game mode for weekly challenge
        const gameMode = Math.random() < 0.5 ? 'science' : 'creative';
        const weeklyElement = getRandomWeeklyElement(gameMode, recentElements);
        
        await supabase.from('challenges').insert({
          challenge_type: 'weekly',
          title: `Discover ${weeklyElement}`,
          target_element: weeklyElement,
          game_mode: gameMode,
          reward_tokens: 25,
          start_date: today.toISOString(),
          end_date: weekEnd.toISOString()
        });
        
        console.log(`Generated weekly challenge: ${weeklyElement}`);
      }
    }
    
    // Mark expired challenges as inactive (optional, for future use)
    // We use end_date for active challenges, but this could be useful for cleanup
    
    return NextResponse.json({ 
      success: true, 
      message: 'Challenges generated successfully',
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('Error generating challenges:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenges' },
      { status: 500 }
    );
  }
}
