# SipMate 🍻

SipMate is a social app for finding people nearby who are ready for a drink, coffee, or a quick hangout right now.

It is not built around traditional dating-app matches. The core interaction is **Cheers**: one user sends 🍻, and when both users send Cheers to each other the app shows **CHEERS!** and unlocks the connection/chat flow.

## Current MVP

The repository currently includes:

- Supabase authentication and profile creation
- Nearby discovery with location and distance
- ACTIVE / INACTIVE availability
- "Currently up for" activity/drink status
- One-way and mutual Cheers
- CHEERS animation
- Realtime chat
- Unread message badges
- Read status (✓ / ✓✓)
- Typing indicator
- Profile photos and fullscreen gallery
- Block and report safety tools
- Blocked users management
- English, German, and Croatian UI
- Premium feature gating
- Stripe Checkout subscriptions
- Stripe customer portal
- Monthly and yearly Premium plans
- Founders / Early Access yearly offers

## Tech stack

- Expo SDK 57
- React Native
- Expo Router
- TypeScript
- Supabase Auth / Database / Realtime / Storage / Edge Functions
- Stripe subscriptions
- i18next / react-i18next

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` and add your own public Supabase values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never commit service-role keys, Stripe secret keys, webhook secrets, or other private credentials.

### 3. Start Expo

```bash
npx expo start
```

For a clean development start on a custom port:

```bash
npx expo start --clear --port 8082
```

Available package scripts:

```bash
npm run start
npm run android
npm run ios
npm run web
npm run lint
```

## Main app routes

- `/` — Discover
- `/nearby` — Nearby people
- `/cheers` — Sent, received, and mutual Cheers
- `/chats` — Conversation list
- `/chat` — Realtime conversation
- `/profile` — Own profile
- `/edit-profile` — Profile editing
- `/user-profile` — Another user's profile
- `/blocked-users` — Blocked users
- `/language` — Language selection
- `/premium` — Premium plans and subscription state
- `/login` — Login
- `/register` — Registration

## Premium

SipMate Premium currently supports monthly and yearly Stripe subscriptions. Premium capabilities include features such as direct messaging, seeing who sent Cheers, advanced discovery options, location-related Premium controls, and additional profile photos.

The pricing logic currently includes Founders and Early Access yearly stages before the standard yearly offer.

## Supabase Edge Functions

The project contains Stripe-related Supabase Edge Functions for:

- creating Checkout sessions
- Stripe webhook processing
- opening the Stripe customer portal

Private Stripe and Supabase service credentials belong in Supabase function secrets, never in the client app or repository.

## Internationalization

The interface currently supports:

- English
- German
- Croatian

The app detects a device language where supported and also allows a manual language choice that is persisted locally.

User-generated content such as names, bios, and chat messages is intentionally not automatically translated.

## Brand / UI

The main visual direction is a dark SipMate interface using black and charcoal surfaces, red primary actions, green ACTIVE status indicators, and gold Premium accents.

Expo splash and adaptive-icon backgrounds are configured to match the dark theme.

## Security notes

- `.env` files are ignored by Git.
- `.env.example` contains placeholders only.
- Client code uses the public Supabase anon key.
- Service-role and Stripe secret credentials must remain server-side.
- Block and report flows are backed by database rules/functions rather than UI-only hiding.

## Repository

Main development branch: `master`

SipMate is actively under development.
