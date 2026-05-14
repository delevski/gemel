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
    let price = 0, profit = 0, flow = 0;
    funds.forEach(f => {
      const row = f.series.find(r => r.date === date);
      if (row) {
        price += row.price;
        profit += row.profit || 0;
        flow += row.flow || 0;
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
