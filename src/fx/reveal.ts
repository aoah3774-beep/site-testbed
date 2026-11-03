// Sections below the fold fade in on entry; the thorn vines ([data-grow]) draw themselves once they are mostly
// on screen. The hiding classes are added by JS, so no-JS stays fully visible.
export default function init() {
  const watch = (threshold: number) =>
    new IntersectionObserver(
      (entries, io) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { threshold },
    );

  const fade = watch(0.12);
  document.querySelectorAll<HTMLElement>('.section').forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: leave it alone
    el.classList.add('will-reveal');
    fade.observe(el);
  });

  const grow = watch(0.55);
  document.querySelectorAll<HTMLElement>('[data-grow]').forEach((el) => {
    el.classList.add('will-grow');
    grow.observe(el);
  });
}
