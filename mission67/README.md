# MISSION 67 — FPS co-op (1–3 người) chạy trên trình duyệt

## 1. Chạy game
Cần cài **Node.js 16+** (https://nodejs.org). Mở terminal trong thư mục này:

```
node server.js
```
Terminal sẽ in ra địa chỉ, ví dụ `http://localhost:3000` và `http://192.168.1.23:3000`.
Không cần `npm install` (server không dùng thư viện ngoài).

### Chơi nhiều người cùng mạng (Wi-Fi / LAN)
1. Một người chạy `node server.js`.
2. Mọi người (kể cả người chạy) mở link `http://<IP-LAN>:3000` trong trình duyệt.
3. Chọn tab **ĐA NGƯỜI**, nhập tên + **mã phòng giống nhau** → TẠO / VÀO PHÒNG.
4. Mỗi người chọn **một class khác nhau** (class đã có người chọn sẽ bị mờ). Chủ phòng (★) chọn màn rồi bấm **BẮT ĐẦU**.
- Nếu bạn bè không vào được: tắt tường lửa cho cổng 3000 (Windows hỏi quyền → chọn "Allow").
- Máy tính để chạy server làm "chủ phòng": quái được tính ở máy chủ phòng.

### Đưa lên web để chơi qua Internet
Game cần **server Node** (vì có WebSocket). Cách dễ nhất (có gói miễn phí):
- **Render.com / Railway.app / Fly.io**: đưa thư mục này lên GitHub → tạo "Web Service" → Build command: để trống, Start command: `node server.js`. Server tự đọc biến `PORT`. Xong bạn có link `https://ten-game.onrender.com` gửi cho bạn bè (trình duyệt tự dùng `wss://`).
- **VPS** (DigitalOcean, v.v.): cài Node, `node server.js`, (tuỳ chọn) dùng nginx/Caddy để có HTTPS.
- **Hosting tĩnh** (GitHub Pages, Netlify, Vercel tĩnh): chỉ **chơi đơn** được (không có WebSocket). Chạy `node tools/make-manifest.js` trước khi tải lên để tạo `public/manifest.json`, rồi đưa thư mục `public/` lên.
- Muốn chạy không cần Internet: tải `three.min.js` bản **r128** về đặt vào `public/lib/three.min.js` (mặc định game lấy từ cdnjs).

## 2. Thêm class nhân vật / màn chơi bằng cách KÉO THẢ FILE
- **Class**: thả file `.js` vào `public/classes/` (xem mẫu `public/classes/_template.js`).
- **Màn chơi**: thả file `.js` vào `public/levels/` (xem mẫu `public/levels/_template.js`).
- Khởi động lại trang (server tự quét thư mục, không cần sửa code). Với hosting tĩnh: chạy lại `node tools/make-manifest.js`.
- File bắt đầu bằng `_` bị bỏ qua. Nếu một file bị lỗi, game vẫn chạy và báo tên file lỗi.
- Trong phòng nhiều người, **mọi máy phải có cùng bộ file** (cùng server thì tự đúng).

## 3. Cấu trúc
```
server.js            server HTTP + WebSocket (phòng tối đa 3 người)
tools/make-manifest.js
public/
  index.html  css/style.css  img/logo.jpg
  classes/   iron.js chimera.js aberrant.js _template.js     <- kéo thả class
  levels/    city.js suburb.js _template.js                   <- kéo thả màn
  js/        main.js (menu, sảnh)  game.js (lõi)  levelkit.js (dựng thành phố, thuyền)
             enemies.js  minigames.js  audio.js  i18n.js  net.js  gfx.js
```

## 4. Luật chơi mới
- Mỗi lượt chỉ **một nhà được mở khóa** (dấu `!` trên la bàn). Giải mini-game trong hộp để lấy bình gas.
- **Mang bình gas ra thuyền ⚓** và nhấn E để cất. Cất xong mới được chỉ dẫn bình kế tiếp và mở nhà tiếp theo.
- Người mang bình bị hạ → bình rơi xuống đất, đồng đội nhặt (E) rồi mang tiếp.
- Nhiều người: bị hạ sẽ hồi sinh ở thuyền sau 8 giây; tất cả cùng bị hạ = thua.
- Chimera dùng **shotgun 4 viên/lần nạp**: 9 hạt đạn × 14 sát thương, giảm mạnh từ 5m, gần như vô dụng sau ~22m.
