/**
 * gokeeper.js
 * Super Goalie Rush! — Nex-Style First-Person Stadium Goalkeeper Game
 *
 * Creative Challenges & Rewards:
 * - 5 Shot Archetypes from Depth (Z = 0 -> 1):
 *   1. Classic Striker Shot ⚽ (clean arc to 1 of 6 goal corners)
 *   2. Banana Curveball 🌀 (mid-air Magnus lateral swerve + magenta wind ribbon)
 *   3. Blazing Fireball 🔥 (power cannon — block with 1 hand for +25, or BOTH hands together for MEGA DOUBLE CATCH +50!)
 *   4. Golden Trophy Ball 🌟 (bonus +60 pts, heals +1 Heart, and snaps an instant Victory Selfie!)
 *   5. Trick Mud-Bomb ⚠️ (DO NOT TOUCH! Let it sail wide for SMART DODGE +25; swatting it splatters mud & costs 1 Heart!)
 * - Penalty Blitz Boss Wave ⚡ in the final 14 seconds (or every 10 saves) with twin-ball volleys!
 * - Semicircular 5-Segment Streak Dial -> unlocks 8s of GIANT GOLDEN MAGNET GLOVES (1.55x size, ball pull & 2x pts)!
 * - Live "Let's Take a Selfie!" Polaroid Trophy Capture with wearable AR Crown & Champion frame!
 */

