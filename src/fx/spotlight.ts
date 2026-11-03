// Emblem spotlight (hero). Each [data-beam] row holds emblems and one soft angled beam.
// Pointer: the beam follows through quickTo (smooth, slightly lagging), enters from the side the pointer came from, lights the
// emblem under it with falloff to its neighbours, and pulls emblems a few px toward the cursor.
// Touch screens: the beam drifts along the row by itself; touching or dragging along the row takes over.
// Keyboard focus lights the focused emblem. Only opacity and transform are animated; the ticker runs only while the row is on screen.
import { gsap, clamp, whileVisible } from './motion';

const REACH = 70; // px: how far the light carries to neighbouring emblems
const PULL = 0.08; // how strongly an emblem leans toward the cursor
const MAX_PULL = 4; // px
const LEAN = -18; // deg: resting slant of the beam
const AMBIENT = 0.5; // beam strength while it drifts on its own

export default function init() {
  const ambient = matchMedia('(hover: none)').matches;
  document.querySelectorAll<HTMLElement>('[data-beam]').forEach((row) => wire(row, ambient));
}

function wire(row: HTMLElement, ambient: boolean) {
  const beam = row.querySelector<HTMLElement>('.beam');
  const emblems = Array.from(row.querySelectorAll<HTMLElement>('.emblem'));
  const lit = emblems.map((e) => e.querySelector<HTMLElement>('.emblem__lit'));
  if (!beam || !emblems.length || lit.some((l) => !l)) return;
  row.classList.add('has-beam');

  const s = { px: 0, py: 0, on: 0 }; // pointer position in the row, and 0..1 "a hand is on the row"
  const qx = gsap.quickTo(s, 'px', { duration: 0.6, ease: 'power3.out' });
  const qy = gsap.quickTo(s, 'py', { duration: 0.6, ease: 'power3.out' });
  let at: { x: number; y: number }[] = [];
  let w = 0;
  let focus = -1;
  let t = 0;
  let prev = 0;
  let clean = false;

  const measure = () => {
    w = row.clientWidth;
    at = emblems.map((e) => ({ x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2 })); // ignores transforms
  };
  new ResizeObserver(measure).observe(row);
  measure();

  const rest = () => {
    beam.style.opacity = '0';
    emblems.forEach((e, i) => {
      e.style.translate = '';
      lit[i]!.style.opacity = '0';
    });
  };

  whileVisible(row, (dt) => {
    t += dt;
    if (s.on < 0.002 && !ambient && focus < 0) {
      if (!clean) rest();
      clean = true;
      return;
    }
    clean = false;
    const drift = ambient ? (Math.sin(t / 3400) * 0.5 + 0.5) * (w + 160) - 80 : 0;
    const x = drift + (s.px - drift) * s.on;
    const power = (ambient ? AMBIENT : 0) * (1 - s.on) + s.on;
    const vx = (x - prev) / Math.max(dt, 1);
    prev = x;
    beam.style.opacity = power.toFixed(3);
    beam.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(LEAN - clamp(vx * 10, -14, 14)).toFixed(1)}deg)`;
    emblems.forEach((e, i) => {
      const p = at[i]!;
      const d = (p.x - x) / REACH;
      const l = Math.max(power * Math.exp(-d * d), i === focus ? 1 : 0);
      lit[i]!.style.opacity = l.toFixed(3);
      const k = s.on * l;
      e.style.translate = `${(clamp((s.px - p.x) * PULL, -MAX_PULL, MAX_PULL) * k).toFixed(2)}px ${(clamp((s.py - p.y) * PULL, -MAX_PULL, MAX_PULL) * k).toFixed(2)}px`;
    });
  });

  const local = (ev: PointerEvent) => {
    const r = row.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  row.addEventListener('pointerenter', (ev) => {
    const p = local(ev);
    if (s.on < 0.05) gsap.set(s, { px: p.x < w / 2 ? -80 : w + 80, py: p.y }); // enter from the side the pointer came from
    gsap.to(s, { on: 1, duration: 0.4, overwrite: 'auto' });
    qx(p.x);
    qy(p.y);
  });
  row.addEventListener('pointermove', (ev) => {
    const p = local(ev);
    qx(p.x);
    qy(p.y);
  });
  row.addEventListener('pointerleave', (ev) => {
    gsap.to(s, { on: 0, duration: 1, delay: ev.pointerType === 'touch' ? 0.5 : 0, overwrite: 'auto' });
  });
  row.addEventListener('focusin', (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>('.emblem');
    if (el?.matches(':focus-visible')) focus = emblems.indexOf(el);
  });
  row.addEventListener('focusout', () => (focus = -1));
}
