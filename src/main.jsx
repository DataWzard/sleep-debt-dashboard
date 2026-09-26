import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlarmClock,
  BatteryLow,
  BedDouble,
  Coffee,
  Moon,
  Smartphone,
  Sparkles,
  SunDim,
  Users
} from "lucide-react";
import "./styles.css";

const DATA_URL = `${import.meta.env.BASE_URL}data/sleep-summary.json`;
const debtOrder = ["Optimal Recovery", "Mild Deficit", "Moderate Debt", "Severe Sleep Debt"];
const debtColor = {
  "Severe Sleep Debt": "var(--risk-high)",
  "Moderate Debt": "var(--risk-mid)",
  "Mild Deficit": "var(--risk-low)",
  "Optimal Recovery": "var(--risk-rested)"
};

function App() {
  const [data, setData] = useState(null);
  const [selectedApp, setSelectedApp] = useState("All apps");
  const [debtFilter, setDebtFilter] = useState("All categories");
  const [nightMode, setNightMode] = useState(false);
  const [maxPhoneMinutes, setMaxPhoneMinutes] = useState(210);
  const [sortKey, setSortKey] = useState("fatigue");

  useEffect(() => {
    fetch(DATA_URL)
      .then((response) => response.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const filteredCells = useMemo(() => {
    if (!data) return [];
    return data.cells.filter((cell) => {
      const [app, debt] = cell.keys;
      const appMatch = selectedApp === "All apps" || app === selectedApp;
      const debtMatch = debtFilter === "All categories" || debt === debtFilter;
      return appMatch && debtMatch;
    });
  }, [data, selectedApp, debtFilter]);

  const summary = useMemo(() => summarize(filteredCells), [filteredCells]);
  const debtRows = useMemo(() => groupBy(filteredCells, 1, debtOrder), [filteredCells]);
  const occupationRows = useMemo(() => groupBy(filteredCells, 2).sort((a, b) => b.count - a.count), [filteredCells]);
  const appRows = useMemo(() => groupBy(filteredCells, 0).sort((a, b) => b[sortKey] - a[sortKey]), [filteredCells, sortKey]);
  const screenRows = useMemo(() => {
    const chartCells = filteredCells.filter((cell) => Number(cell.keys[4].split("-")[0]) <= maxPhoneMinutes);
    return groupBy(chartCells, 4).sort((a, b) => binStart(a.name) - binStart(b.name));
  }, [filteredCells, maxPhoneMinutes]);
  const fatigueSegments = useMemo(() => {
    if (!data) return [];
    return data.fatigueSegments
      .filter((row) => {
        const [app, , , debt] = row.keys;
        return (selectedApp === "All apps" || app === selectedApp) && (debtFilter === "All categories" || debt === debtFilter);
      })
      .sort((a, b) => b.fatigue - a.fatigue)
      .slice(0, 10);
  }, [data, selectedApp, debtFilter]);

  if (!data) {
    return (
      <main className="app">
        <div className="loading">Loading sleep dashboard...</div>
      </main>
    );
  }

  return (
    <main className={nightMode ? "app night" : "app"}>
      <AuroraBackground />
      <div className="app-shell">
        <section className="hero">
          <div>
            <div className="eyebrow">
              <Sparkles size={16} />
              Aggregated sleep analytics portfolio case study
            </div>
            <h1>Bedtime Screen Time & Sleep Debt Dashboard</h1>
            <p>
              Explore how late-night phone behavior, caffeine, work context, and sleep patterns connect to fatigue
              across {data.totalRows.toLocaleString()} anonymized survey records.
            </p>
          </div>
          <button className="icon-button" onClick={() => setNightMode((value) => !value)}>
            {nightMode ? <SunDim size={18} /> : <Moon size={18} />}
            {nightMode ? "Day view" : "Night view"}
          </button>
        </section>

        <section className="control-band" aria-label="Dashboard filters">
          <label>
            Bedtime app
            <select value={selectedApp} onChange={(event) => setSelectedApp(event.target.value)}>
              {["All apps", ...data.categories.apps].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Sleep debt
            <select value={debtFilter} onChange={(event) => setDebtFilter(event.target.value)}>
              {["All categories", ...debtOrder].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="kpi-grid" aria-label="Key performance indicators">
          <Kpi icon={<Users />} label="Segment records" value={summary.count.toLocaleString()} context="aggregated people" />
          <Kpi icon={<BedDouble />} label="Avg. sleep" value={`${summary.sleep.toFixed(1)}h`} context="total nightly sleep" />
          <Kpi icon={<Smartphone />} label="Avg. phone time" value={`${summary.phone.toFixed(0)}m`} context="in bed before sleep" />
          <Kpi icon={<BatteryLow />} label="Severe debt" value={`${summary.severeShare.toFixed(0)}%`} context="of selected segment" />
          <Kpi icon={<AlarmClock />} label="Sleep latency" value={`${summary.latency.toFixed(0)}m`} context="time to fall asleep" />
          <Kpi icon={<Activity />} label="Fatigue score" value={summary.fatigue.toFixed(1)} context="next-day rating" />
        </section>

        <section className="dashboard-grid">
          <article className="panel span-7">
            <PanelHeader title="Sleep Debt Mix" caption="Filtered population by debt severity, with average sleep and phone use." />
            <DebtBars rows={debtRows} total={summary.count} />
          </article>

          <article className="panel span-5">
            <PanelHeader title="Screen Time Curve" caption="Average sleep and fatigue by bedtime phone-time bands." />
            <label className="chart-range">
              <span className="chart-range-copy">
                <strong>Max in-bed phone use</strong>
                <small>Limits this chart to records at or below the selected time.</small>
              </span>
              <span className="chart-range-value">{maxPhoneMinutes} minutes</span>
              <input
                type="range"
                min="15"
                max="210"
                step="15"
                value={maxPhoneMinutes}
                onChange={(event) => setMaxPhoneMinutes(Number(event.target.value))}
                aria-label="Maximum in-bed phone use in minutes"
              />
            </label>
            <DualLineChart rows={screenRows} />
          </article>

          <article className="panel span-6">
            <PanelHeader title="Average Sleep By Occupation" caption="Compare nightly sleep across work and study groups." />
            <HorizontalBars rows={occupationRows} metric="sleep" suffix="h" />
          </article>

          <article className="panel span-6">
            <div className="panel-header row-header">
              <div>
                <h2>Sleep And Fatigue Patterns X App</h2>
                <p>Compare sleep and fatigue patterns by the primary app used before bed.</p>
              </div>
              <label className="sort-control">
                <span>Sort:</span>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                  <option value="fatigue">Fatigue</option>
                  <option value="phone">Phone time</option>
                  <option value="sleep">Sleep</option>
                  <option value="count">Volume</option>
                </select>
              </label>
            </div>
            <AppLeaderboard rows={appRows} />
          </article>

          <article className="panel span-12">
            <PanelHeader title="Highest Fatigue Segments" caption="Grouped segments with at least 25 records; no row-level records are published." />
            <SegmentTable rows={fatigueSegments} />
          </article>
        </section>
      </div>
    </main>
  );
}

function AuroraBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame;
    let width = 0;
    let height = 0;
    let stars = [];

    const random = (seed) => {
      const value = Math.sin(seed * 999.91) * 43758.5453;
      return value - Math.floor(value);
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stars = Array.from({ length: Math.round((width * height) / 9000) }, (_, index) => ({
        x: random(index + 4) * width,
        y: random(index + 81) * height * 0.78,
        radius: 0.35 + random(index + 173) * 1.2,
        alpha: 0.25 + random(index + 291) * 0.65
      }));
    };

    const drawCurtain = (time, center, spread, hueStart, phase) => {
      context.save();
      context.globalCompositeOperation = "screen";
      context.lineCap = "round";
      context.shadowBlur = 20;

      for (let offset = -spread; offset <= spread; offset += 7) {
        const normalized = Math.abs(offset / spread);
        const strength = Math.pow(1 - normalized, 1.7);
        if (strength < 0.025) continue;

        const wave = Math.sin(time * 0.00032 + offset * 0.018 + phase);
        const secondWave = Math.sin(time * 0.00019 - offset * 0.011 + phase * 1.8);
        const x = center + offset + wave * 32 + secondWave * 18;
        const lowerEdge = height * (0.46 + strength * 0.19 + wave * 0.055);
        const hue = hueStart + offset * 0.09 + secondWave * 16;
        const gradient = context.createLinearGradient(x, -height * 0.08, x, lowerEdge);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 58%, 0)`);
        gradient.addColorStop(0.32, `hsla(${hue}, 100%, 60%, ${0.08 * strength})`);
        gradient.addColorStop(0.78, `hsla(${hue}, 100%, 58%, ${0.62 * strength})`);
        gradient.addColorStop(1, `hsla(${hue + 20}, 100%, 70%, 0)`);
        context.strokeStyle = gradient;
        context.shadowColor = `hsla(${hue}, 100%, 60%, ${0.42 * strength})`;
        context.lineWidth = 8 + strength * 18;
        context.beginPath();
        context.moveTo(x - wave * 8, -height * 0.08);
        context.bezierCurveTo(
          x + secondWave * 35,
          height * 0.18,
          x - wave * 48,
          height * 0.34,
          x + secondWave * 22,
          lowerEdge
        );
        context.stroke();
      }
      context.restore();
    };

    const draw = (time = 0) => {
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#03020d");
      sky.addColorStop(0.58, "#080d28");
      sky.addColorStop(1, "#07192a");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      for (const star of stars) {
        const shimmer = 0.72 + Math.sin(time * 0.0012 + star.x) * 0.28;
        context.fillStyle = `rgba(224, 239, 255, ${star.alpha * shimmer})`;
        context.fillRect(star.x, star.y, star.radius, star.radius);
      }

      drawCurtain(time, width * 0.22, width * 0.28, 118, 0.4);
      drawCurtain(time, width * 0.52, width * 0.24, 294, 2.1);
      drawCurtain(time, width * 0.79, width * 0.25, 154, 4.2);

      if (!reduceMotion.matches) animationFrame = requestAnimationFrame(draw);
    };

    const restart = () => {
      cancelAnimationFrame(animationFrame);
      draw(performance.now());
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    reduceMotion.addEventListener("change", restart);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      reduceMotion.removeEventListener("change", restart);
    };
  }, []);

  return <canvas ref={canvasRef} className="aurora-canvas" aria-hidden="true" />;
}

function summarize(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      const count = row.count;
      acc.count += count;
      for (const key of ["phone", "latency", "sleep", "fatigue", "caffeine", "activity"]) {
        acc[key] += row[key] * count;
      }
      acc.severe += row.severeShare * count;
      return acc;
    },
    { count: 0, phone: 0, latency: 0, sleep: 0, fatigue: 0, caffeine: 0, activity: 0, severe: 0 }
  );
  if (!totals.count) return { count: 0, phone: 0, latency: 0, sleep: 0, fatigue: 0, caffeine: 0, activity: 0, severeShare: 0 };
  return {
    count: totals.count,
    phone: totals.phone / totals.count,
    latency: totals.latency / totals.count,
    sleep: totals.sleep / totals.count,
    fatigue: totals.fatigue / totals.count,
    caffeine: totals.caffeine / totals.count,
    activity: totals.activity / totals.count,
    severeShare: totals.severe / totals.count
  };
}

function groupBy(rows, keyIndex, preferredOrder = null) {
  const groups = new Map();
  for (const row of rows) {
    const name = row.keys[keyIndex];
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  const grouped = [...groups.entries()].map(([name, items]) => ({ name, ...summarize(items) }));
  if (preferredOrder) grouped.sort((a, b) => preferredOrder.indexOf(a.name) - preferredOrder.indexOf(b.name));
  return grouped;
}

function binStart(label) {
  return Number(String(label).split("-")[0]);
}

function Kpi({ icon, label, value, context }) {
  return (
    <article className="kpi">
      <div className="kpi-icon">{React.cloneElement(icon, { size: 19 })}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{context}</small>
      </div>
    </article>
  );
}

function PanelHeader({ title, caption }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <p>{caption}</p>
    </div>
  );
}

function DebtBars({ rows, total }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="debt-bars">
      {rows.map((row) => {
        const share = total ? (row.count / total) * 100 : 0;
        return (
          <div className="debt-row" key={row.name}>
            <div className="debt-label">
              <strong>{row.name}</strong>
              <span>{share.toFixed(1)}% of segment</span>
            </div>
            <div className="track" aria-label={`${row.name} ${share.toFixed(1)} percent`}>
              <div style={{ width: `${share}%`, background: debtColor[row.name] }} />
            </div>
            <div className="debt-metrics">
              <span>{row.count.toLocaleString()} records</span>
              <span>{row.sleep.toFixed(1)}h sleep</span>
              <span>{row.phone.toFixed(0)}m phone</span>
              <span>{row.fatigue.toFixed(1)} fatigue</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DualLineChart({ rows }) {
  if (!rows.length) return <EmptyState />;
  const width = 560;
  const height = 300;
  const padding = { top: 22, right: 36, bottom: 46, left: 52 };
  const x = (index) => padding.left + (index / Math.max(rows.length - 1, 1)) * (width - padding.left - padding.right);
  const ySleep = (value) => padding.top + ((9 - value) / 6.5) * (height - padding.top - padding.bottom);
  const yFatigue = (value) => padding.top + ((10 - value) / 10) * (height - padding.top - padding.bottom);
  const sleepPath = rows.map((row, index) => `${index ? "L" : "M"}${x(index)},${ySleep(row.sleep)}`).join(" ");
  const fatiguePath = rows.map((row, index) => `${index ? "L" : "M"}${x(index)},${yFatigue(row.fatigue)}`).join(" ");
  const ticks = [3, 4.5, 6, 7.5, 9];

  return (
    <div className="chart-scroll" role="region" aria-label="Scrollable screen time chart">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart of phone time bands against sleep and fatigue">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={padding.left} x2={width - padding.right} y1={ySleep(tick)} y2={ySleep(tick)} className="grid-line" />
          <text x={padding.left - 12} y={ySleep(tick) + 4} textAnchor="end">
            {tick}h
          </text>
        </g>
      ))}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="axis-line" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="axis-line" />
      <path d={sleepPath} className="sleep-line" />
      <path d={fatiguePath} className="fatigue-line" />
      {rows.map((row, index) => (
        <g key={row.name}>
          <circle cx={x(index)} cy={ySleep(row.sleep)} r="4" className="sleep-dot">
            <title>{`${row.name} min: ${row.sleep.toFixed(1)}h avg sleep`}</title>
          </circle>
          <circle cx={x(index)} cy={yFatigue(row.fatigue)} r="4" className="fatigue-dot">
            <title>{`${row.name} min: ${row.fatigue.toFixed(1)} fatigue`}</title>
          </circle>
          {index % 2 === 0 && (
            <text x={x(index)} y={height - 18} textAnchor="middle">
              {row.name}
            </text>
          )}
        </g>
      ))}
      <text x={width / 2} y={height - 2} textAnchor="middle" className="axis-title">
        Bedtime phone-minute bands
      </text>
      <g className="legend" transform={`translate(${padding.left}, 14)`}>
        <circle r="4" className="sleep-dot" />
        <text x="10" y="4">Sleep hours</text>
        <circle cx="102" r="4" className="fatigue-dot" />
        <text x="112" y="4">Fatigue score</text>
      </g>
      </svg>
    </div>
  );
}

function HorizontalBars({ rows, metric, suffix }) {
  if (!rows.length) return <EmptyState />;
  const maxValue = Math.max(...rows.map((row) => row[metric]), 1);
  return (
    <div className="rank-list">
      {rows.map((row) => (
        <div className="rank-row" key={row.name}>
          <div className="rank-copy">
            <strong>{row.name}</strong>
            <span>{row.count.toLocaleString()} records</span>
          </div>
          <div className="mini-track">
            <div style={{ width: `${(row[metric] / maxValue) * 100}%` }} />
          </div>
          <b>
            {row[metric].toFixed(metric === "sleep" ? 1 : 0)}
            {suffix}
          </b>
        </div>
      ))}
    </div>
  );
}

function AppLeaderboard({ rows }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="leaderboard">
      {rows.map((row, index) => (
        <article key={row.name} className="leader-row">
          <span className="leader-index">{index + 1}</span>
          <div>
            <strong>{row.name}</strong>
            <span>{row.count.toLocaleString()} records</span>
          </div>
          <div className="leader-metrics">
            <span>{row.fatigue.toFixed(1)} fatigue</span>
            <span>{row.phone.toFixed(0)}m phone</span>
            <span>{row.sleep.toFixed(1)}h</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function SegmentTable({ rows }) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>App</th>
            <th>Occupation</th>
            <th>Chronotype</th>
            <th>Debt</th>
            <th>Records</th>
            <th>Avg. phone</th>
            <th>Avg. sleep</th>
            <th>Avg. caffeine</th>
            <th>Fatigue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.keys.join("|")}>
              <td>{row.keys[0]}</td>
              <td>{row.keys[1]}</td>
              <td>{row.keys[2]}</td>
              <td>
                <span className="debt-pill" style={{ "--pill": debtColor[row.keys[3]] }}>
                  {row.keys[3]}
                </span>
              </td>
              <td>{row.count.toLocaleString()}</td>
              <td>{row.phone.toFixed(0)}m</td>
              <td>{row.sleep.toFixed(1)}h</td>
              <td>{row.caffeine.toFixed(0)}mg</td>
              <td>{row.fatigue.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <Coffee size={22} />
      <p>No records match the current filters.</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
