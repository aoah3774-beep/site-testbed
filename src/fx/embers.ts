// Slow ash and ember particles over the hero. 2D canvas, DPR capped at 2, paused off-screen or when the
// tab is hidden. If the frame rate drops below ~40fps it halves the particles, then stops.
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; ember: boolean };

export default function init() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-embers]');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let count = matchMedia('(max-width: 767px)').matches ? 50 : 150;
  let w = 0;
  let h = 0;
  let parts: P[] = [];
  let onScreen = true;
  let raf = 0;
  let last = 0;
  let frames = 0;
  let acc = 0;
  let level = 0;

  const spawn = (anywhere: boolean): P => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    vx: (Math.random() - 0.5) * 0.02,
    vy: -(0.012 + Math.random() * 0.04),
    r: 0.6 + Math.random() * 1.8,
    a: 0.15 + Math.random() * 0.55,
    ember: Math.random() < 0.35,
  });

  function resize() {
    w = canvas!.clientWidth;
    h = canvas!.clientHeight;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = Array.from({ length: count }, () => spawn(true));
  }

  function frame(t: number) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(t - last, 50);
    last = t;

    // frame-rate governor
    if (++frames > 30) {
      acc += dt;
      if ((frames - 30) % 60 === 0) {
        if (acc / 60 > 25) {
          level++;
          if (level === 1) parts.length = count = Math.floor(count / 2);
          else return void (canvas!.hidden = true); // still slow: stop for good
        }
        acc = 0;
      }
    }

    ctx!.clearRect(0, 0, w, h);
    for (const pass of [true, false]) {
      ctx!.fillStyle = pass ? '#d9692a' : '#8a8580';
      for (const p of parts) {
        if (p.ember !== pass) continue;
        p.x += (p.vx + Math.sin(t / 1800 + p.y / 70) * 0.012) * dt;
        p.y += p.vy * dt;
        if (p.y < -10) Object.assign(p, spawn(false));
        ctx!.globalAlpha = pass ? p.a : p.a * 0.6;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx!.fill();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  const wake = () => {
    if (!raf && onScreen && !document.hidden && !canvas.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  new ResizeObserver(() => resize()).observe(canvas);
  new IntersectionObserver((e) => {
    onScreen = e[0]?.isIntersecting ?? false;
    wake();
  }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  wake();
}
