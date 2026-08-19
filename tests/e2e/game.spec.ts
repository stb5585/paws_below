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
  expect(Math.abs(box!.width - viewport!.width)).toBeLessThan(2);
  expect(Math.abs(box!.height - viewport!.height)).toBeLessThan(2);
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

test('pause actions clear when resuming or abandoning a run', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'off', touchMovement: 'follow',
    selectedAnimalId: 'white-dog', selectedMapId: 'underground', seenAnimals: ['white-dog'],
    seenLevels: ['white-dog:underground'], bestScores: { 'white-dog': 0, 'cream-bunny': 0 }
  })));
  const active = (scene: string) => page.evaluate(key => (window as any).__PAWS_GAME__.scene.isActive(key), scene);
  const enterMaze = async () => {
    await page.mouse.click(640, 270);
    await expect.poll(() => active('AnimalSelect')).toBe(true);
    await page.mouse.click(390, 530);
    await expect.poll(() => active('MapSelect')).toBe(true);
    await page.mouse.click(390, 535);
    await expect.poll(() => active('Maze'), { timeout: 30_000 }).toBe(true);
  };

  await page.goto('/');
  await expect.poll(() => active('Title')).toBe(true);
  await enterMaze();
  await page.evaluate(() => { (window as any).__PAWS_GAME__.scene.getScene('Maze').queued.pause = true; });
  await expect.poll(() => active('Pause')).toBe(true);
  await page.mouse.click(640, 155);
  await expect.poll(() => active('Pause')).toBe(false);
  await page.waitForTimeout(350);
  expect(await active('Maze')).toBe(true);
  expect(await page.evaluate(() => (window as any).__PAWS_GAME__.scene.getScene('Maze').queued.pause)).toBe(false);

  await page.evaluate(() => { (window as any).__PAWS_GAME__.scene.getScene('Maze').queued.pause = true; });
  await expect.poll(() => active('Pause')).toBe(true);
  await page.mouse.click(640, 545);
  await expect.poll(() => active('Title')).toBe(true);
  await enterMaze();
  await page.waitForTimeout(350);
  expect(await active('Pause')).toBe(false);
  expect(await active('Maze')).toBe(true);
});

