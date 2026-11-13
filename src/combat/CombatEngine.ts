import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';

export interface DamageResult {
  finalDamage: number;
  isCritical: boolean;
  wasGuarded: boolean;
  wasParried: boolean;
}

export function calculateDamage(
  rawDamage: number,
  critChance: number,
  targetDefense = 0,
  comboCount = 0
): { damage: number; isCritical: boolean } {
  const isCritical = Math.random() < critChance;
  const comboMultiplier = 1 + Math.min(0.45, comboCount * 0.02);
  const variance = 0.92 + Math.random() * 0.16;
  const mitigated = Math.max(4, rawDamage * comboMultiplier * variance - targetDefense * 0.55);
  const damage = Math.round(isCritical ? mitigated * 1.65 : mitigated);
  return { damage, isCritical };
}

export function spawnFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#f8fafc',
  isCrit = false
): void {
  const txt = scene.add
    .text(x + (Math.random() * 18 - 9), y - 24, text, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: isCrit ? '22px' : '16px',
      fontStyle: 'bold',
      color,
      stroke: '#090b10',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(50);

  scene.tweens.add({
    targets: txt,
    y: txt.y - (isCrit ? 48 : 34),
    alpha: 0,
    scale: isCrit ? 1.18 : 1.0,
    duration: isCrit ? 760 : 620,
    ease: 'Cubic.easeOut',
    onComplete: () => txt.destroy(),
  });
}

export function spawnHitSparks(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colorNum: number,
  count = 8
): void {
  for (let i = 0; i < count; i++) {
    const p = scene.add.image(x, y, 'vfx_particle').setTint(colorNum).setDepth(45);
    p.setScale(0.6 + Math.random() * 0.9);
    const angle = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 48;
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.1,
      duration: 240 + Math.random() * 160,
      ease: 'Quad.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

export function triggerHitstop(scene: Phaser.Scene, durationMs = 45): void {
  if (scene.physics.world.isPaused) return;
  scene.physics.world.pause();
  scene.time.delayedCall(durationMs, () => {
    if (scene.scene.isActive()) {
      scene.physics.world.resume();
    }
  });
}

export function playComboSlashSfx(comboStep: number): void {
  if (comboStep === 1) SoundEngine.playSfx('sword1');
  else if (comboStep === 2) SoundEngine.playSfx('sword2');
  else SoundEngine.playSfx('sword3');
}
