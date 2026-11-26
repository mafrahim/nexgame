/**
 * starri.js
 * Starri Beat Stage! — Nex-Style Holographic Music Rhythm & Choreography Game
 *
 * Creative Challenges & Rewards:
 * - Real-time Procedural Synth-Pop Concert Engine (3 evolving tracks: "Neon Acorn Pop", "Galactic Disco", "Superstar Hyperdrive")
 * - 6 Radial Star Receptor Pads arranged in an ergonomic upper-body arc around a live-mirrored Holographic Stage Dancer!
 * - 4 Motion Note Types:
 *   1. CATCH Gem 💎 (Cyan/Pink): Hold hand in receptor ring as the beat closes (+20)
 *   2. SLASH Diamond ⚡ (Gold/Orange): Swipe through with velocity for katana spark burst (+35)
 *   3. TWIN HARMONY CHORD 🌟 (Linked Gold Pair): Hit Left + Right stars together on the chord drop (+60!)
 *   4. GLITCH SPIKE 👾 (Red Static): Keep hands clear as it passes for CLEAN GROOVE (+20); touching breaks combo & costs 1 Heart!
 * - Combo Stage Evolution: 10+ Combo unlocks Laser Lightshow (2x); 20+ Combo ignites STAR FEVER (4x) with Glowing Cyber-Star Wings & DJ Headphones!
 * - Live Rank Badge Ladder: C -> B -> A -> S -> SS SUPERSTAR! + Rectangular Concert Webcam PiP!
 */

const TRACKS = [
  {
    title: '🎵 Neon Acorn Pop',
    bpm: 112,
    bass: [130.81, 130.81, 196.00, 196.00, 220.00, 220.00, 174.61, 174.61],
    melody: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99, 880.00, 880.00, 783.99, 659.25, 523.25, 587.33, 659.25, 523.25, 392.00]
  },
  {
    title: '🎵 Galactic Disco Groove',
    bpm: 122,
    bass: [146.83, 146.83, 196.00, 196.00, 164.81, 164.81, 220.00, 220.00],
    melody: [587.33, 698.46, 880.00, 783.99, 698.46, 783.99, 987.77, 880.00, 659.25, 783.99, 987.77, 880.00, 698.46, 659.25, 587.33, 440.00]
  },
  {
    title: '🎵 Superstar Hyperdrive',
    bpm: 132,
    bass: [146.83, 164.81, 185.00, 185.00, 146.83, 164.81, 220.00, 185.00],
    melody: [739.99, 880.00, 1108.73, 987.77, 880.00, 739.99, 659.25, 739.99, 880.00, 987.77, 1108.73, 1318.51, 1108.73, 987.77, 880.00, 739.99]
  }
];

