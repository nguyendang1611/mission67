// Client mạng: nói chuyện với server.js qua WebSocket (phòng tối đa 3 người)
const handlers = {};
let ws = null, me = null, connected = false;
export const net = {
  get id() { return me; }, get connected() { return connected; },
  on(type, f) { handlers[type] = f; },
  connect() {
    return new Promise((res, rej) => {
      if (ws && connected) return res();
      const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
      try { ws = new WebSocket(proto + location.host + '/ws'); } catch (e) { return rej(e); }
      ws.onopen = () => { connected = true; res(); };
      ws.onerror = () => { if (!connected) rej(new Error('ws')); };
      ws.onclose = () => { const was = connected; connected = false; ws = null; handlers.close && handlers.close(was); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.you != null) me = m.you; const h = handlers[m.t]; h && h(m); };
    });
  },
  send(o) { if (ws && connected) ws.send(JSON.stringify(o)); },
  join(room, name) { this.send({ t: 'join', room, name }); },
  pick(cls) { this.send({ t: 'pick', cls }); },
  level(id) { this.send({ t: 'level', id }); },
  start() { this.send({ t: 'start' }); },
  back() { this.send({ t: 'back' }); },
  relay(to, d) { this.send({ t: 'relay', to, d }); },
  close() { try { ws && ws.close(); } catch (e) { /* bỏ qua */ } }
};
