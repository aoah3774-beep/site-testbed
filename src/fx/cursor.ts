// Short ember trail behind the (crosshair) cursor. Mouse only; the loop sleeps when the pointer is still.
const N = 8;

export default function init() {
  const dots = Array.from({ length: N }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'trail';
    d.setAttribute('aria-hidden', 'true');
    d.style.opacity = String(0.55 * (1 - i / N));
    d.style.scale = String(1 - (i / N) * 0.7);
    document.body.append(d);
    return d;
  });
  const pts = dots.map(() => ({ x: -100, y: -100 }));
  const target = { x: -100, y: -100 };
  let raf = 0;

  function loop() {
    let x = target.x;
    let y = target.y;
    let moving = false;
    pts.forEach((p, i) => {
      p.x += (x - p.x) * 0.35;
      p.y += (y - p.y) * 0.35;
      if (Math.abs(x - p.x) > 0.3 || Math.abs(y - p.y) > 0.3) moving = true;
      dots[i]!.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
      x = p.x;
      y = p.y;
    });
    raf = moving ? requestAnimationFrame(loop) : 0;
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    },
    { passive: true },
  );
}
