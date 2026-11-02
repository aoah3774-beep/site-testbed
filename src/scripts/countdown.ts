// One shared 1s ticker. Only cards on screen update; the tick stops when none are visible.
const pad = (n: number) => String(n).padStart(2, '0');

export function initCountdown() {
  const cards = document.querySelectorAll<HTMLElement>('[data-drops]');
  if (!cards.length) return;

  const drops = new WeakMap<HTMLElement, number>();
  const visible = new Set<HTMLElement>();
  let timer = 0;
  let parity = 0;

  function render(card: HTMLElement, now: number) {
    const clock = card.querySelector<HTMLElement>('[data-clock]');
    const at = drops.get(card);
    if (!clock || at === undefined) return;
    const ms = at - now;
    if (ms <= 0) {
      clock.textContent = 'dropping now';
      clock.classList.remove('final');
      return;
    }
    const s = Math.floor(ms / 1000);
    clock.textContent = `t-minus ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    clock.classList.toggle('final', ms < 60_000);
    clock.dataset.t = String(parity); // CSS flickers on each tick (fx.css)
  }

  function tick() {
    if (document.hidden) return;
    if (!visible.size) {
      clearInterval(timer);
      timer = 0;
      return;
    }
    parity ^= 1;
    const now = Date.now();
    visible.forEach((c) => render(c, now));
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement));
      if (visible.size && !timer) timer = window.setInterval(tick, 1000);
      tick();
    },
    { rootMargin: '100px' },
  );

  cards.forEach((c) => {
    const at = Date.parse(c.dataset.drops ?? '');
    if (Number.isNaN(at)) return;
    drops.set(c, at);
    io.observe(c);
  });
  document.addEventListener('visibilitychange', tick);
}
