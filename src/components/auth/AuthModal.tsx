'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { getTurnstileToken } from '@/lib/turnstile';

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
  const [awaitingCaptcha, setAwaitingCaptcha] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  // Pre-warm Turnstile widget when modal opens
  useEffect(() => {
    if (isOpen) {
      import('@/lib/turnstile').then(m => m.waitForTurnstile());
    }
  }, [isOpen]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAwaitingCaptcha(true);
    setError('');
    setSuccess('');

    try {
      // Get Turnstile token first (will wait as long as needed)
      const captchaToken = await getTurnstileToken()
        .finally(() => setAwaitingCaptcha(false));

      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
            ...(captchaToken && { captchaToken })
          }
        });

        if (error) throw error;

        setSuccess('Please check your email for verification link!');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken && { options: { captchaToken } })
        });

        if (error) throw error;

        setSuccess('Logged in successfully!');
        onSuccess?.();
        onClose();
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
          ...(captchaToken && { captchaToken })
        });

        if (error) throw error;

        setSuccess('Password reset email sent!');
        setMode('login');
      }
    } catch (error) {
      // Provide clearer error messages for common issues
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      if (errorMessage.includes('captcha')) {
        setError('Security verification failed - please refresh and try again');
      } else if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else {
        setError(errorMessage);
      }
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google authentication failed';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setAwaitingCaptcha(true);
    setError('');

    try {
      // Get Turnstile token first (will wait as long as needed)
      const captchaToken = await getTurnstileToken()
        .finally(() => setAwaitingCaptcha(false));

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          ...(captchaToken && { captchaToken })
        }
      });

      if (error) throw error;

      setSuccess('Magic link sent to your email!');
      setMode('login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      
      if (errorMessage.includes('captcha')) {
        setError('Security verification failed - please refresh and try again');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-heading">
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upgrade Benefits */}
        {showUpgradeBenefits && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg border border-primary/30">
            <h3 className="text-subheading mb-2">🚀 Upgrade Benefits</h3>
            <ul className="text-caption space-y-1">
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
          <div className="mb-4 p-3 status-error rounded-lg">
            <p className="text-caption">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 status-online rounded-lg">
            <p className="text-caption">{success}</p>
          </div>
        )}

        {/* Google Auth Button */}
        <button
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="btn btn-surface w-full mb-4 bg-white hover:bg-gray-100 text-gray-800 flex items-center justify-center gap-2 disabled:opacity-50"
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
            <label className="text-caption font-medium mb-2 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input pl-10"
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-caption font-medium mb-2 block">
                Display Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="input pl-10"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="text-caption font-medium mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
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
            disabled={isLoading || awaitingCaptcha}
            className="btn btn-primary w-full"
          >
            {awaitingCaptcha ? 'Verifying security...' : 
             isLoading ? 'Loading...' : (
              mode === 'login' ? 'Sign In' : 
              mode === 'register' ? 'Create Account' : 
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Magic Link Option */}
        <div className="mt-4">
          <button
            onClick={handleMagicLink}
            disabled={isLoading || awaitingCaptcha}
            className="btn btn-ghost w-full text-primary hover:text-primary-hover"
          >
            Or send me a magic link (passwordless)
          </button>
        </div>

        {/* Mode Switching */}
        <div className="mt-6 text-center text-caption">
          {mode === 'login' ? (
            <>
              <span className="text-muted">Don&apos;t have an account? </span>
              <button
                onClick={() => setMode('register')}
                className="text-primary hover:text-primary-hover"
              >
                Create one
              </button>
              <span className="text-muted"> or </span>
              <button
                onClick={() => setMode('forgot')}
                className="text-primary hover:text-primary-hover"
              >
                Forgot password?
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              <span className="text-muted">Already have an account? </span>
              <button
                onClick={() => setMode('login')}
                className="text-primary hover:text-primary-hover"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <span className="text-muted">Remember your password? </span>
              <button
                onClick={() => setMode('login')}
                className="text-primary hover:text-primary-hover"
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
