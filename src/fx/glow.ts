// Soft ember glow that follows the mouse across a card (desktop only). CSS draws it from --mx / --my (fx.css).
export default function init() {
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const card = (e.target as Element).closest<HTMLElement>('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      card.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
    },
    { passive: true },
  );
}
