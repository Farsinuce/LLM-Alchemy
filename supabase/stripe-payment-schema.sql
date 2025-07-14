-- Stripe Payment Schema for LLM Alchemy - Simplified Version
-- Run this in your Supabase SQL editor

-- Payments table - tracks all transactions (tokens + subscriptions)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL, -- pending, paid, failed, canceled
  type TEXT NOT NULL, -- 'tokens' or 'subscription'
  tokens_granted INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table - tracks active subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL, -- active, canceled, expired
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  next_payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  canceled_at TIMESTAMP
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage payments" ON payments
  FOR ALL USING (true);

CREATE POLICY "System can manage subscriptions" ON subscriptions
  FOR ALL USING (true);

-- Essential indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Function to create a payment record
CREATE OR REPLACE FUNCTION create_stripe_payment(
  p_user_id UUID,
  p_stripe_session_id TEXT,
  p_amount DECIMAL(10,2),
  p_currency TEXT,
  p_type TEXT,
  p_tokens_granted INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO payments (
    user_id, stripe_session_id, amount, currency, status, type, tokens_granted
  ) VALUES (
    p_user_id, p_stripe_session_id, p_amount, p_currency, 'pending', p_type, p_tokens_granted
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payment status (called by webhook)
CREATE OR REPLACE FUNCTION update_stripe_payment_status(
  p_stripe_session_id TEXT,
  p_stripe_payment_id TEXT,
  p_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  payment_record payments%ROWTYPE;
BEGIN
  -- Get the payment record
  SELECT * INTO payment_record FROM payments 
  WHERE stripe_session_id = p_stripe_session_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update payment status
  UPDATE payments 
  SET 
    status = p_status,
    stripe_payment_id = p_stripe_payment_id,
    updated_at = NOW()
  WHERE stripe_session_id = p_stripe_session_id;
  
  -- If payment successful, grant tokens or activate subscription
  IF p_status = 'paid' THEN
    IF payment_record.type = 'tokens' AND payment_record.tokens_granted > 0 THEN
      -- Grant tokens
      UPDATE users 
      SET token_balance = COALESCE(token_balance, 0) + payment_record.tokens_granted
      WHERE id = payment_record.user_id;
      
    ELSIF payment_record.type = 'subscription' THEN
      -- Activate subscription
      UPDATE users 
      SET 
        subscription_status = 'premium',
        subscription_ends_at = NOW() + INTERVAL '1 month'
      WHERE id = payment_record.user_id;
      
      -- Create/update subscription record
      INSERT INTO subscriptions (
        user_id, status, amount, currency, next_payment_date
      ) VALUES (
        payment_record.user_id, 'active', payment_record.amount, payment_record.currency, 
        NOW() + INTERVAL '1 month'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        status = 'active',
        next_payment_date = NOW() + INTERVAL '1 month',
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE payments IS 'All payment transactions (tokens and subscriptions)';
COMMENT ON TABLE subscriptions IS 'Active subscription tracking';
COMMENT ON FUNCTION create_stripe_payment IS 'Creates a new payment record';
COMMENT ON FUNCTION update_stripe_payment_status IS 'Updates payment status and grants tokens/subscription';
