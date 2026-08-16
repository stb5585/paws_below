import { expect, test } from '@playwright/test';

test('title, tutorial, and maze render without browser errors', async ({ page }, testInfo) => {
  test.skip(!['desktop-chromium', 'mobile-landscape'].includes(testInfo.project.name));
  test.slow(); // Software WebGL advances tweens slowly while rendering the full isometric maze.
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
  await page.screenshot({ path: testInfo.outputPath('title.png') });

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.height).toBeLessThanOrEqual(viewport!.height);
  const scaleX = box!.width / 1280;
  const scaleY = box!.height / 720;
  await page.mouse.click(box!.x + 640 * scaleX, box!.y + 290 * scaleY);
  await page.waitForTimeout(500);
  await page.mouse.click(box!.x + 390 * scaleX, box!.y + 530 * scaleY);
  await page.waitForTimeout(500);
  await page.mouse.click(box!.x + 390 * scaleX, box!.y + 535 * scaleY);
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
  const jumpStart = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.player.x = 6; scene.player.y = 4; scene.pickupFrom = { x: 6, y: 4 };
    return { x: scene.player.x, y: scene.player.y };
  });
  await page.keyboard.press('Space');
  await expect.poll(async () => page.evaluate(({ x, y }) => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return Math.hypot(scene.player.x - x, scene.player.y - y);
  }, jumpStart), { timeout: 15_000 }).toBeGreaterThan(.02);
  await expect.poll(async () => page.evaluate(() => !(window as any).__PAWS_GAME__.scene.getScene('Maze').busy), { timeout: 30_000 }).toBe(true);
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const emptyDig = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { busy: scene.busy, animation: scene.dogSprite.anims.currentAnim?.key, score: scene.run.score };
  });
  expect(emptyDig.busy).toBe(true);
  expect(emptyDig.animation).toBe('pip-dig');
  const afterEmptyDig = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const state = { busy: scene.busy, score: scene.run.score };
    scene.busy = false; // Avoid waiting for an 850ms game-time callback under software WebGL.
    return state;
  });
  expect(afterEmptyDig).toEqual({ busy: true, score: emptyDig.score });
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
    fullBrightness: true, tutorialSeen: true, touchControls: 'auto', touchMovement: 'follow',
    selectedAnimalId:'white-dog',selectedMapId:'underground',seenAnimals:['white-dog'],seenLevels:['white-dog:underground'],
    bestScores:{'white-dog':0,'cream-bunny':0}
  })));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  await page.touchscreen.tap(box!.x + box!.width * .5, box!.y + box!.height * .403);
  await page.waitForTimeout(400);
  const selectLayout = await page.evaluate(() => {
    const game = (window as any).__PAWS_GAME__;
    return { width: game.scale.gameSize.width, height: game.scale.gameSize.height };
  });
  await page.touchscreen.tap(box!.x + (selectLayout.width / 2 - 250) / selectLayout.width * box!.width, box!.y + 530 / selectLayout.height * box!.height);
  await page.waitForTimeout(350);
  await page.touchscreen.tap(box!.x + 390 / selectLayout.width * box!.width, box!.y + 535 / selectLayout.height * box!.height);
  await page.waitForTimeout(1000);
  const touchControls = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return scene.touchUi.length;
  });
  expect(touchControls).toBeGreaterThan(0);
  const before = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { x: scene.player.x, y: scene.player.y };
  });
  const session = await page.context().newCDPSession(page);
  const steerX = box!.x + box!.width * .67; const steerY = box!.y + box!.height * .52;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: steerX, y: steerY, id: 1 }] });
  await page.waitForTimeout(650);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { x: scene.player.x, y: scene.player.y };
  });
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(.05);
  const controls = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { width: scene.layout.width, height: scene.layout.height, safeX: scene.layout.safeX, safeY: scene.layout.safeY };
  });
  const gameToPage = (x: number, y: number) => ({ x: box!.x + x / controls.width * box!.width, y: box!.y + y / controls.height * box!.height });
  const jump = gameToPage(controls.safeX + 1120, controls.safeY + 570);
  const bark = gameToPage(controls.safeX + 1220, controls.safeY + 655);
  await page.touchscreen.tap(jump.x, jump.y);
  await page.touchscreen.tap(bark.x, bark.y);
  await expect(canvas).toBeVisible();
});

