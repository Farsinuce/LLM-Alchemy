// Simple Turnstile implementation for LLM Alchemy
// This handles invisible Turnstile captcha for anonymous user creation

declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        size?: 'normal' | 'compact' | 'flexible';
        theme?: 'light' | 'dark';
        appearance?: 'always' | 'execute' | 'interaction-only';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Generate a Turnstile token using interaction-only appearance
 * Behaves like invisible mode - only shows UI when interaction is needed
 * Includes timeout fallback to prevent indefinite hanging
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
    let resolved = false;
    
    // 5 second timeout for invisible mode (needs more time than managed)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('Turnstile timeout - proceeding without token');
        resolve(null);
      }
    }, 5000);

    try {
      // Create a temporary container for invisible widget
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.visibility = 'hidden';
      container.style.width = '0px';
      container.style.height = '0px';
      document.body.appendChild(container);

      // Render widget with interaction-only appearance (behaves like invisible)
      const widgetId = window.turnstile!.render(container, {
        sitekey: siteKey,
        size: 'normal', // Use normal size with interaction-only appearance
        appearance: 'interaction-only', // Only shows when interaction needed
        theme: 'light',
        callback: (token: string) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            // Clean up
            try {
              window.turnstile!.remove(widgetId);
              document.body.removeChild(container);
            } catch (e) {
              console.warn('Error cleaning up Turnstile widget:', e);
            }
            resolve(token);
          }
        },
        'error-callback': () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            // Clean up on error
            try {
              document.body.removeChild(container);
            } catch (e) {
              console.warn('Error cleaning up Turnstile widget:', e);
            }
            resolve(null);
          }
        }
      });

    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('Turnstile error:', error);
        resolve(null);
      }
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
