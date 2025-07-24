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
 * Generate a Turnstile token using managed mode (more reliable on mobile)
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
    
    // 3 second timeout to prevent hanging
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('Turnstile timeout - proceeding without token');
        resolve(null);
      }
    }, 3000);

    try {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);

      // Render managed widget (more reliable than invisible)
      const widgetId = window.turnstile!.render(container, {
        sitekey: siteKey,
        size: 'normal', // Changed from invisible to normal (managed mode)
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
