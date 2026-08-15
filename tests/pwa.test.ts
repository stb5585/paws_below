import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('installable web app files', () => {
  it('declares a standalone landscape manifest with an app icon', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.start_url).toBe('./');
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
  });

  it('ships an offline service worker and a GitHub Pages workflow', () => {
    expect(readFileSync('public/sw.js', 'utf8')).toContain("self.addEventListener('fetch'");
    const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });
});