export class GoKeeperGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.balls = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.mudSplatters = [];
    this.netRipple = { active: false, x: 0.5, y: 0.5, timer: 0, color: '#38bdf8' };

    // Striker character animation state
    this.striker = {
      xNorm: 0.5,
      targetXNorm: 0.5,
      windupTimer: 0,
      kickTimer: 0,
      dizzyTimer: 0,
      nextShotType: 'classic'
    };

    // Streak, Magnet Gloves Power-up & Blitz state
    this.streak = 0;
    this.bestStreak = 0;
    this.totalSaves = 0;
    this.perfectSaves = 0;
    this.gaugeSegments = 0; // 0..5 -> at 5 activates Magnet Gloves!
    this.magnetTimer = 0;   // frames remaining (480 = 8s)
    this.blitzActive = false;
    this.blitzAnnounced = false;
    this.spawnCooldown = 45;

    // Blimp & Stadium Banner
    this.blimpX = 0.25;
    this.blimpText = '⚽ PROTECT THE GOAL!';
    this.bannerTimer = 70;
    this.bannerText = '🧤 BLOCK SHOTS • DODGE MUD BOMBS!';
    this.bannerColor = '#38bdf8';

    // Selfie system ("Let's take a selfie!")
    this.selfieCountdown = 0; // frames for 3-2-1 countdown before level end or trophy snap
    this.selfieTriggeredThisRound = false;
    this.selfieFlashAlpha = 0;
    this.latestSelfieUrl = null;
    this.selfieCardTimer = 0; // displays floating Polaroid in top-right after snap
    this.offscreenSelfieCanvas = document.createElement('canvas');
    this.offscreenSelfieCanvas.width = 320;
    this.offscreenSelfieCanvas.height = 260;

    this.lastGloves = [];

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // Goal frame bounds (first-person inside goal looking out)
    this.goalLeft = canvasWidth * 0.08;
    this.goalRight = canvasWidth * 0.92;
    this.goalTop = Math.max(92, canvasHeight * 0.14);
    this.goalBottom = canvasHeight * 0.90;
    this.horizonY = canvasHeight * 0.48;
    this.penaltySpotY = canvasHeight * 0.62;
  }

  reset(keepSelfie = false) {
    this.balls = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.mudSplatters = [];
    this.streak = 0;
    this.gaugeSegments = 0;
    this.magnetTimer = 0;
    this.blitzActive = false;
    this.blitzAnnounced = false;
    this.spawnCooldown = 30;
    this.striker.windupTimer = 0;
    this.striker.kickTimer = 0;
    this.striker.dizzyTimer = 0;
    this.selfieCountdown = 0;
    this.selfieTriggeredThisRound = false;
    this.selfieFlashAlpha = 0;
    this.selfieCardTimer = 0;
    if (!keepSelfie) {
      this.totalSaves = 0;
      this.perfectSaves = 0;
      this.bestStreak = 0;
      this.latestSelfieUrl = null;
    }
    this.bannerTimer = 85;
    this.bannerText = '🧤 HANDS UP, KEEPER! SAVE THE SHOTS!';
    this.bannerColor = '#38bdf8';
    this.blimpText = '⚽ GO KEEPER ARENA';
  }

  addPopup(x, y, text, color = '#fde047', scale = 1.0) {
    this.floatingTexts.push({
      x,
      y,
      vy: -2.2,
      text,
      color,
      alpha: 1.0,
      scale
    });
  }

  pickShotType(level) {
    const r = Math.random();
    if (r < 0.09) return 'golden';
    if (r < 0.22) return 'mudbomb';
    if (r < 0.40 + Math.min(0.15, (level - 1) * 0.04)) return 'curve';
    if (r < 0.56 + Math.min(0.14, (level - 1) * 0.04)) return 'fireball';
    return 'classic';
  }

  spawnShot(level, speedMultiplier, forcedType = null, offsetX = 0) {
    const type = forcedType || this.pickShotType(level);

    // Choose target normalized coordinates inside goalmouth [0.15 .. 0.85] x [0.22 .. 0.80]
    const zones = [
      { x: 0.20, y: 0.27, corner: true }, // Top-Left 90!
      { x: 0.80, y: 0.27, corner: true }, // Top-Right 90!
      { x: 0.22, y: 0.54, corner: false },
      { x: 0.78, y: 0.54, corner: false },
      { x: 0.28, y: 0.75, corner: false },
      { x: 0.72, y: 0.75, corner: false },
      { x: 0.50, y: 0.34, corner: false }
    ];
    const picked = zones[Math.floor(Math.random() * zones.length)];

    const targetXNorm = Math.max(0.16, Math.min(0.84, picked.x + offsetX + (Math.random() - 0.5) * 0.08));
    const targetYNorm = Math.max(0.22, Math.min(0.80, picked.y + (Math.random() - 0.5) * 0.06));

    const baseZSpeed = (0.0175 + (level - 1) * 0.0024) * (0.6 + speedMultiplier * 0.4);
    let zSpeed = baseZSpeed;
    if (type === 'fireball') zSpeed *= 1.18;
    if (type === 'mudbomb') zSpeed *= 0.88;
    if (type === 'golden') zSpeed *= 0.95;

    const curveDir = (targetXNorm < 0.5 ? -1 : 1) * (0.16 + Math.random() * 0.08);

    this.balls.push({
      type,
      z: 0.02, // 0 = striker foot, 1.0 = goal line plane!
      zSpeed,
      startXNorm: this.striker.xNorm,
      startYNorm: 0.62,
      targetXNorm,
      targetYNorm,
      isCorner: picked.corner,
      curveAmp: type === 'curve' ? curveDir : 0,
      arcHeight: type === 'mudbomb' ? 0.22 : (type === 'fireball' ? 0.06 : 0.13),
      spin: 0,
      spinRate: type === 'curve' ? 0.28 : 0.14,
      state: 'incoming', // incoming | saved | missed | dodged
      vxOut: 0,
      vyOut: 0,
      screenX: this.w * 0.5,
      screenY: this.penaltySpotY,
      radius: 14,
      alpha: 1.0,
      trail: []
    });
  }

  captureSelfie(videoElement, score, level) {
    try {
      const c = this.offscreenSelfieCanvas;
      const sctx = c.getContext('2d');
      const cw = c.width;
      const ch = c.height;

      // Polaroid white card frame with drop gradient
      sctx.fillStyle = '#f8fafc';
      sctx.fillRect(0, 0, cw, ch);

      const photoX = 14;
      const photoY = 14;
      const photoW = cw - 28;
      const photoH = ch - 68;

      sctx.save();
      sctx.beginPath();
      sctx.roundRect(photoX, photoY, photoW, photoH, 10);
      sctx.clip();

      // Draw live mirrored webcam if available, else festive stadium illustration
      if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        sctx.save();
        sctx.translate(photoX + photoW, photoY);
        sctx.scale(-1, 1);
        sctx.drawImage(videoElement, 0, 0, photoW, photoH);
        sctx.restore();
      } else {
        const bg = sctx.createLinearGradient(0, photoY, 0, photoY + photoH);
        bg.addColorStop(0, '#0284c7');
        bg.addColorStop(0.6, '#38bdf8');
        bg.addColorStop(1, '#16a34a');
        sctx.fillStyle = bg;
        sctx.fillRect(photoX, photoY, photoW, photoH);

        // Smiling cartoon star keeper
        sctx.fillStyle = '#fde047';
        sctx.beginPath();
        sctx.arc(cw / 2, photoY + photoH * 0.56, 42, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = '#0f172a';
        sctx.beginPath();
        sctx.arc(cw / 2 - 14, photoY + photoH * 0.52, 5, 0, Math.PI * 2);
        sctx.arc(cw / 2 + 14, photoY + photoH * 0.52, 5, 0, Math.PI * 2);
        sctx.fill();
        sctx.strokeStyle = '#0f172a';
        sctx.lineWidth = 4;
        sctx.beginPath();
        sctx.arc(cw / 2, photoY + photoH * 0.58, 18, 0.15, Math.PI - 0.15);
        sctx.stroke();
      }

      // Golden AR Champion Crown at top-center of photo!
      const crownX = cw / 2;
      const crownY = photoY + 34;
      sctx.fillStyle = '#facc15';
      sctx.strokeStyle = '#b45309';
      sctx.lineWidth = 2.5;
      sctx.beginPath();
      sctx.moveTo(crownX - 30, crownY + 12);
      sctx.lineTo(crownX - 34, crownY - 12);
      sctx.lineTo(crownX - 14, crownY + 2);
      sctx.lineTo(crownX, crownY - 18);
      sctx.lineTo(crownX + 14, crownY + 2);
      sctx.lineTo(crownX + 34, crownY - 12);
      sctx.lineTo(crownX + 30, crownY + 12);
      sctx.closePath();
      sctx.fill();
      sctx.stroke();

      // Sparkle confetti stickers inside photo corners
      sctx.font = 'bold 24px Fredoka, sans-serif';
      sctx.fillText('🧤', photoX + 8, photoY + photoH - 12);
      sctx.fillText('⚽', photoX + photoW - 34, photoY + photoH - 12);
      sctx.fillText('✨', photoX + 10, photoY + 28);
      sctx.fillText('🏆', photoX + photoW - 34, photoY + 28);

      sctx.restore();

      // Polaroid Caption Strip at bottom
      sctx.fillStyle = '#0f172a';
      sctx.font = 'bold 17px Fredoka, sans-serif';
      sctx.textAlign = 'center';
      sctx.fillText(`📸 SUPER KEEPER • LVL ${level}`, cw / 2, ch - 30);

      sctx.fillStyle = '#0284c7';
      sctx.font = 'bold 14px Fredoka, sans-serif';
      sctx.fillText(`SCORE: ${score}  •  SAVES: ${this.totalSaves}  •  BEST STREAK: ${this.bestStreak}🔥`, cw / 2, ch - 11);

      this.latestSelfieUrl = c.toDataURL('image/png');
      this.selfieFlashAlpha = 0.95;
      this.selfieCardTimer = 210; // Show floating Polaroid for 3.5 seconds!
      return this.latestSelfieUrl;
    } catch (e) {
      console.warn('Selfie capture skipped:', e);
      return null;
    }
  }

  update(players, level, timeLeft, speedMultiplier, videoElement, currentScore, callbacks) {
    const { onSave, onMiss, onHeal, onSelfieSnap, onBlitzStart, onMagnetActivate } = callbacks;

    // 1. Update timers & blimp
    this.blimpX += 0.00045;
    if (this.blimpX > 1.15) this.blimpX = -0.15;
    if (this.bannerTimer > 0) this.bannerTimer--;
    if (this.magnetTimer > 0) this.magnetTimer--;
    if (this.striker.kickTimer > 0) this.striker.kickTimer--;
    if (this.striker.dizzyTimer > 0) this.striker.dizzyTimer--;
    if (this.selfieFlashAlpha > 0) this.selfieFlashAlpha = Math.max(0, this.selfieFlashAlpha - 0.045);
    if (this.selfieCardTimer > 0) this.selfieCardTimer--;

    for (let i = this.mudSplatters.length - 1; i >= 0; i--) {
      this.mudSplatters[i].timer--;
      if (this.mudSplatters[i].timer <= 0) this.mudSplatters.splice(i, 1);
    }

    if (this.netRipple.timer > 0) this.netRipple.timer--;

    // 2. Trigger End-of-Round "Let's take a selfie!" at timeLeft <= 3s!
    if (timeLeft <= 3 && timeLeft > 0 && !this.selfieTriggeredThisRound) {
      if (this.selfieCountdown === 0) {
        this.selfieCountdown = 70;
        this.bannerText = "📸 SAY CHEESE! CHAMPION SELFIE!";
        this.bannerColor = '#facc15';
        this.bannerTimer = 80;
      }
    }
    if (this.selfieCountdown > 0) {
      this.selfieCountdown--;
      if (this.selfieCountdown === 1) {
        this.selfieTriggeredThisRound = true;
        const url = this.captureSelfie(videoElement, currentScore, level);
        if (onSelfieSnap) onSelfieSnap(url);
      }
    }

    // 3. Activate Penalty Blitz in final 14 seconds!
    const shouldBlitz = timeLeft <= 14 && timeLeft > 2;
    if (shouldBlitz && !this.blitzAnnounced) {
      this.blitzActive = true;
      this.blitzAnnounced = true;
      this.bannerText = '⚡ PENALTY SHOOTOUT BLITZ! TWIN VOLLEYS! ⚡';
      this.bannerColor = '#f97316';
      this.bannerTimer = 110;
      this.blimpText = '⚡ PENALTY BLITZ!';
      if (onBlitzStart) onBlitzStart();
    } else if (!shouldBlitz) {
      this.blitzActive = false;
    }

    // 4. Build active Goalie Gloves from 1–2 tracked players
    const isMagnet = this.magnetTimer > 0;
    const baseGloveRadius = (isMagnet ? 78 : 52) * Math.min(1.15, Math.max(0.82, this.w / 960));
    const gloves = [];
    const pCount = Math.min(2, Math.max(1, players.length));

    for (let pIdx = 0; pIdx < pCount; pIdx++) {
      const p = players[pIdx];
      const lPt = p.leftHandScreen || { x: 0.35, y: 0.6 };
      const rPt = p.rightHandScreen || { x: 0.65, y: 0.6 };
      const lx = lPt.x * this.w;
      const ly = lPt.y * this.h;
      const rx = rPt.x * this.w;
      const ry = rPt.y * this.h;

      const handsTogether = Math.hypot(rx - lx, ry - ly) < baseGloveRadius * 2.1;

      gloves.push({
        hand: 'L',
        playerIndex: pIdx,
        x: lx,
        y: ly,
        radius: baseGloveRadius,
        handsTogether,
        primaryColor: isMagnet ? '#facc15' : (pIdx === 0 ? '#38bdf8' : '#4ade80'),
        accentColor: isMagnet ? '#f59e0b' : (pIdx === 0 ? '#0284c7' : '#15803d')
      });
      gloves.push({
        hand: 'R',
        playerIndex: pIdx,
        x: rx,
        y: ry,
        radius: baseGloveRadius,
        handsTogether,
        primaryColor: isMagnet ? '#facc15' : (pIdx === 0 ? '#f472b6' : '#c084fc'),
        accentColor: isMagnet ? '#f59e0b' : (pIdx === 0 ? '#db2777' : '#7e22ce')
      });
    }
    this.lastGloves = gloves;

    // 5. Striker AI & Shot Spawning
    this.striker.xNorm += (this.striker.targetXNorm - this.striker.xNorm) * 0.08;
    this.spawnCooldown--;

    const maxActiveBalls = this.blitzActive ? 3 : 2;
    if (this.spawnCooldown <= 0 && this.balls.filter(b => b.state === 'incoming').length < maxActiveBalls && timeLeft > 1) {
      if (this.striker.windupTimer === 0) {
        this.striker.nextShotType = this.pickShotType(level);
        this.striker.windupTimer = this.blitzActive ? 14 : 24;
        this.striker.targetXNorm = 0.36 + Math.random() * 0.28;
      }
    }

    if (this.striker.windupTimer > 0) {
      this.striker.windupTimer--;
      if (this.striker.windupTimer === 0) {
        this.striker.kickTimer = 16;
        if (this.blitzActive && Math.random() < 0.65) {
          // Twin Penalty Blitz Volley!
          this.spawnShot(level, speedMultiplier, 'classic', -0.18);
          this.spawnShot(level, speedMultiplier, Math.random() < 0.35 ? 'golden' : 'curve', 0.18);
        } else {
          this.spawnShot(level, speedMultiplier, this.striker.nextShotType, 0);
        }
        const baseCd = this.blitzActive ? 38 : Math.max(42, 78 - level * 6);
        this.spawnCooldown = Math.round(baseCd / (0.65 + speedMultiplier * 0.35));
      }
    }

    // 6. Update Balls & Evaluate Saves / Dodges / Goals
    const goalW = this.goalRight - this.goalLeft;
    const goalH = this.goalBottom - this.goalTop;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.spin += b.spinRate;

      if (b.state === 'incoming') {
        b.z += b.zSpeed;

        // Perspective interpolation from striker spot (z=0) to goalmouth plane (z=1)
        const easeZ = b.z;
        const startSX = this.w * b.startXNorm;
        const startSY = this.penaltySpotY;
        const endSX = this.goalLeft + b.targetXNorm * goalW;
        const endSY = this.goalTop + b.targetYNorm * goalH;

        const curveOffsetPx = Math.sin(easeZ * Math.PI) * b.curveAmp * goalW;
        const arcOffsetPx = Math.sin(easeZ * Math.PI) * b.arcHeight * this.h;

        b.screenX = startSX + (endSX - startSX) * easeZ + curveOffsetPx;
        b.screenY = startSY + (endSY - startSY) * easeZ - arcOffsetPx;
        b.radius = 11 + Math.pow(easeZ, 1.35) * 44;

        // Magnet Gloves gently pull real soccer balls (never mudbombs!) toward nearest glove when close!
        if (isMagnet && b.type !== 'mudbomb' && b.z > 0.55 && gloves.length > 0) {
          let nearest = gloves[0];
          let bestDist = Math.hypot(nearest.x - b.screenX, nearest.y - b.screenY);
          for (const g of gloves) {
            const d = Math.hypot(g.x - b.screenX, g.y - b.screenY);
            if (d < bestDist) {
              bestDist = d;
              nearest = g;
            }
          }
          if (bestDist < 240) {
            const pull = 0.14;
            b.screenX += (nearest.x - b.screenX) * pull;
            b.screenY += (nearest.y - b.screenY) * pull;
            b.targetXNorm = Math.max(0.1, Math.min(0.9, (b.screenX - this.goalLeft) / goalW));
            b.targetYNorm = Math.max(0.15, Math.min(0.88, (b.screenY - this.goalTop) / goalH));
          }
        }

        b.trail.push({ x: b.screenX, y: b.screenY, r: b.radius });
        if (b.trail.length > 9) b.trail.shift();

        // Check collision at save plane [0.76 .. 1.03]
        if (b.z >= 0.76 && b.z <= 1.03) {
          const touchingGloves = gloves.filter(
            g => Math.hypot(g.x - b.screenX, g.y - b.screenY) <= g.radius + b.radius * 0.88
          );

          if (touchingGloves.length > 0) {
            if (b.type === 'mudbomb') {
              // Oops! Swatted the decoy mud-bomb!
              b.state = 'missed';
              b.alpha = 0;
              this.streak = 0;
              this.mudSplatters.push({ x: b.screenX, y: b.screenY, r: 68, timer: 95 });
              this.addPopup(b.screenX, b.screenY - 20, '💩 MUD SPLAT! DODGE THOSE!', '#f97316', 1.15);
              if (onMiss) onMiss(b.screenX, b.screenY, true);
            } else {
              // SUCCESSFUL SAVE!
              b.state = 'saved';
              const g0 = touchingGloves[0];
              const doubleHandSave = touchingGloves.length >= 2 || g0.handsTogether;
              const isPerfectTiming = b.z >= 0.84 && b.z <= 0.98;

              this.totalSaves++;
              this.streak++;
              if (this.streak > this.bestStreak) this.bestStreak = this.streak;

              let pts = 15;
              let label = 'SAVE! +15';
              let popColor = '#38bdf8';

              if (b.type === 'golden') {
                pts = 60;
                label = '🌟 GOLDEN TROPHY SAVE! +60';
                popColor = '#facc15';
                if (onHeal) onHeal(b.screenX, b.screenY);
                // Instant Golden Selfie!
                const url = this.captureSelfie(videoElement, currentScore + pts, level);
                if (onSelfieSnap) onSelfieSnap(url);
              } else if (b.type === 'fireball' && doubleHandSave) {
                pts = 50;
                label = '🔥🙌 MEGA DOUBLE CATCH! +50';
                popColor = '#fb923c';
                this.striker.dizzyTimer = 55;
              } else if (b.type === 'fireball') {
                pts = 25;
                label = '🔥 FIRE PUNCH! +25';
                popColor = '#fb923c';
              } else if (b.type === 'curve') {
                pts = 30;
                label = '🌀 CURVE TAMER! +30';
                popColor = '#e879f9';
              } else if (b.isCorner && isPerfectTiming) {
                pts = 30;
                label = '🦅 TOP-CORNER DIVE! +30';
                popColor = '#4ade80';
                this.perfectSaves++;
              } else if (isPerfectTiming) {
                pts = 25;
                label = '✨ PERFECT SAVE! +25';
                popColor = '#fde047';
                this.perfectSaves++;
              }

              if (isMagnet) {
                pts *= 2;
                label = `🧲 2x ${label}`;
              }

              // Charge Magnet Gloves Gauge!
              if (!isMagnet) {
                this.gaugeSegments++;
                if (this.gaugeSegments >= 5) {
                  this.gaugeSegments = 0;
                  this.magnetTimer = 480; // 8 seconds of Giant Golden Magnet Gloves!
                  this.bannerText = '🧲 GIANT MAGNET GLOVES ACTIVATED! (2x POINTS!)';
                  this.bannerColor = '#facc15';
                  this.bannerTimer = 115;
                  this.blimpText = '🧲 SUPER MAGNET GLOVES!';
                  if (onMagnetActivate) onMagnetActivate();
                }
              }

              // Rebound physics flying dramatically off glove!
              const dx = b.screenX - g0.x;
              const dy = b.screenY - g0.y;
              b.vxOut = (dx * 0.22) + (b.screenX < this.w / 2 ? -9 : 9);
              b.vyOut = Math.min(-6, dy * 0.22 - 8);

              this.shockwaves.push({
                x: b.screenX,
                y: b.screenY,
                r: b.radius * 0.7,
                maxR: b.radius * 2.6,
                color: popColor,
                alpha: 1.0
              });
              this.netRipple = { active: true, x: b.targetXNorm, y: b.targetYNorm, timer: 18, color: popColor };
              this.addPopup(b.screenX, b.screenY - 24, label, popColor, doubleHandSave || b.type === 'golden' ? 1.25 : 1.05);

              if (onSave) onSave(b.screenX, b.screenY, pts, isPerfectTiming || doubleHandSave || b.type === 'golden', popColor);
            }
          }
        }

        // Passed goal plane without being touched!
        if (b.z > 1.04 && b.state === 'incoming') {
          if (b.type === 'mudbomb') {
            // Smart Dodge reward!
            b.state = 'dodged';
            b.alpha = 0;
            const dodgePts = isMagnet ? 40 : 25;
            this.addPopup(b.screenX, Math.max(120, b.screenY - 20), `😎 SMART DODGE! +${dodgePts}`, '#4ade80', 1.15);
            if (onSave) onSave(b.screenX, b.screenY, dodgePts, true, '#4ade80');
          } else if (b.type === 'golden') {
            // Golden bonus ball doesn't hurt lives if missed
            b.state = 'dodged';
            b.alpha = 0;
            this.addPopup(b.screenX, b.screenY, '🌟 MISSED BONUS BALL!', '#fde047', 0.95);
          } else {
            // Goal conceded!
            b.state = 'missed';
            this.streak = 0;
            this.netRipple = { active: true, x: b.targetXNorm, y: b.targetYNorm, timer: 28, color: '#ef4444' };
            this.addPopup(b.screenX, b.screenY, '⚽ GOAL SLIPPED IN! -1 ❤️', '#f43f5e', 1.1);
            if (onMiss) onMiss(b.screenX, b.screenY, false);
          }
        }
      } else if (b.state === 'saved') {
        b.screenX += b.vxOut;
        b.screenY += b.vyOut;
        b.vyOut += 0.45;
        b.radius *= 0.96;
        b.alpha -= 0.05;
      } else {
        b.alpha -= 0.08;
      }

      if (b.alpha <= 0) {
        this.balls.splice(i, 1);
      }
    }

    // 7. Update Shockwaves & Floating Popups
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.r += (sw.maxR - sw.r) * 0.25;
      sw.alpha -= 0.06;
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  draw(ctx, frameCount, videoElement, score) {
    const w = this.w;
    const h = this.h;
    const isMagnet = this.magnetTimer > 0;

    ctx.save();

    // 1. Sunny Stadium Sky & Clouds (+ Gold Fever Tint when Magnet Active!)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    if (isMagnet) {
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(0.55, '#7c2d12');
      skyGrad.addColorStop(1, '#f59e0b');
    } else if (this.blitzActive) {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1d4ed8');
      skyGrad.addColorStop(1, '#fb923c');
    } else {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.65, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this.horizonY);

    // Floating Stadium Blimp (nod to Nex GoKeeper stadium blimp!)
    this.drawBlimp(ctx, this.blimpX * w, this.goalTop + 34, frameCount);

    // Distant Hills & Spinning Wind Turbines
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(w * 0.2, this.horizonY + 8, w * 0.28, 36, 0, Math.PI, 0);
    ctx.ellipse(w * 0.82, this.horizonY + 8, w * 0.26, 32, 0, Math.PI, 0);
    ctx.fill();

    this.drawWindTurbine(ctx, w * 0.14, this.horizonY - 18, 34, frameCount * 0.04);
    this.drawWindTurbine(ctx, w * 0.86, this.horizonY - 16, 30, frameCount * 0.04 + 1.1);

    // Stadium Bleachers & Bouncing Crowd Dots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(w * 0.18, this.horizonY - 46, w * 0.64, 48);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.18, this.horizonY - 46, w * 0.64, 48);

    const crowdColors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#f8fafc', '#c084fc'];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 28; col++) {
        const cx = w * 0.20 + (col / 27) * (w * 0.60);
        const bounce = Math.sin(frameCount * (isMagnet || this.blitzActive ? 0.24 : 0.1) + col * 0.7 + row) * 3;
        const cy = this.horizonY - 36 + row * 13 + bounce;
        ctx.fillStyle = crowdColors[(col + row * 3) % crowdColors.length];
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Lush Striped Soccer Pitch
    const turfGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
    turfGrad.addColorStop(0, '#16a34a');
    turfGrad.addColorStop(0.5, '#15803d');
    turfGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = turfGrad;
    ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

    // Perspective mowed grass stripes
    ctx.fillStyle = 'rgba(74, 222, 128, 0.16)';
    for (let s = -3; s <= 3; s += 2) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + s * w * 0.05, this.horizonY);
      ctx.lineTo(w * 0.5 + (s + 1) * w * 0.05, this.horizonY);
      ctx.lineTo(w * 0.5 + (s + 1) * w * 0.22, h);
      ctx.lineTo(w * 0.5 + s * w * 0.22, h);
      ctx.closePath();
      ctx.fill();
    }

    // Penalty box lines & spot
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.30, this.horizonY + 26);
    ctx.lineTo(w * 0.70, this.horizonY + 26);
    ctx.lineTo(w * 0.86, h * 0.82);
    ctx.lineTo(w * 0.14, h * 0.82);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, this.penaltySpotY + 14, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. First-Person Goal Netting & White Goalposts
    this.drawGoalFrameAndNet(ctx, frameCount);

    // 4. Draw Animated Cartoon Striker at Penalty Spot
    this.drawStriker(ctx, frameCount);

    // 5. Draw Target Reticles for Incoming Balls (helps kids anticipate corners!)
    const goalW = this.goalRight - this.goalLeft;
    const goalH = this.goalBottom - this.goalTop;
    for (const b of this.balls) {
      if (b.state !== 'incoming') continue;
      const tx = this.goalLeft + b.targetXNorm * goalW;
      const ty = this.goalTop + b.targetYNorm * goalH;
      const pulse = 1 - b.z;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = b.type === 'mudbomb' ? '#ef4444' : (b.type === 'golden' ? '#facc15' : (b.type === 'fireball' ? '#fb923c' : '#38bdf8'));
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(tx, ty, 24 + pulse * 34, 0, Math.PI * 2);
      ctx.stroke();
      if (b.type === 'mudbomb') {
        ctx.setLineDash([]);
        ctx.font = 'bold 16px Fredoka, sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ DODGE!', tx, ty - 34);
      } else if (b.type === 'fireball') {
        ctx.setLineDash([]);
        ctx.font = 'bold 14px Fredoka, sans-serif';
        ctx.fillStyle = '#fdba74';
        ctx.textAlign = 'center';
        ctx.fillText('🙌 2-HAND BONUS!', tx, ty - 34);
      }
      ctx.restore();
    }

    // 6. Draw Incoming & Rebounding Balls (sorted far to near)
    const sortedBalls = [...this.balls].sort((a, b) => a.z - b.z);
    for (const b of sortedBalls) {
      this.drawSoccerBall(ctx, b, frameCount);
    }

    // 7. Draw Shockwaves & Mud Splatters
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const ms of this.mudSplatters) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.82, ms.timer / 40);
      ctx.fillStyle = '#78350f';
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2;
        const dist = k === 0 ? 0 : ms.r * 0.52;
        const rr = k === 0 ? ms.r * 0.58 : ms.r * 0.28;
        ctx.beginPath();
        ctx.arc(ms.x + Math.cos(ang) * dist, ms.y + Math.sin(ang) * dist, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Draw Translucent Glowing Goalie Gloves
    for (const g of this.lastGloves) {
      this.drawGoalieGlove(ctx, g, frameCount, isMagnet);
    }

    // 9. Draw Bottom-Center Semicircular Streak & Magnet Dial (Nex GoKeeper signature UI!)
    this.drawSemicircularDial(ctx, score, isMagnet);

    // 10. Draw Bottom-Left Circular Live Webcam PiP
    this.drawCircularPiP(ctx, videoElement, frameCount);

    // 11. Draw Floating Popups & Stadium Event Banner
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(24 * ft.scale)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    if (this.bannerTimer > 0) {
      ctx.save();
      const bAlpha = Math.min(1, this.bannerTimer / 18);
      ctx.globalAlpha = bAlpha;
      const bw = Math.min(w * 0.78, 560);
      const bx = (w - bw) / 2;
      const by = this.goalTop + 14;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 44, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, w / 2, by + 22);
      ctx.restore();
    }

    // 12. Selfie Countdown Frame & Floating Polaroid Preview!
    if (this.selfieCountdown > 0) {
      const sec = Math.ceil(this.selfieCountdown / 22);
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(w * 0.24, h * 0.22, w * 0.52, h * 0.52);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 34px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      const msg = `📸 LET'S TAKE A SELFIE! ${sec}...`;
      ctx.strokeText(msg, w / 2, h * 0.20);
      ctx.fillText(msg, w / 2, h * 0.20);
      ctx.restore();
    }

    if (this.selfieCardTimer > 0 && this.offscreenSelfieCanvas) {
      ctx.save();
      const slide = Math.min(1, (210 - this.selfieCardTimer) / 14);
      const fadeOut = Math.min(1, this.selfieCardTimer / 25);
      ctx.globalAlpha = fadeOut;
      ctx.translate(w - 195, 118 + (1 - slide) * -30);
      ctx.rotate(0.06);
      ctx.shadowBlur = 22;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.drawImage(this.offscreenSelfieCanvas, 0, 0, 176, 143);
      ctx.restore();
    }

    if (this.selfieFlashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.selfieFlashAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  drawBlimp(ctx, x, y, frameCount) {
    ctx.save();
    const bob = Math.sin(frameCount * 0.04) * 4;
    ctx.translate(x, y + bob);

    // Tail fins
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-54, 0);
    ctx.lineTo(-70, -14);
    ctx.lineTo(-44, -6);
    ctx.moveTo(-54, 0);
    ctx.lineTo(-70, 14);
    ctx.lineTo(-44, 6);
    ctx.fill();

    // Gondola
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-18, 15, 36, 9);

    // Blimp hull
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // LED Banner text on blimp
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-42, -8, 84, 16);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 9px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.blimpText, 0, 0);
    ctx.restore();
  }

  drawWindTurbine(ctx, x, baseY, height, angle) {
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - height);
    ctx.stroke();

    ctx.translate(x, baseY - height);
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGoalFrameAndNet(ctx, frameCount) {
    const gl = this.goalLeft;
    const gr = this.goalRight;
    const gt = this.goalTop;
    const gb = this.goalBottom;

    ctx.save();
    // Subtle outer goal net pattern along borders
    ctx.strokeStyle = this.netRipple.timer > 0 ? this.netRipple.color : 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    const cols = 18;
    const rows = 10;
    for (let c = 1; c < cols; c++) {
      const x = gl + (c / cols) * (gr - gl);
      const wave = this.netRipple.timer > 0
        ? Math.sin(frameCount * 0.6 + c) * (this.netRipple.timer * 0.35)
        : 0;
      ctx.beginPath();
      ctx.moveTo(x + wave, gt);
      ctx.lineTo(x, gt + 26);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = gt + (r / rows) * (gb - gt);
      ctx.beginPath();
      ctx.moveTo(gl, y);
      ctx.lineTo(gl + 24, y);
      ctx.moveTo(gr - 24, y);
      ctx.lineTo(gr, y);
      ctx.stroke();
    }

    // Thick white cylindrical goalposts & crossbar
    ctx.strokeStyle = '#f8fafc';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gl, gb);
    ctx.lineTo(gl, gt);
    ctx.lineTo(gr, gt);
    ctx.lineTo(gr, gb);
    ctx.stroke();
    ctx.restore();
  }

  drawStriker(ctx, frameCount) {
    const sx = this.w * this.striker.xNorm;
    const sy = this.penaltySpotY - 12;
    const windup = this.striker.windupTimer > 0;
    const kicking = this.striker.kickTimer > 0;

    ctx.save();
    ctx.translate(sx, sy);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 34, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fire aura during fireball windup!
    if (windup && this.striker.nextShotType === 'fireball') {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.38)';
      ctx.beginPath();
      ctx.arc(0, 0, 38 + Math.sin(frameCount * 0.5) * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.lineTo(-10, 32);
    ctx.moveTo(8, 12);
    if (windup) {
      ctx.lineTo(20, 22); // cocked leg back
    } else if (kicking) {
      ctx.lineTo(-14, 18); // follow-through kick!
    } else {
      ctx.lineTo(10, 32);
    }
    ctx.stroke();

    // Jersey Torso
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-15, -14, 30, 28, 8);
    ctx.fill();
    ctx.stroke();

    // Number 10 on jersey
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('10', 0, 4);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -26, 13, 0, Math.PI * 2);
    ctx.fill();

    // Spiky hair
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -30, 13, Math.PI, 0);
    ctx.fill();

    // Dizzy stars if stunned by a Double-Hand Fireball Catch!
    if (this.striker.dizzyTimer > 0) {
      ctx.font = '14px sans-serif';
      const da = frameCount * 0.2;
      ctx.fillText('⭐', Math.cos(da) * 18, -44 + Math.sin(da) * 4);
      ctx.fillText('💫', Math.cos(da + Math.PI) * 18, -44 - Math.sin(da) * 4);
    }
    ctx.restore();
  }

  drawSoccerBall(ctx, b, frameCount) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, b.alpha);

    // Motion ribbon trail
    for (let t = 0; t < b.trail.length; t++) {
      const pt = b.trail[t];
      const frac = (t + 1) / b.trail.length;
      ctx.fillStyle = b.type === 'fireball'
        ? `rgba(249, 115, 22, ${frac * 0.45})`
        : b.type === 'curve'
          ? `rgba(232, 121, 249, ${frac * 0.42})`
          : b.type === 'golden'
            ? `rgba(250, 204, 21, ${frac * 0.45})`
            : b.type === 'mudbomb'
              ? `rgba(120, 53, 15, ${frac * 0.35})`
              : `rgba(56, 189, 248, ${frac * 0.25})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * frac * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(b.screenX, b.screenY);
    ctx.rotate(b.spin);

    if (b.type === 'mudbomb') {
      // Spiky brown/purple Mud Decoy Bomb!
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const spikes = 10;
      for (let s = 0; s < spikes * 2; s++) {
        const rad = s % 2 === 0 ? b.radius * 1.15 : b.radius * 0.82;
        const ang = (s / (spikes * 2)) * Math.PI * 2;
        if (s === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.rotate(-b.spin);
      ctx.fillStyle = '#fde047';
      ctx.font = `bold ${Math.max(12, Math.round(b.radius * 0.75))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💩', 0, 1);
      ctx.restore();
      return;
    }

    // Outer aura for Fireball or Golden Ball
    if (b.type === 'fireball' || b.type === 'golden') {
      ctx.shadowBlur = 24;
      ctx.shadowColor = b.type === 'fireball' ? '#f97316' : '#facc15';
    }

    // Ball sphere gradient
    const grad = ctx.createRadialGradient(-b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1, 0, 0, b.radius);
    if (b.type === 'golden') {
      grad.addColorStop(0, '#fef9c3');
      grad.addColorStop(0.55, '#facc15');
      grad.addColorStop(1, '#b45309');
    } else if (b.type === 'fireball') {
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.55, '#fb923c');
      grad.addColorStop(1, '#dc2626');
    } else if (b.type === 'curve') {
      grad.addColorStop(0, '#fae8ff');
      grad.addColorStop(0.65, '#f0abfc');
      grad.addColorStop(1, '#9333ea');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.75, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();

    // Classic pentagon soccer patches
    ctx.fillStyle = b.type === 'golden' ? '#92400e' : (b.type === 'fireball' ? '#7f1d1d' : '#0f172a');
    const pRad = b.radius * 0.34;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      if (k === 0) ctx.moveTo(Math.cos(a) * pRad, Math.sin(a) * pRad);
      else ctx.lineTo(Math.cos(a) * pRad, Math.sin(a) * pRad);
    }
    ctx.closePath();
    ctx.fill();

    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * b.radius * 0.76, Math.sin(a) * b.radius * 0.76, b.radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawGoalieGlove(ctx, g, frameCount, isMagnet) {
    ctx.save();
    ctx.translate(g.x, g.y);

    // Outer translucent forcefield halo
    ctx.globalAlpha = 0.85;
    ctx.shadowBlur = isMagnet ? 28 : 18;
    ctx.shadowColor = g.primaryColor;

    const haloGrad = ctx.createRadialGradient(0, 0, g.radius * 0.25, 0, 0, g.radius);
    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    haloGrad.addColorStop(0.65, isMagnet ? 'rgba(250, 204, 21, 0.45)' : 'rgba(56, 189, 248, 0.28)');
    haloGrad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
    ctx.fill();

    // Stylized Pro Goalkeeper Glove silhouette inside halo!
    const s = g.radius / 52;
    ctx.scale(g.hand === 'L' ? s : -s, s);

    // Glove palm & 4 padded fingers + thumb
    ctx.fillStyle = g.primaryColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    const fingers = [
      { x: -20, y: -22, w: 11, h: 28, r: -0.18 },
      { x: -7, y: -28, w: 11, h: 32, r: -0.05 },
      { x: 6, y: -26, w: 11, h: 30, r: 0.06 },
      { x: 18, y: -20, w: 10, h: 25, r: 0.18 }
    ];
    for (const f of fingers) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.r);
      ctx.beginPath();
      ctx.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Thumb
    ctx.save();
    ctx.translate(-26, 4);
    ctx.rotate(-0.65);
    ctx.beginPath();
    ctx.roundRect(-6, -14, 13, 26, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Palm cushion
    ctx.beginPath();
    ctx.roundRect(-22, -10, 44, 34, 12);
    ctx.fill();
    ctx.stroke();

    // Grip pad target icon on palm
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 6, 9, 0, Math.PI * 2);
    ctx.fill();

    // Wrist strap
    ctx.fillStyle = g.accentColor;
    ctx.beginPath();
    ctx.roundRect(-18, 20, 36, 12, 5);
    ctx.fill();
    ctx.stroke();

    if (isMagnet) {
      ctx.scale(g.hand === 'L' ? 1 : -1, 1);
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧲', 0, 11);
    }

    ctx.restore();
  }

  drawSemicircularDial(ctx, score, isMagnet) {
    const cx = this.w * 0.5;
    const cy = this.h - 14;
    const radius = 84;

    ctx.save();
    // Dark glass semicircle backing
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.strokeStyle = isMagnet ? '#facc15' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5 Streak / Magnet Gauge Arc Segments along the rim!
    const totalSegs = 5;
    const gap = 0.06;
    const segSpan = (Math.PI - gap * (totalSegs + 1)) / totalSegs;

    for (let s = 0; s < totalSegs; s++) {
      const a0 = Math.PI + gap + s * (segSpan + gap);
      const a1 = a0 + segSpan;
      const lit = isMagnet || s < this.gaugeSegments;
      ctx.strokeStyle = isMagnet ? '#facc15' : (lit ? '#4ade80' : 'rgba(148, 163, 184, 0.25)');
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 12, a0, a1);
      ctx.stroke();
    }

    // Score & Streak readout inside dial
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isMagnet ? '🧲 MAGNET 2x!' : `STREAK x${this.streak}`, cx, cy - 42);

    ctx.fillStyle = isMagnet ? '#facc15' : '#ffffff';
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.fillText(String(score), cx, cy - 12);
    ctx.restore();
  }

  drawCircularPiP(ctx, videoElement, frameCount) {
    const r = 52;
    const px = 22 + r;
    const py = this.h - 20 - r;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();

    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      ctx.save();
      ctx.translate(px + r, py - r);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧤', px, py);
    }
    ctx.restore();

    // Glowing ring border around circular PiP
    ctx.save();
    ctx.strokeStyle = this.magnetTimer > 0 ? '#facc15' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();

    // Cute streak crown perched atop the circular PiP when streak >= 3!
    if (this.streak >= 3) {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', px, py - r - 6 + Math.sin(frameCount * 0.12) * 3);
    }
    ctx.restore();
  }
}
