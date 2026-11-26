/* ============================================================================
 * particles.js — 파티클 시스템 (유니티의 Particle System 을 2D 게임에 맞게 줄인 것)
 *   window.PSYS : 값 정의 · 프리셋 · 시뮬레이션 · 그리기 · 인스펙터 HTML · 번역
 *   엔진(edit.html)은 o.props.ps 에 값을 두고, 플레이 중 play.ps(Map) 에 실행 상태를 둡니다.
 *   단위: 위치·크기·속도는 칸(타일) · 각도는 도(0° = 오른쪽, 90° = 아래쪽 — 엔진의 빛 방향과 같음)
 * ========================================================================== */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* 값 정의: k 키 · t 종류 · min/max/step · def 기본값 · g 묶음 */
const FIELDS=[
  {g:'main',k:'loop',t:'bool',def:true,label:'반복 (Looping)',tip:'켜면 재생 시간이 끝나도 계속 뿜어낸다. 끄면 한 번만 뿜고 멈춘다 (폭발 · 타격 효과).'},
  {g:'main',k:'dur',t:'num',min:.1,max:60,step:.1,def:2,label:'재생 시간(초)',tip:'한 번 재생하는 길이(초)이다. 반복을 끄면 이 시간 동안만 뿜어낸다.'},
  {g:'main',k:'play',t:'bool',def:true,label:'시작할 때 재생 (Play On Awake)',tip:'켜면 플레이를 시작하거나 오브젝트가 생길 때 바로 재생한다. 끄면 스크립트의 Play()를 불러야 시작한다.'},
  {g:'main',k:'life',t:'num',min:.05,max:20,step:.05,def:1,label:'수명(초)',tip:'파티클 하나가 살아 있는 시간(초)이다.'},
  {g:'main',k:'speed',t:'num',min:0,max:50,step:.1,def:2,label:'속도(칸/초)',tip:'파티클이 처음 날아가는 빠르기(1초에 몇 칸)이다.'},
  {g:'main',k:'rand',t:'num',min:0,max:1,step:.05,def:.3,label:'무작위 정도',tip:'수명 · 속도 · 크기를 얼마나 들쭉날쭉하게 할지 (0 = 모두 같음, 1 = 많이 다름).'},
  {g:'main',k:'size0',t:'num',min:0,max:10,step:.05,def:.3,label:'처음 크기(칸)',tip:'태어날 때의 크기(칸)이다.'},
  {g:'main',k:'size1',t:'num',min:0,max:10,step:.05,def:0,label:'끝 크기(칸)',tip:'사라질 때의 크기(칸)이다. 처음 크기에서 이 크기로 서서히 바뀐다.'},
  {g:'main',k:'col0',t:'color',def:'#ffd25e',label:'처음 색',tip:'태어날 때의 색이다.'},
  {g:'main',k:'col1',t:'color',def:'#ff5a1f',label:'끝 색',tip:'사라질 때의 색이다.'},
  {g:'main',k:'a0',t:'num',min:0,max:1,step:.05,def:1,label:'처음 투명도',tip:'0 = 투명, 1 = 불투명.'},
  {g:'main',k:'a1',t:'num',min:0,max:1,step:.05,def:0,label:'끝 투명도',tip:'사라질 때의 투명도이다. 0이면 서서히 사라진다.'},
  {g:'main',k:'grav',t:'num',min:-20,max:20,step:.1,def:0,label:'중력',tip:'양수면 아래로 떨어지고(비 · 불똥), 음수면 위로 떠오릅니다(연기 · 불꽃).'},
  {g:'main',k:'drag',t:'num',min:0,max:20,step:.1,def:0,label:'공기 저항',tip:'클수록 날아가다 빨리 느려진다.'},
  {g:'main',k:'max',t:'int',min:1,max:1000,step:1,def:200,label:'최대 개수',tip:'한 번에 화면에 있을 수 있는 파티클 수의 한도이다.'},
  {g:'emit',k:'rate',t:'num',min:0,max:500,step:1,def:20,label:'1초에 뿜는 수 (Rate)',tip:'1초에 몇 개를 뿜어낼지이다.'},
  {g:'emit',k:'burst',t:'int',min:0,max:500,step:1,def:0,label:'시작할 때 한꺼번에 (Burst)',tip:'재생을 시작하는 순간 한꺼번에 뿜는 개수이다 (폭발 · 터지는 효과).'},
  {g:'shape',k:'shape',t:'enum',opts:[['point','점'],['circle','원'],['box','상자'],['line','가로선']],def:'point',label:'모양',tip:'파티클이 태어나는 자리의 모양이다. 비 · 눈은 넓은 가로선이나 상자가 어울린다.'},
  {g:'shape',k:'radius',t:'num',min:0,max:50,step:.05,def:.2,label:'크기(칸)',tip:'원의 반지름 · 상자와 가로선의 반 너비(칸)이다.'},
  {g:'shape',k:'dir',t:'num',min:-360,max:360,step:1,def:-90,label:'방향(°)',tip:'뿜는 방향이다. 0° = 오른쪽, 90° = 아래, -90° = 위.'},
  {g:'shape',k:'spread',t:'num',min:0,max:360,step:1,def:25,label:'퍼짐(°)',tip:'방향을 중심으로 얼마나 넓게 퍼질지(도)이다. 360이면 사방으로 퍼진다.'},
  {g:'look',k:'look',t:'enum',opts:[['soft','부드러운 빛'],['circle','동그라미'],['square','네모 (픽셀)'],['spark','불똥 · 빗줄기'],['star','별']],def:'soft',label:'모양 (렌더러)',tip:'파티클 하나의 생김새이다.'},
  {g:'look',k:'add',t:'bool',def:true,label:'빛처럼 더하기 (Additive)',tip:'켜면 겹칠수록 밝아져서 불 · 마법 · 빛에 어울린다. 연기 · 먼지는 끈다. 어두운 씬에서도 빛나 보인다.'},
  {g:'look',k:'world',t:'bool',def:true,label:'월드에 남기기 (World Space)',tip:'켜면 오브젝트가 움직여도 이미 나온 파티클은 그 자리에 남아 꼬리가 생긴다. 끄면 오브젝트와 함께 움직인다.'},
  {g:'look',k:'front',t:'bool',def:true,label:'오브젝트 위에 그리기',tip:'켜면 게임 오브젝트들 위에 그린다. 끄면 이 오브젝트의 배치 순서대로 그린다.'},
  {g:'look',k:'kill',t:'bool',def:false,label:'끝나면 오브젝트 삭제 (Stop Action)',tip:'반복이 꺼져 있을 때 모든 파티클이 사라지면 이 게임 오브젝트를 지운다. Instantiate로 만든 폭발 효과에 쓴다.'}
];
const GROUPS=[['main','기본'],['emit','방출 (Emission)'],['shape','모양 (Shape)'],['look','보이기 (Renderer)']];
const DEF=()=>{const o={preset:'fire'};FIELDS.forEach(f=>o[f.k]=f.def);return o};
/* 프리셋: 고르면 값이 한꺼번에 바뀝니다 */
const PRESETS={
  fire:{name:'불꽃',ic:'🔥',v:{loop:true,dur:2,life:.9,speed:1.6,rand:.4,size0:.45,size1:.05,col0:'#ffd25e',col1:'#ff3d1f',a0:1,a1:0,grav:-2.2,drag:.6,rate:38,burst:0,shape:'circle',radius:.18,dir:-90,spread:22,look:'soft',add:true,max:200}},
  smoke:{name:'연기',ic:'💨',v:{loop:true,dur:3,life:2.6,speed:.7,rand:.5,size0:.35,size1:1.3,col0:'#9a9aa4',col1:'#4a4a52',a0:.55,a1:0,grav:-.5,drag:.4,rate:9,burst:0,shape:'circle',radius:.15,dir:-90,spread:28,look:'soft',add:false,max:120}},
  sparkle:{name:'반짝임',ic:'✨',v:{loop:true,dur:2,life:1.1,speed:.5,rand:.6,size0:.18,size1:0,col0:'#fff7c2',col1:'#7fd8ff',a0:1,a1:0,grav:-.2,drag:.5,rate:14,burst:0,shape:'circle',radius:.6,dir:-90,spread:360,look:'star',add:true,max:120}},
  explosion:{name:'폭발',ic:'💥',v:{loop:false,dur:.6,life:.7,speed:6,rand:.6,size0:.5,size1:.05,col0:'#fff1a8',col1:'#ff4a1c',a0:1,a1:0,grav:2,drag:3,rate:0,burst:60,shape:'point',radius:.1,dir:0,spread:360,look:'soft',add:true,max:200,play:true}},
  hit:{name:'타격 불똥',ic:'⚡',v:{loop:false,dur:.3,life:.35,speed:7,rand:.5,size0:.12,size1:0,col0:'#ffffff',col1:'#ffd25e',a0:1,a1:0,grav:4,drag:2,rate:0,burst:16,shape:'point',radius:.05,dir:0,spread:360,look:'spark',add:true,max:80,play:true}},
  rain:{name:'비',ic:'🌧️',v:{loop:true,dur:5,life:1.4,speed:11,rand:.2,size0:.32,size1:.32,col0:'#a9c8ff',col1:'#7aa6f0',a0:.7,a1:.5,grav:4,drag:0,rate:120,burst:0,shape:'line',radius:12,dir:100,spread:4,look:'spark',add:false,max:400,world:true}},
  snow:{name:'눈',ic:'❄️',v:{loop:true,dur:5,life:6,speed:.8,rand:.5,size0:.12,size1:.1,col0:'#ffffff',col1:'#dfe9ff',a0:.95,a1:.6,grav:.25,drag:.3,rate:28,burst:0,shape:'line',radius:12,dir:90,spread:40,look:'circle',add:false,max:400,world:true}},
  dust:{name:'먼지',ic:'🟤',v:{loop:true,dur:2,life:.8,speed:.9,rand:.6,size0:.2,size1:.45,col0:'#c9b48d',col1:'#8d7a5b',a0:.6,a1:0,grav:-.3,drag:2,rate:12,burst:0,shape:'line',radius:.25,dir:-90,spread:70,look:'soft',add:false,max:80}},
  magic:{name:'마법',ic:'🔮',v:{loop:true,dur:2,life:1.5,speed:1.2,rand:.5,size0:.25,size1:0,col0:'#d8a8ff',col1:'#4fb7ff',a0:1,a1:0,grav:-.8,drag:.8,rate:30,burst:0,shape:'circle',radius:.45,dir:-90,spread:360,look:'soft',add:true,max:200}},
  heal:{name:'회복',ic:'💚',v:{loop:true,dur:2,life:1.2,speed:1,rand:.4,size0:.18,size1:.05,col0:'#b6ffb0',col1:'#3fd17a',a0:1,a1:0,grav:-1.2,drag:.3,rate:16,burst:0,shape:'circle',radius:.35,dir:-90,spread:20,look:'star',add:true,max:120}},
  pixel:{name:'픽셀 조각',ic:'🟧',v:{loop:false,dur:.5,life:.9,speed:4,rand:.5,size0:.16,size1:.16,col0:'#ffb347',col1:'#c2410c',a0:1,a1:.2,grav:9,drag:.5,rate:0,burst:22,shape:'point',radius:.1,dir:-90,spread:140,look:'square',add:false,max:100,play:true}}
};
function normalize(p){
  const d=DEF();const o=Object.assign(d,p||{});
  FIELDS.forEach(f=>{
    if(f.t==='num'||f.t==='int'){let v=+o[f.k];if(!isFinite(v))v=f.def;v=clamp(v,f.min,f.max);o[f.k]=f.t==='int'?Math.round(v):v}
    else if(f.t==='bool')o[f.k]=!!o[f.k];
    else if(f.t==='enum'){if(!f.opts.some(q=>q[0]===o[f.k]))o[f.k]=f.def}
    else if(f.t==='color'){if(!/^#[0-9a-f]{6}$/i.test(String(o[f.k])))o[f.k]=f.def}
  });
  return o;
}
function applyPreset(p,k){const q=PRESETS[k];if(!q)return p;const keep={front:p.front,kill:p.kill,world:p.world};Object.assign(p,DEF(),{world:keep.world,front:keep.front,kill:keep.kill},q.v,{preset:k});return normalize(p)}

/* ---- 실행 상태 ---- */
const newState=ps=>({parts:[],acc:0,t:0,playing:!!(ps&&ps.play),bursted:false,ended:false,paused:false});
const hex=c=>{const n=parseInt(String(c).slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]};
const R=r=>1+(Math.random()*2-1)*r;
/* 파티클 하나 만들기 (wx, wy: 월드 px · TS: 칸 크기 px) */
function spawn(st,ps,wx,wy,TS,ov){
  if(st.parts.length>=ps.max)return;
  const r=ps.rand;let x=0,y=0;
  if(ps.shape==='circle'){const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*ps.radius;x=Math.cos(a)*d;y=Math.sin(a)*d}
  else if(ps.shape==='box'){x=(Math.random()*2-1)*ps.radius;y=(Math.random()*2-1)*ps.radius}
  else if(ps.shape==='line'){x=(Math.random()*2-1)*ps.radius}
  const da=(ps.dir+(Math.random()-.5)*ps.spread)*Math.PI/180,sp=ps.speed*Math.max(0,R(r))*TS;
  const life=Math.max(.02,ps.life*R(r*.6)),sz=Math.max(0,R(r*.5));
  const q={x:x*TS+(ps.world?wx:0),y:y*TS+(ps.world?wy:0),vx:Math.cos(da)*sp,vy:Math.sin(da)*sp,age:0,life,sz,rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*4};
  if(ov){if(ov.col0)q.c0=ov.col0;if(ov.size!=null)q.sz=ov.size/Math.max(.001,ps.size0||1)}
  st.parts.push(q);
}
/* 한 프레임 진행: emit = true 면 새로 뿜음 · 끝나면 st.ended = true */
function step(st,ps,dt,wx,wy,TS){
  if(st.paused)return;
  if(st.playing){
    if(!st.bursted){st.bursted=true;for(let i=0;i<ps.burst;i++)spawn(st,ps,wx,wy,TS)}
    st.t+=dt;
    if(ps.rate>0){st.acc+=ps.rate*dt;let n=Math.floor(st.acc);st.acc-=n;n=Math.min(n,200);while(n-->0)spawn(st,ps,wx,wy,TS)}
    if(st.t>=ps.dur){if(ps.loop){st.t-=ps.dur;if(ps.burst)st.bursted=false}else st.playing=false}
  }
  const g=ps.grav*9.81*TS*.25,dr=ps.drag;
  for(const q of st.parts){
    q.age+=dt;q.vy+=g*dt;if(dr){const k=1/(1+dr*dt);q.vx*=k;q.vy*=k}
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.rot+=q.vr*dt;
  }
  st.parts=st.parts.filter(q=>q.age<q.life);
  if(!st.playing&&!st.parts.length)st.ended=true;
}
/* 부드러운 빛 무늬 (색별로 한 번만 만들어 둠) */
const softC=new Map();
function softImg(r,g,b){
  const k=(r>>4)+'|'+(g>>4)+'|'+(b>>4);let c=softC.get(k);if(c)return c;
  if(softC.size>600)softC.clear();
  c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),gr=x.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,`rgba(${r},${g},${b},1)`);gr.addColorStop(.4,`rgba(${r},${g},${b},.55)`);gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
  x.fillStyle=gr;x.fillRect(0,0,32,32);softC.set(k,c);return c;
}
/* 그리기: g 는 월드 좌표(px) 변환이 걸린 상태 · ox, oy = 월드에 남기지 않을 때 오브젝트 위치 */
function draw(g,st,ps,ox,oy,TS){
  if(!st||!st.parts.length)return;
  const c0=hex(ps.col0),c1=hex(ps.col1),dx=ps.world?0:ox,dy=ps.world?0:oy;
  g.save();if(ps.add)g.globalCompositeOperation='lighter';
  for(const q of st.parts){
    const t=clamp(q.age/q.life,0,1),cc=q.c0?hex(q.c0):c0;
    const r=Math.round(cc[0]+(c1[0]-cc[0])*t),gg=Math.round(cc[1]+(c1[1]-cc[1])*t),b=Math.round(cc[2]+(c1[2]-cc[2])*t);
    const a=clamp(ps.a0+(ps.a1-ps.a0)*t,0,1),s=Math.max(0,(ps.size0+(ps.size1-ps.size0)*t)*q.sz)*TS;
    if(a<=.003||s<=.05)continue;
    const x=q.x+dx,y=q.y+dy;g.globalAlpha=a;
    switch(ps.look){
      case'soft':g.drawImage(softImg(r,gg,b),x-s,y-s,s*2,s*2);break;
      case'square':g.fillStyle=`rgb(${r},${gg},${b})`;g.fillRect(Math.round(x-s/2),Math.round(y-s/2),Math.max(1,s),Math.max(1,s));break;
      case'spark':{const v=Math.hypot(q.vx,q.vy)||1,L=Math.max(s,Math.min(s*4,v*.04));g.strokeStyle=`rgb(${r},${gg},${b})`;g.lineWidth=Math.max(1,s*.25);g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x-q.vx/v*L,y-q.vy/v*L);g.stroke();break}
      case'star':{g.fillStyle=`rgb(${r},${gg},${b})`;g.beginPath();for(let k=0;k<8;k++){const an=q.rot+k*Math.PI/4,rr=k%2?s*.28:s*.8;g.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr)}g.closePath();g.fill();break}
      default:g.fillStyle=`rgb(${r},${gg},${b})`;g.beginPath();g.arc(x,y,s/2,0,Math.PI*2);g.fill();
    }
  }
  g.restore();
}
/* 인스펙터: H = {fr, num, esc, _t} (엔진의 그리기 도구) */
function inspHtml(ps,H,live){
  const {fr,esc,_t}=H;
  const pre=`<div class="psprs">${Object.keys(PRESETS).map(k=>`<button type="button" class="pspr${ps.preset===k?' on':''}" data-pspre="${k}" title="${esc(_t(PRESETS[k].name))}"><span aria-hidden="true">${PRESETS[k].ic}</span>${esc(_t(PRESETS[k].name))}</button>`).join('')}</div>`;
  let h=fr(_t('프리셋'),pre,1,'preset',_t('고르면 아래 값이 한꺼번에 바뀐다. 고른 뒤 값을 조금씩 바꿔 나만의 효과를 만든다.'));
  h+=`<div class="psbar"><button type="button" class="btn sm" data-psact="replay">${esc(_t('다시 재생'))}</button><span class="hint">${live?esc(_t('파티클 {n}개',{n:live})):esc(_t('씬 뷰에서 고르면 미리 보기가 움직인다'))}</span></div>`;
  GROUPS.forEach(([gk,gl])=>{
    h+=`<div class="shead">${esc(_t(gl))}</div>`;
    FIELDS.filter(f=>f.g===gk).forEach(f=>{
      const v=ps[f.k],at=`data-ps="${f.k}"`;let c='';
      if(f.t==='bool')c=`<input type="checkbox" ${at}${v?' checked':''}>`;
      else if(f.t==='color')c=`<input type="color" ${at} value="${esc(v)}" style="width:44px;height:22px;padding:0;border:1px solid var(--line2);background:none">`;
      else if(f.t==='enum')c=`<select ${at}>${f.opts.map(([k,l])=>`<option value="${k}"${v===k?' selected':''}>${esc(_t(l))}</option>`).join('')}</select>`;
      else c=`<span class="num"><input type="number" ${at} step="${f.step}" min="${f.min}" max="${f.max}" value="${v}"></span>`;
      h+=fr(_t(f.label),c,false,f.k,_t(f.tip));
    });
  });
  return h;
}
function setField(ps,k,el){
  const f=FIELDS.find(q=>q.k===k);if(!f)return false;
  if(f.t==='bool')ps[k]=!!el.checked;
  else if(f.t==='color'||f.t==='enum')ps[k]=el.value;
  else{const v=parseFloat(el.value);if(isNaN(v))return false;ps[k]=f.t==='int'?Math.round(clamp(v,f.min,f.max)):clamp(v,f.min,f.max)}
  ps.preset='';return true;
}
const CSS=`.psprs{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0}
.pspr{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:12px;border:1px solid var(--line2);background:var(--panel2,transparent);color:var(--fg);font-size:11.5px;cursor:pointer}
.pspr:hover{border-color:var(--accent)}.pspr.on{background:var(--accent);border-color:var(--accent);color:#fff}
.psbar{display:flex;align-items:center;gap:8px;margin:2px 0 6px}.psbar .hint{margin:0}`;
try{const s=document.createElement('style');s.textContent=CSS;document.head.appendChild(s)}catch(e){}
/* 번역 [영어, 일본어, 중국어] */
if(window.TI18N)TI18N.add({
'파티클 시스템':['Particle System','パーティクルシステム','粒子系统'],'프리셋':['Preset','プリセット','预设'],'다시 재생':['Replay','再生し直す','重新播放'],
'파티클 {n}개':['{n} particles','パーティクル {n} 個','{n} 个粒子'],'씬 뷰에서 고르면 미리 보기가 움직인다':['Select it in the Scene view to see a live preview','シーンビューで選ぶとプレビューが動きます','在场景视图中选中即可看到实时预览'],
'고르면 아래 값이 한꺼번에 바뀐다. 고른 뒤 값을 조금씩 바꿔 나만의 효과를 만든다.':['Picking one sets all the values below at once. Then tweak them to make your own effect.','選ぶと下の値がまとめて変わります。選んだあと少しずつ変えて自分だけの効果を作りましょう。','选择后下方数值会一次性改变。之后再微调，做出你自己的效果。'],
'기본':['Main','基本','基本'],'방출 (Emission)':['Emission','放出 (Emission)','发射 (Emission)'],'모양 (Shape)':['Shape','形状 (Shape)','形状 (Shape)'],'보이기 (Renderer)':['Renderer','表示 (Renderer)','渲染 (Renderer)'],
'불꽃':['Fire','炎','火焰'],'연기':['Smoke','煙','烟雾'],'반짝임':['Sparkle','きらめき','闪光'],'폭발':['Explosion','爆発','爆炸'],'타격 불똥':['Hit sparks','ヒット火花','打击火花'],'비':['Rain','雨','雨'],'눈':['Snow','雪','雪'],'먼지':['Dust','ほこり','尘土'],'마법':['Magic','魔法','魔法'],'회복':['Heal','回復','治疗'],'픽셀 조각':['Pixel debris','ピクセル破片','像素碎片'],
'반복 (Looping)':['Looping','ループ (Looping)','循环 (Looping)'],'재생 시간(초)':['Duration (s)','再生時間 (秒)','持续时间 (秒)'],'시작할 때 재생 (Play On Awake)':['Play On Awake','開始時に再生 (Play On Awake)','启动时播放 (Play On Awake)'],
'수명(초)':['Lifetime (s)','寿命 (秒)','寿命 (秒)'],'속도(칸/초)':['Speed (cells/s)','速度 (マス/秒)','速度 (格/秒)'],'무작위 정도':['Randomness','ランダムさ','随机程度'],'처음 크기(칸)':['Start size (cells)','開始サイズ (マス)','初始大小 (格)'],'끝 크기(칸)':['End size (cells)','終了サイズ (マス)','结束大小 (格)'],
'처음 색':['Start color','開始色','初始颜色'],'끝 색':['End color','終了色','结束颜色'],'처음 투명도':['Start alpha','開始の不透明度','初始不透明度'],'끝 투명도':['End alpha','終了の不透明度','结束不透明度'],'중력':['Gravity','重力','重力'],'공기 저항':['Drag','空気抵抗','空气阻力'],'최대 개수':['Max particles','最大数','最大数量'],
'1초에 뿜는 수 (Rate)':['Rate over time','1秒あたりの数 (Rate)','每秒发射数 (Rate)'],'시작할 때 한꺼번에 (Burst)':['Burst','開始時にまとめて (Burst)','开始时一次性 (Burst)'],'모양':['Shape','形','形状'],'점':['Point','点','点'],'원':['Circle','円','圆'],'상자':['Box','箱','方框'],'가로선':['Horizontal line','横線','横线'],
'크기(칸)':['Size (cells)','サイズ (マス)','大小 (格)'],'방향(°)':['Direction (°)','方向 (°)','方向 (°)'],'퍼짐(°)':['Spread (°)','広がり (°)','扩散 (°)'],'모양 (렌더러)':['Look','見た目','外观'],
'부드러운 빛':['Soft glow','柔らかい光','柔光'],'동그라미':['Circle','丸','圆点'],'네모 (픽셀)':['Square (pixel)','四角 (ピクセル)','方块 (像素)'],'불똥 · 빗줄기':['Spark · streak','火花 · 雨筋','火花 · 雨丝'],'별':['Star','星','星星'],
'빛처럼 더하기 (Additive)':['Additive','加算 (Additive)','叠加 (Additive)'],'월드에 남기기 (World Space)':['World Space','ワールドに残す (World Space)','世界空间 (World Space)'],'오브젝트 위에 그리기':['Draw above objects','オブジェクトの上に描く','绘制在对象上方'],'끝나면 오브젝트 삭제 (Stop Action)':['Destroy when done (Stop Action)','終わったらオブジェクトを削除 (Stop Action)','结束后删除对象 (Stop Action)'],
'켜면 재생 시간이 끝나도 계속 뿜어낸다. 끄면 한 번만 뿜고 멈춘다 (폭발 · 타격 효과).':['On: keeps emitting after the duration ends. Off: emits once and stops (explosions, hits).','オンにすると再生時間が終わっても出し続けます。オフにすると一度だけ出して止まります（爆発・ヒット効果）。','开启后持续时间结束仍会继续发射。关闭则只发射一次（爆炸、打击效果）。'],
'한 번 재생하는 길이(초)이다. 반복을 끄면 이 시간 동안만 뿜어낸다.':['Length of one cycle (s). With looping off, it only emits during this time.','1回の再生の長さ（秒）です。ループをオフにするとこの時間だけ出します。','一次播放的时长（秒）。关闭循环时只在这段时间内发射。'],
'켜면 플레이를 시작하거나 오브젝트가 생길 때 바로 재생한다. 끄면 스크립트의 Play()를 불러야 시작한다.':['On: plays as soon as play starts or the object spawns. Off: starts only when a script calls Play().','オンにするとプレイ開始時やオブジェクト生成時にすぐ再生します。オフにするとスクリプトで Play() を呼ぶまで始まりません。','开启后在开始游戏或对象生成时立即播放。关闭则需脚本调用 Play() 才开始。'],
'파티클 하나가 살아 있는 시간(초)이다.':['How long each particle lives (s).','パーティクル1つが生きている時間（秒）です。','每个粒子存在的时间（秒）。'],
'파티클이 처음 날아가는 빠르기(1초에 몇 칸)이다.':['Initial speed of each particle (cells per second).','パーティクルが最初に飛ぶ速さ（1秒に何マス）です。','粒子初始飞行速度（每秒几格）。'],
'수명 · 속도 · 크기를 얼마나 들쭉날쭉하게 할지 (0 = 모두 같음, 1 = 많이 다름).':['How much lifetime, speed and size vary (0 = all the same, 1 = very different).','寿命・速度・サイズのばらつき（0 = すべて同じ、1 = 大きく違う）。','寿命、速度、大小的随机程度（0 = 全部相同，1 = 差异很大）。'],
'태어날 때의 크기(칸)이다.':['Size when born (cells).','生まれたときのサイズ（マス）です。','出生时的大小（格）。'],'사라질 때의 크기(칸)이다. 처음 크기에서 이 크기로 서서히 바뀐다.':['Size when it disappears (cells). It changes gradually from the start size.','消えるときのサイズ（マス）です。開始サイズから徐々に変わります。','消失时的大小（格）。从初始大小逐渐变化。'],
'태어날 때의 색이다.':['Color when born.','生まれたときの色です。','出生时的颜色。'],'사라질 때의 색이다.':['Color when it disappears.','消えるときの色です。','消失时的颜色。'],'0 = 투명, 1 = 불투명.':['0 = transparent, 1 = opaque.','0 = 透明、1 = 不透明。','0 = 透明，1 = 不透明。'],
'사라질 때의 투명도이다. 0이면 서서히 사라진다.':['Alpha when it disappears. 0 fades it out.','消えるときの不透明度です。0 なら徐々に消えます。','消失时的不透明度。0 表示逐渐消失。'],
'양수면 아래로 떨어지고(비 · 불똥), 음수면 위로 떠오릅니다(연기 · 불꽃).':['Positive falls down (rain, sparks); negative floats up (smoke, flames).','正の値なら下に落ち（雨・火花）、負の値なら上に浮かびます（煙・炎）。','正值向下落（雨、火花），负值向上飘（烟雾、火焰）。'],
'클수록 날아가다 빨리 느려진다.':['Higher slows particles down faster.','大きいほど速く減速します。','越大减速越快。'],'한 번에 화면에 있을 수 있는 파티클 수의 한도이다.':['Limit on how many particles can exist at once.','同時に存在できるパーティクル数の上限です。','同时存在的粒子数量上限。'],
'1초에 몇 개를 뿜어낼지이다.':['How many to emit per second.','1秒に何個出すかです。','每秒发射多少个。'],'재생을 시작하는 순간 한꺼번에 뿜는 개수이다 (폭발 · 터지는 효과).':['How many to emit at once when playback starts (explosions, pops).','再生開始の瞬間にまとめて出す数です（爆発・はじける効果）。','开始播放瞬间一次性发射的数量（爆炸、迸发效果）。'],
'파티클이 태어나는 자리의 모양이다. 비 · 눈은 넓은 가로선이나 상자가 어울린다.':['Shape of the area particles are born in. Rain and snow suit a wide line or box.','パーティクルが生まれる場所の形です。雨・雪は広い横線や箱が合います。','粒子出生区域的形状。雨、雪适合宽横线或方框。'],
'원의 반지름 · 상자와 가로선의 반 너비(칸)이다.':['Circle radius, or half-width of the box/line (cells).','円の半径、箱と横線の半分の幅（マス）です。','圆的半径，或方框/横线的半宽（格）。'],
'뿜는 방향이다. 0° = 오른쪽, 90° = 아래, -90° = 위.':['Emission direction. 0° = right, 90° = down, -90° = up.','放出方向です。0° = 右、90° = 下、-90° = 上。','发射方向。0° = 右，90° = 下，-90° = 上。'],
'방향을 중심으로 얼마나 넓게 퍼질지(도)이다. 360이면 사방으로 퍼진다.':['How widely to spread around the direction (degrees). 360 spreads in all directions.','方向を中心にどれだけ広がるか（度）です。360 なら全方向に広がります。','围绕方向扩散的角度（度）。360 表示向四周扩散。'],
'파티클 하나의 생김새이다.':['What each particle looks like.','パーティクル1つの見た目です。','单个粒子的外观。'],
'켜면 겹칠수록 밝아져서 불 · 마법 · 빛에 어울린다. 연기 · 먼지는 끈다. 어두운 씬에서도 빛나 보인다.':['On: overlapping particles get brighter — good for fire, magic and light. Turn off for smoke and dust. Glows even in dark scenes.','オンにすると重なるほど明るくなり、炎・魔法・光に合います。煙・ほこりはオフに。暗いシーンでも光って見えます。','开启后重叠越多越亮，适合火焰、魔法、光效。烟雾、尘土请关闭。在暗场景中也会发光。'],
'켜면 오브젝트가 움직여도 이미 나온 파티클은 그 자리에 남아 꼬리가 생긴다. 끄면 오브젝트와 함께 움직인다.':['On: particles already emitted stay put when the object moves, leaving a trail. Off: they move with the object.','オンにするとオブジェクトが動いても出たパーティクルはその場に残り、尾ができます。オフにするとオブジェクトと一緒に動きます。','开启后对象移动时已发射的粒子留在原地形成拖尾。关闭则随对象一起移动。'],
'켜면 게임 오브젝트들 위에 그린다. 끄면 이 오브젝트의 배치 순서대로 그린다.':['On: draws above game objects. Off: draws at this object\'s sorting order.','オンにするとゲームオブジェクトの上に描きます。オフにするとこのオブジェクトの配置順で描きます。','开启后绘制在游戏对象上方。关闭则按该对象的排序顺序绘制。'],
'반복이 꺼져 있을 때 모든 파티클이 사라지면 이 게임 오브젝트를 지운다. Instantiate로 만든 폭발 효과에 쓴다.':['With looping off, deletes this game object once all particles are gone. Use it for explosion effects made with Instantiate.','ループがオフのとき、すべてのパーティクルが消えたらこのゲームオブジェクトを削除します。Instantiate で作った爆発効果に使います。','关闭循环时，所有粒子消失后删除此游戏对象。适用于用 Instantiate 生成的爆炸效果。']
});
window.PSYS={FIELDS,GROUPS,PRESETS,DEF,normalize,applyPreset,newState,spawn,step,draw,inspHtml,setField};
})();
