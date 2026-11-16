// LÕI GAME: render, FPS, chiến đấu, quái (AI chạy ở máy chủ phòng), nhiệm vụ bình gas + thuyền, đồng bộ nhiều người.
// Class nhân vật (public/classes/*.js) và màn chơi (public/levels/*.js) chỉ nói chuyện với game qua đối tượng G (xem README).
import { THREE, V, rnd, clamp, makeRng, M, EM, BM, mesh, B, Cn, Cy, Ic, Oc, am, ADD, PI, Y, GDISC, hex, angLerp } from './gfx.js';
import { tr, L } from './i18n.js';
import { audio, SFX } from './audio.js';
import { createEnemy, animEnemy, poseOf, STATES, BULLET } from './enemies.js';
import { createKit } from './levelkit.js';
import * as MGR from './minigames.js';
import { net } from './net.js';

const $ = id => document.getElementById(id);
const GR = 26;
export const CLASSES = {}, LEVELS = {};
export const registerClass = d => { CLASSES[d.id] = d; };
export const registerLevel = d => { LEVELS[d.id] = d; };

// ---------- renderer ----------
const R = new THREE.WebGLRenderer({ antialias: true }); R.autoClear = false; R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.setSize(innerWidth, innerHeight); document.body.prepend(R.domElement);
const cv = R.domElement, SKY = 0x201a33;
const cam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, .1, 330); cam.rotation.order = 'YXZ';
const torch = new THREE.SpotLight(0xfff0d0, 2.4, 46, .62, .55, 1), torchP = new THREE.PointLight(0xffd9a0, .9, 18), bLight = new THREE.PointLight(0xff8844, 0, 32);
let S = null;
function newScene() {
  S = new THREE.Scene(); S.background = new THREE.Color(SKY); S.fog = new THREE.FogExp2(SKY, .017);
  S.add(new THREE.HemisphereLight(0x9a8ac0, 0x3a2a34, 1.2)); S.add(new THREE.AmbientLight(0x2c2c40, .8));
  const moon = new THREE.DirectionalLight(0x8899cc, .9); moon.position.set(-20, 40, 10); S.add(moon);
  S.add(torch); S.add(torch.target); S.add(torchP); S.add(bLight);
}
// súng (render riêng, luôn ở trên cùng)
const GS = new THREE.Scene(), gcam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .02, 10);
GS.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.3)); { const dl = new THREE.DirectionalLight(0xffffff, .9); dl.position.set(1, 2, 1.5); GS.add(dl); }
const gml = new THREE.PointLight(0xffaa55, 0, 3); gml.position.set(.2, 0, -.9); GS.add(gml);
let gunG = null, gunMF = null, gunAcc = [], gunMag = null, clawG = null;
const GP = V(.25, -.26, -.56), GPA = V(0, -.18, -.46);

// ---------- trạng thái ----------
let st = 'menu', P = null, en = [], pj = [], fxs = [], pt = [], zn = [], kits = [], queue = [], kills = 0, T = 0, shake = 0, shakeHold = 0, fovK = 0, keys = {};
let last = 0, locked = false, lockFail = false, everLocked = false, mouseDown = false, mdx = 0, mdy = 0, swX = 0, swY = 0, mX = 0, mY = 0, xhCol = '', prevShield = 0, pitchKick = 0;
let bl = [], nests = [], houses = [], stageHouses = [], boat = null, kit = null, RN = null, lvl = null, BOUND = 100, NG = 200, NO = 100, NAV = {};
let stage = { idx: 0, phase: 'find', carrier: -1, drop: null, delivered: 0, total: 5 };
let mp = false, isHost = true, myId = 0, hostId = 0, remotes = new Map(), enMap = new Map(), dmgQ = [], tSnap = 0, tSt = 0, tDmg = 0, respT = 0, dropMesh = null, session = null, endSent = false;
const DUMMY = { pos: V(1e5, 0, 1e5), alive: false, FS: null, FB: null };
const G = {
  THREE, V, rnd, clamp, M, EM, BM, mesh, B, Cn, Cy, Ic, Oc, am, ADD, PI, Y, GDISC, hex, SFX, tr, L, BULLET,
  get S() { return S; }, get cam() { return cam; }, get P() { return P; }, get en() { return en; }, get pj() { return pj; }, get queue() { return queue; }, get bl() { return bl; }, get R() { return RN; }, get kit() { return kit; }, get BOUND() { return BOUND; },
  get T() { return T; }
};

// ---------- hiệu ứng ----------
const G_RING = new THREE.TorusGeometry(1, .03, 6, 56), G_SPH = new Ic(1, 2), PG = new B(.12, .12, .12), TG = new B(1, 1, 1), pmC = {}, trM = {};
const pm = c => pmC[c] || (pmC[c] = new THREE.MeshBasicMaterial({ color: c }));
function addFx(m, life, upd, own) { m.userData.own = own; S.add(m); fxs.push({ m, life, max: life, upd }); }
function ring(p, col, r, life = .5, y = .15, inv = false) { const m = new THREE.Mesh(G_RING, am(col)); m.position.set(p.x, y, p.z); m.rotation.x = PI / 2; addFx(m, life, k => { const e = inv ? (1 - k) : 1 - Math.pow(1 - k, 3), s = Math.max(.05, r * e); m.scale.set(s, s, s); m.material.opacity = inv ? k : 1 - k; }, 1); }
function shell(p, col, r, life = .5, wire = false, op = .5) { const m = new THREE.Mesh(G_SPH, am(col, op, wire)); m.position.copy(p); addFx(m, life, k => { const s = r * (1 - Math.pow(1 - k, 3)) + .05; m.scale.setScalar(s); m.material.opacity = op * (1 - k); }, 1); }
function burst(p, col, n = 10, sp = 4, life = .5, size = 1, g = 9, up = 0) {
  if (pt.length > 450) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(PG, pm(col)), s = size * rnd(.6, 1.4); m.position.copy(p); m.scale.setScalar(s); S.add(m); const a = rnd(0, PI * 2), b = rnd(-1, 1), r = Math.sqrt(1 - b * b); pt.push({ m, v: V(Math.cos(a) * r * sp * rnd(.3, 1), b * sp * rnd(.3, 1) + up, Math.sin(a) * r * sp * rnd(.3, 1)), life: life * rnd(.6, 1.2), max: life, g, s }); }
}
function tracer(a, b, col) { const Ln = a.distanceTo(b); if (Ln < .5) return; const m = new THREE.Mesh(TG, trM[col] || (trM[col] = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, blending: ADD, depthWrite: false }))); m.position.copy(a).lerp(b, .5); m.lookAt(b); m.scale.set(.05, .05, Ln); addFx(m, .08, (k, mm) => { mm.scale.x = mm.scale.y = .05 * (1 - k); }); }
function boomLight(p, col, i = 3) { bLight.position.copy(p).setY(p.y + 1); bLight.color.setHex(col); bLight.intensity = i; }
function flash(col, op = .5, ms = 300) { const f = $('fl'); f.style.background = col; f.animate([{ opacity: op }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }); }
function speedLines(col, ms = 400, op = .9) { const e = $('spd'); e.style.setProperty('--sl', col); e.animate([{ opacity: 0 }, { opacity: op, offset: .2 }, { opacity: 0 }], { duration: ms }); }
function hurtFx() { const v = $('vg'); v.classList.add('hurt'); setTimeout(() => v.classList.remove('hurt'), 150); }
function dirInd(from) { const v = from.clone().sub(P.pos).setY(0).normalize(), f = flatDir(), r = rightDir(), a = Math.atan2(v.dot(r), v.dot(f)); const d = $('dd'); d.style.transform = `rotate(${a}rad)`; d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); }
function dmgNum(p, v) { const q = p.clone(); q.y += 2.4; q.project(cam); if (q.z > 1) return; const d = document.createElement('div'); d.className = 'dn'; d.textContent = v; d.style.left = ((q.x + 1) / 2 * innerWidth) + 'px'; d.style.top = ((1 - q.y) / 2 * innerHeight) + 'px'; $('hud').appendChild(d); setTimeout(() => d.remove(), 700); }
function hitMarker(kill) { const h = $('hm'); h.style.setProperty('--hc', kill ? '#ff3030' : '#fff'); h.animate([{ opacity: 1, transform: `scale(${kill ? 1.5 : 1})` }, { opacity: 0, transform: `scale(${kill ? 1.9 : 1.2})` }], { duration: kill ? 350 : 180 }); }
const JN = 12; (function () { const t = ['0 0', '100% 0'], b = ['0 100%', '100% 100%']; for (let i = JN; i >= 1; i--) { t.push(`${(i / JN * 100).toFixed(1)}% 78%`, `${((i - .5) / JN * 100).toFixed(1)}% 100%`); b.push(`${(i / JN * 100).toFixed(1)}% 22%`, `${((i - .5) / JN * 100).toFixed(1)}% 0%`); } t.push('0 78%'); b.push('0 22%'); $('jt').style.clipPath = `polygon(${t.join(',')})`; $('jb').style.clipPath = `polygon(${b.join(',')})`; })();
function mawAnim() { $('jt').animate([{ transform: 'translateY(-101%)' }, { transform: 'translateY(-6%)', offset: .28 }, { transform: 'translateY(-6%)', offset: .5 }, { transform: 'translateY(-101%)' }], { duration: 750, easing: 'ease-in-out' }); $('jb').animate([{ transform: 'translateY(101%)' }, { transform: 'translateY(6%)', offset: .28 }, { transform: 'translateY(6%)', offset: .5 }, { transform: 'translateY(101%)' }], { duration: 750, easing: 'ease-in-out' }); }
let clawFlip = 1; function clawAnim() { clawFlip *= -1; const c = $('claw'); c.style.transform = `scaleX(${clawFlip})`; c.querySelectorAll('path').forEach((p, i) => p.animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .35 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 420, delay: i * 45, easing: 'ease-out' })); }
function roarAnim() { document.querySelectorAll('.rr').forEach((r, i) => r.animate([{ transform: 'scale(.15)', opacity: .9 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 900, delay: i * 150, easing: 'ease-out' })); }

// ---------- hình học ----------
const flatDir = () => V(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), rightDir = () => V(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
const aimDir = () => V(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
const eyePos = () => V(P.pos.x, P.pos.y + 1.7, P.pos.z);
const inB = p => { for (const b of bl) if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2 && p.y < b.h && p.y >= b.y0) return true; return false; };
function collide(p, rad) {
  let hit = false;
  for (let it = 0; it < 2; it++) for (const b of bl) {
    if (p.y >= b.h || p.y + 1.8 <= b.y0) continue;
    const cx = clamp(p.x, b.x - b.w / 2, b.x + b.w / 2), cz = clamp(p.z, b.z - b.d / 2, b.z + b.d / 2), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < rad * rad) { hit = true; if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (rad - d) / d; p.x += dx * k; p.z += dz * k; } else { const ox = b.w / 2 - Math.abs(p.x - b.x), oz = b.d / 2 - Math.abs(p.z - b.z); if (ox < oz) p.x += (p.x >= b.x ? 1 : -1) * (ox + rad); else p.z += (p.z >= b.z ? 1 : -1) * (oz + rad); } }
  }
  p.x = clamp(p.x, -BOUND, BOUND); p.z = clamp(p.z, -BOUND, BOUND); return hit;
}
function castRay(o, d, maxT = 200, withEn = true) {
  let t = maxT, e = null, wall = false;
  if (d.y < -1e-4) { const tg = -o.y / d.y; if (tg > 0 && tg < t) { t = tg; wall = true; } }
  for (const b of bl) {
    let tn = -1e9, tf = 1e9, miss = false;
    for (const [oo, dd, mn, mx] of [[o.x, d.x, b.x - b.w / 2, b.x + b.w / 2], [o.y, d.y, b.y0, b.h], [o.z, d.z, b.z - b.d / 2, b.z + b.d / 2]]) {
      if (Math.abs(dd) < 1e-8) { if (oo < mn || oo > mx) { miss = true; break; } } else { let t1 = (mn - oo) / dd, t2 = (mx - oo) / dd; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = Math.max(tn, t1); tf = Math.min(tf, t2); }
    }
    if (!miss && tn <= tf && tn > 0 && tn < t) { t = tn; wall = true; }
  }
  if (withEn) {
    let best = t, he = null;
    for (const n of en) {
      if (n.dead) continue; const q = n.m.position, ry = n.m.rotation.y, c = Math.cos(ry), s = Math.sin(ry);
      for (const [lx, ly, lz, r] of n.hs) {
        const cx = q.x + lx * c + lz * s - o.x, cy = q.y + ly - o.y, cz = q.z - lx * s + lz * c - o.z, tc = cx * d.x + cy * d.y + cz * d.z; if (tc < 0) continue;
        const d2 = cx * cx + cy * cy + cz * cz - tc * tc; if (d2 > r * r) continue; const th = Math.max(0, tc - Math.sqrt(r * r - d2)); if (th < best) { best = th; he = n; }
      }
    }
    if (he) { t = best; e = he; wall = false; }
  }
  return { t, e, wall, p: o.clone().addScaledVector(d, t) };
}

