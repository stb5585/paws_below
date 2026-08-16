import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputArg, outputArg, columnsArg = '4', rowsArg = '4', frameGuardArg = '20'] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  throw new Error('Usage: node scripts/clean-generated-atlas.mjs INPUT OUTPUT [COLUMNS] [ROWS]');
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const columns = Number(columnsArg);
const rows = Number(rowsArg);
const requestedFrameGuard = Number(frameGuardArg);
const source = await readFile(input);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const result = await page.evaluate(async ({ dataUrl, columns, rows, requestedFrameGuard }) => {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const { width, height } = sourceCanvas;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackdrop = (index) => {
    const offset = index * 4;
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const high = Math.max(red, green, blue);
    const low = Math.min(red, green, blue);
    return low >= 228 && high - low <= 8;
  };
  const enqueue = (index) => {
    if (visited[index] || !isBackdrop(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  const touchesCleared = (index, radius) => {
    const x = index % width;
    const y = Math.floor(index / width);
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const nextX = x + offsetX;
        const nextY = y + offsetY;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
        if (visited[nextY * width + nextX]) return true;
      }
    }
    return false;
  };
  for (let index = 0; index < visited.length; index += 1) {
    const alphaIndex = index * 4 + 3;
    if (visited[index]) pixels.data[alphaIndex] = 0;
    else if (touchesCleared(index, 1)) pixels.data[alphaIndex] = Math.min(pixels.data[alphaIndex], 110);
    else if (touchesCleared(index, 2)) pixels.data[alphaIndex] = Math.min(pixels.data[alphaIndex], 205);
  }
  const alphaSnapshot = new Uint8ClampedArray(pixels.data);
  for (let index = 0; index < visited.length; index += 1) {
    const alphaIndex = index * 4 + 3;
    if (pixels.data[alphaIndex] === 0) {
      pixels.data[index * 4] = 0; pixels.data[index * 4 + 1] = 0; pixels.data[index * 4 + 2] = 0;
      continue;
    }
    if (pixels.data[alphaIndex] >= 250) continue;
    const x = index % width; const y = Math.floor(index / width);
    let colorSource = -1;
    for (let radius = 1; radius <= 4 && colorSource < 0; radius += 1) {
      for (let offsetY = -radius; offsetY <= radius && colorSource < 0; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const nextX = x + offsetX; const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (alphaSnapshot[next * 4 + 3] >= 250 && !isBackdrop(next)) { colorSource = next; break; }
        }
      }
    }
    if (colorSource < 0) { pixels.data[alphaIndex] = 0; continue; }
    pixels.data[index * 4] = alphaSnapshot[colorSource * 4];
    pixels.data[index * 4 + 1] = alphaSnapshot[colorSource * 4 + 1];
    pixels.data[index * 4 + 2] = alphaSnapshot[colorSource * 4 + 2];
  }
  sourceContext.putImageData(pixels, 0, 0);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.ceil(width / columns) * columns;
  outputCanvas.height = Math.ceil(height / rows) * rows;
  const outputContext = outputCanvas.getContext('2d', { willReadFrequently: true });
  outputContext.drawImage(sourceCanvas, 0, 0);
  const cellWidth = outputCanvas.width / columns;
  const cellHeight = outputCanvas.height / rows;
  const frameGuard = requestedFrameGuard;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const left = column * cellWidth; const top = row * cellHeight;
    outputContext.clearRect(left, top, cellWidth, frameGuard);
    outputContext.clearRect(left, top + cellHeight - frameGuard, cellWidth, frameGuard);
    outputContext.clearRect(left, top, frameGuard, cellHeight);
    outputContext.clearRect(left + cellWidth - frameGuard, top, frameGuard, cellHeight);
  }
  const outputPixels = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data;
  const margins = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let minX = outputCanvas.width; let minY = outputCanvas.height; let maxX = -1; let maxY = -1;
      const left = column * cellWidth; const top = row * cellHeight;
      for (let y = top; y < top + cellHeight; y += 1) for (let x = left; x < left + cellWidth; x += 1) {
        if (outputPixels[(y * outputCanvas.width + x) * 4 + 3] <= 24) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      margins.push(Math.min(minX - left, minY - top, left + cellWidth - 1 - maxX, top + cellHeight - 1 - maxY));
    }
  }
  return {
    dataUrl: outputCanvas.toDataURL('image/png'),
    width: outputCanvas.width,
    height: outputCanvas.height,
    cleared: tail,
    margins,
  };
}, {
  dataUrl: `data:image/png;base64,${source.toString('base64')}`,
  columns,
  rows,
  requestedFrameGuard,
});
await browser.close();
await writeFile(output, Buffer.from(result.dataUrl.split(',')[1], 'base64'));
const minimumMargin = Math.min(...result.margins);
if (requestedFrameGuard > 0 && minimumMargin < 12) throw new Error(`Unsafe atlas frame margin: ${minimumMargin}px (${result.margins.join(', ')})`);
process.stdout.write(`${output}: ${result.width}x${result.height}, cleared ${result.cleared} backdrop pixels, minimum frame margin ${minimumMargin}px\n`);
