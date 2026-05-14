# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `data.json` + `project/data.jsx` hardcoded data with a hosted Supabase PostgreSQL database, keeping GitHub Pages as the static host.

**Architecture:** The React frontend fetches funds and entries from Supabase's auto-generated REST API (PostgREST) using the public anon key on mount. Writes continue via curl with the service role key. No SDK is needed — plain `fetch()` works since this is a non-module Babel-standalone setup.

**Tech Stack:** Supabase (PostgreSQL + PostgREST), vanilla `fetch()`, React 18 (UMD CDN), Babel standalone

---

## File Map

| Action | File |
|--------|------|
| Create | `docs/sql/schema.sql` |
| Create | `docs/sql/seed.sql` |
| Create | `project/supabase-config.js` |
| Modify | `project/index.html` |
| Modify | `project/data.jsx` |
| Modify | `project/app.jsx` |
| Delete | `server.js` |
| Delete | `data.json` |
| Delete | `.api-key` |

---

## Task 1: Create Supabase project (manual)

**Files:** none — browser-only step

- [ ] **Step 1: Create a free Supabase account and project**

  Go to https://supabase.com → New project. Choose any region. Save the database password somewhere safe.

- [ ] **Step 2: Copy your project credentials**

  In the Supabase dashboard → Project Settings → API:
  - Copy **Project URL** (looks like `https://abcdefgh.supabase.co`)
  - Copy **anon / public key** (long JWT string)
  - Copy **service_role key** (keep this private — never commit it)

---

## Task 2: Write schema SQL

**Files:**
- Create: `docs/sql/schema.sql`

- [ ] **Step 1: Create the SQL file**

  Create `docs/sql/schema.sql` with this exact content:

  ```sql
  -- Fund metadata (3 static rows)
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
    note    text,
    flow    numeric,
    UNIQUE (fund_id, date)
  );

  -- Row Level Security: public reads, writes require service role key
  ALTER TABLE funds   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "public read funds"   ON funds   FOR SELECT USING (true);
  CREATE POLICY "public read entries" ON entries FOR SELECT USING (true);
  ```

- [ ] **Step 2: Run schema in Supabase**

  In Supabase dashboard → SQL Editor → New query. Paste the contents of `docs/sql/schema.sql` and click Run.

  Expected result: "Success. No rows returned"

- [ ] **Step 3: Verify tables exist**

  In Supabase → Table Editor. You should see `funds` and `entries` listed.

---

## Task 3: Write and run seed SQL

**Files:**
- Create: `docs/sql/seed.sql`

