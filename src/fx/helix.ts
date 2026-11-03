// "On the table" whirl. One GSAP engine, two layouts, one feel: fast start, long soft landing, a slight overshoot.
//  - wide landscape screens with 3-4 beats: the cards sit on a tilted ring that rests on one card and glides to the next every
//    few seconds. Drag it: on release it settles on the nearest card (a flick carries it a little further). Hover or touch pauses
//    the glide; keyboard focus brings a card to the front.
//  - everything else: cards stay stacked and ride a wheel as you scroll; ScrollTrigger's scrub smooths the scroll position.
// Cards also lean a few degrees toward the mouse. Depth is shown with opacity and a dark veil (--dim), never blur.
// Tune: DWELL / TRAVEL / RISE / YAW / ROLL (ring), DEPTH / TILT / TWIST / SWAY (stack), LEAN (mouse).
import { gsap, SETTLE, clamp, whileVisible } from './motion';

const TAU = Math.PI * 2;
const WIDE = matchMedia('(min-width: 60rem) and (min-height: 43rem) and (orientation: landscape)');
const LEAN = 5; // deg a card leans toward the mouse

type Dispose = () => void;

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

/** Per-card lean toward the mouse, eased by quickTo. Read x (rotateX) and y (rotateY) every frame. */
function lean(cards: HTMLElement[], signal: AbortSignal) {
  const tilt = cards.map(() => ({ x: 0, y: 0 }));
  cards.forEach((el, i) => {
    const t = tilt[i]!;
    const qx = gsap.quickTo(t, 'x', { duration: 0.9 });
    const qy = gsap.quickTo(t, 'y', { duration: 0.9 });
    el.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        qx(-((e.clientY - r.top) / r.height - 0.5) * 2 * LEAN);
        qy(((e.clientX - r.left) / r.width - 0.5) * 2 * LEAN);
      },
      { signal },
    );
    el.addEventListener(
      'pointerleave',
      () => {
        qx(0);
        qy(0);
      },
      { signal },
    );
  });
  return tilt;
}

/* ---------- landscape: tilted ring that rests on one card ---------- */

const DWELL = 7000; // ms a card rests at the front before the ring moves on
const TRAVEL = 1.7; // s per move
const RISE = 36; // px the far side of the ring sits higher than the front
const YAW = 0.38; // rad the side cards turn toward the viewer
const ROLL = 0.035; // rad of roll that gives each move a small flourish

function orbit(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-orbit');
  table.classList.add('is-orbit');
  const n = cards.length;
  const step = TAU / n;
  const held = pauser(table, signal);
  const tilt = lean(cards, signal);
  const ring = { a: 0 }; // shown angle
  let slot = 0; // which card (unwrapped) the ring is heading for
  let dwell = 0;
  let R = 0;
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let flick = 0; // rad per ms from the last drag moves

  const render = () => {
    cards.forEach((el, i) => {
      const a = ring.a + i * step;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const front = (c + 1) / 2; // 1 at the front, 0 at the back
      const t = tilt[i]!;
      el.style.transform = `perspective(1600px) translate3d(${(R * s).toFixed(1)}px,${((RISE * (c - 1)) / 2).toFixed(1)}px,${(R * (c - 1)).toFixed(1)}px) rotateY(${(-YAW * s).toFixed(3)}rad) rotateZ(${(ROLL * s).toFixed(3)}rad) rotateX(${t.x.toFixed(2)}deg) rotateY(${t.y.toFixed(2)}deg)`;
      el.style.opacity = (0.3 + 0.7 * front ** 1.4).toFixed(2);
      el.style.setProperty('--dim', ((1 - front) * 0.5).toFixed(2));
      el.style.zIndex = String(Math.round(front * 100));
      el.style.pointerEvents = c < -0.7 ? 'none' : ''; // the far card can't be hit through the front one
    });
  };
  const measure = () => {
    const w = cards[0]!.offsetWidth;
    R = Math.min(w * 1.15, innerWidth / 2 - w / 2 - 12);
    render();
  };
  const go = (k: number) => {
    slot = k;
    dwell = 0;
    gsap.to(ring, { a: -k * step, duration: TRAVEL, ease: SETTLE, overwrite: true });
  };

  table.addEventListener(
    'pointerdown',
    (e) => {
      if ((e.target as Element).closest('a,button,canvas,input,summary')) return; // never hijack a control
      dragging = true;
      gsap.killTweensOf(ring);
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
      ring.a += d;
      flick = clamp(d / Math.max(now - lastT, 1), -0.004, 0.004);
      lastX = e.clientX;
      lastT = now;
    },
    { signal },
  );
  const end = () => {
    if (!dragging) return;
    dragging = false;
    go(-Math.round((ring.a + clamp(flick * 320, -step * 1.2, step * 1.2)) / step)); // settle on the nearest card
  };
  window.addEventListener('pointerup', end, { signal });
  window.addEventListener('pointercancel', end, { signal });
  table.addEventListener(
    'focusin',
    (e) => {
      const k = cards.indexOf((e.target as Element).closest<HTMLElement>('.card') as HTMLElement);
      if (k < 0) return;
      go(k - n * Math.round((-slot * step + k * step) / TAU)); // the shortest way round
    },
    { signal },
  );

  whileVisible(
    table,
    (dt) => {
      if (dragging || held()) dwell = 0;
      else if ((dwell += dt) >= DWELL) go(slot + 1); // the next card arrives from the right
      render();
    },
    signal,
  );

  const ro = new ResizeObserver(measure);
  ro.observe(cards[0]!);
  signal.addEventListener('abort', () => ro.disconnect());
  measure();

  return () => {
    ac.abort();
    gsap.killTweensOf(ring);
    undo();
  };
}

