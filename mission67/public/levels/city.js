// MÀN: Thành phố lớn — 6x6 khối nhà, 5 bình gas. Thêm màn mới: copy file này (hoặc _template.js), đổi id/name/tham số.
export default {
  id: 'city',
  name: { vi: 'Thành phố (lớn · 5 bình gas)', en: 'City (large · 5 canisters)' },
  build(G) { return G.kit.gridCity({ n: 6, houses: 5 }); }
};