// ---------- NAV (BFS trên lưới 1m) ----------
const cellOf = (x, z) => clamp(Math.floor(z + NO), 0, NG - 1) * NG + clamp(Math.floor(x + NO), 0, NG - 1);
function buildNav() {
  NAV = {}; for (const [k, r] of [['s', .9], ['b', 1.7]]) {
    const a = new Uint8Array(NG * NG), solid = bl.filter(b => b.y0 <= 1.5);
    for (let iz = 0; iz < NG; iz++) for (let ix = 0; ix < NG; ix++) {
      const x = ix - NO + .5, z = iz - NO + .5; let bk = 0;
      for (const b of solid) { if (Math.abs(x - b.x) > b.w / 2 + r || Math.abs(z - b.z) > b.d / 2 + r) continue; const cx = clamp(x, b.x - b.w / 2, b.x + b.w / 2), cz = clamp(z, b.z - b.d / 2, b.z + b.d / 2); if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < r * r) { bk = 1; break; } }
      a[iz * NG + ix] = bk;
    }
    NAV[k] = a;
  }
  for (const n of nests) { n.fs = n.fb = null; } for (const p of allPlayers()) { p.fc = -1; p.ft = 0; }
}
function bfs(x, z, blk) {
  const f = new Int16Array(NG * NG).fill(9999), q = new Int32Array(NG * NG); let h = 0, t = 0, s = cellOf(x, z);
  if (blk[s]) { let found = -1; for (let r = 1; r <= 4 && found < 0; r++) for (let dz = -r; dz <= r && found < 0; dz++) for (let dx = -r; dx <= r; dx++) { const ix = clamp(Math.floor(x + NO) + dx, 0, NG - 1), iz = clamp(Math.floor(z + NO) + dz, 0, NG - 1); if (!blk[iz * NG + ix]) { found = iz * NG + ix; break; } } if (found >= 0) s = found; }
  f[s] = 0; q[t++] = s;
  while (h < t) { const c = q[h++], cx = c % NG, cz = (c / NG) | 0, d = f[c] + 1;
    if (cx > 0 && !blk[c - 1] && f[c - 1] > d) { f[c - 1] = d; q[t++] = c - 1; } if (cx < NG - 1 && !blk[c + 1] && f[c + 1] > d) { f[c + 1] = d; q[t++] = c + 1; }
    if (cz > 0 && !blk[c - NG] && f[c - NG] > d) { f[c - NG] = d; q[t++] = c - NG; } if (cz < NG - 1 && !blk[c + NG] && f[c + NG] > d) { f[c + NG] = d; q[t++] = c + NG; } }
  return f;
}
function fdir(f, x, z) {
  if (!f) return null; const ix = clamp(Math.floor(x + NO), 0, NG - 1), iz = clamp(Math.floor(z + NO), 0, NG - 1), cur = f[iz * NG + ix]; let best = cur, bx = ix, bz = iz;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const nx = ix + dx, nz = iz + dz; if (nx < 0 || nz < 0 || nx >= NG || nz >= NG) continue; const v = f[nz * NG + nx]; if (v < best) { best = v; bx = nx; bz = nz; } }
  if (best >= cur) return null; return V(bx + .5 - NO - x, 0, bz + .5 - NO - z).normalize();
}

// ---------- súng (viewmodel) ----------
function buildGun(c) {
  if (gunG) GS.remove(gunG); if (clawG) GS.remove(clawG);
  const col = c.color, g = new THREE.Group(), dk = M(0x2a2a34), dk2 = M(0x16161c), acc = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .5, flatShading: true }),
    skin = M(c.skin || 0x30343c), bone = M(0xd8d0bc), sg = c.gun.style === 'shotgun'; gunAcc = [acc];
  if (!sg) {
    mesh(new B(.1, .12, .46), dk, 0, 0, 0, g); mesh(new B(.104, .014, .22), acc, 0, .067, -.02, g);
    mesh(new Cy(.028, .032, .4, 8), dk2, 0, .02, -.4, g).rotation.x = PI / 2; mesh(new B(.06, .06, .1), dk, 0, .02, -.62, g);
    gunMag = mesh(new B(.075, .2, .1), dk2, 0, -.15, .04, g); gunMag.rotation.x = .12; mesh(new B(.078, .02, .104), acc, 0, -.08, 0, gunMag);
  } else {   // shotgun: nòng đôi dài, báng gỗ, tay kéo
    mesh(new B(.11, .13, .5), dk, 0, 0, .02, g); mesh(new B(.114, .016, .3), acc, 0, .073, -.05, g);
    for (const s of [-1, 1]) mesh(new Cy(.034, .038, .78, 8), dk2, s * .035, .035, -.5, g).rotation.x = PI / 2;
    mesh(new B(.12, .06, .08), dk, 0, .03, -.92, g); mesh(new B(.1, .09, .3), M(0x4a2e1c), 0, -.02, -.42, g);
    gunMag = mesh(new B(.1, .07, .3), M(0x5a3a22), 0, -.075, -.45, g);
    mesh(new B(.09, .14, .34), M(0x4a2e1c), 0, -.04, .38, g).rotation.x = -.15;
  }
  mesh(new B(.075, .17, .09), dk, 0, -.13, .2, g).rotation.x = -.3;
  mesh(new B(.02, .04, .02), dk2, 0, .105, sg ? -.9 : -.3, g); mesh(new B(.04, .03, .02), dk2, 0, .1, .12, g);
  mesh(new B(.09, .09, .16), skin, 0, -.09, .2, g); mesh(new B(.09, .09, .16), skin, -.01, -.08, sg ? -.45 : -.2, g);
  const fa = mesh(new B(.09, .09, .55), skin, .06, -.22, .55, g); fa.rotation.set(.3, -.1, 0);
  const fl = mesh(new B(.09, .09, .45), skin, -.09, -.2, -.02, g); fl.rotation.set(.12, .5, 0);
  if (c.viewmodel) c.viewmodel(G, { g, acc, skin, bone, dk, dk2 });
  gunMF = new THREE.Group(); gunMF.position.set(0, .02, sg ? -1.0 : -.72); g.add(gunMF);
  const fm = new THREE.MeshBasicMaterial({ color: c.gun.tracer, transparent: true, opacity: .95, blending: ADD, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 2; i++) mesh(new THREE.PlaneGeometry(sg ? .6 : .38, sg ? .6 : .38), fm, 0, 0, 0, gunMF).rotation.z = i * PI / 4;
  mesh(new THREE.PlaneGeometry(.45, .14), fm, 0, 0, -.1, gunMF).rotation.y = PI / 2; mesh(new Ic(.06, 0), BM(0xffffff), 0, 0, 0, gunMF); gunMF.visible = false;
  g.position.copy(GP); GS.add(g); gunG = g; clawG = null;
  if (c.claw) { clawG = new THREE.Group(); const cm = EM(0xff8a2a, 0xff5a10, .9); mesh(new B(.12, .1, .2), skin, 0, 0, 0, clawG); for (const s of [-1, 0, 1]) mesh(new Cn(.022, .34, 4), cm, s * .045, .02, -.25, clawG).rotation.x = -PI / 2; clawG.visible = false; GS.add(clawG); }
}

