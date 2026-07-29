Artist Exchange - Complete Application Specification
1. Project Overview
Name

Artist Exchange

Elevator Pitch

Artist Exchange is a gamified music discovery platform that combines music recommendations with a virtual stock market.

Instead of investing in companies, users invest virtual coins into up-and-coming artists they believe will become more popular in the future.

The application encourages users to discover hidden gems before they become mainstream.

The app also generates personalized playlists made entirely of smaller artists using AI.

No real money is involved.

2. Primary Goals

The application should accomplish four major goals:

Discover Smaller Artists

Help users find artists they otherwise would never have found.

Gamify Music Discovery

Instead of simply recommending artists, users can invest virtual coins into artists they believe will grow.

Personalized Playlist Generation

Generate Spotify playlists containing hidden gems based on genres and favorite artists.

Artist Tracking

Allow users to follow artists and monitor their growth over time.

3. Tech Stack
Frontend
Next.js (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Authentication

Clerk

Features:

Google Sign-In
Email/Password
Session Management
Protected Routes

Clerk User ID will be the primary identifier stored in Firestore.

Database

Firebase Firestore

Collections:

users
artists
cachedArtists
investments
transactions
trackedArtists
dailyRewards
APIs
Spotify API

Used for:

OAuth (optional if using Spotify login later)
Search Artists
Artist Images
Artist Metadata
Top Tracks
Playlist Creation
User Playlist Library
Last.fm API

Used for:

Listener Count
Play Count
Similar Artists
Artist Tags
Artist Bio
Groq API

Used for:

AI playlist generation
Artist recommendations
JSON responses
4. App Navigation
Landing Page

Contains:

Hero section
App explanation
Features
Login button
Sign Up button
Dashboard

Displays

Coin Balance

Portfolio Value

Today's Reward

Tracked Artists

Recent Investments

Recommended Artists

Discovery Feed
Discover

Search artists.

Displays

Artist

Image

Discovery Score

Current Price

Buy Button

Track Button

View Details
Artist Details

Displays

Spotify Image

Biography

Listeners

Plays

Fan Ratio

Discovery Score

Current Price

Historical Price

Top Tracks

Buy Shares

Track Artist
Portfolio

Displays

Current Coins

Total Portfolio Value

Profit/Loss

Current Investments

Investment History

Charts
Playlist Generator

User fills out a form.

Generates:

Spotify playlist of hidden gems.

Profile

Displays

Coins

Statistics

Favorite Artists

Tracked Artists

Achievements (future)

Settings
5. User System

Each user has:

Clerk User ID

Display Name

Email

Coin Balance

Join Date

Last Daily Reward

Portfolio Value

Tracked Artists

Starting Coins

1000 Coins
6. Daily Login Rewards

Users receive coins every 24 hours.

Example

Day 1

+25 Coins

Reward cannot be claimed again until

24 Hours

Firestore stores

lastRewardTimestamp

Algorithm

If

Current Time

-

Last Reward

>=24 hours

↓

Give Reward

↓

Update Timestamp
7. Artist Discovery Score

The Discovery Score determines how "hidden" an artist is.

Uses only Last.fm metrics.

Inputs
listeners

plays

Fan Ratio

plays / listeners
Formula

Listener Score

listenerScore =
clamp(log10(listeners)/7)

Play Score

playScore =
clamp(log10(plays)/9)

Fan Score

fanScore =
clamp(log10(plays/listeners)/2)

Final

Discovery Score =
70*(1-listenerScore)
+
20*(playScore)
+
10*(fanScore)

Final Score

0-100
Categories
90-100

💎 Hidden Gem

75-89

🌱 Underground

60-74

⭐ Emerging

40-59

🔍 Growing

20-39

⭐ Established

0-19

🌍 Mainstream
8. Artist Stock Market

This is the main feature.

Every artist has:

Current Price

Discovery Score

Listeners

Plays

Users buy shares using virtual coins.

Buying

Example

Current Price

34 Coins

Buy

12 Shares

Cost

408 Coins

Investment stored

Artist ID

Purchase Price

Purchase Date

Shares
Selling

At any time

Current Price

52 Coins

12 Shares

Receive

624 Coins

Coins return to user.

Investment removed.

Transaction added.

9. Stock Price Algorithm

Discovery Score does not directly determine the stock price.

Discovery Score determines whether an artist qualifies for investment.

The stock price is determined by growth.

Each day

Yesterday

Listeners

Today

Listeners

Calculate

Growth %

=
(today-yesterday)

/ yesterday

Update

newPrice

=

oldPrice

×

(1

+

growth

×

multiplier)

Example

Old Price

40

Growth

20%

Multiplier

0.5

New Price

44

Negative growth

Old Price

40

Growth

-10%

New Price

38

This creates risk and reward.

Price Limits

Never allow

Price

<10

or

>100

Clamp values.

10. Portfolio

Each investment stores

Artist

Shares

Purchase Price

Purchase Date

Portfolio calculates

Current Value

=

Shares

×

Current Price

Profit

Current Value

-

Purchase Value
11. Tracked Artists

Users may track artists.

Dashboard shows

Artist

Discovery Score

Current Price

Price Change

Listeners

Plays
12. Playlist Generator

Second major feature.

User Form

Genres

Required

Examples

Rock

Hip-Hop

Jazz

EDM

Alternative

Bedroom Pop

Dream Pop

Favorite Artists

Optional

Examples

Mac DeMarco

Clairo

Tyler, the Creator

Mood

Optional

Driving

Workout

Relaxing

Focus

Late Night

Happy

Sad

Playlist Length

20

30

40

50 Songs
Groq Prompt

The backend sends

Generate a playlist.

Genres:
Dream Pop
Bedroom Pop

Favorite Artists:
Mac DeMarco
Clairo

Rules:

Recommend mostly smaller artists.

Avoid mainstream artists.

Return JSON only.

Do not explain anything.

Groq returns

{
  "artists":[
      "Artist 1",
      "Artist 2"
  ]
}

Backend

For each artist

Spotify

↓

Top Tracks

↓

Take

2-3 Songs

↓

Shuffle

↓

Create Playlist

↓

Add Playlist to User's Spotify

13. Search

Search bar

Uses Spotify Search API.

Returns

Image

Name

Genres (if available)

Discovery Score

Current Price
14. Artist Details Page

Displays

Spotify Image

Biography

Listeners

Plays

Fan Ratio

Discovery Score

Current Price

Historical Prices

Similar Artists

Top Tracks

Buttons

Buy

Track

Open Spotify
15. Firestore Structure
users
clerkUserId

username

email

coins

lastReward

portfolioValue

createdAt
artists
spotifyId

lastFmName

name

image

listeners

plays

fanRatio

discoveryScore

currentPrice

previousPrice

lastUpdated
investments
investmentId

userId

artistId

shares

purchasePrice

purchaseDate
trackedArtists
userId

artistId
transactions
transactionId

userId

artistId

BUY

SELL

shares

price

timestamp
cachedArtists
spotifyId

listeners

plays

discoveryScore

currentPrice

lastUpdated
16. Daily Background Job

Runs once every 24 hours.

For every cached artist

↓

Fetch Last.fm

↓

Update listeners

↓

Update plays

↓

Recalculate Discovery Score

↓

Calculate Listener Growth

↓

Update Stock Price

↓

Save Firestore

Can be implemented using Firebase Cloud Functions with Cloud Scheduler (or another scheduled backend service).

17. UI Theme

Dark Mode

Spotify-inspired

Accent

Green

Purple

Blue

Cards

Rounded

Glassmorphism

Animated hover effects

Smooth transitions

18. Future Features

Achievements

Leaderboards

Friends

Artist News

Weekly Challenges

Community Portfolios

Notifications

Genre Challenges

AI Investment Advisor

19. Complete User Flow
Landing Page
      │
      ▼
Login with Clerk
      │
      ▼
Dashboard
      │
      ├─────────────┐
      │             │
      ▼             ▼
 Discover      Playlist Generator
      │             │
      │             ▼
      │        User Form
      │             │
      │             ▼
      │         Groq API
      │             │
      │             ▼
      │      Recommended Artists
      │             │
      └──────┐      ▼
             ▼
      Spotify Search
             │
             ▼
        Last.fm Lookup
             │
             ▼
    Discovery Score Calculation
             │
             ▼
     Artist Details Page
             │
     ┌───────┴────────┐
     ▼                ▼
 Buy Shares      Track Artist
     │                │
     ▼                ▼
Portfolio      Dashboard Updates
     │
     ▼
Daily Background Job
     │
     ▼
Refresh Listener Counts
     │
     ▼
Update Discovery Scores
     │
     ▼
Update Stock Prices
     │
     ▼
Portfolio Value Changes
20. Recommended Development Roadmap
Phase 1: Project Setup
Create the Next.js project with TypeScript.
Configure Tailwind CSS and shadcn/ui.
Set up Clerk authentication.
Set up Firebase and Firestore.
Configure environment variables for Spotify, Last.fm, Groq, Clerk, and Firebase.
Phase 2: Core Infrastructure
Implement user authentication.
Create Firestore collections.
Build the landing page, dashboard shell, and navigation.
Integrate Spotify artist search.
Phase 3: Artist Data
Integrate Last.fm lookups.
Cache artist data in Firestore.
Implement the Discovery Score calculation.
Build the artist detail page.
Phase 4: Investment System
Implement virtual coins.
Build buy/sell workflows.
Create the portfolio page.
Record transactions.
Add daily login rewards.
Phase 5: Playlist Generation
Build the playlist generation form.
Integrate the Groq API.
Convert recommended artists into Spotify tracks.
Create playlists directly in the user's Spotify account.
Phase 6: Background Services
Schedule daily updates of Last.fm metrics.
Recalculate Discovery Scores and stock prices.
Refresh portfolio values.
Optimize caching and API usage.
Phase 7: Polish & Deployment
Add animations, charts, and responsive layouts.
Improve error handling and loading states.
Test edge cases.
Deploy the frontend (e.g., Vercel) and backend services.
Monitor API usage and performance.
One Suggested Improvement

There's one design change I'd recommend because it makes the game much more engaging.

Instead of making stock prices depend only on Last.fm listener growth, introduce a simple Market Sentiment factor that slightly changes prices each day:

newPrice =
oldPrice
× (1 + listenerGrowth × 0.7)
× (1 + random(-0.02, 0.02))

The ±2% random variation simulates normal market fluctuations. Even if an artist's listener count doesn't change much on a given day, their price can still move slightly, making the market feel alive. Larger listener growth still has the biggest impact, but portfolios won't look completely static between updates.

This keeps the game fun without making it unpredictable, and it more closely resembles how real financial markets behave.