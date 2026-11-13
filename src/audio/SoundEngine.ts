import { GameSettings } from '../types/game';

export type MusicMood = 'menu' | 'explore' | 'battle' | 'boss' | 'none';
export type SfxKey =
  | 'sword1'
  | 'sword2'
  | 'sword3'
  | 'attack'
  | 'jump'
  | 'dash'
  | 'skill'
  | 'ultimate'
  | 'guard'
  | 'parry'
  | 'damage'
  | 'enemy_death'
  | 'pickup'
  | 'ui_click'
  | 'level_up';

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private masterVol = 0.85;
  private musicVol = 0.65;
  private sfxVol = 0.85;

  private currentMood: MusicMood = 'none';
  private musicTimer: number | null = null;
  private stepIdx = 0;

  // Optional external audio files with seamless procedural fallback
  private externalAudioCache = new Map<string, HTMLAudioElement>();

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensureContext();
  }

  updateSettings(settings: GameSettings): void {
    this.masterVol = settings.masterVolume;
    this.musicVol = settings.musicVolume;
    this.sfxVol = settings.sfxVolume;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVol, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVol * 0.45, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.02);
  }

  setMusicMood(mood: MusicMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.stepIdx = 0;
    if (mood === 'none') return;

    const tempoMs =
      mood === 'boss' ? 165 : mood === 'battle' ? 210 : mood === 'explore' ? 320 : 390;

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.playMusicStep(mood, this.stepIdx++);
    }, tempoMs);
  }

  private playMusicStep(mood: MusicMood, step: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;

    // Japanese Hirajoshi minor pentatonic scale frequencies (D, Eb, G, A, Bb)
    const menuScale = [146.83, 155.56, 196.0, 220.0, 233.08, 293.66, 311.13, 392.0];
    const battleScale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 440.0];
    const bossScale = [130.81, 138.59, 174.61, 196.0, 207.65, 261.63, 277.18, 349.23];

    if (mood === 'menu' || mood === 'explore') {
      const pattern = [0, 3, 2, 5, 4, 2, 1, 0, 3, 5, 6, 4];
      const note = menuScale[pattern[step % pattern.length]];
      if (step % 2 === 0 || step % 5 === 0) {
        this.synthPluck(note, now, 0.45, 0.22, 'triangle');
      }
      if (step % 8 === 0) {
        this.synthDrone(note * 0.5, now, 1.4, 0.14);
      }
      return;
    }

    if (mood === 'battle') {
      const riff = [0, 2, 3, 2, 5, 3, 4, 1];
      const note = battleScale[riff[step % riff.length]];
      this.synthPluck(note, now, 0.22, 0.2, 'sawtooth');
      if (step % 2 === 0) {
        this.synthTaiko(now, step % 4 === 0 ? 0.32 : 0.16, 75);
      }
      return;
    }

    if (mood === 'boss') {
      const riff = [0, 1, 3, 4, 3, 6, 5, 1, 0, 4, 7, 5];
      const note = bossScale[riff[step % riff.length]];
      this.synthPluck(note, now, 0.24, 0.24, 'sawtooth');
      this.synthTaiko(now, step % 4 === 0 ? 0.42 : 0.22, step % 2 === 0 ? 64 : 95);
      if (step % 6 === 0) {
        this.synthDrone(note * 0.5, now, 0.7, 0.18);
      }
    }
  }

  private synthPluck(
    freq: number,
    startTime: number,
    duration: number,
    vol: number,
    type: OscillatorType
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthDrone(freq: number, startTime: number, duration: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private synthTaiko(startTime: number, vol: number, baseFreq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.9, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, startTime + 0.14);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.24);
  }

  playSfx(key: SfxKey): void {
    const ext = this.externalAudioCache.get(key);
    if (ext && ext.readyState >= 2) {
      const clone = ext.cloneNode(true) as HTMLAudioElement;
      clone.volume = Math.min(1, this.masterVol * this.sfxVol);
      clone.play().catch(() => this.playSynthSfx(key));
      return;
    }
    this.playSynthSfx(key);
  }

  private playSynthSfx(key: SfxKey): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    switch (key) {
      case 'sword1':
      case 'sword2':
      case 'sword3': {
        const pitch = key === 'sword1' ? 880 : key === 'sword2' ? 1050 : 1260;
        this.noiseBurst(now, 0.09, pitch, 0.28);
        this.toneSweep(now, pitch * 1.4, pitch * 0.45, 0.09, 'triangle', 0.22);
        break;
      }
      case 'attack':
        this.noiseBurst(now, 0.1, 720, 0.25);
        break;
      case 'jump':
        this.toneSweep(now, 210, 520, 0.12, 'sine', 0.22);
        break;
      case 'dash':
        this.noiseBurst(now, 0.14, 1500, 0.28);
        this.toneSweep(now, 420, 140, 0.14, 'sawtooth', 0.15);
        break;
      case 'skill':
        this.toneSweep(now, 320, 960, 0.22, 'sawtooth', 0.22);
        this.noiseBurst(now + 0.04, 0.2, 1800, 0.25);
        break;
      case 'ultimate':
        this.toneSweep(now, 120, 48, 0.48, 'sawtooth', 0.35);
        this.noiseBurst(now + 0.05, 0.45, 1100, 0.35);
        this.toneSweep(now + 0.12, 660, 1320, 0.3, 'triangle', 0.24);
        break;
      case 'guard':
        this.toneSweep(now, 420, 310, 0.08, 'square', 0.14);
        break;
      case 'parry':
        this.toneSweep(now, 1400, 2100, 0.18, 'sine', 0.3);
        this.toneSweep(now + 0.04, 1800, 2600, 0.15, 'triangle', 0.24);
        break;
      case 'damage':
        this.toneSweep(now, 180, 65, 0.16, 'sawtooth', 0.32);
        this.noiseBurst(now, 0.12, 420, 0.26);
        break;
      case 'enemy_death':
        this.toneSweep(now, 320, 70, 0.24, 'sawtooth', 0.26);
        this.noiseBurst(now, 0.2, 650, 0.22);
        break;
      case 'pickup':
        this.toneSweep(now, 587, 880, 0.1, 'sine', 0.2);
        this.toneSweep(now + 0.07, 880, 1175, 0.14, 'sine', 0.22);
        break;
      case 'ui_click':
        this.toneSweep(now, 640, 820, 0.045, 'triangle', 0.14);
        break;
      case 'level_up':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          this.toneSweep(now + idx * 0.07, freq, freq * 1.03, 0.18, 'triangle', 0.24);
        });
        break;
    }
  }

  private toneSweep(
    startTime: number,
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    vol: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseBurst(startTime: number, duration: number, centerFreq: number, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const sampleCount = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(startTime);
  }
}

export const SoundEngine = new SoundEngineClass();