// ---------- người chơi (cục bộ + từ xa) ----------
const allPlayers = () => P ? [P, ...remotes.values()] : [...remotes.values()];
function makeAvatar(rp) {
  const c = CLASSES[rp.cls] || { color: 0xffffff }, g = new THREE.Group(), body = M(c.color), dk = M(0x22222a);
  mesh(new B(.7, 1.0, .4), body, 0, 1.1, 0, g); mesh(new B(.45, .45, .45), M(0xb89a82), 0, 1.85, 0, g); mesh(new B(.5, .18, .1), EM(c.color, c.color, .8), 0, 1.9, -.24, g);
  for (const s of [-1, 1]) { mesh(new B(.25, .8, .3), dk, s * .2, .4, 0, g); mesh(new B(.18, .7, .2), body, s * .5, 1.15, 0, g); }
  mesh(new B(.1, .12, .8), dk, .3, 1.15, -.45, g); S.add(g); rp.mesh = g;
  const t = document.createElement('div'); t.className = 'tag'; t.style.color = hex(c.color); t.textContent = rp.name; $('hud').appendChild(t); rp.tag = t;
}
function removeRemote(id) { const r = remotes.get(id); if (!r) return; if (r.mesh) S.remove(r.mesh); if (r.tag) r.tag.remove(); remotes.delete(id); }
function updRemotes(dt) {
  for (const r of remotes.values()) {
    const k = Math.min(1, dt * 14); r.pos.x += (r.tx - r.pos.x) * k; r.pos.y += (r.ty - r.pos.y) * k; r.pos.z += (r.tz - r.pos.z) * k;
    r.mesh.position.set(r.pos.x, r.pos.y, r.pos.z); r.mesh.rotation.y = angLerp(r.mesh.rotation.y, r.yaw + PI, k); r.mesh.visible = r.alive;
    const q = r.pos.clone(); q.y += 2.5; q.project(cam); const show = r.alive && q.z < 1; r.tag.style.display = show ? 'block' : 'none';
    if (show) { r.tag.style.left = ((q.x + 1) / 2 * innerWidth) + 'px'; r.tag.style.top = ((1 - q.y) / 2 * innerHeight) + 'px'; }
  }
}

// ---------- chiến đấu ----------
function hit(e, d, o = {}) {
  if (e.dead) return false; d *= P.rage > 0 ? 2 : 1;
  if (!isHost) {   // máy khách: báo sát thương lên chủ phòng, chỉ hiển thị phản hồi
    dmgQ.push([e.id, Math.round(d * 10) / 10, o.kb || 0, o.stun || 0, o.slow || 0, (o.from || P.pos).x, (o.from || P.pos).z]);
    if (!o.quiet) { e.flash = .07; e.pop = Math.max(e.pop, d >= 30 ? .12 : .04); if (d >= 20) dmgNum(e.m.position, Math.round(d)); } return false;
  }
  e.hp -= d;
  if (!o.quiet) { e.flash = .07; e.pop = Math.max(e.pop, d >= 30 ? .12 : .04); if (d >= 20) dmgNum(e.m.position, Math.round(d)); if (d >= 40 && e.type !== 'w') e.stun = Math.max(e.stun, .2); }
  if (e.state === 'idle' || e.state === 'return') { alertE(e, true); e.state = 'chase'; e.lost = 0; }
  if (o.stun) e.stun = Math.max(e.stun, o.stun); if (o.slow) e.slow = Math.max(e.slow, o.slow);
  if (o.kb) { const v = e.m.position.clone().sub(o.from || P.pos).setY(0); if (v.lengthSq() < 1e-6) v.set(0, 0, 1); v.normalize(); const m = e.big ? .35 : 1; e.kx += v.x * o.kb * 6 * m; e.kz += v.z * o.kb * 6 * m; }
  if (e.hp <= 0) { kill(e); return true; } return false;
}
function kill(e) {
  e.dead = 1; e.dying = 1; if (e.nest) { e.nest.alive--; e.nest.timer = Math.max(e.nest.timer, rnd(10, 18)); } kills++;
  const p = e.m.position.clone(); p.y = 1; burst(p, 0xaa0008, 16, 5, .6, 1.2); burst(p, 0x330004, 8, 3, .7, 1.6); SFX.kill(); hitMarker(1);
  if (Math.random() < .25) { dropKit(e.m.position); if (mp) net.relay('all', { k: 'kit', x: e.m.position.x, z: e.m.position.z }); }
}
function area(c, r, d, o = {}) {
  let n = 0; for (const e of en) {
    if (e.dead) continue; const v = e.m.position.clone().sub(c).setY(0), l = v.length(); if (l > r + e.rr * .4) continue;
    if (o.dir && (l > .01 ? v.clone().normalize().dot(o.dir) : 1) < o.arc) continue; hit(e, d, { kb: o.kb, stun: o.stun, from: c, slow: o.slow, quiet: o.quiet }); n++;
  } return n;
}
function boom(pos, r, d, col = 0xff7a20) {
  shell(pos, col, r * .7, .35, false, .7); ring(pos, 0xffdd88, r * 1.1, .4, .2); burst(pos, 0xffaa44, 22, r * 2.2, .6, 1.3); burst(pos, 0x666666, 10, 3, .9, 2, -2); boomLight(pos, 0xff8844, 4);
  shake = Math.max(shake, Math.max(0, .8 - pos.distanceTo(P.pos) * .025)); area(pos, r, d, { kb: 2.5, stun: .4, from: pos }); SFX.boom(); noiseAt(pos, 45);
}
function dropKit(p) { const g = new THREE.Group(), m = M(0xe6e6e6, 0x333333), c = M(0x20e060, 0x10c040); mesh(new B(.7, .5, .5), m, 0, .4, 0, g); mesh(new B(.5, .14, .52), c, 0, .4, 0, g); mesh(new B(.14, .4, .52), c, 0, .4, 0, g); g.position.set(p.x, 0, p.z); S.add(g); kits.push({ g, t: 25 }); }
function hurtP(d, from) {
  if (!P.alive || P.inv > 0 || P.ghost > 0) return;
  if (P.shield > 0) { flash('#4af', .3, 220); SFX.shield(); burst(eyePos().addScaledVector(aimDir(), 1.2), 0x66ccff, 6, 3, .3, .8, 0); return; }
  P.hp -= d; shake = Math.max(shake, .4); hurtFx(); SFX.hurt(); if (from) dirInd(from);
  if (P.hp <= 0) onDeath();
}
function onDeath() {
  P.hp = 0; P.alive = 0; P.deadT = 0; mouseDown = false; P.aiming = false;
  if (mp) {
    respT = 8; if (stage.carrier === myId) { op({ op: 'drop', x: P.pos.x, z: P.pos.z }); }
  } else setTimeout(() => { if (st === 'play') finish(0); }, 1700);
}
function hurtTarget(tg, d, from) { if (tg.local) hurtP(d, from); else net.relay(tg.id, { k: 'hurt', d, fx: from.x, fz: from.z }); }

function fire() {
  if (P.reload > 0 || P.fireCd > 0) return; if (P.mag <= 0) { startReload(); return; }
  const g = P.c.gun, rate = g.rate * (P.rage > 0 ? 1.5 : 1), sg = g.style === 'shotgun'; P.fireCd = 1 / rate; P.mag--; P.kick = Math.min(1, P.kick + (sg ? 1 : .55) * (1 - P.aim * .5)); P.flash = .06; P.spr = Math.min(1.6, P.spr + (sg ? .6 : .25));
  const o = eyePos(), base = aimDir(), n = g.pellets || 1, dmg = g.dmg || BULLET, hits = new Map();
  const mz = o.clone().addScaledVector(rightDir(), .22 * (1 - P.aim)).addScaledVector(Y, -.15 + P.aim * .06).addScaledVector(base, .9);
  let firstEnd = null;
  for (let i = 0; i < n; i++) {
    const d = base.clone(), sp = g.spread * (1 + P.spr * (sg ? .5 : 3)) * (1 - P.aim * (sg ? .25 : .65)), a = rnd(0, PI * 2), rr = sg ? Math.sqrt(Math.random()) * sp : rnd(-sp, sp);
    if (sg) d.addScaledVector(rightDir(), Math.cos(a) * rr).addScaledVector(Y, Math.sin(a) * rr); else d.addScaledVector(rightDir(), rnd(-sp, sp)).addScaledVector(Y, rnd(-sp, sp));
    d.normalize(); const r = castRay(o, d, g.range || 150), end = r.t >= (g.range || 150) - 1 ? o.clone().addScaledVector(d, 80) : r.p;
    if (!firstEnd) firstEnd = end; if (i < 4 || !sg) tracer(mz, end, g.tracer);
    if (r.e) { let f = 1; if (g.falloff) { const [nr, fr, mn] = g.falloff; f = clamp(1 - (r.t - nr) / (fr - nr), mn, 1); } const h = hits.get(r.e) || { d: 0, p: r.p }; h.d += dmg * f; hits.set(r.e, h); burst(r.p, 0xaa0008, 3, 3, .3, .9); }
    else if (r.t < (g.range || 150) - 1 && (i < 3 || !sg)) { burst(r.p, 0xffd9a0, 3, 3, .25, .7); if (!sg) burst(r.p, 0x777777, 2, 1.5, .5, 1.4, -1); }
  }
  for (const [e, h] of hits) { hit(e, h.d, { kb: sg ? .5 : .06, from: P.pos }); if (!e.dead || !isHost) hitMarker(0); SFX.hit(); }
  (sg ? SFX.shotgun : SFX.shot)(); pitchKick += (sg ? .02 : .006) * (1 - P.aim * .5); noiseAt(P.pos, sg ? 44 : 32);
  if (mp) net.relay('all', { k: 'shot', a: [mz.x, mz.y, mz.z], b: [firstEnd.x, firstEnd.y, firstEnd.z], c: g.tracer, s: sg ? 1 : 0 });
  if (P.mag <= 0) startReload();
}
function startReload() { if (P.reload > 0 || P.mag >= P.maxMag || !P.alive) return; P.reload = P.c.gun.reload; SFX.reload(); }
function useSkill(i) {
  if (st !== 'play' || !P.alive || P.cd[i] > 0 || P.charge > 0 || MGR.isOpen()) return;
  const sk = P.c.skills[i]; const ok = sk.cast(G); if (ok !== false) { P.cd[i] = sk.cd; if (mp) net.relay('all', { k: 'sk', c: P.c.color, x: P.pos.x, z: P.pos.z }); }
}
function alertE(e, silent) {
  if (e.dead || ['alert', 'chase', 'windup', 'strike', 'recover'].includes(e.state)) return; e.state = 'alert'; e.st = e.type === 'w' ? 1.1 : e.type === 'd' ? .8 : .6; e.lost = 0;
  if (!silent && P && e.m.position.distanceTo(P.pos) < 45) { SFX.growl(e.type); if (e.type === 'w') shake = Math.max(shake, .25); }
  for (const o of en) if (o !== e && !o.dead && o.state === 'idle' && o.m.position.distanceTo(e.m.position) < 14) { alertE(o, true); o.st += rnd(0, .3); }
}
function noiseAt(pos, r) {
  if (!isHost) { if (r >= 30) tNoise.push([pos.x, pos.z, r]); return; }
  for (const e of en) if (!e.dead && (e.state === 'idle' || e.state === 'return') && Math.hypot(e.m.position.x - pos.x, e.m.position.z - pos.z) < r) alertE(e, true);
}
const tNoise = [];

