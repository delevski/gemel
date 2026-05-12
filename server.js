const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Generate a stable key from DATA_FILE mtime so it survives restarts,
// or use the env var for production / agent configuration.
const API_KEY = process.env.API_KEY || (() => {
  const keyFile = path.join(__dirname, '.api-key');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf8').trim();
  const key = 'gemel-' + require('crypto').randomBytes(12).toString('hex');
  fs.writeFileSync(keyFile, key);
  return key;
})();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

function load() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function auth(req, res, next) {
  const key = req.headers['x-api-key']
    || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized — wrong API key' });
  next();
}

// ── Read ─────────────────────────────────────────────────────────────────────

// GET /api/funds  →  { funds: [...] }
app.get('/api/funds', (req, res) => {
  res.json(load());
});

// GET /api/funds/:id  →  { id, name, raw: [...] }
app.get('/api/funds/:id', (req, res) => {
  const data = load();
  const fund = data.funds.find(f => f.id === req.params.id);
  if (!fund) return res.status(404).json({ error: 'Fund not found' });
  res.json(fund);
});

// ── Write (requires API key) ──────────────────────────────────────────────────

/*
  POST /api/funds/:id/entries
  Body: {
    "date":  "YYYY-MM-DD",   // required — use first of month, e.g. "2026-07-01"
    "price": 195000,          // required — fund value in ILS (₪); 0 for a full withdrawal
    "note":  "deposit",       // optional — "deposit" | "withdrawal"
    "flow":  50000            // optional — positive = inflow, negative = outflow (ILS)
  }
  Upserts: posting the same date twice overwrites the earlier entry.
*/
app.post('/api/funds/:id/entries', auth, (req, res) => {
  const data = load();
  const fund = data.funds.find(f => f.id === req.params.id);
  if (!fund) {
    const ids = data.funds.map(f => f.id).join(', ');
    return res.status(404).json({ error: `Fund "${req.params.id}" not found. Valid IDs: ${ids}` });
  }

  const { date, price, note, flow } = req.body;
  if (!date || price === undefined) {
    return res.status(400).json({ error: 'Both "date" (YYYY-MM-DD) and "price" (number) are required' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format (e.g. "2026-07-01")' });
  }

  // Remove existing entry for this date (upsert behaviour)
  fund.raw = fund.raw.filter(r => r.date !== date);

  const entry = { date, price: Number(price) };
  if (note) entry.note = note;
  if (flow !== undefined) entry.flow = Number(flow);

  fund.raw.push(entry);
  fund.raw.sort((a, b) => a.date.localeCompare(b.date));

  save(data);
  res.json({ ok: true, entry });
});

/*
  DELETE /api/funds/:id/entries/:date
  Removes the entry for the given date.
*/
app.delete('/api/funds/:id/entries/:date', auth, (req, res) => {
  const data = load();
  const fund = data.funds.find(f => f.id === req.params.id);
  if (!fund) return res.status(404).json({ error: 'Fund not found' });
  const before = fund.raw.length;
  fund.raw = fund.raw.filter(r => r.date !== req.params.date);
  if (fund.raw.length === before) {
    return res.status(404).json({ error: `No entry found for date "${req.params.date}"` });
  }
  save(data);
  res.json({ ok: true });
});

// Catch-all → serve index.html (SPA)
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log('\n──────────────────────────────────────────');
  console.log(`  Gemel tracker  →  http://localhost:${PORT}`);
  console.log('──────────────────────────────────────────');
  console.log(`  API key : ${API_KEY}`);
  console.log('──────────────────────────────────────────');
  console.log('\n  Agent usage (add a monthly entry):');
  console.log(`  curl -X POST http://localhost:${PORT}/api/funds/yelin/entries \\`);
  console.log(`       -H "x-api-key: ${API_KEY}" \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"date":"2026-07-01","price":190000}'`);
  console.log('\n  Fund IDs: yelin · mor · analyst');
  console.log('  Deposit example: add "note":"deposit","flow":50000');
  console.log('  Withdrawal:      set price to 0, "note":"withdrawal","flow":-<amount>');
  console.log('');
});
