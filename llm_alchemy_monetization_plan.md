# LLM Alchemy - Monetization Plan

## Current Model Pricing (Gemini via OpenRouter)

**Gemini Flash (Free Tier):**
- Input: $0.15/M tokens
- Output: $0.60/M tokens
- **Cost per call: ~$0.00015** (700 input + 75 output tokens)

**Gemini Pro (Paid Tier):**
- Input: $1.25/M tokens  
- Output: $10/M tokens
- **Cost per call: ~$0.001625** (700 input + 75 output tokens)

## Pricing Structure

### Free Tier
- **50 calls/day** with Gemini Flash
- **Cost per user:** $0.0075/day = $2.25/month
- **1000 daily users = $225/month total cost**

### Monthly Subscription - €6
- **3000 calls/month** with Gemini Pro
- **Revenue:** €6 ≈ $6.50
- **Cost:** $4.88
- **Profit:** $1.62 per user (25% margin)

### Token Packages (40% markup)
- **100 calls:** €0.40 (cost: €0.23, profit: €0.17)
- **500 calls:** €1.80 (cost: €1.15, profit: €0.65)
- **1000 calls:** €3.50 (cost: €2.30, profit: €1.20)
- **2000 calls:** €6.50 (cost: €4.60, profit: €1.90)

*Note: Subscription offers better value to encourage recurring revenue*

## Feature Comparison

| Feature | Free | Tokens | Subscription | Own API Key |
|---------|------|--------|--------------|-------------|
| Daily calls | 50 (Flash) | Pay-per-use (Pro) | 3000/month (Pro) | Unlimited |
| Undo function | ❌ | ✅ | ✅ | ✅ |
| Max elements | 50 per session | Unlimited | Unlimited | Unlimited |
| Model quality | Basic (Flash) | Premium (Pro) | Premium (Pro) | User choice |

## Anti-Abuse Measures

**Rate Limiting (All Users):**
- 10 calls/minute per user
- IP + browser fingerprint tracking

**Free Users:**
- 50 calls/day limit (natural abuse protection)
- Max 50 elements per session

**Paying Users:**
- Monthly: 3000 calls
- Burst limit: 1000 calls/day
- Automated alerts at 2500+ monthly calls

## Player Experience

**Free Player Journey:**
1. Discover 50 elements → soft limit reached
2. Continue tomorrow OR upgrade
3. No pressure, clear value demonstration

**Paid Player Benefits:**
- **Undo function:** Refunds tokens/calls for high satisfaction
- **Better AI:** More creative combinations with Pro model
- **No limits:** Unlimited discovery sessions

## Financial Projections

**Fixed Costs:**
- **Hosting:** €15/month (Vercel)
- **Payment processing:** ~3% of revenue

**Break-even Analysis:**
- **Break-even:** ~10-15 subscribers OR 150 active free users
- **Growth target:** 40-50 subscribers to cover 1000 free users

**Cost Scenarios:**
- **100 daily users:** ~€25/month inference cost
- **500 daily users:** ~€125/month inference cost  
- **1000 daily users:** ~€250/month inference cost

## Key Success Factors

1. **Generous free tier** builds user base
2. **Clear upgrade value** (better AI + unlimited play)
3. **Own API key option** for power users
4. **Non-invasive monetization** maintains trust
5. **Sustainable unit economics** for solo developer

---

*Model pricing subject to market changes. Strategy adapts to maintain 25%+ profit margins.*