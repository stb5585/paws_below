import { ANIMALS, LEVELS } from '../data/content';
import { WORLDS, type WorldDefinition } from '../data/worlds';
import { ENVIRONMENT_ASSETS, type ProjectedSpriteAsset } from '../rendering/catalog';
import type { AnimalDefinition, GridPoint, LevelDefinition } from '../types';
import { GRID_ASSETS, type GridAsset } from './assets';

export interface ContentValidationInput {
  worlds: readonly WorldDefinition[];
  levels: readonly LevelDefinition[];
  animals: readonly AnimalDefinition[];
  renderAssets: Readonly<Record<string, ProjectedSpriteAsset>>;
  gridAssets: readonly GridAsset[];
}

const key = (point: GridPoint): string => `${point.x},${point.y}`;
const inside = (world: WorldDefinition, point: GridPoint): boolean =>
  Number.isInteger(point.x) && Number.isInteger(point.y)
  && point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height;

function duplicateIds<T>(items: readonly T[], getId: (item: T) => string): string[] {
  const seen = new Set<string>(); const duplicates = new Set<string>();
  items.forEach(item => { const id = getId(item); if (seen.has(id)) duplicates.add(id); seen.add(id); });
  return [...duplicates];
}

function reachableCells(world: WorldDefinition, start: GridPoint): Set<string> {
  if (!world.isFloorCell(start.x, start.y)) return new Set();
  const jumpEdges = new Map<string, GridPoint[]>();
  world.jumpPaths.forEach(path => {
    const first = path[0]; const last = path.at(-1);
    if (!first || !last) return;
    jumpEdges.set(key(first), [...(jumpEdges.get(key(first)) ?? []), last]);
    jumpEdges.set(key(last), [...(jumpEdges.get(key(last)) ?? []), first]);
  });
  const seen = new Set<string>(); const queue = [start];
  while (queue.length) {
    const point = queue.shift()!; const pointId = key(point);
    if (seen.has(pointId)) continue;
    seen.add(pointId);
    const adjacent = [
      { x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 }
    ].filter(next => world.isFloorCell(next.x, next.y));
    [...adjacent, ...(jumpEdges.get(pointId) ?? [])].forEach(next => {
      if (!seen.has(key(next))) queue.push(next);
    });
  }
  return seen;
}

function validateRenderAssets(
  assets: Readonly<Record<string, ProjectedSpriteAsset>>,
  grids: readonly GridAsset[]
): string[] {
  const issues: string[] = [];
  Object.entries(assets).forEach(([catalogId, asset]) => {
    if (catalogId !== asset.id) issues.push(`render asset ${catalogId}: id is ${asset.id}`);
    if (asset.displaySize <= 0) issues.push(`render asset ${asset.id}: displaySize must be positive`);
    if (asset.footprint.width <= 0 || asset.footprint.height <= 0) issues.push(`render asset ${asset.id}: footprint must be positive`);
    if (asset.groundAnchor.x < 0 || asset.groundAnchor.x > 1 || asset.groundAnchor.y < 0 || asset.groundAnchor.y > 1) {
      issues.push(`render asset ${asset.id}: groundAnchor must be normalized`);
    }
    const grid = grids.find(candidate => candidate.key === asset.texture);
    if (!grid) { issues.push(`render asset ${asset.id}: unknown texture ${asset.texture}`); return; }
    const match = asset.frame.match(new RegExp(`^${grid.prefix}-(\\d+)$`));
    const frame = match ? Number(match[1]) : -1;
    if (frame < 0 || frame >= grid.columns * grid.rows) issues.push(`render asset ${asset.id}: invalid frame ${asset.frame}`);
  });
  return issues;
}