- [ ] **Step 1: Create the seed file**

  Create `docs/sql/seed.sql` with this exact content:

  ```sql
  INSERT INTO funds (id, name, short, hebrew, accent) VALUES
    ('yelin',   'Yelin Lapidot', 'Yelin',   'ילין לפידות', 'oklch(0.55 0.13 145)'),
    ('mor',     'Mor',           'Mor',     'מור',         'oklch(0.55 0.13 250)'),
    ('analyst', 'Analyst',       'Analyst', 'אנליסט',      'oklch(0.55 0.13 50)');

  INSERT INTO entries (fund_id, date, price, note, flow) VALUES
  -- Yelin (19 rows)
  ('yelin', '2024-12-01', 79875,  'deposit',    79000),
  ('yelin', '2025-01-01', 80055,  NULL, NULL),
  ('yelin', '2025-02-01', 81939,  NULL, NULL),
  ('yelin', '2025-03-01', 80875,  NULL, NULL),
  ('yelin', '2025-04-01', 78423,  NULL, NULL),
  ('yelin', '2025-05-01', 78932,  NULL, NULL),
  ('yelin', '2025-06-01', 83043,  NULL, NULL),
  ('yelin', '2025-07-01', 86795,  NULL, NULL),
  ('yelin', '2025-08-01', 88648,  NULL, NULL),
  ('yelin', '2025-09-01', 156860, 'deposit',    67300),
  ('yelin', '2025-10-01', 161420, NULL, NULL),
  ('yelin', '2025-11-01', 165461, NULL, NULL),
  ('yelin', '2025-12-01', 167282, NULL, NULL),
  ('yelin', '2026-01-01', 169528, NULL, NULL),
  ('yelin', '2026-02-01', 174162, NULL, NULL),
  ('yelin', '2026-03-01', 175299, NULL, NULL),
  ('yelin', '2026-04-01', 167191, NULL, NULL),
  ('yelin', '2026-05-01', 180702, NULL, NULL),
  ('yelin', '2026-06-01', 0,      'withdrawal', -180702),
  -- Mor (17 rows)
  ('mor', '2025-01-01', 81000,  'deposit',    81000),
  ('mor', '2025-02-01', 82834,  NULL, NULL),
  ('mor', '2025-03-01', 81618,  NULL, NULL),
  ('mor', '2025-04-01', 82159,  NULL, NULL),
  ('mor', '2025-05-01', 86667,  NULL, NULL),
  ('mor', '2025-06-01', 90580,  NULL, NULL),
  ('mor', '2025-07-01', 92329,  NULL, NULL),
  ('mor', '2025-08-01', 92962,  NULL, NULL),
  ('mor', '2025-09-01', 96151,  NULL, NULL),
  ('mor', '2025-10-01', 98206,  NULL, NULL),
  ('mor', '2025-11-01', 99545,  NULL, NULL),
  ('mor', '2025-12-01', 100818, NULL, NULL),
  ('mor', '2026-01-01', 105398, NULL, NULL),
  ('mor', '2026-02-01', 106665, NULL, NULL),
  ('mor', '2026-03-01', 106665, NULL, NULL),
  ('mor', '2026-04-01', 110063, NULL, NULL),
  ('mor', '2026-05-01', 0,      'withdrawal', -110063),
  -- Analyst (19 rows)
  ('analyst', '2024-12-01', 79616,  'deposit',    79616),
  ('analyst', '2025-01-01', 79916,  NULL, NULL),
  ('analyst', '2025-02-01', 82345,  NULL, NULL),
  ('analyst', '2025-03-01', 80955,  NULL, NULL),
  ('analyst', '2025-04-01', 78325,  NULL, NULL),
  ('analyst', '2025-05-01', 78231,  NULL, NULL),
  ('analyst', '2025-06-01', 82242,  NULL, NULL),
  ('analyst', '2025-07-01', 86613,  NULL, NULL),
  ('analyst', '2025-08-01', 88351,  NULL, NULL),
  ('analyst', '2025-09-01', 89131,  NULL, NULL),
  ('analyst', '2025-10-01', 92175,  NULL, NULL),
  ('analyst', '2025-11-01', 94037,  NULL, NULL),
  ('analyst', '2025-12-01', 94816,  NULL, NULL),
  ('analyst', '2026-01-01', 95689,  NULL, NULL),
  ('analyst', '2026-02-01', 181854, 'deposit',    86165),
  ('analyst', '2026-03-01', 182156, NULL, NULL),
  ('analyst', '2026-04-01', 174452, NULL, NULL),
  ('analyst', '2026-05-01', 189702, NULL, NULL),
  ('analyst', '2026-06-01', 0,      'withdrawal', -189702);
  ```

- [ ] **Step 2: Run seed in Supabase SQL Editor**

  Paste the contents of `docs/sql/seed.sql` into a new SQL Editor query and click Run.

  Expected: "Success. No rows returned"

- [ ] **Step 3: Verify row counts**

  Run this in the SQL Editor:
  ```sql
  SELECT fund_id, COUNT(*) FROM entries GROUP BY fund_id ORDER BY fund_id;
  ```
  Expected output:
  ```
  analyst | 19
  mor     | 17
  yelin   | 19
  ```

---

## Task 4: Create supabase-config.js

**Files:**
- Create: `project/supabase-config.js`

- [ ] **Step 1: Create the config file**

  Create `project/supabase-config.js`. Replace both values with your real credentials from Task 1 Step 2:

  ```js
  window.SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
  ```

  The anon key is safe to commit — RLS restricts it to read-only. Never put the service_role key here.

---

## Task 5: Update index.html

**Files:**
- Modify: `project/index.html`

- [ ] **Step 1: Add supabase-config.js before data.jsx**

  Open `project/index.html`. The current script block at the bottom is:
  ```html
  <script type="text/babel" src="data.jsx"></script>
  ```

  Add one plain `<script>` tag immediately before it:
  ```html
  <script src="supabase-config.js"></script>
  <script type="text/babel" src="data.jsx"></script>
  ```

  The full updated script block at the bottom of `<body>` should be:
  ```html
  <script src="supabase-config.js"></script>
  <script type="text/babel" src="data.jsx"></script>
  <script type="text/babel" src="tweaks-panel.jsx"></script>
  <script type="text/babel" src="charts.jsx"></script>
  <script type="text/babel" src="kpi.jsx"></script>
  <script type="text/babel" src="table.jsx"></script>
  <script type="text/babel" src="comparison.jsx"></script>
  <script type="text/babel" src="app.jsx"></script>
  ```

