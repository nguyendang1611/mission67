// Khởi động: nạp danh sách class / màn chơi, dựng menu, sảnh đa người.
import { tr, L, applyLang, toggleLang, onLang } from './i18n.js';
import { net } from './net.js';

const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
let Game = null, mpAvail = false, mode = 'solo', selClass = null, selLevel = null;
let lob = null;               // trạng thái sảnh nhận từ server
const hex = c => '#' + c.toString(16).padStart(6, '0');

async function loadJSON(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(url); return r.json(); }
async function boot() {
  for (let i = 0; i < 100 && !window.THREE; i++) await wait(100);
  if (!window.THREE) { document.querySelector('.sub').textContent = 'Không tải được three.js (cần Internet hoặc đặt public/lib/three.min.js)'; return; }
  Game = await import('./game.js');
  let man; try { man = await loadJSON('/api/manifest'); mpAvail = true; } catch (e) { try { man = await loadJSON('manifest.json'); } catch (e2) { man = { classes: ['iron.js', 'chimera.js', 'aberrant.js'], levels: ['city.js', 'suburb.js'] }; } }
  const errs = [];
  for (const f of man.classes) { try { const m = await import('../classes/' + f); Game.registerClass(m.default); } catch (e) { console.error(f, e); errs.push(tr('err_class_file') + ': ' + f); } }
  for (const f of man.levels) { try { const m = await import('../levels/' + f); Game.registerLevel(m.default); } catch (e) { console.error(f, e); errs.push(tr('err_level_file') + ': ' + f); } }
  Game.init();
  selClass = Object.keys(Game.CLASSES)[0]; selLevel = Object.keys(Game.LEVELS)[0];
  $('tabMp').style.display = mpAvail ? '' : 'none';
  if (errs.length) setErr(errs.join(' · '));
  buildLevels(); buildCards(); applyLang(); Game.preview(selLevel);
}
function setErr(t) { $('err').textContent = t || ''; if (t && mode !== 'mp') { const s = document.createElement('div'); s.className = 'sub'; s.style.color = '#ff7a6a'; s.textContent = t; $('cards').after(s); } }

// ---------- menu ----------
const takenBy = k => lob ? lob.players.find(p => p.cls === k && p.id !== lob.you) : null;
function buildCards() {
  const box = $('cards'); box.innerHTML = '';
  for (const k in Game.CLASSES) {
    const c = Game.CLASSES[k], d = document.createElement('div'), tk = takenBy(k); d.className = 'card' + (k === selClass ? ' on' : '') + (tk ? ' taken' : ''); d.style.setProperty('--c', hex(c.color)); d.dataset.k = k;
    d.innerHTML = `<b>${L(c.name)}</b>${tk ? `<div class="tk">${tr('taken')}: ${tk.name}</div>` : ''}<div class="gn">▌ ${L(c.gun.name)}${c.gun.style === 'shotgun' ? ' · ' + c.gun.mag + '🔸' : ''}</div><ul>${c.skills.map(s => `<li><kbd>${s.key}</kbd>${L(s.name)}<em>CD ${s.cd}s</em></li>`).join('')}</ul>`;
    d.onclick = () => { if (tk) return; selClass = k; if (mode === 'mp' && lob) net.pick(k); buildCards(); };
    box.appendChild(d);
  }
}
function buildLevels() {
  const box = $('levels'); box.innerHTML = '';
  const cur = mode === 'mp' && lob && lob.level ? lob.level : selLevel;
  for (const k in Game.LEVELS) {
    const b = document.createElement('button'); b.className = 'lv' + (k === cur ? ' on' : ''); b.textContent = L(Game.LEVELS[k].name);
    b.onclick = () => { if (mode === 'mp') { if (lob && lob.host === lob.you) net.level(k); } else { selLevel = k; Game.preview(k); buildLevels(); } };
    box.appendChild(b);
  }
}
onLang(() => { if (Game) { buildLevels(); buildCards(); renderLobby(); } });
function setMode(m) {
  mode = m; $('tabSolo').classList.toggle('on', m === 'solo'); $('tabMp').classList.toggle('on', m === 'mp'); $('mpbox').classList.toggle('hide', m !== 'mp'); setErr('');
  updGo(); buildLevels();
}
function updGo() {
  const b = $('go');
  if (mode === 'solo') { b.textContent = tr('go'); b.disabled = false; return; }
  const host = lob && lob.host === lob.you; b.textContent = !lob ? tr('go') : host ? tr('goHost') : tr('goWait'); b.disabled = !lob || !host;
}
function renderLobby() {
  $('joinrow').classList.toggle('hide', !!lob); $('inroom').classList.toggle('hide', !lob);
  if (lob) {
    $('roominfo').textContent = `${tr('mp_room_is')}: ${lob.room}`;
    $('plist').innerHTML = lob.players.map(p => { const c = Game.CLASSES[p.cls]; return `<div class="pl" style="border-color:${c ? hex(c.color) : '#4a3a3c'}">${p.name}${p.id === lob.host ? ' ★' : ''} — ${c ? L(c.name) : tr('mp_nocls')}</div>`; }).join('');
  }
  updGo();
}
$('lang').onclick = toggleLang;
$('tabSolo').onclick = () => setMode('solo'); $('tabMp').onclick = () => setMode('mp');
$('pjoin').onclick = async () => {
  setErr(tr('mp_wait'));
  try { await net.connect(); } catch (e) { setErr(tr('err_conn')); return; }
  setErr(''); net.join($('proom').value.trim() || 'M67', $('pname').value.trim() || 'Player');
};
$('pleave').onclick = () => { net.close(); lob = null; renderLobby(); buildCards(); buildLevels(); };
$('go').onclick = () => {
  if (!Game) return;
  if (mode === 'solo') { Game.startGame({ cls: selClass, level: selLevel, seed: (Math.random() * 2 ** 31) | 0, onBack: () => { Game.toMenu(); Game.preview(selLevel); } }); }
  else if (lob && lob.host === lob.you) { if (!selClass) return; net.level(lob.level || selLevel); net.start(); }
};

// ---------- đa người ----------
net.on('lobby', m => {
  const wasStarted = lob && lob.started; lob = m; if (!m.players.find(p => p.id === m.you && p.cls) && selClass && !m.started) net.pick(selClass);
  setErr(''); renderLobby(); buildCards(); buildLevels();
  if (m.started && !wasStarted) { /* đã vào trận: chờ tin 'start' */ }
});
net.on('err', m => setErr(tr('err_' + m.m)));
net.on('closed', () => { if (Game && Game.getState() !== 'menu') Game.toMenu(); lob = null; setMode('mp'); renderLobby(); buildCards(); setErr(tr('err_closed')); });
net.on('close', was => { if (was && lob) { lob = null; renderLobby(); buildCards(); setErr(tr('err_conn')); if (Game.getState() !== 'menu') Game.toMenu(); } });
net.on('start', m => {
  const me = m.players.find(p => p.id === m.you), cls = me && me.cls;
  const lv = m.level && Game.LEVELS[m.level] ? m.level : selLevel;
  Game.startGame({ mp: true, cls, level: lv, seed: m.seed, me: m.you, host: m.host, players: m.players, onBack: () => { if (lob && lob.host === lob.you) net.back(); Game.toMenu(); setMode('mp'); renderLobby(); buildCards(); buildLevels(); } });
});
boot();
