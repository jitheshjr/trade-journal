# Trade Journal

A personal trade tracking application built for Indian equity traders who are serious about learning from their trades. Log every trade, see accurate P&L after real brokerage charges, analyze patterns, and document your strategies — all in one place.

![Stack](https://img.shields.io/badge/React-Vite-blue) ![Supabase](https://img.shields.io/badge/Backend-Supabase-green) ![Tailwind](https://img.shields.io/badge/Styling-TailwindCSS_v4-cyan)

---

## Features

### Trade Logging
- Log intraday and swing trades with full details — symbol, direction (long/short), quantity, entry/exit prices, dates
- Track trade status — Open, Closed, or Partial exit
- Attach chart screenshots to each trade
- Reflection fields — exit reason, emotion tag, setup quality rating, and freeform notes for mistakes

### Accurate P&L Calculation
- Automatic gross and net P&L calculation
- Real brokerage charges for **Zerodha Kite** and **Firstock** — including STT, exchange fees, SEBI charges, stamp duty, and GST
- Itemized charges breakdown per trade
- Live P&L preview while filling the trade form

### Risk Management
- Planned SL and target price fields
- Automatic Risk:Reward ratio calculation (planned and actual)

### Multi-Broker Support
- Add multiple broker accounts with separate starting capital
- Track capital growth per broker account
- Each trade linked to a specific broker

### Insights & Analytics (Desktop)
- Equity curve chart
- Daily P&L bar chart
- Win rate and P&L by strategy
- Symbol performance breakdown
- Emotion analysis — see how FOMO, revenge trading, etc. affect your results
- Exit reason analysis
- Intraday vs Swing split
- Key metrics — profit factor, average win/loss, actual R:R, total charges paid

### Personal Playbook
- Rich text editor for documenting strategies and patterns
- Step-by-step instruction format with headings, bullet points, bold, blockquotes
- Tag-based organization and search
- Separate notes for each strategy — timeframes, entry rules, exit rules, observations

### Journal
- Full trade history with filters — broker, strategy, symbol, type, direction, status, date range
- Expandable trade cards with all details inline
- Edit any trade after logging
- Summary bar — total P&L, win rate, avg win/loss

### Dashboard
- Today's P&L at a glance
- All-time P&L and win rate
- Open positions tracker
- Equity curve
- Recent trades
- Current win/loss streak
- Broker account balances with growth %

### Auth
- Magic link login — no passwords
- Stay signed in until you sign out
- All data is private — row-level security enforced at the database level

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 + custom CSS design system |
| State | Zustand |
| Backend | Supabase (Postgres + Auth + Storage) |
| Charts | Recharts |
| Rich Text | Tiptap |
| Fonts | Syne + JetBrains Mono |

---

## Project Structure