// ---------- AI quái (chạy trên máy chủ phòng / chơi đơn) ----------
function hasLOS(e, tg) { const o = V(e.m.position.x, 1.2, e.m.position.z), t = V(tg.pos.x, tg.pos.y + 1.7, tg.pos.z).sub(o), d = t.length(); t.multiplyScalar(1 / d); return castRay(o, t, d, false).t >= d - .3; }
function seen(e, tg, dt) { e.losT -= dt; if (e.losT <= 0) { e.losT = .25; e.los = hasLOS(e, tg); } return e.los; }
function nestField(n, big) { const k = big ? 'fb' : 'fs'; if (!n[k]) n[k] = bfs(n.sp.x, n.sp.z, big ? NAV.b : NAV.s); return n[k]; }
function stepE(e, dir, sp, dt) { const q = e.m.position; q.x += dir.x * sp * dt; q.z += dir.z * sp * dt; collide(q, e.col); }
function pickTarget(e) {
  let best = null, bd = 1e9; const q = e.m.position;
  for (const p of allPlayers()) { if (!p.alive) continue; const d = Math.hypot(p.pos.x - q.x, p.pos.z - q.z); if (d < bd) { bd = d; best = p; } } return best;
}
function updEnemy(e, dt) {
  const q = e.m.position, tg = e.target = pickTarget(e) || DUMMY, p = tg.pos, alive = tg.alive, to = V(p.x - q.x, 0, p.z - q.z), d = to.length(); if (d > 1e-4) to.multiplyScalar(1 / d);
  let dl = 1e9; if (P) dl = Math.hypot(P.pos.x - q.x, P.pos.z - q.z); e.m.visible = dl < 80;
  q.x += e.kx * dt; q.z += e.kz * dt; const dec = Math.exp(-dt * 6); e.kx *= dec; e.kz *= dec; e.cd -= dt; e.lcd -= dt; e.slow -= dt; e.t += dt;
  let spdNow = 0, face = to, wr = 0, wb = 0, wl = 0, at = 0;
  if (e.stun > 0) { e.stun -= dt; wr = -.3; }
  else switch (e.state) {
    case 'idle': { e.wt -= dt; if (e.wt <= 0) { e.wt = rnd(2, 5); e.wp = Math.random() < .4 ? null : V(e.home.x + rnd(-4, 4), 0, e.home.z + rnd(-4, 4)); }
      if (e.wp) { const v = V(e.wp.x - q.x, 0, e.wp.z - q.z), l = v.length(); if (l > .4) { v.multiplyScalar(1 / l); const s = e.spd * .25; stepE(e, v, s, dt); face = v; spdNow = s; } else e.wp = null; }
      if (alive && d < e.sense && (d < 5 || seen(e, tg, dt))) alertE(e); break; }
    case 'alert': e.st -= dt; wr = 1; wb = 1; if (e.st <= 0) { e.state = 'chase'; e.lost = 0; } break;
    case 'chase': {
      let dir = to, sp = e.spd * (e.slow > 0 ? .4 : 1); const vis = seen(e, tg, dt);
      if (!(d < 14 && vis)) { const f = fdir(e.big ? tg.FB : tg.FS, q.x, q.z); if (f) dir = f; }
      if (e.type === 'd' && d < 10 && d > 4.5 && e.lcd > 0) { dir = to.clone().applyAxisAngle(Y, e.orbit * 1.1); sp *= .9; }
      stepE(e, dir, sp, dt); spdNow = sp; face = d < 8 ? to : dir;
      if (alive && d < e.atkR && e.cd <= 0 && (e.type !== 'd' || e.lcd <= 0) && vis) { e.state = 'windup'; e.st = e.wind; e.lockDir = to.clone(); }
      if (vis) e.lost = 0; else e.lost += dt; if (!alive || d > 80 || (e.lost > 9 && d > 28)) e.state = 'return'; break; }
    case 'windup': e.st -= dt; face = to; wr = .8; wb = e.type === 'c' ? .5 : 0; at = e.type === 'w' ? -2.6 : 0; if (e.type === 'c') e.lunge = -.4; if (e.st <= 0) { e.state = 'strike'; e.st = e.strikeT; e.hit = 0; e.lockDir = to.clone(); } break;
    case 'strike': {
      e.st -= dt; wb = 1; wl = 1; const ld = e.lockDir; at = e.type === 'w' ? .5 : 0;
      if (e.type === 'c') stepE(e, ld, 11, dt); else if (e.type === 'd') stepE(e, ld, 15, dt); face = ld;
      const reach = e.type === 'w' ? e.atkR + .6 : e.type === 'd' ? 1.9 : 2.3;
      if (!e.hit && alive && d < reach && (e.type !== 'w' || e.st < e.strikeT * .6)) { e.hit = 1; hurtTarget(tg, e.dmg, q); }
      if (e.st <= 0) { e.state = 'recover'; e.st = e.rec; e.cd = e.atkCd; if (e.type === 'd') e.lcd = 2.2; } break; }
    case 'recover': e.st -= dt; face = to; if (e.st <= 0) e.state = 'chase'; break;
    case 'return': {
      const f = fdir(nestField(e.nest, e.big), q.x, q.z), dist = Math.hypot(e.home.x - q.x, e.home.z - q.z); let dir = f || V(e.home.x - q.x, 0, e.home.z - q.z).normalize();
      stepE(e, dir, e.spd * .6, dt); spdNow = e.spd * .6; face = dir; if (dist < 2.5) e.state = 'idle'; if (alive && d < e.sense && seen(e, tg, dt)) alertE(e); break; }
  }
  poseStep(e, dt, spdNow, face, wr, wb, wl, at); q.y = 0;
}
function poseStep(e, dt, spdNow, face, wr, wb, wl, at) {
  const k = Math.min(1, dt * 8); e.rear += (wr - e.rear) * k; e.bite += (wb - e.bite) * k; e.lunge += ((e.type === 'c' && e.state === 'windup' ? -.4 : wl) - e.lunge) * Math.min(1, dt * 14); e.armT = at;
  e.mv += ((spdNow > .05 ? Math.min(1, spdNow / e.spd + .15) : 0) - e.mv) * Math.min(1, dt * 10); e.gait += dt * spdNow * e.gaitK;
  const fy = Math.atan2(face.x, face.z); e.faceY = angLerp(e.faceY, fy, Math.min(1, dt * (e.type === 'w' ? 5 : 10))); e.m.rotation.y = e.faceY;
}

// ---------- sinh quái ----------
const nPlayers = () => 1 + remotes.size;
function spawnAt(n, type, id) {
  const e = createEnemy(type, 1 + .3 * (nPlayers() - 1), id), a = rnd(0, 6.28); e.nest = n; e.home = n.sp.clone(); e.m.position.set(n.sp.x + Math.cos(a) * .6, 0, n.sp.z + Math.sin(a) * .6); e.faceY = rnd(0, 6.28);
  S.add(e.m); S.add(e.bar); en.push(e); n.alive++; return e;
}
function pickType(n) { if (n.types[0] === 'w' && !en.some(e => !e.dead && e.nest === n && e.type === 'w')) return 'w'; const pool = n.types.filter(t => t !== 'w'); return pool[Math.random() * pool.length | 0]; }
const minPlayerDist = (x, z) => { let m = 1e9; for (const p of allPlayers()) if (p.alive) m = Math.min(m, Math.hypot(p.pos.x - x, p.pos.z - z)); return m; };

