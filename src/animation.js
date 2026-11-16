import { gsap } from 'gsap';

export function createMasterTimeline({
  building,
  cameraController,
  camera,
  scene,
  renderer,
  titleCard,
  fadeOut,
  reducedMotion,
  duration = 8,
  onUpdate,
  onComplete,
}) {
  const { items, gridMaterial, contactMaterial, lights } = building;

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.out' },
    onUpdate: () => onUpdate?.(tl.time(), duration),
  });

  if (cameraController?.initDebug && new URLSearchParams(window.location.search).has('debug')) {
    cameraController.initDebug(scene);
  }

  if (reducedMotion) {
    // Final state, minimal transition, complete quickly
    items.forEach(({ mesh, type }) => {
      if (type === 'rise') {
        mesh.scale.y = 1;
        if (mesh.userData.finalY != null) mesh.position.y = mesh.userData.finalY;
      } else if (type === 'growY') mesh.scale.y = mesh.userData.finalScaleY ?? 1;
      else if (type === 'growX') mesh.scale.x = mesh.userData.finalScaleX ?? 1;
      else if (type === 'growZ') mesh.scale.z = mesh.userData.finalScaleZ ?? 1;
      else if (type === 'glass') { mesh.visible = true; if (mesh.material) mesh.material.opacity = mesh.userData.targetOpacity ?? 0.4; }
      else if (type === 'interior') { mesh.visible = true; if (mesh.material) { mesh.material.opacity = 0.3; mesh.material.emissiveIntensity = 0.5; } }
    });
    if (gridMaterial) gridMaterial.opacity = 0.25;
    if (contactMaterial) contactMaterial.opacity = 0.35;
    if (titleCard) gsap.set(titleCard, { opacity: 1 });
    if (fadeOut) gsap.set(fadeOut, { opacity: 0 });
    cameraController?.apply();
    tl.to({}, { duration: 0.6 });
    // fade then complete
    if (fadeOut) tl.to(fadeOut, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0.6);
    tl.call(() => onComplete?.(), [], 1.15);
    return tl;
  }

  // Environment reveals
  if (gridMaterial) tl.to(gridMaterial, { opacity: 0.28, duration: 1.2, ease: 'sine.out' }, 0.1);
  if (contactMaterial) tl.to(contactMaterial, { opacity: 0.32, duration: 1.6, ease: 'sine.out' }, 0.6);

  // Building construction sequencing (engineered, staggered)
  items.forEach(({ mesh, phase, type }) => {
    const p = phase;
    if (type === 'rise') {
      tl.to(mesh.scale, { y: 1, duration: 0.7, ease: 'power3.out' }, p);
      if (mesh.userData.finalY != null) {
        tl.to(mesh.position, { y: mesh.userData.finalY, duration: 0.7, ease: 'power3.out' }, p);
      }
    } else if (type === 'growY') {
      tl.to(mesh.scale, { y: mesh.userData.finalScaleY ?? 1, duration: 0.55, ease: 'power2.out' }, p);
    } else if (type === 'growX') {
      tl.to(mesh.scale, { x: mesh.userData.finalScaleX ?? 1, duration: 0.5, ease: 'power2.out' }, p);
    } else if (type === 'growZ') {
      tl.to(mesh.scale, { z: mesh.userData.finalScaleZ ?? 1, duration: 0.5, ease: 'power2.out' }, p);
    } else if (type === 'glass') {
      tl.set(mesh, { visible: true }, p);
      tl.to(mesh.material, { opacity: mesh.userData.targetOpacity ?? 0.38, duration: 0.45, ease: 'sine.out' }, p);
    } else if (type === 'interior') {
      const ip = p + (mesh.userData.floor || 0) * 0.06;
      tl.set(mesh, { visible: true }, ip);
      if (mesh.material) {
        tl.to(mesh.material, { opacity: 0.28, duration: 0.7, ease: 'sine.inOut' }, ip);
        tl.to(mesh.material, { emissiveIntensity: 0.55, duration: 0.9, ease: 'sine.inOut' }, ip);
      }
    }
  });

  // Subtle lighting increase near completion
  if (lights) {
    tl.to(lights.ambient, { intensity: 0.68, duration: 1.2, ease: 'sine.inOut' }, 6.0);
    tl.to(lights.key, { intensity: 2.7, duration: 1.2, ease: 'sine.inOut' }, 6.0);
    tl.to(lights.accent, { intensity: 0.9, duration: 1.2, ease: 'sine.inOut' }, 6.0);
  }
  if (renderer) {
    const exp = { v: renderer.toneMappingExposure };
    tl.to(exp, { v: 1.08, duration: 1.2, ease: 'sine.inOut', onUpdate: () => { renderer.toneMappingExposure = exp.v; } }, 6.0);
  }

  // Camera cinematic path
  cameraController?.buildTimeline(tl, duration);

  // Title reveal 6.0-7.2 and hold, then fade to near-black 7.2-8.0
  if (titleCard) {
    gsap.set(titleCard, { opacity: 0 });
    tl.to(titleCard, { opacity: 1, duration: 0.9, ease: 'sine.inOut' }, 6.2);
  }
  if (fadeOut) {
    gsap.set(fadeOut, { opacity: 0 });
    tl.to(fadeOut, { opacity: 1, duration: 0.7, ease: 'sine.inOut' }, 7.3);
  }

  // End at 8s and fire complete after fade
  tl.to({}, { duration: 0.01 }, duration);
  tl.call(() => onComplete?.(), [], duration);

  return tl;
}
