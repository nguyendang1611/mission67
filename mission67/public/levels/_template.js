// MẪU MÀN CHƠI — file bắt đầu bằng dấu _ sẽ bị bỏ qua. Copy ra tên khác (vd: harbor.js) để dùng.
// build(G) phải trả về { bound, spawn:V, boat, houses[], nests[] } — dễ nhất là gọi G.kit.gridCity(...).
// Tham số gridCity: n (số khối mỗi chiều), pitch, houses (số bình gas), hMin/hMax (độ cao nhà),
//                   moundsAlley / moundsStreet (số ụ đất quái trong ngõ / ngoài đường), nearSafe (bán kính an toàn quanh thuyền)
// G.R là bộ ngẫu nhiên có hạt giống: dùng G.R.rnd(a,b), G.R.int(n), G.R.chance(p)... thay cho Math.random()
// để mọi người chơi trong phòng thấy CÙNG một bản đồ.
export default {
  id: 'my_level',
  name: { vi: 'Tên màn', en: 'Level name' },
  build(G) { return G.kit.gridCity({ n: 5, houses: 4 }); }
};
