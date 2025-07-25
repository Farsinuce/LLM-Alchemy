import { NextRequest, NextResponse } from 'next/server';

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!TURNSTILE_SECRET_KEY) {
      console.error('TURNSTILE_SECRET_KEY not configured');
      // Fail open - if secret key not configured, allow the request
      // This prevents blocking users if Turnstile is misconfigured
      return NextResponse.json({ success: true, failOpen: true });
    }

    // Verify the token with Cloudflare
    const formData = new FormData();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    
    // Optional: Add the user's IP address for additional security
    const remoteIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    formData.append('remoteip', remoteIp);

    const result = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    const outcome = await result.json();

    if (!outcome.success) {
      console.warn('Turnstile verification failed:', outcome['error-codes']);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verification failed',
          errorCodes: outcome['error-codes'] 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Turnstile verification error:', error);
    // Fail open on errors to prevent blocking legitimate users
    return NextResponse.json({ 
      success: true, 
      failOpen: true,
      error: 'Verification service unavailable' 
    });
  }
}
