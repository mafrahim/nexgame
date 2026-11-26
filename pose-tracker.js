/**
 * pose-tracker.js
 * Multi-player wrapper around MediaPipe Tasks Vision PoseLandmarker (tracks up to 2 players simultaneously!).
 */

import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';

class TrackedPlayerState {
  constructor(defaultMirroredX = 0.5) {
    this.rawTrackedX = 1.0 - defaultMirroredX;
    this.smoothedTrackedX = 1.0 - defaultMirroredX;
    this.lerpFactor = 0.78;

    this.yBaseline = null;
    this.isJumping = false;
    this.isDucking = false;

    this.smoothedLeftHand = { x: 0, y: 0 };
    this.smoothedRightHand = { x: 0, y: 0 };
    this.lastValidLeftHand = { x: 0, y: 0 };
    this.lastValidRightHand = { x: 0, y: 0 };

    this.smoothedLeftHandScreen = { x: Math.max(0.05, defaultMirroredX - 0.12), y: 0.7 };
    this.smoothedRightHandScreen = { x: Math.min(0.95, defaultMirroredX + 0.12), y: 0.7 };

    this.smoothedLeftLeg = { x: 0, y: 0 };
    this.smoothedRightLeg = { x: 0, y: 0 };
    this.standingLegDrop = null;
    this.hasLegTracking = false;

    this.missingFrames = 999;
  }

  get active() {
    return this.missingFrames < 18; // ~0.3s grace window so brief flickers don't drop a player
  }

