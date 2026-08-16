import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

if (process.argv.length < 3) throw new Error('Usage: node scripts/audit-transparent-atlas.mjs IMAGE...');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const inputArg of process.argv.slice(2)) {
  const input = resolve(inputArg);
  const source = await readFile(input);
  const result = await page.evaluate(async dataUrl => {
    const image = new Image(); image.src = dataUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = { clear: 0, faint: 0, partial: 0, opaque: 0 };
    let visibleNeutralWhite = 0; let visiblePixels = 0; let transparentRgb = 0; const neutralColors = new Map();
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]; const green = pixels[index + 1]; const blue = pixels[index + 2]; const value = pixels[index + 3];
      if (value === 0) { alpha.clear++; if (red || green || blue) transparentRgb++; continue; }
      if (value <= 24) alpha.faint++; else if (value < 250) alpha.partial++; else alpha.opaque++;
      if (value > 24) {
        visiblePixels++;
        if (Math.max(red, green, blue) - Math.min(red, green, blue) < 18 && Math.min(red, green, blue) > 220) {
          visibleNeutralWhite++;
          const key = `${red},${green},${blue},${value}`; neutralColors.set(key, (neutralColors.get(key) ?? 0) + 1);
        }
      }
    }
    const commonNeutralColors = [...neutralColors.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8);
    const visited = new Uint8Array(canvas.width * canvas.height); const queue = new Int32Array(canvas.width * canvas.height); const neutralComponents = [];
    const isNeutral = pixelIndex => {
      const offset = pixelIndex * 4; const red = pixels[offset]; const green = pixels[offset + 1]; const blue = pixels[offset + 2];
      return pixels[offset + 3] > 24 && Math.min(red, green, blue) > 220 && Math.max(red, green, blue) - Math.min(red, green, blue) < 18;
    };
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || !isNeutral(start)) continue;
      let head = 0; let tail = 0; let count = 0; let sumX = 0; let sumY = 0; let minX = canvas.width; let minY = canvas.height; let maxX = 0; let maxY = 0;
      queue[tail++] = start; visited[start] = 1;
      while (head < tail) {
        const current = queue[head++]; const x = current % canvas.width; const y = Math.floor(current / canvas.width);
        count++; sumX += x; sumY += y; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        for (let offsetY = -1; offsetY <= 1; offsetY++) for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (!offsetX && !offsetY) continue; const nextX = x + offsetX; const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= canvas.width || nextY >= canvas.height) continue;
          const next = nextY * canvas.width + nextX;
          if (!visited[next] && isNeutral(next)) { visited[next] = 1; queue[tail++] = next; }
        }
      }
      if (count >= 30) neutralComponents.push({ count, center: [Math.round(sumX / count), Math.round(sumY / count)], bounds: [minX, minY, maxX, maxY] });
    }
    neutralComponents.sort((left, right) => right.count - left.count);
    return { width: canvas.width, height: canvas.height, alpha, visibleNeutralWhite, visiblePixels, transparentRgb, commonNeutralColors, neutralComponents: neutralComponents.slice(0, 20) };
  }, `data:image/png;base64,${source.toString('base64')}`);
  process.stdout.write(`${basename(input)} ${JSON.stringify(result)}\n`);
}

await browser.close();
