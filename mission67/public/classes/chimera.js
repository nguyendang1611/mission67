// CHIMERA DIVISION — cận chiến: SHOTGUN 4 viên/lần nạp (sát thương lớn nhưng giảm mạnh theo khoảng cách), vuốt, nhào, gầm, cuồng nộ.
export default {
  id: 'chim', name: 'CHIMERA DIVISION', color: 0xff8a2a, hp: 180, speed: 7.2, skin: 0x7a4a2a, claw: true,
  gun: {
    name: 'FERAL BREACHER SG-4', style: 'shotgun', rate: 1.25, spread: .06, reload: 2.1, mag: 4,
    pellets: 9, dmg: 14,            // 9 viên đạn × 14 = 126 sát thương ở cự ly sát
    falloff: [5, 22, .1],           // đủ sát thương ≤5m, giảm dần tới 10% ở 22m
    range: 60, tracer: 0xffaa44
  },
  skills: [
    { key: 'Z', name: 'Claw Slash', cd: 2, cast(G) {
      const { P, THREE, am, SFX } = G, eye = G.eyePos(), ad = G.aimDir(); P.melee = .3; G.clawAnim(); SFX.claw(); G.shake(.25);
      for (let n = 0; n < 3; n++) { const m = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 28, 1, 0, 2.2), am(0xff9a3a, .9)); m.position.copy(eye).addScaledVector(ad, 2.3); m.quaternion.copy(G.cam.quaternion); m.rotateZ(-.6 + n * .45); G.addFx(m, .28, k => { m.scale.setScalar(.7 + k * .6); m.material.opacity = .9 * (1 - k); }, 1); }
      const cnt = G.area(P.pos.clone(), 5.2, 60, { dir: G.flatDir(), arc: .35, kb: 1.5 }); if (cnt) { P.hp = Math.min(P.max, P.hp + 6 * cnt); G.flash('#f50', .2, 200); } } },
    { key: 'X', name: 'Pounce', cd: 6, cast(G) {
      const { P, SFX } = G; P.vy = 9; P.onGround = false; P.dashT = 2; P.dashV = G.flatDir().multiplyScalar(17); G.fov(16); G.speedLines('#fb8', 500); SFX.claw(); G.burst(P.pos, 0x998877, 12, 3, .5, 1.3);
      P.onLand = () => slam(G); } },
    { key: 'C', name: 'Terror Roar', cd: 12, cast(G) {
      const { P, SFX } = G, p = P.pos; SFX.roar(); G.roarAnim(); G.flash('#f60', .4, 500); G.holdShake(.9); G.fov(-10);
      for (let n = 0; n < 3; n++) G.queue.push({ t: n * .15, fn: () => G.ring(P.pos, 0xff6a30, 13, .7, .2 + n * .5) });
      G.burst(G.eyePos(), 0xff9a30, 40, 12, .7, 1.2, 0); G.area(p, 13, 15, { kb: 5, stun: 3 }); G.noiseAt(p, 40); } },
    { key: 'V', name: 'Feral Rage', cd: 24, cast(G) {
      const { P, SFX } = G; P.rage = 8; P.hp = Math.min(P.max, P.hp + 25); SFX.rage(); G.flash('#f00', .45, 500); G.ring(P.pos, 0xff2a10, 5, .6); G.burst(G.eyePos(), 0xff4a10, 30, 6, .8, 1.2, -2, 3); G.holdShake(.4); G.fov(10); } }
  ],
  update(G, dt) { const { P, V, rnd } = G; if (P.rage > 0 && Math.random() < dt * 25) G.burst(P.pos.clone().add(V(rnd(-2, 2), rnd(0, 2), rnd(-2, 2))), 0xff4a10, 1, .5, .8, 1, -1, 2); },
  active: P => [0, 0, 0, P.rage]
};
function slam(G) {
  const { P, SFX } = G, p = P.pos; G.ring(p, P.c.color, 5, .5); G.ring(p, 0xffffff, 3, .35, .3); G.burst(p, 0x998877, 25, 6, .7, 1.5, 10, 2); G.burst(p, 0xff8a2a, 12, 5, .5); G.shake(.7); P.dip = .25; SFX.pounce(); G.flash('#fa5', .2, 200);
  G.area(p, 4.8, 55, { kb: 3, stun: 1.5, from: p }); G.noiseAt(p, 40);
}
