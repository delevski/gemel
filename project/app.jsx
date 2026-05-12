function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "#1f7a4a",
    "density": "comfortable",
    "compareMode": "indexed"
  }/*EDITMODE-END*/);

  const [view, setView] = React.useState("all"); // "all" | fund.id

  const accentMap = {
    "#1f7a4a": "oklch(0.55 0.13 145)",
    "#2a5fb8": "oklch(0.55 0.13 250)",
    "#a04a1b": "oklch(0.55 0.13 50)",
    "#181818": "oklch(0.22 0.005 85)",
  };
  const defaultAccent = accentMap[t.accent] || t.accent;

  const funds = window.FUNDS;
  const portfolio = window.PORTFOLIO;

  const isAll = view === "all";
  const fund = isAll ? null : funds.find(f => f.id === view);
  const accent = isAll ? defaultAccent : fund.accent;

  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.dataset.density = t.density;
  }, [accent, t.density]);

  // build date range string
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

function FundTabs({ view, setView, funds, portfolio }) {
  const items = [
    { id: "all", short: "All funds", hebrew: "סך הכל",
      accent: "var(--ink)", value: portfolio.summary.finalValueBeforeClose,
      ret: portfolio.summary.totalReturn },
    ...funds.map(f => ({
      id: f.id, short: f.short, hebrew: f.hebrew, accent: f.accent,
      value: f.summary.finalValueBeforeClose, ret: f.summary.totalReturn,
    })),
  ];
  return (
    <div className="fund-tabs">
      {items.map(item => (
        <button
          key={item.id}
          className={"fund-tab " + (view === item.id ? "active" : "")}
          onClick={() => setView(item.id)}
        >
          <span className="fund-tab-mark" style={{ background: item.accent }}></span>
          <div className="fund-tab-meta">
            <div className="fund-tab-name">
              {item.short}
              <span className="fund-tab-hebrew">{item.hebrew}</span>
            </div>
            <div className="fund-tab-stats">
              <span className="mono">{fmtILS(item.value)}</span>
              <span className={"mono " + (item.ret >= 0 ? "pos" : "neg")}>{fmtPct(item.ret)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function OverviewView({ funds, portfolio, compareMode, setView }) {
  return (
    <>
      <PortfolioKPIs portfolio={portfolio} funds={funds} />
      <ComparisonChart funds={funds} mode={compareMode} />
      <FundCompareCards funds={funds} />
      <MonthlyMatrix funds={funds} />
    </>
  );
}

function FundView({ fund, accent }) {
  return (
    <>
      <MetaStrip summary={fund.summary} fundName={fund.name + " · " + fund.hebrew} />
      <KPICards summary={fund.summary} />
      <div className="grid-two">
        <EquityChart series={fund.series} accent={accent} />
        <PeriodPanel series={fund.series} summary={fund.summary} accent={accent} />
      </div>
      <ReturnsBars series={fund.series} accent={accent} />
      <DataTable series={fund.series} accent={accent} />
    </>
  );
}

function PeriodPanel({ series, summary, accent }) {
  const byYear = {};
  series.forEach(r => {
    if (r.price === 0 && !r.flow) return;
    const y = r.date.slice(0, 4);
    if (!byYear[y]) byYear[y] = { profit: 0, flows: 0, months: 0, gains: 0, losses: 0 };
    byYear[y].profit += r.profit || 0;
    byYear[y].flows += r.flow || 0;
    if (r.profit !== null && r.price > 0 && !r.flow) {
      byYear[y].months += 1;
      if (r.profit > 0) byYear[y].gains += 1;
      if (r.profit < 0) byYear[y].losses += 1;
    }
  });
  const years = Object.keys(byYear).sort();
  const maxProfit = Math.max(1, ...years.map(y => Math.abs(byYear[y].profit)));

  return (
    <div className="card period-card">
      <div className="card-head">
        <div className="card-title">By year</div>
        <div className="card-sub">Profit and cash flow per calendar year</div>
      </div>
      <div className="year-list">
        {years.map(y => {
          const d = byYear[y];
          const pos = d.profit >= 0;
          return (
            <div key={y} className="year-row">
              <div className="year-label">{y}</div>
              <div className="year-bar-wrap">
                <div className="year-bar"
                  style={{ width: (Math.abs(d.profit) / maxProfit) * 100 + "%",
                           background: pos ? accent : "var(--loss)" }}></div>
              </div>
              <div className={"year-profit mono " + (pos ? "pos" : "neg")}>{fmtILS(d.profit, { sign: true })}</div>
              <div className="year-meta">
                <span className="pos">{d.gains}</span>
                <span className="dim">/</span>
                <span className="neg">{d.losses}</span>
              </div>
              <div className="year-flow mono">
                {d.flows ? <span className={d.flows > 0 ? "pos" : "neg"}>{fmtILS(d.flows, { sign: true })}</span> : <span className="dim">—</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="period-head">
        <span>Year</span><span></span><span>Profit</span><span>G/L</span><span>Flow</span>
      </div>
    </div>
  );
}

function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Display">
        <TweakRadio
          label="Density"
          value={t.density}
          options={["comfortable", "compact"]}
          onChange={v => setTweak("density", v)}
        />
        <TweakRadio
          label="Comparison"
          value={t.compareMode}
          options={["indexed", "value"]}
          onChange={v => setTweak("compareMode", v)}
        />
      </TweakSection>
      <TweakSection label="Default accent">
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#1f7a4a", "#2a5fb8", "#a04a1b", "#181818"]}
          onChange={v => setTweak("accent", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
