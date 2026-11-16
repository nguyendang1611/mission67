// Tạo public/manifest.json cho trường hợp đưa game lên hosting TĨNH (GitHub Pages, Netlify...) — chỉ chơi 1 người.
// Mỗi lần thêm / xóa file trong public/classes hoặc public/levels hãy chạy lại:  node tools/make-manifest.js
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const scan = d => { try { return fs.readdirSync(path.join(pub, d)).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort(); } catch (e) { return []; } };
const m = { classes: scan('classes'), levels: scan('levels') };
fs.writeFileSync(path.join(pub, 'manifest.json'), JSON.stringify(m, null, 2));
console.log('Đã ghi public/manifest.json', m);
