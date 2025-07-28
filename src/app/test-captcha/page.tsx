'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { initTurnstile, executeTurnstile, isTurnstileReady, getTurnstileToken } from '@/lib/turnstile';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function TestCaptchaPage() {
  const [testResults, setTestResults] = useState<{
    automated?: { success: boolean; message: string; token?: string };
    explicitExecute?: { success: boolean; message: string; token?: string };
    serverVerify?: { success: boolean; message: string };
  }>({});
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  
  const explicitWidgetRef = useRef<HTMLDivElement>(null);
  const explicitResetRef = useRef<(() => void) | null>(null);

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

  // Initialize explicit widget when component mounts
  useEffect(() => {
    if (turnstileLoaded && explicitWidgetRef.current && !explicitResetRef.current) {
      initTurnstile(explicitWidgetRef.current, (token) => {
        if (token) {
          setTestResults(prev => ({
            ...prev,
            explicitExecute: {
              success: true,
              message: 'Explicit+Execute captcha successful!',
              token: token.substring(0, 20) + '...'
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            explicitExecute: {
              success: false,
              message: 'Captcha verification failed'
            }
          }));
        }
        setIsLoading(null);
      }).then((resetFn) => {
        explicitResetRef.current = resetFn;
      });
    }
  }, [turnstileLoaded]);

  const testAutomatedFlow = async () => {
    setIsLoading('automated');
    setTestResults(prev => ({ ...prev, automated: undefined }));

    try {
      const token = await getTurnstileToken();
      
      if (token) {
        setTestResults(prev => ({
          ...prev,
          automated: {
            success: true,
            message: 'Automated flow successful!',
            token: token.substring(0, 20) + '...'
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          automated: {
            success: false,
            message: 'Failed to get token (timeout or error)'
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        automated: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setIsLoading(null);
    }
  };

  const testExplicitExecute = () => {
    setIsLoading('explicitExecute');
    setTestResults(prev => ({ ...prev, explicitExecute: undefined }));
    
    if (explicitWidgetRef.current) {
      executeTurnstile(explicitWidgetRef.current);
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
          {/* Automated Flow Test (for anonymous user creation) */}
          <div className="card">
            <h3 className="text-subheading mb-2">Automated Flow (Anonymous User)</h3>
            <p className="text-caption text-gray-400 mb-4">
              Tests the automated captcha flow used for anonymous user creation.
              Widget appears in bottom-right corner if interaction is needed.
            </p>
            <button
              onClick={testAutomatedFlow}
              disabled={!turnstileLoaded || isLoading === 'automated'}
              className="btn btn-primary"
            >
              {isLoading === 'automated' ? 'Testing...' : 'Test Automated Flow'}
            </button>
            {testResults.automated && (
              <div className={`mt-4 p-3 rounded-lg ${testResults.automated.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2">
                  {testResults.automated.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResults.automated.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.automated.message}
                  </span>
                </div>
                {testResults.automated.token && (
                  <div className="text-caption text-gray-400 mt-1">
                    Token: {testResults.automated.token}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Explicit + Execute Test (for forms) */}
          <div className="card">
            <h3 className="text-subheading mb-2">Explicit + Execute Pattern (Forms)</h3>
            <p className="text-caption text-gray-400 mb-4">
              Tests the recommended pattern for forms. Widget is rendered here, 
              executed on button click. If interaction is needed, it appears inline.
            </p>
            <div ref={explicitWidgetRef} className="mb-4"></div>
            <button
              onClick={testExplicitExecute}
              disabled={!turnstileLoaded || isLoading === 'explicitExecute'}
              className="btn btn-primary"
            >
              {isLoading === 'explicitExecute' ? 'Executing...' : 'Execute Captcha'}
            </button>
            {testResults.explicitExecute && (
              <div className={`mt-4 p-3 rounded-lg ${testResults.explicitExecute.success ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="flex items-center gap-2">
                  {testResults.explicitExecute.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResults.explicitExecute.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.explicitExecute.message}
                  </span>
                </div>
                {testResults.explicitExecute.token && (
                  <div className="text-caption text-gray-400 mt-1">
                    Token: {testResults.explicitExecute.token}
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
