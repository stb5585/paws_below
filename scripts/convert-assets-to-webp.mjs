import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { chromium } from '@playwright/test';

const assetNames = process.argv.slice(2);
if (!assetNames.length) {
  console.error('Usage: node scripts/convert-assets-to-webp.mjs ASSET.png [...]');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const assetName of assetNames) {
  if (extname(assetName).toLowerCase() !== '.png') throw new Error(`Expected a PNG input: ${assetName}`);
  const inputUrl = new URL(`../public/assets/${assetName}`, import.meta.url);
  const bytes = await readFile(inputUrl);
  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  const webpDataUrl = await page.evaluate(async source => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', .92);
  }, dataUrl);
  const outputName = assetName.replace(/\.png$/i, '.webp');
  await writeFile(new URL(`../public/assets/${outputName}`, import.meta.url), Buffer.from(webpDataUrl.split(',')[1], 'base64'));
  console.log(`${basename(assetName)} -> ${outputName}`);
}

await browser.close();
