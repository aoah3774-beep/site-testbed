import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '../content/site.yaml?raw';

/* ---------- field types ---------- */

const isHttpUrl = (s: string) => {
  try {
    const { protocol } = new URL(s);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

/** Full http(s) URL. Blocks javascript:, data:, etc. */
const url = z.string().refine(isHttpUrl, 'must be a full http(s) URL');
const optUrl = z.union([z.literal(''), url]);
/** Path to a file inside /public, e.g. /covers/x.svg */
const asset = z
  .string()
  .regex(/^\/(?!\/)[\w\-./]+$/, 'must be a path inside public/, starting with /')
  .refine((s) => !s.includes('..'), 'must not contain ..');
/** ISO timestamp WITH a timezone offset, e.g. 2026-11-20T18:00-05:00 */
const when = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/, 'use 2026-11-20T18:00-05:00 (needs the timezone offset)')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'not a real date');
const optWhen = z.union([z.literal(''), when]);
const handle = z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'letters, numbers, . and _ only');
const label = z.string().min(1).max(60);
const social = z.strictObject({ label, url, group: z.enum(['social', 'stream']) });

/* ---------- schema ---------- */

const schema = z.strictObject({
  brand: z.strictObject({
    name: label,
    handle: label,
    imprint: label,
    tagline: z.string().max(140),
    emblem: asset,
  }),
  site: z.strictObject({
    description: z.string().max(200),
    legalName: z.string().min(1),
    timeZone: z.string().min(1), // IANA zone used for the no-JS time fallback
  }),
  links: z.strictObject({ spotify: url, appleMusic: url, soundPacks: url }),
  socials: z
    .array(social)
    .refine(
      (list) => ['youtube', 'twitch'].every((l) => list.some((s) => s.label.toLowerCase() === l)),
      'must include entries labelled YouTube and Twitch (the music orb uses them)',
    ),
  contact: z.strictObject({ email: z.email(), instagram: handle }),
  signup: z.strictObject({
    action: z
      .string()
      .refine(
        (s) => /^https:\/\/app\.(kit|convertkit)\.com\/forms\/[\w-]+\/subscriptions$/.test(s),
        'must look like https://app.kit.com/forms/<id>/subscriptions',
      ),
  }),
  analytics: z.strictObject({ cloudflareToken: z.string().regex(/^[a-f0-9]{32}$|^$/, '32 hex characters, or empty') }),
  fx: z.strictObject({
    embers: z.boolean(),
    grain: z.boolean(),
    glitch: z.boolean(),
    reveal: z.boolean(),
    decode: z.boolean(),
    cursor: z.boolean(),
    parallax: z.boolean(),
    orb: z.boolean(),
    helix: z.boolean(),
    glow: z.boolean(),
  }),
  live: z.strictObject({ isLive: z.boolean(), url: optUrl, nextStream: optWhen }),
  onTheTable: z.array(
    z.strictObject({
      title: label,
      cover: asset,
      snippet: asset,
      meta: z.string().max(40).default(''), // e.g. "140 bpm / f min"
      dropsAt: when,
      status: z.enum(['open', 'claimed', 'released']),
      releaseUrl: optUrl.default(''),
      sample: z.boolean().default(false),
    }),
  ),
  packs: z
    .strictObject({
      title: label,
      teaser: z.string().max(60), // small line under the hero buttons; '' hides it
      blurb: z.string().max(140),
      items: z.array(
        z.strictObject({
          title: label,
          cover: asset,
          tag: z.string().max(30).default(''),
          price: z.string().max(20).default(''),
          url,
          sample: z.boolean().default(false),
        }),
      ),
    })
    .nullable(),
});

export type Site = z.infer<typeof schema>;
export type Beat = Site['onTheTable'][number];

/* ---------- load + validate (a bad edit fails the build with a readable error) ---------- */

function load(): Site {
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`\n\nsite.yaml is invalid:\n${lines.join('\n')}\n`);
  }
  return result.data;
}

export const site = load();

/* ---------- placeholder guard ---------- */

function findPlaceholders(node: unknown, path: string, out: string[]) {
  if (typeof node === 'string') {
    const google = isHttpUrl(node) && new URL(node).hostname.endsWith('google.com');
    if (node.includes('REPLACE_ME') || google) out.push(path);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => findPlaceholders(v, `${path}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.sample === true) out.push(`${path} (sample entry)`);
    for (const [k, v] of Object.entries(obj)) findPlaceholders(v, path ? `${path}.${k}` : k, out);
  }
}

if (import.meta.env.PROD) {
  const found: string[] = [];
  findPlaceholders(site, '', found);
  if (found.length) {
    const msg = `site.yaml still has ${found.length} placeholder(s):\n${found.map((p) => `  - ${p}`).join('\n')}`;
    if (process.env.STRICT === '1') throw new Error(`\n\n${msg}\n(STRICT=1 blocks the build until these are replaced)\n`);
    console.warn(`\n[placeholders] ${msg}\n`);
  }
}

/* ---------- helpers ---------- */

export const mailto = (subject: string, body = '') =>
  `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const igDm = `https://ig.me/m/${site.contact.instagram}`;

/** "nov 20, 18:00 est" in the site's timezone: the no-JS fallback. JS swaps in the visitor's local time. */
export const fmtFallback = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: site.site.timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })
    .format(new Date(iso))
    .toLowerCase();
