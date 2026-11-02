// "On the table" whirl. One engine, two layouts. Pure transforms: no layout work per frame.
//  - wide landscape screens with 3-4 beats: the cards ride a tilted ring and orbit slowly. Drag nudges the
//    ring, then it glides back to its idle drift.
//  - everything else (phones, tablets, more than 4 beats): cards stay stacked; scroll spins them around a
//    vertical axis like a helix, with a slow idle drift when you stop.
// Hover or touch pauses the idle drift so cards stay readable and tappable.
// Tune: IDLE (speed), RISE and DEPTH (how deep the whirl is), YAW (how far cards turn).
const TAU = Math.PI * 2;
const WIDE = matchMedia('(min-width: 60rem) and (min-height: 43rem) and (orientation: landscape)');
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

type Dispose = () => void;

/** Calls frame(dt) every animation frame while `el` is near the screen and the tab is visible. */
function runner(el: HTMLElement, frame: (dt: number) => void, signal: AbortSignal) {
  let raf = 0;
  let last = 0;
  let on = false;
  const loop = (t: number) => {
    raf = 0;
    if (!on || document.hidden) return;
    const dt = Math.min(t - last, 50);
    last = t;
    frame(dt);
    raf = requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!raf && on && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };
  const io = new IntersectionObserver(
    ([e]) => {
      on = e?.isIntersecting ?? false;
      wake();
    },
    { rootMargin: '150px 0px' },
  );
  io.observe(el);
  document.addEventListener('visibilitychange', wake, { signal });
  signal.addEventListener('abort', () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    on = false;
  });
}

/** True while the pointer is over the table or a finger just touched it (plus a short grace period). */
function pauser(el: HTMLElement, signal: AbortSignal) {
  let held = false;
  let timer = 0;
  const hold = () => {
    clearTimeout(timer);
    held = true;
  };
  const release = (ms: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => (held = false), ms);
  };
  el.addEventListener('pointerenter', hold, { signal });
  el.addEventListener('pointerdown', hold, { signal });
  el.addEventListener('pointerleave', (e) => release(e.pointerType === 'touch' ? 1500 : 200), { signal });
  el.addEventListener('focusin', hold, { signal });
  el.addEventListener('focusout', () => release(200), { signal });
  signal.addEventListener('abort', () => clearTimeout(timer));
  return () => held;
}

const reset = (table: HTMLElement, cards: HTMLElement[], cls: string): Dispose => () => {
  table.classList.remove(cls);
  cards.forEach((c) => c.removeAttribute('style'));
};

/* ---------- landscape: tilted ring ---------- */

const IDLE_RING = 0.0003; // rad/ms (about 21s per lap)
const RISE = 56; // px the far side of the ring sits higher than the front
const YAW = 0.55; // rad the side cards turn toward the viewer

function orbit(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-orbit');
  table.classList.add('is-orbit');
  const n = cards.length;
  const held = pauser(table, signal);
  let spin = 0;
  let vel = IDLE_RING;
  let R = 0;
  let dragging = false;
  let lastX = 0;
  let lastT = 0;

  const apply = () => {
    cards.forEach((el, i) => {
      const a = spin + (i * TAU) / n;
      const c = Math.cos(a);
      const s = Math.sin(a);
      el.style.transform = `perspective(1500px) translate3d(${(R * s).toFixed(1)}px,${((RISE * (c - 1)) / 2).toFixed(1)}px,${(R * (c - 1)).toFixed(1)}px) rotateY(${(-YAW * s).toFixed(3)}rad)`;
      el.style.opacity = (0.4 + 0.6 * ((c + 1) / 2)).toFixed(2);
      el.style.zIndex = String(Math.round((c + 1) * 50));
      el.style.pointerEvents = c < -0.7 ? 'none' : ''; // the far card can't be hit through the front one
    });
  };
  const measure = () => {
    const w = cards[0]!.offsetWidth;
    R = Math.min(w * 1.15, innerWidth / 2 - w / 2 - 12);
    apply();
  };

  table.addEventListener(
    'pointerdown',
    (e) => {
      if ((e.target as Element).closest('a,button,canvas,input,summary')) return; // never hijack a control
      dragging = true;
      lastX = e.clientX;
      lastT = performance.now();
      vel = 0;
    },
    { signal },
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!dragging) return;
      const now = performance.now();
      const d = (e.clientX - lastX) * 0.004;
      spin += d;
      vel = clamp(d / Math.max(now - lastT, 1), -0.01, 0.01);
      lastX = e.clientX;
      lastT = now;
      apply();
    },
    { signal },
  );
  const end = () => (dragging = false);
  window.addEventListener('pointerup', end, { signal });
  window.addEventListener('pointercancel', end, { signal });

  runner(
    table,
    (dt) => {
      if (dragging) return;
      vel += ((held() ? 0 : IDLE_RING) - vel) * 0.04; // glide back to the resting drift
      spin += vel * dt;
      apply();
    },
    signal,
  );

  const ro = new ResizeObserver(measure);
  ro.observe(cards[0]!);
  signal.addEventListener('abort', () => ro.disconnect());
  measure();

  return () => {
    ac.abort();
    undo();
  };
}

/* ---------- everywhere else: scroll-driven helix ---------- */

const IDLE_STACK = 0.0004; // rad/ms
const GAIN = 0.005; // rad of spin per px scrolled
const PHASE = 1.1; // rad between neighbouring cards
const DEPTH = 90; // px the far side swings back

function stack(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-whirl');
  table.classList.add('is-whirl');
  const held = pauser(table, signal);
  let target = 0;
  let shown = 0;
  let lastY = scrollY;

  addEventListener(
    'scroll',
    () => {
      target += (scrollY - lastY) * GAIN;
      lastY = scrollY;
    },
    { passive: true, signal },
  );

  const frame = (dt: number) => {
    if (!held()) target += IDLE_STACK * dt;
    shown += (target - shown) * (1 - Math.exp(-dt / 100)); // ease toward the target
    const R = clamp(innerWidth * 0.07, 16, 34);
    cards.forEach((el, i) => {
      const a = shown + i * PHASE;
      const c = Math.cos(a);
      const s = Math.sin(a);
      el.style.transform = `perspective(900px) translate3d(${(R * s).toFixed(1)}px,0,${(DEPTH * (c - 1)).toFixed(1)}px) rotateY(${(-0.5 * s).toFixed(3)}rad)`;
      el.style.opacity = (0.55 + 0.45 * ((c + 1) / 2)).toFixed(2);
      el.style.zIndex = String(Math.round((c + 1) * 50));
    });
  };
  frame(0);
  runner(table, frame, signal);

  return () => {
    ac.abort();
    undo();
  };
}

export default function init() {
  const table = document.querySelector<HTMLElement>('.table');
  const cards = table ? Array.from(table.querySelectorAll<HTMLElement>('.card')) : [];
  if (!table || !cards.length) return;
  let dispose: Dispose = () => {};
  const mount = () => {
    dispose();
    dispose = WIDE.matches && cards.length >= 3 && cards.length <= 4 ? orbit(table, cards) : stack(table, cards);
  };
  mount();
  WIDE.addEventListener('change', mount);
}
