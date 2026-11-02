# d3ath_by_bubz — site

Static Astro site: hero, **On the table** (live countdowns), music, live, work with me, email list, privacy.
No backend. Everything editable lives in `src/content/site.yaml`.

## Run it locally

Needs Node 22.12+ (`nvm use` reads `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321 — edit styles/YAML and it hot-reloads
npm run build      # outputs dist/
npm run preview    # serve dist/ locally
```

Commit the `package-lock.json` that `npm install` creates.

## Where things are

| Want to change | Edit |
|---|---|
| Text, links, beats, countdown times, release, gallery, effect on/off | `src/content/site.yaml` |
| Colors, fonts | `src/styles/tokens.css` |
| Layout and sections | `src/styles/sections.css`, `src/components/` |
| Follow dropdown links | `socials:` in `site.yaml` (`group: social` or `stream`) |
| Sound packs section | `packs:` in `site.yaml` (`null` hides it; `items: []` shows only the Browse button) |
| Effects (embers, grain, glitch, helix...) | `src/fx/` + `src/styles/fx.css` |
| Behaviors (player, countdown, signup, claim it) | `src/scripts/` |
| Security headers | `public/_headers` |

Effects: set any to `false` under `fx:` in `site.yaml`, or delete the module. Nothing else depends on them.

## Replace the placeholders

Search `site.yaml` for `REPLACE_ME` and `sample: true`. The build prints a list of what is left.
Set the env var `STRICT=1` on Cloudflare once you are ready: builds then fail while any placeholder remains.

- **Painting:** save as `src/assets/painting.jpg` (or .png/.webp/.avif), 2560px wide or more. Astro makes AVIF/WebP at 800/1280/1920/2560. No file = built-in dark gradient.
- **Emblem:** replace `public/emblem.svg`, or put a transparent `.webp`/`.png` in `public/` and point `brand.emblem` at it. Favicon: `public/favicon.svg` (+ `apple-touch-icon.png`). Share image: `public/og.png` (1200x630).
- **Beats:** put the snippet in `public/audio/` (30s max, 128kbps MP3, voice tag, never full quality) and the cover in `public/covers/`, then add an entry to `onTheTable`. Run `npm run peaks` once per new audio file to generate its waveform (needs `ffmpeg`: `brew install ffmpeg`). Commit the `.peaks.json` files.
- **Delete** the sample WAVs, covers and sample entries before launch.
- `dropsAt` must include the timezone offset (`2026-11-20T18:00-05:00`; use `-04:00` before Nov 1 / after Mar 8 DST changes).
- **Status flow:** `open` (countdown) → `claimed` (stamp) or `released` (stamp + `releaseUrl`).
- **Live:** set `live.isLive: true` and `live.url`, or set `live.nextStream`. Both empty hides the section.

## Sound packs

Storefront URL = `links.soundPacks` (Browse button + footer). Featured packs = `packs.items` (cover, tag, price, link).
The small line under the hero buttons comes from `packs.teaser`. Use any storefront that gives each pack a public link.

## Scroll spiral (On the table)

`src/fx/helix.ts`. Cards sit on two strands that twist in opposite directions and cross at screen center.
Tune `MAX_TURN` (twist angle) and `PERSPECTIVE` at the top of that file; orbit radius is in `apply()`.
Switch off with `fx.helix: false` (cards go back to the plain grid). Off automatically for reduced motion.

## Email list (Kit)

1. Kit → Grow → Landing Pages & Forms → create an inline form → Embed → HTML.
2. Copy the form's `action` URL (`https://app.kit.com/forms/<id>/subscriptions`) into `signup.action`.
3. Turn on double opt-in (confirmation email) in Kit. The site's consent text already says this.

## Deploy: GitHub → Cloudflare Pages

1. Push to a **private** GitHub repo; protect `main`.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command `npm run build`, output directory `dist`, project name `d3athbybubz`.
   Node comes from `.nvmrc`; if the build uses an old Node, add env var `NODE_VERSION=22`.
4. Every pull request gets a preview link; `main` is production.
5. Custom domain later: Pages project → Custom domains. Then set env var `SITE_URL=https://yourdomain.com` (canonical URLs, sitemap, share tags).
6. Analytics: enable Web Analytics in Cloudflare, paste the token into `analytics.cloudflareToken`. Put UTM tags on your bio links (e.g. `?utm_source=instagram`).

## Security notes

- No secrets in the repo; the only third-party endpoint is Kit's public form URL (validated in the schema).
- `public/_headers` sets a strict CSP (own scripts only; Kit, Spotify, YouTube-nocookie and Cloudflare analytics allowlisted), no framing, nosniff, locked-down permissions.
- All URLs in `site.yaml` are validated (http/https only; no `javascript:`), and the page writes dynamic text with `textContent`, never `innerHTML`.
- Embeds load only after a tap, from an allowlist, sandboxed.
- If you add a new third-party script or embed, add its host to the CSP or it will be blocked.

## Before launch

- [ ] Placeholders gone (`STRICT=1` build passes)
- [ ] Handle `d3ath_by_bubz` verified on every platform; links filled in
- [ ] `/privacy` reviewed (it is a draft, not legal advice); `site.legalName` set
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95
- [ ] Real-device pass: iPhone Safari, Instagram + TikTok in-app browsers, Android Chrome, Samsung Internet, desktop Chrome/Safari/Firefox
- [ ] Countdown correct in two time zones and flips at zero; Claim it opens the prefilled email; copy-email works
- [ ] Signup works end to end (confirmation + unsubscribe)
- [ ] Share previews checked (Instagram, TikTok, iMessage, X)

## Troubleshooting

- **Build says `site.yaml is invalid`:** the message names the field. Fix it and rebuild.
- **Fonts look wrong:** confirm `@fontsource` packages installed (`npm install`).
- **Dev server cached an old schema:** restart `npm run dev`.
# site-testbed
# site-testbed
