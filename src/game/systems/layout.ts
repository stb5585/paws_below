import type Phaser from 'phaser';

export const SAFE_WIDTH = 1280;
export const SAFE_HEIGHT = 720;

export interface LayoutInsets { top: number; right: number; bottom: number; left: number }
export interface GameLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
  insets: LayoutInsets;
}

const ZERO_INSETS: LayoutInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function calculateGameLayout(width: number, height: number, insets: LayoutInsets = ZERO_INSETS): GameLayout {
  const availableWidth = Math.max(1, width - insets.left - insets.right);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom);
  const safeWidth = Math.min(SAFE_WIDTH, availableWidth);
  const safeHeight = Math.min(SAFE_HEIGHT, availableHeight);
  const safeX = insets.left + (availableWidth - safeWidth) / 2;
  const safeY = insets.top + (availableHeight - safeHeight) / 2;
  return { width, height, centerX: width / 2, centerY: height / 2, safeX, safeY, safeWidth, safeHeight, insets };
}

function cssPixels(name: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getGameLayout(scene: Phaser.Scene): GameLayout {
  const width = scene.scale.gameSize.width;
  const height = scene.scale.gameSize.height;
  const cssToGameX = width / Math.max(1, scene.scale.displaySize.width);
  const cssToGameY = height / Math.max(1, scene.scale.displaySize.height);
  return calculateGameLayout(width, height, {
    top: cssPixels('--safe-area-top') * cssToGameY,
    right: cssPixels('--safe-area-right') * cssToGameX,
    bottom: cssPixels('--safe-area-bottom') * cssToGameY,
    left: cssPixels('--safe-area-left') * cssToGameX
  });
}
