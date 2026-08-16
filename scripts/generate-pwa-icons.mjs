import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const source = await readFile(new URL('../public/assets/paws-icon-v2-1024.png', import.meta.url));
const dataUrl = `data:image/png;base64,${source.toString('base64')}`;
const browser = await chromium.launch({ headless: true });

for (const size of [192, 512, 1024]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>*{margin:0}img{display:block;width:${size}px;height:${size}px}</style><img src="${dataUrl}" alt="">`);
  await page.locator('img').screenshot({
    path: new URL(`../public/assets/paws-icon-v2-${size}.png`, import.meta.url).pathname,
    animations: 'disabled'
  });
  await page.close();
}

await browser.close();
