/**
 * hockey.js
 * Neon Air Hockey Rink, Puck, Mallet Physics & Robo-Bot AI for Kids Motion Playground.
 * Supports 1-Player (Left vs Cyber-Bot) and 2-Player 1v1 Competitive (Left Player vs Right Player)!
 */

export class HockeyGame {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;

    // Rink bounds (leaves room at top for the HUD bar)
    this.rink = { left: 28, right: canvasWidth - 28, top: 108, bottom: canvasHeight - 24 };
    this.goalHalfHeight = 95;

    // Scoreboard
    this.leftScore = 0;
    this.rightScore = 0;

    // Puck state
    this.puck = {
      x: canvasWidth / 2,
      y: (108 + canvasHeight - 24) / 2,
      vx: 6,
      vy: 3.5,
      radius: 24,
      color: '#facc15',
      trail: []
    };

    // Tracked mallets with previous frame velocity for crisp slap-shots
    this.mallets = new Map();

    // Cyber-Bot AI state (used when only 1 human player is present)
    this.bot = {
      x: canvasWidth * 0.82,
      y: (108 + canvasHeight - 24) / 2,
      vx: 0,
      vy: 0,
      radius: 36
    };

    // Goal celebration banner timer
    this.goalBannerTimer = 0;
    this.goalBannerText = '';
    this.goalBannerColor = '#38bdf8';

