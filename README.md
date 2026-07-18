# MoneyBio 💛
### *Your money, alive.*

---

## 📱 How to demo from your phone in 10 minutes

### Option A — Vercel (recommended, permanent URL)

**Step 1 — Push to GitHub**
```bash
# In Terminal, go to the project folder
cd pocketledger

# Initialize git
git init
git add .
git commit -m "MoneyBio initial build"

# Create a new repo at github.com called "moneybio" then:
git remote add origin https://github.com/YOUR_USERNAME/moneybio.git
git branch -M main
git push -u origin main
```

**Step 2 — Deploy to Vercel (free)**
1. Go to **vercel.com** → sign up with GitHub
2. Click **"Add New Project"** → select your `moneybio` repo
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://xooprlfjyhakcrxilwvs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb3BybGZqeWhha2NyeGlsd3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDg0NTAsImV4cCI6MjA5OTgyNDQ1MH0.nxqVf6xFP35aLJKL-udLx9VTitwSz_LUnuiRxNfgkbc`
4. Click **Deploy**
5. ✅ Your app is live at `moneybio.vercel.app`

**Step 3 — Open on your phone**
- Text yourself the URL
- Open it in Safari (iPhone) or Chrome (Android)
- Tap the share icon → **"Add to Home Screen"**
- It installs like a native app with your own icon

---

### Option B — Run locally and access from phone (same WiFi)

```bash
# Install dependencies
npm install

# Start dev server accessible on your network
npx vite --host

# Terminal will show something like:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.1.45:5173/  ← type THIS on your phone
```

Open the Network URL on your phone (both must be on same WiFi).

---

## 🔐 Supabase setup (one-time)

Before the app works you need two Storage buckets:
1. Go to **supabase.com** → your project → **Storage**
2. Create bucket: `receipts` → set to **Public**
3. Create bucket: `loan-proofs` → set to **Public**

To enable Google login:
1. Go to **Authentication → Providers → Google**
2. Enable it and add your Google OAuth credentials

---

## 📋 What to demo (suggested flow)

1. **Sign up** with your email → check email to confirm
2. **Dashboard** → see KPIs, donut chart (tap segments), price savings
3. **Add expense** → Expenses page → "+ Add expense"
4. **Voice & Chat** → tap a quick prompt → watch it parse your purchase
5. **Scan receipts** → Scan & Capture → select multiple photos
6. **Shopping list** → check off items, see price savings
7. **Price compare** → search "chicken breast"
8. **Loans** → create a loan, copy invite link
9. **Analytics** → interactive charts
10. **Language toggle** → bottom of sidebar → switch to FR

---

## 🏗 Tech stack
- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Database**: 30+ tables, PostGIS, pgvector
- **Hosting**: Vercel

## 🗄 Supabase project
- **URL**: `https://xooprlfjyhakcrxilwvs.supabase.co`
- **Region**: us-east-2 (closest to Atlanta)
