import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { spawnFloatingText, spawnHitSparks } from '../combat/CombatEngine';
import { EnemyType } from '../types/game';

interface EnemyStatsConfig {
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  aggroRange: number;
  xpReward: number;
  goldReward: number;
  isRanged?: boolean;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyStatsConfig> = {
  shadow_stalker: {
    hp: 65,
    damage: 14,
    speed: 145,
    attackRange: 60,
    aggroRange: 340,
    xpReward: 28,
    goldReward: 18,
  },
  ronin_spearman: {
    hp: 92,
    damage: 18,
    speed: 112,
    attackRange: 84,
    aggroRange: 360,
    xpReward: 36,
    goldReward: 24,
  },
  tengu_archer: {
    hp: 60,
    damage: 16,
    speed: 85,
    attackRange: 360,
    aggroRange: 420,
    xpReward: 34,
    goldReward: 22,
    isRanged: true,
  },
  oni_brute: {
    hp: 155,
    damage: 26,
    speed: 82,
    attackRange: 76,
    aggroRange: 330,
    xpReward: 52,
    goldReward: 34,
  },
  cursed_kunoichi: {
    hp: 84,
    damage: 20,
    speed: 175,
    attackRange: 68,
    aggroRange: 390,
    xpReward: 44,
    goldReward: 28,
  },
};

export class EnemyEntity {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public isDead = false;

  private scene: Phaser.Scene;
  private cfg: EnemyStatsConfig;
  private levelScale: number;
  private originX: number;
  private patrolHalfWidth: number;
  private patrolDir: 1 | -1 = 1;

  private hurtTimer = 0;
  private attackCooldown = 0;
  private telegraphTimer = 0;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private hpBarFill: Phaser.GameObjects.Rectangle;

  private onMeleeHitPlayer: (damage: number, knockX: number) => void;
  private onFireProjectile: (x: number, y: number, vx: number, vy: number, damage: number) => void;
  private onEnemyDefeated: (xp: number, gold: number, x: number, y: number) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    patrolWidth: number,
    levelIndex: number,
    callbacks: {
      onMeleeHitPlayer: (damage: number, knockX: number) => void;
      onFireProjectile: (x: number, y: number, vx: number, vy: number, damage: number) => void;
      onEnemyDefeated: (xp: number, gold: number, x: number, y: number) => void;
    }
  ) {
    this.scene = scene;
    this.type = type;
    this.cfg = ENEMY_CONFIGS[type];
    this.levelScale = 1 + levelIndex * 0.28;
    this.originX = x;
    this.patrolHalfWidth = patrolWidth * 0.5;
    this.onMeleeHitPlayer = callbacks.onMeleeHitPlayer;
    this.onFireProjectile = callbacks.onFireProjectile;
    this.onEnemyDefeated = callbacks.onEnemyDefeated;

    this.maxHp = Math.round(this.cfg.hp * this.levelScale);
    this.hp = this.maxHp;

    this.sprite = scene.physics.add.sprite(x, y, `char_${type}`, 0);
    this.sprite.setDepth(18);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(38, 62);
    body.setOffset(45, 46);

    this.hpBarBg = scene.add.rectangle(x, y - 48, 44, 5, 0x090b10).setDepth(25).setVisible(false);
    this.hpBarFill = scene.add.rectangle(x, y - 48, 42, 3, 0xef4444).setDepth(26).setVisible(false);

    this.sprite.play(`${type}_idle`);
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (this.isDead) return;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.hpBarBg.setPosition(this.sprite.x, this.sprite.y - 48);
    this.hpBarFill.setPosition(this.sprite.x, this.sprite.y - 48);

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.sprite.play(`${this.type}_hurt`, true);
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);

    // Telegraphing attack before strike
    if (this.telegraphTimer > 0) {
      this.telegraphTimer -= dt;
      body.setVelocityX(0);
      this.sprite.setTint(0xfbbf24);
      if (this.telegraphTimer <= 0) {
        this.sprite.clearTint();
        this.executeAttack(playerX, playerY);
      }
      return;
    }

    if (dist <= this.cfg.aggroRange && Math.abs(dy) < 160) {
      const dir: 1 | -1 = dx >= 0 ? 1 : -1;
      this.sprite.setFlipX(dir === -1);

      if (dist <= this.cfg.attackRange) {
        body.setVelocityX(0);
        if (this.attackCooldown <= 0) {
          this.telegraphTimer = this.cfg.isRanged ? 0.38 : 0.28;
          this.attackCooldown = this.cfg.isRanged ? 1.85 : 1.25;
        } else {
          this.sprite.play(`${this.type}_idle`, true);
        }
      } else {
        body.setVelocityX(dir * this.cfg.speed);
        this.sprite.play(`${this.type}_run`, true);
      }
    } else {
      // Patrol
      if (this.sprite.x > this.originX + this.patrolHalfWidth) this.patrolDir = -1;
      if (this.sprite.x < this.originX - this.patrolHalfWidth) this.patrolDir = 1;
      this.sprite.setFlipX(this.patrolDir === -1);
      body.setVelocityX(this.patrolDir * this.cfg.speed * 0.55);
      this.sprite.play(`${this.type}_run`, true);
    }
  }

  private executeAttack(playerX: number, playerY: number): void {
    if (this.isDead) return;
    this.sprite.play(`${this.type}_attack`, true);
    const dmg = Math.round(this.cfg.damage * this.levelScale);

    if (this.cfg.isRanged) {
      const angle = Math.atan2(playerY - this.sprite.y, playerX - this.sprite.x);
      const speed = 420;
      this.onFireProjectile(
        this.sprite.x,
        this.sprite.y - 8,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        dmg
      );
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = Math.abs(playerY - this.sprite.y);
    if (Math.abs(dx) <= this.cfg.attackRange + 24 && dy < 72) {
      this.onMeleeHitPlayer(dmg, dx >= 0 ? 1 : -1);
    }
  }

  takeDamage(amount: number, isCrit: boolean, knockX: number, knockY: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.2;
    this.telegraphTimer = 0;
    this.sprite.clearTint();

    this.hpBarBg.setVisible(true);
    this.hpBarFill.setVisible(true);
    this.hpBarFill.width = Math.max(0, (this.hp / this.maxHp) * 42);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockX, knockY);

    spawnFloatingText(
      this.scene,
      this.sprite.x,
      this.sprite.y - 30,
      isCrit ? `${amount}!` : `${amount}`,
      isCrit ? '#facc15' : '#f8fafc',
      isCrit
    );
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, isCrit ? 0xfacc15 : 0xfb7185, 8);

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.sprite.play(`${this.type}_death`, true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setEnable(false);
    SoundEngine.playSfx('enemy_death');
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, 0xa855f7, 14);

    const xp = Math.round(this.cfg.xpReward * this.levelScale);
    const gold = Math.round(this.cfg.goldReward * this.levelScale);
    this.onEnemyDefeated(xp, gold, this.sprite.x, this.sprite.y);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 420,
      delay: 200,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