  updateFromLandmarks(landmarks) {
    this.missingFrames = 0;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const nose = landmarks[0];

    if (leftShoulder && rightShoulder) {
      this.rawTrackedX = (leftShoulder.x + rightShoulder.x) / 2;
    } else if (nose) {
      this.rawTrackedX = nose.x;
    }

    this.rawTrackedX = Math.max(0, Math.min(1, this.rawTrackedX));
    this.smoothedTrackedX += (this.rawTrackedX - this.smoothedTrackedX) * this.lerpFactor;

    // Jump & Duck/Squat detection via adaptive standing nose baseline
    if (nose) {
      const currentY = nose.y;
      if (this.yBaseline === null) {
        this.yBaseline = currentY;
      } else {
        const heightDiff = this.yBaseline - currentY; // positive = higher (jump), negative = lower (duck/squat)
        if (heightDiff < 0.038 && heightDiff > -0.042) {
          this.yBaseline += (currentY - this.yBaseline) * 0.018;
        }
        this.isJumping = heightDiff > 0.038;
        this.isDucking = heightDiff < -0.048;
      }
    }

    // Reference body scale for camera distance invariance
    let bodyScale = 0.25;
    if (leftShoulder && rightShoulder) {
      const shoulderSpan = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
      if (shoulderSpan > 0.04) {
        bodyScale = shoulderSpan * 1.5;
      }
    }

    // 1. Hands Tracking (relative to shoulders + direct 1:1 mirrored screen-space)
    const pickHandPoint = (indices) => {
      for (const idx of indices) {
        const lm = landmarks[idx];
        if (lm && (lm.visibility === undefined || lm.visibility > 0.12)) {
          return lm;
        }
      }
      return null;
    };

    const leftHandLm = pickHandPoint([19, 17, 15, 13]);
    const rightHandLm = pickHandPoint([20, 18, 16, 14]);
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    let targetLeftHandX = this.lastValidLeftHand.x;
    let targetLeftHandY = this.lastValidLeftHand.y;
    const leftRef = leftWrist && (leftWrist.visibility === undefined || leftWrist.visibility > 0.15) ? leftWrist : leftHandLm;
    if (leftShoulder && leftRef) {
      targetLeftHandX = ((leftRef.x - leftShoulder.x) / bodyScale) * 0.55;
      targetLeftHandY = ((leftRef.y - leftShoulder.y) / bodyScale) * 0.55;
      this.lastValidLeftHand = { x: targetLeftHandX, y: targetLeftHandY };
    }
    this.smoothedLeftHand.x += (targetLeftHandX - this.smoothedLeftHand.x) * 0.82;
    this.smoothedLeftHand.y += (targetLeftHandY - this.smoothedLeftHand.y) * 0.82;

    let targetRightHandX = this.lastValidRightHand.x;
    let targetRightHandY = this.lastValidRightHand.y;
    const rightRef = rightWrist && (rightWrist.visibility === undefined || rightWrist.visibility > 0.15) ? rightWrist : rightHandLm;
    if (rightShoulder && rightRef) {
      targetRightHandX = ((rightRef.x - rightShoulder.x) / bodyScale) * 0.55;
      targetRightHandY = ((rightRef.y - rightShoulder.y) / bodyScale) * 0.55;
      this.lastValidRightHand = { x: targetRightHandX, y: targetRightHandY };
    }
    this.smoothedRightHand.x += (targetRightHandX - this.smoothedRightHand.x) * 0.82;
    this.smoothedRightHand.y += (targetRightHandY - this.smoothedRightHand.y) * 0.82;

    if (leftHandLm) {
      const lx = Math.max(0.02, Math.min(0.98, 1.0 - leftHandLm.x));
      const ly = Math.max(0.02, Math.min(0.98, leftHandLm.y));
      this.smoothedLeftHandScreen.x += (lx - this.smoothedLeftHandScreen.x) * 0.88;
      this.smoothedLeftHandScreen.y += (ly - this.smoothedLeftHandScreen.y) * 0.88;
    }
    if (rightHandLm) {
      const rx = Math.max(0.02, Math.min(0.98, 1.0 - rightHandLm.x));
      const ry = Math.max(0.02, Math.min(0.98, rightHandLm.y));
      this.smoothedRightHandScreen.x += (rx - this.smoothedRightHandScreen.x) * 0.88;
      this.smoothedRightHandScreen.y += (ry - this.smoothedRightHandScreen.y) * 0.88;
    }

    // 2. Legs Tracking (relative to hips & standing baseline)
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    let hasLegTracking = false;
    let targetLeftLegX = 0;
    let targetLeftLegY = 0;
    let targetRightLegX = 0;
    let targetRightLegY = 0;

    const leftFootPoint = (leftAnkle && (leftAnkle.visibility === undefined || leftAnkle.visibility > 0.3)) ? leftAnkle :
                          (leftKnee && (leftKnee.visibility === undefined || leftKnee.visibility > 0.35)) ? leftKnee : null;
    const rightFootPoint = (rightAnkle && (rightAnkle.visibility === undefined || rightAnkle.visibility > 0.3)) ? rightAnkle :
                           (rightKnee && (rightKnee.visibility === undefined || rightKnee.visibility > 0.35)) ? rightKnee : null;

    if (leftHip && rightHip && (leftFootPoint || rightFootPoint)) {
      hasLegTracking = true;

      const isUsingLeftAnkle = leftFootPoint === leftAnkle;
      const isUsingRightAnkle = rightFootPoint === rightAnkle;

      const curLeftDrop = leftFootPoint ? (leftFootPoint.y - leftHip.y) : 0;
      const curRightDrop = rightFootPoint ? (rightFootPoint.y - rightHip.y) : 0;
      const maxDrop = Math.max(curLeftDrop, curRightDrop);

      if (maxDrop > 0.1) {
        if (this.standingLegDrop === null) {
          this.standingLegDrop = maxDrop;
        } else if (maxDrop > this.standingLegDrop * 0.88) {
          this.standingLegDrop += (maxDrop - this.standingLegDrop) * 0.04;
        }
      }

      const baseline = this.standingLegDrop || (bodyScale * 1.6);
      const kneeBaseline = baseline * 0.52;

      if (leftFootPoint) {
        const base = isUsingLeftAnkle ? baseline : kneeBaseline;
        const mult = isUsingLeftAnkle ? 1.0 : 1.7;
        targetLeftLegX = ((leftFootPoint.x - leftHip.x) / bodyScale) * 0.55 * mult;
        targetLeftLegY = (((leftFootPoint.y - leftHip.y) - base) / bodyScale) * 0.8 * mult;
        targetLeftLegY = Math.max(-1.5, Math.min(0.2, targetLeftLegY));
      }

      if (rightFootPoint) {
        const base = isUsingRightAnkle ? baseline : kneeBaseline;
        const mult = isUsingRightAnkle ? 1.0 : 1.7;
        targetRightLegX = ((rightFootPoint.x - rightHip.x) / bodyScale) * 0.55 * mult;
        targetRightLegY = (((rightFootPoint.y - rightHip.y) - base) / bodyScale) * 0.8 * mult;
        targetRightLegY = Math.max(-1.5, Math.min(0.2, targetRightLegY));
      }
    }

    this.hasLegTracking = hasLegTracking;
    this.smoothedLeftLeg.x += (targetLeftLegX - this.smoothedLeftLeg.x) * 0.72;
    this.smoothedLeftLeg.y += (targetLeftLegY - this.smoothedLeftLeg.y) * 0.72;
    this.smoothedRightLeg.x += (targetRightLegX - this.smoothedRightLeg.x) * 0.72;
    this.smoothedRightLeg.y += (targetRightLegY - this.smoothedRightLeg.y) * 0.72;
  }

