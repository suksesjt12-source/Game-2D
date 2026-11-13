import Phaser from 'phaser';
import { BossType, EnemyType, MiniBossType } from '../types/game';

export type CharacterRigId =
  | 'hero'
  | EnemyType
  | MiniBossType
  | BossType;

interface CharacterPalette {
  skin: string;
  outfitMain: string;
  outfitDark: string;
  armor: string;
  accent: string;
  eye: string;
  weaponBlade: string;
  weaponGlow: string;
  scale: number;
  style:
    | 'ninja'
    | 'stalker'
    | 'spearman'
    | 'archer'
    | 'oni'
    | 'kunoichi'
    | 'golem'
    | 'executioner'
    | 'kirin'
    | 'kodama'
    | 'shogun'
    | 'raijin'
    | 'seraph'
    | 'maou';
}

const RIG_PALETTES: Record<CharacterRigId, CharacterPalette> = {
  hero: {
    skin: '#f3d2c1',
    outfitMain: '#1e2436',
    outfitDark: '#0f131f',
    armor: '#334155',
    accent: '#e11d48',
    eye: '#38bdf8',
    weaponBlade: '#e2e8f0',
    weaponGlow: '#fb7185',
    scale: 1.0,
    style: 'ninja',
  },
  shadow_stalker: {
    skin: '#312e47',
    outfitMain: '#1e1b2e',
    outfitDark: '#0f0d18',
    armor: '#4c1d95',
    accent: '#a855f7',
    eye: '#f43f5e',
    weaponBlade: '#c084fc',
    weaponGlow: '#a855f7',
    scale: 0.96,
    style: 'stalker',
  },
  ronin_spearman: {
    skin: '#d6bca8',
    outfitMain: '#292524',
    outfitDark: '#171412',
    armor: '#78716c',
    accent: '#d97706',
    eye: '#fbbf24',
    weaponBlade: '#cbd5e1',
    weaponGlow: '#f59e0b',
    scale: 1.04,
    style: 'spearman',
  },
  tengu_archer: {
    skin: '#b91c1c',
    outfitMain: '#1e293b',
    outfitDark: '#0f172a',
    armor: '#475569',
    accent: '#ef4444',
    eye: '#fef08a',
    weaponBlade: '#f59e0b',
    weaponGlow: '#f97316',
    scale: 1.0,
    style: 'archer',
  },
  oni_brute: {
    skin: '#991b1b',
    outfitMain: '#27272a',
    outfitDark: '#18181b',
    armor: '#52525b',
    accent: '#f97316',
    eye: '#fde047',
    weaponBlade: '#71717a',
    weaponGlow: '#fb923c',
    scale: 1.22,
    style: 'oni',
  },
  cursed_kunoichi: {
    skin: '#e2c9be',
    outfitMain: '#3b0764',
    outfitDark: '#1e0536',
    armor: '#581c87',
    accent: '#ec4899',
    eye: '#f472b6',
    weaponBlade: '#f8fafc',
    weaponGlow: '#ec4899',
    scale: 0.95,
    style: 'kunoichi',
  },
  forest_warden: {
    skin: '#365314',
    outfitMain: '#1a2e05',
    outfitDark: '#0f1d04',
    armor: '#4d7c0f',
    accent: '#2dd4bf',
    eye: '#5eead4',
    weaponBlade: '#65a30d',
    weaponGlow: '#2dd4bf',
    scale: 1.25,
    style: 'golem',
  },
  blood_executioner: {
    skin: '#450a0a',
    outfitMain: '#1c1917',
    outfitDark: '#0c0a09',
    armor: '#7f1d1d',
    accent: '#dc2626',
    eye: '#fca5a5',
    weaponBlade: '#e5e7eb',
    weaponGlow: '#ef4444',
    scale: 1.22,
    style: 'executioner',
  },
  storm_kirin: {
    skin: '#cbd5e1',
    outfitMain: '#1e1b4b',
    outfitDark: '#0f0e2c',
    armor: '#6366f1',
    accent: '#facc15',
    eye: '#38bdf8',
    weaponBlade: '#e0f2fe',
    weaponGlow: '#a855f7',
    scale: 1.2,
    style: 'kirin',
  },
  kodama_overlord: {
    skin: '#d9f99d',
    outfitMain: '#14532d',
    outfitDark: '#052e16',
    armor: '#3f6212',
    accent: '#2dd4bf',
    eye: '#99f6e4',
    weaponBlade: '#84cc16',
    weaponGlow: '#2dd4bf',
    scale: 1.32,
    style: 'kodama',
  },
  ash_shogun: {
    skin: '#7c2d12',
    outfitMain: '#450a0a',
    outfitDark: '#1f0505',
    armor: '#9a3412',
    accent: '#fb923c',
    eye: '#fef08a',
    weaponBlade: '#fed7aa',
    weaponGlow: '#f97316',
    scale: 1.32,
    style: 'shogun',
  },
  raijin_sentinel: {
    skin: '#312e81',
    outfitMain: '#1e1b4b',
    outfitDark: '#09091f',
    armor: '#4338ca',
    accent: '#c084fc',
    eye: '#67e8f9',
    weaponBlade: '#e0e7ff',
    weaponGlow: '#a855f7',
    scale: 1.35,
    style: 'raijin',
  },
  temple_seraph: {
    skin: '#fef3c7',
    outfitMain: '#78350f',
    outfitDark: '#451a03',
    armor: '#eab308',
    accent: '#fde047',
    eye: '#38bdf8',
    weaponBlade: '#fef9c3',
    weaponGlow: '#facc15',
    scale: 1.35,
    style: 'seraph',
  },
  demon_lord_maou: {
    skin: '#4c0519',
    outfitMain: '#18050b',
    outfitDark: '#090204',
    armor: '#881337',
    accent: '#f43f5e',
    eye: '#fde047',
    weaponBlade: '#fda4af',
    weaponGlow: '#e11d48',
    scale: 1.42,
    style: 'maou',
  },
};

