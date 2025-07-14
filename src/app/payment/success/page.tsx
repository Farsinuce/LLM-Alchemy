'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle, ArrowRight, Home } from 'lucide-react';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('Processing payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get session ID from URL parameters
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
          setStatus('No session ID found');
          return;
        }

        // Since we're redirected here from Stripe, we can assume success
        // The webhook will handle the actual payment processing
        setStatus('Payment successful!');
        setPaymentDetails({
          sessionId: sessionId,
          message: 'Your payment has been processed successfully.',
        });

        // Redirect to home after 5 seconds
        setTimeout(() => {
          router.push('/');
        }, 5000);

      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('Error verifying payment');
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="text-yellow-400" size={48} />
          <h1 className="text-3xl font-bold">LLM Alchemy</h1>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 mb-6">
          {status === 'Payment successful!' ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="text-green-400" size={64} />
              </div>
              <h2 className="text-2xl font-bold text-green-400 mb-4">
                Payment Successful!
              </h2>
              <p className="text-gray-300 mb-6">
                Thank you for your purchase. Your tokens have been added to your account 
                and your subscription has been activated.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/game')}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all"
                >
                  <span>Start Playing</span>
                  <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
                >
                  <Home size={20} />
                  <span>Go Home</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
              <p className="text-gray-400">{status}</p>
            </>
          )}
        </div>

        <div className="text-sm text-gray-400">
          <p>You will be redirected to the home page in a few seconds.</p>
          <p className="mt-2">
            If you have any issues, please contact support at{' '}
            <a href="mailto:support@llmalchemy.com" className="text-purple-400 hover:text-purple-300">
              support@llmalchemy.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
