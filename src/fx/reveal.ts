// Scroll choreography. Below-the-fold sections: the title rises line by line out of a mask, the rest wipes in with a clip-path.
// Plus two slow drifts: the thorns (as the hero scrolls away) and the cover art inside its frame.
// Everything starts hidden only from this script, so no-JS stays fully visible. Nothing here touches layout.
import { gsap, SplitText } from './motion';

export default async function init() {
  const thorns = document.querySelector<SVGElement>('.thorns svg');
  if (thorns) {
    gsap.to(thorns, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  const covers = gsap.utils.toArray<HTMLElement>('.card__cover img');
  if (covers.length) {
    gsap.fromTo(
      covers,
      { yPercent: -5 },
      { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '#table', start: 'top bottom', end: 'bottom top', scrub: 0.6 } },
    );
  }

  await document.fonts.ready; // line breaks must be final before SplitText measures them
  document.querySelectorAll<HTMLElement>('.section').forEach((sec) => {
    if (sec.getBoundingClientRect().top < innerHeight) return; // already on screen: leave it alone
    const title = sec.querySelector<HTMLElement>(':scope > h2');
    const rest = Array.from(sec.querySelectorAll<HTMLElement>(':scope > :not(h2)'));
    const wipe = rest.filter((el) => !el.matches('.table')); // the cards have their own motion
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 80%', once: true } });
    if (title) {
      const split = SplitText.create(title, { type: 'lines', mask: 'lines' });
      tl.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.12, onComplete: () => split.revert() }, 0);
    }
    tl.from(wipe, { clipPath: 'inset(0 0 100% 0)', y: 18, opacity: 0, duration: 1.2, stagger: 0.08, clearProps: 'clipPath,transform,opacity' }, 0.15);
    rest.filter((el) => el.matches('.table')).forEach((el) => tl.from(el, { opacity: 0, duration: 1.2, clearProps: 'opacity' }, 0.15));
  });
}
