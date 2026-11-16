// ABERRANT UNIT — kỹ thuật: giáo xương, dịch chuyển, mây axit, nuốt chửng.
export default {
  id: 'aber', name: 'ABERRANT UNIT', color: 0xa6ff3a, hp: 120, speed: 6.8, skin: 0x3b4a2a,
  gun: { name: 'BONE-LANCE SMG-30', rate: 9, spread: .006, reload: 1.7, mag: 30, tracer: 0xb6ff5a },
  viewmodel(G, { g, acc, bone }) { const { mesh, Cn } = G; for (let i = 0; i < 4; i++) mesh(new Cn(.02, .14, 4), bone, 0, .1, -.2 + i * .1, g).rotation.x = .3; for (const s of [-1, 1]) mesh(new Cn(.014, .3, 4), acc, s * .05, -.02, -.72, g).rotation.x = -Math.PI / 2 - .2 * s; },
  skills: [
    { key: 'Z', name: 'Bone Lance', cd: 3, cast(G) {
      const { P, M, mesh, Cn, am, PI, SFX, THREE } = G, eye = G.eyePos(), ad = G.aimDir(), rt = G.rightDir();
      const o = eye.clone().addScaledVector(rt, .25).addScaledVector(G.Y, -.2).addScaledVector(ad, .6), r = G.castRay(eye, ad, 200), dir = r.p.clone().sub(o).normalize();
      const g = new THREE.Group(); mesh(new Cn(.12, 2.2, 5).rotateX(PI / 2), M(0xe6dfcf, 0x335500), 0, 0, 0, g); mesh(new Cn(.26, 2.4, 5).rotateX(PI / 2), am(0x9aff30, .35), 0, 0, 0, g);
      g.position.copy(o); g.lookAt(o.clone().add(dir)); G.S.add(g); G.pj.push({ type: 'lance', m: g, v: dir.multiplyScalar(80), life: 1.5, h: new Set() }); SFX.lance(); P.kick = 1; G.flash('#8f3', .2, 200); G.burst(o, 0xb6ff5a, 10, 3, .3, 1, 0); } },
    { key: 'X', name: 'Shadow Blink', cd: 5, cast(G) {
      const { P, V, SFX } = G, p = P.pos, fw = G.flatDir(); let d = 0; const t = V();
      for (let s = .5; s <= 13; s += .5) { t.copy(p).addScaledVector(fw, s); const c = t.clone(); if (G.collide(c, .6) && c.distanceTo(t) > .05) break; if (Math.abs(t.x) > G.BOUND || Math.abs(t.z) > G.BOUND) break; d = s; }
      if (d < 1.5) { SFX.empty(); return false; }
      const from = p.clone().setY(1), to = p.clone().addScaledVector(fw, d);
      for (let s = 0; s <= d; s += .5) G.burst(from.clone().addScaledVector(fw, s), 0x7a3cff, 2, 1, .6, 1.2, 0);
      G.burst(from, 0xa6ff3a, 30, 5, .6, 1, 0); G.ring(p, 0x8a3cff, 3, .5); G.shell(from, 0x7a3cff, 2, .4, true, .6);
      p.copy(to); P.vel.set(0, 0, 0); P.ghost = 1.2; G.burst(to.clone().setY(1), 0xa6ff3a, 24, -4, .5, 1, 0); G.ring(to, 0xa6ff3a, 3, .5); G.flash('#7a2cff', .5, 400); G.speedLines('#c9f', 350); G.fov(14); SFX.blink(); } },
    { key: 'C', name: 'Acid Cloud', cd: 11, cast(G) {
      const { P, V, EM, mesh, Ic, SFX } = G, eye = G.eyePos(), ad = G.aimDir(), rt = G.rightDir(), p = P.pos, r = G.castRay(eye, ad, 60, false), tg = r.p.clone();
      if (r.wall && tg.y > .3) tg.addScaledVector(V(ad.x, 0, ad.z).normalize(), -1.5); tg.y = 0;
      const hd = Math.hypot(tg.x - p.x, tg.z - p.z); if (hd > 28) { tg.x = p.x + (tg.x - p.x) * 28 / hd; tg.z = p.z + (tg.z - p.z) * 28 / hd; }
      const st0 = eye.clone().addScaledVector(rt, .25).addScaledVector(G.Y, -.2).addScaledVector(ad, .6), T0 = .75, g = 24, v = V((tg.x - st0.x) / T0, (.15 - st0.y + .5 * g * T0 * T0) / T0, (tg.z - st0.z) / T0);
      const m = mesh(new Ic(.22, 1), EM(0x7aff2a, 0x4acc10, 1), st0.x, st0.y, st0.z, G.S); G.pj.push({ type: 'acid', m, v, g, life: 2 }); SFX.acid(); P.kick = .8; } },
    { key: 'V', name: 'Devour', cd: 16, cast(G) {
      const { P, SFX } = G, p = P.pos, fw = G.flatDir(); SFX.devour(); G.mawAnim(); G.flash('#6f2', .35, 500);
      for (const e of G.en) { if (e.dead || e.big) continue; const v = e.m.position.clone().sub(p).setY(0), l = v.length(); if (l > 10 || v.normalize().dot(fw) < .3) continue; const k = Math.max(0, l - 2.2); v.multiplyScalar(-1); e.kx += v.x * k * 6; e.kz += v.z * k * 6; e.stun = Math.max(e.stun, .7); G.burst(e.m.position.clone().setY(1.2), 0x9aff30, 5, -3, .5, 1, 0); }
      G.queue.push({ t: .2, fn: () => { if (!P.alive) return; const c = P.pos.clone().addScaledVector(G.flatDir(), 2.4), n = G.area(c, 4.5, 95, { kb: 0, stun: .5 }); if (n) { P.hp = Math.min(P.max, P.hp + 18 * Math.min(n, 4)); G.flash('#9f3', .4, 300); } G.burst(G.eyePos().addScaledVector(G.flatDir(), 1.5), 0x9aff30, 40, 6, .6, 1.2); G.ring(P.pos, 0x9aff30, 5, .5); G.shake(.6); SFX.boom(); } }); } }
  ],
  active: P => [0, P.ghost, 0, 0]
};
