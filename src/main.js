import './styles.css';
import { createScene } from './scene.js';
import { buildArchitecture } from './building.js';
import { createCameraController } from './camera.js';
import { createMasterTimeline } from './animation.js';
import { createWixBridge } from './wix-bridge.js';

const canvas = document.getElementById('scene');
const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const barEl = document.getElementById('bar');
const skipBtn = document.getElementById('skip');
const fallbackEl = document.getElementById('fallback');
const titleCard = document.getElementById('titleCard');
const fadeOut = document.getElementById('fadeOut');
const hudTrack = document.querySelector('.hud__track');

const params = new URLSearchParams(window.location.search);
const preview = params.has('preview');
const debug = params.has('debug');
const bridge = createWixBridge();

let renderer, scene, camera, timeline, building, cameraController;
let rafId = 0;
let finished = false;
let started = false;
let disposed = false;
let failSafeId;

function showFallback() {
  if (fallbackEl) fallbackEl.hidden = false;
}

function updateProgress(time, duration) {
  const p = Math.max(0, Math.min(100, Math.round((time / duration) * 100)));
  if (barEl) barEl.style.width = `${p}%`;
  if (hudTrack) hudTrack.setAttribute('aria-valuenow', String(p));
  if (!statusEl) return;
  if (time < 2.0) statusEl.textContent = 'ESTABLISHING';
  else if (time < 4.0) statusEl.textContent = 'STRUCTURE';
  else if (time < 6.0) statusEl.textContent = 'APPROACH';
  else statusEl.textContent = 'HERO REVEAL';
}

function cleanup() {
  if (disposed) return;
  disposed = true;
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onResize);
  timeline?.kill();
  renderer?.setAnimationLoop(null);
  building?.dispose();
  cameraController?.dispose?.();
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
  }
}

function complete(reason = 'complete') {
  if (finished) return;
  finished = true;
  clearTimeout(failSafeId);
  timeline?.pause();
  // complete event must fire only after cinematic exit transition (fade)
  if (reason === 'complete') {
    // animation timeline handles fade and calls send+cleanup at end; but if forced, ensure fade
  }
  bridge.send(reason);
  setTimeout(() => cleanup(), 150);
}

function onResize() {
  if (!renderer || !camera) return;
  const w = app.clientWidth || window.innerWidth;
  const h = app.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  const isMobile = w < 720;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6));
  cameraController?.onResize?.(w, h);
}

function render() {
  if (disposed) return;
  rafId = requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function start() {
  if (started || finished || !timeline) return;
  started = true;
  timeline.play();
}

function init() {
  if (!canvas) throw new Error('Canvas not found');
  const ctx = createScene(canvas);
  renderer = ctx.renderer;
  scene = ctx.scene;
  camera = ctx.camera;

  const isMobile = (app.clientWidth || window.innerWidth) < 720;
  building = buildArchitecture(scene, { mobile: isMobile });
  cameraController = createCameraController(camera, building, { mobile: isMobile, debug });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  timeline = createMasterTimeline({
    building,
    cameraController,
    camera,
    scene,
    renderer,
    titleCard,
    fadeOut,
    reducedMotion,
    duration: 8,
    onUpdate: updateProgress,
    onComplete: () => {
      bridge.send('complete');
      finished = true;
      clearTimeout(failSafeId);
      setTimeout(() => cleanup(), 200);
    },
  });

  skipBtn?.addEventListener('click', () => {
    if (finished) return;
    finished = true;
    clearTimeout(failSafeId);
    timeline?.progress(1);
    timeline?.pause();
    bridge.send('skip');
    setTimeout(() => cleanup(), 100);
  }, { once: true });

  window.addEventListener('resize', onResize);
  onResize();
  render();

  bridge.send('ready');
  bridge.onStart(start);
  bridge.onSkip(() => skipBtn?.click());

  const embedded = window.parent !== window && !preview;
  if (!embedded) start();
  else setTimeout(start, 1200);

  failSafeId = setTimeout(() => {
    if (!finished) {
      finished = true;
      bridge.send('error');
      cleanup();
    }
  }, 12000);
}

try {
  init();
} catch (err) {
  console.error(err);
  showFallback();
  try { bridge.send('error'); } catch (_) {}
  clearTimeout(failSafeId);
}