  toPayload() {
    return {
      x: this.smoothedTrackedX,
      mirroredX: 1.0 - this.smoothedTrackedX,
      leftHand: this.smoothedLeftHand,
      rightHand: this.smoothedRightHand,
      leftHandScreen: this.smoothedLeftHandScreen,
      rightHandScreen: this.smoothedRightHandScreen,
      leftLeg: this.smoothedLeftLeg,
      rightLeg: this.smoothedRightLeg,
      hasLegTracking: this.hasLegTracking,
      isJumping: this.isJumping,
      isDucking: this.isDucking
    };
  }
}

export class PoseTracker {
  constructor() {
    this.videoElement = document.getElementById('webcam');
    this.overlayCanvas = document.getElementById('camera-overlay');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.statusElement = document.getElementById('camera-status');

    this.poseLandmarker = null;
    this.lastVideoTime = -1;
    this.lastInferMs = 0;

    // Lightweight 256x192 offscreen buffer matching PoseLandmarker Lite's neural input size
    // Avoids uploading/copying full 640x480 video frames on the main thread every tick!
    this.inferCanvas = document.createElement('canvas');
    this.inferCanvas.width = 256;
    this.inferCanvas.height = 192;
    this.inferCtx = this.inferCanvas.getContext('2d', { willReadFrequently: false });

    this.players = [
      new TrackedPlayerState(0.35), // Player 1 (Cyan)
      new TrackedPlayerState(0.65)  // Player 2 (Green/Emerald)
    ];

    this.isTrackingActive = false;
    this.onTrackingCallback = null;
    this.onCalibrationSuccess = null;
    this.calibrationPassed = false;
    this.frameCounter = 0;
    this.lastPlayerCount = 0;
  }

