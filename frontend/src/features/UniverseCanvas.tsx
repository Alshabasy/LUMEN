import { useEffect, useRef } from "react";
import type { LiveHorizonsSnapshot } from "../data/liveHorizons";

type Star = { x: number; y: number; depth: number; size: number; phase: number };

export default function UniverseCanvas({ snapshot, siteName }: { snapshot: LiveHorizonsSnapshot | null; siteName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  const siteNameRef = useRef(siteName);
  const redrawRef = useRef<() => void>(() => {});
  snapshotRef.current = snapshot;
  siteNameRef.current = siteName;

  useEffect(() => {
    snapshotRef.current = snapshot;
    siteNameRef.current = siteName;
    redrawRef.current();
  }, [snapshot, siteName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollY = window.scrollY;
    let frame = 0;
    const stars: Star[] = [];
    let seed = 481516;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let index = 0; index < 300; index += 1) {
      stars.push({
        x: random(),
        y: random(),
        depth: 0.15 + random() * 0.85,
        size: 0.35 + random() * 1.35,
        phase: random() * Math.PI * 2,
      });
    }

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0, false);
    };
    const move = (event: PointerEvent) => {
      pointerX = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const draw = (time: number, scheduleNextFrame = true) => {
      context.clearRect(0, 0, width, height);
      const elapsed = reducedMotion ? 0 : time * 0.001;
      for (const star of stars) {
        const driftX = pointerX * star.depth * 7;
        const driftY = pointerY * star.depth * 5 + scrollY * star.depth * 0.012;
        const x = (star.x * width + driftX + width) % width;
        const y = (star.y * height + driftY + height) % height;
        const shimmer = reducedMotion ? 0.72 : 0.43 + (Math.sin(elapsed * 0.55 + star.phase) + 1) * 0.25;
        context.beginPath();
        context.fillStyle = `rgba(219,232,248,${shimmer * (0.35 + star.depth * 0.65)})`;
        context.arc(x, y, star.size * (0.7 + star.depth * 0.5), 0, Math.PI * 2);
        context.fill();
      }
      const current = snapshotRef.current;
      if (current) {
        // Plot the real Horizons local sky angles over an explicitly illustrative starfield.
        const plotWidth = Math.min(width * 0.42, 470);
        const plotHeight = Math.min(height * 0.5, 330);
        const left = width - plotWidth - 28;
        const top = Math.max(112, height * 0.24);
        context.save();
        context.strokeStyle = "rgba(167, 202, 215, 0.13)";
        context.lineWidth = 1;
        context.setLineDash([3, 8]);
        for (const elevation of [-60, 0, 60]) {
          const y = top + ((90 - elevation) / 180) * plotHeight;
          context.beginPath(); context.moveTo(left, y); context.lineTo(left + plotWidth, y); context.stroke();
        }
        context.setLineDash([]);
        context.font = "9px monospace";
        context.fillStyle = "rgba(197, 219, 226, .55)";
        context.fillText("LIVE LOCAL SKY · AZ / EL", left + 10, top - 12);
        context.fillStyle = "rgba(197, 219, 226, .42)";
        context.fillText(siteNameRef.current.toUpperCase(), left + 10, top + plotHeight + 19);
        for (const [label, body, color] of [["SUN", current.sun, "#ffbd58"], ["EARTH", current.earth, "#8bd7eb"]] as const) {
          const x = left + (body.azimuthDeg / 360) * plotWidth;
          const y = top + ((90 - body.elevationDeg) / 180) * plotHeight;
          const pulse = reducedMotion ? 1 : 0.84 + Math.sin(elapsed * 1.4 + (label === "SUN" ? 0 : 1.4)) * 0.16;
          context.globalAlpha = pulse;
          context.strokeStyle = color;
          context.fillStyle = color;
          context.shadowColor = color;
          context.shadowBlur = 15;
          context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.fill();
          context.shadowBlur = 0;
          context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2); context.stroke();
          context.beginPath(); context.moveTo(x - 17, y); context.lineTo(x - 8, y); context.moveTo(x + 8, y); context.lineTo(x + 17, y); context.moveTo(x, y - 17); context.lineTo(x, y - 8); context.moveTo(x, y + 8); context.lineTo(x, y + 17); context.stroke();
          context.font = "10px monospace";
          context.fillText(`${label}  ${body.azimuthDeg.toFixed(1)}° / ${body.elevationDeg >= 0 ? "+" : ""}${body.elevationDeg.toFixed(1)}°`, x + 17, y - 10);
        }
        context.restore();
      }
      if (!reducedMotion && scheduleNextFrame) {
        frame = window.requestAnimationFrame((nextTime) => draw(nextTime));
      }
    };

    redrawRef.current = () => draw(performance.now(), false);
    resize();
    if (!reducedMotion) frame = window.requestAnimationFrame((time) => draw(time));
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={canvasRef} className="universe-canvas" aria-hidden="true" />;
}
