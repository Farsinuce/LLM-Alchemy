// Simple Turnstile implementation for LLM Alchemy
// This handles invisible Turnstile captcha for anonymous user creation

declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        size?: 'normal' | 'invisible';
        theme?: 'light' | 'dark';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Generate an invisible Turnstile token
 * This creates a temporary invisible widget, gets the token, then removes it
 */
export async function getTurnstileToken(): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  if (!siteKey) {
    console.warn('Turnstile site key not found');
    return null;
  }

  if (typeof window === 'undefined' || !window.turnstile) {
    console.warn('Turnstile not loaded');
    return null;
  }

  return new Promise((resolve) => {
    try {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);

      // Render invisible widget
      const widgetId = window.turnstile!.render(container, {
        sitekey: siteKey,
        size: 'invisible',
        callback: (token: string) => {
          // Clean up
          try {
            window.turnstile!.remove(widgetId);
            document.body.removeChild(container);
          } catch (e) {
            console.warn('Error cleaning up Turnstile widget:', e);
          }
          resolve(token);
        },
        'error-callback': () => {
          // Clean up on error
          try {
            document.body.removeChild(container);
          } catch (e) {
            console.warn('Error cleaning up Turnstile widget:', e);
          }
          resolve(null);
        }
      });

    } catch (error) {
      console.error('Turnstile error:', error);
      resolve(null);
    }
  });
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
