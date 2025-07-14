declare global {
  interface Window {
    turnstile?: {
      render: (element: string, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback': () => void;
      }) => void;
    };
  }
}

export {};
