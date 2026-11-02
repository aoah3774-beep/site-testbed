// Turns the swipe row into a spinning 3D ring (drag/swipe, wheel, auto-spin). Tap still opens the link.
// Needs 3+ items. Without this module (or with reduced motion) the gallery stays a plain scroll row.
export default function init() {
  const g = document.querySelector<HTMLElement>('[data-gallery]');
  const ring = g?.querySelector<HTMLElement>('.ring');
  const n = ring?.children.length ?? 0;
  if (!g || !ring || n < 3) return;

  g.classList.add('is-3d');
  const step = 360 / n;
  const AUTO = 0.006; // deg per ms
  let rot = 0;
  let vel = AUTO;
  let dragging = false;
  let paused = false; // hover or focus
  let moved = 0;
  let lastX = 0;
  let lastT = 0;
  let raf = 0;
  let onScreen = false;

  const apply = () => ring.style.setProperty('--rot', rot.toFixed(2));

  function loop(t: number) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(t - lastT, 50);
    lastT = t;
    if (!dragging) {
      vel += ((paused ? 0 : AUTO) - vel) * 0.04; // glide back to the resting speed
      rot += vel * dt;
      apply();
    }
    raf = requestAnimationFrame(loop);
  }
  const wake = () => {
    if (!raf && onScreen && !document.hidden) {
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };

  g.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastT = performance.now();
    vel = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    rot += dx * 0.35;
    vel = (dx * 0.35) / Math.max(now - lastT, 1);
    lastX = e.clientX;
    lastT = now;
    moved += Math.abs(dx);
    apply();
  });
  const end = () => {
    dragging = false;
    wake();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // a drag must not count as a tap
  ring.addEventListener(
    'click',
    (e) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  g.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical wheel keeps scrolling the page
      e.preventDefault();
      rot -= e.deltaX * 0.15;
      apply();
    },
    { passive: false },
  );

  g.addEventListener('pointerenter', () => (paused = true));
  g.addEventListener('pointerleave', () => (paused = false));
  // keyboard: bring the focused cover to the front
  ring.addEventListener('focusin', (e) => {
    const i = Array.from(ring.children).indexOf((e.target as Element).closest('a') as Element);
    if (i < 0) return;
    paused = true;
    vel = 0;
    rot = -i * step + Math.round((rot + i * step) / 360) * 360;
    apply();
  });
  ring.addEventListener('focusout', () => (paused = false));

  new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? false;
    wake();
  }).observe(g);
  document.addEventListener('visibilitychange', wake);
}
