/**
 * tennis.js
 * Super Power Tennis (v2 — Ground-Up Redesign!)
 *
 * Designed from the ground up for effortless, exhilarating webcam & mouse play:
 * 1. DIRECT 1:1 HAND RACKETS: Your real hands hold giant glowing Power Rackets directly on screen
 *    (move left/right/up/down anywhere on screen—no disconnected tiny avatar footwork!).
 *    Hold both hands together to fuse into a GIANT 2-HANDED SUPER RACKET!
 * 2. ZERO DEPTH CONFUSION: Incoming shots project a clear Target Strike Ring + shrinking Timing Halo
 *    at the exact 2D screen spot where the ball arrives, with generous ~1.9s reaction hang-time.
 *    If your racket visually touches the ball on screen, it ALWAYS connects!
 * 3. MARIO POWER TENNIS MAGIC:
 *    - Aim Left / Center / Right with your swing direction!
 *    - 🔴 Topspin Drives, 🔵 Curving Banana Slices, ⭐ Overhead Star Smashes & 🔥 MEGA FIREBALL POWER SHOTS!
 *    - Shoot through floating 🍄 Mega-Racket Boxes, 🪙 Coin Rings & 💖 Heart Rings above the net!
 *    - Live Stadium Jumbotron Big-Screen shows YOU on camera cheering in the arena!
 */

const TENNIS_PTS = ['0', '15', '30', '40'];

