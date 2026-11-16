// Bộ dụng cụ dựng màn chơi. File màn chơi (public/levels/*.js) chỉ cần gọi G.kit.gridCity({...})
// hoặc tự ghép từ các hàm nhỏ: building, house, nest, lamp, boat, walls ...
// Mọi ngẫu nhiên đều dùng G.R (RNG có hạt giống) => mọi người trong phòng dựng ra CÙNG một bản đồ.
import { THREE, V, M, EM, BM, mesh, B, Cn, Cy, Ic, Oc, ADD, PI, GDISC } from './gfx.js';

export function createKit(G) {
  const S = G.S, bl = G.bl, R = G.R;
  const addBox = (x, z, w, d, h, y0 = 0) => { const b = { x, z, w, d, h, y0 }; bl.push(b); return b; };
  const glowDisc = (x, z, r, col, op) => { const d = mesh(GDISC, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: ADD, depthWrite: false }), x, .1, z, S); d.rotation.x = -PI / 2; d.scale.setScalar(r); return d; };
  const winG = new B(.9, 1.3, .1), winL = [], WCOL = [0xffb04a, 0xff7a3a, 0xc83a46, 0x9ad0ff];
  const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);

  function windows(x, z, w, d, h) {
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const len = nx ? d : w, n = Math.max(1, Math.floor((len - 1.6) / 2.6) + 1), a = nx ? PI / 2 * nx : (nz > 0 ? 0 : PI);
      for (let i = 0; i < n; i++) for (let y = 2.4; y < h - 1.2; y += 3.1) {
        const o = (i - (n - 1) / 2) * 2.6, lit = R.f() < .32;
        winL.push([x + (nx ? nx * (w / 2 + .06) : o), y, z + (nz ? nz * (d / 2 + .06) : o), a, lit ? WCOL[R.int(4)] : 0x0b0910]);
      }
    }
  }
  function building(x, z, w, d, h) {
    mesh(new B(w, h, d), M(hsl(R.rnd(.62, .8), .1, R.rnd(.2, .3))), x, h / 2, z, S); addBox(x, z, w, d, h); windows(x, z, w, d, h);
    if (R.chance(.5)) mesh(new B(w * .4, R.rnd(1, 2.5), d * .4), M(0x1c1620), x + R.rnd(-1, 1), h + .8, z + R.rnd(-1, 1), S);
    else mesh(new Cn(Math.min(w, d) * .35, R.rnd(2, 5), 4), M(0x1c1620), x, h + 1.2, z, S).rotation.y = R.rnd(0, 1);
  }
  // Bình gas (dùng cho thuyền, hộp trong nhà...)
  function canister(col = 0xd23030) {
    const g = new THREE.Group(); mesh(new Cy(.28, .28, .8, 12), EM(col, 0x300808, .6), 0, .4, 0, g); mesh(new Cy(.29, .29, .08, 12), M(0xe6dfcf), 0, .58, 0, g);
    mesh(new Cy(.1, .12, .16, 8), M(0x888890), 0, .88, 0, g); mesh(new Oc(.3, 0), M(col), 0, .8, 0, g).scale.set(1, .5, 1); return g;
  }
  // Nhà có cửa KHÓA: cửa mở ra khi tới lượt bình gas của nhà đó (G.unlockHouse)
  function house(hx, hz, dx, dz, type) {
    const wm = M(hsl(R.rnd(.05, .1), .18, .26)), T = .5;
    const wall = (x, z, w, d) => { mesh(new B(w, 5.1, d), wm, x, 2.55, z, S); addBox(x, z, w, d, 5.1); };
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = hx + nx * 4.75, cz = hz + nz * 4.75;
      if (nx === dx && nz === dz) { for (const s of [-1, 1]) { const off = s * 3.25; wall(cx + (nz ? off : 0), cz + (nx ? off : 0), nx ? T : 3.5, nz ? T : 3.5); } }
      else wall(cx, cz, nx ? T : 10, nz ? T : 10);
    }
    mesh(new B(10.4, 1.6, 10.4), M(0x201a1e), hx, 4.3, hz, S); addBox(hx, hz, 10.4, 10.4, 5.1, 3.5);
    mesh(new B(9, .05, 9), M(0x241e22), hx, .06, hz, S);
    const door = V(hx + dx * 5, 0, hz + dz * 5);
    const fm = EM(0xff8a2a, 0xff6a10, 1.2);
    for (const s of [-1, 1]) mesh(new B(dz ? .2 : .3, 3, dx ? .2 : .3), fm, door.x + (dz ? s * 1.5 : 0), 1.5, door.z + (dx ? s * 1.5 : 0), S);
    mesh(new B(dz ? 3.2 : .3, .2, dx ? 3.2 : .3), fm, door.x, 2.95, door.z, S);
    // cánh cửa khóa (đỏ) + ổ khóa
    const lockM = EM(0x5a1418, 0xc4161c, .8), doorMesh = new THREE.Group();
    mesh(new B(dz ? 3 : .35, 5.1, dx ? 3 : .35), lockM, 0, 2.55, 0, doorMesh);
    mesh(new B(dz ? .6 : .5, .5, dx ? .6 : .5), EM(0xffb040, 0xff8a10, 1.4), dx * .05, 2.4, dz * .05, doorMesh);
    doorMesh.position.set(door.x, 0, door.z); S.add(doorMesh);
    const doorBox = addBox(door.x, door.z, dz ? 3 : .5, dx ? 3 : .5, 5.1);
    // dấu "!" phía trên cửa
    mesh(new B(dz ? .28 : .12, .8, dx ? .28 : .12), fm, door.x + dx * .35, 4.5, door.z + dz * .35, S);
    mesh(new B(dz ? .28 : .12, .28, dx ? .28 : .12), fm, door.x + dx * .35, 3.85, door.z + dz * .35, S);
    const back = V(hx - dx * 3.4, 0, hz - dz * 3.4), px = dz ? 1 : 0, pz = dx ? 1 : 0;
    const crate = new THREE.Group(); mesh(new B(1.1, .75, .8), M(0x3a3a44), 0, .4, 0, crate);
    const lid = mesh(new B(1.14, .1, .84), EM(0xff8a2a, 0xff6a10, 1), 0, .78, 0, crate), lamp2 = mesh(new B(.25, .25, .25), EM(0xff3030, 0xff2020, 1.5), 0, .98, 0, crate);
    lid.userData.ind = 1; lid.userData.e0 = 0xff6a10; lamp2.userData.ind = 1; lamp2.userData.e0 = 0xff2020;
    crate.position.set(back.x + px * -2.6, 0, back.z + pz * -2.6); S.add(crate); glowDisc(crate.position.x, crate.position.z, 2.2, 0xff8a2a, .22);
    mesh(new Ic(.2, 0), BM(0xffd9a0), hx, 3.1, hz, S); glowDisc(hx, hz, 5, 0xffc880, .1);
    const hv = V(hx - dx * 3.2 + px * 3.0, 0, hz - dz * 3.2 + pz * 3.0);
    return { x: hx, z: hz, door, crate: crate.position, cg: crate, type, done: false, hive: hv, dir: [dx, dz], locked: true, doorMesh, doorBox };
  }
  function nest(kind, x, z, max, types, spx, spz) {
    const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
    if (kind === 'mound') {
      mesh(new Cn(1.7, 1.2, 8), M(0x4a3626), 0, .6, 0, g); for (let i = 0; i < 6; i++) mesh(new THREE.DodecahedronGeometry(R.rnd(.25, .5), 0), M(0x3a2a1c), R.rnd(-1.6, 1.6), .2, R.rnd(-1.6, 1.6), g);
      mesh(new Cy(.55, .7, .2, 8), BM(0x050304), 0, 1.15, 0, g); mesh(new Oc(.12, 0), EM(0xff2200, 0xff2200, 1.5), .2, 1.0, .45, g); mesh(new Oc(.1, 0), EM(0xff2200, 0xff2200, 1.5), -.25, .95, .5, g);
      for (let i = 0; i < 4; i++) mesh(new Cn(.05, .5, 3), M(0xd8d0bc), R.rnd(-1.5, 1.5), .25, R.rnd(-1.5, 1.5), g).rotation.z = R.rnd(-1, 1);
      addBox(x, z, 1.9, 1.9, 1.4);
    } else {
      for (let i = 0; i < 5; i++) { const e = mesh(new Ic(R.rnd(.35, .6), 1), EM(0x601020, 0x3a0610, .8), R.rnd(-.8, .8), R.rnd(.3, .9), R.rnd(-.8, .8), g); e.scale.y = 1.3; }
      for (let i = 0; i < 6; i++) mesh(new Cn(.08, R.rnd(.8, 1.4), 4), M(0xd8d0bc), R.rnd(-.9, .9), .6, R.rnd(-.9, .9), g).rotation.set(R.rnd(-.4, .4), 0, R.rnd(-.4, .4));
      mesh(new Ic(.22, 0), EM(0x80ff30, 0x60ff20, 1.5), 0, 1.1, 0, g); addBox(x, z, 1.7, 1.7, 1.2);
    }
    glowDisc(x, z, 3, 0xff2a10, .2);
    return { kind, x, z, g, max, types, alive: 0, timer: R.rnd(3, 8), sp: V(spx, 0, spz), fs: null, fb: null };
  }
  function lamp(x, z) { mesh(new Cy(.1, .13, 5.5, 6), M(0x2a2a30), x, 2.75, z, S); mesh(new Ic(.38, 0), BM(0xffe0a8), x, 5.6, z, S); glowDisc(x, z, 7, 0xffc880, .15); }
  // Thuyền: nơi cất bình gas. slots[i] = vị trí bình thứ i trên boong.
  function boat(x, z, total) {
    const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
    const hull = M(0x2a3a4a), wood = M(0x6a4a2a), tr0 = new THREE.Mesh(new B(16, 1.1, 5.4), hull);
    tr0.position.set(0, .35, 0); g.add(tr0); mesh(new Cn(2.7, 3, 4).rotateZ(-PI / 2), hull, 9.5, .35, 0, g).scale.set(1, .45, 1);
    mesh(new B(15, .12, 4.6), wood, 0, .95, 0, g); mesh(new B(3.2, 2.4, 3.6), M(0x8a8a92), -5, 2.2, 0, g); mesh(new B(3.4, .3, 3.8), M(0xc4161c), -5, 3.5, 0, g);
    mesh(new Cy(.12, .12, 6, 6), M(0xaaaaaa), 1, 4, 0, g); const lt = mesh(new Ic(.35, 0), BM(0x6cff9a), 1, 7.2, 0, g);
    const slots = []; for (let i = 0; i < total; i++) slots.push(V(x - 1.5 + i * 1.3, 1.0, z + (i % 2 ? .9 : -.9)));
    glowDisc(x + 1.5, z, 5.5, 0x6cff9a, .16);
    addBox(x - 5, z, 3.2, 3.6, 3.5);   // buồng lái là vật cản; boong đi được
    return { x, z, g, slots, r: 6, lt, cans: [], put(i) { const c = canister(); c.position.copy(slots[i]); c.position.x -= x; c.position.z -= z; c.rotation.y = i; g.add(c); this.cans.push(c); } };
  }

  // ---- Thành phố dạng lưới -----------------------------------------------
  // opts: n (số khối mỗi chiều), pitch (32), houses (số bình gas), moundsAlley, moundsStreet, hMin/hMax (độ cao nhà), nearSafe (bán kính an toàn quanh thuyền)
  function gridCity(o = {}) {
    const n = o.n || 6, pitch = o.pitch || 32, half = n * pitch / 2, bound = half + 12, nHouses = o.houses || 5, nearSafe = o.nearSafe || 55;
    const hMin = o.hMin || 10, hMax = o.hMax || 28, spawn = V(0, 0, -(half + 3)), boatPos = V(0, 0, -(half + 7));
    // nền + vạch đường
    const gr = mesh(new THREE.PlaneGeometry(bound * 2 + 60, bound * 2 + 60), M(0x3b3641), 0, 0, 0, S); gr.rotation.x = -PI / 2;
    const dock = mesh(new B(bound * 2, .06, 12), M(0x5a4630), 0, .03, -(half + 6), S);
    const laneM = M(0x9a8a34, 0x3a3410);
    const axes = []; for (let k = 0; k <= n; k++) axes.push(-half + k * pitch);
    const centers = []; for (let k = 0; k < n; k++) centers.push(-half + (k + .5) * pitch);
    for (const c of axes) for (const s of centers) { mesh(new B(.25, .05, pitch - 8), laneM, c, .04, s, S); mesh(new B(pitch - 8, .05, .25), laneM, s, .04, c, S); }
    // khối nhà
    const blocks = []; for (const bx of centers) for (const bz of centers) blocks.push({ bx, bz, pat: '', d: Math.hypot(bx - spawn.x, bz - spawn.z) });
    const far = blocks.filter(b => b.d > nearSafe), near = blocks.filter(b => b.d <= nearSafe);
    const crossN = Math.max(nHouses + 2, Math.floor(far.length * .5));
    const fp = R.shuffle([...Array(crossN).fill('cross4'), ...['splitV', 'splitH', 'full', 'full', 'splitV', 'splitH', 'full', 'splitH', 'splitV']]);
    far.forEach((b, i) => { b.pat = fp[i % fp.length]; }); near.forEach(b => { b.pat = R.pick(['splitV', 'splitH', 'full', 'full']); });
    const hb = R.shuffle(far.filter(b => b.pat === 'cross4')).slice(0, nHouses);
    // đảm bảo đủ số nhà
    for (const b of R.shuffle(far)) { if (hb.length >= nHouses) break; if (!hb.includes(b)) { b.pat = 'cross4'; hb.push(b); } }
    const HT = R.shuffle(['wires', 'pipes', 'simon', 'timing', 'lights']);
    const houses = [], nests = [];
    for (const b of blocks) {
      const { bx, bz, pat } = b;
      if (pat === 'full') building(bx, bz, 24, 24, R.rnd(hMin + 4, hMax + 2));
      else if (pat === 'splitV') { for (const s of [-1, 1]) building(bx + s * 7, bz, 10, 24, R.rnd(hMin, hMax - 2)); }
      else if (pat === 'splitH') { for (const s of [-1, 1]) building(bx, bz + s * 7, 24, 10, R.rnd(hMin, hMax - 2)); }
      else {
        const hl = hb.includes(b) ? R.int(4) : -1; let k = 0;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const lx = bx + sx * 7, lz = bz + sz * 7;
          if (k++ === hl) { const horiz = R.chance(.5); houses.push(house(lx, lz, horiz ? sx : 0, horiz ? 0 : sz, HT[houses.length % HT.length])); }
          else building(lx, lz, 10, 10, R.rnd(hMin - 2, hMax - 2));
        }
      }
    }
    // tường biên
    for (const [x, z, w, d] of [[0, -bound - .5, bound * 2 + 2, 1], [0, bound + .5, bound * 2 + 2, 1], [-bound - .5, 0, 1, bound * 2 + 2], [bound + .5, 0, 1, bound * 2 + 2]]) { addBox(x, z, w, d, 14); mesh(new B(w, 14, d), M(0x1a1620), x, 7, z, S); }
    // đèn đường
    for (const cx of axes) for (const cz of axes) { lamp(cx + 3.6, cz + 3.6); if (((cx + cz) / 32 | 0) % 2 === 0) lamp(cx - 3.6, cz - 3.6); }
    // rác
    for (let i = 0; i < n * n * 3; i++) {
      const b = blocks[i % blocks.length], x = b.bx + (R.chance(.5) ? R.rnd(-1.5, 1.5) : R.rnd(-12, 12)), z = b.bz + (R.chance(.5) ? R.rnd(-12, 12) : R.rnd(-1.5, 1.5));
      if (bl.every(q => Math.abs(x - q.x) > q.w / 2 + .5 || Math.abs(z - q.z) > q.d / 2 + .5)) mesh(new THREE.DodecahedronGeometry(R.rnd(.3, .7), 0), M(0x4a4048), x, .25, z, S);
    }
    // tổ trong nhà (hive) + ụ đất trong ngõ + ụ đất ngoài đường (quái lớn)
    for (const H of houses) nests.push(nest('hive', H.hive.x, H.hive.z, 2, ['c', 'd'], H.hive.x + (H.x - H.hive.x) * .6, H.hive.z + (H.z - H.hive.z) * .6));
    const free = R.shuffle(blocks.filter(b => !hb.includes(b) && b.pat !== 'full' && b.d > nearSafe));
    const mA = o.moundsAlley != null ? o.moundsAlley : Math.round(n * .8), mS = o.moundsStreet != null ? o.moundsStreet : Math.round(n * .5);
    for (const b of free.slice(0, mA)) nests.push(nest('mound', b.bx, b.bz, 3, ['c', 'd', 'c'], b.bx + (b.pat === 'splitH' ? 3 : 0), b.bz + (b.pat === 'splitH' ? 0 : 3)));
    const ix = R.shuffle(axes.slice(1, -1).flatMap(x => axes.slice(1, -1).map(z => [x, z]))).filter(([x, z]) => Math.hypot(x - spawn.x, z - spawn.z) > nearSafe);
    for (const [cx, cz] of ix.slice(0, mS)) nests.push(nest('mound', cx + 2.6, cz + 2.6, 3, ['w', 'c', 'd'], cx - 1.5, cz + 1.5));
    const b = boat(boatPos.x, boatPos.z, houses.length);
    return { bound, spawn, boat: b, houses, nests };
  }

  // Cửa sổ (1 InstancedMesh duy nhất) + bầu trời: gọi sau khi dựng xong
  function finish() {
    const IM = new THREE.InstancedMesh(winG, new THREE.MeshBasicMaterial({ color: 0xffffff }), winL.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
    winL.forEach((w, i) => { m4.makeRotationY(w[3]); m4.setPosition(w[0], w[1], w[2]); IM.setMatrixAt(i, m4); IM.setColorAt(i, col.setHex(w[4])); }); IM.frustumCulled = false; S.add(IM);
    const sp = []; for (let i = 0; i < 500; i++) { const a = R.rnd(0, PI * 2), b = R.rnd(.1, 1.4), r = 230; sp.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); S.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xccd6ff, size: 1.4, fog: false, sizeAttenuation: false })));
    mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdde6ff, fog: false }), -110, 120, -170, S);
  }
  return { addBox, glowDisc, building, house, nest, lamp, boat, canister, gridCity, finish, windows };
}
