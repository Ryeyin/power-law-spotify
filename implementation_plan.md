# Artist Exchange — React Native + Expo Implementation Walkthrough

Your instructions spec a Next.js web app, but you want **React Native on Expo Go**. This walkthrough adapts every piece of the spec into a mobile-first architecture with equivalent tooling.

> [!IMPORTANT]
> The original spec calls for Next.js, Tailwind, and shadcn/ui — none of these apply to React Native. The plan below substitutes mobile equivalents at every layer.

---

## Tech Stack Adaptation

| Original Spec | Mobile Equivalent |
|---|---|
| Next.js (App Router) | **Expo Router** (file-based routing for RN) |
| TypeScript | **TypeScript** (same) |
| Tailwind CSS | **React Native StyleSheet** (vanilla RN styling) |
| shadcn/ui | Hand-built components (no RN equivalent) |
| Clerk Auth | **Clerk Expo SDK** (`@clerk/clerk-expo`) |
| Firebase Firestore | **Firebase JS SDK** (`firebase` / `@react-native-firebase`) |
| Spotify API | Same REST API calls via `fetch` |
| Last.fm API | Same REST API calls via `fetch` |
| Groq API | Same REST API calls via `fetch` |
| Charts | `react-native-chart-kit` or `victory-native` |

---

## Colorway

All UI will use this palette instead of the spec's green/purple/blue:

| Token | Hex | Usage |
|---|---|---|
| `amber-500` | `#F59E0B` | Primary accent, buttons, highlights |
| `amber-400` | `#FBBF24` | Hover/active states, coin icons |
| `amber-700` | `#B45309` | Dark amber for pressed states |
| `coral-500` | `#FF6B6B` | Secondary accent, sell buttons, loss indicators |
| `coral-400` | `#FF8787` | Light coral for badges |
| `coral-700` | `#C92A2A` | Deep coral for errors |
| `teal-500` | `#14B8A6` | Tertiary accent, buy buttons, gain indicators |
| `teal-400` | `#2DD4BF` | Light teal for cards |
| `teal-700` | `#0F766E` | Dark teal for headers |
| `bg-dark` | `#0F1119` | App background |
| `bg-card` | `#1A1D2E` | Card backgrounds |
| `bg-surface` | `#252A3A` | Elevated surfaces |
| `text-primary` | `#F5F5F5` | Primary text |
| `text-secondary` | `#9CA3AF` | Secondary/muted text |

---

## Staged Implementation Roadmap

### Stage 1 — Project Scaffolding & Navigation Shell

**What you're building:** The empty app skeleton with all screens stubbed out, navigation working, and the design system in place.

**Libraries to install:**
```
npx create-expo-app@latest ./ --template blank-typescript
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npx expo install expo-font @expo-google-fonts/inter
npx expo install react-native-svg
```

**Files to create:**

```
app/
├── _layout.tsx              ← Root layout (wraps everything in providers)
├── (auth)/
│   ├── _layout.tsx          ← Auth group layout
│   ├── landing.tsx          ← Landing / welcome screen
│   ├── sign-in.tsx          ← Sign-in screen
│   └── sign-up.tsx          ← Sign-up screen
├── (tabs)/
│   ├── _layout.tsx          ← Tab navigator layout
│   ├── index.tsx            ← Dashboard (home tab)
│   ├── discover.tsx         ← Discover / search tab
│   ├── portfolio.tsx        ← Portfolio tab
│   ├── playlist.tsx         ← Playlist generator tab
│   └── profile.tsx          ← Profile tab
├── artist/
│   └── [id].tsx             ← Artist detail page (dynamic route)
constants/
├── colors.ts                ← Amber/coral/teal theme tokens
├── typography.ts            ← Font sizes, weights
components/
├── ArtistCard.tsx           ← Reusable artist card
├── CoinBadge.tsx            ← Coin balance display
├── DiscoveryBadge.tsx       ← Score category badge
├── GlassCard.tsx            ← Glassmorphism card wrapper
├── PriceChange.tsx          ← Green/red price delta
├── Button.tsx               ← Themed button
├── TabIcon.tsx              ← Bottom tab icon
```

**What it looks like when done:** You can launch the app on Expo Go, see a bottom tab bar with 5 tabs (Dashboard, Discover, Portfolio, Playlist, Profile), and navigate between stub screens. The landing screen appears first if not logged in.

