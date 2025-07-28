
# LLM Alchemy – Developer Overview  
*(Last updated 28 July 2025)*

This condensed handbook explains **what each major file / folder does** and **how the whole Next‑js + Supabase + LLM game fits together**.  
Share it with incoming developers or paste it into an LLM to give instant context.

---

## 1 · Project Topology

```
/
├── .github/workflows     # CI/CD pipeline (lint, build, type-gen)
├── src
│   ├── app               # Next.js App‑Router pages & API routes
│   ├── components        # Re‑usable React UI widgets
│   ├── lib               # Core application logic
│   │   └── supabase      # Secure Supabase client/server modules
│   └── public            # Static assets (emojis, etc.)
├── scripts               # Build-time scripts (e.g., copying assets)
├── supabase              # SQL migrations & RLS policies
├── eslint.config.mjs     # ESLint flat config with security rules
└── package.json          # Scripts & dependencies
```

---

## 2 · How It All Works (end‑to‑end)

1. **Secure Supabase Clients & Auth**  
   The app uses a strict separation of Supabase clients.
   - **`src/lib/supabase/browser.ts`**: A client-side instance for UI components. It uses the `anon` key and is fully exposed to the browser.
   - **`src/lib/supabase/server.ts`**: A server-side instance for API routes and Server Components. It can use the `service_role` key to bypass RLS for admin tasks.
   - **`<SupabaseProvider>`**: Injects user auth state and database helpers into the React component tree.

2. **Game Runtime & Emoji Handling**  
   *`src/components/game/LLMAlchemy.tsx`* holds the drag‑&‑drop board.  
   - When elements are mixed, it POSTs to `/api/generate`, which securely calls the LLM (Gemini Flash/Pro) via OpenRouter.
   - The outcome is merged into React state and persisted to the Supabase DB.
   - All emojis are rendered via `OpenMojiDisplay.tsx`, which uses `openmoji-service.ts` to resolve the correct SVG, ensuring visual consistency.

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
| Path | Purpose / Key ideas |
|------|---------------------|
| **src/app/globals.css** | Tailwind v4 `@theme` design tokens + global utility classes. |
| **src/app/layout.tsx** | HTML skeleton, loads Cloudflare script, wraps children in `SupabaseProvider`. |
| **src/app/page.tsx** | Main menu UI + all modal logic (auth, payment, LLM options, reset, challenges). |
| **src/app/(game)/game/page.tsx** | Loads **LLMAlchemy** component (board, sidebar, challenge bar). |
| **src/app/api/generate/route.ts** | Single LLM gateway – builds prompt, selects model (Flash/Pro), validates JSON. |
| **src/app/api/challenges/(*)** | CRUD for daily/weekly challenges (current, complete, generate). |
| **src/app/api/stripe/checkout.ts** | Creates Stripe Checkout session for tokens / subscription. |
| **src/app/api/stripe/webhook.ts** | Webhook listener – credits tokens, flips subscription flags. |
| **src/components/auth/AuthModal.tsx** | Email & OAuth login/registration, Turnstile token handling. |
| **src/components/auth/SupabaseProvider.tsx** | React context supplying `user`, `dbUser`, `dailyCount` + helpers. |
| **src/components/game/LLMAlchemy.tsx** | Core game logic: drag‑drop grid, element state, animation loops, hard‑coded science combos. |
| **src/components/game/ChallengeBar.tsx** | Banner that shows active challenges and rewards. |
| **src/components/game/OpenMojiDisplay.tsx** | Renders all emojis as consistent SVGs using the OpenMoji library. |
| **src/lib/supabase/browser.ts** | Creates a browser-safe Supabase client for use in UI components. |
| **src/lib/supabase/server.ts** | Creates server-only Supabase clients (including `service_role`) for API routes. |
| **src/lib/openmoji-service.ts**| Resolves the correct OpenMoji SVG for an element using direct mapping and fuzzy search. |
| **src/lib/llm-prompts.ts** | Builds prompts for Science & Creative modes, defining the expected JSON structure. |
| **eslint.config.mjs** | Flat ESLint config with strict rules, including `import/no-restricted-paths` to prevent illegal imports between client/server code. |
| **.github/workflows/ci.yml** | GitHub Actions workflow that runs on every push/PR. Performs type generation, linting, type checking, and a production build to ensure code quality. |
| **package.json** | Defines all project scripts, including `gen:types` for Supabase type generation and a `precommit` hook that runs quality checks. |
| **src/lib/challenge-elements.ts** | Curated category & element lists used by the challenge generator. |
| **scripts/copy-openmoji.js** | Build-time script that copies OpenMoji SVG assets into the `public` directory. |
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

* `npm run dev` – Starts the local development server.
* `npm run gen:types` – Generates TypeScript types from your Supabase schema. Run this after any database changes.
* **Pre-commit Hook**: On commit, the `precommit` script automatically runs `gen:types`, `lint`, and `typecheck` to ensure code quality before it enters the repository.
* `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` must be set in `.env.local`.
* To run the daily challenge cron job locally: `curl http://localhost:3000/api/challenges/generate?secret=my-llm-alchemy-cron-secret-2025-xyz789`
* Adhere to the design system in **globals.css** to maintain UI consistency.
* New server-side logic should be placed in **/api/** routes.

---

**Enjoy exploring & extending LLM Alchemy!**
