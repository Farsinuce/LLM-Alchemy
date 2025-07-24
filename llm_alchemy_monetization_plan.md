# LLM Alchemy - Monetization Plan

## IMPLEMENTATION STATUS: TOKEN SYSTEM COMPLETE ✅

**Current Status (July 12, 2025)**: Comprehensive token system and Gemini Pro integration fully implemented and operational!

**What's Working Now:**
- ✅ Token balance system with database storage
- ✅ Automatic model selection (Flash vs Pro based on user status)
- ✅ Token consumption on Pro model usage
- ✅ UI integration showing token balance and status
- ✅ Database functions for token management
- ✅ "Get more" button for token purchases (ready for Mollie integration)

---

## Current Model Pricing (Gemini via OpenRouter API)

**Gemini Flash (Free Tier):**
- Input: $0.15/M tokens
- Output: $0.60/M tokens
- **Cost per call: ~$0.00015** (700 input + 75 output tokens)

**Gemini Pro (Paid Tier):**
- Input: $1.25/M tokens  
- Output: $10/M tokens
- **Cost per call: ~$0.001625** (700 input + 75 output tokens)

## Pricing Structure

### Free Tier players
- **50 calls/day** with Gemini Flash
- **Cost per user:** $0.0075/day = $0.225/month
- **1000 daily users = $225/month total cost**

### Monthly Subscription - €6
- **3000 calls/month** with Gemini Pro
- **Revenue:** €6 ≈ $6.50
- **Cost:** $4.88
- **Profit:** $1.62 per user (25% margin) (≈ $1.30 after payment processing)

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
- 30 calls/minute per user
- IP + browser fingerprint tracking

**Free Users:**
- 50 calls/day limit (natural abuse protection)
- Max 50 elements per session

**Paying Users:**
- Monthly: 3000 calls
- Burst limit: 1000 calls/day
- Maybe automated alerts at 2700+ monthly calls

## Player Experience

**Free Player Journey:**
1. Discover 50 elements → soft limit reached
2. Start new game OR upgrade
3. No pressure, clear value demonstration

**Paid Player Benefits:**
- **Undo function:** Refunds tokens/calls for high satisfaction
- **Better AI:** More creative combinations with Pro model (maybe not relevant marketing in our case, so should maybe not be communicated, but just happen behind-the-scenes)
- **No limits:** Unlimited discovery sessions

## Financial Projections

**Fixed Costs:**
- **Hosting:** €0-20/month (Vercel: Free tier initially, €20/month Pro when scaling)
- **Payment processing:** ~3% of revenue

**Break-even Analysis:**
- **Break-even:** ~3-5 subscribers (free hosting) OR 15-20 subscribers (Pro hosting)
- **Growth target:** 35-40 subscribers to cover 1000 free users

**Cost Scenarios:**
- **100 daily users:** ~€22/month inference cost
- **500 daily users:** ~€112/month inference cost  
- **1000 daily users:** ~€225/month inference cost

## Hosting Strategy

**Vercel (Chosen Platform):**
- **Free tier:** Perfect for launch and initial growth
- **Pro tier:** €20/month when scaling beyond free limits
- **Benefits:** One-click deployment, serverless functions, EU edge regions
- **API integration:** Simple `/api/*.ts` endpoints for LLM calls and Stripe
- **Automatic CI/CD:** Deploy directly from GitHub

**Deployment advantages:**
- Zero server management required
- Built-in HTTPS and analytics
- Environment variables managed securely via UI
- Automatic scaling based on usage

## Key Success Factors

1. **Generous free tier** builds user base
2. **Clear upgrade value** (unlimited play)
3. **Own API key option** for power users
4. **Non-invasive monetization** maintains trust
5. **Sustainable unit economics** for solo developer
6. **Rapid deployment** with Vercel enables quick iteration and feature updates

---

*Model pricing subject to market changes. Strategy adapts to maintain 25%+ profit margins.*
