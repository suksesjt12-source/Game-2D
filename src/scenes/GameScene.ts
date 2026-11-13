import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { BossEntity } from '../bosses/BossEntity';
import { spawnFloatingText, spawnHitSparks, triggerHitstop } from '../combat/CombatEngine';
import { t } from '../data/i18n';
import { LEVELS_DATA } from '../data/levelsData';
import { EnemyEntity } from '../enemies/EnemyEntity';
import { PlayerController, PlayerHitboxEvent } from '../entities/PlayerController';
import { bakeAllGameTextures } from '../sprites/SpriteSheetBaker';
import { computePlayerStats, getItemById } from '../systems/ProgressionSystem';
import {
  GameSettings,
  HudSnapshot,
  LevelClearSummary,
  LevelDefinition,
  PlayerProgress,
  VirtualInputState,
} from '../types/game';

export interface GameBridgeCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onAutoSave: (updatedStats: Partial<{
    kills: number;
    xpGained: number;
    goldGained: number;
    orbsGained: number;
    secretsFound: number;
    maxCombo: number;
    parries: number;
    bossDefeated: boolean;
    foundItemId?: string;
  }>) => void;
  onLevelComplete: (summary: LevelClearSummary) => void;
  onGameOver: () => void;
  onConsumePotion: () => boolean;
}

interface PooledProjectile extends Phaser.Physics.Arcade.Sprite {
  damage?: number;
  isCrit?: boolean;
  isPlayer?: boolean;
  lifeTimer?: number;
}

export class GameScene extends Phaser.Scene {
  private levelDef!: LevelDefinition;
  private progress!: PlayerProgress;
  private settings!: GameSettings;
  private callbacks!: GameBridgeCallbacks;

  private player!: PlayerController;
  private enemies: EnemyEntity[] = [];
  private miniBoss: BossEntity | null = null;
  private mainBoss: BossEntity | null = null;

  private platformsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hazardsList: { rect: Phaser.Geom.Rectangle; damage: number }[] = [];
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private pickupsGroup: {
    sprite: Phaser.GameObjects.Container;
    rect: Phaser.Geom.Rectangle;
    kind: string;
    itemId?: string;
    collected: boolean;
  }[] = [];

  private bgTile?: Phaser.GameObjects.TileSprite;
  private parallaxMid?: Phaser.GameObjects.Graphics;
  private weatherParticles: { obj: Phaser.GameObjects.Arc; vx: number; vy: number }[] = [];

  private checkpointSprite!: Phaser.GameObjects.Image;
  private checkpointActivated = false;
  private secretDiscovered = false;
  private bossArenaLocked = false;
  private arenaLeftWall?: Phaser.Physics.Arcade.Image;
  private exitPortal?: Phaser.GameObjects.Image;
  private levelCompletedFlag = false;

  private startTimeMs = 0;
  private levelKills = 0;
  private levelMaxCombo = 0;
  private secretsInLevel = 0;
  private bannerText: string | null = null;
  private bannerTimer = 0;

