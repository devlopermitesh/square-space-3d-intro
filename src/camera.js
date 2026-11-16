import * as THREE from 'three';
import { gsap } from 'gsap';

export function createCameraController(camera, building, opts = {}) {
  const { mobile = false, debug = false } = opts;
  const { center, size } = building;

  // Calculate framing from bounding box and FOV
  const fov = mobile ? 46 : 40;
  camera.fov = fov;
  camera.updateProjectionMatrix();

  const maxDim = Math.max(size.x, size.y, size.z);
  const fitDist = (maxDim / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const d = Math.max(fitDist * 1.15, 38);

  // Named keyframes: ESTABLISHING, STRUCTURE, APPROACH, DETAIL, HERO
  // Targets biased toward complex center/connection area
  const cx = center.x;
  const cy = center.y;
  const cz = center.z;

  const keyframes = {
    ESTABLISHING: {
      pos: new THREE.Vector3(cx - d * 0.55, cy + d * 0.42, cz + d * 0.85),
      look: new THREE.Vector3(cx, cy - 1, cz),
    },
    STRUCTURE: {
      pos: new THREE.Vector3(cx - d * 0.42, cy + d * 0.34, cz + d * 0.68),
      look: new THREE.Vector3(cx + 1, cy + 1, cz),
    },
    APPROACH: {
      pos: new THREE.Vector3(cx - d * 0.22, cy + d * 0.22, cz + d * 0.46),
      look: new THREE.Vector3(cx + 2, cy + 3, cz + 1), // toward connection
    },
    DETAIL: {
      pos: new THREE.Vector3(cx - d * 0.12, cy + d * 0.18, cz + d * 0.34),
      look: new THREE.Vector3(cx + 3, cy + 5, cz + 1.5),
    },
    HERO: {
      pos: new THREE.Vector3(cx - d * 0.05, cy + d * 0.28, cz + d * 0.28),
      look: new THREE.Vector3(cx + 4, cy + 8, cz + 0.5), // tower emphasis
    },
  };

  // Mobile portrait adjustments: pull back and raise to keep both masses framed
  if (mobile) {
    Object.values(keyframes).forEach((k) => {
      k.pos.z += d * 0.18;
      k.pos.y += d * 0.06;
      k.pos.x *= 0.9;
    });
  }

  const state = {
    pos: keyframes.ESTABLISHING.pos.clone(),
    look: keyframes.ESTABLISHING.look.clone(),
  };

  let debugHelpers;
  function apply() {
    camera.position.copy(state.pos);
    camera.lookAt(state.look);
  }

  function initDebug(scene) {
    if (!debug || !scene) return;
    debugHelpers = [];
    const mat = new THREE.LineBasicMaterial({ color: 0xffaa00 });
    const pts = [keyframes.ESTABLISHING.pos, keyframes.STRUCTURE.pos, keyframes.APPROACH.pos, keyframes.DETAIL.pos, keyframes.HERO.pos];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    debugHelpers.push(line, geo, mat);
    const sMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    const sGeo = new THREE.SphereGeometry(0.25, 8, 8);
    pts.forEach((p) => {
      const m = new THREE.Mesh(sGeo, sMat);
      m.position.copy(p);
      scene.add(m);
      debugHelpers.push(m);
    });
    debugHelpers.push(sGeo, sMat);
    console.log('[camera debug] keyframes', keyframes, { fitDist, d, size, center });
  }

  // initialize
  apply();

  function buildTimeline(tl, duration = 8) {
    // Continuous dolly/push-in with subtle lateral/orbit movement, no shake
    // 0-2: wide establishing, slow forward dolly
    tl.to(state.pos, { x: keyframes.STRUCTURE.pos.x, y: keyframes.STRUCTURE.pos.y, z: keyframes.STRUCTURE.pos.z, duration: 2.0, ease: 'sine.inOut' }, 0);
    tl.to(state.look, { x: keyframes.STRUCTURE.look.x, y: keyframes.STRUCTURE.look.y, z: keyframes.STRUCTURE.look.z, duration: 2.0, ease: 'sine.inOut' }, 0);

    // 2-4: continue forward and slightly sideways
    tl.to(state.pos, { x: keyframes.APPROACH.pos.x, y: keyframes.APPROACH.pos.y, z: keyframes.APPROACH.pos.z, duration: 2.0, ease: 'sine.inOut' }, 2.0);
    tl.to(state.look, { x: keyframes.APPROACH.look.x, y: keyframes.APPROACH.look.y, z: keyframes.APPROACH.look.z, duration: 2.0, ease: 'sine.inOut' }, 2.0);

    // 4-6: push-in closer, subtle horizontal orbit/parallax
    tl.to(state.pos, { x: keyframes.DETAIL.pos.x, y: keyframes.DETAIL.pos.y, z: keyframes.DETAIL.pos.z, duration: 2.0, ease: 'sine.inOut' }, 4.0);
    tl.to(state.look, { x: keyframes.DETAIL.look.x, y: keyframes.DETAIL.look.y, z: keyframes.DETAIL.look.z, duration: 2.0, ease: 'sine.inOut' }, 4.0);

    // 6-8: gentle arc upward while controlled push-in to hero
    tl.to(state.pos, { x: keyframes.HERO.pos.x, y: keyframes.HERO.pos.y, z: keyframes.HERO.pos.z, duration: 2.0, ease: 'sine.inOut' }, 6.0);
    tl.to(state.look, { x: keyframes.HERO.look.x, y: keyframes.HERO.look.y, z: keyframes.HERO.look.z, duration: 2.0, ease: 'sine.inOut' }, 6.0);

    tl.eventCallback('onUpdate', () => { apply(); });
  }

  function onResize() {
    apply();
  }

  function dispose() {
    if (debugHelpers) {
      // debug helpers added to scene, but scene disposed elsewhere; best-effort
    }
  }

  return { state, keyframes, buildTimeline, apply, onResize, initDebug, dispose };
}
