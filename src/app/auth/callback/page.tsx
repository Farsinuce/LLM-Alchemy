'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Completing authentication...');
        
        // For email auth, we need to exchange the code first
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          // Exchange the code for a session
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setStatus('Authentication failed. Redirecting...');
            setTimeout(() => router.push('/'), 3000);
            return;
          }
        }
        
        // Now get the session (should be available after code exchange)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        if (data.session) {
          // User successfully authenticated
          setStatus('Authentication successful! Redirecting...');
          
          // Check for existing anonymous user data to migrate
          const anonymousUserId = localStorage.getItem('anonymous_user_id');
          
          // Create or update user record in our database
          const userRecord = {
            id: data.session.user.id,
            email: data.session.user.email,
            display_name: data.session.user.user_metadata?.display_name || 
                         data.session.user.user_metadata?.full_name || 
                         data.session.user.email?.split('@')[0],
            avatar_url: data.session.user.user_metadata?.avatar_url,
            google_id: data.session.user.app_metadata?.provider === 'google' ? 
                      data.session.user.user_metadata?.sub : null,
            is_anonymous: false,
            email_verified: data.session.user.email_confirmed_at !== null,
            upgraded_from_anonymous: !!anonymousUserId,
            updated_at: new Date().toISOString()
          };

          const { data: userData, error: userError } = await supabase
            .from('users')
            .upsert(userRecord, {
              onConflict: 'id'
            });

          if (userError) {
            console.error('User creation error:', userError);
          }

          // Migrate anonymous user data if exists
          if (anonymousUserId && anonymousUserId !== data.session.user.id) {
            try {
              // Transfer game states
              await supabase
                .from('game_states')
                .update({ user_id: data.session.user.id })
                .eq('user_id', anonymousUserId);

              // Transfer user sessions
              await supabase
                .from('user_sessions')
                .update({ user_id: data.session.user.id })
                .eq('user_id', anonymousUserId);

              // Mark migration complete
              await supabase
                .from('users')
                .update({ anonymous_data_migrated: true })
                .eq('id', data.session.user.id);

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
            }
          }

          // Redirect to home page
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