test('every gameplay atlas keeps visible pixels inside guarded frame cells', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const specs = [
    { asset: 'pip-animations-v3.png', columns: 4, rows: 4, minimum: 22 },
    { asset: 'bunny-animations-v3.png', columns: 4, rows: 4, minimum: 40 },
    { asset: 'farm-atlas-v3.png', columns: 4, rows: 4, minimum: 10, edgeToEdge: [0] },
    { asset: 'rabbit-atlas-v3.png', columns: 4, rows: 2, minimum: 14 },
    { asset: 'farm-treasures-v3.png', columns: 4, rows: 2, minimum: 14 },
    { asset: 'household-treasures-v4.png', columns: 4, rows: 2, minimum: 14 },
    { asset: 'burrow-atlas-v4.png', columns: 4, rows: 4, minimum: 10, edgeToEdge: [0, 2] }
  ];
  const results = await page.evaluate(async atlasSpecs => Promise.all(atlasSpecs.map(async spec => {
    const image = new Image(); image.src = `assets/${spec.asset}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const cellWidth = canvas.width / spec.columns; const cellHeight = canvas.height / spec.rows; const margins: number[] = [];
    for (let row = 0; row < spec.rows; row++) for (let column = 0; column < spec.columns; column++) {
      let minX = cellWidth; let minY = cellHeight; let maxX = -1; let maxY = -1;
      for (let y = 0; y < cellHeight; y++) for (let x = 0; x < cellWidth; x++) {
        const alpha = pixels[((row * cellHeight + y) * canvas.width + column * cellWidth + x) * 4 + 3];
        if (alpha <= 24) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      const frame = row * spec.columns + column;
      if (!spec.edgeToEdge?.includes(frame)) margins.push(Math.min(minX, minY, cellWidth - 1 - maxX, cellHeight - 1 - maxY));
    }
    return { asset: spec.asset, divisible: canvas.width % spec.columns === 0 && canvas.height % spec.rows === 0, minimum: Math.min(...margins) };
  })), specs);
  for (const spec of specs) {
    const result = results.find(candidate => candidate.asset === spec.asset)!;
    expect(result.divisible, spec.asset).toBe(true);
    expect(result.minimum, spec.asset).toBeGreaterThanOrEqual(spec.minimum);
  }
});

test('animal selection flows through map selection with corrected bunny artwork', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'off', touchMovement: 'follow',
    selectedAnimalId: 'white-dog', selectedMapId: 'underground', seenAnimals: ['white-dog', 'cream-bunny'],
    seenLevels: ['cream-bunny:underground'], bestScores: { 'white-dog': 0, 'cream-bunny': 0 }
  })));
  await page.goto('/');
  const atlas = await page.evaluate(async () => {
    const image = new Image();
    image.src = 'assets/bunny-animations-v3.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const cell = canvas.width / 4;
    const margins: number[] = [];
    let transparentPixels = 0;
    for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
      let minX = cell; let minY = cell; let maxX = -1; let maxY = -1;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const alpha = pixels[((row * cell + y) * canvas.width + column * cell + x) * 4 + 3];
        if (alpha <= 24) { transparentPixels++; continue; }
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      margins.push(Math.min(minX, minY, cell - 1 - maxX, cell - 1 - maxY));
    }
    return {
      width: canvas.width, height: canvas.height,
      minimumFrameMargin: Math.min(...margins),
      transparentRatio: transparentPixels / (canvas.width * canvas.height)
    };
  });
  expect(atlas).toEqual(expect.objectContaining({ width: 1280, height: 1280 }));
  expect(atlas.minimumFrameMargin).toBeGreaterThanOrEqual(40);
  expect(atlas.transparentRatio).toBeGreaterThan(.5);
  const canvas = page.locator('canvas'); const box = await canvas.boundingBox();
  await page.mouse.click(box!.x + box!.width * .5, box!.y + box!.height * .375);
  await page.waitForTimeout(300);
  await page.screenshot({path:testInfo.outputPath('animal-select.png')});
  await page.mouse.click(box!.x + box!.width * (890 / 1280), box!.y + box!.height * (530 / 720));
  await page.waitForTimeout(300);
  await page.mouse.click(box!.x + box!.width * (390 / 1280), box!.y + box!.height * (535 / 720));
  await page.waitForTimeout(900);
  const bunny = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { animal: scene.animal.id, goal: scene.level.goal.type, texture: scene.dogSprite.texture.key };
  });
  expect(bunny).toEqual({ animal: 'cream-bunny', goal: 'reachExit', texture: 'bunny-animations-v3' });
  await page.evaluate(() => {
    const sprite = (window as any).__PAWS_GAME__.scene.getScene('Maze').dogSprite;
    sprite.stop(); sprite.setFrame('bunny-10');
  });
  await page.waitForTimeout(100);
  await page.screenshot({path:testInfo.outputPath('bunny-jump-frame.png')});
});

test('Mochi is grounded in the refined farm collection quest', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'off', touchMovement: 'follow',
    selectedAnimalId: 'cream-bunny', selectedMapId: 'farm', seenAnimals: ['cream-bunny'],
    seenLevels: ['cream-bunny:farm'], bestScores: { 'white-dog': 0, 'cream-bunny': 0 }
  })));
  await page.goto('/');
  const canvas=page.locator('canvas');const box=await canvas.boundingBox();
  await page.mouse.click(box!.x+box!.width*.5,box!.y+box!.height*(270/720));
  await page.waitForTimeout(250);
  await page.mouse.click(box!.x+box!.width*(890/1280),box!.y+box!.height*(530/720));
  await page.waitForTimeout(250);
  await page.mouse.click(box!.x+box!.width*(890/1280),box!.y+box!.height*(535/720));
  await page.waitForTimeout(1100);
  const farm=await page.evaluate(()=>{const scene=(window as any).__PAWS_GAME__.scene.getScene('Maze');return{
    animal:scene.animal.id,map:scene.world.id,theme:scene.world.theme,goal:scene.level.goal.type,digSpots:scene.digViews.length,
    collectibles:scene.collectibleViews.length
  };});
  expect(farm).toEqual({animal:'cream-bunny',map:'farm',theme:'farm',goal:'collectThenReachExit',digSpots:4,collectibles:36});
  await page.screenshot({path:testInfo.outputPath('farm-map.png')});
});

test('canvas expands across common landscape and tablet aspect ratios', async ({ page }, testInfo) => {
  test.skip(!['wide-19-5', 'wide-20-9', 'tablet-4-3'].includes(testInfo.project.name));
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(box!.width - viewport.width)).toBeLessThan(2);
  expect(Math.abs(box!.height - viewport.height)).toBeLessThan(2);
  const size = await page.evaluate(() => {
    const game = (window as any).__PAWS_GAME__;
    return { width: game.scale.gameSize.width, height: game.scale.gameSize.height };
  });
  if (testInfo.project.name === 'tablet-4-3') {
    expect(size.width).toBe(1280); expect(size.height).toBeGreaterThan(720);
  } else {
    expect(size.width).toBeGreaterThan(1280); expect(size.height).toBe(720);
  }
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
