'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function AuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Completing authentication...');
        
        // Handle both email and OAuth callbacks
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          console.error('OAuth error:', error);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        // Exchange code for session (works for both email and OAuth)
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // For OAuth, this might be expected - continue to session check
            console.warn('Code exchange warning (may be normal for OAuth):', exchangeError);
          }
        }
        
        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (sessionData.session) {
          // User successfully authenticated
          setStatus('Authentication successful! Setting up your account...');
          
          const user = sessionData.session.user;
          const anonymousUserId = localStorage.getItem('anonymous_user_id');
          
          // Create or update user record with all necessary fields
          const userRecord = {
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || 
                         user.user_metadata?.full_name || 
                         user.email?.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            google_id: user.app_metadata?.provider === 'google' ? 
                      user.user_metadata?.sub : null,
            is_anonymous: false,
            email_verified: user.email_confirmed_at !== null,
            upgraded_from_anonymous: !!anonymousUserId,
            anonymous_data_migrated: false, // Will update after migration
            updated_at: new Date().toISOString()
          };

          try {
            const { error: userError } = await supabase
              .from('users')
              .upsert(userRecord, {
                onConflict: 'id'
              });

            if (userError) {
              console.error('User record error:', userError);
              // Continue anyway - this is non-critical for auth flow
            } else {
              console.log('✅ User record created/updated successfully');
            }
          } catch (dbError) {
            console.error('Database error (non-critical):', dbError);
          }

          // Migrate anonymous user data if exists
          if (anonymousUserId && anonymousUserId !== user.id) {
            try {
              setStatus('Migrating your game progress...');
              
              // Transfer game states
              await supabase
                .from('game_states')
                .update({ user_id: user.id })
                .eq('user_id', anonymousUserId);

              // Transfer user sessions
              await supabase
                .from('user_sessions')
                .update({ user_id: user.id })
                .eq('user_id', anonymousUserId);

              // Transfer discovered elements
              await supabase
                .from('discovered_elements')
                .update({ user_id: user.id })
                .eq('user_id', anonymousUserId);

              // Mark migration complete
              await supabase
                .from('users')
                .update({ anonymous_data_migrated: true })
                .eq('id', user.id);

              // Clean up anonymous user record
              await supabase
                .from('users')
                .delete()
                .eq('id', anonymousUserId);

              // Remove from localStorage
              localStorage.removeItem('anonymous_user_id');
              
              console.log('✅ Anonymous user data migrated successfully');
            } catch (migrationError) {
              console.error('Migration error (non-critical):', migrationError);
              // Still mark as attempted
              try {
                await supabase
                  .from('users')
                  .update({ anonymous_data_migrated: true })
                  .eq('id', user.id);
              } catch (updateError) {
                console.error('Failed to mark migration status:', updateError);
              }
            }
          }

          // Redirect to home page
          setStatus('Redirecting to game...');
          setTimeout(() => router.push('/'), 1000);
        } else {
          setStatus('No session found. Redirecting...');
          setTimeout(() => router.push('/'), 3000);
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('An error occurred. Redirecting...');
        setTimeout(() => router.push('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication</h2>
        <p className="text-gray-400">{status}</p>
      </div>
    </div>
  );
}
