function DataTable({ series, accent }) {
  const [sortKey, setSortKey] = React.useState("date");
  const [sortDir, setSortDir] = React.useState("asc");
  const [filter, setFilter] = React.useState("all"); // all | gains | losses | flows
  const [yearFilter, setYearFilter] = React.useState("all");

  const years = ["all", ...Array.from(new Set(series.map(r => r.date.slice(0, 4))))];

  let rows = series.filter(r => {
    if (yearFilter !== "all" && !r.date.startsWith(yearFilter)) return false;
    if (filter === "gains") return (r.profit || 0) > 0;
    if (filter === "losses") return (r.profit || 0) < 0;
    if (filter === "flows") return !!r.flow;
    return true;
  });

  rows = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function clickSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "asc" : "desc"); }
  }

  function SortHead({ k, children, align = "left" }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => clickSort(k)}
        className={"sortable " + (active ? "active " : "") + "ta-" + align}
      >
        <span>{children}</span>
        <span className="sort-arrow">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
      </th>
    );
  }

  const maxAbsPct = Math.max(0.01, ...series.map(r => Math.abs(r.pct || 0)));

  return (
    <div className="card table-card">
      <div className="card-head row">
        <div>
          <div className="card-title">Monthly ledger</div>
          <div className="card-sub">{rows.length} {rows.length === 1 ? "row" : "rows"} · click any header to sort</div>
        </div>
        <div className="filters">
          <div className="seg">
            {["all", "gains", "losses", "flows"].map(f => (
              <button
                key={f}
                className={"seg-btn " + (filter === f ? "active" : "")}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
          <select className="select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y === "all" ? "All years" : y}</option>)}
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <SortHead k="date">Month</SortHead>
              <SortHead k="price" align="right">Price</SortHead>
              <SortHead k="profit" align="right">Profit</SortHead>
              <SortHead k="pct" align="right">%</SortHead>
              <th className="ta-left">Trend</th>
              <th className="ta-right">Flow</th>
              <th className="ta-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const pos = (r.profit || 0) > 0;
              const neg = (r.profit || 0) < 0;
              const trendW = r.pct !== null ? (Math.abs(r.pct) / maxAbsPct) * 100 : 0;
              return (
                <tr key={r.date}>
                  <td>{fmtMonth(r.date)}</td>
                  <td className="mono ta-right">{r.price > 0 ? fmtILS(r.price) : <span className="dim">—</span>}</td>
                  <td className={"mono ta-right " + (pos ? "pos" : neg ? "neg" : "dim")}>
                    {r.profit !== null ? fmtILS(r.profit, { sign: true }) : "—"}
                  </td>
                  <td className={"mono ta-right " + (pos ? "pos" : neg ? "neg" : "dim")}>
                    {fmtPct(r.pct)}
                  </td>
                  <td className="ta-left">
                    {r.pct !== null && r.pct !== 0 ? (
                      <div className={"trend " + (pos ? "pos" : "neg")}>
                        <span
                          className="trend-bar"
                          style={{
                            width: trendW + "%",
                            background: pos ? accent : "var(--loss)",
                          }}
                        ></span>
                      </div>
                    ) : <span className="dim">—</span>}
                  </td>
                  <td className="mono ta-right">
                    {r.flow ? (
                      <span className={r.flow > 0 ? "pos" : "neg"}>
                        {fmtILS(r.flow, { sign: true })}
                      </span>
                    ) : <span className="dim">—</span>}
                  </td>
                  <td>
                    {r.note ? (
                      <span className={"pill " + r.note}>{r.note}</span>
                    ) : <span className="dim">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { DataTable });