  private virtualInput: VirtualInputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jumpPressed: false,
    attackPressed: false,
    dashPressed: false,
    skillPressed: false,
    ultimatePressed: false,
    guardHeld: false,
  };

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
    l: Phaser.Input.Keyboard.Key;
    c: Phaser.Input.Keyboard.Key;
    u: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    i: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    h: Phaser.Input.Keyboard.Key;
  };

  private fpsAccumulator = 0;
  private hudEmitTimer = 0;
  private isPausedByUI = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: {
    levelIndex: number;
    progress: PlayerProgress;
    settings: GameSettings;
    callbacks: GameBridgeCallbacks;
  }): void {
    this.levelDef = LEVELS_DATA[data.levelIndex] ?? LEVELS_DATA[0];
    this.progress = data.progress;
    this.settings = data.settings;
    this.callbacks = data.callbacks;

    this.enemies = [];
    this.miniBoss = null;
    this.mainBoss = null;
    this.hazardsList = [];
    this.pickupsGroup = [];
    this.weatherParticles = [];
    this.checkpointActivated = false;
    this.secretDiscovered = false;
    this.bossArenaLocked = false;
    this.levelCompletedFlag = false;
    this.levelKills = 0;
    this.levelMaxCombo = 0;
    this.secretsInLevel = 0;
    this.isPausedByUI = false;
  }

  preload(): void {
    for (const lvl of LEVELS_DATA) {
      if (!this.textures.exists(lvl.bgKey)) {
        this.load.image(lvl.bgKey, lvl.bgImagePath);
      }
    }
  }

  create(): void {
    bakeAllGameTextures(this);
    this.startTimeMs = this.time.now;

    this.physics.world.setBounds(0, 0, this.levelDef.worldWidth, this.levelDef.worldHeight + 120);
    this.cameras.main.setBounds(0, 0, this.levelDef.worldWidth, this.levelDef.worldHeight);
    this.cameras.main.fadeIn(380, 8, 10, 15);

    this.buildParallaxAndAtmosphere();
    this.buildPlatformsAndHazards();
    this.buildProjectiles();
    this.buildCheckpointAndPickups();
    this.buildPlayer();
    this.buildEnemiesAndBosses();
    this.setupKeyboard();

    this.cameras.main.startFollow(this.player.sprite, true, 0.11, 0.11, -70, 40);

    SoundEngine.setMusicMood('explore');
    this.showBanner(
      this.settings.language === 'id' ? this.levelDef.nameId : this.levelDef.nameEn,
      2.6
    );
  }

  public setVirtualInput(next: Partial<VirtualInputState>): void {
    Object.assign(this.virtualInput, next);
  }

  public pulseVirtualAction(
    action: 'jumpPressed' | 'attackPressed' | 'dashPressed' | 'skillPressed' | 'ultimatePressed'
  ): void {
    this.virtualInput[action] = true;
  }

  public updateProgressAndSettings(progress: PlayerProgress, settings: GameSettings): void {
    this.progress = progress;
    this.settings = settings;
    if (this.player) {
      this.player.refreshStats(computePlayerStats(progress));
    }
  }

  public setPausedState(paused: boolean): void {
    this.isPausedByUI = paused;
    if (paused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  public respawnPlayerAtCheckpoint(): void {
    if (!this.player) return;
    const rx = this.checkpointActivated ? this.levelDef.checkpointX : this.levelDef.spawnX;
    const ry = this.checkpointActivated ? this.levelDef.checkpointY - 40 : this.levelDef.spawnY;
    this.player.respawnAt(rx, ry);
    this.isPausedByUI = false;
    this.physics.world.resume();
    SoundEngine.setMusicMood(this.bossArenaLocked ? 'boss' : 'explore');
  }

  public tryUsePotion(): void {
    if (!this.player || this.player.isDead) return;
    if (this.callbacks.onConsumePotion()) {
      this.player.heal(85, 35);
      SoundEngine.playSfx('pickup');
    }
  }

  private showBanner(text: string, duration = 2.2): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  private buildParallaxAndAtmosphere(): void {
    const camW = 1280;
    const camH = 720;

    if (this.textures.exists(this.levelDef.bgKey)) {
      this.bgTile = this.add
        .tileSprite(camW / 2, camH / 2, camW, camH, this.levelDef.bgKey)
        .setScrollFactor(0)
        .setDepth(0);
      const texImg = this.textures.get(this.levelDef.bgKey).getSourceImage() as HTMLImageElement;
      if (texImg && texImg.width > 0) {
        const scaleY = camH / texImg.height;
        this.bgTile.setTileScale(scaleY, scaleY);
      }
    } else {
      this.add.rectangle(camW / 2, camH / 2, camW, camH, 0x0b0f19).setScrollFactor(0).setDepth(0);
    }

    // Subtle atmospheric contrast scrim for crisp character readability
    this.add
      .rectangle(camW / 2, camH / 2, camW, camH, 0x05070d, 0.24)
      .setScrollFactor(0)
      .setDepth(1);

    // Midground dark fantasy silhouette pillars/trees
    this.parallaxMid = this.add.graphics().setDepth(3).setScrollFactor(0.45);
    this.parallaxMid.fillStyle(0x090d16, 0.52);
    for (let x = 0; x < this.levelDef.worldWidth; x += 260) {
      const h = 160 + ((x * 37) % 140);
      this.parallaxMid.fillRect(x, 720 - h, 46, h);
      this.parallaxMid.fillTriangle(x - 24, 720 - h + 30, x + 23, 720 - h - 45, x + 70, 720 - h + 30);
    }

    // Weather particles based on graphics quality
    const count =
      this.settings.graphicsQuality === 'high'
        ? 45
        : this.settings.graphicsQuality === 'medium'
        ? 24
        : 10;
    const colorMap: Record<LevelDefinition['weather'], number> = {
      fireflies: 0x2dd4bf,
      embers: 0xf97316,
      storm: 0xc084fc,
      runes: 0xfacc15,
      ash: 0xf43f5e,
    };
    const pColor = colorMap[this.levelDef.weather];
    for (let i = 0; i < count; i++) {
      const orb = this.add
        .circle(Math.random() * 1280, Math.random() * 720, 1.5 + Math.random() * 2.2, pColor, 0.65)
        .setScrollFactor(0)
        .setDepth(35);
      this.weatherParticles.push({
        obj: orb,
        vx: this.levelDef.weather === 'storm' ? -180 - Math.random() * 90 : -20 - Math.random() * 30,
        vy:
          this.levelDef.weather === 'embers'
            ? -25 - Math.random() * 35
            : this.levelDef.weather === 'storm'
            ? 240 + Math.random() * 120
            : 15 + Math.random() * 25,
      });
    }
  }

  private buildPlatformsAndHazards(): void {
    this.platformsGroup = this.physics.add.staticGroup();
    const gfx = this.add.graphics().setDepth(10);

    for (const plat of this.levelDef.platforms) {
      const zone = this.add.zone(
        plat.x + plat.width / 2,
        plat.y + plat.height / 2,
        plat.width,
        plat.height
      );
      this.physics.add.existing(zone, true);
      this.platformsGroup.add(zone);

      // Detailed anime terrain rendering
      if (plat.kind === 'ground' || plat.kind === 'stone') {
        gfx.fillStyle(0x111520, 1);
        gfx.fillRect(plat.x, plat.y, plat.width, plat.height);
        gfx.fillStyle(0x1e293b, 1);
        gfx.fillRect(plat.x, plat.y, plat.width, 16);
        // Accent rim moss/crimson/gold edge
        const rimColor = Phaser.Display.Color.HexStringToColor(this.levelDef.accentColor).color;
        gfx.fillStyle(rimColor, 0.72);
        gfx.fillRect(plat.x, plat.y, plat.width, 4);
        // Stone brick joints
        gfx.lineStyle(1, 0x334155, 0.45);
        for (let bx = plat.x + 48; bx < plat.x + plat.width; bx += 48) {
          gfx.lineBetween(bx, plat.y + 4, bx, plat.y + Math.min(plat.height, 44));
        }
      } else if (plat.kind === 'wood' || plat.kind === 'bridge') {
        gfx.fillStyle(0x451a03, 1);
        gfx.fillRect(plat.x, plat.y, plat.width, plat.height);
        gfx.fillStyle(0x78350f, 1);
        gfx.fillRect(plat.x, plat.y, plat.width, 8);
        gfx.lineStyle(2, 0x090b10, 0.8);
        gfx.strokeRect(plat.x, plat.y, plat.width, plat.height);
      }
    }

    // Hazards
    const hazGfx = this.add.graphics().setDepth(12);
    for (const haz of this.levelDef.hazards) {
      this.hazardsList.push({
        rect: new Phaser.Geom.Rectangle(haz.x, haz.y, haz.width, haz.height),
        damage: haz.damage,
      });

      if (haz.kind === 'spikes') {
        hazGfx.fillStyle(0x94a3b8, 1);
        const toothW = 14;
        for (let sx = haz.x; sx < haz.x + haz.width - 4; sx += toothW) {
          hazGfx.fillTriangle(sx, haz.y + haz.height, sx + toothW / 2, haz.y, sx + toothW, haz.y + haz.height);
        }
      } else if (haz.kind === 'lava_vent') {
        hazGfx.fillStyle(0xea580c, 0.9);
        hazGfx.fillRect(haz.x, haz.y + 8, haz.width, haz.height - 8);
        hazGfx.fillStyle(0xfef08a, 0.85);
        hazGfx.fillRect(haz.x + 4, haz.y + 4, haz.width - 8, 6);
      } else {
        // Cursed Totem / Lightning Pillar
        hazGfx.fillStyle(0x334155, 1);
        hazGfx.fillRect(haz.x + 8, haz.y + 8, haz.width - 16, haz.height - 8);
        hazGfx.fillStyle(haz.kind === 'lightning_pillar' ? 0xc084fc : 0xf43f5e, 0.95);
        hazGfx.fillCircle(haz.x + haz.width / 2, haz.y + 12, 10);
      }
    }
  }

  private buildProjectiles(): void {
    this.playerProjectiles = this.physics.add.group({ allowGravity: false, maxSize: 24 });
    this.enemyProjectiles = this.physics.add.group({ allowGravity: false, maxSize: 32 });
  }

  private buildCheckpointAndPickups(): void {
    this.checkpointSprite = this.add
      .image(this.levelDef.checkpointX, this.levelDef.checkpointY + 32, 'prop_shrine')
      .setDepth(14)
      .setTint(0x64748b);

    for (const p of this.levelDef.pickups) {
      const container = this.add.container(p.x, p.y).setDepth(15);
      if (p.kind === 'secret_chest') {
        container.add(this.add.image(0, 0, 'prop_chest'));
      } else {
        const col =
          p.kind === 'health_orb' ? 0x4ade80 : p.kind === 'energy_orb' ? 0x38bdf8 : 0xfacc15;
        const orb = this.add.circle(0, 0, 10, col, 0.95);
        const halo = this.add.circle(0, 0, 16, col, 0.25);
        container.add([halo, orb]);
      }

      this.tweens.add({
        targets: container,
        y: p.y - 6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.pickupsGroup.push({
        sprite: container,
        rect: new Phaser.Geom.Rectangle(p.x - 22, p.y - 22, 44, 44),
        kind: p.kind,
        itemId: p.itemId,
        collected: false,
      });
    }
  }

  private buildPlayer(): void {
    const stats = computePlayerStats(this.progress);
    this.player = new PlayerController(
      this,
      this.levelDef.spawnX,
      this.levelDef.spawnY,
      stats,
      {
        onAttackHitbox: (evt) => this.handlePlayerHitbox(evt),
        onProjectileSpawn: (x, y, vx, vy, dmg, isCrit) =>
          this.spawnPlayerShuriken(x, y, vx, vy, dmg, isCrit),
        onDeath: () => {
          SoundEngine.setMusicMood('none');
          this.time.delayedCall(800, () => {
            this.setPausedState(true);
            this.callbacks.onGameOver();
          });
        },
        onParrySuccess: () => {
          this.callbacks.onAutoSave({ parries: 1 });
        },
      }
    );

    this.physics.add.collider(this.player.sprite, this.platformsGroup);
  }

  private buildEnemiesAndBosses(): void {
    const lang = this.settings.language;

    for (const spawn of this.levelDef.enemies) {
      const enemy = new EnemyEntity(
        this,
        spawn.x,
        spawn.y,
        spawn.type,
        spawn.patrolWidth,
        this.levelDef.index,
        {
          onMeleeHitPlayer: (dmg, knockX) => {
            this.player.receiveDamage(dmg, knockX);
          },
          onFireProjectile: (x, y, vx, vy, dmg) => {
            this.spawnEnemyProjectile(x, y, vx, vy, dmg, 'vfx_arrow');
          },
          onEnemyDefeated: (xp, gold, ex, ey) => {
            this.levelKills += 1;
            spawnFloatingText(this, ex, ey - 16, `+${xp} XP · +${gold}`, '#facc15');
            this.callbacks.onAutoSave({ kills: 1, xpGained: xp, goldGained: gold, orbsGained: 1 });
          },
        }
      );
      this.physics.add.collider(enemy.sprite, this.platformsGroup);
      this.enemies.push(enemy);
    }

    // Mini-Boss
    const mb = this.levelDef.miniBoss;
    this.miniBoss = new BossEntity(
      this,
      mb.x,
      mb.y,
      mb.type,
      lang === 'id' ? mb.nameId : mb.nameEn,
      t(lang, 'minibossIncoming'),
      true,
      {
        onHitPlayer: (dmg, knockX) => this.player.receiveDamage(dmg, knockX),
        onFireProjectile: (x, y, vx, vy, dmg) =>
          this.spawnEnemyProjectile(x, y, vx, vy, dmg, 'vfx_orb_enemy'),
        onBossDefeated: (boss) => {
          this.levelKills += 1;
          this.callbacks.onAutoSave({
            kills: 1,
            xpGained: boss.xpReward,
            goldGained: boss.goldReward,
            orbsGained: 4,
          });
          SoundEngine.setMusicMood('explore');
        },
      }
    );
    this.physics.add.collider(this.miniBoss.sprite, this.platformsGroup);

    // Main Boss
    const b = this.levelDef.boss;
    this.mainBoss = new BossEntity(
      this,
      b.x,
      b.y,
      b.type,
      lang === 'id' ? b.nameId : b.nameEn,
      lang === 'id' ? b.titleId : b.titleEn,
      false,
      {
        onHitPlayer: (dmg, knockX) => this.player.receiveDamage(dmg, knockX),
        onFireProjectile: (x, y, vx, vy, dmg) =>
          this.spawnEnemyProjectile(x, y, vx, vy, dmg, 'vfx_orb_enemy'),
        onBossDefeated: (boss) => {
          this.levelKills += 1;
          this.callbacks.onAutoSave({
            kills: 1,
            xpGained: boss.xpReward,
            goldGained: boss.goldReward,
            orbsGained: 10,
            bossDefeated: true,
          });
          this.spawnLevelExitPortal(boss.sprite.x, 515);
        },
      }
    );
    this.physics.add.collider(this.mainBoss.sprite, this.platformsGroup);
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      j: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      k: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      l: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      c: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      u: kb.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      i: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      h: kb.addKey(Phaser.Input.Keyboard.KeyCodes.H),
    };
  }

  private handlePlayerHitbox(evt: PlayerHitboxEvent): void {
    let anyHit = false;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const eBounds = enemy.sprite.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(evt.rect, eBounds)) {
        enemy.takeDamage(evt.damage, evt.isCritical, evt.knockbackX, evt.knockbackY);
        anyHit = true;
      }
    }

    if (this.miniBoss && !this.miniBoss.isDead) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(evt.rect, this.miniBoss.sprite.getBounds())) {
        this.miniBoss.takeDamage(evt.damage, evt.isCritical, evt.knockbackX);
        anyHit = true;
      }
    }

    if (this.mainBoss && !this.mainBoss.isDead) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(evt.rect, this.mainBoss.sprite.getBounds())) {
        this.mainBoss.takeDamage(evt.damage, evt.isCritical, evt.knockbackX);
        anyHit = true;
      }
    }

    if (anyHit) {
      this.player.registerHitConfirmed();
      if (this.player.comboCount > this.levelMaxCombo) {
        this.levelMaxCombo = this.player.comboCount;
        this.callbacks.onAutoSave({ maxCombo: this.levelMaxCombo });
      }
      if (evt.isHeavy || evt.isCritical) {
        this.cameras.main.shake(90, 0.006);
        triggerHitstop(this, 36);
      }
    }
  }

  private spawnPlayerShuriken(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    isCrit: boolean
  ): void {
    const proj = this.playerProjectiles.get(x, y, 'vfx_shuriken') as PooledProjectile | null;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(24);
    (proj.body as Phaser.Physics.Arcade.Body).setEnable(true);
    proj.setVelocity(vx, vy);
    proj.setAngularVelocity(720);
    proj.damage = damage;
    proj.isCrit = isCrit;
    proj.isPlayer = true;
    proj.lifeTimer = 1.4;
  }

  private spawnEnemyProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    texKey: string
  ): void {
    const proj = this.enemyProjectiles.get(x, y, texKey) as PooledProjectile | null;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(24);
    (proj.body as Phaser.Physics.Arcade.Body).setEnable(true);
    proj.setVelocity(vx, vy);
    proj.setRotation(Math.atan2(vy, vx));
    proj.damage = damage;
    proj.isPlayer = false;
    proj.lifeTimer = 2.6;
  }

  private spawnLevelExitPortal(x: number, y: number): void {
    if (this.exitPortal) return;
    const clampedX = Phaser.Math.Clamp(x, this.levelDef.bossArenaX + 120, this.levelDef.worldWidth - 110);
    this.exitPortal = this.add.image(clampedX, y, 'prop_portal').setDepth(16).setAlpha(0);
    this.tweens.add({
      targets: this.exitPortal,
      alpha: 1,
      duration: 500,
    });
    this.showBanner(t(this.settings.language, 'victoryTitle'), 2.5);
  }

  update(_time: number, deltaMs: number): void {
    if (this.isPausedByUI) return;

    // 60 FPS / 30 FPS Fallback throttling
    if (this.settings.fpsLimit === 30) {
      this.fpsAccumulator += deltaMs;
      if (this.fpsAccumulator < 31) return;
      deltaMs = this.fpsAccumulator;
      this.fpsAccumulator = 0;
    }

    const dt = Math.min(0.05, deltaMs / 1000);

    // Parallax scroll & weather
    if (this.bgTile) {
      this.bgTile.tilePositionX = this.cameras.main.scrollX * 0.25;
    }
    for (const wp of this.weatherParticles) {
      wp.obj.x += wp.vx * dt;
      wp.obj.y += wp.vy * dt;
      if (wp.obj.x < 0) wp.obj.x = 1280;
      if (wp.obj.y > 720) wp.obj.y = 0;
      if (wp.obj.y < 0) wp.obj.y = 720;
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }

    // Merge Keyboard + Virtual Touch Controls
    const merged = this.collectMergedInput();
    this.player.update(dt, merged, this.settings.controlSensitivity);

    // Clear one-shot pulses
    this.virtualInput.jumpPressed = false;
    this.virtualInput.attackPressed = false;
    this.virtualInput.dashPressed = false;
    this.virtualInput.skillPressed = false;
    this.virtualInput.ultimatePressed = false;

    // Fall into abyss check
    if (this.player.sprite.y > this.levelDef.worldHeight + 40 && !this.player.isDead) {
      this.player.receiveDamage(9999, 0);
    }

    // Update enemies
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    let nearbyBattle = false;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      enemy.update(dt, px, py);
      if (Math.abs(enemy.sprite.x - px) < 420) nearbyBattle = true;
    }

    // Mini-boss trigger
    if (this.miniBoss && !this.miniBoss.isDead) {
      if (!this.miniBoss.active && Math.abs(px - this.miniBoss.sprite.x) < 420) {
        this.miniBoss.active = true;
        this.showBanner(`${t(this.settings.language, 'minibossIncoming')}: ${this.miniBoss.name}`, 2.5);
        SoundEngine.setMusicMood('boss');
      }
      this.miniBoss.update(dt, px, py);
    }

    // Main Boss Arena trigger
    if (this.mainBoss && !this.mainBoss.isDead) {
      if (!this.bossArenaLocked && px >= this.levelDef.bossArenaX) {
        this.bossArenaLocked = true;
        this.mainBoss.active = true;
        SoundEngine.setMusicMood('boss');
        this.showBanner(`${t(this.settings.language, 'bossIncoming')}: ${this.mainBoss.name}`, 3.0);

        // Seal boss arena left edge so player fights cleanly inside
        const wall = this.add.zone(this.levelDef.bossArenaX - 24, 360, 32, 720);
        this.physics.add.existing(wall, true);
        this.arenaLeftWall = wall as unknown as Phaser.Physics.Arcade.Image;
        this.physics.add.collider(this.player.sprite, this.arenaLeftWall);
      }
      this.mainBoss.update(dt, px, py);
    }

    // Dynamic music mood switching
    if (
      (!this.mainBoss || !this.mainBoss.active || this.mainBoss.isDead) &&
      (!this.miniBoss || !this.miniBoss.active || this.miniBoss.isDead)
    ) {
      SoundEngine.setMusicMood(nearbyBattle ? 'battle' : 'explore');
    }

    this.updateProjectiles(dt);
    this.checkHazardsAndTriggers();

    // Exit Portal trigger
    if (this.exitPortal && !this.levelCompletedFlag) {
      const distPortal = Math.hypot(px - this.exitPortal.x, py - this.exitPortal.y);
      if (distPortal < 78) {
        this.completeLevel();
      }
    }

    // Emit HUD snapshot ~20Hz for smooth React HUD without GC churn
    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.05) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private collectMergedInput(): VirtualInputState {
    let kbMoveX = 0;
    if (this.keys) {
      if (this.keys.left.isDown || this.keys.a.isDown) kbMoveX -= 1;
      if (this.keys.right.isDown || this.keys.d.isDown) kbMoveX += 1;
      if (Phaser.Input.Keyboard.JustDown(this.keys.h)) {
        this.tryUsePotion();
      }
    }

    const moveX = Math.abs(this.virtualInput.moveX) > 0.05 ? this.virtualInput.moveX : kbMoveX;
    const sprint = this.virtualInput.sprint || (this.keys?.shift.isDown ?? false);

    const jumpPressed =
      this.virtualInput.jumpPressed ||
      (this.keys ? Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.space) : false);
    const attackPressed =
      this.virtualInput.attackPressed ||
      (this.keys ? Phaser.Input.Keyboard.JustDown(this.keys.j) || Phaser.Input.Keyboard.JustDown(this.keys.z) : false);
    const dashPressed =
      this.virtualInput.dashPressed ||
      (this.keys ? Phaser.Input.Keyboard.JustDown(this.keys.k) || Phaser.Input.Keyboard.JustDown(this.keys.x) : false);
    const skillPressed =
      this.virtualInput.skillPressed ||
      (this.keys ? Phaser.Input.Keyboard.JustDown(this.keys.u) || Phaser.Input.Keyboard.JustDown(this.keys.q) : false);
    const ultimatePressed =
      this.virtualInput.ultimatePressed ||
      (this.keys ? Phaser.Input.Keyboard.JustDown(this.keys.i) || Phaser.Input.Keyboard.JustDown(this.keys.e) : false);
    const guardHeld =
      this.virtualInput.guardHeld || (this.keys ? this.keys.l.isDown || this.keys.c.isDown : false);

    return {
      moveX,
      moveY: this.virtualInput.moveY,
      sprint,
      jumpPressed,
      attackPressed,
      dashPressed,
      skillPressed,
      ultimatePressed,
      guardHeld,
    };
  }

  private updateProjectiles(dt: number): void {
    const deactivate = (p: PooledProjectile) => {
      p.setActive(false).setVisible(false);
      (p.body as Phaser.Physics.Arcade.Body).setEnable(false);
      p.setVelocity(0, 0);
    };

    for (const obj of this.playerProjectiles.getChildren()) {
      const p = obj as PooledProjectile;
      if (!p.active) continue;
      p.lifeTimer = (p.lifeTimer ?? 1) - dt;
      if (p.lifeTimer <= 0) {
        deactivate(p);
        continue;
      }
      const pBounds = p.getBounds();
      let hitSomething = false;
      for (const e of this.enemies) {
        if (!e.isDead && Phaser.Geom.Intersects.RectangleToRectangle(pBounds, e.sprite.getBounds())) {
          e.takeDamage(p.damage ?? 20, Boolean(p.isCrit), p.body!.velocity.x > 0 ? 120 : -120, -60);
          this.player.registerHitConfirmed();
          deactivate(p);
          hitSomething = true;
          break;
        }
      }
      if (hitSomething) continue;
      for (const boss of [this.miniBoss, this.mainBoss]) {
        if (boss && !boss.isDead && Phaser.Geom.Intersects.RectangleToRectangle(pBounds, boss.sprite.getBounds())) {
          boss.takeDamage(p.damage ?? 20, Boolean(p.isCrit), p.body!.velocity.x > 0 ? 80 : -80);
          this.player.registerHitConfirmed();
          deactivate(p);
          break;
        }
      }
    }

    const playerBounds = this.player.sprite.getBounds();
    for (const obj of this.enemyProjectiles.getChildren()) {
      const p = obj as PooledProjectile;
      if (!p.active) continue;
      p.lifeTimer = (p.lifeTimer ?? 2) - dt;
      if (p.lifeTimer <= 0) {
        deactivate(p);
        continue;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), playerBounds)) {
        const res = this.player.receiveDamage(p.damage ?? 15, p.body!.velocity.x >= 0 ? 1 : -1);
        if (res.parried) {
          spawnHitSparks(this, p.x, p.y, 0x38bdf8, 8);
        }
        deactivate(p);
      }
    }
  }

  private checkHazardsAndTriggers(): void {
    const pBounds = this.player.sprite.getBounds();

    // Environmental hazards
    for (const h of this.hazardsList) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(pBounds, h.rect)) {
        this.player.receiveDamage(h.damage, this.player.facing * -1);
      }
    }

    // Shrine Checkpoint
    if (!this.checkpointActivated && Math.abs(this.player.sprite.x - this.levelDef.checkpointX) < 64) {
      this.checkpointActivated = true;
      this.checkpointSprite.setTint(0x38bdf8);
      this.player.heal(Math.round(this.player.stats.maxHp * 0.5), 50);
      SoundEngine.playSfx('level_up');
      this.showBanner(t(this.settings.language, 'checkpointNotice'), 2.6);
      this.callbacks.onAutoSave({});
    }

    // Secret Zone
    if (!this.secretDiscovered) {
      const sz = this.levelDef.secretZone;
      const secretRect = new Phaser.Geom.Rectangle(sz.x, sz.y, sz.width, sz.height);
      if (Phaser.Geom.Intersects.RectangleToRectangle(pBounds, secretRect)) {
        this.secretDiscovered = true;
        this.secretsInLevel += 1;
        SoundEngine.playSfx('level_up');
        this.showBanner(t(this.settings.language, 'secretNotice'), 2.6);
        this.callbacks.onAutoSave({ secretsFound: 1, goldGained: 90, xpGained: 80 });
      }
    }

    // Pickups & Secret Chests
    for (const item of this.pickupsGroup) {
      if (item.collected) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(pBounds, item.rect)) {
        item.collected = true;
        item.sprite.destroy();
        SoundEngine.playSfx('pickup');

        if (item.kind === 'health_orb') {
          this.player.heal(55, 0);
        } else if (item.kind === 'energy_orb') {
          this.player.heal(0, 45);
        } else if (item.kind === 'gold_cache') {
          spawnFloatingText(this, this.player.sprite.x, this.player.sprite.y - 28, '+75 Ryo', '#facc15');
          this.callbacks.onAutoSave({ goldGained: 75 });
        } else if (item.kind === 'secret_chest') {
          const foundItem = item.itemId ? getItemById(item.itemId) : undefined;
          const label = foundItem
            ? this.settings.language === 'id'
              ? foundItem.nameId
              : foundItem.nameEn
            : '+150 Ryo';
          spawnFloatingText(this, this.player.sprite.x, this.player.sprite.y - 34, label, '#facc15', true);
          this.callbacks.onAutoSave({ goldGained: 120, foundItemId: item.itemId });
        }
      }
    }
  }

  private completeLevel(): void {
    this.levelCompletedFlag = true;
    this.setPausedState(true);
    SoundEngine.playSfx('level_up');
    SoundEngine.setMusicMood('menu');

    const elapsedSec = Math.max(1, Math.round((this.time.now - this.startTimeMs) / 1000));
    const rank: 'S' | 'A' | 'B' =
      elapsedSec < 160 && this.levelMaxCombo >= 8 ? 'S' : elapsedSec < 260 ? 'A' : 'B';

    this.callbacks.onLevelComplete({
      levelIndex: this.levelDef.index,
      levelName: this.settings.language === 'id' ? this.levelDef.nameId : this.levelDef.nameEn,
      timeSeconds: elapsedSec,
      kills: this.levelKills,
      maxCombo: this.levelMaxCombo,
      secretsFound: this.secretsInLevel,
      rewardGold: this.levelDef.rewardGold,
      rewardXp: this.levelDef.rewardXp,
      rank,
    });
  }

  private emitHud(): void {
    const activeBoss =
      this.mainBoss && this.mainBoss.active && !this.mainBoss.isDead
        ? this.mainBoss
        : this.miniBoss && this.miniBoss.active && !this.miniBoss.isDead
        ? this.miniBoss
        : null;

    const potionsCount =
      this.progress.inventory.find((i) => i.itemId === 'potion_vitality')?.quantity ?? 0;

    this.callbacks.onHudUpdate({
      hp: Math.round(this.player.hp),
      maxHp: this.player.stats.maxHp,
      energy: Math.round(this.player.energy),
      maxEnergy: this.player.stats.maxEnergy,
      xp: this.progress.xp,
      xpToNext: this.progress.xpToNext,
      level: this.progress.characterLevel,
      gold: this.progress.gold,
      combo: this.player.comboCount,
      comboTimerRatio: Math.max(0, this.player.comboTimer / 3.2),
      skillCooldown: this.player.skillCooldown,
      skillMaxCooldown: this.player.skillMaxCooldown,
      dashCooldown: this.player.dashCooldown,
      dashMaxCooldown: this.player.dashMaxCooldown,
      ultimateCharge: Math.round(this.player.ultimateCharge),
      isGuarding: this.player.isGuarding,
      bossActive: Boolean(activeBoss),
      bossName: activeBoss ? activeBoss.name : '',
      bossTitle: activeBoss ? activeBoss.title : '',
      bossHp: activeBoss ? activeBoss.hp : 0,
      bossMaxHp: activeBoss ? activeBoss.maxHp : 1,
      bossPhase: activeBoss ? activeBoss.phase : 1,
      isMiniBoss: activeBoss ? activeBoss.isMiniBoss : false,
      levelIndex: this.levelDef.index,
      levelName: this.settings.language === 'id' ? this.levelDef.nameId : this.levelDef.nameEn,
      checkpointReached: this.checkpointActivated,
      secretsFoundInLevel: this.secretsInLevel,
      fps: Math.round(this.game.loop.actualFps),
      bannerText: this.bannerText,
      potionsCount,
    });
  }
}
