'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
  showUpgradeBenefits?: boolean;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialMode = 'login',
  showUpgradeBenefits = false 
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  // Helper function to get Turnstile token
  const getTurnstileTokenSafely = async (): Promise<string | undefined> => {
    try {
      const { getTurnstileToken, waitForTurnstile } = await import('@/lib/turnstile');
      const turnstileReady = await waitForTurnstile(2000); // Wait up to 2 seconds
      
      if (turnstileReady) {
        return await getTurnstileToken() || undefined;
      }
    } catch (error) {
      console.warn('Turnstile not available, proceeding without captcha:', error);
    }
    return undefined;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get Turnstile token for all auth operations
      const captchaToken = await getTurnstileTokenSafely();
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
            captchaToken
          }
        });

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
          setSuccess('Please check your email for verification link!');
          setMode('login');
        } else {
          setSuccess('Account created successfully!');
          onSuccess?.();
        }
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: captchaToken ? { captchaToken } : undefined
        });

        if (error) throw error;

        setSuccess('Logged in successfully!');
        onSuccess?.();
        onClose();
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
          captchaToken
        });

        if (error) throw error;

        setSuccess('Password reset email sent!');
        setMode('login');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      // OAuth providers handle their own security, no captcha needed
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Google authentication failed');
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get Turnstile token for magic link
      const captchaToken = await getTurnstileTokenSafely();
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken
        }
      });

      if (error) throw error;

      setSuccess('Magic link sent to your email!');
      setMode('login');
    } catch (error: any) {
      setError(error.message || 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Upgrade Benefits */}
        {showUpgradeBenefits && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-2">🚀 Upgrade Benefits</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Cross-device game sync</li>
              <li>• Purchase tokens & subscriptions</li>
              <li>• Enhanced undo functionality</li>
              <li>• Priority customer support</li>
              <li>• Progress never lost</li>
            </ul>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600/50 rounded-lg">
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        {/* Google Auth Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full mb-4 p-3 bg-white hover:bg-gray-100 text-gray-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-gray-600"></div>
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-600"></div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 
             mode === 'login' ? 'Sign In' : 
             mode === 'register' ? 'Create Account' : 
             'Send Reset Link'}
          </button>
        </form>

        {/* Magic Link Option */}
        <div className="mt-4">
          <button
            onClick={handleMagicLink}
            disabled={isLoading}
            className="w-full p-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Or send me a magic link (passwordless)
          </button>
        </div>

        {/* Mode Switching */}
        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <>
              <span className="text-gray-400">Don't have an account? </span>
              <button
                onClick={() => setMode('register')}
                className="text-purple-400 hover:text-purple-300"
              >
                Create one
              </button>
              <span className="text-gray-400"> or </span>
              <button
                onClick={() => setMode('forgot')}
                className="text-purple-400 hover:text-purple-300"
              >
                Forgot password?
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              <span className="text-gray-400">Already have an account? </span>
              <button
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-400">Remember your password? </span>
              <button
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