// ---------- nhiệm vụ bình gas ----------
const curHouse = () => stageHouses[stage.idx] || null;
function unlockHouse(H) { if (!H || !H.locked) return; H.locked = false; const i = bl.indexOf(H.doorBox); if (i >= 0) bl.splice(i, 1); S.remove(H.doorMesh); buildNav(); burst(V(H.door.x, 2, H.door.z), 0xffb040, 24, 5, .7, 1.2); ring(H.door, 0xffb040, 4, .6, .2); SFX.unlock(); }
function setStage(s, quiet) {
  const prev = stage; stage = s;
  if (s.idx > prev.idx || s.delivered > prev.delivered) { for (let i = prev.delivered; i < s.delivered; i++) if (boat && i < boat.slots.length) { boat.put(i); } if (!quiet) { SFX.good(); flash('#6cff9a', .3, 500); if (boat) ring(boat, 0x6cff9a, 8, .8, .2); } }
  unlockHouse(curHouse());
  if (s.phase === 'carry' && prev.phase === 'find') { const H = stageHouses[s.idx]; if (H) { H.done = true; H.cg.children.forEach(c => { if (c.userData.ind) c.material.emissive.setHex(0x20e060); }); } if (!quiet) SFX.pickup(); }
  // dấu canister rơi
  if (dropMesh) { S.remove(dropMesh); dropMesh = null; }
  if (s.drop) { dropMesh = kit.canister(); dropMesh.position.set(s.drop[0], 0, s.drop[1]); S.add(dropMesh); kit.glowDisc(s.drop[0], s.drop[1], 2, 0xffb040, .3); }
}
// áp dụng thao tác nhiệm vụ (chạy trên máy chủ phòng / chơi đơn), rồi phát trạng thái cho mọi người
function applyOp(o) {
  const s = { ...stage };
  if (o.op === 'solve' && s.phase === 'find') { s.phase = 'carry'; s.carrier = o.pid; s.drop = null; }
  else if (o.op === 'pickup' && s.phase === 'carry' && s.carrier === -1) { s.carrier = o.pid; s.drop = null; }
  else if (o.op === 'drop' && s.phase === 'carry' && s.carrier === o.pid) { s.carrier = -1; s.drop = [o.x, o.z]; }
  else if (o.op === 'deliver' && s.phase === 'carry' && s.carrier === o.pid) { s.delivered++; s.idx++; s.phase = 'find'; s.carrier = -1; s.drop = null; }
  else return;
  setStage(s); if (mp) net.relay('all', { k: 'stage', s });
  if (s.delivered >= s.total && !endSent) { endSent = true; if (mp) net.relay('all', { k: 'end', win: 1, kills, T }); setTimeout(() => finish(1), 900); }
}
function op(o) { o.pid = myId; if (isHost) applyOp(o); else net.relay(hostId, { k: 'op', o }); }
const nearBoat = () => boat && Math.hypot(P.pos.x - boat.x, P.pos.z - boat.z) < boat.r + 1;
function interactTarget() {
  if (!P.alive) return null; const H = curHouse();
  if (stage.phase === 'find' && H && !H.done && Math.hypot(P.pos.x - H.crate.x, P.pos.z - H.crate.z) < 2.6) return 'crate';
  if (stage.phase === 'carry' && stage.carrier === -1 && stage.drop && Math.hypot(P.pos.x - stage.drop[0], P.pos.z - stage.drop[1]) < 2.6) return 'pickup';
  if (stage.phase === 'carry' && stage.carrier === myId && nearBoat()) return 'deposit';
  return null;
}
function interact() {
  if (st !== 'play') return; const t = interactTarget();
  if (t === 'crate') { keys = {}; mouseDown = false; P.aiming = false; try { document.exitPointerLock(); } catch (e) { /* bỏ qua */ } MGR.openMinigame(curHouse().type, ok => { if (ok) op({ op: 'solve' }); lock(); updPause(); }); updPause(); }
  else if (t === 'pickup') op({ op: 'pickup' }); else if (t === 'deposit') op({ op: 'deliver' });
}

// ---------- vòng đời ----------
function clearWorld() {
  for (const r of [...remotes.keys()]) removeRemote(r); for (const t of document.querySelectorAll('.tag')) t.remove();
  en = []; pj = []; pt = []; fxs = []; zn = []; kits = []; queue = []; enMap.clear(); dmgQ = []; dropMesh = null;
}
function buildLevel(def, seed) {
  clearWorld(); newScene(); bl = []; RN = makeRng(seed); kit = createKit(G);
  const out = def.build(G); lvl = def; BOUND = out.bound; NO = Math.ceil(BOUND); NG = NO * 2; houses = out.houses; nests = out.nests; boat = out.boat; boat.spawn = out.spawn; kit.finish();
  stageHouses = houses.slice().sort((a, b) => Math.hypot(a.x - boat.x, a.z - boat.z) - Math.hypot(b.x - boat.x, b.z - boat.z));
  stage = { idx: 0, phase: 'find', carrier: -1, drop: null, delivered: 0, total: stageHouses.length };
  buildNav(); return out;
}
function mkPlayer(c) {
  const sp = boat.spawn, g = c.gun;
  return { local: true, id: myId, c, hp: c.hp, max: c.hp, pos: V(sp.x, 0, sp.z), vel: V(), vy: 0, yaw: 0, pitch: 0, onGround: true, maxMag: g.mag || 30, mag: g.mag || 30, reload: 0, fireCd: 0, kick: 0, flash: 0, spr: 0, cd: [0, 0, 0, 0], shield: 0, rage: 0, ghost: 0, inv: 0, charge: 0, dashT: 0, dashV: V(), melee: 0, alive: 1, t: 0, deadT: 0, dip: 0, moving: false, sprinting: false, roll: 0, sprB: 0, aim: 0, aiming: false, FS: null, FB: null, fc: -1, ft: 0 };
}
export function startGame(o) {
  audio(); session = o; mp = !!o.mp; myId = o.me || 0; hostId = o.host || 0; isHost = !mp || myId === hostId; endSent = false;
  const def = LEVELS[o.level] || Object.values(LEVELS)[0], c = CLASSES[o.cls] || Object.values(CLASSES)[0];
  buildLevel(def, o.seed || 1); P = mkPlayer(c); P.c.init && P.c.init(G, P);
  buildGun(c); kills = 0; T = 0; shake = 0; shakeHold = 0; fovK = 0; prevShield = 0; pitchKick = 0; respT = 0; cam.fov = 75; cam.updateProjectionMatrix();
  P.yaw = PI; // nhìn vào thành phố (thuyền ở phía nam)
  if (mp) for (const p of o.players) if (p.id !== myId) { const rc = CLASSES[p.cls] || c, sp = boat.spawn, r = { local: false, id: p.id, name: p.name, cls: p.cls, pos: V(sp.x, 0, sp.z), tx: sp.x, ty: 0, tz: sp.z, yaw: 0, alive: 1, hp: 100, FS: null, FB: null, fc: -1, ft: 0 }; remotes.set(p.id, r); makeAvatar(r); }
  if (isHost) { for (const n of nests) { if (Math.hypot(n.x - boat.x, n.z - boat.z) < 45) continue; for (let i = 0; i < n.max; i++) spawnAt(n, pickType(n)); } }
  setStage(stage, true);
  $('cn').textContent = L(c.name); $('cn').style.color = hex(c.color); $('gn').textContent = L(c.gun.name);
  $('sk').innerHTML = c.skills.map((s, i) => `<div class="s" id="sl${i}" style="--c:${hex(c.color)}"><b>${s.key}</b>${L(s.name)}<i id="cd${i}"></i><span id="ct${i}"></span></div>`).join('');
  $('menu').classList.add('hide'); $('end').classList.add('hide'); $('hud').classList.remove('hide'); $('shd').classList.remove('on'); $('rg').classList.remove('on'); $('mg').classList.add('hide'); $('down').classList.add('hide'); st = 'play'; lock();
}
function finish(win) {
  if (st === 'end') return; st = 'end'; try { document.exitPointerLock(); } catch (e) { /* bỏ qua */ } if (MGR.isOpen()) MGR.close(false);
  $('pause').classList.add('hide'); $('mg').classList.add('hide'); $('hud').classList.add('hide'); $('end').classList.remove('hide');
  $('et').textContent = win ? tr('win') : tr('lose'); $('et').style.color = win ? '#e6dfcf' : '#c4161c'; $('es').textContent = win ? tr('winS')(kills, T.toFixed(0)) : tr('loseS')(kills);
  if (mp && isHost && !win && !endSent) { endSent = true; net.relay('all', { k: 'end', win: 0, kills, T }); }
}
export function toMenu() { st = 'menu'; P = null; clearWorld(); $('end').classList.add('hide'); $('hud').classList.add('hide'); $('menu').classList.remove('hide'); mp = false; isHost = true; }
export function getState() { return st; }
export const preview = (levelId) => { if (st !== 'menu') return; const def = LEVELS[levelId]; if (!def) return; try { buildLevel(def, 7); } catch (e) { console.error(e); } };

// ---------- mạng: nhận tin ----------
net.on('r', m => onRelay(m.from, m.d));
function onRelay(from, d) {
  if (!d || st === 'menu') return;
  switch (d.k) {
    case 'st': { const r = remotes.get(from); if (!r) break; r.tx = d.x; r.ty = d.y; r.tz = d.z; r.yaw = d.yaw; r.alive = !!d.a; r.hp = d.hp; if (!r.alive) r.pos.set(d.x, d.y, d.z); break; }
    case 'shot': { tracer(V(...d.a), V(...d.b), d.c); (d.s ? SFX.shotgun : SFX.shot)(); break; }
    case 'sk': ring(V(d.x, 0, d.z), d.c, 4, .5); break;
    case 'kit': dropKit({ x: d.x, z: d.z }); break;
    case 'stage': setStage(d.s); break;
    case 'op': if (isHost) { d.o.pid = from; applyOp(d.o); } break;
    case 'hurt': if (P && P.alive) hurtP(d.d, V(d.fx, 0, d.fz)); break;
    case 'dmg': if (isHost) for (const [id, dm, kb, stn, slw, fx, fz] of d.l) { const e = en.find(x => x.id === id); if (e) hit(e, dm, { kb, stun: stn, slow: slw, from: V(fx, 0, fz), quiet: true }); } break;
    case 'noise': if (isHost) for (const [x, z, r] of d.l) noiseAt(V(x, 0, z), r); break;
    case 'en': if (!isHost) applySnap(d); break;
    case 'end': if (!isHost) { kills = d.kills; T = d.T; finish(d.win); } break;
    case 'left': { if (stage.carrier === d.id && isHost) { const r = remotes.get(d.id); applyOp({ op: 'drop', pid: d.id, x: r ? r.pos.x : boat.x, z: r ? r.pos.z : boat.z }); } removeRemote(d.id); break; }
  }
}
function snapshot() { return { k: 'en', kl: kills, l: en.filter(e => !e.dead).map(e => [e.id, e.type, +e.m.position.x.toFixed(2), +e.m.position.z.toFixed(2), +e.m.rotation.y.toFixed(2), Math.round(e.hp), e.max, STATES.indexOf(e.state)]) }; }
function applySnap(d) {
  kills = d.kl; const seenIds = new Set();
  for (const [id, type, x, z, ry, hp, mx, si] of d.l) {
    seenIds.add(id); let e = enMap.get(id);
    if (!e) { e = createEnemy(type, 1, id); e.tx = x; e.tz = z; e.m.position.set(x, 0, z); e.faceY = ry; S.add(e.m); S.add(e.bar); en.push(e); enMap.set(id, e); e.puppet = 1; }
    e.tx = x; e.tz = z; e.try = ry; e.hp = hp; e.max = mx; e.state = STATES[si] || 'idle';
  }
  for (const [id, e] of [...enMap]) if (!seenIds.has(id) && !e.dead) { e.dead = 1; e.dying = 0; enMap.delete(id); const p = e.m.position.clone(); p.y = 1; burst(p, 0xaa0008, 14, 5, .6, 1.2); SFX.kill(); }
}
function updPuppet(e, dt) {
  const q = e.m.position, ox = q.x, oz = q.z, k = Math.min(1, dt * 12); q.x += (e.tx - q.x) * k; q.z += (e.tz - q.z) * k; e.t += dt;
  const sp = Math.hypot(q.x - ox, q.z - oz) / Math.max(dt, 1e-3); let [wr, wb, wl, at] = poseOf(e); if (e.state === 'strike') { /* tiến lên */ }
  const dl = P ? Math.hypot(P.pos.x - q.x, P.pos.z - q.z) : 0; e.m.visible = dl < 80;
  e.faceY = angLerp(e.faceY, e.try, Math.min(1, dt * 10)); e.m.rotation.y = e.faceY; poseStepNoFace(e, dt, sp, wr, wb, wl, at); q.y = 0;
}
function poseStepNoFace(e, dt, spdNow, wr, wb, wl, at) {
  const k = Math.min(1, dt * 8); e.rear += (wr - e.rear) * k; e.bite += (wb - e.bite) * k; e.lunge += ((e.type === 'c' && e.state === 'windup' ? -.4 : wl) - e.lunge) * Math.min(1, dt * 14); e.armT = at;
  const s = Math.min(spdNow, e.spd * 2.2); e.mv += ((s > .3 ? Math.min(1, s / e.spd + .15) : 0) - e.mv) * Math.min(1, dt * 10); e.gait += dt * s * e.gaitK;
}