---

### Stage 2 — Authentication (Clerk)

**What you're building:** Clerk sign-in/sign-up with Google and email/password, session persistence, protected routes.

**Libraries to install:**
```
npx expo install @clerk/clerk-expo expo-secure-store expo-web-browser expo-auth-session
```

**Files to create/modify:**

| File | What |
|---|---|
| `app/_layout.tsx` | Wrap app in `<ClerkProvider>` with `tokenCache` using `expo-secure-store` |
| `app/(auth)/sign-in.tsx` | Email/password form + Google OAuth button |
| `app/(auth)/sign-up.tsx` | Registration form |
| `app/(auth)/_layout.tsx` | Redirect to `(tabs)` if already signed in |
| `app/(tabs)/_layout.tsx` | Redirect to `(auth)` if NOT signed in |

**Environment variables** (create `.env`):
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

**What it looks like when done:** Users can sign up, sign in, and the app remembers their session. Unauthenticated users see the landing page. Authenticated users go straight to the dashboard.

---

### Stage 3 — Firebase Setup & User Document

**What you're building:** Firestore connection, auto-create user documents on first login, read/write user data.

**Libraries to install:**
```
npx expo install firebase
```

**Files to create:**

| File | What |
|---|---|
| `lib/firebase.ts` | Firebase config + `initializeApp` |
| `lib/firestore.ts` | Helper functions: `getUser`, `createUser`, `updateUser` |
| `hooks/useUser.ts` | Custom hook that syncs Clerk user → Firestore user doc |

**Firestore collections to set up** (in Firebase console):
- `users` — one doc per Clerk user ID
- `artists` — cached artist data
- `investments` — user investments
- `transactions` — buy/sell history
- `trackedArtists` — user tracking list
- `dailyRewards` — reward timestamps

**Environment variables** (add to `.env`):
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

**What it looks like when done:** On first login, a Firestore doc is created with 1000 coins. The dashboard reads and displays the user's coin balance.

---

### Stage 4 — Spotify API Integration & Search

**What you're building:** Search for artists via Spotify, display results with images.

**What you need:**
- A Spotify Developer app → Client ID + Client Secret
- **Client Credentials flow** (no user login needed for search)

**Files to create:**

| File | What |
|---|---|
| `lib/spotify.ts` | `getSpotifyToken()` (client credentials), `searchArtists(query)`, `getArtist(id)`, `getTopTracks(id)` |
| `app/(tabs)/discover.tsx` | Search bar + results list using `ArtistCard` |

> [!WARNING]
> The Spotify Client Credentials flow uses your secret key. For production you'd proxy this through a backend. For Expo Go testing, you can call it directly — but **never ship the secret in a production app**.

**Environment variables:**
```
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=...
EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET=...
```

**What it looks like when done:** The Discover tab has a search bar. Typing a name shows artist results with images, names, and genres.

---

### Stage 5 — Last.fm Integration & Discovery Score

**What you're building:** Fetch listener/play counts from Last.fm, calculate Discovery Score, display badges.

**Files to create:**

| File | What |
|---|---|
| `lib/lastfm.ts` | `getArtistInfo(name)` → listeners, plays, bio, tags, similar artists |
| `lib/discoveryScore.ts` | The scoring algorithm from the spec |
| `lib/artistCache.ts` | Cache combined Spotify + Last.fm data to Firestore `cachedArtists` |

**Discovery Score formula** (from spec):
```
listenerScore = clamp(log10(listeners) / 7, 0, 1)
playScore     = clamp(log10(plays) / 9, 0, 1)
fanScore      = clamp(log10(plays / listeners) / 2, 0, 1)
score         = 70*(1-listenerScore) + 20*playScore + 10*fanScore
```

**Environment variables:**
```
EXPO_PUBLIC_LASTFM_API_KEY=...
```

**What it looks like when done:** Each artist card now shows a Discovery Score badge (💎 Hidden Gem, 🌱 Underground, etc.) and the score number.

---

### Stage 6 — Artist Detail Screen

**What you're building:** The full artist profile page with all data points.

**Libraries to install:**
```
npx expo install react-native-chart-kit
```

**Files to modify/create:**

