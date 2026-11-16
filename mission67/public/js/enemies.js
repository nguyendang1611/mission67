// Quái vật: model (theo concept art), thông số, animation. Thêm quái mới: viết build + thêm vào CFG.
import { THREE, V, rnd, clamp, M, EM, BM, mesh, B, Cn, Cy, Ic, Oc, PI, segU, segD } from './gfx.js';
export const BULLET = 10;          // sát thương 1 viên đạn tiêu chuẩn
export const HP_SCALE = 1.8;       // quái "trâu" hơn bản trước 1.8 lần
function buildCrawler(){ // M67-INSECTOID-CRAWLER: kiến khổng lồ, mắt kép xanh lục, 6 chân gập
 const root=new THREE.Group(),mdl=new THREE.Group(),body=new THREE.Group();mdl.scale.setScalar(.8);root.add(mdl);mdl.add(body);body.position.y=1.45;
 const dk=M(0x2a1618),fl=M(0x6a1a22,0x240606),pl=M(0x4a2428),eye=EM(0xd8ff30,0xb8ff20,1.3),bn=M(0xd8d0bc),glow=EM(0x8a30c0,0x7a20b0,1.2);
 mesh(new Ic(.8,0),pl,0,0,.1,body).scale.set(.9,.8,1.25);
 for(let i=0;i<4;i++)mesh(new Cn(.12,.5,4),fl,0,.7,-.4+i*.4,body);
 const head=new THREE.Group();head.position.set(0,.05,1.25);body.add(head);
 mesh(new Oc(.65,0),fl,0,0,0,head).scale.set(1,.85,1.1);
 for(const s of[-1,1])mesh(new Oc(.3,0),eye,s*.38,.18,.3,head).scale.set(1,1.1,.8);
 mesh(new Oc(.1,0),eye,0,.32,.45,head);for(const s of[-1,1])mesh(new Cn(.025,.9,3),dk,s*.2,.5,.3,head).rotation.set(-.6,0,-s*.5);
 const mand=[];for(const s of[-1,1]){const m=new THREE.Group();m.position.set(s*.2,-.28,.5);head.add(m);mesh(new Cn(.09,.8,4).rotateX(PI/2),bn,0,0,.3,m);mand.push(m)}
 const abd=new THREE.Group();abd.position.set(0,-.1,-.95);body.add(abd);
 mesh(new Ic(1.0,0),dk,0,0,-.7,abd).scale.set(.9,.85,1.35);mesh(new Oc(.35,0),glow,0,-.2,-1.9,abd);
 for(let i=0;i<5;i++)mesh(new Cn(.1,.45,4),fl,0,.8,-.2-i*.4,abd);
 const legs=[],hz=[.6,.05,-.55];
 for(const s of[-1,1])for(let k=0;k<3;k++){const hip=new THREE.Group();hip.position.set(s*.55,-.1,hz[k]);const base=-s*(1-k)*.55;hip.rotation.y=base;body.add(hip);
  const up=new THREE.Group();up.rotation.z=-s*1.15;hip.add(up);up.add(segU(1.0,.12,dk));
  const lp=new THREE.Group();lp.position.y=1.0;lp.rotation.z=-s*1.7;up.add(lp);lp.add(segU(1.9,.09,fl));mesh(new Cn(.07,.4,3),bn,0,1.95,0,lp);
  legs.push({hip,up,lp,s,k,base})}
 return{root,P:{body,head,mand,abd,legs},hs:[[0,1.45,.1,.95],[0,1.5,1.35,.7],[0,1.35,-1.5,1.1]].map(h=>h.map(v=>v*.8))}}
