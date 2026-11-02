// Posts to the email provider's hosted form endpoint (Kit). No backend, no secrets.
// Without JS the form still works as a normal POST to the provider.
export function initSignup() {
  document.querySelectorAll<HTMLFormElement>('form[data-signup]').forEach((form) => {
    const status = form.querySelector<HTMLElement>('[data-status]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const action = form.getAttribute('action') ?? '';
    if (!status || !button || !/^https:\/\/app\.(kit|convertkit)\.com\//.test(action)) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      button.disabled = true;
      status.textContent = 'sending...';
      try {
        const res = await fetch(action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout?.(10_000),
        });
        const json: { status?: string } = await res.json();
        if (!res.ok || json.status !== 'success') throw new Error('rejected');
        form.reset();
        status.textContent = 'check your inbox to confirm.';
      } catch {
        status.textContent = "didn't go through. check the address and try again.";
      } finally {
        button.disabled = false;
      }
    });
  });
}
