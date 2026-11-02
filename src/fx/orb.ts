// Music orb: a gyroscope. Two hoops and the ring of four link faces turn on different axes, slowly.
// It eases almost to a stop while the pointer or a finger is on it (so links are easy to hit) and picks
// up again afterwards. Keyboard focus swings the focused face to the front. Without this module (or with
// reduced motion) the faces stay a plain 2x2 grid of links.
const SPEED = { a: 0.012, b: -0.017, c: 0.022 }; // deg per ms (outer hoop, inner hoop, faces)
const SLOW = 0.07; // fraction of full speed while hovered or touched

export default function init() {
  const orb = document.querySelector<HTMLElement>('[data-orb]');
  if (!orb) return;
  const faces = Array.from(orb.querySelectorAll<HTMLElement>('.orb__face'));
  if (faces.length !== 4) return;

  orb.classList.add('is-3d');
  const ang = { a: 24, b: 58, c: 0 };
  let k = 1; // current speed factor
  let want = 1; // wanted speed factor
  let focused = -1;
  let timer = 0;
  let raf = 0;
  let last = 0;
  let onScreen = false;

  const wrap = (d: number) => ((d % 360) + 540) % 360 - 180; // shortest signed turn
  const paint = () => {
    for (const key of ['a', 'b', 'c'] as const) orb.style.setProperty(`--${key}`, (ang[key] % 360).toFixed(2));
  };

  const loop = (t: number) => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(t - last, 50);
    last = t;
    if (focused >= 0) {
      ang.a += wrap(0 - ang.a) * 0.08;
      ang.b += wrap(0 - ang.b) * 0.08;
      ang.c += wrap(-focused * 90 - ang.c) * 0.08;
    } else {
      k += (want - k) * 0.05;
      ang.a += SPEED.a * k * dt;
      ang.b += SPEED.b * k * dt;
      ang.c += SPEED.c * k * dt;
    }
    paint();
    raf = requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!raf && onScreen && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  };

  const slow = () => {
    clearTimeout(timer);
    want = SLOW;
  };
  const resume = (ms: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => (want = 1), ms);
  };
  orb.addEventListener('pointerenter', slow);
  orb.addEventListener('pointerdown', slow);
  orb.addEventListener('pointerleave', (e) => resume(e.pointerType === 'touch' ? 1800 : 150));
  orb.addEventListener('focusin', (e) => {
    const i = faces.indexOf((e.target as Element).closest('a') as HTMLElement);
    if (i >= 0) focused = i;
    slow();
  });
  orb.addEventListener('focusout', () => {
    focused = -1;
    resume(150);
  });

  new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? false;
    wake();
  }).observe(orb);
  document.addEventListener('visibilitychange', wake);
  paint();
}
