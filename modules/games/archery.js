/**
 * archery.js
 * Dragon Balloon Archery! — 2-Hand Bow Draw & Castle Sky Defense!
 * - Point your Bow Hand to aim the glowing Crosshair anywhere across the sky!
 * - Pull your two hands APART to draw the bowstring & loose blazing arrows!
 *   (Includes gentle auto-loose at full draw + instant mouse/keyboard click-to-shoot fallback!)
 * - Pop balloons carrying cheeky Baby Dragons (they float down on cute parachutes!),
 *   nail Bullseye Shields, unlock 🔱 Triple-Arrow Multishot & 🎆 Firework Arrows,
 *   and shoot incoming Soot Fireballs before they singe Stoneberry Castle!
 */

export class DragonArcheryGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.targets = [];          // Balloon Dragons, Bullseyes, Power-Up Orbs & Parachuting Dragons
    this.fireballs = [];        // Slow incoming dragon soot-fireballs to shoot out of the sky
    this.arrows = [];           // Active flying arrows
    this.popups = [];           // Floating "+20", "🎯 BULLSEYE!", "🎆 BOOM!" popups
    this.fireworkRings = [];

    // Stats for Trophy Showcase
    this.bullseyes = 0;
    this.dragonsPopped = 0;

    // Shared Team Power-Ups
    this.multishotTimer = 0;    // 🔱 3-Arrow Spread timer
    this.fireworkAmmo = 0;      // 🎆 Explosive Firework Arrows remaining

    this.archers = [
      this.createArcherState(0, '#facc15', '#38bdf8', 'P1 BOW'),
      this.createArcherState(1, '#4ade80', '#f472b6', 'P2 BOW')
    ];

    this.spawnTimer = 25;
    this.fireballTimer = 210;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#fde047';

    this.mouseDown = false;
    this.manualFireQueued = false;

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  createArcherState(index, bowColor, reticleColor, label) {
    return {
      index,
      aimX: this.w * (index === 0 ? 0.45 : 0.65),
      aimY: this.h * 0.42,
      bowBaseX: this.w * (index === 0 ? 0.38 : 0.62),
      bowBaseY: this.h - 88,
      drawRatio: 0,             // [0.0 .. 1.0] bowstring pull tension
      prevDrawRatio: 0,
      holdFullTimer: 0,
      cooldown: 0,
      bowColor,
      reticleColor,
      label
    };
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.rampartY = canvasHeight - 66;
  }

  reset() {
    this.targets = [];
    this.fireballs = [];
    this.arrows = [];
    this.popups = [];
    this.fireworkRings = [];
    this.bullseyes = 0;
    this.dragonsPopped = 0;
    this.multishotTimer = 0;
    this.fireworkAmmo = 0;
    this.spawnTimer = 20;
    this.fireballTimer = 200;

    this.archers[0] = this.createArcherState(0, '#facc15', '#38bdf8', 'P1');
    this.archers[1] = this.createArcherState(1, '#4ade80', '#f472b6', 'P2');

    this.showBanner('🏹 POINT TO AIM • SPREAD BOTH HANDS TO SHOOT!', '#fde047', 90);
  }

  setMouseDown(isDown) {
    if (this.mouseDown && !isDown) {
      // Releasing mouse button looses arrow!
      this.manualFireQueued = true;
    }
    this.mouseDown = isDown;
  }

  triggerQuickShot() {
    this.manualFireQueued = true;
  }

  showBanner(text, color = '#fde047', duration = 68) {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerTimer = duration;
  }

  addPopup(x, y, text, color = '#fde047') {
    this.popups.push({ x, y, text, color, alpha: 1.0, vy: -2.0, scale: 0.7 });
  }

  spawnSkyTarget(level = 1, speedMultiplier = 1.4) {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -65 : this.w + 65;
    const y = 118 + Math.random() * (this.h * 0.44);
    const baseSpd = (2.4 + Math.random() * 1.4 + (level - 1) * 0.35) * (speedMultiplier * 0.7 + 0.3);
    const vx = fromLeft ? baseSpd : -baseSpd;

    const roll = Math.random();
    if (roll < 0.16) {
      // Power-Up Balloon Orb (🔱 Multishot or 🎆 Firework Arrows!)
      const pKind = Math.random() < 0.55 ? 'multishot' : 'firework';
      this.targets.push({
        kind: 'powerup',
        powerKind: pKind,
        x: startX,
        y,
        vx: vx * 1.1,
        vy: 0,
        radius: 36,
        bobPhase: Math.random() * Math.PI * 2
      });
    } else if (roll < 0.38) {
      // Classic Archery Bullseye Shield Target!
      this.targets.push({
        kind: 'bullseye',
        x: startX,
        y,
        vx: vx * 1.15,
        vy: 0,
        radius: 40,
        bobPhase: Math.random() * Math.PI * 2
      });
    } else {
      // Cheeky Baby Dragon Carried by 1–2 Colorful Balloons!
      const balloonColors = ['#ef4444', '#38bdf8', '#facc15', '#ec4899', '#a855f7', '#4ade80'];
      const numBalloons = level >= 2 && Math.random() < 0.45 ? 2 : 1;
      const balloons = [];
      for (let b = 0; b < numBalloons; b++) {
        balloons.push({
          ox: numBalloons === 1 ? 0 : (b === 0 ? -18 : 18),
          oy: -52,
          color: balloonColors[Math.floor(Math.random() * balloonColors.length)],
          radius: 28
        });
      }

      const dragonBodyColors = ['#22c55e', '#a855f7', '#f97316'];
      this.targets.push({
        kind: 'dragon',
        state: 'flying', // 'flying' | 'parachuting'
        x: startX,
        y: y + 36,
        vx,
        vy: 0,
        radius: 32,
        dragonColor: dragonBodyColors[Math.floor(Math.random() * dragonBodyColors.length)],
        balloons,
        bobPhase: Math.random() * Math.PI * 2
      });
    }
  }

  spawnFireballHazard(level = 1, speedMultiplier = 1.2) {
    const startX = this.w * (0.2 + Math.random() * 0.6);
    const targetX = this.w * (0.25 + Math.random() * 0.5);
    const startY = 95;
    const frames = Math.max(135, Math.round((230 - level * 14) / (speedMultiplier * 0.6 + 0.4)));

    this.fireballs.push({
      x: startX,
      y: startY,
      vx: (targetX - startX) / frames,
      vy: (this.rampartY - startY) / frames,
      radius: 32,
      pulse: 0
    });
  }

  fireArrowFrom(archer, isCharged, callbacks) {
    const { onShoot } = callbacks;
    archer.cooldown = 12;
    archer.holdFullTimer = 0;

    const dx = archer.aimX - archer.bowBaseX;
    const dy = archer.aimY - archer.bowBaseY;
    const baseAngle = Math.atan2(dy, dx);
    const speed = isCharged ? 35 : 28;

    const isFirework = this.fireworkAmmo > 0;
    if (isFirework) this.fireworkAmmo--;

    const angles = this.multishotTimer > 0
      ? [baseAngle - 0.13, baseAngle, baseAngle + 0.13]
      : [baseAngle];

    for (const ang of angles) {
      this.arrows.push({
        x: archer.bowBaseX,
        y: archer.bowBaseY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        gravity: 0.08, // Very flat, accurate sightline flight so arrows hit right where you aim!
        isCharged,
        isFirework,
        color: isFirework ? '#f472b6' : archer.bowColor,
        trail: []
      });
    }

    if (onShoot) onShoot(isCharged);
  }

  updateArcherControl(archer, player, isPrimary, callbacks) {
    if (archer.cooldown > 0) archer.cooldown--;

    if (player.isMouseFallback) {
      // Mouse / Keyboard Fallback: Cursor aims crosshair, Hold/Click/Space shoots!
      const mx = ((player.leftHandScreen.x + player.rightHandScreen.x) * 0.5) * this.w;
      const my = Math.min(this.rampartY - 40, player.leftHandScreen.y * this.h);
      archer.aimX += (mx - archer.aimX) * 0.88;
      archer.aimY += (my - archer.aimY) * 0.88;
      archer.bowBaseX += ((this.w * 0.5 + (mx - this.w * 0.5) * 0.45) - archer.bowBaseX) * 0.55;

      if (this.mouseDown) {
        archer.drawRatio = Math.min(1.0, archer.drawRatio + 0.06);
      } else if (this.manualFireQueued && archer.cooldown <= 0) {
        const charged = archer.drawRatio > 0.65;
        this.fireArrowFrom(archer, charged, callbacks);
        archer.drawRatio = 0;
        this.manualFireQueued = false;
      } else {
        archer.drawRatio *= 0.85;
      }
      return;
    }

    // Webcam 2-Hand Archery Control!
    const lx = (player.leftHandScreen ? player.leftHandScreen.x : 0.35) * this.w;
    const ly = (player.leftHandScreen ? player.leftHandScreen.y : 0.65) * this.h;
    const rx = (player.rightHandScreen ? player.rightHandScreen.x : 0.65) * this.w;
    const ry = (player.rightHandScreen ? player.rightHandScreen.y : 0.65) * this.h;

    // Whichever hand is raised higher acts as the Front Aiming Bow-Hand (super natural for both lefties & righties!)
    const leftIsAim = ly <= ry;
    const rawAimX = leftIsAim ? lx : rx;
    const rawAimY = leftIsAim ? ly : ry;

    // Expand comfortable arm reach across full sky target area
    const mappedAimX = Math.max(45, Math.min(this.w - 45, (rawAimX - this.w * 0.5) * 1.22 + this.w * 0.5));
    const mappedAimY = Math.max(88, Math.min(this.rampartY - 45, (rawAimY - this.h * 0.48) * 1.25 + this.h * 0.42));

    archer.aimX += (mappedAimX - archer.aimX) * 0.85;
    archer.aimY += (mappedAimY - archer.aimY) * 0.85;
    archer.bowBaseX += (((player.mirroredX ?? 0.5) * this.w) - archer.bowBaseX) * 0.55;

    // Measure 2-Hand Spread Distance to calculate Bowstring Draw Tension!
    const handSpan = Math.hypot(rx - lx, ry - ly);
    const minNockSpan = Math.min(135, this.w * 0.12);
    const fullDrawSpan = Math.max(220, this.w * 0.24);

    archer.prevDrawRatio = archer.drawRatio;
    const targetDraw = Math.max(0, Math.min(1, (handSpan - minNockSpan) / (fullDrawSpan - minNockSpan)));
    archer.drawRatio += (targetDraw - archer.drawRatio) * 0.78;

    if (archer.cooldown <= 0) {
      // Loose Condition A: Pulled back (> 0.55) and then released/flicked hands slightly inward!
      const releasedString = archer.prevDrawRatio > 0.55 && (archer.prevDrawRatio - archer.drawRatio) > 0.08;

      // Loose Condition B: Held at crisp Draw (> 0.72) for ~0.26 seconds -> Auto-Loose so kids never get stuck!
      if (archer.drawRatio > 0.72) {
        archer.holdFullTimer++;
      } else {
        archer.holdFullTimer = Math.max(0, archer.holdFullTimer - 1);
      }

      if (releasedString || archer.holdFullTimer >= 16 || (isPrimary && this.manualFireQueued)) {
        this.fireArrowFrom(archer, archer.drawRatio > 0.75, callbacks);
        archer.drawRatio = 0.15;
        archer.holdFullTimer = 0;
        if (isPrimary) this.manualFireQueued = false;
      }
    }
  }

  triggerFireworkBlast(cx, cy, callbacks) {
    const { onPop } = callbacks;
    this.fireworkRings.push({ x: cx, y: cy, radius: 18, maxR: 155, alpha: 1.0 });
    this.addPopup(cx, cy - 20, '🎆 FIREWORK BOOM!', '#f472b6');

    const blastR = 155;
    for (let j = this.targets.length - 1; j >= 0; j--) {
      const t = this.targets[j];
      if (t.state === 'parachuting') continue;
      if (Math.hypot(t.x - cx, t.y - cy) <= blastR) {
        if (t.kind === 'dragon') {
          t.balloons = [];
          t.state = 'parachuting';
          t.vx *= 0.25;
          t.vy = 2.2;
          this.dragonsPopped++;
          if (onPop) onPop(t.x, t.y, 25, '#4ade80');
        } else {
          if (onPop) onPop(t.x, t.y, 25, '#fde047');
          this.targets.splice(j, 1);
        }
      }
    }
  }

  update(players, level, speedMultiplier, callbacks) {
    const { onPop, onBullseye, onPowerUp, onCastleHit } = callbacks;

    if (this.bannerTimer > 0) this.bannerTimer--;
    if (this.multishotTimer > 0) this.multishotTimer--;

    // 1. Update Active Archers (1P or 2P Co-op!)
    const activeCount = Math.min(2, Math.max(1, players.length));
    this.activeArcherCount = activeCount;
    for (let i = 0; i < activeCount; i++) {
      this.updateArcherControl(this.archers[i], players[i], i === 0, callbacks);
    }

    // 2. Spawn Sky Targets & Soot Fireballs
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.targets.length < 7 + level) {
      this.spawnSkyTarget(level, speedMultiplier);
      this.spawnTimer = Math.max(32, Math.round((68 - level * 5) / (speedMultiplier * 0.65 + 0.35)));
    }

    this.fireballTimer--;
    if (this.fireballTimer <= 0 && this.fireballs.length < 2) {
      this.spawnFireballHazard(level, speedMultiplier);
      this.fireballTimer = Math.max(130, 240 - level * 18);
    }

    // 3. Move Sky Targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.bobPhase += 0.06;
      t.x += t.vx;

      if (t.kind === 'dragon' && t.state === 'parachuting') {
        t.y += t.vy;
        t.x += Math.sin(t.bobPhase * 1.5) * 1.1;
        if (t.y > this.rampartY + 40) {
          this.targets.splice(i, 1);
        }
      } else {
        t.y += Math.sin(t.bobPhase) * 0.65;
        if (t.x < -110 || t.x > this.w + 110) {
          this.targets.splice(i, 1);
        }
      }
    }

    // 4. Move Soot Fireballs toward Castle Ramparts
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.pulse += 0.2;

      if (fb.y >= this.rampartY - 10) {
        this.fireballs.splice(i, 1);
        this.showBanner('🔥 CASTLE SINGED! SHOOT INCOMING FIREBALLS!', '#ef4444', 60);
        if (onCastleHit) onCastleHit(fb.x, this.rampartY);
      }
    }

    // 5. Update Flying Arrows & Check Target / Fireball Hits!
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const ar = this.arrows[i];
      ar.x += ar.vx;
      ar.y += ar.vy;
      ar.vy += ar.gravity;

      ar.trail.push({ x: ar.x, y: ar.y });
      if (ar.trail.length > 10) ar.trail.shift();

      if (ar.x < -60 || ar.x > this.w + 60 || ar.y < -60 || ar.y > this.h + 60) {
        this.arrows.splice(i, 1);
        continue;
      }

      let arrowConsumed = false;

      // A. Check Soot Fireball Intercepts!
      for (let f = this.fireballs.length - 1; f >= 0; f--) {
        const fb = this.fireballs[f];
        if (Math.hypot(ar.x - fb.x, ar.y - fb.y) <= fb.radius + 22) {
          this.fireballs.splice(f, 1);
          this.addPopup(fb.x, fb.y - 16, '🛡️ SAVED! +20', '#38bdf8');
          if (ar.isFirework) this.triggerFireworkBlast(fb.x, fb.y, callbacks);
          if (onPop) onPop(fb.x, fb.y, 20, '#38bdf8');
          if (!ar.isCharged) {
            arrowConsumed = true;
            break;
          }
        }
      }
      if (arrowConsumed) {
        this.arrows.splice(i, 1);
        continue;
      }

      // B. Check Sky Targets (Balloon Dragons, Bullseyes, Power-Up Orbs)
      for (let j = this.targets.length - 1; j >= 0; j--) {
        const t = this.targets[j];
        if (t.state === 'parachuting') continue;

        if (t.kind === 'dragon') {
          // Check each balloon above the baby dragon (plus generous hitbox around balloon cluster!)
          let poppedAny = false;
          for (let bIdx = t.balloons.length - 1; bIdx >= 0; bIdx--) {
            const bl = t.balloons[bIdx];
            const bx = t.x + bl.ox;
            const by = t.y + bl.oy;
            if (Math.hypot(ar.x - bx, ar.y - by) <= bl.radius + 20) {
              const col = bl.color;
              t.balloons.splice(bIdx, 1);
              poppedAny = true;

              if (t.balloons.length === 0) {
                t.state = 'parachuting';
                t.vx *= 0.25;
                t.vy = 2.2;
                this.dragonsPopped++;
                this.addPopup(bx, by - 14, '🪂 +25!', '#4ade80');
                if (onPop) onPop(bx, by, 25, col);
              } else {
                this.addPopup(bx, by - 14, '+15', col);
                if (onPop) onPop(bx, by, 15, col);
              }
              break;
            }
          }

          if (poppedAny) {
            if (ar.isFirework) this.triggerFireworkBlast(ar.x, ar.y, callbacks);
            if (!ar.isCharged) {
              arrowConsumed = true;
              break;
            }
          }
        } else if (t.kind === 'bullseye') {
          const dist = Math.hypot(ar.x - t.x, ar.y - t.y);
          if (dist <= t.radius + 18) {
            const isDeadCenter = dist <= t.radius * 0.48;
            const pts = isDeadCenter ? 35 : 20;
            if (isDeadCenter) {
              this.bullseyes++;
              this.addPopup(t.x, t.y - 18, '🎯 BULLSEYE! +35', '#facc15');
              if (onBullseye) onBullseye(t.x, t.y, pts);
            } else {
              this.addPopup(t.x, t.y - 18, '+20', '#fb923c');
              if (onPop) onPop(t.x, t.y, pts, '#ef4444');
            }
            if (ar.isFirework) this.triggerFireworkBlast(t.x, t.y, callbacks);
            this.targets.splice(j, 1);
            if (!ar.isCharged) {
              arrowConsumed = true;
              break;
            }
          }
        } else if (t.kind === 'powerup') {
          if (Math.hypot(ar.x - t.x, ar.y - t.y) <= t.radius + 20) {
            if (t.powerKind === 'multishot') {
              this.multishotTimer = 540; // 9 seconds of 3-Arrow Spread!
              this.showBanner('🔱 TRIPLE-ARROW MULTISHOT UNLOCKED!', '#38bdf8', 68);
            } else {
              this.fireworkAmmo += 4;
              this.showBanner('🎆 4x FIREWORK BOMB ARROWS LOADED!', '#f472b6', 68);
            }
            this.addPopup(t.x, t.y - 16, '✨ POWER-UP!', '#fde047');
            if (onPowerUp) onPowerUp(t.x, t.y);
            this.targets.splice(j, 1);
            arrowConsumed = true;
            break;
          }
        }
      }

      if (arrowConsumed) {
        this.arrows.splice(i, 1);
      }
    }

    // 6. Update Firework Blast Rings & Popups
    for (let i = this.fireworkRings.length - 1; i >= 0; i--) {
      const fw = this.fireworkRings[i];
      fw.radius += 9;
      fw.alpha -= 0.055;
      if (fw.alpha <= 0) this.fireworkRings.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy;
      p.scale = Math.min(1.08, p.scale + 0.08);
      p.alpha -= 0.022;
      if (p.alpha <= 0) this.popups.splice(i, 1);
    }
  }

  // =========================================================================
  // RENDERING: STONEBERRY CASTLE SKY, BALLOON DRAGONS, ELVEN BOWS & SIGHTLINES
  // =========================================================================

  draw(ctx, frameCount) {
    const w = this.w;
    const h = this.h;

    ctx.save();

    // 1. Enchanted Kingdom Sky & Distant Castle Towers
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#1e3a8a');
    skyGrad.addColorStop(0.55, '#38bdf8');
    skyGrad.addColorStop(1, '#fef3c7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant Rolling Emerald Hills
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(w * 0.25, this.rampartY + 18, w * 0.38, 95, 0, Math.PI, 0);
    ctx.ellipse(w * 0.78, this.rampartY + 22, w * 0.42, 110, 0, Math.PI, 0);
    ctx.fill();

    // 2. Sky Targets (Balloon Dragons, Bullseye Shields, Power-Ups)
    for (const t of this.targets) {
      if (t.kind === 'dragon') {
        this.drawBalloonDragon(ctx, t, frameCount);
      } else if (t.kind === 'bullseye') {
        this.drawBullseyeShield(ctx, t);
      } else if (t.kind === 'powerup') {
        this.drawPowerOrb(ctx, t, frameCount);
      }
    }

    // 3. Incoming Soot Fireballs
    for (const fb of this.fireballs) {
      ctx.save();
      const r = fb.radius * (1 + Math.sin(fb.pulse) * 0.08);
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎯 SHOOT!', fb.x, fb.y - r - 14);
      ctx.restore();
    }

    // 4. Flying Arrows & Firework Rings
    for (const ar of this.arrows) {
      this.drawFlyingArrow(ctx, ar);
    }
    for (const fw of this.fireworkRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fw.alpha);
      ctx.strokeStyle = '#f472b6';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#fde047';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Foreground Stoneberry Castle Battlements!
    this.drawCastleRamparts(ctx, w, h, frameCount);

    // 6. Player Elven Star-Bows, Dotted Sight-Lines & Illuminated Aim Crosshairs!
    const count = this.activeArcherCount || 1;
    for (let i = count - 1; i >= 0; i--) {
      this.drawArcherBowAndReticle(ctx, this.archers[i], frameCount);
    }

    // 7. Floating Hit Popups & Power-Up Badges
    for (const p of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.font = '700 24px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    this.drawPowerUpStatus(ctx);

    if (this.bannerTimer > 0) {
      ctx.save();
      ctx.translate(w / 2, 122);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-265, -24, 530, 48, 999);
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

  drawBalloonDragon(ctx, t, frameCount) {
    ctx.save();

    if (t.state === 'parachuting') {
      // Cute Polka-Dot Parachute Canopy!
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x - 28, t.y - 42); ctx.lineTo(t.x - 8, t.y - 10);
      ctx.moveTo(t.x + 28, t.y - 42); ctx.lineTo(t.x + 8, t.y - 10);
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 42, 30, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Strings & Colorful Balloons Holding Up the Baby Dragon!
      for (const bl of t.balloons) {
        const bx = t.x + bl.ox;
        const by = t.y + bl.oy;

        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - 16);
        ctx.lineTo(bx, by + bl.radius);
        ctx.stroke();

        ctx.fillStyle = bl.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bx, by, bl.radius * 0.9, bl.radius * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(bx - 8, by - 9, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cute Chubby Cartoon Baby Dragon!
    const wingFlap = Math.sin(frameCount * 0.3 + t.bobPhase) * 8;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(t.x - 24, t.y - 4 + wingFlap * 0.4, 14, 8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(t.x + 24, t.y - 4 + wingFlap * 0.4, 14, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = t.dragonColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cream Belly & Goofy Dragon Eyes
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(t.x, t.y + 5, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(t.x - 7, t.y - 7, 5.5, 0, Math.PI * 2);
    ctx.arc(t.x + 7, t.y - 7, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(t.x - 7, t.y - 7, 2.5, 0, Math.PI * 2);
    ctx.arc(t.x + 7, t.y - 7, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBullseyeShield(ctx, t) {
    const rings = [
      { r: t.radius, col: '#ffffff' },
      { r: t.radius * 0.76, col: '#38bdf8' },
      { r: t.radius * 0.52, col: '#ef4444' },
      { r: t.radius * 0.26, col: '#facc15' }
    ];
    ctx.save();
    for (const rg of rings) {
      ctx.fillStyle = rg.col;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rg.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawPowerOrb(ctx, t, frameCount) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = t.powerKind === 'multishot' ? '#38bdf8' : '#f472b6';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = t.powerKind === 'multishot' ? '#38bdf8' : '#f472b6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '28px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.powerKind === 'multishot' ? '🔱' : '🎆', t.x, t.y + 1);
    ctx.restore();
  }

  drawFlyingArrow(ctx, ar) {
    const angle = Math.atan2(ar.vy, ar.vx);

    // Trail
    if (ar.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = ar.isFirework ? '#f472b6' : (ar.isCharged ? '#fde047' : 'rgba(255,255,255,0.65)');
      ctx.lineWidth = ar.isCharged ? 5 : 3;
      ctx.beginPath();
      ar.trail.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ar.x, ar.y);
    ctx.rotate(angle);
    // Shaft
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    // Steel/Golden Arrowhead
    ctx.fillStyle = ar.isCharged ? '#facc15' : '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();

    // Feather Fletching
    ctx.fillStyle = ar.color;
    ctx.beginPath();
    ctx.moveTo(-26, 0); ctx.lineTo(-34, -7); ctx.lineTo(-20, -2);
    ctx.moveTo(-26, 0); ctx.lineTo(-34, 7);  ctx.lineTo(-20, 2);
    ctx.fill();
    ctx.restore();
  }

  drawCastleRamparts(ctx, w, h, frameCount) {
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, this.rampartY, w, h - this.rampartY);

    // Stone Merlons (crenellations) along top of castle wall
    const merlonW = 48;
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let x = 12; x < w; x += merlonW * 1.65) {
      ctx.fillRect(x, this.rampartY - 18, merlonW, 20);
      ctx.strokeRect(x, this.rampartY - 18, merlonW, 20);
    }
    ctx.restore();
  }

  drawArcherBowAndReticle(ctx, archer, frameCount) {
    const { bowBaseX, bowBaseY, aimX, aimY, drawRatio, bowColor, reticleColor } = archer;
    const angle = Math.atan2(aimY - bowBaseY, aimX - bowBaseX);

    ctx.save();

    // 1. Laser-Dotted Sight-Line from Bow straight to Crosshair!
    ctx.strokeStyle = drawRatio > 0.65 ? 'rgba(250, 204, 21, 0.72)' : 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = drawRatio > 0.65 ? 3.5 : 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(bowBaseX, bowBaseY);
    ctx.lineTo(aimX, aimY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Illuminated Aiming Crosshair at (aimX, aimY)!
    const retR = 32 - drawRatio * 8;
    ctx.save();
    ctx.translate(aimX, aimY);
    ctx.shadowBlur = 16;
    ctx.shadowColor = reticleColor;
    ctx.strokeStyle = drawRatio > 0.65 ? '#fde047' : reticleColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, retR, 0, Math.PI * 2);
    ctx.moveTo(-retR - 10, 0); ctx.lineTo(-retR + 8, 0);
    ctx.moveTo(retR - 8, 0);  ctx.lineTo(retR + 10, 0);
    ctx.moveTo(0, -retR - 10); ctx.lineTo(0, -retR + 8);
    ctx.moveTo(0, retR - 8);   ctx.lineTo(0, retR + 10);
    ctx.stroke();

    // Circular Draw-Progress Arc around Crosshair!
    if (drawRatio > 0.05) {
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, retR + 8, -Math.PI / 2, -Math.PI / 2 + drawRatio * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Curved Golden Elven Bow & Drawn String at Rampart Base!
    ctx.save();
    ctx.translate(bowBaseX, bowBaseY);
    ctx.rotate(angle);

    const pullPx = drawRatio * 38;

    // Bowstring pulled back by drawRatio!
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, -54);
    ctx.lineTo(10 - pullPx, 0);
    ctx.lineTo(10, 54);
    ctx.stroke();

    // Curved Elven Bow Limbs
    ctx.shadowBlur = 14;
    ctx.shadowColor = bowColor;
    ctx.strokeStyle = bowColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-14, 0, 58, -0.95, 0.95);
    ctx.stroke();

    // Nocked Arrow on the Bowstring!
    if (archer.cooldown <= 4) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10 - pullPx, 0);
      ctx.lineTo(56 - pullPx * 0.5, 0);
      ctx.stroke();

      ctx.fillStyle = drawRatio > 0.7 ? '#facc15' : '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(64 - pullPx * 0.5, 0);
      ctx.lineTo(50 - pullPx * 0.5, -6);
      ctx.lineTo(50 - pullPx * 0.5, 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  drawPowerUpStatus(ctx) {
    let y = this.h - 32;
    ctx.save();
    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.textAlign = 'left';

    if (this.multishotTimer > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`🔱 3x MULTISHOT: ${Math.ceil(this.multishotTimer / 60)}s`, 24, y);
      y -= 24;
    }
    if (this.fireworkAmmo > 0) {
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`🎆 FIREWORK ARROWS: ${this.fireworkAmmo}`, 24, y);
    }
    ctx.restore();
  }
}
