import Phaser from 'phaser';
import './styles.css';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { TutorialScene } from './game/scenes/TutorialScene';
import { MazeScene } from './game/scenes/MazeScene';
import { PauseScene } from './game/scenes/PauseScene';
import { OwnerReturnScene } from './game/scenes/OwnerReturnScene';
import { CollectionScene } from './game/scenes/CollectionScene';
import { ResultsScene } from './game/scenes/ResultsScene';
import { registerServiceWorker } from './pwa';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#1d110d',
  render: { antialias: true, pixelArt: false, roundPixels: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, TutorialScene, MazeScene, PauseScene, OwnerReturnScene, CollectionScene, ResultsScene]
});

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__PAWS_GAME__', { value: game, configurable: false });
}

registerServiceWorker();
