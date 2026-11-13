import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { spawnFloatingText, spawnHitSparks } from '../combat/CombatEngine';
import { BossType, MiniBossType } from '../types/game';

export type AnyBossType = MiniBossType | BossType;

interface BossProfile {
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  xpReward: number;
  goldReward: number;
}

const BOSS_PROFILES: Record<AnyBossType, BossProfile> = {
  forest_warden: { hp: 420, damage: 22, speed: 105, attackRange: 95, xpReward: 130, goldReward: 120 },
  blood_executioner: { hp: 560, damage: 28, speed: 135, attackRange: 105, xpReward: 180, goldReward: 165 },
  storm_kirin: { hp: 680, damage: 32, speed: 155, attackRange: 105, xpReward: 220, goldReward: 210 },
  kodama_overlord: { hp: 780, damage: 26, speed: 125, attackRange: 112, xpReward: 260, goldReward: 250 },
  ash_shogun: { hp: 1050, damage: 32, speed: 145, attackRange: 118, xpReward: 360, goldReward: 340 },
  raijin_sentinel: { hp: 1320, damage: 36, speed: 150, attackRange: 118, xpReward: 480, goldReward: 440 },
  temple_seraph: { hp: 1620, damage: 42, speed: 160, attackRange: 125, xpReward: 620, goldReward: 560 },
  demon_lord_maou: { hp: 2150, damage: 48, speed: 175, attackRange: 132, xpReward: 1000, goldReward: 950 },
};

export class BossEntity {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public type: AnyBossType;
  public name: string;
  public title: string;
  public isMiniBoss: boolean;
  public hp: number;
  public maxHp: number;
  public phase: 1 | 2 = 1;
  public isDead = false;
  public active = false;

  private scene: Phaser.Scene;
  private profile: BossProfile;
  private actionTimer = 0.8;
  private hurtFlashTimer = 0;
  private isLunging = false;
  private lungeTimer = 0;
  private lungeDir: 1 | -1 = 1;

