import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const mouseAvailable = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!cursor || !mouseAvailable || reducedMotion) return;

    document.body.classList.add("lumen-cursor-enabled");
    const moveX = gsap.quickTo(cursor, "left", { duration: 0.18, ease: "power3.out" });
    const moveY = gsap.quickTo(cursor, "top", { duration: 0.18, ease: "power3.out" });
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      moveX(event.clientX);
      moveY(event.clientY);
      cursor.classList.add("is-visible");
    };
    const onOut = (event: PointerEvent) => {
      const target = event.target;
      const related = event.relatedTarget;
      if (!(target instanceof Element) || related instanceof Node && target.contains(related)) return;
      if (target.closest("a, button, input, select, [role='button']")) {
        cursor.classList.remove("is-hovering");
      }
    };
    const onOver = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("a, button, input, select, [role='button']")) {
        cursor.classList.add("is-hovering");
      }
    };
    const onDown = () => cursor.classList.add("is-pressed");
    const onUp = () => cursor.classList.remove("is-pressed");
    const onLeave = () => cursor.classList.remove("is-visible");
    const onEnter = () => cursor.classList.add("is-visible");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    return () => {
      document.body.classList.remove("lumen-cursor-enabled");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      gsap.killTweensOf(cursor);
    };
  }, []);

  return (
    <div ref={cursorRef} className="lumen-cursor" aria-hidden="true">
      <span className="cursor-reticle" />
      <i className="cursor-core" />
    </div>
  );
}
