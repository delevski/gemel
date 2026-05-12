// Multi-fund provident-fund tracker data
// Source: imported xlsx (3 sheets: Yelin / Mor / Analyst). All ILS (₪).
// Each fund records monthly price snapshots. Deposits & withdrawals are flagged
// with `flow` so monthly profit can be computed net of cash movements.

// --- YELIN ------------------------------------------------------------------
const YELIN_RAW = [
  { date: "2024-12-01", price: 79875, note: "deposit", flow: 79000 },
  { date: "2025-01-01", price: 80055 },
  { date: "2025-02-01", price: 81939 },
  { date: "2025-03-01", price: 80875 },
  { date: "2025-04-01", price: 78423 },
  { date: "2025-05-01", price: 78932 },
  { date: "2025-06-01", price: 83043 },
  { date: "2025-07-01", price: 86795 },
  { date: "2025-08-01", price: 88648 },
  { date: "2025-09-01", price: 156860, note: "deposit", flow: 67300 },
  { date: "2025-10-01", price: 161420 },
  { date: "2025-11-01", price: 165461 },
  { date: "2025-12-01", price: 167282 },
  { date: "2026-01-01", price: 169528 },
  { date: "2026-02-01", price: 174162 },
  { date: "2026-03-01", price: 175299 },
  { date: "2026-04-01", price: 167191 },
  { date: "2026-05-01", price: 180702 },
  { date: "2026-06-01", price: 0, note: "withdrawal", flow: -180702 },
];

// --- MOR --------------------------------------------------------------------
// Mor's first row is Jan 2025 with the deposit (no Dec 2024 baseline).
const MOR_RAW = [
  { date: "2025-01-01", price: 81000, note: "deposit", flow: 81000 },
  { date: "2025-02-01", price: 82834 },
  { date: "2025-03-01", price: 81618 },
  { date: "2025-04-01", price: 82159 },
  { date: "2025-05-01", price: 86667 },
  { date: "2025-06-01", price: 90580 },
  { date: "2025-07-01", price: 92329 },
  { date: "2025-08-01", price: 92962 },
  { date: "2025-09-01", price: 96151 },
  { date: "2025-10-01", price: 98206 },
  { date: "2025-11-01", price: 99545 },
  { date: "2025-12-01", price: 100818 },
  { date: "2026-01-01", price: 105398 },
  { date: "2026-02-01", price: 106665 },
  { date: "2026-03-01", price: 106665 },
  { date: "2026-04-01", price: 110063 },
  { date: "2026-05-01", price: 0, note: "withdrawal", flow: -110063 },
];

// --- ANALYST ---------------------------------------------------------------
// Feb 2026 jumped from 95,689 → 181,854. That's an 86,165 increase but other
// funds returned ~1-2% that month → treat the jump as a deposit (flow ≈ 86,165)
// with 0 underlying profit. Conservative; reflects what the sheet shows.
const ANALYST_RAW = [
  { date: "2024-12-01", price: 79616, note: "deposit", flow: 79616 },
  { date: "2025-01-01", price: 79916 },
  { date: "2025-02-01", price: 82345 },
  { date: "2025-03-01", price: 80955 },
  { date: "2025-04-01", price: 78325 },
  { date: "2025-05-01", price: 78231 },
  { date: "2025-06-01", price: 82242 },
  { date: "2025-07-01", price: 86613 },
  { date: "2025-08-01", price: 88351 },
  { date: "2025-09-01", price: 89131 },
  { date: "2025-10-01", price: 92175 },
  { date: "2025-11-01", price: 94037 },
  { date: "2025-12-01", price: 94816 },
  { date: "2026-01-01", price: 95689 },
  { date: "2026-02-01", price: 181854, note: "deposit", flow: 86165 },
  { date: "2026-03-01", price: 182156 },
  { date: "2026-04-01", price: 174452 },
  { date: "2026-05-01", price: 189702 },
  { date: "2026-06-01", price: 0, note: "withdrawal", flow: -189702 },
];

// Build a derived series for one fund.
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
      // initial deposit row — value matches deposit; no profit
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

const FUNDS = [
  {
    id: "yelin",
    name: "Yelin Lapidot",
    short: "Yelin",
    hebrew: "ילין לפידות",
    accent: "oklch(0.55 0.13 145)",   // green
    series: buildSeries(YELIN_RAW),
  },
  {
    id: "mor",
    name: "Mor",
    short: "Mor",
    hebrew: "מור",
    accent: "oklch(0.55 0.13 250)",   // blue
    series: buildSeries(MOR_RAW),
  },
  {
    id: "analyst",
    name: "Analyst",
    short: "Analyst",
    hebrew: "אנליסט",
    accent: "oklch(0.55 0.13 50)",    // amber
    series: buildSeries(ANALYST_RAW),
  },
];

FUNDS.forEach(f => { f.summary = computeSummary(f.series); });

// Portfolio aggregate — sum across funds, aligned by month.
function buildPortfolio(funds) {
  const allDates = Array.from(new Set(funds.flatMap(f => f.series.map(r => r.date)))).sort();
  const series = allDates.map(date => {
    let price = 0;
    let profit = 0;
    let flow = 0;
    let anyActive = false;
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
  // recompute pct per row
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

const PORTFOLIO = buildPortfolio(FUNDS);

// Helpers
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

Object.assign(window, {
  FUNDS, PORTFOLIO,
  // back-compat with v1
  YELIN_SERIES: FUNDS[0].series, YELIN_SUMMARY: FUNDS[0].summary,
  fmtILS, fmtPct, fmtMonth, fmtMonthShort,
});
