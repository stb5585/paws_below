import Phaser from 'phaser';
import type { AnimalDefinition, GridPoint, LevelDefinition } from '../types';
import type { WorldDefinition } from '../data/worlds';
import { diamondHalfToward, diamondPoints, GroundDepth, projectGridPoint } from '../systems/rendering';
import {
  ENVIRONMENT_ASSETS, placeProjectedSprite, placementForWallSpan, wallFlipForGridAxes, wallInsetTowardGround, wallOffsetForCell,
  type EnvironmentAssetId, type ProjectedSpriteAsset, type WorldPropPlacement
} from './catalog';

export interface EnvironmentView {
  point: GridPoint;
  object: Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
  discovered: boolean;
  occludesActor: boolean;
  occlusionGroup?: string;
  coveredPoints?: GridPoint[];
  naturalAlpha: number;
  surfaceColor?: number;
}

export interface EnvironmentOcclusionGroup {
  id: string;
  members: EnvironmentView[];
}

const BURROW_FLOOR = { a: 0x8d5d3d, b: 0x7b4c35, edge: 0x4d2d23 };
const FARM_GRASS = [0x79a950, 0x74a04b, 0x82ae57, 0x6f9b48];

const pointKey = (point: GridPoint): string => `${point.x},${point.y}`;

export function assetForWall(world: WorldDefinition, point: GridPoint, isBlock: boolean): EnvironmentAssetId {
  if (isBlock) return world.rendering.blockAsset;
  const landmark = world.rendering.landmarks.find(item => item.x === point.x && item.y === point.y);
  if (landmark) return landmark.asset;
  const hash = Math.abs(point.x * 5 + point.y * 13);
  return world.rendering.borderVariants.find(rule => hash % rule.modulus === rule.remainder)?.asset
    ?? world.rendering.wallAsset;
}

export function crossingAssetForPoint(world: WorldDefinition, point: GridPoint): ProjectedSpriteAsset | undefined {
  const pathIndex = world.jumpPaths.findIndex(path => path.some(candidate => pointKey(candidate) === pointKey(point)));
  if (pathIndex < 0) return undefined;
  const choices = world.rendering.crossingAssets;
  return ENVIRONMENT_ASSETS[choices[pathIndex % choices.length]];
}

export class EnvironmentRenderer {
  private readonly views: EnvironmentView[] = [];
  private readonly groups: EnvironmentOcclusionGroup[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly world: WorldDefinition) {}

