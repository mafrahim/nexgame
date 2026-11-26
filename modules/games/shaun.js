/**
 * shaun.js
 * Shaun's Mossy Bottom Dash! — Full-Body Motion Farm Runner starring the Shaun the Sheep Flock!
 * - Move/Lean Left & Right across the 3 Mossy Bottom Farm lanes
 * - Physically JUMP over Hay Bales, Stone Walls & Naughty Pig Mud Puddles
 * - Physically SQUAT / DUCK under Barn Beams & Timmy's Mum's Hair-Roller Laundry Lines
 * - Bounce off giant woolly SHIRLEY for a Sky-High Super Trampoline Leap!
 * - Wave hands to snatch Brick-Oven Pizza Slices & Farm Apples (+ Timmy Teddy Bonuses!)
 * - 2-Player Co-op: Player 1 is SHAUN, Player 2 is BITZER!
 */

export class ShaunDashGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    this.distance = 0;
    this.spawnCursorZ = 220;
    this.entities = []; // { z, lane (-1, 0, 1) or xNorm, type, hit, animPhase }

    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerColor = '#fde047';
    this.pizzaCombo = 0;

    // Preload official Shaun & Bitzer cutout badge for decorative corner/banner flair if online
    this.flockBadgeImg = new Image();
    this.flockBadgeImg.crossOrigin = 'anonymous';
    this.flockBadgeLoaded = false;
    this.flockBadgeImg.onload = () => { this.flockBadgeLoaded = true; };
    this.flockBadgeImg.src = 'https://www.shaunthesheep.com/media/zsdh2s1e/shaun-blitzer-2x.png';

    // Player 1 = Shaun, Player 2 = Bitzer
    this.runners = [
      this.createRunnerState('shaun', 0),
      this.createRunnerState('bitzer', 0.32)
    ];

    this.resize(canvasWidth, canvasHeight);
    this.reset();
  }

  createRunnerState(character, startX) {
    return {
      character,         // 'shaun' | 'bitzer'
      xNorm: startX,     // [-0.85 .. 0.85] across the 3 farm lanes
      jumpY: 0,          // upward height in pixels (positive = up in the air)
      vy: 0,
      isJumping: false,
      wasJumpingInput: false,
      isSuperBounce: false,
      isDucking: false,
      duckAmount: 0,     // [0 .. 1] smooth squash/crouch blend
      invulnTimer: 0,
      runPhase: 0,
      leftArmOffset: { x: 0, y: 0 },
      rightArmOffset: { x: 0, y: 0 },
      screenX: 0,
      screenY: 0
    };
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.horizonY = Math.max(155, canvasHeight * 0.35);
    this.runnerGroundY = canvasHeight - 78;
  }

  reset() {
    this.distance = 0;
    this.spawnCursorZ = 240;
    this.entities = [];
    this.pizzaCombo = 0;
    this.bannerTimer = 85;
    this.bannerText = '🐑 LEAN, JUMP HAY BALES & DUCK GATES!';
    this.bannerColor = '#4ade80';

    this.runners[0] = this.createRunnerState('shaun', 0);
    this.runners[1] = this.createRunnerState('bitzer', 0.32);

    while (this.spawnCursorZ < 2400) {
      this.spawnFarmRow(1);
    }
  }

  // Lanes: -0.56 (Left Lane), 0 (Center Lane), +0.56 (Right Lane)
  laneToXNorm(laneIdx) {
    return laneIdx * 0.56;
  }

  spawnFarmRow(level = 1) {
    const z = this.spawnCursorZ;
    const lanes = [-1, 0, 1];
    // Shuffle lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    const primaryLane = lanes[0];
    const secondaryLane = lanes[1];
    const openLane = lanes[2];

    const roll = Math.random();
    if (roll < 0.16) {
      // Friendly SHIRLEY Wool Trampoline! Bounce on her to fly over the farm!
      this.entities.push({
        z,
        lane: primaryLane,
        xNorm: this.laneToXNorm(primaryLane),
        type: 'shirley',
        hit: false,
        squish: 0
      });
      // Put high-altitude pizza trail ahead for when Shirley launches you!
      for (let step = 1; step <= 3; step++) {
        this.entities.push({
          z: z + step * 65,
          lane: primaryLane,
          xNorm: this.laneToXNorm(primaryLane),
          type: 'pizza_high',
          hit: false,
          yLift: 135
        });
      }
    } else if (roll < 0.44) {
      // Overhead Duck Gate / Timmy's Mum's Laundry Clothesline (DUCK under it!)
      this.entities.push({
        z,
        lane: primaryLane,
        xNorm: this.laneToXNorm(primaryLane),
        type: 'laundry_gate',
        hit: false
      });
      // Also sometimes place a hay bale in the secondary lane
      if (level >= 2 && Math.random() < 0.55) {
        this.entities.push({
          z,
          lane: secondaryLane,
          xNorm: this.laneToXNorm(secondaryLane),
          type: 'haybale',
          hit: false
        });
      }
    } else if (roll < 0.74) {
      // Low Obstacle to JUMP over: Rolling Hay Bale or Naughty Pig Mud Puddle!
      const lowType = Math.random() < 0.55 ? 'haybale' : 'pigs_mud';
      this.entities.push({
        z,
        lane: primaryLane,
        xNorm: this.laneToXNorm(primaryLane),
        type: lowType,
        hit: false
      });
      if (Math.random() < 0.45 + (level - 1) * 0.08) {
        this.entities.push({
          z,
          lane: secondaryLane,
          xNorm: this.laneToXNorm(secondaryLane),
          type: 'stone_wall',
          hit: false
        });
      }
    } else {
      // Dry-Stone Wall + Timmy Cheer Crate in open lane!
      this.entities.push({
        z,
        lane: primaryLane,
        xNorm: this.laneToXNorm(primaryLane),
        type: 'stone_wall',
        hit: false
      });
      this.entities.push({
        z: z + 20,
        lane: openLane,
        xNorm: this.laneToXNorm(openLane),
        type: 'timmy_bonus',
        hit: false,
        yLift: 35
      });
    }

    // Spawn delicious Mossy Bottom Pizza Slices & Apples along the safe/jump paths!
    const treatType = Math.random() < 0.58 ? 'pizza' : 'apple';
    this.entities.push({
      z: z + 95,
      lane: openLane,
      xNorm: this.laneToXNorm(openLane),
      type: treatType,
      hit: false,
      yLift: Math.random() < 0.4 ? 85 : 32
    });

    this.spawnCursorZ += Math.max(165, 245 - (level - 1) * 12);
  }

  // Project 3D farm track coordinate onto 2D canvas
  project(xNorm, worldZ, yLift = 0) {
    const relZ = worldZ - this.distance;
    const nearZ = 110;
    const fov = 330;
    const scale = fov / Math.max(28, relZ + fov - nearZ);

    const trackHalfWidth = this.w * 0.41;
    const screenX = this.w / 2 + xNorm * trackHalfWidth * scale;
    const groundY = this.horizonY + (this.runnerGroundY - this.horizonY) * scale;
    const screenY = groundY - yLift * scale;

    return { screenX, screenY, groundY, scale, relZ };
  }

  update(players, fallbackControls, level, speedMultiplier, callbacks) {
    const { onCollect, onShirleyBounce, onHitObstacle } = callbacks;

    if (this.bannerTimer > 0) this.bannerTimer--;

    const runSpeed = (8.8 + (level - 1) * 1.25) * speedMultiplier;
    this.distance += runSpeed;

    while (this.spawnCursorZ < this.distance + 2400) {
      this.spawnFarmRow(level);
    }

    const activeCount = Math.min(2, Math.max(1, players.length));
    this.activeRunnerCount = activeCount;

    for (let i = 0; i < activeCount; i++) {
      const r = this.runners[i];
      const p = players[i];

      // Map player's mirrored horizontal camera position [0.12 .. 0.88] across track [-0.82 .. 0.82]
      const rawTargetX = ((p.mirroredX ?? 0.5) - 0.5) * 2.15;
      const clampedTargetX = Math.max(-0.82, Math.min(0.82, rawTargetX));
      r.xNorm += (clampedTargetX - r.xNorm) * 0.28;

      // Arm reach offsets for grabbing apples/pizzas!
      if (p.leftHand) {
        r.leftArmOffset.x += ((-p.leftHand.x * 42) - r.leftArmOffset.x) * 0.45;
        r.leftArmOffset.y += ((p.leftHand.y * 42) - r.leftArmOffset.y) * 0.45;
      }
      if (p.rightHand) {
        r.rightArmOffset.x += ((-p.rightHand.x * 42) - r.rightArmOffset.x) * 0.45;
        r.rightArmOffset.y += ((p.rightHand.y * 42) - r.rightArmOffset.y) * 0.45;
      }

      // Jump trigger: camera jump OR both hands thrust high OR keyboard Space/Up
      const handsThrustHigh = p.leftHand && p.rightHand && p.leftHand.y < -0.38 && p.rightHand.y < -0.38;
      const jumpRequested = !!p.isJumping || handsThrustHigh || (i === 0 && fallbackControls.jump);

      if (jumpRequested && !r.wasJumpingInput && !r.isJumping) {
        r.isJumping = true;
        r.isSuperBounce = false;
        r.vy = 16.5;
      }
      r.wasJumpingInput = jumpRequested;

      // Duck trigger: camera squat/bow OR keyboard ArrowDown
      const duckRequested = !r.isJumping && (!!p.isDucking || (i === 0 && fallbackControls.duck));
      r.isDucking = duckRequested;
      r.duckAmount += ((r.isDucking ? 1 : 0) - r.duckAmount) * 0.35;

      // Vertical jump physics
      if (r.isJumping) {
        r.jumpY += r.vy;
        r.vy -= r.isSuperBounce ? 0.68 : 0.88;
        if (r.jumpY <= 0) {
          r.jumpY = 0;
          r.vy = 0;
          r.isJumping = false;
          r.isSuperBounce = false;
        }
      }

      r.runPhase += 0.34 * speedMultiplier;
      if (r.invulnTimer > 0) r.invulnTimer--;

      const proj = this.project(r.xNorm, this.distance + 110, 0);
      r.screenX = proj.screenX;
      r.screenY = this.runnerGroundY - r.jumpY;
    }

    // Update & check collisions with farm obstacles, Shirley, Timmy & Pizza collectibles!
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (ent.squish > 0) ent.squish *= 0.85;

      const relZ = ent.z - this.distance;
      if (relZ < -50) {
        this.entities.splice(i, 1);
        continue;
      }

      // Check collision around runner Z plane (relZ ~ 110)
      if (!ent.hit && relZ <= 152 && relZ >= 68) {
        const proj = this.project(ent.xNorm, ent.z, ent.yLift || 0);

        for (let rIdx = 0; rIdx < activeCount; rIdx++) {
          const r = this.runners[rIdx];
          const dx = Math.abs(r.screenX - proj.screenX);

          // 1. Collectibles (Pizza, Apple, High Pizza, Timmy Bonus!)
          if (ent.type === 'pizza' || ent.type === 'pizza_high' || ent.type === 'apple' || ent.type === 'timmy_bonus') {
            // Check body proximity OR stretched hand proximity
            const bodyCenterY = r.screenY - 52 + r.duckAmount * 24;
            const dy = Math.abs(bodyCenterY - proj.screenY);
            const armSpanBonus = Math.max(Math.abs(r.leftArmOffset.x), Math.abs(r.rightArmOffset.x)) * 0.8;

            if (dx < 78 + armSpanBonus && dy < 88) {
              ent.hit = true;
              this.pizzaCombo++;
              const pts = ent.type === 'timmy_bonus' ? 40 : (ent.type === 'pizza' || ent.type === 'pizza_high' ? 20 : 15);
              if (ent.type === 'timmy_bonus') {
                this.bannerTimer = 60;
                this.bannerText = '👶🧸 TIMMY TEDDY BONUS! +40!';
                this.bannerColor = '#fde047';
              }
              if (onCollect) onCollect(proj.screenX, proj.screenY, ent.type, pts, this.pizzaCombo);
              break;
            }
          }
          // 2. SHIRLEY Wool Trampoline!
          else if (ent.type === 'shirley') {
            if (dx < 82 && r.jumpY < 95) {
              ent.hit = true;
              ent.squish = 1.0;
              r.isJumping = true;
              r.isSuperBounce = true;
              r.vy = 22.5; // Massive woolly sky bounce!
              this.bannerTimer = 70;
              this.bannerText = '🐑 BOING!! SHIRLEY WOOL TRAMPOLINE!';
              this.bannerColor = '#f472b6';
              if (onShirleyBounce) onShirleyBounce(proj.screenX, proj.groundY - 45);
              break;
            }
          }
          // 3. Low Obstacles (Hay Bale, Stone Wall, Naughty Pigs Mud) -> Cleared if jumping high enough!
          else if (ent.type === 'haybale' || ent.type === 'stone_wall' || ent.type === 'pigs_mud') {
            const requiredJump = ent.type === 'pigs_mud' ? 36 : 52;
            if (dx < 62 && r.jumpY < requiredJump) {
              ent.hit = true;
              if (r.invulnTimer <= 0) {
                r.invulnTimer = 72;
                this.pizzaCombo = 0;
                this.bannerTimer = 60;
                this.bannerText = ent.type === 'pigs_mud'
                  ? '🐷💦 SPLAT! JUMP OVER NAUGHTY PIGS!'
                  : '🌾 OOPS! JUMP OVER HAY BALES & WALLS!';
                this.bannerColor = '#f43f5e';
                if (onHitObstacle) onHitObstacle(proj.screenX, proj.groundY - 30);
              }
              break;
            }
          }
          // 4. Overhead Laundry / Barn Beam Gate -> Cleared if DUCKING (or sky-high Shirley bounce > 145)!
          else if (ent.type === 'laundry_gate') {
            if (dx < 68 && r.duckAmount < 0.45 && r.jumpY < 145) {
              ent.hit = true;
              if (r.invulnTimer <= 0) {
                r.invulnTimer = 72;
                this.pizzaCombo = 0;
                this.bannerTimer = 60;
                this.bannerText = '🧺 BONK! SQUAT / DUCK UNDER CLOTHESLINES!';
                this.bannerColor = '#f59e0b';
                if (onHitObstacle) onHitObstacle(proj.screenX, proj.groundY - 85);
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

    ctx.save();

    // 1. Bright British Countryside Sky & Fluffy Aardman Clouds
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.65, '#7dd3fc');
    skyGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this.horizonY + 4);

    this.drawFluffySkyCloud(ctx, (w * 0.18 + frameCount * 0.25) % (w + 160) - 80, this.horizonY * 0.42, 34);
    this.drawFluffySkyCloud(ctx, (w * 0.72 + frameCount * 0.18) % (w + 160) - 80, this.horizonY * 0.34, 42);

    // Rolling Yorkshire Green Pastures on Horizon
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(w * 0.25, this.horizonY + 18, w * 0.38, 52, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(w * 0.76, this.horizonY + 22, w * 0.42, 60, 0, Math.PI, 0);
    ctx.fill();

    // Mossy Bottom Stone Farmhouse, Corrugated Barn & Clueless Farmer on the Horizon!
    this.drawMossyBottomHorizon(ctx, w * 0.5, this.horizonY, frameCount);

    // 2. 3-Lane Farm Dirt & Grass Track with Dry-Stone Borders
    const meadowGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
    meadowGrad.addColorStop(0, '#22c55e');
    meadowGrad.addColorStop(0.45, '#16a34a');
    meadowGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = meadowGrad;
    ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

    // Perspective dirt path polygon
    const farLeft = this.project(-0.92, this.distance + 2100, 0);
    const farRight = this.project(0.92, this.distance + 2100, 0);
    const nearLeft = this.project(-0.92, this.distance + 30, 0);
    const nearRight = this.project(0.92, this.distance + 30, 0);

    const trackGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
    trackGrad.addColorStop(0, '#d6b88d');
    trackGrad.addColorStop(0.5, '#c29b68');
    trackGrad.addColorStop(1, '#a67c49');
    ctx.fillStyle = trackGrad;
    ctx.beginPath();
    ctx.moveTo(farLeft.screenX, farLeft.groundY);
    ctx.lineTo(farRight.screenX, farRight.groundY);
    ctx.lineTo(nearRight.screenX, nearRight.groundY);
    ctx.lineTo(nearLeft.screenX, nearLeft.groundY);
    ctx.closePath();
    ctx.fill();

    // Scrolling turf stripes & stone wall posts along both sides of the track
    const stripeStep = 130;
    const firstZ = Math.floor(this.distance / stripeStep) * stripeStep + stripeStep;
    for (let z = firstZ + 1950; z >= this.distance + 40; z -= stripeStep) {
      const L = this.project(-0.95, z, 0);
      const R = this.project(0.95, z, 0);
      const laneDiv1 = this.project(-0.28, z, 0);
      const laneDiv2 = this.project(0.28, z, 0);

      // Subtle dashed lane guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = Math.max(1, 3 * L.scale);
      ctx.beginPath();
      ctx.moveTo(laneDiv1.screenX, laneDiv1.groundY);
      ctx.lineTo(laneDiv1.screenX, laneDiv1.groundY + 12 * L.scale);
      ctx.moveTo(laneDiv2.screenX, laneDiv2.groundY);
      ctx.lineTo(laneDiv2.screenX, laneDiv2.groundY + 12 * L.scale);
      ctx.stroke();

      // Yorkshire Dry-Stone Border Stones on Left & Right edges
      const stoneR = Math.max(2.5, 16 * L.scale);
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1, 2 * L.scale);
      ctx.beginPath();
      ctx.ellipse(L.screenX, L.groundY - stoneR * 0.4, stoneR * 1.1, stoneR * 0.75, 0, 0, Math.PI * 2);
      ctx.ellipse(R.screenX, R.groundY - stoneR * 0.4, stoneR * 1.1, stoneR * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Render Farm Obstacles, Shirley, Timmy & Pizza Collectibles Back-to-Front!
    const visibleEntities = [...this.entities]
      .filter(e => (!e.hit || e.type === 'shirley') && (e.z - this.distance) < 2150 && (e.z - this.distance) > 15)
      .sort((a, b) => b.z - a.z);

    for (const ent of visibleEntities) {
      const proj = this.project(ent.xNorm, ent.z, ent.yLift || 0);
      const s = proj.scale;

      if (ent.type === 'haybale') {
        this.drawHayBale(ctx, proj.screenX, proj.groundY, s, frameCount);
      } else if (ent.type === 'stone_wall') {
        this.drawStoneWallObstacle(ctx, proj.screenX, proj.groundY, s);
      } else if (ent.type === 'pigs_mud') {
        this.drawNaughtyPigsMud(ctx, proj.screenX, proj.groundY, s, frameCount);
      } else if (ent.type === 'laundry_gate') {
        this.drawLaundryGate(ctx, proj.screenX, proj.groundY, s, frameCount);
      } else if (ent.type === 'shirley') {
        this.drawShirleyCharacter(ctx, proj.screenX, proj.groundY, s, frameCount, ent.squish || 0);
      } else if (!ent.hit && (ent.type === 'pizza' || ent.type === 'pizza_high')) {
        this.drawPizzaCollectible(ctx, proj.screenX, proj.screenY, s, frameCount);
      } else if (!ent.hit && ent.type === 'apple') {
        this.drawAppleCollectible(ctx, proj.screenX, proj.screenY, s, frameCount);
      } else if (!ent.hit && ent.type === 'timmy_bonus') {
        this.drawTimmyBonus(ctx, proj.screenX, proj.groundY, s, frameCount);
      }
    }

    // 4. Draw Active Player Characters: Player 1 = SHAUN, Player 2 = BITZER!
    const count = this.activeRunnerCount || 1;
    for (let i = count - 1; i >= 0; i--) {
      const r = this.runners[i];
      if (r.invulnTimer > 0 && Math.floor(frameCount / 4) % 2 === 1) continue;

      if (r.character === 'shaun') {
        this.drawShaunCharacter(ctx, r, frameCount);
      } else {
        this.drawBitzerCharacter(ctx, r, frameCount);
      }
    }

    // 5. Posture Status Pill (Bottom-Left: Standing / JUMPING! / DUCKING!)
    this.drawPostureBadge(ctx, this.runners[0]);

    // 6. Top Event / Instruction Banner
    if (this.bannerTimer > 0) {
      ctx.save();
      const pulse = 1 + Math.sin(frameCount * 0.25) * 0.04;
      ctx.translate(w / 2, 128);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.bannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-245, -25, 490, 50, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 21px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  // =========================================================================
  // AUTHENTIC AARDMAN CLAYMATION CHARACTER RENDERERS (From /about/ Reference)
  // =========================================================================

  /**
   * SHAUN THE SHEEP (Player 1)
   * Cream curly wool body, matte charcoal-black pear snout, side-cheek white toothy grin,
   * purple-grey heavy eyelids over touching white eyes, signature top wool tuft,
   * long horizontal drooping black ears, and thin black limbs!
   */
  drawShaunCharacter(ctx, r, frameCount) {
    const x = r.screenX;
    const groundY = this.runnerGroundY;
    const y = r.screenY;
    const duck = r.duckAmount; // 0 = upright running, 1 = tucked wool ball

    ctx.save();

    // Ground shadow
    const shadowScale = Math.max(0.35, 1 - r.jumpY / 260);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 8, 44 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounceBob = r.isJumping ? 0 : Math.abs(Math.sin(r.runPhase)) * 7;
    const bodyCenterY = y - 52 + duck * 24 - bounceBob;

    // 1. Thin Matte-Black Running Legs & Cloven Hooves
    const legSwingL = r.isJumping ? -12 : Math.sin(r.runPhase) * 16 * (1 - duck * 0.6);
    const legSwingR = r.isJumping ? -12 : Math.sin(r.runPhase + Math.PI) * 16 * (1 - duck * 0.6);

    ctx.strokeStyle = '#1f2024';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 14, bodyCenterY + 24);
    ctx.lineTo(x - 16, y - 4 + Math.min(0, legSwingL));
    ctx.moveTo(x + 14, bodyCenterY + 24);
    ctx.lineTo(x + 16, y - 4 + Math.min(0, legSwingR));
    ctx.stroke();

    // Hooves
    ctx.fillStyle = '#111215';
    ctx.beginPath();
    ctx.ellipse(x - 16, y - 3 + Math.min(0, legSwingL), 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 16, y - 3 + Math.min(0, legSwingR), 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thin Matte-Black Clay Arms reaching with player's real hands!
    const armLX = x - 38 + r.leftArmOffset.x * 0.65;
    const armLY = bodyCenterY - 4 + r.leftArmOffset.y * 0.55 - (r.isJumping ? 20 : 0);
    const armRX = x + 38 + r.rightArmOffset.x * 0.65;
    const armRY = bodyCenterY - 4 + r.rightArmOffset.y * 0.55 - (r.isJumping ? 20 : 0);

    ctx.strokeStyle = '#232429';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x - 24, bodyCenterY - 8);
    ctx.quadraticCurveTo(x - 36, bodyCenterY + 2, armLX, armLY);
    ctx.moveTo(x + 24, bodyCenterY - 8);
    ctx.quadraticCurveTo(x + 36, bodyCenterY + 2, armRX, armRY);
    ctx.stroke();

    // Cute clay hands (thumbs-up silhouette when jumping!)
    ctx.fillStyle = '#26272c';
    ctx.beginPath();
    ctx.arc(armLX, armLY, 7, 0, Math.PI * 2);
    ctx.arc(armRX, armRY, 7, 0, Math.PI * 2);
    ctx.fill();

    // 3. Curly Cream-White Wool Fleece Torso (Multi-puff scalloped silhouette + warm clay gradient)
    const torsoRx = 33 + duck * 8;
    const torsoRy = 36 - duck * 12;
    const woolGrad = ctx.createRadialGradient(x - 8, bodyCenterY - 8, 6, x, bodyCenterY, torsoRx + 10);
    woolGrad.addColorStop(0, '#fcfaf2');
    woolGrad.addColorStop(0.7, '#f2ecda');
    woolGrad.addColorStop(1, '#dcd3bc');

    ctx.fillStyle = woolGrad;
    ctx.beginPath();
    ctx.ellipse(x, bodyCenterY, torsoRx, torsoRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scalloped curly fleece puffs around perimeter
    const puffCount = 10;
    for (let p = 0; p < puffCount; p++) {
      const ang = (p / puffCount) * Math.PI * 2;
      const px = x + Math.cos(ang) * (torsoRx - 3);
      const py = bodyCenterY + Math.sin(ang) * (torsoRy - 3);
      ctx.beginPath();
      ctx.arc(px, py, 13, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Shaun's Head (Matte Charcoal-Black Clay Pear Snout, Ears, Purple-Grey Eyelids & Top Wool Tuft)
    const headX = x;
    const headY = bodyCenterY - torsoRy - 14 + duck * 18;
    const earBounce = Math.sin(r.runPhase * 2) * 0.08 + (duck * 0.35);

    ctx.save();
    ctx.translate(headX, headY);

    // Long Horizontal Drooping Sheep Ears (left & right)
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 16, -8);
      ctx.rotate(side * (0.18 + earBounce));
      ctx.fillStyle = '#24252a';
      ctx.beginPath();
      ctx.ellipse(side * 18, 2, 20, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Scooped inner ear hollow
      ctx.fillStyle = '#141518';
      ctx.beginPath();
      ctx.ellipse(side * 18, 3, 13, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Iconic Side-Cheek Toothy Grin Pouch (on Shaun's left cheek, matching /about/ photo!)
    ctx.fillStyle = '#24252a';
    ctx.beginPath();
    ctx.arc(-18, 3, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-18, 3, 6.2, Math.PI * 0.55, Math.PI * 1.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-22, 1); ctx.lineTo(-17, 2);
    ctx.moveTo(-22, 5); ctx.lineTo(-17, 4);
    ctx.stroke();

    // Elongated Pear-Shaped Matte-Black Clay Face/Snout
    const faceGrad = ctx.createRadialGradient(-4, -2, 3, 0, 2, 26);
    faceGrad.addColorStop(0, '#43454d'); // Subtle matte clay specular highlight on snout bridge
    faceGrad.addColorStop(0.45, '#27282d');
    faceGrad.addColorStop(1, '#16171a');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.moveTo(-14, -15);
    ctx.quadraticCurveTo(0, -22, 14, -15);
    ctx.quadraticCurveTo(21, 5, 16, 16);
    ctx.quadraticCurveTo(0, 24, -16, 16);
    ctx.quadraticCurveTo(-21, 5, -14, -15);
    ctx.closePath();
    ctx.fill();

    // Two Sculpted Nostrils at bottom of snout
    ctx.fillStyle = '#0c0d0f';
    ctx.beginPath();
    ctx.ellipse(-7, 13, 2.8, 3.6, -0.2, 0, Math.PI * 2);
    ctx.ellipse(7, 13, 2.8, 3.6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Touching White Round Aardman Eyes high on brow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6.5, -8, 7.2, 0, Math.PI * 2);
    ctx.arc(6.5, -8, 7.2, 0, Math.PI * 2);
    ctx.fill();

    // Black Pupils
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-5.8, -7.5, 3.1, 0, Math.PI * 2);
    ctx.arc(5.8, -7.5, 3.1, 0, Math.PI * 2);
    ctx.fill();

    // White eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6.8, -8.8, 1.1, 0, Math.PI * 2);
    ctx.arc(4.8, -8.8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Signature Purple-Grey / Mauve Heavy Clay Eyelids across top of eyes!
    ctx.strokeStyle = '#8d7d96';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-6.5, -8, 7.2, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6.5, -8, 7.2, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    // Signature Fluffy Cream-White Top Wool Tuft Crown!
    ctx.fillStyle = '#f8f5e9';
    const tuftPuffs = [
      { dx: 0, dy: -22, rad: 10.5 },
      { dx: -10, dy: -19, rad: 8.5 },
      { dx: 10, dy: -19, rad: 8.5 },
      { dx: -5, dy: -25, rad: 8 },
      { dx: 5, dy: -25, rad: 8 }
    ];
    for (const tp of tuftPuffs) {
      ctx.beginPath();
      ctx.arc(tp.dx, tp.dy, tp.rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * BITZER THE SHEEPDOG (Player 2 Co-op!)
   * Golden-tan clay coat, signature blue knitted beanie, floppy brown ears,
   * close-set eyes, giant shiny matte-black nose, black collar, and wristwatch!
   */
  drawBitzerCharacter(ctx, r, frameCount) {
    const x = r.screenX;
    const groundY = this.runnerGroundY;
    const y = r.screenY;
    const duck = r.duckAmount;

    ctx.save();

    // Ground shadow
    const shadowScale = Math.max(0.35, 1 - r.jumpY / 260);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 8, 42 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounceBob = r.isJumping ? 0 : Math.abs(Math.sin(r.runPhase)) * 7;
    const bodyCenterY = y - 52 + duck * 24 - bounceBob;

    // Legs
    const legSwingL = r.isJumping ? -12 : Math.sin(r.runPhase) * 16 * (1 - duck * 0.6);
    const legSwingR = r.isJumping ? -12 : Math.sin(r.runPhase + Math.PI) * 16 * (1 - duck * 0.6);
    ctx.strokeStyle = '#c9903b';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 13, bodyCenterY + 24);
    ctx.lineTo(x - 14, y - 4 + Math.min(0, legSwingL));
    ctx.moveTo(x + 13, bodyCenterY + 24);
    ctx.lineTo(x + 14, y - 4 + Math.min(0, legSwingR));
    ctx.stroke();

    // Arms + Signature Wristwatch on left wrist!
    const armLX = x - 36 + r.leftArmOffset.x * 0.65;
    const armLY = bodyCenterY - 2 + r.leftArmOffset.y * 0.55;
    const armRX = x + 36 + r.rightArmOffset.x * 0.65;
    const armRY = bodyCenterY - 2 + r.rightArmOffset.y * 0.55;

    ctx.strokeStyle = '#dca755';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x - 22, bodyCenterY - 8);
    ctx.lineTo(armLX, armLY);
    ctx.moveTo(x + 22, bodyCenterY - 8);
    ctx.lineTo(armRX, armRY);
    ctx.stroke();

    // Wristwatch band on left arm
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc((x - 22 + armLX) * 0.5, (bodyCenterY - 8 + armLY) * 0.5, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Golden-Tan Clay Body
    const bodyGrad = ctx.createRadialGradient(x - 6, bodyCenterY - 6, 5, x, bodyCenterY, 36);
    bodyGrad.addColorStop(0, '#ecc074');
    bodyGrad.addColorStop(0.65, '#dca755');
    bodyGrad.addColorStop(1, '#b88030');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, bodyCenterY + 2, 28 + duck * 6, 35 - duck * 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black Dog Collar
    const headY = bodyCenterY - 44 + duck * 16;
    ctx.fillStyle = '#1e2024';
    ctx.beginPath();
    ctx.roundRect(x - 18, headY + 18, 36, 8, 4);
    ctx.fill();

    // Bitzer's Head
    ctx.save();
    ctx.translate(x, headY);

    // Floppy Dark-Brown Dog Ears
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.ellipse(-20, -2, 8, 18, 0.35, 0, Math.PI * 2);
    ctx.ellipse(20, -2, 8, 18, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Tall Golden-Yellow Clay Head
    ctx.fillStyle = '#dca755';
    ctx.beginPath();
    ctx.ellipse(0, -2, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pink Tongue & Happy Toothy Grin
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(8, 16, 6, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Small Close-Set White Eyes High on Brow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.5, -11, 4.6, 0, Math.PI * 2);
    ctx.arc(4.5, -11, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-4.2, -11, 2.1, 0, Math.PI * 2);
    ctx.arc(4.2, -11, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // GIANT Rounded Matte-Black Nose (Bitzer's #1 trademark!)
    const noseGrad = ctx.createRadialGradient(-4, 2, 2, 0, 5, 16);
    noseGrad.addColorStop(0, '#525660');
    noseGrad.addColorStop(0.4, '#26282c');
    noseGrad.addColorStop(1, '#121316');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.ellipse(0, 5, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Signature Blue Knitted Beanie Hat on top!
    ctx.fillStyle = '#1d6fa5';
    ctx.beginPath();
    ctx.arc(0, -16, 15, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#15527a';
    ctx.beginPath();
    ctx.roundRect(-16, -19, 32, 6, 3);
    ctx.fill();

    // Label tag above Bitzer
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BITZER (2P)', 0, -34);

    ctx.restore();
    ctx.restore();
  }

  /**
   * SHIRLEY (Giant Spherical Wool Trampoline Friend!)
   * Extra-wide, nearly spherical fluffy fleece with tiny black head & thumbs-up!
   */
  drawShirleyCharacter(ctx, x, groundY, scale, frameCount, squish = 0) {
    const r = 64 * scale;
    if (r < 5) return;

    ctx.save();
    const rx = r * (1.18 + squish * 0.28);
    const ry = r * (1.02 - squish * 0.25);
    const cy = groundY - ry;

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 4 * scale, rx * 0.9, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny legs peeking under giant fleece
    ctx.fillStyle = '#1e2024';
    ctx.fillRect(x - 18 * scale, groundY - 12 * scale, 8 * scale, 12 * scale);
    ctx.fillRect(x + 10 * scale, groundY - 12 * scale, 8 * scale, 12 * scale);

    // Huge Spherical Cream Wool Body
    const shGrad = ctx.createRadialGradient(x - rx * 0.25, cy - ry * 0.25, r * 0.1, x, cy, rx);
    shGrad.addColorStop(0, '#fdfbf4');
    shGrad.addColorStop(0.7, '#f2ebd9');
    shGrad.addColorStop(1, '#d6ccb4');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy cloud scallops around Shirley
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92, 16 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comparatively Small Matte-Black Head perched high on Shirley's wool!
    const hx = x - rx * 0.22;
    const hy = cy - ry * 0.72;
    ctx.fillStyle = '#24252a';
    ctx.beginPath();
    ctx.ellipse(hx - 14 * scale, hy - 2 * scale, 8 * scale, 3.5 * scale, -0.2, 0, Math.PI * 2);
    ctx.ellipse(hx + 14 * scale, hy - 2 * scale, 8 * scale, 3.5 * scale, 0.2, 0, Math.PI * 2);
    ctx.ellipse(hx, hy + 2 * scale, 13 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirley's happy eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx - 4 * scale, hy - 3 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.arc(hx + 4 * scale, hy - 3 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hx - 4 * scale, hy - 3 * scale, 1.6 * scale, 0, Math.PI * 2);
    ctx.arc(hx + 4 * scale, hy - 3 * scale, 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Bouncy indicator badge above Shirley
    if (r > 18) {
      ctx.fillStyle = '#ec4899';
      ctx.font = `700 ${Math.max(11, Math.round(16 * scale))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('BOUNCE ON SHIRLEY! ⬆️', x, cy - ry - 18 * scale);
    }

    ctx.restore();
  }

  /**
   * TIMMY & ORANGE TEDDY BONUS CRATE
   * Smooth dark baby lamb head (no top wool tuft), round eyes, yellow pacifier/dummy & orange teddy!
   */
  drawTimmyBonus(ctx, x, groundY, scale, frameCount) {
    const r = 34 * scale;
    if (r < 4) return;

    const bob = Math.sin(frameCount * 0.15) * 6 * scale;
    const cy = groundY - 36 * scale + bob;

    ctx.save();
    // Glowing golden aura
    ctx.shadowBlur = 18 * scale;
    ctx.shadowColor = '#fde047';

    // Little cream woolly lamb body
    ctx.fillStyle = '#f8f5e9';
    ctx.beginPath();
    ctx.arc(x, cy + 8 * scale, 20 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Smooth dark head (no top wool tuft!)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#27282d';
    ctx.beginPath();
    ctx.ellipse(x - 16 * scale, cy - 8 * scale, 8 * scale, 3.5 * scale, -0.25, 0, Math.PI * 2);
    ctx.ellipse(x + 16 * scale, cy - 8 * scale, 8 * scale, 3.5 * scale, 0.25, 0, Math.PI * 2);
    ctx.arc(x, cy - 8 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Big cute baby lamb eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 4.5 * scale, cy - 11 * scale, 4.2 * scale, 0, Math.PI * 2);
    ctx.arc(x + 4.5 * scale, cy - 11 * scale, 4.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x - 4.2 * scale, cy - 11 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.arc(x + 4.2 * scale, cy - 11 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Signature Yellow Dummy / Pacifier!
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, cy - 1 * scale, 4.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.arc(x, cy + 2 * scale, 4.5 * scale, 0, Math.PI);
    ctx.stroke();

    // Fuzzy Orange Teddy Bear beside Timmy!
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(x + 16 * scale, cy + 8 * scale, 9 * scale, 0, Math.PI * 2);
    ctx.arc(x + 11 * scale, cy + 1 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.arc(x + 21 * scale, cy + 1 * scale, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * MOSSY BOTTOM FARMHOUSE, BARN & THE FARMER ON THE HORIZON
   * Includes The Farmer's square glasses, ginger side-hair, cream cable-knit sweater & olive coat!
   */
  drawMossyBottomHorizon(ctx, centerX, horizonY, frameCount) {
    ctx.save();

    // Stone Farmhouse on Left-Center Horizon
    const fx = centerX - 140;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(fx - 42, horizonY - 46, 84, 48);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(fx - 48, horizonY - 46);
    ctx.lineTo(fx, horizonY - 76);
    ctx.lineTo(fx + 48, horizonY - 46);
    ctx.closePath();
    ctx.fill();
    // Warm lit farmhouse windows
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(fx - 26, horizonY - 34, 16, 16);
    ctx.fillRect(fx + 10, horizonY - 34, 16, 16);

    // Weathered Corrugated Barn on Right-Center Horizon
    const bx = centerX + 145;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bx - 48, horizonY - 38, 96, 40);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(bx, horizonY - 38, 48, Math.PI, 0);
    ctx.fill();

    // THE FARMER peeking beside the Farmhouse (Ginger tufts, square glasses, cream turtleneck, olive coat!)
    const farmerBob = Math.sin(frameCount * 0.05) * 2;
    const tx = centerX - 65;
    const ty = horizonY - 4 + farmerBob;

    // Olive green coat & cream cable-knit turtleneck
    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.roundRect(tx - 15, ty - 22, 30, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(tx - 8, ty - 25, 16, 14);

    // Tall pale head & ginger side-hair tufts
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(tx - 10, ty - 38, 5, 0, Math.PI * 2);
    ctx.arc(tx + 10, ty - 38, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.roundRect(tx - 9, ty - 46, 18, 23, 7);
    ctx.fill();

    // Square Dark-Rimmed Glasses obscuring eyes + big nose
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(tx - 10, ty - 40, 9, 7);
    ctx.fillRect(tx + 1, ty - 40, 9, 7);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx - 10, ty - 40, 9, 7);
    ctx.strokeRect(tx + 1, ty - 40, 9, 7);

    ctx.restore();
  }

  // =========================================================================
  // OBSTACLES & COLLECTIBLES RENDERERS
  // =========================================================================

  drawHayBale(ctx, x, groundY, scale, frameCount) {
    const r = 44 * scale;
    if (r < 4) return;
    const cy = groundY - r * 0.88;

    ctx.save();
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.beginPath();
    ctx.ellipse(x, cy, r * 1.18, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spiral rolled straw swirl + twine bands
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = Math.max(1, 2.5 * scale);
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.55, 0, Math.PI * 1.6);
    ctx.stroke();

    if (r > 18) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${Math.max(10, Math.round(14 * scale))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('JUMP! ⬆️', x, cy - r - 8 * scale);
    }
    ctx.restore();
  }

  drawStoneWallObstacle(ctx, x, groundY, scale) {
    const w = 104 * scale;
    const h = 58 * scale;
    if (w < 6) return;

    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(1.5, 3 * scale);
    ctx.beginPath();
    ctx.roundRect(x - w / 2, groundY - h, w, h, 10 * scale);
    ctx.fill();
    ctx.stroke();

    // Cobblestone mortar pattern
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(x - w * 0.24, groundY - h * 0.65, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.2, groundY - h * 0.65, w * 0.2, h * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(x, groundY - h * 0.28, w * 0.22, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawNaughtyPigsMud(ctx, x, groundY, scale, frameCount) {
    const rx = 58 * scale;
    const ry = 20 * scale;
    if (rx < 5) return;

    ctx.save();
    // Muddy Puddle
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.ellipse(x, groundY - ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheeky Pink Naughty Pig peeking out of the mud!
    const pigBob = Math.sin(frameCount * 0.2) * 3 * scale;
    const py = groundY - 26 * scale + pigBob;
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(x, py, 22 * scale, 0, Math.PI * 2);
    // Pointed pig ears
    ctx.arc(x - 16 * scale, py - 16 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.arc(x + 16 * scale, py - 16 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Pig snout
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(x, py + 4 * scale, 11 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#881337';
    ctx.beginPath();
    ctx.arc(x - 4 * scale, py + 4 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.arc(x + 4 * scale, py + 4 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Squinty mischievous eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 7 * scale, py - 6 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.arc(x + 7 * scale, py - 6 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x - 7 * scale, py - 6 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.arc(x + 7 * scale, py - 6 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * OVERHEAD DUCK GATE (Timmy's Mum's Laundry Clothesline with Pink Hair Rollers & Sweaters!)
   */
  drawLaundryGate(ctx, x, groundY, scale, frameCount) {
    const postHalfW = 58 * scale;
    const beamH = 128 * scale;
    const clearanceH = 68 * scale; // Open gap underneath for squatting Shaun!
    if (postHalfW < 5) return;

    ctx.save();
    // Left & Right Wooden Clothesline Posts
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - postHalfW - 6 * scale, groundY - beamH, 10 * scale, beamH);
    ctx.fillRect(x + postHalfW - 4 * scale, groundY - beamH, 10 * scale, beamH);

    // Overhead Rope / Wooden Crossbar
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(x - postHalfW, groundY - beamH + 6 * scale);
    ctx.lineTo(x + postHalfW, groundY - beamH + 6 * scale);
    ctx.stroke();

    // Hanging Knitted Sweater & Timmy's Mum's Pink Hair Rollers!
    const sway = Math.sin(frameCount * 0.12) * 4 * scale;
    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.roundRect(x - 36 * scale + sway, groundY - beamH + 8 * scale, 72 * scale, beamH - clearanceH, 8 * scale);
    ctx.fill();
    ctx.stroke();

    // Pink-and-white hair-roller badges along top bar
    ctx.fillStyle = '#fbcfe8';
    for (const dx of [-24, 0, 24]) {
      ctx.beginPath();
      ctx.roundRect(x + (dx - 7) * scale, groundY - beamH, 14 * scale, 8 * scale, 4 * scale);
      ctx.fill();
    }

    if (postHalfW > 20) {
      ctx.fillStyle = '#fef08a';
      ctx.font = `700 ${Math.max(11, Math.round(16 * scale))}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('DUCK! ⬇️', x + sway, groundY - beamH * 0.72);
    }

    ctx.restore();
  }

  drawPizzaCollectible(ctx, x, y, scale, frameCount) {
    const r = 28 * scale;
    if (r < 4) return;
    const hover = Math.sin(frameCount * 0.15 + x) * 5 * scale;

    ctx.save();
    ctx.translate(x, y + hover);
    ctx.shadowBlur = 16 * scale;
    ctx.shadowColor = '#f59e0b';

    // Golden crust & melted mozzarella triangle ("Pizza The Action!")
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = Math.max(1.5, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.lineTo(-r * 0.85, -r * 0.75);
    ctx.quadraticCurveTo(0, -r * 1.05, r * 0.85, -r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pepperoni toppings
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.2, r * 0.18, 0, Math.PI * 2);
    ctx.arc(0, r * 0.25, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawAppleCollectible(ctx, x, y, scale, frameCount) {
    const r = 23 * scale;
    if (r < 4) return;
    const hover = Math.cos(frameCount * 0.15 + x) * 5 * scale;

    ctx.save();
    ctx.translate(x, y + hover);
    ctx.shadowBlur = 14 * scale;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.95, r * 0.38, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFluffySkyCloud(ctx, cx, cy, s) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.75, cy - s * 0.2, s * 0.8, 0, Math.PI * 2);
    ctx.arc(cx + s * 1.45, cy + s * 0.05, s * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPostureBadge(ctx, runner) {
    const gx = 96;
    const gy = this.h - 42;
    let statusText = '🐑 RUNNING';
    let borderCol = '#38bdf8';

    if (runner.isJumping) {
      statusText = runner.isSuperBounce ? '🚀 SHIRLEY FLY!' : '⬆️ JUMPING!';
      borderCol = '#4ade80';
    } else if (runner.duckAmount > 0.45) {
      statusText = '⬇️ DUCKING!';
      borderCol = '#facc15';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(gx - 76, gy - 20, 152, 40, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, gx, gy + 1);
    ctx.restore();
  }
}
