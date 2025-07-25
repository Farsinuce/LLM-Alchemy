// Simple Turnstile implementation for LLM Alchemy
// This handles invisible Turnstile captcha for anonymous user creation

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
      execute: (element: string | HTMLElement) => void;
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

/**
 * Create a Turnstile widget in a visible container
 * This is used in forms where user interaction might be needed
 */
export function createVisibleTurnstile(
  containerId: string,
  onSuccess: (token: string) => void,
  onError?: () => void
): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  
  if (!siteKey) {
    console.warn('Turnstile site key not found');
    return Promise.resolve(null);
  }

  if (typeof window === 'undefined' || !window.turnstile) {
    console.warn('Turnstile not loaded');
    return Promise.resolve(null);
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Turnstile container ${containerId} not found`);
    return Promise.resolve(null);
  }

  try {
    const widgetId = window.turnstile!.render(container, {
      sitekey: siteKey,
      size: 'normal',
      theme: 'dark', // Match your app's theme
      execution: 'execute', // Manual execution
      callback: (token: string) => {
        onSuccess(token);
      },
      'error-callback': () => {
        console.error('Turnstile error in visible widget');
        onError?.();
      },
      'expired-callback': () => {
        console.warn('Turnstile token expired, please retry');
        onError?.();
      }
    });

    return Promise.resolve(widgetId);
  } catch (error) {
    console.error('Error creating visible Turnstile widget:', error);
    onError?.();
    return Promise.resolve(null);
  }
}

/**
 * Execute a visible Turnstile widget
 */
export function executeTurnstile(containerId: string): void {
  if (typeof window !== 'undefined' && window.turnstile) {
    const container = document.getElementById(containerId);
    if (container) {
      window.turnstile.execute(container);
    }
  }
}

/**
 * Reset a Turnstile widget
 */
export function resetTurnstile(widgetId?: string): void {
  if (typeof window !== 'undefined' && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}

/**
 * Remove a Turnstile widget
 */
export function removeTurnstile(widgetId: string): void {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      window.turnstile.remove(widgetId);
    } catch (error) {
      console.warn('Error removing Turnstile widget:', error);
    }
  }
}
