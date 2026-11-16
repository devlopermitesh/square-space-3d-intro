import * as THREE from 'three';

export function createScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    throw new Error('WebGL unavailable');
  }
  if (!renderer.getContext()) throw new Error('WebGL unavailable');

  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false; // performance-friendly; use contact-like fake shadow plane

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050607);
  scene.fog = new THREE.FogExp2(0x050607, 0.012);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(38, 22, 38);
  camera.lookAt(0, 10, 0);

  // Lighting: warm key, cool ambient/fill, warm rim - readable on near-black bg
  const ambient = new THREE.AmbientLight(0x8fa3ad, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x9fb7c4, 0x1a1c1d, 0.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe6c7, 2.4);
  key.position.set(-28, 38, 22);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8fb6c9, 0.8);
  fill.position.set(24, 18, -18);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd9a8, 1.1);
  rim.position.set(10, 30, -30);
  scene.add(rim);

  const accent = new THREE.PointLight(0xfff1d6, 0.6, 80, 2);
  accent.position.set(0, 18, 12);
  scene.add(accent);

  // store refs for animation to subtly intensify near completion
  scene.userData.lights = { ambient, hemi, key, fill, rim, accent };

  return { renderer, scene, camera };
}
