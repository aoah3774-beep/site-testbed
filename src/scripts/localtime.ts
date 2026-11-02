export function initLocalTime() {
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  document.querySelectorAll<HTMLTimeElement>('time[data-local]').forEach((t) => {
    const d = new Date(t.dateTime);
    if (!Number.isNaN(d.getTime())) t.textContent = fmt.format(d).toLowerCase();
  });
  // hide a "next stream" section once its time has passed
  document.querySelectorAll<HTMLElement>('[data-until]').forEach((el) => {
    if (Date.parse(el.dataset.until ?? '') < Date.now()) {
      el.hidden = true;
      document.querySelector<HTMLElement>(`.dots a[href="#${el.id}"]`)?.setAttribute('hidden', '');
    }
  });
}
