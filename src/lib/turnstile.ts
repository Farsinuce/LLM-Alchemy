// Clean, minimal Turnstile implementation using explicit+execute pattern
// Works reliably on both desktop and mobile without hidden containers or timeouts

declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        size?: 'normal' | 'compact' | 'flexible';
        theme?: 'light' | 'dark';
        appearance?: 'always' | 'execute' | 'interaction-only';
        execution?: 'render' | 'execute';
      }) => string;
      execute: (element: string | HTMLElement | string) => void;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Initialize Turnstile widget using explicit+execute pattern
 * This is the recommended approach that works on all devices
 * 
 * @param element - The HTML element to render the widget into
 * @param onToken - Callback when token is received (or null on error)
 * @returns Cleanup function to reset the widget
 */
export async function initTurnstile(
  element: HTMLElement,
  onToken: (token: string | null) => void
): Promise<(() => void) | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  if (!siteKey) {
    console.warn('Turnstile site key not found');
    onToken(null);
    return null;
  }

  // Wait for Turnstile to load
  const loaded = await waitForTurnstile();
  if (!loaded) {
    console.warn('Turnstile failed to load');
    onToken(null);
    return null;
  }

  try {
    const widgetId = window.turnstile!.render(element, {
      sitekey: siteKey,
      execution: 'execute', // Explicit render, manual execute
      appearance: 'interaction-only', // Invisible until interaction needed
      theme: 'dark',
      callback: (token: string) => {
        onToken(token);
      },
      'error-callback': () => {
        console.error('Turnstile error');
        onToken(null);
      },
      'expired-callback': () => {
        console.warn('Turnstile token expired');
        onToken(null);
      }
    });

    // Return cleanup function
    return () => {
      try {
        window.turnstile?.reset(widgetId);
      } catch (e) {
        console.warn('Error resetting Turnstile:', e);
      }
    };
  } catch (error) {
    console.error('Error initializing Turnstile:', error);
    onToken(null);
    return null;
  }
}

/**
 * Execute Turnstile challenge on a rendered widget
 * Call this when user submits the form
 */
export function executeTurnstile(element: HTMLElement | string): void {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      window.turnstile.execute(element);
    } catch (error) {
      console.error('Error executing Turnstile:', error);
    }
  }
}

/**
 * Check if Turnstile is loaded and ready
 */
export function isTurnstileReady(): boolean {
  return typeof window !== 'undefined' && !!window.turnstile;
}

/**
 * Wait for Turnstile to load
 */
export function waitForTurnstile(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTurnstileReady()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isTurnstileReady()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Simple server verification helper
 * @param token - The Turnstile token to verify
 * @returns true if verification succeeded
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Singleton widget for automated flows
let automatedWidgetId: string | null = null;
let automatedWidgetContainer: HTMLElement | null = null;
let pendingResolve: ((value: string | null) => void) | null = null;

/**
 * Get Turnstile token for automated flows (like anonymous user creation)
 * Uses a singleton widget pattern to avoid conflicts
 * 
 * Note: For form submissions, use initTurnstile() instead
 */
export async function getTurnstileToken(): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  if (!siteKey || !isTurnstileReady()) {
    return null;
  }

  // Create container if it doesn't exist
  if (!automatedWidgetContainer) {
    automatedWidgetContainer = document.createElement('div');
    automatedWidgetContainer.id = 'turnstile-automated';
    automatedWidgetContainer.style.position = 'fixed';
    automatedWidgetContainer.style.bottom = '20px';
    automatedWidgetContainer.style.right = '20px';
    automatedWidgetContainer.style.zIndex = '9999';
    document.body.appendChild(automatedWidgetContainer);
  }

  return new Promise((resolve) => {
    pendingResolve = resolve;

    // Timeout after 8 seconds
    const timeout = setTimeout(() => {
      pendingResolve = null;
      resolve(null);
    }, 8000);

    try {
      if (!automatedWidgetId && automatedWidgetContainer) {
        // First time - create widget
        automatedWidgetId = window.turnstile!.render(automatedWidgetContainer, {
          sitekey: siteKey,
          execution: 'execute', // Use explicit mode for better control
          appearance: 'interaction-only',
          theme: 'dark',
          callback: (token: string) => {
            clearTimeout(timeout);
            if (pendingResolve) {
              pendingResolve(token);
              pendingResolve = null;
            }
          },
          'error-callback': () => {
            clearTimeout(timeout);
            if (pendingResolve) {
              pendingResolve(null);
              pendingResolve = null;
            }
          }
        });
      } else if (automatedWidgetId) {
        // Reset existing widget for fresh token
        window.turnstile!.reset(automatedWidgetId);
      }

      // Wait for next frame to ensure widget is ready
      requestAnimationFrame(() => {
        if (automatedWidgetId && window.turnstile) {
          window.turnstile.execute(automatedWidgetId);
        }
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Cleanup automated widget (call on page unload or route change)
 */
export function cleanupAutomatedWidget(): void {
  if (automatedWidgetId && window.turnstile) {
    try {
      window.turnstile.remove(automatedWidgetId);
    } catch {}
    automatedWidgetId = null;
  }
  
  if (automatedWidgetContainer) {
    try {
      document.body.removeChild(automatedWidgetContainer);
    } catch {}
    automatedWidgetContainer = null;
  }
  
  pendingResolve = null;
}
