function KPICards({ summary }) {
  const cards = [
    {
      label: "Final value",
      value: fmtILS(summary.finalValueBeforeClose),
      sub: summary.isClosed ? "Withdrawn · " + fmtMonth("2026-06-01") : "Live",
      mark: summary.isClosed ? "closed" : "live",
    },
    {
      label: "Total profit",
      value: fmtILS(summary.totalProfit, { sign: true }),
      sub: "Over " + summary.months + " months",
      tone: summary.totalProfit >= 0 ? "pos" : "neg",
    },
    {
      label: "Total return",
      value: fmtPct(summary.totalReturn),
      sub: "On " + fmtILS(summary.totalDeposited) + " deposited",
      tone: summary.totalReturn >= 0 ? "pos" : "neg",
    },
    {
      label: "Annualised",
      value: fmtPct(summary.annualized),
      sub: "Compounded · " + summary.months + " mo",
      tone: summary.annualized >= 0 ? "pos" : "neg",
    },
    {
      label: "Best month",
      value: fmtPct(summary.bestMonth?.pct),
      sub: summary.bestMonth ? fmtMonth(summary.bestMonth.date) : "—",
      tone: "pos",
    },
    {
      label: "Worst month",
      value: fmtPct(summary.worstMonth?.pct),
      sub: summary.worstMonth ? fmtMonth(summary.worstMonth.date) : "—",
      tone: "neg",
    },
  ];
  return (
    <div className="kpis">
      {cards.map((c, i) => (
        <div key={i} className={"kpi " + (c.tone || "")}>
          <div className="kpi-label">
            {c.label}
            {c.mark && <span className={"pill " + c.mark}>{c.mark}</span>}
          </div>
          <div className="kpi-value mono">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function MetaStrip({ summary, fundName }) {
  return (
    <div className="meta-strip">
      <div className="meta">
        <span className="meta-label">Account</span>
        <span className="meta-value">{fundName || "Yelin Lapidot · Gemel"}</span>
      </div>
      <div className="meta">
        <span className="meta-label">Deposited</span>
        <span className="meta-value mono">{fmtILS(summary.totalDeposited)}</span>
      </div>
      <div className="meta">
        <span className="meta-label">Withdrawn</span>
        <span className="meta-value mono">{fmtILS(summary.totalWithdrawn)}</span>
      </div>
      <div className="meta">
        <span className="meta-label">Peak</span>
        <span className="meta-value mono">{fmtILS(summary.peak)} <span className="meta-small">· {fmtMonthShort(summary.peakDate)}</span></span>
      </div>
      <div className="meta">
        <span className="meta-label">Gain / Loss months</span>
        <span className="meta-value mono"><span className="pos">{summary.gains}</span> <span className="dim">/</span> <span className="neg">{summary.losses}</span></span>
      </div>
    </div>
  );
}

Object.assign(window, { KPICards, MetaStrip });