---

## Task 6: Strip data.jsx of raw data

**Files:**
- Modify: `project/data.jsx`

The file currently has three sections: raw data arrays, business logic functions, and global exports. Remove the raw data and the FUNDS/PORTFOLIO initialization. Keep all functions and the formatter exports.

- [ ] **Step 1: Replace data.jsx with the stripped version**

  Overwrite `project/data.jsx` with this content — it keeps `buildSeries`, `computeSummary`, `buildPortfolio`, and all formatters, but removes the raw arrays and the sync initialization:

  ```js
  // Utility functions for the gemel tracker.
  // Raw data is now loaded async from Supabase — see app.jsx.

  function buildSeries(raw) {
    let prev = null;
    return raw.map((row) => {
      const flow = row.flow || 0;
      let profit = null;
      let pct = null;
      if (prev !== null && row.price !== 0) {
        profit = row.price - prev - flow;
        const base = prev + Math.max(flow, 0);
        pct = base > 0 ? (profit / base) * 100 : null;
      } else if (prev !== null && row.price === 0 && flow < 0) {
        profit = 0;
        pct = 0;
      } else if (prev === null && flow > 0 && row.price > 0) {
        profit = row.price - flow;
        pct = null;
      }
      prev = row.price === 0 ? prev : row.price;
      return { ...row, profit, pct, flow };
    });
  }

  function computeSummary(series) {
    const active = series.filter(r => r.price > 0);
    const last = active[active.length - 1] || { price: 0 };
    const totalDeposited = series.reduce((s, r) => s + (r.flow > 0 ? r.flow : 0), 0);
    const totalWithdrawn = series.reduce((s, r) => s + (r.flow < 0 ? -r.flow : 0), 0);
    const totalProfit = series.reduce((s, r) => s + (r.profit || 0), 0);
    const peak = active.reduce((m, r) => Math.max(m, r.price), 0);
    const peakRow = active.find(r => r.price === peak);
    const months = active.length - 1;
    const totalReturn = totalDeposited > 0 ? (totalProfit / totalDeposited) * 100 : 0;
    const annualized = totalDeposited > 0 && months > 0
      ? (Math.pow(1 + totalProfit / totalDeposited, 12 / months) - 1) * 100
      : 0;
    const gains = active.slice(1).filter(r => (r.profit || 0) > 0).length;
    const losses = active.slice(1).filter(r => (r.profit || 0) < 0).length;
    const profitMonths = active.slice(1).filter(r => r.profit !== null && (r.flow || 0) === 0);
    const bestMonth = profitMonths.reduce((b, r) => (b === null || (r.pct || -Infinity) > b.pct ? r : b), null);
    const worstMonth = profitMonths.reduce((b, r) => (b === null || (r.pct || Infinity) < b.pct ? r : b), null);
    return {
      currentValue: last.price,
      isClosed: totalWithdrawn > 0,
      finalValueBeforeClose: totalWithdrawn || last.price,
      totalDeposited, totalWithdrawn, totalProfit, totalReturn, annualized,
      peak, peakDate: peakRow?.date,
      months, gains, losses, bestMonth, worstMonth,
    };
  }

  function buildPortfolio(funds) {
    const allDates = Array.from(new Set(funds.flatMap(f => f.series.map(r => r.date)))).sort();
    const series = allDates.map(date => {
      let price = 0, profit = 0, flow = 0, anyActive = false;
      funds.forEach(f => {
        const row = f.series.find(r => r.date === date);
        if (row) {
          price += row.price;
          profit += row.profit || 0;
          flow += row.flow || 0;
          if (row.price > 0) anyActive = true;
        }
      });
      const note = flow > 0 ? "deposit" : flow < 0 ? "withdrawal" : null;
      return { date, price, profit, flow, note, pct: null };
    });
    let prev = null;
    series.forEach(r => {
      if (prev !== null && r.price > 0) {
        const base = prev + Math.max(r.flow, 0);
        r.pct = base > 0 ? (r.profit / base) * 100 : null;
      } else if (prev !== null && r.price === 0) {
        r.pct = 0;
      }
      prev = r.price === 0 ? prev : r.price;
    });
    return { id: "all", name: "All funds", short: "Portfolio", hebrew: "כל הקרנות",
             accent: "oklch(0.22 0.005 85)", series, summary: computeSummary(series) };
  }

  function fmtILS(n, opts = {}) {
    const { sign = false, decimals = 0 } = opts;
    if (n === null || n === undefined || isNaN(n)) return "—";
    const abs = Math.abs(n);
    const s = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const prefix = n < 0 ? "−" : sign ? "+" : "";
    return `${prefix}₪${s}`;
  }
  function fmtPct(n, opts = {}) {
    const { sign = true, decimals = 2 } = opts;
    if (n === null || n === undefined || isNaN(n)) return "—";
    const s = Math.abs(n).toFixed(decimals);
    const prefix = n < 0 ? "−" : sign ? "+" : "";
    return `${prefix}${s}%`;
  }
  function fmtMonth(d) {
    const dt = new Date(d);
    return dt.toLocaleString("en-US", { month: "short", year: "numeric" });
  }
  function fmtMonthShort(d) {
    const dt = new Date(d);
    return dt.toLocaleString("en-US", { month: "short" }) + " '" + String(dt.getFullYear()).slice(2);
  }

  Object.assign(window, { fmtILS, fmtPct, fmtMonth, fmtMonthShort });
  ```

