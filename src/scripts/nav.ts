// Side dots (desktop): mark the section nearest the middle of the screen.
export function initNav() {
  const dots = document.querySelectorAll<HTMLAnchorElement>('.dots a');
  if (!dots.length) return;
  const byId = new Map<string, HTMLAnchorElement>();
  dots.forEach((a) => byId.set(a.hash.slice(1), a));

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        byId.forEach((a, id) => a.setAttribute('aria-current', String(id === e.target.id)));
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  byId.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}
