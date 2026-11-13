const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const wrap = document.getElementById("wrap");

const RIGHT_EYE = [33, 160, 158, 133, 153, 144];
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.21;
const CLOSED_MS = 1500;

let closedSince = null;
let audioCtx = null;
let beepTimer = null;

function dist(a, b, w, h) {
  return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
}

function ear(lm, idx, w, h) {
  const p = idx.map(i => lm[i]);
  return (dist(p[1], p[5], w, h) + dist(p[2], p[4], w, h)) / (2 * dist(p[0], p[3], w, h));
}

function startAlarm() {
  if (beepTimer) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const beep = () => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.3);
  };
  beep();
  beepTimer = setInterval(beep, 600);
}

function stopAlarm() {
  clearInterval(beepTimer);
  beepTimer = null;
}

function onResults(results) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
    closedSince = null;
    stopAlarm();
    wrap.classList.remove("alert");
    statusEl.textContent = "No face detected";
    return;
  }

  const lm = results.multiFaceLandmarks[0];
  const w = canvas.width, h = canvas.height;
  const avg = (ear(lm, LEFT_EYE, w, h) + ear(lm, RIGHT_EYE, w, h)) / 2;

  ctx.fillStyle = "#1e9bd7";
  [...LEFT_EYE, ...RIGHT_EYE].forEach(i => {
    ctx.beginPath();
    ctx.arc(lm[i].x * w, lm[i].y * h, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  if (avg < EAR_THRESHOLD) {
    closedSince = closedSince || performance.now();
    if (performance.now() - closedSince > CLOSED_MS) {
      wrap.classList.add("alert");
      statusEl.textContent = "Drowsiness detected! Wake up!";
      startAlarm();
      return;
    }
  } else {
    closedSince = null;
  }
  stopAlarm();
  wrap.classList.remove("alert");
  statusEl.textContent = "Alert";
}

const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => { await faceMesh.send({ image: video }); },
  width: 640,
  height: 480
});
camera.start().catch(() => { statusEl.textContent = "Camera access denied"; });