  private onHitPlayer: (damage: number, knockX: number) => void;
  private onFireProjectile: (x: number, y: number, vx: number, vy: number, damage: number) => void;
  private onBossDefeated: (boss: BossEntity) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: AnyBossType,
    name: string,
    title: string,
    isMiniBoss: boolean,
    callbacks: {
      onHitPlayer: (damage: number, knockX: number) => void;
      onFireProjectile: (x: number, y: number, vx: number, vy: number, damage: number) => void;
      onBossDefeated: (boss: BossEntity) => void;
    }
  ) {
    this.scene = scene;
    this.type = type;
    this.name = name;
    this.title = title;
    this.isMiniBoss = isMiniBoss;
    this.profile = BOSS_PROFILES[type];
    this.maxHp = this.profile.hp;
    this.hp = this.maxHp;

    this.onHitPlayer = callbacks.onHitPlayer;
    this.onFireProjectile = callbacks.onFireProjectile;
    this.onBossDefeated = callbacks.onBossDefeated;

    this.sprite = scene.physics.add.sprite(x, y, `char_${type}`, 0);
    this.sprite.setDepth(21);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(62, 92);
    body.setOffset(53, 52);

    this.sprite.play(`${type}_idle`);
  }

  get xpReward(): number {
    return this.profile.xpReward;
  }
  get goldReward(): number {
    return this.profile.goldReward;
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (this.isDead || !this.active) return;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= dt;
      if (this.hurtFlashTimer <= 0) this.sprite.clearTint();
    }

    // Phase 2 Enrage at <= 50% HP
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      SoundEngine.playSfx('skill');
      this.scene.cameras.main.shake(240, 0.012);
      spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 60, 'ENRAGED!', '#f43f5e', true);
      spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, 0xf43f5e, 24);
    }

    if (this.isLunging) {
      this.lungeTimer -= dt;
      body.setVelocityX(this.lungeDir * (this.phase === 2 ? 460 : 370));
      if (Math.abs(playerX - this.sprite.x) < 76 && Math.abs(playerY - this.sprite.y) < 78) {
        this.onHitPlayer(Math.round(this.profile.damage * 1.15), this.lungeDir);
        this.isLunging = false;
      }
      if (this.lungeTimer <= 0) {
        this.isLunging = false;
        body.setVelocityX(0);
      }
      return;
    }

    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const dir: 1 | -1 = dx >= 0 ? 1 : -1;
    this.sprite.setFlipX(dir === -1);

    this.actionTimer -= dt;

    if (this.actionTimer <= 0) {
      const roll = Math.random();
      const cooldownScale = this.phase === 2 ? 0.72 : 1.0;

      if (dist <= this.profile.attackRange + 22) {
        // Heavy Melee Cleave
        body.setVelocityX(0);
        this.sprite.play(`${this.type}_attack`, true);
        SoundEngine.playSfx('sword3');
        this.scene.time.delayedCall(180, () => {
          if (this.isDead) return;
          if (Math.abs(playerX - this.sprite.x) <= this.profile.attackRange + 36 && Math.abs(playerY - this.sprite.y) < 95) {
            this.onHitPlayer(
              Math.round(this.profile.damage * (this.phase === 2 ? 1.2 : 1.0)),
              playerX >= this.sprite.x ? 1 : -1
            );
          }
        });
        this.actionTimer = 1.15 * cooldownScale;
      } else if (roll < 0.45) {
        // Dash Lunge Charge
        this.isLunging = true;
        this.lungeTimer = 0.36;
        this.lungeDir = dir;
        this.sprite.play(`${this.type}_attack`, true);
        SoundEngine.playSfx('dash');
        this.actionTimer = 1.3 * cooldownScale;
      } else {
        // Boss Ranged Skill Barrage
        body.setVelocityX(0);
        this.sprite.play(`${this.type}_skill`, true);
        SoundEngine.playSfx('skill');
        const projectileCount = this.phase === 2 ? 5 : 3;
        const baseAngle = Math.atan2(dy, dx);
        for (let i = 0; i < projectileCount; i++) {
          const offset = (i - (projectileCount - 1) / 2) * 0.22;
          const a = baseAngle + offset;
          const speed = this.phase === 2 ? 430 : 350;
          this.onFireProjectile(
            this.sprite.x,
            this.sprite.y - 16,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            Math.round(this.profile.damage * 0.85)
          );
        }
        this.actionTimer = 1.45 * cooldownScale;
      }
      return;
    }

    // Approach Player
    if (dist > this.profile.attackRange) {
      const spd = this.profile.speed * (this.phase === 2 ? 1.22 : 1);
      body.setVelocityX(dir * spd);
      this.sprite.play(`${this.type}_run`, true);
    } else {
      body.setVelocityX(0);
      this.sprite.play(`${this.type}_idle`, true);
    }
  }

  takeDamage(amount: number, isCrit: boolean, knockX: number): void {
    if (this.isDead) return;
    if (!this.active) this.active = true;

    this.hp = Math.max(0, this.hp - amount);
    this.hurtFlashTimer = 0.12;
    this.sprite.setTint(0xfca5a5);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(knockX * 0.32);

    spawnFloatingText(
      this.scene,
      this.sprite.x,
      this.sprite.y - 52,
      isCrit ? `${amount}!` : `${amount}`,
      isCrit ? '#facc15' : '#f8fafc',
      isCrit
    );
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y - 10, isCrit ? 0xfacc15 : 0xf43f5e, 10);

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.isLunging = false;
    (this.sprite.body as Phaser.Physics.Arcade.Body).setEnable(false);
    this.sprite.play(`${this.type}_death`, true);
    SoundEngine.playSfx('ultimate');
    this.scene.cameras.main.shake(300, 0.015);
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, 0xfacc15, 32);

    this.onBossDefeated(this);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 750,
      delay: 350,
      onComplete: () => this.sprite.destroy(),
    });
  }
}
