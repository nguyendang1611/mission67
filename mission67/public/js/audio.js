// Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh)
let AC = null, NB = null;
export function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } }
export function tone(f0, f1, dur, vol = .12, type = 'square') {
  if (!AC) return; try { const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur); } catch (e) { /* bỏ qua */ }
}
export function noise(dur, vol = .2, f0 = 2000, f1) {
  if (!AC) return; try {
    if (!NB) { NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime; s.buffer = NB; f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t, 0, Math.min(dur, .9));
  } catch (e) { /* bỏ qua */ }
}
export const SFX = {
  shot: () => { noise(.07, .2, 3500, 800); tone(220, 70, .07, .1); }, shotgun: () => { noise(.22, .45, 3000, 250); tone(140, 40, .18, .22, 'sawtooth'); setTimeout(() => noise(.08, .15, 1500, 300), 330); },
  hit: () => tone(900, 500, .04, .06, 'triangle'), kill: () => { tone(300, 70, .22, .12, 'sawtooth'); noise(.15, .12, 900, 200); },
  reload: () => { tone(500, 300, .05, .08); setTimeout(() => tone(300, 500, .06, .08), 900); }, empty: () => tone(160, 120, .05, .06), hurt: () => { tone(140, 50, .22, .18, 'sawtooth'); noise(.12, .15, 600, 200); },
  shield: () => { tone(300, 900, .35, .12, 'sine'); tone(600, 1200, .4, .06, 'triangle'); }, dash: () => noise(.3, .25, 5000, 300), missile: () => { noise(.25, .14, 3000, 600); tone(200, 500, .2, .05, 'sawtooth'); },
  boom: () => { noise(.6, .4, 900, 80); tone(110, 30, .5, .25, 'sawtooth'); }, charge: () => tone(80, 900, .75, .12, 'sawtooth'), nova: () => { noise(1, .5, 1500, 60); tone(200, 25, .9, .3, 'sawtooth'); },
  claw: () => { noise(.18, .25, 6000, 1000); tone(700, 200, .12, .08, 'sawtooth'); }, pounce: () => { noise(.35, .35, 600, 60); tone(90, 30, .3, .25, 'sine'); },
  roar: () => { noise(.9, .35, 1400, 200); tone(110, 60, .9, .22, 'sawtooth'); tone(130, 70, .9, .15, 'square'); },
  rage: () => { tone(70, 200, .5, .2, 'sawtooth'); noise(.5, .2, 900, 300); }, lance: () => { tone(1200, 300, .25, .1, 'sawtooth'); noise(.15, .2, 5000, 1500); },
  blink: () => { tone(1400, 200, .25, .1, 'sine'); noise(.2, .12, 4000, 400); }, acid: () => { noise(.4, .2, 2500, 400); tone(300, 100, .3, .06, 'triangle'); },
  devour: () => { tone(90, 40, .7, .25, 'sawtooth'); noise(.3, .3, 1200, 150); setTimeout(() => { noise(.2, .4, 700, 100); tone(60, 30, .3, .3, 'square'); }, 200); },
  pickup: () => { tone(500, 900, .1, .1, 'sine'); setTimeout(() => tone(900, 1300, .12, .1, 'sine'), 90); }, unlock: () => { tone(200, 400, .12, .1, 'square'); setTimeout(() => tone(400, 800, .2, .1, 'square'), 120); },
  growl: t => { if (t === 'd') { tone(260, 90, .4, .14, 'sawtooth'); noise(.3, .12, 1500, 300); } else if (t === 'w') { tone(70, 40, .9, .25, 'sawtooth'); noise(.8, .2, 500, 100); } else { tone(900, 300, .3, .1, 'square'); noise(.25, .14, 4000, 800); } },
  beep: () => tone(700, 700, .08, .08, 'sine'), bad: () => tone(200, 120, .25, .12, 'sawtooth'), good: () => tone(600, 1000, .15, .1, 'sine')
};
