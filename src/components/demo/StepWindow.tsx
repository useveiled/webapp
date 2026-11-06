"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import "./step-window.css";

/* HTML Demo's engine (from the html-demo skill): an app shown working, drawn
   live in HTML instead of recorded.

   A demo is a list of steps, { id, name, dur, View }. View({ t, dur }) draws
   everything inside the app's window at a fixed design size (W × H,
   1200 × 750) for `t` seconds into its step, from `t` alone: the same t gives
   the same frame. The window scales that stage to its own width with one
   number (--k), plays the steps in a loop only while it's on screen and the
   tab is shown, and under prefers-reduced-motion shows each step's end frame,
   still. A bar along the window's foot names the steps and fills as each
   plays; a click plays that one. */

export const W = 1200;
export const H = 750;

export type StepView = ComponentType<{ t: number; dur: number }>;
export type Step = { id: string; name: string; dur: number; View: StepView };

export const lessMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** How far `t` is through the stretch from `a` to `b`, eased in and out
    (0 before a, 1 after b). */
export function ease(t: number, a: number, b: number) {
  const x = clamp01((t - a) / (b - a));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** `text` as typed by `t`: nothing before `a`, all of it by `b`. */
export function typed(text: string, t: number, a: number, b: number) {
  return text.slice(0, Math.round(text.length * clamp01((t - a) / (b - a))));
}

/** The value of the last cue whose time has come. */
export function cue<T>(t: number, cues: [number, T][], before: T): T {
  let v = before;
  for (const [at, value] of cues) {
    if (t < at) break;
    v = value;
  }
  return v;
}

/** Whether a click that lands at `at` is still pressed (about 0.16 s). */
export const held = (t: number, at: number, len = 0.16) => t >= at && t < at + len;

const ARROW =
  "M5.17 5.18Q5 5 5 5.25L5 15.9Q5 16.4 5.5 16.46L8.6 16.86Q8.9 16.9 9.01 17.18L9.64 18.76Q9.95 19.55 10.76 19.29L10.84 19.26Q11.65 19 11.38 18.19L10.05 14.23Q9.95 13.95 10.25 13.91L12.8 13.57Q13.3 13.5 12.95 13.14Z";

/** A point the pointer can aim at: stage coordinates, or the name of a
    `data-aim` element on the stage (measured from the DOM each frame, so a
    label change or a font load can't make it miss). */
export type Aim = string | [number, number];
/** [from, to, aim]: travel to `aim`, eased, between `from` and `to` seconds.
    The first entry is where the pointer starts. */
export type Leg = [number, number, Aim];

function place(
  el: HTMLSpanElement | null,
  { t, path, clicks = [], hideFrom, hideTo }: { t: number; path: Leg[]; clicks?: number[]; hideFrom?: number; hideTo?: number },
) {
  const stage = el?.closest(".hd-stage") as HTMLElement | null;
  if (!el || !stage) return;
  const sr = stage.getBoundingClientRect();
  const k = sr.width / W || 1;
  const at = (aim: Aim): [number, number] => {
    if (Array.isArray(aim)) return aim;
    const node = stage.querySelector(`[data-aim="${aim}"]`);
    if (!node) return [W / 2, H / 2];
    const b = node.getBoundingClientRect();
    // where a hand lands: a little past the middle
    return [(b.left - sr.left + b.width * 0.55) / k, (b.top - sr.top + b.height * 0.6) / k];
  };
  let [x, y] = at(path[0][2]);
  for (let j = 1; j < path.length; j++) {
    const [a, b, aim] = path[j];
    if (t <= a) break;
    const e = ease(t, a, b);
    const [nx, ny] = at(aim);
    x += (nx - x) * e;
    y += (ny - y) * e;
  }
  // The pointer is positioned inside whatever positioned box it was rendered
  // in; offset by that box's corner so (x, y) stay stage coordinates.
  const op = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect();
  const ox = op ? (op.left - sr.left) / k : 0;
  const oy = op ? (op.top - sr.top) / k : 0;
  el.style.transform = `translate(${x - 5 - ox}px, ${y - 5 - oy}px)`;
  el.classList.toggle("press", clicks.some((c) => held(t, c)));
  el.classList.toggle("away", hideFrom !== undefined && t >= hideFrom && (hideTo === undefined || t < hideTo));
}

/** The pointer, placed from `t` alone. It measures its `data-aim` targets
    after layout and writes its own transform, so it's exact under scrubs and
    frozen frames, and never sets React state. Render it last, over the app. */
export function AimCursor({
  t,
  path,
  clicks = [],
  hideFrom,
  hideTo,
}: {
  t: number;
  path: Leg[];
  clicks?: number[];
  /** fade out between hideFrom and hideTo (e.g. to let the result be seen) */
  hideFrom?: number;
  hideTo?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // The latest props, so a resize or a font load can re-place the pointer
  // for the current frame without React state.
  const latest = useRef({ t, path, clicks, hideFrom, hideTo });

  useLayoutEffect(() => {
    latest.current = { t, path, clicks, hideFrom, hideTo };
    place(ref.current, latest.current);
  });

  // Re-measure when the window is scaled or the fonts arrive (the window
  // sets its scale after this component's first layout pass).
  useEffect(() => {
    const el = ref.current;
    const view = el?.closest(".hd-view");
    if (!el || !view) return;
    const again = () => place(ref.current, latest.current);
    const ro = new ResizeObserver(again);
    ro.observe(view);
    const raf = requestAnimationFrame(again);
    document.fonts?.ready.then(again);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span ref={ref} className="hd-cursor" style={{ transitionDuration: "0s, 0.3s" }} aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 32 32" overflow="visible">
        <path d={ARROW} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        <path d={ARROW} fill="#000" />
      </svg>
    </span>
  );
}

type Clock = {
  i: number;
  t: number;
  total: number;
  still: boolean;
  elapsed: number;
  play: (i: number) => void;
};

/** The steps' clock: which step plays and how far in. It runs only while the
    window is on screen and the tab is shown, never jumps more than a quarter
    second at once, and loops. Under reduced motion it stands still on each
    step's end. `start` ({ i, t }) freezes it there: for screenshots. */
export function useStepClock(
  steps: Step[],
  root: React.RefObject<HTMLDivElement | null>,
  { start, threshold = 0.3 }: { start?: { i: number; t: number }; threshold?: number } = {},
): Clock {
  const [at, setAt] = useState(() => start || { i: 0, t: 0 });
  // Read once on the client; server renders the first frame.
  const [calm, setCalm] = useState(false);
  const now = useRef(at);
  const go = (i: number, t: number) => {
    now.current = { i, t };
    setAt(now.current);
  };

  useEffect(() => {
    if (!lessMotion()) return;
    // Reduced motion: each step's end, still. Synced once from the media query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalm(true);
    go(now.current.i, steps[now.current.i].dur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (calm || start) return;
    let shown = false;
    let last = performance.now();
    const io = new IntersectionObserver(
      ([e]) => {
        shown = e.isIntersecting;
        last = performance.now();
      },
      { threshold },
    );
    if (root.current) io.observe(root.current);
    const id = setInterval(() => {
      const t0 = performance.now();
      const dt = Math.min(0.25, (t0 - last) / 1000);
      last = t0;
      if (!shown || document.hidden) return;
      let { i, t } = now.current;
      t += dt;
      if (t >= steps[i].dur) {
        i = (i + 1) % steps.length;
        t = 0;
      }
      go(i, t);
    }, 40);
    return () => {
      clearInterval(id);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, steps]);

  const total = steps.reduce((s, x) => s + x.dur, 0);
  const before = (i: number) => steps.slice(0, i).reduce((s, x) => s + x.dur, 0);
  return {
    i: at.i,
    t: at.t,
    total,
    still: calm,
    elapsed: before(at.i) + at.t,
    play: (i: number) => go(i, calm ? steps[i].dur : 0),
  };
}

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);
const LOCK = "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z";

/** A Mac window that plays `steps`: its title bar showing `address`, the app
    at W × H scaled to fit, and the steps' bar. */
export default function StepWindow({
  steps,
  address = "",
  label = "Demo",
  stageClass = "",
  start,
  threshold,
}: {
  steps: Step[];
  address?: string;
  label?: string;
  stageClass?: string;
  start?: { i: number; t: number };
  threshold?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const clock = useStepClock(steps, root, { start, threshold });
  const view = useRef<HTMLDivElement>(null);

  // Scaled to the window: one number for the whole stage.
  useLayoutEffect(() => {
    const el = view.current;
    if (!el) return;
    const fit = () => el.style.setProperty("--k", String(el.clientWidth / W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const step = steps[clock.i];
  const { View } = step;
  return (
    <div className="hd" ref={root}>
      <figure className="hd-win border-gradient">
        <div className="hd-bar" aria-hidden="true">
          <span className="hd-lights">
            <i />
            <i />
            <i />
          </span>
          <span className="hd-gap" />
          <span className="hd-tab on hd-address">
            {svg(LOCK)}
            <span>{address}</span>
          </span>
          <span className="hd-gap" />
          <span className="hd-lights hd-lights-spacer" />
        </div>
        <div className="hd-view" ref={view} role="img" aria-label={`${label}: ${steps.map((s) => s.name).join(", ")}`}>
          <div className={`hd-stage ${stageClass}`} key={step.id}>
            <View t={clock.t} dur={step.dur} />
          </div>
        </div>
        <ol className="hd-steps" aria-label={`${label}, step by step`}>
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={i === clock.i ? "on" : ""}
                aria-current={i === clock.i ? "step" : undefined}
                onClick={() => clock.play(i)}
              >
                <span className="hd-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="hd-label">{s.name}</span>
                <i
                  style={
                    {
                      "--p": i === clock.i ? Math.min(1, clock.t / s.dur) : i < clock.i ? 1 : 0,
                    } as CSSProperties
                  }
                />
              </button>
            </li>
          ))}
        </ol>
      </figure>
    </div>
  );
}
