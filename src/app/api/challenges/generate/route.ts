// Challenge generation endpoint - called by Vercel Cron daily at midnight Copenhagen time
import { createServiceRoleClient } from '@/lib/supabase';
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

    const supabase = await createServiceRoleClient();
    const now = new Date();
    
    // Get Copenhagen timezone midnight using proper timezone handling
    const copenhagenNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
    const today = new Date(copenhagenNow.getFullYear(), copenhagenNow.getMonth(), copenhagenNow.getDate());
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // DELETE ALL active daily challenges (not just ones starting today)
    await supabase
      .from('challenges')
      .delete()
      .eq('challenge_type', 'daily')
      .gte('end_date', today.toISOString()); // Delete all daily challenges that haven't ended yet
    
    // Generate exactly 2 new daily challenges
    const scienceCategories = getRandomDailyCategories('science', 1);
    const creativeCategories = getRandomDailyCategories('creative', 1);
    const allCategories = [...scienceCategories, ...creativeCategories];
    
    for (const category of allCategories) {
      const gameMode = scienceCategories.includes(category) ? 'science' : 'creative';
      const { data, error } = await supabase.from('challenges').insert({
        challenge_type: 'daily',
        title: category.title,
        target_category: category.category,
        game_mode: gameMode,
        reward_tokens: 5,
        start_date: today.toISOString(),
        end_date: tomorrow.toISOString()
      }).select();
      
      if (error) {
        console.error('Failed to insert daily challenge:', error);
        throw new Error(`Failed to insert daily challenge: ${error.message}`);
      }
      
      console.log('Successfully inserted daily challenge:', data);
    }
    
    console.log(`Deleted all active daily challenges and generated ${allCategories.length} new ones`);
    
    // Generate weekly challenge on Mondays (or every day for manual testing)
    const dayOfWeek = today.getUTCDay();
    if (dayOfWeek === 1 || isDebugRequest) { // Monday or manual debug request
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      // DELETE ALL active weekly challenges (not just check if one exists)
      await supabase
        .from('challenges')
        .delete()
        .eq('challenge_type', 'weekly')
        .gte('end_date', today.toISOString()); // Delete all weekly challenges that haven't ended yet
      
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
      
      const { data: weeklyData, error: weeklyError } = await supabase.from('challenges').insert({
        challenge_type: 'weekly',
        title: `Discover ${weeklyElement}`,
        target_element: weeklyElement,
        game_mode: gameMode,
        reward_tokens: 25,
        start_date: today.toISOString(),
        end_date: weekEnd.toISOString()
      }).select();
      
      if (weeklyError) {
        console.error('Failed to insert weekly challenge:', weeklyError);
        throw new Error(`Failed to insert weekly challenge: ${weeklyError.message}`);
      }
      
      console.log('Successfully inserted weekly challenge:', weeklyData);
      console.log(`Deleted all active weekly challenges and generated new one: ${weeklyElement}`);
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
