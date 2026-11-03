// Simple monochrome service marks (24x24). Static, trusted strings, rendered by Mark.astro.
// .cut / .cutf are painted in the page background color (see base.css) so each mark follows currentColor.
export const marks = {
  spotify:
    '<circle cx="12" cy="12" r="11"/><path class="cut" fill="none" stroke-width="1.7" stroke-linecap="round" d="M5.6 9.1c4.2-1.2 8.9-.9 12.8 1.3M6.4 12.6c3.5-1 7.2-.7 10.4 1.1M7.2 15.9c2.8-.8 5.8-.5 8.4.9"/>',
  apple:
    '<rect x="1" y="1" width="22" height="22" rx="5.5"/><path class="cut" fill="none" stroke-width="1.6" stroke-linejoin="round" d="M10 16.8V8.2l6.4-1.6v8.5"/><circle class="cutf" cx="8.2" cy="17" r="1.9"/><circle class="cutf" cx="14.6" cy="15.4" r="1.9"/>',
  youtube:
    '<rect x="1" y="4.5" width="22" height="15" rx="4.5"/><path class="cutf" d="M10 9l5.6 3-5.6 3z"/>',
  twitch:
    '<path d="M3 2h18v12l-5 5h-4l-3 3v-3H3z"/><path class="cut" fill="none" stroke-width="1.8" stroke-linecap="round" d="M12 6.5v4.5M16.5 6.5v4.5"/>',
  instagram:
    '<rect x="1.5" y="1.5" width="21" height="21" rx="6"/><circle class="cut" cx="12" cy="12" r="4.6" fill="none" stroke-width="1.8"/><circle class="cutf" cx="17.7" cy="6.3" r="1.2"/>',
  tiktok:
    '<rect x="1" y="1" width="22" height="22" rx="5.5"/><path class="cut" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M13.2 6v8.4a2.7 2.7 0 1 1-2.7-2.7M13.2 6c.3 2.1 1.8 3.4 4 3.6"/>',
  x: '<rect x="1" y="1" width="22" height="22" rx="5.5"/><path class="cut" fill="none" stroke-width="1.8" stroke-linecap="round" d="M7 7l10 10M17 7L7 17"/>',
} as const;

export type MarkName = keyof typeof marks;
