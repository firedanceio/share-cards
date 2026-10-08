#!/usr/bin/env node
// Copyright 2026 Firedance Multimedia LLC
// SPDX-License-Identifier: Apache-2.0
//
// share-cards: render an HTML template to PNG at social-media sizes with headless Chrome.
// Zero dependencies; needs Node 20+ and Chrome or Chromium.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Canvas size and the safe area that every platform shows uncropped. The template receives the
 * safe area as ?safeW=&safeH= and should keep text and logos inside it.
 */
export const PRESETS = {
  og: { width: 1200, height: 630, safeW: 1200, safeH: 630, note: 'Open Graph / link previews' },
  'x-header': { width: 1500, height: 500, safeW: 1200, safeH: 400, note: 'X profile header; avatar covers the lower left' },
  'youtube-banner': { width: 2560, height: 1440, safeW: 1546, safeH: 423, note: 'YouTube channel art; only the centre shows everywhere' },
  'linkedin-cover': { width: 1128, height: 191, safeW: 900, safeH: 170, note: 'LinkedIn page cover; logo covers the lower left' },
  'linkedin-banner': { width: 1584, height: 396, safeW: 1200, safeH: 330, note: 'LinkedIn personal profile background' },
  square: { width: 1080, height: 1080, safeW: 1080, safeH: 1080, note: 'Instagram / feed post' },
  portrait: { width: 1080, height: 1350, safeW: 1080, safeH: 1350, note: 'Instagram 4:5 post' },
  story: { width: 1080, height: 1920, safeW: 1080, safeH: 1420, note: 'Stories / Reels; top and bottom are covered by UI' },
  avatar: { width: 800, height: 800, safeW: 560, safeH: 560, note: 'Profile picture; keep the mark inside the circle' },
};

const CHROME_PATHS = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

export function findChrome() {
  const found = CHROME_PATHS.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome not found. Install Chrome or Chromium, or set CHROME=/path/to/chrome.');
  return found;
}

/**
 * Render one card.
 * @param {object} job
 * @param {string} job.template  Path to the HTML template.
 * @param {string} job.out       Output PNG path.
 * @param {string} [job.preset]  A key of PRESETS (default "og").
 * @param {number} [job.width]   Override the preset size.
 * @param {number} [job.height]
 * @param {Record<string,string>} [job.params]  Extra query parameters for the template.
 * @param {number} [job.waitMs]  Virtual time Chrome gives fonts and scripts (default 3000).
 */
export function render(job, { chrome = findChrome() } = {}) {
  const preset = PRESETS[job.preset ?? 'og'];
  if (!preset) throw new Error(`Unknown preset "${job.preset}". Known: ${Object.keys(PRESETS).join(', ')}`);
  const width = job.width ?? preset.width;
  const height = job.height ?? preset.height;
  const query = new URLSearchParams({
    width: String(width),
    height: String(height),
    safeW: String(Math.min(preset.safeW, width)),
    safeH: String(Math.min(preset.safeH, height)),
    ...job.params,
  });
  const template = resolve(job.template);
  if (!existsSync(template)) throw new Error(`Template not found: ${job.template}`);
  const out = resolve(job.out);
  mkdirSync(dirname(out), { recursive: true });
  const url = `${pathToFileURL(template).href}?${query}`;
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--default-background-color=00000000', `--virtual-time-budget=${job.waitMs ?? 3000}`,
    `--window-size=${width},${height}`, `--screenshot=${out}`, url,
  ], { stdio: 'ignore' });
  if (!existsSync(out)) throw new Error(`Chrome did not write ${job.out}`);
  return { out, width, height };
}

function parseArgs(argv) {
  const args = { params: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--preset' || a === '-p') args.preset = next();
    else if (a === '--out' || a === '-o') args.out = next();
    else if (a === '--width') args.width = Number(next());
    else if (a === '--height') args.height = Number(next());
    else if (a === '--wait') args.waitMs = Number(next());
    else if (a === '--set' || a === '-s') {
      const [k, ...v] = next().split('=');
      args.params[k] = v.join('=');
    } else if (a === '--help' || a === '-h') args.help = true;
    else rest.push(a);
  }
  return { args, rest };
}

const HELP = `share-cards: render an HTML template to PNG at social-media sizes

  share-cards render <template.html> -o card.png [-p og] [-s title="Hello"] [-s key=value]
  share-cards build <cards.json>      render every job in a JSON list
  share-cards presets                 list sizes and safe areas

The template gets ?width=&height=&safeW=&safeH= plus every -s key=value as query parameters.
Set CHROME=/path/to/chrome if Chrome isn't found.`;

async function main(argv) {
  const [command, ...tail] = argv;
  const { args, rest } = parseArgs(tail);
  if (!command || args.help || command === 'help') return console.log(HELP);

  if (command === 'presets') {
    for (const [name, p] of Object.entries(PRESETS)) {
      console.log(`${name.padEnd(16)} ${`${p.width}x${p.height}`.padEnd(10)} safe ${`${p.safeW}x${p.safeH}`.padEnd(10)} ${p.note}`);
    }
    return;
  }
  if (command === 'render') {
    if (!rest[0] || !args.out) throw new Error('Usage: share-cards render <template.html> -o card.png [-p preset]');
    const r = render({ template: rest[0], ...args });
    return console.log(`${r.out} (${r.width}x${r.height})`);
  }
  if (command === 'build') {
    if (!rest[0]) throw new Error('Usage: share-cards build <cards.json>');
    const file = resolve(rest[0]);
    const jobs = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(jobs)) throw new Error(`${rest[0]} must be a JSON array of jobs`);
    const chrome = findChrome();
    const base = dirname(file);
    for (const job of jobs) {
      const r = render({ ...job, template: resolve(base, job.template), out: resolve(base, job.out) }, { chrome });
      console.log(`${r.out} (${r.width}x${r.height})`);
    }
    return;
  }
  throw new Error(`Unknown command "${command}". Run share-cards --help.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`share-cards: ${e.message}`);
    process.exit(1);
  });
}
