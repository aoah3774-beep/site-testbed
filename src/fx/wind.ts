// Ash and ember motes drifting over the page below the hero (the hero has its own embers). Scrolling stirs them
// into streaks with a little parallax, and every so often a gust sweeps through. Near "On the table" a few more
// appear. One fixed 2D canvas, DPR capped, idle while the hero fills the screen or the tab is hidden.
type Mote = { x: number; y: number; z: number; r: number; color: string; ph: number; extra: boolean };
const TAU = Math.PI * 2;
const COLORS = ['#d9692a', '#8a8580', '#e8dfd0', '#9c1f1f'];

export default function init() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'wind';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const table = document.querySelector<HTMLElement>('#table');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const count = matchMedia('(max-width: 767px)').matches ? 26 : 56;
  let w = 0;
  let h = 0;
  const resize = () => {
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  const motes: Mote[] = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: 0.25 + Math.random() * 0.75, // depth: nearer motes move and streak more
    r: 0.6 + Math.random() * 1.4,
    color: COLORS[i % COLORS.length]!,
    ph: Math.random() * TAU,
    extra: i >= count * 0.55, // only shown near "On the table"
  }));

  let presenceWant = hero ? 0 : 1; // 0 while the hero fills the screen
  let boostWant = 0; // 1 while "On the table" is on screen
  let presence = 0;
  let boost = 0;
  let scrollV = 0; // smoothed scroll speed, px per ms
  let lastY = scrollY;
  let nextGust = 4000;
  let gustAt = 0;
  let gustLen = 2000;
  let raf = 0;
  let last = 0;

  const frame = (t: number) => {
    raf = 0;
    if (document.hidden) return;
    const dt = Math.min(t - last, 50);
    last = t;
    presence += (presenceWant - presence) * (1 - Math.exp(-dt / 400));
    boost += (boostWant - boost) * (1 - Math.exp(-dt / 600));
    ctx.clearRect(0, 0, w, h);
    if (presence < 0.01 && presenceWant === 0) return; // nothing to draw; the observers wake us again

    scrollV += ((scrollY - lastY) / Math.max(dt, 1) - scrollV) * (1 - Math.exp(-dt / 120));
    lastY = scrollY;
    if (t > nextGust) {
      gustAt = t;
      gustLen = 1800 + Math.random() * 1400;
      nextGust = t + 7000 + Math.random() * 8000;
    }
    const gp = (t - gustAt) / gustLen;
    const gust = gp >= 0 && gp < 1 ? Math.sin(gp * Math.PI) ** 2 : 0;
    const wind = (0.012 + gust * 0.09 + Math.min(Math.abs(scrollV), 3) * 0.1) * (1 + boost * 0.6);

    ctx.lineCap = 'round';
    for (const m of motes) {
      const vx = (wind + Math.sin(t / 1700 + m.ph) * 0.006) * m.z;
      const vy = (-0.008 + Math.cos(t / 2100 + m.ph) * 0.004) * m.z - scrollV * m.z * 0.9;
      m.x += vx * dt;
      m.y += vy * dt;
      if (m.x > w + 10) [m.x, m.y] = [-10, Math.random() * h];
      else if (m.x < -10) [m.x, m.y] = [w + 10, Math.random() * h];
      if (m.y < -10) [m.x, m.y] = [Math.random() * w, h + 10];
      else if (m.y > h + 10) [m.x, m.y] = [Math.random() * w, -10];

      const alpha = presence * (m.extra ? boost : 1) * (0.25 + 0.5 * m.z);
      if (alpha < 0.02) continue;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.r * m.z * 1.6 + 0.4;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - vx * 55, m.y - vy * 55); // streak length follows speed
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (!raf && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  if (hero) {
    new IntersectionObserver(
      (e) => {
        presenceWant = 1 - (e[0]?.intersectionRatio ?? 0);
        wake();
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    ).observe(hero);
  }
  if (table) {
    new IntersectionObserver((e) => {
      boostWant = e[0]?.isIntersecting ? 1 : 0;
      wake();
    }).observe(table);
  }
  document.addEventListener('visibilitychange', wake);
  wake();
}
