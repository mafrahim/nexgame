/**
 * smash.js
 * Shaun's Flock Smash! (Nex-Style Live AR 4-Edge Head-Smash Game starring Shaun the Sheep!)
 * - Full-screen mirrored live webcam feed framed by Mossy Bottom Farm's stone walls, wooden barn beams & green pastures!
 * - Characters from https://www.shaunthesheep.com/about/ pop in from ALL 4 SIDES (Bottom Stone Wall, Top Hayloft, Left & Right Barn Shutters):
 *   1. SHAUN (+10) — Matte-black snout, purple-grey eyelids, top wool tuft, horizontal ears & cheeky side-grin!
 *   2. HARD-HAT NAUGHTY PIG (+10 Helmet Clang + +20 Smash!) — 2-hit armored cheeky pig!
 *   3. BITZER (+10 Blue Beanie Pop + +20 Smash!) — Yellow sheepdog with giant black nose, collar & blue knit beanie!
 *   4. TIMMY (+20) — Quick baby lamb with yellow dummy/pacifier & orange teddy!
 *   5. SHIRLEY (+50) — Giant spherical woolly bonus!
 *   6. ANGRY FARMER ⚠️ (DO NOT SMASH! -1 ❤️) — Square glasses, ginger hair tufts & olive coat peeking in to check the barn!
 * - Soft glowing neon hand orbs (Mint-Cyan P1, Hot-Pink P2), floating white-outlined "10"/"20"/"50" popups,
 *   3 glossy hearts, green LEVEL XP progress bar, and giant white comma-formatted score!
 */