export class StarriBeatGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // 6 radial target lanes (0..2 Left arc, 3..5 Right arc)
    this.padDefs = [
      { id: 0, side: 'L', xNorm: 0.22, yNorm: 0.31, color: '#38bdf8', label: '↖' },
      { id: 1, side: 'L', xNorm: 0.16, yNorm: 0.54, color: '#2dd4bf', label: '←' },
      { id: 2, side: 'L', xNorm: 0.24, yNorm: 0.77, color: '#818cf8', label: '↙' },
      { id: 3, side: 'R', xNorm: 0.78, yNorm: 0.31, color: '#f472b6', label: '↗' },
      { id: 4, side: 'R', xNorm: 0.84, yNorm: 0.54, color: '#fb7185', label: '→' },
      { id: 5, side: 'R', xNorm: 0.76, yNorm: 0.77, color: '#c084fc', label: '↘' }
    ];

    this.notes = [];
    this.slashBursts = [];
    this.floatingTexts = [];
    this.handTrails = new Map();
    this.lastHands = [];
    this.padPulse = [0, 0, 0, 0, 0, 0];

    this.combo = 0;
    this.maxCombo = 0;
    this.notesHit = 0;
    this.notesTotal = 0;
    this.rank = 'C';
    this.rankTitle = 'Rhythm Rookie';

    this.stepIndex = 0;
    this.lastBeatMs = 0;
    this.beatPulse = 0;
    this.chordGroupCounter = 1;

    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#f472b6';

    this.avatarState = {
      xNorm: 0.5,
      leftHand: { x: 0.35, y: 0.6 },
      rightHand: { x: 0.65, y: 0.6 },
      isJumping: false
    };

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.originX = canvasWidth * 0.5;
    this.originY = canvasHeight * 0.46;
  }

  reset() {
    this.notes = [];
    this.slashBursts = [];
    this.floatingTexts = [];
    this.handTrails.clear();
    this.padPulse = [0, 0, 0, 0, 0, 0];
    this.combo = 0;
    this.maxCombo = 0;
    this.notesHit = 0;
    this.notesTotal = 0;
    this.rank = 'C';
    this.rankTitle = 'Rhythm Rookie';
    this.stepIndex = 0;
    this.lastBeatMs = performance.now();
    this.beatPulse = 0;
    this.bannerTimer = 85;
    this.bannerText = '🌟 CATCH GEMS • SLASH DIAMONDS • DODGE GLITCHES!';
    this.bannerColor = '#38bdf8';
  }

  getTrack(level) {
    return TRACKS[Math.min(TRACKS.length - 1, Math.max(0, level - 1))];
  }

  computeRank(score) {
    if (score >= 900 || (this.maxCombo >= 24 && score >= 650)) {
      return { rank: 'SS', title: 'Galactic Pop Legend', color: '#facc15' };
    }
    if (score >= 580 || this.maxCombo >= 18) {
      return { rank: 'S', title: 'Disco Dynamo', color: '#f472b6' };
    }
    if (score >= 340 || this.maxCombo >= 12) {
      return { rank: 'A', title: 'Neon Choreographer', color: '#38bdf8' };
    }
    if (score >= 160 || this.maxCombo >= 6) {
      return { rank: 'B', title: 'Stage Groover', color: '#4ade80' };
    }
    return { rank: 'C', title: 'Rhythm Rookie', color: '#94a3b8' };
  }

  addPopup(x, y, text, color = '#fde047', scale = 1.0) {
    this.floatingTexts.push({
      x,
      y,
      vy: -2.3,
      text,
      color,
      alpha: 1.0,
      scale
    });
  }

  spawnBeatPattern(level, step) {
    // Spawn notes on musical beats (every 2 eighth-note steps, plus syncopation on higher levels)
    const isMainBeat = step % 2 === 0;
    const isPhraseAccent = step % 8 === 0;
    const allowSyncopation = level >= 2 && step % 4 === 3 && Math.random() < 0.35;

    if (!isMainBeat && !allowSyncopation) return;
    if (this.notes.length >= 9) return;

    if (isPhraseAccent && Math.random() < 0.68) {
      // Spawn Symmetric TWIN HARMONY CHORD (Left + Right pair)!
      const pairIdx = Math.floor(Math.random() * 3); // 0=High, 1=Mid, 2=Low
      const groupId = this.chordGroupCounter++;
      this.notes.push(this.createNote(pairIdx, 'chord', groupId));
      this.notes.push(this.createNote(pairIdx + 3, 'chord', groupId));
      return;
    }

    const padId = Math.floor(Math.random() * 6);
    const r = Math.random();
    let type = 'catch';
    if (r < 0.14) {
      type = 'glitch';
    } else if (r < 0.48) {
      type = 'slash';
    }
    this.notes.push(this.createNote(padId, type, 0));
  }

  createNote(padId, type, chordGroup = 0) {
    // Swipe direction vector for Slash notes
    const dirs = [
      { dx: -0.7, dy: -0.7 },
      { dx: -1, dy: 0 },
      { dx: -0.7, dy: 0.7 },
      { dx: 0.7, dy: -0.7 },
      { dx: 1, dy: 0 },
      { dx: 0.7, dy: 0.7 }
    ];
    return {
      padId,
      type, // catch | slash | chord | glitch
      chordGroup,
      progress: 0.04, // 0 = center stage star, 1.0 = pad ring!
      state: 'approaching', // approaching | hit | missed
      dir: dirs[padId],
      rot: 0,
      alpha: 1.0
    };
  }

  triggerKeyboardPad(padId) {
    // Optional keyboard helper (keys 1-6) marks a temporary virtual strike on that pad
    this.virtualPadTap = { padId, timer: 10 };
  }

  update(players, level, speedMultiplier, currentScore, callbacks) {
    const { onHit, onChord, onGlitchHit, onBeatAudio, onRankUp } = callbacks;

    const track = this.getTrack(level);
    const eighthMs = (60000 / track.bpm) / 2;
    const nowMs = performance.now();

    if (this.bannerTimer > 0) this.bannerTimer--;
    if (this.beatPulse > 0) this.beatPulse = Math.max(0, this.beatPulse - 0.06);
    for (let i = 0; i < 6; i++) {
      if (this.padPulse[i] > 0) this.padPulse[i] = Math.max(0, this.padPulse[i] - 0.08);
    }
    if (this.virtualPadTap && this.virtualPadTap.timer > 0) {
      this.virtualPadTap.timer--;
    }

    // 1. Musical Sequencer Clock!
    if (nowMs - this.lastBeatMs >= eighthMs) {
      this.lastBeatMs = nowMs;
      const s = this.stepIndex++;
      const isQuarter = s % 2 === 0;
      if (isQuarter) this.beatPulse = 1.0;

      const bassFreq = track.bass[Math.floor((s / 2) % track.bass.length)];
      const melFreq = track.melody[s % track.melody.length];

      if (onBeatAudio) {
        onBeatAudio({
          step: s,
          isKick: s % 4 === 0,
          isClap: s % 4 === 2,
          isHat: s % 2 === 1,
          bassFreq: isQuarter ? bassFreq : null,
          melFreq: (s % 2 === 0 || this.combo >= 10) ? melFreq : null,
          fever: this.combo >= 20
        });
      }

      this.spawnBeatPattern(level, s);
    }

    // 2. Track Player Hands & Baton Trails (1P & 2P Co-op!)
    const hands = [];
    const pCount = Math.min(2, Math.max(1, players.length));
    const singleCursorFallback = pCount === 1 && players[0] &&
      Math.hypot(
        (players[0].rightHandScreen?.x ?? 0.65) - (players[0].leftHandScreen?.x ?? 0.35),
        (players[0].rightHandScreen?.y ?? 0.6) - (players[0].leftHandScreen?.y ?? 0.6)
      ) < 0.08;

    if (players[0]) {
      this.avatarState = {
        xNorm: players[0].mirroredX ?? 0.5,
        leftHand: players[0].leftHandScreen || { x: 0.35, y: 0.6 },
        rightHand: players[0].rightHandScreen || { x: 0.65, y: 0.6 },
        isJumping: !!players[0].isJumping
      };
    }

    for (let pIdx = 0; pIdx < pCount; pIdx++) {
      const p = players[pIdx];
      const raw = [
        { key: `p${pIdx}_L`, pt: p.leftHandScreen, color: pIdx === 0 ? '#38bdf8' : '#4ade80' },
        { key: `p${pIdx}_R`, pt: p.rightHandScreen, color: pIdx === 0 ? '#f472b6' : '#facc15' }
      ];

      for (const item of raw) {
        if (!item.pt) continue;
        const hx = item.pt.x * this.w;
        const hy = item.pt.y * this.h;
        let trail = this.handTrails.get(item.key);
        let speed = 6;
        if (!trail) {
          trail = { points: [{ x: hx, y: hy }], lastX: hx, lastY: hy };
          this.handTrails.set(item.key, trail);
        } else {
          speed = Math.hypot(hx - trail.lastX, hy - trail.lastY);
          trail.lastX = hx;
          trail.lastY = hy;
          trail.points.push({ x: hx, y: hy });
          if (trail.points.length > 12) trail.points.shift();
        }
        hands.push({ key: item.key, x: hx, y: hy, speed, color: item.color });
      }
    }
    this.lastHands = hands;

    // 3. Advance Notes along Radial Lanes & Judge Hits!
    const noteSpeed = (0.0135 + (level - 1) * 0.0018) * (0.68 + speedMultiplier * 0.32);
    const padHitRadius = Math.max(54, Math.min(72, this.w * 0.068));
    const feverMult = this.combo >= 20 ? 4 : (this.combo >= 10 ? 2 : 1);

    // Track chord pairs hit this frame
    const chordHitsThisFrame = new Set();

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.rot += 0.06;

      const pad = this.padDefs[n.padId];
      const padX = pad.xNorm * this.w;
      const padY = pad.yNorm * this.h;

      if (n.state === 'approaching') {
        n.progress += noteSpeed;

        const nx = this.originX + (padX - this.originX) * n.progress;
        const ny = this.originY + (padY - this.originY) * n.progress;

        // Hit judgment window around receptor ring [0.78 .. 1.12]
        if (n.progress >= 0.78 && n.progress <= 1.12) {
          const virtualTapped = this.virtualPadTap && this.virtualPadTap.timer > 0 && this.virtualPadTap.padId === n.padId;
          const matchingHands = hands.filter(h => Math.hypot(h.x - padX, h.y - padY) <= padHitRadius * 1.15);

          if (matchingHands.length > 0 || virtualTapped) {
            const bestSpeed = virtualTapped ? 12 : Math.max(...matchingHands.map(h => h.speed));

            if (n.type === 'glitch') {
              // Ouch! Touched a red Glitch Spike!
              n.state = 'missed';
              n.alpha = 0;
              this.combo = 0;
              this.addPopup(padX, padY - 24, '👾 GLITCH ZAP! DODGE RED!', '#ef4444', 1.15);
              if (onGlitchHit) onGlitchHit(padX, padY);
            } else {
              // Clean Rhythm Hit!
              n.state = 'hit';
              n.alpha = 0;
              this.padPulse[n.padId] = 1.0;
              this.notesHit++;
              this.notesTotal++;

              const prevCombo = this.combo;
              this.combo++;
              if (this.combo > this.maxCombo) this.maxCombo = this.combo;

              if (prevCombo < 10 && this.combo === 10) {
                this.bannerText = '🔥 10x GROOVE STREAK! 2x LASER STAGE!';
                this.bannerColor = '#38bdf8';
                this.bannerTimer = 90;
              } else if (prevCombo < 20 && this.combo === 20) {
                this.bannerText = '🌟 20x STAR FEVER! 4x CYBER WINGS UNLOCKED! 🌟';
                this.bannerColor = '#facc15';
                this.bannerTimer = 115;
              }

              const isPerfect = Math.abs(n.progress - 0.96) < 0.09;
              let basePts = 20;
              let label = isPerfect ? '💎 PERFECT! +20' : '✨ CATCH! +15';
              let col = pad.color;

              if (n.type === 'slash') {
                if (bestSpeed >= 3.2) {
                  basePts = 35;
                  label = '⚡ SUPER SLASH! +35';
                  col = '#facc15';
                } else {
                  basePts = 20;
                  label = '⚡ SLASH! +20';
                  col = '#fde047';
                }
                this.slashBursts.push({ x: padX, y: padY, angle: Math.atan2(n.dir.dy, n.dir.dx), timer: 18, color: col });
              } else if (n.type === 'chord') {
                basePts = 30;
                col = '#facc15';
                chordHitsThisFrame.add(n.chordGroup);

                // In single-mouse-cursor fallback, auto-resonate the symmetric twin note so solo mouse testers can enjoy Harmony Chords!
                if (singleCursorFallback) {
                  const partner = this.notes.find(other => other !== n && other.chordGroup === n.chordGroup && other.state === 'approaching');
                  if (partner) {
                    partner.state = 'hit';
                    partner.alpha = 0;
                    const pPad = this.padDefs[partner.padId];
                    this.padPulse[partner.padId] = 1.0;
                    basePts = 55;
                    label = '🌟 HARMONY CHORD! +55';
                    this.slashBursts.push({ x: pPad.xNorm * this.w, y: pPad.yNorm * this.h, angle: 0, timer: 20, color: '#facc15' });
                  }
                } else {
                  // Check if partner chord note was already hit within recent window
                  const partnerStillApproaching = this.notes.some(other => other !== n && other.chordGroup === n.chordGroup && other.state === 'approaching');
                  if (!partnerStillApproaching) {
                    basePts = 45;
                    label = '🌟🙌 TWIN HARMONY CHORD!';
                  } else {
                    label = '🌟 CHORD STAR!';
                  }
                }
              } else if (!isPerfect) {
                basePts = 15;
              }

              const finalPts = basePts * feverMult;
              if (feverMult > 1) {
                label = `${feverMult}x ${label}`;
              }

              this.addPopup(padX, padY - 26, label, col, n.type === 'chord' || feverMult >= 4 ? 1.2 : 1.0);
              if (n.type === 'chord') {
                if (onChord) onChord(padX, padY, finalPts, col);
              } else if (onHit) {
                onHit(padX, padY, finalPts, n.type === 'slash', col);
              }
            }
          }
        }

        // Passed beyond receptor ring
        if (n.progress > 1.15 && n.state === 'approaching') {
          n.state = 'missed';
          n.alpha = 0;
          if (n.type === 'glitch') {
            // Dodged red glitch spike cleanly!
            const pts = 20 * feverMult;
            this.addPopup(padX, padY - 18, `😎 CLEAN GROOVE! +${pts}`, '#4ade80', 0.95);
            if (onHit) onHit(padX, padY, pts, false, '#4ade80');
          } else {
            // Missed musical note resets combo streak (gentle for kids: doesn't drain hearts—only Glitch Spikes drain hearts!)
            this.notesTotal++;
            if (this.combo >= 5) {
              this.addPopup(padX, padY, 'MISS!', '#94a3b8', 0.9);
            }
            this.combo = 0;
          }
        }
      }

      if (n.alpha <= 0) {
        this.notes.splice(i, 1);
      }
    }

    // 4. Check Live Rank Upgrades!
    const rk = this.computeRank(currentScore);
    const rankOrder = ['C', 'B', 'A', 'S', 'SS'];
    if (rankOrder.indexOf(rk.rank) > rankOrder.indexOf(this.rank)) {
      this.rank = rk.rank;
      this.rankTitle = rk.title;
      this.bannerText = `🎖️ RANK UP: ${rk.rank} — ${rk.title.toUpperCase()}!`;
      this.bannerColor = rk.color;
      this.bannerTimer = 95;
      if (onRankUp) onRankUp(rk.rank, rk.title);
    } else {
      this.rank = rk.rank;
      this.rankTitle = rk.title;
    }

    // 5. Decay Slash Bursts & Popups
    for (let i = this.slashBursts.length - 1; i >= 0; i--) {
      this.slashBursts[i].timer--;
      if (this.slashBursts[i].timer <= 0) this.slashBursts.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  draw(ctx, frameCount, videoElement, level, score) {
    const w = this.w;
    const h = this.h;
    const isFever = this.combo >= 20;
    const isLaser = this.combo >= 10;
    const track = this.getTrack(level);

    ctx.save();

    // 1. Deep Synthwave Holographic Concert Backdrop
    const bg = ctx.createRadialGradient(this.originX, this.originY, 20, this.originX, this.originY, Math.max(w, h) * 0.8);
    if (isFever) {
      bg.addColorStop(0, '#4c1d95');
      bg.addColorStop(0.5, '#311042');
      bg.addColorStop(1, '#090514');
    } else {
      bg.addColorStop(0, '#1e1b4b');
      bg.addColorStop(0.55, '#0f172a');
      bg.addColorStop(1, '#020617');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sweeping Concert Laser Beams on 10+ Combo!
    if (isLaser) {
      ctx.save();
      const beamCount = isFever ? 8 : 4;
      for (let b = 0; b < beamCount; b++) {
        const ang = Math.sin(frameCount * 0.035 + b * 0.9) * 0.65 - Math.PI / 2;
        ctx.strokeStyle = isFever
          ? `hsla(${(frameCount * 4 + b * 45) % 360}, 95%, 65%, 0.22)`
          : (b % 2 === 0 ? 'rgba(56, 189, 248, 0.16)' : 'rgba(244, 114, 182, 0.16)');
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.moveTo(w * (0.15 + (b / Math.max(1, beamCount - 1)) * 0.7), h);
        ctx.lineTo(this.originX + Math.cos(ang) * w, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Perspective Neon Stage Grid & Equalizer Bars along Floor
    const floorY = h * 0.74;
    ctx.strokeStyle = isFever ? 'rgba(250, 204, 21, 0.28)' : 'rgba(236, 72, 153, 0.22)';
    ctx.lineWidth = 1.5;
    for (let g = -6; g <= 6; g++) {
      ctx.beginPath();
      ctx.moveTo(this.originX + g * 28, floorY);
      ctx.lineTo(this.originX + g * 145, h);
      ctx.stroke();
    }

    // Pulsing Spectrum Analyzer Bars across stage horizon!
    const barCount = 26;
    const barW = (w * 0.72) / barCount;
    for (let i = 0; i < barCount; i++) {
      const wave = Math.abs(Math.sin(frameCount * 0.12 + i * 0.45)) * (22 + this.beatPulse * 34 + (isFever ? 22 : 0));
      const bx = w * 0.14 + i * barW;
      ctx.fillStyle = `hsla(${(190 + i * 7 + (isFever ? frameCount * 3 : 0)) % 360}, 90%, 62%, 0.35)`;
      ctx.fillRect(bx, floorY - wave, barW - 4, wave);
    }

    // 2. Holographic Stage Performer mirroring player's real body & arms!
    this.drawHologramDancer(ctx, frameCount, isLaser, isFever);

    // 3. Radial Star Lane Guide Lines & 6 Receptor Pads
    const padRadius = Math.max(46, Math.min(62, w * 0.056));
    for (const pad of this.padDefs) {
      const px = pad.xNorm * w;
      const py = pad.yNorm * h;
      const pulse = this.padPulse[pad.id];

      // Faint lane beam from center star to receptor pad
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.originX, this.originY);
      ctx.lineTo(px, py);
      ctx.stroke();

      // Receptor Ring
      ctx.save();
      ctx.translate(px, py);
      const rScale = 1 + pulse * 0.28 + this.beatPulse * 0.05;
      ctx.scale(rScale, rScale);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.strokeStyle = pulse > 0.1 ? '#ffffff' : pad.color;
      ctx.shadowBlur = 16 + pulse * 20;
      ctx.shadowColor = pad.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      this.traceHexagon(ctx, 0, 0, padRadius);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pad.label, 0, 0);
      ctx.restore();
    }

    // 4. Draw Chord Link Beams between Simultaneous Twin Chord Notes!
    const activeChords = new Map();
    for (const n of this.notes) {
      if (n.state === 'approaching' && n.type === 'chord') {
        if (!activeChords.has(n.chordGroup)) activeChords.set(n.chordGroup, []);
        activeChords.get(n.chordGroup).push(n);
      }
    }
    for (const pair of activeChords.values()) {
      if (pair.length === 2) {
        const pA = this.padDefs[pair[0].padId];
        const pB = this.padDefs[pair[1].padId];
        const xA = this.originX + (pA.xNorm * w - this.originX) * pair[0].progress;
        const yA = this.originY + (pA.yNorm * h - this.originY) * pair[0].progress;
        const xB = this.originX + (pB.xNorm * w - this.originX) * pair[1].progress;
        const yB = this.originY + (pB.yNorm * h - this.originY) * pair[1].progress;
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#facc15';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xB, yB);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Draw Approaching Rhythm Notes!
    for (const n of this.notes) {
      if (n.state !== 'approaching') continue;
      this.drawRhythmNote(ctx, n, padRadius, frameCount);
    }

    // 6. Slash Katana Bursts
    for (const sb of this.slashBursts) {
      ctx.save();
      ctx.translate(sb.x, sb.y);
      ctx.rotate(sb.angle);
      ctx.globalAlpha = sb.timer / 18;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = sb.color;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-68, 0);
      ctx.lineTo(68, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Draw Glowing Stage Ribbon Batons on Player Hands!
    for (const [key, trail] of this.handTrails.entries()) {
      if (trail.points.length < 2) continue;
      const handObj = this.lastHands.find(h => h.key === key);
      const col = handObj ? handObj.color : '#38bdf8';
      ctx.save();
      for (let i = 1; i < trail.points.length; i++) {
        const frac = i / trail.points.length;
        ctx.strokeStyle = col;
        ctx.globalAlpha = frac * 0.65;
        ctx.lineWidth = frac * 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
        ctx.lineTo(trail.points[i].x, trail.points[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const hObj of this.lastHands) {
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = hObj.color;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = hObj.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(hObj.x, hObj.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 8. Top-Right Starri Combo & Rank Badge HUD + Now-Playing Song Pill
    this.drawStageHUD(ctx, track, isFever);

    // 9. Bottom-Left Rectangular Live Concert Webcam PiP (just like Starri in the review!)
    this.drawConcertPiP(ctx, videoElement, isFever);

    // 10. Floating Popups & Fever Banners
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(23 * ft.scale)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#090514';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.bannerTimer / 18);
      const bw = Math.min(w * 0.80, 580);
      const bx = (w - bw) / 2;
      const by = 98;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 42, 21);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 18px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, w / 2, by + 21);
      ctx.restore();
    }

    ctx.restore();
  }

  traceHexagon(ctx, cx, cy, r) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  drawHologramDancer(ctx, frameCount, isLaser, isFever) {
    const cx = this.originX + (this.avatarState.xNorm - 0.5) * 90;
    const cy = this.originY + 34 - (this.avatarState.isJumping ? 22 : 0) - this.beatPulse * 6;

    ctx.save();
    ctx.translate(cx, cy);

    // Radiant Cyber-Star Wings unlocked during 20x STAR FEVER!
    if (isFever) {
      const flap = Math.sin(frameCount * 0.18) * 0.16;
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.scale(dir, 1);
        ctx.rotate(flap);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
        ctx.strokeStyle = '#facc15';
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(14, -18);
        ctx.quadraticCurveTo(95, -82, 128, -28);
        ctx.quadraticCurveTo(92, 4, 24, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    const holoColor = isFever ? '#facc15' : (isLaser ? '#f472b6' : '#38bdf8');
    ctx.strokeStyle = holoColor;
    ctx.shadowBlur = 18;
    ctx.shadowColor = holoColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // Hologram Torso Diamond
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(26, -6);
    ctx.lineTo(0, 44);
    ctx.lineTo(-26, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hologram Head + DJ Headphones on Combo >= 10!
    ctx.beginPath();
    ctx.arc(0, -50, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isLaser) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -52, 22, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(-25, -56, 7, 14);
      ctx.fillRect(18, -56, 7, 14);
    }

    // Mirrored Hologram Arms reaching toward player's live hand coordinates!
    const lArmX = (this.avatarState.leftHand.x - 0.5) * 180;
    const lArmY = (this.avatarState.leftHand.y - 0.55) * 150;
    const rArmX = (this.avatarState.rightHand.x - 0.5) * 180;
    const rArmY = (this.avatarState.rightHand.y - 0.55) * 150;

    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-22, -16);
    ctx.lineTo(lArmX, lArmY);
    ctx.stroke();

    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(22, -16);
    ctx.lineTo(rArmX, rArmY);
    ctx.stroke();

    ctx.restore();
  }

  drawRhythmNote(ctx, n, padRadius, frameCount) {
    const pad = this.padDefs[n.padId];
    const padX = pad.xNorm * this.w;
    const padY = pad.yNorm * this.h;

    const nx = this.originX + (padX - this.originX) * n.progress;
    const ny = this.originY + (padY - this.originY) * n.progress;
    const scale = 0.25 + n.progress * 0.85;
    const r = padRadius * 0.72 * scale;

    // Shrinking timing-ring around receptor pad when note is close!
    if (n.progress > 0.45 && n.type !== 'glitch') {
      const rem = Math.max(0, 1.0 - n.progress);
      ctx.save();
      ctx.strokeStyle = n.type === 'chord' ? '#facc15' : pad.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(padX, padY, padRadius + rem * 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(nx, ny);

    if (n.type === 'glitch') {
      ctx.rotate(frameCount * 0.15);
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#fca5a5';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? r * 1.18 : r * 0.65;
        const a = (i / (spikes * 2)) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-frameCount * 0.15);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(12, Math.round(r * 0.75))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👾', 0, 1);
      ctx.restore();
      return;
    }

    if (n.type === 'chord') {
      // 5-Point Golden Harmony Star!
      ctx.rotate(n.rot * 0.5);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r * 1.22 : r * 0.55;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (n.type === 'slash') {
      // Glowing Gold/Orange Slash Diamond + Swipe Arrow!
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fef08a';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.lineTo(r * 1.15, 0);
      ctx.lineTo(0, r * 1.15);
      ctx.lineTo(-r * 1.15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(13, Math.round(r * 0.85))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 1);
      ctx.restore();
      return;
    }

    // Default CATCH Gem (Octagon / Crystal)
    ctx.fillStyle = pad.color;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = pad.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStageHUD(ctx, track, isFever) {
    const w = this.w;

    ctx.save();
    // Bottom-center Now Playing Pill
    const pillW = 280;
    const pillX = (w - pillW) / 2;
    const pillY = this.h - 52;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = isFever ? '#facc15' : 'rgba(244, 114, 182, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${track.title} • ${track.bpm} BPM`, w / 2, pillY + 18);

    // Top-Right Combo & Rank Emblem (below main HUD bar)
    const rx = w - 108;
    const ry = 136;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isFever ? '#facc15' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(rx - 78, ry - 30, 156, 74, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFever ? '#facc15' : '#38bdf8';
    ctx.font = 'bold 24px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`x${this.combo}`, rx - 64, ry - 4);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.fillText(isFever ? 'STAR FEVER 4x!' : (this.combo >= 10 ? 'LASER 2x!' : 'COMBO'), rx - 64, ry + 18);

    // Gleaming Rank Badge Circle on right side of card
    const rankColors = { C: '#94a3b8', B: '#4ade80', A: '#38bdf8', S: '#f472b6', SS: '#facc15' };
    const rCol = rankColors[this.rank] || '#38bdf8';
    ctx.fillStyle = rCol;
    ctx.beginPath();
    ctx.arc(rx + 44, ry + 6, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090514';
    ctx.font = 'bold 20px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.rank, rx + 44, ry + 7);
    ctx.restore();
  }

  drawConcertPiP(ctx, videoElement, isFever) {
    const pw = 132;
    const ph = 98;
    const px = 20;
    const py = this.h - ph - 18;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.clip();

    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      ctx.save();
      ctx.translate(px + pw, py);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, pw, ph);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px, py, pw, ph);
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎤🌟', px + pw / 2, py + ph / 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = isFever ? '#facc15' : '#f472b6';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.stroke();
    ctx.restore();
  }
}
