import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowDown, Check, ChevronRight, CircleHelp, Pause, Play, RotateCcw, Sun, Radio, Moon } from 'lucide-react'
import './App.css'
import { availableSites, formatPercent, formatUtc, loadDataset, sampleIndex } from './data/lumenData'
import { useExplorerStore } from './state/useExplorerStore'
import type { LumenDataset } from './types/data'

function App() {
  const { siteId, cursor, isPlaying, compare, setSiteId, setCursor, setPlaying, setCompare } =
    useExplorerStore()
  const [dataset, setDataset] = useState<LumenDataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadDataset(siteId)
      .then((loaded) => active && setDataset(loaded))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Dataset failed to load.'))
    return () => {
      active = false
    }
  }, [siteId])

  const handleSiteChange = (nextSiteId: string) => {
    setError(null)
    setDataset(null)
    setPlaying(false)
    setSiteId(nextSiteId)
  }

  useEffect(() => {
    if (!isPlaying || !dataset) return
    const timer = window.setInterval(() => {
      const next = cursor + 1
      if (next >= dataset.series.sun_el_deg.length) {
        setPlaying(false)
        return
      }
      setCursor(next)
    }, 140)
    return () => window.clearInterval(timer)
  }, [cursor, dataset, isPlaying, setCursor, setPlaying])

  const index = dataset ? sampleIndex(dataset, cursor) : 0
  const cursorUtc = useMemo(() => {
    if (!dataset) return null
    return new Date(new Date(dataset.time.start_utc).getTime() + index * dataset.time.step_s * 1000).toISOString()
  }, [dataset, index])

  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Lumen home"><span>◒</span> LUMEN</a>
        <nav aria-label="Primary navigation">
          <a href="#explore">Explore</a>
          <a href="#method">Method</a>
          <a href="#limits">Limits</a>
        </nav>
        <span className="status-pill"><span className="status-dot" /> SPICE / STATIC DATA</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">LUNAR LANDING SITE NAVIGATOR · 01</p>
          <h1>Know when<br /><em>the light</em> goes out.</h1>
          <p className="hero-lede">A precise, transparent view of Sun power and geometric direct-to-Earth visibility before you land.</p>
          <a className="primary-button" href="#explore">Open the explorer <ChevronRight size={17} /></a>
        </div>
        <div className="orbital-hero" aria-label="Illustrative lunar globe">
          <div className="moon-glow" />
          <div className="moon-orb"><div className="moon-crater crater-one" /><div className="moon-crater crater-two" /><div className="moon-crater crater-three" /></div>
          <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
          <div className="sun-marker"><Sun size={18} /> SUN</div>
        </div>
        <div className="scroll-cue"><ArrowDown size={16} /> Scroll to explore</div>
      </section>

      <section className="statement section-shell">
        <p className="section-index">L.02 / THE PROBLEM</p>
        <h2>The next landing window is a <span>moving target.</span></h2>
        <div className="statement-grid">
          <p>At the lunar poles, a few degrees decide whether a site sees power or darkness. LUMEN turns a specialist geometry workflow into a calm, inspectable decision surface.</p>
          <div className="principle-list">
            <div><Sun size={18} /><span><b>POWER</b> — Sun elevation at the site horizon</span></div>
            <div><Radio size={18} /><span><b>LINK</b> — Geometric direct-to-Earth visibility</span></div>
            <div><CircleHelp size={18} /><span><b>HONESTY</b> — Every assumption stays visible</span></div>
          </div>
        </div>
      </section>

      <section className="explorer section-shell" id="explore">
        <div className="section-heading">
          <div><p className="section-index">L.03 / LIVE EXPLORER</p><h2>Play the lunar day.</h2></div>
          <div className="disclosure"><AlertTriangle size={15} /> Geometric screening only — terrain not included in v1.</div>
        </div>
        <div className="control-bar">
          <label>Site
            <select value={siteId} onChange={(event) => handleSiteChange(event.target.value)}>
              {availableSites.map((site) => <option key={site.id} value={site.id} disabled={!site.available}>{site.name}{site.available ? '' : ' — dataset pending'}</option>)}
            </select>
          </label>
          <div className="control-actions">
            <button type="button" className={compare ? 'control-button active' : 'control-button'} onClick={() => setCompare(!compare)}>Compare mode</button>
            <button type="button" className="icon-button" title="Reset cursor" onClick={() => setCursor(0)}><RotateCcw size={16} /></button>
          </div>
        </div>
        {error && <div className="error-card"><AlertTriangle size={20} /><div><b>Dataset unavailable</b><p>{error}</p></div></div>}
        {dataset && <Explorer dataset={dataset} cursor={cursor} index={index} cursorUtc={cursorUtc} isPlaying={isPlaying} setCursor={setCursor} setPlaying={setPlaying} compare={compare} />}
      </section>

      <section className="method section-shell" id="method">
        <p className="section-index">L.04 / METHOD</p>
        <div className="method-grid">
          <div><h2>From kernels<br />to a clear answer.</h2><p>Numbers are computed offline with NASA SPICE, then rendered from static JSON. The browser never invents ephemeris data.</p></div>
          <div className="method-facts">
            <Fact label="Coordinate frame" value={dataset?.site.frame ?? 'MOON_ME_DE440_ME421'} />
            <Fact label="Time path" value="UTC → ET/TDB → UTC" />
            <Fact label="Local horizon" value="ENU · flat reference sphere" />
            <Fact label="Aberration" value={dataset?.provenance.aberration ?? 'LT+S'} />
          </div>
        </div>
      </section>

      <section className="limits section-shell" id="limits">
        <div className="limits-card"><Moon size={24} /><div><p className="section-index">L.05 / LIMITS</p><h2>A screening aid, not a landing approval.</h2><p>Terrain, thermal margins, link budgets, relay scheduling, and operational constraints are outside this v1. Artistic Moon graphics are illustrative.</p></div></div>
      </section>
      <footer><span>◒ LUMEN</span><span>NASA SPACE APPS · CAIRO 2026</span><span>SPICE geometry · transparent by design</span></footer>
    </main>
  )
}

