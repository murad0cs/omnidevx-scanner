# OmniScan

A browser-based QR code and barcode scanner that works directly on your phone — no app install needed. Point your camera, it scans, the result goes straight to a cloud database, and you can see everything update in real time across all your devices.

Built with React, TypeScript, Supabase, and deployed on Vercel.

---

## What it does

- Scans QR codes, EAN-13, EAN-8, Code 128, Code 39, UPC, Data Matrix, PDF 417, and more
- Camera access via WebRTC — works on iOS Safari and Android Chrome out of the box
- Every scan is saved to Supabase and shows up instantly without a page refresh
- Manual entry fallback if the camera can't be used
- Torch toggle (on supported Android devices)
- Scan history with search, CSV export, delete, and clear all
- URL scans are clickable links
- Duplicate scan prevention — same value within 3 seconds is ignored
- Offline mode using localStorage if Supabase credentials aren't configured

---

## Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| Scanner | @zxing/browser + @zxing/library |
| Database | Supabase (Postgres + Realtime) |
| Hosting | Vercel |

---

## Getting started

You'll need Node 18+ and a Supabase project.

```bash
git clone https://github.com/murad0cs/omnidevx-scanner
cd omnidevx-scanner
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase credentials (Project URL and anon key from Settings → API):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL migration in your Supabase SQL Editor (`supabase/migrations/001_create_scans.sql`), then:

```bash
npm run dev
```

The app runs at `http://localhost:3000`. To test on a phone on the same network, use your local IP instead — camera access works on localhost without HTTPS.

---

## Database setup

Open the Supabase SQL Editor and run the contents of `supabase/migrations/001_create_scans.sql`. That creates the `scans` table, adds an index on `timestamp`, sets up RLS policies, and enables realtime.

---

## Deploying

Push to GitHub, then import the repo on [vercel.com](https://vercel.com). Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables before deploying. Vercel picks up Vite automatically — no extra configuration needed. The `vercel.json` handles SPA routing.

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

If neither is set, the app falls back to localStorage and runs fully offline.

---

## Project layout

```
src/
  components/
    Scanner.tsx       # Camera + ZXing, torch toggle, overlay, iOS/Android handling
    ScanHistory.tsx   # Searchable history, CSV export, URL detection
    ManualEntry.tsx   # Manual code entry form
    Toast.tsx         # Toast notifications
  hooks/
    useScans.ts       # Supabase data + realtime subscription
  lib/
    supabase.ts       # Client init
  types/
    index.ts
supabase/
  migrations/
    001_create_scans.sql
```

---

## Browser support

Tested on iOS Safari 15+, Android Chrome 90+, and modern desktop browsers. Camera access requires HTTPS in production (Vercel handles this automatically).