export class CritterSmashGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.windows = [];        // Structured Mossy Bottom Farm barn windows & stone-wall slots on all 4 edges
    this.characters = [];     // Active popping Shaun the Sheep characters
    this.flyingHats = [];     // Knocked-off white hard-hats & Bitzer's blue knit beanies spinning through air
    this.floatingScores = []; // Bold golden-yellow white-outlined "10" / "20" / "50" popups
    this.smashRings = [];     // Glowing impact shockwaves on smash

    this.handStates = new Map();
    this.spawnCooldown = 18;
    this.waveIndex = 0;       // Structured wave patterns + smart edge selection

    // Continuous XP bar for the top green LEVEL pill (matches reference screenshot!)
    this.xpInLevel = 0;
    this.xpPerLevel = 120;

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    const w = canvasWidth;
    const h = canvasHeight;

    // Structured Mossy Bottom Farm Stations on ALL 4 EDGES:
    // - Bottom Dry-Stone Wall Bays (3 evenly spaced bays)
    // - Left & Right Wooden Barn Shutters (2 symmetrical side windows per wall)
    // - Top Hayloft Rafters (2 symmetrical ceiling hayloft hatches)
    this.windows = [
      // Bottom Stone-Wall Bays (pop UP, angle = 0)
      { id: 0, edge: 'bottom', label: 'stone', x: w * 0.23, y: h - 18, angle: 0, nx: 0, ny: -1 },
      { id: 1, edge: 'bottom', label: 'stone', x: w * 0.50, y: h - 18, angle: 0, nx: 0, ny: -1 },
      { id: 2, edge: 'bottom', label: 'stone', x: w * 0.77, y: h - 18, angle: 0, nx: 0, ny: -1 },

      // Left Wooden Barn Shutters (pop RIGHT, angle = +PI/2)
      { id: 3, edge: 'left', label: 'shutter', x: 20, y: h * 0.36, angle: Math.PI / 2, nx: 1, ny: 0 },
      { id: 4, edge: 'left', label: 'shutter', x: 20, y: h * 0.66, angle: Math.PI / 2, nx: 1, ny: 0 },

      // Right Wooden Barn Shutters (pop LEFT, angle = -PI/2)
      { id: 5, edge: 'right', label: 'shutter', x: w - 20, y: h * 0.36, angle: -Math.PI / 2, nx: -1, ny: 0 },
      { id: 6, edge: 'right', label: 'shutter', x: w - 20, y: h * 0.66, angle: -Math.PI / 2, nx: -1, ny: 0 },

      // Top Hayloft Rafter Hatches (pop DOWN upside-down, angle = PI)
      { id: 7, edge: 'top', label: 'hayloft', x: w * 0.28, y: 80, angle: Math.PI, nx: 0, ny: 1 },
      { id: 8, edge: 'top', label: 'hayloft', x: w * 0.72, y: 80, angle: Math.PI, nx: 0, ny: 1 }
    ];

    for (const ch of this.characters) {
      const win = this.windows[ch.windowId];
      if (win) ch.win = win;
    }
  }

  reset() {
    this.characters = [];
    this.flyingHats = [];
    this.floatingScores = [];
    this.smashRings = [];
    this.handStates.clear();
    this.spawnCooldown = 16;
    this.waveIndex = 0;
    this.xpInLevel = 0;
  }

  spawnFlockCharacter(level = 1, speedMultiplier = 1.2) {
    const occupiedIds = new Set(this.characters.map(c => c.windowId));
    const freeWindows = this.windows.filter(w => !occupiedIds.has(w.id));
    if (freeWindows.length === 0) return;

    // Cycle intentionally across Bottom, Left, Right, and Top barn stations so every edge feels lively & purposeful!
    const preferredEdges = ['bottom', 'left', 'right', 'top', 'bottom'];
    const targetEdge = preferredEdges[this.waveIndex % preferredEdges.length];
    this.waveIndex++;

    const edgeMatches = freeWindows.filter(w => w.edge === targetEdge);
    const chosenPool = edgeMatches.length > 0 ? edgeMatches : freeWindows;
    const win = chosenPool[Math.floor(Math.random() * chosenPool.length)];

    // Cast selection from Shaun the Sheep (/about/):
    // - 'shaun': Shaun the Sheep (+10)
    // - 'pig_hardhat': Naughty Pig in White Miner Hard-Hat (2 hits: +10 helmet clang, +20 pig smash!)
    // - 'bitzer': Bitzer in Blue Knit Beanie (2 hits: +10 beanie pop, +20 doggy bop!)
    // - 'timmy': Little Timmy with Yellow Pacifier (+20 nimble pop!)
    // - 'shirley': Giant Fluffy Shirley (+50 mega bonus!)
    // - 'farmer': Angry Farmer w/ Square Glasses ⚠️ (DO NOT SMASH! -1 Heart!)
    const roll = Math.random();
    let type = 'shaun';
    let hatType = null; // 'hardhat' | 'beanie' | null

    if (roll < 0.14) {
      type = 'farmer';
    } else if (roll < 0.24) {
      type = 'shirley';
    } else if (roll < 0.38) {
      type = 'timmy';
    } else if (roll < 0.62) {
      type = 'pig_hardhat';
      hatType = 'hardhat';
    } else if (roll < 0.80) {
      type = 'bitzer';
      hatType = 'beanie';
    } else {
      type = 'shaun';
    }

    const maxExtend = type === 'timmy' ? 118 : (type === 'shirley' ? 138 : 132);
    const popSpeed = (6.8 + level * 0.65) * (speedMultiplier * 0.6 + 0.4);
    const holdFrames = Math.max(44, Math.round((type === 'timmy' ? 72 : 118) - level * 5));

    this.characters.push({
      windowId: win.id,
      win,
      type,
      hatType,
      state: 'emerging', // emerging, active, squished, retracting
      extend: 0,
      maxExtend,
      popSpeed,
      holdTimer: holdFrames,
      squishTimer: 0,
      stunCooldown: 0,
      dizzyPhase: 0
    });
  }

  getHeadWorldPos(ch) {
    const headDist = ch.extend * 0.78;
    return {
      x: ch.win.x + ch.win.nx * headDist,
      y: ch.win.y + ch.win.ny * headDist
    };
  }

  addFloatingScore(x, y, text, color = '#f59e0b') {
    this.floatingScores.push({
      x,
      y,
      vy: -2.4,
      text: String(text),
      color,
      alpha: 1.0,
      scale: 0.55
    });
  }

  update(players, level, speedMultiplier, callbacks) {
    const { onSmash, onHelmetClang, onBombHit, onXpLevelUp, onBaa } = callbacks;

    // 1. Spawn Shaun the Sheep cast across Bottom, Left, Right, and Top barn windows!
    this.spawnCooldown--;
    const maxConcurrent = Math.min(6, 3 + Math.floor(level / 2));
    const nextSpawnFrames = Math.max(16, Math.round((45 - level * 3) / (speedMultiplier * 0.7 + 0.3)));

    if (this.spawnCooldown <= 0 && this.characters.length < maxConcurrent) {
      this.spawnFlockCharacter(level, speedMultiplier);
      if (Math.random() < 0.40 && this.characters.length < maxConcurrent) {
        this.spawnFlockCharacter(level, speedMultiplier);
      }
      this.spawnCooldown = nextSpawnFrames;
    }

    // 2. Track Player 1 (Mint-Cyan) & Player 2 (Hot-Pink) Glowing Hand Orbs
    const activeOrbs = [];
    const count = Math.min(2, Math.max(1, players.length));

    for (let pIdx = 0; pIdx < count; pIdx++) {
      const p = players[pIdx];
      const isP2 = pIdx === 1;
      const coreColor = isP2 ? 'rgba(251, 182, 206, 0.95)' : 'rgba(167, 243, 208, 0.95)';
      const midColor = isP2 ? 'rgba(236, 72, 153, 0.68)' : 'rgba(45, 212, 191, 0.68)';
      const ringHex = isP2 ? '#f472b6' : '#34d399';

      const rawHands = [
        { key: `p${pIdx}_L`, pt: p.leftHandScreen },
        { key: `p${pIdx}_R`, pt: p.rightHandScreen }
      ];

      for (const hItem of rawHands) {
        if (!hItem.pt) continue;
        const hx = hItem.pt.x * this.w;
        const hy = hItem.pt.y * this.h;
        const prev = this.handStates.get(hItem.key);

        let speed = 8;
        if (prev) {
          speed = Math.hypot(hx - prev.x, hy - prev.y);
          prev.vx = hx - prev.x;
          prev.vy = hy - prev.y;
          prev.x = hx;
          prev.y = hy;
        } else {
          this.handStates.set(hItem.key, { x: hx, y: hy, vx: 0, vy: 0 });
        }

        activeOrbs.push({
          key: hItem.key,
          x: hx,
          y: hy,
          speed,
          radius: 52,
          coreColor,
          midColor,
          ringHex
        });
      }
    }
    this.lastRenderedOrbs = activeOrbs;

    // 3. Update Popping Flock Characters & Check Hand-Head Smashes!
    for (let i = this.characters.length - 1; i >= 0; i--) {
      const ch = this.characters[i];
      ch.dizzyPhase += 0.22;
      if (ch.stunCooldown > 0) ch.stunCooldown--;

      if (ch.state === 'emerging') {
        ch.extend += ch.popSpeed;
        if (ch.extend >= ch.maxExtend) {
          ch.extend = ch.maxExtend;
          ch.state = 'active';
        }
      } else if (ch.state === 'active') {
        ch.holdTimer--;
        if (ch.holdTimer <= 0) {
          ch.state = 'retracting';
        }
      } else if (ch.state === 'squished') {
        ch.squishTimer--;
        if (ch.squishTimer <= 0) {
          ch.state = 'retracting';
        }
      } else if (ch.state === 'retracting') {
        ch.extend -= ch.popSpeed * 1.35;
        if (ch.extend <= 0) {
          this.characters.splice(i, 1);
          continue;
        }
      }

      if ((ch.state === 'emerging' || ch.state === 'active') && ch.extend > 45 && ch.stunCooldown <= 0) {
        const headPos = this.getHeadWorldPos(ch);
        const headRadius = ch.type === 'shirley' ? 58 : 48;

        for (const orb of activeOrbs) {
          const dist = Math.hypot(orb.x - headPos.x, orb.y - headPos.y);
          if (dist < headRadius + orb.radius * 0.78 && orb.speed > 1.4) {
            this.smashRings.push({
              x: headPos.x,
              y: headPos.y,
              radius: 18,
              alpha: 1.0,
              color: orb.ringHex
            });

            if (ch.type === 'farmer') {
              // Uh-oh! Bopped The Farmer on the head! Lose 1 Heart!
              ch.state = 'retracting';
              this.addFloatingScore(headPos.x, headPos.y - 18, '😠 FARMER!', '#ef4444');
              if (onBombHit) onBombHit(headPos.x, headPos.y);
              break;
            }

            if (ch.hatType) {
              // 1st Smash on Naughty Pig's Hard-Hat OR Bitzer's Blue Beanie: Knock hat flying!
              const knockedHat = ch.hatType;
              ch.hatType = null;
              ch.stunCooldown = 14;
              ch.holdTimer = Math.max(ch.holdTimer, 55);

              this.flyingHats.push({
                hatKind: knockedHat,
                x: headPos.x,
                y: headPos.y,
                vx: (Math.random() - 0.5) * 9 + ch.win.nx * 5,
                vy: -9.5 - Math.random() * 3,
                rot: ch.win.angle,
                vRot: (Math.random() < 0.5 ? -1 : 1) * 0.28,
                alpha: 1.0
              });

              const pts = 10;
              this.awardXp(pts, onXpLevelUp);
              this.addFloatingScore(headPos.x, headPos.y - 24, pts, '#f59e0b');
              if (onHelmetClang) onHelmetClang(headPos.x, headPos.y, pts);
              break;
            } else {
              // Direct Head Smash on Shaun, Timmy, Shirley, or Bare-Headed Pig/Bitzer!
              ch.state = 'squished';
              ch.squishTimer = 14;

              const pts = ch.type === 'shirley' ? 50
                : (ch.type === 'timmy' || ch.type === 'pig_hardhat' || ch.type === 'bitzer' ? 20 : 10);

              this.awardXp(pts, onXpLevelUp);
              this.addFloatingScore(
                headPos.x,
                headPos.y - 24,
                pts,
                ch.type === 'shirley' ? '#fde047' : '#f59e0b'
              );

              if ((ch.type === 'shaun' || ch.type === 'shirley' || ch.type === 'timmy') && onBaa) {
                onBaa();
              }
              if (onSmash) onSmash(headPos.x, headPos.y, pts, orb.ringHex);
              break;
            }
          }
        }
      }
    }

    // 4. Update Flying Hats, Floating "10"/"20"/"50" Popups, and Smash Shockwave Rings
    for (let i = this.flyingHats.length - 1; i >= 0; i--) {
      const fh = this.flyingHats[i];
      fh.x += fh.vx;
      fh.vy += 0.48;
      fh.y += fh.vy;
      fh.rot += fh.vRot;
      fh.alpha -= 0.022;
      if (fh.alpha <= 0) this.flyingHats.splice(i, 1);
    }

    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.y += fs.vy;
      fs.vy *= 0.96;
      fs.scale = Math.min(1.12, fs.scale + 0.09);
      fs.alpha -= 0.022;
      if (fs.alpha <= 0) this.floatingScores.splice(i, 1);
    }

    for (let i = this.smashRings.length - 1; i >= 0; i--) {
      const sr = this.smashRings[i];
      sr.radius += 5.5;
      sr.alpha -= 0.065;
      if (sr.alpha <= 0) this.smashRings.splice(i, 1);
    }
  }

  awardXp(pts, onXpLevelUp) {
    this.xpInLevel += pts;
    if (this.xpInLevel >= this.xpPerLevel) {
      this.xpInLevel -= this.xpPerLevel;
      if (onXpLevelUp) onXpLevelUp();
    }
  }

  // =========================================================================
  // RENDERING: LIVE AR CAMERA + MOSSY BOTTOM BARN FRAME + SHAUN CAST + HUD
  // =========================================================================

  draw(ctx, frameCount, videoElement, score, level, lives) {
    const w = this.w;
    const h = this.h;

    ctx.save();

    // 1. Full-Screen Mirrored Live Webcam Feed (AR Mode)
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      const scale = Math.max(w / vw, h / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;

      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -offsetX - drawW + w, offsetY, drawW, drawH);
      ctx.restore();

      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.max(w, h) * 0.76);
      vig.addColorStop(0, 'rgba(15, 23, 42, 0)');
      vig.addColorStop(1, 'rgba(15, 23, 42, 0.30)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Mossy Bottom Barn Twilight fallback when playing without camera
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(0.6, '#334155');
      bgGrad.addColorStop(1, '#14532d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Render Mossy Bottom Farm Barn Shutters, Hayloft Hatches & Popping Shaun Characters!
    for (const win of this.windows) {
      const activeChar = this.characters.find(c => c.windowId === win.id);
      this.drawBarnWindowAndCharacter(ctx, win, activeChar, frameCount);
    }

    // 3. Mossy Bottom Farm Foliage, Yorkshire Dry-Stone Corners & Barn Rafters Frame!
    this.drawMossyBottomBorder(ctx, w, h);

    // 4. Flying Knocked-Off Hard-Hats & Bitzer Blue Knit Beanies
    for (const fh of this.flyingHats) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fh.alpha);
      ctx.translate(fh.x, fh.y);
      ctx.rotate(fh.rot);
      if (fh.hatKind === 'beanie') {
        this.drawBitzerBeanie(ctx, 0, 0, 1.0);
      } else {
        this.drawMinerHardHat(ctx, 0, 0, 1.0);
      }
      ctx.restore();
    }

    // 5. Soft Glowing Neon Hand Orbs (Mint-Cyan P1, Hot-Pink P2!)
    const orbs = this.lastRenderedOrbs || [];
    for (const orb of orbs) {
      ctx.save();
      const grad = ctx.createRadialGradient(orb.x, orb.y, 6, orb.x, orb.y, orb.radius * 1.35);
      grad.addColorStop(0, orb.coreColor);
      grad.addColorStop(0.48, orb.midColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Smash Impact Shockwave Rings
    for (const sr of this.smashRings) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sr.alpha);
      ctx.strokeStyle = sr.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(sr.x, sr.y, sr.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Bold Golden White-Outlined Floating Score Popups ("10", "20", "50"!)
    for (const fs of this.floatingScores) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, fs.alpha);
      ctx.translate(fs.x, fs.y);
      ctx.scale(fs.scale, fs.scale);

      ctx.font = '700 54px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(fs.text, 0, 0);

      ctx.fillStyle = fs.color;
      ctx.fillText(fs.text, 0, 0);
      ctx.restore();
    }

    // 8. Top Arcade HUD Bar Matching Reference Video (3 Hearts | Green LEVEL Pill | Big White Score)
    this.drawArcadeTopHUD(ctx, w, score, level, lives);

    ctx.restore();
  }

  drawBarnWindowAndCharacter(ctx, win, ch, frameCount) {
    ctx.save();
    ctx.translate(win.x, win.y);
    ctx.rotate(win.angle);

    // Subtle open dark barn window recess behind character
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.strokeStyle = win.label === 'stone' ? '#475569' : '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-52, -26, 104, 30, 10);
    ctx.fill();
    ctx.stroke();

    if (ch && ch.extend > 1) {
      ctx.save();
      // Clip everything below the window sill (y > -6) so characters emerge cleanly from the barn window!
      ctx.beginPath();
      ctx.rect(-120, -270, 240, 264);
      ctx.clip();

      const isSquished = ch.state === 'squished';
      const squashX = isSquished ? 1.26 : 1.0;
      const squashY = isSquished ? 0.52 : 1.0;

      ctx.translate(0, -ch.extend);
      ctx.scale(squashX, squashY);

      this.drawShaunUniverseCharacter(ctx, ch, frameCount);
      ctx.restore();
    }

    // Foreground Sill: Yorkshire Stone Trough (Bottom) OR Weathered Timber Barn Sill (Sides/Top)
    if (win.label === 'stone') {
      const stoneGrad = ctx.createLinearGradient(-60, -14, 60, 18);
      stoneGrad.addColorStop(0, '#94a3b8');
      stoneGrad.addColorStop(0.5, '#64748b');
      stoneGrad.addColorStop(1, '#334155');
      ctx.fillStyle = stoneGrad;
      ctx.strokeStyle = '#1e293b';
    } else {
      const woodGrad = ctx.createLinearGradient(-60, -14, 60, 18);
      woodGrad.addColorStop(0, '#d97706');
      woodGrad.addColorStop(0.5, '#b45309');
      woodGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = woodGrad;
      ctx.strokeStyle = '#451a03';
    }
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-60, -12, 120, 28, 7);
    ctx.fill();
    ctx.stroke();

    // Little golden straw tufts peeking out of sill corners
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-48, -12); ctx.lineTo(-56, -22);
    ctx.moveTo(-42, -12); ctx.lineTo(-46, -24);
    ctx.moveTo(48, -12);  ctx.lineTo(56, -22);
    ctx.stroke();

    // Character hooves/paws gripping the barn sill!
    if (ch && ch.extend > 55 && ch.type !== 'farmer') {
      const pawCol = (ch.type === 'shaun' || ch.type === 'shirley' || ch.type === 'timmy')
        ? '#24252a'
        : (ch.type === 'bitzer' ? '#dca755' : '#fda4af');
      ctx.fillStyle = pawCol;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-28, -12, 10, Math.PI, 0);
      ctx.arc(28, -12, 10, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // =========================================================================
  // AUTHENTIC SHAUN THE SHEEP POP-IN CHARACTERS (From /about/ Reference!)
  // Local space: y = 0 is top of head, y = +132 is base inside barn window
  // =========================================================================

  drawShaunUniverseCharacter(ctx, ch, frameCount) {
    const isSquished = ch.state === 'squished';

    if (ch.type === 'shaun') {
      this.drawPopShaun(ctx, isSquished);
    } else if (ch.type === 'bitzer') {
      this.drawPopBitzer(ctx, ch, isSquished);
    } else if (ch.type === 'pig_hardhat') {
      this.drawPopNaughtyPig(ctx, ch, isSquished);
    } else if (ch.type === 'timmy') {
      this.drawPopTimmy(ctx, isSquished);
    } else if (ch.type === 'shirley') {
      this.drawPopShirley(ctx, isSquished);
    } else if (ch.type === 'farmer') {
      this.drawPopFarmerHazard(ctx, frameCount);
    }
  }

  /**
   * 1. SHAUN THE SHEEP (+10)
   * Curly cream fleece, matte-black pear snout, purple-grey eyelids, top wool tuft,
   * horizontal drooping ears & iconic side-cheek white toothy grin!
   */
  drawPopShaun(ctx, isSquished) {
    // Fluffy cream-white wool torso
    ctx.fillStyle = '#f5f0df';
    ctx.strokeStyle = '#d6ccb4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 92, 42, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 36, 92 + Math.sin(a) * 36, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // Long horizontal drooping black sheep ears
    ctx.fillStyle = '#24252a';
    ctx.beginPath();
    ctx.ellipse(-40, 24, 22, 8, -0.15, 0, Math.PI * 2);
    ctx.ellipse(40, 24, 22, 8, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141518';
    ctx.beginPath();
    ctx.ellipse(-40, 25, 14, 4, -0.15, 0, Math.PI * 2);
    ctx.ellipse(40, 25, 14, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Side-cheek toothy grin pouch on Shaun's left cheek!
    ctx.fillStyle = '#24252a';
    ctx.beginPath();
    ctx.arc(-22, 38, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-22, 38, 7.5, Math.PI * 0.55, Math.PI * 1.55);
    ctx.closePath();
    ctx.fill();

    // Elongated Matte-Black Pear Snout
    const snoutGrad = ctx.createRadialGradient(-5, 28, 4, 0, 34, 34);
    snoutGrad.addColorStop(0, '#464852');
    snoutGrad.addColorStop(0.45, '#27282d');
    snoutGrad.addColorStop(1, '#151619');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.quadraticCurveTo(0, 6, 18, 14);
    ctx.quadraticCurveTo(26, 38, 20, 52);
    ctx.quadraticCurveTo(0, 62, -20, 52);
    ctx.quadraticCurveTo(-26, 38, -18, 14);
    ctx.closePath();
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#0c0d0f';
    ctx.beginPath();
    ctx.ellipse(-8, 48, 3.2, 4.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, 48, 3.2, 4.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (isSquished) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-16, 18); ctx.lineTo(-6, 24); ctx.lineTo(-16, 30);
      ctx.moveTo(16, 18);  ctx.lineTo(6, 24);  ctx.lineTo(16, 30);
      ctx.stroke();
    } else {
      // Touching White Eyes + Purple-Grey Heavy Eyelids!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, 22, 8.5, 0, Math.PI * 2);
      ctx.arc(8, 22, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-7, 23, 3.6, 0, Math.PI * 2);
      ctx.arc(7, 23, 3.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#8d7d96';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-8, 22, 8.5, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, 22, 8.5, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    // Iconic Fluffy White Top Wool Tuft Crown!
    ctx.fillStyle = '#faf7ed';
    const puffs = [
      { dx: 0, dy: 4, r: 13 },
      { dx: -13, dy: 8, r: 10 },
      { dx: 13, dy: 8, r: 10 },
      { dx: -6, dy: 0, r: 10 },
      { dx: 6, dy: 0, r: 10 }
    ];
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 2. BITZER THE SHEEPDOG (+10 Blue Beanie Pop + +20 Bop!)
   * Golden-tan clay coat, floppy brown ears, giant shiny black nose, black collar & blue knit beanie!
   */
  drawPopBitzer(ctx, ch, isSquished) {
    // Golden-tan torso & black collar
    ctx.fillStyle = '#dca755';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, 48);
    ctx.lineTo(34, 48);
    ctx.lineTo(44, 134);
    ctx.lineTo(-44, 134);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Black dog collar
    ctx.fillStyle = '#1e2024';
    ctx.beginPath();
    ctx.roundRect(-28, 56, 56, 11, 5);
    ctx.fill();

    // Floppy dark-brown ears
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.ellipse(-28, 30, 10, 24, 0.3, 0, Math.PI * 2);
    ctx.ellipse(28, 30, 10, 24, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Tall golden clay head
    ctx.fillStyle = '#e5b363';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 28, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pink tongue hanging out happily!
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(12, 52, 7, 12, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Close-set eyes high on brow
    if (isSquished) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 14); ctx.lineTo(-4, 18); ctx.lineTo(-12, 22);
      ctx.moveTo(12, 14);  ctx.lineTo(4, 18);  ctx.lineTo(12, 22);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, 16, 6, 0, Math.PI * 2);
      ctx.arc(6, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-5.5, 16, 2.8, 0, Math.PI * 2);
      ctx.arc(5.5, 16, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // GIANT Rounded Matte-Black Dog Nose!
    const noseGrad = ctx.createRadialGradient(-5, 33, 2, 0, 36, 20);
    noseGrad.addColorStop(0, '#525660');
    noseGrad.addColorStop(0.45, '#26282c');
    noseGrad.addColorStop(1, '#111215');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.ellipse(0, 36, 19, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue Knit Beanie OR Dizzy Stars if knocked off!
    if (ch.hatType === 'beanie') {
      this.drawBitzerBeanie(ctx, 0, 2, 1.0);
    } else if (!isSquished) {
      this.drawDizzyStars(ctx, ch.dizzyPhase);
    }
  }

  /**
   * 3. HARD-HAT NAUGHTY PIG (+10 Helmet Clang + +20 Head Smash!)
   * Cheeky Aardman pink pig wearing a White Miner Hard-Hat & Toolbelt!
   */
  drawPopNaughtyPig(ctx, ch, isSquished) {
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, 135);
    bodyGrad.addColorStop(0, '#f9a8d4');
    bodyGrad.addColorStop(1, '#f472b6');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#9d174d';
    ctx.lineWidth = 3.5;

    // Pointed pig ears
    ctx.beginPath();
    ctx.ellipse(-28, 16, 11, 16, -0.45, 0, Math.PI * 2);
    ctx.ellipse(28, 16, 11, 16, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chubby pink pig body
    ctx.beginPath();
    ctx.moveTo(-36, 28);
    ctx.quadraticCurveTo(-32, -6, 0, -6);
    ctx.quadraticCurveTo(32, -6, 36, 28);
    ctx.lineTo(48, 134);
    ctx.lineTo(-48, 134);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mud-splatter toolbelt & hammer!
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-42, 92);
    ctx.lineTo(42, 70);
    ctx.stroke();

    // Prominent Aardman Pig Snout
    ctx.fillStyle = '#fb7185';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 35, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.ellipse(-5, 35, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 35, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isSquished) {
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-20, 16); ctx.lineTo(-10, 22); ctx.lineTo(-20, 28);
      ctx.moveTo(20, 16);  ctx.lineTo(10, 22);  ctx.lineTo(20, 28);
      ctx.stroke();
    } else {
      // Mischievous close-set eyes + furrowed brows
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-11, 20, 6.5, 0, Math.PI * 2);
      ctx.arc(11, 20, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-10, 20, 3, 0, Math.PI * 2);
      ctx.arc(10, 20, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.roundRect(-22, 10, 18, 5, 2.5);
      ctx.roundRect(4, 10, 18, 5, 2.5);
      ctx.fill();

      // Cheeky toothy snicker
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-11, 50, 22, 8, 4);
      ctx.fill();
      ctx.stroke();
    }

    if (ch.hatType === 'hardhat') {
      this.drawMinerHardHat(ctx, 0, -2, 1.0);
    } else if (!isSquished) {
      this.drawDizzyStars(ctx, ch.dizzyPhase);
    }
  }

  /**
   * 4. TIMMY (+20 Fast Lamb!)
   * Smooth dark baby lamb head (no top wool tuft), big innocent eyes, yellow dummy/pacifier & orange teddy!
   */
  drawPopTimmy(ctx, isSquished) {
    // Little cream fleece torso
    ctx.fillStyle = '#f8f5e9';
    ctx.strokeStyle = '#d6ccb4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 92, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Smooth dark-charcoal baby lamb head (no wool tuft!) + horizontal ears
    ctx.fillStyle = '#27282d';
    ctx.beginPath();
    ctx.ellipse(-30, 28, 16, 6.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(30, 28, 16, 6.5, 0.25, 0, Math.PI * 2);
    ctx.arc(0, 28, 22, 0, Math.PI * 2);
    ctx.fill();

    // Big round baby eyes
    if (!isSquished) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7.5, 22, 7.5, 0, Math.PI * 2);
      ctx.arc(7.5, 22, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-7, 22, 3.5, 0, Math.PI * 2);
      ctx.arc(7, 22, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trademark Yellow Pacifier / Dummy!
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 39, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 44, 7.5, 0, Math.PI);
    ctx.stroke();

    // Little Orange Teddy peeking at Timmy's shoulder!
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(24, 72, 13, 0, Math.PI * 2);
    ctx.arc(16, 62, 5, 0, Math.PI * 2);
    ctx.arc(32, 62, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 5. SHIRLEY (+50 Mega Woolly Bonus!)
   * Extra-wide spherical golden-glowing cream fleece with tiny black head & royal crown!
   */
  drawPopShirley(ctx, isSquished) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#fde047';

    // Huge Spherical Woolly Body
    ctx.fillStyle = '#fefce8';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 74, 58, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 52, 74 + Math.sin(a) * 52, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comparatively small matte-black head at top of giant wool sphere!
    ctx.fillStyle = '#24252a';
    ctx.beginPath();
    ctx.ellipse(-24, 18, 12, 5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(24, 18, 12, 5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0, 22, 18, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!isSquished) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, 15, 5.5, 0, Math.PI * 2);
      ctx.arc(6, 15, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-6, 15, 2.5, 0, Math.PI * 2);
      ctx.arc(6, 15, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Golden +50 Star Badge on Shirley's wool chest!
    ctx.fillStyle = '#ca8a04';
    ctx.font = '700 22px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ +50 ★', 0, 78);
    ctx.restore();
  }

  /**
   * 6. THE ANGRY FARMER ⚠️ (DO NOT SMASH! -1 Heart!)
   * Tall pale head, square dark-rimmed glasses obscuring eyes, ginger side-hair tufts,
   * downturned frown, cream cable-knit turtleneck & olive-green coat + flashing red warning!
   */
  drawPopFarmerHazard(ctx, frameCount) {
    ctx.save();

    // Pulsing Red Hazard Halo so kids instantly know "DON'T BOP THE FARMER!"
    const pulse = 0.55 + Math.sin(frameCount * 0.35) * 0.35;
    ctx.shadowBlur = 24;
    ctx.shadowColor = `rgba(239, 68, 68, ${pulse})`;

    // Olive-Green Coat & Cream Cable-Knit Turtleneck Sweater
    ctx.fillStyle = '#3f6212';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-38, 62);
    ctx.lineTo(38, 62);
    ctx.lineTo(48, 134);
    ctx.lineTo(-48, 134);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(-20, 54, 40, 34, 8);
    ctx.fill();

    // Wispy Ginger/Orange Hair Tufts on Left & Right of Bald Crown!
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ea580c';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * 24, 20, 9, 0, Math.PI * 2);
      ctx.arc(sx * 26, 30, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Large Ears & Tall Pale Clay Head
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-25, 34, 8, 0, Math.PI * 2);
    ctx.arc(25, 34, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-22, 4, 44, 54, 18);
    ctx.fill();
    ctx.stroke();

    // Square Dark-Rimmed Glasses (obscuring eyes, just like /about/ photo!)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-21, 19, 19, 14, 3);
    ctx.roundRect(2, 19, 19, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, 25);
    ctx.lineTo(2, 25);
    ctx.stroke();

    // Prominent Clay Nose & Grumpy Downturned Frown
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.ellipse(0, 36, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 53, 11, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Clear Warning Sign Badge above Farmer's head!
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-34, -22, 68, 22, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ NO BOP!', 0, -11);

    ctx.restore();
  }

  drawDizzyStars(ctx, phase) {
    for (let s = 0; s < 3; s++) {
      const ang = phase + (s * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * 26;
      const sy = -8 + Math.sin(ang) * 7;
      ctx.fillStyle = '#fde047';
      ctx.font = '700 16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, sy);
    }
  }

  drawBitzerBeanie(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#1d6fa5';
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 6, 24, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#15527a';
    ctx.beginPath();
    ctx.roundRect(-26, 2, 52, 9, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawMinerHardHat(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const domeGrad = ctx.createLinearGradient(-34, -26, 34, 8);
    domeGrad.addColorStop(0, '#ffffff');
    domeGrad.addColorStop(0.7, '#e2e8f0');
    domeGrad.addColorStop(1, '#cbd5e1');

    ctx.fillStyle = domeGrad;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 4, 34, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-42, 0, 84, 10, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawMossyBottomBorder(ctx, w, h) {
    ctx.save();

    // Top Weathered Wooden Barn Rafters & Hayloft Trim!
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 14, w, 10);

    // Leafy English Pasture Hedge Clusters around the corners & between stone bays
    const drawBush = (cx, cy, r, colMain, colLight) => {
      ctx.fillStyle = colMain;
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.55, cy + r * 0.35, r * 0.78, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.55, cy + r * 0.35, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colLight;
      ctx.beginPath();
      ctx.arc(cx - r * 0.18, cy - r * 0.22, r * 0.52, 0, Math.PI * 2);
      ctx.fill();
    };

    drawBush(38, h - 22, 60, '#16a34a', '#4ade80');
    drawBush(w - 38, h - 22, 62, '#16a34a', '#4ade80');
    drawBush(w * 0.365, h + 14, 38, '#15803d', '#22c55e');
    drawBush(w * 0.635, h + 14, 38, '#15803d', '#22c55e');

    drawBush(-12, h * 0.20, 40, '#15803d', '#4ade80');
    drawBush(-12, h * 0.51, 36, '#16a34a', '#4ade80');
    drawBush(w + 12, h * 0.20, 40, '#15803d', '#4ade80');
    drawBush(w + 12, h * 0.51, 36, '#16a34a', '#4ade80');

    ctx.restore();
  }

  drawArcadeTopHUD(ctx, w, score, level, lives) {
    ctx.save();

    // 1. Top-Left Glossy Red Hearts
    const totalHeartSlots = Math.max(3, lives);
    for (let i = 0; i < totalHeartSlots; i++) {
      const hx = 38 + i * 48;
      const hy = 44;
      this.drawGlossyHeart(ctx, hx, hy, 19, i < lives);
    }

    // 2. Top-Center Rounded White-Bordered Green LEVEL Progress Bar
    const barW = Math.min(420, w * 0.42);
    const barH = 38;
    const barX = (w - barW) / 2;
    const barY = 24;
    const progress = Math.max(0.08, Math.min(1, this.xpInLevel / this.xpPerLevel));

    ctx.fillStyle = '#3b5998';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 999);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, barW - 4, barH - 4, 999);
    ctx.clip();

    const greenGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    greenGrad.addColorStop(0, '#65a30d');
    greenGrad.addColorStop(0.5, '#4d9e0f');
    greenGrad.addColorStop(1, '#3f820c');
    ctx.fillStyle = greenGrad;
    ctx.fillRect(barX, barY, barW * progress, barH);
    ctx.restore();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 999);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px Fredoka, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.fillText(`LEVEL ${level}`, barX + 18, barY + barH / 2 + 1);

    // 3. Top-Right Giant Bold White Score ("3,600")
    ctx.font = '700 52px Fredoka, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(Number(score).toLocaleString(), w - 24, 18);

    ctx.restore();
  }

  drawGlossyHeart(ctx, x, y, size, active) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';

    ctx.fillStyle = active ? '#ef4444' : 'rgba(30, 41, 59, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.bezierCurveTo(-size * 1.1, -size * 0.45, -size * 0.55, -size * 1.15, 0, -size * 0.45);
    ctx.bezierCurveTo(size * 0.55, -size * 1.15, size * 1.1, -size * 0.45, 0, size * 0.35);
    ctx.closePath();
    ctx.fill();

    if (active) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.beginPath();
      ctx.ellipse(-size * 0.32, -size * 0.42, size * 0.22, size * 0.13, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
