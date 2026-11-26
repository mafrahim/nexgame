/**
 * hoops.js
 * Fever Hoops Pop-A-Shot! — High-Energy Arcade Basketball Shootout!
 * - Reach down to the chrome wire Ball Rack to scoop 🏀 Classic, 🌈 Rainbow 2x Money Balls & ⭐ Golden Balls!
 * - Push/flick your hand UPWARD to launch high-arc 3D basketballs into the glass-backboard hoop!
 * - Drain 3 baskets in a row to ignite 🔥 ON-FIRE FEVER MODE (blazing flame trails + 2x points)!
 * - Watch out for occasional 💣 Spiky Trick Balls on the rack (don't shoot bombs into the hoop!).
 * - Supports 1P High-Score Blitz & 2P Simultaneous Side-by-Side Arcade Shootout!
 */

export class FeverHoopsGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // Arcade Hoop & Backboard state
    this.hoop = {
      x: canvasWidth * 0.5,
      y: 205,
      rimRadius: 52,
      vx: 2.1,
      netSwishTimer: 0,
      backboardFlash: 0
    };

    // Bottom Wire Ball-Return Rack (5 slots)
    this.rackSlots = [];
    this.flyingBalls = [];      // Airborne 3D-scaled basketball arcs
    this.popups = [];

    // Per-hand ball holding & velocity tracking
    this.handTrackers = new Map();

    // Streak & Trophy stats
    this.streak = 0;
    this.bestStreak = 0;
    this.basketsMade = 0;
    this.p1Baskets = 0;
    this.p2Baskets = 0;

    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#fde047';
    this.quickShootQueued = false;

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  get isOnFire() {
    return this.streak >= 3;
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.hoop.y = Math.max(185, Math.min(235, canvasHeight * 0.30));
    this.rackY = canvasHeight - 62;

    const slotCount = 5;
    const rackLeft = canvasWidth * 0.22;
    const rackRight = canvasWidth * 0.78;
    const step = (rackRight - rackLeft) / (slotCount - 1);

    if (this.rackSlots.length === 0) {
      for (let i = 0; i < slotCount; i++) {
        this.rackSlots.push(this.createRackBall(rackLeft + step * i, this.rackY, i === 2 ? 'money' : 'normal'));
      }
    } else {
      for (let i = 0; i < this.rackSlots.length; i++) {
        this.rackSlots[i].x = rackLeft + step * i;
        this.rackSlots[i].y = this.rackY;
      }
    }
  }

  createRackBall(x, y, forcedKind = null) {
    let kind = forcedKind;
    if (!kind) {
      const r = Math.random();
      kind = r < 0.12 ? 'bomb' : (r < 0.34 ? 'money' : (r < 0.44 ? 'gold' : 'normal'));
    }
    return {
      x,
      y,
      kind,               // 'normal' | 'money' | 'gold' | 'bomb'
      bombTimer: kind === 'bomb' ? 260 : 0, // Bomb balls harmlessly roll away after ~4.3s if ignored!
      respawnDelay: 0
    };
  }

  reset() {
    this.flyingBalls = [];
    this.popups = [];
    this.handTrackers.clear();
    this.streak = 0;
    this.bestStreak = 0;
    this.basketsMade = 0;
    this.p1Baskets = 0;
    this.p2Baskets = 0;
    this.hoop.x = this.w * 0.5;
    this.hoop.netSwishTimer = 0;

    this.rackSlots = [];
    this.resize(this.w, this.h);
    this.showBanner('🏀 SCOOP BALLS LOW & PUSH UP TO SHOOT!', '#f97316', 85);
  }

  triggerQuickShoot() {
    this.quickShootQueued = true;
  }

  showBanner(text, color = '#fde047', duration = 65) {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerTimer = duration;
  }

  addPopup(x, y, text, color = '#fde047') {
    this.popups.push({ x, y, text, color, alpha: 1.0, vy: -2.2, scale: 0.7 });
  }

  launchBasketball(fromX, fromY, aimOffsetX, ballKind, playerIdx, speedMultiplier) {
    // Brisk ~25-frame arcade Pop-A-Shot zip toward the hoop!
    const flightFrames = Math.max(16, Math.round(26 / (speedMultiplier * 0.45 + 0.55)));
    const predictedHoopX = this.hoop.x;

    // Gentle arcade swish assist: if player releases reasonably aligned with hoop, guide smoothly toward rim!
    const rawTargetX = fromX + aimOffsetX;
    const blendedTargetX = predictedHoopX * 0.62 + rawTargetX * 0.38;
    const targetX = Math.max(this.w * 0.15, Math.min(this.w * 0.85, blendedTargetX));

    this.flyingBalls.push({
      kind: ballKind,
      playerIdx,
      t: 0,
      duration: flightFrames,
      startX: fromX,
      startY: fromY,
      targetX,
      targetY: this.hoop.y,
      peakLift: 155 + Math.random() * 20,
      x: fromX,
      y: fromY,
      radius: 34,
      rot: 0,
      vRot: (Math.random() < 0.5 ? -1 : 1) * 0.22,
      scoredState: 'rising', // 'rising' | 'dropping' | 'done'
      onFireShot: this.isOnFire,
      trail: []
    });
  }

  processShootingHand(id, hx, hy, playerIdx, isMouse, speedMultiplier) {
    let st = this.handTrackers.get(id);
    if (!st) {
      st = { x: hx, y: hy, vx: 0, vy: 0, heldBallKind: isMouse ? 'normal' : null, shootCooldown: 0 };
      this.handTrackers.set(id, st);
    }

    st.vx = st.vx * 0.45 + (hx - st.x) * 0.55;
    st.vy = st.vy * 0.45 + (hy - st.y) * 0.55;
    st.x = hx;
    st.y = hy;
    if (st.shootCooldown > 0) st.shootCooldown--;

    // 1. SCOOP BALL FROM RACK when hand dips into lower 40% of screen!
    const inScoopZone = hy >= this.h * 0.60;
    if (!st.heldBallKind && st.shootCooldown <= 0 && inScoopZone) {
      let bestSlot = null;
      let bestDist = 145;
      for (const slot of this.rackSlots) {
        if (slot.respawnDelay > 0) continue;
        const d = Math.hypot(hx - slot.x, hy - slot.y);
        if (d < bestDist) {
          bestDist = d;
          bestSlot = slot;
        }
      }

      if (bestSlot) {
        st.heldBallKind = bestSlot.kind;
        // Immediately schedule fresh ball roll-in on rack!
        const nextR = Math.random();
        bestSlot.kind = nextR < 0.12 ? 'bomb' : (nextR < 0.34 ? 'money' : (nextR < 0.45 ? 'gold' : 'normal'));
        bestSlot.bombTimer = bestSlot.kind === 'bomb' ? 260 : 0;
        bestSlot.respawnDelay = 12;
      }
    }

    // 2. LAUNCH SHOT when holding a ball AND pushing hand UPWARD (or reaching chest/overhead height, or clicking)!
    if (st.heldBallKind && st.shootCooldown <= 0) {
      const pushedUpFast = st.vy < -4.2 && hy < this.h * 0.74;
      const raisedHigh = hy < this.h * 0.49;
      const clickedQuick = isMouse && this.quickShootQueued;

      if (pushedUpFast || raisedHigh || clickedQuick) {
        const aimShift = st.vx * 7.5;
        this.launchBasketball(hx, hy, aimShift, st.heldBallKind, playerIdx, speedMultiplier);
        st.heldBallKind = null;
        st.shootCooldown = 10;
        if (clickedQuick) this.quickShootQueued = false;
      }
    } else if (!st.heldBallKind && isMouse && this.quickShootQueued && st.shootCooldown <= 0) {
      // One-click quick-shoot convenience for mouse/Spacebar players!
      this.launchBasketball(hx, Math.min(hy, this.h - 90), st.vx * 6, 'normal', playerIdx, speedMultiplier);
      st.shootCooldown = 10;
      this.quickShootQueued = false;
    }

    return st;
  }

  update(players, level, speedMultiplier, callbacks) {
    const { onSwish, onRimBounce, onBombBasket, onFireIgnite } = callbacks;

    if (this.bannerTimer > 0) this.bannerTimer--;
    if (this.hoop.netSwishTimer > 0) this.hoop.netSwishTimer--;
    if (this.hoop.backboardFlash > 0) this.hoop.backboardFlash--;

    // 1. Move Backboard horizontally on Level 2+ (Classic Pop-A-Shot Stage 2!)
    if (level >= 2) {
      const moveSpd = (1.6 + (level - 2) * 0.65) * (speedMultiplier * 0.6 + 0.4);
      this.hoop.x += Math.sign(this.hoop.vx) * moveSpd;
      if (this.hoop.x > this.w * 0.74) {
        this.hoop.x = this.w * 0.74;
        this.hoop.vx = -Math.abs(this.hoop.vx);
      } else if (this.hoop.x < this.w * 0.26) {
        this.hoop.x = this.w * 0.26;
        this.hoop.vx = Math.abs(this.hoop.vx);
      }
    } else {
      this.hoop.x += (this.w * 0.5 - this.hoop.x) * 0.15;
    }

    // 2. Update Bottom Wire Rack Balls (harmlessly cycle out ignored bomb balls)
    for (const slot of this.rackSlots) {
      if (slot.respawnDelay > 0) slot.respawnDelay--;
      if (slot.kind === 'bomb' && slot.respawnDelay <= 0) {
        slot.bombTimer--;
        if (slot.bombTimer <= 0) {
          slot.kind = 'normal';
        }
      }
    }

    // 3. Track Player Shooting Hands (1P or 2P Side-by-Side!)
    const activeHands = [];
    const count = Math.min(2, Math.max(1, players.length));
    this.isTwoPlayer = count >= 2;

    for (let pIdx = 0; pIdx < count; pIdx++) {
      const p = players[pIdx];
      const color = pIdx === 1 ? '#4ade80' : '#38bdf8';

      if (p.isMouseFallback) {
        const mx = ((p.leftHandScreen.x + p.rightHandScreen.x) * 0.5) * this.w;
        const my = p.leftHandScreen.y * this.h;
        const st = this.processShootingHand(`m_${pIdx}`, mx, my, pIdx, true, speedMultiplier);
        activeHands.push({ ...st, color, label: 'SHOOT' });
      } else {
        const lx = (p.leftHandScreen ? p.leftHandScreen.x : 0.35) * this.w;
        const ly = (p.leftHandScreen ? p.leftHandScreen.y : 0.72) * this.h;
        const rx = (p.rightHandScreen ? p.rightHandScreen.x : 0.65) * this.w;
        const ry = (p.rightHandScreen ? p.rightHandScreen.y : 0.72) * this.h;

        const stL = this.processShootingHand(`p${pIdx}_L`, lx, ly, pIdx, false, speedMultiplier);
        const stR = this.processShootingHand(`p${pIdx}_R`, rx, ry, pIdx, false, speedMultiplier);
        activeHands.push(
          { ...stL, color, label: pIdx === 1 ? 'P2' : 'P1' },
          { ...stR, color, label: pIdx === 1 ? 'P2' : 'P1' }
        );
      }
    }
    this.renderedHands = activeHands;
    this.quickShootQueued = false;

    // 4. Update Airborne Basketball Arcs & Check Rim / Swish Scoring!
    for (let i = this.flyingBalls.length - 1; i >= 0; i--) {
      const fb = this.flyingBalls[i];
      fb.t += 1 / fb.duration;
      fb.rot += fb.vRot;

      if (fb.scoredState !== 'done') {
        const u = Math.min(1.25, fb.t);
        fb.x = fb.startX + (fb.targetX - fb.startX) * u;
        const linearY = fb.startY + (fb.targetY - fb.startY) * u;
        const arcOffset = Math.sin(Math.min(1.15, u) * Math.PI) * fb.peakLift;
        fb.y = linearY - arcOffset;

        // Perspective shrink as ball arcs high toward the distant backboard!
        const scale = Math.max(0.58, 1.0 - Math.min(1, u) * 0.36);
        fb.radius = 36 * scale;

        if (u >= 0.52) fb.scoredState = 'dropping';

        fb.trail.push({ x: fb.x, y: fb.y, r: fb.radius });
        if (fb.trail.length > (fb.onFireShot ? 16 : 9)) fb.trail.shift();

        // Check Rim Plane Arrival (fb.t >= 0.98)!
        if (fb.t >= 0.98) {
          fb.scoredState = 'done';
          const distFromRimCenter = Math.abs(fb.x - this.hoop.x);

          if (fb.kind === 'bomb' && distFromRimCenter < this.hoop.rimRadius * 1.05) {
            // Uh-oh! Shot a spiky bomb ball into the basket!
            this.streak = 0;
            this.addPopup(this.hoop.x, this.hoop.y - 30, '💣 BOOM! NO BOMBS!', '#ef4444');
            this.showBanner('💣 OOPS! SKIP THE SPIKY BOMB BALLS!', '#ef4444', 60);
            if (onBombBasket) onBombBasket(this.hoop.x, this.hoop.y);
            this.flyingBalls.splice(i, 1);
            continue;
          }

          if (distFromRimCenter <= this.hoop.rimRadius * 0.98 && fb.kind !== 'bomb') {
            // SCORED BASKET!!
            const isPureSwish = distFromRimCenter <= this.hoop.rimRadius * 0.52;
            const wasOnFire = this.isOnFire;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.basketsMade++;
            if (fb.playerIdx === 1) this.p2Baskets++;
            else this.p1Baskets++;

            this.hoop.netSwishTimer = 20;
            this.hoop.backboardFlash = 14;

            if (!wasOnFire && this.isOnFire) {
              this.showBanner('🔥 HE\'S ON FIRE!! 2x FEVER SCORE! 🔥', '#f97316', 75);
              if (onFireIgnite) onFireIgnite();
            }

            let basePts = isPureSwish ? 25 : 15;
            if (fb.kind === 'money') basePts *= 2;
            else if (fb.kind === 'gold') basePts = 45;
            if (this.isOnFire) basePts *= 2;

            const label = isPureSwish
              ? (this.isOnFire ? `🔥 FIRE SWISH! +${basePts}` : `💦 SWISH! +${basePts}`)
              : `🏀 BUCKET! +${basePts}`;
            this.addPopup(this.hoop.x, this.hoop.y - 38, label, this.isOnFire ? '#f97316' : '#fde047');

            if (onSwish) onSwish(this.hoop.x, this.hoop.y, basePts, this.isOnFire);

            // Drop cleanly down through net
            fb.vxDrop = 0;
            fb.vyDrop = 7.5;
          } else {
            // Rimmed out harmlessly (resets Fire streak, NO heart penalty!)
            if (fb.kind !== 'bomb') {
              this.streak = 0;
            }
            fb.vxDrop = (fb.x >= this.hoop.x ? 1 : -1) * (4 + Math.random() * 3);
            fb.vyDrop = -4.5;
            if (onRimBounce) onRimBounce();
          }
        }
      } else {
        // Post-rim drop physics
        fb.x += fb.vxDrop || 0;
        fb.vyDrop = (fb.vyDrop || 0) + 0.55;
        fb.y += fb.vyDrop;
        fb.radius *= 0.985;
        if (fb.y > this.h + 50) {
          this.flyingBalls.splice(i, 1);
        }
      }
    }

    // 5. Update Floating Popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy;
      p.scale = Math.min(1.08, p.scale + 0.08);
      p.alpha -= 0.022;
      if (p.alpha <= 0) this.popups.splice(i, 1);
    }
  }

  // =========================================================================
  // RENDERING: NEON POP-A-SHOT CABINET, BACKBOARD, NET, RACK & GLOWING HANDS
  // =========================================================================

  draw(ctx, frameCount) {
    const w = this.w;
    const h = this.h;
    const onFire = this.isOnFire;

    ctx.save();

    // 1. Neon Arcade Pop-A-Shot Arena Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, onFire ? '#450a0a' : '#0f172a');
    bgGrad.addColorStop(0.55, onFire ? '#7c2d12' : '#1e1b4b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Perspective Arcade Side Netting Cages (Left & Right Cabinet Walls!)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, 95); ctx.lineTo(24, h);
    ctx.moveTo(w * 0.86, 95); ctx.lineTo(w - 24, h);
    ctx.moveTo(w * 0.14, this.hoop.y + 85); ctx.lineTo(w * 0.86, this.hoop.y + 85);
    ctx.stroke();

    // Slanted Arcade Ball-Return Ramp Floor
    const rampGrad = ctx.createLinearGradient(0, this.hoop.y + 85, 0, h);
    rampGrad.addColorStop(0, '#1e293b');
    rampGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = rampGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.16, this.hoop.y + 85);
    ctx.lineTo(w * 0.84, this.hoop.y + 85);
    ctx.lineTo(w - 24, h);
    ctx.lineTo(24, h);
    ctx.closePath();
    ctx.fill();

    // 2. Glass Backboard & LED Streak Marquee
    this.drawBackboard(ctx, frameCount, onFire);

    // 3. Rising Balls (drawn behind front rim lip before reaching apex, or dropping through net!)
    for (const fb of this.flyingBalls) {
      if (fb.scoredState === 'done') {
        this.drawBasketballSprite(ctx, fb.x, fb.y, fb.radius, fb.kind, fb.rot, fb.onFireShot, fb.trail);
      }
    }

    // 4. Steel Rim & Animated Woven Nylon Net!
    this.drawRimAndNet(ctx, frameCount, onFire);

    // 5. Airborne Balls on their way toward the hoop
    for (const fb of this.flyingBalls) {
      if (fb.scoredState !== 'done') {
        this.drawBasketballSprite(ctx, fb.x, fb.y, fb.radius, fb.kind, fb.rot, fb.onFireShot, fb.trail);
      }
    }

    // 6. Chrome Wire Bottom Ball-Return Rack & Waiting Basketballs!
    this.drawBottomBallRack(ctx, frameCount);

    // 7. Player Shooting Hands (plus Held Basketball right in your hand!)
    for (const hSt of (this.renderedHands || [])) {
      this.drawShooterHand(ctx, hSt, frameCount);
    }

    // 8. Floating Swish Popups & Banner
    for (const p of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.font = '700 28px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.translate(w / 2, 118);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-255, -24, 510, 48, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  drawBackboard(ctx, frameCount, onFire) {
    const hx = this.hoop.x;
    const hy = this.hoop.y;
    const bw = 200;
    const bh = 128;

    ctx.save();

    // Digital Arcade Score / Streak Header mounted above Backboard!
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = onFire ? '#f97316' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(hx - 105, hy - bh - 38, 210, 34, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = onFire ? '#fde047' : '#38bdf8';
    const boardTxt = this.isTwoPlayer
      ? `P1: ${this.p1Baskets} 🏀  |  P2: ${this.p2Baskets} 🏀`
      : (onFire ? `🔥 ON FIRE! x${this.streak} STREAK 🔥` : `🏀 BASKETS: ${this.basketsMade} • STREAK: ${this.streak}`);
    ctx.fillText(boardTxt, hx, hy - bh - 20);

    // Tempered Glass Backboard with Neon Rim Glow
    ctx.shadowBlur = onFire || this.hoop.backboardFlash > 0 ? 28 : 12;
    ctx.shadowColor = onFire ? '#f97316' : '#38bdf8';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
    ctx.strokeStyle = this.hoop.backboardFlash > 0 ? '#fde047' : (onFire ? '#fb923c' : '#e2e8f0');
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(hx - bw / 2, hy - bh + 12, bw, bh, 12);
    ctx.fill();
    ctx.stroke();

    // Inner Shooter's Target Square
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.hoop.backboardFlash > 0 ? '#4ade80' : '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(hx - 38, hy - 54, 76, 54);

    ctx.restore();
  }

  drawRimAndNet(ctx, frameCount, onFire) {
    const hx = this.hoop.x;
    const hy = this.hoop.y;
    const r = this.hoop.rimRadius;
    const swishLift = this.hoop.netSwishTimer > 0
      ? Math.sin((this.hoop.netSwishTimer / 20) * Math.PI) * 22
      : 0;
    const swishFlare = this.hoop.netSwishTimer > 0 ? 14 : 0;

    ctx.save();

    // Woven White Diamond Nylon Net
    const netH = 68 - swishLift;
    const botR = r * 0.58 + swishFlare;
    ctx.strokeStyle = onFire ? '#fde047' : 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = 2.5;

    const strands = 8;
    for (let i = 0; i <= strands; i++) {
      const ratio = i / strands;
      const topX = hx - r + ratio * (r * 2);
      const botX = hx - botR + ratio * (botR * 2);
      ctx.beginPath();
      ctx.moveTo(topX, hy);
      ctx.quadraticCurveTo((topX + botX) * 0.5, hy + netH * 0.55, botX, hy + netH);
      ctx.stroke();

      // Cross-weave diamond threads
      if (i < strands) {
        const nextTopX = hx - r + ((i + 1) / strands) * (r * 2);
        ctx.beginPath();
        ctx.moveTo(topX, hy + netH * 0.35);
        ctx.lineTo(nextTopX, hy + netH * 0.72);
        ctx.moveTo(nextTopX, hy + netH * 0.35);
        ctx.lineTo(topX, hy + netH * 0.72);
        ctx.stroke();
      }
    }

    // Orange Steel Breakaway Rim!
    ctx.shadowBlur = onFire ? 20 : 6;
    ctx.shadowColor = '#f97316';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(hx, hy, r, 13, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawBottomBallRack(ctx, frameCount) {
    const leftX = this.w * 0.16;
    const rightX = this.w * 0.84;

    ctx.save();
    // Chrome Arcade Front Rail Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(leftX, this.rackY - 14, rightX - leftX, 64, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⬇️ REACH DOWN TO GRAB A BALL • PUSH HAND UP TO SHOOT! ⬆️', this.w * 0.5, this.rackY + 38);

    // Waiting Basketballs on the Rack!
    for (const slot of this.rackSlots) {
      if (slot.respawnDelay > 0) continue;
      this.drawBasketballSprite(ctx, slot.x, slot.y - 6, 31, slot.kind, frameCount * 0.02, false, []);
    }

    ctx.restore();
  }

  drawBasketballSprite(ctx, x, y, r, kind, rot, onFire, trail) {
    // Flame / Rainbow Trail
    if (trail && trail.length > 0) {
      for (let i = 0; i < trail.length; i++) {
        const pt = trail[i];
        const ratio = (i + 1) / trail.length;
        ctx.save();
        ctx.globalAlpha = ratio * (onFire ? 0.68 : 0.32);
        ctx.fillStyle = onFire ? (i % 2 === 0 ? '#fde047' : '#ef4444') : (kind === 'money' ? '#38bdf8' : '#fb923c');
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(3, pt.r * ratio * 0.85), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(x, y);

    if (kind === 'bomb') {
      // Spiky Trick Bomb Ball!
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(r * 1.05)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 2);
      ctx.restore();
      return;
    }

    ctx.rotate(rot);
    if (onFire || kind === 'gold' || kind === 'money') {
      ctx.shadowBlur = 18;
      ctx.shadowColor = onFire ? '#f97316' : (kind === 'gold' ? '#fde047' : '#ec4899');
    }

    const bGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    if (kind === 'gold') {
      bGrad.addColorStop(0, '#fef9c3');
      bGrad.addColorStop(0.55, '#facc15');
      bGrad.addColorStop(1, '#b45309');
    } else if (kind === 'money') {
      // Classic ABA Red-White-Blue 2x Money Ball!
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.5, '#f43f5e');
      bGrad.addColorStop(1, '#2563eb');
    } else {
      bGrad.addColorStop(0, '#fdba74');
      bGrad.addColorStop(0.55, '#f97316');
      bGrad.addColorStop(1, '#9a3412');
    }

    ctx.fillStyle = bGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Classic Black BasketballRibs
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.arc(-r * 0.65, 0, r * 0.7, -0.8, 0.8);
    ctx.arc(r * 0.65, 0, r * 0.7, Math.PI - 0.8, Math.PI + 0.8);
    ctx.stroke();

    ctx.restore();
  }

  drawShooterHand(ctx, hSt, frameCount) {
    ctx.save();

    // If holding a ball, draw the basketball right in the player's palm with an upward "SHOOT! ⬆️" arrow!
    if (hSt.heldBallKind) {
      this.drawBasketballSprite(ctx, hSt.x, hSt.y - 10, 32, hSt.heldBallKind, 0, this.isOnFire, []);
      ctx.fillStyle = hSt.heldBallKind === 'bomb' ? '#ef4444' : '#4ade80';
      ctx.font = '700 13px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hSt.heldBallKind === 'bomb' ? '⚠️ BOMB!' : '⬆️ FLICK UP!', hSt.x, hSt.y - 52);
    }

    // Glowing Arcade Shooter Hand Ring
    ctx.strokeStyle = hSt.color;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.shadowBlur = 14;
    ctx.shadowColor = hSt.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hSt.x, hSt.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
