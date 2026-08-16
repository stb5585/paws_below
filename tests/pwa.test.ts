import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('installable web app files', () => {
  it('declares a standalone landscape manifest with an app icon', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.start_url).toBe('./');
    expect(manifest.icons.some((icon: { sizes: string; src: string }) => icon.sizes === '192x192' && icon.src.includes('paws-icon-192'))).toBe(true);
    expect(manifest.icons.some((icon: { sizes: string; src: string }) => icon.sizes === '512x512' && icon.src.includes('paws-icon-512'))).toBe(true);
  });

  it('ships an offline service worker and a GitHub Pages workflow', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain("self.addEventListener('fetch'");
    expect(worker).toContain('paws-below-shell');
    expect(worker).toContain('paws-below-runtime');
    expect(worker).toContain("event.request.mode === 'navigate'");
    expect(worker).toContain("caches.match('./index.html')");
    expect(worker).toContain('Response.error()');
    expect(worker).toContain('SKIP_WAITING');
    expect(worker).toContain('^paws-below-v\\d+$');
    expect(worker).not.toContain("'./assets/farm-atlas.webp'");
    expect(worker).not.toContain("'./assets/burrow-atlas.webp'");
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('id="update-message"');
    expect(html).toContain('id="update-button"');
    const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });
});