// ---------- input ----------
function lock() { if (st !== 'play' || MGR.isOpen() || document.pointerLockElement === cv) return; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { if (!everLocked) lockFail = true; } }
function updPause() { $('pause').classList.toggle('hide', st !== 'play' || locked || lockFail || MGR.isOpen()); }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; if (locked) everLocked = true; if (!locked) { mouseDown = false; keys = {}; if (P && P.c) P.aiming = false; } updPause(); });
document.addEventListener('pointerlockerror', () => { if (!everLocked) lockFail = true; updPause(); });
$('pause').addEventListener('mousedown', e => { e.preventDefault(); lock(); });
addEventListener('mousedown', e => { if (st !== 'play' || MGR.isOpen()) return; if (!locked && !lockFail) { lock(); return; } if (e.button === 0) mouseDown = true; if (e.button === 2 && P.alive) P.aiming = true; audio(); });
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2 && P && P.c) P.aiming = false; });
addEventListener('contextmenu', e => { if (st === 'play') e.preventDefault(); });
addEventListener('mousemove', e => { mX = e.clientX / innerWidth - .5; mY = e.clientY / innerHeight - .5; if (locked && st === 'play') { mdx += e.movementX; mdy += e.movementY; } });
const GAMEKEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyR', 'KeyF', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
addEventListener('keydown', e => {
  if (MGR.isOpen()) { MGR.keyHandler(e); return; }
  if (st !== 'play') return; if (!GAMEKEYS.includes(e.code)) return; e.preventDefault(); keys[e.code] = 1; if (e.repeat) return;
  const i = ['KeyZ', 'KeyX', 'KeyC', 'KeyV'].indexOf(e.code); if (i >= 0) useSkill(i); if (e.code === 'KeyR') startReload(); if (e.code === 'KeyE') interact();
});
addEventListener('keyup', e => { keys[e.code] = 0; }); addEventListener('blur', () => { keys = {}; mouseDown = false; });
addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); cam.aspect = gcam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); gcam.updateProjectionMatrix(); });
$('re').onclick = () => { if (session && session.onBack) session.onBack(); else toMenu(); };