test('every gameplay atlas keeps visible pixels inside guarded frame cells', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  const specs = [
    { asset: 'pip-animations.webp', columns: 4, rows: 4, minimum: 22 },
    { asset: 'bunny-animations.webp', columns: 4, rows: 4, minimum: 40 },
    { asset: 'farm-atlas.webp', columns: 4, rows: 4, minimum: 10, edgeToEdge: [0] },
    { asset: 'rabbit-atlas.webp', columns: 4, rows: 2, minimum: 14 },
    { asset: 'farm-treasures.webp', columns: 4, rows: 2, minimum: 14 },
    { asset: 'household-treasures.webp', columns: 4, rows: 2, minimum: 14 },
    { asset: 'burrow-atlas.webp', columns: 4, rows: 4, minimum: 10, edgeToEdge: [0, 2] }
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

test('isometric depth follows ground contact around a blocked tile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'off', touchMovement: 'follow',
    selectedAnimalId: 'white-dog', selectedMapId: 'underground', seenAnimals: ['white-dog'],
    seenLevels: ['white-dog:underground'], bestScores: { 'white-dog': 0, 'cream-bunny': 0 }
  })));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Title'))).toBe(true);
  await page.mouse.click(640, 270);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('AnimalSelect'))).toBe(true);
  await page.mouse.click(390, 530);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('MapSelect'))).toBe(true);
  await page.mouse.click(390, 535);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Maze')), { timeout: 30_000 }).toBe(true);

  const behind = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const walls = scene.tileViews.filter((view: any) => view.point.x === 4 && view.point.y === 3
      && view.object.texture?.key === 'burrow-atlas' && view.object.frame?.name === 'env-1');
    const connectedWall = scene.tileViews.find((view: any) => view.point.x === 4 && view.point.y === 4
      && view.object.texture?.key === 'burrow-atlas' && view.object.frame?.name === 'env-1');
    const floors = scene.tileViews.filter((view: any) => view.object.texture?.key === 'burrow-atlas'
      && view.object.frame?.name === 'env-0');
    scene.player.x = 3; scene.player.y = 3; scene.positionDog(0, false);
    scene.updateVisibility();
    scene.cameras.main.centerOn(scene.dog.x, scene.dog.y);
    return {
      actor: scene.dog.depth,
      wall: walls[0]?.object.depth,
      wallAlpha: walls[0]?.object.alpha,
      connectedWallAlpha: connectedWall?.object.alpha,
      wallGroup: walls[0]?.occlusionGroup,
      connectedWallGroup: connectedWall?.occlusionGroup,
      maximumFloorDepth: Math.max(...floors.map((view: any) => view.object.depth)),
      renderedBlockCells: walls.length
    };
  });
  expect(behind.renderedBlockCells).toBe(1);
  expect(behind.actor).toBeGreaterThan(behind.maximumFloorDepth);
  expect(behind.actor).toBeLessThan(behind.wall);
  expect(behind.wallAlpha).toBe(1);
  expect(behind.connectedWallAlpha).toBe(1);
  expect(behind.connectedWallGroup).toBe(behind.wallGroup);
  const wallOcclusion = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const group = scene.wallOcclusionGroups.find((candidate: any) => candidate.id === scene.tileViews.find((view: any) =>
      view.point.x === 4 && view.point.y === 3 && view.object.frame?.name === 'env-1').occlusionGroup);
    return {
      overlayVisible: scene.dogOcclusionSprite.visible,
      overlayDepth: scene.dogOcclusionSprite.depth,
      maximumGroupDepth: Math.max(...group.members.map((member: any) => member.object.depth)),
      membersVisible: group.members.every((member: any) => member.object.visible)
    };
  });
  expect(wallOcclusion.overlayVisible).toBe(true);
  expect(wallOcclusion.overlayDepth).toBeGreaterThan(wallOcclusion.maximumGroupDepth);
  expect(wallOcclusion.membersVisible).toBe(true);
  const undergroundFixture = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const images = scene.tileViews.filter((view: any) => view.object.texture);
    const crossings = images.filter((view: any) => view.object.texture.key === 'burrow-atlas' && view.object.frame.name === 'env-3');
    const floor = images.find((view: any) => view.object.texture.key === 'burrow-atlas' && view.object.originY < .6);
    const homes = scene.children.list.filter((object: any) => object.texture?.key === 'burrow-atlas' && object.frame?.name === 'env-4');
    return {
      crossings: crossings.length,
      expectedCrossings: new Set(scene.world.jumpPaths.flat()
        .filter((point: any) => scene.world.isObstacleCell(point.x, point.y))
        .map((point: any) => `${point.x},${point.y}`)).size,
      floorAnchorY: floor?.object.originY,
      wallAnchorY: images.find((view: any) => view.object.frame.name === 'env-1')?.object.originY,
      homes: homes.length
    };
  });
  expect(undergroundFixture).toEqual(expect.objectContaining({ crossings: 8, expectedCrossings: 8, homes: 1 }));
  expect(undergroundFixture.floorAnchorY).toBeCloseTo(.536, 3);
  expect(undergroundFixture.wallAnchorY).toBeCloseTo(.763, 3);
  await page.screenshot({ path: testInfo.outputPath('depth-behind-wall.png') });

  const inFront = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const wall = scene.tileViews.find((view: any) => view.point.x === 4 && view.point.y === 3
      && view.object.texture?.key === 'burrow-atlas' && view.object.frame?.name === 'env-1');
    scene.player.x = 5; scene.player.y = 4; scene.positionDog(0, false);
    scene.updateVisibility();
    scene.cameras.main.centerOn(scene.dog.x, scene.dog.y);
    return { actor: scene.dog.depth, wall: wall.object.depth, wallAlpha: wall.object.alpha, overlayVisible: scene.dogOcclusionSprite.visible };
  });
  expect(inFront.actor).toBeGreaterThan(inFront.wall);
  expect(inFront.wallAlpha).toBe(1);
  expect(inFront.overlayVisible).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('depth-in-front-wall.png') });
});

