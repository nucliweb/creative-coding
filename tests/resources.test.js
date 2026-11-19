import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESOURCES, CONFIG } from '../src/config.js';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

describe('resources', () => {
  it('lists every slide resource with its link in the README', () => {
    for (const r of RESOURCES) expect(readme).toContain(`[${r.name}](${r.url})`);
  });

  it('uses https links', () => {
    for (const r of RESOURCES) expect(r.url).toMatch(/^https:\/\//);
  });

  it('points the closing QR to the README resources section', () => {
    expect(CONFIG.resourcesUrl).toBe(`${CONFIG.repoUrl}#resources`);
    expect(readme).toMatch(/^## Resources$/m);
  });
});
