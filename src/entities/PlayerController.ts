import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import {
  calculateDamage,
  playComboSlashSfx,
  spawnFloatingText,
  spawnHitSparks,
} from '../combat/CombatEngine';
import { ComputedPlayerStats } from '../systems/ProgressionSystem';
import { VirtualInputState } from '../types/game';

export interface PlayerHitboxEvent {
  rect: Phaser.Geom.Rectangle;
  damage: number;
  isCritical: boolean;
  knockbackX: number;
  knockbackY: number;
  isHeavy: boolean;
}

export class PlayerController {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: ComputedPlayerStats;

  public hp: number;
  public energy: number;
  public ultimateCharge = 35; // 0..100
  public comboCount = 0;
  public comboTimer = 0;

  public facing: 1 | -1 = 1;
  public isDead = false;
  public isGuarding = false;

  private jumpsUsed = 0;
  private coyoteTimer = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private skillCooldownTimer = 0;
  private attackLockTimer = 0;
  private comboStep = 0;
  private comboWindowTimer = 0;
  private invulnTimer = 0;
  private guardStartTime = 0;
  private hurtTimer = 0;

  private scene: Phaser.Scene;
  private onAttackHitbox: (evt: PlayerHitboxEvent) => void;
  private onProjectileSpawn: (
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    isCrit: boolean
  ) => void;
  private onDeath: () => void;
  private onParrySuccess: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    stats: ComputedPlayerStats,
    callbacks: {
      onAttackHitbox: (evt: PlayerHitboxEvent) => void;
      onProjectileSpawn: (
        x: number,
        y: number,
        vx: number,
        vy: number,
        damage: number,
        isCrit: boolean
      ) => void;
      onDeath: () => void;
      onParrySuccess: () => void;
    }
  ) {
    this.scene = scene;
    this.stats = stats;
    this.hp = stats.maxHp;
    this.energy = stats.maxEnergy;
    this.onAttackHitbox = callbacks.onAttackHitbox;
    this.onProjectileSpawn = callbacks.onProjectileSpawn;
    this.onDeath = callbacks.onDeath;
    this.onParrySuccess = callbacks.onParrySuccess;

    this.sprite = scene.physics.add.sprite(x, y, 'char_hero', 0);
    this.sprite.setDepth(20);
    this.sprite.setCollideWorldBounds(true);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 62);
    body.setOffset(47, 46);
    body.setMaxVelocity(720, 950);

    this.sprite.play('hero_idle');
  }

  get skillCooldown(): number {
    return Math.max(0, this.skillCooldownTimer);
  }
  get skillMaxCooldown(): number {
    return 3.2;
  }
  get dashCooldown(): number {
    return Math.max(0, this.dashCooldownTimer);
  }
  get dashMaxCooldown(): number {
    return this.stats.dashCooldown;
  }

  refreshStats(newStats: ComputedPlayerStats): void {
    const hpRatio = this.hp / Math.max(1, this.stats.maxHp);
    this.stats = newStats;
    this.hp = Math.min(newStats.maxHp, Math.max(1, Math.round(newStats.maxHp * hpRatio)));
    this.energy = Math.min(newStats.maxEnergy, this.energy);
  }

  heal(hpAmount: number, energyAmount: number): void {
    if (this.isDead) return;
    if (hpAmount > 0) {
      this.hp = Math.min(this.stats.maxHp, this.hp + hpAmount);
      spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 20, `+${hpAmount}`, '#4ade80');
    }
    if (energyAmount > 0) {
      this.energy = Math.min(this.stats.maxEnergy, this.energy + energyAmount);
      spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 36, `+${energyAmount} Ki`, '#38bdf8');
    }
  }

  respawnAt(x: number, y: number): void {
    this.isDead = false;
    this.hp = this.stats.maxHp;
    this.energy = this.stats.maxEnergy;
    this.invulnTimer = 1.6;
    this.hurtTimer = 0;
    this.dashTimer = 0;
    this.attackLockTimer = 0;
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    this.sprite.play('hero_idle', true);
  }

  update(dt: number, input: VirtualInputState, sensitivity: number): void {
    if (this.isDead) return;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    // Timers
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.skillCooldownTimer > 0) this.skillCooldownTimer -= dt;
    if (this.attackLockTimer > 0) this.attackLockTimer -= dt;
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= dt;
      if (this.comboWindowTimer <= 0) this.comboStep = 0;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.sprite.setAlpha(Math.sin(this.scene.time.now * 0.04) > 0 ? 1 : 0.45);
    } else {
      this.sprite.setAlpha(1);
    }
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // Passive Ki regeneration
    this.energy = Math.min(this.stats.maxEnergy, this.energy + this.stats.energyRegen * dt);

    if (onGround) {
      this.jumpsUsed = 0;
      this.coyoteTimer = 0.12;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Dash active motion
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      body.setAllowGravity(false);
      body.setVelocity(this.facing * 640, 0);
      if (Math.random() < 0.6) {
        this.spawnAfterimage();
      }
      if (this.dashTimer <= 0) {
        body.setAllowGravity(true);
      }
      return;
    }

    // Guard / Defense stance
    const wantsGuard = input.guardHeld && onGround && this.attackLockTimer <= 0 && this.hurtTimer <= 0;
    if (wantsGuard && !this.isGuarding) {
      this.guardStartTime = this.scene.time.now;
      SoundEngine.playSfx('guard');
    }
    this.isGuarding = wantsGuard;

    if (this.hurtTimer > 0) {
      this.sprite.play('hero_hurt', true);
      return;
    }

    // Horizontal Movement (Walk vs Run/Sprint)
    const deadzone = 0.12;
    const rawX = Math.abs(input.moveX) > deadzone ? Phaser.Math.Clamp(input.moveX * sensitivity, -1, 1) : 0;
    const isSprinting = input.sprint || Math.abs(input.moveX) > 0.72;
    const baseSpeed = (isSprinting ? 320 : 215) + this.stats.moveSpeedBonus;

    if (this.isGuarding) {
      body.setVelocityX(rawX * 70);
    } else if (this.attackLockTimer > 0 && onGround) {
      body.setVelocityX(rawX * 90);
    } else {
      body.setVelocityX(rawX * baseSpeed);
    }

    if (rawX !== 0 && this.attackLockTimer <= 0) {
      this.facing = rawX > 0 ? 1 : -1;
      this.sprite.setFlipX(this.facing === -1);
    }

    // Jump & Double Jump
    if (input.jumpPressed && !this.isGuarding) {
      if (this.coyoteTimer > 0 || this.jumpsUsed === 0) {
        body.setVelocityY(-540);
        this.jumpsUsed = 1;
        this.coyoteTimer = 0;
        SoundEngine.playSfx('jump');
        spawnHitSparks(this.scene, this.sprite.x, this.sprite.y + 28, 0x94a3b8, 5);
      } else if (this.jumpsUsed < 2) {
        body.setVelocityY(-500);
        this.jumpsUsed = 2;
        SoundEngine.playSfx('jump');
        spawnHitSparks(this.scene, this.sprite.x, this.sprite.y + 24, 0x38bdf8, 8);
      }
    }

    // Dash
    if (input.dashPressed && this.dashCooldownTimer <= 0) {
      this.dashTimer = 0.19;
      this.dashCooldownTimer = this.stats.dashCooldown;
      this.invulnTimer = Math.max(this.invulnTimer, 0.24);
      this.isGuarding = false;
      this.attackLockTimer = 0;
      SoundEngine.playSfx('dash');
      this.spawnAfterimage();
      return;
    }

    // Ultimate Attack
    if (input.ultimatePressed && this.ultimateCharge >= 100 && this.attackLockTimer <= 0) {
      this.triggerUltimate();
      return;
    }

    // Special Skill
    if (input.skillPressed && this.skillCooldownTimer <= 0 && this.energy >= 25 && this.attackLockTimer <= 0) {
      this.triggerSpecialSkill();
      return;
    }

    // Normal Combo & Air Attack
    if (input.attackPressed && this.attackLockTimer <= 0 && !this.isGuarding) {
      if (!onGround) {
        this.triggerAirAttack();
      } else {
        this.triggerComboAttack();
      }
    }

    // Animations
    if (this.attackLockTimer > 0) {
      // Attack/Skill animation stays active
    } else if (this.isGuarding) {
      this.sprite.play('hero_guard', true);
    } else if (!onGround) {
      this.sprite.play('hero_jump', true);
    } else if (Math.abs(body.velocity.x) > 25) {
      this.sprite.play('hero_run', true);
    } else {
      this.sprite.play('hero_idle', true);
    }
  }

  private triggerComboAttack(): void {
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboWindowTimer = 0.65;
    this.attackLockTimer = this.comboStep === 3 ? 0.34 : 0.23;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.facing * (this.comboStep === 3 ? 210 : 120));

    this.sprite.play('hero_attack', true);
    playComboSlashSfx(this.comboStep);

    const mult = this.comboStep === 1 ? 1.0 : this.comboStep === 2 ? 1.2 : 1.55;
    const { damage, isCritical } = calculateDamage(
      this.stats.attackDamage * mult,
      this.stats.critChance,
      0,
      this.comboCount
    );

    const reach = this.comboStep === 3 ? 96 : 78;
    const rect = new Phaser.Geom.Rectangle(
      this.facing === 1 ? this.sprite.x + 6 : this.sprite.x - reach - 6,
      this.sprite.y - 36,
      reach,
      72
    );

    this.onAttackHitbox({
      rect,
      damage,
      isCritical,
      knockbackX: this.facing * (this.comboStep === 3 ? 260 : 140),
      knockbackY: this.comboStep === 3 ? -160 : -60,
      isHeavy: this.comboStep === 3,
    });
  }

  private triggerAirAttack(): void {
    this.attackLockTimer = 0.25;
    this.sprite.play('hero_attack', true);
    SoundEngine.playSfx('sword2');

    const { damage, isCritical } = calculateDamage(
      this.stats.attackDamage * 1.25,
      this.stats.critChance,
      0,
      this.comboCount
    );

    const rect = new Phaser.Geom.Rectangle(this.sprite.x - 58, this.sprite.y - 44, 116, 88);
    this.onAttackHitbox({
      rect,
      damage,
      isCritical,
      knockbackX: this.facing * 160,
      knockbackY: -120,
      isHeavy: false,
    });
  }

  private triggerSpecialSkill(): void {
    this.energy -= 25;
    this.skillCooldownTimer = this.skillMaxCooldown;
    this.attackLockTimer = 0.34;
    this.sprite.play('hero_skill', true);
    SoundEngine.playSfx('skill');

    const count = this.stats.hasPhantomShuriken ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const spreadY = count === 1 ? 0 : (i - 1) * 65;
      const { damage, isCritical } = calculateDamage(
        this.stats.attackDamage * 1.15,
        this.stats.critChance,
        0,
        this.comboCount
      );
      this.onProjectileSpawn(
        this.sprite.x + this.facing * 26,
        this.sprite.y - 6,
        this.facing * 620,
        spreadY,
        damage,
        isCritical
      );
    }

    // Crimson Tempest melee shockwave
    const { damage, isCritical } = calculateDamage(
      this.stats.attackDamage * (this.stats.hasCrimsonTempest ? 2.1 : 1.45),
      this.stats.critChance + 0.1,
      0,
      this.comboCount
    );
    const radius = this.stats.hasCrimsonTempest ? 135 : 95;
    const rect = new Phaser.Geom.Rectangle(
      this.sprite.x - radius,
      this.sprite.y - 64,
      radius * 2,
      120
    );
    this.onAttackHitbox({
      rect,
      damage,
      isCritical,
      knockbackX: this.facing * 280,
      knockbackY: -180,
      isHeavy: true,
    });
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, 0xf43f5e, 16);
  }

  private triggerUltimate(): void {
    this.ultimateCharge = 0;
    this.attackLockTimer = 0.55;
    this.invulnTimer = 0.85;
    this.sprite.play('hero_skill', true);
    SoundEngine.playSfx('ultimate');

    this.scene.cameras.main.shake(260, 0.015);
    this.scene.cameras.main.flash(220, 225, 29, 72);

    const mult = this.stats.hasEclipseMastery ? 4.2 : 3.1;
    const radius = this.stats.hasEclipseMastery ? 310 : 230;
    const { damage, isCritical } = calculateDamage(
      this.stats.attackDamage * mult,
      this.stats.critChance + 0.35,
      0,
      this.comboCount
    );

    const rect = new Phaser.Geom.Rectangle(
      this.sprite.x - radius,
      this.sprite.y - 160,
      radius * 2,
      260
    );
    this.onAttackHitbox({
      rect,
      damage,
      isCritical: true || isCritical,
      knockbackX: this.facing * 380,
      knockbackY: -260,
      isHeavy: true,
    });

    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y - 10, 0xe11d48, 28);
  }

  registerHitConfirmed(): void {
    this.comboCount += 1;
    this.comboTimer = 3.2;
    this.ultimateCharge = Math.min(100, this.ultimateCharge + 9);
  }

  receiveDamage(rawDamage: number, knockDirX: number): { tookDamage: boolean; parried: boolean } {
    if (this.isDead || this.invulnTimer > 0) {
      return { tookDamage: false, parried: false };
    }

    // Check Guard / Perfect Parry
    if (this.isGuarding) {
      const elapsed = this.scene.time.now - this.guardStartTime;
      if (elapsed <= 210) {
        // Perfect Parry!
        SoundEngine.playSfx('parry');
        this.invulnTimer = 0.5;
        this.energy = Math.min(this.stats.maxEnergy, this.energy + 20);
        this.ultimateCharge = Math.min(100, this.ultimateCharge + 18);
        spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 32, 'PARRY!', '#38bdf8', true);
        spawnHitSparks(this.scene, this.sprite.x + this.facing * 18, this.sprite.y, 0x38bdf8, 14);
        this.onParrySuccess();
        return { tookDamage: false, parried: true };
      }
      // Normal Guard reduces 75% damage
      const blockedDmg = Math.max(2, Math.round((rawDamage - this.stats.defense * 0.5) * 0.25));
      this.hp = Math.max(1, this.hp - blockedDmg);
      this.invulnTimer = 0.35;
      SoundEngine.playSfx('guard');
      spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 24, `-${blockedDmg} (GRD)`, '#94a3b8');
      return { tookDamage: true, parried: false };
    }

    const finalDmg = Math.max(3, Math.round(rawDamage - this.stats.defense * 0.55));
    this.hp = Math.max(0, this.hp - finalDmg);
    this.invulnTimer = 0.78;
    this.hurtTimer = 0.24;
    this.comboCount = 0;

    SoundEngine.playSfx('damage');
    this.scene.cameras.main.shake(150, 0.008);
    spawnFloatingText(this.scene, this.sprite.x, this.sprite.y - 24, `-${finalDmg}`, '#f43f5e');
    spawnHitSparks(this.scene, this.sprite.x, this.sprite.y, 0xf43f5e, 10);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(knockDirX * 220, -220);

    if (this.hp <= 0) {
      this.isDead = true;
      this.sprite.play('hero_death', true);
      this.onDeath();
    }
    return { tookDamage: true, parried: false };
  }

  private spawnAfterimage(): void {
    const ghost = this.scene.add
      .sprite(this.sprite.x, this.sprite.y, 'char_hero', this.sprite.frame.name)
      .setFlipX(this.sprite.flipX)
      .setTint(0x38bdf8)
      .setAlpha(0.45)
      .setDepth(19);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }
}
