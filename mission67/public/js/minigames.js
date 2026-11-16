// Mini-game giải đố (mỗi bình gas một mini-game). Thêm mini-game mới: gán MG.ten = (root, win) => {...}
// rồi thêm chuỗi 'mg_ten' và 'mgh_ten' vào i18n.js. Màn chơi chỉ cần ghi type:'ten' cho nhà.
import { tr } from './i18n.js';
import { SFX } from './audio.js';
import { rnd, shuffle } from './gfx.js';
const $ = id => document.getElementById(id);
export const MG = {};
let open = false, mgKey = null, mgT = [], onDone = null;
const mgSet = (f, ms) => { const id = setTimeout(f, ms); mgT.push(id); return id; };
export const isOpen = () => open;
export const keyHandler = e => { if (e.code === 'Escape') { close(false); return true; } if (mgKey) mgKey(e); return true; };
export function openMinigame(type, cb) {
  if (open || !MG[type]) return false;
  open = true; onDone = cb; $('mg').classList.remove('hide'); $('mgt').textContent = tr('mg_' + type); $('mgh').textContent = tr('mgh_' + type);
  const b = $('mgb'); b.innerHTML = ''; mgKey = null; MG[type](b, win); return true;
}
export function close(ok) {
  if (!open) return; mgT.forEach(clearTimeout); mgT = []; mgKey = null; open = false; $('mg').classList.add('hide');
  const f = onDone; onDone = null; f && f(!!ok);
}
function win() { if (!open) return; SFX.good(); const d = document.createElement('div'); d.id = 'mgd'; d.textContent = tr('done'); $('mgb').appendChild(d); mgSet(() => close(true), 800); }
{ const x = $('mgx'); if (x) x.onclick = () => close(false); }
MG.wires=(root,win)=>{const cols=['#ff3b3b','#3b8bff','#ffd23b','#3bff6b'],rr=shuffle([0,1,2,3]),NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 440 300');svg.setAttribute('width','440');svg.style.maxWidth='100%';svg.style.touchAction='none';root.appendChild(svg);
 const mk=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e};
 mk('rect',{x:0,y:0,width:440,height:300,fill:'#141016',stroke:'#3a2a2c'});
 const L=[],Rn=[];for(let i=0;i<4;i++){const y=45+i*70;mk('rect',{x:8,y:y-14,width:30,height:28,fill:'#2a2a30'});L.push(mk('circle',{cx:44,cy:y,r:13,fill:cols[i],stroke:'#fff','stroke-width':2,'data-l':i}));
  mk('rect',{x:402,y:y-14,width:30,height:28,fill:'#2a2a30'});Rn.push(mk('circle',{cx:396,cy:y,r:13,fill:cols[rr[i]],stroke:'#fff','stroke-width':2,'data-r':rr[i]}))}
 let drag=null,done=0;const pos=e=>{const r=svg.getBoundingClientRect();return[(e.clientX-r.left)*440/r.width,(e.clientY-r.top)*300/r.height]};
 svg.onmousedown=e=>{const i=e.target.getAttribute&&e.target.getAttribute('data-l');if(i===null||i===undefined||L[i].dataset.ok)return;const[x,y]=pos(e);drag={i:+i,ln:mk('line',{x1:44,y1:45+i*70,x2:x,y2:y,stroke:cols[i],'stroke-width':8,'stroke-linecap':'round','pointer-events':'none'})}};
 svg.onmouseleave=()=>{if(drag){svg.removeChild(drag.ln);drag=null}};
 svg.onmousemove=e=>{if(!drag)return;const[x,y]=pos(e);drag.ln.setAttribute('x2',x);drag.ln.setAttribute('y2',y)};
 svg.onmouseup=e=>{if(!drag)return;const el=document.elementFromPoint(e.clientX,e.clientY),r=el&&el.getAttribute&&el.getAttribute('data-r');
  if(r!==null&&r!==undefined&&+r==drag.i&&!el.dataset.ok){const j=rr.indexOf(+r);drag.ln.setAttribute('x2',396);drag.ln.setAttribute('y2',45+j*70);L[drag.i].dataset.ok=1;el.dataset.ok=1;done++;SFX.beep();if(done==4)win()}else{svg.removeChild(drag.ln);SFX.bad()}drag=null}}
