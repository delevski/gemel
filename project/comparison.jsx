// Multi-fund comparison view.

function ComparisonChart({ funds, mode }) {
  // mode: "indexed" (rebase each fund to 100 at first active month) or "value"
  const [hover, setHover] = React.useState(null);
  const ref = React.useRef(null);

  const w = 1100;
  const h = 380;
  const pad = { t: 28, r: 28, b: 40, l: 76 };

  // Build per-fund index series
  const allDates = Array.from(new Set(funds.flatMap(f => f.series.map(r => r.date)))).sort();

  const lines = funds.map(f => {
    const active = f.series.filter(r => r.price > 0);
    if (!active.length) return { id: f.id, name: f.name, accent: f.accent, points: [] };
    const points = [];
    let base = null;
    let cumFlow = 0;
    f.series.forEach(r => {
      if (r.price === 0) return;
      cumFlow += r.flow || 0;
      if (base === null) base = r.price; // anchor at first active price
      let val;
      if (mode === "indexed") {
        // index growth = (price - cumulative deposit since start) / first price * 100
        // Equivalent to performance excluding flows.
        const netInvested = cumFlow;
        const growth = r.price - netInvested;
        const firstInvested = (active[0].flow || active[0].price);
        val = (growth / firstInvested) * 100;
      } else {
        val = r.price;
      }
      points.push({ date: r.date, value: val, raw: r });
    });
    return { id: f.id, name: f.name, accent: f.accent, short: f.short, points };
  });

  const allVals = lines.flatMap(l => l.points.map(p => p.value));
  const min = mode === "indexed" ? Math.min(0, ...allVals) - 5 : Math.min(...allVals) * 0.95;
  const max = mode === "indexed" ? Math.max(...allVals) + 5 : Math.max(...allVals) * 1.04;

  const xOf = (date) => {
    const idx = allDates.indexOf(date);
    return pad.l + (idx / (allDates.length - 1)) * (w - pad.l - pad.r);
  };
  const yOf = (v) => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);

  const yTicks = 6;
  const tickVals = Array.from({ length: yTicks }, (_, i) => min + (i / (yTicks - 1)) * (max - min));
  const xTicks = allDates.filter((_, i) => i % 2 === 0);

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    let bestDate = null;
    let bestDist = Infinity;
    allDates.forEach(d => {
      const xv = xOf(d);
      const dist = Math.abs(xv - x);
      if (dist < bestDist) { bestDist = dist; bestDate = d; }
    });
    setHover(bestDate);
  }

  return (
    <div className="card chart-card">
      <div className="card-head row">
        <div>
          <div className="card-title">Fund comparison</div>
          <div className="card-sub">
            {mode === "indexed" ? "Performance indexed (deposits-neutral, %)" : "Raw price (₪)"}
          </div>
        </div>
        <div className="legend">
          {lines.map(l => (
            <div key={l.id} className="legend-item">
              <span className="legend-dot" style={{ background: l.accent }}></span>
              <span>{l.short}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        className="chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {tickVals.map((v, i) => {
          const y = yOf(v);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="grid" />
              <text x={pad.l - 12} y={y + 4} className="axis" textAnchor="end">
                {mode === "indexed" ? v.toFixed(0) + "%" : (v / 1000).toFixed(0) + "k"}
              </text>
            </g>
          );
        })}

        {xTicks.map(d => (
          <text key={d} x={xOf(d)} y={h - pad.b + 22} className="axis" textAnchor="middle">
            {fmtMonthShort(d)}
          </text>
        ))}

        {mode === "indexed" && (
          <line x1={pad.l} x2={w - pad.r} y1={yOf(0)} y2={yOf(0)} className="grid" stroke="var(--border-strong)" />
        )}

        {lines.map(l => {
          const d = l.points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.date)},${yOf(p.value)}`).join(" ");
          return (
            <path key={l.id} d={d} fill="none" stroke={l.accent}
                  strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round"
                  opacity={hover === null ? 1 : 1} />
          );
        })}

        {hover && (
          <g>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={pad.t} y2={h - pad.b} className="hover-line" />
            {lines.map(l => {
              const p = l.points.find(pt => pt.date === hover);
              if (!p) return null;
              return <circle key={l.id} cx={xOf(p.date)} cy={yOf(p.value)} r="5"
                             fill={l.accent} stroke="var(--bg)" strokeWidth="2" />;
            })}
          </g>
        )}
      </svg>

      {hover && (
        <div className="tooltip" style={{ left: `${(xOf(hover) / w) * 100}%` }}>
          <div className="tt-month">{fmtMonth(hover)}</div>
          {lines.map(l => {
            const p = l.points.find(pt => pt.date === hover);
            return (
              <div key={l.id} className="tt-row">
                <span><span className="legend-dot" style={{ background: l.accent }}></span> {l.short}</span>
                <span className="mono">
                  {p ? (mode === "indexed" ? fmtPct(p.value) : fmtILS(p.value)) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FundCompareCards({ funds }) {
  const best = (key) => funds.reduce((b, f) => (f.summary[key] > b.summary[key] ? f : b), funds[0]);
  const bestReturn = best("totalReturn").id;
  const bestProfit = best("totalProfit").id;
  const bestAnnualized = best("annualized").id;

  return (
    <div className="fund-cards">
      {funds.map(f => (
        <div key={f.id} className="fund-card" style={{ borderTopColor: f.accent }}>
          <div className="fund-card-head">
            <div className="fund-card-name">
              <span className="fund-mark" style={{ background: f.accent }}></span>
              <div>
                <div className="fund-card-title">{f.name}</div>
                <div className="fund-card-sub">{f.hebrew}</div>
              </div>
            </div>
            <span className={"pill " + (f.summary.isClosed ? "closed" : "live")}>
              {f.summary.isClosed ? "Closed" : "Live"}
            </span>
          </div>

          <div className="fund-stats">
            <div className="fund-stat">
              <div className="fund-stat-label">Final value</div>
              <div className="fund-stat-value mono">{fmtILS(f.summary.finalValueBeforeClose)}</div>
            </div>
            <div className="fund-stat">
              <div className="fund-stat-label">
                Total return
                {bestReturn === f.id && <span className="badge-best">best</span>}
              </div>
              <div className={"fund-stat-value mono " + (f.summary.totalReturn >= 0 ? "pos" : "neg")}>
                {fmtPct(f.summary.totalReturn)}
              </div>
            </div>
            <div className="fund-stat">
              <div className="fund-stat-label">
                Profit
                {bestProfit === f.id && <span className="badge-best">best</span>}
              </div>
              <div className={"fund-stat-value mono " + (f.summary.totalProfit >= 0 ? "pos" : "neg")}>
                {fmtILS(f.summary.totalProfit, { sign: true })}
              </div>
            </div>
            <div className="fund-stat">
              <div className="fund-stat-label">
                Annualised
                {bestAnnualized === f.id && <span className="badge-best">best</span>}
              </div>
              <div className={"fund-stat-value mono " + (f.summary.annualized >= 0 ? "pos" : "neg")}>
                {fmtPct(f.summary.annualized)}
              </div>
            </div>
            <div className="fund-stat">
              <div className="fund-stat-label">Deposited</div>
              <div className="fund-stat-value mono">{fmtILS(f.summary.totalDeposited)}</div>
            </div>
            <div className="fund-stat">
              <div className="fund-stat-label">Months</div>
              <div className="fund-stat-value mono">
                {f.summary.months} <span className="dim">·</span>{" "}
                <span className="pos">{f.summary.gains}</span>
                <span className="dim">/</span>
                <span className="neg">{f.summary.losses}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyMatrix({ funds }) {
  // Heatmap: rows = months, cols = funds. Show monthly % colored by gain/loss.
  const allDates = Array.from(new Set(funds.flatMap(f => f.series.map(r => r.date)))).sort();
  const monthsWithAny = allDates.filter(d => funds.some(f => {
    const r = f.series.find(x => x.date === d);
    return r && r.price > 0 && r.profit !== null && !r.flow;
  }));

  // collect all pct values to scale color intensity
  const allPcts = funds.flatMap(f => f.series.filter(r => r.profit !== null && !r.flow).map(r => r.pct));
  const maxAbs = Math.max(...allPcts.map(Math.abs));

  function cellStyle(pct) {
    if (pct === null || pct === undefined) return { background: "transparent" };
    const intensity = Math.min(1, Math.abs(pct) / maxAbs);
    const lightness = 0.97 - intensity * 0.32;
    if (pct >= 0) {
      return { background: `oklch(${lightness} ${0.06 + intensity * 0.1} 145)`,
               color: intensity > 0.55 ? "white" : "var(--ink)" };
    } else {
      return { background: `oklch(${lightness} ${0.06 + intensity * 0.1} 28)`,
               color: intensity > 0.55 ? "white" : "var(--ink)" };
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Monthly returns matrix</div>
        <div className="card-sub">Each cell = that fund's % for that month · darker = larger move</div>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="ta-left">Month</th>
              {funds.map(f => (
                <th key={f.id} className="ta-right">
                  <span className="legend-dot" style={{ background: f.accent }}></span>
                  {f.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthsWithAny.map(d => (
              <tr key={d}>
                <td className="matrix-month">{fmtMonth(d)}</td>
                {funds.map(f => {
                  const r = f.series.find(x => x.date === d);
                  if (!r || r.price === 0) return <td key={f.id} className="matrix-cell dim">—</td>;
                  if (r.flow) {
                    return (
                      <td key={f.id} className="matrix-cell">
                        <span className={"pill " + (r.flow > 0 ? "deposit" : "withdrawal")}>
                          {r.flow > 0 ? "+" : "−"}₪{(Math.abs(r.flow) / 1000).toFixed(0)}k
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td key={f.id} className="matrix-cell mono" style={cellStyle(r.pct)}>
                      {fmtPct(r.pct, { decimals: 2 })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioKPIs({ portfolio, funds }) {
  const s = portfolio.summary;
  const cards = [
    { label: "Combined value", value: fmtILS(s.finalValueBeforeClose), sub: "Across " + funds.length + " funds" },
    { label: "Total profit", value: fmtILS(s.totalProfit, { sign: true }),
      sub: "Net of all deposits", tone: s.totalProfit >= 0 ? "pos" : "neg" },
    { label: "Blended return", value: fmtPct(s.totalReturn),
      sub: "On " + fmtILS(s.totalDeposited) + " in", tone: s.totalReturn >= 0 ? "pos" : "neg" },
    { label: "Deposited", value: fmtILS(s.totalDeposited), sub: "All-time inflows" },
  ];
  return (
    <div className="kpis kpis-4">
      {cards.map((c, i) => (
        <div key={i} className={"kpi " + (c.tone || "")}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value mono">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ComparisonChart, FundCompareCards, MonthlyMatrix, PortfolioKPIs });
