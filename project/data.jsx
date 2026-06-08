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

function roundILS(n) {
  return Math.round(n);
}

function inflateFallbackFund(def) {
  let price = def.startPrice;
  const series = [];

  if (def.startDate) {
    const startRow = { date: def.startDate, price: roundILS(price) };
    if (def.startFlow) {
      startRow.flow = def.startFlow;
      startRow.note = def.startFlow > 0 ? "deposit" : "withdrawal";
    }
    series.push(startRow);
  }

  (def.timeline || []).forEach(step => {
    const row = { date: step.date };
    if (step.flow) {
      price += step.flow;
      row.flow = step.flow;
      row.note = step.flow > 0 ? "deposit" : "withdrawal";
    }
    if (step.pct !== null && step.pct !== undefined) {
      price *= (1 + step.pct);
    }
    row.price = roundILS(price);
    series.push(row);
  });

  const summary = { ...computeSummary(buildSeries(series)), ...(def.summary || {}) };
  return {
    id: def.id,
    name: def.name,
    short: def.short,
    hebrew: def.hebrew,
    accent: def.accent,
    series: buildSeries(series),
    summary,
  };
}

function inflateFallbackPortfolio(funds, summary = {}) {
  const built = buildPortfolio(funds);
  built.summary = { ...built.summary, ...summary };
  return built;
}

const GEMEL_FALLBACK = {
  funds: [
    {
      id: "yelin",
      name: "Yelin Lapidot",
      short: "Yelin",
      hebrew: "ילין לפידות",
      accent: "#1f7a4a",
      startDate: "2024-12-01",
      startPrice: 80988,
      timeline: [
        { date: "2025-01-01", pct: 0.0023 },
        { date: "2025-02-01", pct: 0.0235 },
        { date: "2025-03-01", pct: -0.0130 },
        { date: "2025-04-01", pct: -0.0303 },
        { date: "2025-05-01", pct: 0.0065 },
        { date: "2025-06-01", pct: 0.0521 },
        { date: "2025-07-01", pct: 0.0452 },
        { date: "2025-08-01", pct: 0.0213 },
        { date: "2025-09-01", flow: 67000 },
        { date: "2025-10-01", pct: 0.0291 },
        { date: "2025-11-01", pct: 0.0250 },
        { date: "2025-12-01", pct: 0.0110 },
        { date: "2026-01-01", pct: 0.0134 },
        { date: "2026-02-01", pct: 0.0273 },
        { date: "2026-03-01", pct: 0.0065 },
        { date: "2026-04-01", pct: -0.0463 },
        { date: "2026-05-01", pct: 0.0808 },
      ],
      summary: {
        currentValue: 180702,
        isClosed: true,
        finalValueBeforeClose: 180702,
        totalDeposited: 146300,
        totalWithdrawn: 180702,
        totalProfit: 34402,
        totalReturn: 23.51,
        annualized: 16.08,
        peak: 180702,
        peakDate: "2026-05-01",
        months: 17,
        gains: 14,
        losses: 3,
        bestMonth: { date: "2026-05-01", pct: 8.08 },
        worstMonth: { date: "2025-04-01", pct: -3.03 },
      },
    },
    {
      id: "mor",
      name: "Mor",
      short: "Mor",
      hebrew: "מור",
      accent: "#2a5fb8",
      startDate: "2025-01-01",
      startPrice: 81000,
      startFlow: 81000,
      timeline: [
        { date: "2025-02-01", pct: 0.0226 },
        { date: "2025-03-01", pct: -0.0147 },
        { date: "2025-04-01", pct: 0.0066 },
        { date: "2025-05-01", pct: 0.0549 },
        { date: "2025-06-01", pct: 0.0451 },
        { date: "2025-07-01", pct: 0.0193 },
        { date: "2025-08-01", pct: 0.0069 },
        { date: "2025-09-01", pct: 0.0343 },
        { date: "2025-10-01", pct: 0.0214 },
        { date: "2025-11-01", pct: 0.0136 },
        { date: "2025-12-01", pct: 0.0128 },
        { date: "2026-01-01", pct: 0.0454 },
        { date: "2026-02-01", pct: 0.0120 },
        { date: "2026-03-01", pct: 0.0 },
        { date: "2026-04-01", pct: 0.0319 },
      ],
      summary: {
        currentValue: 110063,
        isClosed: true,
        finalValueBeforeClose: 110063,
        totalDeposited: 81000,
        totalWithdrawn: 110063,
        totalProfit: 29063,
        totalReturn: 35.88,
        annualized: 27.80,
        peak: 110063,
        peakDate: "2026-04-01",
        months: 15,
        gains: 13,
        losses: 1,
        bestMonth: { date: "2025-05-01", pct: 5.49 },
        worstMonth: { date: "2025-03-01", pct: -1.47 },
      },
    },
    {
      id: "analyst",
      name: "Analyst",
      short: "Analyst",
      hebrew: "אנליסט",
      accent: "#a04a1b",
      startDate: "2024-12-01",
      startPrice: 79747,
      timeline: [
        { date: "2025-01-01", pct: 0.0038 },
        { date: "2025-02-01", pct: 0.0304 },
        { date: "2025-03-01", pct: -0.0169 },
        { date: "2025-04-01", pct: -0.0325 },
        { date: "2025-05-01", pct: -0.0012 },
        { date: "2025-06-01", pct: 0.0513 },
        { date: "2025-07-01", pct: 0.0531 },
        { date: "2025-08-01", pct: 0.0201 },
        { date: "2025-09-01", pct: 0.0088 },
        { date: "2025-10-01", pct: 0.0342 },
        { date: "2025-11-01", pct: 0.0202 },
        { date: "2025-12-01", pct: 0.0083 },
        { date: "2026-01-01", pct: 0.0092 },
        { date: "2026-02-01", flow: 86000 },
        { date: "2026-03-01", pct: 0.0017 },
        { date: "2026-04-01", pct: -0.0423 },
        { date: "2026-05-01", pct: 0.0874 },
      ],
      summary: {
        currentValue: 189702,
        isClosed: true,
        finalValueBeforeClose: 189702,
        totalDeposited: 165781,
        totalWithdrawn: 189702,
        totalProfit: 23921,
        totalReturn: 14.43,
        annualized: 9.98,
        peak: 189702,
        peakDate: "2026-05-01",
        months: 17,
        gains: 12,
        losses: 5,
        bestMonth: { date: "2026-05-01", pct: 8.74 },
        worstMonth: { date: "2025-04-01", pct: -3.25 },
      },
    },
  ],
  portfolio: {
    summary: {
      currentValue: 480467,
      isClosed: true,
      finalValueBeforeClose: 480467,
      totalDeposited: 393081,
      totalWithdrawn: 480467,
      totalProfit: 87386,
      totalReturn: 22.23,
      annualized: 0,
      peak: 480467,
      peakDate: "2026-05-01",
      months: 17,
      gains: 39,
      losses: 9,
      bestMonth: { date: "2026-05-01", pct: 8.74 },
      worstMonth: { date: "2025-04-01", pct: -4.63 },
    },
  },
};

Object.assign(window, {
  fmtILS,
  fmtPct,
  fmtMonth,
  fmtMonthShort,
  roundILS,
  inflateFallbackFund,
  inflateFallbackPortfolio,
  GEMEL_FALLBACK,
});
