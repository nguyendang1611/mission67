// MẪU CLASS NHÂN VẬT — file bắt đầu bằng dấu _ sẽ bị bỏ qua. Copy ra tên khác (vd: medic.js).
// Mỗi người trong phòng phải chọn class KHÁC nhau (id phải duy nhất).
// Trong cast(G): G.P (người chơi), G.hit/G.area (gây sát thương), G.burst/ring/shell/flash (hiệu ứng), G.queue.push({t,fn}) (hẹn giờ),
// G.pj.push({type:'custom', m, life, upd(j,dt,G){ ...; return true } }) (đạn tự viết). Trả về false nếu không dùng được (không tốn hồi chiêu).
export default {
  id: 'medic', name: { vi: 'Y TÁ', en: 'MEDIC' }, color: 0x40ffc0, hp: 130, speed: 6.8, skin: 0x305040,
  gun: { name: 'MD-30 CARBINE', rate: 9, spread: .006, reload: 1.6, mag: 30, tracer: 0x80ffd0 },
  // súng ống: thêm style:'shotgun', pellets:8, dmg:14, falloff:[5,22,.1], mag:4, rate:1.2, spread:.06
  skills: [
    { key: 'Z', name: 'Heal Pulse', cd: 8, cast(G) { G.P.hp = Math.min(G.P.max, G.P.hp + 40); G.ring(G.P.pos, 0x40ffc0, 4, .6); G.flash('#4fc', .3, 300); } },
    { key: 'X', name: 'Quick Step', cd: 5, cast(G) { G.P.dashT = .2; G.P.dashV = G.flatDir().multiplyScalar(24); } },
    { key: 'C', name: 'Shock', cd: 10, cast(G) { G.area(G.P.pos, 8, 40, { kb: 3, stun: 1 }); G.ring(G.P.pos, 0x40ffc0, 8, .5); } },
    { key: 'V', name: 'Overdrive', cd: 20, cast(G) { G.P.rage = 6; G.flash('#4fc', .4, 400); } }
  ],
  active: P => [0, 0, 0, P.rage]
};
