// MISSION 67 — máy chủ không cần cài thư viện nào (chỉ cần Node.js 16+).
//  - phục vụ thư mục public/
//  - /api/manifest : tự quét public/classes và public/levels (kéo-thả file là có)
//  - /ws           : WebSocket, phòng tối đa 3 người, chỉ chuyển tiếp tin nhắn
// Chạy:  node server.js     (đổi cổng: PORT=8080 node server.js)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const PORT = +process.env.PORT || 3000, PUB = path.join(__dirname, 'public'), MAXP = 3;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function scan(dir) { try { return fs.readdirSync(path.join(PUB, dir)).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort(); } catch (e) { return []; } }
const manifest = () => ({ classes: scan('classes'), levels: scan('levels') });

const server = http.createServer((req, res) => {
  let u; try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u === '/api/manifest') { res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(manifest())); }
  if (u === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (u === '/') u = '/index.html';
  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d);
  });
});

// ---------- WebSocket tối giản (RFC 6455) ----------
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function frame(str) {
  const p = Buffer.from(str), n = p.length; let h;
  if (n < 126) h = Buffer.from([0x81, n]);
  else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([h, p]);
}
let nextId = 1;
class Client {
  constructor(socket) {
    this.s = socket; this.buf = Buffer.alloc(0); this.id = nextId++; this.room = null; this.name = 'Player'; this.cls = null; this.frag = [];
    socket.on('data', d => this.onData(d)); socket.on('close', () => this.close()); socket.on('error', () => this.close());
  }
  send(o) { if (this.s.destroyed) return; try { this.s.write(frame(JSON.stringify(o))); } catch (e) { /* bỏ qua */ } }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const op = b[0] & 15, fin = (b[0] & 128) !== 0, masked = (b[1] & 128) !== 0; let len = b[1] & 127, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) { this.s.destroy(); return; }
      const need = off + (masked ? 4 : 0) + len; if (b.length < need) return;
      let payload = b.slice(off + (masked ? 4 : 0), need);
      if (masked) { const m = b.slice(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      this.buf = b.slice(need);
      if (op === 8) { this.s.end(); return; }
      if (op === 9) { const pong = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]); try { this.s.write(pong); } catch (e) {} continue; }
      if (op === 0 || op === 1) {
        this.frag.push(payload);
        if (fin) { const text = Buffer.concat(this.frag).toString('utf8'); this.frag = []; let m; try { m = JSON.parse(text); } catch (e) { continue; } this.onMsg(m); }
      }
    }
  }
  onMsg(m) { try { handle(this, m); } catch (e) { console.error('lỗi xử lý', e); } }
  close() { if (this.closed) return; this.closed = true; leave(this); }
}
server.on('upgrade', (req, socket) => {
  if (req.url.split('?')[0] !== '/ws' || !req.headers['sec-websocket-key']) { socket.destroy(); return; }
  const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  socket.setNoDelay(true); new Client(socket);
});

// ---------- phòng ----------
const rooms = new Map();
const clean = (s, n) => String(s || '').replace(/[^\w\- ]/g, '').slice(0, n);
function lobby(r) {
  const base = { t: 'lobby', room: r.code, host: r.host, level: r.level, started: r.started, players: [...r.clients.values()].map(c => ({ id: c.id, name: c.name, cls: c.cls })) };
  for (const c of r.clients.values()) c.send({ ...base, you: c.id });
}
function leave(c) {
  const r = c.room; if (!r) return; c.room = null; r.clients.delete(c.id);
  if (c.id === r.host || r.clients.size === 0) { for (const o of r.clients.values()) { o.room = null; o.send({ t: 'closed' }); } rooms.delete(r.code); return; }
  for (const o of r.clients.values()) o.send({ t: 'r', from: c.id, d: { k: 'left', id: c.id } });
  lobby(r);
}
function handle(c, m) {
  if (m.t === 'join') {
    if (c.room) return;
    const code = clean(m.room, 8).toUpperCase() || 'ROOM'; c.name = clean(m.name, 12) || 'Player' + c.id;
    let r = rooms.get(code);
    if (!r) { r = { code, host: c.id, clients: new Map(), level: null, started: false }; rooms.set(code, r); }
    if (r.started) return c.send({ t: 'err', m: 'started' });
    if (r.clients.size >= MAXP) return c.send({ t: 'err', m: 'full' });
    r.clients.set(c.id, c); c.room = r; c.cls = null; lobby(r); return;
  }
  const r = c.room; if (!r) return;
  switch (m.t) {
    case 'pick': {
      if (r.started) return;
      const cls = clean(m.cls, 32);
      if (cls && [...r.clients.values()].some(o => o !== c && o.cls === cls)) return c.send({ t: 'err', m: 'class_taken' });
      c.cls = cls || null; lobby(r); break; }
    case 'level': if (c.id === r.host && !r.started) { r.level = clean(m.id, 32); lobby(r); } break;
    case 'start': {
      if (c.id !== r.host || r.started) return;
      const ps = [...r.clients.values()];
      if (ps.some(p => !p.cls)) return c.send({ t: 'err', m: 'need_class' });
      r.started = true; const seed = (Math.random() * 2 ** 31) | 0;
      for (const p of ps) p.send({ t: 'start', seed, level: r.level, host: r.host, you: p.id, players: ps.map(o => ({ id: o.id, name: o.name, cls: o.cls })) });
      break; }
    case 'back': if (c.id === r.host) { r.started = false; lobby(r); } break;
    case 'relay': {
      const d = m.d, to = m.to; if (!r.started) return;
      if (to === 'all') { for (const o of r.clients.values()) if (o !== c) o.send({ t: 'r', from: c.id, d }); }
      else { const target = to === 'host' ? r.clients.get(r.host) : r.clients.get(+to); if (target && target !== c) target.send({ t: 'r', from: c.id, d }); }
      break; }
  }
}

function lanIPs() { const o = []; for (const n of Object.values(os.networkInterfaces())) for (const i of n || []) if (i.family === 'IPv4' && !i.internal) o.push(i.address); return o; }
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n  MISSION 67 đang chạy!\n');
    console.log('  Máy này      : http://localhost:' + PORT);
    for (const ip of lanIPs()) console.log('  Bạn cùng mạng: http://' + ip + ':' + PORT + '   <- gửi link này cho bạn bè');
    console.log('\n  Nhấn Ctrl+C để tắt.\n');
  });
}
module.exports = { server, manifest };