MG.pipes=(root,win)=>{const N=4,gridEl=document.createElement('div');gridEl.style.cssText='display:grid;grid-template-columns:repeat(4,72px);gap:3px;background:#2a2024;padding:3px';root.appendChild(gridEl);
 const sr=Math.random()*N|0,er=Math.random()*N|0,vis=new Set(),path=[];
 const dfs=(x,z)=>{path.push([x,z]);vis.add(z*N+x);if(x==N-1&&z==er)return true;for(const[dx,dz]of shuffle([[1,0],[0,1],[0,-1],[-1,0]])){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N||vis.has(nz*N+nx))continue;if(dfs(nx,nz))return true}path.pop();return false};dfs(0,sr);
 const DIR=[[0,-1],[1,0],[0,1],[-1,0]],cell=Array.from({length:N*N},()=>({m:0,r:0}));
 const dirIdx=(dx,dz)=>DIR.findIndex(d=>d[0]==dx&&d[1]==dz);
 path.forEach(([x,z],i)=>{const a=i==0?3:dirIdx(path[i-1][0]-x,path[i-1][1]-z),b=i==path.length-1?1:dirIdx(path[i+1][0]-x,path[i+1][1]-z);cell[z*N+x].m=(1<<a)|(1<<b)});
 for(let i=0;i<N*N;i++)if(!cell[i].m){cell[i].m=Math.random()<.5?5:3;if(Math.random()<.2)cell[i].m=7}
 const rot=(m,r)=>{let o=0;for(let i=0;i<4;i++)if(m&(1<<i))o|=1<<((i+r)%4);return o};
 for(const c of cell)c.r=Math.random()*4|0;
 const els=[],drawCell=(i,wet)=>{const m=rot(cell[i].m,cell[i].r),el=els[i],col=wet?'#4ad':'#6a6a74';let s=`<svg width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#141016"/>`;
  const seg=[[36,0,36,36],[72,36,36,36],[36,72,36,36],[0,36,36,36]];for(let k=0;k<4;k++)if(m&(1<<k))s+=`<line x1="${seg[k][0]}" y1="${seg[k][1]}" x2="${seg[k][2]}" y2="${seg[k][3]}" stroke="${col}" stroke-width="14" stroke-linecap="butt"/>`;
  s+=`<circle cx="36" cy="36" r="9" fill="${col}"/></svg>`;el.innerHTML=s};
 const check=()=>{const wet=new Set(),q=[];const m0=rot(cell[sr*N].m,cell[sr*N].r);if(m0&8){wet.add(sr*N);q.push([0,sr])}
  while(q.length){const[x,z]=q.pop(),m=rot(cell[z*N+x].m,cell[z*N+x].r);for(let k=0;k<4;k++)if(m&(1<<k)){const nx=x+DIR[k][0],nz=z+DIR[k][1];if(nx<0||nz<0||nx>=N||nz>=N||wet.has(nz*N+nx))continue;if(rot(cell[nz*N+nx].m,cell[nz*N+nx].r)&(1<<((k+2)%4))){wet.add(nz*N+nx);q.push([nx,nz])}}}
  for(let i=0;i<N*N;i++)drawCell(i,wet.has(i));return wet.has(er*N+N-1)&&(rot(cell[er*N+N-1].m,cell[er*N+N-1].r)&2)};
 for(let i=0;i<N*N;i++){const el=document.createElement('div');el.style.cursor='pointer';els.push(el);gridEl.appendChild(el);el.onclick=()=>{cell[i].r=(cell[i].r+1)%4;SFX.beep();if(check())win()}}
 const note=document.createElement('div');note.style.cssText='margin-top:8px;font-size:12px;color:#8a8478';note.textContent=`▶ ${sr+1}   ·   ${er+1} ◀`;root.appendChild(note);if(check())cell[0].r=(cell[0].r+1)%4;check()}