/* ---------- everywhere else: stacked cards that ride a wheel as you scroll ---------- */

const DEPTH = 60; // px a card sinks back at the edge of the screen
const TILT = 0.18; // rad a card leans back at the edge of the screen
const TWIST = 0.22; // rad neighbours turn in opposite directions
const SWAY = 14; // px neighbours drift in opposite directions

function stack(table: HTMLElement, cards: HTMLElement[]): Dispose {
  const ac = new AbortController();
  const { signal } = ac;
  const undo = reset(table, cards, 'is-whirl');
  table.classList.add('is-whirl');
  const tilt = lean(cards, signal);
  let tops: number[] = [];
  let heights: number[] = [];
  let vh = innerHeight;

  // scrub: p follows the scroll position through the table with a short glide, so poses never snap to wheel ticks
  const prog = { p: 0 };
  const scroll = gsap.to(prog, { p: 1, ease: 'none', scrollTrigger: { trigger: table, start: 'top bottom', end: 'bottom top', scrub: 0.9 } });
  const st = scroll.scrollTrigger!;

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

  const render = () => {
    const shown = st.start + prog.p * (st.end - st.start);
    cards.forEach((el, i) => {
      const mid = tops[i]! + heights[i]! / 2 - shown;
      const d = clamp((mid - vh / 2) / (vh * 0.6), -1.4, 1.4); // 0 at the middle of the screen, +-1 near the edges
      const ad = Math.min(Math.abs(d), 1);
      const side = i % 2 ? 1 : -1;
      const t = tilt[i]!;
      el.style.transform = `perspective(1000px) translate3d(${(side * d * SWAY).toFixed(1)}px,0,${(-DEPTH * ad * ad).toFixed(1)}px) rotateX(${(-d * TILT).toFixed(3)}rad) rotateY(${(-side * d * TWIST).toFixed(3)}rad) rotateX(${t.x.toFixed(2)}deg) rotateY(${t.y.toFixed(2)}deg)`;
      el.style.opacity = (1 - 0.5 * ad * ad).toFixed(2);
      el.style.setProperty('--dim', (0.45 * ad * ad).toFixed(2));
      el.style.zIndex = String(Math.round((1 - ad) * 50));
    });
  };

  const ro = new ResizeObserver(measure);
  ro.observe(table);
  addEventListener('load', measure, { signal });
  signal.addEventListener('abort', () => ro.disconnect());
  measure();
  render();
  whileVisible(table, render, signal);

  return () => {
    ac.abort();
    scroll.scrollTrigger?.kill();
    scroll.kill();
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
