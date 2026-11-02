// Streaming embeds load only after a tap. Only allowlisted hosts are ever framed.
const ALLOWED = ['https://open.spotify.com/embed/', 'https://www.youtube-nocookie.com/embed/'];

export function initEmbeds() {
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('button[data-embed]');
    if (!btn) return;
    const src = btn.dataset.embed ?? '';
    if (!ALLOWED.some((p) => src.startsWith(p))) return;
    const f = document.createElement('iframe');
    f.src = src;
    f.className = 'embed';
    f.dataset.provider = btn.dataset.provider ?? '';
    f.title = 'streaming player';
    f.loading = 'lazy';
    f.allow = 'encrypted-media; picture-in-picture';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
    btn.replaceWith(f);
  });
}
