# OmniDevX Scanner

A production-quality QR code and barcode scanner web app with real-time cloud sync. Scan barcodes and QR codes directly in the browser using your device camera, with all scans stored in Supabase and synced in real time across devices.

## Features

- **Multi-format scanning** — QR Code, EAN-13, EAN-8, Code 128, Code 39, UPC-A, UPC-E, Data Matrix, PDF 417, Aztec, and more
- **Real-time cloud sync** — Powered by Supabase Realtime; all scans sync instantly across devices
- **Offline mode** — Falls back to localStorage when Supabase is not configured
- **iOS Safari support** — Uses `playsInline` and `autoPlay` attributes required by iOS
- **Android Chrome support** — Requests back-facing camera by default via `facingMode: environment`
- **Manual entry fallback** — Enter codes manually when camera is unavailable or access is denied
- **Scan history** — Searchable, filterable history with timestamps and device info
- **CSV export** — Export all scan history to a CSV file
- **Duplicate prevention** — Same scan value within 2 seconds is ignored
- **Animated scanning overlay** — Laser line animation and corner brackets for intuitive UX
- **Mobile-first design** — Tailwind CSS with dark theme, smooth animations, touch-friendly controls

## Tech Stack

| Layer        | Technology                               |
|--------------|------------------------------------------|
| Framework    | React 18 + TypeScript                    |
| Build tool   | Vite 5                                   |
| Styling      | Tailwind CSS 3                           |
| Scanning     | @zxing/browser + @zxing/library          |
| Database     | Supabase (PostgreSQL + Realtime)         |
| Deployment   | Vercel                                   |
| Icons        | Lucide React                             |
| Dates        | date-fns                                 |

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Supabase project (free tier works fine)

## Setup

### 1. Install dependencies

```bash
cd "OmniDevX Studio"
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** in the Supabase dashboard
3. Paste and run the contents of `supabase/migrations/001_create_scans.sql`
4. Copy your **Project URL** and **anon public** key from **Settings > API**
5. Paste them into your `.env` file

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To test on a mobile device, find your local IP address and open `http://YOUR_IP:3000` in Safari or Chrome.

**Note:** Camera access requires HTTPS in production. On localhost it works without HTTPS.

## Deployment to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

When prompted, add your environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Option B: Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add environment variables in **Settings > Environment Variables**
4. Deploy — Vercel auto-detects Vite

The `vercel.json` file already includes SPA rewrites so deep links work correctly.

## Environment Variables

| Variable              | Required | Description                               |
|-----------------------|----------|-------------------------------------------|
| `VITE_SUPABASE_URL`   | No*      | Your Supabase project URL                 |
| `VITE_SUPABASE_ANON_KEY` | No*   | Your Supabase anonymous (public) API key  |

*If omitted, the app runs in offline mode using localStorage.

## Project Structure

```
src/
  components/
    Scanner.tsx       # Camera scanner with ZXing, overlay, iOS/Android support
    ScanHistory.tsx   # Searchable scan history with CSV export
    ManualEntry.tsx   # Manual code entry form
    Toast.tsx         # Toast notification system + hook
  hooks/
    useScans.ts       # Supabase data fetching, real-time subscription, addScan
  lib/
    supabase.ts       # Supabase client initialization
  types/
    index.ts          # TypeScript types
  App.tsx             # Root component, tabs, scan handler
  main.tsx            # React entry point
  index.css           # Tailwind directives + custom animations
supabase/
  migrations/
    001_create_scans.sql  # Database schema
```

## Browser Support

| Browser              | Supported |
|----------------------|-----------|
| iOS Safari 14+       | Yes       |
| Android Chrome 90+   | Yes       |
| Desktop Chrome       | Yes       |
| Desktop Firefox      | Yes       |
| Desktop Safari       | Yes       |

## License

MIT
