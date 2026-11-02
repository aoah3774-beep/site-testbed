// Mouse parallax on the hero (desktop only): writes two CSS variables, CSS does the moving.
export default function init() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  let raf = 0;
  let nx = 0;
  let ny = 0;
  const apply = () => {
    raf = 0;
    hero.style.setProperty('--px', nx.toFixed(3));
    hero.style.setProperty('--py', ny.toFixed(3));
  };
  hero.addEventListener(
    'pointermove',
    (e) => {
      const r = hero.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => {
    nx = ny = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  });
}