  async initialize() {
    this.updateStatus('Loading Multi-Player AI...', 'connecting');

    try {
      // 1. Load MediaPipe Tasks Vision WASM & PoseLandmarker (numPoses: 2!)
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 2,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
        });
      } catch (gpuErr) {
        console.warn('GPU delegate unavailable, falling back to CPU:', gpuErr);
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 2,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
        });
      }

      // 2. Start Web Camera (Wide 16:9 friendly framing if supported, fallback to 640x480)
      this.updateStatus('Starting Camera Feed...', 'connecting');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      this.videoElement.srcObject = stream;

      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.overlayCanvas.width = this.videoElement.videoWidth;
          this.overlayCanvas.height = this.videoElement.videoHeight;
          this.videoElement.play();
          resolve();
        };
      });

      this.updateStatus('Camera Connected! (1–2 Players)', 'ready');
      this.detectLoop();

    } catch (error) {
      console.error('PoseTracker Initialization failed:', error);
      this.updateStatus('Camera Error! Check Permissions.', 'error');
    }
  }

  detectLoop() {
    if (this.poseLandmarker && this.videoElement && this.videoElement.readyState >= 2) {
      const nowMs = performance.now();
      if (this.videoElement.currentTime !== this.lastVideoTime && nowMs - this.lastInferMs >= 30) {
        this.lastVideoTime = this.videoElement.currentTime;
        this.lastInferMs = nowMs;
        this.inferCtx.drawImage(this.videoElement, 0, 0, this.inferCanvas.width, this.inferCanvas.height);
        const result = this.poseLandmarker.detectForVideo(this.inferCanvas, nowMs);
        this.handlePoseResults(result);
      }
    }
    requestAnimationFrame(() => this.detectLoop());
  }

  updateStatus(message, stateClass) {
    this.statusElement.textContent = message;
    this.statusElement.className = '';
    this.statusElement.classList.add(`status-${stateClass}`);
  }

  getPoseMidX(landmarks) {
    const ls = landmarks[11];
    const rs = landmarks[12];
    if (ls && rs) return (ls.x + rs.x) / 2;
    if (landmarks[0]) return landmarks[0].x;
    return 0.5;
  }

  handlePoseResults(results) {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const detectedList = (results && results.landmarks) ? results.landmarks : [];

    if (detectedList.length === 0) {
      this.players[0].missingFrames++;
      this.players[1].missingFrames++;
      this.isTrackingActive = this.players[0].active || this.players[1].active;
      return;
    }

    this.isTrackingActive = true;
    this.frameCounter++;

    // Assign detected poses consistently to Player 0 and Player 1 by horizontal proximity
    if (detectedList.length === 1) {
      const lm = detectedList[0];
      const midX = this.getPoseMidX(lm);

      // If Player 2 was also recently active, match to whichever player slot was closer
      const p0Dist = Math.abs(midX - this.players[0].smoothedTrackedX);
      const p1Dist = Math.abs(midX - this.players[1].smoothedTrackedX);

      if (this.players[1].active && !this.players[0].active) {
        // Promote or keep P0 as primary when only 1 person remains for > 15 frames
        this.players[0].updateFromLandmarks(lm);
        this.players[1].missingFrames++;
        this.drawSkeleton(lm, 0);
      } else if (this.players[1].active && p1Dist + 0.08 < p0Dist && this.players[0].missingFrames < 10) {
        this.players[1].updateFromLandmarks(lm);
        this.players[0].missingFrames++;
        this.drawSkeleton(lm, 1);
      } else {
        this.players[0].updateFromLandmarks(lm);
        this.players[1].missingFrames++;
        this.drawSkeleton(lm, 0);
      }
    } else {
      // 2 poses detected! Sort or match cleanly to prevent identity swapping
      const lmA = detectedList[0];
      const lmB = detectedList[1];
      const midA = this.getPoseMidX(lmA);
      const midB = this.getPoseMidX(lmB);

      let p0Lm, p1Lm;
      if (this.players[0].active && this.players[1].active) {
        // Hungarian 2x2 assignment: minimize total horizontal jump
        const costDirect = Math.abs(midA - this.players[0].smoothedTrackedX) + Math.abs(midB - this.players[1].smoothedTrackedX);
        const costSwapped = Math.abs(midB - this.players[0].smoothedTrackedX) + Math.abs(midA - this.players[1].smoothedTrackedX);
        if (costDirect <= costSwapped) {
          p0Lm = lmA;
          p1Lm = lmB;
        } else {
          p0Lm = lmB;
          p1Lm = lmA;
        }
      } else {
        // Default initial assignment: leftmost person on mirrored screen (larger raw X) = Player 1, rightmost = Player 2
        if (midA >= midB) {
          p0Lm = lmA;
          p1Lm = lmB;
        } else {
          p0Lm = lmB;
          p1Lm = lmA;
        }
      }

      this.players[0].updateFromLandmarks(p0Lm);
      this.players[1].updateFromLandmarks(p1Lm);
      this.drawSkeleton(p0Lm, 0);
      this.drawSkeleton(p1Lm, 1);
    }

    const activePlayers = [];
    if (this.players[0].active) activePlayers.push(this.players[0].toPayload());
    if (this.players[1].active) activePlayers.push(this.players[1].toPayload());

    if (activePlayers.length !== this.lastPlayerCount && this.calibrationPassed) {
      this.lastPlayerCount = activePlayers.length;
      if (activePlayers.length >= 2) {
        this.updateStatus('2 Players Active! 🐶🐶 Co-op Mode!', 'ready');
      } else if (activePlayers.length === 1) {
        this.updateStatus('1 Player Tracked 🐶 (Step in for 2P!)', 'ready');
      }
    }

    if (this.onTrackingCallback && activePlayers.length > 0) {
      const p1 = activePlayers[0];
      this.onTrackingCallback({
        ...p1,
        players: activePlayers
      });
    }

    if (!this.calibrationPassed && this.frameCounter > 10) {
      this.calibrationPassed = true;
      this.lastPlayerCount = activePlayers.length;
      this.updateStatus(
        activePlayers.length >= 2 ? '2 Players Active! 🐶🐶 Co-op Mode!' : '1 Player Tracked 🐶 (Step in for 2P!)',
        'ready'
      );
      if (this.onCalibrationSuccess) {
        this.onCalibrationSuccess();
      }
    }
  }

  drawSkeleton(landmarks, playerIndex = 0) {
    const ctx = this.overlayCtx;
    const width = this.overlayCanvas.width;
    const height = this.overlayCanvas.height;

    // Distinct colors for Player 1 (Cyan/Pink) vs Player 2 (Emerald Green/Purple)
    const boneColor = playerIndex === 0 ? '#38bdf8' : '#4ade80';
    const handColor = playerIndex === 0 ? '#f43f5e' : '#a855f7';
    const noseColor = playerIndex === 0 ? '#ff4b82' : '#fbbf24';

    ctx.lineWidth = 4;
    ctx.strokeStyle = boneColor;

    const connections = [
      [11, 12],
      [11, 23],
      [12, 24],
      [23, 24],
      [11, 13], [13, 15],
      [12, 14], [14, 16],
      [23, 25], [25, 27],
      [24, 26], [26, 28]
    ];

    ctx.beginPath();
    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility === undefined || p1.visibility > 0.3) && (p2.visibility === undefined || p2.visibility > 0.3)) {
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
      }
    });
    ctx.stroke();

    const trackedJoints = [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28];
    trackedJoints.forEach((index) => {
      const landmark = landmarks[index];
      if (landmark && (landmark.visibility === undefined || landmark.visibility > 0.25)) {
        ctx.beginPath();
        if (index === 0) {
          ctx.arc(landmark.x * width, landmark.y * height, 10, 0, 2 * Math.PI);
          ctx.fillStyle = noseColor;
        } else if (index === 27 || index === 28) {
          ctx.arc(landmark.x * width, landmark.y * height, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#f59e0b';
        } else if (index === 15 || index === 16 || index === 19 || index === 20) {
          ctx.arc(landmark.x * width, landmark.y * height, 8, 0, 2 * Math.PI);
          ctx.fillStyle = handColor;
        } else {
          ctx.arc(landmark.x * width, landmark.y * height, 6, 0, 2 * Math.PI);
          ctx.fillStyle = boneColor;
        }
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
}