// ---------- vòng lặp ----------
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, .05); last = now; R.clear();
  if (!S) return;
  if (st === 'play' || (st === 'end' && P)) { if (st === 'play' && !MGR.isOpen() && (locked || lockFail || mp)) tick(dt); if (P) { R.render(S, cam); if (P.alive && st === 'play') { R.clearDepth(); R.render(GS, gcam); } } }
  else { const t = now / 5000, r = BOUND * .45; cam.fov = 60; cam.updateProjectionMatrix(); cam.position.set(Math.cos(t) * r, 28, Math.sin(t) * r); cam.lookAt(0, 6, 0); torch.position.set(0, 8, 0); R.render(S, cam); }
}
function tick(dt) {
  T += dt; P.t += dt; const p = P.pos;
  if (P.alive) {
    const sens = .0022 * (1 - P.aim * .45); let dx = mdx, dy = mdy; mdx = mdy = 0; P.yaw -= dx * sens; P.pitch -= dy * sens;
    if (!locked) { const ax = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0), ay = (keys.ArrowUp ? 1 : 0) + (keys.ArrowDown ? -1 : 0); P.yaw -= ax * 2.2 * dt; P.pitch += ay * 1.6 * dt; if (lockFail) { if (Math.abs(mX) > .15) P.yaw -= (mX - Math.sign(mX) * .15) * 3.2 * dt; if (Math.abs(mY) > .15) P.pitch -= (mY - Math.sign(mY) * .15) * 2.4 * dt; } }
    swX = clamp(swX - dx * .00035, -.05, .05); swY = clamp(swY + dy * .00035, -.04, .04); P.pitch = clamp(P.pitch + pitchKick, -1.45, 1.45); pitchKick = 0;
  }
  P.aim += ((P.aiming && P.alive && P.reload <= 0 ? 1 : 0) - P.aim) * Math.min(1, dt * 12);
  const fw = flatDir(), rt = rightDir(), ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), wish = V().addScaledVector(fw, iz).addScaledVector(rt, ix);
  P.moving = wish.lengthSq() > 0 && P.alive; if (P.moving) wish.normalize(); P.sprinting = !!((keys.ShiftLeft || keys.ShiftRight) && iz > 0 && P.moving && P.aim < .2);
  const sp = P.c.speed * (P.sprinting ? 1.4 : 1) * (P.rage > 0 ? 1.3 : 1) * (P.charge > 0 ? .35 : 1) * (1 - P.aim * .35);
  if (P.dashT > 0) { P.dashT -= dt; P.vel.x = P.dashV.x; P.vel.z = P.dashV.z; } else { const a = Math.min(1, dt * (P.onGround ? 14 : 3.5)); P.vel.x += (wish.x * sp - P.vel.x) * a; P.vel.z += (wish.z * sp - P.vel.z) * a; }
  if (keys.Space && P.onGround && P.alive) { P.vy = 8.2; P.onGround = false; }
  P.vy -= GR * dt; p.x += P.vel.x * dt; p.z += P.vel.z * dt; p.y += P.vy * dt;
  if (p.y <= 0 && P.vy <= 0) { if (!P.onGround && P.vy < -7) P.dip = .18; p.y = 0; P.vy = 0; P.onGround = true; if (P.onLand) { const f = P.onLand; P.onLand = null; P.dashT = 0; f(G); } } else if (p.y > 0) P.onGround = false;
  collide(p, .55); P.dip = Math.max(0, P.dip - dt * .8);
  P.shield -= dt; P.rage -= dt; P.ghost -= dt; P.inv -= dt; P.melee -= dt; P.fireCd -= dt; P.flash -= dt; P.cd = P.cd.map(c => Math.max(0, c - dt)); P.kick = Math.max(0, P.kick - dt * 9); P.spr = Math.max(0, P.spr - dt * 2.2);
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) { P.mag = P.maxMag; P.reload = 0; } }
  if (P.shield <= 0 && prevShield > 0) { burst(eyePos().addScaledVector(aimDir(), 1.2), 0x66ccff, 20, 6, .5, 1, 5); flash('#6cf', .3, 250); SFX.hit(); } prevShield = P.shield;
  $('shd').classList.toggle('on', P.shield > 0); $('rg').classList.toggle('on', P.rage > 0);
  if (P.alive && (mouseDown || keys.KeyF)) fire();
  if (P.charge > 0) { P.charge -= dt; for (let i = 0; i < 3; i++) { const a = rnd(0, 6.28), pos = p.clone().add(V(Math.cos(a) * 7, rnd(.2, 3), Math.sin(a) * 7)), m = new THREE.Mesh(PG, pm(P.c.color)); m.position.copy(pos); S.add(m); pt.push({ m, v: p.clone().setY(1.2).sub(pos).multiplyScalar(1.6), life: .55, max: .55, g: 0, s: 1.2 }); } fovK = -8 * (1 - P.charge / .75); shake = Math.max(shake, .15 * (1 - P.charge / .75)); }
  P.c.update && P.c.update(G, dt);
  if (shakeHold > 0) { shakeHold -= dt; shake = Math.max(shake, .6); }
  for (const q of queue) q.t -= dt; { const due = queue.filter(q => q.t <= 0); queue = queue.filter(q => q.t > 0); due.forEach(q => q.fn()); }
  // hồi sinh (nhiều người)
  if (mp && !P.alive) { respT -= dt; $('down').classList.remove('hide'); $('down').textContent = tr('down') + ' ' + Math.max(0, Math.ceil(respT)) + 's'; if (respT <= 0) { const s = boat.spawn; P.alive = 1; P.hp = P.max; P.pos.set(s.x, 0, s.z); P.vel.set(0, 0, 0); P.inv = 2.5; P.mag = P.maxMag; P.cd = [0, 0, 0, 0]; P.shield = P.rage = P.ghost = 0; P.deadT = 0; $('down').classList.add('hide'); } } else $('down').classList.add('hide');
  // ---- thế giới (chủ phòng mô phỏng quái, máy khách chỉ hiển thị) ----
  if (isHost) hostSim(dt); else { for (const e of en) { if (e.dead) { e.dying -= dt; continue; } updPuppet(e, dt); } }
  for (const e of en) {
    if (e.dead) { e.bar.visible = false; if (e.dying > 0 || isHost) { if (isHost) e.dying -= dt; e.t += dt; if (e.dying > 0) animEnemy(e, dt); } continue; }
    if (e.m.visible) { animEnemy(e, dt); e.pop = Math.max(0, e.pop - dt); e.m.scale.setScalar(1 + e.pop); if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) e.mats.forEach(([m, h]) => m.emissive.setHex(h)); else e.mats.forEach(([m]) => m.emissive.setHex(0xffffff)); } }
    const q = e.m.position; e.bar.visible = e.hp < e.max && e.m.visible; if (e.bar.visible) { e.bar.position.set(q.x, e.h, q.z); e.bar.quaternion.copy(cam.quaternion); e.fill.scale.x = 1.4 * Math.max(0, e.hp / e.max); }
  }
  en = en.filter(e => { if (e.dead && e.dying <= 0) { S.remove(e.m); S.remove(e.bar); return false; } return true });
  for (const j of pj) {
    j.life -= dt; const m = j.m, pp = m.position; let end = false;
    if (j.upd) { if (j.upd(j, dt, G)) end = true; }
    else if (j.type === 'lance') {
      pp.addScaledVector(j.v, dt); burst(pp, 0x9aff30, 1, .6, .3, .9, 0);
      for (const e of en) { if (e.dead || j.h.has(e)) continue; const q = e.m.position, big = e.big; if (Math.hypot(q.x - pp.x, q.z - pp.z) < e.rr * .7 + .9 && Math.abs(pp.y - (big ? 2.2 : 1)) < (big ? 2.4 : 1.3)) { j.h.add(e); hit(e, 90, { kb: .8, from: pp }); burst(pp, 0xe6dfcf, 10, 5, .4); burst(pp, 0x9aff30, 8, 4, .4); shake = Math.max(shake, .2); } }
      if (pp.y < 0 || inB(pp)) { end = true; burst(pp, 0xe6dfcf, 14, 6, .5); ring(pp, 0x9aff30, 2, .3, Math.max(.15, pp.y)); }
    } else if (j.type === 'mis') {
      j.age = (j.age || 0) + dt; const sp = 12 + Math.min(1, j.age * 3) * 22;
      if (j.tg && !j.tg.dead) { const d = j.tg.m.position.clone().add(V(0, j.tg.big ? 2.5 : 1, 0)).sub(pp).normalize(); j.v.normalize().lerp(d, Math.min(1, dt * (2.5 + j.age * 4))).normalize().multiplyScalar(sp); if (j.tg.m.position.clone().setY(0).distanceTo(V(pp.x, 0, pp.z)) < (j.tg.big ? 1.6 : 1.3) && pp.y < (j.tg.big ? 5 : 2.2)) end = true; }
      else j.v.normalize().multiplyScalar(sp);
      pp.addScaledVector(j.v, dt); m.lookAt(pp.clone().add(j.v)); burst(pp, 0xaaaaaa, 1, .4, .5, 1.5, 0); burst(pp, 0xff9a30, 1, .5, .25, 1, 0);
      if (pp.y < .3 || inB(pp) || j.life <= 0) end = true; if (end) boom(pp.clone(), 4, 50);
    } else if (j.type === 'acid') { j.v.y -= j.g * dt; pp.addScaledVector(j.v, dt); m.rotation.x += dt * 8; if (Math.random() < .5) burst(pp, 0x7aff2a, 1, .5, .3, .9, 0); if (pp.y <= .2 || inB(pp) || j.life <= 0) { end = true; cloud(pp); } }
    if (end) j.life = -1; if (j.life <= 0) S.remove(m);
  }
  pj = pj.filter(j => j.life > 0);
  for (const z of zn) {
    z.life -= dt; z.m.children.forEach(c => { if (c.userData.ph !== undefined) { c.scale.setScalar(1 + Math.sin(T * 2 + c.userData.ph) * .12); c.rotation.y += dt * .4; } });
    z.mat.opacity = .22 * Math.min(1, z.life * 1.5); z.dm.opacity = .3 * Math.min(1, z.life * 1.5); if (Math.random() < dt * 14) burst(z.m.position.clone().add(V(rnd(-3.5, 3.5), .2, rnd(-3.5, 3.5))), 0xaaff55, 1, .3, 1, 1, -1.5, 2.5);
    for (const e of en) if (!e.dead && Math.hypot(e.m.position.x - z.m.position.x, e.m.position.z - z.m.position.z) < z.r) hit(e, z.dps * dt, { quiet: true, slow: .2 });
    if (z.life <= 0) { S.remove(z.m); z.mat.dispose(); z.dm.dispose(); }
  }
  zn = zn.filter(z => z.life > 0);
  for (const a of pt) { a.life -= dt; a.v.y -= a.g * dt; a.m.position.addScaledVector(a.v, dt); if (a.m.position.y < .05) { a.m.position.y = .05; a.v.y *= -.3; a.v.x *= .6; a.v.z *= .6; } a.m.scale.setScalar(Math.max(.001, a.s * a.life / a.max)); if (a.life <= 0) S.remove(a.m); } pt = pt.filter(a => a.life > 0);
  for (const f of fxs) { f.life -= dt; const k = clamp(1 - f.life / f.max, 0, 1); f.upd && f.upd(k, f.m); if (f.life <= 0) { S.remove(f.m); if (f.m.userData.own) f.m.material.dispose(); } } fxs = fxs.filter(f => f.life > 0);
  bLight.intensity *= Math.exp(-dt * 8);
  const CH = curHouse(); if (CH && !CH.done) CH.cg.rotation.y = Math.sin(T * 1.5) * .1; if (dropMesh) dropMesh.rotation.y += dt * 2;
  for (const k of kits) { k.t -= dt; k.g.rotation.y += dt * 2; if (k.t <= 0) k.got = 1; else if (Math.hypot(p.x - k.g.position.x, p.z - k.g.position.z) < 1.8 && P.alive && P.hp < P.max) { k.got = 1; P.hp = Math.min(P.max, P.hp + 25); ring(k.g.position, 0x20e060, 2, .4); burst(k.g.position.clone().setY(.8), 0x20e060, 12, 3, .5); SFX.pickup(); flash('#2f6', .15, 200); } if (k.got) S.remove(k.g); }
  kits = kits.filter(k => !k.got);
  if (mp) netTick(dt);
  updRemotes(dt); camAndHud(dt);
}
function hostSim(dt) {
  // bản đồ đường đi tới từng người chơi
  for (const pl of allPlayers()) { pl.ft -= dt; if (!pl.alive) continue; const pc = cellOf(pl.pos.x, pl.pos.z); if (pl.ft <= 0 && (pc !== pl.fc || !pl.FS)) { pl.ft = .35; pl.fc = pc; pl.FS = bfs(pl.pos.x, pl.pos.z, NAV.s); pl.FB = bfs(pl.pos.x, pl.pos.z, NAV.b); } }
  for (const n of nests) {
    n.timer -= dt; n.g.scale.setScalar(1 + Math.sin(T * 2.2 + n.x) * .03);
    if (n.alive < n.max && n.timer <= 0 && minPlayerDist(n.sp.x, n.sp.z) > 34 && allPlayers().some(x => x.alive)) { spawnAt(n, pickType(n)); n.timer = rnd(10, 18); }
  }
  for (const e of en) if (!e.dead) updEnemy(e, dt);
  for (let i = 0; i < en.length; i++) for (let j = i + 1; j < en.length; j++) { const a = en[i], b = en[j]; if (a.dead || b.dead) continue; const dx = b.m.position.x - a.m.position.x, dz = b.m.position.z - a.m.position.z; if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue; const d = Math.hypot(dx, dz), mn = (a.col + b.col) * .85; if (d < mn && d > 1e-4) { const k = (mn - d) / 2 / d; a.m.position.x -= dx * k; a.m.position.z -= dz * k; b.m.position.x += dx * k; b.m.position.z += dz * k; } }
  if (mp) { tSnap -= dt; if (tSnap <= 0) { tSnap = 1 / 12; net.relay('all', snapshot()); }
    if (!endSent && !P.alive && [...remotes.values()].every(r => !r.alive) && T > 3) { endSent = true; net.relay('all', { k: 'end', win: 0, kills, T }); setTimeout(() => finish(0), 800); } }
}
function netTick(dt) {
  tSt -= dt; if (tSt <= 0) { tSt = 1 / 15; net.relay('all', { k: 'st', x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), yaw: +P.yaw.toFixed(2), a: P.alive ? 1 : 0, hp: Math.round(P.hp) }); }
  if (!isHost) { tDmg -= dt; if (tDmg <= 0) { tDmg = .1; if (dmgQ.length) { net.relay(hostId, { k: 'dmg', l: dmgQ }); dmgQ = []; } if (tNoise.length) { net.relay(hostId, { k: 'noise', l: tNoise.splice(0) }); } } }
}
function cloud(pos) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0x7aff2a, transparent: true, opacity: .22, depthWrite: false });
  for (let i = 0; i < 9; i++) { const b = mesh(new Ic(rnd(1.2, 2.2), 1), mat, rnd(-3, 3), rnd(.6, 2.2), rnd(-3, 3), g); b.userData.ph = rnd(0, 6); }
  const dm = am(0x99ff33, .3), d = mesh(GDISC, dm, 0, .08, 0, g); d.rotation.x = -PI / 2; d.scale.setScalar(5); g.position.set(pos.x, 0, pos.z); S.add(g); zn.push({ m: g, mat, dm, life: 7, max: 7, r: 5, dps: 28 });
  ring(pos, 0x7aff2a, 5, .5); burst(pos, 0x7aff2a, 20, 4, .6, 1.2, 6, 2);
}

