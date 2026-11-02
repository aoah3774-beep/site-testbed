// Generates waveform peak data once per audio file: public/audio/<file>.peaks.json
// Needs ffmpeg on your PATH (macOS: brew install ffmpeg). Run: npm run peaks
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/audio';
const BARS = 96;
const files = readdirSync(DIR).filter((f) => /^[\w.-]+\.(mp3|wav|m4a|ogg)$/i.test(f));

if (!files.length) console.log(`No audio files in ${DIR}.`);

for (const f of files) {
  // execFileSync with an args array: no shell, so file names can't inject commands.
  const pcm = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', join(DIR, f), '-ac', '1', '-ar', '8000', '-f', 's16le', '-'],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const step = Math.max(1, Math.floor(samples.length / BARS));
  const peaks = [];
  for (let b = 0; b < BARS; b++) {
    let max = 0;
    for (let i = b * step; i < Math.min(samples.length, (b + 1) * step); i++) max = Math.max(max, Math.abs(samples[i]));
    peaks.push(max / 32768);
  }
  const top = Math.max(...peaks, 0.001);
  writeFileSync(join(DIR, `${f}.peaks.json`), JSON.stringify(peaks.map((p) => Math.round((p / top) * 100) / 100)));
  console.log(`peaks: ${f}`);
}
