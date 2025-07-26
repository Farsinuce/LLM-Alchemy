
# LLM Alchemy – Developer Overview  
*(Last updated 26 July 2025)*  

This condensed handbook explains **what each major file / folder does** and **how the whole Next‑js + Supabase + LLM game fits together**.  
Share it with incoming developers or paste it into an LLM to give instant context.

---

## 1 · Project Topology

```
/
├── src
│   ├── app               # Next.js App‑Router pages, layouts & API routes
│   ├── components        # Re‑usable React UI + game widgets
│   ├── lib               # Pure TS helpers (Supabase, prompts, game config…)
│   ├── styles | app/globals.css  # Tailwind v4 design‑system tokens
│   └── public            # Static assets (emoji, sounds, favicon…)
├── supabase              # SQL migrations & RLS policies
├── vercel.json           # Deploy‑ & cron configuration
└── package.json          # Scripts & dependencies
```

---

## 2 · How It All Works (end‑to‑end)

1. **Frontend boot‑strap**  
   *`src/app/layout.tsx`* sets fonts & injects **`<SupabaseProvider>`** so every component can query auth/database.fileciteturn0file0turn0file1  

2. **Main menu**  
   *`src/app/page.tsx`* fetches the user, daily usage and challenge status, then lets the player:  
   • start/continue a game • reset progress • open auth / payment / LLM‑options modals.

3. **Game runtime**  
   *`src/components/game/LLMAlchemy.tsx`* holds the drag‑&‑drop board.  
   - When two (or three) elements are mixed it first checks **hard‑coded combos**;  
   - else it POSTs `/api/generate` → OpenRouter → Gemini Flash/Pro → JSON reply.  
   - The outcome is merged into React state then persisted (supabase) & cached (sessionStorage).

4. **Challenge loop**  
   Cron job (`vercel.json`) calls `/api/challenges/generate` every Copenhagen midnight.  
   Players’ clients poll `/api/challenges/current`; completing a requirement POSTs  
   `/api/challenges/complete`, which awards tokens atomically in Postgres.fileciteturn0file2  

5. **Monetisation**  
   `/api/stripe/*` endpoints create checkout sessions and process webhooks to credit tokens or set `subscription_status = 'premium'`.  

6. **Security & quotas**  
   - Cloudflare Turnstile gate in Auth flows  
   - Supabase Row‑Level‑Security on every table  
   - Daily free‑combination counter in `users.daily_count` (reset by DB cron).

---

## 3 · File‑by‑File Cheat‑Sheet

| Path | Purpose / Key ideas |
|------|---------------------|
| **src/app/globals.css** | Tailwind v4 `@theme` design tokens + utility classes used across the whole app. |
| **src/app/layout.tsx** | HTML skeleton, loads Cloudflare script, wraps children in `SupabaseProvider`. |
| **src/app/page.tsx** | Main menu UI + all modal logic (auth, payment, LLM options, reset). |
| **src/app/(game)/game/page.tsx** | Loads **LLMAlchemy** component (board, sidebar, challenge bar). |
| **src/app/api/generate/route.ts** | Single LLM gateway – builds prompt, selects model (Flash/Pro), validates JSON. |
| **src/app/api/challenges/(*)** | CRUD for daily/weekly challenges (current, complete, generate). |
| **src/app/api/stripe/checkout.ts** | Creates Stripe Checkout session for tokens / subscription. |
| **src/app/api/stripe/webhook.ts** | Webhook listener – credits tokens, flips subscription flags. |
| **src/components/auth/AuthModal.tsx** | Email & OAuth login/registration, Turnstile token handling. |
| **src/components/auth/SupabaseProvider.tsx** | React context supplying `user`, `dbUser`, `dailyCount` + helpers. |
| **src/components/game/LLMAlchemy.tsx** | Core game logic: drag‑drop grid, element state, animation loops, hard‑coded science combos. |
| **src/components/game/ChallengeBar.tsx** | Tiny banner that shows active challenges and rewards. |
| **src/lib/supabase-client.ts** | Lightweight typed client for browser & server contexts. |
| **src/lib/game-config.ts** | Central constants – starting elements, free limit, rarities. |
| **src/lib/llm-prompts.ts** | Builds shared / science / creative prompt sections. |
| **src/lib/challenge-elements.ts** | Curated category & element lists used by generator. |
| **src/lib/auth-utils.ts** | Helpers for upgrading anonymous → registered accounts. |
| **supabase/** *.sql* | Database schema, RLS rules, `increment_user_tokens()` etc. |
| **vercel.json** | Defines cron job `0 0 * * *` (midnight UTC) for challenge generation & edge/functions config. |

*(Only the most important files are listed; see the repo for full tree.)*

---

## 4 · Data Flow Diagram (text)

```
Player → Next.js page → /api/generate ─┐
                                       │ (chooses model, calls OpenRouter)
                                       └─→ LLM (Gemini) → JSON → Supabase save
              ↑                                      │
              └── /api/challenges/complete ←─────────┘
```

Tokens & subscriptions move through `/api/stripe/*` → Stripe → webhook → Supabase.

---

## 5 · Developer On‑Boarding Tips

* `npm run dev` – local dev server  
* `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` must be set in `.env.local`.  
* To run daily‑challenge cron locally: `curl http://localhost:3000/api/challenges/generate?secret=dev`  
* Keep **globals.css** pattern when adding UI – design system guarantees consistency.  
* Write new server code in **/api/**; it runs as Vercel Edge Functions.  

---

**Enjoy exploring & extending LLM Alchemy!**
