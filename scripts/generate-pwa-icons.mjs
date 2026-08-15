import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/assets/paws-icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });

for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.locator('svg').screenshot({
    path: new URL(`../public/assets/paws-icon-${size}.png`, import.meta.url).pathname,
    animations: 'disabled'
  });
  await page.close();
}

await browser.close();
