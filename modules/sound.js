/**
 * sound.js
 * Synthesized Audio Engine (Web Audio API) for Kids Motion Playground.
 */

export class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext not supported or blocked:", e);
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed:", e);
      }
    }
  }

  playBounce() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn("playBounce failed:", e);
    }
  }

  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn("playPop failed:", e);
    }
  }

  playSlash() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn("playSlash failed:", e);
    }
  }

  playBombBlast() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.35);
      
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn("playBombBlast failed:", e);
    }
  }

  playLevelUp() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        gain.gain.setValueAtTime(0.15, now + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.3);
      });
    } catch (e) {
      console.warn("playLevelUp failed:", e);
    }
  }

  playGameOver() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [392.00, 349.23, 311.13, 246.94];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        
        gain.gain.setValueAtTime(0.2, now + index * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 0.4);
      });
    } catch (e) {
      console.warn("playGameOver failed:", e);
    }
  }

  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn("playTick failed:", e);
    }
  }

  playPuckHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.07);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn("playPuckHit failed:", e);
    }
  }

  playGoalHorn() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [220, 277.18, 329.63, 440];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);
        osc.frequency.linearRampToValueAtTime(f * 1.03, now + idx * 0.06 + 0.35);

        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.45);
      });
    } catch (e) {
      console.warn("playGoalHorn failed:", e);
    }
  }

  playRingChime(combo = 1) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const baseFreq = 523.25 * Math.min(1.6, 1 + (combo - 1) * 0.08);
      [baseFreq, baseFreq * 1.25, baseFreq * 1.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.045);
        gain.gain.setValueAtTime(0.18, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.045 + 0.24);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.26);
      });
    } catch (e) {
      console.warn("playRingChime failed:", e);
    }
  }

  playTurboWhoosh() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.35);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.38);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("playTurboWhoosh failed:", e);
    }
  }

  playBaa() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      // Vibrato LFO for a funny cartoon sheep "Baa-a-a!"
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(245, now);
      osc.frequency.linearRampToValueAtTime(215, now + 0.28);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(26, now);
      lfoGain.gain.setValueAtTime(18, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.32);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn("playBaa failed:", e);
    }
  }

  playShirleyBoing() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.32);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.36);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {
      console.warn("playShirleyBoing failed:", e);
    }
  }

  playHelmetClang() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Metallic hard-hat clang using two inharmonic high oscillators
      [880, 1345].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 0.16);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      });
    } catch (e) {
      console.warn("playHelmetClang failed:", e);
    }
  }

  playHeadBonk() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Funny cartoon hollow head "BONK!"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.14);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch (e) {
      console.warn("playHeadBonk failed:", e);
    }
  }

  playWhistle() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2650, now);
      osc.frequency.setValueAtTime(2780, now + 0.12);

      // Pea-whistle rapid trill
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(38, now);
      lfoGain.gain.setValueAtTime(110, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.setValueAtTime(0.18, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.34);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.35);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("playWhistle failed:", e);
    }
  }

  playGloveSave(isPerfect = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Punchy leather glove thud
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(240, now);
      thud.frequency.exponentialRampToValueAtTime(58, now + 0.11);
      thudGain.gain.setValueAtTime(0.38, now);
      thudGain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);
      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start(now);
      thud.stop(now + 0.14);

      // 2. Sparkling stadium chime on PERFECT or SUPER saves
      if (isPerfect) {
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const chime = this.ctx.createOscillator();
          const cGain = this.ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(freq, now + idx * 0.035);
          cGain.gain.setValueAtTime(0.15, now + idx * 0.035);
          cGain.gain.exponentialRampToValueAtTime(0.004, now + idx * 0.035 + 0.22);
          chime.connect(cGain);
          cGain.connect(this.ctx.destination);
          chime.start(now + idx * 0.035);
          chime.stop(now + idx * 0.035 + 0.24);
        });
      }
    } catch (e) {
      console.warn("playGloveSave failed:", e);
    }
  }

  playCrowdCheer() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Warm stadium brass/organ triad swell + filtered roar
      const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
      chord.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);
        osc.frequency.linearRampToValueAtTime(freq * 1.015, now + 0.5);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.08 + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.58);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + 0.6);
      });
    } catch (e) {
      console.warn("playCrowdCheer failed:", e);
    }
  }

  playShutterSnap() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Crisp mechanical camera shutter double-click + sparkle
      [0, 0.045].forEach((offset, idx) => {
        const click = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(idx === 0 ? 1400 : 950, now + offset);
        click.frequency.exponentialRampToValueAtTime(180, now + offset + 0.03);
        gain.gain.setValueAtTime(0.24, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.005, now + offset + 0.035);
        click.connect(gain);
        gain.connect(this.ctx.destination);
        click.start(now + offset);
        click.stop(now + offset + 0.04);
      });

      [1046.5, 1318.5, 1567.98].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.08 + i * 0.04);
        g.gain.setValueAtTime(0.12, now + 0.08 + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.004, now + 0.3 + i * 0.04);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now + 0.08 + i * 0.04);
        osc.stop(now + 0.32 + i * 0.04);
      });
    } catch (e) {
      console.warn("playShutterSnap failed:", e);
    }
  }

  playBeatKick(accent = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 155 : 130, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);

      gain.gain.setValueAtTime(accent ? 0.32 : 0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn("playBeatKick failed:", e);
    }
  }

  playBeatHiHat(isClap = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = isClap ? [920, 1380, 2150] : [3400, 4900];
      const dur = isClap ? 0.085 : 0.04;

      freqs.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isClap ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + dur);
        gain.gain.setValueAtTime(isClap ? 0.08 : 0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.01);
      });
    } catch (e) {
      console.warn("playBeatHiHat failed:", e);
    }
  }

  playSynthNote(freq = 440, duration = 0.18, type = 'triangle', volume = 0.11) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.002, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.003, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      console.warn("playSynthNote failed:", e);
    }
  }

  playChordHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.025);
        gain.gain.setValueAtTime(0.18, now + idx * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.004, now + idx * 0.025 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.025);
        osc.stop(now + idx * 0.025 + 0.3);
      });
    } catch (e) {
      console.warn("playChordHit failed:", e);
    }
  }

  playPowerUp() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [329.63, 440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.055);
        gain.gain.setValueAtTime(0.18, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.005, now + i * 0.055 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.24);
      });
    } catch (e) {
      console.warn("playPowerUp failed:", e);
    }
  }

  playWrongBuzzer() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.linearRampToValueAtTime(115, now + 0.24);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.26);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      console.warn("playWrongBuzzer failed:", e);
    }
  }

  playTennisHit(shotType = 'normal') {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Crisp gut-string tennis racket "POP-THWACK!"
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const isSmash = shotType === 'smash' || shotType === 'power';
      osc.type = isSmash ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isSmash ? 680 : 520, now);
      osc.frequency.exponentialRampToValueAtTime(isSmash ? 140 : 165, now + 0.085);

      gain.gain.setValueAtTime(isSmash ? 0.36 : 0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.095);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

      // Extra harmonic ping on Star Smash or Power Shot!
      if (isSmash) {
        const ping = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(shotType === 'power' ? 1046.5 : 880, now);
        ping.frequency.exponentialRampToValueAtTime(1567.98, now + 0.18);
        pGain.gain.setValueAtTime(0.2, now);
        pGain.gain.exponentialRampToValueAtTime(0.004, now + 0.2);
        ping.connect(pGain);
        pGain.connect(this.ctx.destination);
        ping.start(now);
        ping.stop(now + 0.22);
      }
    } catch (e) {
      console.warn("playTennisHit failed:", e);
    }
  }

  playPowerShotBoom() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Dramatic Mario Power Tennis chargechord + thunderous meteor launch!
      [392.00, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.025);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.28);
        gain.gain.setValueAtTime(0.14, now + i * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.34);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.025);
        osc.stop(now + 0.36);
      });
    } catch (e) {
      console.warn("playPowerShotBoom failed:", e);
    }
  }

  playArrowTwang(isCharged = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Elastic bowstring twang + whistling arrow flight!
      const twang = this.ctx.createOscillator();
      const tGain = this.ctx.createGain();
      twang.type = 'triangle';
      twang.frequency.setValueAtTime(isCharged ? 220 : 185, now);
      twang.frequency.exponentialRampToValueAtTime(95, now + 0.14);
      tGain.gain.setValueAtTime(0.32, now);
      tGain.gain.exponentialRampToValueAtTime(0.004, now + 0.16);
      twang.connect(tGain);
      tGain.connect(this.ctx.destination);
      twang.start(now);
      twang.stop(now + 0.17);

      const zip = this.ctx.createOscillator();
      const zGain = this.ctx.createGain();
      zip.type = 'sine';
      zip.frequency.setValueAtTime(isCharged ? 980 : 720, now);
      zip.frequency.exponentialRampToValueAtTime(340, now + 0.13);
      zGain.gain.setValueAtTime(0.14, now);
      zGain.gain.exponentialRampToValueAtTime(0.003, now + 0.14);
      zip.connect(zGain);
      zGain.connect(this.ctx.destination);
      zip.start(now);
      zip.stop(now + 0.15);
    } catch (e) {
      console.warn("playArrowTwang failed:", e);
    }
  }

  playNetSwish(isFire = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Crisp nylon basketball net swish + arcade swish arpeggio!
      [1650, 2350, 3100].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.018);
        osc.frequency.exponentialRampToValueAtTime(f * 0.42, now + 0.14 + idx * 0.018);
        gain.gain.setValueAtTime(0.08, now + idx * 0.018);
        gain.gain.exponentialRampToValueAtTime(0.002, now + 0.16 + idx * 0.018);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.018);
        osc.stop(now + 0.18 + idx * 0.018);
      });

      const notes = isFire ? [587.33, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const chime = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(freq, now + 0.04 + i * 0.04);
        cGain.gain.setValueAtTime(0.15, now + 0.04 + i * 0.04);
        cGain.gain.exponentialRampToValueAtTime(0.004, now + 0.24 + i * 0.04);
        chime.connect(cGain);
        cGain.connect(this.ctx.destination);
        chime.start(now + 0.04 + i * 0.04);
        chime.stop(now + 0.26 + i * 0.04);
      });
    } catch (e) {
      console.warn("playNetSwish failed:", e);
    }
  }

  playRimClang() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [420, 635].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + 0.11);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.13);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      });
    } catch (e) {
      console.warn("playRimClang failed:", e);
    }
  }

  playBubbleHarp(step = 1) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Liquid soap-bubble "bloop" + shimmering fairy harp glissando!
      const bloop = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bloop.type = 'sine';
      bloop.frequency.setValueAtTime(320, now);
      bloop.frequency.exponentialRampToValueAtTime(760, now + 0.09);
      bGain.gain.setValueAtTime(0.24, now);
      bGain.gain.exponentialRampToValueAtTime(0.004, now + 0.11);
      bloop.connect(bGain);
      bGain.connect(this.ctx.destination);
      bloop.start(now);
      bloop.stop(now + 0.12);

      const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
      const baseIdx = Math.min(scale.length - 3, Math.max(0, (step - 1) % 6));
      [0, 1, 2].forEach((offset, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(scale[baseIdx + offset], now + 0.03 + i * 0.045);
        g.gain.setValueAtTime(0.12, now + 0.03 + i * 0.045);
        g.gain.exponentialRampToValueAtTime(0.003, now + 0.28 + i * 0.045);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now + 0.03 + i * 0.045);
        osc.stop(now + 0.3 + i * 0.045);
      });
    } catch (e) {
      console.warn("playBubbleHarp failed:", e);
    }
  }
}

export const sfx = new SoundSynth();