| File | What |
|---|---|
| `app/artist/[id].tsx` | Full detail screen |
| `components/PriceChart.tsx` | Line chart for historical prices |
| `components/TopTracksList.tsx` | Scrollable list of top tracks |
| `components/SimilarArtists.tsx` | Horizontal scroll of similar artists |
| `components/StatCard.tsx` | Listeners, plays, fan ratio, etc. |

**What it looks like when done:** Tapping an artist card navigates to a detail page showing: large image, bio, stats (listeners, plays, fan ratio), discovery score, current price, price chart, top tracks, similar artists, and Buy/Track buttons.

---

### Stage 7 — Stock Market (Buy/Sell System)

**What you're building:** The core investment system — buying shares, selling shares, recording transactions.

**Files to create:**

| File | What |
|---|---|
| `lib/stockPrice.ts` | Price calculation: `newPrice = oldPrice × (1 + growth × 0.7) × (1 + random(-0.02, 0.02))`. Clamped to 10–100. |
| `lib/investments.ts` | `buyShares(userId, artistId, shares)`, `sellShares(userId, investmentId)`, `getInvestments(userId)` |
| `lib/transactions.ts` | `recordTransaction(...)`, `getTransactions(userId)` |
| `components/BuyModal.tsx` | Bottom sheet modal: select shares → see cost → confirm |
| `components/SellModal.tsx` | Sell confirmation modal |

**Initial price for new artists:** `price = Math.max(10, Math.min(100, discoveryScore))`

**What it looks like when done:** On the artist detail page, tapping "Buy" opens a modal where you pick the number of shares, see the total cost, and confirm. Your coin balance updates. Selling returns coins.

---

### Stage 8 — Portfolio Screen

**What you're building:** The portfolio view showing all investments, P&L, and charts.

**Files to modify:**

| File | What |
|---|---|
| `app/(tabs)/portfolio.tsx` | Full portfolio screen |
| `components/InvestmentCard.tsx` | Shows artist, shares, purchase price, current price, P&L |
| `components/PortfolioSummary.tsx` | Total value, total P&L, coin balance |

**Calculations:**
- Current Value = shares × currentPrice
- P&L = Current Value − (shares × purchasePrice)
- Total Portfolio Value = sum of all Current Values

**What it looks like when done:** The Portfolio tab shows a summary card at top (total value, P&L with green/red), then a list of all investments with individual P&L. Each card has a Sell button.

---

### Stage 9 — Track Artists & Dashboard

**What you're building:** The tracking system and the main dashboard with all its widgets.

**Files to create/modify:**

| File | What |
|---|---|
| `lib/trackedArtists.ts` | `trackArtist(userId, artistId)`, `untrackArtist(...)`, `getTrackedArtists(userId)` |
| `app/(tabs)/index.tsx` | Dashboard with: coin balance, portfolio value, daily reward button, tracked artists carousel, recent investments, recommended artists |
| `components/DailyReward.tsx` | Claimable reward card with countdown timer |
| `components/TrackedArtistRow.tsx` | Row showing artist + score + price + change |

**Daily Reward Logic:**
- Check `lastRewardTimestamp` in Firestore
- If `now - lastReward >= 24h` → show claimable reward (+25 coins)
- On claim → update coins + timestamp

**What it looks like when done:** The Dashboard is the home screen. It shows your coin balance, portfolio snapshot, a "Claim Reward" button (with cooldown), tracked artists, and recent investments.

---

### Stage 10 — Playlist Generator

**What you're building:** The AI-powered playlist generator using Groq + Spotify.

**Files to create:**

| File | What |
|---|---|
| `app/(tabs)/playlist.tsx` | Multi-step form: genres → favorite artists → mood → length |
| `lib/groq.ts` | `generatePlaylistArtists(genres, artists, mood, length)` |
| `lib/playlistBuilder.ts` | For each Groq artist → Spotify search → get top tracks → pick 2-3 → create playlist |
| `components/GenrePicker.tsx` | Multi-select genre chips |
| `components/MoodPicker.tsx` | Mood selection grid |
| `components/PlaylistResult.tsx` | Shows generated playlist with tracks |

> [!IMPORTANT]
> Creating playlists on the user's Spotify requires **Spotify OAuth** (Authorization Code flow with PKCE), not just Client Credentials. You'll need `expo-auth-session` to handle the OAuth flow and request the `playlist-modify-public` scope.

**Environment variables:**
```
EXPO_PUBLIC_GROQ_API_KEY=...
```

