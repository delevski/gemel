// Equity curve + monthly returns bar chart.
// SVG hand-built; no chart libs.

function EquityChart({ series, accent, height = 360 }) {
  const [hover, setHover] = React.useState(null);
  const ref = React.useRef(null);

  const active = series.filter(r => r.price > 0);
  const w = 1100;
  const h = height;
  const pad = { t: 24, r: 28, b: 36, l: 76 };

  const min = Math.min(...active.map(r => r.price)) * 0.95;
  const max = Math.max(...active.map(r => r.price)) * 1.04;

  const xs = active.map((_, i) => pad.l + (i / (active.length - 1)) * (w - pad.l - pad.r));
  const ys = active.map(r => pad.t + (1 - (r.price - min) / (max - min)) * (h - pad.t - pad.b));

  const pathD = active.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i]},${ys[i]}`).join(" ");
  const areaD = `${pathD} L${xs[xs.length - 1]},${h - pad.b} L${xs[0]},${h - pad.b} Z`;

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks }, (_, i) => min + (i / (yTicks - 1)) * (max - min));

  // x ticks: every 2 months
  const xTicks = active.map((r, i) => ({ i, label: fmtMonthShort(r.date) })).filter(t => t.i % 2 === 0);

  function onMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    xs.forEach((xv, i) => {
      const d = Math.abs(xv - x);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setHover(best);
  }

  const flows = active.map((r, i) => ({ ...r, i, x: xs[i], y: ys[i] })).filter(r => r.flow);

  return (
    <div className="card chart-card">
      <div className="card-head">
        <div className="card-title">Equity curve</div>
        <div className="card-sub">Fund value over time · ₪</div>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        className="chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y gridlines */}
        {tickVals.map((v, i) => {
          const y = pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} className="grid" />
              <text x={pad.l - 12} y={y + 4} className="axis" textAnchor="end">
                {(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {/* x ticks */}
        {xTicks.map(t => (
          <text key={t.i} x={xs[t.i]} y={h - pad.b + 22} className="axis" textAnchor="middle">
            {t.label}
          </text>
        ))}

        <path d={areaD} fill="url(#equity-fill)" />
        <path d={pathD} fill="none" stroke={accent} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

        {/* flow markers */}
        {flows.map((f, i) => (
          <g key={i}>
            <line x1={f.x} x2={f.x} y1={pad.t} y2={h - pad.b} className="flow-line" />
            <circle cx={f.x} cy={f.y} r="6" className="flow-dot" stroke={accent} />
            <text x={f.x} y={pad.t - 8} className="flow-label" textAnchor="middle">
              {f.flow > 0 ? "+" : "−"}₪{(Math.abs(f.flow) / 1000).toFixed(1)}k
            </text>
          </g>
        ))}

        {/* hover */}
        {hover !== null && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={pad.t} y2={h - pad.b} className="hover-line" />
            <circle cx={xs[hover]} cy={ys[hover]} r="5" fill={accent} stroke="var(--bg)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div className="tooltip" style={{ left: `${(xs[hover] / w) * 100}%` }}>
          <div className="tt-month">{fmtMonth(active[hover].date)}</div>
          <div className="tt-row">
            <span>Value</span>
            <span className="mono">{fmtILS(active[hover].price)}</span>
          </div>
          <div className="tt-row">
            <span>Δ</span>
            <span className={"mono " + (active[hover].profit > 0 ? "pos" : active[hover].profit < 0 ? "neg" : "")}>
              {active[hover].profit !== null ? fmtILS(active[hover].profit, { sign: true }) : "—"}
            </span>
          </div>
          <div className="tt-row">
            <span>%</span>
            <span className={"mono " + (active[hover].pct > 0 ? "pos" : active[hover].pct < 0 ? "neg" : "")}>
              {fmtPct(active[hover].pct)}
            </span>
          </div>
          {active[hover].flow ? (
            <div className="tt-row">
              <span>{active[hover].flow > 0 ? "Deposit" : "Withdrawal"}</span>
              <span className="mono">{fmtILS(active[hover].flow, { sign: true })}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReturnsBars({ series, accent }) {
  const [hover, setHover] = React.useState(null);
  // exclude initial (no prior month) and zeroed months after close
  const data = series.filter(r => r.profit !== null && r.price > 0);

  const w = 1100;
  const h = 240;
  const pad = { t: 20, r: 28, b: 40, l: 76 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };

  const maxAbs = Math.max(...data.map(r => Math.abs(r.profit || 0)));
  const cx = pad.t + inner.h / 2;
  const yZero = pad.t + inner.h / 2;
  const barW = inner.w / data.length * 0.66;
  const step = inner.w / data.length;

  return (
    <div className="card chart-card">
      <div className="card-head">
        <div className="card-title">Monthly profit</div>
        <div className="card-sub">Underlying gain net of deposits/withdrawals · ₪</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart">
        <line x1={pad.l} x2={w - pad.r} y1={yZero} y2={yZero} className="grid" />

        {data.map((r, i) => {
          const x = pad.l + step * i + (step - barW) / 2;
          const profit = r.profit || 0;
          const barH = (Math.abs(profit) / maxAbs) * (inner.h / 2);
          const y = profit >= 0 ? yZero - barH : yZero;
          const pos = profit >= 0;
          const cls = pos ? "bar pos" : "bar neg";
          return (
            <g key={r.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}>
              <rect
                x={x} y={y} width={barW} height={Math.max(barH, 1.5)}
                className={cls}
                fill={pos ? accent : "var(--loss)"}
                opacity={hover === null || hover === i ? 1 : 0.35}
                rx="2"
              />
              {(i % 2 === 0) && (
                <text x={x + barW / 2} y={h - pad.b + 22} className="axis" textAnchor="middle">
                  {fmtMonthShort(r.date)}
                </text>
              )}
            </g>
          );
        })}

        {/* y labels */}
        {[1, 0.5, -0.5, -1].map((m, i) => {
          const y = yZero - m * (inner.h / 2);
          return (
            <text key={i} x={pad.l - 12} y={y + 4} className="axis" textAnchor="end">
              {m === 0 ? "0" : (m > 0 ? "+" : "−") + (Math.abs(maxAbs * m) / 1000).toFixed(1) + "k"}
            </text>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="tooltip" style={{ left: `${((pad.l + step * hover + step / 2) / w) * 100}%` }}>
          <div className="tt-month">{fmtMonth(data[hover].date)}</div>
          <div className="tt-row">
            <span>Profit</span>
            <span className={"mono " + (data[hover].profit > 0 ? "pos" : "neg")}>
              {fmtILS(data[hover].profit, { sign: true })}
            </span>
          </div>
          <div className="tt-row">
            <span>%</span>
            <span className={"mono " + (data[hover].pct > 0 ? "pos" : "neg")}>
              {fmtPct(data[hover].pct)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { EquityChart, ReturnsBars });
