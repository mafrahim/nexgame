/**
 * poseparty.js
 * Copycat Mirror Party! — Nex-Style Full-Body Simon-Says & AR Mirror Game Show
 * (Inspired by Elmo Says, Mirrorama & Copycat Deluxe — hosted by DJ Acorn!)
 *
 * Creative Challenges & Rewards:
 * - 7 Full-Body Pose & Trick Prompts:
 *   1. 🙌 HANDS UP HIGH ("Touch the Stars!")
 *   2. ✈️ SUPER WINGS T-POSE ("Spread Your Wings Wide!")
 *   3. ⬇️ LASER SQUAT ("Duck Under the Laser Beam!")
 *   4. 🦘 SKY TRAMPOLINE JUMP ("Jump Up High!")
 *   5. ⬅️ LEAN LEFT SPOTLIGHT ("Step/Lean Left!")
 *   6. ➡️ LEAN RIGHT SPOTLIGHT ("Step/Lean Right!")
 *   7. 🥶 RED-LIGHT FREEZE! ("DON'T MOVE! Hold Ice-Statue Still!")
 * - ⚡ LIGHTNING SPEED-ROUND every 5 poses (rapid-fire 2x points!)
 * - 🎁 Wearable AR Mystery Costume Unlocks every 3 streak:
 *   Tier 1: 🕶️ Neon Star Shades -> Tier 2: 👑 Golden Crown -> Tier 3: 🦸 Rainbow Hero Cape -> Tier 4: 🕺 Disco Halo (3x!)
 * - 👯 2-Player TWIN SYNC Bonus when two players lock the pose together!
 */

const POSES = [
  { id: 'hands_up', title: '🙌 HANDS UP HIGH!', sub: 'Raise both arms to the sky!', icon: '🙌', color: '#38bdf8', holdFrames: 18 },
  { id: 't_pose', title: '✈️ SUPER WINGS!', sub: 'Spread arms wide left & right!', icon: '✈️', color: '#a855f7', holdFrames: 18 },
  { id: 'squat', title: '⬇️ DUCK THE LASER!', sub: 'Squat low under the neon beam!', icon: '⬇️', color: '#f472b6', holdFrames: 16 },
  { id: 'jump', title: '🦘 TRAMPOLINE POP!', sub: 'Bounce / Jump up off the floor!', icon: '🦘', color: '#4ade80', holdFrames: 1 },
  { id: 'lean_left', title: '⬅️ SPOTLIGHT LEFT!', sub: 'Lean or step into the LEFT side!', icon: '⬅️', color: '#fb923c', holdFrames: 16 },
  { id: 'lean_right', title: '➡️ SPOTLIGHT RIGHT!', sub: 'Lean or step into the RIGHT side!', icon: '➡️', color: '#2dd4bf', holdFrames: 16 },
  { id: 'freeze', title: '🥶 RED LIGHT: FREEZE!', sub: 'HOLD STILL like an ice statue!', icon: '❄️', color: '#67e8f9', holdFrames: 42 }
];

const COSTUME_TIERS = [
  { tier: 0, name: 'Contestant', icon: '🎤' },
  { tier: 1, name: 'Neon Star Shades', icon: '🕶️' },
  { tier: 2, name: 'Royal Acorn Crown', icon: '👑' },
  { tier: 3, name: 'Superhero Aura', icon: '🦸' },
  { tier: 4, name: 'Disco Legend (3x!)', icon: '🕺' }
];

