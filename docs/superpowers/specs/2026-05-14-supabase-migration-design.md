# Supabase Migration Design
_Date: 2026-05-14_

## Goal

Replace the current flat-file storage (`data.json` + `project/data.jsx`) with a hosted Supabase PostgreSQL database. The GitHub Pages static frontend reads data directly from Supabase using the public anon key. Writes (new monthly entries) are done via curl with the service role key — same workflow as today, different URL.

---

## Architecture

```
GitHub Pages (static)          Supabase (hosted)
┌─────────────────────┐        ┌──────────────────────────┐
│  project/index.html │        │  PostgreSQL DB           │
│  app.jsx            │──────▶ │    funds table           │
│  charts.jsx etc.    │  anon  │    entries table         │
│  (no data.jsx)      │  key   │                          │
└─────────────────────┘        │  PostgREST REST API      │
                                │  (auto-generated)        │
         You (curl/script)      │                          │
         ──────────────────────▶│  RLS policies            │
              service role key  │    reads: public         │
                                │    writes: service role  │
                                └──────────────────────────┘
```

**Files deleted:** `server.js`, `data.json`, `.api-key`, `project/data.jsx`  
**Files added:** `project/supabase.js`  
**Files modified:** `project/app.jsx` (fetch on mount, loading state)  
**Files unchanged:** `project/charts.jsx`, `project/kpi.jsx`, `project/table.jsx`, `project/comparison.jsx`, `project/tweaks-panel.jsx`

---

## Database Schema

```sql
-- Fund metadata (3 static rows: yelin, mor, analyst)
CREATE TABLE funds (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  short   text NOT NULL,
  hebrew  text NOT NULL,
  accent  text NOT NULL
);

-- Monthly price snapshots
CREATE TABLE entries (
  id      serial PRIMARY KEY,
  fund_id text    NOT NULL REFERENCES funds(id),
  date    date    NOT NULL,
  price   numeric NOT NULL,
  note    text,        -- 'deposit' | 'withdrawal' | null
  flow    numeric,     -- positive = inflow, negative = outflow (ILS)
  UNIQUE (fund_id, date)
);

-- Row Level Security
ALTER TABLE funds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read funds"   ON funds   FOR SELECT USING (true);
CREATE POLICY "public read entries" ON entries FOR SELECT USING (true);
-- Writes: service role key bypasses RLS by default in Supabase
```

**Migration:** All existing data from `data.json` is seeded into Supabase as part of the migration (3 fund rows + all entries).

---

## Frontend Changes

### New file: `project/supabase.js`

```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
)
```

The anon key is safe to expose — RLS ensures it can only read.

### Modified: `project/app.jsx`

- On mount, fetch both tables in parallel:
  ```js
  const [{ data: funds }, { data: entries }] = await Promise.all([
    supabase.from('funds').select('*'),
    supabase.from('entries').select('*').order('date')
  ])
  ```
- Reshape entries into `fund.raw[]` arrays to match the structure all child components already consume — **no changes needed in any other component**.
- Add a loading spinner while the fetch resolves.
- Add a basic error state if Supabase is unreachable.

---

## Write Workflow

Adding a monthly entry (same UX as before, different URL):

```bash
# Plain entry
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/entries' \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fund_id":"yelin","date":"2026-07-01","price":185000}'

# With deposit
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/entries' \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"fund_id":"yelin","date":"2026-07-01","price":185000,"note":"deposit","flow":50000}'
```

The `Prefer: resolution=merge-duplicates` header enables upsert behaviour (same as the old API's date-based deduplication).

**Fund IDs:** `yelin` · `mor` · `analyst`

---

## What Does NOT Change

- All chart, KPI, table, and comparison components — they receive the same `fund.raw[]` data shape
- The GitHub Pages deployment process
- The dashboard URL

---

## Out of Scope

- Authentication / login UI
- Supabase Edge Functions
- Any new dashboard features
