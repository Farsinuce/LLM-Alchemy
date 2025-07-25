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

/**
 * Get Turnstile token for automated flows (like anonymous user creation)
 * This creates a temporary widget, executes it, and returns the token
 * 
 * Note: For form submissions, use initTurnstile() instead
 */
export async function getTurnstileToken(): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  if (!siteKey || !isTurnstileReady()) {
    return null;
  }

  return new Promise((resolve) => {
    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          document.body.removeChild(container);
        } catch {}
      }
    };

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    try {
      window.turnstile!.render(container, {
        sitekey: siteKey,
        execution: 'render', // Auto-execute on render for automated flows
        appearance: 'interaction-only',
        theme: 'dark',
        callback: (token: string) => {
          clearTimeout(timeout);
          cleanup();
          resolve(token);
        },
        'error-callback': () => {
          clearTimeout(timeout);
          cleanup();
          resolve(null);
        }
      });
    } catch {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    }
  });
}