export class PosePartyGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.currentPose = POSES[0];
    this.poseTimer = 210;
    this.maxPoseTimer = 210;
    this.holdProgress = 0; // 0..1
    this.celebrateTimer = 0; // brief celebration pause between poses
    this.roundCount = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.costumeTier = 0;
    this.lightningActive = false;

    // Fallback keyboard T-pose flag & motion velocity tracker for Freeze rounds
    this.fallbackWingsHeld = false;
    this.prevHandPos = new Map();
    this.floatingTexts = [];
    this.confetti = [];

    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#facc15';

    this.lastPlayerSnapshot = null;
    this.twoPlayerSynced = false;

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
  }

  reset() {
    this.roundCount = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.costumeTier = 0;
    this.lightningActive = false;
    this.celebrateTimer = 0;
    this.holdProgress = 0;
    this.floatingTexts = [];
    this.confetti = [];
    this.prevHandPos.clear();
    this.pickNextPose(1, 1.0);
    this.bannerTimer = 85;
    this.bannerText = '🎤 COPY DJ ACORN\'S POSES IN THE MIRROR!';
    this.bannerColor = '#facc15';
  }

  setFallbackWings(active) {
    this.fallbackWingsHeld = active;
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

  spawnConfettiBurst(cx, cy, count = 22) {
    const cols = ['#facc15', '#38bdf8', '#f472b6', '#4ade80', '#c084fc', '#fb923c'];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 7;
      this.confetti.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        color: cols[i % cols.length],
        alpha: 1.0
      });
    }
  }

  pickNextPose(level, speedMultiplier) {
    this.roundCount++;
    this.lightningActive = this.roundCount > 1 && this.roundCount % 5 === 0;

    let candidates = POSES.filter(p => p.id !== this.currentPose.id);
    if (this.lightningActive) {
      // Lightning round favors snappy athletic poses over long freeze
      candidates = candidates.filter(p => p.id !== 'freeze');
    }
    this.currentPose = candidates[Math.floor(Math.random() * candidates.length)];

    const speedFactor = 0.72 + speedMultiplier * 0.28;
    const baseFrames = this.lightningActive
      ? 135
      : Math.max(145, 235 - (level - 1) * 14);
    this.maxPoseTimer = Math.round(baseFrames / speedFactor);
    this.poseTimer = this.maxPoseTimer;
    this.holdProgress = 0;
    this.twoPlayerSynced = false;
  }

  checkSinglePlayerPose(p, pIdx, fallbackControls) {
    const lh = p.leftHandScreen || { x: 0.35, y: 0.65 };
    const rh = p.rightHandScreen || { x: 0.65, y: 0.65 };
    const mx = p.mirroredX ?? 0.5;
    const jumping = !!p.isJumping || (pIdx === 0 && !!fallbackControls.jump);
    const ducking = !!p.isDucking || (pIdx === 0 && !!fallbackControls.duck);

    // Measure hand motion delta for FreezeStatue check
    const key = `p_${pIdx}`;
    const prev = this.prevHandPos.get(key);
    let motionDelta = 0;
    if (prev) {
      motionDelta = Math.hypot(lh.x - prev.lx, lh.y - prev.ly) + Math.hypot(rh.x - prev.rx, rh.y - prev.ry) + Math.abs(mx - prev.mx);
    }
    this.prevHandPos.set(key, { lx: lh.x, ly: lh.y, rx: rh.x, ry: rh.y, mx });

    const poseId = this.currentPose.id;
    if (poseId === 'hands_up') {
      return (lh.y < 0.42 && rh.y < 0.42) || ((p.leftHand?.y ?? 0) < -0.18 && (p.rightHand?.y ?? 0) < -0.18) || (pIdx === 0 && fallbackControls.handsUp);
    }
    if (poseId === 't_pose') {
      const span = Math.abs(rh.x - lh.x);
      const midHeight = lh.y > 0.22 && lh.y < 0.76 && rh.y > 0.22 && rh.y < 0.76;
      return (span > 0.34 && midHeight) || (pIdx === 0 && this.fallbackWingsHeld);
    }
    if (poseId === 'squat') {
      return ducking || (lh.y > 0.74 && rh.y > 0.74);
    }
    if (poseId === 'jump') {
      return jumping;
    }
    if (poseId === 'lean_left') {
      return mx < 0.44 || (lh.x < 0.38 && rh.x < 0.44);
    }
    if (poseId === 'lean_right') {
      return mx > 0.56 || (lh.x > 0.56 && rh.x > 0.62);
    }
    if (poseId === 'freeze') {
      return !jumping && motionDelta < 0.032;
    }
    return false;
  }

  update(players, fallbackControls, level, speedMultiplier, callbacks) {
    const { onPoseSuccess, onCostumeUnlock, onPoseFail, onLightningStart } = callbacks;

    if (this.bannerTimer > 0) this.bannerTimer--;

    // Update confetti & popups
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.22;
      c.rot += c.vRot;
      c.alpha -= 0.018;
      if (c.alpha <= 0) this.confetti.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    const pList = players.length > 0 ? players : [{
      mirroredX: 0.5,
      leftHandScreen: { x: 0.35, y: 0.65 },
      rightHandScreen: { x: 0.65, y: 0.65 },
      isJumping: fallbackControls.jump,
      isDucking: fallbackControls.duck
    }];
    this.lastPlayerSnapshot = pList[0];

    // Inter-pose celebration breather
    if (this.celebrateTimer > 0) {
      this.celebrateTimer--;
      if (this.celebrateTimer === 0) {
        const wasLightning = this.lightningActive;
        this.pickNextPose(level, speedMultiplier);
        if (this.lightningActive && !wasLightning) {
          this.bannerText = '⚡ LIGHTNING POSE ROUND! DOUBLE POINTS! ⚡';
          this.bannerColor = '#facc15';
          this.bannerTimer = 85;
          if (onLightningStart) onLightningStart();
        }
      }
      return;
    }

    // Evaluate pose matching across 1 or 2 players!
    const p1Match = this.checkSinglePlayerPose(pList[0], 0, fallbackControls);
    const p2Match = pList.length >= 2 ? this.checkSinglePlayerPose(pList[1], 1, fallbackControls) : false;
    const anyMatch = p1Match || p2Match;
    if (p1Match && p2Match) this.twoPlayerSynced = true;

    const neededFrames = this.currentPose.holdFrames;
    if (anyMatch) {
      this.holdProgress = Math.min(1, this.holdProgress + 1 / neededFrames);
    } else if (this.currentPose.id === 'freeze') {
      // Moving during Red-Light Freeze drains progress slightly so kids feel the tension!
      this.holdProgress = Math.max(0, this.holdProgress - 0.035);
    } else {
      this.holdProgress = Math.max(0, this.holdProgress - 0.02);
    }

    // POSE LOCKED IN!
    if (this.holdProgress >= 1) {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      // Speed bonus for locking the pose quickly!
      const speedRatio = this.poseTimer / this.maxPoseTimer;
      let pts = this.currentPose.id === 'freeze' ? 45 : (25 + Math.round(speedRatio * 15));
      if (this.lightningActive) pts *= 2;
      if (this.costumeTier >= 4) pts = Math.round(pts * 1.5);
      if (this.twoPlayerSynced) pts += 25;

      const mirrorCenterX = this.w * 0.69;
      const mirrorCenterY = this.h * 0.52;
      let label = this.currentPose.id === 'freeze'
        ? `🥶 ICE STATUE! +${pts}`
        : `🌟 NAILED IT! +${pts}`;
      if (this.twoPlayerSynced) label = `👯 TWIN SYNC! +${pts}`;
      else if (this.lightningActive) label = `⚡ 2x SPEED POSE! +${pts}`;

      this.addPopup(mirrorCenterX, mirrorCenterY - 40, label, this.currentPose.color, 1.2);
      this.spawnConfettiBurst(mirrorCenterX, mirrorCenterY, 26);

      // Check AR Mystery Costume Box Unlock every 3-streak!
      const newTier = Math.min(4, Math.floor(this.streak / 3));
      if (newTier > this.costumeTier) {
        this.costumeTier = newTier;
        const unlocked = COSTUME_TIERS[newTier];
        this.bannerText = `🎁 AR COSTUME UNLOCKED: ${unlocked.icon} ${unlocked.name.toUpperCase()}!`;
        this.bannerColor = '#facc15';
        this.bannerTimer = 105;
        this.spawnConfettiBurst(this.w * 0.5, this.h * 0.35, 36);
        if (onCostumeUnlock) onCostumeUnlock(unlocked);
      }

      if (onPoseSuccess) onPoseSuccess(mirrorCenterX, mirrorCenterY, pts, this.currentPose.color);
      this.celebrateTimer = this.lightningActive ? 22 : 34;
      return;
    }

    // Countdown prompt timer
    this.poseTimer--;
    if (this.poseTimer <= 0) {
      this.streak = 0;
      const mirrorCenterX = this.w * 0.69;
      const mirrorCenterY = this.h * 0.52;
      const failMsg = this.currentPose.id === 'freeze'
        ? '😜 WIGGLED ON FREEZE! -1 ❤️'
        : '⏰ TOO SLOW! -1 ❤️';
      this.addPopup(mirrorCenterX, mirrorCenterY, failMsg, '#f43f5e', 1.1);
      if (onPoseFail) onPoseFail(mirrorCenterX, mirrorCenterY);
      this.celebrateTimer = 30;
    }
  }

  draw(ctx, frameCount, videoElement) {
    const w = this.w;
    const h = this.h;
    const pose = this.currentPose;
    const isFreeze = pose.id === 'freeze';

    ctx.save();

    // 1. Broadway / TV Game-Show Velvet Stage Backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    if (isFreeze) {
      bg.addColorStop(0, '#083344');
      bg.addColorStop(0.55, '#164e63');
      bg.addColorStop(1, '#0f172a');
    } else if (this.lightningActive) {
      bg.addColorStop(0, '#451a03');
      bg.addColorStop(0.55, '#7c2d12');
      bg.addColorStop(1, '#090514');
    } else {
      bg.addColorStop(0, '#2e1065');
      bg.addColorStop(0.55, '#4c1d95');
      bg.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Stage Wooden/Glossy Floor
    const floorY = h * 0.80;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#311042');
    floorGrad.addColorStop(1, '#090514');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Flashing Marquee Show Bulbs along Stage Arch
    const bulbCount = 22;
    for (let i = 0; i < bulbCount; i++) {
      const bx = (i + 0.5) * (w / bulbCount);
      const lit = (i + Math.floor(frameCount / 8)) % 2 === 0;
      ctx.fillStyle = lit ? '#fde047' : 'rgba(253, 224, 71, 0.25)';
      ctx.beginPath();
      ctx.arc(bx, 98, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Giant Center-Top Game-Show Prompt Card + Timer Ring!
    this.drawPromptMarquee(ctx, pose, frameCount);

    // 3. LEFT STAGE: DJ Acorn (Funky Squirrel Showman demonstrating the exact pose!)
    this.drawDJAcornStage(ctx, w * 0.26, floorY - 12, pose.id, frameCount);

    // 4. RIGHT STAGE: Broadway AR Player Mirror + Pose Lock-On Aura + Wearable AR Costumes!
    this.drawBroadwayMirror(ctx, w * 0.69, h * 0.55, videoElement, pose, frameCount);

    // 5. Confetti & Floating Score Popups
    for (const c of this.confetti) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-6, -3, 12, 6);
      ctx.restore();
    }

    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `bold ${Math.round(24 * ft.scale)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#090514';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 6. Bottom Costume Closet Progress Bar & Helpful Keyboard Controls Hint
    this.drawBottomCostumeBar(ctx);

    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.bannerTimer / 18);
      const bw = Math.min(w * 0.80, 590);
      const bx = (w - bw) / 2;
      const by = h - 98;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
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

  drawPromptMarquee(ctx, pose, frameCount) {
    const w = this.w;
    const cardW = Math.min(w * 0.72, 540);
    const cardX = (w - cardW) / 2;
    const cardY = 112;
    const cardH = 74;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = pose.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = pose.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Prompt Title & Subtitle
    ctx.fillStyle = pose.color;
    ctx.font = 'bold 25px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pose.title, w / 2, cardY + 32);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 15px Fredoka, sans-serif';
    ctx.fillText(pose.sub, w / 2, cardY + 56);

    // Countdown bar along bottom of prompt card
    const timeFrac = Math.max(0, this.poseTimer / this.maxPoseTimer);
    ctx.fillStyle = timeFrac < 0.3 ? '#ef4444' : pose.color;
    ctx.beginPath();
    ctx.roundRect(cardX + 16, cardY + cardH - 8, (cardW - 32) * timeFrac, 5, 3);
    ctx.fill();
    ctx.restore();
  }

  drawDJAcornStage(ctx, cx, baseY, poseId, frameCount) {
    ctx.save();

    // Glowing Game-Show Pedestal
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 92, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐿️ HOST: DJ ACORN', cx, baseY + 5);

    // Animate DJ Acorn's body offset & limbs to match the exact target pose!
    let offsetX = 0;
    let offsetY = 0;
    let squatScaleY = 1.0;
    let lArmAngle = 0.5;
    let rArmAngle = -0.5;

    if (poseId === 'hands_up') {
      lArmAngle = -2.35;
      rArmAngle = 2.35;
      offsetY = Math.sin(frameCount * 0.15) * 4;
    } else if (poseId === 't_pose') {
      lArmAngle = -1.57;
      rArmAngle = 1.57;
    } else if (poseId === 'squat') {
      offsetY = 34;
      squatScaleY = 0.72;
      lArmAngle = -0.9;
      rArmAngle = 0.9;
    } else if (poseId === 'jump') {
      offsetY = -Math.abs(Math.sin(frameCount * 0.16)) * 58;
      lArmAngle = -2.2;
      rArmAngle = 2.2;
    } else if (poseId === 'lean_left') {
      offsetX = -46;
      lArmAngle = -1.9;
      rArmAngle = 0.6;
    } else if (poseId === 'lean_right') {
      offsetX = 46;
      lArmAngle = -0.6;
      rArmAngle = 1.9;
    } else if (poseId === 'freeze') {
      lArmAngle = -1.2;
      rArmAngle = 1.2;
    }

    ctx.translate(cx + offsetX, baseY - 82 + offsetY);
    ctx.scale(1, squatScaleY);

    // Big Fluffy Squirrel Tail!
    ctx.fillStyle = isFreezePose(poseId) ? '#38bdf8' : '#d97706';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(38, -6, 36, -Math.PI * 0.7, Math.PI * 0.6);
    ctx.quadraticCurveTo(18, 34, 14, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Feet
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(-18, 62, 16, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(18, 62, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Funky Purple Tracksuit Torso + Gold Acorn Chain
    ctx.fillStyle = isFreezePose(poseId) ? '#67e8f9' : '#9333ea';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-28, -14, 56, 68, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = '20px sans-serif';
    ctx.fillText('🌰', 0, 24);

    // Animated Left & Right Arms demonstrating the pose!
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 28, -2);
      ctx.rotate(side === -1 ? lArmAngle : rArmAngle);
      ctx.fillStyle = isFreezePose(poseId) ? '#67e8f9' : '#d97706';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-8, 0, 16, 48, 8);
      ctx.fill();
      ctx.stroke();

      // White showman glove paw
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 50, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Squirrel Head & Perky Ears
    ctx.fillStyle = isFreezePose(poseId) ? '#bae6fd' : '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-20, -64, 9, 16, -0.2, 0, Math.PI * 2);
    ctx.ellipse(20, -64, 9, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -40, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Star Shades on DJ Acorn!
    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-24, -49, 20, 12);
    ctx.fillRect(4, -49, 20, 12);
    ctx.strokeRect(-24, -49, 20, 12);
    ctx.strokeRect(4, -49, 20, 12);

    // Buck-toothed Squirrel Grin!
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -25, 5, 7);
    ctx.fillRect(1, -25, 5, 7);

    ctx.restore();
  }

  drawBroadwayMirror(ctx, cx, cy, videoElement, pose, frameCount) {
    const mw = Math.min(this.w * 0.42, 390);
    const mh = Math.min(this.h * 0.48, 300);
    const mx = cx - mw / 2;
    const my = cy - mh / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 24);
    ctx.clip();

    // Live Mirrored Webcam Feed (or animated stage silhouette if camera off)
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      ctx.save();
      ctx.translate(mx + mw, my);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, mw, mh);
      ctx.restore();
    } else {
      const fallbackBg = ctx.createLinearGradient(0, my, 0, my + mh);
      fallbackBg.addColorStop(0, '#1e293b');
      fallbackBg.addColorStop(1, '#0f172a');
      ctx.fillStyle = fallbackBg;
      ctx.fillRect(mx, my, mw, mh);

      // Draw responsive silhouette puppet mirroring fallback controls!
      const snap = this.lastPlayerSnapshot || { mirroredX: 0.5, leftHandScreen: { x: 0.35, y: 0.6 }, rightHandScreen: { x: 0.65, y: 0.6 } };
      const px = mx + snap.mirroredX * mw;
      const py = my + mh * 0.62 - (snap.isJumping ? 34 : 0) + (snap.isDucking ? 34 : 0);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(px, py - 42, 22, 0, Math.PI * 2);
      ctx.moveTo(px, py - 20);
      ctx.lineTo(px, py + 48);
      ctx.moveTo(px, py - 8);
      ctx.lineTo(mx + snap.leftHandScreen.x * mw, my + snap.leftHandScreen.y * mh);
      ctx.moveTo(px, py - 8);
      ctx.lineTo(mx + snap.rightHandScreen.x * mw, my + snap.rightHandScreen.y * mh);
      ctx.stroke();
    }

    // Visual Challenge Overlays inside the Mirror!
    if (pose.id === 'squat') {
      // Sweeping overhead neon laser beam to duck underneath!
      const laserY = my + mh * 0.36 + Math.sin(frameCount * 0.14) * 6;
      ctx.strokeStyle = '#f43f5e';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f43f5e';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(mx, laserY);
      ctx.lineTo(mx + mw, laserY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (pose.id === 'lean_left' || pose.id === 'lean_right') {
      const targetLeft = pose.id === 'lean_left';
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
      ctx.fillRect(targetLeft ? mx : mx + mw * 0.52, my, mw * 0.48, mh);
    } else if (pose.id === 'freeze') {
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)';
      ctx.lineWidth = 12;
      ctx.strokeRect(mx + 6, my + 6, mw - 12, mh - 12);
    }

    // Draw Unlocked Wearable AR Costumes right onto the player inside the Mirror!
    if (this.costumeTier > 0 && this.lastPlayerSnapshot) {
      const headX = mx + (this.lastPlayerSnapshot.mirroredX ?? 0.5) * mw;
      const headY = my + mh * 0.30 - (this.lastPlayerSnapshot.isJumping ? 26 : 0) + (this.lastPlayerSnapshot.isDucking ? 34 : 0);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (this.costumeTier >= 3) {
        // Superhero Rainbow Aura Ring
        ctx.strokeStyle = `hsla(${(frameCount * 5) % 360}, 95%, 65%, 0.7)`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(headX, headY + 35, 58, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.costumeTier >= 1) {
        ctx.font = '32px sans-serif';
        ctx.fillText('🕶️', headX, headY + 4);
      }
      if (this.costumeTier >= 2) {
        ctx.font = '34px sans-serif';
        ctx.fillText('👑', headX, headY - 28);
      }
      if (this.costumeTier >= 4) {
        ctx.font = '28px sans-serif';
        const orbit = frameCount * 0.08;
        ctx.fillText('🪩', headX + Math.cos(orbit) * 48, headY - 36);
        ctx.fillText('✨', headX - Math.cos(orbit) * 48, headY - 36);
      }
      ctx.restore();
    }

    ctx.restore();

    // Outer Mirror Border + Pose Lock-On Progress Ring!
    ctx.save();
    const borderCol = this.celebrateTimer > 0 ? '#4ade80' : (this.holdProgress > 0.25 ? '#facc15' : pose.color);
    ctx.strokeStyle = borderCol;
    ctx.shadowBlur = 22;
    ctx.shadowColor = borderCol;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 24);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lock-On Progress Pill above Mirror
    const barW = 190;
    const barX = cx - barW / 2;
    const barY = my - 26;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 18, 9);
    ctx.fill();

    ctx.fillStyle = this.holdProgress > 0.7 ? '#4ade80' : '#facc15';
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, Math.max(8, (barW - 4) * this.holdProgress), 14, 7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.celebrateTimer > 0 ? '✨ POSE MATCHED!' : `POSE LOCK: ${Math.round(this.holdProgress * 100)}%`, cx, barY + 13);
    ctx.restore();
  }

  drawBottomCostumeBar(ctx) {
    const w = this.w;
    const h = this.h;
    const y = h - 42;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    const boxW = Math.min(w * 0.90, 740);
    const boxX = (w - boxW) / 2;
    ctx.beginPath();
    ctx.roundRect(boxX, y - 16, boxW, 34, 17);
    ctx.fill();
    ctx.stroke();

    const curCostume = COSTUME_TIERS[this.costumeTier];
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🎁 STREAK x${this.streak} • AR GEAR: ${curCostume.icon} ${curCostume.name}`, boxX + 18, y + 1);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px Fredoka, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⌨️ Up:Hands • T:Wings • Down:Squat • Space:Jump • L/R:Lean', boxX + boxW - 18, y + 1);
    ctx.restore();
  }
}

function isFreezePose(poseId) {
  return poseId === 'freeze';
}
