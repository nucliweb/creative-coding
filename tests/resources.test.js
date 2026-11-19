import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESOURCES, ALTERNATIVES, CONFIG } from '../src/config.js';

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

describe('alternatives', () => {
  const tools = ALTERNATIVES.flatMap((g) => g.items);

  it('lists every alternative from the slide with its link in the README', () => {
    for (const t of tools) expect(readme).toContain(`[${t.name}](${t.url})`);
  });

  it('credits awesome-creative-coding as a resource', () => {
    expect(RESOURCES.map((r) => r.url)).toContain('https://github.com/terkelg/awesome-creative-coding');
  });

  it('keeps the slide readable: four groups of four', () => {
    expect(ALTERNATIVES).toHaveLength(4);
    for (const g of ALTERNATIVES) expect(g.items).toHaveLength(4);
  });
});
