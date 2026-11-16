// IRON VANGUARD — tank: khiên, lao tốc, tên lửa, nova.  (Mẫu để làm class mới: xem _template.js)
export default {
  id: 'iron', name: 'IRON VANGUARD', color: 0x4aa8ff, hp: 150, speed: 6.4, skin: 0x30343c,
  gun: { name: 'PX-30 PLASMA CARBINE', rate: 10, spread: .004, reload: 1.5, mag: 30, tracer: 0x66ccff },
  viewmodel(G, { g, acc, dk }) { const { mesh, B, Cy, PI } = G; mesh(new Cy(.035, .035, .1, 8), acc, .07, 0, -.05, g).rotation.z = PI / 2; mesh(new B(.1, .1, .2), dk, .06, -.2, .5, g).rotation.set(.3, -.1, 0); },
  skills: [
    { key: 'Z', name: 'Aegis Shield', cd: 10, cast(G) { const { P, SFX } = G, eye = G.eyePos(), col = P.c.color; P.shield = 4; SFX.shield(); G.flash('#3aa0ff', .45, 500); G.ring(P.pos, col, 3.2, .6); G.shell(eye, col, 2.4, .6, true, .8); G.burst(eye, col, 30, 5, .6, 1, 0); } },
    { key: 'X', name: 'Thruster Dash', cd: 5, cast(G) { const { P, V, SFX } = G; P.dashT = .28; P.dashV = G.flatDir().multiplyScalar(34); P.dashHit = new Set(); P.dashDmg = 1; P.inv = .35; G.fov(22); G.speedLines('#9cf', 420); G.flash('#4af', .25, 300); SFX.dash(); G.burst(P.pos.clone().setY(1), P.c.color, 16, 4, .4, 1, 0); } },
    { key: 'C', name: 'Missile Barrage', cd: 12, cast(G) { for (let n = 0; n < 4; n++) G.queue.push({ t: n * .12, fn: () => missile(G, n) }); } },
    { key: 'V', name: 'Overcharge Nova', cd: 22, cast(G) { const { P, SFX } = G; P.charge = .75; SFX.charge(); G.queue.push({ t: .75, fn: () => nova(G) }); } }
  ],
  update(G, dt) {   // lao tốc gây sát thương
    const { P, V } = G; if (P.dashT > 0) { G.burst(P.pos.clone().setY(1), P.c.color, 3, 1.5, .4, 1.2, 0); if (P.dashDmg) for (const e of G.en) { if (e.dead || P.dashHit.has(e)) continue; if (e.m.position.distanceTo(P.pos) < 2.8) { P.dashHit.add(e); G.hit(e, 35, { kb: 4, from: P.pos, stun: .6 }); G.burst(e.m.position.clone().setY(1), 0x66ccff, 8, 4, .4); } } }
  },
  active: P => [P.shield, 0, 0, 0]
};
function nova(G) {
  const { P, SFX } = G; if (!P.alive) return; P.charge = 0; const p = P.pos, col = P.c.color, c = p.clone().setY(1.2);
  G.flash('#ffffff', .85, 600); G.shake(1.3); G.fov(-12); SFX.nova(); G.shell(c, col, 16, .6, false, .55); G.shell(c, 0xffffff, 14, .5, true, .9);
  [[16, .15, .5], [12, .8, .65], [8, 1.6, .8]].forEach(([r, y, l]) => G.ring(p, col, r, l, y)); G.burst(c, col, 70, 16, .8, 1.4, 0); G.burst(c, 0xffffff, 30, 10, .5, 1, 0);
  G.boomLight(c, col, 6); G.area(p, 16, 100, { kb: 6, stun: .8 }); G.noiseAt(p, 50);
}
function missile(G, n) {
  const { P, V, M, mesh, Cy, Cn, am, PI, Y, SFX } = G; if (!P.alive) return; const eye = G.eyePos(), f3 = G.aimDir(), rt = G.rightDir();
  const cands = G.en.filter(e => !e.dead && e.m.position.clone().sub(eye).normalize().dot(f3) > .2 && e.m.position.distanceTo(eye) < 60).sort((a, b) => a.m.position.distanceTo(eye) - b.m.position.distanceTo(eye));
  const tg = cands.length ? cands[n % cands.length] : null, g = new G.THREE.Group(), side = (n % 2 ? 1 : -1) * (n < 2 ? 1 : 1.6);
  mesh(new Cy(.07, .07, .5, 6).rotateX(PI / 2), M(0xdddddd), 0, 0, 0, g); mesh(new Cn(.07, .2, 6).rotateX(PI / 2), M(0xff4a20, 0x802000), 0, 0, .35, g); mesh(new Cn(.06, .35, 5).rotateX(-PI / 2), am(0xffaa40, .9), 0, 0, -.4, g);
  g.position.copy(eye).addScaledVector(rt, side * .5).addScaledVector(Y, -.25).addScaledVector(f3, .8); G.S.add(g);
  G.pj.push({ type: 'mis', m: g, v: f3.clone().multiplyScalar(10).addScaledVector(Y, 6 + n).addScaledVector(rt, side * 6), tg, life: 3.2, age: 0 }); SFX.missile(); G.burst(g.position, 0xffaa44, 6, 2, .3);
}
