// Button labels scramble into place on hover/focus (desktop only). aria-label keeps the real name for screen readers.
const GLYPHS = '01#/|_<>+*=';
const running = new WeakSet<HTMLElement>();

function decode(el: HTMLElement, text: string) {
  if (running.has(el)) return;
  running.add(el);
  const start = performance.now();
  const duration = 420;
  const step = (now: number) => {
    const p = Math.min((now - start) / duration, 1);
    const resolved = Math.floor(p * text.length);
    el.textContent = [...text]
      .map((ch, i) => (ch === ' ' || i < resolved ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
      .join('');
    if (p < 1) requestAnimationFrame(step);
    else {
      el.textContent = text;
      running.delete(el);
    }
  };
  requestAnimationFrame(step);
}

export default function init() {
  document.querySelectorAll<HTMLElement>('[data-decode]').forEach((el) => {
    const text = el.textContent?.trim() ?? '';
    if (!text) return;
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
    el.addEventListener('pointerenter', () => decode(el, text));
    el.addEventListener('focus', () => decode(el, text));
  });
}
