// Tiện ích đồ họa dùng chung (three.js được nạp toàn cục từ index.html)
export const THREE = globalThis.THREE;
export const PI = Math.PI, Y = new THREE.Vector3(0, 1, 0);
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
// RNG có hạt giống: mọi người chơi trong phòng dựng ra CÙNG một bản đồ
export function makeRng(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const R = { f, rnd: (x, y) => x + f() * (y - x), int: n => Math.floor(f() * n), pick: a => a[Math.floor(f() * a.length)], chance: p => f() < p,
    shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; } };
  return R;
}
export const B = THREE.BoxGeometry, Cn = THREE.ConeGeometry, Cy = THREE.CylinderGeometry, Ic = THREE.IcosahedronGeometry, Oc = THREE.OctahedronGeometry, ADD = THREE.AdditiveBlending;
export const M = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: e, flatShading: true, roughness: .85 });
export const EM = (c, e, i = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: i, flatShading: true, roughness: .6 });
export const BM = c => new THREE.MeshBasicMaterial({ color: c });
export const am = (c, op = 1, wire = false) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: ADD, depthWrite: false, wireframe: wire, side: THREE.DoubleSide });
export const mesh = (g, m, x, y, z, p) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p && p.add(o); return o; };
export const GDISC = new THREE.CircleGeometry(1, 32);
export const segU = (len, th, mat) => new THREE.Mesh(new Cy(th * .65, th, len, 5).translate(0, len / 2, 0), mat);   // đoạn chi mọc lên +y
export const segD = (len, th, mat) => new THREE.Mesh(new Cy(th * .7, th, len, 5).translate(0, -len / 2, 0), mat);   // đoạn chi rủ xuống -y
export const hex = c => '#' + c.toString(16).padStart(6, '0');
export const angLerp = (a, b, t) => { const d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * t; };
