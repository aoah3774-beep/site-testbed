// The two hero text links lean a few px toward the mouse. Mouse only; transform only.
import { gsap } from './motion';

const PULL = 0.28;

export default function init() {
  document.querySelectorAll<HTMLElement>('[data-magnet]').forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });
    let r: DOMRect | null = null;
    el.addEventListener('pointerenter', () => (r = el.getBoundingClientRect()));
    el.addEventListener('pointermove', (e) => {
      if (!r || e.pointerType !== 'mouse') return;
      qx((e.clientX - (r.left + r.width / 2)) * PULL);
      qy((e.clientY - (r.top + r.height / 2)) * PULL);
    });
    el.addEventListener('pointerleave', () => {
      qx(0);
      qy(0);
    });
  });
}
