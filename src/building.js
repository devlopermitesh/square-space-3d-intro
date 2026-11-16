import * as THREE from 'three';

export function buildArchitecture(scene, opts = {}) {
  const mobile = !!opts.mobile;
  const items = [];
  const disposables = { geometries: new Set(), materials: new Set() };

  const track = (obj) => {
    if (!obj) return obj;
    if (obj.geometry) disposables.geometries.add(obj.geometry);
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => disposables.materials.add(m));
    }
    return obj;
  };

  // Materials (PBR-inspired, readable on dark bg)
  const concrete = new THREE.MeshStandardMaterial({ color: 0xe7e1d6, roughness: 0.82, metalness: 0.06 });
  const concreteDark = new THREE.MeshStandardMaterial({ color: 0xcfc8bc, roughness: 0.88, metalness: 0.05 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2224, roughness: 0.4, metalness: 0.65 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x181b1d, roughness: 0.35, metalness: 0.7 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xded8cc, roughness: 0.78, metalness: 0.08 });
  const glassMatBase = { color: 0x6f98a3, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.0, side: THREE.DoubleSide };
  const glassMat = new THREE.MeshPhysicalMaterial({ ...glassMatBase, transmission: 0.12, thickness: 0.15 });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0xfff3dd, emissive: 0xffd9a8, emissiveIntensity: 0, transparent: true, opacity: 0, roughness: 0.7 });

  [concrete, concreteDark, frameMat, mullionMat, slabMat, glassMat, interiorMat].forEach((m) => disposables.materials.add(m));

  // Shared geometries
  const G = {
    ground: new THREE.PlaneGeometry(240, 240),
    podium: new THREE.BoxGeometry(1, 1, 1),
    footing: new THREE.BoxGeometry(1.1, 0.5, 1.1),
    col: new THREE.BoxGeometry(0.38, 1, 0.38),
    beamX: new THREE.BoxGeometry(1, 0.28, 0.28),
    beamZ: new THREE.BoxGeometry(0.28, 0.28, 1),
    slab: new THREE.BoxGeometry(1, 0.22, 1),
    glass: new THREE.PlaneGeometry(1, 1),
    mullionV: new THREE.BoxGeometry(0.05, 1, 0.06),
    mullionH: new THREE.BoxGeometry(1, 0.05, 0.06),
    wall: new THREE.BoxGeometry(1, 1, 0.12),
    parapet: new THREE.BoxGeometry(1, 0.35, 0.12),
    terrace: new THREE.BoxGeometry(1, 0.12, 1),
    silhouette: new THREE.BoxGeometry(1, 1, 1),
    contact: new THREE.PlaneGeometry(60, 40),
  };
  Object.values(G).forEach((g) => disposables.geometries.add(g));

  const root = new THREE.Group();
  scene.add(root);

  // Ground and technical grid
  const ground = track(new THREE.Mesh(G.ground, new THREE.MeshStandardMaterial({ color: 0x0b0d0e, roughness: 1, metalness: 0 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.25;
  root.add(ground);

  const grid = new THREE.GridHelper(120, 120, 0x3a3a36, 0x1c1d1c);
  grid.position.y = -0.23;
  grid.material.transparent = true;
  grid.material.opacity = 0;
  root.add(grid);

  // Contact shadow (soft fake)
  const contact = track(new THREE.Mesh(G.contact, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })));
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(2, -0.22, 0);
  root.add(contact);

  // Surrounding urban silhouettes (subtle)
  const silhouettes = new THREE.Group();
  root.add(silhouettes);
  const silMat = new THREE.MeshStandardMaterial({ color: 0x101314, roughness: 1, metalness: 0, transparent: true, opacity: 0.55 });
  disposables.materials.add(silMat);
  const silData = [
    { x: -38, z: -30, w: 8, h: 18, d: 8 }, { x: -28, z: -36, w: 6, h: 12, d: 6 },
    { x: 34, z: -32, w: 10, h: 22, d: 10 }, { x: 46, z: -20, w: 7, h: 14, d: 7 },
    { x: -42, z: 18, w: 9, h: 16, d: 9 }, { x: 40, z: 24, w: 8, h: 20, d: 8 },
  ];
  silData.forEach((s) => {
    const m = track(new THREE.Mesh(G.silhouette, silMat));
    m.scale.set(s.w, s.h, s.d);
    m.position.set(s.x, s.h / 2 - 0.25, s.z);
    silhouettes.add(m);
  });

  const complex = new THREE.Group();
  root.add(complex);

  // Layout: left lower stepped mass, right taller tower, podium connector
  // Coordinate system: x right, y up, z forward (toward viewer)
  const tower = { cx: 10, cz: 0, w: 10, d: 10, floors: 9, fh: 3.0 };
  const low = { cx: -8, cz: 1.5, w: 14, d: 9, floors: 4, fh: 3.1 };
  const podiumH = 1.2;

  function addRise(mesh, phase, finalY) {
    mesh.scale.y = 0.001;
    mesh.position.y = (finalY ?? mesh.position.y) - 0.8;
    mesh.userData.finalY = finalY ?? (mesh.position.y + 0.8);
    items.push({ mesh, phase, type: 'rise' });
  }
  function addGrowY(mesh, phase, final = 1) {
    mesh.scale.y = 0.001;
    mesh.userData.finalScaleY = final;
    items.push({ mesh, phase, type: 'growY' });
  }
  function addGrowX(mesh, phase, final = 1) {
    mesh.scale.x = 0.001;
    mesh.userData.finalScaleX = final;
    items.push({ mesh, phase, type: 'growX' });
  }
  function addGrowZ(mesh, phase, final = 1) {
    mesh.scale.z = 0.001;
    mesh.userData.finalScaleZ = final;
    items.push({ mesh, phase, type: 'growZ' });
  }

  // Podium / base connecting both
  const podium = track(new THREE.Mesh(G.podium, concreteDark));
  podium.scale.set(36, podiumH, 16);
  podium.position.set(1, podiumH / 2 - 0.25, 0.5);
  addRise(podium, 0.35, podiumH / 2 - 0.25);
  complex.add(podium);

  // Footings grid hints (under both masses)
  const footingXs = [-13, -8, -3, 6, 10, 14];
  const footingZs = [-2.5, 1.5, 5.5];
  footingXs.forEach((x, i) => footingZs.forEach((z, j) => {
    const f = track(new THREE.Mesh(G.footing, concreteDark));
    f.position.set(x, 0.05, z);
    addRise(f, 0.1 + (i + j) * 0.02, 0.05);
    complex.add(f);
  }));

  function buildMass(cfg, optsMass) {
    const { cx, cz, w, d, floors, fh } = cfg;
    const { xCols, zCols, stepped = false, towerFrame = false, label } = optsMass;
    const group = new THREE.Group();
    complex.add(group);
    const baseY = podiumH - 0.25;

    // core/ground slab for mass
    const baseSlab = track(new THREE.Mesh(G.slab, slabMat));
    baseSlab.scale.set(w + 0.6, 1, d + 0.6);
    baseSlab.position.set(cx, baseY + 0.12, cz);
    addRise(baseSlab, 0.7, baseY + 0.12);
    group.add(baseSlab);

    for (let f = 0; f < floors; f++) {
      const y0 = baseY + 0.24 + f * fh;
      const levelW = stepped ? w - f * 1.4 : w;
      const levelD = stepped ? d - f * 0.6 : d;
      const offX = stepped ? -f * 0.5 : 0;
      const lx = cx + offX;
      const lz = cz;
      const fg = new THREE.Group();
      group.add(fg);

      // Columns
      const xs = xCols.map((t) => lx - levelW / 2 + t * levelW);
      const zs = zCols.map((t) => lz - levelD / 2 + t * levelD);
      xs.forEach((x, xi) => zs.forEach((z) => {
        const col = track(new THREE.Mesh(G.col, towerFrame ? frameMat : frameMat));
        col.scale.y = fh;
        col.position.set(x, y0 + fh / 2, z);
        addGrowY(col, 2.0 + f * 0.18 + xi * 0.03, fh);
        fg.add(col);
      }));

      // Beams
      zs.forEach((z) => {
        const beam = track(new THREE.Mesh(G.beamX, frameMat));
        beam.scale.set(levelW, 1, 1);
        beam.position.set(lx, y0 + fh - 0.1, z);
        addGrowX(beam, 2.15 + f * 0.18, levelW);
        fg.add(beam);
      });
      xs.forEach((x) => {
        const beam = track(new THREE.Mesh(G.beamZ, frameMat));
        beam.scale.set(1, 1, levelD);
        beam.position.set(x, y0 + fh - 0.1, lz);
        addGrowZ(beam, 2.18 + f * 0.18, levelD);
        fg.add(beam);
      });

      // Floor slab extending slightly beyond facade
      const slab = track(new THREE.Mesh(G.slab, slabMat));
      slab.scale.set(levelW + 0.7, 1, levelD + 0.7);
      slab.position.set(lx, y0 + fh, lz);
      addRise(slab, 2.3 + f * 0.18, y0 + fh);
      fg.add(slab);

      // Facade: front and sides glass with mullions, back wall
      const frontZ = lz + levelD / 2 + 0.12;
      const backZ = lz - levelD / 2 - 0.06;
      const bays = Math.max(3, Math.round(levelW / 2.2));
      for (let b = 0; b < bays; b++) {
        const bx = lx - levelW / 2 + (b + 0.5) * (levelW / bays);
        const paneW = (levelW / bays) - 0.18;
        const paneH = fh - 0.7;
        const pane = track(new THREE.Mesh(G.glass, glassMat.clone()));
        pane.scale.set(paneW, paneH, 1);
        pane.position.set(bx, y0 + fh / 2 - 0.05, frontZ);
        pane.visible = false;
        pane.userData.targetOpacity = towerFrame ? 0.38 : 0.42;
        items.push({ mesh: pane, phase: 4.0 + f * 0.14 + b * 0.04, type: 'glass' });
        fg.add(pane);

        // mullions
        if (b < bays - 1 || b === 0) {
          const mx = b < bays - 1 ? bx + paneW / 2 + 0.09 : bx - paneW / 2 - 0.09;
          if (mx > lx - levelW / 2 && mx < lx + levelW / 2) {
            const mul = track(new THREE.Mesh(G.mullionV, mullionMat));
            mul.scale.y = paneH + 0.15;
            mul.position.set(mx, y0 + fh / 2 - 0.05, frontZ + 0.03);
            addGrowY(mul, 3.95 + f * 0.14 + b * 0.04, paneH + 0.15);
            fg.add(mul);
          }
        }
        const hMul = track(new THREE.Mesh(G.mullionH, mullionMat));
        hMul.scale.x = paneW;
        hMul.position.set(bx, y0 + 0.25, frontZ + 0.03);
        addGrowX(hMul, 3.98 + f * 0.14 + b * 0.03, paneW);
        fg.add(hMul);

        // interior glow
        const glow = track(new THREE.Mesh(G.glass, interiorMat.clone()));
        glow.scale.set(paneW * 0.92, paneH * 0.85, 1);
        glow.position.set(bx, y0 + fh / 2 - 0.05, frontZ - 0.08);
        glow.visible = false;
        items.push({ mesh: glow, phase: 6.0, type: 'interior', floor: f });
        fg.add(glow);
      }

      // side glass strips
      [-1, 1].forEach((side) => {
        const sx = lx + side * (levelW / 2 + 0.12);
        const pane = track(new THREE.Mesh(G.glass, glassMat.clone()));
        pane.scale.set(levelD * 0.7, fh - 0.8, 1);
        pane.position.set(sx, y0 + fh / 2 - 0.05, lz);
        pane.rotation.y = Math.PI / 2;
        pane.visible = false;
        pane.userData.targetOpacity = 0.3;
        items.push({ mesh: pane, phase: 4.2 + f * 0.14, type: 'glass' });
        fg.add(pane);
      });

      // back concrete wall
      const back = track(new THREE.Mesh(G.wall, concrete));
      back.scale.set(levelW + 0.2, fh - 0.2, 1);
      back.position.set(lx, y0 + fh / 2, backZ);
      addGrowY(back, 4.1 + f * 0.12, fh - 0.2);
      fg.add(back);

      // terrace/parapet on stepped mass upper levels
      if (stepped && f < floors - 1) {
        const ter = track(new THREE.Mesh(G.terrace, slabMat));
        ter.scale.set(levelW * 0.35, 1, 1.2);
        ter.position.set(lx + levelW * 0.32, y0 + fh + 0.02, frontZ + 0.7);
        addGrowX(ter, 4.5 + f * 0.12, levelW * 0.35);
        fg.add(ter);
      }
    }

    // Roof/parapet
    const topY = baseY + 0.24 + floors * fh;
    const roofW = stepped ? w - (floors - 1) * 1.4 : w;
    const roofD = stepped ? d - (floors - 1) * 0.6 : d;
    const roofX = stepped ? cx - (floors - 1) * 0.5 : cx;
    const roof = track(new THREE.Mesh(G.slab, slabMat));
    roof.scale.set(roofW + 0.9, 1.2, roofD + 0.9);
    roof.position.set(roofX, topY + 0.14, cz);
    addRise(roof, 4.6 + floors * 0.05, topY + 0.14);
    group.add(roof);

    const parap = track(new THREE.Mesh(G.parapet, concreteDark));
    parap.scale.set(roofW + 0.6, 1, 1);
    parap.position.set(roofX, topY + 0.45, cz + roofD / 2 + 0.3);
    addGrowY(parap, 4.8, 1);
    group.add(parap);

    return { group, topY };
  }

  // Left: lower broad stepped mass (4 floors)
  buildMass(low, { xCols: [0, 0.33, 0.66, 1], zCols: [0, 1], stepped: true, towerFrame: false, label: 'low' });

  // Right: taller tower (9 floors) with exposed dark structural framing
  const towerInfo = buildMass(tower, { xCols: [0, 0.5, 1], zCols: [0, 1], stepped: false, towerFrame: true, label: 'tower' });

  // Connector bridge element between masses
  const connector = track(new THREE.Mesh(G.slab, slabMat));
  connector.scale.set(6.5, 1, 5.2);
  connector.position.set(1.5, podiumH + 0.5, 0.8);
  addRise(connector, 2.8, podiumH + 0.5);
  complex.add(connector);
  const cGlass = track(new THREE.Mesh(G.glass, glassMat.clone()));
  cGlass.scale.set(5.5, 2.2, 1);
  cGlass.position.set(1.5, podiumH + 1.8, 3.45);
  cGlass.visible = false;
  cGlass.userData.targetOpacity = 0.35;
  items.push({ mesh: cGlass, phase: 4.4, type: 'glass' });
  complex.add(cGlass);

  // Bounding box for camera framing
  const bbox = new THREE.Box3().setFromObject(complex);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  function dispose() {
    disposables.geometries.forEach((g) => g.dispose());
    disposables.materials.forEach((m) => m.dispose());
    if (grid.geometry) grid.geometry.dispose();
    if (grid.material) grid.material.dispose?.();
    scene.remove(root);
  }

  return {
    items,
    gridMaterial: grid.material,
    contactMaterial: contact.material,
    lights: scene.userData.lights,
    bbox,
    size,
    center,
    towerTopY: towerInfo.topY,
    dispose,
  };
}