MG.simon=(root,win)=>{const cols=['#e03030','#3060e0','#e0c030','#30c050'],btns=[],len=5;let seq=[],ix=0,playing=true;const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:repeat(2,130px);margin:auto';root.appendChild(wrap);
 const info=document.createElement('div');info.style.cssText='margin-top:10px;font-size:13px;color:#8a8478;letter-spacing:.2em';root.appendChild(info);
 const lite=(i,ms=300)=>{btns[i].classList.add('f');SFX.beep();setTimeout(()=>btns[i].classList.remove('f'),ms)};
 const play=()=>{playing=true;ix=0;seq=Array.from({length:len},()=>Math.random()*4|0);info.textContent='● ● ●';seq.forEach((s,k)=>mgSet(()=>lite(s,380),700+k*620));mgSet(()=>{playing=false;info.textContent=`0 / ${len}`},700+len*620)};
 cols.forEach((c,i)=>{const b=document.createElement('button');b.className='sm';b.style.background=c;btns.push(b);wrap.appendChild(b);b.onclick=()=>{if(playing)return;lite(i,160);if(seq[ix]==i){ix++;info.textContent=`${ix} / ${len}`;if(ix==len){playing=true;win()}}else{SFX.bad();playing=true;info.textContent='✖';mgSet(play,700)}}});play()}
MG.timing=(root,win)=>{const bar=document.createElement('div');bar.className='tb';const zone=document.createElement('div');zone.className='tz';const mk=document.createElement('div');mk.className='tm';bar.appendChild(zone);bar.appendChild(mk);root.appendChild(bar);
 const info=document.createElement('div');info.style.cssText='font-size:15px;letter-spacing:.3em;margin-bottom:12px';root.appendChild(info);const btn=document.createElement('button');btn.textContent=tr('stop');root.appendChild(btn);
 let pos=0,dir=1,hits=0,zl=.3,zw=.2,alive=true,spd=.9;const setZone=()=>{zl=rnd(.1,.9-zw);zone.style.left=zl*100+'%';zone.style.width=zw*100+'%'};setZone();info.textContent='○ ○ ○';
 const loop=()=>{if(!alive||!open)return;pos+=dir*spd*(1/60);if(pos>=1){pos=1;dir=-1}if(pos<=0){pos=0;dir=1}mk.style.left=`calc(${pos*100}% - 2px)`;requestAnimationFrame(loop)};requestAnimationFrame(loop);
 const press=()=>{if(!alive)return;if(pos>=zl&&pos<=zl+zw){hits++;SFX.beep();info.textContent='● '.repeat(hits)+'○ '.repeat(3-hits);zw=Math.max(.1,zw-.04);spd+=.25;setZone();if(hits==3){alive=false;win()}}else{hits=0;SFX.bad();info.textContent='○ ○ ○';zw=.2;spd=.9;setZone()}};
 btn.onclick=press;mgKey=e=>{if(e.code=='Space'){e.preventDefault();press()}};mgSet(()=>{alive=false},600000)}
MG.lights=(root,win)=>{const g=[1,1,1,1,1,1,1,1,1],tog=i=>{const x=i%3,z=(i/3)|0;for(const[dx,dz]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx>=0&&nx<3&&nz>=0&&nz<3)g[nz*3+nx]^=1}};
 for(let k=0;k<7;k++)tog(Math.random()*9|0);if(g.every(v=>v))tog(4);
 const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:repeat(3,84px);gap:6px';root.appendChild(wrap);const els=[];
 const draw=()=>els.forEach((e,i)=>{e.style.background=g[i]?'#ffd24a':'#1a1416';e.style.boxShadow=g[i]?'0 0 16px #ffb020':'none'});
 for(let i=0;i<9;i++){const e=document.createElement('div');e.className='gc';e.style.cssText+='width:84px;height:84px';els.push(e);wrap.appendChild(e);e.onclick=()=>{tog(i);SFX.beep();draw();if(g.every(v=>v))win()}}draw()}