function validateWorld(world: WorldDefinition, assets: Readonly<Record<string, ProjectedSpriteAsset>>): string[] {
  const issues: string[] = [];
  const report = (message: string) => issues.push(`world ${world.id}: ${message}`);
  if (!Number.isInteger(world.width) || !Number.isInteger(world.height) || world.width <= 0 || world.height <= 0) report('dimensions must be positive integers');
  duplicateIds(world.collectibles, item => item.id).forEach(id => report(`duplicate collectible id ${id}`));
  duplicateIds([...world.ordinaryDigSpots, ...world.specialDigSpots], item => item.id).forEach(id => report(`duplicate dig id ${id}`));
  [...world.blocks, ...world.obstacles].forEach(rect => {
    if (!Number.isInteger(rect.x) || !Number.isInteger(rect.y) || !Number.isInteger(rect.width) || !Number.isInteger(rect.height)
      || rect.width <= 0 || rect.height <= 0 || rect.x < 0 || rect.y < 0
      || rect.x + rect.width > world.width || rect.y + rect.height > world.height) {
      report(`invalid rectangle ${rect.x},${rect.y} ${rect.width}x${rect.height}`);
    }
  });
  world.blocks.forEach(block => world.obstacles.forEach(obstacle => {
    const overlaps = block.x < obstacle.x + obstacle.width && block.x + block.width > obstacle.x
      && block.y < obstacle.y + obstacle.height && block.y + block.height > obstacle.y;
    if (overlaps) report(`block ${block.x},${block.y} overlaps obstacle ${obstacle.x},${obstacle.y}`);
  }));
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    if (world.isFloorCell(x, y) && world.isObstacleCell(x, y)) report(`cell ${x},${y} is both floor and obstacle`);
  }
  const placed = [
    ...world.collectibles.map(item => ({ label: `collectible ${item.id}`, point: item.position, floor: true })),
    ...world.ordinaryDigSpots.map(point => ({ label: `dig ${point.id}`, point, floor: true })),
    ...world.specialDigSpots.map(point => ({ label: `dig ${point.id}`, point, floor: true })),
    ...world.rendering.decor.map(point => ({ label: `decor ${point.asset}`, point, floor: false })),
    ...world.rendering.landmarks.map(point => ({ label: `landmark ${point.asset}`, point, floor: false }))
  ];
  placed.forEach(item => {
    if (!inside(world, item.point)) report(`${item.label} is outside at ${key(item.point)}`);
    else if (item.floor && !world.isFloorCell(item.point.x, item.point.y)) report(`${item.label} is not on floor at ${key(item.point)}`);
  });
  const occupied = new Map<string, string>();
  [
    ...world.collectibles.map(item => ({ label: `collectible ${item.id}`, point: item.position })),
    ...world.ordinaryDigSpots.map(point => ({ label: `dig ${point.id}`, point })),
    ...world.specialDigSpots.map(point => ({ label: `dig ${point.id}`, point })),
    ...world.rendering.decor.map(point => ({ label: `decor ${point.asset}`, point }))
  ].forEach(item => {
    const location = key(item.point); const previous = occupied.get(location);
    if (previous) report(`${item.label} overlaps ${previous} at ${location}`);
    else occupied.set(location, item.label);
  });
  const renderAssetIds = [
    world.rendering.floorAsset, world.rendering.wallAsset, world.rendering.blockAsset,
    ...world.rendering.crossingAssets, ...world.rendering.borderVariants.map(item => item.asset),
    ...world.rendering.decor.map(item => item.asset), ...world.rendering.landmarks.map(item => item.asset)
  ];
  renderAssetIds.forEach(id => { if (!assets[id]) report(`unknown render asset ${id}`); });
  if (!world.rendering.crossingAssets.length) report('requires at least one crossing asset');
  world.rendering.borderVariants.forEach(rule => {
    if (!Number.isInteger(rule.modulus) || rule.modulus <= 0 || !Number.isInteger(rule.remainder)
      || rule.remainder < 0 || rule.remainder >= rule.modulus) report(`invalid border variant for ${rule.asset}`);
  });
  world.jumpPaths.forEach((path, index) => {
    if (path.length < 3) { report(`jump path ${index} must contain two endpoints and an obstacle`); return; }
    path.forEach((point, pointIndex) => {
      if (!inside(world, point)) report(`jump path ${index} leaves bounds at ${key(point)}`);
      else if ((pointIndex === 0 || pointIndex === path.length - 1) && !world.isFloorCell(point.x, point.y)) report(`jump path ${index} endpoint is not floor at ${key(point)}`);
      else if (pointIndex > 0 && pointIndex < path.length - 1 && !world.isObstacleCell(point.x, point.y)) report(`jump path ${index} does not cross an obstacle at ${key(point)}`);
    });
  });
  return issues;
}

export function validateGameContent(input: ContentValidationInput): string[] {
  const issues = validateRenderAssets(input.renderAssets, input.gridAssets);
  duplicateIds(input.worlds, world => world.id).forEach(id => issues.push(`duplicate world id ${id}`));
  duplicateIds(input.levels, level => level.id).forEach(id => issues.push(`duplicate level id ${id}`));
  duplicateIds(input.animals, animal => animal.id).forEach(id => issues.push(`duplicate animal id ${id}`));
  input.worlds.forEach(world => issues.push(...validateWorld(world, input.renderAssets)));
  input.levels.forEach(level => {
    const world = input.worlds.find(candidate => candidate.id === level.mapId);
    if (!input.animals.some(animal => animal.id === level.animalId)) issues.push(`level ${level.id}: unknown animal ${level.animalId}`);
    if (!world) { issues.push(`level ${level.id}: unknown world ${level.mapId}`); return; }
    const points = [{ label: 'start', point: level.start }, { label: 'exit', point: level.exit }];
    points.forEach(item => {
      if (!inside(world, item.point) || !world.isFloorCell(item.point.x, item.point.y)) issues.push(`level ${level.id}: ${item.label} is not on floor at ${key(item.point)}`);
    });
    if (!world.isFloorCell(level.start.x, level.start.y)) return;
    const reachable = reachableCells(world, level.start);
    const required = [level.exit, ...world.collectibles.map(item => item.position), ...world.ordinaryDigSpots, ...world.specialDigSpots];
    required.forEach(point => { if (!reachable.has(key(point))) issues.push(`level ${level.id}: unreachable ${key(point)}`); });
    if (level.goal.type !== 'reachExit') {
      const collectibleKind = level.goal.collectibleKind;
      const available = world.collectibles.filter(item => item.kind === collectibleKind).length;
      if (level.goal.target <= 0 || level.goal.target > available) issues.push(`level ${level.id}: goal target ${level.goal.target} exceeds ${available}`);
    }
  });
  input.animals.forEach(animal => {
    const grid = input.gridAssets.find(asset => asset.key === animal.homeTexture);
    const match = grid && animal.homeFrame.match(new RegExp(`^${grid.prefix}-(\\d+)$`));
    if (!grid || !match || Number(match[1]) >= grid.columns * grid.rows) issues.push(`animal ${animal.id}: invalid home frame ${animal.homeTexture}/${animal.homeFrame}`);
  });
  return issues;
}

export function assertGameContentValid(): void {
  const issues = validateGameContent({
    worlds: WORLDS, levels: LEVELS, animals: ANIMALS,
    renderAssets: ENVIRONMENT_ASSETS, gridAssets: GRID_ASSETS
  });
  if (issues.length) throw new Error(`Invalid game content:\n- ${issues.join('\n- ')}`);
}