test('loads the title first and only fetches the selected world', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 0, collection: [], pirateBadge: false, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'off', touchMovement: 'follow',
    selectedAnimalId: 'white-dog', selectedMapId: 'farm', seenAnimals: ['white-dog'],
    seenLevels: ['white-dog:farm'], bestScores: { 'white-dog': 0, 'cream-bunny': 0 }
  })));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Title'))).toBe(true);
  const bootTextures = await page.evaluate(() => {
    const textures = (window as any).__PAWS_GAME__.textures;
    return {
      title: textures.exists('title-animals'), pip: textures.exists('pip-animations'),
      farm: textures.exists('farm-atlas'), burrow: textures.exists('burrow-atlas')
    };
  });
  expect(bootTextures).toEqual({ title: true, pip: false, farm: false, burrow: false });

  await page.mouse.click(640, 270);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('AnimalSelect'))).toBe(true);
  const selectionTextures = await page.evaluate(() => {
    const textures = (window as any).__PAWS_GAME__.textures;
    return { pip: textures.exists('pip-animations'), bunny: textures.exists('bunny-animations'), farm: textures.exists('farm-atlas'), burrow: textures.exists('burrow-atlas') };
  });
  expect(selectionTextures).toEqual({ pip: true, bunny: true, farm: false, burrow: false });

  await page.mouse.click(390, 530);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('MapSelect'))).toBe(true);
  await page.mouse.click(890, 535);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Maze')), { timeout: 30_000 }).toBe(true);
  const gameTextures = await page.evaluate(() => {
    const textures = (window as any).__PAWS_GAME__.textures;
    return { farm: textures.exists('farm-atlas'), farmTreasures: textures.exists('farm-treasures'), burrow: textures.exists('burrow-atlas') };
  });
  expect(gameTextures).toEqual({ farm: true, farmTreasures: true, burrow: false });
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
    image.src = 'assets/bunny-animations.webp';
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
  expect(bunny).toEqual({ animal: 'cream-bunny', goal: 'reachExit', texture: 'bunny-animations' });
  await page.evaluate(() => {
    const sprite = (window as any).__PAWS_GAME__.scene.getScene('Maze').dogSprite;
    sprite.stop(); sprite.setFrame('bunny-10');
  });
  await page.waitForTimeout(100);
  await page.screenshot({path:testInfo.outputPath('bunny-jump-frame.png')});
});

