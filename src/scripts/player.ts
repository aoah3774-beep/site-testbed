// One global player: starting a snippet stops any other. Never autoplays; audio loads only on tap.
const MUTE_KEY = 'bubz:muted';
const readMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
};
const writeMuted = (v: boolean) => {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* storage can be unavailable (private mode, in-app browsers) */
  }
};

export function initPlayer() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.player__btn[data-src]');
  if (!buttons.length) return;

  const css = getComputedStyle(document.documentElement);
  const colors = { done: css.getPropertyValue('--bone').trim() || '#e8dfd0', todo: css.getPropertyValue('--ash').trim() || '#8a8580' };
  const audio = new Audio();
  audio.preload = 'none';
  audio.muted = readMuted();

  const peaks = new Map<string, number[]>();
  let current: HTMLButtonElement | null = null;
  let raf = 0;

  const wave = (b: HTMLButtonElement) => b.parentElement?.querySelector('canvas') ?? null;

  function draw(b: HTMLButtonElement) {
    const c = wave(b);
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const data = peaks.get(b.dataset.src ?? '') ?? new Array<number>(96).fill(0.12);
    const progress = b === current && audio.duration ? audio.currentTime / audio.duration : 0;
    const slot = w / data.length;
    data.forEach((p, i) => {
      const bar = Math.max(2, p * h);
      ctx.fillStyle = i / data.length < progress ? colors.done : colors.todo;
      ctx.fillRect(i * slot, (h - bar) / 2, Math.max(1, slot * 0.55), bar);
    });
  }

  function setPlaying(b: HTMLButtonElement, on: boolean) {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', `${on ? 'pause' : 'play'} ${b.dataset.label ?? 'snippet'}`);
  }

  function loop() {
    if (current) draw(current);
    raf = audio.paused ? 0 : requestAnimationFrame(loop);
  }

  // tiny precomputed peak files (see `npm run peaks`); no audio analysis in the browser
  async function loadPeaks(b: HTMLButtonElement) {
    const src = b.dataset.src ?? '';
    try {
      const res = await fetch(`${src}.peaks.json`, { credentials: 'omit' });
      const json: unknown = await res.json();
      if (Array.isArray(json) && json.length && json.every((n) => typeof n === 'number')) peaks.set(src, json as number[]);
    } catch {
      /* no peak file: flat bars */
    }
    draw(b);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        void loadPeaks(e.target as HTMLButtonElement);
      }
    },
    { rootMargin: '200px' },
  );

  buttons.forEach((b) => {
    io.observe(b);
    b.addEventListener('click', () => {
      if (current === b && !audio.paused) {
        audio.pause();
        return;
      }
      if (current !== b) {
        audio.pause();
        if (current) {
          setPlaying(current, false);
          draw(current);
        }
        const src = b.dataset.src ?? '';
        if (new URL(src, location.href).origin !== location.origin) return; // same-origin audio only
        current = b;
        audio.src = src;
      }
      audio.play().catch(() => setPlaying(b, false));
    });
  });

  audio.addEventListener('play', () => {
    if (current) setPlaying(current, true);
    if (!raf) raf = requestAnimationFrame(loop);
  });
  audio.addEventListener('pause', () => {
    if (current) {
      setPlaying(current, false);
      draw(current);
    }
  });
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    if (current) draw(current);
  });
  audio.addEventListener('error', () => {
    if (current) {
      setPlaying(current, false);
      current.title = 'snippet unavailable';
    }
  });
  window.addEventListener('resize', () => current && draw(current));

  // persistent mute control
  const mute = document.querySelector<HTMLButtonElement>('[data-mute]');
  if (mute) {
    const sync = () => {
      mute.setAttribute('aria-pressed', String(audio.muted));
      mute.textContent = audio.muted ? 'sound off' : 'sound on';
    };
    mute.hidden = false;
    sync();
    mute.addEventListener('click', () => {
      audio.muted = !audio.muted;
      writeMuted(audio.muted);
      sync();
    });
  }
}
