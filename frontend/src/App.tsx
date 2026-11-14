import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowDown,
  Check,
  ChevronRight,
  CircleHelp,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Radio,
  Moon,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Volume2,
  VolumeX,
  Menu,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./App.css";
import {
  availableSites,
  calculateVerdict,
  eventSampleIndex,
  formatCountdown,
  formatPercent,
  formatUtc,
  loadDataset,
  nextEvent as findNextEvent,
  sampleIndex,
  utcInputSampleIndex,
  utcInputValue,
} from "./data/lumenData";
import { useExplorerStore } from "./state/useExplorerStore";
import type { LumenDataset } from "./types/data";
import {
  computeScenarioMetrics,
  latestScenarioDate,
  secondScenarioDate,
  SCHEDULE_WINDOW_DAYS,
  utcDateInput,
  utcDateInputStart,
  type ScenarioMetrics,
} from "./data/scheduleSlip";
import { horizonSensitivity } from "./data/horizonSensitivity";
import { cachedLiveHorizons, fetchLiveHorizons, type LiveHorizonsSnapshot } from "./data/liveHorizons";
import { cachedLiveOrbits, fetchLiveOrbits, type LiveOrbitData } from "./data/liveOrbits";
import UniverseCanvas from "./features/UniverseCanvas";
import CustomCursor from "./features/CustomCursor";
import { useLumenAudio } from "./features/useLumenAudio";
import verdictConfig from "../../config/verdict.json";

gsap.registerPlugin(ScrollTrigger);
const OrbitalScene = lazy(() => import("./features/OrbitalScene"));
const horizonsValidationBySite: Record<string, string> = {
  "apollo-11": "3 epochs · max Δ az 0.004° / el 0.003° · tolerance 0.1°",
  "apollo-12": "3 epochs · max Δ az 0.005° / el 0.004° · tolerance 0.1°",
  "shackleton-rim": "3 epochs · max Δ az 0.005° / el 0.005° · tolerance 0.1°",
  "de-gerlache-rim": "3 epochs · max Δ az 0.003° / el 0.003° · tolerance 0.1°",
  "malapert-massif": "3 epochs · max Δ az 0.005° / el 0.005° · tolerance 0.1°",
};