  render(): EnvironmentView[] {
    const crossingKeys = new Set(this.world.jumpPaths.flat().map(pointKey));
    const blockKeys = new Set<string>();
    this.world.blocks.forEach(block => {
      for (let y = block.y; y < block.y + block.height; y++) {
        for (let x = block.x; x < block.x + block.width; x++) blockKeys.add(pointKey({ x, y }));
      }
    });
    const lavaTiles: Phaser.GameObjects.Graphics[] = [];
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        const point = { x, y };
        if (blockKeys.has(pointKey(point))) {
          this.drawFloor(point);
          continue;
        }
        if (!this.world.isFloorCell(x, y) && !this.world.isObstacleCell(x, y)) continue;
        if (this.world.isObstacleCell(x, y)) {
          if (this.world.theme === 'burrow') lavaTiles.push(this.drawLava(point));
          else this.drawFloor(point);
          if (crossingKeys.has(pointKey(point))) this.drawCrossing(point);
        } else {
          this.drawFloor(point);
        }
      }
    }
    if (lavaTiles.length) {
      this.scene.tweens.add({
        targets: lavaTiles, alpha: { from: .86, to: 1 }, duration: 980,
        yoyo: true, repeat: -1, ease: 'Sine.inOut'
      });
    }
    this.drawWalls();
    this.world.rendering.decor.forEach(item => this.drawDecor(item));
    return this.views;
  }

  renderHome(level: LevelDefinition, animal: AnimalDefinition): void {
    const position = projectGridPoint(level.exit);
    const glow = this.scene.add.circle(position.x, position.y - 64, 96, 0xffc45f, .2)
      .setDepth(GroundDepth.detail);
    this.scene.tweens.add({
      targets: glow, scale: { from: .85, to: 1.15 }, alpha: { from: .12, to: .25 },
      duration: 1200, yoyo: true, repeat: -1
    });
    if (this.world.theme === 'farm') {
      placeProjectedSprite(this.scene, level.exit, ENVIRONMENT_ASSETS['farm-barn']);
      return;
    }
    const home: ProjectedSpriteAsset = {
      id: `${animal.id}-home`, texture: animal.homeTexture, frame: animal.homeFrame,
      displaySize: 190, groundAnchor: { x: .5, y: .847 }, footprint: { width: 2, height: 2 }
    };
    placeProjectedSprite(this.scene, level.exit, home);
  }

  getOcclusionGroups(): EnvironmentOcclusionGroup[] { return this.groups; }

  private track(
    point: GridPoint,
    objects: Array<Phaser.GameObjects.Shape | Phaser.GameObjects.Image>,
    occludesActor = false,
    occlusionGroup?: string,
    coveredPoints?: GridPoint[],
    surfaceColor?: number
  ): void {
    objects.forEach(object => this.views.push({
      point, object, discovered: false, occludesActor, occlusionGroup, coveredPoints,
      naturalAlpha: object.alpha, surfaceColor
    }));
  }

  private drawFloor(point: GridPoint): void {
    const position = projectGridPoint(point);
    const polygon = diamondPoints();
    if (this.world.theme === 'farm') {
      const color = FARM_GRASS[Math.abs(point.x * 7 + point.y * 11) % FARM_GRASS.length];
      const base = this.scene.add.polygon(position.x, position.y, polygon, color, 1)
        .setStrokeStyle(1, 0x41682f, .24).setDepth(GroundDepth.base);
      const texture = placeProjectedSprite(this.scene, point, ENVIRONMENT_ASSETS[this.world.rendering.floorAsset], {
        depth: GroundDepth.detail, alpha: .72
      });
      this.track(point, [base], false, undefined, undefined, color);
      this.track(point, [texture]);
      return;
    }
    const color = (point.x + point.y) % 2 ? BURROW_FLOOR.a : BURROW_FLOOR.b;
    const base = this.scene.add.polygon(position.x, position.y, polygon, color, 1)
      .setStrokeStyle(1, BURROW_FLOOR.edge, .45).setDepth(GroundDepth.base);
    const texture = placeProjectedSprite(this.scene, point, ENVIRONMENT_ASSETS[this.world.rendering.floorAsset], {
      depth: GroundDepth.detail
    });
    this.track(point, [base], false, undefined, undefined, color);
    this.track(point, [texture]);
  }

  private drawLava(point: GridPoint): Phaser.GameObjects.Graphics {
    const position = projectGridPoint(point);
    const layer = this.scene.add.graphics().setDepth(GroundDepth.detail);
    const diamond = (halfWidth: number, halfHeight: number) => [
      new Phaser.Geom.Point(position.x, position.y - halfHeight),
      new Phaser.Geom.Point(position.x + halfWidth, position.y),
      new Phaser.Geom.Point(position.x, position.y + halfHeight),
      new Phaser.Geom.Point(position.x - halfWidth, position.y)
    ];
    layer.fillStyle(0x762018, 1).fillPoints(diamond(48, 24), true);
    layer.lineStyle(1, 0x43130f, .9).strokePoints(diamond(47.5, 23.5), true);
    layer.fillStyle((point.x + point.y) % 2 ? 0xf04427 : 0xdd3520, 1).fillPoints(diamond(46, 21.5), true);
    layer.fillStyle(0xff6a2c, .58).fillPoints(diamond(40, 17), true);
    const flip = (point.x * 17 + point.y * 29) % 2 ? 1 : -1;
    layer.lineStyle(2, 0xffc24a, .82).beginPath();
    layer.moveTo(position.x - 30, position.y - 4 * flip);
    layer.lineTo(position.x - 10, position.y + 3 * flip);
    layer.lineTo(position.x + 4, position.y - 3 * flip);
    layer.lineTo(position.x + 28, position.y + 5 * flip).strokePath();
    layer.lineStyle(1, 0xffe27a, .65).beginPath();
    layer.moveTo(position.x - 5, position.y - 12);
    layer.lineTo(position.x + 8, position.y - 4);
    layer.lineTo(position.x + 18, position.y - 7).strokePath();
    layer.fillStyle(0xffd45a, .72).fillCircle(position.x - 21 * flip, position.y + 4, 2.4);
    layer.fillCircle(position.x + 18 * flip, position.y - 2, 1.7);
    return layer;
  }

  private drawCrossing(point: GridPoint): void {
    const definition = crossingAssetForPoint(this.world, point);
    if (!definition) return;
    const image = placeProjectedSprite(this.scene, point, definition, { depth: GroundDepth.detail });
    this.track(point, [image]);
  }

  private drawWalls(): void {
    const walls = new Set<string>();
    const blocks = new Set<string>();
    const wallGroups = new Map<string, string>();
    this.world.blocks.forEach((block, index) => {
      for (let y = block.y; y < block.y + block.height; y++) {
        for (let x = block.x; x < block.x + block.width; x++) {
          const key = pointKey({ x, y }); blocks.add(key); walls.add(key);
          wallGroups.set(key, `block-${index}`);
        }
      }
    });
    const addBoundary = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= this.world.width || y >= this.world.height
        || this.world.isFloorCell(x, y) || this.world.isObstacleCell(x, y)) return;
      const key = pointKey({ x, y }); walls.add(key);
      if (!wallGroups.has(key)) wallGroups.set(key, 'boundary');
    };
    for (let y = 0; y < this.world.height; y++) for (let x = 0; x < this.world.width; x++) {
      if (!this.world.isFloorCell(x, y) && !this.world.isObstacleCell(x, y)) continue;
      addBoundary(x + 1, y); addBoundary(x - 1, y); addBoundary(x, y + 1); addBoundary(x, y - 1);
    }
    let boundaryGroup = 0;
    const ungrouped = new Set([...walls].filter(key => wallGroups.get(key) === 'boundary'));
    while (ungrouped.size) {
      const first = ungrouped.values().next().value as string;
      const queue = [first]; ungrouped.delete(first);
      const group = `boundary-${boundaryGroup++}`;
      while (queue.length) {
        const current = queue.pop()!; wallGroups.set(current, group);
        const [x, y] = current.split(',').map(Number);
        [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`].forEach(neighbor => {
          if (!ungrouped.delete(neighbor)) return;
          queue.push(neighbor);
        });
      }
    }
    const reserved = new Set<string>();
    const fencePlacements: Array<{ from: GridPoint; to: GridPoint; group?: string }> = [];
    const sameGroup = (point: GridPoint, group: string | undefined): boolean => {
      const key = pointKey(point);
      return walls.has(key) && wallGroups.get(key) === group;
    };
    const runLength = (point: GridPoint, dx: number, dy: number, group: string | undefined): number => {
      let length = 1;
      for (const direction of [-1, 1]) {
        let distance = 1;
        while (sameGroup({ x: point.x + dx * distance * direction, y: point.y + dy * distance * direction }, group)) {
          length++; distance++;
        }
      }
      return length;
    };
    const sortedWallKeys = [...walls].sort((a, b) => {
      const [ax, ay] = a.split(',').map(Number);
      const [bx, by] = b.split(',').map(Number);
      return ax + ay - bx - by || ay - by || ax - bx;
    });
    sortedWallKeys.forEach(key => {
      if (reserved.has(key)) return;
      const [x, y] = key.split(',').map(Number);
      const point = { x, y };
      if (assetForWall(this.world, point, blocks.has(key)) !== 'farm-boundary-fence') return;
      const group = wallGroups.get(key);
      const axes = [
        { dx: 1, dy: 0, length: runLength(point, 1, 0, group) },
        { dx: 0, dy: 1, length: runLength(point, 0, 1, group) }
      ].sort((a, b) => b.length - a.length);
      let partner: GridPoint | undefined;
      for (const axis of axes) {
        partner = [1, -1]
          .map(direction => ({ x: x + axis.dx * direction, y: y + axis.dy * direction }))
          .find(candidate => sameGroup(candidate, group) && !reserved.has(pointKey(candidate)));
        if (partner) break;
      }
      if (!partner) return;
      reserved.add(key); reserved.add(pointKey(partner));
      fencePlacements.push({ from: point, to: partner, group });
    });
    fencePlacements.forEach(({ from, to, group }) => {
      const placement = placementForWallSpan(from, to);
      this.drawBoundaryFoundation(from);
      this.drawBoundaryFoundation(to);
      const fromInset = this.boundaryWallInset(from);
      const toInset = this.boundaryWallInset(to);
      const inset = { x: (fromInset.x + toInset.x) / 2, y: (fromInset.y + toInset.y) / 2 };
      const placementOffset = {
        x: placement.placementOffset.x + inset.x, y: placement.placementOffset.y + inset.y
      };
      const depthOffset = { x: placement.depthOffset.x + inset.x, y: placement.depthOffset.y + inset.y };
      const image = placeProjectedSprite(this.scene, from, ENVIRONMENT_ASSETS['farm-boundary-fence'], {
        ...placement, placementOffset, depthOffset
      });
      const midpoint = { x: from.x + placementOffset.x, y: from.y + placementOffset.y };
      this.track(midpoint, [image], true, group, [from, to]);
    });
    sortedWallKeys.forEach(key => {
      if (reserved.has(key)) return;
      const [x, y] = key.split(',').map(Number);
      const point = { x, y };
      const assetId = assetForWall(this.world, point, blocks.has(key));
      const definition = ENVIRONMENT_ASSETS[assetId === 'farm-boundary-fence' ? this.world.rendering.wallAsset : assetId];
      const directions = this.groundDirections(point);
      const inset = wallOffsetForCell(blocks.has(key), directions);
      const group = wallGroups.get(key);
      const flipX = definition.id === 'burrow-wall'
        ? wallFlipForGridAxes(runLength(point, 1, 0, group), runLength(point, 0, 1, group), directions)
        : undefined;
      const image = placeProjectedSprite(this.scene, point, definition, {
        placementOffset: inset, depthOffset: inset, flipX
      });
      this.track({ x: point.x + inset.x, y: point.y + inset.y }, [image], true, group, [point]);
    });
    new Set(wallGroups.values()).forEach(groupId => {
      const members = this.views.filter(view => view.occlusionGroup === groupId);
      if (!members.length) return;
      this.groups.push({ id: groupId, members });
    });
  }

  private groundDirections(point: GridPoint): GridPoint[] {
    return [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ].filter(direction => {
      const x = point.x + direction.x;
      const y = point.y + direction.y;
      return this.world.isFloorCell(x, y) || this.world.isObstacleCell(x, y);
    });
  }

  private boundaryWallInset(point: GridPoint, distance = .5): GridPoint {
    return wallInsetTowardGround(this.groundDirections(point), distance);
  }

  private drawBoundaryFoundation(point: GridPoint): void {
    const position = projectGridPoint(point);
    const maskShape = this.scene.make.graphics({}, false).fillStyle(0xffffff, 1);
    const bases: Array<{ object: Phaser.GameObjects.Polygon; color: number }> = [];
    this.groundDirections(point).forEach(direction => {
      const adjacent = { x: point.x + direction.x, y: point.y + direction.y };
      const color = this.world.theme === 'farm'
        ? FARM_GRASS[Math.abs(adjacent.x * 7 + adjacent.y * 11) % FARM_GRASS.length]
        : (adjacent.x + adjacent.y) % 2 ? BURROW_FLOOR.a : BURROW_FLOOR.b;
      const triangle = diamondHalfToward(direction);
      const base = this.scene.add.polygon(position.x, position.y, triangle, color, 1)
        .setDepth(GroundDepth.base);
      bases.push({ object: base, color });
      maskShape.fillPoints([
        new Phaser.Geom.Point(position.x + triangle[0], position.y + triangle[1]),
        new Phaser.Geom.Point(position.x + triangle[2], position.y + triangle[3]),
        new Phaser.Geom.Point(position.x + triangle[4], position.y + triangle[5])
      ], true);
    });
    if (!bases.length) {
      maskShape.destroy();
      return;
    }
    bases.forEach(base => this.track(point, [base.object], false, undefined, undefined, base.color));
    const texture = placeProjectedSprite(this.scene, point, ENVIRONMENT_ASSETS[this.world.rendering.floorAsset], {
      depth: GroundDepth.detail, alpha: this.world.theme === 'farm' ? .72 : 1
    }).setMask(maskShape.createGeometryMask());
    this.track(point, [texture]);
  }

  private drawDecor(item: WorldPropPlacement): void {
    const definition = ENVIRONMENT_ASSETS[item.asset];
    const image = placeProjectedSprite(this.scene, item, definition, { size: item.size });
    this.track(item, [image]);
    if (item.animated) {
      this.scene.tweens.add({
        targets: image, alpha: { from: .82, to: 1 },
        scaleX: { from: image.scaleX * .96, to: image.scaleX * 1.04 },
        scaleY: { from: image.scaleY * .96, to: image.scaleY * 1.04 },
        duration: 1100 + item.x * 17, yoyo: true, repeat: -1
      });
    }
  }
}
