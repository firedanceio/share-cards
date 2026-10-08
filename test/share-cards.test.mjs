import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PRESETS, findChrome, render } from '../bin/share-cards.mjs';

test('every preset keeps its safe area inside the canvas', () => {
  for (const [name, p] of Object.entries(PRESETS)) {
    assert.ok(p.safeW <= p.width && p.safeH <= p.height, name);
  }
});

test('unknown presets and missing templates are reported', () => {
  assert.throws(() => render({ template: 'examples/basic.html', out: 'x.png', preset: 'nope' }, { chrome: 'x' }), /Unknown preset/);
  assert.throws(() => render({ template: 'missing.html', out: 'x.png' }, { chrome: 'x' }), /Template not found/);
});

let chrome;
try { chrome = findChrome(); } catch { /* no browser on this machine */ }

test('renders a PNG at the preset size', { skip: !chrome && 'Chrome not installed' }, () => {
  const out = join(mkdtempSync(join(tmpdir(), 'share-cards-')), 'og.png');
  const r = render({ template: 'examples/basic.html', out, preset: 'x-header', params: { title: 'Test' } }, { chrome });
  assert.ok(existsSync(out));
  const png = readFileSync(out);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.equal(png.readUInt32BE(16), 1500);
  assert.equal(png.readUInt32BE(20), 500);
  assert.equal(r.width, 1500);
});
