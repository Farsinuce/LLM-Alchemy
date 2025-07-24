import { createClient } from '@/lib/supabase-client';

export interface AccountUpgradeResult {
  success: boolean;
  message: string;
  user?: any;
}

export async function upgradeAnonymousAccount(
  anonymousUserId: string,
  newUserData: {
    email: string;
    password: string;
    displayName?: string;
  }
): Promise<AccountUpgradeResult> {
  const supabase = createClient();
  
  try {
    // First, create the new registered account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newUserData.email,
      password: newUserData.password,
      options: {
        data: {
          display_name: newUserData.displayName || newUserData.email.split('@')[0],
        }
      }
    });

    if (signUpError) {
      return { success: false, message: signUpError.message };
    }

    if (!signUpData.user) {
      return { success: false, message: 'Failed to create account' };
    }

    // Wait for the user to be created in our database
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Migrate the anonymous user data to the new account
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('migrate_anonymous_data', {
        p_anonymous_user_id: anonymousUserId,
        p_registered_user_id: signUpData.user.id
      });

    if (migrationError) {
      console.error('Migration error:', migrationError);
      return { 
        success: false, 
        message: 'Account created but data migration failed. Please contact support.' 
      };
    }

    if (!migrationResult) {
      return { 
        success: false, 
        message: 'Failed to migrate your game progress. Please contact support.' 
      };
    }

    return {
      success: true,
      message: 'Account upgraded successfully! Your progress has been saved.',
      user: signUpData.user
    };

  } catch (error: any) {
    console.error('Account upgrade error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred during account upgrade.'
    };
  }
}

export async function upgradeAnonymousAccountWithGoogle(
  anonymousUserId: string
): Promise<AccountUpgradeResult> {
  const supabase = createClient();
  
  try {
    // Store the anonymous user ID in localStorage for later migration
    localStorage.setItem('llm-alchemy-anonymous-user-id', anonymousUserId);
    
    // Initiate Google OAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?upgrade=true`
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    // OAuth redirect will handle the rest
    return { success: true, message: 'Redirecting to Google...' };

  } catch (error: any) {
    console.error('Google upgrade error:', error);
    return {
      success: false,
      message: 'Failed to initiate Google authentication.'
    };
  }
}

export async function checkAndHandleUpgradeCallback(): Promise<boolean> {
  const supabase = createClient();
  const urlParams = new URLSearchParams(window.location.search);
  const isUpgrade = urlParams.get('upgrade') === 'true';
  
  if (!isUpgrade) return false;

  const anonymousUserId = localStorage.getItem('llm-alchemy-anonymous-user-id');
  if (!anonymousUserId) return false;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Failed to get user after OAuth:', error);
      return false;
    }

    // Migrate the anonymous user data
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('migrate_anonymous_data', {
        p_anonymous_user_id: anonymousUserId,
        p_registered_user_id: user.id
      });

    if (migrationError) {
      console.error('Migration error after OAuth:', migrationError);
      return false;
    }

    // Clean up
    localStorage.removeItem('llm-alchemy-anonymous-user-id');
    
    return true;

  } catch (error) {
    console.error('OAuth upgrade callback error:', error);
    return false;
  }
}

export async function getUserAuthStatus(userId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_auth_status', { p_user_id: userId });
    
    if (error) {
      console.error('Error getting auth status:', error);
      return null;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting auth status:', error);
    return null;
  }
}

export function shouldShowUpgradePrompt(
  dailyCount: number,
  dailyLimit: number,
  isAnonymous: boolean
): boolean {
  return isAnonymous && dailyCount >= dailyLimit;
}

export function shouldShowUpgradeButton(
  dailyCount: number,
  dailyLimit: number,
  isAnonymous: boolean
): boolean {
  return isAnonymous && dailyCount >= Math.floor(dailyLimit * 0.8); // Show at 80% of limit
}
