import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';
import { GameSettings } from '../types/game';

export function createPhaserGame(
  parent: HTMLElement,
  settings: GameSettings
): Phaser.Game {
  const resolutionZoom =
    settings.resolution === 'performance'
      ? 0.75
      : settings.resolution === 'balanced'
      ? 0.9
      : 1.0;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#080a0f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: settings.graphicsQuality !== 'low',
      pixelArt: false,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    fps: {
      target: settings.fpsLimit,
      forceSetTimeOut: false,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1280 },
        debug: false,
      },
    },
    scene: [GameScene],
    callbacks: {
      postBoot: (game) => {
        if (resolutionZoom !== 1.0 && game.canvas) {
          game.canvas.style.imageRendering = 'auto';
        }
      },
    },
  });
}
