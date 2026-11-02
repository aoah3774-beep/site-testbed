// Sections below the fold fade in on entry. The hiding class is added by JS, so no-JS stays fully visible.
export default function init() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll<HTMLElement>('.section').forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: leave it alone
    el.classList.add('will-reveal');
    io.observe(el);
  });
}
