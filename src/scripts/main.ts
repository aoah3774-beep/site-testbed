// Single client entry. Behaviors are tiny and always on; effects load after first paint.
import { initLocalTime } from './localtime';
import { initPlayer } from './player';
import { initCountdown } from './countdown';
import { initInquiry } from './inquiry';
import { initSignup } from './signup';
import { initEmbeds } from './embed';
import { initNav } from './nav';
import { initFollow } from './follow';

initLocalTime();
initPlayer();
initCountdown();
initInquiry();
initSignup();
initEmbeds();
initNav();
initFollow();

const flags = new Set((document.documentElement.dataset.fx ?? '').split(' ').filter(Boolean));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

type Fx = () => Promise<{ default: () => void }>;
const effects: [string, boolean, Fx][] = [
  ['reveal', !reduced, () => import('../fx/reveal')],
  ['embers', !reduced, () => import('../fx/embers')],
  ['glitch', !reduced, () => import('../fx/glitch')],
  ['gallery3d', !reduced, () => import('../fx/gallery3d')],
  ['helix', !reduced, () => import('../fx/helix')],
  ['decode', !reduced && fine, () => import('../fx/decode')],
  ['cursor', !reduced && fine, () => import('../fx/cursor')],
  ['parallax', !reduced && fine, () => import('../fx/parallax')],
];

const run = () => {
  for (const [name, allowed, load] of effects) {
    if (flags.has(name) && allowed) load().then((m) => m.default()).catch(() => {}); // a broken effect never breaks the page
  }
};
// after first paint
if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
else setTimeout(run, 300);
