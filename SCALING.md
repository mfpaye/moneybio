# MoneyBio — Scaling Architecture Notes
## Target: 50,000–100,000 concurrent users

---

## Where we are now vs where we need to be

### Supabase (Database layer)
Supabase runs on PostgreSQL. The free tier handles ~500 concurrent connections.
Pro tier ($25/mo) handles 3,000+ connections with PgBouncer connection pooling.
Team tier ($599/mo) handles 10,000+ connections.

For 50k–100k concurrent users, most won't be hitting the DB every second.
Realistic DB concurrency at 100k users = ~2,000–5,000 simultaneous queries.
That's achievable on Supabase Pro with connection pooling enabled.

**Actions needed:**
- Enable PgBouncer in Supabase dashboard (Settings → Database → Connection Pooling)
- Set pool_mode = transaction (not session) for API queries
- Keep pool size at 15–25 per instance

### Vercel (Frontend layer)
Vercel is a CDN — it scales infinitely automatically.
100k concurrent users on a static React app = no problem whatsoever.
Each user downloads the JS bundle once, then it runs in their browser.
Vercel's free tier handles this. No changes needed here.

### The real bottleneck: Supabase API calls
Every user action (load dashboard, add expense) = 1–5 Supabase queries.
At 50k concurrent users each making 1 query every 10 seconds = 5,000 queries/second.
That requires careful optimization.

---

## What we've already built correctly for scale

### 1. Row Level Security (RLS) — correct
All queries are filtered at the DB level by user_id = auth.uid().
This means queries never scan the whole table — they always use the user_id index.
A query from user A literally cannot touch user B's data, at the DB level.

### 2. Indexes — correct
Every table has indexes on user_id, created_at DESC, and foreign keys.
This means finding "all transactions for user X" is an index scan, not a table scan.
Performance stays constant whether we have 100 users or 10 million users.

### 3. Smart targeted search (voice/chat)
We search only UNMATCHED transactions in a date window — not the whole table.
This was intentionally designed for scale.

### 4. Views use SECURITY INVOKER
Our views (transaction_360, my_loans, monthly_budget_summary) are SECURITY INVOKER,
meaning they run as the calling user, not as a superuser.
This keeps RLS active inside views — correct for scale.

---

## What needs to change for 50k+ users

### Problem 1: N+1 queries in the frontend
Current Dashboard.jsx makes 3 separate Supabase calls on load:
  - transactions.list()
  - income.list()
  - categories.list()

At 50k users loading the dashboard simultaneously = 150k DB queries at once.

**Fix: Combine into one RPC call**
```sql
CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id UUID, p_month TEXT)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'recent_transactions', (...),
    'monthly_income', (...),
    'categories', (...),
    'budget_summary', (...)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```
3 queries → 1 query. 3x DB load reduction on the most-visited screen.

### Problem 2: No caching layer
Right now every page load hits the DB fresh.
Categories don't change often. System categories never change.
Price history for an item at a store doesn't change minute-to-minute.

**Fix: Supabase Edge Functions with cache headers**
```typescript
// Edge Function response with cache
return new Response(JSON.stringify(data), {
  headers: {
    'Cache-Control': 'public, max-age=300', // 5 min cache
    'Content-Type': 'application/json',
  }
})
```

**Fix: Browser-level caching with SWR or React Query**
```js
// Install: npm install swr
import useSWR from 'swr'
const { data: categories } = useSWR(
  `categories-${userId}`,
  () => categories.list(userId),
  { revalidateOnFocus: false, dedupingInterval: 300000 } // cache 5 min
)
```

### Problem 3: Real-time subscriptions at scale
Shopping list uses Supabase Realtime (WebSocket) for live sync.
At 100k users with active lists = 100k open WebSocket connections.
Supabase Pro handles ~10k concurrent realtime connections.
Supabase Team handles more, but at some point you need to self-host Realtime.

**Fix for now:** Only subscribe to realtime when the shopping list page is open.
Unsubscribe when user navigates away. Already done in our code with channel.unsubscribe().

**Fix at scale:** Use Supabase Realtime Broadcast instead of postgres_changes.
Broadcast is more efficient — doesn't tail the WAL log for every change.

### Problem 4: Image storage and OCR at scale
Receipt images go to Supabase Storage (S3-compatible).
OCR/AI processing should NOT happen synchronously on the API request.

**Correct architecture (already designed this way):**
User uploads image → Storage → triggers Edge Function → Edge Function calls Claude Vision API → writes results back to DB → notifies user via Realtime

The async queue pattern means 1,000 simultaneous receipt uploads don't slow each other down.
Each upload queues independently and processes as capacity allows.

### Problem 5: price_history table will get huge
With 100k users each contributing prices, this table could have 50M+ rows within a year.
Our find_nearby_prices() function uses PostGIS spatial index + GIN text index.
Both are correct. But we should add:

```sql
-- Partition price_history by month
-- Automatically drop data older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_prices() RETURNS void AS $$
  DELETE FROM price_history WHERE observed_at < NOW() - INTERVAL '90 days';
$$ LANGUAGE sql;

-- Run weekly via pg_cron
SELECT cron.schedule('cleanup-prices', '0 3 * * 0', 'SELECT cleanup_old_prices()');
```

### Problem 6: The auto_reconcile() function
Currently runs per-user on demand.
At scale, this should be a background job, not triggered by user action.

**Fix:** Schedule via pg_cron to run nightly for all users with new bank transactions:
```sql
SELECT cron.schedule(
  'nightly-reconcile',
  '0 2 * * *',  -- 2am every night
  $$
    SELECT auto_reconcile(id) FROM profiles
    WHERE id IN (
      SELECT DISTINCT user_id FROM bank_transactions
      WHERE reconciliation_status = 'unmatched'
      AND imported_at > NOW() - INTERVAL '24 hours'
    )
  $$
);
```

---

## Cost at 100k active users

| Service | Current | At 100k users |
|---------|---------|---------------|
| Supabase | Free | ~$599/mo (Team) |
| Vercel | Free | ~$20/mo (Pro) |
| Plaid | Free (dev) | ~$500/mo (500 connected accounts) |
| Claude API (OCR) | $0 | ~$200/mo (at 10k scans/mo) |
| **Total** | **$0** | **~$1,300/mo** |

At $1,300/mo operational cost with 100k users:
- Free tier: $0/mo → sustainable indefinitely for early users
- $5/mo subscription: break even at 260 paying users
- $9.99/mo: break even at 130 paying users

---

## Priority order for fixes before launch

1. **Enable PgBouncer** in Supabase dashboard — 10 minutes, massive impact
2. **Add SWR/React Query** for client-side caching — 1 day of work
3. **Combine dashboard queries** into single RPC — 2 hours
4. **Add pg_cron for nightly reconcile** — 1 hour
5. **Add price_history cleanup** — 30 minutes
6. **Add rate limiting** on Edge Functions — prevent abuse
7. **Load test** with k6 or Artillery before any marketing push