function Explorer({ dataset, cursor, index, cursorUtc, isPlaying, setCursor, setPlaying, compare }: { dataset: LumenDataset; cursor: number; index: number; cursorUtc: string | null; isPlaying: boolean; setCursor: (value: number) => void; setPlaying: (value: boolean) => void; compare: boolean }) {
  const sun = dataset.series.sun_el_deg[index]
  const earth = dataset.series.earth_el_deg[index]
  const earthVisible = earth > 0
  const verdict = dataset.summary.sunlit_fraction >= 0.6 && dataset.summary.earth_center_visible_fraction >= 0.7 ? 'GO' : dataset.summary.sunlit_fraction >= 0.3 ? 'CAUTION' : 'NO-GO'
  return <div className="explorer-panel">
    {compare && <div className="compare-note"><Check size={15} /> Compare mode is ready for a second generated dataset. Like-for-like values require matching windows and steps.</div>}
    <div className="readout-grid">
      <div className="dome-card"><div className="card-label">LOCAL SKY · {dataset.site.name.toUpperCase()}</div><div className="sky-dome"><div className="horizon-line" /><div className="sky-sun" style={{ left: `${50 + (dataset.series.sun_az_deg[index] - 180) / 3}%`, bottom: `${Math.max(8, Math.min(87, 50 + sun * 2))}%` }}><Sun size={17} /><span>{sun.toFixed(2)}°</span></div><div className="sky-earth" style={{ left: `${50 + (dataset.series.earth_az_deg[index] - 180) / 3}%`, bottom: `${Math.max(8, Math.min(87, 50 + earth * 2))}%` }}><Radio size={15} /><span>{earth.toFixed(2)}°</span></div><span className="horizon-label">HORIZON · 0° ELEVATION</span></div><div className="legend"><span><i className="sun-dot" /> SUN</span><span><i className="earth-dot" /> EARTH</span><span>AZ CLOCKWISE FROM NORTH</span></div></div>
      <div className="metrics-card"><div className="card-label">AT CURSOR</div><div className="cursor-time">{cursorUtc ? formatUtc(cursorUtc) : '—'} <span>UTC</span></div><Metric icon={<Sun size={16} />} label="Sun elevation" value={`${sun.toFixed(2)}°`} state={sun > 0 ? 'ABOVE HORIZON' : 'BELOW HORIZON'} /><Metric icon={<Radio size={16} />} label="Earth centre" value={`${earth.toFixed(2)}°`} state={earthVisible ? 'VISIBLE' : 'BELOW HORIZON'} /><Metric icon={<Moon size={16} />} label="Earth disc radius" value={`${dataset.series.earth_radius_deg[index].toFixed(2)}°`} state="APPARENT ANGULAR RADIUS" /></div>
      <div className={`verdict-card verdict-${verdict.toLowerCase()}`}><div className="card-label">SCREENING INDICATOR</div><div className="verdict-word">{verdict}</div><p>Visible inputs: {formatPercent(dataset.summary.sunlit_fraction)} sunlit · {formatPercent(dataset.summary.earth_center_visible_fraction)} Earth-centre visible</p><small>Placeholder thresholds, not NASA criteria.</small></div>
    </div>
    <div className="timeline-card"><div className="timeline-head"><div className="card-label">TIME WINDOW · {dataset.time.step_s / 60} MIN STEPS</div><span>{index + 1} / {dataset.series.sun_el_deg.length}</span></div><input aria-label="Time cursor" type="range" min="0" max={dataset.series.sun_el_deg.length - 1} value={cursor} onChange={(event) => setCursor(Number(event.target.value))} /><div className="timeline-labels"><span>{formatUtc(dataset.time.start_utc)}</span><span>{formatUtc(dataset.time.end_utc)}</span></div><button type="button" className="play-button" onClick={() => setPlaying(!isPlaying)}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? 'Pause' : 'Play time cursor'}</button></div>
  </div>
}

function Metric({ icon, label, value, state }: { icon: ReactNode; label: string; value: string; state: string }) {
  return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small>{state}</small></div></div>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>
}

export default App
