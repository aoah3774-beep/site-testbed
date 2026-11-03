// "On the table" whirl. One engine, two layouts. Pure transforms: no layout work per frame.
//  - wide landscape screens with 3-4 beats: the cards sit on a tilted ring that rests on one card, glides to the
//    next every few seconds (a soft spring, no linear spinning), and can be dragged: on release it settles on the
//    nearest card. Hover or touch pauses the glide; keyboard focus brings a card to the front.
//  - everything else (phones, tablets, more than 4 beats): cards stay stacked. Each card's pose depends only on
//    where it is on screen (like items on a wheel: they lean back and sink as they leave the middle), and the
//    scroll position is eased, so the motion glides instead of snapping to every wheel tick or touch event.
// Tune: DWELL (ms between ring moves), STIFFNESS (ring spring), DEPTH / TILT / TWIST (stacked pose).
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

/* ---------- landscape: tilted ring that rests on one card ---------- */

const DWELL = 7000; // ms a card rests at the front before the ring moves on
const STIFFNESS = 0.000006; // spring strength (per ms^2); critically damped below
const DAMPING = 2 * Math.sqrt(STIFFNESS);
const RISE = 48; // px the far side of the ring sits higher than the front
const YAW = 0.5; // rad the side cards turn toward the viewer

function orbit(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-orbit');
  table.classList.add('is-orbit');
  const n = cards.length;
  const step = TAU / n;
  const held = pauser(table, signal);
  let spin = 0; // shown angle
  let target = 0; // where the spring is heading (always a multiple of `step` once settled)
  let speed = 0;
  let dwell = 0;
  let R = 0;
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let flick = 0; // rad per ms, from the last drag moves

  const apply = () => {
    cards.forEach((el, i) => {
      const a = spin + i * step;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const front = (c + 1) / 2; // 1 at the front, 0 at the back
      el.style.transform = `perspective(1600px) translate3d(${(R * s).toFixed(1)}px,${((RISE * (c - 1)) / 2).toFixed(1)}px,${(R * (c - 1)).toFixed(1)}px) rotateY(${(-YAW * s).toFixed(3)}rad)`;
      el.style.opacity = (0.3 + 0.7 * front ** 1.4).toFixed(2);
      el.style.zIndex = String(Math.round(front * 100));
      el.style.pointerEvents = c < -0.7 ? 'none' : ''; // the far card can't be hit through the front one
    });
  };
  const measure = () => {
    const w = cards[0]!.offsetWidth;
    R = Math.min(w * 1.15, innerWidth / 2 - w / 2 - 12);
    apply();
  };
  /** Rotate the ring the shortest way so card k ends up at the front. */
  const bring = (k: number) => {
    const base = -k * step;
    target = base + Math.round((target - base) / TAU) * TAU;
    dwell = 0;
  };

  table.addEventListener(
    'pointerdown',
    (e) => {
      if ((e.target as Element).closest('a,button,canvas,input,summary')) return; // never hijack a control
      dragging = true;
      lastX = e.clientX;
      lastT = performance.now();
      flick = 0;
    },
    { signal },
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!dragging) return;
      const now = performance.now();
      const d = (e.clientX - lastX) * 0.0045;
      target += d;
      flick = clamp(d / Math.max(now - lastT, 1), -0.004, 0.004);
      lastX = e.clientX;
      lastT = now;
    },
    { signal },
  );
  const end = () => {
    if (!dragging) return;
    dragging = false;
    const throwBy = clamp(flick * 320, -step * 1.2, step * 1.2);
    target = Math.round((target + throwBy) / step) * step; // settle on the nearest card
    dwell = 0;
  };
  window.addEventListener('pointerup', end, { signal });
  window.addEventListener('pointercancel', end, { signal });
  table.addEventListener(
    'focusin',
    (e) => {
      const k = cards.indexOf((e.target as Element).closest<HTMLElement>('.card') as HTMLElement);
      if (k >= 0) bring(k);
    },
    { signal },
  );

  runner(
    table,
    (dt) => {
      if (dragging || held()) dwell = 0;
      else if ((dwell += dt) >= DWELL) {
        target -= step; // the next card arrives from the right
        dwell = 0;
      }
      speed += ((target - spin) * STIFFNESS - speed * DAMPING) * dt;
      spin += speed * dt;
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

/* ---------- everywhere else: stacked cards that ride a wheel as you scroll ---------- */

const DEPTH = 70; // px a card sinks back at the edge of the screen
const TILT = 0.22; // rad a card leans back at the edge of the screen
const TWIST = 0.28; // rad neighbours turn in opposite directions
const SWAY = 18; // px neighbours drift in opposite directions
const CALM = 110; // ms: how softly the scroll position is followed

function stack(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-whirl');
  table.classList.add('is-whirl');
  const held = pauser(table, signal);
  let tops: number[] = [];
  let heights: number[] = [];
  let vh = innerHeight;
  let shown = scrollY;
  let calm = 1; // 0 while touched or hovered: the idle breathing stops so controls hold still
  let clock = 0;

  // untransformed document position (offsetTop ignores transforms)
  const docTop = (el: HTMLElement) => {
    let y = 0;
    for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
    return y;
  };
  const measure = () => {
    vh = innerHeight;
    tops = cards.map(docTop);
    heights = cards.map((c) => c.offsetHeight);
  };

  const frame = (dt: number) => {
    if (Math.abs(scrollY - shown) > vh * 1.5) shown = scrollY; // jumped (anchor link, resize): don't fly across
    shown += (scrollY - shown) * (1 - Math.exp(-dt / CALM));
    calm += ((held() ? 0 : 1) - calm) * 0.05;
    clock += dt;
    cards.forEach((el, i) => {
      const mid = tops[i]! + heights[i]! / 2 - shown;
      const d = clamp((mid - vh / 2) / (vh * 0.6), -1.4, 1.4); // 0 at the middle of the screen, +-1 near the edges
      const ad = Math.min(Math.abs(d), 1);
      const side = i % 2 ? 1 : -1;
      const breathe = Math.sin(clock / 2300 + i * 2.1) * calm;
      el.style.transform = `perspective(1000px) translate3d(${(side * d * SWAY + breathe * 5).toFixed(1)}px,${(breathe * 3).toFixed(1)}px,${(-DEPTH * ad * ad).toFixed(1)}px) rotateX(${(-d * TILT).toFixed(3)}rad) rotateY(${(-side * d * TWIST + breathe * 0.03).toFixed(3)}rad)`;
      el.style.opacity = (1 - 0.5 * ad * ad).toFixed(2);
      el.style.zIndex = String(Math.round((1 - ad) * 50));
    });
  };

  const ro = new ResizeObserver(measure);
  ro.observe(table);
  addEventListener('load', measure, { signal });
  signal.addEventListener('abort', () => ro.disconnect());
  measure();
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
