// "Claim it" and the work-with-me buttons open one shared dialog: prefilled email, copy email, Instagram DM.
// Without JS (or without <dialog>) the buttons are plain mailto: links.
export function initInquiry() {
  const dlg = document.querySelector<HTMLDialogElement>('#inquiry');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const mail = dlg.querySelector<HTMLAnchorElement>('[data-inquiry-mail]');
  const subj = dlg.querySelector<HTMLElement>('[data-inquiry-subject]');
  const copy = dlg.querySelector<HTMLButtonElement>('[data-inquiry-copy]');
  const code = dlg.querySelector<HTMLElement>('[data-inquiry-email]');
  const email = copy?.dataset.email ?? '';
  if (!mail || !subj || !copy || !code || !email) return;

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-inquiry]');
    if (!a) return;
    e.preventDefault();
    const subject = a.dataset.subject ?? 'hello';
    mail.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(a.dataset.body ?? '')}`;
    subj.textContent = `subject: ${subject}`;
    copy.textContent = 'Copy email';
    dlg.showModal();
  });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close(); // backdrop click
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