    this.resize(canvasWidth, canvasHeight);
    this.resetPuck(1);
  }

  resize(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.rink = {
      left: 28,
      right: canvasWidth - 28,
      top: Math.min(112, Math.max(92, canvasHeight * 0.15)),
      bottom: canvasHeight - 24
    };
    const rinkH = this.rink.bottom - this.rink.top;
    this.goalHalfHeight = Math.max(75, Math.min(125, rinkH * 0.24));
  }

  resetScores() {
    this.leftScore = 0;
    this.rightScore = 0;
    this.goalBannerTimer = 0;
    this.mallets.clear();
    this.resetPuck(Math.random() < 0.5 ? -1 : 1);
  }

  resetPuck(serveDir = 1) {
    const cx = (this.rink.left + this.rink.right) / 2;
    const cy = (this.rink.top + this.rink.bottom) / 2;
    this.puck.x = cx;
    this.puck.y = cy;
    const angle = (Math.random() * 0.7 - 0.35);
    const baseServeSpeed = 8.5;
    this.puck.vx = serveDir * Math.cos(angle) * baseServeSpeed;
    this.puck.vy = Math.sin(angle) * baseServeSpeed;
    this.puck.trail = [];
  }

  updateMallet(id, targetX, targetY, side, color, ringColor, label = '') {
    const r = 36;
    const midX = (this.rink.left + this.rink.right) / 2;

    // Clamp each team's paddles to their half of the rink so players defend & strike cleanly
    let minX = this.rink.left + r;
    let maxX = this.rink.right - r;
    if (side === 'left') {
      maxX = midX - r * 0.35;
    } else if (side === 'right') {
      minX = midX + r * 0.35;
    }

    const clampedX = Math.max(minX, Math.min(maxX, targetX));
    const clampedY = Math.max(this.rink.top + r, Math.min(this.rink.bottom - r, targetY));

    const prev = this.mallets.get(id);
    if (!prev) {
      const m = { id, x: clampedX, y: clampedY, vx: 0, vy: 0, radius: r, side, color, ringColor, label };
      this.mallets.set(id, m);
      return m;
    }

    prev.vx = prev.vx * 0.45 + (clampedX - prev.x) * 0.55;
    prev.vy = prev.vy * 0.45 + (clampedY - prev.y) * 0.55;
    prev.x = clampedX;
    prev.y = clampedY;
    prev.color = color;
    prev.ringColor = ringColor;
    prev.label = label;
    return prev;
  }

  update(players, level, speedMultiplier, callbacks) {
    const { onHit, onWall, onGoal } = callbacks;
    const isTwoPlayer = players.length >= 2;
    const midX = (this.rink.left + this.rink.right) / 2;
    const midY = (this.rink.top + this.rink.bottom) / 2;

    if (this.goalBannerTimer > 0) {
      this.goalBannerTimer--;
    }

    const activeMallets = [];

    if (isTwoPlayer) {
      // Sort players left-to-right on the mirrored screen so Left person owns Left Goal, Right person owns Right Goal!
      const sorted = [...players].sort((a, b) => a.mirroredX - b.mirroredX);
      const pLeft = sorted[0];
      const pRight = sorted[1];

      activeMallets.push(
        this.updateMallet('p1L', pLeft.leftHandScreen.x * this.w, pLeft.leftHandScreen.y * this.h, 'left', '#38bdf8', '#0284c7', 'P1'),
        this.updateMallet('p1R', pLeft.rightHandScreen.x * this.w, pLeft.rightHandScreen.y * this.h, 'left', '#38bdf8', '#ec4899', 'P1'),
        this.updateMallet('p2L', pRight.leftHandScreen.x * this.w, pRight.leftHandScreen.y * this.h, 'right', '#4ade80', '#16a34a', 'P2'),
        this.updateMallet('p2R', pRight.rightHandScreen.x * this.w, pRight.rightHandScreen.y * this.h, 'right', '#4ade80', '#a855f7', 'P2')
      );
    } else {
      // 1-Player Mode: Player 1 defends Left Rink (hands scaled comfortably across left half if standing centered)
      const p1 = players[0];
      // Map player's natural reach [0.05..0.85] smoothly across left rink if needed, while keeping direct vertical feel
      const mapLeftX = (normX) => {
        const rawPx = normX * this.w;
        // If hand is in left half, 1:1! If player stands centered, gently compress right-reaching hand up to center line
        return Math.min(midX - 14, rawPx);
      };

      activeMallets.push(
        this.updateMallet('p1L', mapLeftX(p1.leftHandScreen.x), p1.leftHandScreen.y * this.h, 'left', '#38bdf8', '#0284c7', 'YOU'),
        this.updateMallet('p1R', mapLeftX(p1.rightHandScreen.x), p1.rightHandScreen.y * this.h, 'left', '#ec4899', '#be185d', 'YOU')
      );

      // Update Cyber-Bot AI on the Right Rink
      const botSpeed = (4.8 + level * 1.1) * (speedMultiplier * 0.75 + 0.25);
      let targetBotX = this.rink.right - 115;
      let targetBotY = midY;

      if (this.puck.x > midX - 40) {
        // Attack / intercept incoming puck on bot's side
        targetBotX = Math.max(midX + 55, Math.min(this.rink.right - 65, this.puck.x + 28));
        targetBotY = this.puck.y;
      } else {
        // Guard goal crease with gentle hover
        targetBotX = this.rink.right - 110;
        targetBotY = midY + (this.puck.y - midY) * 0.55;
      }

      const dxB = targetBotX - this.bot.x;
      const dyB = targetBotY - this.bot.y;
      const distB = Math.hypot(dxB, dyB);
      const stepB = Math.min(distB, botSpeed);
      const nextBotX = distB > 0.5 ? this.bot.x + (dxB / distB) * stepB : this.bot.x;
      const nextBotY = distB > 0.5 ? this.bot.y + (dyB / distB) * stepB : this.bot.y;

      activeMallets.push(
        this.updateMallet('bot', nextBotX, nextBotY, 'right', '#f43f5e', '#f59e0b', 'BOT')
      );
      this.bot.x = activeMallets[activeMallets.length - 1].x;
      this.bot.y = activeMallets[activeMallets.length - 1].y;
    }

    // Update Puck position & trail
    const p = this.puck;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.shift();

    const maxPuckSpeed = (18.0 + level * 1.4) * (speedMultiplier * 0.7 + 0.3);
    const minGlideSpeed = 5.6 * speedMultiplier;

    p.x += p.vx;
    p.y += p.vy;

    // Slight air-table friction above minimum cruise speed
    const curSpeed = Math.hypot(p.vx, p.vy);
    if (curSpeed > maxPuckSpeed) {
      p.vx = (p.vx / curSpeed) * maxPuckSpeed;
      p.vy = (p.vy / curSpeed) * maxPuckSpeed;
    } else if (curSpeed > minGlideSpeed) {
      p.vx *= 0.996;
      p.vy *= 0.996;
    } else if (curSpeed > 0.1 && curSpeed < minGlideSpeed * 0.75) {
      p.vx = (p.vx / curSpeed) * (minGlideSpeed * 0.75);
      p.vy = (p.vy / curSpeed) * (minGlideSpeed * 0.75);
    }

    // Top & Bottom Neon Wall Collisions
    if (p.y - p.radius < this.rink.top) {
      p.y = this.rink.top + p.radius;
      p.vy = Math.abs(p.vy);
      if (onWall) onWall(p.x, p.y, '#38bdf8');
    } else if (p.y + p.radius > this.rink.bottom) {
      p.y = this.rink.bottom - p.radius;
      p.vy = -Math.abs(p.vy);
      if (onWall) onWall(p.x, p.y, '#ec4899');
    }

    // Goal Crease Y range
    const goalTop = midY - this.goalHalfHeight;
    const goalBottom = midY + this.goalHalfHeight;
    const inGoalMouth = p.y > goalTop && p.y < goalBottom;

    // Left Wall & Left Goal Check
    if (p.x - p.radius <= this.rink.left) {
      if (inGoalMouth) {
        this.rightScore++;
        this.goalBannerTimer = 80;
        this.goalBannerText = isTwoPlayer ? '💚 PLAYER 2 SCORES! 🥅' : '🤖 CYBER-BOT SCORES!';
        this.goalBannerColor = isTwoPlayer ? '#4ade80' : '#f43f5e';
        if (onGoal) onGoal('right', this.rink.left + 20, p.y, isTwoPlayer);
        this.resetPuck(-1); // Serve toward scorer's opponent
        return;
      } else {
        p.x = this.rink.left + p.radius;
        p.vx = Math.abs(p.vx);
        if (onWall) onWall(p.x, p.y, '#38bdf8');
      }
    }

    // Right Wall & Right Goal Check
    if (p.x + p.radius >= this.rink.right) {
      if (inGoalMouth) {
        this.leftScore++;
        this.goalBannerTimer = 80;
        this.goalBannerText = isTwoPlayer ? '💙 PLAYER 1 SCORES! 🥅' : '🎉 GOAL! YOU SCORED! 🥅';
        this.goalBannerColor = '#38bdf8';
        if (onGoal) onGoal('left', this.rink.right - 20, p.y, isTwoPlayer);
        this.resetPuck(1);
        return;
      } else {
        p.x = this.rink.right - p.radius;
        p.vx = -Math.abs(p.vx);
        if (onWall) onWall(p.x, p.y, '#4ade80');
      }
    }

    // Mallet-to-Puck Elastic Slap Collisions
    for (const m of activeMallets) {
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + m.radius;

      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate puck from mallet so it never gets stuck inside
        p.x = m.x + nx * (minDist + 2);
        p.y = m.y + ny * (minDist + 2);

        // Reflect puck velocity along collision normal + add mallet swing velocity
        const relVx = p.vx - m.vx;
        const relVy = p.vy - m.vy;
        const velAlongNormal = relVx * nx + relVy * ny;

        if (velAlongNormal < 0) {
          const bounceBoost = 1.12;
          p.vx -= (1 + bounceBoost) * velAlongNormal * nx;
          p.vy -= (1 + bounceBoost) * velAlongNormal * ny;
        }

        // Add direct slap impulse from hand movement speed
        p.vx += m.vx * 0.55 + nx * 3.2;
        p.vy += m.vy * 0.55 + ny * 3.2;

        // Cap speed immediately
        const newSpd = Math.hypot(p.vx, p.vy);
        const hitCap = maxPuckSpeed * 1.12;
        if (newSpd > hitCap) {
          p.vx = (p.vx / newSpd) * hitCap;
          p.vy = (p.vy / newSpd) * hitCap;
        }

        p.color = m.color;
        if (onHit) onHit(p.x, p.y, m.color);
      }
    }

    this.lastRenderedMallets = activeMallets;
    this.lastIsTwoPlayer = isTwoPlayer;
  }

  draw(ctx, frameCount) {
    const { left, right, top, bottom } = this.rink;
    const rw = right - left;
    const rh = bottom - top;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    const goalTop = midY - this.goalHalfHeight;
    const goalBottom = midY + this.goalHalfHeight;

    ctx.save();

    // 1. Dark Arcade Rink Surface
    const iceGrad = ctx.createLinearGradient(left, top, right, bottom);
    iceGrad.addColorStop(0, '#090d1f');
    iceGrad.addColorStop(0.5, '#0f172a');
    iceGrad.addColorStop(1, '#130d26');
    ctx.fillStyle = iceGrad;
    ctx.beginPath();
    ctx.roundRect(left, top, rw, rh, 28);
    ctx.fill();

    // Subtle futuristic grid lines inside rink
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    const step = 48;
    ctx.beginPath();
    for (let x = left + step; x < right; x += step) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = top + step; y < bottom; y += step) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    // 2. Center Line & Center Faceoff Circle
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(midX, top + 6);
    ctx.lineTo(midX, bottom - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(midX, midY, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 114, 182, 0.3)';
    ctx.beginPath();
    ctx.arc(midX, midY, 10, 0, Math.PI * 2);
    ctx.fill();

    // 3. Big Embedded Ice Scoreboard Numbers
    ctx.font = '700 68px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillText(`${this.leftScore}`, midX - 110, top + 64);

    ctx.fillStyle = this.lastIsTwoPlayer ? 'rgba(74, 222, 128, 0.22)' : 'rgba(244, 63, 94, 0.22)';
    ctx.fillText(`${this.rightScore}`, midX + 110, top + 64);

    ctx.font = '700 15px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.fillText('PLAYER 1', midX - 110, top + 24);
    ctx.fillText(this.lastIsTwoPlayer ? 'PLAYER 2 (1v1)' : 'CYBER-BOT', midX + 110, top + 24);

    // 4. Goal Creases & Glowing Goal Mouths
    // Left Goal Crease (Cyan)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(left, midY, this.goalHalfHeight, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    // Right Goal Crease (Green in 2P, Pink/Red in Bot mode)
    const rightNeon = this.lastIsTwoPlayer ? '#4ade80' : '#f43f5e';
    ctx.strokeStyle = this.lastIsTwoPlayer ? 'rgba(74, 222, 128, 0.45)' : 'rgba(244, 63, 94, 0.45)';
    ctx.fillStyle = this.lastIsTwoPlayer ? 'rgba(74, 222, 128, 0.08)' : 'rgba(244, 63, 94, 0.08)';
    ctx.beginPath();
    ctx.arc(right, midY, this.goalHalfHeight, Math.PI / 2, -Math.PI / 2);
    ctx.fill();
    ctx.stroke();

    // 5. Glowing Neon Outer Rink Rails (split top/bottom around goal mouths)
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    // Left & Top-Left Cyan Rail
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(left, goalTop);
    ctx.lineTo(left, top + 24);
    ctx.quadraticCurveTo(left, top, left + 24, top);
    ctx.lineTo(midX, top);
    ctx.moveTo(left, goalBottom);
    ctx.lineTo(left, bottom - 24);
    ctx.quadraticCurveTo(left, bottom, left + 24, bottom);
    ctx.lineTo(midX, bottom);
    ctx.stroke();

    // Right & Top-Right Neon Rail
    ctx.shadowColor = rightNeon;
    ctx.strokeStyle = rightNeon;
    ctx.beginPath();
    ctx.moveTo(midX, top);
    ctx.lineTo(right - 24, top);
    ctx.quadraticCurveTo(right, top, right, top + 24);
    ctx.lineTo(right, goalTop);
    ctx.moveTo(midX, bottom);
    ctx.lineTo(right - 24, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - 24);
    ctx.lineTo(right, goalBottom);
    ctx.stroke();

    // Glowing Goal Nets
    ctx.lineWidth = 8;
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#fde047';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.beginPath();
    ctx.moveTo(left - 8, goalTop);
    ctx.lineTo(left - 8, goalBottom);
    ctx.moveTo(right + 8, goalTop);
    ctx.lineTo(right + 8, goalBottom);
    ctx.stroke();

    // 6. Puck Comet Trail & Neon Puck
    ctx.shadowBlur = 0;
    const p = this.puck;
    for (let i = 0; i < p.trail.length; i++) {
      const pt = p.trail[i];
      const ratio = (i + 1) / p.trail.length;
      ctx.globalAlpha = ratio * 0.38;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.radius * ratio * 0.88, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    ctx.shadowBlur = 24;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // 7. Render Glowing Energy Mallets (Player Hands + Bot)
    const mallets = this.lastRenderedMallets || [];
    for (const m of mallets) {
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = m.color;

      // Outer energy striker ring
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner recessed dark ring
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.68, 0, Math.PI * 2);
      ctx.fill();

      // Center grip knob
      ctx.fillStyle = m.ringColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (m.label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.label, m.x, m.y);
      }
      ctx.restore();
    }

    // 8. Goal Scored Floating Celebration Banner
    if (this.goalBannerTimer > 0) {
      const pulse = 1 + Math.sin(frameCount * 0.3) * 0.06;
      ctx.save();
      ctx.translate(midX, midY);
      ctx.scale(pulse, pulse);
      ctx.shadowBlur = 25;
      ctx.shadowColor = this.goalBannerColor;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.goalBannerColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-210, -34, 420, 68, 999);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.goalBannerText, 0, 2);
      ctx.restore();
    }

    ctx.restore();
  }
}
