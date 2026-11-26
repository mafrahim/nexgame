/**
 * airplane.js
 * Sky Wings Flyer — 3D Horizon Canyon & Cloud-Ring Flight Engine for Kids Motion Playground!
 * Spread your hands like airplane wings: tilt left/right to bank & steer through the winding sky path!
 * Supports 1-Player Solo Ace and 2-Player Wingman Squadron Co-op!
 */

export class SkyFlyerGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // Winding sky highway generator
    this.distance = 0;
    this.spawnCursorZ = 0;
    this.entities = []; // { z, xNorm, yLift, type: 'ring' | 'turbo' | 'storm' | 'pillar' | 'balloon', hit, rot }
    this.speedLines = [];

    // Combo & Turbo Boost state
    this.combo = 0;
    this.turboTimer = 0;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#fde047';

    // Up to 2 airplanes (Player 1: Crimson/Cyan Ace, Player 2: Emerald/Gold Wingman)
    this.planes = [
      this.createPlaneState(-0.14, '#ef4444', '#fde047', '#38bdf8', 'P1 ACE'),
      this.createPlaneState(0.14, '#10b981', '#fef08a', '#a855f7', 'P2 WING')
    ];

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  createPlaneState(defaultX, bodyColor, trimColor, trailColor, label) {
    return {
      x: defaultX,       // [-1.0 .. 1.0] across sky width
      yLift: 0,          // [0 .. 1] subtle altitude climb when arms raised high
      bankAngle: 0,      // radians: negative = bank left, positive = bank right
      vx: 0,
      invulnTimer: 0,
      propAngle: 0,
      ribbon: [],        // wingtip smoke trail history
      bodyColor,
      trimColor,
      trailColor,
      label
    };
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.horizonY = Math.max(150, canvasHeight * 0.34);
    this.groundBottomY = canvasHeight;
    this.planeBaseY = canvasHeight - 115;
  }

  reset() {
    this.distance = 0;
    this.spawnCursorZ = 180;
    this.entities = [];
    this.combo = 0;
    this.turboTimer = 0;
    this.bannerTimer = 75;
    this.bannerText = '✈️ SPREAD ARMS & TILT TO STEER!';
    this.bannerColor = '#38bdf8';

    this.planes[0].x = 0;
    this.planes[0].bankAngle = 0;
    this.planes[0].invulnTimer = 0;
    this.planes[0].ribbon = [];

    this.planes[1].x = 0.22;
    this.planes[1].bankAngle = 0;
    this.planes[1].invulnTimer = 0;
    this.planes[1].ribbon = [];

    // Pre-populate upcoming sky path rings & obstacles
    while (this.spawnCursorZ < 2400) {
      this.spawnNextSegment(1);
    }
  }

  // Smooth winding sky path center X in range [-0.58, 0.58] at world depth Z
  getPathCenter(worldZ) {
    return Math.sin(worldZ * 0.0015) * 0.42 + Math.sin(worldZ * 0.00067 + 1.2) * 0.18;
  }

  spawnNextSegment(level = 1) {
    const z = this.spawnCursorZ;
    const pathX = this.getPathCenter(z);

    // Every ~210 depth units, place a guiding Ring or Rainbow Turbo Gate along the winding path!
    const isTurbo = Math.random() < 0.16;
    this.entities.push({
      z,
      xNorm: pathX,
      yLift: Math.sin(z * 0.003) * 0.18 + 0.15,
      type: isTurbo ? 'turbo' : 'ring',
      hit: false,
      rot: Math.random() * Math.PI * 2
    });

    // Spawn off-path obstacles (Storm Clouds, Hot Air Balloons, or Canyon Pillars) to weave around!
    const obstacleChance = Math.min(0.88, 0.52 + (level - 1) * 0.08);
    if (Math.random() < obstacleChance) {
      // Place obstacle on either the left or right flank of the path so the ring corridor stays flyable
      const flankSide = Math.random() < 0.5 ? -1 : 1;
      let obsX = pathX + flankSide * (0.42 + Math.random() * 0.22);
      if (obsX > 0.88 || obsX < -0.88) {
        obsX = pathX - flankSide * (0.44 + Math.random() * 0.16);
      }
      obsX = Math.max(-0.88, Math.min(0.88, obsX));

      const roll = Math.random();
      const obsType = roll < 0.45 ? 'storm' : (roll < 0.78 ? 'balloon' : 'pillar');

      this.entities.push({
        z: z + 95,
        xNorm: obsX,
        yLift: obsType === 'pillar' ? 0 : (0.15 + Math.random() * 0.25),
        type: obsType,
        hit: false,
        rot: Math.random() * Math.PI * 2
      });
    }

    this.spawnCursorZ += Math.max(155, 225 - (level - 1) * 10);
  }

  // Project 3D world coordinate (xNorm in [-1..1], worldZ) onto 2D perspective canvas
  project(xNorm, worldZ, yLift = 0) {
    const relZ = worldZ - this.distance;
    const nearZ = 120; // Plane camera depth
    const fov = 340;
    const scale = fov / Math.max(30, relZ + fov - nearZ);

    // Horizon curve shift gives an exhilarating banking canyon feel
    const lookAheadCurve = this.getPathCenter(this.distance + 450) * 40 * (1 - scale);
    const screenX = this.w / 2 + lookAheadCurve + xNorm * (this.w * 0.46) * scale;
    const groundY = this.horizonY + (this.planeBaseY + 55 - this.horizonY) * scale;
    const screenY = groundY - yLift * 145 * scale;

    return { screenX, screenY, groundY, scale, relZ };
  }

  // Compute wing-tilt bank angle from a player's two hands (plus body lean / fallback)
  computeWingControl(player, fallbackSteer = 0) {
    const lh = player.leftHandScreen;
    const rh = player.rightHandScreen;

    if (lh && rh) {
      // Ensure left-vs-right hand ordering on screen so crossed or wide wings still compute intuitive tilt
      const leftPt = lh.x <= rh.x ? lh : rh;
      const rightPt = lh.x <= rh.x ? rh : lh;

      const dx = Math.max(0.12, rightPt.x - leftPt.x);
      const dy = rightPt.y - leftPt.y; // Positive when right hand is lower -> tilt/turn RIGHT!

      // Wing bank angle from hand height difference + subtle body lean assist
      let rawAngle = Math.atan2(dy, dx * 0.85);
      const leanAssist = ((player.mirroredX ?? 0.5) - 0.5) * 0.55;
      rawAngle = rawAngle * 0.85 + leanAssist * 0.35 + fallbackSteer;

      const clampedAngle = Math.max(-0.78, Math.min(0.78, rawAngle));

      // Average hand height controls subtle climb/dive [0..0.6]
      const avgHandY = (leftPt.y + rightPt.y) * 0.5;
      const targetLift = Math.max(0, Math.min(0.65, (0.72 - avgHandY) * 1.1));

      return { bankAngle: clampedAngle, targetLift };
    }

    return { bankAngle: fallbackSteer, targetLift: 0.15 };
  }

  update(players, fallbackTilt, level, speedMultiplier, callbacks) {
    const { onRing, onTurbo, onCrash } = callbacks;

    if (this.turboTimer > 0) this.turboTimer--;
    if (this.bannerTimer > 0) this.bannerTimer--;

    const turboMult = this.turboTimer > 0 ? 1.55 : 1.0;
    const forwardSpeed = (9.5 + (level - 1) * 1.35) * speedMultiplier * turboMult;
    this.distance += forwardSpeed;

    // Keep sky horizon populated ahead
    while (this.spawnCursorZ < this.distance + 2400) {
      this.spawnNextSegment(level);
    }

    // Update active airplanes (1P or 2P Wingman Co-op)
    const activeCount = Math.min(2, Math.max(1, players.length));
    for (let i = 0; i < activeCount; i++) {
      const plane = this.planes[i];
      const pData = players[i];
      const extraTilt = i === 0 ? fallbackTilt : 0;

      const { bankAngle, targetLift } = this.computeWingControl(pData, extraTilt);

      // Smoothly bank wings & turn horizontally based on bank angle!
      plane.bankAngle += (bankAngle - plane.bankAngle) * 0.22;
      plane.yLift += (targetLift - plane.yLift) * 0.18;

      // Banking turns the airplane smoothly left or right across the sky!
      const turnSpeed = 0.036 * (speedMultiplier * 0.5 + 0.5);
      plane.vx = Math.sin(plane.bankAngle) * turnSpeed;
      plane.x = Math.max(-0.88, Math.min(0.88, plane.x + plane.vx));

      plane.propAngle += this.turboTimer > 0 ? 0.85 : 0.52;
      if (plane.invulnTimer > 0) plane.invulnTimer--;

      // Record wingtip smoke trail points
      const px = this.w / 2 + plane.x * (this.w * 0.42);
      const py = this.planeBaseY - plane.yLift * 115;
      plane.screenX = px;
      plane.screenY = py;

      plane.ribbon.push({ x: px, y: py, bank: plane.bankAngle });
      if (plane.ribbon.length > 14) plane.ribbon.shift();
    }
    this.activePlaneCount = activeCount;

    // Check collisions with Rings, Turbo Gates, and Obstacles near the plane's Z depth (relZ ~ 120)
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      ent.rot += 0.04;
      const relZ = ent.z - this.distance;

      // Remove passed entities behind the camera
      if (relZ < -60) {
        // Reset ring streak if a golden ring was missed
        if ((ent.type === 'ring' || ent.type === 'turbo') && !ent.hit) {
          this.combo = 0;
        }
        this.entities.splice(i, 1);
        continue;
      }

      // Collision window right around airplane depth (relZ in [55 .. 175])
      if (!ent.hit && relZ <= 170 && relZ >= 55) {
        const proj = this.project(ent.xNorm, ent.z, ent.yLift);

        for (let pIdx = 0; pIdx < activeCount; pIdx++) {
          const plane = this.planes[pIdx];
          const dx = Math.abs(plane.screenX - proj.screenX);
          const dy = Math.abs(plane.screenY - proj.screenY);

          if (ent.type === 'ring' || ent.type === 'turbo') {
            // Generous magnetic catch radius for rings so banking through feels super rewarding!
            if (dx < 95 && dy < 95) {
              ent.hit = true;
              this.combo++;

              if (ent.type === 'turbo') {
                this.turboTimer = 150; // 2.5 seconds of Rainbow Turbo Boost!
                this.bannerTimer = 65;
                this.bannerText = '🌈 RAINBOW TURBO BOOST! ⚡';
                this.bannerColor = '#f472b6';
                if (onTurbo) onTurbo(proj.screenX, proj.screenY, this.combo);
              } else {
                if (this.combo > 1 && this.combo % 5 === 0) {
                  this.bannerTimer = 55;
                  this.bannerText = `🔥 ${this.combo}x RING STREAK!`;
                  this.bannerColor = '#fde047';
                }
                if (onRing) onRing(proj.screenX, proj.screenY, this.combo);
              }
              break;
            }
          } else {
            // Obstacle check (Storm Cloud, Balloon, or Canyon Pillar)
            // During Rainbow Turbo Boost, planes smash right through storm clouds safely!
            const hitWidth = ent.type === 'pillar' ? 54 : 62;
            const hitHeight = ent.type === 'pillar' ? 180 : 62;

            if (dx < hitWidth && (ent.type === 'pillar' || dy < hitHeight)) {
              ent.hit = true;
              if (this.turboTimer > 0) {
                if (onRing) onRing(proj.screenX, proj.screenY, this.combo + 1);
              } else if (plane.invulnTimer <= 0) {
                plane.invulnTimer = 75; // ~1.25s post-hit shield blink
                this.combo = 0;
                this.bannerTimer = 55;
                this.bannerText = ent.type === 'storm' ? '⚡ ZAP! DODGE STORM CLOUDS!' : '💥 WATCH OUT FOR OBSTACLES!';
                this.bannerColor = '#f43f5e';
                if (onCrash) onCrash(proj.screenX, proj.screenY);
              }
              break;
            }
          }
        }
      }
    }
  }

  draw(ctx, frameCount) {
    const w = this.w;
    const h = this.h;
    const isTurbo = this.turboTimer > 0;

    ctx.save();

    // 1. Vibrant Sky & Sunset Horizon Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    if (isTurbo) {
      skyGrad.addColorStop(0, '#311042');
      skyGrad.addColorStop(0.5, '#db2777');
      skyGrad.addColorStop(1, '#fde047');
    } else {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.55, '#38bdf8');
      skyGrad.addColorStop(1, '#fef08a');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this.horizonY + 2);

    // Glowing Sun on the Horizon
    const sunX = w * 0.5 - this.getPathCenter(this.distance + 400) * 55;
    const sunGrad = ctx.createRadialGradient(sunX, this.horizonY, 10, sunX, this.horizonY, 110);
    sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    sunGrad.addColorStop(0.4, 'rgba(253, 224, 71, 0.7)');
    sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, this.horizonY, 110, 0, Math.PI * 2);
    ctx.fill();

    // Distant Mountain Peaks Silhouette along Horizon
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.moveTo(0, this.horizonY + 2);
    for (let i = 0; i <= 12; i++) {
      const mx = (w / 12) * i;
      const mh = (i % 2 === 0 ? 34 : 14) + Math.sin(i * 1.7) * 12;
      ctx.lineTo(mx, this.horizonY - mh);
    }
    ctx.lineTo(w, this.horizonY + 2);
    ctx.closePath();
    ctx.fill();

    // 2. Lush Rolling Green Valley & Perspective River/Runway Path Below
    const groundGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
    groundGrad.addColorStop(0, '#14b8a6');
    groundGrad.addColorStop(0.35, '#22c55e');
    groundGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

    // Scrolling perspective ground stripes for strong 3D forward motion sensation
    const stripeSpacing = 120;
    const firstStripeZ = Math.floor(this.distance / stripeSpacing) * stripeSpacing + stripeSpacing;
    ctx.lineWidth = 2;
    for (let z = firstStripeZ + 1800; z >= this.distance + 40; z -= stripeSpacing) {
      const pCenter = this.project(this.getPathCenter(z), z, 0);
      const pLeft = this.project(this.getPathCenter(z) - 0.36, z, 0);
      const pRight = this.project(this.getPathCenter(z) + 0.36, z, 0);

      // Horizontal meadow contour line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, pCenter.groundY);
      ctx.lineTo(w, pCenter.groundY);
      ctx.stroke();

      // Golden Sky-Path Guide Chevrons / Runway Markers along the winding route!
      ctx.strokeStyle = isTurbo ? 'rgba(244, 114, 182, 0.65)' : 'rgba(254, 240, 138, 0.5)';
      ctx.lineWidth = Math.max(1.5, 5 * pCenter.scale);
      ctx.beginPath();
      ctx.moveTo(pLeft.screenX, pLeft.groundY);
      ctx.lineTo(pRight.screenX, pRight.groundY);
      ctx.stroke();
    }

    // Winding River / Sky Highway Ribbon painted smoothly from far to near
    ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
    ctx.beginPath();
    const zSteps = 22;
    const maxDrawZ = 2100;
    for (let s = 0; s <= zSteps; s++) {
      const z = this.distance + 40 + (s / zSteps) * maxDrawZ;
      const cx = this.getPathCenter(z);
      const pt = this.project(cx - 0.24, z, 0);
      if (s === 0) ctx.moveTo(pt.screenX, pt.groundY);
      else ctx.lineTo(pt.screenX, pt.groundY);
    }
    for (let s = zSteps; s >= 0; s--) {
      const z = this.distance + 40 + (s / zSteps) * maxDrawZ;
      const cx = this.getPathCenter(z);
      const pt = this.project(cx + 0.24, z, 0);
      ctx.lineTo(pt.screenX, pt.groundY);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Draw 3D Entities Back-to-Front (Painter's Algorithm by descending Z)
    const sortedEntities = [...this.entities]
      .filter(e => !e.hit && (e.z - this.distance) < 2250 && (e.z - this.distance) > 10)
      .sort((a, b) => b.z - a.z);

    for (const ent of sortedEntities) {
      const proj = this.project(ent.xNorm, ent.z, ent.yLift);
      const s = proj.scale;
      const alpha = Math.min(1, Math.max(0.15, 1.35 - (ent.z - this.distance) / 2100));

      ctx.save();
      ctx.globalAlpha = alpha;

      if (ent.type === 'ring' || ent.type === 'turbo') {
        this.drawSkyRing(ctx, proj.screenX, proj.screenY, s, ent.type === 'turbo', ent.rot);
      } else if (ent.type === 'storm') {
        this.drawStormCloud(ctx, proj.screenX, proj.screenY, s, frameCount);
      } else if (ent.type === 'balloon') {
        this.drawObstacleBalloon(ctx, proj.screenX, proj.screenY, s);
      } else if (ent.type === 'pillar') {
        this.drawCanyonPillar(ctx, proj.screenX, proj.groundY, s);
      }

      ctx.restore();
    }

    // 4. Turbo Speed Lines Effect
    if (isTurbo) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2 + frameCount * 0.07;
        const r1 = 180 + (frameCount * 15 + i * 40) % 220;
        const r2 = r1 + 95;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(angle) * r1, h * 0.45 + Math.sin(angle) * r1);
        ctx.lineTo(w / 2 + Math.cos(angle) * r2, h * 0.45 + Math.sin(angle) * r2);
        ctx.stroke();
      }
    }

    // 5. Render Active Player Airplanes & Wingtip Smoke Trails!
    const count = this.activePlaneCount || 1;
    for (let i = count - 1; i >= 0; i--) {
      this.drawAirplane(ctx, this.planes[i], frameCount, isTurbo);
    }

    // 6. Wing-Angle HUD Attitude Indicator (Bottom-Left Mini Wing Gauge so kids see their tilt!)
    this.drawWingAttitudeGauge(ctx, this.planes[0]);

    // 7. Combo Badge & Event Banner
    if (this.combo >= 2) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(w - 195, 102, 170, 44, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = '700 20px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⭐ ${this.combo}x STREAK!`, w - 110, 124);
      ctx.restore();
    }

    if (this.bannerTimer > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(frameCount * 0.25) * 0.05;
      ctx.translate(w / 2, 132);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-230, -26, 460, 52, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  drawSkyRing(ctx, x, y, scale, isTurbo, rot) {
    const r = 74 * scale;
    if (r < 4) return;

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 22 * scale;
    ctx.shadowColor = isTurbo ? '#ec4899' : '#fde047';
    ctx.strokeStyle = isTurbo ? '#f472b6' : '#facc15';
    ctx.lineWidth = Math.max(3, 12 * scale);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner shimmering core ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isTurbo ? '#38bdf8' : '#fef9c3';
    ctx.lineWidth = Math.max(1.5, 4 * scale);
    ctx.setLineDash([10 * scale, 8 * scale]);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isTurbo && r > 18) {
      ctx.rotate(-rot);
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.max(12, Math.round(28 * scale))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 0, 0);
    }

    ctx.restore();
  }

  drawStormCloud(ctx, x, y, scale, frameCount) {
    const r = 52 * scale;
    if (r < 4) return;

    ctx.save();
    ctx.translate(x, y);

    // Dark thunderhead puffs
    ctx.shadowBlur = 16 * scale;
    ctx.shadowColor = '#0f172a';
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.arc(-r * 0.75, r * 0.15, r * 0.72, 0, Math.PI * 2);
    ctx.arc(r * 0.75, r * 0.15, r * 0.72, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.45, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    // Highlight puff
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.35, r * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Flickering yellow lightning bolt beneath storm cloud!
    if (Math.sin(frameCount * 0.4 + x) > -0.2) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-4 * scale, r * 0.5);
      ctx.lineTo(10 * scale, r * 0.5);
      ctx.lineTo(0, r * 0.95);
      ctx.lineTo(12 * scale, r * 0.95);
      ctx.lineTo(-8 * scale, r * 1.55);
      ctx.lineTo(-2 * scale, r * 1.05);
      ctx.lineTo(-12 * scale, r * 1.05);
      ctx.closePath();
      ctx.fill();
    }

    // Angry storm eyes for cartoon charm
    if (r > 14) {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-r * 0.28, 0, Math.max(2, 5 * scale), 0, Math.PI * 2);
      ctx.arc(r * 0.28, 0, Math.max(2, 5 * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawObstacleBalloon(ctx, x, y, scale) {
    const r = 50 * scale;
    if (r < 4) return;

    ctx.save();
    ctx.translate(x, y);

    // Wicker basket below
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-12 * scale, r * 1.05, 24 * scale, 18 * scale);

    // Ropes
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(-10 * scale, r * 1.05);
    ctx.lineTo(-16 * scale, r * 0.65);
    ctx.moveTo(10 * scale, r * 1.05);
    ctx.lineTo(16 * scale, r * 0.65);
    ctx.stroke();

    // Striped Hot Air Balloon Envelope
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.48, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawCanyonPillar(ctx, x, groundY, scale) {
    const w = 72 * scale;
    const h = 230 * scale;
    if (w < 4) return;

    ctx.save();
    const grad = ctx.createLinearGradient(x - w / 2, groundY - h, x + w / 2, groundY);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(0.5, '#b45309');
    grad.addColorStop(1, '#78350f');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.62, groundY);
    ctx.lineTo(x - w * 0.42, groundY - h);
    ctx.lineTo(x + w * 0.42, groundY - h);
    ctx.lineTo(x + w * 0.62, groundY);
    ctx.closePath();
    ctx.fill();

    // Grassy mesa cap on top
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(x, groundY - h, w * 0.46, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawAirplane(ctx, plane, frameCount, isTurbo) {
    // Blink when invulnerable after grazing an obstacle
    if (plane.invulnTimer > 0 && Math.floor(frameCount / 4) % 2 === 1) {
      return;
    }

    const px = plane.screenX || this.w / 2;
    const py = plane.screenY || this.planeBaseY;
    const wingspan = 92;

    // 1. Draw Dual Wingtip Smoke Ribbons trailing behind the plane!
    if (plane.ribbon.length > 2) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i < plane.ribbon.length; i++) {
          const pt = plane.ribbon[i];
          const age = 1 - i / plane.ribbon.length;
          const tipX = pt.x + Math.cos(pt.bank) * (wingspan * side);
          const tipY = pt.y + Math.sin(pt.bank) * (wingspan * side) + age * 28;
          if (i === 0) ctx.moveTo(tipX, tipY);
          else ctx.lineTo(tipX, tipY);
        }
        ctx.strokeStyle = isTurbo ? 'rgba(244, 114, 182, 0.7)' : 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = isTurbo ? 7 : 4.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // 2. Soft Ground Shadow below plane
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath();
    ctx.ellipse(px, this.planeBaseY + 48, 56, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Draw Cute Cartoon Biplane (Rear-Chase View) rotated by Player's Wing Tilt!
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(plane.bankAngle);

    if (isTurbo) {
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#f472b6';
    }

    // Lower Wing
    ctx.fillStyle = plane.bodyColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-wingspan + 8, 6, (wingspan - 8) * 2, 16, 8);
    ctx.fill();
    ctx.stroke();

    // Biplane Wing Struts
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-52, -18); ctx.lineTo(-52, 8);
    ctx.moveTo(52, -18);  ctx.lineTo(52, 8);
    ctx.stroke();

    // Upper Main Wing with golden wingtip stripes
    ctx.fillStyle = plane.bodyColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-wingspan, -24, wingspan * 2, 18, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = plane.trimColor;
    ctx.fillRect(-wingspan + 10, -21, 20, 12);
    ctx.fillRect(wingspan - 30, -21, 20, 12);

    // Spinning Nose Propeller Disc (visible behind fuselage)
    ctx.save();
    ctx.rotate(plane.propAngle);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(0, 0, 7, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fuselage Body
    ctx.fillStyle = plane.bodyColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jet / Exhaust Glow in center
    const jetPulse = (isTurbo ? 14 : 8) + Math.sin(frameCount * 0.5) * 3;
    ctx.fillStyle = isTurbo ? '#38bdf8' : '#fde047';
    ctx.beginPath();
    ctx.arc(0, 4, jetPulse, 0, Math.PI * 2);
    ctx.fill();

    // Cute Pilot Goggles Helmet peeking above fuselage!
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-10, -22, 9, 6);
    ctx.fillRect(1, -22, 9, 6);

    // Vertical Tail Fin & Horizontal Stabilizer
    ctx.fillStyle = plane.trimColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-28, -4, 56, 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = plane.bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(-7, -2);
    ctx.lineTo(7, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawWingAttitudeGauge(ctx, plane) {
    const gx = 78;
    const gy = this.h - 68;
    const r = 42;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horizon reference line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - r + 8, gy);
    ctx.lineTo(gx + r - 8, gy);
    ctx.stroke();

    // Tilting Wing Indicator matching player's live hands!
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(plane.bankAngle);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(28, 0);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WING TILT', gx, gy + r + 14);
    ctx.restore();
  }
}