function App() {
  const {
    siteId,
    compareSiteId,
    cursor,
    isPlaying,
    compare,
    setSiteId,
    setCompareSiteId,
    setCursor,
    setPlaying,
    setCompare,
  } = useExplorerStore();
  const audio = useLumenAudio();
  const [dataset, setDataset] = useState<LumenDataset | null>(null);
  const [compareDataset, setCompareDataset] = useState<LumenDataset | null>(
    null,
  );
  const [compareError, setCompareError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveHorizonsSnapshot | null>(null);
  const [compareLiveSnapshot, setCompareLiveSnapshot] = useState<LiveHorizonsSnapshot | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  // Autoplay the hero film by default, except when the visitor requests reduced motion.
  const [ambientVideo] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const [heroVideoError, setHeroVideoError] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lenis = prefersReducedMotion ? null : new Lenis({ autoRaf: false });
    const raf = (time: number) => lenis?.raf(time * 1000);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
    }
    const context = gsap.context(() => {
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-copy > *", {
          y: 30,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
        });
        gsap.from(".hero-instrument", {
          y: 20,
          opacity: 0,
          duration: 1,
          delay: 0.35,
          ease: "power3.out",
        });
        gsap.to(".hero-video", {
          scale: 1.08,
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".scroll-progress-fill", {
          scaleX: 1,
          transformOrigin: "left center",
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.2,
          },
        });
        gsap.to(".hero-copy", {
          y: -42,
          opacity: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.7,
          },
        });
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
          gsap.from(element, {
            y: 26,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 84%", once: true },
          });
        });
        gsap.utils.toArray<HTMLAnchorElement>(".journey-rail a").forEach((link) => {
          const target = link.getAttribute("href");
          if (!target) return;
          ScrollTrigger.create({
            trigger: target,
            start: "top 55%",
            end: "bottom 45%",
            toggleClass: { targets: link, className: "is-active" },
          });
        });
        gsap.utils.toArray<HTMLElement>(".statement, .explorer, .method").forEach((section) => {
          const items = section.querySelectorAll(".section-index, h2, .statement-grid > *, .control-bar, .explorer-panel, .method-facts > *");
          if (!items.length) return;
          gsap.from(items, {
            y: 18,
            opacity: 0,
            duration: 0.65,
            stagger: 0.07,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 76%", once: true },
          });
        });
        const celestialTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".celestial-section",
            start: "top 78%",
            end: "bottom 34%",
            scrub: 0.8,
          },
        });
        celestialTimeline
          .fromTo(
            ".celestial-canvas-shell",
            { clipPath: "inset(12% 10% 12% 10% round 8px)", scale: 0.94 },
            {
              clipPath: "inset(0% 0% 0% 0% round 8px)",
              scale: 1,
              ease: "none",
            },
            0,
          )
          .fromTo(
            ".celestial-step",
            { y: 22, opacity: 0.35 },
            { y: 0, opacity: 1, stagger: 0.18, ease: "none" },
            0.08,
          )
          .fromTo(
            ".celestial-data-stamp",
            { x: 16, opacity: 0 },
            { x: 0, opacity: 1, ease: "none" },
            0.15,
          );
      });
      return () => motion.revert();
    }, root);
    return () => {
      context.revert();
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        gsap.ticker.remove(raf);
        lenis.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!ambientVideo) return;
    const video = heroVideoRef.current;
    if (!video) return;
    video.play().catch(() => setHeroVideoPlaying(false));
  }, [ambientVideo]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  const toggleHeroVideo = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    setHeroVideoError(false);
    if (video.paused) {
      video.play().catch(() => setHeroVideoError(true));
    } else {
      video.pause();
    }
  };

  useEffect(() => {
    let active = true;
    loadDataset(siteId)
      .then((loaded) => active && setDataset(loaded))
      .catch(
        (reason: unknown) =>
          active &&
          setError(
            reason instanceof Error
              ? reason.message
              : "Dataset failed to load.",
          ),
      );
    return () => {
      active = false;
    };
  }, [siteId]);

  useEffect(() => {
    let active = true;
    if (!compare) {
      setCompareDataset(null);
      setCompareError(null);
      return () => {
        active = false;
      };
    }
    setCompareDataset(null);
    setCompareError(null);
    loadDataset(compareSiteId)
      .then((loaded) => active && setCompareDataset(loaded))
      .catch(
        (reason: unknown) =>
          active &&
          setCompareError(
            reason instanceof Error
              ? reason.message
              : "Comparison dataset failed to load.",
          ),
      );
    return () => {
      active = false;
    };
  }, [compare, compareSiteId]);

  const handleSiteChange = (nextSiteId: string) => {
    audio.playCue(520);
    setError(null);
    setDataset(null);
    setPlaying(false);
    setSiteId(nextSiteId);
  };

  useEffect(() => {
    if (!isPlaying || !dataset) return;
    const timer = window.setInterval(() => {
      const next = cursor + 1;
      if (next >= dataset.series.sun_el_deg.length) {
        setPlaying(false);
        return;
      }
      setCursor(next);
    }, 140);
    return () => window.clearInterval(timer);
  }, [cursor, dataset, isPlaying, setCursor, setPlaying]);

  const index = dataset ? sampleIndex(dataset, cursor) : 0;
  const cursorUtc = useMemo(() => {
    if (!dataset) return null;
    return new Date(
      new Date(dataset.time.start_utc).getTime() +
        index * dataset.time.step_s * 1000,
    ).toISOString();
  }, [dataset, index]);
  const coordinateSourceUrl = dataset?.site.source.match(/https?:\/\/\S+/)?.[0];
  const refreshLive = useCallback(async (signal?: AbortSignal) => {
    if (!dataset) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const siteIds = [dataset.site.id];
      if (compare && compareDataset && compareDataset.site.id !== dataset.site.id) {
        siteIds.push(compareDataset.site.id);
      }
      const results = await Promise.allSettled(siteIds.map((id) => fetchLiveHorizons(id, signal)));
      if (results[0].status === "fulfilled") setLiveSnapshot(results[0].value);
      else setLiveSnapshot((current) => current?.siteId === siteIds[0] ? current : cachedLiveHorizons(siteIds[0]));
      if (results[1]?.status === "fulfilled") setCompareLiveSnapshot(results[1].value);
      else if (siteIds[1]) setCompareLiveSnapshot((current) => current?.siteId === siteIds[1] ? current : cachedLiveHorizons(siteIds[1]));
      else if (siteIds.length < 2) setCompareLiveSnapshot(null);
      const failures = results.flatMap((result, index) => result.status === "rejected"
        ? [`${index === 0 ? "Selected site" : "Comparison site"}: ${result.reason instanceof Error ? result.reason.message : "JPL Horizons is unavailable."}`]
        : []);
      if (failures.length) setLiveError(failures.join(" · "));
    } catch (reason) {
      if (signal?.aborted) return;
      setLiveError(reason instanceof Error ? reason.message : "Live ephemeris is unavailable.");
    } finally {
      if (!signal?.aborted) setLiveLoading(false);
    }
  }, [compare, compareDataset, dataset]);

  useEffect(() => {
    if (!dataset) return;
    const controller = new AbortController();
    void refreshLive(controller.signal);
    const interval = window.setInterval(() => void refreshLive(controller.signal), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [dataset, refreshLive]);

  return (
    <main ref={pageRef} className="min-h-screen">
      <div className="scroll-progress" aria-hidden="true">
        <span className="scroll-progress-fill" />
      </div>
      <div className="universe-backdrop" aria-hidden="true" />
      <UniverseCanvas snapshot={liveSnapshot?.siteId === siteId ? liveSnapshot : null} siteName={dataset?.site.name ?? "Selected site"} />
      <CustomCursor />
      <div className="universe-caption"><span>STARFIELD · ILLUSTRATIVE</span><i /><span>{liveSnapshot?.siteId === siteId ? `LIVE SKY · ${dataset?.site.name ?? "SITE"} · ${formatUtc(liveSnapshot.asOfUtc)} UTC` : "LOCAL SKY · AWAITING HORIZONS"}</span></div>
      <nav className="journey-rail" aria-label="Journey chapters">
        <a href="#top"><i /> <span>ARRIVAL</span></a>
        <a href="#problem"><i /> <span>THE QUESTION</span></a>
        <a href="#celestial"><i /> <span>ORBITAL VIEW</span></a>
        <a href="#explore"><i /> <span>MISSION CONTROL</span></a>
        <a href="#method"><i /> <span>THE METHOD</span></a>
      </nav>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Lumen home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <b />
            <em />
          </span>
          <span className="wordmark-type">
            LUMEN<small>FIELD NOTES / 01</small>
          </span>
        </a>
        <nav id="primary-navigation" className={`nav-links${mobileNavOpen ? " is-mobile-open" : ""}`} aria-label="Primary navigation">
          <a href="#explore" onClick={() => setMobileNavOpen(false)}>Explore</a>
          <a href="#method" onClick={() => setMobileNavOpen(false)}>Method</a>
          <a href="#limits" onClick={() => setMobileNavOpen(false)}>Limits</a>
          <a href="#credits" onClick={() => setMobileNavOpen(false)}>Credits</a>
        </nav>
        <div className="nav-right">
          <span className="status-pill">
            <span className="status-dot" /> SPICE / PRECOMPUTED JSON
          </span>
          <button
            type="button"
            className={audio.enabled ? "sound-toggle is-on" : "sound-toggle"}
            onClick={() => void audio.toggle()}
            aria-pressed={audio.enabled}
            aria-label={audio.enabled ? "Turn off Lumen soundscape" : "Turn on Lumen soundscape"}
            title={audio.enabled ? "Soundscape on" : "Soundscape off"}
          >
            {audio.enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{audio.enabled ? "SOUND ON" : "SOUND OFF"}</span>
          </button>
          {audio.enabled && (
            <input
              className="sound-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audio.volume}
              onChange={(event) => audio.setVolume(Number(event.target.value))}
              aria-label="Soundscape volume"
              title="Soundscape volume"
            />
          )}
          <a className="nav-cta" href="#explore">
            Open navigator <ChevronRight size={14} />
          </a>
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-expanded={mobileNavOpen}
            aria-controls="primary-navigation"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <video
          ref={heroVideoRef}
          className="hero-video"
          autoPlay={ambientVideo}
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/moon-surface-poster.webp"
          aria-hidden="true"
          onPlaying={() => setHeroVideoPlaying(true)}
          onPause={() => setHeroVideoPlaying(false)}
          onError={() => {
            setHeroVideoPlaying(false);
            setHeroVideoError(true);
          }}
        >
          <source
            src="/videos/moon-rotation-svs-720p.mp4"
            type="video/mp4"
          />
        </video>
        <div
          className={`hero-video-poster${heroVideoPlaying ? " is-playing" : ""}`}
          aria-hidden="true"
        />
        <div className="hero-film-shade" aria-hidden="true" />
        <button
          type="button"
          className="hero-video-toggle"
          onClick={toggleHeroVideo}
          aria-label={heroVideoPlaying ? "Pause lunar background video" : "Play lunar background video"}
        >
          {heroVideoPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{heroVideoPlaying ? "PAUSE FILM" : "PLAY FILM"}</span>
        </button>
        {heroVideoError && <span className="hero-video-message">Video unavailable · showing still image</span>}
        <div className="hero-frame-mark" aria-hidden="true">
          <span>MOON / SURFACE STUDY</span>
          <i />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-mark" /> LUNAR LANDING SITE NAVIGATOR{" "}
            <span>// FIELD NOTE 01</span>
          </p>
          <h1>
            Know when
            <br />
            <em>the light</em> goes out.
          </h1>
          <p className="hero-lede">
            A precise, transparent view of Sun power and geometric
            direct-to-Earth visibility before you land.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#explore">
              Open the explorer <ChevronRight size={17} />
            </a>
            <span>
              5 CANDIDATE SITES <i /> STATIC SPICE DATA
            </span>
          </div>
        </div>
        <div className="hero-instrument">
          <span className="instrument-label">THE LUNAR DAY, MADE LEGIBLE</span>
          <div className="instrument-row">
            <Sun size={17} />
            <span>POWER</span>
            <b>Sun / local horizon</b>
          </div>
          <div className="instrument-row">
            <Radio size={17} />
            <span>LINK</span>
            <b>Earth / line of sight</b>
          </div>
          <p>
            Geometric screening only
            <br />
            Terrain is not included in v1.
          </p>
        </div>
        <div className="hero-bottomline">
            <span>ILLUSTRATIVE LUNAR FOOTAGE</span>
          <span>
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </span>
          <span>ARTEMIS ERA / CAIRO 2026</span>
        </div>
      </section>

      <section className="statement section-shell reveal" id="problem">
        <p className="section-index">L.02 / THE PROBLEM</p>
        <h2>
          The next landing window is a <span>moving target.</span>
        </h2>
        <div className="statement-grid">
          <p>
            At the lunar poles, a few degrees decide whether a site sees power
            or darkness. LUMEN turns a specialist geometry workflow into a calm,
            inspectable decision surface.
          </p>
          <div className="principle-list">
            <div>
              <Sun size={18} />
              <span>
                <b>POWER</b> — Sun elevation at the site horizon
              </span>
            </div>
            <div>
              <Radio size={18} />
              <span>
                <b>LINK</b> — Geometric direct-to-Earth visibility
              </span>
            </div>
            <div>
              <CircleHelp size={18} />
              <span>
                <b>HONESTY</b> — Every assumption stays visible
              </span>
            </div>
          </div>
        </div>
      </section>

      <CelestialSection dataset={dataset} index={index} cursorUtc={cursorUtc} liveSnapshot={liveSnapshot?.siteId === dataset?.site.id ? liveSnapshot : null} />

      <section className="explorer section-shell reveal" id="explore">
        <div className="section-heading">
          <div>
            <p className="section-index">L.04 / MISSION CONTROL · YOUR SITE, YOUR TIME</p>
            <h2>Set the landing window.</h2>
            <p className="explorer-intro">Choose a site, follow one shared time cursor, and read the Sun and Earth against the local horizon.</p>
          </div>
          <div className="disclosure">
            <AlertTriangle size={15} /> Geometric screening only — terrain not
            included in v1.
          </div>
        </div>
        <div className="control-bar">
          <label>
            Site
            <select
              value={siteId}
              onChange={(event) => handleSiteChange(event.target.value)}
            >
              {availableSites.map((site) => (
                <option
                  key={site.id}
                  value={site.id}
                  disabled={!site.available}
                >
                  {site.name}
                  {site.available ? "" : " — dataset pending"}
                </option>
              ))}
            </select>
          </label>
          <div className="control-actions">
            <button
              type="button"
              className={compare ? "control-button active" : "control-button"}
              onClick={() => setCompare(!compare)}
            >
              Compare mode
            </button>
            {compare && (
              <label>
                Compare with
                <select
                  value={compareSiteId}
                  onChange={(event) => setCompareSiteId(event.target.value)}
                >
                  {availableSites
                    .filter((site) => site.available && site.id !== siteId)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="icon-button"
              title="Reset cursor"
              onClick={() => setCursor(0)}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        {error && (
          <div className="error-card">
            <AlertTriangle size={20} />
            <div>
              <b>Dataset unavailable</b>
              <p>{error}</p>
            </div>
          </div>
        )}
        {dataset && (
          <Explorer
            dataset={dataset}
            compareDataset={compareDataset}
            compareError={compareError}
            cursor={cursor}
            index={index}
            cursorUtc={cursorUtc}
            isPlaying={isPlaying}
            setCursor={setCursor}
            setPlaying={setPlaying}
            compare={compare}
            liveSnapshot={liveSnapshot?.siteId === dataset.site.id ? liveSnapshot : null}
            compareLiveSnapshot={compareLiveSnapshot?.siteId === compareDataset?.site.id ? compareLiveSnapshot : null}
            liveError={liveError}
            liveLoading={liveLoading}
            onRefreshLive={() => void refreshLive()}
            onSoundCue={audio.playCue}
          />
        )}
        {dataset && <ScheduleSlip />}
      </section>

      <section className="method section-shell reveal" id="method">
            <p className="section-index">L.05 / METHOD</p>
        <div className="method-grid">
          <div>
            <h2>
              From kernels
              <br />
              to a clear answer.
            </h2>
            <p>
              Numbers are computed offline with NASA SPICE, then rendered from
              static JSON. The browser never invents ephemeris data.
            </p>
          </div>
          <div className="method-facts">
            <Fact
              label="Coordinate frame"
              value={dataset?.site.frame ?? "MOON_ME_DE440_ME421"}
            />
            <Fact label="Time path" value="UTC → ET/TDB → UTC" />
            <Fact
              label="Generated UTC window"
              value={
                dataset
                  ? `${formatUtc(dataset.time.start_utc)} — ${formatUtc(dataset.time.end_utc)} · ${dataset.time.step_s / 60} min samples`
                  : "Awaiting dataset"
              }
            />
            <Fact label="Local horizon" value="ENU · flat reference sphere" />
            <Fact
              label="Aberration"
              value={dataset?.provenance.aberration ?? "LT+S"}
            />
            <Fact
              label="SPICE kernels"
              value={
                dataset?.provenance.kernels
                  .map((kernel) => kernel.name)
                  .join(", ") ?? "Awaiting dataset"
              }
            />
            <Fact
              label="Horizons validation"
              value={
                dataset
                  ? `${horizonsValidationBySite[dataset.site.id]} · 2027-01-02, 2027-01-20, 2027-02-06 UTC`
                  : "Awaiting dataset"
              }
            />
            <Fact
              label="Rise/set event validation"
              value="Apollo 11 Sun; de Gerlache Sun and Earth · max |Δt| 58 s · tolerance 120 s. No Apollo 11 Earth rise/set in this window."
            />
            <Fact
              label="Generated"
              value={
                dataset
                  ? formatUtc(dataset.provenance.generated_utc)
                  : "Awaiting dataset"
              }
            />
            <div className="method-source">
              <span>Site coordinate source</span>
              {coordinateSourceUrl ? (
                <a href={coordinateSourceUrl} target="_blank" rel="noreferrer">
                  Open NASA source ↗
                </a>
              ) : (
                <b>Awaiting dataset</b>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="limits section-shell reveal" id="limits">
        <div className="limits-card">
          <Moon size={24} />
          <div>
            <p className="section-index">L.06 / LIMITS</p>
            <h2>A screening aid, not a landing approval.</h2>
            <p>
              Terrain, thermal margins, link budgets, relay scheduling, and
              operational constraints are outside this v1. Artistic Moon
              graphics are illustrative.
            </p>
          </div>
        </div>
      </section>
      <section className="credits section-shell reveal" id="credits">
        <div className="section-heading">
          <div>
            <p className="section-index">L.07 / CREDITS</p>
            <h2>Visual references, clearly sourced.</h2>
          </div>
          <p className="credits-intro">Every image and animation here supports visual context only. None supplies landing-site geometry or terrain.</p>
        </div>
        <div className="credits-grid">
          <CreditCard
            title="Moon background video"
            source="NASA Goddard Scientific Visualization Studio — The Moon’s Rotation; visualization by Ernie Wright. NASA SVS content is public domain unless a page identifies an exception."
            href="https://svs.gsfc.nasa.gov/4709/"
            detail="The 720p MP4 is the looping lunar rotation animation. It illustrates motion and is not the selected-site Sun angle."
          />
          <CreditCard
            title="Moon surface texture"
            source="NASA Goddard Scientific Visualization Studio — CGI Moon Kit, LROC WAC color mosaic; credit NASA’s Scientific Visualization Studio, Ernie Wright, and LROC."
            href="https://svs.gsfc.nasa.gov/4720/"
            detail="Used as a global appearance map. The source notes polar gaps are filled with lower-resolution albedo; it is not terrain or a scientific input to results."
          />
          <CreditCard
            title="Earth surface texture"
            source="NASA Earth Observatory — Blue Marble: Next Generation, January global base map, MODIS/Terra 2004."
            href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/"
            detail="Resized for the 3D globe. It is a static visual reference, not a live or date-matched Earth image."
          />
          <CreditCard
            title="Sun appearance texture"
            source="NASA Solar Dynamics Observatory / Atmospheric Imaging Assembly, 171 Å image from 2026-09-01 00:06:10 UT."
            href="https://sdo.gsfc.nasa.gov/assets/img/browse/2026/09/01/20260901_000610_4096_0171.jpg"
            detail="False-color ultraviolet solar-atmosphere imagery, remapped to a sphere and mirrored on the unseen side; not visible-light photography."
          />
          <CreditCard
            title="Poster fallback"
            source="Project-generated WebP still from the credited NASA SVS Moon rotation video above."
            href="https://svs.gsfc.nasa.gov/4709/"
            detail="Shows the hero background if video playback is unavailable."
          />
          <CreditCard
            title="Typography"
            source="Bebas Neue, Manrope, and DM Mono via Google Fonts; each family is distributed under the SIL Open Font License 1.1."
            href="https://fonts.google.com/"
            detail="Loaded from Google Fonts CSS; system font fallbacks are defined."
          />
          <CreditCard
            title="Interface icons"
            source="Lucide React icon set, ISC License."
            href="https://github.com/lucide-icons/lucide"
            detail="The LUMEN favicon is a project-authored SVG mark. No NASA insignia or logotype is used."
          />
          <CreditCard
            title="Sound cues"
            source="Synthesized in-browser by LUMEN with the Web Audio API; no recorded music or audio file is bundled."
            href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API"
            detail="Sound is optional and generated only after user interaction."
          />
        </div>
        <p className="credits-usage">NASA material is credited and used as visual reference under NASA’s media usage guidance. NASA does not sponsor or endorse LUMEN.</p>
        <a className="credits-guidelines" href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noreferrer">NASA media usage guidelines ↗</a>
      </section>
      <footer>
        <span>◒ LUMEN</span>
        <span>NASA SPACE APPS · CAIRO 2026</span>
        <span>SPICE geometry · transparent by design</span>
      </footer>
    </main>
  );
}

function ScheduleSlip() {
  const [polarDatasets, setPolarDatasets] = useState<LumenDataset[]>([]);
  const [siteId, setSiteId] = useState("shackleton-rim");
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.allSettled(availableSites.map((site) => loadDataset(site.id))).then((results) => {
      if (!active) return;
      const candidates = results.flatMap((result) => result.status === "fulfilled" && result.value.site.latitude_deg <= -80
        ? [result.value]
        : []);
      setPolarDatasets(candidates);
    });
    return () => { active = false; };
  }, []);

  const dataset = polarDatasets.find((item) => item.site.id === siteId) ?? null;
  const activeDateA = dateA || (dataset ? utcDateInput(dataset.time.start_utc) : "");
  const activeDateB = dateB || (dataset ? secondScenarioDate(dataset) : "");

  const metricsA = dataset && activeDateA
    ? computeScenarioMetrics(dataset, utcDateInputStart(activeDateA))
    : null;
  const metricsB = dataset && activeDateB
    ? computeScenarioMetrics(dataset, utcDateInputStart(activeDateB))
    : null;

  return (
    <section className="schedule-slip" aria-labelledby="schedule-slip-title">
      <div className="schedule-slip-heading">
        <div>
          <p className="section-index">SCHEDULE SLIP / GENERATED SERIES</p>
          <h3 id="schedule-slip-title">What changes when the date moves?</h3>
          <p>Choose two UTC start dates for the same polar site. Each result uses the following {SCHEDULE_WINDOW_DAYS}-day slice of its generated SPICE elevation series.</p>
        </div>
        <span className="schedule-slip-label">Geometric screening, flat horizon</span>
      </div>
      <div className="schedule-slip-controls">
        <label>
          Polar site
          <select value={siteId} onChange={(event) => {
            const nextId = event.target.value;
            const nextDataset = polarDatasets.find((item) => item.site.id === nextId);
            setSiteId(nextId);
            if (nextDataset) {
              setDateA(utcDateInput(nextDataset.time.start_utc));
              setDateB(secondScenarioDate(nextDataset));
            }
          }} disabled={!polarDatasets.length}>
            {polarDatasets.map((item) => <option key={item.site.id} value={item.site.id}>{item.site.name}</option>)}
          </select>
        </label>
        <label>
          Planned start date (UTC)
          <input type="date" value={activeDateA} min={dataset ? utcDateInput(dataset.time.start_utc) : undefined} max={dataset ? latestScenarioDate(dataset) : undefined} onChange={(event) => setDateA(event.target.value)} disabled={!dataset} />
        </label>
        <label>
          Slipped start date (UTC)
          <input type="date" value={activeDateB} min={dataset ? utcDateInput(dataset.time.start_utc) : undefined} max={dataset ? latestScenarioDate(dataset) : undefined} onChange={(event) => setDateB(event.target.value)} disabled={!dataset} />
        </label>
      </div>
      {dataset && metricsA && metricsB ? (
        <div className="schedule-slip-results">
          <ScenarioColumn title="PLANNED WINDOW" date={metricsA} comparison={metricsB} />
          <ScenarioColumn title="SLIPPED WINDOW" date={metricsB} comparison={metricsA} />
        </div>
      ) : (
        <p className="schedule-slip-empty">Loading polar-site data or no complete {SCHEDULE_WINDOW_DAYS}-day interval fits the selected date.</p>
      )}
      <p className="schedule-slip-footnote">Fractions and longest continuous below-horizon runs are recomputed from the saved elevation samples in this interval. Interval edges clip any run that continues beyond the selected dates. No live values or extrapolation are used.</p>
    </section>
  );
}

function ScenarioColumn({ title, date, comparison }: { title: string; date: ScenarioMetrics; comparison: ScenarioMetrics }) {
  const changePercent = (value: number, reference: number) => {
    const diff = (value - reference) * 100;
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pp`;
  };
  const changeHours = (value: number, reference: number) => {
    const diff = value - reference;
    return `${diff > 0 ? "+" : ""}${diff.toFixed(2)} h`;
  };
  return (
    <div className="schedule-slip-column">
      <div className="schedule-slip-column-head"><b>{title}</b><span>{formatUtc(date.startUtc)} – {formatUtc(date.endUtc)} UTC</span></div>
      <div className="schedule-slip-metrics">
        <ScenarioMetric label="Sun-centre above horizon fraction" value={`${(date.sunlitFraction * 100).toFixed(1)}%`} delta={changePercent(date.sunlitFraction, comparison.sunlitFraction)} />
        <ScenarioMetric label="Earth centre visible fraction" value={`${(date.earthCenterVisibleFraction * 100).toFixed(1)}%`} delta={changePercent(date.earthCenterVisibleFraction, comparison.earthCenterVisibleFraction)} />
        <ScenarioMetric label="Longest dark period" value={`${date.longestDarkHours.toFixed(2)} h`} delta={changeHours(date.longestDarkHours, comparison.longestDarkHours)} />
        <ScenarioMetric label="Longest Earth outage" value={`${date.longestEarthOutageHours.toFixed(2)} h`} delta={changeHours(date.longestEarthOutageHours, comparison.longestEarthOutageHours)} />
      </div>
      <span className="schedule-slip-samples">{date.sampleCount.toLocaleString()} generated samples · {SCHEDULE_WINDOW_DAYS} days</span>
    </div>
  );
}

function ScenarioMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <div className="schedule-slip-metric"><span>{label}</span><b>{value}</b><small>vs other date {delta}</small></div>;
}

function CelestialSection({
  dataset,
  index,
  cursorUtc,
  liveSnapshot,
}: {
  dataset: LumenDataset | null;
  index: number;
  cursorUtc: string | null;
  liveSnapshot: LiveHorizonsSnapshot | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneActive, setSceneActive] = useState(false);
  const [selectedBody, setSelectedBody] = useState<"moon" | "sun" | "earth" | null>(null);
  const [cameraDistance, setCameraDistance] = useState(4.8);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [viewerMode, setViewerMode] = useState<"surface" | "orbits">("surface");
  const [geometryMode, setGeometryMode] = useState<"cursor" | "now">("cursor");
  const [orbitData, setOrbitData] = useState<LiveOrbitData | null>(() => cachedLiveOrbits());
  const [orbitIsCached, setOrbitIsCached] = useState(true);
  const [orbitError, setOrbitError] = useState<string | null>(null);
  const [orbitLoading, setOrbitLoading] = useState(false);

  useEffect(() => {
    if (viewerMode !== "orbits" || !sceneReady) return;
    const controller = new AbortController();
    let active = true;
    const refresh = async () => {
      setOrbitLoading(true);
      setOrbitError(null);
      try {
        const current = await fetchLiveOrbits(controller.signal);
        if (active) {
          setOrbitData(current);
          setOrbitIsCached(false);
        }
      } catch (reason) {
        if (active && !controller.signal.aborted) {
          setOrbitError(reason instanceof Error ? reason.message : "JPL orbit vectors are unavailable.");
        }
      } finally {
        if (active) setOrbitLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); };
  }, [viewerMode, sceneReady]);

  useEffect(() => {
    setResetViewKey((key) => key + 1);
    setCameraDistance(viewerMode === "orbits" ? 11 : 4.8);
  }, [dataset?.site.id, viewerMode]);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      setSceneReady(true);
      setSceneActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSceneReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "520px 0px" },
    );
    observer.observe(section);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setSceneActive(entry.isIntersecting),
      { threshold: 0.08 },
    );
    visibilityObserver.observe(section);
    return () => {
      observer.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  const liveGeometry = geometryMode === "now" && liveSnapshot !== null;
  const sunAzimuthDeg = liveGeometry ? liveSnapshot.sun.azimuthDeg : dataset?.series.sun_az_deg[index];
  const sunElevationDeg = liveGeometry ? liveSnapshot.sun.elevationDeg : dataset?.series.sun_el_deg[index];
  const earthAzimuthDeg = liveGeometry ? liveSnapshot.earth.azimuthDeg : dataset?.series.earth_az_deg[index];
  const earthElevationDeg = liveGeometry ? liveSnapshot.earth.elevationDeg : dataset?.series.earth_el_deg[index];
  const earthRadiusDeg = liveGeometry ? liveSnapshot.earth.angularDiameterDeg / 2 : dataset?.series.earth_radius_deg[index];

  return (
    <section
      ref={sectionRef}
      className="celestial-section section-shell reveal"
      id="celestial"
    >
      <div className="celestial-heading">
        <div>
          <p className="section-index">L.03 / CELESTIAL GEOMETRY</p>
          <h2>
            Three worlds.
            <br />
            <span>One local sky.</span>
          </h2>
        </div>
        <p>
          Follow live JPL orbital vectors, then drop to the selected landing site.
          The surface view uses the shared SPICE time cursor or a current Horizons snapshot.
        </p>
      </div>
      <div className="celestial-layout">
        <div className="celestial-story">
          <div className="celestial-step">
            <span className="step-glyph step-sun">
              <Sun size={16} />
            </span>
            <div>
              <b>Sun · illumination</b>
              <p>
                {sunElevationDeg === undefined || sunAzimuthDeg === undefined
                  ? "Loading the selected site geometry."
                  : `${sunElevationDeg.toFixed(2)}° elevation · ${sunAzimuthDeg.toFixed(2)}° azimuth`}
              </p>
            </div>
          </div>
          <div className="celestial-step">
            <span className="step-glyph step-earth">
              <Radio size={16} />
            </span>
            <div>
              <b>Earth · direct view</b>
              <p>
                {earthElevationDeg === undefined ||
                earthAzimuthDeg === undefined
                  ? "Loaded from the selected SPICE dataset."
                  : `${earthElevationDeg.toFixed(2)}° elevation · ${earthAzimuthDeg.toFixed(2)}° azimuth`}
              </p>
            </div>
          </div>
          <div className="celestial-step">
            <span className="step-glyph step-site">
              <Moon size={16} />
            </span>
            <div>
              <b>{dataset?.site.name ?? "Selected landing site"}</b>
              <p>
                {dataset
                  ? `${Math.abs(dataset.site.latitude_deg).toFixed(5)}° ${dataset.site.latitude_deg >= 0 ? "N" : "S"} · ${Math.abs(dataset.site.longitude_deg_east).toFixed(5)}° ${dataset.site.longitude_deg_east >= 0 ? "E" : "W"} · ${dataset.site.frame}`
                  : "Lunar surface reference"}
              </p>
            </div>
          </div>
          <div className="celestial-data-stamp">
            <span>{liveGeometry ? "LIVE HORIZONS SNAPSHOT · UTC" : "SPICE TIME SAMPLE · UTC"}</span>
            <b>{liveGeometry ? formatUtc(liveSnapshot.asOfUtc) : cursorUtc ? formatUtc(cursorUtc) : "Loading dataset"}</b>
          </div>
        </div>
        <div className="celestial-visual-column">
          <div
            className="celestial-canvas-shell"
            role="group"
            aria-label="Interactive 3D visualization of the Moon, Sun and Earth"
          >
            {sceneReady &&
            dataset &&
            sunAzimuthDeg !== undefined &&
            sunElevationDeg !== undefined &&
            earthAzimuthDeg !== undefined &&
            earthElevationDeg !== undefined &&
            earthRadiusDeg !== undefined ? (
              <Suspense
                fallback={
                  <div className="celestial-loading">
                    Loading NASA surface imagery…
                  </div>
                }
              >
                <OrbitalScene
                  latitudeDeg={dataset.site.latitude_deg}
                  longitudeDegEast={dataset.site.longitude_deg_east}
                  sunAzimuthDeg={sunAzimuthDeg}
                  sunElevationDeg={sunElevationDeg}
                  earthAzimuthDeg={earthAzimuthDeg}
                  earthElevationDeg={earthElevationDeg}
                  earthRadiusDeg={earthRadiusDeg}
                  cameraDistance={cameraDistance}
                  active={sceneActive}
                  selectedBody={selectedBody}
                  onSelectBody={(body) => setSelectedBody((selected) => selected === body ? null : body)}
                  viewerMode={viewerMode}
                  orbitData={orbitData}
                  resetViewKey={resetViewKey}
                />
              </Suspense>
            ) : (
              <div className="celestial-loading">
                {dataset
                  ? "Scroll to bring the 3D scene into view."
                  : "Loading the selected SPICE dataset…"}
              </div>
            )}
            <div className="viewer-mode-switch" role="group" aria-label="3D viewer mode">
              <button type="button" className={viewerMode === "surface" ? "is-active" : ""} aria-pressed={viewerMode === "surface"} onClick={() => setViewerMode("surface")}>SITE VIEW</button>
              <button type="button" className={viewerMode === "orbits" ? "is-active" : ""} aria-pressed={viewerMode === "orbits"} onClick={() => setViewerMode("orbits")}>LIVE ORBITS</button>
            </div>
            <span className="canvas-annotation annotation-top">
              {viewerMode === "orbits" ? orbitData ? `${orbitIsCached ? "CACHED SNAPSHOT" : "JPL LIVE"} · ${orbitData.frame.toUpperCase()} · ${formatUtc(orbitData.epochUtc)} UTC` : orbitLoading ? "FETCHING JPL STATE VECTORS…" : orbitError ? "JPL ORBIT DATA UNAVAILABLE" : "NASA/JPL STATE VECTORS" : "LRO / LROC WAC · SELECTED SITE"}
            </span>
            <span className="canvas-annotation annotation-bottom">
              {viewerMode === "orbits" ? "EARTH ORBIT + LUNAR ORBIT · DISTANCES EXPANDED" : "DRAG TO ROTATE · SCROLL TO ZOOM · PAN TO TRAVEL"}
            </span>
            {viewerMode === "surface" && dataset && <span className="canvas-site-label">{dataset.site.name.toUpperCase()} · {Math.abs(dataset.site.latitude_deg).toFixed(5)}° {dataset.site.latitude_deg >= 0 ? "N" : "S"}, {Math.abs(dataset.site.longitude_deg_east).toFixed(5)}° {dataset.site.longitude_deg_east >= 0 ? "E" : "W"}</span>}
            {viewerMode === "orbits" && orbitError && <span className="orbit-error">{orbitError}</span>}
            {viewerMode === "orbits" && orbitData && <div className="orbit-legend"><span><i className="orbit-key-sun" />Sun · origin</span><span><i className="orbit-key-earth" />Earth · heliocentric path</span><span><i className="orbit-key-moon" />Moon · geocentric path</span><small>{orbitData.correction} · {orbitData.units}</small></div>}
            <div className="scene-controls" role="group" aria-label="3D scene controls">
              <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setCameraDistance((distance) => Math.max(viewerMode === "orbits" ? 2 : 1.3, distance - 0.8))}><ZoomIn size={16} /></button>
              <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setCameraDistance((distance) => Math.min(viewerMode === "orbits" ? 18 : 9, distance + 0.8))}><ZoomOut size={16} /></button>
              <button type="button" aria-label="Reset 3D view" title="Reset view" onClick={() => { setCameraDistance(viewerMode === "orbits" ? 11 : 4.8); setResetViewKey((key) => key + 1); setSelectedBody(null) }}><RotateCcw size={15} /></button>
            </div>
          </div>
          <div className="body-selectors" role="group" aria-label="Select a celestial body">
            {(["moon", "sun", "earth"] as const).map((body) => (
              <button key={body} type="button" className={`body-selector${selectedBody === body ? " is-selected" : ""}`} aria-pressed={selectedBody === body} onClick={() => setSelectedBody((selected) => selected === body ? null : body)}>{body}</button>
            ))}
            <span>{liveGeometry ? "Live JPL Horizons directions · " : "SPICE time cursor · "}drag to rotate · right-drag to pan · wheel to zoom · touch drag to travel</span>
          </div>
          <div className="geometry-source-switch" role="group" aria-label="Surface sky geometry time source">
            <span>LOCAL SKY</span>
            <button type="button" className={!liveGeometry ? "is-active" : ""} aria-pressed={!liveGeometry} onClick={() => setGeometryMode("cursor")}>TIME CURSOR</button>
            <button type="button" className={liveGeometry ? "is-active" : ""} aria-pressed={liveGeometry} disabled={!liveSnapshot} title={liveSnapshot ? "Use the latest JPL Horizons snapshot" : "Waiting for the live Horizons snapshot"} onClick={() => setGeometryMode("now")}>LIVE NOW</button>
            <span>{liveGeometry ? `${formatUtc(liveSnapshot.asOfUtc)} UTC · JPL HORIZONS` : `${cursorUtc ? formatUtc(cursorUtc) : "Waiting for dataset"} UTC · SPICE`}</span>
          </div>
          {selectedBody && <p className="body-detail"><b>{selectedBody.toUpperCase()}</b>{viewerMode === "orbits" ? ` · ${selectedBody === "moon" ? "LRO/LROC WAC" : selectedBody === "earth" ? "Blue Marble" : "SDO/AIA 171 Å false-color"} appearance; position from current JPL Horizons state vectors.` : selectedBody === "moon" ? " · LRO/LROC WAC surface map and selected-site marker." : selectedBody === "earth" ? ` · Blue Marble appearance; direction follows ${liveGeometry ? "the live Horizons snapshot" : "the selected SPICE sample"}.` : ` · SDO/AIA 171 Å false-color ultraviolet imagery; direction follows ${liveGeometry ? "the live Horizons snapshot" : "the selected SPICE sample"}.`}</p>}
          <div className="celestial-legend">
            <span>
              <i className="legend-sun" /> Sun · SDO/AIA 171 Å
            </span>
            <span>
              <i className="legend-earth" /> Earth · Blue Marble
            </span>
            <span>
              <i className="legend-site" /> Surface site
            </span>
          </div>
        </div>
      </div>
      <div className="visual-sources" aria-label="Visual data sources">
        <span>VISUAL SOURCES</span>
        <a
          href="https://svs.gsfc.nasa.gov/4720/"
          target="_blank"
          rel="noreferrer"
        >
          NASA LRO / LROC WAC
        </a>
        <a
          href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/"
          target="_blank"
          rel="noreferrer"
        >
          NASA Blue Marble
        </a>
        <a
          href="https://sdo.gsfc.nasa.gov/assets/img/browse/2026/09/01/20260901_000610_4096_0171.jpg"
          target="_blank"
          rel="noreferrer"
        >
          NASA SDO / AIA · 171 Å false-color
        </a>
      </div>
      <p className="celestial-caveat">
        Site coordinates follow the cited NASA site record in {dataset?.site.frame ?? "the selected lunar frame"}. LIVE ORBITS uses NASA/JPL Horizons DE441 geometric state vectors in Ecliptic J2000. Orbital path coordinates come from ephemeris vectors; body sizes and inter-orbit distances are expanded for visibility and are not to scale. SITE VIEW uses SPICE local sky angles unless LIVE NOW is selected. Terrain is not shown.
      </p>
    </section>
  );
}

function Explorer({
  dataset,
  compareDataset,
  compareError,
  cursor,
  index,
  cursorUtc,
  isPlaying,
  setCursor,
  setPlaying,
  compare,
  liveSnapshot,
  compareLiveSnapshot,
  liveError,
  liveLoading,
  onRefreshLive,
  onSoundCue,
}: {
  dataset: LumenDataset;
  compareDataset: LumenDataset | null;
  compareError: string | null;
  cursor: number;
  index: number;
  cursorUtc: string | null;
  isPlaying: boolean;
  setCursor: (value: number) => void;
  setPlaying: (value: boolean) => void;
  compare: boolean;
  liveSnapshot: LiveHorizonsSnapshot | null;
  compareLiveSnapshot: LiveHorizonsSnapshot | null;
  liveError: string | null;
  liveLoading: boolean;
  onRefreshLive: () => void;
  onSoundCue: (frequency?: number) => void;
}) {
  const [horizonOffsetDeg, setHorizonOffsetDeg] = useState(0);
  const sensitivity = useMemo(
    () => horizonSensitivity(dataset, horizonOffsetDeg),
    [dataset, horizonOffsetDeg],
  );
  const sun = dataset.series.sun_el_deg[index];
  const earth = dataset.series.earth_el_deg[index];
  const sunRadius = dataset.series.sun_radius_deg[index];
  const earthRadius = dataset.series.earth_radius_deg[index];
  const earthVisible = earth > 0;
  const sunPartialVisible = sun + sunRadius > 0;
  const sunFullDiskVisible = sun - sunRadius > 0;
  const earthLimbVisible = earth + earthRadius > 0;
  const nextEvent = dataset.events.find(
    (event) =>
      new Date(event.utc).getTime() > new Date(cursorUtc ?? "").getTime() &&
      new Date(event.utc).getTime() <= new Date(dataset.time.end_utc).getTime(),
  );
  const verdict = calculateVerdict(dataset.summary, verdictConfig.thresholds);
  const verdictIcon =
    verdict === "GO" ? <Check size={21} /> : <AlertTriangle size={21} />;
  return (
    <div className="explorer-panel">
      {compare && compareError && (
        <div className="compare-note">
          <AlertTriangle size={15} /> Comparison unavailable: {compareError}
        </div>
      )}
      {compare && compareDataset && (
        <ComparePanel
          primary={dataset}
          secondary={compareDataset}
          primaryIndex={index}
          secondaryIndex={sampleIndex(compareDataset, cursor)}
            cursorUtc={cursorUtc}
        />
      )}
      <LiveEphemerisPanel
        snapshot={liveSnapshot}
        compareSnapshot={compareLiveSnapshot}
        siteName={dataset.site.name}
        compareSiteName={compareDataset?.site.name ?? "Comparison site"}
        error={liveError}
        loading={liveLoading}
        onRefresh={onRefreshLive}
      />
      <div className="readout-grid">
        <div className="dome-card">
          <div className="card-label">
            LOCAL SKY · {dataset.site.name.toUpperCase()}
          </div>
          <div className="sky-dome">
            <div className="horizon-line" />
            <div
              className="sky-sun"
              style={{
                left: `${50 + (dataset.series.sun_az_deg[index] - 180) / 3}%`,
                bottom: `${Math.max(8, Math.min(87, 50 + sun * 2))}%`,
              }}
            >
              <Sun size={17} />
              <span>{sun.toFixed(2)}°</span>
            </div>
            <div
              className="sky-earth"
              style={{
                left: `${50 + (dataset.series.earth_az_deg[index] - 180) / 3}%`,
                bottom: `${Math.max(8, Math.min(87, 50 + earth * 2))}%`,
              }}
            >
              <Radio size={15} />
              <span>{earth.toFixed(2)}°</span>
            </div>
            <span className="horizon-label">HORIZON · 0° ELEVATION</span>
          </div>
          <div className="legend">
            <span>
              <i className="sun-dot" /> SUN
            </span>
            <span>
              <i className="earth-dot" /> EARTH
            </span>
            <span>AZ CLOCKWISE FROM NORTH</span>
          </div>
        </div>
        <div className="metrics-card">
          <div className="card-label">AT CURSOR</div>
          <div className="cursor-time">
            {cursorUtc ? formatUtc(cursorUtc) : "—"} <span>UTC</span>
          </div>
          <Metric
            icon={<Sun size={16} />}
            label="Sun elevation"
            value={`${sun.toFixed(2)}°`}
            state={sun > 0 ? "ABOVE HORIZON" : "BELOW HORIZON"}
          />
          <Metric
            icon={<Sun size={16} />}
            label="Sun angular radius"
            value={`${sunRadius.toFixed(4)}°`}
            state={sunFullDiskVisible ? "FULL DISK CLEAR" : sunPartialVisible ? "PARTIAL DISK CLEAR" : "DISK BELOW HORIZON"}
          />
          <Metric
            icon={<Radio size={16} />}
            label="Geometric direct-to-Earth visibility"
            value={`${earth.toFixed(2)}°`}
            state={
              earthVisible
                ? "EARTH CENTRE ABOVE HORIZON"
                : "EARTH CENTRE BELOW HORIZON"
            }
          />
          <Metric
            icon={<Moon size={16} />}
            label="Earth disc radius"
            value={`${earthRadius.toFixed(2)}°`}
            state={earthLimbVisible ? "EARTH LIMB VISIBLE · GEOMETRIC ONLY" : "EARTH LIMB BELOW HORIZON"}
          />
          <div className="next-event">
            <span>
              {nextEvent
                ? `NEXT REFINED TRANSITION · IN ${formatCountdown(nextEvent.utc, cursorUtc ?? "")}`
                : "NEXT REFINED TRANSITION"}
            </span>
            <b>{nextEvent ? nextEvent.type.toUpperCase() : "NONE IN WINDOW"}</b>
            <small>
              {nextEvent
                ? formatUtc(nextEvent.utc)
                : "No event is available in this generated window."}
            </small>
          </div>
        </div>
        <div className={`verdict-card verdict-${verdict.toLowerCase()}`}>
          <div className="card-label">SCREENING INDICATOR</div>
          <div className="verdict-word">
            {verdictIcon}
            {verdict}
          </div>
          <p>
            Visible inputs: {formatPercent(dataset.summary.sunlit_fraction)}{" "}
            Sun-centre above horizon ·{" "}
            {formatPercent(dataset.summary.earth_center_visible_fraction)}{" "}
            Earth-centre visible
          </p>
          <p className="summary-outages">
            Longest dark run: {dataset.summary.longest_dark_h?.toFixed(2) ?? "—"} h
            {dataset.summary.longest_dark_bounded_by_window ? " · window-bounded" : ""}
            <br />
            Longest Earth-centre outage: {dataset.summary.longest_earth_outage_h?.toFixed(2) ?? "—"} h
            {dataset.summary.longest_earth_outage_bounded_by_window ? " · window-bounded" : ""}
          </p>
          <small>Placeholder thresholds, not NASA criteria.</small>
          <div className="horizon-sensitivity">
            <div className="horizon-sensitivity-head">
              <b>Illustrative sensitivity, not terrain data</b>
              <span>{horizonOffsetDeg.toFixed(1)}° offset</span>
            </div>
            <label htmlFor="horizon-offset-slider">User-set horizon elevation offset</label>
            <input
              id="horizon-offset-slider"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={horizonOffsetDeg}
              onChange={(event) => setHorizonOffsetDeg(Number(event.target.value))}
              aria-valuetext={`${horizonOffsetDeg.toFixed(1)} degrees horizon elevation offset`}
            />
            <p>Polar terrain can block a Sun that never rises more than a degree or two. This applies a simple elevation mask to the saved series; it is not a terrain model.</p>
            {sensitivity && (
              <div className="horizon-sensitivity-values" aria-live="polite">
                <span>Sunlit fraction <b>{(sensitivity.sunlitFraction * 100).toFixed(2)}%</b></span>
                <span>Earth-centre visible fraction <b>{(sensitivity.earthCenterVisibleFraction * 100).toFixed(2)}%</b></span>
              </div>
            )}
            <small>Geometric screening only · flat reference sphere</small>
          </div>
        </div>
      </div>
      <div className="timeline-card">
        <div className="timeline-head">
          <div className="card-label">
            COMPLETE GENERATED WINDOW · {dataset.time.step_s / 60} MIN STEPS
          </div>
          <span>
            {index + 1} / {dataset.series.sun_el_deg.length}
          </span>
        </div>
        <input
          aria-label="Time cursor"
          type="range"
          min="0"
          max={dataset.series.sun_el_deg.length - 1}
          value={cursor}
          onChange={(event) => setCursor(Number(event.target.value))}
          onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowDown"].includes(event.key)) {
              event.preventDefault();
              setCursor(Math.max(0, cursor - 1));
            } else if (["ArrowRight", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setCursor(Math.min(dataset.series.sun_el_deg.length - 1, cursor + 1));
            } else if (event.code === "Space") {
              event.preventDefault();
              setPlaying(!isPlaying);
            }
          }}
        />
        <div className="timeline-labels">
          <span>{formatUtc(dataset.time.start_utc)}</span>
          <span>{formatUtc(dataset.time.end_utc)}</span>
        </div>
        <div className="timeline-direct-controls">
          <label className="utc-jump-control">
            Jump to date &amp; time (UTC)
            <input
              type="datetime-local"
              step={dataset.time.step_s}
              min={utcInputValue(dataset.time.start_utc)}
              max={utcInputValue(dataset.time.end_utc)}
              value={cursorUtc ? utcInputValue(cursorUtc) : ""}
              onChange={(event) => {
                const targetIndex = utcInputSampleIndex(dataset, event.target.value);
                if (targetIndex !== null) setCursor(targetIndex);
              }}
            />
          </label>
          <div className="event-jump-controls" role="group" aria-label="Jump to next horizon event">
            {([
              ["sunrise", "Next sunrise"],
              ["sunset", "Next sunset"],
              ["earthrise", "Next Earthrise"],
              ["earthset", "Next Earthset"],
            ] as const).map(([eventType, label]) => {
              const event = cursorUtc ? findNextEvent(dataset, eventType, cursorUtc) : null;
              return (
                <button
                  key={eventType}
                  type="button"
                  className="event-jump-button"
                  disabled={!event}
                  title={event ? formatUtc(event.utc) : `No further ${eventType} in this generated window`}
                  onClick={() => {
                    if (!event) return;
                    const targetIndex = eventSampleIndex(dataset, event.utc);
                    if (targetIndex !== null) setCursor(targetIndex);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="timeline-coverage-note">
          Window summaries cover the complete generated range. Arrow keys step samples; Space plays or pauses. Event jumps use only refined events stored inside this window.
        </p>
        <button
          type="button"
          className="play-button"
          onClick={() => {
            onSoundCue(isPlaying ? 440 : 660);
            setPlaying(!isPlaying);
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Pause" : "Play time cursor"}
        </button>
      </div>
    </div>
  );
}

function LiveEphemerisPanel({
  snapshot,
  compareSnapshot,
  siteName,
  compareSiteName,
  error,
  loading,
  onRefresh,
}: {
  snapshot: LiveHorizonsSnapshot | null;
  compareSnapshot: LiveHorizonsSnapshot | null;
  siteName: string;
  compareSiteName: string;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const bodyRow = (
    label: string,
    glyph: ReactNode,
    values: LiveHorizonsSnapshot["sun"] | undefined,
  ) => (
    <div className="live-body-row">
      <div className="live-body-name">{glyph}<b>{label}</b></div>
      {values ? (
        <>
          <span><small>AZIMUTH</small>{values.azimuthDeg.toFixed(2)}°</span>
          <span><small>ELEVATION</small>{values.elevationDeg.toFixed(2)}°</span>
          <span><small>ANGULAR DIAMETER</small>{values.angularDiameterDeg.toFixed(3)}°</span>
          <strong className={values.elevationDeg > 0 ? "live-visible" : "live-hidden"}>
            {values.elevationDeg > 0 ? "ABOVE HORIZON" : "BELOW HORIZON"}
          </strong>
        </>
      ) : <p className="live-pending">{loading ? "Requesting live JPL ephemeris…" : "No current snapshot available."}</p>}
    </div>
  );

  return (
    <section className="live-snapshot" aria-label="Current NASA JPL Horizons ephemeris">
      <header className="live-snapshot-head">
        <div>
          <span className="live-kicker"><i /> {snapshot?.isCached ? "CACHED SNAPSHOT" : "LIVE EPHEMERIS"} · NASA/JPL HORIZONS</span>
          <p>{snapshot ? `${snapshot.isCached ? "Captured" : "Snapshot for"} ${formatUtc(snapshot.asOfUtc)} UTC` : "Fetching current topocentric geometry"}</p>
        </div>
        <button type="button" className="live-refresh" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "is-spinning" : ""} />
          {loading ? "UPDATING" : "REFRESH"}
        </button>
      </header>
      {compareSnapshot ? (
        <div className="live-compare-grid">
          {[{ label: siteName, data: snapshot }, { label: compareSiteName, data: compareSnapshot }].map(({ label, data }) => (
            <div className="live-compare-site" key={data?.siteId ?? label}>
              <p>{label.toUpperCase()} <span>{data ? formatUtc(data.asOfUtc) : "WAITING"} UTC</span></p>
              <div className="live-body-rows">
                {bodyRow("SUN", <Sun size={16} />, data?.sun)}
                {bodyRow("EARTH", <Radio size={16} />, data?.earth)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="live-body-rows">
          {bodyRow("SUN", <Sun size={16} />, snapshot?.sun)}
          {bodyRow("EARTH", <Radio size={16} />, snapshot?.earth)}
        </div>
      )}
      <footer className="live-snapshot-foot">
        <span>{error ? `Update issue: ${error}${snapshot ? snapshot.isCached ? ` · showing committed cached snapshot from ${formatUtc(snapshot.fetchedAtUtc)} UTC` : " · showing last successful snapshot" : ""}` : snapshot ? snapshot.isCached ? `Committed fallback fixture · captured ${formatUtc(snapshot.fetchedAtUtc)} UTC` : `Received ${formatUtc(snapshot.fetchedAtUtc)} UTC · refreshes every 60 seconds` : "Live request in progress"}</span>
        <a href="https://ssd.jpl.nasa.gov/api/horizons.api" target="_blank" rel="noreferrer">JPL Horizons API ↗</a>
      </footer>
      <p className="live-caveat">Current ephemeris, not live telemetry. Airless apparent directions at this site; geometric screening only, flat reference horizon, terrain not included.</p>
    </section>
  );
}

function ComparePanel({
  primary,
  secondary,
  primaryIndex,
  secondaryIndex,
  cursorUtc,
}: {
  primary: LumenDataset;
  secondary: LumenDataset;
  primaryIndex: number;
  secondaryIndex: number;
  cursorUtc: string | null;
}) {
  const sameWindow =
    primary.time.start_utc === secondary.time.start_utc &&
    primary.time.end_utc === secondary.time.end_utc;
  const sameStep = primary.time.step_s === secondary.time.step_s;
  const sameLength = primary.series.sun_el_deg.length === secondary.series.sun_el_deg.length &&
    primary.series.earth_el_deg.length === secondary.series.earth_el_deg.length;
  if (!sameWindow || !sameStep || !sameLength) {
    return (
      <div className="compare-note">
        <AlertTriangle size={15} /> Like-for-like comparison is unavailable: the
        generated windows or sample steps do not match.
      </div>
    );
  }

  return (
    <div
      className="compare-panel"
      aria-label="Site comparison at the shared time cursor"
    >
      <header className="compare-heading">
        <div><span>MISSION COMPARISON</span><b>{cursorUtc ? formatUtc(cursorUtc) : "SHARED CURSOR"} UTC</b></div>
        <p>Same date window · same sample step · flat reference horizon</p>
      </header>
      {[
        { dataset: primary, index: primaryIndex },
        { dataset: secondary, index: secondaryIndex },
      ].map(({ dataset, index }) => {
        const sourceUrl = dataset.site.source.match(/https?:\/\/\S+/)?.[0];
        const horizonsChecked = [
          "apollo-11",
          "apollo-12",
          "shackleton-rim",
          "de-gerlache-rim",
          "malapert-massif",
        ].includes(dataset.site.id);
        return (
          <section className="compare-site" key={dataset.site.id}>
            <p className="compare-role">SITE {index === 0 ? "A · SELECTED" : "B · COMPARISON"}</p>
            <p className="card-label">{dataset.site.name.toUpperCase()}</p>
            <p className="compare-coordinates">
              {Math.abs(dataset.site.latitude_deg).toFixed(4)}°{" "}
              {dataset.site.latitude_deg >= 0 ? "N" : "S"} ·{" "}
              {Math.abs(dataset.site.longitude_deg_east).toFixed(4)}°{" "}
              {dataset.site.longitude_deg_east >= 0 ? "E" : "W"}
            </p>
            <div className="compare-values">
              <div>
                <span>Sun elevation</span>
                <b>{dataset.series.sun_el_deg[index].toFixed(2)}°</b>
              </div>
              <div>
                <span>Earth elevation</span>
                <b>{dataset.series.earth_el_deg[index].toFixed(2)}°</b>
              </div>
              <div>
                <span>Sun-centre above horizon</span>
                <b>{formatPercent(dataset.summary.sunlit_fraction)}</b>
              </div>
              <div>
                <span>Earth centre visible</span>
                <b>
                  {formatPercent(dataset.summary.earth_center_visible_fraction)}
                </b>
              </div>
            </div>
            <p className="compare-provenance">
              {horizonsChecked
                ? "Horizons spot checked · "
                : "No Horizons spot check · "}
              {dataset.site.frame}
            </p>
            {sourceUrl && (
              <a
                className="compare-source"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Coordinate source ↗
              </a>
            )}
          </section>
        );
      })}
      <div className="compare-difference" aria-label="Site B minus Site A differences">
        <span>DELTA · SITE B − SITE A</span>
        <b>Sun elevation <i>{(secondary.series.sun_el_deg[secondaryIndex] - primary.series.sun_el_deg[primaryIndex]).toFixed(2)}°</i></b>
        <b>Earth elevation <i>{(secondary.series.earth_el_deg[secondaryIndex] - primary.series.earth_el_deg[primaryIndex]).toFixed(2)}°</i></b>
        <b>Sun-centre above horizon <i>{((secondary.summary.sunlit_fraction - primary.summary.sunlit_fraction) * 100).toFixed(1)} pp</i></b>
        <b>Earth centre visibility <i>{((secondary.summary.earth_center_visible_fraction - primary.summary.earth_center_visible_fraction) * 100).toFixed(1)} pp</i></b>
      </div>
      <p className="compare-footnote">
        Shared cursor · {formatUtc(primary.time.start_utc)} –{" "}
        {formatUtc(primary.time.end_utc)} · {primary.time.step_s / 60} min
        samples
      </p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  state,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  state: string;
}) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <small>{state}</small>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function CreditCard({ title, source, href, detail }: { title: string; source: string; href: string; detail: string }) {
  return (
    <article className="credit-card">
      <h3>{title}</h3>
      <p>{source}</p>
      <p className="credit-detail">{detail}</p>
      <a href={href} target="_blank" rel="noreferrer">Source and terms ↗</a>
    </article>
  );
}

export default App;