test('settings cancels or confirms a score-only reset without losing other progress', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.addInitScript(() => localStorage.setItem('paws-below-profile-v1', JSON.stringify({
    version: 1, bestScore: 900, collection: ['striped-sock'], pirateBadge: true, muted: true,
    fullBrightness: true, tutorialSeen: true, touchControls: 'on', touchMovement: 'joystick',
    selectedAnimalId: 'cream-bunny', selectedMapId: 'farm', seenAnimals: ['white-dog', 'cream-bunny'],
    seenLevels: ['white-dog:underground', 'cream-bunny:farm'],
    bestScores: { 'white-dog': 900, 'cream-bunny': 450 },
    appearance: { version: 1, animals: {
      'white-dog': { palette: 'warm-gold', extras: { collar: 'mint-stars' }, homeStyle: 'classic-doghouse' },
      'cream-bunny': { palette: 'natural-cream', extras: { collar: 'none' }, homeStyle: 'classic-pen' }
    } }
  })));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Title'))).toBe(true);
  await page.mouse.click(640, 495);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Settings'))).toBe(true);

  await page.mouse.click(640, 430);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paws-below-profile-v1')!).bestScore)).toBe(900);
  await page.screenshot({ path: testInfo.outputPath('settings-reset-confirmation.png') });
  await page.mouse.click(800, 430);
  expect(await page.evaluate(() => ({
    armed: (window as any).__PAWS_GAME__.scene.getScene('Settings').resetArmed,
    score: JSON.parse(localStorage.getItem('paws-below-profile-v1')!).bestScore
  }))).toEqual({ armed: false, score: 900 });

  await page.mouse.click(640, 430);
  await page.mouse.click(480, 430);
  const reset = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('paws-below-profile-v1')!);
    return {
      bestScore: profile.bestScore, bestScores: profile.bestScores, collection: profile.collection,
      pirateBadge: profile.pirateBadge, touchControls: profile.touchControls,
      touchMovement: profile.touchMovement, appearance: profile.appearance.animals['white-dog']
    };
  });
  expect(reset).toEqual({
    bestScore: 0, bestScores: { 'white-dog': 0, 'cream-bunny': 0 }, collection: ['striped-sock'],
    pirateBadge: true, touchControls: 'on', touchMovement: 'joystick',
    appearance: { palette: 'warm-gold', extras: { collar: 'mint-stars' }, homeStyle: 'classic-doghouse' }
  });
  await page.mouse.click(640, 620);
  await expect.poll(() => page.evaluate(() => (window as any).__PAWS_GAME__.scene.isActive('Title'))).toBe(true);
  const bestLabel = await page.evaluate(() => (window as any).__PAWS_GAME__.scene.getScene('Title').children.list
    .find((object: any) => typeof object.text === 'string' && object.text.startsWith('BEST SCORE'))?.text);
  expect(bestLabel).toBe('BEST SCORE  0');
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
  const farmFixture = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.player.x = 7; scene.player.y = 7; scene.positionDog(0, false);
    scene.cameras.main.centerOn(scene.dog.x, scene.dog.y);
    const images = scene.tileViews.filter((view: any) => view.object.texture?.key === 'farm-atlas');
    const crossingKeys = new Set(scene.world.jumpPaths.flat()
      .filter((point: any) => scene.world.isObstacleCell(point.x, point.y))
      .map((point: any) => `${point.x},${point.y}`));
    const crossings = images.filter((view: any) => crossingKeys.has(`${view.point.x},${view.point.y}`)
      && view.object.frame.name === 'farm-4');
    const fences = images.filter((view: any) => view.object.frame.name === 'farm-5');
    const blockCounts = scene.world.blocks.flatMap((block: any) => {
      const counts: number[] = [];
      for (let y=block.y;y<block.y+block.height;y++) for (let x=block.x;x<block.x+block.width;x++) {
        counts.push(images.filter((view: any) => view.point.x === x && view.point.y === y && view.object.frame.name === 'farm-1').length);
      }
      return counts;
    });
    return {
      crossings: crossings.length,
      expectedCrossings: crossingKeys.size,
      everyBlockOnce: blockCounts.every((count: number) => count === 1),
      grassAnchorY: images.find((view: any) => view.object.frame.name === 'farm-0')?.object.originY,
      barnCount: scene.children.list.filter((object: any) => object.texture?.key === 'farm-atlas' && object.frame?.name === 'farm-2').length,
      fences: fences.map((view: any) => ({ width: view.object.displayWidth, flipX: view.object.flipX }))
    };
  });
  expect(farmFixture).toEqual(expect.objectContaining({
    crossings: 3, expectedCrossings: 3, everyBlockOnce: true, barnCount: 1
  }));
  expect(farmFixture.grassAnchorY).toBeCloseTo(.536, 3);
  expect(farmFixture.fences.length).toBeGreaterThan(0);
  expect(farmFixture.fences.every((fence: any) => fence.width === 160 && fence.flipX)).toBe(true);
  await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    const fence = scene.tileViews.find((view: any) => view.object.texture?.key === 'farm-atlas' && view.object.frame?.name === 'farm-5');
    scene.cameras.main.centerOn(fence.object.x, fence.object.y);
  });
  await page.screenshot({path:testInfo.outputPath('farm-fence.png')});
  const crossingPose = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.player.x = 11; scene.player.y = 8; scene.player.jumpLift = 0; scene.player.surfaceLift = 0;
    scene.positionDog(0, false);
    const before = { x: scene.player.x, y: scene.player.y };
    scene.movePlayer(-1, 0, 0, 16);
    scene.positionDog(0, false);
    return {
      before, after: { x: scene.player.x, y: scene.player.y }, surfaceLift: scene.player.surfaceLift,
      spriteY: scene.dogSprite.y, shadowY: scene.dogShadow.y,
      overlayAligned: !scene.dogOcclusionSprite.visible || scene.dogOcclusionSprite.y === scene.dog.y + scene.dogSprite.y,
      facingLeft: scene.dogSprite.flipX, frame: scene.tileViews.find((view: any) => view.point.x === 11 && view.point.y === 8
        && view.object.texture?.key === 'farm-atlas' && view.object.frame?.name === 'farm-4')?.object.frame.name
    };
  });
  expect(crossingPose).toEqual({
    before: { x: 11, y: 8 }, after: { x: 11, y: 8 }, surfaceLift: -22,
    spriteY: -60, shadowY: -4, overlayAligned: true, facingLeft: true, frame: 'farm-4'
  });
  await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.player.x = 11; scene.player.y = 7; scene.player.jumpLift = 0; scene.player.surfaceLift = 0; scene.busy = false;
    scene.positionDog(0, false); scene.tryJump(-1, .5);
  });
  await expect.poll(() => page.evaluate(() => !(window as any).__PAWS_GAME__.scene.getScene('Maze').busy), { timeout: 30_000 }).toBe(true);
  const landing = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return {
      x: scene.player.x, y: scene.player.y, surfaceLift: scene.player.surfaceLift,
      shadowY: scene.dogShadow.y,
      overlayAligned: !scene.dogOcclusionSprite.visible || scene.dogOcclusionSprite.y === scene.dog.y + scene.dogSprite.y
    };
  });
  expect(landing.x).toBeCloseTo(11, 3); expect(landing.y).toBeCloseTo(8, 3);
  expect(landing).toEqual(expect.objectContaining({ surfaceLift: -22, shadowY: -4, overlayAligned: true }));
  await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.movePlayer(1, 0, 0, 16); scene.tryJump(0, 0);
  });
  await expect.poll(() => page.evaluate(() => !(window as any).__PAWS_GAME__.scene.getScene('Maze').busy), { timeout: 30_000 }).toBe(true);
  const turnedLanding = await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    return { x: scene.player.x, y: scene.player.y, surfaceLift: scene.player.surfaceLift, facingLeft: scene.dogSprite.flipX };
  });
  expect(turnedLanding.x).toBeCloseTo(11, 3); expect(turnedLanding.y).toBeCloseTo(7, 3);
  expect(turnedLanding.surfaceLift).toBe(0); expect(turnedLanding.facingLeft).toBe(false);
  await page.evaluate(() => {
    const scene = (window as any).__PAWS_GAME__.scene.getScene('Maze');
    scene.cameras.main.centerOn(scene.dog.x, scene.dog.y);
  });
  await page.screenshot({path:testInfo.outputPath('farm-map.png')});
});

test('canvas expands across common landscape and tablet aspect ratios', async ({ page }, testInfo) => {
  test.skip(!['mobile-landscape', 'wide-19-5', 'wide-20-9', 'tablet-4-3'].includes(testInfo.project.name));
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

test('production service worker serves navigation offline without returning HTML for assets', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium' || process.env.PAWS_PWA_TEST !== '1');
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL ?? ''), { timeout: 30_000 }).toContain('sw.js');
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('canvas')).toBeVisible();
  const missingAsset = await page.evaluate(async () => {
    try {
      const response = await fetch('assets/not-a-real-sprite.png');
      return { rejected: false, status: response.status, type: response.type, contentType: response.headers.get('content-type') };
    } catch {
      return { rejected: true };
    }
  });
  expect(missingAsset).toEqual({ rejected: true });
  await context.setOffline(false);
});

test('portrait touch devices receive a rotate prompt that clears after rotation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'portrait-guard');
  await page.goto('/');
  await expect(page.locator('#rotate-message')).toBeVisible();
  await expect(page.locator('#rotate-message')).toContainText('Turn your device sideways');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-message')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-message')).toBeVisible();
});