export class PowerTennisGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // Match & Trophy stats
    this.playerPointIdx = 0;
    this.bossPointIdx = 0;
    this.gamesWon = 0;
    this.bossGames = 0;
    this.powerWinners = 0;
    this.rallyCount = 0;

    // Power Meter [0 .. 100] & Power-Ups
    this.powerGauge = 50;      // Start half-charged so kids reach their 1st Power Shot fast!
    this.megaRacketTimer = 0;  // 🍄 2x Giant Racket timer
    this.flashTimer = 0;

    // Callout Banner
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#fde047';
    this.hitPopups = [];       // Floating "PERFECT!", "SLICE!", "🔥 FIREBALL!" popups

    // Parametric 3D->2D Ball Flight State (guarantees exact target arrival & rock-solid 2D screen collision!)
    this.ball = {
      active: false,
      dir: 1,                  // +1 = flying toward Boss (far), -1 = flying toward Player (near)
      t: 0,                    // Progress [0.0 .. 1.0+] along current flight
      duration: 95,            // Total frames for flight
      startX: 0,               // Court X [-1 .. 1]
      startY: 0.25,            // Altitude [0 .. 1.2]
      startZ: 0.06,            // Court Z [0=near .. 1=far]
      endX: 0,
      endY: 0.22,              // Strike height at destination
      endZ: 0.94,
      arcHeight: 0.42,         // Peak parabolic height above court
      curveX: 0,               // Mid-flight banana curve offset
      shotType: 'normal',      // 'normal' | 'topspin' | 'slice' | 'smash' | 'power' | 'boss_power' | 'lob'
      isStarLob: false,        // High golden star smash opportunity!
      screenX: 0,
      screenY: 0,
      groundY: 0,
      radius: 26,
      trail: []
    };

    // Match Phase: 'serve_ready' | 'rally' | 'between_points'
    this.phase = 'serve_ready';
    this.phaseTimer = 0;

    // Floating Mario Gimmick Rings above the Net (z = 0.50)
    this.netGimmick = {
      active: true,
      x: 0.15,
      vx: 0.005,
      kind: 'coin_ring',       // 'coin_ring' | 'mushroom' | 'heart'
      rot: 0,
      cooldown: 0
    };

    // Far-Court Boss Rival (Koopa -> Kong -> Bowser-Style Dragon)
    this.boss = {
      x: 0,
      z: 0.94,
      swingTimer: 0,
      stunTimer: 0,            // Knocked spinning by Player's Fireball Power Shot!
      tier: 1,
      charge: 0
    };

    // Tracked Rackets & Swing Arcs
    this.prevHands = new Map();
    this.rackets = [];
    this.swingBursts = [];
    this.bounceRings = [];
    this.clickSwingBoost = 0;

    this.resize(canvasWidth, canvasHeight);
    this.reset(false);
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.nearY = canvasHeight - 58;
    this.farY = Math.max(175, canvasHeight * 0.36);
  }

  reset(keepMatchStats = false) {
    if (!keepMatchStats) {
      this.playerPointIdx = 0;
      this.bossPointIdx = 0;
      this.gamesWon = 0;
      this.bossGames = 0;
      this.powerWinners = 0;
      this.powerGauge = 50;
      this.megaRacketTimer = 0;
    }

    this.rallyCount = 0;
    this.hitPopups = [];
    this.swingBursts = [];
    this.bounceRings = [];
    this.prevHands.clear();
    this.preparePlayerServe('🎾 TOUCH OR SWING AT THE BALL TO SERVE!');
  }

  triggerManualSwing() {
    this.clickSwingBoost = 12;
  }

  showBanner(text, color = '#fde047', duration = 68) {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerTimer = duration;
  }

  addPopup(x, y, text, color = '#fde047') {
    this.hitPopups.push({ x, y, text, color, alpha: 1.0, vy: -2.2, scale: 0.7 });
  }

  // Project 3D Court Point (x in [-1..1], y >= 0 altitude, z in [0..1]) -> 2D Screen Pixels
  project(x, y, z) {
    const clampedZ = Math.max(-0.15, Math.min(1.15, z));
    const perspective = 1 / (1 + clampedZ * 0.95);
    const groundY = this.nearY - (this.nearY - this.farY) * ((clampedZ * 1.55) / (1 + clampedZ * 0.55));
    const halfCourtW = this.w * 0.44 * perspective;
    const screenX = this.w * 0.5 + x * halfCourtW;
    const screenY = groundY - y * (this.h * 0.46) * perspective;
    return { screenX, screenY, groundY, scale: perspective };
  }

  // Inverse helper: convert a 2D screen X [0..w] near player court into Court X [-0.9..0.9]
  screenXToCourtX(px) {
    const norm = (px - this.w * 0.5) / (this.w * 0.42);
    return Math.max(-0.88, Math.min(0.88, norm));
  }

  preparePlayerServe(bannerMsg = '') {
    this.phase = 'serve_ready';
    this.rallyCount = 0;
    this.boss.stunTimer = 0;

    // Place floating big serve ball comfortably in center-right or center-left strike zone!
    const side = (this.playerPointIdx + this.bossPointIdx) % 2 === 0 ? 0.22 : -0.22;
    this.ball.dir = 1;
    this.ball.t = 0;
    this.ball.startX = side;
    this.ball.startY = 0.32;
    this.ball.startZ = 0.08;
    this.ball.shotType = 'normal';
    this.ball.isStarLob = false;
    this.ball.trail = [];

    const p = this.project(this.ball.startX, this.ball.startY, this.ball.startZ);
    this.ball.screenX = p.screenX;
    this.ball.screenY = p.screenY;
    this.ball.groundY = p.groundY;
    this.ball.radius = 34;

    if (bannerMsg) {
      this.showBanner(bannerMsg, '#fde047', 85);
    }
  }

  launchShot({ dir, fromX, fromY, fromZ, toX, toY, toZ, duration, arcHeight, curveX = 0, shotType = 'normal', isStarLob = false }) {
    const b = this.ball;
    b.dir = dir;
    b.t = 0;
    b.duration = Math.max(20, duration);
    b.startX = fromX;
    b.startY = fromY;
    b.startZ = fromZ;
    b.endX = Math.max(-0.82, Math.min(0.82, toX));
    b.endY = toY;
    b.endZ = toZ;
    b.arcHeight = arcHeight;
    b.curveX = curveX;
    b.shotType = shotType;
    b.isStarLob = isStarLob;
    b.bouncedVisual = false;
    b.trail = [];
  }

  // Evaluate ball 3D position at normalized progress u in [0 .. 1.18] (includes realistic 1-bounce before strike!)
  evaluateBallAt(u) {
    const b = this.ball;
    const clampedU = Math.max(0, u);
    const z = b.startZ + (b.endZ - b.startZ) * clampedU;
    const curveOffset = Math.sin(Math.min(1, clampedU) * Math.PI) * b.curveX;
    const x = b.startX + (b.endX - b.startX) * clampedU + curveOffset;

    // Realistic tennis trajectory:
    // Ball arcs over the net, bounces on the court at u = 0.78, and rises smoothly to racket waist/chest height at u = 1.0!
    let y = 0;
    const bounceU = 0.78;
    if (clampedU <= bounceU) {
      const s = clampedU / bounceU; // 0 -> 1 from hitter to court bounce
      y = b.startY * (1 - s) + Math.sin(s * Math.PI) * b.arcHeight;
    } else {
      // After bounce (u in [0.78 .. 1.18]): rises smoothly into the sweet-spot target ring at u = 1.0!
      const post = (clampedU - bounceU) / (1.0 - bounceU); // 0 at bounce -> 1.0 at strike zone -> 1.8 past player
      y = Math.sin(Math.min(1.85, post) * (Math.PI * 0.56)) * b.endY;
    }

    return { x, y: Math.max(0, y), z };
  }

  buildPlayerRackets(players) {
    const rackets = [];
    const megaScale = this.megaRacketTimer > 0 ? 1.55 : 1.0;
    const isPowerFull = this.powerGauge >= 100;

    const count = Math.min(2, Math.max(1, players.length));

    for (let pIdx = 0; pIdx < count; pIdx++) {
      const p = players[pIdx];
      const isP2 = pIdx === 1;
      const baseColor = isP2 ? '#4ade80' : '#ef4444';
      const rimColor = isPowerFull ? '#fde047' : (isP2 ? '#38bdf8' : '#facc15');

      // If playing via mouse fallback, render ONE clean centered racket right on the cursor!
      if (p.isMouseFallback) {
        const mx = ((p.leftHandScreen.x + p.rightHandScreen.x) * 0.5) * this.w;
        const my = p.leftHandScreen.y * this.h;
        rackets.push(this.trackSingleRacket(`mouse_${pIdx}`, mx, my, baseColor, rimColor, 1.15 * megaScale, 'P1'));
        continue;
      }

      const lx = (p.leftHandScreen ? p.leftHandScreen.x : 0.35) * this.w;
      const ly = (p.leftHandScreen ? p.leftHandScreen.y : 0.70) * this.h;
      const rx = (p.rightHandScreen ? p.rightHandScreen.x : 0.65) * this.w;
      const ry = (p.rightHandScreen ? p.rightHandScreen.y : 0.70) * this.h;

      // If player clasps both hands close together (< 105px), fuse into a GIANT 2-HANDED SUPER RACKET!
      const handDist = Math.hypot(rx - lx, ry - ly);
      if (handDist < 105) {
        const midX = (lx + rx) * 0.5;
        const midY = (ly + ry) * 0.5;
        rackets.push(
          this.trackSingleRacket(
            `p${pIdx}_2H`,
            midX,
            midY,
            '#f97316',
            '#fde047',
            1.35 * megaScale,
            isP2 ? 'P2 2H⚡' : '2-HAND⚡'
          )
        );
      } else {
        rackets.push(
          this.trackSingleRacket(`p${pIdx}_L`, lx, ly, isP2 ? '#22c55e' : '#38bdf8', rimColor, 1.0 * megaScale, isP2 ? 'P2' : 'L'),
          this.trackSingleRacket(`p${pIdx}_R`, rx, ry, baseColor, rimColor, 1.0 * megaScale, isP2 ? 'P2' : 'R')
        );
      }
    }

    return rackets;
  }

  trackSingleRacket(id, x, y, handleColor, rimColor, scale, label) {
    const prev = this.prevHands.get(id);
    let vx = 0;
    let vy = 0;
    if (prev) {
      vx = (prev.vx || 0) * 0.45 + (x - prev.x) * 0.55;
      vy = (prev.vy || 0) * 0.45 + (y - prev.y) * 0.55;
      prev.x = x;
      prev.y = y;
      prev.vx = vx;
      prev.vy = vy;
    } else {
      this.prevHands.set(id, { x, y, vx: 0, vy: 0 });
    }

    let speed = Math.hypot(vx, vy);
    if (this.clickSwingBoost > 0) {
      speed = Math.max(speed, 26);
      vy = Math.min(vy, -14);
    }

    // Natural wrist tilt based on horizontal screen position & velocity
    const tilt = Math.max(-0.65, Math.min(0.65, (x - this.w * 0.5) / (this.w * 0.9) + vx * 0.015));

    return {
      id,
      x,
      y,
      vx,
      vy,
      speed,
      scale,
      hitRadius: 72 * scale, // Big, forgiving sweet-spot!
      tilt,
      handleColor,
      rimColor,
      label
    };
  }

  getScoreCallout() {
    if (this.playerPointIdx >= 3 && this.bossPointIdx >= 3) {
      if (this.playerPointIdx === this.bossPointIdx) return '⚡ DEUCE!';
      return this.playerPointIdx > this.bossPointIdx ? '🔥 ADVANTAGE YOU!' : '⚠️ ADVANTAGE BOSS!';
    }
    return `${TENNIS_PTS[Math.min(3, this.playerPointIdx)]} - ${TENNIS_PTS[Math.min(3, this.bossPointIdx)]}`;
  }

  awardPoint(winner, label, callbacks, livesRemaining = 5) {
    const { onPointWon, onGameWon, onPointLost } = callbacks;
    this.phase = 'between_points';
    this.phaseTimer = 42;

    if (winner === 'player') {
      this.playerPointIdx++;
      if (this.playerPointIdx >= 4 && (this.playerPointIdx - this.bossPointIdx >= 1)) {
        this.gamesWon++;
        this.playerPointIdx = 0;
        this.bossPointIdx = 0;
        this.showBanner(`🏆 GAME WON!! (GAMES: ${this.gamesWon}) +100!`, '#4ade80', 88);
        if (onGameWon) onGameWon();
      } else {
        this.showBanner(`${label} • ${this.getScoreCallout()}`, '#38bdf8', 70);
        if (onPointWon) onPointWon();
      }
    } else {
      this.bossPointIdx++;
      if (this.bossPointIdx >= 4 && (this.bossPointIdx - this.playerPointIdx >= 1)) {
        this.bossGames++;
        this.playerPointIdx = 0;
        this.bossPointIdx = 0;
      }
      this.showBanner(`${label} • ${this.getScoreCallout()}`, '#fb7185', 70);
      if (onPointLost) onPointLost();
    }
  }

  strikeBallWithRacket(racket, isServe, level, speedMultiplier, callbacks) {
    const { onHit, onPowerShot } = callbacks;
    const b = this.ball;

    this.rallyCount++;
    this.swingBursts.push({
      x: racket.x,
      y: racket.y,
      radius: 26,
      alpha: 1.0,
      color: this.powerGauge >= 100 ? '#f97316' : racket.rimColor
    });

    // Aim across the far court using:
    // 1. Swing horizontal velocity (swipe left -> goes left, swipe right -> goes right!)
    // 2. Cross-court natural angle if holding racket steady
    const courtFromX = this.screenXToCourtX(racket.x);
    let aimX = -courtFromX * 0.45 + (racket.vx / 26) * 0.72;
    if (Math.abs(racket.vx) < 3.5) {
      // Smart cross-court assist away from Boss when blocking!
      aimX = this.boss.x >= 0 ? -0.52 : 0.52;
    }
    aimX = Math.max(-0.78, Math.min(0.78, aimX));

    const speedFactor = speedMultiplier * 0.5 + 0.5;
    let shotType = 'normal';
    let duration = Math.round(42 / speedFactor);
    let arcHeight = 0.38;
    let curveX = 0;

    const wantsPowerShot = this.powerGauge >= 100 && (racket.speed > 8 || racket.id.includes('2H') || this.clickSwingBoost > 0);

    if (wantsPowerShot) {
      // 🔥 MARIO MEGA FIREBALL POWER SHOT!!
      this.powerGauge = 0;
      this.flashTimer = 10;
      shotType = 'power';
      duration = Math.round(25 / speedFactor);
      arcHeight = 0.24;
      aimX = this.boss.x >= 0 ? -0.70 : 0.70;
      this.addPopup(racket.x, racket.y - 36, '🔥 FIREBALL!!', '#f97316');
      this.showBanner('🔥 MEGA FIREBALL POWER SHOT!!', '#f97316', 52);
      if (onPowerShot) onPowerShot({ screenX: racket.x, screenY: racket.y });
    } else if (b.isStarLob || (racket.y < this.h * 0.48 && racket.speed > 7)) {
      // ⭐ OVERHEAD STAR SMASH!
      this.powerGauge = Math.min(100, this.powerGauge + 30);
      shotType = 'smash';
      duration = Math.round(29 / speedFactor);
      arcHeight = 0.24;
      aimX = this.boss.x >= 0 ? -0.66 : 0.66;
      this.addPopup(racket.x, racket.y - 34, '⭐ STAR SMASH!', '#facc15');
      if (onHit) onHit('smash', { screenX: racket.x, screenY: racket.y }, true);
    } else if (Math.abs(racket.vx) > 9.5) {
      // 🔵 CURVING BANANA SLICE!
      this.powerGauge = Math.min(100, this.powerGauge + 22);
      shotType = 'slice';
      duration = Math.round(40 / speedFactor);
      arcHeight = 0.34;
      curveX = (racket.vx > 0 ? -1 : 1) * 0.28;
      this.addPopup(racket.x, racket.y - 30, '🌀 CURVE SLICE!', '#38bdf8');
      if (onHit) onHit('normal', { screenX: racket.x, screenY: racket.y }, false);
    } else if (racket.speed > 6.5) {
      // 🔴 BLAZING TOPSPIN!
      this.powerGauge = Math.min(100, this.powerGauge + 22);
      shotType = 'topspin';
      duration = Math.round(35 / speedFactor);
      arcHeight = 0.32;
      this.addPopup(racket.x, racket.y - 30, '⚡ TOPSPIN!', '#fb923c');
      if (onHit) onHit('normal', { screenX: racket.x, screenY: racket.y }, false);
    } else {
      // 🟢 CLEAN RALLY BLOCK / VOLLEY!
      this.powerGauge = Math.min(100, this.powerGauge + 16);
      shotType = 'normal';
      duration = Math.round(42 / speedFactor);
      arcHeight = 0.40;
      this.addPopup(racket.x, racket.y - 28, '🎾 NICE!', '#4ade80');
      if (onHit) onHit('normal', { screenX: racket.x, screenY: racket.y }, false);
    }

    const fromY = Math.max(0.14, Math.min(0.75, (this.nearY - racket.y) / (this.h * 0.44)));
    this.phase = 'rally';
    this.launchShot({
      dir: 1,
      fromX: courtFromX,
      fromY,
      fromZ: 0.08,
      toX: aimX,
      toY: 0.22,
      toZ: 0.94,
      duration,
      arcHeight,
      curveX,
      shotType,
      isStarLob: false
    });
  }

  update(players, fallbackControls, level, speedMultiplier, callbacks, currentLives = 5) {
    const { onHit, onItemHit, onHeal } = callbacks;
    this.boss.tier = level;

    if (this.flashTimer > 0) this.flashTimer--;
    if (this.bannerTimer > 0) this.bannerTimer--;
    if (this.megaRacketTimer > 0) this.megaRacketTimer--;
    if (this.clickSwingBoost > 0) this.clickSwingBoost--;

    // Build 1:1 Screen-Space Player Rackets
    this.rackets = this.buildPlayerRackets(players);

    // Update Floating Net Gimmick Ring (Mario Coins / Mega-Racket Mushroom / Bonus Heart!)
    if (this.netGimmick.active) {
      this.netGimmick.x += this.netGimmick.vx * (speedMultiplier * 0.6 + 0.4);
      this.netGimmick.rot += 0.05;
      if (this.netGimmick.x > 0.58 || this.netGimmick.x < -0.58) {
        this.netGimmick.vx *= -1;
      }
    } else {
      this.netGimmick.cooldown--;
      if (this.netGimmick.cooldown <= 0) {
        this.netGimmick.active = true;
        this.netGimmick.x = (Math.random() - 0.5) * 0.7;
        const r = Math.random();
        this.netGimmick.kind = (currentLives < 5 && r < 0.28) ? 'heart' : (r < 0.62 ? 'mushroom' : 'coin_ring');
      }
    }

    // Update visual bursts, popups & court bounce rings
    for (let i = this.swingBursts.length - 1; i >= 0; i--) {
      this.swingBursts[i].radius += 5.5;
      this.swingBursts[i].alpha -= 0.07;
      if (this.swingBursts[i].alpha <= 0) this.swingBursts.splice(i, 1);
    }
    for (let i = this.hitPopups.length - 1; i >= 0; i--) {
      const hp = this.hitPopups[i];
      hp.y += hp.vy;
      hp.scale = Math.min(1.08, hp.scale + 0.08);
      hp.alpha -= 0.024;
      if (hp.alpha <= 0) this.hitPopups.splice(i, 1);
    }
    for (let i = this.bounceRings.length - 1; i >= 0; i--) {
      this.bounceRings[i].radius += 2.2;
      this.bounceRings[i].alpha -= 0.045;
      if (this.bounceRings[i].alpha <= 0) this.bounceRings.splice(i, 1);
    }

    // =========================================================
    // PHASE 1: BETWEEN POINTS
    // =========================================================
    if (this.phase === 'between_points') {
      this.phaseTimer--;
      if (this.phaseTimer <= 0) {
        this.preparePlayerServe('🎾 TOUCH THE FLOATING BALL TO SERVE!');
      }
      return;
    }

    // =========================================================
    // PHASE 2: SERVE READY (Touch floating ball with ANY racket!)
    // =========================================================
    if (this.phase === 'serve_ready') {
      const hoverY = 0.34 + Math.sin(performance.now() * 0.005) * 0.05;
      const p = this.project(this.ball.startX, hoverY, this.ball.startZ);
      this.ball.screenX = p.screenX;
      this.ball.screenY = p.screenY;
      this.ball.groundY = p.groundY;
      this.ball.radius = 35;

      for (const r of this.rackets) {
        const dist = Math.hypot(r.x - this.ball.screenX, r.y - this.ball.screenY);
        if (dist < r.hitRadius + this.ball.radius) {
          this.strikeBallWithRacket(r, true, level, speedMultiplier, callbacks);
          break;
        }
      }
      return;
    }

    // =========================================================
    // PHASE 3: ACTIVE RALLY FLIGHT!
    // =========================================================
    const b = this.ball;
    b.t += 1 / b.duration;

    const pos3D = this.evaluateBallAt(b.t);
    const proj = this.project(pos3D.x, pos3D.y, pos3D.z);
    b.screenX = proj.screenX;
    b.screenY = proj.screenY;
    b.groundY = proj.groundY;
    // Chunky, super-readable tennis ball size (scales from 15px at far court up to 40px at your racket!)
    b.radius = Math.max(14, 38 * proj.scale);

    b.trail.push({ x: b.screenX, y: b.screenY, r: b.radius });
    if (b.trail.length > (b.shotType === 'power' ? 20 : 13)) {
      b.trail.shift();
    }

    // Trigger visual court bounce ring right as ball bounces at t = 0.78!
    if (!b.bouncedVisual && b.t >= 0.78) {
      b.bouncedVisual = true;
      this.bounceRings.push({ x: proj.screenX, y: proj.groundY, radius: 10, alpha: 0.95 });
    }

    // Check Gimmick Net Ring Hit when Player's Shot crosses the Net (t ~ 0.45)!
    if (this.netGimmick.active && b.dir === 1 && Math.abs(pos3D.z - 0.5) < 0.05) {
      if (Math.abs(pos3D.x - this.netGimmick.x) < 0.24) {
        const gProj = this.project(this.netGimmick.x, 0.36, 0.5);
        if (this.netGimmick.kind === 'mushroom') {
          this.megaRacketTimer = 480; // 8s Giant Golden Racket!
          this.powerGauge = Math.min(100, this.powerGauge + 35);
          this.showBanner('🍄 GIANT MEGA-RACKET UNLOCKED!', '#fde047', 65);
        } else if (this.netGimmick.kind === 'heart') {
          this.showBanner('💖 EXTRA HEART RING!', '#f472b6', 60);
          if (onHeal) onHeal(gProj.screenX, gProj.screenY);
        } else {
          this.powerGauge = Math.min(100, this.powerGauge + 45);
          this.showBanner('🪙 GOLDEN RING! +30 PTS & POWER!', '#fde047', 58);
        }
        this.netGimmick.active = false;
        this.netGimmick.cooldown = 180;
        if (onItemHit) onItemHit(gProj.screenX, gProj.screenY);
      }
    }

    // ---------------------------------------------------------
    // A. BALL FLYING TOWARD BOSS (b.dir === 1)
    // ---------------------------------------------------------
    if (b.dir === 1) {
      if (this.boss.swingTimer > 0) this.boss.swingTimer--;
      if (this.boss.stunTimer > 0) this.boss.stunTimer--;

      // Boss chases predicted landing X at far baseline
      const bossSpeed = (0.0155 + (level - 1) * 0.0028) * (speedMultiplier * 0.55 + 0.45) * (this.boss.stunTimer > 0 ? 0.32 : 1.0);
      const dxBoss = b.endX - this.boss.x;
      if (Math.abs(dxBoss) > bossSpeed) {
        this.boss.x += Math.sign(dxBoss) * bossSpeed;
      } else {
        this.boss.x = b.endX;
      }

      // Boss return window at t >= 0.96
      if (b.t >= 0.96 && b.t <= 1.08) {
        const bossReach = b.shotType === 'power' ? 0.22 : (b.shotType === 'smash' ? 0.26 : 0.34);
        if (Math.abs(pos3D.x - this.boss.x) <= bossReach) {
          this.boss.swingTimer = 18;
          this.rallyCount++;

          // Brisk ~1.0s - 1.2s arcade rally pace toward Player!
          const returnSpeedFactor = (speedMultiplier * 0.5 + 0.5) * (1 + (level - 1) * 0.08);
          let toPlayerX = (Math.random() - 0.5) * 1.24; // [-0.62 .. +0.62] comfortably inside screen!
          let toPlayerY = 0.28 + Math.random() * 0.16;  // Comfortable waist-to-shoulder height!
          let bossShotType = 'normal';
          let isStarLob = false;
          let returnFrames = Math.round(66 / returnSpeedFactor);
          let curve = 0;

          if (b.shotType === 'power') {
            // Player's Fireball Power Shot blasts the Boss spinning & pops up a juicy Golden Star Smash Lob!
            this.boss.stunTimer = 55;
            isStarLob = true;
            toPlayerY = 0.52; // High overhead smash height!
            returnFrames = Math.round(80 / returnSpeedFactor);
            this.showBanner('💥 BOSS BLASTED! OVERHEAD STAR SMASH IT!', '#fde047', 55);
          } else if (Math.random() < 0.28) {
            // High Star-Zone Lob opportunity!
            isStarLob = true;
            toPlayerY = 0.50;
            bossShotType = 'lob';
            returnFrames = Math.round(76 / returnSpeedFactor);
          } else if (level >= 2 && Math.random() < 0.25) {
            bossShotType = 'slice';
            curve = (Math.random() < 0.5 ? -1 : 1) * 0.20;
          }

          const bProj = this.project(this.boss.x, 0.24, this.boss.z);
          if (onHit) onHit(b.shotType === 'power' ? 'smash' : 'normal', bProj, false);

          this.launchShot({
            dir: -1,
            fromX: this.boss.x,
            fromY: 0.26,
            fromZ: 0.94,
            toX: toPlayerX,
            toY: toPlayerY,
            toZ: 0.08,
            duration: returnFrames,
            arcHeight: isStarLob ? 0.62 : 0.42,
            curveX: curve,
            shotType: bossShotType,
            isStarLob
          });
          return;
        }
      }

      // Clean Winner past the Boss!
      if (b.t > 1.10) {
        if (b.shotType === 'power' || b.shotType === 'smash') {
          this.powerWinners++;
        }
        const winCall = b.shotType === 'power'
          ? '🔥 FIREBALL WINNER!!'
          : (b.shotType === 'smash' ? '⭐ STAR SMASH WINNER!' : '🎾 CLEAN WINNER!!');
        this.awardPoint('player', winCall, callbacks, currentLives);
      }
    }

    // ---------------------------------------------------------
    // B. BALL FLYING TOWARD PLAYER (b.dir === -1)
    //    100% Visual 2D Screen-Space Collision With Your Rackets!
    // ---------------------------------------------------------
    else if (b.dir === -1) {
      // Generous hittable window: from just before bounce (t = 0.72) all the way past the baseline (t = 1.15)!
      if (b.t >= 0.72 && b.t <= 1.15) {
        for (const r of this.rackets) {
          const dist = Math.hypot(r.x - b.screenX, r.y - b.screenY);
          if (dist <= r.hitRadius + b.radius) {
            this.strikeBallWithRacket(r, false, level, speedMultiplier, callbacks);
            return;
          }
        }
      }

      // Only counts as missed if ball flies completely past the near screen (t > 1.16)
      if (b.t > 1.16) {
        this.awardPoint('boss', '💨 MISSED RETURN!', callbacks, currentLives);
      }
    }
  }

  // =========================================================================
  // RENDERING: STADIUM + LIVE JUMBOTRON + 3D COURT + TARGET RINGS + 1:1 RACKETS
  // =========================================================================

  draw(ctx, frameCount, videoElement) {
    const w = this.w;
    const h = this.h;

    ctx.save();

    // 1. Mushroom Kingdom Stadium + Live Webcam Jumbotron Big-Screen!
    this.drawStadiumAndJumbotron(ctx, w, h, frameCount, videoElement);

    // 2. Royal-Blue 3D Court & Crisp White Lines
    this.drawCourt3D(ctx);

    // 3. Incoming Shot Flight Preview & Target Timing Ring on Player's Side!
    if (this.phase === 'rally' && this.ball.dir === -1) {
      this.drawIncomingTargetRing(ctx, frameCount);
    } else if (this.phase === 'serve_ready') {
      this.drawServePromptRing(ctx, frameCount);
    }

    // 4. Court Bounce Rings
    for (const br of this.bounceRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, br.alpha);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(br.x, br.y, br.radius * 1.5, br.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Far-Court Championship Boss Rival
    this.drawBossRival(ctx, frameCount);

    // 6. Ball behind net if on far side
    const ballPos3D = this.phase === 'rally' ? this.evaluateBallAt(this.ball.t) : { z: 0.08 };
    if (ballPos3D.z >= 0.50 && this.phase === 'rally') {
      this.drawTennisBall(ctx, frameCount);
    }

    // 7. Center Tennis Net & Floating Mario Gimmick Ring!
    this.drawNetAndGimmick(ctx, frameCount);

    // 8. Ball in front of net if on near side (or waiting for Serve!)
    if ((ballPos3D.z < 0.50 && this.phase === 'rally') || this.phase === 'serve_ready') {
      this.drawTennisBall(ctx, frameCount);
    }

    // 9. Giant 1:1 Player Power Rackets (Right on Your Real Hands!)
    for (const r of this.rackets) {
      this.drawHandRacket(ctx, r, frameCount);
    }

    // 10. Racket Hit Shockwaves & Floating Shot Popups ("⚡ TOPSPIN!", "⭐ STAR SMASH!")
    for (const sb of this.swingBursts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sb.alpha);
      ctx.strokeStyle = sb.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(sb.x, sb.y, sb.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const hp of this.hitPopups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, hp.alpha);
      ctx.translate(hp.x, hp.y);
      ctx.scale(hp.scale, hp.scale);
      ctx.font = '700 28px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(hp.text, 0, 0);
      ctx.fillStyle = hp.color;
      ctx.fillText(hp.text, 0, 0);
      ctx.restore();
    }

    // 11. Flame Power Racket Gauge (Bottom-Left) & Banner
    this.drawPowerGauge(ctx, frameCount);

    if (this.bannerTimer > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(frameCount * 0.25) * 0.04;
      ctx.translate(w / 2, 122);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-260, -25, 520, 50, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 21px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, 0, 1);
      ctx.restore();
    }

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(253, 224, 71, ${this.flashTimer * 0.04})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  drawStadiumAndJumbotron(ctx, w, h, frameCount, videoElement) {
    const wallY = this.farY - 42;

    // Bright Sky & Grandstand
    const skyGrad = ctx.createLinearGradient(0, 0, 0, wallY);
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.6, '#2563eb');
    skyGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, wallY);

    // Cheering Stadium Stands
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, wallY - 56, w, 58);

    const colors = ['#ef4444', '#facc15', '#4ade80', '#38bdf8', '#f472b6', '#fb923c'];
    for (let i = 0; i < 30; i++) {
      const fx = (w / 30) * (i + 0.5);
      if (Math.abs(fx - w / 2) < 165) continue; // Leave center clear for Jumbotron!
      const hop = Math.abs(Math.sin(frameCount * 0.14 + i)) * 6;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(fx, wallY - 22 - hop, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stadium Center Jumbotron (Live Webcam Feed + Tennis Match Scoreboard!)
    const jbW = 310;
    const jbH = 68;
    const jbX = w / 2 - jbW / 2;
    const jbY = wallY - 72;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(jbX, jbY, jbW, jbH, 14);
    ctx.fill();
    ctx.stroke();

    // Small Live Stadium Cam PIP on left side of Jumbotron!
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(jbX + 6, jbY + 6, 78, jbH - 12, 8);
      ctx.clip();
      ctx.translate(jbX + 6 + 78, jbY + 6);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, 78, jbH - 12);
      ctx.restore();
    }

    const pPts = TENNIS_PTS[Math.min(3, this.playerPointIdx)];
    const bPts = TENNIS_PTS[Math.min(3, this.bossPointIdx)];
    const scoreX = jbX + 195;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px Fredoka, sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`🏆 GAMES WON: ${this.gamesWon} - ${this.bossGames}`, scoreX, jbY + 20);

    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`YOU ${pPts}`, scoreX - 54, jbY + 46);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(':', scoreX, jbY + 46);
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`${bPts} BOSS`, scoreX + 54, jbY + 46);
    ctx.restore();

    // Emerald Outer Court Turf Apron
    const turfGrad = ctx.createLinearGradient(0, wallY, 0, h);
    turfGrad.addColorStop(0, '#15803d');
    turfGrad.addColorStop(0.55, '#16a34a');
    turfGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = turfGrad;
    ctx.fillRect(0, wallY, w, h - wallY);
  }

  drawCourt3D(ctx) {
    const nL = this.project(-1, 0, 0);
    const nR = this.project(1, 0, 0);
    const fR = this.project(1, 0, 1);
    const fL = this.project(-1, 0, 1);

    const cGrad = ctx.createLinearGradient(0, fL.groundY, 0, nL.groundY);
    cGrad.addColorStop(0, '#1d4ed8');
    cGrad.addColorStop(0.5, '#2563eb');
    cGrad.addColorStop(1, '#1e40af');

    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.moveTo(nL.screenX, nL.groundY);
    ctx.lineTo(nR.screenX, nR.groundY);
    ctx.lineTo(fR.screenX, fR.groundY);
    ctx.lineTo(fL.screenX, fL.groundY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 3;
    const drawLine = (x1, z1, x2, z2) => {
      const p1 = this.project(x1, 0, z1);
      const p2 = this.project(x2, 0, z2);
      ctx.beginPath();
      ctx.moveTo(p1.screenX, p1.groundY);
      ctx.lineTo(p2.screenX, p2.groundY);
      ctx.stroke();
    };

    drawLine(-1, 0, 1, 0);
    drawLine(-1, 1, 1, 1);
    drawLine(-1, 0, -1, 1);
    drawLine(1, 0, 1, 1);
    drawLine(-0.78, 0, -0.78, 1);
    drawLine(0.78, 0, 0.78, 1);
    drawLine(-0.78, 0.27, 0.78, 0.27);
    drawLine(-0.78, 0.73, 0.78, 0.73);
    drawLine(0, 0.27, 0, 0.73);
  }

  /**
   * Draws the unmistakable 2D Strike Target Ring & Shrinking Timing Halo where the ball arrives!
   * Put your hand/racket inside this ring -> guaranteed clean hit!
   */
  drawIncomingTargetRing(ctx, frameCount) {
    const strike3D = this.evaluateBallAt(1.0);
    const target = this.project(strike3D.x, strike3D.y, strike3D.z);
    const bounce3D = this.evaluateBallAt(0.78);
    const bouncePt = this.project(bounce3D.x, 0, bounce3D.z);

    const b = this.ball;
    const isHittableNow = b.t >= 0.72 && b.t <= 1.15;
    const isStar = b.isStarLob;

    ctx.save();

    // 1. Dotted preview guide from court bounce spot up into the floating Strike Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(bouncePt.screenX, bouncePt.groundY);
    ctx.lineTo(target.screenX, target.screenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Inner Strike Sweet-Spot Zone
    const baseR = 54;
    const ringCol = isStar ? '#facc15' : (isHittableNow ? '#4ade80' : '#38bdf8');

    ctx.fillStyle = isStar ? 'rgba(250, 204, 21, 0.20)' : (isHittableNow ? 'rgba(74, 222, 128, 0.22)' : 'rgba(56, 189, 248, 0.14)');
    ctx.strokeStyle = ringCol;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.screenX, target.screenY, baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Shrinking Outer Timing Halo (closes onto baseR as ball approaches t = 1.0!)
    const rem = Math.max(0, 1.0 - b.t);
    const haloR = baseR + rem * 95;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(target.screenX, target.screenY, haloR, 0, Math.PI * 2);
    ctx.stroke();

    // Label inside target ring
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isStar ? '⭐ SMASH HERE!' : (isHittableNow ? '🎾 SWING!' : '🎯 TARGET'), target.screenX, target.screenY + baseR + 18);

    ctx.restore();
  }

  drawServePromptRing(ctx, frameCount) {
    const pulse = 1 + Math.sin(frameCount * 0.15) * 0.08;
    const r = 58 * pulse;

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(this.ball.screenX, this.ball.screenY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 16px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👆 SWING HAND HERE TO SERVE!', this.ball.screenX, this.ball.screenY - r - 14);
    ctx.restore();
  }

  drawNetAndGimmick(ctx, frameCount) {
    const nLB = this.project(-1.06, 0, 0.5);
    const nRB = this.project(1.06, 0, 0.5);
    const nLT = this.project(-1.06, 0.21, 0.5);
    const nRT = this.project(1.06, 0.21, 0.5);
    const nMid = this.project(0, 0.18, 0.5);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.moveTo(nLB.screenX, nLB.groundY);
    ctx.lineTo(nLT.screenX, nLT.screenY);
    ctx.quadraticCurveTo(nMid.screenX, nMid.screenY, nRT.screenX, nRT.screenY);
    ctx.lineTo(nRB.screenX, nRB.groundY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(nLT.screenX, nLT.screenY);
    ctx.quadraticCurveTo(nMid.screenX, nMid.screenY, nRT.screenX, nRT.screenY);
    ctx.stroke();

    // Floating Mario Net Gimmick Ring!
    if (this.netGimmick.active) {
      const gp = this.project(this.netGimmick.x, 0.36 + Math.sin(frameCount * 0.08) * 0.04, 0.5);
      const gr = 34 * gp.scale;
      const ringCol = this.netGimmick.kind === 'heart' ? '#f472b6' : (this.netGimmick.kind === 'mushroom' ? '#4ade80' : '#fde047');
      const icon = this.netGimmick.kind === 'heart' ? '💖' : (this.netGimmick.kind === 'mushroom' ? '🍄' : '🪙');

      ctx.save();
      ctx.translate(gp.screenX, gp.screenY);
      ctx.shadowBlur = 16;
      ctx.shadowColor = ringCol;
      ctx.strokeStyle = ringCol;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(gr * 1.1)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  drawTennisBall(ctx, frameCount) {
    const b = this.ball;

    // Ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.ellipse(b.screenX, b.groundY, b.radius * 0.9, b.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Colored Shot Ribbon Trail
    let trailCol = '#a3e635';
    if (b.shotType === 'topspin') trailCol = '#fb923c';
    else if (b.shotType === 'slice') trailCol = '#38bdf8';
    else if (b.shotType === 'smash') trailCol = '#facc15';
    else if (b.shotType === 'power') trailCol = '#ef4444';
    else if (b.isStarLob) trailCol = '#fde047';

    for (let i = 0; i < b.trail.length; i++) {
      const pt = b.trail[i];
      const ratio = (i + 1) / b.trail.length;
      ctx.save();
      ctx.globalAlpha = ratio * (b.shotType === 'power' ? 0.72 : 0.42);
      ctx.fillStyle = b.shotType === 'power' && i % 2 === 0 ? '#fde047' : trailCol;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(3, pt.r * ratio * 0.82), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crisp 3D Shaded Tennis Ball (or Flaming Fireball!)
    ctx.save();
    ctx.shadowBlur = b.shotType === 'power' || b.shotType === 'smash' ? 24 : 12;
    ctx.shadowColor = trailCol;

    const ballGrad = ctx.createRadialGradient(
      b.screenX - b.radius * 0.3,
      b.screenY - b.radius * 0.3,
      b.radius * 0.15,
      b.screenX,
      b.screenY,
      b.radius
    );
    if (b.shotType === 'power') {
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.45, '#fde047');
      ballGrad.addColorStop(1, '#ef4444');
    } else {
      ballGrad.addColorStop(0, '#f7fee7');
      ballGrad.addColorStop(0.55, '#bef264');
      ballGrad.addColorStop(1, '#65a30d');
    }

    ctx.fillStyle = ballGrad;
    ctx.strokeStyle = b.shotType === 'power' ? '#dc2626' : '#3f6212';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(b.screenX, b.screenY, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Classic curved white tennis seam!
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = Math.max(2, b.radius * 0.11);
    ctx.beginPath();
    ctx.arc(b.screenX - b.radius * 0.38, b.screenY, b.radius * 0.68, -0.85, 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.screenX + b.radius * 0.38, b.screenY, b.radius * 0.68, Math.PI - 0.85, Math.PI + 0.85);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders a Big, Translucent, Responsive 1:1 Mario Power Racket right on your hand!
   */
  drawHandRacket(ctx, r, frameCount) {
    const isPowerReady = this.powerGauge >= 100;

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.tilt);
    ctx.scale(r.scale, r.scale);

    if (isPowerReady || this.megaRacketTimer > 0) {
      ctx.shadowBlur = 22;
      ctx.shadowColor = isPowerReady ? '#f97316' : '#fde047';
    }

    // 1. Grip Handle & Y-Throat below the sweet-spot center (0, 0) so the stringbed sits RIGHT on your palm!
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-7, 52, 14, 40, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = r.handleColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-5, 54);
    ctx.lineTo(-18, 28);
    ctx.moveTo(5, 54);
    ctx.lineTo(18, 28);
    ctx.stroke();

    // 2. Woven Translucent Stringbed centered at (0, 0) (your exact hand position!)
    ctx.fillStyle = isPowerReady ? 'rgba(251, 146, 60, 0.22)' : 'rgba(56, 189, 248, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.4;
    for (let sx = -30; sx <= 30; sx += 10) {
      ctx.beginPath();
      ctx.moveTo(sx, -50);
      ctx.lineTo(sx, 50);
      ctx.stroke();
    }
    for (let sy = -40; sy <= 40; sy += 10) {
      ctx.beginPath();
      ctx.moveTo(-40, sy);
      ctx.lineTo(40, sy);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Mario Star Emblem painted on the strings!
    ctx.fillStyle = isPowerReady ? 'rgba(254, 240, 138, 0.85)' : 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 24px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPowerReady ? '🔥' : '★', 0, 0);

    // 4. Glowing Outer Power Rim
    ctx.strokeStyle = r.rimColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = r.handleColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawBossRival(ctx, frameCount) {
    const pt = this.project(this.boss.x, 0, this.boss.z);
    const x = pt.screenX;
    const y = pt.groundY;
    const s = pt.scale * 1.32;

    ctx.save();
    if (this.boss.stunTimer > 0) {
      ctx.translate(x, y - 28 * s);
      ctx.rotate(Math.sin(frameCount * 0.55) * 0.45);
      ctx.translate(-x, -(y - 28 * s));
    }

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 38 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyCol = this.boss.tier === 1 ? '#22c55e' : (this.boss.tier === 2 ? '#b45309' : '#dc2626');
    const bellyCol = this.boss.tier === 1 ? '#fef08a' : (this.boss.tier === 2 ? '#fed7aa' : '#fde047');

    // Boss Shell / Torso
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - 30 * s, 30 * s, 30 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bellyCol;
    ctx.beginPath();
    ctx.ellipse(x, y - 26 * s, 19 * s, 19 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boss Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 10 * s, y - 46 * s, 7.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 10 * s, y - 46 * s, 7.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x - 9 * s, y - 46 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 9 * s, y - 46 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Boss Racket
    const bSwing = this.boss.swingTimer > 0 ? 1.0 : -0.35;
    ctx.save();
    ctx.translate(x + 28 * s, y - 32 * s);
    ctx.rotate(bSwing);
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(18 * s, -18 * s, 16 * s, 21 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (this.boss.stunTimer > 0) {
      ctx.fillStyle = '#fde047';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💫 DIZZY! 💫', x, y - 68 * s);
    }

    ctx.restore();
  }

  drawPowerGauge(ctx, frameCount) {
    const gx = 24;
    const gy = this.h - 48;
    const barW = 240;
    const barH = 28;
    const isFull = this.powerGauge >= 100;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isFull ? (frameCount % 10 < 5 ? '#fde047' : '#f97316') : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(gx, gy, barW, barH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(gx + 2, gy + 2, barW - 4, barH - 4, 999);
    ctx.clip();
    const grad = ctx.createLinearGradient(gx, gy, gx + barW, gy);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.55, '#facc15');
    grad.addColorStop(1, '#ef4444');
    ctx.fillStyle = grad;
    ctx.fillRect(gx, gy, (barW * Math.min(100, this.powerGauge)) / 100, barH);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      isFull ? '🔥 FIREBALL READY! SWING FAST!' : `⚡ POWER METER: ${Math.floor(this.powerGauge)}%`,
      gx + barW / 2,
      gy + barH / 2 + 1
    );

    if (this.megaRacketTimer > 0) {
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'left';
      ctx.fillText(`🍄 GIANT RACKET: ${Math.ceil(this.megaRacketTimer / 60)}s`, gx + 8, gy - 12);
    }

    ctx.restore();
  }
}