---

## Task 7: Rewrite App component in app.jsx

**Files:**
- Modify: `project/app.jsx`

The current `App` reads `window.FUNDS` and `window.PORTFOLIO` synchronously. Replace the function with an async-aware version that fetches from Supabase on mount. All other components (`FundTabs`, `OverviewView`, `FundView`, `PeriodPanel`, `Tweaks`) stay unchanged.

- [ ] **Step 1: Replace the App function**

  In `project/app.jsx`, replace the entire `App` function (lines 1–66) with:

  ```jsx
  function App() {
    const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
      "accent": "#1f7a4a",
      "density": "comfortable",
      "compareMode": "indexed"
    }/*EDITMODE-END*/);

    const [view, setView] = React.useState("all");
    const [funds, setFunds] = React.useState(null);
    const [portfolio, setPortfolio] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      async function load() {
        try {
          const url = window.SUPABASE_URL;
          const key = window.SUPABASE_ANON_KEY;
          const headers = { apikey: key, Authorization: `Bearer ${key}` };
          const [fr, er] = await Promise.all([
            fetch(`${url}/rest/v1/funds?select=*`, { headers }),
            fetch(`${url}/rest/v1/entries?select=*&order=date`, { headers }),
          ]);
          if (!fr.ok || !er.ok) throw new Error(`HTTP ${fr.status}/${er.status}`);
          const [fundsData, entriesData] = await Promise.all([fr.json(), er.json()]);
          const built = fundsData.map(f => {
            const raw = entriesData
              .filter(e => e.fund_id === f.id)
              .map(e => ({
                date: e.date,
                price: Number(e.price),
                ...(e.note ? { note: e.note } : {}),
                ...(e.flow !== null && e.flow !== undefined ? { flow: Number(e.flow) } : {}),
              }))
              .sort((a, b) => a.date.localeCompare(b.date));
            const series = buildSeries(raw);
            const fund = { id: f.id, name: f.name, short: f.short, hebrew: f.hebrew, accent: f.accent, series };
            fund.summary = computeSummary(series);
            return fund;
          });
          const port = buildPortfolio(built);
          setFunds(built);
          setPortfolio(port);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, []);

    const accentMap = {
      "#1f7a4a": "oklch(0.55 0.13 145)",
      "#2a5fb8": "oklch(0.55 0.13 250)",
      "#a04a1b": "oklch(0.55 0.13 50)",
      "#181818": "oklch(0.22 0.005 85)",
    };
    const defaultAccent = accentMap[t.accent] || t.accent;
    const isAll = view === "all";
    const fund = isAll || !funds ? null : funds.find(f => f.id === view);
    const accent = isAll ? defaultAccent : (fund ? fund.accent : defaultAccent);

    React.useEffect(() => {
      document.documentElement.style.setProperty("--accent", accent);
      document.documentElement.dataset.density = t.density;
    }, [accent, t.density]);

    if (loading) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-mid)" }}>
        Loading…
      </div>
    );

    if (error) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "IBM Plex Mono, monospace", color: "var(--loss)" }}>
        Failed to load: {error}
      </div>
    );

    const firstDate = portfolio.series[0].date;
    const lastActive = portfolio.series.filter(s => s.price > 0).slice(-1)[0];
    const lastDate = lastActive ? lastActive.date : portfolio.series.slice(-1)[0].date;

    return (
      <div className="page">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" style={{ background: accent }}></div>
            <div>
              <div className="brand-title">Gemel · Provident-fund tracker</div>
              <div className="brand-sub">{funds.length} funds · {fmtMonth(firstDate)} → {fmtMonth(lastDate)}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="status-dot" data-state="closed"></span>
            <span className="status-label">All closed Jun 2026</span>
            <span className="divider"></span>
            <span className="mono dim">ILS · ₪</span>
          </div>
        </header>

        <FundTabs view={view} setView={setView} funds={funds} portfolio={portfolio} />

        {isAll
          ? <OverviewView funds={funds} portfolio={portfolio} compareMode={t.compareMode} setView={setView} />
          : <FundView fund={fund} accent={accent} />}

        <footer className="footer">
          <div>{portfolio.series.length} months · 3 funds · last activity {fmtMonth(lastDate)}</div>
          <div className="dim">All amounts in Israeli shekel (₪)</div>
        </footer>
        <Tweaks t={t} setTweak={setTweak} />
      </div>
    );
  }
  ```

