/**
 * bubbles.js
 * AR Magic Bubble Lab! — Full-Screen Live Camera Gesture Sandbox & Arcade!
 * - Bring BOTH HANDS TOGETHER & PULL APART to stretch & blow GIANT shimmering rainbow soap bubbles!
 * - Encase fluttering 🦋 Butterflies, ✨ Star-Sprites, 🪼 Moon-Jellies & 👑 Fairy Kings inside your bubbles!
 * - Poke trapped bubbles (or CLAP both hands for a Sonic Clap!) to trigger chain-reaction harp combos!
 * - Watch out for 🌵 Prickly Ink-Urchins: don't poke them bare-handed—wrap them in a Giant Bubble to turn them into Pearls!
 */

export class MagicBubbleGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.bubbles = [];          // Floating soap bubbles (empty or carrying a trapped sprite!)
    this.sprites = [];          // Free-flying magical creatures & prickly urchins
    this.popups = [];
    this.clapWaves = [];        // Expanding rainbow sonic-clap rings

    this.playerWands = [
      this.createWandState(0, '#38bdf8', '#f472b6'),
      this.createWandState(1, '#4ade80', '#fde047')
    ];

    // Trophy & Combo stats
    this.spritesFreed = 0;
    this.bestChain = 0;

    this.spawnTimer = 20;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#38bdf8';

    // Mouse fallback bubble inflation
    this.mouseInflating = false;
    this.mouseRadius = 24;

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  createWandState(index, leftCol, rightCol) {
    return {
      index,
      lx: 0,
      ly: 0,
      rx: 0,
      ry: 0,
      lvx: 0,
      lvy: 0,
      rvx: 0,
      rvy: 0,
      isStretching: false,
      stretchRadius: 0,
      stretchHoldFrames: 0,
      clapCooldown: 0,
      hurtCooldown: 0,
      leftCol,
      rightCol
    };
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
  }

  reset() {
    this.bubbles = [];
    this.sprites = [];
    this.popups = [];
    this.clapWaves = [];
    this.spritesFreed = 0;
    this.bestChain = 0;
    this.spawnTimer = 15;
    this.mouseInflating = false;
    this.mouseRadius = 24;

    this.playerWands[0] = this.createWandState(0, '#38bdf8', '#f472b6');
    this.playerWands[1] = this.createWandState(1, '#4ade80', '#fde047');

    // Seed a couple friendly bubbles & sprites immediately so the lab feels alive!
    for (let i = 0; i < 3; i++) {
      this.spawnSprite(1, 1.0);
    }
    this.showBanner('🫧 TOUCH HANDS & PULL APART TO BLOW GIANT BUBBLES!', '#38bdf8', 95);
  }

  setMouseInflate(isDown) {
    if (this.mouseInflating && !isDown && this.mouseRadius > 28) {
      const w0 = this.playerWands[0];
      this.releaseBubble(w0.lx, w0.ly, Math.min(95, this.mouseRadius));
      this.mouseRadius = 24;
    }
    this.mouseInflating = isDown;
  }

  showBanner(text, color = '#38bdf8', duration = 68) {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerTimer = duration;
  }

  addPopup(x, y, text, color = '#fde047') {
    this.popups.push({ x, y, text, color, alpha: 1.0, vy: -2.0, scale: 0.7 });
  }

  releaseBubble(x, y, radius) {
    if (this.bubbles.length >= 16) {
      this.bubbles.shift();
    }
    this.bubbles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.4,
      vy: -1.8 - Math.random() * 1.1,
      radius: Math.max(38, radius),
      wobblePhase: Math.random() * Math.PI * 2,
      hueOffset: Math.random() * 360,
      trappedSprite: null, // Filled when bubble captures a sprite or neutralizes an urchin!
      age: 0,
      maxAge: 520
    });
  }

  spawnSprite(level = 1, speedMultiplier = 1.4) {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -45 : this.w + 45;
    const y = 125 + Math.random() * (this.h - 250);
    const spd = (2.0 + Math.random() * 1.2 + (level - 1) * 0.3) * (speedMultiplier * 0.65 + 0.35);
    const vx = fromLeft ? spd : -spd;

    const r = Math.random();
    let kind = 'butterfly';
    let icon = '🦋';
    let pts = 20;
    let color = '#f472b6';

    if (r < 0.15) {
      kind = 'urchin';
      icon = '🌵';
      pts = 35; // Worth +35 if safely wrapped in a Giant Bubble!
      color = '#ef4444';
    } else if (r < 0.27) {
      kind = 'king';
      icon = '👑';
      pts = 50;
      color = '#facc15';
    } else if (r < 0.55) {
      kind = 'jelly';
      icon = '🪼';
      pts = 30;
      color = '#38bdf8';
    } else if (r < 0.78) {
      kind = 'star';
      icon = '✨';
      pts = 25;
      color = '#fde047';
    }

    this.sprites.push({
      kind,
      icon,
      pts,
      color,
      x,
      y,
      vx,
      vy: (Math.random() - 0.5) * 0.8,
      radius: 28,
      phase: Math.random() * Math.PI * 2
    });
  }

  popBubbleAtIndex(idx, chainStep, callbacks) {
    const { onBubblePop } = callbacks;
    const b = this.bubbles[idx];
    if (!b) return;

    const bx = b.x;
    const by = b.y;
    const br = b.radius;
    const prize = b.trappedSprite;
    this.bubbles.splice(idx, 1);

    if (prize) {
      this.spritesFreed++;
      const mult = Math.min(3, chainStep);
      const totalPts = prize.pts * mult;
      this.bestChain = Math.max(this.bestChain, chainStep);

      const label = chainStep > 1
        ? `✨ ${chainStep}x CHAIN! +${totalPts}`
        : `${prize.icon} +${totalPts}!`;
      this.addPopup(bx, by - 16, label, prize.color);
      if (onBubblePop) onBubblePop(bx, by, totalPts, chainStep, prize.color);
    } else {
      if (onBubblePop) onBubblePop(bx, by, 5, chainStep, '#38bdf8');
    }

    // Chain-reaction pop to any adjacent trapped-sprite bubbles within reach!
    for (let j = this.bubbles.length - 1; j >= 0; j--) {
      const other = this.bubbles[j];
      if (other.trappedSprite && Math.hypot(other.x - bx, other.y - by) <= br + other.radius + 52) {
        this.popBubbleAtIndex(j, chainStep + 1, callbacks);
        break;
      }
    }
  }

  updatePlayerWand(wand, player, callbacks) {
    const { onBubbleBlow, onUrchinPoke } = callbacks;
    if (wand.clapCooldown > 0) wand.clapCooldown--;
    if (wand.hurtCooldown > 0) wand.hurtCooldown--;

    if (player.isMouseFallback) {
      const mx = ((player.leftHandScreen.x + player.rightHandScreen.x) * 0.5) * this.w;
      const my = player.leftHandScreen.y * this.h;
      wand.lvx = mx - wand.lx;
      wand.lvy = my - wand.ly;
      wand.lx = mx;
      wand.ly = my;
      wand.rx = mx;
      wand.ry = my;

      if (this.mouseInflating) {
        this.mouseRadius = Math.min(96, this.mouseRadius + 2.2);
        wand.isStretching = true;
        wand.stretchRadius = this.mouseRadius;
      } else {
        wand.isStretching = false;
      }
      return;
    }

    const nlx = (player.leftHandScreen ? player.leftHandScreen.x : 0.35) * this.w;
    const nly = (player.leftHandScreen ? player.leftHandScreen.y : 0.65) * this.h;
    const nrx = (player.rightHandScreen ? player.rightHandScreen.x : 0.65) * this.w;
    const nry = (player.rightHandScreen ? player.rightHandScreen.y : 0.65) * this.h;

    wand.lvx = nlx - wand.lx;
    wand.lvy = nly - wand.ly;
    wand.rvx = nrx - wand.rx;
    wand.rvy = nry - wand.ry;
    wand.lx = nlx;
    wand.ly = nly;
    wand.rx = nrx;
    wand.ry = nry;

    const span = Math.hypot(wand.rx - wand.lx, wand.ry - wand.ly);
    const midX = (wand.lx + wand.rx) * 0.5;
    const midY = (wand.ly + wand.ry) * 0.5;
    const closingSpeed = Math.hypot(wand.lvx - wand.rvx, wand.lvy - wand.rvy);

    // 1. Start Soap-Film Stretch when hands come together (< 128px)!
    if (!wand.isStretching && span < 128) {
      // Check if fast CLAP occurred while trapped bubbles exist nearby!
      const hasNearbyTrapped = this.bubbles.some(b => b.trappedSprite && Math.hypot(b.x - midX, b.y - midY) < 240);
      if (closingSpeed > 18 && hasNearbyTrapped && wand.clapCooldown <= 0) {
        wand.clapCooldown = 25;
        this.clapWaves.push({ x: midX, y: midY, radius: 24, alpha: 1.0 });
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
          if (Math.hypot(this.bubbles[i].x - midX, this.bubbles[i].y - midY) < 240) {
            this.popBubbleAtIndex(i, 1, callbacks);
          }
        }
        return;
      }

      wand.isStretching = true;
      wand.stretchHoldFrames = 0;
      wand.stretchRadius = 28;
    }

    // 2. Inflate & Release Giant Rainbow Bubble as hands pull apart!
    if (wand.isStretching) {
      wand.stretchRadius = Math.max(30, Math.min(105, span * 0.44));
      if (span > 145) {
        wand.stretchHoldFrames++;
      }

      // Release Giant Bubble once stretched wide (> 225px) OR held stretched for ~0.45s!
      if (span >= 225 || wand.stretchHoldFrames >= 26) {
        this.releaseBubble(midX, midY, wand.stretchRadius);
        wand.isStretching = false;
        wand.stretchHoldFrames = 0;
        if (onBubbleBlow) onBubbleBlow(midX, midY);
      }
    }
  }

  update(players, level, speedMultiplier, callbacks) {
    const { onUrchinPoke } = callbacks;

    if (this.bannerTimer > 0) this.bannerTimer--;

    // 1. Update Player Bubble Wands (1P or 2P Co-op!)
    const activeCount = Math.min(2, Math.max(1, players.length));
    this.activeWandCount = activeCount;
    for (let i = 0; i < activeCount; i++) {
      this.updatePlayerWand(this.playerWands[i], players[i], callbacks);
    }

    // 2. Spawn Magical Sprites & Occasional Prickly Urchins
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.sprites.length < 6 + level) {
      this.spawnSprite(level, speedMultiplier);
      this.spawnTimer = Math.max(30, Math.round((64 - level * 4) / (speedMultiplier * 0.6 + 0.4)));
    }

    // 3. Move Free Sprites & Check Capture by Floating OR Stretching Bubbles!
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const sp = this.sprites[i];
      sp.phase += 0.08;
      sp.x += sp.vx;
      sp.y += sp.vy + Math.sin(sp.phase) * 0.9;

      if (sp.x < -80 || sp.x > this.w + 80) {
        this.sprites.splice(i, 1);
        continue;
      }

      // A. Can a currently-stretching bubble between player's hands wrap right around a sprite? YES!
      let captured = false;
      for (let wIdx = 0; wIdx < activeCount; wIdx++) {
        const w = this.playerWands[wIdx];
        if (w.isStretching && w.stretchRadius > 42) {
          const midX = (w.lx + w.rx) * 0.5;
          const midY = (w.ly + w.ry) * 0.5;
          if (Math.hypot(sp.x - midX, sp.y - midY) < w.stretchRadius + 24) {
            this.releaseBubble(midX, midY, Math.max(58, w.stretchRadius));
            const newest = this.bubbles[this.bubbles.length - 1];
            newest.trappedSprite = this.convertSpriteToPrize(sp);
            w.isStretching = false;
            this.sprites.splice(i, 1);
            captured = true;
            break;
          }
        }
      }
      if (captured) continue;

      // B. Check capture by any Floating Giant Bubble!
      for (const b of this.bubbles) {
        if (!b.trappedSprite && Math.hypot(sp.x - b.x, sp.y - b.y) <= b.radius + sp.radius * 0.75) {
          b.trappedSprite = this.convertSpriteToPrize(sp);
          b.vy = -0.65; // Hover gently so player can pop it!
          this.sprites.splice(i, 1);
          captured = true;
          break;
        }
      }
      if (captured) continue;

      // C. Check Bare-Hand Touch:
      // - Touching a friendly free butterfly/star gently nudges/sparkles;
      // - Touching an UN-BUBBLED Prickly Urchin pokes your finger (-1 Heart)!
      if (sp.kind === 'urchin') {
        for (let wIdx = 0; wIdx < activeCount; wIdx++) {
          const w = this.playerWands[wIdx];
          if (w.hurtCooldown > 0 || w.isStretching) continue;
          const dL = Math.hypot(sp.x - w.lx, sp.y - w.ly);
          const dR = Math.hypot(sp.x - w.rx, sp.y - w.ry);
          if (dL < sp.radius + 22 || dR < sp.radius + 22) {
            w.hurtCooldown = 65;
            this.addPopup(sp.x, sp.y - 18, '🌵 PRICKLY! BUBBLE IT!', '#ef4444');
            this.showBanner('🌵 OUCH! WRAP SPIKY URCHINS IN A BUBBLE FIRST!', '#ef4444', 65);
            if (onUrchinPoke) onUrchinPoke(sp.x, sp.y);
            this.sprites.splice(i, 1);
            break;
          }
        }
      }
    }

    // 4. Update Floating Soap Bubbles & Check Hand Poke-to-Pop!
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age++;
      b.wobblePhase += 0.09;
      b.x += b.vx + Math.sin(b.wobblePhase * 0.7) * 0.65;
      b.y += b.vy;

      // Keep trapped bubbles bouncing softly inside upper screen so kids have plenty of time to pop them!
      if (b.trappedSprite && b.y < 115) {
        b.y = 115;
        b.vy = Math.abs(b.vy) * 0.5;
      }

      if (b.age > b.maxAge || b.y < -120 || b.x < -120 || b.x > this.w + 120) {
        this.bubbles.splice(i, 1);
        continue;
      }

      // Poke-to-Pop: quick hand swipe through a bubble (or any touch on a trapped-sprite bubble after 15 frames!)
      if (b.age > 18) {
        let popped = false;
        for (let wIdx = 0; wIdx < activeCount; wIdx++) {
          const w = this.playerWands[wIdx];
          if (w.isStretching) continue;

          const hands = [
            { x: w.lx, y: w.ly, spd: Math.hypot(w.lvx, w.lvy) },
            { x: w.rx, y: w.ry, spd: Math.hypot(w.rvx, w.rvy) }
          ];
          for (const hPt of hands) {
            const reqSpd = b.trappedSprite ? 2.2 : 9.5;
            if (hPt.spd >= reqSpd && Math.hypot(hPt.x - b.x, hPt.y - b.y) <= b.radius + 20) {
              this.popBubbleAtIndex(i, 1, callbacks);
              popped = true;
              break;
            }
          }
          if (popped) break;
        }
      }
    }

    // 5. Update Clap Rings & Popups
    for (let i = this.clapWaves.length - 1; i >= 0; i--) {
      const cw = this.clapWaves[i];
      cw.radius += 11;
      cw.alpha -= 0.06;
      if (cw.alpha <= 0) this.clapWaves.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy;
      p.scale = Math.min(1.08, p.scale + 0.08);
      p.alpha -= 0.022;
      if (p.alpha <= 0) this.popups.splice(i, 1);
    }
  }

  convertSpriteToPrize(sp) {
    if (sp.kind === 'urchin') {
      // Neutralized prickly urchin transforms into a shimmering Rainbow Pearl!
      return { icon: '🦪', pts: 35, color: '#a855f7' };
    }
    return { icon: sp.icon, pts: sp.pts, color: sp.color };
  }

  // =========================================================================
  // RENDERING: LIVE AR CAMERA + IRIDESCENT SOAP BUBBLES + SPRITES + WANDS
  // =========================================================================

  draw(ctx, frameCount, videoElement) {
    const w = this.w;
    const h = this.h;

    ctx.save();

    // 1. Full-Screen Mirrored Live Webcam Video (with Dreamy Fairy Lagoon Fallback!)
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      const scale = Math.max(w / vw, h / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      const ox = (w - drawW) / 2;
      const oy = (h - drawH) / 2;

      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -ox - drawW + w, oy, drawW, drawH);
      ctx.restore();

      // Dreamy pastel iridescent edge glow over live camera!
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.78);
      vig.addColorStop(0, 'rgba(56, 189, 248, 0)');
      vig.addColorStop(1, 'rgba(49, 16, 66, 0.35)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#311042');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Free-Flying Magical Sprites & Prickly Urchins
    for (const sp of this.sprites) {
      this.drawFreeSprite(ctx, sp, frameCount);
    }

    // 3. Floating Iridescent Soap Bubbles (Empty & Trapped-Sprite Golden Bubbles!)
    for (const b of this.bubbles) {
      const rx = b.radius * (1 + Math.sin(b.wobblePhase) * 0.06);
      const ry = b.radius * (1 - Math.sin(b.wobblePhase) * 0.06);
      this.drawIridescentBubble(ctx, b.x, b.y, rx, ry, b.trappedSprite, frameCount);
    }

    // 4. Live 2-Hand Soap-Film Stretching & Glowing Bubble-Wand Hands!
    const count = this.activeWandCount || 1;
    for (let i = 0; i < count; i++) {
      this.drawWandAndStretchingBubble(ctx, this.playerWands[i], frameCount);
    }

    // 5. Sonic Clap Shockwaves & Popups
    for (const cw of this.clapWaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, cw.alpha);
      ctx.strokeStyle = '#f472b6';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cw.x, cw.y, cw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      ctx.font = '700 26px Fredoka, sans-serif';
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
      ctx.translate(w / 2, 120);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-275, -24, 550, 48, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 19px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  drawFreeSprite(ctx, sp, frameCount) {
    ctx.save();
    ctx.translate(sp.x, sp.y);

    if (sp.kind === 'urchin') {
      // Red Warning Halo around Prickly Urchin!
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = 'rgba(127, 29, 29, 0.75)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = '28px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌵', 0, 1);

      ctx.fillStyle = '#fef08a';
      ctx.font = '700 11px Fredoka, sans-serif';
      ctx.fillText('BUBBLE ME!', 0, -sp.radius - 10);
    } else {
      ctx.shadowBlur = 18;
      ctx.shadowColor = sp.color;
      const flap = 1 + Math.sin(frameCount * 0.25 + sp.phase) * 0.1;
      ctx.scale(flap, 1 / flap);
      ctx.font = '38px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.icon, 0, 2);
    }

    ctx.restore();
  }

  drawIridescentBubble(ctx, x, y, rx, ry, trappedSprite, frameCount) {
    ctx.save();
    ctx.translate(x, y);

    // 1. Translucent Rainbow Soap-Film Gradient!
    const grad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, rx * 0.1, 0, 0, Math.max(rx, ry));
    if (trappedSprite) {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
      grad.addColorStop(0.55, 'rgba(250, 204, 21, 0.24)');
      grad.addColorStop(0.85, 'rgba(244, 114, 182, 0.45)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.72)');
    } else {
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.22)');
      grad.addColorStop(0.88, 'rgba(236, 72, 153, 0.42)');
      grad.addColorStop(1, 'rgba(167, 243, 208, 0.70)');
    }

    ctx.fillStyle = grad;
    ctx.strokeStyle = trappedSprite ? '#fde047' : 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = trappedSprite ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Curved White Glossy Soap Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.36, -ry * 0.36, rx * 0.22, ry * 0.11, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Encased Magical Sprite Inside!
    if (trappedSprite) {
      ctx.font = `${Math.round(Math.min(rx, ry) * 0.85)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(trappedSprite.icon, 0, 2);

      ctx.fillStyle = '#fef08a';
      ctx.font = '700 12px Fredoka, sans-serif';
      ctx.fillText('👆 POP!', 0, -ry - 10);
    }

    ctx.restore();
  }

  drawWandAndStretchingBubble(ctx, wand, frameCount) {
    ctx.save();

    // If stretching a Giant Bubble between both hands, render the live elastic soap bubble right between palms!
    if (wand.isStretching) {
      const midX = (wand.lx + wand.rx) * 0.5;
      const midY = (wand.ly + wand.ry) * 0.5;
      const r = wand.stretchRadius;

      // Glowing soap-film threads connecting palms to bubble!
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wand.lx, wand.ly);
      ctx.lineTo(midX, midY);
      ctx.lineTo(wand.rx, wand.ry);
      ctx.stroke();

      this.drawIridescentBubble(ctx, midX, midY, r * 1.08, r * 0.94, null, frameCount);
    }

    // Left & Right Shimmering Bubble-Wand Rings on Player's Hands!
    const drawHandRing = (x, y, col) => {
      const g = ctx.createRadialGradient(x, y, 4, x, y, 36);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 36, 0, Math.PI * 2);
      ctx.fill();
    };

    drawHandRing(wand.lx, wand.ly, 'rgba(56, 189, 248, 0.65)');
    if (Math.hypot(wand.rx - wand.lx, wand.ry - wand.ly) > 8) {
      drawHandRing(wand.rx, wand.ry, 'rgba(244, 114, 182, 0.65)');
    }

    ctx.restore();
  }
}
