import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputArg, outputArg, thresholdArg = '34'] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/extract-smooth-background.mjs INPUT OUTPUT [EDGE_THRESHOLD]');
const threshold = Number(thresholdArg);
const source = await readFile(resolve(inputArg));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async ({ dataUrl, threshold }) => {
  const image = new Image(); image.src = dataUrl; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height); const pixels = imageData.data;
  const width = canvas.width; const height = canvas.height; const visited = new Uint8Array(width * height); const queue = new Int32Array(width * height);
  let head = 0; let tail = 0;
  const seed = index => { if (!visited[index]) { visited[index] = 1; queue[tail++] = index; } };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  const difference = (left, right) => {
    const leftOffset = left * 4; const rightOffset = right * 4;
    return Math.max(
      Math.abs(pixels[leftOffset] - pixels[rightOffset]),
      Math.abs(pixels[leftOffset + 1] - pixels[rightOffset + 1]),
      Math.abs(pixels[leftOffset + 2] - pixels[rightOffset + 2])
    );
  };
  while (head < tail) {
    const current = queue[head++]; const x = current % width; const y = Math.floor(current / width);
    for (const [offsetX, offsetY] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nextX = x + offsetX; const nextY = y + offsetY;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      const next = nextY * width + nextX;
      if (!visited[next] && difference(current, next) <= threshold) { visited[next] = 1; queue[tail++] = next; }
    }
  }
  let cleared = 0;
  for (let index = 0; index < visited.length; index++) if (visited[index]) {
    const offset = index * 4; pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0; pixels[offset + 3] = 0; cleared++;
  }
  context.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), cleared, width, height };
}, { dataUrl: `data:image/png;base64,${source.toString('base64')}`, threshold });
await browser.close();
await writeFile(resolve(outputArg), Buffer.from(result.dataUrl.split(',')[1], 'base64'));
process.stdout.write(`${resolve(outputArg)}: cleared ${result.cleared} smooth backdrop pixels from ${result.width}x${result.height}\n`);
