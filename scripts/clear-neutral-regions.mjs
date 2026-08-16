import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputArg, outputArg, ...seedArgs] = process.argv.slice(2);
if (!inputArg || !outputArg || !seedArgs.length) {
  throw new Error('Usage: node scripts/clear-neutral-regions.mjs INPUT OUTPUT X,Y...');
}
const source = await readFile(resolve(inputArg));
const seeds = seedArgs.map(value => value.split(',').map(Number));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async ({ dataUrl, seeds }) => {
  const image = new Image(); image.src = dataUrl; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height); const pixels = imageData.data;
  const visited = new Uint8Array(canvas.width * canvas.height); const queue = new Int32Array(canvas.width * canvas.height);
  const neutral = index => {
    const offset = index * 4; const red = pixels[offset]; const green = pixels[offset + 1]; const blue = pixels[offset + 2];
    return pixels[offset + 3] > 24 && Math.min(red, green, blue) > 212 && Math.max(red, green, blue) - Math.min(red, green, blue) < 30;
  };
  let cleared = 0;
  for (const [seedX, seedY] of seeds) {
    const start = Math.round(seedY) * canvas.width + Math.round(seedX);
    if (!neutral(start)) continue;
    let head = 0; let tail = 0; queue[tail++] = start; visited[start] = 1;
    while (head < tail) {
      const index = queue[head++]; const x = index % canvas.width; const y = Math.floor(index / canvas.width);
      pixels[index * 4 + 3] = 0; pixels[index * 4] = 0; pixels[index * 4 + 1] = 0; pixels[index * 4 + 2] = 0; cleared++;
      for (let offsetY = -1; offsetY <= 1; offsetY++) for (let offsetX = -1; offsetX <= 1; offsetX++) {
        if (!offsetX && !offsetY) continue;
        const nextX = x + offsetX; const nextY = y + offsetY;
        if (nextX < 0 || nextY < 0 || nextX >= canvas.width || nextY >= canvas.height) continue;
        const next = nextY * canvas.width + nextX;
        if (!visited[next] && neutral(next)) { visited[next] = 1; queue[tail++] = next; }
      }
    }
  }
  context.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), cleared, width: canvas.width, height: canvas.height };
}, { dataUrl: `data:image/png;base64,${source.toString('base64')}`, seeds });
await browser.close();
await writeFile(resolve(outputArg), Buffer.from(result.dataUrl.split(',')[1], 'base64'));
process.stdout.write(`${resolve(outputArg)}: cleared ${result.cleared} pixels from ${result.width}x${result.height}\n`);