---

## Task 8: Verify in browser

**Files:** none — browser verification step

- [ ] **Step 1: Serve the project locally**

  ```bash
  cd /Users/corphd/Desktop/Or\ codes\ projects/gemel/project
  npx serve .
  ```

  Or use any local HTTP server (Python, VSCode Live Server, etc.). The page must be served over HTTP — `file://` won't work for `fetch()` calls.

- [ ] **Step 2: Open in browser**

  Navigate to `http://localhost:3000` (or whichever port `serve` picks).

  Expected: the dashboard loads after a brief "Loading…" screen and displays the same 3 funds and charts as before.

- [ ] **Step 3: Check browser console**

  Open DevTools → Console. There should be no errors. No `window.FUNDS is undefined` or network errors.

- [ ] **Step 4: Verify data integrity**

  Click each of the 3 fund tabs (Yelin, Mor, Analyst). Each should show:
  - Correct total deposited amount
  - Correct final value before close
  - Monthly chart with the expected shape

- [ ] **Step 5: Test the write curl command**

  From a terminal, add a test entry (use a future date so it doesn't affect real data):

  ```bash
  curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/entries' \
    -H "apikey: SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    -d '{"fund_id":"yelin","date":"2099-01-01","price":999999}'
  ```

  Expected response: `{}` (empty object = success)

  Then refresh the browser — the new entry should appear in the Yelin chart.

  Clean up the test entry:
  ```bash
  curl -X DELETE "https://YOUR_PROJECT.supabase.co/rest/v1/entries?fund_id=eq.yelin&date=eq.2099-01-01" \
    -H "apikey: SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer SERVICE_ROLE_KEY"
  ```

---

## Task 9: Delete legacy files

**Files:**
- Delete: `server.js`
- Delete: `data.json`
- Delete: `.api-key`

- [ ] **Step 1: Delete the files**

  ```bash
  rm /Users/corphd/Desktop/Or\ codes\ projects/gemel/server.js
  rm /Users/corphd/Desktop/Or\ codes\ projects/gemel/data.json
  rm /Users/corphd/Desktop/Or\ codes\ projects/gemel/.api-key
  ```

- [ ] **Step 2: Remove express from package.json**

  Open `package.json`. Remove `"express": "^4.19.2"` from dependencies. Update `scripts` to remove `start` and `dev` (or leave them — they'll just fail harmlessly). The final `package.json` can be minimal:

  ```json
  {
    "name": "gemel-tracker",
    "version": "1.0.0",
    "description": "Provident-fund dashboard — data hosted on Supabase"
  }
  ```

  Then run:
  ```bash
  cd /Users/corphd/Desktop/Or\ codes\ projects/gemel && rm -rf node_modules package-lock.json
  ```

---

## Task 10: Commit

- [ ] **Step 1: Stage all changes**

  ```bash
  git add \
    docs/sql/schema.sql \
    docs/sql/seed.sql \
    project/supabase-config.js \
    project/index.html \
    project/data.jsx \
    project/app.jsx \
    package.json
  git rm server.js data.json .api-key
  ```

- [ ] **Step 2: Commit**

  ```bash
  git commit -m "Migrate data storage from data.json to Supabase PostgreSQL"
  ```

---

## Write workflow reference (post-migration)

```bash
# Add a monthly entry
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/entries' \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"fund_id":"yelin","date":"2026-07-01","price":185000}'

# With deposit
# Add "note":"deposit","flow":50000 to the JSON body

# Delete an entry
curl -X DELETE "https://YOUR_PROJECT.supabase.co/rest/v1/entries?fund_id=eq.yelin&date=eq.2026-07-01" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Fund IDs: yelin · mor · analyst
```
