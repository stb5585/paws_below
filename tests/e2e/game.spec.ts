import { expect, test } from '@playwright/test';

test('title, tutorial, and maze render without browser errors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'portrait-guard');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.stack ?? error.message));
  page.on('requestfailed', request => errors.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto('/');
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1000);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.height).toBeLessThanOrEqual(viewport!.height);
  const scaleX = box!.width / 1280;
  const scaleY = box!.height / 720;
  await page.mouse.click(box!.x + 640 * scaleX, box!.y + 290 * scaleY);
  await page.waitForTimeout(500);
  await page.mouse.click(box!.x + 640 * scaleX, box!.y + 625 * scaleY);
  await page.waitForTimeout(1200);

  await page.keyboard.press('b');
  const before = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { x: scene.player.x, y: scene.player.y };
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { x: scene.player.x, y: scene.player.y };
  });
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(.05);
  await page.keyboard.press('Space');
  await expect.poll(async () => page.evaluate(({ x, y }) => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return Math.hypot(scene.player.x - x, scene.player.y - y);
  }, after), { timeout: 7_000 }).toBeGreaterThan(.5);
  await page.keyboard.press('e');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.player.x = 15; scene.player.y = 11;
    scene.profile.fullBrightness = true;
    scene.updateVisibility();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('maze.png') });
  expect(errors).toEqual([]);
});

test('landscape touch layout accepts gameplay taps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true
  })));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  await page.touchscreen.tap(box!.x + box!.width * .5, box!.y + box!.height * .403);
  await page.waitForTimeout(1000);
  const touchControls = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return scene.touchUi.length;
  });
  expect(touchControls).toBeGreaterThan(0);
  await page.touchscreen.tap(box!.x + box!.width * .875, box!.y + box!.height * .79);
  await page.touchscreen.tap(box!.x + box!.width * .953, box!.y + box!.height * .91);
  await expect(canvas).toBeVisible();
});

test('web app manifest is installable and scoped for repository hosting', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./');
});

test('portrait touch devices receive a rotate prompt', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'portrait-guard');
  await page.goto('/');
  await expect(page.locator('#rotate-message')).toBeVisible();
  await expect(page.locator('#rotate-message')).toContainText('Turn your device sideways');
});
