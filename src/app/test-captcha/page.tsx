'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getTurnstileToken, getTurnstileTokenWithStatus, createVisibleTurnstile, executeTurnstile, isTurnstileReady } from '@/lib/turnstile';

export default function TestCaptchaPage() {
  const [testResults, setTestResults] = useState<{
    invisible?: { success: boolean; message: string; token?: string };
    visible?: { success: boolean; message: string; token?: string };
    serverVerify?: { success: boolean; message: string };
  }>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [visibleWidgetId, setVisibleWidgetId] = useState<string | null>(null);

  useEffect(() => {
    // Check if Turnstile is loaded
    const checkInterval = setInterval(() => {
      if (isTurnstileReady()) {
        setTurnstileLoaded(true);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  const testInvisibleCaptcha = async () => {
    setIsLoading('invisible');
    setTestResults(prev => ({ ...prev, invisible: undefined }));

    try {
      const result = await getTurnstileTokenWithStatus();
      
      if (result.success && result.token) {
        setTestResults(prev => ({
          ...prev,
          invisible: {
            success: true,
            message: 'Invisible captcha successful!',
            token: result.token!.substring(0, 20) + '...'
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          invisible: {
            success: false,
            message: result.message || 'Failed to get token'
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        invisible: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setIsLoading(null);
    }
  };

  const testVisibleCaptcha = async () => {
    if (visibleWidgetId) {
      // Execute existing widget
      executeTurnstile('visible-turnstile');
    } else {
      // Create new widget
      setIsLoading('visible');
      setTestResults(prev => ({ ...prev, visible: undefined }));

      const widgetId = await createVisibleTurnstile(
        'visible-turnstile',
        (token) => {
          setTestResults(prev => ({
            ...prev,
            visible: {
              success: true,
              message: 'Visible captcha successful!',
              token: token.substring(0, 20) + '...'
            }
          }));
          setIsLoading(null);
        },
        () => {
          setTestResults(prev => ({
            ...prev,
            visible: {
              success: false,
              message: 'Visible captcha failed or expired'
            }
          }));
          setIsLoading(null);
        }
      );

      if (widgetId) {
        setVisibleWidgetId(widgetId);
      } else {
        setTestResults(prev => ({
          ...prev,
          visible: {
            success: false,
            message: 'Failed to create visible widget'
          }
        }));
        setIsLoading(null);
      }
    }
  };

  const testServerVerification = async () => {
    setIsLoading('server');
    setTestResults(prev => ({ ...prev, serverVerify: undefined }));

    try {
      // First get a token
      const token = await getTurnstileToken();
      
      if (!token) {
        setTestResults(prev => ({
          ...prev,
          serverVerify: {
            success: false,
            message: 'Failed to get token for verification'
          }
        }));
        return;
      }

      // Then verify it server-side
      const response = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        serverVerify: {
          success: result.success,
          message: result.success 
            ? 'Server verification successful!' 
            : `Server verification failed: ${result.error}`
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        serverVerify: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setIsLoading(null);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
          <ArrowLeft size={20} />
          Back to Game
        </Link>

        <h1 className="text-heading mb-2">Turnstile Captcha Test Page</h1>
        <p className="text-body text-gray-400 mb-8">
          Test different Turnstile captcha modes to debug mobile issues
        </p>

        {/* Turnstile Status */}
        <div className="card mb-8">
          <h2 className="text-subheading mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Turnstile Status
          </h2>
          <div className="flex items-center gap-3">
            {turnstileLoaded ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-500">Turnstile loaded and ready</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
                <span className="text-gray-400">Loading Turnstile...</span>
              </>
            )}
          </div>
          <div className="mt-4 text-caption text-gray-500">
            Site Key: {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'Configured ✓' : 'Not configured ✗'}
          </div>
        </div>

        {/* Test Sections */}
        <div className="space-y-6">
          {/* Invisible/Interaction-Only Test */}
          <div className="card">
            <h3 className="text-subheading mb-2">Invisible / Interaction-Only Mode</h3>
            <p className="text-caption text-gray-400 mb-4">
              Tests the invisible captcha that only shows UI when interaction is needed
            </p>
            <button
              onClick={testInvisibleCaptcha}
              disabled={!turnstileLoaded || isLoading === 'invisible'}
              className="btn btn-primary"
            >
              {isLoading === 'invisible' ? 'Testing...' : 'Test Invisible Captcha'}
            </button>
            {testResults.invisible && (
              <div className={`mt-4 p-3 rounded-lg ${testResults.invisible.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2">
                  {testResults.invisible.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResults.invisible.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.invisible.message}
                  </span>
                </div>
                {testResults.invisible.token && (
                  <div className="text-caption text-gray-400 mt-1">
                    Token: {testResults.invisible.token}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visible Test */}
          <div className="card">
            <h3 className="text-subheading mb-2">Visible Mode</h3>
            <p className="text-caption text-gray-400 mb-4">
              Tests the visible captcha widget (fallback for when invisible fails)
            </p>
            <div id="visible-turnstile" className="mb-4"></div>
            <button
              onClick={testVisibleCaptcha}
              disabled={!turnstileLoaded || isLoading === 'visible'}
              className="btn btn-primary"
            >
              {isLoading === 'visible' ? 'Creating Widget...' : 
               visibleWidgetId ? 'Execute Visible Captcha' : 'Create Visible Widget'}
            </button>
            {testResults.visible && (
              <div className={`mt-4 p-3 rounded-lg ${testResults.visible.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2">
                  {testResults.visible.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResults.visible.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.visible.message}
                  </span>
                </div>
                {testResults.visible.token && (
                  <div className="text-caption text-gray-400 mt-1">
                    Token: {testResults.visible.token}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Server Verification Test */}
          <div className="card">
            <h3 className="text-subheading mb-2">Server-Side Verification</h3>
            <p className="text-caption text-gray-400 mb-4">
              Tests getting a token and verifying it server-side
            </p>
            <button
              onClick={testServerVerification}
              disabled={!turnstileLoaded || isLoading === 'server'}
              className="btn btn-primary"
            >
              {isLoading === 'server' ? 'Verifying...' : 'Test Server Verification'}
            </button>
            {testResults.serverVerify && (
              <div className={`mt-4 p-3 rounded-lg ${testResults.serverVerify.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2">
                  {testResults.serverVerify.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResults.serverVerify.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.serverVerify.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={refreshPage}
            className="btn btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-12 card bg-gray-900/50">
          <h3 className="text-subheading mb-4">Debug Information</h3>
          <div className="space-y-2 text-caption font-mono">
            <div>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</div>
            <div>Screen: {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</div>
            <div>Viewport: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
