"use client";

import { useEffect, useRef } from "react";

/* The Veiled card, floating. At rest it sits at a slight angle and sways
   slowly, with a sheen drifting over the metal, which hints that it reacts.
   When the pointer moves over it, the card turns toward the pointer in 3D,
   lifts off the surface, and the sheen follows the pointer. Leaving eases it
   back, then the idle sway fades in again.
   Mouse and trackpad only; reduced motion keeps it completely still. The idle
   sway also pauses while the card is offscreen or the tab is hidden. */

const MAX_TILT = 16; // degrees, while hovered
const REST = { rx: 8, ry: -14, rz: -6 };
const IDLE = { rx: 3.5, ry: 7, speed: 0.55 }; // gentle sway amplitude (deg) and pace
const IDLE_RESUME_MS = 900; // wait after the pointer leaves before swaying again
const IDLE_FADE_S = 1.6; // sway amplitude ramps up over this long

export function TiltCard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const moveFrame = useRef<number | null>(null);
  const hovering = useRef(false);
  const idleStart = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function canTilt() {
    return (
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function set(vars: Record<string, string>) {
    const el = cardRef.current;
    if (!el) return;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  }

  /* Idle sway: a slow figure-eight around the resting pose. Starts from the
     resting pose with zero amplitude and ramps in, so it never jumps. */
  useEffect(() => {
    if (!canTilt()) return;
    const stage = stageRef.current;
    if (!stage) return;

    let raf = 0;
    let visible = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (hovering.current || !visible || document.hidden) return;
      const t = (now - idleStart.current) / 1000;
      if (t < 0) return;
      const ramp = Math.min(t / IDLE_FADE_S, 1);
      const a = ramp * ramp * (3 - 2 * ramp); // smoothstep
      const s = Math.sin(t * IDLE.speed);
      const c = Math.sin(t * IDLE.speed * 0.72);
      set({
        "--rx": `${(REST.rx + c * IDLE.rx * a).toFixed(2)}deg`,
        "--ry": `${(REST.ry + s * IDLE.ry * a).toFixed(2)}deg`,
        "--gx": `${(50 + s * 32).toFixed(1)}%`,
        "--gy": `${(35 - c * 18).toFixed(1)}%`,
        "--glare": `${(0.45 * a).toFixed(3)}`,
        "--ease": "0ms",
      });
    };

    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible) idleStart.current = performance.now();
    });
    io.observe(stage);
    idleStart.current = performance.now();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  function onEnter() {
    if (!canTilt()) return;
    hovering.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }

  function onMove(e: React.PointerEvent) {
    if (!canTilt() || !stageRef.current) return;
    hovering.current = true;
    const r = stageRef.current.getBoundingClientRect();
    // -0.5 .. 0.5 across the stage
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
    moveFrame.current = requestAnimationFrame(() => {
      set({
        "--rx": `${(-py * MAX_TILT * 1.4).toFixed(2)}deg`,
        "--ry": `${(px * MAX_TILT * 2).toFixed(2)}deg`,
        "--rz": "-2deg",
        "--lift": "36px",
        "--gx": `${((px + 0.5) * 100).toFixed(1)}%`,
        "--gy": `${((py + 0.5) * 100).toFixed(1)}%`,
        "--glare": "1",
        "--ease": "120ms",
      });
    });
  }

  function onLeave() {
    if (moveFrame.current) cancelAnimationFrame(moveFrame.current);
    set({
      "--rx": `${REST.rx}deg`,
      "--ry": `${REST.ry}deg`,
      "--rz": `${REST.rz}deg`,
      "--lift": "0px",
      "--glare": "0",
      "--ease": "700ms",
    });
    // Let the ease-back finish, then fade the idle sway back in from rest.
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      idleStart.current = performance.now();
      hovering.current = false;
    }, IDLE_RESUME_MS);
  }

  return (
    <div
      ref={stageRef}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="flex w-full justify-center py-6 [perspective:1100px] lg:justify-end"
    >
      <div
        ref={cardRef}
        className="relative w-[min(360px,80vw)] [transform-style:preserve-3d]"
        style={
          {
            "--rx": `${REST.rx}deg`,
            "--ry": `${REST.ry}deg`,
            "--rz": `${REST.rz}deg`,
            "--lift": "0px",
            "--gx": "30%",
            "--gy": "20%",
            "--glare": "0",
            "--ease": "700ms",
            transform:
              "rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)) translateZ(var(--lift))",
            transition: "transform var(--ease) cubic-bezier(0.16, 1, 0.3, 1)",
          } as React.CSSProperties
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/card.png"
          alt="The Veiled debit card"
          width={960}
          height={640}
          loading="lazy"
          draggable={false}
          className="block h-auto w-full select-none drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]"
        />
        {/* Sheen that follows the pointer, clipped to the card's own shape */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at var(--gx) var(--gy), rgba(236,230,255,0.38), rgba(184,172,242,0.12) 28%, transparent 55%)",
            mixBlendMode: "screen",
            opacity: "var(--glare)",
            transition: "opacity var(--ease) ease",
            maskImage: "url(/images/card.png)",
            WebkitMaskImage: "url(/images/card.png)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
      </div>
    </div>
  );
}