// ---------- la bàn + HUD ----------
const cmpC = $('cmp').getContext ? $('cmp').getContext('2d') : null, CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function compassTargets() {
  if (stage.phase === 'find') { const H = curHouse(); return H ? [{ x: H.door.x, z: H.door.z, ch: '!', col: '#ffb040' }] : []; }
  if (stage.drop) return [{ x: stage.drop[0], z: stage.drop[1], ch: '!', col: '#ffb040' }, { x: boat.x, z: boat.z, ch: '⚓', col: '#6cff9a' }];
  return [{ x: boat.x, z: boat.z, ch: '⚓', col: '#6cff9a' }];
}
function drawCompass() {
  const x = cmpC; if (!x) return; const W = 520, H = 50, span = 150, hd = ((-P.yaw * 180 / PI) % 360 + 360) % 360, ppd = W / span; x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(8,6,10,.62)'; x.fillRect(0, 12, W, H - 16); x.strokeStyle = 'rgba(230,223,207,.35)'; x.strokeRect(.5, 12.5, W - 1, H - 17); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let a = Math.ceil((hd - span / 2) / 5) * 5; a <= hd + span / 2; a += 5) {
    const px = W / 2 + (a - hd) * ppd, ang = ((a % 360) + 360) % 360, major = ang % 45 === 0, mid = ang % 15 === 0;
    x.strokeStyle = major ? '#e6dfcf' : 'rgba(230,223,207,.55)'; x.lineWidth = major ? 2 : 1; x.beginPath(); x.moveTo(px, 13); x.lineTo(px, 13 + (major ? 13 : mid ? 9 : 5)); x.stroke();
    if (major) { x.fillStyle = '#e6dfcf'; x.font = 'bold 14px Trebuchet MS'; x.fillText(CARD[ang / 45], px, 36); } else if (ang % 15 === 0) { x.fillStyle = '#9a9488'; x.font = '11px Trebuchet MS'; x.fillText(String(ang), px, 36); }
  }
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(W / 2 - 6, 2); x.lineTo(W / 2 + 6, 2); x.lineTo(W / 2, 11); x.closePath(); x.fill();
  for (const h of compassTargets()) {
    const dx = h.x - P.pos.x, dz = h.z - P.pos.z, br = ((Math.atan2(dx, -dz) * 180 / PI) % 360 + 360) % 360; let dl = ((br - hd + 540) % 360) - 180; const off = Math.abs(dl) > span / 2 - 4, px = clamp(W / 2 + dl * ppd, 18, W - 18);
    x.globalAlpha = off ? .55 : 1; x.shadowColor = h.col; x.shadowBlur = 10; x.fillStyle = h.col; x.font = 'bold 24px Trebuchet MS'; x.fillText(h.ch, px, 30); x.shadowBlur = 0; x.fillStyle = '#ffd9a0'; x.font = '10px Trebuchet MS'; x.fillText(Math.round(Math.hypot(dx, dz)) + 'm', px, 47); x.globalAlpha = 1;
  }
}
function hintText() {
  if (stage.phase === 'find') return tr('hint_find'); if (stage.carrier === myId) return tr('hint_carry'); if (stage.carrier === -1) return tr('pickup'); return tr('hint_carry_other');
}
function camAndHud(dt) {
  const alive = P.alive; if (!alive) P.deadT += dt; shake = Math.max(0, shake - dt * 1.6);
  const mv = P.onGround ? Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 6) : 0, bob = Math.sin(P.t * (P.sprinting ? 13 : 9)) * .045 * mv * (1 - P.aim * .7), eyeH = alive ? 1.7 : 1.7 - 1.2 * Math.min(1, P.deadT * 2.2);
  const sx = shake * .05, rl = alive ? ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)) * -.025 : Math.min(1.3, P.deadT * 2); P.roll += (rl - P.roll) * Math.min(1, dt * 8);
  cam.position.set(P.pos.x + rnd(-sx, sx), P.pos.y + eyeH + bob - P.dip + rnd(-sx, sx), P.pos.z); cam.rotation.set(P.pitch + rnd(-1, 1) * shake * .02, P.yaw + rnd(-1, 1) * shake * .02, P.roll);
  const tf = 75 - P.aim * 27 + fovK + (P.sprinting ? 6 : 0) + (P.rage > 0 ? 4 : 0); fovK *= Math.exp(-dt * 6); cam.fov += (tf - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix();
  const e0 = eyePos(), ad = aimDir(); torch.position.copy(e0); torch.target.position.copy(e0).add(ad.clone().multiplyScalar(10)); torchP.position.copy(e0).addScaledVector(ad, 1.5);
  const g = gunG, rpr = P.reload > 0 ? 1 - P.reload / P.c.gun.reload : 0, dip = P.reload > 0 ? Math.sin(rpr * PI) : 0; P.sprB += ((P.sprinting ? 1 : 0) - P.sprB) * Math.min(1, dt * 8);
  const bx = Math.sin(P.t * (P.sprinting ? 13 : 9) / 2) * .012 * mv, by = Math.abs(Math.cos(P.t * (P.sprinting ? 13 : 9) / 2)) * .014 * mv, ads = P.aim; swX *= Math.exp(-dt * 6); swY *= Math.exp(-dt * 6);
  const ml = P.melee > 0 ? Math.sin((1 - P.melee / .3) * PI) : 0, sgk = P.c.gun.style === 'shotgun' ? 1.8 : 1;
  g.position.set(GP.x + (GPA.x - GP.x) * ads + (bx + swX) * (1 - ads * .7) - P.sprB * .08, GP.y + (GPA.y - GP.y) * ads + by * (1 - ads) + swY * (1 - ads * .7) - dip * .24 - P.sprB * .06 - ml * .25, GP.z + (GPA.z - GP.z) * ads + P.kick * .07 * sgk + ml * .1);
  g.rotation.set(P.kick * .06 * sgk - dip * .35 + P.sprB * .1 + ml * .3, .05 * (1 - ads) + P.sprB * .5, -dip * .5); gunMag.visible = !(P.reload > 0 && rpr > .28 && rpr < .55 && P.c.gun.style !== 'shotgun');
  gunAcc[0].emissiveIntensity = .5 + (P.charge > 0 ? (1 - P.charge / .75) * 3 : 0) + (P.rage > 0 ? 1 : 0);
  gunMF.visible = P.flash > 0; if (gunMF.visible) { gunMF.rotation.z = rnd(0, 6.28); gunMF.scale.setScalar(rnd(.8, 1.3)); } gml.intensity = P.flash > 0 ? 1.6 : 0;
  if (clawG) { clawG.visible = P.melee > 0; if (P.melee > 0) { const k = 1 - P.melee / .3; clawG.position.set(.5 - k * 1.0, -.28 + Math.sin(k * PI) * .1, -.55); clawG.rotation.set(0, 0, -.7 + k * 1.4); } }
  $('hp').style.width = P.hp / P.max * 100 + '%'; $('hpt').textContent = Math.ceil(P.hp) + ' / ' + P.max;
  $('obj').innerHTML = `${tr('obj')} ${stage.delivered} / ${stage.total}<small>${tr('kills')} ${kills} · ${T.toFixed(0)}s</small>`;
  $('am').textContent = P.reload > 0 ? '--' : P.mag; $('am').style.color = P.mag <= Math.ceil(P.maxMag * .27) && P.reload <= 0 ? '#ff5a40' : ''; $('rb').style.opacity = P.reload > 0 ? 1 : 0; $('rbi').style.width = (rpr * 100) + '%';
  const act = P.c.active ? P.c.active(P) : [0, 0, 0, 0];
  P.cd.forEach((c, i) => { $('cd' + i).style.height = c / P.c.skills[i].cd * 100 + '%'; const a = act[i] > 0; $('sl' + i).classList.toggle('act', a); $('ct' + i).textContent = a ? act[i].toFixed(1) + 's' : (c > 0 ? c.toFixed(1) : ''); });
  const it = interactTarget(), pr = $('prompt'); let ptxt = it === 'crate' ? tr('open') : it === 'pickup' ? tr('pickup') : it === 'deposit' ? tr('deposit') : '';
  if (!ptxt && P.alive) for (const H of stageHouses) if (H.locked && Math.hypot(P.pos.x - H.door.x, P.pos.z - H.door.z) < 5) { ptxt = tr('locked'); break; }
  pr.classList.toggle('hide', !ptxt); if (ptxt) pr.textContent = ptxt;
  $('hint').textContent = hintText();
  if (mp) { $('team').innerHTML = [...remotes.values()].map(r => `<div><i style="background:${hex((CLASSES[r.cls] || { color: 0xffffff }).color)}"></i>${r.name} ${r.alive ? Math.round(r.hp) : '✖'}</div>`).join(''); } else $('team').innerHTML = '';
  drawCompass();
  const r = castRay(e0, ad, 120), col = r.e ? '#ff3b3b' : '#ffffff'; if (col !== xhCol) { xhCol = col; $('xh').style.setProperty('--xc', col); }
  const sprd = ((P.moving && P.onGround ? .5 : 0) + (P.onGround ? 0 : 1) + P.spr * .7) * (1 - P.aim * .7); $('xh').style.setProperty('--g', (6 + sprd * 10 - P.aim * 2 + (P.c.gun.style === 'shotgun' ? 10 : 0)) + 'px'); $('xh').style.opacity = P.reload > 0 ? .45 : 1;
}

// ---------- API công khai cho class / màn chơi ----------
Object.assign(G, {
  ring, shell, burst, tracer, boomLight, flash, speedLines, hitMarker, dmgNum, clawAnim, roarAnim, mawAnim, hit, area, boom, cloud, castRay, collide, inB, noiseAt, flatDir, rightDir, aimDir, eyePos, addFx, kill,
  shake: v => { shake = Math.max(shake, v); }, holdShake: t => { shakeHold = Math.max(shakeHold, t); }, fov: k => { fovK = k; }, kick: v => { pitchKick += v; },
  unlockHouse
});
export function init() { newScene(); requestAnimationFrame(loop); }
export { G };
// (dùng cho kiểm thử tự động)
export const _dbg = { onRelay, snapshot, applySnap, get stage() { return stage; }, get kills() { return kills; }, get remotes() { return remotes; }, get houses() { return stageHouses; }, get boat() { return boat; }, get nests() { return nests; }, get st() { return st; }, setHost(h) { isHost = h; }, tickN(n, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt); }, spawnAt, interact, castRay, fire, useSkill, get NAV() { return NAV; }, bfs, cellOf };
