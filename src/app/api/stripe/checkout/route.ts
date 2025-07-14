import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Define our products
const PRODUCTS = {
  tokens_100: {
    name: '100 Tokens',
    amount: 40, // €0.40 in cents
    tokens: 100,
    description: 'Perfect for casual players',
  },
  tokens_500: {
    name: '500 Tokens',
    amount: 180, // €1.80 in cents
    tokens: 500,
    description: 'Great value for regular players',
  },
  tokens_1000: {
    name: '1000 Tokens',
    amount: 350, // €3.50 in cents
    tokens: 1000,
    description: 'For dedicated alchemists',
  },
  subscription_monthly: {
    name: 'Monthly Subscription',
    amount: 599, // €5.99 in cents
    tokens: 0,
    description: 'Unlimited combinations',
  },
};

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();

    if (!productId || !PRODUCTS[productId as keyof typeof PRODUCTS]) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user database record
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbError || !dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if user is anonymous (shouldn't be able to make payments)
    if (dbUser.is_anonymous) {
      return NextResponse.json(
        { error: 'Anonymous users cannot make payments. Please create an account first.' },
        { status: 403 }
      );
    }

    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    const isSubscription = productId === 'subscription_monthly';

    // Create Stripe checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'mobilepay'], // Include MobilePay for Danish users
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.amount,
            ...(isSubscription && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: {
        userId: user.id,
        productId: productId,
        type: isSubscription ? 'subscription' : 'tokens',
        tokens: product.tokens.toString(),
      },
      customer_email: dbUser.email || undefined,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Create payment record in database
    const paymentType = isSubscription ? 'subscription' : 'tokens';
    const { data: paymentRecord, error: paymentError } = await supabase
      .rpc('create_stripe_payment', {
        p_user_id: user.id,
        p_stripe_session_id: session.id,
        p_amount: product.amount / 100, // Convert cents to euros
        p_currency: 'EUR',
        p_type: paymentType,
        p_tokens_granted: product.tokens,
        p_subscription_type: isSubscription ? 'monthly' : null,
        p_checkout_url: session.url,
        p_metadata: {
          stripe_session_id: session.id,
          product_id: productId,
          description: product.description,
        },
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: product.amount / 100,
      description: product.description,
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Checkout creation failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
