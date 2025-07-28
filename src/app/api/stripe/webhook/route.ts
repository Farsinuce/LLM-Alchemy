import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log(`[Stripe Webhook] Processing event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log(`[Webhook] Checkout session completed: ${session.id}`);
    
    const supabase = await createServerSupabaseClient();
    
    // Determine payment status
    const paymentStatus = session.payment_status === 'paid' ? 'paid' : 'pending';
    
    // Update payment record
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_stripe_payment_status', {
        p_stripe_session_id: session.id,
        p_stripe_payment_id: session.payment_intent as string,
        p_status: paymentStatus,
        p_stripe_customer_id: session.customer as string,
        p_webhook_data: {
          event_type: 'checkout.session.completed',
          session_id: session.id,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer: session.customer,
          metadata: session.metadata,
          timestamp: new Date().toISOString(),
        },
      });

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      return;
    }

    if (!updateResult) {
      console.error(`Payment record not found for session: ${session.id}`);
      return;
    }

    console.log(`[Webhook] Successfully processed checkout session: ${session.id}`);
    
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`[Webhook] Invoice payment succeeded: ${invoice.id}`);
    
    // This handles recurring subscription payments
    if ((invoice as any).subscription && invoice.metadata?.userId) {
      const supabase = await createServerSupabaseClient();
      
      // Update subscription status and extend subscription period
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'premium',
          subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        })
        .eq('id', invoice.metadata.userId);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
      } else {
        console.log(`[Webhook] Extended subscription for user: ${invoice.metadata.userId}`);
      }
    }
    
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription updated: ${subscription.id}`);
    
    const supabase = await createServerSupabaseClient();
    
    // Update subscription record
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        next_payment_date: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    }
    
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`[Webhook] Subscription deleted: ${subscription.id}`);
    
    const supabase = await createServerSupabaseClient();
    
    // Update subscription record
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('Error updating canceled subscription:', updateError);
    }
    
    // Also update user's subscription status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'free',
        subscription_ends_at: null,
      })
      .eq('id', subscription.metadata?.userId);

    if (userUpdateError) {
      console.error('Error updating user subscription status:', userUpdateError);
    }
    
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is active',
    timestamp: new Date().toISOString() 
  });
}