function buildCanid(){ // LP-073: chó lai low-poly, mảng phát sáng xanh, mắt đỏ, gai lưng
 const root=new THREE.Group(),body=new THREE.Group();body.position.y=1.2;root.add(body);
 const dk=M(0x3a1214),fl=M(0x7a1a1a,0x300606),gl=EM(0xa8ff30,0x90e020,.9),bn=M(0xe6dfcf),eye=EM(0xff3010,0xff2000,1.6);
 mesh(new Ic(.8,0),fl,0,0,0,body).scale.set(.75,.7,1.35);mesh(new Ic(.65,0),dk,0,.1,.75,body).scale.set(.9,1,.9);
 for(const s of[-1,1]){mesh(new Oc(.35,0),gl,s*.55,.15,.1,body).scale.set(.3,.9,1.2);mesh(new Oc(.25,0),gl,s*.4,.35,-.5,body).scale.set(.4,.6,1)}
 for(let i=0;i<7;i++)mesh(new Cn(.1,.5+(i%2)*.2,4),dk,0,.62,.95-i*.32,body).rotation.x=-.35;
 const head=new THREE.Group();head.position.set(0,.4,1.35);body.add(head);
 mesh(new Oc(.5,0),fl,0,0,0,head).scale.set(1,.9,1.2);mesh(new Cn(.3,.9,4).rotateX(PI/2),dk,0,-.05,.75,head);
 for(const s of[-1,1]){mesh(new Oc(.09,0),eye,s*.25,.18,.42,head);mesh(new Cn(.12,.5,4),dk,s*.25,.55,-.05,head).rotation.z=-s*.2;mesh(new Cn(.035,.22,3),bn,s*.12,-.14,1.0,head).rotation.x=PI}
 const jaw=new THREE.Group();jaw.position.set(0,-.2,.35);head.add(jaw);mesh(new Cn(.22,.8,4).rotateX(PI/2),fl,0,-.05,.35,jaw);for(const s of[-1,1])mesh(new Cn(.03,.2,3),bn,s*.1,.07,.8,jaw);
 const tail=new THREE.Group();tail.position.set(0,.15,-1.1);body.add(tail);mesh(new Cn(.18,1.6,4).rotateX(-PI/2),dk,0,0,-.8,tail);mesh(new Cn(.1,.6,3).rotateX(-PI/2),gl,0,0,-1.5,tail);
 const legs=[];for(const[x,z,front]of[[-.38,.7,1],[.38,.7,1],[-.38,-.8,0],[.38,-.8,0]]){const hip=new THREE.Group();hip.position.set(x,-.25,z);body.add(hip);hip.add(segD(.55,.14,dk));
  const kn=new THREE.Group();kn.position.y=-.55;hip.add(kn);kn.add(segD(.6,.1,fl));mesh(new Cn(.12,.3,4),bn,0,-.62,.12,kn).rotation.x=PI/2;legs.push({hip,kn,front})}
 return{root,P:{body,head,jaw,tail,legs},hs:[[0,1.2,0,.85],[0,1.6,1.35,.6],[0,1.2,-.9,.6]]}}
function buildWalker(){ // RW-067 Rift Walker: cao 4.2m, tay dài, xoáy năng lượng ở ngực
 const root=new THREE.Group(),fl=M(0x7a2a3a,0x200808),dk=M(0x3a1620),bn=M(0xd8d0bc),pu=EM(0xc0b060,0x4a4010,.6),eye=EM(0xff3030,0xff1010,1.5);
 const pelvis=new THREE.Group();pelvis.position.y=2.1;root.add(pelvis);
 mesh(new Oc(.55,0),fl,0,0,0,pelvis).scale.set(1,.6,.7);
 const legs=[];for(const s of[-1,1]){const hip=new THREE.Group();hip.position.set(s*.3,-.05,0);pelvis.add(hip);hip.add(segD(1.05,.17,fl));
  const kn=new THREE.Group();kn.position.y=-1.05;hip.add(kn);kn.add(segD(1.05,.12,dk));for(const x of[-.08,0,.08])mesh(new Cn(.035,.4,3),bn,x,-1.1,.12,kn).rotation.x=PI/2+.3;legs.push({hip,kn})}
 const torso=new THREE.Group();torso.position.y=.1;pelvis.add(torso);
 mesh(new Cy(.45,.3,1.4,6),fl,0,.8,0,torso);for(let i=0;i<6;i++){const s=i%2?1:-1;mesh(new Cn(.05,.7,3),bn,s*.42,.4+(i>>1)*.3,.1,torso).rotation.z=-s*1.2}
 const glow=new THREE.Group();glow.position.set(0,1.0,.4);torso.add(glow);mesh(new Ic(.26,1),EM(0x8a40ff,0x6a20e0,1.8),0,0,0,glow);
 const ring=mesh(new THREE.TorusGeometry(.36,.04,6,20),EM(0x40ffe0,0x20ffd0,1.6),0,0,0,glow);
 for(const s of[-1,1]){mesh(new Oc(.5,0),fl,s*.62,1.45,0,torso);mesh(new Ic(.14,0),pu,s*.7,1.65,.2,torso)}
 mesh(new Ic(.16,0),pu,-.2,1.0,-.4,torso);
 const arms=[];for(const s of[-1,1]){const sh=new THREE.Group();sh.position.set(s*.75,1.4,0);torso.add(sh);sh.add(segD(1.5,.14,fl));
  const el=new THREE.Group();el.position.y=-1.5;sh.add(el);el.add(segD(1.7,.1,dk));
  for(const x of[-.1,0,.1])mesh(new Cn(.04,.85,3),bn,x,-1.95,.05,el).rotation.x=PI;arms.push({sh,el,s})}
 const head=new THREE.Group();head.position.set(0,1.85,.15);torso.add(head);
 mesh(new Cy(.28,.34,.75,6),fl,0,0,0,head);mesh(new B(.32,.45,.1),BM(0x050202),0,-.05,.28,head);mesh(new B(.2,.3,.05),eye,0,-.05,.31,head);
 return{root,P:{pelvis,torso,legs,arms,head,glow,ring},hs:[[0,1.1,0,.8],[0,2.5,.1,.9],[0,3.3,.3,.9],[0,4.0,.45,.65]]}}

