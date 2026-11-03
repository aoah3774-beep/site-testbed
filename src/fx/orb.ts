// Music orb: a gyroscope. Four panels form a ring that turns on its vertical axis; two gold hoops sway around it.
// The hoops swing back and forth instead of tumbling, so the panel text never ends up upside down.
// Everything eases almost to a stop while the pointer or a finger is on it (so buttons are easy to hit) and
// picks up again afterwards. Keyboard focus swings the focused panel to the front. Without this module
// (or with reduced motion) the panels stay a plain 2x2 grid.
const SPIN = 0.016; // deg per ms: the ring of panels (about 22s per turn)
const SWAY = { a: 0.00042, b: 0.00057 }; // rad per ms: outer and inner hoop swing
const REACH = { a: 38, b: 22 }; // deg: how far each hoop swings
const SLOW = 0.07; // fraction of full speed while hovered or touched

export default function init() {
  const orb = document.querySelector<HTMLElement>('[data-orb]');
  if (!orb) return;
  const faces = Array.from(orb.querySelectorAll<HTMLElement>('.orb__face'));
  if (faces.length !== 4) return;

  orb.classList.add('is-3d');
  const phase = { a: 0.6, b: 2.1 };
  let spin = 0;
  let tilt = 1; // 1 = hoops swinging, 0 = hoops level (while a panel is focused)
  let k = 1; // current speed factor
  let want = 1; // wanted speed factor
  let focused = -1;
  let timer = 0;
  let raf = 0;
  let last = 0;
  let onScreen = false;

  const wrap = (d: number) => ((d % 360) + 540) % 360 - 180; // shortest signed turn
  const paint = () => {
    orb.style.setProperty('--a', (REACH.a * Math.sin(phase.a) * tilt).toFixed(2));
    orb.style.setProperty('--b', (REACH.b * Math.sin(phase.b) * tilt).toFixed(2));
    orb.style.setProperty('--c', (spin % 360).toFixed(2));
  };

  const loop = (t: number) => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = Math.min(t - last, 50);
    last = t;
    if (focused >= 0) {
      tilt += (0 - tilt) * 0.08;
      spin += wrap(-focused * 90 - spin) * 0.08;
    } else {
      k += (want - k) * 0.05;
      tilt += (1 - tilt) * 0.03;
      phase.a += SWAY.a * k * dt;
      phase.b += SWAY.b * k * dt;
      spin += SPIN * k * dt;
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
    const i = faces.indexOf((e.target as Element).closest('.orb__face') as HTMLElement);
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
