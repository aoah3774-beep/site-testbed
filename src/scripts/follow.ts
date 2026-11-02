// Follow dropdown on top of <details>: opens on mouse hover (desktop) or tap/Enter; closes on Esc,
// outside click, focus leaving, or picking a link. Without JS the native <details> still works.
export function initFollow() {
  const d = document.querySelector<HTMLDetailsElement>('[data-follow]');
  const summary = d?.querySelector('summary');
  if (!d || !summary) return;

  let pinned = false; // opened by click/tap/Enter: stays open until dismissed
  let hovered = false; // opened by hover
  let timer = 0;
  const set = (open: boolean) => {
    d.open = open;
    if (!open) pinned = hovered = false;
  };

  summary.addEventListener('click', (e) => {
    e.preventDefault();
    if (d.open && hovered && !pinned) pinned = true; // clicking a hover-opened menu pins it
    else {
      set(!d.open);
      pinned = d.open;
    }
  });

  d.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(timer);
    if (!d.open) {
      d.open = true;
      hovered = true;
    }
  });
  d.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse' || pinned) return;
    timer = window.setTimeout(() => set(false), 250);
  });

  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && d.open) {
      set(false);
      summary.focus();
    }
  });
  d.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.follow__menu a')) set(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (d.open && !d.contains(e.target as Node)) set(false);
  });
  document.addEventListener('focusin', (e) => {
    if (d.open && !d.contains(e.target as Node)) set(false);
  });
}
