/**
 * app.js
 * Kids Motion Playground - Unified Motion-Controlled Games Engine (Nex-Style)
 * Refactored using ES Modules. Imports submodules for different games, sound, and particles.
 */

import { PoseTracker } from './pose-tracker.js?v=15';
import { sfx } from './modules/sound.js?v=15';
import { Particle } from './modules/particles.js?v=15';
import { Balloon, PuppyPuppet } from './modules/games/puppy.js?v=15';
import { Fruit, FruitPiece } from './modules/games/fruits.js?v=15';
import { Pet } from './modules/games/pets.js?v=15';
import { Meteor } from './modules/games/cosmic.js?v=15';
import { HockeyGame } from './modules/games/hockey.js?v=15';
import { SkyFlyerGame } from './modules/games/airplane.js?v=15';
import { ShaunDashGame } from './modules/games/shaun.js?v=15';
import { CritterSmashGame } from './modules/games/smash.js?v=15';
import { GoKeeperGame } from './modules/games/gokeeper.js?v=15';
import { StarriBeatGame } from './modules/games/starri.js?v=15';
import { PosePartyGame } from './modules/games/poseparty.js?v=15';
import { PowerTennisGame } from './modules/games/tennis.js?v=15';
import { DragonArcheryGame } from './modules/games/archery.js?v=15';
import { FeverHoopsGame } from './modules/games/hoops.js?v=15';
import { MagicBubbleGame } from './modules/games/bubbles.js?v=15';