export const CFG = {
  c: { hp: BULLET * 8 * HP_SCALE, spd: 4.8, dmg: 10, col: 1.0, rr: 1.6, big: false, sense: 14, atkR: 2.6, wind: .26, strikeT: .2, rec: .45, atkCd: .95, h: 3.0, build: buildCrawler, gait: 2.0 },
  d: { hp: BULLET * 8 * HP_SCALE, spd: 7.0, dmg: 15, col: .9, rr: 1.4, big: false, sense: 19, atkR: 7.5, wind: .38, strikeT: .35, rec: .65, atkCd: 1.1, h: 2.6, build: buildCanid, gait: 1.7 },
  w: { hp: BULLET * 12 * HP_SCALE, spd: 3.2, dmg: 30, col: 1.3, rr: 2.2, big: true, sense: 17, atkR: 4.0, wind: .65, strikeT: .3, rec: .9, atkCd: 1.3, h: 5.2, build: buildWalker, gait: 1.2 }
};
let EID = 1;
export function createEnemy(type, hpMul = 1, id) {
  const c = CFG[type], b = c.build(), hp = Math.round(c.hp * hpMul);
  const e = { id: id || EID++, m: b.root, P: b.P, type, hs: b.hs, hp, max: hp, spd: c.spd, dmg: c.dmg, col: c.col, rr: c.rr, big: c.big, sense: c.sense, atkR: c.atkR, wind: c.wind, strikeT: c.strikeT, rec: c.rec, atkCd: c.atkCd, h: c.h, gaitK: c.gait, nest: null,
    state: 'idle', st: 0, wt: rnd(0, 3), wp: null, home: V(), kx: 0, kz: 0, cd: 0, lcd: 0, stun: 0, slow: 0, pop: 0, flash: 0, t: rnd(0, 6), gait: 0, mv: 0, rear: 0, bite: 0, lunge: 0, arm: 0, armT: 0, orbit: Math.random() < .5 ? -1 : 1, losT: 0, los: false, lost: 0, faceY: 0, hit: 0, lockDir: V(0, 0, 1), dying: 0, target: null };
  const seen = new Set(); e.mats = [];
  e.m.traverse(o => { if (o.material && !seen.has(o.material) && o.material.emissive) { seen.add(o.material); e.mats.push([o.material, o.material.emissive.getHex()]); } });
  const bar = new THREE.Group(); mesh(new THREE.PlaneGeometry(1.4, .14), BM(0x300808), 0, 0, 0, bar);
  const f = mesh(new THREE.PlaneGeometry(1, .1).translate(.5, 0, 0), BM(0xff3030), -.7, 0, .01, bar); f.scale.x = 1.4; bar.visible = false; e.bar = bar; e.fill = f; return e;
}
// Chuyển trạng thái AI -> tham số tư thế [rear, bite, lunge, armTarget] (dùng chung cho quái thật và "bóng" ở máy khách)
export function poseOf(e) {
  switch (e.state) {
    case 'alert': return [1, 1, 0, 0];
    case 'windup': return [.8, e.type === 'c' ? .5 : 0, 0, e.type === 'w' ? -2.6 : 0];
    case 'strike': return [0, 1, 1, e.type === 'w' ? .5 : 0];
    default: return [0, 0, 0, 0];
  }
}
export const STATES = ['idle', 'alert', 'chase', 'windup', 'strike', 'recover', 'return'];

