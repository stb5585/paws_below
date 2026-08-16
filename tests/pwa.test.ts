import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('installable web app files', () => {
  it('declares a standalone landscape manifest with an app icon', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.start_url).toBe('./');
    expect(manifest.icons.some((icon: { sizes: string; src: string }) => icon.sizes === '192x192' && icon.src.includes('paws-icon-v2'))).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string; src: string }) => icon.sizes === '512x512' && icon.src.includes('paws-icon-v2'))).toBe(true);
  });

  it('ships an offline service worker and a GitHub Pages workflow', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain("self.addEventListener('fetch'");
    expect(worker).toContain('pip-animations-v3.png');
    expect(worker).toContain('bunny-animations-v3.png');
    expect(worker).toContain('rabbit-atlas-v3.png');
    expect(worker).toContain('burrow-atlas-v4.png');
    expect(worker).toContain('farm-atlas-v3.png');
    expect(worker).toContain('farm-treasures-v3.png');
    expect(worker).toContain('household-treasures-v4.png');
    const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });
});
