// Shared GSAP setup. Installed from npm (self-hosted, so the strict CSP needs no new host) and only ever reached through
// dynamic imports (main.ts effects, inquiry.ts), so it never blocks first paint.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const SOFT = 'expo.out'; // fast start, long soft landing (same curve as --soft in tokens.css)
export const SETTLE = 'back.out(0.7)'; // the same, with a slight overshoot
gsap.defaults({ ease: SOFT });

export { gsap, ScrollTrigger, SplitText };

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Runs fn(dt ms) on GSAP's shared ticker only while `el` is near the screen. Hidden tabs idle with requestAnimationFrame. */
export function whileVisible(el: Element, fn: (dt: number) => void, signal?: AbortSignal, margin = '150px 0px') {
  const tick = (_time: number, dt: number) => fn(Math.min(dt, 50));
  let on = false;
  const set = (v: boolean) => {
    if (v === on) return;
    on = v;
    if (v) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  };
  const io = new IntersectionObserver(([e]) => set(e?.isIntersecting ?? false), { rootMargin: margin });
  io.observe(el);
  signal?.addEventListener('abort', () => {
    io.disconnect();
    set(false);
  });
}
