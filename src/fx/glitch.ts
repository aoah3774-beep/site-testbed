// One short glitch (CSS animation) on hover, tap, or section entry.
// A global cooldown keeps it to at most ~2 flashes per second.
export default function init() {
  let last = 0;
  const fire = (el: HTMLElement) => {
    const now = performance.now();
    if (now - last < 400) return;
    last = now;
    el.classList.remove('glitch-run');
    void el.offsetWidth; // restart the animation
    el.classList.add('glitch-run');
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        fire(e.target as HTMLElement);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.6 },
  );
  document.querySelectorAll<HTMLElement>('[data-glitch]').forEach((el) => {
    el.addEventListener('animationend', () => el.classList.remove('glitch-run'));
    el.addEventListener('pointerenter', () => fire(el));
    el.addEventListener('pointerdown', () => fire(el));
    io.observe(el);
  });
}
