// Scroll-driven spiral for "On the table". Cards sit on two interleaved strands (even / odd) that
// twist in opposite directions around a vertical axis: they cross at screen center and swing out
// as they move toward the top or bottom, like a double helix. Pure transforms, no layout work per frame.
const MAX_TURN = 0.9; // radians of rotation at the very top/bottom of the screen (~51 deg). Raise for a tighter twist.
const PERSPECTIVE = 1100; // px

export default function init() {
  const table = document.querySelector<HTMLElement>('.table');
  const cards = table ? Array.from(table.querySelectorAll<HTMLElement>('.card')) : [];
  if (!table || !cards.length) return;
  table.classList.add('is-helix');

  // document-space center of each card, measured without transforms (offsetTop ignores them)
  let centers: number[] = [];
  const docY = (el: HTMLElement) => {
    let y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
  };
  const measure = () => {
    centers = cards.map((c) => docY(c) + c.offsetHeight / 2);
  };

  const visible = new Set<number>();
  let raf = 0;
  const apply = () => {
    raf = 0;
    const vh = innerHeight;
    const radius = Math.min(Math.max(innerWidth * 0.12, 24), 150); // orbit radius in px
    visible.forEach((i) => {
      const t = Math.max(-1.2, Math.min(1.2, ((centers[i] ?? 0) - scrollY - vh / 2) / (vh / 2)));
      const f = t * MAX_TURN * (i % 2 ? -1 : 1); // odd cards twist the other way
      const c = Math.cos(f);
      const el = cards[i]!;
      el.style.transform =
        Math.abs(f) < 0.004
          ? ''
          : `perspective(${PERSPECTIVE}px) translate3d(${(radius * Math.sin(f)).toFixed(1)}px,0,${(-radius * (1 - c)).toFixed(1)}px) rotateY(${f.toFixed(3)}rad) scale(${(0.9 + 0.1 * c).toFixed(3)})`;
      el.style.opacity = (0.5 + 0.5 * c).toFixed(2);
    });
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  measure();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = cards.indexOf(e.target as HTMLElement);
        if (e.isIntersecting) visible.add(i);
        else visible.delete(i);
      }
      schedule();
    },
    { rootMargin: '150px 0px' },
  );
  cards.forEach((c) => io.observe(c));

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => {
    measure();
    schedule();
  });
  // images/fonts loading can change card heights
  new ResizeObserver(() => {
    measure();
    schedule();
  }).observe(table);
}