**What it looks like when done:** The Playlist tab has a beautiful multi-step form. After submission, Groq suggests artists, the app pulls tracks from Spotify, creates a playlist, and shows the result.

---

### Stage 11 — Profile Screen

**What you're building:** User profile with stats, settings, and tracked artists overview.

**Files to modify:**

| File | What |
|---|---|
| `app/(tabs)/profile.tsx` | Profile screen: avatar, username, coins, stats, tracked artists, sign out |
| `components/StatRow.tsx` | Reusable stat display |

**What it looks like when done:** Profile screen shows user info, total stats (investments made, profit earned, artists tracked), and a sign-out button.

---

### Stage 12 — Background Price Updates

**What you're building:** A mechanism to update artist prices periodically.

> [!NOTE]
> True cron jobs can't run inside a mobile app. You have two options:
> 1. **Firebase Cloud Functions + Cloud Scheduler** (recommended) — a server-side function runs every 24h
> 2. **On-demand refresh** — prices update when a user views an artist (if `lastUpdated > 24h ago`)
>
> For Expo Go testing, option 2 is simpler. For production, implement option 1.

**Files to create:**

| File | What |
|---|---|
| `lib/priceRefresh.ts` | Check `lastUpdated`, if stale → fetch Last.fm → recalculate score → update price with growth + random factor → save to Firestore |
| (optional) `functions/` | Firebase Cloud Function for scheduled updates |

---

### Stage 13 — Polish & Animations

**What you're building:** The final layer of visual polish.

**Libraries to install:**
```
npx expo install react-native-reanimated lottie-react-native
```

**Polish items:**
- Glassmorphism cards with blur backgrounds (`expo-blur`)
- Smooth screen transitions via `react-native-reanimated`
- Coin animation on purchase/reward claim (Lottie)
- Pull-to-refresh on dashboard and portfolio
- Skeleton loading states
- Haptic feedback on buy/sell (`expo-haptics`)
- Error/empty state illustrations

---

## Open Questions

> [!IMPORTANT]
> **Spotify OAuth:** The playlist generator needs the user to log into Spotify (not just Clerk). Do you want to:
> - Add Spotify login as a **separate step** (e.g., "Connect Spotify" button in Profile)?
> - Or skip playlist creation on Spotify and just **show the playlist in-app** without saving to their account?

> [!IMPORTANT]
> **API Keys in Client:** React Native apps can't hide API keys the way a server can. For Expo Go testing this is fine, but for production you'd want a lightweight backend (e.g., Firebase Cloud Functions) to proxy Spotify/Last.fm/Groq calls. Are you okay with client-side API calls for now?

> [!IMPORTANT]
> **Landing Page:** The spec describes a web-style hero/landing page. For mobile, do you want:
> - A simple splash/welcome screen with "Sign In" and "Sign Up" buttons?
> - Or a multi-section scrollable onboarding with feature highlights?

---

## Summary of All Libraries

Here's every library you'll need across all stages in one block:

```bash
# Stage 1 — Scaffolding
npx create-expo-app@latest ./ --template blank-typescript
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
npx expo install expo-font @expo-google-fonts/inter
npx expo install react-native-svg

# Stage 2 — Auth
npx expo install @clerk/clerk-expo expo-secure-store expo-web-browser expo-auth-session

# Stage 3 — Firebase
npx expo install firebase

# Stage 6 — Charts
npx expo install react-native-chart-kit

# Stage 13 — Polish
npx expo install lottie-react-native expo-blur expo-haptics
```

---

## Verification Plan

### Per-Stage Testing
Each stage is testable on Expo Go immediately after implementation:
- **Stage 1:** App launches, tabs navigate
- **Stage 2:** Sign in/out works, session persists
- **Stage 3:** Firestore doc created, coins display
- **Stage 4:** Search returns Spotify results
- **Stage 5:** Discovery scores calculate and display
- **Stage 6:** Artist detail screen renders all data
- **Stage 7:** Buy/sell modifies coin balance and Firestore
- **Stage 8:** Portfolio shows investments with P&L
- **Stage 9:** Dashboard widgets populate, daily reward works
- **Stage 10:** Playlist generates and displays tracks
- **Stage 11:** Profile shows stats
- **Stage 12:** Prices refresh when stale
- **Stage 13:** Animations and polish visible