export function animEnemy(e,dt){const P=e.P,mv=e.mv,g=e.gait,T0=e.t,rear=e.rear,dk=e.dead?clamp(e.dying/1,0,1):1,cur=1-dk;
 if(e.type=='c'){
  P.body.position.y=e.dead?1.45*dk+.5*cur:1.45+Math.sin(g*2)*.04*mv+Math.sin(T0*2)*.015;P.body.rotation.x=-rear*.5+e.lunge*.22;P.body.rotation.z=cur*PI;
  P.mand.forEach((m,i)=>m.rotation.y=(i?-1:1)*(.1+e.bite*.6+Math.sin(T0*7)*.05*(1-e.bite)));P.abd.rotation.y=Math.sin(g)*.12*mv;P.abd.rotation.x=rear*.3;P.head.rotation.y=Math.sin(T0*.9)*.25*(1-mv);
  for(const l of P.legs){const ph=g+(((l.k+(l.s>0?0:1))%2)*PI),lift=Math.max(0,Math.cos(ph))*mv,sw=Math.sin(ph)*.5*mv,fu=l.k==0?rear*.7:0,cu=cur*.9;
   l.hip.rotation.y=l.base+(-l.s)*sw;l.up.rotation.z=-l.s*(1.15+lift*.4+fu+cu);l.lp.rotation.z=-l.s*(1.7-lift*.5+cu*.6)}}
 else if(e.type=='d'){
  P.body.position.y=e.dead?1.2*dk+.45*cur:1.2+Math.abs(Math.sin(g*2))*.1*mv+Math.sin(T0*2.4)*.015;P.body.rotation.x=(rear>0?rear*.3:0)-e.lunge*.25;P.body.rotation.z=cur*1.5;
  P.head.rotation.x=-rear*.5+(e.state=='alert'?-.4:0);P.jaw.rotation.x=e.bite*.75+Math.sin(T0*9)*.03*mv;P.tail.rotation.y=Math.sin(T0*4)*.4+Math.sin(g)*.2*mv;
  for(const l of P.legs){const ph=g+(l.front?0:PI*.7);l.hip.rotation.x=-Math.sin(ph)*.9*mv+(e.lunge*(l.front?-.8:.8));l.kn.rotation.x=Math.max(0,Math.sin(ph+1.5))*.9*mv}}
 else{
  P.pelvis.position.y=e.dead?2.1*dk+.5*cur:2.1-Math.abs(Math.sin(g))*.07*mv+Math.sin(T0*1.5)*.01;
  P.legs.forEach((l,i)=>{const ph=g+(i?PI:0);l.hip.rotation.x=-Math.sin(ph)*.55*mv-cur*1.2;l.kn.rotation.x=Math.max(0,Math.sin(ph+.9))*.7*mv+cur*1.4});
  P.torso.rotation.x=.28+mv*.1-rear*.3+cur*1.4;P.torso.rotation.z=Math.sin(g)*.05*mv;
  e.arm+=(e.armT-e.arm)*Math.min(1,dt*(e.state=='strike'?18:6));const act=Math.abs(e.armT)>.1;
  P.arms.forEach((a,i)=>{const ph=g+(i?0:PI);a.sh.rotation.x=e.arm+(act?0:Math.sin(ph)*.45*mv+Math.sin(T0*1.3+i)*.05);a.sh.rotation.z=a.s*(.06+Math.abs(e.arm)*.05);a.el.rotation.x=-.25-Math.abs(e.arm)*.3});
  P.glow.scale.setScalar(1+Math.sin(T0*3)*.12+rear*.5);P.ring.rotation.z+=dt*2.4;P.head.rotation.y=Math.sin(T0*.7)*.4*(1-mv);P.head.rotation.x=-rear*.45}}

