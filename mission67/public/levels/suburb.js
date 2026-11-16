// MÀN: Khu ngoại ô — nhỏ hơn, ít bình gas (3), hợp để chơi nhanh / thử nghiệm.
export default {
  id: 'suburb',
  name: { vi: 'Ngoại ô (nhỏ · 3 bình gas)', en: 'Suburb (small · 3 canisters)' },
  build(G) { return G.kit.gridCity({ n: 4, houses: 3, hMin: 8, hMax: 20, moundsAlley: 2, moundsStreet: 2, nearSafe: 40 }); }
};