const FRAME_COUNT = 16;

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string,
  outline = '#090b10'
) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 3.2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function renderCharacterFrame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frameIdx: number,
  pal: CharacterPalette
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pal.scale, pal.scale);

  // Determine pose kinematics from frameIdx
  let bobY = 0;
  let lean = 0;
  let legSwing = 0;
  let armAngle = 0.25;
  let swordAngle = -0.5;
  let slashArc = 0;
  let scarfWave = Math.sin(frameIdx * 0.9) * 5;
  let hurtFlash = false;
  let deadCollapse = false;
  let guardPose = false;
  let skillAura = false;

  if (frameIdx === 0 || frameIdx === 1) {
    // idle
    bobY = frameIdx === 1 ? -2 : 0;
    armAngle = 0.35 + frameIdx * 0.08;
  } else if (frameIdx >= 2 && frameIdx <= 5) {
    // run 4-frame cycle
    const phase = (frameIdx - 2) * (Math.PI / 2);
    bobY = -Math.abs(Math.sin(phase)) * 5;
    lean = 0.2;
    legSwing = Math.sin(phase) * 14;
    armAngle = 0.6 + Math.cos(phase) * 0.35;
    swordAngle = 0.65;
    scarfWave = Math.sin(phase) * 8 - 4;
  } else if (frameIdx === 6 || frameIdx === 7) {
    // jump
    bobY = frameIdx === 6 ? -8 : -3;
    lean = frameIdx === 6 ? -0.08 : 0.12;
    legSwing = frameIdx === 6 ? 10 : -8;
    armAngle = -0.3;
    swordAngle = -0.9;
  } else if (frameIdx >= 8 && frameIdx <= 10) {
    // attack 3-frame
    const step = frameIdx - 8;
    lean = step === 0 ? -0.15 : 0.28;
    bobY = step === 1 ? 2 : 0;
    legSwing = step === 1 ? 11 : 4;
    armAngle = step === 0 ? -1.4 : step === 1 ? 0.55 : 1.05;
    swordAngle = step === 0 ? -2.0 : step === 1 ? 0.3 : 1.2;
    slashArc = step === 1 ? 1 : step === 2 ? 0.45 : 0;
  } else if (frameIdx === 11 || frameIdx === 12) {
    // skill
    skillAura = true;
    lean = 0.14;
    bobY = frameIdx === 11 ? -4 : 0;
    armAngle = -0.8;
    swordAngle = -0.15;
    slashArc = frameIdx === 12 ? 0.8 : 0;
  } else if (frameIdx === 13) {
    // guard
    guardPose = true;
    bobY = 3;
    armAngle = -0.6;
    swordAngle = -1.45;
  } else if (frameIdx === 14) {
    // hurt
    hurtFlash = true;
    lean = -0.26;
    bobY = -2;
    armAngle = 0.9;
  } else if (frameIdx === 15) {
    // death
    deadCollapse = true;
  }

  if (deadCollapse) {
    ctx.translate(0, 26);
    ctx.rotate(-Math.PI / 2.2);
    ctx.globalAlpha = 0.72;
  } else {
    ctx.translate(0, bobY);
    ctx.rotate(lean);
  }

  // Ground shadow
  if (!deadCollapse) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 34 - bobY, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss / Winged / Aura back silhouettes
  if (pal.style === 'seraph' || pal.style === 'maou' || pal.style === 'archer') {
    ctx.save();
    ctx.fillStyle = pal.style === 'seraph' ? 'rgba(250, 204, 21, 0.85)' : pal.style === 'maou' ? 'rgba(136, 19, 55, 0.92)' : pal.outfitDark;
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.quadraticCurveTo(-32 + side * 6, -34 + scarfWave * 0.4, -36, -6);
      ctx.quadraticCurveTo(-22, 2, -6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  if (pal.style === 'raijin') {
    // Floating lightning drum ring behind Raijin Sentinel
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -12, 28, Math.PI * 0.85, Math.PI * 2.15);
    ctx.stroke();
    for (let d = 0; d < 5; d++) {
      const a = Math.PI * (0.95 + d * 0.28);
      const dx = Math.cos(a) * 28;
      const dy = -12 + Math.sin(a) * 28;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Flowing anime scarf / cape behind torso
  if (pal.style === 'ninja' || pal.style === 'kunoichi' || pal.style === 'shogun' || pal.style === 'executioner' || pal.style === 'maou') {
    ctx.fillStyle = pal.accent;
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.quadraticCurveTo(-24, -14 + scarfWave, -36, -4 + scarfWave * 1.2);
    ctx.quadraticCurveTo(-24, 6 + scarfWave * 0.5, -5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Skill aura ring
  if (skillAura) {
    ctx.save();
    ctx.strokeStyle = pal.weaponGlow;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Back leg
  drawLimb(ctx, -4, 8, -7 - legSwing * 0.8, 30, 7.5, pal.outfitDark);
  // Front leg
  drawLimb(ctx, 4, 8, 7 + legSwing, 30, 8, pal.outfitMain);

  // Torso / Haori / Armor plate
  ctx.fillStyle = pal.outfitMain;
  ctx.strokeStyle = '#090b10';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-11, -15, 22, 26, 5);
  ctx.fill();
  ctx.stroke();

  // Chest armor / sash highlight
  ctx.fillStyle = pal.armor;
  ctx.beginPath();
  ctx.roundRect(-9, -13, 18, 13, 3);
  ctx.fill();

  ctx.fillStyle = pal.accent;
  ctx.fillRect(-10, 4, 20, 4);

  // Back arm
  drawLimb(ctx, -8, -10, -14, 4, 6.2, pal.outfitDark);

  // Head & Anime Face
  ctx.fillStyle = pal.style === 'ninja' || pal.style === 'kunoichi' ? pal.outfitDark : pal.skin;
  ctx.strokeStyle = '#090b10';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(1, -24, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face visor/skin slit for ninja & kunoichi
  if (pal.style === 'ninja' || pal.style === 'kunoichi' || pal.style === 'executioner') {
    ctx.fillStyle = pal.skin;
    ctx.fillRect(-2, -27, 11, 6);
  }

  // Glowing Anime Eyes
  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.ellipse(5.5, -24.5, 2.8, 1.5, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Distinct Headgear / Horns / Hats / Crowns
  if (pal.style === 'ninja') {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-9, -31, 20, 4);
  } else if (pal.style === 'spearman') {
    // Ronin Kasa straw hat
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -28);
    ctx.lineTo(1, -41);
    ctx.lineTo(22, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pal.style === 'oni' || pal.style === 'maou' || pal.style === 'stalker') {
    // Horns
    ctx.fillStyle = pal.style === 'maou' ? '#f43f5e' : '#f8fafc';
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -32);
    ctx.lineTo(-9, -45);
    ctx.lineTo(1, -34);
    ctx.moveTo(4, -32);
    ctx.lineTo(11, -45);
    ctx.lineTo(7, -34);
    ctx.fill();
    ctx.stroke();
  } else if (pal.style === 'shogun' || pal.style === 'kirin') {
    // Samurai Kabuto crest
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(-6, -33);
    ctx.lineTo(0, -45);
    ctx.lineTo(6, -33);
    ctx.closePath();
    ctx.fill();
  } else if (pal.style === 'kodama') {
    // Wooden Spirit Antlers
    ctx.strokeStyle = '#a3e635';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, -33);
    ctx.lineTo(-12, -46);
    ctx.moveTo(4, -33);
    ctx.lineTo(12, -46);
    ctx.stroke();
  } else if (pal.style === 'seraph') {
    // Golden Halo
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -39, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Front Arm + Weapon
  ctx.save();
  ctx.translate(6, -10);
  ctx.rotate(armAngle);
  drawLimb(ctx, 0, 0, 12, 4, 6.5, pal.outfitMain);

  ctx.translate(12, 4);
  ctx.rotate(swordAngle);

  // Render Weapon based on style
  if (pal.style === 'archer') {
    // Curved Tengu Bow
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 18, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  } else if (pal.style === 'oni') {
    // Heavy Iron Kanabo Club
    ctx.fillStyle = '#52525b';
    ctx.strokeStyle = '#090b10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-2, -32, 7, 34, 3);
    ctx.fill();
    ctx.stroke();
  } else if (pal.style === 'spearman' || pal.style === 'kirin' || pal.style === 'seraph') {
    // Long Yari Spear / Halberd
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.5, -18, 3, 44);
    ctx.fillStyle = pal.weaponBlade;
    ctx.beginPath();
    ctx.moveTo(-3, -18);
    ctx.lineTo(0, -38);
    ctx.lineTo(3, -18);
    ctx.closePath();
    ctx.fill();
  } else {
    // Curved Anime Katana / Odachi
    const len = pal.scale > 1.15 ? 42 : 34;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-4, -2, 8, 3);
    ctx.strokeStyle = pal.weaponGlow;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(3, -len * 0.5, 1, -len);
    ctx.stroke();

    ctx.strokeStyle = pal.weaponBlade;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(3, -len * 0.5, 1, -len);
    ctx.stroke();
  }
  ctx.restore();

  // Guard energy barrier
  if (guardPose) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(12, -4, 24, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  // Slash Crescent Arc Trail
  if (slashArc > 0) {
    ctx.save();
    ctx.globalAlpha = slashArc;
    ctx.strokeStyle = pal.weaponGlow;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(8, -4, 34, -Math.PI * 0.45, Math.PI * 0.35);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(8, -4, 34, -Math.PI * 0.4, Math.PI * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  // Hurt flash tint
  if (hurtFlash) {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.45)';
    ctx.beginPath();
    ctx.arc(0, -4, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function bakeAllGameTextures(scene: Phaser.Scene): void {
  const rigIds = Object.keys(RIG_PALETTES) as CharacterRigId[];
  for (const id of rigIds) {
    const texKey = `char_${id}`;
    if (scene.textures.exists(texKey)) continue;

    const pal = RIG_PALETTES[id];
    const isBoss = pal.scale >= 1.2;
    const frameW = isBoss ? 168 : 128;
    const frameH = isBoss ? 168 : 128;

    const canvasTex = scene.textures.createCanvas(texKey, frameW * FRAME_COUNT, frameH);
    if (!canvasTex) continue;
    const ctx = canvasTex.getContext();

    for (let f = 0; f < FRAME_COUNT; f++) {
      renderCharacterFrame(ctx, f * frameW + frameW / 2, frameH * 0.64, f, pal);
    }
    canvasTex.refresh();

    // Register frames on the CanvasTexture so Phaser can animate it as a spritesheet
    const texture = scene.textures.get(texKey);
    for (let f = 0; f < FRAME_COUNT; f++) {
      texture.add(f, 0, f * frameW, 0, frameW, frameH);
    }

    registerCharacterAnimations(scene, id, texKey);
  }

  bakeVfxAndEnvironmentTextures(scene);
}

function registerCharacterAnimations(scene: Phaser.Scene, id: string, texKey: string): void {
  const create = (name: string, frames: number[], frameRate: number, repeat: number) => {
    const animKey = `${id}_${name}`;
    if (scene.anims.exists(animKey)) return;
    scene.anims.create({
      key: animKey,
      frames: frames.map((frame) => ({ key: texKey, frame })),
      frameRate,
      repeat,
    });
  };

  create('idle', [0, 1], 4, -1);
  create('run', [2, 3, 4, 5], 12, -1);
  create('jump', [6, 7], 6, 0);
  create('attack', [8, 9, 10], 16, 0);
  create('skill', [11, 12], 12, 0);
  create('guard', [13], 10, -1);
  create('hurt', [14], 10, 0);
  create('death', [15], 8, 0);
}

function bakeVfxAndEnvironmentTextures(scene: Phaser.Scene): void {
  const makeCanvas = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const ct = scene.textures.createCanvas(key, w, h);
    if (!ct) return;
    draw(ct.getContext());
    ct.refresh();
  };

  // Shuriken
  makeCanvas('vfx_shuriken', 32, 32, (ctx) => {
    ctx.translate(16, 16);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, -13);
      ctx.lineTo(4, -3);
      ctx.lineTo(0, 0);
      ctx.lineTo(-4, -3);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Crimson / Enemy Projectile Orb
  makeCanvas('vfx_arrow', 36, 12, (ctx) => {
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 5, 28, 2);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(26, 2);
    ctx.lineTo(35, 6);
    ctx.lineTo(26, 10);
    ctx.closePath();
    ctx.fill();
  });

  makeCanvas('vfx_orb_enemy', 28, 28, (ctx) => {
    const grad = ctx.createRadialGradient(14, 14, 2, 14, 14, 13);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#f43f5e');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft Glow Particle
  makeCanvas('vfx_particle', 16, 16, (ctx) => {
    const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Checkpoint Shrine Lantern
  makeCanvas('prop_shrine', 64, 96, (ctx) => {
    ctx.fillStyle = '#475569';
    ctx.fillRect(22, 80, 20, 16);
    ctx.fillRect(28, 36, 8, 46);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(8, 36);
    ctx.lineTo(32, 16);
    ctx.lineTo(56, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, 42, 16, 20);
  });

  // Treasure Chest
  makeCanvas('prop_chest', 48, 40, (ctx) => {
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(4, 10, 40, 26, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(20, 16, 8, 10);
  });

  // Boss Level Exit Torii Portal
  makeCanvas('prop_portal', 88, 128, (ctx) => {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(14, 24, 10, 104);
    ctx.fillRect(64, 24, 10, 104);
    ctx.fillRect(4, 16, 80, 10);
    ctx.fillRect(10, 34, 68, 7);
    const grad = ctx.createRadialGradient(44, 78, 4, 44, 78, 34);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(44, 78, 22, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}
