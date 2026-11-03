// "Claim it" and the work-with-me buttons open one shared dialog: prefilled email, copy email, Instagram DM.
// The dialog wipes open with staggered text and plays the same timeline in reverse to close (GSAP loads on first open;
// with reduced motion it just opens). Without JS (or without <dialog>) the buttons are plain mailto: links.
type Tl = ReturnType<typeof import('../fx/motion').gsap.timeline>;

export function initInquiry() {
  const dlg = document.querySelector<HTMLDialogElement>('#inquiry');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const mail = dlg.querySelector<HTMLAnchorElement>('[data-inquiry-mail]');
  const subj = dlg.querySelector<HTMLElement>('[data-inquiry-subject]');
  const copy = dlg.querySelector<HTMLButtonElement>('[data-inquiry-copy]');
  const code = dlg.querySelector<HTMLElement>('[data-inquiry-email]');
  const email = copy?.dataset.email ?? '';
  if (!mail || !subj || !copy || !code || !email) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let tl: Tl | null = null;
  let closing = false;

  const build = async () => {
    const { gsap } = await import('../fx/motion');
    tl = gsap
      .timeline({ paused: true })
      .fromTo(dlg, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8 })
      .from(dlg.querySelectorAll('form > *'), { opacity: 0, y: 10, duration: 0.7, stagger: 0.06 }, 0.2);
  };
  const open = async () => {
    if (!tl && !reduced.matches) await build().catch(() => {});
    dlg.showModal();
    if (!tl) return;
    if (reduced.matches) tl.progress(1);
    else tl.timeScale(1).play(0);
  };
  const close = () => {
    if (!dlg.open || closing) return;
    if (!tl || reduced.matches) return dlg.close();
    closing = true;
    tl.eventCallback('onReverseComplete', () => {
      closing = false;
      dlg.close();
    });
    tl.timeScale(1.6).reverse();
  };

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-inquiry]');
    if (!a) return;
    e.preventDefault();
    const subject = a.dataset.subject ?? 'hello';
    mail.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(a.dataset.body ?? '')}`;
    subj.textContent = `subject: ${subject}`;
    copy.textContent = 'Copy email';
    void open();
  });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close(); // backdrop click
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault(); // Esc: close through the reverse wipe
    close();
  });
  dlg.addEventListener('submit', (e) => {
    e.preventDefault(); // the Close button
    close();
  });

  // in-app browsers handle mailto: and the clipboard API unreliably, so the email is also shown as selectable text
  copy.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    copy.textContent = ok ? 'Copied' : 'Press and hold the email to copy';
  });
}