// ==========================================
// Main Unified Game Engine Coordinator
// ==========================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Bind Screen DOM components
    this.screenWelcome = document.getElementById('screen-welcome');
    this.screenCalibration = document.getElementById('screen-calibration');
    this.screenCountdown = document.getElementById('screen-countdown');
    this.screenLevelUp = document.getElementById('screen-levelup');
    this.screenGameOver = document.getElementById('screen-gameover');
    
    // Stats elements
    this.scoreValEl = document.getElementById('score-val');
    this.levelValEl = document.getElementById('level-val');
    this.timerValEl = document.getElementById('timer-val');
    this.timerBar = document.getElementById('timer-bar');
    this.heartsValEl = document.getElementById('hearts-val');
    
    // Playground State Router
    this.gameMode = 'puppy'; // puppy, fruits, pets, cosmic
    this.gameState = 'welcome'; // welcome, playing, levelup, gameover
    this.score = 0;
    this.level = 1;
    this.timeLeft = 60;
    this.lives = 5; // 5 chances (hearts) instead of 3 for easier kid play
    this.speedMultiplier = 1.4;
    this.speedSlider = document.getElementById('speed-slider');
    this.speedMultiplierValEl = document.getElementById('speed-multiplier-val');
    
    this.tracker = new PoseTracker();
    this.puppy = null;
    this.puppy2 = null;
    this.balloons = [];
    
    // Fruits list
    this.fruits = [];
    this.fruitPieces = [];
    this.fruitSlicedCount = 0;
    
    // Pets List
    this.pets = [];
    this.burrowPositions = [];
    this.petSpawnCooldown = 0;

    // Cosmic meteor List
    this.meteors = [];
    this.cosmicCockpitX = 0;
    this.cosmicCockpitY = 0;
    this.shieldAngle = -Math.PI / 2; // Shield rotation angle
    this.shieldAngle2 = null; // Optional Player 2 shield angle

    // Neon Air Hockey instance
    this.hockey = null;

    // Sky Wings Flyer instance & fallback tilt state
    this.airplane = null;
    this.fallbackWingTilt = 0;

    // Shaun's Mossy Bottom Dash instance & fallback posture controls
    this.shaunGame = null;
    this.playerIsDucking = false;

    // AR Mole Head Smash instance (4-edge popping critters + glowing hand orbs)
    this.smashGame = null;

    // Nex-Inspired Starter Archetypes: Super Goalie Rush, Starri Beat Stage, Copycat Mirror Party & Super Power Tennis
    this.gokeeperGame = null;
    this.starriGame = null;
    this.posePartyGame = null;
    this.tennisGame = null;
    this.archeryGame = null;
    this.hoopsGame = null;
    this.bubblesGame = null;
    this.playerHandsUp = false;
    this.trophyStats = this.loadTrophyStats();

    this.particles = [];
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.logicAccumulator = 0;
    this.levelTimerInterval = null;
    
    // User hand and tracking variables (Player 1 + Multi-Player array)
    this.puppetXTarget = 0.5;
    this.leftHandTargetOffset = { x: 0, y: 0 };
    this.rightHandTargetOffset = { x: 0, y: 0 };
    this.leftHandScreen = { x: 0.35, y: 0.7 };
    this.rightHandScreen = { x: 0.65, y: 0.7 };
    this.leftLegTargetOffset = { x: 0, y: 0 };
    this.rightLegTargetOffset = { x: 0, y: 0 };
    this.hasLegTracking = false;
    this.playerIsJumping = false;
    this.activePlayers = []; // Up to 2 tracked players from PoseTracker
    
    // Left/Right Hand previous tracking positions for slicing trails
    this.prevLeftHandPos = null;
    this.prevRightHandPos = null;

    this.registerEventListeners();
  }

  registerEventListeners() {
    // Select dynamic game cards from hub carousel
    const playButtons = document.querySelectorAll('.btn-play-game');
    playButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const chosenGame = btn.getAttribute('data-game');
        this.gameMode = chosenGame;
        this.score = 0;
        this.level = 1;
        this.lives = 5;
        this.timeLeft = 60;
        if (this.hockey) this.hockey.resetScores();
        if (this.airplane) this.airplane.reset();
        if (this.shaunGame) this.shaunGame.reset();
        if (this.smashGame) this.smashGame.reset();
        if (this.gokeeperGame) this.gokeeperGame.reset(false);
        if (this.starriGame) this.starriGame.reset();
        if (this.posePartyGame) this.posePartyGame.reset();
        if (this.tennisGame) this.tennisGame.reset(false);
        if (this.archeryGame) this.archeryGame.reset();
        if (this.hoopsGame) this.hoopsGame.reset();
        if (this.bubblesGame) this.bubblesGame.reset();
        // Start with 3 glossy hearts in AR Mole Head Smash just like the reference video!
        if (chosenGame === 'smash') this.lives = 3;
        sfx.playBounce();
        this.transitionToState('playing');
      });
    });

    // Return to Playground Hub buttons
    ['btn-hud-hub', 'btn-levelup-hub', 'btn-gameover-hub'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          sfx.playBounce();
          this.returnToHub();
        });
      }
    });

    // Level Up transition button
    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.proceedToNextLevel();
    });

    // Restart Game button
    document.getElementById('btn-restart').addEventListener('click', () => {
      sfx.playBounce();
      this.score = 0;
      this.level = 1;
      this.lives = this.gameMode === 'smash' ? 3 : 5;
      this.timeLeft = 60;
      if (this.hockey) this.hockey.resetScores();
      if (this.airplane) this.airplane.reset();
      if (this.shaunGame) this.shaunGame.reset();
      if (this.smashGame) this.smashGame.reset();
      if (this.gokeeperGame) this.gokeeperGame.reset(false);
      if (this.starriGame) this.starriGame.reset();
      if (this.posePartyGame) this.posePartyGame.reset();
      if (this.tennisGame) this.tennisGame.reset(false);
      if (this.archeryGame) this.archeryGame.reset();
      if (this.hoopsGame) this.hoopsGame.reset();
      if (this.bubblesGame) this.bubblesGame.reset();
      this.transitionToState('playing');
    });

    // Keyboard Fallback Controls (Arrow Left/Right for movement, Space for jump, T for Wings, 1-6 for Starri pads)
    window.addEventListener('keydown', (e) => {
      if (this.gameState === 'levelup' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Spacebar')) {
        this.proceedToNextLevel();
        return;
      }

      if (e.key === 'ArrowLeft') {
        this.puppetXTarget = Math.max(0.05, this.puppetXTarget - 0.06);
        this.fallbackWingTilt = -0.62;
        if (this.activePlayers.length === 0) {
          this.leftHandScreen.x = Math.max(0.05, this.leftHandScreen.x - 0.06);
          this.rightHandScreen.x = Math.max(0.08, this.rightHandScreen.x - 0.06);
        }
      } else if (e.key === 'ArrowRight') {
        this.puppetXTarget = Math.min(0.95, this.puppetXTarget + 0.06);
        this.fallbackWingTilt = 0.62;
        if (this.activePlayers.length === 0) {
          this.leftHandScreen.x = Math.min(0.92, this.leftHandScreen.x + 0.06);
          this.rightHandScreen.x = Math.min(0.95, this.rightHandScreen.x + 0.06);
        }
      }
      
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.playerHandsUp = true;
      }

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.playerIsJumping = true;
        if (this.gameMode === 'tennis' && this.tennisGame) {
          this.tennisGame.triggerManualSwing();
        } else if (this.gameMode === 'archery' && this.archeryGame) {
          this.archeryGame.triggerQuickShot();
        } else if (this.gameMode === 'hoops' && this.hoopsGame) {
          this.hoopsGame.triggerQuickShoot();
        }
        setTimeout(() => {
          this.playerIsJumping = false;
        }, 140);
      }

      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.playerIsDucking = true;
      }

      if ((e.key === 't' || e.key === 'T' || e.key === 'e' || e.key === 'E') && this.posePartyGame) {
        this.posePartyGame.setFallbackWings(true);
      }

      if (this.gameMode === 'starri' && this.starriGame && e.key >= '1' && e.key <= '6') {
        this.starriGame.triggerKeyboardPad(parseInt(e.key, 10) - 1);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.fallbackWingTilt = 0;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.playerHandsUp = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.playerIsDucking = false;
      }
      if ((e.key === 't' || e.key === 'T' || e.key === 'e' || e.key === 'E') && this.posePartyGame) {
        this.posePartyGame.setFallbackWings(false);
      }
    });

    // Dynamic Speed Slider adjustments
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.speedMultiplier = val;
        this.speedMultiplierValEl.textContent = `${val.toFixed(1)}x`;
      });
    }

    // Mouse Fallback Controls (Mouse moves arms and swat paths)
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const px = this.puppetXTarget * this.canvas.width;
      const py = this.canvas.height - 120;
      
      // Mirror displacement offsets proportionately (negative x reaches outward to screen-left)
      this.leftHandTargetOffset.x = -(mouseX - (px - 28)) * 0.015;
      this.leftHandTargetOffset.y = (mouseY - (py + 18)) * 0.015;
      
      this.rightHandTargetOffset.x = -(mouseX - (px + 28)) * 0.015;
      this.rightHandTargetOffset.y = (mouseY - (py + 18)) * 0.015;

      // Direct screen-space fallback for cursor-based games (Fruit Slasher / Pat-the-Pets / Sky Wings)
      const normX = Math.max(0.02, Math.min(0.98, mouseX / this.canvas.width));
      const normY = Math.max(0.02, Math.min(0.98, mouseY / this.canvas.height));
      if (this.gameMode === 'airplane') {
        // Simulate wing banking with mouse X & altitude with mouse Y when camera isn't active!
        const tiltDelta = (normX - 0.5) * 0.42;
        this.leftHandScreen = { x: 0.25, y: Math.max(0.05, Math.min(0.95, normY - tiltDelta)) };
        this.rightHandScreen = { x: 0.75, y: Math.max(0.05, Math.min(0.95, normY + tiltDelta)) };
      } else {
        this.leftHandScreen = { x: Math.max(0.02, normX - 0.03), y: normY };
        this.rightHandScreen = { x: Math.min(0.98, normX + 0.03), y: normY };
      }
    });

    // Mouse click smash/swing/draw/inflate assist when testing without a webcam
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.gameMode === 'smash' && this.smashGame) {
        this.smashGame.handStates.clear();
      } else if (this.gameMode === 'tennis' && this.tennisGame) {
        this.tennisGame.triggerManualSwing();
      } else if (this.gameMode === 'archery' && this.archeryGame) {
        this.archeryGame.setMouseDown(true);
      } else if (this.gameMode === 'hoops' && this.hoopsGame) {
        this.hoopsGame.triggerQuickShoot();
      } else if (this.gameMode === 'bubbles' && this.bubblesGame) {
        this.bubblesGame.setMouseInflate(true);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.gameMode === 'archery' && this.archeryGame) {
        this.archeryGame.setMouseDown(false);
      } else if (this.gameMode === 'bubbles' && this.bubblesGame) {
        this.bubblesGame.setMouseInflate(false);
      }
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  async start() {
    this.resizeCanvas();
    this.puppy = new PuppyPuppet(this.canvas.width, this.canvas.height, 0);
    this.puppy2 = new PuppyPuppet(this.canvas.width, this.canvas.height, 1);
    this.hockey = new HockeyGame(this.canvas.width, this.canvas.height);
    this.airplane = new SkyFlyerGame(this.canvas.width, this.canvas.height);
    this.shaunGame = new ShaunDashGame(this.canvas.width, this.canvas.height);
    this.smashGame = new CritterSmashGame(this.canvas.width, this.canvas.height);
    this.gokeeperGame = new GoKeeperGame(this.canvas.width, this.canvas.height);
    this.starriGame = new StarriBeatGame(this.canvas.width, this.canvas.height);
    this.posePartyGame = new PosePartyGame(this.canvas.width, this.canvas.height);
    this.tennisGame = new PowerTennisGame(this.canvas.width, this.canvas.height);
    this.archeryGame = new DragonArcheryGame(this.canvas.width, this.canvas.height);
    this.hoopsGame = new FeverHoopsGame(this.canvas.width, this.canvas.height);
    this.bubblesGame = new MagicBubbleGame(this.canvas.width, this.canvas.height);
    this.refreshHubTrophies();
    
    // Pre-calculate Pat-the-Pets burrows positions
    this.setupPetsBurrows();
    
    // Start the Animation loop immediately (prevents black canvas while camera loads)
    this.gameLoop();

    // Hook tracking callbacks
    this.tracker.onTrackingCallback = (data) => {
      this.puppetXTarget = (1.0 - data.x);
      this.leftHandTargetOffset = data.leftHand;
      this.rightHandTargetOffset = data.rightHand;
      if (data.leftHandScreen) this.leftHandScreen = data.leftHandScreen;
      if (data.rightHandScreen) this.rightHandScreen = data.rightHandScreen;
      this.leftLegTargetOffset = data.leftLeg || { x: 0, y: 0 };
      this.rightLegTargetOffset = data.rightLeg || { x: 0, y: 0 };
      this.hasLegTracking = !!data.hasLegTracking;
      this.playerIsJumping = data.isJumping;
      this.activePlayers = data.players || [];

      const calibrator = document.getElementById('hub-calibration-status');
      if (calibrator && this.tracker.calibrationPassed) {
        calibrator.textContent = this.activePlayers.length >= 2
          ? "🎉 2 Players Detected! Co-op Mode Ready! 🚀"
          : "💻 1 Player Detected! (A 2nd player can step in anytime!) 🚀";
        calibrator.className = 'status-ready';
      }

      // Auto next level if ANY player raises both hands up high
      if (this.gameState === 'levelup') {
        const anyHandsUp = this.activePlayers.some(p => p.leftHand.y < -0.3 && p.rightHand.y < -0.3) ||
                           (data.leftHand.y < -0.3 && data.rightHand.y < -0.3);
        if (anyHandsUp) {
          this.proceedToNextLevel();
        }
      }
    };

    // When calibration tracks a player, unlock all carousel play buttons!
    this.tracker.onCalibrationSuccess = () => {
      const calibrator = document.getElementById('hub-calibration-status');
      calibrator.textContent = "💻 Player Detected! Ready to play! 🚀";
      calibrator.className = 'status-ready';

      const playButtons = document.querySelectorAll('.btn-play-game');
      playButtons.forEach((btn) => {
        btn.removeAttribute('disabled');
        const gameName = btn.getAttribute('data-game');
        btn.textContent = `Play ${gameName.toUpperCase()} 🎮`;
      });
    };

    // Auto-unlock fallback after 2.2 seconds so players can use Keyboard & Mouse if camera hangs
    setTimeout(() => {
      const calibrator = document.getElementById('hub-calibration-status');
      if (calibrator.className !== 'status-ready') {
        calibrator.textContent = "💡 Keyboard (Left/Right & Space) + Mouse controls active!";
        calibrator.className = 'status-connecting';
        
        const playButtons = document.querySelectorAll('.btn-play-game');
        playButtons.forEach((btn) => {
          btn.removeAttribute('disabled');
          const gameName = btn.getAttribute('data-game');
          btn.textContent = `Play ${gameName.toUpperCase()} 🎮`;
        });
      }
    }, 2200);

    // Initialize pose tracking asynchronously in the background
    try {
      await this.tracker.initialize();
    } catch (e) {
      console.warn("Tracker initialization deferred/blocked:", e);
    }
  }

  setupPetsBurrows() {
    // 3 burrows spaced evenly horizontally
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.burrowPositions = [
      { x: w * 0.22, y: h * 0.72 }, // Left hole
      { x: w * 0.5, y: h * 0.78 },  // Center hole
      { x: w * 0.78, y: h * 0.72 }  // Right hole
    ];
  }

  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
    
    if (this.puppy) {
      this.puppy.canvasWidth = this.canvas.width;
      this.puppy.canvasHeight = this.canvas.height;
      this.puppy.y = this.canvas.height - 120;
    }
    if (this.puppy2) {
      this.puppy2.canvasWidth = this.canvas.width;
      this.puppy2.canvasHeight = this.canvas.height;
      this.puppy2.y = this.canvas.height - 120;
    }
    if (this.hockey) {
      this.hockey.resize(this.canvas.width, this.canvas.height);
    }
    if (this.airplane) {
      this.airplane.resize(this.canvas.width, this.canvas.height);
    }
    if (this.shaunGame) {
      this.shaunGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.smashGame) {
      this.smashGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.gokeeperGame) {
      this.gokeeperGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.starriGame) {
      this.starriGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.posePartyGame) {
      this.posePartyGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.tennisGame) {
      this.tennisGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.archeryGame) {
      this.archeryGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.hoopsGame) {
      this.hoopsGame.resize(this.canvas.width, this.canvas.height);
    }
    if (this.bubblesGame) {
      this.bubblesGame.resize(this.canvas.width, this.canvas.height);
    }
    
    this.setupPetsBurrows();
    
    // Cosmic cockpit base positions
    this.cosmicCockpitX = this.canvas.width / 2;
    this.cosmicCockpitY = this.canvas.height - 130;
  }

  loadTrophyStats() {
    try {
      const raw = localStorage.getItem('nexter_playground_trophies_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveTrophyStats() {
    try {
      localStorage.setItem('nexter_playground_trophies_v1', JSON.stringify(this.trophyStats));
    } catch (e) {
      // Ignore storage quota / private mode errors
    }
  }

  getMedalForScore(score) {
    if (score >= 700) return { icon: '👑', name: 'Legend Crown' };
    if (score >= 420) return { icon: '🥇', name: 'Gold Trophy' };
    if (score >= 220) return { icon: '🥈', name: 'Silver Medal' };
    if (score >= 90) return { icon: '🥉', name: 'Bronze Star' };
    return null;
  }

  recordAndRenderRewards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const prevEntry = this.trophyStats[this.gameMode] || { bestScore: 0 };
    const isNewBest = this.score > 0 && this.score > prevEntry.bestScore;
    const bestScore = Math.max(prevEntry.bestScore || 0, this.score);
    const medal = this.getMedalForScore(bestScore);

    this.trophyStats[this.gameMode] = {
      bestScore,
      medal: medal ? medal.icon : (prevEntry.medal || '')
    };
    this.saveTrophyStats();
    this.refreshHubTrophies();

    const badges = [];
    if (isNewBest) {
      badges.push(`🎉 NEW PERSONAL BEST: ${this.score}!`);
    }
    const roundMedal = this.getMedalForScore(this.score);
    if (roundMedal) {
      badges.push(`${roundMedal.icon} ${roundMedal.name}`);
    }

    if (this.gameMode === 'gokeeper' && this.gokeeperGame) {
      badges.push(`🧤 Saves: ${this.gokeeperGame.totalSaves} • Streak x${this.gokeeperGame.bestStreak}`);
      if (!this.gokeeperGame.latestSelfieUrl) {
        this.gokeeperGame.captureSelfie(this.tracker.videoElement, this.score, this.level);
      }
    } else if (this.gameMode === 'starri' && this.starriGame) {
      badges.push(`🎖️ Rank ${this.starriGame.rank} (${this.starriGame.rankTitle}) • Max x${this.starriGame.maxCombo}`);
    } else if (this.gameMode === 'poseparty' && this.posePartyGame) {
      badges.push(`🕺 Best Pose Streak x${this.posePartyGame.bestStreak}`);
    } else if (this.gameMode === 'tennis' && this.tennisGame) {
      badges.push(`🎾 Games Won: ${this.tennisGame.gamesWon} • 🔥 Power Winners: ${this.tennisGame.powerWinners}`);
    } else if (this.gameMode === 'archery' && this.archeryGame) {
      badges.push(`🏹 Dragons Rescued: ${this.archeryGame.dragonsPopped} • 🎯 Bullseyes: ${this.archeryGame.bullseyes}`);
    } else if (this.gameMode === 'hoops' && this.hoopsGame) {
      badges.push(`🏀 Baskets: ${this.hoopsGame.basketsMade} • 🔥 Best Streak x${this.hoopsGame.bestStreak}`);
    } else if (this.gameMode === 'bubbles' && this.bubblesGame) {
      badges.push(`🫧 Sprites Freed: ${this.bubblesGame.spritesFreed} • ✨ Max Chain x${this.bubblesGame.bestChain}`);
    }

    const selfieUrl = this.gameMode === 'gokeeper' && this.gokeeperGame ? this.gokeeperGame.latestSelfieUrl : null;

    if (badges.length === 0 && !selfieUrl) {
      container.classList.add('hidden');
      return;
    }

    if (badges.length > 0) {
      const row = document.createElement('div');
      row.className = 'reward-badges-row';
      badges.forEach((txt) => {
        const pill = document.createElement('span');
        pill.className = 'reward-rank-pill';
        pill.textContent = txt;
        row.appendChild(pill);
      });
      container.appendChild(row);
    }

    if (selfieUrl) {
      const img = document.createElement('img');
      img.src = selfieUrl;
      img.alt = 'Champion Polaroid Selfie';
      img.className = 'victory-selfie-img';
      container.appendChild(img);
    }

    container.classList.remove('hidden');
  }

  refreshHubTrophies() {
    const badgeEls = document.querySelectorAll('[data-trophy-for]');
    let unlockedCount = 0;
    const newGames = new Set(['gokeeper', 'starri', 'poseparty', 'tennis', 'archery', 'hoops', 'bubbles']);

    badgeEls.forEach((el) => {
      const key = el.getAttribute('data-trophy-for');
      const entry = this.trophyStats[key];
      if (entry && entry.bestScore >= 90) {
        unlockedCount++;
        el.textContent = `${entry.medal || '🏅'} Best: ${entry.bestScore}`;
      } else if (entry && entry.bestScore > 0) {
        el.textContent = `⭐ Best: ${entry.bestScore}`;
      } else if (newGames.has(key)) {
        el.textContent = '✨ NEW';
      } else {
        el.textContent = '';
      }
    });

    const countEl = document.getElementById('hub-trophy-count');
    if (countEl) {
      countEl.textContent = String(unlockedCount);
    }
  }

  proceedToNextLevel() {
    if (this.gameState !== 'levelup') return;
    sfx.playBounce();
    this.level++;
    this.timeLeft = 60;
    if (this.gokeeperGame && this.gameMode === 'gokeeper') {
      this.gokeeperGame.reset(true);
    }
    if (this.tennisGame && this.gameMode === 'tennis') {
      this.tennisGame.reset(true);
    }
    this.transitionToState('playing');
  }

  returnToHub() {
    if (this.levelTimerInterval) clearInterval(this.levelTimerInterval);
    this.score = 0;
    this.level = 1;
    this.lives = 5;
    this.timeLeft = 60;
    this.refreshHubTrophies();
    this.updateHUD();
    this.transitionToState('welcome');
  }

  transitionToState(newState) {
    this.gameState = newState;
    
    // Toggle sleek full-screen AR HUD layout for Mole Head Smash
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.classList.toggle('ar-hud-mode', newState === 'playing' && this.gameMode === 'smash');
    }

    this.screenWelcome.className = 'screen-overlay hidden';
    this.screenCalibration.className = 'screen-overlay hidden';
    this.screenLevelUp.className = 'screen-overlay hidden';
    this.screenGameOver.className = 'screen-overlay hidden';
    this.screenCountdown.className = 'screen-overlay hidden';

    if (newState === 'welcome') {
      this.balloons = [];
      this.fruits = [];
      this.fruitPieces = [];
      this.pets = [];
      this.meteors = [];
      this.particles = [];
      this.screenWelcome.className = 'screen-overlay active';
    } else if (newState === 'playing') {
      // Clear game elements
      this.balloons = [];
      this.fruits = [];
      this.fruitPieces = [];
      this.pets = [];
      this.meteors = [];
      this.particles = [];
      this.lastFrameTime = performance.now();
      this.logicAccumulator = 0;
      if (this.hockey && this.gameMode === 'hockey') {
        this.hockey.resetPuck(Math.random() < 0.5 ? -1 : 1);
      }
      
      this.updateHUD();
      this.startLevelTimer();
    } else if (newState === 'levelup') {
      clearInterval(this.levelTimerInterval);
      sfx.playLevelUp();
      
      document.getElementById('next-level-num').textContent = this.level + 1;
      document.getElementById('btn-next-level-num').textContent = this.level + 1;
      
      const levelDescText = document.getElementById('level-desc-text');
      if (this.gameMode === 'puppy') {
        levelDescText.textContent = "Excellent bounce skills! Wind currents have picked up. Watch the sways!";
      } else if (this.gameMode === 'fruits') {
        levelDescText.textContent = "Fantastic slicing! Speeds are increasing, and spikes are spinning!";
      } else if (this.gameMode === 'pets') {
        levelDescText.textContent = "Cute petting job! Rabbits are faster, and hedgehogs are trickier!";
      } else if (this.gameMode === 'hockey') {
        const hs = this.hockey ? `Match Score: ${this.hockey.leftScore} - ${this.hockey.rightScore}! ` : '';
        levelDescText.textContent = `${hs}Period complete! Puck speed and Cyber-Bot reflexes are ramping up!`;
      } else if (this.gameMode === 'airplane') {
        levelDescText.textContent = "Awesome flying, Ace! Canyon winds are faster and storm clouds are thicker ahead!";
      } else if (this.gameMode === 'shaun') {
        levelDescText.textContent = "Baa-rilliant dash, Shaun! Mossy Bottom Farm speeds up—watch for hay bales & clotheslines!";
      } else if (this.gameMode === 'gokeeper') {
        levelDescText.textContent = "Incredible keeping! Curveballs swerve sharper and fireballs fly faster next half!";
      } else if (this.gameMode === 'starri') {
        levelDescText.textContent = "Encore unlocked! Next concert track drops a faster BPM & syncopated beat lanes!";
      } else if (this.gameMode === 'poseparty') {
        levelDescText.textContent = "Showstopper poses! DJ Acorn is speeding up the Broadway spotlight prompts!";
      } else if (this.gameMode === 'tennis') {
        levelDescText.textContent = "Set cleared! Next Star Cup Boss swings harder and unleashes Rival Flame Shots!";
      } else if (this.gameMode === 'archery') {
        levelDescText.textContent = "Sharp shooting, Ranger! Baby dragons carry double balloons & fly faster next wave!";
      } else if (this.gameMode === 'hoops') {
        levelDescText.textContent = "Buckets!! Stage 2 unlocks the Moving Arcade Backboard—keep that Fire Streak alive!";
      } else if (this.gameMode === 'bubbles') {
        levelDescText.textContent = "Magical bubble wizardry! More Crown Fairies & tricky Ink-Urchins are drifting in!";
      } else {
        levelDescText.textContent = "Cockpit defended! Asteroid velocities are rising. Pivot the energy shields fast!";
      }

      this.recordAndRenderRewards('levelup-reward-showcase');
      this.screenLevelUp.className = 'screen-overlay active';
    } else if (newState === 'gameover') {
      clearInterval(this.levelTimerInterval);
      sfx.playGameOver();
      
      const gameoverDesc = document.getElementById('gameover-desc-text');
      if (gameoverDesc) {
        if (this.gameMode === 'puppy') gameoverDesc.textContent = "Too many balloons popped!";
        else if (this.gameMode === 'fruits') gameoverDesc.textContent = "Watch out for those spiky bombs!";
        else if (this.gameMode === 'pets') gameoverDesc.textContent = "Ouch! Those hedgehogs are prickly!";
        else if (this.gameMode === 'hockey') gameoverDesc.textContent = "Cyber-Bot scored 5 goals! Ready for a rematch?";
        else if (this.gameMode === 'airplane') gameoverDesc.textContent = "Too many storm cloud zaps! Spread those wings and fly again!";
        else if (this.gameMode === 'shaun') gameoverDesc.textContent = "Caught in farmyard mischief! Jump hay bales & duck clotheslines!";
        else if (this.gameMode === 'smash') gameoverDesc.textContent = "Uh-oh! You bopped The Farmer 3 times! Ready for another round?";
        else if (this.gameMode === 'gokeeper') gameoverDesc.textContent = "5 shots slipped past! Step back into the goalbox for a rematch!";
        else if (this.gameMode === 'starri') gameoverDesc.textContent = "Too many red Glitch Spikes! Jump back on stage for an encore!";
        else if (this.gameMode === 'poseparty') gameoverDesc.textContent = "Missed 5 pose prompts! Ready to copy DJ Acorn again?";
        else if (this.gameMode === 'tennis') gameoverDesc.textContent = "Match point Boss! Grab your Power Racket for a championship rematch!";
        else if (this.gameMode === 'archery') gameoverDesc.textContent = "5 fireballs singed Stoneberry Castle! Grab your bow to defend again!";
        else if (this.gameMode === 'hoops') gameoverDesc.textContent = "Too many spiky bomb balls in the hoop! Ready for another shootout?";
        else if (this.gameMode === 'bubbles') gameoverDesc.textContent = "Poked 5 prickly Ink-Urchins! Wrap them in Giant Soap Bubbles next time!";
        else gameoverDesc.textContent = "Too many meteors hit the cockpit!";
      }

      document.getElementById('final-score').textContent = this.score;
      document.getElementById('final-level').textContent = Math.max(0, this.level - 1);
      this.recordAndRenderRewards('gameover-reward-showcase');
      this.screenGameOver.className = 'screen-overlay active';
    }
  }

  startLevelTimer() {
    if (this.levelTimerInterval) clearInterval(this.levelTimerInterval);
    // AR Mole Head Smash uses continuous XP-bar leveling right on the top green LEVEL pill!
    if (this.gameMode === 'smash') return;
    this.levelTimerInterval = setInterval(() => {
      this.timeLeft--;
      
      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        sfx.playTick();
      }

      if (this.timeLeft <= 0) {
        this.transitionToState('levelup');
      }
      this.updateHUD();
    }, 1000);
  }

  updateHUD() {
    this.scoreValEl.textContent = this.score;
    this.levelValEl.textContent = this.level;
    this.timerValEl.textContent = `${this.timeLeft}s`;
    
    const percentage = (this.timeLeft / 60) * 100;
    this.timerBar.style.width = `${percentage}%`;
    
    if (this.timeLeft <= 10) {
      this.timerBar.style.background = 'linear-gradient(90deg, #f43f5e, #e11d48)';
    } else if (this.timeLeft <= 25) {
      this.timerBar.style.background = 'linear-gradient(90deg, #f59e0b, #ec4899)';
    } else {
      this.timerBar.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
    }

    let hearts = '';
    if (this.gameMode === 'hockey' && this.activePlayers.length >= 2 && this.hockey) {
      this.heartsValEl.textContent = `💙${this.hockey.leftScore} : ${this.hockey.rightScore}💚`;
      return;
    }
    for (let i = 0; i < 5; i++) { // Render up to 5 hearts
      hearts += i < this.lives ? '❤️️' : '🖤';
    }
    this.heartsValEl.textContent = hearts;
  }

  gameLoop() {
    const now = performance.now();
    const fixedStepMs = 1000 / 60;
    const elapsed = this.lastFrameTime ? Math.min(67, Math.max(0, now - this.lastFrameTime)) : fixedStepMs;
    this.lastFrameTime = now;
    this.logicAccumulator += elapsed;

    let steps = 0;
    while (this.logicAccumulator >= fixedStepMs && steps < 4) {
      this.logicAccumulator -= fixedStepMs;
      this.frameCount++;
      steps++;

      if (this.gameState === 'playing') {
        this.updateGameLogic();
      }

      if (this.gameMode === 'puppy' && this.puppy) {
        const pixelTargetX = this.puppetXTarget * this.canvas.width;
        this.puppy.update(
          pixelTargetX,
          this.frameCount,
          this.leftHandTargetOffset,
          this.rightHandTargetOffset,
          this.leftLegTargetOffset,
          this.rightLegTargetOffset,
          this.hasLegTracking,
          this.playerIsJumping
        );

        if (this.activePlayers.length >= 2 && this.puppy2) {
          const p2 = this.activePlayers[1];
          this.puppy2.update(
            p2.mirroredX * this.canvas.width,
            this.frameCount + 15,
            p2.leftHand,
            p2.rightHand,
            p2.leftLeg || { x: 0, y: 0 },
            p2.rightLeg || { x: 0, y: 0 },
            !!p2.hasLegTracking,
            p2.isJumping
          );
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].update();
        if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
      }

      if (this.gameMode === 'fruits') {
        for (let i = this.fruitPieces.length - 1; i >= 0; i--) {
          this.fruitPieces[i].update();
          if (this.fruitPieces[i].alpha <= 0) this.fruitPieces.splice(i, 1);
        }
      }
    }

    this.drawBackground();

    // Full-world custom canvas games render beneath particles!
    if (this.gameMode === 'airplane' && this.airplane) {
      this.airplane.draw(this.ctx, this.frameCount);
    } else if (this.gameMode === 'shaun' && this.shaunGame) {
      this.shaunGame.draw(this.ctx, this.frameCount);
    } else if (this.gameMode === 'smash' && this.smashGame) {
      this.smashGame.draw(this.ctx, this.frameCount, this.tracker.videoElement, this.score, this.level, this.lives);
    } else if (this.gameMode === 'gokeeper' && this.gokeeperGame) {
      this.gokeeperGame.draw(this.ctx, this.frameCount, this.tracker.videoElement, this.score);
    } else if (this.gameMode === 'starri' && this.starriGame) {
      this.starriGame.draw(this.ctx, this.frameCount, this.tracker.videoElement, this.level, this.score);
    } else if (this.gameMode === 'poseparty' && this.posePartyGame) {
      this.posePartyGame.draw(this.ctx, this.frameCount, this.tracker.videoElement);
    } else if (this.gameMode === 'tennis' && this.tennisGame) {
      this.tennisGame.draw(this.ctx, this.frameCount, this.tracker.videoElement);
    } else if (this.gameMode === 'archery' && this.archeryGame) {
      this.archeryGame.draw(this.ctx, this.frameCount);
    } else if (this.gameMode === 'hoops' && this.hoopsGame) {
      this.hoopsGame.draw(this.ctx, this.frameCount);
    } else if (this.gameMode === 'bubbles' && this.bubblesGame) {
      this.bubblesGame.draw(this.ctx, this.frameCount, this.tracker.videoElement);
    }

    // Render active particles
    this.particles.forEach((p) => {
      p.draw(this.ctx);
    });

    // Game Mode Draw Branches
    if (this.gameMode === 'puppy') {
      this.balloons.forEach((b) => b.draw(this.ctx));
      if (this.puppy) this.puppy.draw(this.ctx);
      if (this.activePlayers.length >= 2 && this.puppy2) {
        this.puppy2.draw(this.ctx);
      }
      
    } else if (this.gameMode === 'fruits') {
      this.fruits.forEach((f) => f.draw(this.ctx));
      this.fruitPieces.forEach((fp) => {
        fp.draw(this.ctx);
      });
      
      // Draw Laser blades on Hand Positions
      this.drawLaserBlades();

    } else if (this.gameMode === 'pets') {
      this.drawPetsBurrows();
      this.pets.forEach((pet) => pet.draw(this.ctx));
      this.drawToyHammers();

    } else if (this.gameMode === 'cosmic') {
      this.drawCosmicCockpit();
      this.meteors.forEach((m) => m.draw(this.ctx));

    } else if (this.gameMode === 'hockey' && this.hockey) {
      this.hockey.draw(this.ctx, this.frameCount);
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (
      this.gameMode === 'airplane' ||
      this.gameMode === 'shaun' ||
      this.gameMode === 'smash' ||
      this.gameMode === 'gokeeper' ||
      this.gameMode === 'starri' ||
      this.gameMode === 'poseparty' ||
      this.gameMode === 'tennis' ||
      this.gameMode === 'archery' ||
      this.gameMode === 'hoops' ||
      this.gameMode === 'bubbles'
    ) {
      // Custom 3D/AR/Stage games render their own full backdrop
      return;
    }

    if (this.gameMode === 'cosmic' || this.gameMode === 'hockey') {
      // Space Nebula dark gradient
      const darkGrad = ctx.createLinearGradient(0, 0, 0, h);
      darkGrad.addColorStop(0, '#090514');
      darkGrad.addColorStop(0.5, '#0f0a1c');
      darkGrad.addColorStop(1, '#020005');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, w, h);

      // Star twinkles
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const offset = Math.sin(this.frameCount * 0.05 + i) * 3;
        ctx.beginPath();
        ctx.arc((w * 0.05 * i) % w, (h * 0.08 * i + offset) % h, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Sky Background for other games
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (this.gameMode === 'fruits') {
      skyGrad.addColorStop(0, '#020617'); // Retro futuristic arcade sunset
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#311042');
    } else {
      skyGrad.addColorStop(0, '#bae6fd'); 
      skyGrad.addColorStop(0.6, '#e0f2fe');
      skyGrad.addColorStop(1, '#ffedd5');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Fluffy cloud renders
    ctx.fillStyle = this.gameMode === 'fruits' ? 'rgba(236,72,153,0.1)' : 'rgba(255, 255, 255, 0.55)';
    this.drawCloud(w * 0.15, h * 0.25, 45);
    this.drawCloud(w * 0.8, h * 0.18, 55);
    this.drawCloud(w * 0.5, h * 0.35, 38);

    // Green grass fields
    ctx.fillStyle = this.gameMode === 'fruits' ? '#1e1b4b' : '#4ade80';
    ctx.beginPath();
    ctx.arc(w * 0.3, h + 300, 400, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.gameMode === 'fruits' ? '#0f0a1c' : '#22c55e';
    ctx.beginPath();
    ctx.arc(w * 0.8, h + 350, 480, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.gameMode === 'fruits' ? '#090514' : '#16a34a';
    ctx.fillRect(0, h - 35, w, 35);
  }

  drawCloud(cx, cy, scale) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.arc(cx + scale * 0.7, cy - scale * 0.3, scale * 0.8, 0, Math.PI * 2);
    ctx.arc(cx + scale * 1.4, cy, scale * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + scale * 0.7, cy + scale * 0.2, scale * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  updateGameLogic() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Helper: returns active players list or fallback single-player state
    const players = this.activePlayers.length > 0 ? this.activePlayers : [{
      mirroredX: this.puppetXTarget,
      leftHand: this.leftHandTargetOffset,
      rightHand: this.rightHandTargetOffset,
      leftHandScreen: this.leftHandScreen,
      rightHandScreen: this.rightHandScreen,
      isJumping: this.playerIsJumping,
      isDucking: this.playerIsDucking,
      isMouseFallback: true
    }];

    // 1. Puppy Game Mode Logic
    if (this.gameMode === 'puppy') {
      const spawnRate = Math.max(12, 35 - this.level * 5);
      if (this.frameCount % spawnRate === 0 && this.balloons.length < 20) {
        this.balloons.push(new Balloon(w, this.level, this.speedMultiplier));
      }

      const activePuppies = [this.puppy];
      if (this.activePlayers.length >= 2 && this.puppy2) {
        activePuppies.push(this.puppy2);
      }

      const getDistance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

      for (let i = this.balloons.length - 1; i >= 0; i--) {
        const b = this.balloons[i];
        b.update(this.frameCount, this.level);

        if (b.y + b.radius >= h - 35) {
          this.burstBalloon(b, true);
          this.balloons.splice(i, 1);
          continue;
        }

        let hasCollision = false;
        let colCenterX = 0;
        let colCenterY = 0;
        let colRadius = 0;

        for (const pup of activePuppies) {
          const headX = pup.x;
          const headY = pup.y - 20 + pup.jumpY;
          const leftPawPos = pup.leftPaw;
          const rightPawPos = pup.rightPaw;
          const leftFootPos = pup.leftFoot;
          const rightFootPos = pup.rightFoot;

          const headHitRadius = pup.radius - 12 + b.radius;
          const limbHitRadius = 24 + b.radius;

          if (getDistance(b.x, b.y, headX, headY) < headHitRadius) {
            hasCollision = true; colCenterX = headX; colCenterY = headY; colRadius = headHitRadius; break;
          } else if (getDistance(b.x, b.y, leftPawPos.x, leftPawPos.y) < limbHitRadius) {
            hasCollision = true; colCenterX = leftPawPos.x; colCenterY = leftPawPos.y; colRadius = limbHitRadius; break;
          } else if (getDistance(b.x, b.y, rightPawPos.x, rightPawPos.y) < limbHitRadius) {
            hasCollision = true; colCenterX = rightPawPos.x; colCenterY = rightPawPos.y; colRadius = limbHitRadius; break;
          } else if (getDistance(b.x, b.y, leftFootPos.x, leftFootPos.y) < limbHitRadius) {
            hasCollision = true; colCenterX = leftFootPos.x; colCenterY = leftFootPos.y; colRadius = limbHitRadius; break;
          } else if (getDistance(b.x, b.y, rightFootPos.x, rightFootPos.y) < limbHitRadius) {
            hasCollision = true; colCenterX = rightFootPos.x; colCenterY = rightFootPos.y; colRadius = limbHitRadius; break;
          }
        }

        if (hasCollision) {
          sfx.playBounce();
          this.score += 10;
          this.updateHUD();
          b.y = colCenterY - colRadius;
          const angleRatio = (b.x - colCenterX) / colRadius;
          b.vx = angleRatio * 6.5;
          b.vy = -(Math.abs(b.vy) * 0.95 + 4.8); 
        }
      }
    }

    // 2. Fruit Slasher Mode Logic (Supports 1–2 Players = up to 4 swords!)
    else if (this.gameMode === 'fruits') {
      const spawnRate = Math.max(26, 75 - this.level * 12);
      if (this.frameCount % spawnRate === 0 && this.fruits.length < 6) {
        this.fruits.push(new Fruit(w, h, this.level, this.speedMultiplier));
      }

      const handPoints = [];
      players.forEach((p) => {
        handPoints.push({ x: p.leftHandScreen.x * w, y: p.leftHandScreen.y * h });
        handPoints.push({ x: p.rightHandScreen.x * w, y: p.rightHandScreen.y * h });
      });

      const distToSwordBlade = (fx, fy, sx, sy) => {
        const clampedY = Math.max(sy - 75, Math.min(sy + 25, fy));
        return Math.hypot(fx - sx, fy - clampedY);
      };

      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const f = this.fruits[i];
        f.update();

        const isSliceable = f.y < h - 80;
        const hitByAnySword = isSliceable && handPoints.some(hp => distToSwordBlade(f.x, f.y, hp.x, hp.y) < f.radius + 22);

        if (hitByAnySword) {
          if (f.isBomb) {
            sfx.playBombBlast();
            this.lives--;
            this.updateHUD();
            this.spawnExplosionParticles(f.x, f.y, '#f43f5e', 'juice', 25);
            this.fruits.splice(i, 1);
            
            if (this.lives <= 0) this.transitionToState('gameover');
          } else {
            sfx.playSlash();
            this.score += 15;
            this.updateHUD();

            // Split into physical flying pieces
            this.fruitPieces.push(new FruitPiece(f.x - 10, f.y, f.color, -1));
            this.fruitPieces.push(new FruitPiece(f.x + 10, f.y, f.color, 1));
            this.spawnExplosionParticles(f.x, f.y, f.color, 'juice', 20);

            this.fruits.splice(i, 1);
          }
          continue;
        }

        // Out of boundaries
        if (f.y - f.radius > h) {
          this.fruits.splice(i, 1);
        }
      }
    }

    // 3. Pat-the-Pets Mode Logic
    else if (this.gameMode === 'pets') {
      this.petSpawnCooldown--;
      const capRate = Math.max(45, 95 - this.level * 15);
      if (this.petSpawnCooldown <= 0 && this.pets.length < 2) {
        const randBurrowIdx = Math.floor(Math.random() * this.burrowPositions.length);
        
        // Ensure that burrow is currently empty
        const activeBurrows = this.pets.map(p => p.burrowIndex);
        if (!activeBurrows.includes(randBurrowIdx)) {
          const bp = this.burrowPositions[randBurrowIdx];
          this.pets.push(new Pet(randBurrowIdx, bp.x, bp.y));
          this.petSpawnCooldown = capRate;
        }
      }

      // Direct 1:1 mirrored hand coordinates for all active players' mallets
      const malletPoints = [];
      players.forEach((p) => {
        malletPoints.push({ x: p.leftHandScreen.x * w, y: p.leftHandScreen.y * h });
        malletPoints.push({ x: p.rightHandScreen.x * w, y: p.rightHandScreen.y * h });
      });

      for (let i = this.pets.length - 1; i >= 0; i--) {
        const pet = this.pets[i];
        pet.update();

        if (pet.state === 'active') {
          const hitByMallet = malletPoints.some(mp => Math.hypot(pet.x - mp.x, (pet.y - pet.animY) - mp.y) < pet.radius + 30);

          if (hitByMallet) {
            if (pet.isHedgehog) {
              sfx.playBombBlast();
              this.lives--;
              this.updateHUD();
              this.spawnExplosionParticles(pet.x, pet.y - pet.animY, '#f59e0b', 'star', 15);
              pet.state = 'retracting';
              if (this.lives <= 0) this.transitionToState('gameover');
            } else {
              sfx.playBounce();
              this.score += 10;
              this.updateHUD();
              pet.state = 'patted';
              this.spawnExplosionParticles(pet.x, pet.y - pet.animY, '#fef08a', 'star', 15);
            }
          }
        }

        if (pet.state === 'done') {
          this.pets.splice(i, 1);
        }
      }
    }

    // 4. Cosmic Defender Mode Logic
    else if (this.gameMode === 'cosmic') {
      const spawnRate = Math.max(50, 90 - this.level * 10); // Faster spawning (approx 1.3 seconds at level 1) to fill the screen with targets
      if (this.frameCount % spawnRate === 0 && this.meteors.length < 12) { // Increased maximum comets limit to 12
        this.meteors.push(new Meteor(w, h, this.level, this.speedMultiplier));
      }

      // Revolve shield orbit angle(s) across the upper sky (-PI to 0) based on player horizontal positions
      this.shieldAngle = -Math.PI + this.puppetXTarget * Math.PI;
      this.shieldAngle2 = this.activePlayers.length >= 2
        ? (-Math.PI + this.activePlayers[1].mirroredX * Math.PI)
        : null;

      const shieldAngles = [this.shieldAngle];
      if (this.shieldAngle2 !== null) shieldAngles.push(this.shieldAngle2);

      const baseCenterY = this.cosmicCockpitY;
      const baseCenterX = this.cosmicCockpitX;

      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.update();

        // 1. Deflect collision: check if meteor hits orbital shield track ring radius (120px)
        const distToCenter = Math.sqrt((m.x - baseCenterX) ** 2 + (m.y - baseCenterY) ** 2);
        
        if (Math.abs(distToCenter - 120) < m.radius + 15 && !m.isDeflected) {
          const angleToMeteor = Math.atan2(m.y - baseCenterY, m.x - baseCenterX);
          const hitShieldIdx = shieldAngles.findIndex((sa) => {
            let deltaAngle = Math.abs(angleToMeteor - sa);
            if (deltaAngle > Math.PI) deltaAngle = Math.PI * 2 - deltaAngle;
            return deltaAngle < 0.65;
          });

          if (hitShieldIdx !== -1) {
            sfx.playBounce();
            this.score += 15;
            this.updateHUD();
            
            // Deflect away from spaceship center
            m.isDeflected = true;
            m.vx = Math.cos(angleToMeteor) * 8.5;
            m.vy = Math.sin(angleToMeteor) * 8.5;
            this.spawnExplosionParticles(m.x, m.y, hitShieldIdx === 0 ? '#38bdf8' : '#4ade80', 'star', 12);
          }
        }

        // 2. Spaceship impact: cockpit center collision
        if (distToCenter < m.radius + 40) {
          sfx.playPop();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(m.x, m.y, '#ef4444', 'bubble', 20);
          this.meteors.splice(i, 1);

          if (this.lives <= 0) this.transitionToState('gameover');
          continue;
        }

        // Out of bounds deflections
        if (m.y > h || m.x < 0 || m.x > w || m.y < -50) {
          this.meteors.splice(i, 1);
        }
      }
    }

    // 5. Neon Air Hockey Mode Logic (1P vs Cyber-Bot OR 2P 1v1!)
    else if (this.gameMode === 'hockey' && this.hockey) {
      this.hockey.update(players, this.level, this.speedMultiplier, {
        onHit: (x, y, color) => {
          sfx.playPuckHit();
          this.spawnExplosionParticles(x, y, color, 'star', 8);
        },
        onWall: (x, y, color) => {
          sfx.playTick();
          this.spawnExplosionParticles(x, y, color, 'bubble', 5);
        },
        onGoal: (scorerSide, gx, gy, isTwoPlayer) => {
          sfx.playGoalHorn();
          const burstColor = scorerSide === 'left' ? '#38bdf8' : (isTwoPlayer ? '#4ade80' : '#f43f5e');
          this.spawnExplosionParticles(gx, gy, burstColor, 'star', 30);

          if (scorerSide === 'left') {
            this.score += 25;
            this.updateHUD();
          } else if (isTwoPlayer) {
            // In 2-player 1v1 mode, both players' goals count toward excitement & HUD shows live P1:P2 score!
            this.score += 25;
            this.updateHUD();
          } else {
            // In 1-player vs Cyber-Bot mode, letting a goal into your net costs 1 heart
            this.lives--;
            this.updateHUD();
            if (this.lives <= 0) {
              this.transitionToState('gameover');
            }
          }
        }
      });
    }

    // 6. Sky Wings Flyer Mode Logic (Wing-Tilt 3D Canyon & Cloud Rings!)
    else if (this.gameMode === 'airplane' && this.airplane) {
      this.airplane.update(players, this.fallbackWingTilt, this.level, this.speedMultiplier, {
        onRing: (x, y, combo) => {
          sfx.playRingChime(combo);
          this.score += 15 + Math.min(25, (combo - 1) * 5);
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#fde047', 'star', 16);
        },
        onTurbo: (x, y, combo) => {
          sfx.playTurboWhoosh();
          this.score += 35;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f472b6', 'star', 28);
        },
        onCrash: (x, y) => {
          sfx.playBombBlast();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f43f5e', 'bubble', 24);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      });
    }

    // 7. Shaun's Mossy Bottom Dash Mode Logic (Shaun P1 & Bitzer P2!)
    else if (this.gameMode === 'shaun' && this.shaunGame) {
      const fallbackControls = {
        jump: this.playerIsJumping,
        duck: this.playerIsDucking
      };
      this.shaunGame.update(players, fallbackControls, this.level, this.speedMultiplier, {
        onCollect: (x, y, itemType, pts, combo) => {
          if (itemType === 'timmy_bonus') {
            sfx.playBaa();
          } else {
            sfx.playRingChime(Math.min(8, combo));
          }
          this.score += pts;
          this.updateHUD();
          const col = itemType === 'apple' ? '#ef4444' : '#fde047';
          this.spawnExplosionParticles(x, y, col, 'star', 14);
        },
        onShirleyBounce: (x, y) => {
          sfx.playShirleyBoing();
          sfx.playBaa();
          this.score += 30;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f8fafc', 'bubble', 26);
        },
        onHitObstacle: (x, y) => {
          sfx.playBombBlast();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f59e0b', 'bubble', 22);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      });
    }

    // 8. AR Mole Head Smash Mode Logic (4-Edge Popping Critters + Glowing Neon Hand Orbs!)
    else if (this.gameMode === 'smash' && this.smashGame) {
      this.smashGame.update(players, this.level, this.speedMultiplier, {
        onSmash: (x, y, pts, color) => {
          sfx.playHeadBonk();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#fde047', 'star', 14);
        },
        onHelmetClang: (x, y, pts) => {
          sfx.playHelmetClang();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f8fafc', 'star', 10);
        },
        onBombHit: (x, y) => {
          sfx.playBombBlast();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#ef4444', 'bubble', 26);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        },
        onXpLevelUp: () => {
          this.level++;
          sfx.playLevelUp();
          this.updateHUD();
        },
        onBaa: () => {
          sfx.playBaa();
        }
      });
    }

    // 9. Super Goalie Rush Mode Logic (Nex GoKeeper Inspired + Live Selfie Trophy!)
    else if (this.gameMode === 'gokeeper' && this.gokeeperGame) {
      this.gokeeperGame.update(
        players,
        this.level,
        this.timeLeft,
        this.speedMultiplier,
        this.tracker.videoElement,
        this.score,
        {
          onSave: (x, y, pts, isSpecial, color) => {
            sfx.playGloveSave(isSpecial);
            this.score += pts;
            this.updateHUD();
            this.spawnExplosionParticles(x, y, color || '#38bdf8', 'star', isSpecial ? 22 : 12);
          },
          onMiss: (x, y, isMudBomb) => {
            if (isMudBomb) sfx.playWrongBuzzer();
            else sfx.playBombBlast();
            this.lives--;
            this.updateHUD();
            this.spawnExplosionParticles(x, y, isMudBomb ? '#a16207' : '#ef4444', 'bubble', 22);
            if (this.lives <= 0) {
              this.transitionToState('gameover');
            }
          },
          onHeal: (x, y) => {
            if (this.lives < 5) {
              this.lives++;
              this.updateHUD();
            }
            sfx.playCrowdCheer();
            this.spawnExplosionParticles(x, y, '#facc15', 'star', 28);
          },
          onSelfieSnap: () => {
            sfx.playShutterSnap();
          },
          onBlitzStart: () => {
            sfx.playWhistle();
          },
          onMagnetActivate: () => {
            sfx.playPowerUp();
            sfx.playCrowdCheer();
          }
        }
      );
    }

    // 10. Starri Beat Stage Mode Logic (Procedural Beat Sequencer + Catch/Slash/Chord/Glitch!)
    else if (this.gameMode === 'starri' && this.starriGame) {
      this.starriGame.update(players, this.level, this.speedMultiplier, this.score, {
        onHit: (x, y, pts, isSlash, color) => {
          if (isSlash) sfx.playSlash();
          else sfx.playRingChime(Math.min(8, Math.floor(this.starriGame.combo / 3) + 1));
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#38bdf8', 'star', isSlash ? 20 : 12);
        },
        onChord: (x, y, pts, color) => {
          sfx.playChordHit();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#facc15', 'star', 28);
        },
        onGlitchHit: (x, y) => {
          sfx.playWrongBuzzer();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#ef4444', 'bubble', 22);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        },
        onBeatAudio: (beat) => {
          if (beat.isKick) sfx.playBeatKick(beat.step % 8 === 0);
          if (beat.isClap) sfx.playBeatHiHat(true);
          else if (beat.isHat && beat.fever) sfx.playBeatHiHat(false);
          if (beat.bassFreq) sfx.playSynthNote(beat.bassFreq, 0.16, 'triangle', 0.08);
          if (beat.melFreq) sfx.playSynthNote(beat.melFreq, 0.14, 'sine', beat.fever ? 0.09 : 0.06);
        },
        onRankUp: () => {
          sfx.playPowerUp();
        }
      });
    }

    // 11. Copycat Mirror Party Mode Logic (DJ Acorn Simon-Says + Red-Light Freeze + AR Costumes!)
    else if (this.gameMode === 'poseparty' && this.posePartyGame) {
      const fallbackControls = {
        jump: this.playerIsJumping,
        duck: this.playerIsDucking,
        handsUp: this.playerHandsUp
      };
      this.posePartyGame.update(players, fallbackControls, this.level, this.speedMultiplier, {
        onPoseSuccess: (x, y, pts, color) => {
          sfx.playChordHit();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#4ade80', 'star', 22);
        },
        onCostumeUnlock: () => {
          sfx.playPowerUp();
          sfx.playCrowdCheer();
        },
        onPoseFail: (x, y) => {
          sfx.playWrongBuzzer();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#f43f5e', 'bubble', 18);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        },
        onLightningStart: () => {
          sfx.playWhistle();
        }
      });
    }

    // 12. Super Power Tennis Mode Logic (Mario Power Tennis 3D Stadium + Star Spots + Fireball Power Shots!)
    else if (this.gameMode === 'tennis' && this.tennisGame) {
      const fallbackControls = {
        jump: this.playerIsJumping
      };
      this.tennisGame.update(players, fallbackControls, this.level, this.speedMultiplier, {
        onHit: (shotType, proj, isStarSmash) => {
          sfx.playTennisHit(shotType);
          if (isStarSmash) {
            this.score += 15;
            this.updateHUD();
          } else {
            this.score += 5;
            this.updateHUD();
          }
          if (proj) {
            this.spawnExplosionParticles(proj.screenX, proj.screenY, isStarSmash ? '#facc15' : '#a3e635', 'star', isStarSmash ? 14 : 7);
          }
        },
        onPowerShot: (proj) => {
          sfx.playPowerShotBoom();
          this.score += 25;
          this.updateHUD();
          if (proj) {
            this.spawnExplosionParticles(proj.screenX, proj.screenY, '#f97316', 'star', 28);
          }
        },
        onItemHit: (x, y) => {
          sfx.playPowerUp();
          this.score += 30;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#fde047', 'star', 24);
        },
        onHeal: (x, y) => {
          if (this.lives < 5) {
            this.lives++;
            this.updateHUD();
          }
          sfx.playCrowdCheer();
          this.spawnExplosionParticles(x, y, '#f472b6', 'star', 26);
        },
        onPointWon: () => {
          sfx.playRingChime(4);
          this.score += 25;
          this.updateHUD();
          this.spawnExplosionParticles(w * 0.5, h * 0.35, '#38bdf8', 'star', 22);
        },
        onGameWon: () => {
          sfx.playCrowdCheer();
          sfx.playGoalHorn();
          this.score += 100;
          this.updateHUD();
          this.spawnExplosionParticles(w * 0.35, h * 0.32, '#facc15', 'star', 30);
          this.spawnExplosionParticles(w * 0.65, h * 0.32, '#4ade80', 'star', 30);
        },
        onPointLost: () => {
          sfx.playWrongBuzzer();
          this.lives--;
          this.updateHUD();
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      }, this.lives);
    }

    // 13. Dragon Balloon Archery Mode Logic (2-Hand Bow Draw & Castle Sky Defense!)
    else if (this.gameMode === 'archery' && this.archeryGame) {
      this.archeryGame.update(players, this.level, this.speedMultiplier, {
        onShoot: (isCharged) => {
          sfx.playArrowTwang(isCharged);
        },
        onPop: (x, y, pts, color) => {
          sfx.playPop();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#fde047', 'star', 16);
        },
        onBullseye: (x, y, pts) => {
          sfx.playChordHit();
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#facc15', 'star', 26);
        },
        onPowerUp: (x, y) => {
          sfx.playPowerUp();
          this.score += 20;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#38bdf8', 'star', 24);
        },
        onCastleHit: (x, y) => {
          sfx.playBombBlast();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#ef4444', 'bubble', 24);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      });
    }

    // 14. Fever Hoops Pop-A-Shot Mode Logic (Scoop & Shoot + On-Fire 2x Fever!)
    else if (this.gameMode === 'hoops' && this.hoopsGame) {
      this.hoopsGame.update(players, this.level, this.speedMultiplier, {
        onSwish: (x, y, pts, isFire) => {
          sfx.playNetSwish(isFire);
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, isFire ? '#f97316' : '#fde047', 'star', isFire ? 28 : 16);
        },
        onRimBounce: () => {
          sfx.playRimClang();
        },
        onFireIgnite: () => {
          sfx.playPowerUp();
          sfx.playCrowdCheer();
        },
        onBombBasket: (x, y) => {
          sfx.playBombBlast();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#ef4444', 'bubble', 24);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      });
    }

    // 15. AR Magic Bubble Lab Mode Logic (Live Camera 2-Hand Bubble Stretch & Sprite Chain Pops!)
    else if (this.gameMode === 'bubbles' && this.bubblesGame) {
      this.bubblesGame.update(players, this.level, this.speedMultiplier, {
        onBubbleBlow: (x, y) => {
          sfx.playBounce();
          this.spawnExplosionParticles(x, y, '#a7f3d0', 'bubble', 8);
        },
        onBubblePop: (x, y, pts, chainStep, color) => {
          sfx.playBubbleHarp(chainStep);
          this.score += pts;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, color || '#38bdf8', 'star', 14 + chainStep * 4);
        },
        onUrchinPoke: (x, y) => {
          sfx.playWrongBuzzer();
          this.lives--;
          this.updateHUD();
          this.spawnExplosionParticles(x, y, '#ef4444', 'bubble', 20);
          if (this.lives <= 0) {
            this.transitionToState('gameover');
          }
        }
      });
    }
  }

  spawnExplosionParticles(x, y, color, type, amount) {
    for (let i = 0; i < amount; i++) {
      this.particles.push(new Particle(x, y, color, type));
    }
  }

  burstBalloon(b, hitGround) {
    sfx.playPop();
    this.spawnExplosionParticles(b.x, b.y, b.color, 'bubble', 20);

    if (hitGround) {
      this.lives--;
      this.updateHUD();
      if (this.lives <= 0) this.transitionToState('gameover');
    }
  }

  drawLaserBlades() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const lhx = this.leftHandScreen.x * w;
    const lhy = this.leftHandScreen.y * h;
    const rhx = this.rightHandScreen.x * w;
    const rhy = this.rightHandScreen.y * h;

    // Player 1 Swords: Cyan & Pink
    this.drawGlowingSword(ctx, lhx, lhy, '#38bdf8');
    this.drawGlowingSword(ctx, rhx, rhy, '#ec4899');

    // Player 2 Swords: Emerald Green & Purple/Gold
    if (this.activePlayers.length >= 2) {
      const p2 = this.activePlayers[1];
      this.drawGlowingSword(ctx, p2.leftHandScreen.x * w, p2.leftHandScreen.y * h, '#4ade80');
      this.drawGlowingSword(ctx, p2.rightHandScreen.x * w, p2.rightHandScreen.y * h, '#a855f7');
    }
  }

  drawGlowingSword(ctx, x, y, color) {
    ctx.save();
    
    // 1. Draw Blade (glowing outer laser casing)
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x, y - 75); // 85px tall glowing blade
    ctx.stroke();
    
    // Core white-hot laser glow (blazing center)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y - 70);
    ctx.stroke();
    
    // 2. Draw Crossguard (hilt bar protecting the hands)
    ctx.fillStyle = '#64748b'; // Slate steel metal
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 3. Draw Handle (grip grip)
    ctx.fillStyle = '#1e293b'; // Dark grip
    ctx.beginPath();
    ctx.rect(x - 4, y + 10, 8, 26);
    ctx.fill();
    
    // 4. Draw Pommel gemstone
    ctx.fillStyle = '#f59e0b'; // Golden pommel gem
    ctx.beginPath();
    ctx.arc(x, y + 36, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  drawPetsBurrows() {
    const ctx = this.ctx;
    this.burrowPositions.forEach((pos) => {
      ctx.save();
      
      // Draw dark oval hole background
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 60, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hole frame rind border
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 60, 20, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawToyHammers() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const lhx = this.leftHandScreen.x * w;
    const lhy = this.leftHandScreen.y * h;
    const rhx = this.rightHandScreen.x * w;
    const rhy = this.rightHandScreen.y * h;

    // Player 1 Hammers: Blue & Pink
    this.drawSingleHammer(ctx, lhx, lhy, '#38bdf8', '#0369a1');
    this.drawSingleHammer(ctx, rhx, rhy, '#ec4899', '#9d174d');

    // Player 2 Hammers: Emerald Green & Purple
    if (this.activePlayers.length >= 2) {
      const p2 = this.activePlayers[1];
      this.drawSingleHammer(ctx, p2.leftHandScreen.x * w, p2.leftHandScreen.y * h, '#4ade80', '#15803d');
      this.drawSingleHammer(ctx, p2.rightHandScreen.x * w, p2.rightHandScreen.y * h, '#a855f7', '#6b21a8');
    }
  }

  drawSingleHammer(ctx, x, y, color, strokeColor) {
    ctx.save();
    
    // 1. Handle (Yellow plastic grip shaft going downwards)
    ctx.fillStyle = '#fbbf24'; // Golden yellow
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x - 6, y + 8, 12, 48, 5);
    ctx.fill();
    ctx.stroke();
    
    // Red rubber grip bands on the handle
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 6, y + 32, 12, 4);
    ctx.fillRect(x - 6, y + 42, 12, 4);
    
    // 2. Hammer Head (Large, rounded whack-a-mole mallet head)
    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(x - 38, y - 18, 76, 36, 8);
    ctx.fill();
    ctx.stroke();
    
    // Soft yellow rubber impact cushions on the left and right sides
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(x - 38, y, 6, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 38, y, 6, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // White star icon in the center of the mallet head
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', x, y);

    ctx.restore();
  }

  drawCosmicCockpit() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    const cx = this.cosmicCockpitX;
    const cy = this.cosmicCockpitY;

    ctx.save();

    // 1. Draw glowing dashboard dome cockpit sphere frame
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw active glowing revolving energy shield arc (Player 1: Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    let drawAngle = this.shieldAngle;
    if (drawAngle < 0) drawAngle += Math.PI * 2;
    ctx.arc(cx, cy, 120, drawAngle - 0.6, drawAngle + 0.6);
    ctx.stroke();

    // Player 2 Co-op Energy Shield Arc (Emerald Green)
    if (this.shieldAngle2 !== null) {
      ctx.strokeStyle = '#4ade80';
      ctx.shadowColor = '#4ade80';
      ctx.beginPath();
      let drawAngle2 = this.shieldAngle2;
      if (drawAngle2 < 0) drawAngle2 += Math.PI * 2;
      ctx.arc(cx, cy, 120, drawAngle2 - 0.6, drawAngle2 + 0.6);
      ctx.stroke();
    }

    // 3. Draw player central spaceship core capsule cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw little details inside reactor cockpit
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fill();

    // Glowing core reactor pulsing
    ctx.fillStyle = '#f472b6';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f472b6';
    const corePulse = Math.sin(this.frameCount * 0.08) * 4 + 10;
    ctx.beginPath();
    ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  game.start();
});
