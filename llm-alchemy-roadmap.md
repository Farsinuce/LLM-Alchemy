# LLM Alchemy - Project Roadmap

**Version**: 2.0  
**Last Updated**: July 28, 2025  
**Status**: Live and stable, with a major refactoring phase underway to prepare for a visual redesign.

---

## 1. Project Vision

To create a fun, engaging, and endlessly replayable alchemy game powered by Large Language Models, with a polished user experience and a sustainable monetization model. The next major evolution is a complete visual redesign based on the OpenMoji style guide.

---

## 2. Completed Milestones

The project has successfully evolved from a prototype to a feature-complete, production-ready web application.

*   **✅ Phase 1: Core Game Engine**
    *   Functional Science and Creative game modes.
    *   Dynamic combination generation via OpenRouter (Gemini LLMs).
    *   Consistent emoji styling with a custom OpenMoji integration.

*   **✅ Phase 2: Backend & Database**
    *   Full Supabase integration for database (PostgreSQL) and authentication.
    *   Secure Row Level Security (RLS) policies.
    *   Robust, persistent game state management (auto-saving per-mode progress).

*   **✅ Phase 3: User & Gameplay Systems**
    *   Anonymous user support for instant play.
    *   Daily limits for free users.
    *   Automated Daily/Weekly Challenge system with token rewards.
    *   Comprehensive achievement system.

---

## 3. Current Phase: Code Refactoring

This is the current focus of our work. The goal is to improve the codebase's health, maintainability, and scalability in preparation for the visual redesign.

*   **Status**: 🔄 In Progress
*   **Detailed Plan**: See `refactoring-plan.md` for a step-by-step technical breakdown.
*   **Key Objectives**:
    1.  **Consolidate & Secure Code**: Unify Supabase clients and centralize type definitions.
    2.  **Deconstruct `LLMAlchemy.tsx`**: Break down the main "god component" into smaller, manageable hooks and UI components.
    3.  **Modernize Styling**: Adopt a hybrid Tailwind + CSS Modules approach for scalable and maintainable styles.

---

## 4. Next Phases: The Road to Redesign & Launch

### **Phase 4.1: OpenMoji Visual Redesign**

*   **Status**: 📝 Planned
*   **Goal**: Overhaul the entire UI to match the OpenMoji style guide: "Cute flat vector illustrations with thick black outline, simple geometric shapes, minimal details, solid colors, no gradients, icon style, friendly and simplified."
*   **Key Tasks**:
    *   Redesign all UI components (`Element Cards`, `Modals`, `Buttons`, `Header`, etc.).
    *   Create a new, unified color palette based on OpenMoji's colors.
    *   Implement new layouts and animations that fit the friendly, flat aesthetic.

### **Phase 4.2: Modular LLM System**

*   **Status**: 📝 Planned
*   **Goal**: Refactor the LLM integration to be modular and easily configurable, allowing for the addition of new models without code changes.
*   **Key Tasks**:
    1.  **Create a Model Configuration System**: Define all available LLMs (Gemini, Mistral, etc.) in a central configuration file, specifying their API identifiers, type (Speed/Reasoning), and parameters (`max_tokens`, reasoning settings).
    2.  **Refactor API Endpoint**: Update the `/api/generate` route to dynamically select and configure the LLM based on an identifier sent from the client, rather than using a hardcoded toggle.
    3.  **Update UI**: Redesign the "LLM Options" modal to display a selection of all four models (2x Gemini, 2x Mistral), grouped by "Speed" and "Reasoning" categories.
    4.  **Implement New Models**:
        *   **Reasoning**: Gemini Flash 2.5 (1000 `max_tokens`) & Magistral Medium.
        *   **Speed**: Gemini Flash 2.5 Lite (reasoning enabled, 100 `max_tokens`) & Magistral Small.

### **Phase 4.3: Finalize Monetization & User Features**

*   **Status**: 📝 Planned
*   **Goal**: Complete the Stripe integration and enhance the registered user experience.
*   **Key Tasks**:
    *   Activate and test the Stripe payment processing for token packs and subscriptions.
    *   Implement a seamless account upgrade flow for anonymous users to register and keep their progress.
    *   Add premium-tier features, such as allowing subscribers to choose their preferred LLM from the new modular system.

### **Phase 4.4: Pre-Launch Polish & Launch**

*   **Status**: 📝 Planned
*   **Goal**: Prepare the application for a full public launch.
*   **Key Tasks**:
    *   **Security Review**: Conduct a final review of all systems, including RLS policies and potential exploits.
    *   **Analytics**: Integrate analytics (e.g., Vercel Analytics) to monitor user engagement.
    *   **Legal**: Create and add Privacy Policy and Terms of Service pages.
    *   **Marketing**: Prepare for launch (announcements, social media, etc.).
