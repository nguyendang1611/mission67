// Chuỗi giao diện Việt / Anh. Tên class và màn chơi có thể là chuỗi hoặc {vi:'..',en:'..'} (xem hàm L).
const TX = {
  vi: {
    sub: 'G.A.O. — Global Anomaly Organization · Survival: Thành phố', go: 'XUẤT PHÁT', goHost: 'BẮT ĐẦU', goWait: 'CHỜ CHỦ PHÒNG...', lobby: 'VỀ SẢNH', cancel: 'HỦY (ESC)',
    help: 'W A S D: di chuyển · Chuột: ngắm · Chuột trái: bắn · Chuột phải: ngắm cận · R: nạp đạn · Shift: chạy · Space: nhảy · E: tương tác · Z X C V: kỹ năng',
    mission: 'Mở khóa từng ngôi nhà có dấu "!" trên la bàn, giải đố lấy bình gas rồi MANG RA THUYỀN để cất. Cất xong mới được chỉ dẫn bình kế tiếp. Quái làm tổ ở ụ đất và trong nhà.',
    level: 'MÀN CHƠI', solo: 'CHƠI ĐƠN', mp: 'ĐA NGƯỜI (CÙNG MẠNG, TỐI ĐA 3)', mp_name: 'Tên của bạn', mp_room: 'Mã phòng', mp_join: 'TẠO / VÀO PHÒNG', mp_leave: 'RỜI PHÒNG',
    mp_room_is: 'Phòng', mp_host: 'chủ phòng', mp_nocls: 'chưa chọn class', mp_hint: 'Mỗi người phải chọn một class khác nhau. Chủ phòng chọn màn rồi bấm BẮT ĐẦU.', mp_wait: 'Đang kết nối...',
    err_full: 'Phòng đã đủ 3 người.', err_started: 'Phòng đang chơi.', err_class_taken: 'Class này đã có người chọn.', err_need_class: 'Mọi người phải chọn class.', err_conn: 'Không kết nối được máy chủ.', err_closed: 'Chủ phòng đã thoát, phòng đóng.',
    err_noserver: 'Cần mở game qua máy chủ (node server.js) để chơi nhiều người.', taken: 'ĐÃ CHỌN',
    pause: 'NHẤN VÀO MÀN HÌNH ĐỂ TIẾP TỤC', pause2: '(chuột sẽ được khoá để ngắm)',
    obj: 'BÌNH GAS', kills: 'Hạ', open: '[E] MỞ HỘP', pickup: '[E] NHẶT BÌNH GAS', deposit: '[E] CẤT BÌNH GAS LÊN THUYỀN', locked: 'NHÀ ĐANG KHÓA — cất bình gas trước',
    hint_find: 'Tìm ngôi nhà có dấu "!" trên la bàn', hint_carry: 'Mang bình gas ra thuyền ⚓', hint_carry_other: 'Đồng đội đang mang bình gas — hỗ trợ họ ra thuyền ⚓',
    down: 'BẠN ĐÃ BỊ HẠ — hồi sinh tại thuyền sau', done: 'HOÀN THÀNH',
    win: 'ĐÃ SƠ TÁN', lose: 'KIA', winS: (k, t) => `Đã cất đủ bình gas lên thuyền. Tiêu diệt ${k} quái vật trong ${t}s.`, loseS: k => `Tín hiệu mất. Đã hạ ${k} quái vật.`,
    mg_wires: 'NỐI DÂY ĐIỆN', mgh_wires: 'Kéo từ đầu dây bên trái sang đầu dây cùng màu bên phải.',
    mg_pipes: 'NỐI ỐNG DẪN GAS', mgh_pipes: 'Bấm vào ô để xoay ống, nối nguồn bên trái với van bên phải.',
    mg_simon: 'MẬT MÃ ĐÈN', mgh_simon: 'Xem dãy đèn nhấp nháy rồi bấm lại đúng thứ tự.',
    mg_timing: 'KHÓA VAN ÁP SUẤT', mgh_timing: 'Bấm DỪNG (hoặc Space) khi vạch trắng nằm trong vùng xanh. Cần 3 lần liên tiếp.', stop: 'DỪNG',
    mg_lights: 'CẦU CHÌ', mgh_lights: 'Bật sáng tất cả 9 cầu chì. Bấm một ô sẽ đảo ô đó và các ô kề bên.',
    err_class_file: 'File class bị lỗi', err_level_file: 'File màn chơi bị lỗi'
  },
  en: {
    sub: 'G.A.O. — Global Anomaly Organization · Survival: City', go: 'DEPLOY', goHost: 'START', goWait: 'WAITING FOR HOST...', lobby: 'LOBBY', cancel: 'CANCEL (ESC)',
    help: 'W A S D: move · Mouse: look · Left click: fire · Right click: aim down sights · R: reload · Shift: sprint · Space: jump · E: interact · Z X C V: skills',
    mission: 'Unlock each house marked "!" on the compass, solve the puzzle to get a gas canister and CARRY IT TO THE BOAT. Only after storing it will the next canister be revealed. Monsters nest in dirt mounds and inside houses.',
    level: 'LEVEL', solo: 'SOLO', mp: 'MULTIPLAYER (SAME NETWORK, MAX 3)', mp_name: 'Your name', mp_room: 'Room code', mp_join: 'CREATE / JOIN ROOM', mp_leave: 'LEAVE ROOM',
    mp_room_is: 'Room', mp_host: 'host', mp_nocls: 'no class yet', mp_hint: 'Everyone must pick a different class. The host picks the level and presses START.', mp_wait: 'Connecting...',
    err_full: 'The room already has 3 players.', err_started: 'The room is already playing.', err_class_taken: 'That class is already taken.', err_need_class: 'Everyone must pick a class.', err_conn: 'Could not reach the server.', err_closed: 'The host left, room closed.',
    err_noserver: 'Open the game through the server (node server.js) to play multiplayer.', taken: 'TAKEN',
    pause: 'CLICK THE SCREEN TO RESUME', pause2: '(mouse will be locked for aiming)',
    obj: 'GAS CANISTER', kills: 'Kills', open: '[E] OPEN CRATE', pickup: '[E] PICK UP CANISTER', deposit: '[E] STORE CANISTER ON THE BOAT', locked: 'HOUSE LOCKED — store the canister first',
    hint_find: 'Find the house marked "!" on the compass', hint_carry: 'Carry the canister to the boat ⚓', hint_carry_other: 'A teammate carries the canister — help them reach the boat ⚓',
    down: 'YOU ARE DOWN — respawn at the boat in', done: 'COMPLETE',
    win: 'EVACUATED', lose: 'KIA', winS: (k, t) => `All canisters stored on the boat. ${k} monsters killed in ${t}s.`, loseS: k => `Signal lost. ${k} monsters killed.`,
    mg_wires: 'WIRE CONNECT', mgh_wires: 'Drag from a wire on the left to the wire of the same colour on the right.',
    mg_pipes: 'GAS PIPE LINK', mgh_pipes: 'Click a tile to rotate it. Connect the source on the left to the valve on the right.',
    mg_simon: 'LIGHT CODE', mgh_simon: 'Watch the light sequence, then repeat it in order.',
    mg_timing: 'PRESSURE VALVE', mgh_timing: 'Press STOP (or Space) while the white bar is inside the green zone. 3 hits in a row.', stop: 'STOP',
    mg_lights: 'FUSE BOX', mgh_lights: 'Turn all 9 fuses on. Clicking a tile toggles it and its neighbours.',
    err_class_file: 'Broken class file', err_level_file: 'Broken level file'
  }
};
let LANG = 'vi'; try { LANG = localStorage.getItem('m67lang') || 'vi'; } catch (e) { /* bỏ qua */ }
export const getLang = () => LANG;
export const tr = k => { const v = (TX[LANG] || TX.vi)[k]; return v === undefined ? k : v; };
export const L = x => (x && typeof x === 'object') ? (x[LANG] || x.vi || x.en || '') : (x || '');   // chuỗi hoặc {vi,en}
const hooks = [];
export const onLang = f => hooks.push(f);
export function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = tr(e.dataset.i); });
  document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = tr(e.dataset.ph); });
  const b = document.getElementById('lang'); if (b) b.textContent = LANG === 'vi' ? '🌐 VI | en' : '🌐 vi | EN';
  hooks.forEach(f => f());
}
export function toggleLang() { LANG = LANG === 'vi' ? 'en' : 'vi'; try { localStorage.setItem('m67lang', LANG); } catch (e) { /* bỏ qua */ } applyLang(); }
