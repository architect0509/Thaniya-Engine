/* anim-editor.js — 엔진(edit.html)과 학습(learning.html)이 함께 쓰는 애니메이션
   · 데이터(클립 · 컨트롤러) · 플레이 런타임 · 애니메이터 창(상태 머신 그래프) · 애니메이션 창(타임라인)
   · 여기만 고치면 두 화면이 같이 바뀝니다 (script-engine.js · script-editor.js와 같은 방식)

   ANIM_EDITOR(get, set, over) 하나만 내보냅니다.
   아래 코드는 엔진에서 쓰던 그대로이고, 화면마다 다른 이름(P · play · $ · getSel · need · toast · openModal · showMenu …)은
   부르는 화면의 변수를 「이름 그대로」 읽습니다.
     get(이름) → 그 화면에서 그 변수를 읽는 함수를 돌려줌 (없으면 오류)   예) 엔진: n=>{eval(n);return eval('()=>('+n+')')}
     set(이름, 값) → 그 화면의 변수에 대입
     over = { 이름: 값 } — 그 화면의 같은 이름 대신 쓸 것 (학습 화면의 P · play · 메뉴 등). getter도 됩니다.
   돌려주는 것: 화면 쪽에서 부르는 함수들 (아래 return 참고) */
function ANIM_EDITOR(get,set,over){
  over=over||{};
  const OWN=Object.prototype.hasOwnProperty,cache=Object.create(null);
  const H=new Proxy(Object.create(null),{
    /* 브라우저 전역(requestAnimationFrame · Math …)은 그대로 전역에서 찾게 함 — with 안에서 부르면 this가 바뀌어 'Illegal invocation'이 나므로 */
    has(_,n){if(typeof n!=='string')return false;if(OWN.call(over,n)||cache[n])return true;
      let g;try{g=get(n)}catch(e){return false}
      if(n in globalThis){try{if(g()===globalThis[n])return false}catch(e){}}
      cache[n]=g;return true},
    get(_,n){if(typeof n!=='string')return undefined;if(OWN.call(over,n))return over[n];return(cache[n]||(cache[n]=get(n)))()},
    set(_,n,v){if(OWN.call(over,n))over[n]=v;else set(n,v);return true}
  });
  with(H){return(function(){'use strict';
/* ===================== 애니메이션 (유니티 Animation 클립 · Animator 컨트롤러) =====================
   P.anim = {clips:[클립], ctrls:[컨트롤러], heroCtrl:주인공 기본 컨트롤러 id}
   클립   {id,name,fps,loop,tracks:[{p:속성,keys:[{f:프레임,v:값}]}]}  · 길이 = 마지막 키 프레임 + 1
          속성: sprite(스프라이트 참조) · x·y(위치 오프셋, 칸) · rot(회전 °, 더함) · sx·sy(크기, 곱함) · alpha(투명도) · flip(좌우 뒤집기) · ev(이벤트: 스크립트 메서드 이름)
   컨트롤러 {id,name,params:[{n,t:'float'|'int'|'bool'|'trigger',d}],states:[{id,n,clip,spd,x,y}],def,trans:[{id,a:상태id|'any',b,exit,et,self,conds:[{p,op,v}]}],any:{x,y},entry:{x,y}}
   게임 오브젝트: props.animator = {ctrl, speed} — 플레이 중 컨트롤러의 상태·전환을 따라 스프라이트와 변형을 바꿉니다 */
const AN_PROPS={
  sprite:{n:'스프라이트',en:'Sprite',kind:'spr'},
  x:{n:'위치 X',en:'Position.x',kind:'num',def:0,step:.05},
  y:{n:'위치 Y',en:'Position.y',kind:'num',def:0,step:.05},
  rot:{n:'회전',en:'Rotation.z',kind:'num',def:0,step:1},
  sx:{n:'크기 X',en:'Scale.x',kind:'num',def:1,step:.05},
  sy:{n:'크기 Y',en:'Scale.y',kind:'num',def:1,step:.05},
  alpha:{n:'투명도',en:'Color.a',kind:'num',def:1,step:.05,min:0,max:1},
  flip:{n:'좌우 뒤집기',en:'Flip X',kind:'bool',def:false},
  ev:{n:'이벤트',en:'Events',kind:'ev'}
};
const AN_ORDER=['sprite','x','y','rot','sx','sy','alpha','flip','ev'];
/* 타임라인(timeline.js · 엔진 화면 전용): 있으면 그 화면의 TLH를 읽는 함수, 없으면(학습 화면) null */
const anTLH=(()=>{try{return get('TLH')}catch(e){return null}})();
const anTL=()=>{try{return anTLH&&anTLH()}catch(e){return null}};
const AN_PT={float:'Float',int:'Int',bool:'Bool',trigger:'Trigger'};
const AN_OPS={float:[['gt','> 큼'],['lt','< 작음']],int:[['gt','> 큼'],['lt','< 작음'],['eq','= 같음'],['ne','≠ 다름']],bool:[['true','= true'],['false','= false']],trigger:[['trig','발동됨']]};
let AN_VER=0;
function anData(p){p=p||P;if(!p)return{clips:[],ctrls:[]};if(!p.anim||typeof p.anim!=='object')p.anim={clips:[],ctrls:[]};if(!Array.isArray(p.anim.clips))p.anim.clips=[];if(!Array.isArray(p.anim.ctrls))p.anim.ctrls=[];return p.anim}
const anClip=id=>id&&P&&P.anim?P.anim.clips.find(c=>c.id===id)||null:null;
const anCtrl=id=>id&&P&&P.anim?P.anim.ctrls.find(c=>c.id===id)||null:null;
const anState=(c,id)=>c&&id?c.states.find(s=>s.id===id)||null:null;
const anLen=c=>{let n=0;if(c)c.tracks.forEach(t=>t.keys.forEach(k=>{if(k.f+1>n)n=k.f+1}));return Math.max(1,n)};
const anDur=c=>c?anLen(c)/Math.max(1,c.fps||12):1;
function anUniq(list,base){const has=new Set(list);if(!has.has(base))return base;for(let i=1;i<999;i++){const n=base+' '+i;if(!has.has(n))return n}return base+' '+uid()}
function anNormClip(c){
  const o={id:String(c.id||uid()),name:String(c.name||'클립').slice(0,40),fps:clamp(Math.round(+c.fps||12),1,60),loop:c.loop!==false,tracks:[]};if(c.smooth)o.smooth=true;
  (Array.isArray(c.tracks)?c.tracks:[]).forEach(t=>{if(!t||!AN_PROPS[t.p]||o.tracks.some(x=>x.p===t.p))return;
    const kind=AN_PROPS[t.p].kind,seen=new Map();
    (Array.isArray(t.keys)?t.keys:[]).forEach(k=>{if(!k)return;const f=clamp(Math.round(+k.f||0),0,9999);let v=k.v;
      if(kind==='num'){v=+v;if(!isFinite(v))v=AN_PROPS[t.p].def}else if(kind==='bool')v=!!v;else v=String(v==null?'':v).slice(0,80);seen.set(f,{f,v})});
    o.tracks.push({p:t.p,keys:[...seen.values()].sort((a,b)=>a.f-b.f)})});
  o.tracks.sort((a,b)=>AN_ORDER.indexOf(a.p)-AN_ORDER.indexOf(b.p));
  return o;
}
function anNormCtrl(c){
  const o={id:String(c.id||uid()),name:String(c.name||'컨트롤러').slice(0,40),params:[],states:[],trans:[],def:null,
    any:{x:+(c.any&&c.any.x)||0,y:+(c.any&&c.any.y)||-160},entry:{x:+(c.entry&&c.entry.x)||-420,y:+(c.entry&&c.entry.y)||-160}};
  (Array.isArray(c.params)?c.params:[]).forEach(q=>{if(!q||!AN_PT[q.t])return;const n=String(q.n||'').trim().slice(0,40);if(!n||o.params.some(x=>x.n===n))return;
    o.params.push({n,t:q.t,d:q.t==='bool'?!!q.d:q.t==='trigger'?false:q.t==='int'?Math.round(+q.d||0):(+q.d||0)})});
  (Array.isArray(c.states)?c.states:[]).forEach(s=>{if(!s||!s.id||o.states.some(x=>x.id===s.id))return;
    o.states.push({id:String(s.id),n:String(s.n||'상태').slice(0,40),clip:s.clip?String(s.clip):'',spd:isFinite(+s.spd)&&s.spd!==''&&s.spd!=null?clamp(+s.spd,-10,10):1,x:+s.x||0,y:+s.y||0,...(s.lock?{lock:true}:{})})});
  o.def=o.states.some(s=>s.id===c.def)?c.def:(o.states[0]?o.states[0].id:null);
  (Array.isArray(c.trans)?c.trans:[]).forEach(t=>{if(!t)return;const a=t.a==='any'?'any':String(t.a||'');if(!o.states.some(s=>s.id===t.b)||(a!=='any'&&!o.states.some(s=>s.id===a)))return;
    o.trans.push({id:String(t.id||uid()),a,b:String(t.b),exit:a==='any'?false:t.exit!==false,et:clamp(isFinite(+t.et)?+t.et:1,0,100),self:!!t.self,
      conds:(Array.isArray(t.conds)?t.conds:[]).filter(q=>q&&q.p).map(q=>({p:String(q.p),op:String(q.op||'true'),v:+q.v||0}))})});
  return o;
}
function anNormP(p){const d=anData(p);d.clips=d.clips.filter(c=>c&&typeof c==='object').map(anNormClip);d.ctrls=d.ctrls.filter(c=>c&&typeof c==='object').map(anNormCtrl);
  if(d.heroCtrl&&!d.ctrls.some(c=>c.id===d.heroCtrl))delete d.heroCtrl;return d}
/* ---- 주인공 기본 애니메이터: 4방향 대기·걷기 클립 + Any State 전환 (IsMoving · Dir) ---- */
const AN_DIRS=[['아래','d'],['위','u'],['왼쪽','l'],['오른쪽','r']];
function anHeroCtrl(p){
  p=p||P;const d=anData(p);let c=d.heroCtrl&&d.ctrls.find(x=>x.id===d.heroCtrl);if(c)return c;
  c={id:uid(),name:anUniq(d.ctrls.map(x=>x.name),_t('주인공')),params:[{n:'IsMoving',t:'bool',d:false},{n:'Dir',t:'int',d:0}],states:[],trans:[],def:null,any:{x:-80,y:-30},entry:{x:-80,y:-150}};
  AN_DIRS.forEach(([nm,k],i)=>{
    const ni=_t('대기_'+nm),nw=_t('걷기_'+nm),hn=_t('주인공');
    const idle={id:uid(),name:anUniq(d.clips.map(x=>x.name),hn+'_'+ni),fps:3,loop:true,tracks:[{p:'sprite',keys:[{f:0,v:'base_hero:'+k+'0'},{f:1,v:'base_hero:'+k+'2'}]}]};d.clips.push(idle);
    const walk={id:uid(),name:anUniq(d.clips.map(x=>x.name),hn+'_'+nw),fps:8,loop:true,tracks:[{p:'sprite',keys:[1,2,3,0].map((n,f)=>({f,v:'base_hero:'+k+n}))}]};d.clips.push(walk);
    const si={id:uid(),n:ni,clip:idle.id,spd:1,x:-320,y:-60+i*64},sw={id:uid(),n:nw,clip:walk.id,spd:1,x:160,y:-60+i*64};
    c.states.push(si,sw);
    c.trans.push({id:uid(),a:'any',b:si.id,exit:false,et:1,self:false,conds:[{p:'IsMoving',op:'false',v:0},{p:'Dir',op:'eq',v:i}]});
    c.trans.push({id:uid(),a:'any',b:sw.id,exit:false,et:1,self:false,conds:[{p:'IsMoving',op:'true',v:0},{p:'Dir',op:'eq',v:i}]});
  });
  c.def=c.states[0].id;d.ctrls.push(c);d.heroCtrl=c.id;return c;
}
function giveHeroAnimator(o,p){if(!o||!o.props||o.props.animator)return;o.props.animator={ctrl:anHeroCtrl(p).id,speed:1}}
/* 예전 프로젝트: 한 번만 — 자기 스프라이트가 없는 주인공에 기본 애니메이터를 붙이고, 고치지 않은 기본 이동 스크립트를 새 코드로 바꿈 */
function anMigrate(p){
  anNormP(p);
  /* v2: 예전 기본 대기 클립(한 장 · 6fps)을 새싹이 살랑이는 2프레임으로 */
  if(p.animInit&&!p.animV2){const d=anData(p),c=d.heroCtrl&&d.ctrls.find(x=>x.id===d.heroCtrl);
    if(c)c.states.forEach(st=>{const k=d.clips.find(x=>x.id===st.clip);if(!k||k.fps!==6||k.tracks.length!==1)return;const t=k.tracks[0],m=t.p==='sprite'&&t.keys.length===1&&/^base_hero:([dulr])0$/.exec(t.keys[0].v);
      if(m){k.fps=3;t.keys.push({f:1,v:'base_hero:'+m[1]+'2'})}})}
  p.animV2=true;
  if(p.animInit)return;
  /* 이동 스크립트가 애니메이터 파라미터를 바꿀 수 있을 때만 붙임 (직접 고친 스크립트면 예전 모습 그대로 · 필요하면 컴포넌트 추가로 붙이면 됨) */
  const s=heroScript(p,false);let ready=!s;
  if(s){const old=s.code.replace(/\r\n/g,'\n');
    if(old===HERO_CODE_V1){s.code=HERO_CODE;ready=true}
    else if(typeof enToKo==='function'&&old===enToKo(HERO_CODE_V1)){s.code=enToKo(HERO_CODE);ready=true}
    else if(/(GetComponent|컴포넌트가져오기)\s*<\s*(Animator|애니메이터)\s*>/.test(old))ready=true}
  if(ready&&!p.playerSprite)(p.maps||[]).forEach(m=>(m.objs||[]).forEach(o=>{if(o.type==='spawn'&&o.props&&!o.props.sprite)giveHeroAnimator(o,p)}));
  p.animInit=true;
}
/* ---- 클립 계산 ---- */
function anTrack(c,p,make){let t=c.tracks.find(x=>x.p===p);if(!t&&make){t={p,keys:[]};c.tracks.push(t);c.tracks.sort((a,b)=>AN_ORDER.indexOf(a.p)-AN_ORDER.indexOf(b.p))}return t||null}
/* sm = 부드럽게(ease in-out): 키 사이를 천천히 출발해 천천히 멈춤 (유니티 기본 곡선과 비슷) */
function anValAt(t,f,sm){
  const k=t.keys,kind=AN_PROPS[t.p].kind;if(!k.length)return undefined;
  if(kind!=='num'){const fi=Math.floor(f+1e-6);let v=k[0].v;for(const q of k){if(q.f<=fi)v=q.v;else break}return v}
  if(f<=k[0].f)return +k[0].v;const L=k[k.length-1];if(f>=L.f)return +L.v;
  for(let i=0;i<k.length-1;i++){const a=k[i],b=k[i+1];if(f>=a.f&&f<=b.f){let r=(f-a.f)/Math.max(1e-6,b.f-a.f);if(sm)r=r*r*(3-2*r);return +a.v+(b.v-a.v)*r}}
  return +L.v;
}
function anEval(c,f){const o={};if(!c)return o;c.tracks.forEach(t=>{if(t.p==='ev'||!t.keys.length)return;o[t.p]=anValAt(t,f,c.smooth)});return o}
/* 클립 시간(초) → 프레임 (반복이면 되감기, 아니면 마지막 프레임에서 멈춤) */
function anFrameAt(c,t){const L=anLen(c),fps=Math.max(1,c.fps||12);let f=t*fps;if(c.loop)f=((f%L)+L)%L;else f=clamp(f,0,L-1);return f}
function anRestPose(a){const c=a&&anCtrl(a.ctrl);if(!c)return null;const s=anState(c,c.def)||c.states[0];const k=s&&anClip(s.clip);return k?anEval(k,0):null}
/* 오브젝트의 지금 포즈: 애니메이션 창 미리보기 → 플레이 중 런타임 → 기본 상태 첫 프레임 */
function anPoseFor(m,o,p){
  if(!o||!o.props)return null;
  /* 타임라인: 플레이 중 디렉터가 재생하는 애니메이션 트랙 · 편집 중 타임라인 창 미리보기 (애니메이터보다 우선 · 유니티와 같음) */
  const tq=(()=>{const th=anTL();return th?th.pose(m,o,p):null})();
  const q0=anPoseBase(m,o,p);
  /* 타임라인 포즈는 애니메이터 포즈 위에 덮어씀 (위치만 키가 있으면 걷기 애니메이션 그림은 그대로) */
  return tq?Object.assign({},q0||{},tq):q0;
}
function anPoseBase(m,o,p){
  if(!play&&AW.preview&&AW.obj===o.id&&anVis('anim')){const c=anClip(AW.clip);if(c)return anEval(c,AW.f)}
  const a=o.props.animator;if(!a)return null;
  let q=null,got=false;
  if(p&&p.anim){const rt=p.anim.get(o.id);if(rt){q=rt.pose;got=true}}
  if(!got)q=anRestPose(a);
  /* 자동으로 붙은 기본 「주인공」 애니메이터의 검은 고양이 시트 프레임(base_hero:*)은 스프라이트 렌더러에 직접 고른 스프라이트를 덮어쓰지 않음.
     그 클립의 스프라이트 키를 직접 다른 그림으로 바꾸면(고양이 시트가 아니면) 렌더러에 스프라이트가 있어도 애니메이션이 그대로 적용됨
     (스프라이트가 있는 주인공에는 원래 기본 애니메이터를 붙이지 않는 규칙과 맞춤 · 사용자가 만든 컨트롤러는 그대로 덮어씀) */
  if(q&&q.sprite&&o.props.sprite&&spriteRef(o.props.sprite)&&a.ctrl&&a.ctrl===anData().heroCtrl&&/^base_hero:/.test(String(q.sprite))){q=Object.assign({},q);delete q.sprite}
  return q;
}
function anApplyProps(props,q){
  const r=Object.assign({},props);
  if(q.sprite&&spriteRef(q.sprite)){r.sprite=q.sprite;r.__an=1}
  if(q.sx!=null)r.sx=(props.sx||1)*(q.sx||.0001);if(q.sy!=null)r.sy=(props.sy||1)*(q.sy||.0001);
  if(q.rot)r.rot=(+props.rot||0)+q.rot;if(q.flip)r.sx=-(r.sx||1);
  return r;
}
/* objArt + 애니메이션 포즈 (스프라이트 · 위치 오프셋 · 회전 · 크기 · 투명도 · 뒤집기) */
function objArtA(g,m,o,X,Y,t,p,type){
  type=type||o.type;const q=anPoseFor(m,o,p);
  if(!q){objArt(g,type,X,Y,t,o.props);return}
  const ga=g.globalAlpha;if(q.alpha!=null)g.globalAlpha=ga*clamp(q.alpha,0,1);
  objArt(g,type,X+(q.x||0)*TS,Y+(q.y||0)*TS,t,anApplyProps(o.props,q));g.globalAlpha=ga;
}
/* ---- 플레이 런타임 ---- */
const anPDef=q=>q.t==='bool'?!!q.d:q.t==='trigger'?false:q.t==='int'?Math.round(+q.d||0):(+q.d||0);
function anRt(m,o){
  const p=play;if(!p||p.m!==m||!o||!o.props||!o.props.animator)return null;
  if(!p.anim)p.anim=new Map();
  const c=anCtrl(o.props.animator.ctrl);let rt=p.anim.get(o.id);
  if(!c){if(rt)p.anim.delete(o.id);return null}
  if(!rt||rt.c!==c){rt={c,st:c.def||(c.states[0]&&c.states[0].id)||null,t:0,prm:{},warn:new Set(),off:false,pose:null};c.params.forEach(q=>rt.prm[q.n]=anPDef(q));p.anim.set(o.id,rt);rt.pose=anRtPose(rt);rt.enter=true}
  return rt;
}
function anParam(rt,n){const d=rt.c.params.find(q=>q.n===n);if(!d)return null;if(!(n in rt.prm))rt.prm[n]=anPDef(d);return d}
function anRtPose(rt){const s=anState(rt.c,rt.st);const k=s&&anClip(s.clip);return k?anEval(k,anFrameAt(k,rt.t)):null}
function anCondOk(rt,q){
  const d=anParam(rt,q.p);if(!d)return false;const v=rt.prm[q.p];
  switch(q.op){case'gt':return v>q.v;case'lt':return v<q.v;case'eq':return Math.round(v)===Math.round(q.v);case'ne':return Math.round(v)!==Math.round(q.v);
    case'true':return d.t==='trigger'?!!v:v===true;case'false':return v===false;case'trig':return!!v}
  return false;
}
function anTransOk(rt,tr,n0,n1,clip){
  const c=rt.c;if(!anState(c,tr.b))return false;
  if(tr.a==='any'&&tr.b===rt.st&&!tr.self)return false;
  if(!tr.exit&&!tr.conds.length)return false;
  if(tr.exit&&tr.a!=='any'){const et=Math.max(0,+tr.et||0);if(et>=1||!clip||!clip.loop){if(n1<et)return false}else if(!(Math.floor(n0-et)<Math.floor(n1-et)))return false}
  return tr.conds.every(q=>anCondOk(rt,q));
}
function anFire(m,o,clip,t0,t1,entering){
  const tr=clip&&anTrack(clip,'ev');if(!tr||!tr.keys.length)return;
  const fps=Math.max(1,clip.fps||12),L=anLen(clip),f0=entering?-1e-6:t0*fps,f1=t1*fps;
  for(const k of tr.keys){if(!k.v)continue;
    let hit=false;
    if(clip.loop)hit=Math.floor((f1-k.f)/L)>Math.floor((f0-k.f)/L);else hit=f0<k.f&&k.f<=f1;
    if(hit&&/^[A-Za-z_가-힣][\w가-힣]*$/.test(k.v)){csRunMethods(m,o,[k.v]);if(!play||play.m!==m)return}}
}
function anStep(m,o,rt,dt){
  const c=rt.c;let st=anState(c,rt.st);
  if(!st){rt.st=c.def||(c.states[0]&&c.states[0].id)||null;rt.t=0;st=anState(c,rt.st);if(!st){rt.pose=null;return}}
  const clip=anClip(st.clip),dur=anDur(clip),sp=st.spd==null?1:+st.spd;
  const t0=rt.t;rt.t+=dt*sp;const n0=t0/dur,n1=rt.t/dur;
  if(clip){anFire(m,o,clip,t0,rt.t,rt.enter);rt.enter=false;if(!play||play.m!==m)return}
  /* 「끝까지 재생」 상태: 반복하지 않는 클립이 끝날 때까지 Any State 전환이 끊지 않음 (자기 상태에서 나가는 전환은 그대로)
     Any State 전환은 지금 어느 상태든 매 프레임 검사되므로, 깡충 같은 한 번짜리 동작이 다른 Any State 전환(대기 등)에 바로 끊기는 것을 막습니다 */
  const lockAny=st.lock&&clip&&!clip.loop&&n1<1;
  const list=(lockAny?[]:c.trans.filter(t=>t.a==='any')).concat(c.trans.filter(t=>t.a===st.id));
  for(const tr of list){
    if(!anTransOk(rt,tr,n0,n1,clip))continue;
    tr.conds.forEach(q=>{const d=anParam(rt,q.p);if(d&&d.t==='trigger')rt.prm[q.p]=false});
    rt.st=tr.b;rt.t=0;rt.enter=true;break;
  }
  rt.pose=anRtPose(rt);
}
function animTick(p,dt){
  const m=p.m;if(!m)return;if(!p.anim)p.anim=new Map();
  for(const o of m.objs.slice()){
    const a=o.props&&o.props.animator;if(!a||!objOn(m,o))continue;
    if(o.type==='monster'){const z=monOf(m,o);if(z&&z.dead)continue}
    const rt=anRt(m,o);if(!rt||rt.off)continue;
    anStep(m,o,rt,dt*(a.speed==null?1:+a.speed));if(!play||play.m!==m)return;
  }
}
/* ---- 스크립트: GetComponent<Animator>() ---- */
function animProxy(m,o){
  const R=()=>{const rt=anRt(m,o);if(!rt)throw new Error(`MissingComponentException: ${o.name}의 애니메이터(Animator)에 컨트롤러가 지정되지 않았습니다 — 인스펙터의 애니메이터 컴포넌트에서 컨트롤러를 고르세요`);return rt};
  const prm=(rt,n)=>{n=csFmt(n);const d=anParam(rt,n);if(!d&&!rt.warn.has(n)){rt.warn.add(n);clog('warn',`Animator: '${n}' 파라미터가 없습니다 (${o.name} · 컨트롤러 「${rt.c.name}」) — 애니메이터 창의 파라미터 목록에서 이름을 확인하세요`)}return d?n:null};
  const info=rt=>{const s=anState(rt.c,rt.st),k=s&&anClip(s.clip),dur=anDur(k);
    return{__h:'AnimatorStateInfo',__o:o,name:s?s.n:'',
      get(n){if(n==='normalizedTime')return dur?rt.t/dur:0;if(n==='length')return dur;if(n==='loop')return!!(k&&k.loop);if(n==='speed')return s?(s.spd==null?1:+s.spd):1;throw csUnsup('AnimatorStateInfo.'+n)},
      set(n){throw csUnsup('AnimatorStateInfo.'+n+' 대입')},
      call(n,a){if(n==='IsName'){const q=csFmt(a[0]);return!!s&&(q===s.n||q==='Base Layer.'+s.n)}throw csUnsup('AnimatorStateInfo.'+n+'()')}}};
  return{__h:'Animator',__o:o,name:o.name,
    get(n){
      if(n==='gameObject')return goProxy(m,o);if(n==='transform')return trProxy(m,o);if(n==='name')return o.name;
      const a=o.props.animator;if(!a)throw new Error(`MissingComponentException: ${o.name}의 애니메이터 컴포넌트가 제거되었습니다`);
      if(n==='speed')return a.speed==null?1:+a.speed;
      if(n==='enabled'){const rt=anRt(m,o);return!(rt&&rt.off)}
      if(n==='runtimeAnimatorController'||n==='controllerName'){const c=anCtrl(a.ctrl);return c?c.name:''}
      throw csUnsup('Animator.'+n);
    },
    set(n,v){
      const a=o.props.animator;if(!a)throw new Error(`MissingComponentException: ${o.name}의 애니메이터 컴포넌트가 제거되었습니다`);
      if(n==='speed'){a.speed=clamp(csN(v),0,10);return}
      if(n==='enabled'){const rt=R();rt.off=!v;return}
      throw csUnsup('Animator.'+n+' 대입');
    },
    call(n,a){
      const rt=R();
      switch(n){
        case'SetFloat':{const k=prm(rt,a[0]);if(k)rt.prm[k]=csN(a[1]);return null}
        case'SetInteger':{const k=prm(rt,a[0]);if(k)rt.prm[k]=Math.round(csN(a[1]));return null}
        case'SetBool':{const k=prm(rt,a[0]);if(k)rt.prm[k]=!!a[1];return null}
        case'SetTrigger':{const k=prm(rt,a[0]);if(k)rt.prm[k]=true;return null}
        case'ResetTrigger':{const k=prm(rt,a[0]);if(k)rt.prm[k]=false;return null}
        case'GetFloat':case'GetInteger':case'GetBool':{const k=prm(rt,a[0]);if(!k)return n==='GetBool'?false:0;const v=rt.prm[k];return n==='GetBool'?!!v:n==='GetInteger'?Math.round(+v||0):+v||0}
        case'Play':case'CrossFade':case'CrossFadeInFixedTime':{
          const q=csFmt(a[0]).replace(/^Base Layer\./,''),s=rt.c.states.find(x=>x.n===q);
          if(!s){if(!rt.warn.has('#'+q)){rt.warn.add('#'+q);clog('warn',`Animator.${n}: '${q}' 상태가 없습니다 (컨트롤러 「${rt.c.name}」)`)}return null}
          const nt=n==='Play'&&a.length>=3?csN(a[2]):0;rt.st=s.id;rt.t=Math.max(0,nt)*anDur(anClip(s.clip));rt.enter=true;rt.pose=anRtPose(rt);return null}
        case'GetCurrentAnimatorStateInfo':return info(rt);
        case'HasState':{const q=csFmt(a[a.length-1]);return rt.c.states.some(x=>x.n===q)}
      }
      throw csUnsup('Animator.'+n+'()');
    }};
}

/* 인스펙터: 애니메이터 컴포넌트 */
function animatorComp(o){
  const a=o.props.animator,D=anData(),c=anCtrl(a.ctrl),rt=play&&play.anim&&play.anim.get(o.id),st=rt&&anState(rt.c,rt.st);
  return comp('ca','animator','애니메이터'+compEn('Animator'),
    fr('컨트롤러',`<select data-an="ctrl"><option value="">(없음)</option>${D.ctrls.map(x=>`<option value="${x.id}"${x.id===a.ctrl?' selected':''} data-i18n-skip>${esc(x.name)}</option>`).join('')}${a.ctrl&&!c?'<option value="'+esc(a.ctrl)+'" selected>(찾을 수 없음)</option>':''}<option value="+new">＋ 새 컨트롤러…</option></select>`,false,'runtimeAnimatorController','플레이 중 이 오브젝트의 애니메이션 흐름(상태 · 전환 · 파라미터)을 정하는 애니메이터 컨트롤러입니다. 애니메이터 창에서 편집합니다.')+
    fr('속도',num('S','data-an="speed" data-step="0.05"',a.speed==null?1:a.speed,0,10),false,'speed','애니메이션 재생 속도 배율입니다. 1이 기본, 0이면 멈춥니다. 스크립트: animator.speed')+
    (rt?fr('현재 상태 (실시간)',`<span style="font-family:var(--f-mono)" data-i18n-skip>${esc(st?st.n:'-')}</span>`,false,'state','플레이 중 지금 재생 중인 상태입니다.'):'')+
    (c?`<p class="hint" style="margin:2px 0 6px">상태 ${c.states.length}개 · 파라미터 ${c.params.map(q=>esc(q.n)).join(', ')||'없음'}</p>`:'')+
    `<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-anopen="animator">${ico('animator')} 애니메이터 창</button><button type="button" class="btn sm" data-anopen="anim">${ico('anim')} 애니메이션 창</button></div>`,
    '스프라이트를 프레임마다 바꾸거나 위치·크기·회전·투명도를 움직이는 애니메이션을 재생합니다. 어떤 클립을 언제 재생할지는 애니메이터 컨트롤러(상태와 전환)가 정하고, 스크립트는 animator.SetBool("IsMoving", true) 처럼 파라미터만 바꿉니다.');
}
/* ---- 편집 기록 (애니메이션 창 · 애니메이터 창 전용 실행 취소) ---- */
const AU={u:[],r:[]};let anFocus=false;
function anDirty(){AN_VER++;dirty=true;renderStatus();clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(true),1500)}
function anEdit(fn,keep){AU.u.push(JSON.stringify(anData()));if(AU.u.length>80)AU.u.shift();AU.r=[];fn();anDirty();if(!keep)anRenderAll(true);need()}
function anUndo(redo){
  const A=redo?AU.r:AU.u,B=redo?AU.u:AU.r;if(!A.length){toast(redo?'다시 실행할 애니메이션 작업이 없습니다':'더 이상 되돌릴 애니메이션 작업이 없습니다');return true}
  B.push(JSON.stringify(anData()));P.anim=JSON.parse(A.pop());anNormP(P);anDirty();anRenderAll(true);renderInsp();need();toast(redo?'애니메이션: 다시 실행':'애니메이션: 실행 취소');return true;
}
document.addEventListener('pointerdown',e=>{const t=e.target;anFocus=!!(t&&t.closest&&t.closest('.panel[data-id="animator"],.panel[data-id="anim"]'))},true);
function anAsk(title,label,val,fn){
  openModal(title,`<label class="fl" style="display:block;margin-bottom:6px">${esc(label)}</label><input type="text" id="anAskIn" maxlength="40" value="${esc(val)}" style="width:100%">`,
    [{t:'취소'},{t:'확인',cls:'pri',fn:()=>{const v=$('#anAskIn').value.trim();if(!v)return false;fn(v)}}]);
  const i=$('#anAskIn');if(i){i.select();i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const v=i.value.trim();if(v){closeModal();fn(v)}}})}
}
/* 빈 창 안내문: 컴포넌트 · 창 이름은 아이콘 칩으로, 문장 하나 = 한 줄 (번역은 _t 템플릿 · 칩 이름도 번역)
   anChip(아이콘, 이름) · anLines([[템플릿, {자리: 칩}], …], 작게?) */
const anChip=(ic,l)=>`<span class="cchip">${ico(ic)||ico('cube')}<b>${esc(_t(l))}</b></span>`;
const anLines=(L,sm)=>`<div class="anls${sm?' sm':''}" data-i18n-skip>${L.map(q=>`<span class="anl">${Array.isArray(q)?_t(q[0],q[1]):esc(_t(q))}</span>`).join('')}</div>`;
const AC={animator:()=>anChip('animator','애니메이터'),ctrl:()=>anChip('animator','애니메이터 컨트롤러'),clip:()=>anChip('anim','애니메이션 클립'),spr:()=>anChip('uiimg','스프라이트'),go:()=>anChip('cube','게임 오브젝트'),scene:()=>anChip('scene','씬 뷰'),hier:()=>anChip('hier','계층 구조')};
/* 「만들기」 버튼 + 옆 ? (마우스를 올리면 무엇을 만드는지 · 문장마다 한 줄) — 도움말 표시는 화면의 qb()를 따름 */
const anMk=(btn,L)=>`<span class="anmk">${btn}${qb(L.map(q=>_t(q)).join('\n'),'qwide')}</span>`;
if(window.TI18N)TI18N.onChange(()=>{try{anRenderAll(true)}catch(e){}});
if(window.TI18N)TI18N.add({
'애니메이터':['Animator','アニメーター','动画器'],'애니메이터 컨트롤러':['Animator Controller','アニメーターコントローラー','动画控制器'],'애니메이션 클립':['Animation Clip','アニメーションクリップ','动画片段'],'스프라이트':['Sprite','スプライト','精灵'],'게임 오브젝트':['GameObject','ゲームオブジェクト','游戏对象'],'씬 뷰':['Scene view','シーンビュー','场景视图'],'계층 구조':['Hierarchy','ヒエラルキー','层级'],
'{a}는 상태(클립)와 전환으로 오브젝트의 애니메이션 흐름을 정합니다.':['An {a} decides an object’s animation flow with states (clips) and transitions.','{a} は、ステート（クリップ）と遷移でオブジェクトのアニメーションの流れを決めます。','{a} 用状态（片段）和过渡决定对象的动画流程。'],
'{a} 컴포넌트에 컨트롤러가 없습니다.':['The {a} component has no controller.','{a} コンポーネントにコントローラーがありません。','{a} 组件没有控制器。'],
'애니메이션을 시작하려면 {a}와 {b}을 만드세요.':['To begin animating, create an {a} and an {b}.','アニメーションを始めるには、{a} と {b} を作成してください。','要开始制作动画，请创建 {a} 和 {b}。'],
'{a} 컴포넌트 · 컨트롤러 · 클립을 한 번에 만듭니다.':['Creates the {a} component, controller and clip at once.','{a} コンポーネント・コントローラー・クリップを一度に作ります。','一次创建 {a} 组件、控制器和片段。'],
'애니메이터 컴포넌트 · 컨트롤러 · 클립을 한 번에 만듭니다.':['Creates the Animator component, controller and clip at once.','アニメーターコンポーネント・コントローラー・クリップを一度に作ります。','一次创建动画器组件、控制器和片段。'],
'지금 스프라이트를 첫 프레임으로 넣습니다.':['The current sprite becomes the first frame.','今のスプライトを最初のフレームにします。','当前的精灵会成为第一帧。'],
'지금 {a}를 첫 프레임으로 넣습니다.':['The current {a} becomes the first frame.','今の {a} を最初のフレームにします。','当前的 {a} 会成为第一帧。'],
'새 클립을 만들면 {a}에 상태로 함께 추가됩니다.':['New clips are also added to the {a} as states.','新しいクリップは {a} にステートとしても追加されます。','新建的片段也会作为状态添加到 {a}。'],
'{a}에서 {b}를 선택하면 그 오브젝트의 클립을 편집할 수 있습니다.':['Select a {b} in the {a} to edit its clips.','{a} で {b} を選ぶと、そのオブジェクトのクリップを編集できます。','在 {a} 中选择 {b} 即可编辑它的片段。'],
'부드럽게':['Smooth','なめらか','平滑'],'부드럽게: 키 사이를 천천히 출발해 천천히 멈춥니다 (끄면 일정한 속도)':['Smooth: ease in and out between keys (off = constant speed)','なめらか: キーの間をゆっくり動き出してゆっくり止まります（オフ = 一定の速さ）','平滑：关键帧之间缓入缓出（关闭 = 匀速）'],
'편집한 클립은 {a}에서 바로 미리 볼 수 있습니다.':['Edited clips preview right away in the {a}.','編集したクリップは {a} ですぐにプレビューできます。','编辑后的片段可在 {a} 中立即预览。']
});
/* 패널이 화면에 보이는지 (접힘·숨김·다른 탭 뒤가 아님) */
const anVis=id=>{const el=panelEl[id];return!!el&&el.isConnected&&!el.classList.contains('collapsed')&&!el.classList.contains('nhide')&&el.offsetWidth>0};
function anShowPanel(id){
  if(POPPED.has(id)){try{POPPED.get(id).win.focus()}catch(e){}return}
  L.hidden[id]=false;
  if((L.center||[]).includes(id))L.cActive=id;
  else{const r=rootOf(id);if(r!==id||kidsOf(id).length)L.active[r]=id;L.collapsed[id]=false}
  if(mqN.matches)L.nActive=id;
  saveLayout();renderLayout();anRenderAll(true);
}
function anRenderAll(force){if(force)AN_VER++;try{agRender();awRender()}catch(e){console.error(e)}{const th=anTL();if(th)try{th.render()}catch(e){console.error(e)}}}
/* 선택이 바뀌면 (renderInsp 뒤) 두 창을 맞춤 */
let anSyncSig='';
function anSync(){
  const o=getSel(),sig=[o?o.id:'',o&&o.props.animator?o.props.animator.ctrl:'',AN_VER,!!play].join('|');
  if(sig===anSyncSig)return;anSyncSig=sig;anRenderAll(false);
}
/* 선택한 오브젝트 · 연결된 컨트롤러 */
const anSelObj=()=>{const o=getSel();return o&&!isUiEl(o)?o:null};
function anObjCtrl(o){return o&&o.props.animator?anCtrl(o.props.animator.ctrl):null}
function anCtrlClips(c){const ids=[];if(c)c.states.forEach(s=>{if(s.clip&&!ids.includes(s.clip)&&anClip(s.clip))ids.push(s.clip)});return ids.map(anClip)}
/* 오브젝트에 애니메이터·컨트롤러·클립을 한 번에 만들기 (유니티 Animation 창의 「만들기」) */
function anCreateFor(o){
  if(!o)return;
  anEdit(()=>{
    const d=anData();let c=anObjCtrl(o);
    if(!c){c={id:uid(),name:anUniq(d.ctrls.map(x=>x.name),o.name||'컨트롤러'),params:[],states:[],trans:[],def:null,any:{x:-80,y:-150},entry:{x:-380,y:-150}};d.ctrls.push(c)}
    const k={id:uid(),name:anUniq(d.clips.map(x=>x.name),(o.name||'클립')+'_기본'),fps:12,loop:true,tracks:[]};
    if(o.props.sprite)k.tracks.push({p:'sprite',keys:[{f:0,v:o.props.sprite}]});
    d.clips.push(k);
    const s={id:uid(),n:anUniq(c.states.map(x=>x.n),k.name.replace(/^.*_/,'')||'기본'),clip:k.id,spd:1,x:-120+c.states.length*30,y:-40+c.states.length*60};
    c.states.push(s);if(!c.def)c.def=s.id;
    if(!o.props.animator)o.props.animator={ctrl:c.id,speed:1};else o.props.animator.ctrl=c.id;
    AW.clip=k.id;AW.f=0;AG.ctrl=c.id;
  });
  commit();renderInsp();toast('애니메이터와 클립 「'+anClip(AW.clip).name+'」을(를) 만들었습니다');
}
function anNewCtrl(attach){
  anAsk('새 애니메이터 컨트롤러','컨트롤러 이름',anUniq(anData().ctrls.map(x=>x.name),'새 컨트롤러'),v=>{
    anEdit(()=>{const c={id:uid(),name:anUniq(anData().ctrls.map(x=>x.name),v),params:[],states:[],trans:[],def:null,any:{x:-80,y:-150},entry:{x:-380,y:-150}};anData().ctrls.push(c);AG.ctrl=c.id;
      if(attach&&attach.props.animator)attach.props.animator.ctrl=c.id});
    if(attach){commit();renderInsp()}
  });
}
function anNewClip(c,o){
  anAsk('새 애니메이션 클립','클립 이름',anUniq(anData().clips.map(x=>x.name),(o?o.name+'_':'')+'새 클립'),v=>{
    anEdit(()=>{const k={id:uid(),name:anUniq(anData().clips.map(x=>x.name),v),fps:12,loop:true,tracks:[]};anData().clips.push(k);AW.clip=k.id;AW.f=0;
      if(c){const s={id:uid(),n:anUniq(c.states.map(x=>x.n),v),clip:k.id,spd:1,x:-120+c.states.length*24,y:-40+c.states.length*56};c.states.push(s);if(!c.def)c.def=s.id}});
  });
}
function anDelClip(k){
  if(!k)return;const used=anData().ctrls.filter(c=>c.states.some(s=>s.clip===k.id));
  openModal('클립 삭제',`<p style="margin:0"><b data-i18n-skip>${esc(k.name)}</b> 클립을 삭제합니다.${used.length?`<br><span class="hint">이 클립을 쓰는 상태 ${used.reduce((n,c)=>n+c.states.filter(s=>s.clip===k.id).length,0)}개는 모션이 비게 됩니다.</span>`:''}</p>`,
    [{t:'취소'},{t:'삭제',cls:'danger',fn:()=>anEdit(()=>{const d=anData();d.clips=d.clips.filter(x=>x!==k);d.ctrls.forEach(c=>c.states.forEach(s=>{if(s.clip===k.id)s.clip=''}));if(AW.clip===k.id)AW.clip=null})}]);
}
function anDelCtrl(c){
  if(!c)return;let n=0;P.maps.forEach(m=>m.objs.forEach(o=>{if(o.props&&o.props.animator&&o.props.animator.ctrl===c.id)n++}));
  openModal('컨트롤러 삭제',`<p style="margin:0"><b data-i18n-skip>${esc(c.name)}</b> 컨트롤러를 삭제합니다. 클립은 남습니다.${n?`<br><span class="hint">이 컨트롤러를 쓰는 애니메이터 ${n}개는 컨트롤러가 비게 됩니다.</span>`:''}</p>`,
    [{t:'취소'},{t:'삭제',cls:'danger',fn:()=>anEdit(()=>{const d=anData();d.ctrls=d.ctrls.filter(x=>x!==c);if(d.heroCtrl===c.id)delete d.heroCtrl;if(AG.ctrl===c.id)AG.ctrl=null})}]);
}
/* 캔버스 색 (다크·라이트 테마) */
const anLight=()=>document.documentElement.dataset.theme==='light';
function anCol(){const L0=anLight();return L0?{bg:'#eceef3',grid:'rgba(0,0,0,.06)',grid2:'rgba(0,0,0,.11)',node:'#ffffff',nodeT:'#1d1d24',line:'#59607a',sub:'#6b6b78',row:'rgba(0,0,0,.035)',ruler:'#e2e4ea',key:'#3b4157',dim:'rgba(0,0,0,.07)'}
  :{bg:'#18181d',grid:'rgba(255,255,255,.035)',grid2:'rgba(255,255,255,.07)',node:'#3a3c47',nodeT:'#f2f2f5',line:'#c7cbe0',sub:'#9b9ba6',row:'rgba(255,255,255,.025)',ruler:'#222228',key:'#d6d9e8',dim:'rgba(0,0,0,.28)'}}
function anFitCanvas(cv){const w=cv.parentElement.clientWidth,h=cv.parentElement.clientHeight,d=winOf(cv).devicePixelRatio||1;if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.max(1,Math.round(w*d));cv.height=Math.max(1,Math.round(h*d));cv.style.width=w+'px';cv.style.height=h+'px'}return{w,h,d}}
function anRR(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

/* ======================= 애니메이터 창 (상태 머신 그래프) ======================= */
const AG={ctrl:null,sel:null,hov:null,view:{},drag:null,link:null,mouse:null,side:true,sideN:false};
const AG_NW=160,AG_NH=38;
function agCtrl(){
  const o=anSelObj(),oc=anObjCtrl(o);if(oc){AG.ctrl=oc.id;return oc}
  let c=anCtrl(AG.ctrl);if(!c){c=anData().ctrls[0]||null;AG.ctrl=c?c.id:null}return c;
}
/* 플레이 중 이 컨트롤러로 움직이는 오브젝트의 런타임 (선택한 오브젝트 우선) */
function agRt(c){
  if(!play||!play.anim||!c)return null;const m=play.m,o=anSelObj();
  if(o&&o.props.animator&&o.props.animator.ctrl===c.id){const r=anRt(m,o);if(r)return r}
  for(const q of m.objs)if(q.props&&q.props.animator&&q.props.animator.ctrl===c.id&&objOn(m,q)){const r=play.anim.get(q.id);if(r)return r}
  return null;
}
function agNodes(c){
  const n=[{k:'entry',id:'entry',x:c.entry.x,y:c.entry.y,n:'Entry'},{k:'any',id:'any',x:c.any.x,y:c.any.y,n:'Any State'}];
  c.states.forEach(s=>n.push({k:'st',id:s.id,x:s.x,y:s.y,n:s.n,s}));return n;
}
const agV=c=>AG.view[c.id]||(AG.view[c.id]={z:1,ox:0,oy:0,fit:true});
function agFit(c){
  const cv=$('#agCv');if(!cv||!c)return;const w=cv.parentElement.clientWidth,h=cv.parentElement.clientHeight;if(!w||!h)return;
  const ns=agNodes(c);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ns.forEach(q=>{x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x+AG_NW);y1=Math.max(y1,q.y+AG_NH)});
  const v=agV(c),z=clamp(Math.min((w-40)/Math.max(1,x1-x0),(h-40)/Math.max(1,y1-y0)),.35,1.1);v.z=z;v.ox=w/2-(x0+x1)/2*z;v.oy=h/2-(y0+y1)/2*z;v.cw=w;v.ch=h;v.fit=false;v.auto=true;agDraw();
}
/* 파라미터(왼쪽) · 상태(오른쪽) 패널 너비: 경계를 끌어 조절하고 기억합니다 */
/* 패널 너비 저장 키 — 학습 화면은 따로 (over.AGW_KEY) */
const AGW_KEY=OWN.call(over,'AGW_KEY')?over.AGW_KEY:'thaniya.animator.panels.v1';
const AGW={side:0,prop:0};
try{const v=JSON.parse(localStorage.getItem(AGW_KEY));if(v){if(v.side>=100)AGW.side=+v.side;if(v.prop>=120)AGW.prop=+v.prop}}catch(e){}
function agRender(){
  const box=$('#agBox');if(!box||!anVis('animator'))return;
  const c=agCtrl(),o=anSelObj(),D=anData();
  const linked=o&&o.props.animator&&c&&o.props.animator.ctrl===c.id;
  box.innerHTML=`<div class="agwin${AG.side?'':' noside'}${AG.sideN?' sideon':''}${AG.sel?' hassel':''}" style="${AGW.side?`--agsw:${AGW.side}px;`:''}${AGW.prop?`--agpw:${AGW.prop}px;`:''}">
    <div class="antop">
      <button class="ib" data-ag="side" title="파라미터 목록 보이기/숨기기" aria-label="파라미터 목록">${ico('list')}</button>
      <select data-ag="pick" aria-label="애니메이터 컨트롤러" title="편집할 애니메이터 컨트롤러">${D.ctrls.length?'':'<option value="">(컨트롤러 없음)</option>'}${D.ctrls.map(x=>`<option value="${x.id}"${c&&x.id===c.id?' selected':''} data-i18n-skip>${esc(x.name)}</option>`).join('')}</select>
      <button class="btn sm" data-ag="new" title="새 애니메이터 컨트롤러">＋ 컨트롤러</button>
      <button class="ib" data-ag="menu" title="컨트롤러 메뉴" aria-label="컨트롤러 메뉴">${ico('more')}</button>
      <span class="ancrumb">Base Layer</span>
      <span class="spacer"></span>
      ${o?`<span class="anchip${linked?' on':''}" title="${linked?'선택한 오브젝트가 이 컨트롤러를 씁니다':'선택한 오브젝트에는 이 컨트롤러가 연결되어 있지 않습니다'}">${ico('cube')}<span data-i18n-skip>${esc(o.name)}</span></span>`:''}
      <button class="btn sm" data-ag="fit" title="모든 상태가 보이게 맞춤 (F)">맞춤</button>
    </div>
    <div class="agmain">
      <aside class="agside">${c?agParamsHtml(c):''}</aside><div class="agrz" data-rz="side" role="separator" aria-orientation="vertical" title="끌어서 파라미터 패널 너비 조절"></div>
      <div class="agcv" id="agCvWrap" tabindex="0"><canvas id="agCv"></canvas>
        ${c?`<div class="aghint">우클릭: 상태 만들기 · 상태 우클릭: 전환 만들기 · 드래그: 이동 · 휠: 확대 · 더블클릭: 클립 편집</div>`:`<div class="anempty"><b>애니메이터 컨트롤러가 없습니다</b>${anLines([['{a}는 상태(클립)와 전환으로 오브젝트의 애니메이션 흐름을 정합니다.',{a:AC.ctrl()}]])}<button class="btn pri sm" data-ag="new">＋ 새 컨트롤러</button></div>`}
      </div>
      <div class="agrz" data-rz="prop" role="separator" aria-orientation="vertical" title="끌어서 상태 패널 너비 조절"></div><aside class="agprop" id="agProp">${c?agPropHtml(c):''}</aside>
    </div></div>`;
  const v=c&&agV(c);
  requestAnimationFrame(()=>{if(c&&v.fit)agFit(c);else agDraw()});
}
function agParamsHtml(c){
  const rt=agRt(c);
  return`<div class="aghd"><b>파라미터</b>${rt?'<i class="anlive">실시간</i>':''}<span class="spacer"></span><button class="ib" data-ag="addp" title="파라미터 추가" aria-label="파라미터 추가">${ico('plus')}</button></div>
  <div class="agplist">${c.params.length?c.params.map((q,i)=>{const v=rt?rt.prm[q.n]:q.d,
      ed=q.t==='bool'||q.t==='trigger'?`<input type="checkbox" class="${q.t==='trigger'?'trig':''}" data-agp="v" data-i="${i}"${v?' checked':''} title="${q.t==='trigger'?'트리거 (전환이 일어나면 저절로 꺼짐)':'참/거짓'}">`
        :`<input type="number" data-agp="v" data-i="${i}" step="${q.t==='int'?1:'any'}" value="${q.t==='int'?Math.round(+v||0):+(+v||0).toFixed(3)}">`;
      return`<div class="agp"><span class="agpt t-${q.t}" title="${AN_PT[q.t]}">${AN_PT[q.t][0]}</span><input type="text" class="agpn" data-agp="n" data-i="${i}" value="${esc(q.n)}" maxlength="40" spellcheck="false" aria-label="파라미터 이름" data-i18n-skip>${ed}<button class="ib" data-agp="x" data-i="${i}" title="파라미터 삭제" aria-label="파라미터 삭제">${ico('x')}</button></div>`}).join('')
    :'<p class="hint">＋로 Float · Int · Bool · Trigger 파라미터를 추가하세요. 스크립트에서 animator.SetBool("이름", true) 처럼 값을 바꾸면 전환 조건에 쓰입니다.</p>'}</div>
  ${rt?'<p class="hint" style="margin:6px 8px">플레이 중에는 지금 값을 보여 주고, 바꾸면 바로 반영됩니다.</p>':''}`;
}
/* 조건 한 줄 요약: IsMoving = true · Dir == 2 · Speed > 0.1 · Jump ⚡ */
function agCondTxt(c,q){const d=c.params.find(x=>x.n===q.p);if(!d)return q.p+' ?';
  if(d.t==='trigger')return q.p+' ⚡';if(d.t==='bool')return q.p+' = '+(q.op==='false'?'false':'true');
  return q.p+' '+({gt:'>',lt:'<',eq:'==',ne:'!='}[q.op]||'?')+' '+(+q.v)}
function agTrBtn(c,t,label){
  const cs=t.conds.map(q=>`<i data-i18n-skip>${esc(agCondTxt(c,q))}</i>`).join('')+(t.exit?`<i>${esc(_t('종료 시간'))} ${t.et}</i>`:'')||`<i class="none">${esc(_t(t.exit?'조건 없음':'조건 없음 · 일어나지 않음'))}</i>`;
  return`<button class="agtr${!t.exit&&!t.conds.length?' warn':''}" data-agsel="${t.id}"><span data-i18n-skip>${esc(label||agTrName(c,t))}</span><span class="agcs">${cs}</span></button>`}
const agTrName=(c,t)=>(t.a==='any'?'Any State':(anState(c,t.a)||{}).n||'?')+' → '+((anState(c,t.b)||{}).n||'?');
/* 클립 썸네일: 첫 스프라이트 키 (없으면 ▶ 표시) → 데이터 URL */
function clipThumbURL(k,W,f){
  const cv=document.createElement('canvas');cv.width=cv.height=W;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  let done=false;
  if(k){const t=k.tracks.find(x=>x.p==='sprite'&&x.keys.length);const sr=t&&spriteRef(f==null?t.keys[0].v:anValAt(t,f));
    if(sr){const r=sr.r;let sc=Math.min(W/r.w,W/r.h);if(sc>=1)sc=Math.floor(sc);const w=Math.max(1,Math.round(r.w*sc)),h=Math.max(1,Math.round(r.h*sc));g.drawImage(sr.a.img,r.x,r.y,r.w,r.h,(W-w)>>1,(W-h)>>1,w,h);done=true}}
  if(!done){g.fillStyle='rgba(128,128,140,.28)';g.beginPath();g.moveTo(W*.38,W*.3);g.lineTo(W*.72,W*.5);g.lineTo(W*.38,W*.7);g.closePath();g.fill()}
  return cvURL(cv);
}
/* file:// 로 열면 PNG 파일 그림이 캔버스를 「오염」시켜 toDataURL이 막힘 → 빈 그림으로 대신 (창 전체가 비지 않게) */
function cvURL(cv){try{return cv.toDataURL()}catch(e){return'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='}}
/* 클립 선택 창 (애니메이터 · 애니메이션 창 공용): groups=[{title?,clips:[]}] · 카드에 마우스를 올리면 재생 */
function clipPickerModal(groups,cur,o,onPick){
  openModal('모션 (클립) 선택',`<input type="search" id="tpQ" placeholder="이름으로 찾기" aria-label="클립 이름으로 찾기" style="width:100%;margin-bottom:8px"><div id="tpList"></div>`,[{t:'닫기'}]);
  const mo=$('#modal .modal');if(mo)mo.classList.add('wide','tpfix');
  const list=$('#tpList');
  const card=(id,k,name,sub)=>`<button type="button" class="tpi${id===(cur||'')?' on':''}" data-clip="${id}" title="${esc(name)}"><img alt="" src="${clipThumbURL(k,176)}"><span class="tn" data-i18n-skip>${esc(name)}</span><small>${sub}</small></button>`;
  const info=k=>anLen(k)+'프레임 · '+(k.fps||12)+'fps'+(k.loop?' · 반복':'');
  const draw=()=>{
    const q=($('#tpQ').value||'').trim().toLowerCase();let h='';
    if(o.none&&!q)h+=`<div class="tpgrid">${card('',null,_t('(없음)'),'모션 없음')}</div>`;
    groups.forEach(g=>{const it=g.clips.filter(k=>!q||k.name.toLowerCase().includes(q));if(!it.length)return;
      h+=(g.title?`<div class="tpsec">${esc(_t(g.title))}</div>`:'')+'<div class="tpgrid">'+it.map(k=>card(k.id,k,k.name,info(k))).join('')+'</div>'});
    if(o.add&&!q)h+=`<div class="tpgrid" style="margin-top:8px"><button type="button" class="tpi" data-clip="+new"><img alt="" src="${clipThumbURL(null,176)}"><span class="tn">＋ 새 클립…</span><small>새로 만들기</small></button></div>`;
    list.innerHTML=h||'<div class="tpnone">찾는 클립이 없습니다</div>';
    const all=groups.flatMap(g=>g.clips);
    list.querySelectorAll('.tpi[data-clip]').forEach(b=>{
      const k=all.find(x=>x.id===b.dataset.clip),im=b.querySelector('img');if(!k||!im||!k.tracks.some(t=>t.p==='sprite'&&t.keys.length>1))return;
      const home=im.src;let tm=0;const cache=new Map();
      const stop=()=>{clearInterval(tm);tm=0;im.src=home};
      b.addEventListener('pointerenter',()=>{
        if(tm)return;let f=0;const L=anLen(k);
        const tick=()=>{if(!im.isConnected){clearInterval(tm);tm=0;return}
          let u=cache.get(f);if(!u){u=clipThumbURL(k,176,f);cache.set(f,u)}im.src=u;f=k.loop===false?Math.min(f+1,L-1):(f+1)%L};
        tick();tm=setInterval(tick,Math.max(30,1000/Math.max(1,k.fps||12)));
      });
      b.addEventListener('pointerleave',stop);b.addEventListener('blur',stop);
    });
  };
  draw();$('#tpQ').addEventListener('input',draw);
  list.addEventListener('click',e=>{const b=e.target.closest('[data-clip]');if(!b)return;closeModal();onPick(b.dataset.clip)});
}
function openClipPicker(c,s){
  clipPickerModal([{clips:anData().clips}],s.clip||'',{none:true,add:true},v=>{
    if(v==='+new'){anAsk('새 애니메이션 클립','클립 이름',anUniq(anData().clips.map(x=>x.name),s.n),n=>anEdit(()=>{const kk={id:uid(),name:anUniq(anData().clips.map(x=>x.name),n),fps:12,loop:true,tracks:[]};anData().clips.push(kk);s.clip=kk.id;AW.clip=kk.id}));return}
    anEdit(()=>{s.clip=v});
  });
}
/* 스프라이트 썸네일 · 선택 창 */
function spriteThumbURL(ref,W){
  const cv=document.createElement('canvas');cv.width=cv.height=W;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;const sr=spriteRef(ref);
  if(sr){const r=sr.r;let sc=Math.min(W/r.w,W/r.h);if(sc>=1)sc=Math.floor(sc);const w=Math.max(1,Math.round(r.w*sc)),h=Math.max(1,Math.round(r.h*sc));g.drawImage(sr.a.img,r.x,r.y,r.w,r.h,(W-w)>>1,(W-h)>>1,w,h)}
  return cvURL(cv);
}
const sprName=ref=>{if(!ref)return _t('(없음)');const sr=spriteRef(ref);return sr?sr.r.name||sr.a.name:_t('(찾을 수 없음)')};
function spritePickerModal(cur,onPick){
  openModal('스프라이트 선택',`<div class="tpwrap"><nav class="tptree" id="tpTree" aria-label="폴더"></nav><div class="tpmain"><input type="search" id="tpQ" placeholder="이름으로 찾기 (모든 폴더에서)" aria-label="스프라이트 이름으로 찾기" style="width:100%;margin-bottom:8px"><div id="tpList"></div></div></div>`,[{t:'닫기'}]);
  const mo=$('#modal .modal');if(mo)mo.classList.add('wide','tpfix');
  const list=$('#tpList'),tree=$('#tpTree');
  const as=assets.filter(a=>a.kind==='sprite'||slCount(a)).sort(byName);
  const ca=cur&&byId.get(refAid(cur)),f0=ca?folderOf(ca):null;
  let fol=f0&&P.afolders.some(f=>f.id===f0)?f0:null;   /* null = Assets 전체 */
  const inF=(a,id)=>{if(!id)return true;const f=folderOf(a);return !!f&&descFolders(id).includes(f)};
  const card=(ref,name,sub)=>`<button type="button" class="tpi${ref===(cur||'')?' on':''}" data-spr="${esc(ref)}" title="${esc(name)}"><img alt="" src="${spriteThumbURL(ref,176)}"><span class="tn" data-i18n-skip>${esc(name)}</span><small>${sub}</small></button>`;
  const drawTree=()=>{
    const node=(id,name,d,icon)=>`<button type="button" class="tpnode${fol===id?' on':''}" style="--d:${d}" data-fid="${id||''}">${icon}<span class="tnm" data-i18n-skip>${name}</span><small>${as.filter(a=>inF(a,id)).length}</small></button>`;
    const rec=(pid,d)=>subFolders(pid).map(f=>node(f.id,esc(f.name),d,ico('folder'))+rec(f.id,d+1)).join('');
    tree.innerHTML=node(null,'Assets',0,ico('folder'))+rec(null,1);
  };
  const draw=()=>{
    const q=($('#tpQ').value||'').trim().toLowerCase();let h='';
    if(!q)h+=`<div class="tpgrid">${card('',_t('(없음)'),'스프라이트 없음')}</div>`;
    as.filter(a=>q||inF(a,fol)).forEach(a=>{
      const sl=a.mode==='multiple'?(a.slices||[]):[];
      if(!sl.length){if(q&&!a.name.toLowerCase().includes(q))return;h+=`<div class="tpgrid" style="margin-top:8px">${card(a.id,a.name,a.w+'×'+a.h)}</div>`;return}
      const it=sl.filter(r=>!q||r.name.toLowerCase().includes(q)||a.name.toLowerCase().includes(q));if(!it.length)return;
      h+=`<div class="tpsec" data-i18n-skip>${esc(a.name)}</div><div class="tpgrid">`+it.map(r=>card(a.id+':'+r.id,r.name,r.w+'×'+r.h)).join('')+'</div>';
    });
    list.innerHTML=h;
  };
  drawTree();draw();$('#tpQ').addEventListener('input',draw);
  tree.addEventListener('click',e=>{const b=e.target.closest('[data-fid]');if(!b)return;fol=b.dataset.fid||null;$('#tpQ').value='';drawTree();draw()});
  list.addEventListener('click',e=>{const b=e.target.closest('[data-spr]');if(!b)return;closeModal();onPick(b.dataset.spr)});
}
function agPropHtml(c){
  const S=AG.sel,clips=anData().clips;
  if(S&&S.k==='st'){const s=anState(c,S.id);if(!s){AG.sel=null;return agPropHtml(c)}
    const out=c.trans.filter(t=>t.a===s.id),inc=c.trans.filter(t=>t.b===s.id&&t.a!==s.id);
    return`<div class="aghd"><b>상태</b><span class="spacer"></span>${c.def===s.id?'<i class="andef">기본 상태</i>':`<button class="btn sm" data-ag="def">기본으로</button>`}</div>
    <div class="agform">
      <label>이름<input type="text" data-ags="n" value="${esc(s.n)}" maxlength="40" data-i18n-skip></label>
      <div class="agclipf"><span style="font-size:11px;color:var(--mute)">모션 (클립)</span>${(()=>{const k=clips.find(x=>x.id===s.clip);return`<button type="button" class="tpbtn" data-agclip aria-label="모션 (클립) 선택" title="모션 (클립) 선택"><img alt="" src="${clipThumbURL(k,64)}"><span class="tpn"><b data-i18n-skip>${k?esc(k.name):esc(_t('(없음)'))}</b><small>${k?anLen(k)+'프레임 · '+(k.fps||12)+'fps':'클립 선택'}</small></span><svg class="tpc" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>`})()}</div>
      <label>속도<input type="number" data-ags="spd" step="0.1" value="${s.spd==null?1:s.spd}"></label>
      <label class="chk" title="반복하지 않는 클립을 끝까지 재생하는 동안 Any State에서 나가는 전환이 이 상태를 끊지 않습니다 (한 번짜리 동작용)"><input type="checkbox" data-ags="lock"${s.lock?' checked':''}>끝까지 재생 (Any State 전환이 끊지 않음)</label>
      <button class="btn sm" data-ag="editclip"${s.clip?'':' disabled'}>애니메이션 창에서 편집</button>
      <div class="agsub">나가는 전환 (${out.length})</div>
      ${out.map(t=>agTrBtn(c,t)).join('')}
      <button class="btn sm" data-ag="link">＋ 전환 만들기</button>
      <div class="agsub">들어오는 전환 (${inc.length})</div>
      ${inc.length?inc.map(t=>agTrBtn(c,t)).join(''):'<p class="hint">다른 상태나 Any State를 우클릭해 「전환 만들기」로 이 상태와 잇습니다.</p>'}
      <p class="hint">전환을 누르면 파라미터 조건을 정할 수 있습니다.</p>
      <button class="btn sm danger" data-ag="del">상태 삭제</button>
    </div>`}
  if(S&&S.k==='tr'){const t=c.trans.find(x=>x.id===S.id);if(!t){AG.sel=null;return agPropHtml(c)}
    const warn=!t.exit&&!t.conds.length;
    return`<div class="aghd"><b>전환</b></div>
    <div class="agform">
      <div class="agtrh" data-i18n-skip>${esc(agTrName(c,t))}</div>
      ${(()=>{const sib=c.trans.filter(x=>x.a===t.a&&x.b===t.b);return sib.length>1?`<div class="agsub">같은 화살표의 전환 ${sib.length}개</div>${sib.map(x=>agTrBtn(c,x,(x===t?'● ':'')+agTrName(c,x))).join('')}`:''})()}
      ${t.a!=='any'?`<label class="chk"><input type="checkbox" data-agt="exit"${t.exit?' checked':''}>종료 시간 사용 (Has Exit Time)</label>
      ${t.exit?`<label>종료 시간 (클립 길이 기준)<input type="number" data-agt="et" step="0.05" min="0" value="${t.et}"></label>`:''}`
      :`<label class="chk"><input type="checkbox" data-agt="self"${t.self?' checked':''}>자기 자신으로 전환 허용</label>`}
      <div class="agsub">조건 (모두 만족해야 함)</div>
      <div class="agconds">${t.conds.map((q,i)=>{const d=c.params.find(x=>x.n===q.p),ops=AN_OPS[d?d.t:'float'];
        return`<div class="agcond">${d?`<span class="agpt t-${d.t}" title="${AN_PT[d.t]}">${AN_PT[d.t][0]}</span>`:''}<select data-agc="p" data-i="${i}" aria-label="파라미터">${d?'':`<option value="${esc(q.p)}" selected>${esc(q.p)} (없음)</option>`}${c.params.map(x=>`<option value="${esc(x.n)}"${x.n===q.p?' selected':''} data-i18n-skip>${esc(x.n)}</option>`).join('')}</select>
          ${d&&d.t==='trigger'?'<span class="agtrig">발동되면</span>':d?`<select data-agc="op" data-i="${i}" aria-label="비교">${ops.map(o2=>`<option value="${o2[0]}"${o2[0]===q.op?' selected':''}>${o2[1]}</option>`).join('')}</select>`:''}
          ${d&&(d.t==='float'||d.t==='int')?`<input type="number" data-agc="v" data-i="${i}" step="${d.t==='int'?1:'any'}" value="${q.v}" aria-label="값">`:''}
          <button class="ib" data-agc="x" data-i="${i}" title="조건 삭제" aria-label="조건 삭제">${ico('x')}</button></div>`}).join('')||'<p class="hint" style="margin:0">아직 조건이 없습니다.</p>'}</div>
      <button class="btn sm" data-ag="addc">＋ 조건 추가</button>
      ${warn?'<p class="anwarn">조건이 없고 종료 시간도 꺼져 있어 이 전환은 일어나지 않습니다.</p>':''}
      <p class="hint">${t.a==='any'?'Any State 전환은 지금 어떤 상태에 있든 조건이 맞으면 곧바로 넘어갑니다.':t.exit?'종료 시간 1 = 클립을 한 번 다 재생한 뒤. 조건도 있으면 그 시점에 조건을 확인합니다.':'조건이 맞는 순간 곧바로 넘어갑니다.'}</p>
      <button class="btn sm danger" data-ag="del">전환 삭제</button>
    </div>`}
  if(S&&S.k==='any'){const out=c.trans.filter(t=>t.a==='any');
    return`<div class="aghd"><b>Any State</b></div><div class="agform"><p class="hint">어떤 상태에서든 조건이 맞으면 곧바로 넘어가는 전환입니다. 전환을 누르면 파라미터 조건을 정할 수 있습니다.</p>
      <div class="agsub">전환 (${out.length})</div>${out.map(t=>agTrBtn(c,t,'→ '+((anState(c,t.b)||{}).n||'?'))).join('')}
      <button class="btn sm" data-ag="link">＋ 전환 만들기</button></div>`}
  if(S&&S.k==='entry')return`<div class="aghd"><b>Entry</b></div><div class="agform"><p class="hint">플레이를 시작하면 기본 상태(주황색)부터 재생합니다. 다른 상태를 우클릭해 「기본 상태로 지정」으로 바꿀 수 있습니다.</p></div>`;
  return`<div class="aghd"><b>컨트롤러</b></div><div class="agform">
    <label>이름<input type="text" data-agk="name" value="${esc(c.name)}" maxlength="40" data-i18n-skip></label>
    <p class="hint">상태 ${c.states.length}개 · 전환 ${c.trans.length}개 · 파라미터 ${c.params.length}개</p>
    <p class="hint">상태를 클릭하면 이름·클립·속도를, 화살표(전환)를 클릭하면 조건을 고칩니다. 게임 오브젝트에 쓰려면 인스펙터의 애니메이터 컴포넌트에서 이 컨트롤러를 고르세요.</p></div>`;
}
function agDraw(){
  const cv=$('#agCv');if(!cv||!cv.isConnected)return;const c=agCtrl();const{w,h,d}=anFitCanvas(cv);const g=cv.getContext('2d'),C=anCol();
  g.setTransform(d,0,0,d,0,0);g.fillStyle=C.bg;g.fillRect(0,0,w,h);if(!c)return;
  const v=agV(c);
  /* 캔버스 크기가 바뀌면(속성 칸이 열리고 닫힘 · 패널 크기 조절) 보던 가운데를 유지 */
  /* 맞춤으로 본 뒤 직접 옮기거나 확대하지 않았으면 → 창 크기에 맞춰 다시 맞춤 (창을 키우면 그래프도 커짐) */
  if(v.auto&&v.cw&&v.ch&&(v.cw!==w||v.ch!==h)){agFit(c);return}
  if(v.cw&&v.ch&&(v.cw!==w||v.ch!==h)){v.ox+=(w-v.cw)/2;v.oy+=(h-v.ch)/2}v.cw=w;v.ch=h;
  const z=v.z;
  /* 격자 */
  const st=20*z;if(st>=6){g.lineWidth=1;for(const[k,col]of[[1,C.grid],[5,C.grid2]]){g.strokeStyle=col;g.beginPath();const s2=st*k,x0=((v.ox%s2)+s2)%s2,y0=((v.oy%s2)+s2)%s2;for(let x=x0;x<w;x+=s2){g.moveTo(Math.round(x)+.5,0);g.lineTo(Math.round(x)+.5,h)}for(let y=y0;y<h;y+=s2){g.moveTo(0,Math.round(y)+.5);g.lineTo(w,Math.round(y)+.5)}g.stroke()}}
  g.save();g.translate(v.ox,v.oy);g.scale(z,z);
  const ns=agNodes(c),pos=id=>{const q=ns.find(x=>x.id===id);return q?{x:q.x+AG_NW/2,y:q.y+AG_NH/2}:null};
  const acc=css('--accent')||'#e9bd0c',rt=agRt(c);
  /* 전환 화살표 */
  const segs=agSegs(c);
  /* 굵기 · 화살표는 화면 픽셀 기준 (축소해도 얇아지지 않게) */
  const px=1/z,hovT=AG.hov&&AG.hov.k==='tr'?AG.hov.id:null;
  segs.forEach(sg=>{const on=AG.sel&&AG.sel.k==='tr'&&sg.all.some(t=>t.id===AG.sel.id);const hv=!on&&sg.all.some(t=>t.id===hovT);
    const base=sg.t.a==='any'?(anLight()?'#2d8d78':'#7fd8c4'):C.line;
    if(on||hv){g.strokeStyle=on?'rgba(233,189,12,.28)':'rgba(255,255,255,.16)';g.lineWidth=9*px;g.lineCap='round';g.beginPath();g.moveTo(sg.x0,sg.y0);g.lineTo(sg.x1,sg.y1);g.stroke();g.lineCap='butt'}
    g.strokeStyle=on?acc:hv?(anLight()?'#111':'#fff'):base;g.lineWidth=(on?3:hv?2.4:1.6)*px;
    g.beginPath();g.moveTo(sg.x0,sg.y0);g.lineTo(sg.x1,sg.y1);g.stroke();
    const mx=(sg.x0+sg.x1)/2,my=(sg.y0+sg.y1)/2,a=Math.atan2(sg.y1-sg.y0,sg.x1-sg.x0),r=(on||hv?8:7)*px;
    g.fillStyle=g.strokeStyle;g.beginPath();g.moveTo(mx+Math.cos(a)*r,my+Math.sin(a)*r);g.lineTo(mx+Math.cos(a+2.4)*r,my+Math.sin(a+2.4)*r);g.lineTo(mx+Math.cos(a-2.4)*r,my+Math.sin(a-2.4)*r);g.closePath();g.fill();
    if(sg.n>1){g.font='600 '+(10*px).toFixed(1)+'px '+css('--f-mono');g.fillText('×'+sg.n,mx+8*px,my-6*px)}
  });
  /* Entry → 기본 상태 */
  {const a=pos('entry'),b=c.def&&pos(c.def);if(a&&b){g.strokeStyle='#e8913a';g.lineWidth=1.8;const e=agEdge(a,b);g.beginPath();g.moveTo(e.x0,e.y0);g.lineTo(e.x1,e.y1);g.stroke();const mx=(e.x0+e.x1)/2,my=(e.y0+e.y1)/2,an=Math.atan2(e.y1-e.y0,e.x1-e.x0);g.fillStyle='#e8913a';g.beginPath();g.moveTo(mx+Math.cos(an)*7,my+Math.sin(an)*7);g.lineTo(mx+Math.cos(an+2.4)*7,my+Math.sin(an+2.4)*7);g.lineTo(mx+Math.cos(an-2.4)*7,my+Math.sin(an-2.4)*7);g.fill()}}
  /* 전환 만드는 중 */
  if(AG.link&&AG.mouse){const a=pos(AG.link);if(a){g.strokeStyle=acc;g.setLineDash([5,4]);g.lineWidth=1.8;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(AG.mouse.x,AG.mouse.y);g.stroke();g.setLineDash([])}}
  /* 노드 */
  g.textAlign='center';g.textBaseline='middle';
  ns.forEach(q=>{
    const sel=AG.sel&&AG.sel.id===q.id,isDef=q.k==='st'&&q.id===c.def,cur=rt&&q.id===rt.st;
    const fill=q.k==='entry'?'#3f9d4a':q.k==='any'?'#2f9a86':isDef?'#c46a1a':C.node;
    g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=8;g.shadowOffsetY=2;
    anRR(g,q.x,q.y,AG_NW,AG_NH,8);g.fillStyle=fill;g.fill();g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetY=0;
    if(cur){g.strokeStyle='#4aa3ff';g.lineWidth=2.5;g.stroke()}
    if(sel){g.strokeStyle=acc;g.lineWidth=2.5;anRR(g,q.x-3,q.y-3,AG_NW+6,AG_NH+6,10);g.stroke()}
    const fs=12/Math.max(.55,Math.min(1,z));g.fillStyle=q.k==='st'&&!isDef?C.nodeT:'#fff';g.font='600 '+fs.toFixed(1)+'px '+css('--f-body');
    let nm=q.n;while(g.measureText(nm).width>AG_NW-16&&nm.length>2)nm=nm.slice(0,-2)+'…';
    g.fillText(nm,q.x+AG_NW/2,q.y+AG_NH/2+(q.k==='st'&&!q.s.clip?-5:0));
    if(q.k==='st'&&!q.s.clip){g.font=(fs*.8).toFixed(1)+'px '+css('--f-body');g.fillStyle=isDef?'rgba(255,255,255,.75)':C.sub;g.fillText(_t('(모션 없음)'),q.x+AG_NW/2,q.y+AG_NH/2+9)}
    if(cur){const s=q.s,k=anClip(s.clip),dur=anDur(k),nt=dur?rt.t/dur:0,fr=k&&!k.loop?Math.min(1,nt):nt%1;
      g.fillStyle='rgba(0,0,0,.35)';g.fillRect(q.x+8,q.y+AG_NH-7,AG_NW-16,3);g.fillStyle='#4aa3ff';g.fillRect(q.x+8,q.y+AG_NH-7,(AG_NW-16)*fr,3)}
  });
  g.restore();
  if(hovT&&AG.mouse&&!AG.drag&&!AG.link)agTip(g,c,hovT,w,h,v);
}
/* 전환에 마우스를 올리면: 「A → B」 + 조건 요약 (같은 방향 전환이 여럿이면 모두) */
function agTip(g,c,id,w,h,v){
  const sg=agSegs(c).find(x=>x.all.some(t=>t.id===id));if(!sg)return;
  const L0=[];sg.all.forEach(t=>{L0.push([agTrName(c,t),1]);const cs=t.conds.map(q=>agCondTxt(c,q));if(t.exit)cs.push(_t('종료 시간')+' '+t.et);L0.push([cs.length?cs.join(' · '):_t(t.exit?'조건 없음':'조건 없음 · 일어나지 않음'),cs.length?0:2])});
  L0.push([_t('클릭: 선택해서 조건 편집'),3]);
  const fb=css('--f-body')||'sans-serif';g.font='600 11.5px '+fb;let tw=0;L0.forEach(([t,k])=>{g.font=(k===1?'600 11.5px ':'11px ')+fb;tw=Math.max(tw,g.measureText(t).width)});
  const lh=16,pw=Math.min(w-12,tw+18),ph=L0.length*lh+10;
  let x=AG.mouse.sx+14,y=AG.mouse.sy+16;if(x+pw>w-6)x=Math.max(6,AG.mouse.sx-14-pw);if(y+ph>h-6)y=Math.max(6,AG.mouse.sy-12-ph);
  g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=10;anRR(g,x,y,pw,ph,7);g.fillStyle=anLight()?'rgba(255,255,255,.97)':'rgba(20,20,24,.95)';g.fill();g.shadowColor='transparent';
  g.strokeStyle=anLight()?'rgba(0,0,0,.14)':'rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
  g.textAlign='left';g.textBaseline='middle';
  L0.forEach(([t,k],i)=>{g.font=(k===1?'600 11.5px ':'11px ')+fb;g.fillStyle=k===1?(anLight()?'#111':'#f2f2f5'):k===2?'#ef6b6b':k===3?(anLight()?'#8a6d00':'#e9bd0c'):(anLight()?'#555':'#b9b9c4');
    let tt=t;while(g.measureText(tt).width>pw-18&&tt.length>2)tt=tt.slice(0,-2)+'…';g.fillText(tt,x+9,y+5+lh*i+lh/2)});
  g.restore();
}
/* 노드 가장자리까지의 선 (중심 → 중심을 사각형 테두리에서 자름) */
function agEdge(a,b,off){
  let dx=b.x-a.x,dy=b.y-a.y;const L0=Math.hypot(dx,dy)||1,nx=-dy/L0,ny=dx/L0,o=off||0;
  const ax=a.x+nx*o,ay=a.y+ny*o,bx=b.x+nx*o,by=b.y+ny*o;
  const cut=(cx,cy,tx,ty)=>{const ddx=tx-cx,ddy=ty-cy,sx=Math.abs(ddx)>1e-6?(AG_NW/2+2)/Math.abs(ddx):1e9,sy=Math.abs(ddy)>1e-6?(AG_NH/2+2)/Math.abs(ddy):1e9,s=Math.min(sx,sy,1);return{x:cx+ddx*s,y:cy+ddy*s}};
  const p0=cut(ax,ay,bx,by),p1=cut(bx,by,ax,ay);return{x0:p0.x,y0:p0.y,x1:p1.x,y1:p1.y};
}
function agSegs(c){
  const ns=agNodes(c),pos=id=>{const q=ns.find(x=>x.id===id);return q?{x:q.x+AG_NW/2,y:q.y+AG_NH/2}:null};
  const out=[],pairs=new Map();
  c.trans.forEach(t=>{const k=t.a+'>'+t.b;if(pairs.has(k)){pairs.get(k).n++;pairs.get(k).all.push(t);return}
    const a=pos(t.a),b=pos(t.b);if(!a||!b||t.a===t.b)return;
    const rev=c.trans.some(x=>x.a===t.b&&x.b===t.a);const e=agEdge(a,b,rev?7:0);const sg=Object.assign({t,n:1,all:[t]},e);pairs.set(k,sg);out.push(sg)});
  return out;
}
function agToGraph(c,e){const cv=$('#agCv'),r=cv.getBoundingClientRect(),v=agV(c);return{sx:e.clientX-r.left,sy:e.clientY-r.top,x:(e.clientX-r.left-v.ox)/v.z,y:(e.clientY-r.top-v.oy)/v.z}}
function agHit(c,p){
  const ns=agNodes(c);for(let i=ns.length-1;i>=0;i--){const q=ns[i];if(p.x>=q.x&&p.x<=q.x+AG_NW&&p.y>=q.y&&p.y<=q.y+AG_NH)return{k:q.k,id:q.id}}
  const segs=agSegs(c);let best=null,bd=10/agV(c).z;
  segs.forEach(sg=>{const dx=sg.x1-sg.x0,dy=sg.y1-sg.y0,l2=dx*dx+dy*dy||1,u=clamp(((p.x-sg.x0)*dx+(p.y-sg.y0)*dy)/l2,0,1),d=Math.hypot(sg.x0+dx*u-p.x,sg.y0+dy*u-p.y);if(d<bd){bd=d;best={k:'tr',id:sg.t.id}}});
  return best;
}
function agLinkTo(c,from,to){
  if(!to||to.k!=='st'){toast('전환은 상태(회색·주황 사각형)에만 이을 수 있습니다');return}
  if(from===to.id){toast('같은 상태로 돌아가는 전환은 Any State에서 「자기 자신으로 전환 허용」으로 만드세요');return}
  anEdit(()=>{const t={id:uid(),a:from,b:to.id,exit:from!=='any',et:1,self:false,conds:[]};c.trans.push(t);AG.sel={k:'tr',id:t.id}});
}
function agStateMenu(c,h,e){
  const s=anState(c,h.id);
  showMenuAt(e.clientX,e.clientY,[
    {label:'전환 만들기',fn:()=>{AG.link=h.id;AG.mouse=agToGraph(c,e);agDraw();toast('이을 상태를 클릭하세요 (Esc: 취소)')}},
    {label:'기본 상태로 지정',disabled:c.def===h.id,fn:()=>anEdit(()=>{c.def=h.id})},
    {label:'이름 바꾸기…',fn:()=>anAsk('상태 이름','이름',s.n,v=>anEdit(()=>{s.n=anUniq(c.states.filter(x=>x!==s).map(x=>x.n),v)}))},
    {label:'애니메이션 창에서 클립 편집',disabled:!anClip(s.clip),fn:()=>{AW.clip=s.clip;AW.f=0;anShowPanel('anim')}},
    {label:'복제',fn:()=>anEdit(()=>{const n=Object.assign({},s,{id:uid(),n:anUniq(c.states.map(x=>x.n),s.n),x:s.x+24,y:s.y+48});c.states.push(n);AG.sel={k:'st',id:n.id}})},
    {sep:1},{label:'삭제',fn:()=>agDelete(c,{k:'st',id:h.id})}]);
}
function agBgMenu(c,e){
  const p=agToGraph(c,e),clips=anData().clips;
  const mk=k=>anEdit(()=>{const s={id:uid(),n:anUniq(c.states.map(x=>x.n),k?k.name.replace(/^.*?_(?=[^_]+_[^_]+$)/,''):'새 상태'),clip:k?k.id:'',spd:1,x:Math.round(p.x-AG_NW/2),y:Math.round(p.y-AG_NH/2)};c.states.push(s);if(!c.def)c.def=s.id;AG.sel={k:'st',id:s.id}});
  showMenuAt(e.clientX,e.clientY,[{label:'빈 상태 만들기',fn:()=>mk(null)},
    ...(clips.length?[{head:'클립으로 상태 만들기',sub:'고른 클립을 재생하는 상태'},...clips.slice(0,30).map(k=>({label:k.name,fn:()=>mk(k)}))]:[]),
    {sep:1},{label:'모두 보기 (맞춤)',fn:()=>agFit(c)}]);
}
function agDelete(c,S){
  S=S||AG.sel;if(!S)return;
  if(S.k==='st')anEdit(()=>{c.states=c.states.filter(s=>s.id!==S.id);c.trans=c.trans.filter(t=>t.a!==S.id&&t.b!==S.id);if(c.def===S.id)c.def=c.states[0]?c.states[0].id:null;AG.sel=null});
  else if(S.k==='tr')anEdit(()=>{c.trans=c.trans.filter(t=>t.id!==S.id);AG.sel=null});
}
/* 애니메이터 창 이벤트 */
(()=>{
  const pan=panelEl.animator;
  pan.addEventListener('click',e=>{
    const b=e.target.closest('[data-ag]');const c=agCtrl();
    const sl=e.target.closest('[data-agsel]');if(sl){AG.sel={k:'tr',id:sl.dataset.agsel};agRender();return}
    if(!b)return;const k=b.dataset.ag;
    if(k==='side'){const nb=$('#agBox');if(nb&&nb.clientWidth<=560)AG.sideN=!AG.sideN;else AG.side=!AG.side;agRender()}
    else if(k==='new')anNewCtrl(anSelObj()&&anSelObj().props.animator&&!anObjCtrl(anSelObj())?anSelObj():null);
    else if(k==='fit'&&c)agFit(c);
    else if(k==='menu'){showMenu(b,[{label:'새 컨트롤러…',fn:()=>anNewCtrl(null)},{label:'이름 바꾸기…',disabled:!c,fn:()=>anAsk('컨트롤러 이름','이름',c.name,v=>anEdit(()=>{c.name=v}))},
      {label:'복제',disabled:!c,fn:()=>anEdit(()=>{const n=anNormCtrl(JSON.parse(JSON.stringify(c)));n.id=uid();n.name=anUniq(anData().ctrls.map(x=>x.name),c.name+' 복사');const map={};n.states.forEach(s=>{const o=s.id;s.id=uid();map[o]=s.id});n.def=map[n.def]||null;n.trans.forEach(t=>{t.id=uid();if(t.a!=='any')t.a=map[t.a];t.b=map[t.b]});anData().ctrls.push(n);AG.ctrl=n.id})},
      {label:'선택한 오브젝트에 연결',disabled:!c||!anSelObj(),fn:()=>{const o=anSelObj();if(!o.props.animator)o.props.animator={ctrl:c.id,speed:1};else o.props.animator.ctrl=c.id;commit();renderInsp();anRenderAll(true);toast(o.name+' ← '+c.name)}},
      {sep:1},{label:'삭제…',disabled:!c,fn:()=>anDelCtrl(c)}],false)}
    else if(!c)return;
    else if(k==='addp')showMenu(b,Object.keys(AN_PT).map(t=>({label:AN_PT[t],fn:()=>anEdit(()=>{c.params.push({n:anUniq(c.params.map(x=>x.n),'New '+AN_PT[t]),t,d:t==='bool'?false:0})})})));
    else if(k==='def'&&AG.sel)anEdit(()=>{c.def=AG.sel.id});
    else if(k==='del')agDelete(c);
    else if(k==='editclip'){const s=AG.sel&&anState(c,AG.sel.id);if(s&&s.clip){AW.clip=s.clip;AW.f=0;anShowPanel('anim')}}
    else if(k==='addc'){const t=AG.sel&&c.trans.find(x=>x.id===AG.sel.id);if(!t)return;
      const add=q=>anEdit(()=>{t.conds.push({p:q.n,op:AN_OPS[q.t][0][0],v:0})});
      const mk=ty=>anAsk('새 '+AN_PT[ty]+' 파라미터','파라미터 이름',anUniq(c.params.map(x=>x.n),{bool:'IsOn',trigger:'Jump',float:'Speed',int:'State'}[ty]),v=>{
        const q={n:anUniq(c.params.map(x=>x.n),v.trim()||'Param'),t:ty,d:ty==='bool'?false:0};anEdit(()=>{c.params.push(q);t.conds.push({p:q.n,op:AN_OPS[ty][0][0],v:0})})});
      showMenu(b,[...(c.params.length?[{head:'파라미터로 조건 만들기'},...c.params.map(q=>({label:q.n+'  ('+AN_PT[q.t]+')',fn:()=>add(q)})),{sep:1}]:[]),
        {head:'새 파라미터를 만들어 조건으로'},...Object.keys(AN_PT).map(ty=>({label:'새 '+AN_PT[ty]+' 파라미터…',fn:()=>mk(ty)}))],false)}
    else if(k==='link'){const S=AG.sel;if(!S||(S.k!=='st'&&S.k!=='any'))return;AG.link=S.id;const n=S.k==='any'?c.any:anState(c,S.id);AG.mouse={x:n.x+AG_NW/2,y:n.y+AG_NH/2};agDraw();toast('이을 상태를 그래프에서 클릭하세요 (Esc: 취소)')}
  });
  pan.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-agclip]');if(!b)return;const c=agCtrl(),s=c&&AG.sel&&anState(c,AG.sel.id);if(s)openClipPicker(c,s)});
  pan.addEventListener('change',e=>{
    const t=e.target,c=agCtrl();
    if(t.dataset.ag==='pick'){AG.ctrl=t.value||null;AG.sel=null;agRender();return}
    if(!c)return;
    if(t.dataset.agp){const i=+t.dataset.i,q=c.params[i];if(!q)return;
      if(t.dataset.agp==='n'){const nn=t.value.trim();if(!nn||nn===q.n){t.value=q.n;return}const v2=anUniq(c.params.filter(x=>x!==q).map(x=>x.n),nn);anEdit(()=>{c.trans.forEach(tr=>tr.conds.forEach(cd=>{if(cd.p===q.n)cd.p=v2}));const rt=agRt(c);if(rt&&q.n in rt.prm){rt.prm[v2]=rt.prm[q.n];delete rt.prm[q.n]}q.n=v2})}
      else if(t.dataset.agp==='v'){const rt=agRt(c);const val=t.type==='checkbox'?t.checked:q.t==='int'?Math.round(+t.value||0):(+t.value||0);
        if(rt){rt.prm[q.n]=val;return}anEdit(()=>{q.d=q.t==='trigger'?false:val},true);if(q.t==='trigger')t.checked=false}
      return}
    if(t.dataset.ags){const s=AG.sel&&anState(c,AG.sel.id);if(!s)return;const k=t.dataset.ags;
      if(k==='clip'&&t.value==='+new'){t.value=s.clip||'';anAsk('새 애니메이션 클립','클립 이름',anUniq(anData().clips.map(x=>x.name),s.n),v=>anEdit(()=>{const kk={id:uid(),name:anUniq(anData().clips.map(x=>x.name),v),fps:12,loop:true,tracks:[]};anData().clips.push(kk);s.clip=kk.id;AW.clip=kk.id}));return}
      anEdit(()=>{if(k==='n')s.n=anUniq(c.states.filter(x=>x!==s).map(x=>x.n),t.value.trim()||s.n);else if(k==='clip')s.clip=t.value;else if(k==='spd')s.spd=clamp(isFinite(+t.value)?+t.value:1,-10,10);else if(k==='lock'){if(t.checked)s.lock=true;else delete s.lock}});return}
    if(t.dataset.agt){const tr=AG.sel&&c.trans.find(x=>x.id===AG.sel.id);if(!tr)return;const k=t.dataset.agt;
      anEdit(()=>{if(k==='exit')tr.exit=t.checked;else if(k==='self')tr.self=t.checked;else if(k==='et')tr.et=clamp(+t.value||0,0,100)});return}
    if(t.dataset.agc){const tr=AG.sel&&c.trans.find(x=>x.id===AG.sel.id);if(!tr)return;const i=+t.dataset.i,q=tr.conds[i];if(!q)return;const k=t.dataset.agc;
      anEdit(()=>{if(k==='p'){q.p=t.value;const d=c.params.find(x=>x.n===q.p);if(d&&!AN_OPS[d.t].some(o=>o[0]===q.op))q.op=AN_OPS[d.t][0][0]}else if(k==='op')q.op=t.value;else if(k==='v')q.v=+t.value||0});return}
    if(t.dataset.agk==='name'){const v=t.value.trim();if(v)anEdit(()=>{c.name=v})}
  });
  pan.addEventListener('click',e=>{const x=e.target.closest('[data-agp="x"],[data-agc="x"]');if(!x)return;const c=agCtrl();if(!c)return;const i=+x.dataset.i;
    if(x.dataset.agp){const q=c.params[i];if(q)anEdit(()=>{c.params.splice(i,1);c.trans.forEach(t=>{t.conds=t.conds.filter(cd=>cd.p!==q.n)})})}
    else{const tr=AG.sel&&c.trans.find(t=>t.id===AG.sel.id);if(tr)anEdit(()=>{tr.conds.splice(i,1)})}});
  /* 그래프 캔버스 */
  pan.addEventListener('pointerdown',e=>{
    const wrap=e.target.closest('#agCvWrap');if(!wrap||e.target.closest('.anempty'))return;const c=agCtrl();if(!c)return;
    wrap.focus({preventScroll:true});const p=agToGraph(c,e),v=agV(c);
    AG.hov=null;
    if(e.button===2)return;
    if(AG.link){const h=agHit(c,p);const from=AG.link;AG.link=null;if(h)agLinkTo(c,from,h);else agDraw();return}
    const h=e.button===0?agHit(c,p):null;
    if(h&&h.k!=='tr'){
      AG.sel=h;const n=h.k==='st'?anState(c,h.id):h.k==='any'?c.any:c.entry;
      AG.drag={t:'node',n,ox:n.x,oy:n.y,sx:p.x,sy:p.y,moved:false,snap:JSON.stringify(anData())};
    }else if(h){AG.sel=h;AG.drag=null}
    else{if(e.button===0&&AG.sel){AG.sel=null}AG.drag={t:'pan',sx:e.clientX,sy:e.clientY,ox:v.ox,oy:v.oy}}
    $('#agProp').innerHTML=agPropHtml(c);{const w=$('#agBox .agwin');if(w)w.classList.toggle('hassel',!!AG.sel)}agDraw();
    try{wrap.setPointerCapture(e.pointerId)}catch(_){}
  });
  pan.addEventListener('pointermove',e=>{
    const wrap=e.target.closest('#agCvWrap');const c=agCtrl();if(!c)return;
    if(AG.link&&wrap){AG.mouse=agToGraph(c,e);agDraw()}
    if(!AG.link&&!AG.drag&&wrap&&e.pointerType!=='touch'){const p=agToGraph(c,e),hh=agHit(c,p),k0=AG.hov?AG.hov.k+AG.hov.id:'',k1=hh?hh.k+hh.id:'';AG.mouse=p;
      wrap.style.cursor=hh?(hh.k==='tr'?'pointer':'grab'):'';if(k0!==k1||(hh&&hh.k==='tr')){AG.hov=hh;agDraw()}}
    const D=AG.drag;if(!D)return;
    if(D.t==='pan'){const v=agV(c);v.auto=false;v.ox=D.ox+e.clientX-D.sx;v.oy=D.oy+e.clientY-D.sy;agDraw();return}
    if(D.t==='node'){const p=agToGraph(c,e);let nx=D.ox+p.x-D.sx,ny=D.oy+p.y-D.sy;if(!e.altKey){nx=Math.round(nx/10)*10;ny=Math.round(ny/10)*10}if(nx!==D.n.x||ny!==D.n.y){D.n.x=nx;D.n.y=ny;D.moved=true;agDraw()}}
  });
  const end=()=>{const D=AG.drag;AG.drag=null;if(D&&D.t==='node'&&D.moved){AU.u.push(D.snap);AU.r=[];anDirty()}};
  pan.addEventListener('pointerup',end);pan.addEventListener('pointercancel',end);
  pan.addEventListener('pointerout',e=>{const w=e.target.closest&&e.target.closest('#agCvWrap');if(!w||(e.relatedTarget&&w.contains(e.relatedTarget)))return;if(AG.hov){AG.hov=null;w.style.cursor='';agDraw()}});
  pan.addEventListener('dblclick',e=>{if(!e.target.closest('#agCvWrap'))return;const c=agCtrl();if(!c)return;const h=agHit(c,agToGraph(c,e));
    if(h&&h.k==='st'){const s=anState(c,h.id);if(s.clip){AW.clip=s.clip;AW.f=0;anShowPanel('anim')}else toast('이 상태에는 모션(클립)이 없습니다. 오른쪽 속성에서 클립을 고르세요')}});
  pan.addEventListener('contextmenu',e=>{
    if(!e.target.closest('#agCvWrap'))return;e.preventDefault();const c=agCtrl();if(!c)return;AG.link=null;
    const h=agHit(c,agToGraph(c,e));
    if(h&&h.k==='st'){AG.sel=h;agRender();agStateMenu(c,h,e)}
    else if(h&&h.k==='any'){AG.sel=h;agDraw();showMenuAt(e.clientX,e.clientY,[{label:'전환 만들기',fn:()=>{AG.link='any';AG.mouse=agToGraph(c,e);agDraw();toast('이을 상태를 클릭하세요 (Esc: 취소)')}}])}
    else if(h&&h.k==='tr'){AG.sel=h;agRender();showMenuAt(e.clientX,e.clientY,[{label:'전환 삭제',fn:()=>agDelete(c,h)}])}
    else if(h&&h.k==='entry'){}
    else agBgMenu(c,e);
  });
  pan.addEventListener('wheel',e=>{
    if(!e.target.closest('#agCvWrap'))return;const c=agCtrl();if(!c)return;e.preventDefault();
    const v=agV(c),p=agToGraph(c,e),nz=clamp(v.z*Math.pow(1.0015,-e.deltaY),.25,2.5);v.auto=false;v.ox=p.sx-p.x*nz;v.oy=p.sy-p.y*nz;v.z=nz;agDraw();
  },{passive:false});
  pan.addEventListener('keydown',e=>{
    if(!e.target.closest('#agCvWrap'))return;const c=agCtrl();if(!c)return;
    if(e.key==='Escape'&&AG.link){AG.link=null;agDraw();e.stopPropagation();return}
    if((e.key==='Delete'||e.key==='Backspace')&&AG.sel){e.preventDefault();e.stopPropagation();agDelete(c);return}
    if(e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopPropagation();agFit(c);return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();e.stopPropagation();anUndo(e.shiftKey);return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){e.preventDefault();e.stopPropagation();anUndo(true)}
  });
  new ResizeObserver(()=>{if(anVis('animator'))agDraw()}).observe(pan);
  pan.addEventListener('pointerdown',e=>{
    const h=e.target.closest&&e.target.closest('.agrz');if(!h||e.button!==0)return;
    const win=h.closest('.agwin'),main=h.closest('.agmain'),which=h.dataset.rz,el=win&&win.querySelector(which==='side'?'.agside':'.agprop');if(!el)return;
    e.preventDefault();e.stopPropagation();
    const x0=e.clientX,w0=el.getBoundingClientRect().width,other=win.querySelector(which==='side'?'.agprop':'.agside'),ow=other&&other.offsetParent?other.getBoundingClientRect().width:0;
    const max=Math.max(140,main.clientWidth-ow-160),min=which==='side'?100:120;
    h.setPointerCapture(e.pointerId);h.classList.add('drag');
    const mv=ev=>{const w=clamp(Math.round(w0+(which==='side'?1:-1)*(ev.clientX-x0)),min,max);AGW[which]=w;win.style.setProperty(which==='side'?'--agsw':'--agpw',w+'px');agDraw()};
    const up=()=>{h.classList.remove('drag');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);try{localStorage.setItem(AGW_KEY,JSON.stringify(AGW))}catch(e){}};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
  pan.addEventListener('dblclick',e=>{const h=e.target.closest&&e.target.closest('.agrz');if(!h)return;const w=h.closest('.agwin');AGW[h.dataset.rz]=0;w.style.removeProperty(h.dataset.rz==='side'?'--agsw':'--agpw');try{localStorage.setItem(AGW_KEY,JSON.stringify(AGW))}catch(e){}agDraw()});
})();

/* ======================= 애니메이션 창 (클립 타임라인 · 도프시트) ======================= */
const AW={obj:null,clip:null,f:0,playing:false,preview:true,sel:new Set(),ppf:34,sx:0,drag:null,raf:0,last:0};
/* 행 높이: 스프라이트 키 그림이 잘 보이게 44px (왼쪽 속성 줄 .awrow 높이와 같아야 함) */
const AW_RH=44,AW_TOP=26;
function awTarget(){
  const o=anSelObj(),c=anObjCtrl(o),D=anData();
  AW.obj=o?o.id:null;
  const list=c?anCtrlClips(c):o?[]:D.clips;
  let k=anClip(AW.clip);
  if(o&&c&&(!k||!list.includes(k))){
    /* 플레이 중이면 지금 재생 중인 상태의 클립 */
    const rt=play&&play.anim&&play.anim.get(o.id),s=rt&&anState(rt.c,rt.st);k=s&&anClip(s.clip)||list[0]||null;
  }
  if(!k&&!o)k=D.clips[0]||null;
  AW.clip=k?k.id:null;
  return{o,c,k,list};
}
function awRender(){
  const box=$('#awBox');if(!box||!anVis('anim'))return;
  const{o,c,k,list}=awTarget(),D=anData();
  if(o&&!c){
    box.innerHTML=`<div class="anempty"><b data-i18n-skip>${esc(o.name)}</b>${anLines([o.props.animator?['{a} 컴포넌트에 컨트롤러가 없습니다.',{a:AC.animator()}]:['애니메이션을 시작하려면 {a}와 {b}을 만드세요.',{a:AC.animator(),b:AC.clip()}]])}${anMk('<button class="btn pri sm" data-aw="create">만들기</button>',['애니메이터 컴포넌트 · 컨트롤러 · 클립을 한 번에 만듭니다.','지금 스프라이트를 첫 프레임으로 넣습니다.'])}</div>`;return}
  if(!k){
    box.innerHTML=`<div class="anempty"><b>${o?'이 컨트롤러에 클립이 없습니다':'애니메이션 클립이 없습니다'}</b>${anLines(o?[['새 클립을 만들면 {a}에 상태로 함께 추가됩니다.',{a:AC.ctrl()}]]:[['{a}에서 {b}를 선택하면 그 오브젝트의 클립을 편집할 수 있습니다.',{a:AC.hier(),b:AC.go()}],['편집한 클립은 {a}에서 바로 미리 볼 수 있습니다.',{a:AC.scene()}]])}${o?'<button class="btn pri sm" data-aw="newclip">＋ 새 클립</button>':''}</div>`;return}
  const tr=k.tracks,len=anLen(k);AW.f=clamp(AW.f,0,Math.max(len-1,AW.f));
  const opts=(o?list:D.clips).map(x=>`<option value="${x.id}"${x.id===k.id?' selected':''} data-i18n-skip>${esc(x.name)}</option>`).join('')+(o?(D.clips.some(x=>!list.includes(x))?`<optgroup label="${esc(_t('다른 클립'))}">${D.clips.filter(x=>!list.includes(x)).map(x=>`<option value="${x.id}" data-i18n-skip>${esc(x.name)}</option>`).join('')}</optgroup>`:''):'')+'<option value="+new">＋ 새 클립…</option>';
  box.innerHTML=`<div class="awwin">
    <div class="antop">
      <button class="awpv${AW.preview?' on':''}" data-aw="preview" title="미리보기: 씬 뷰에서 선택한 오브젝트에 이 프레임을 보여 줍니다"${o?'':' disabled'}><i></i>미리보기</button>
      <span class="awtr">
        <button class="ib" data-aw="first" title="첫 프레임" aria-label="첫 프레임">⏮</button><button class="ib" data-aw="prev" title="이전 프레임 (,)" aria-label="이전 프레임">◀</button>
        <button class="ib awplay${AW.playing?' on':''}" data-aw="play" title="재생 / 정지 (Space)" aria-label="재생">${AW.playing?'❚❚':'▶'}</button>
        <button class="ib" data-aw="next" title="다음 프레임 (.)" aria-label="다음 프레임">▶|</button><button class="ib" data-aw="last" title="마지막 프레임" aria-label="마지막 프레임">⏭</button>
      </span>
      <input type="number" class="awfr" data-aw="frame" min="0" step="1" value="${Math.floor(AW.f)}" title="현재 프레임" aria-label="현재 프레임">
      <button type="button" class="tpbtn" data-awclip aria-label="애니메이션 클립" title="편집할 클립 (눌러서 선택)"><img alt="" src="${clipThumbURL(k,48)}"><span class="tpn"><b data-i18n-skip>${esc(k.name)}</b></span><svg class="tpc" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <button class="ib" data-aw="menu" title="클립 메뉴" aria-label="클립 메뉴">${ico('more')}</button>
      <label class="awfps" title="1초에 재생하는 프레임 수 (Samples)">샘플<input type="number" data-aw="fps" min="1" max="60" value="${k.fps}"></label>
      <label class="chk" title="끝까지 재생하면 처음부터 다시 (Loop Time)"><input type="checkbox" data-aw="loop"${k.loop?' checked':''}>반복</label>
      <label class="chk" title="부드럽게: 키 사이를 천천히 출발해 천천히 멈춥니다 (끄면 일정한 속도)"><input type="checkbox" data-aw="smooth"${k.smooth?' checked':''}>부드럽게</label>
      <span class="awlen">${len}프레임 · ${(len/k.fps).toFixed(2)}초</span>
      <span class="spacer"></span>
      ${o?`<span class="anchip on">${ico('cube')}<span data-i18n-skip>${esc(o.name)}</span></span>`:''}
    </div>
    ${awMissHtml(k)}
    <div class="awmain">
      <div class="awleft">
        <div class="awlh"><span>속성</span><span class="spacer"></span><button class="ib" data-aw="keyall" title="모든 속성에 이 프레임 키 추가" aria-label="키 추가">◆</button></div>
        ${tr.map(t=>awRowHtml(k,t)).join('')}
        <div class="awadd"><button class="btn sm" data-aw="addprop">＋ 속성 추가</button><small class="awaddh">프로젝트 패널의 스프라이트를 스프라이트 속성(또는 여기)에 끌어다 놓으면 현재 프레임에 키가 들어갑니다</small></div>
      </div>
      <div class="awright" id="awCvWrap" tabindex="0"><canvas id="awCv"></canvas>${tr.length?'':`<div class="awdrop">프로젝트 패널의 스프라이트(나눈 조각)를 여기로 끌어다 놓으면 프레임이 차례로 들어갑니다</div>`}</div>
    </div></div>`;
  requestAnimationFrame(awDraw);
}
/* 클립의 스프라이트 키가 가리키는 에셋이 없을 때: 알림 + (기본 에셋이면) 되살리기 */
function awMiss(k){const t=k&&anTrack(k,'sprite');if(!t)return[];return t.keys.filter(q=>q.v&&!spriteRef(q.v)).map(q=>q.v)}
function awMissHtml(k){
  const miss=awMiss(k);if(!miss.length)return'';
  const B=window.THANIYA_BASE_ASSETS||[],base=[...new Set(miss.map(refAid))].filter(id=>B.some(b=>b.id===id));
  return`<div class="awmiss">⚠ <span>스프라이트 키 ${miss.length}개가 가리키는 그림을 찾을 수 없습니다${base.length?' (기본 에셋 「'+esc(base.map(id=>B.find(b=>b.id===id).name).join(', '))+'」이 없음)':' — 에셋이 지워졌거나 아직 불러오는 중입니다'}.</span>${base.length?`<button class="btn sm pri" data-aw="restore" data-ids="${esc(base.join(','))}">기본 에셋 되살리기</button>`:''}</div>`;
}
const awSprBtn=ref=>`<img alt="" src="${spriteThumbURL(ref,48)}"><span class="tpn"><b data-i18n-skip>${esc(sprName(ref))}</b></span>`;
function awRowHtml(k,t){
  const P0=AN_PROPS[t.p],f=Math.floor(AW.f),v=anValAt(t,AW.f),has=t.keys.some(q=>q.f===f);let ed='';
  if(P0.kind==='spr')ed=`<button type="button" class="tpbtn" data-awv="${t.p}" data-ref="${esc(v||'')}" title="이 프레임의 스프라이트 (눌러서 선택 · 프로젝트 패널에서 끌어다 놓아도 됩니다 · 바꾸면 키가 만들어집니다)">${awSprBtn(v||'')}</button>`;
  else if(P0.kind==='bool')ed=`<input type="checkbox" data-awv="${t.p}"${v?' checked':''}>`;
  else if(P0.kind==='ev'){const q=t.keys.find(x=>x.f===f);ed=`<input type="text" data-awv="${t.p}" value="${esc(q?q.v:'')}" placeholder="${esc(_t('메서드 이름'))}" spellcheck="false" title="이 프레임에서 부를 스크립트 메서드 이름 (예: Footstep)">`}
  else ed=`<input type="number" data-awv="${t.p}" step="${P0.step}" value="${v==null?P0.def:+(+v).toFixed(3)}">`;
  return`<div class="awrow${has?' haskey':''}" data-p="${t.p}"><span class="awpn" title="${P0.en}">${P0.n}</span>${ed}<button class="ib awk" data-aw="key" data-p="${t.p}" title="${has?'이 프레임의 키 삭제':'이 프레임에 키 추가'}" aria-label="키">◆</button><button class="ib" data-aw="rmprop" data-p="${t.p}" title="속성 삭제" aria-label="속성 삭제">${ico('x')}</button></div>`;
}
const awClip=()=>anClip(AW.clip);
function awSetKey(k,p,f,v){const t=anTrack(k,p,true),q=t.keys.find(x=>x.f===f);if(q)q.v=v;else{t.keys.push({f,v});t.keys.sort((a,b)=>a.f-b.f)}}
function awDelKey(k,p,f){const t=anTrack(k,p);if(t)t.keys=t.keys.filter(x=>x.f!==f)}
function awFrameX(f){return f*AW.ppf-AW.sx+8}
function awXFrame(x){return(x-8+AW.sx)/AW.ppf}
/* 아래 가로 스크롤 막대 (애니메이션 창 · 타임라인 창 공용): wrap 안에 .anhs를 만들고, 그릴 때마다 anHsSync(wrap, 전체 너비, 보이는 너비, 지금 위치, 바꾸는 함수)
   막대 끌기 = 좌우 이동 · 빈 곳 누르기 = 한 화면씩 · 막대 위 휠 = 좌우 */
function anHsSync(wrap,total,view,pos,setPos){
  if(!wrap)return;let el=wrap.querySelector(':scope>.anhs');
  if(!el){el=wrap.ownerDocument.createElement('div');el.className='anhs';el.innerHTML='<div class="anhs-t"></div>';wrap.append(el);
    const stop=e=>e.stopPropagation();['dblclick','contextmenu','click'].forEach(n=>el.addEventListener(n,stop));
    el.addEventListener('pointerdown',e=>{
      e.stopPropagation();e.preventDefault();if(e.button!==0)return;const S=el._s;if(!S)return;const th=el.firstChild,W=el.clientWidth,tw=th.offsetWidth,max=Math.max(0,S.total-S.view);
      if(e.target===th){const x0=e.clientX,p0=S.pos;th.classList.add('on');try{el.setPointerCapture(e.pointerId)}catch(_){}
        const mv=ev=>{const k=max/Math.max(1,W-tw);el._s.set(clamp(p0+(ev.clientX-x0)*k,0,max))};
        const up=()=>{th.classList.remove('on');el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)};
        el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
      else{const r=th.getBoundingClientRect();S.set(clamp(S.pos+(e.clientX<r.left?-1:1)*S.view*.9,0,max))}
    });
    el.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();const S=el._s;if(!S)return;S.set(clamp(S.pos+(e.deltaY||e.deltaX),0,Math.max(0,S.total-S.view)))},{passive:false});
  }
  total=Math.max(total,pos+view);el._s={total,view,pos,set:setPos};
  const th=el.firstChild,W=el.clientWidth||view,tw=Math.max(28,W*Math.min(1,view/Math.max(1,total))),max=Math.max(0,total-view);
  th.style.width=tw+'px';th.style.left=(max?(W-tw)*pos/max:0)+'px';el.classList.toggle('full',max<1);
}
function awDraw(){
  const cv=$('#awCv');if(!cv||!cv.isConnected)return;const k=awClip();if(!k)return;
  const{w,h,d}=anFitCanvas(cv),g=cv.getContext('2d'),C=anCol(),acc=css('--accent')||'#e9bd0c',len=anLen(k),fps=k.fps;
  AW.sx=Math.max(0,AW.sx);
  g.setTransform(d,0,0,d,0,0);g.fillStyle=C.bg;g.fillRect(0,0,w,h);
  /* 줄 */
  k.tracks.forEach((t,i)=>{const y=AW_TOP+i*AW_RH;if(i%2===0){g.fillStyle=C.row;g.fillRect(0,y,w,AW_RH)}});
  /* 클립 끝 뒤는 어둡게 */
  const xe=awFrameX(len);if(xe<w){g.fillStyle=C.dim;g.fillRect(Math.max(0,xe),AW_TOP,w-Math.max(0,xe),h-AW_TOP)}
  /* 눈금자 */
  g.fillStyle=C.ruler;g.fillRect(0,0,w,AW_TOP);g.strokeStyle=C.grid2;g.beginPath();g.moveTo(0,AW_TOP-.5);g.lineTo(w,AW_TOP-.5);g.stroke();
  let step=1;for(const s of[1,2,5,10,15,20,30,60,120,300]){if(s*AW.ppf>=46){step=s;break}step=s}
  const f0=Math.max(0,Math.floor(awXFrame(0))),f1=Math.ceil(awXFrame(w));
  g.font='10px '+css('--f-mono');g.textAlign='left';g.textBaseline='middle';
  for(let f=f0;f<=f1;f++){const x=Math.round(awFrameX(f))+.5;
    if(f%step===0){g.strokeStyle=C.grid2;g.beginPath();g.moveTo(x,AW_TOP-10);g.lineTo(x,h);g.stroke();g.fillStyle=C.sub;const s=Math.floor(f/fps),ff=f%fps;g.fillText(s+':'+String(ff).padStart(2,'0'),x+3,9)}
    else if(AW.ppf>=7){g.strokeStyle=C.grid;g.beginPath();g.moveTo(x,AW_TOP-4);g.lineTo(x,AW_TOP);g.stroke();if(AW.ppf>=14){g.beginPath();g.moveTo(x,AW_TOP);g.lineTo(x,h);g.stroke()}}}
  if(xe>0&&xe<w){g.strokeStyle=C.sub;g.setLineDash([3,3]);g.beginPath();g.moveTo(Math.round(xe)+.5,AW_TOP);g.lineTo(Math.round(xe)+.5,h);g.stroke();g.setLineDash([])}
  /* 키프레임 */
  k.tracks.forEach((t,i)=>{const cy=AW_TOP+i*AW_RH+AW_RH/2,kind=AN_PROPS[t.p].kind;
    t.keys.forEach((q,j)=>{const x=awFrameX(q.f)+AW.ppf/2;if(x<-30||x>w+30)return;const on=AW.sel.has(t.p+':'+q.f);
      if(kind==='spr'){const sr=spriteRef(q.v),nx=j+1<t.keys.length?awFrameX(t.keys[j+1].f)+AW.ppf/2:awFrameX(len)+AW.ppf/2;
        if(sr&&AW.ppf>=16){const r=sr.r,sz=AW_RH-6,s=Math.min(sz/r.w,sz/r.h),dw=r.w*s,dh=r.h*s;g.imageSmoothingEnabled=false;
          g.fillStyle=on?'rgba(233,189,12,.22)':'rgba(127,127,140,.12)';g.fillRect(x-AW.ppf/2+1,cy-AW_RH/2+2,Math.max(2,Math.min(nx-x,AW.ppf*1.0)-2),AW_RH-4);
          g.drawImage(sr.a.img,r.x,r.y,r.w,r.h,x-dw/2,cy-dh/2,dw,dh)}
        else{g.fillStyle=sr?(on?acc:C.key):'#ff6b78';g.save();g.translate(x,cy);g.rotate(Math.PI/4);g.fillRect(-4,-4,8,8);g.restore()}
        if(on){g.strokeStyle=acc;g.lineWidth=1.5;g.strokeRect(x-AW.ppf/2+1.5,cy-AW_RH/2+2.5,AW.ppf-3,AW_RH-5)}
        return}
      if(kind==='ev'){g.fillStyle=on?acc:'#8ab4ff';g.beginPath();g.moveTo(x-4,cy-8);g.lineTo(x+4,cy-8);g.lineTo(x+4,cy+2);g.lineTo(x,cy+7);g.lineTo(x-4,cy+2);g.closePath();g.fill();return}
      g.save();g.translate(x,cy);g.rotate(Math.PI/4);g.fillStyle=on?acc:C.key;g.fillRect(-4.5,-4.5,9,9);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.strokeRect(-4.5,-4.5,9,9);g.restore()});
  });
  /* 상자 선택 */
  if(AW.drag&&AW.drag.t==='box'){const b=AW.drag;g.fillStyle='rgba(233,189,12,.12)';g.strokeStyle=acc;g.lineWidth=1;const x=Math.min(b.x0,b.x1),y=Math.min(b.y0,b.y1);g.fillRect(x,y,Math.abs(b.x1-b.x0),Math.abs(b.y1-b.y0));g.strokeRect(x+.5,y+.5,Math.abs(b.x1-b.x0),Math.abs(b.y1-b.y0))}
  /* 재생 위치 */
  anHsSync(cv.parentElement,Math.max((Math.max(len,AW.f+1)+8)*AW.ppf+16,w*1.5),w,AW.sx,v=>{AW.sx=v;awDraw()});
  const px=Math.round(awFrameX(AW.f)+AW.ppf/2)+.5;g.strokeStyle='#ff5b5b';g.lineWidth=1.5;g.beginPath();g.moveTo(px,AW_TOP-12);g.lineTo(px,h);g.stroke();
  g.fillStyle='#ff5b5b';anRR(g,px-14,1,28,13,4);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='600 10px '+css('--f-mono');g.fillText(String(Math.floor(AW.f)),px,8);
}
function awSetFrame(f,keepPlay){
  const k=awClip();if(!k)return;if(!keepPlay)awStop();
  AW.f=Math.max(0,Math.round(f));if(AW.obj&&!play)AW.preview=true;awSyncRows();awDraw();need();
}
/* 현재 프레임이 바뀌면 왼쪽 값만 그 자리에서 바꿈 (요소를 새로 만들지 않아 누르고 있는 칸이 사라지지 않음 · 입력 중인 칸은 그대로) */
function awSyncRows(){
  const box=$('#awBox');if(!box)return;const k=awClip();if(!k)return;const ae=docOf(box).activeElement;
  const fi=$('.awfr',box);if(fi&&ae!==fi)fi.value=Math.floor(AW.f);
  const pb=$('.awpv',box);if(pb)pb.classList.toggle('on',AW.preview);
  const pl=$('.awplay',box);if(pl){pl.classList.toggle('on',AW.playing);pl.textContent=AW.playing?'❚❚':'▶'}
  const f=Math.floor(AW.f);
  k.tracks.forEach(t=>{const row=box.querySelector(`.awrow[data-p="${t.p}"]`);if(!row)return;
    const has=t.keys.some(q=>q.f===f);row.classList.toggle('haskey',has);const kb=row.querySelector('.awk');if(kb)kb.title=_t(has?'이 프레임의 키 삭제':'이 프레임에 키 추가');
    const ed=row.querySelector('[data-awv]');if(!ed||(ed===ae&&ed.tagName!=='BUTTON'))return;const P0=AN_PROPS[t.p],v=anValAt(t,AW.f);
    if(P0.kind==='spr'){const want=v||'';if(ed.dataset.ref!==want){ed.dataset.ref=want;ed.innerHTML=awSprBtn(want)}}
    else if(P0.kind==='bool')ed.checked=!!v;
    else if(P0.kind==='ev'){const q=t.keys.find(x=>x.f===f);ed.value=q?q.v:''}
    else ed.value=v==null?P0.def:+(+v).toFixed(3);
  });
}
function awPlay(){
  const k=awClip();if(!k||play)return;if(AW.playing){awStop();return}
  AW.playing=true;if(AW.obj)AW.preview=true;if(!k.loop&&AW.f>=anLen(k)-1)AW.f=0;AW.last=performance.now();awSyncRows();
  const tick=t=>{if(!AW.playing)return;const kk=awClip();if(!kk||play){awStop();return}
    const dt=Math.min(.1,(t-AW.last)/1000);AW.last=t;AW.f+=dt*kk.fps;const L0=anLen(kk);
    if(AW.f>=L0){if(kk.loop)AW.f%=L0;else{AW.f=L0-1;awStop();awDraw();need();return}}
    awDraw();need();if(Math.floor(AW.f)!==AW.lastShown){AW.lastShown=Math.floor(AW.f);awSyncRows()}
    AW.raf=requestAnimationFrame(tick)};
  AW.raf=requestAnimationFrame(tick);
}
function awStop(){if(!AW.playing)return;AW.playing=false;cancelAnimationFrame(AW.raf);AW.f=Math.floor(AW.f);awSyncRows()}
const awNearHead=x=>Math.abs(x-(awFrameX(AW.f)+AW.ppf/2))<=5;
function awHit(e){
  const cv=$('#awCv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,k=awClip();
  const row=y<AW_TOP?-1:Math.floor((y-AW_TOP)/AW_RH),t=k&&k.tracks[row]||null;
  let key=null;if(t){const f=awXFrame(x-AW.ppf/2);let best=1e9;t.keys.forEach(q=>{const dx=Math.abs(awFrameX(q.f)+AW.ppf/2-x);const lim=AN_PROPS[t.p].kind==='spr'?Math.max(7,AW.ppf/2):7;if(dx<=lim&&dx<best){best=dx;key=q}});void f}
  return{x,y,row,t,key,f:Math.max(0,Math.floor(awXFrame(x)))};
}
function awAddSprites(refs,f0){
  const k=awClip();if(!k||!refs.length)return;
  anEdit(()=>{refs.forEach((r,i)=>awSetKey(k,'sprite',f0+i,r))},true);
  AW.f=f0;awRender();need();toast(refs.length>1?'스프라이트 '+refs.length+'개를 프레임 '+f0+'부터 넣었습니다':'프레임 '+f0+'에 스프라이트 키를 넣었습니다');
}
function awPropMenu(anchor){
  const k=awClip();if(!k)return;
  showMenu(anchor,AN_ORDER.filter(p=>!k.tracks.some(t=>t.p===p)).map(p=>({label:AN_PROPS[p].n+' ('+AN_PROPS[p].en+')',fn:()=>anEdit(()=>{const t=anTrack(k,p,true);
    if(p!=='ev'&&p!=='sprite'){const o=getSel();t.keys.push({f:0,v:AN_PROPS[p].def});void o}
    else if(p==='sprite'){const o=getSel();if(o&&o.props.sprite)t.keys.push({f:0,v:o.props.sprite})}})})).concat(k.tracks.length>=AN_ORDER.length?[{label:'모든 속성이 이미 있습니다',disabled:true}]:[]));
}
(()=>{
  const pan=panelEl.anim;
  pan.addEventListener('click',e=>{
    const b=e.target.closest('[data-aw]');if(!b)return;const a=b.dataset.aw,k=awClip(),o=anSelObj();
    if(a==='create'){anCreateFor(o);return}
    if(a==='restore'){const ids=(b.dataset.ids||'').split(',').filter(Boolean);ensureBaseAssets(false,ids).then(n=>{renderAll();toast(n?'기본 에셋을 되살렸습니다':'되살릴 에셋이 없습니다')});return}
    if(a==='newclip'){anNewClip(anObjCtrl(o),o);return}
    if(!k)return;
    if(a==='preview'){AW.preview=!AW.preview;if(!AW.preview)awStop();awSyncRows();need()}
    else if(a==='play')awPlay();
    else if(a==='first')awSetFrame(0);
    else if(a==='last')awSetFrame(anLen(k)-1);
    else if(a==='prev')awSetFrame(Math.max(0,Math.floor(AW.f)-1));
    else if(a==='next')awSetFrame(Math.floor(AW.f)+1);
    else if(a==='addprop')awPropMenu(b);
    else if(a==='rmprop'){const p=b.dataset.p;anEdit(()=>{k.tracks=k.tracks.filter(t=>t.p!==p)})}
    else if(a==='key'){const p=b.dataset.p,f=Math.floor(AW.f),t=anTrack(k,p);
      if(t&&t.keys.some(q=>q.f===f))anEdit(()=>awDelKey(k,p,f));
      else{const v=t?anValAt(t,AW.f):undefined,P0=AN_PROPS[p];if(P0.kind==='ev'){toast('이벤트는 왼쪽 칸에 메서드 이름을 쓰면 키가 만들어집니다');return}
        if(P0.kind==='spr'&&!v){toast('먼저 스프라이트를 고르거나 끌어다 놓으세요');return}
        anEdit(()=>awSetKey(k,p,f,v==null?P0.def:v))}}
    else if(a==='keyall'){const f=Math.floor(AW.f);anEdit(()=>{k.tracks.forEach(t=>{if(t.p==='ev'||!t.keys.length)return;awSetKey(k,t.p,f,anValAt(t,AW.f))})})}
    else if(a==='menu')showMenu(b,[{label:'새 클립…',fn:()=>anNewClip(anObjCtrl(o),o)},{label:'이름 바꾸기…',fn:()=>anAsk('클립 이름','이름',k.name,v=>anEdit(()=>{k.name=anUniq(anData().clips.filter(x=>x!==k).map(x=>x.name),v)}))},
      {label:'복제',fn:()=>anEdit(()=>{const n=anNormClip(JSON.parse(JSON.stringify(k)));n.id=uid();n.name=anUniq(anData().clips.map(x=>x.name),k.name+' 복사');anData().clips.push(n);
        const c=anObjCtrl(o);if(c){c.states.push({id:uid(),n:anUniq(c.states.map(x=>x.n),n.name),clip:n.id,spd:1,x:-120+c.states.length*24,y:-40+c.states.length*56})}AW.clip=n.id})},
      {label:'스프라이트 시트에서 프레임 채우기…',fn:()=>awSheetPick(b)},
      {label:'선택한 키 삭제',disabled:!AW.sel.size,fn:()=>awDelSel()},
      {sep:1},{label:'클립 삭제…',fn:()=>anDelClip(k)}],false);
  });
  pan.addEventListener('click',e=>{
    const cb=e.target.closest&&e.target.closest('[data-awclip]');
    if(cb){const{o,c,k,list}=awTarget(),D=anData();if(!k)return;
      const groups=o?[{clips:list},...(D.clips.some(x=>!list.includes(x))?[{title:'다른 클립',clips:D.clips.filter(x=>!list.includes(x))}]:[])]:[{clips:D.clips}];
      clipPickerModal(groups,k.id,{add:true},v=>{if(v==='+new'){anNewClip(anObjCtrl(anSelObj()),anSelObj());return}AW.clip=v;AW.f=0;AW.sel.clear();awStop();awRender();need()});return}
    const sb=e.target.closest&&e.target.closest('button[data-awv][data-ref]');
    if(sb){const k=awClip();if(!k)return;const p=sb.dataset.awv,f=Math.floor(AW.f);
      spritePickerModal(sb.dataset.ref,v=>{anEdit(()=>{if(v)awSetKey(k,p,f,v);else awDelKey(k,p,f)});if(AW.obj&&!play)AW.preview=true;need()})}
  });
  pan.addEventListener('change',e=>{
    const t=e.target,k=awClip();
    if(t.dataset.aw==='clip'){if(t.value==='+new'){t.value=AW.clip||'';anNewClip(anObjCtrl(anSelObj()),anSelObj());return}AW.clip=t.value;AW.f=0;AW.sel.clear();awStop();awRender();need();return}
    if(!k)return;
    if(t.dataset.aw==='fps'){const v=clamp(Math.round(+t.value||12),1,60);anEdit(()=>{k.fps=v})}
    else if(t.dataset.aw==='smooth')anEdit(()=>{if(t.checked)k.smooth=true;else delete k.smooth});
    else if(t.dataset.aw==='loop')anEdit(()=>{k.loop=t.checked});
    else if(t.dataset.aw==='frame'){const v=Math.max(0,Math.round(+t.value||0));if(v!==Math.floor(AW.f))awSetFrame(v)}
    else if(t.dataset.awv){const p=t.dataset.awv,P0=AN_PROPS[p],f=Math.floor(AW.f);
      anEdit(()=>{if(P0.kind==='spr'){if(t.value)awSetKey(k,p,f,t.value);else awDelKey(k,p,f)}
        else if(P0.kind==='bool')awSetKey(k,p,f,t.checked);
        else if(P0.kind==='ev'){const v=t.value.trim();if(v)awSetKey(k,p,f,v);else awDelKey(k,p,f)}
        else{let v=parseFloat(t.value);if(isNaN(v))v=P0.def;if(P0.min!=null)v=clamp(v,P0.min,P0.max);awSetKey(k,p,f,v)}});
      if(AW.obj&&!play)AW.preview=true;need()}
  });
  /* 프레임 칸에서 Enter */
  pan.addEventListener('keydown',e=>{if(e.target.dataset&&e.target.dataset.aw==='frame'&&e.key==='Enter'){e.preventDefault();awSetFrame(+e.target.value||0)}});
  /* 타임라인 */
  pan.addEventListener('pointerdown',e=>{
    const wrap=e.target.closest('#awCvWrap');if(!wrap||e.button!==0)return;const k=awClip();if(!k)return;wrap.focus({preventScroll:true});
    const h=awHit(e);
    try{wrap.setPointerCapture(e.pointerId)}catch(_){}
    if(h.row<0){AW.drag={t:'scrub'};awSetFrame(h.f);return}
    /* 빨간 재생 위치 선을 잡으면 어디서든 끌어 옮김 (키 위가 아니면) */
    if(!h.key&&awNearHead(h.x)){AW.drag={t:'scrub'};wrap.style.cursor='ew-resize';return}
    if(h.key){const id=h.t.p+':'+h.key.f;
      if(e.shiftKey||e.ctrlKey||e.metaKey){if(AW.sel.has(id))AW.sel.delete(id);else AW.sel.add(id)}
      else if(!AW.sel.has(id)){AW.sel.clear();AW.sel.add(id)}
      AW.drag={t:'move',sx:h.x,df:0,snap:JSON.stringify(anData()),base:[...AW.sel].map(s=>{const i=s.lastIndexOf(':');return{p:s.slice(0,i),f:+s.slice(i+1)}})};
      awSetFrame(h.key.f);return}
    if(!e.shiftKey)AW.sel.clear();
    AW.drag={t:'box',x0:h.x,y0:h.y,x1:h.x,y1:h.y,f:h.f,moved:false};awDraw();
  });
  pan.addEventListener('pointermove',e=>{
    if(!AW.drag){const w=e.target.closest&&e.target.closest('#awCvWrap');if(w&&!e.target.closest('.anhs')&&awClip()){const h=awHit(e);w.style.cursor=h.row>=0&&!h.key&&awNearHead(h.x)?'ew-resize':''}}
    const D=AW.drag;if(!D)return;const k=awClip();if(!k)return;const h=awHit(e);
    if(D.t==='scrub'){awSetFrame(h.f);return}
    if(D.t==='move'){const df=Math.round((h.x-D.sx)/AW.ppf),mn=Math.min(...D.base.map(b=>b.f));const d2=Math.max(-mn,df);if(d2===D.df)return;D.df=d2;
      /* 원래 상태에서 다시 옮김 (겹치는 키는 덮어씀) */
      const src=JSON.parse(D.snap),sk=src.clips.find(x=>x.id===k.id);if(!sk)return;
      k.tracks=anNormClip(sk).tracks;
      const moving=D.base.map(b=>{const t=anTrack(k,b.p),q=t&&t.keys.find(x=>x.f===b.f);return q?{t,q}:null}).filter(Boolean);
      moving.forEach(({t,q})=>{t.keys=t.keys.filter(x=>x!==q)});
      moving.forEach(({t,q})=>{const nf=q.f+d2;t.keys=t.keys.filter(x=>x.f!==nf);t.keys.push({f:nf,v:q.v})});
      k.tracks.forEach(t=>t.keys.sort((a,b)=>a.f-b.f));
      AW.sel=new Set(D.base.map(b=>b.p+':'+(b.f+d2)));AW.f=Math.max(0,D.base[0].f+d2);awDraw();need();return}
    if(D.t==='box'){D.x1=h.x;D.y1=h.y;if(Math.abs(D.x1-D.x0)+Math.abs(D.y1-D.y0)>4)D.moved=true;
      if(D.moved){const x0=Math.min(D.x0,D.x1),x1=Math.max(D.x0,D.x1),y0=Math.min(D.y0,D.y1),y1=Math.max(D.y0,D.y1);if(!e.shiftKey)AW.sel.clear();
        k.tracks.forEach((t,i)=>{const cy=AW_TOP+i*AW_RH+AW_RH/2;if(cy<y0||cy>y1)return;t.keys.forEach(q=>{const x=awFrameX(q.f)+AW.ppf/2;if(x>=x0&&x<=x1)AW.sel.add(t.p+':'+q.f)})})}
      awDraw()}
  });
  const end=()=>{const D=AW.drag;AW.drag=null;if(!D)return;
    if(D.t==='move'&&D.df){AU.u.push(D.snap);AU.r=[];anDirty();awSyncRows();awRender()}
    else if(D.t==='box'){if(!D.moved)awSetFrame(D.f);else awDraw()}};
  pan.addEventListener('pointerup',end);pan.addEventListener('pointercancel',end);
  pan.addEventListener('dblclick',e=>{if(!e.target.closest('#awCvWrap'))return;const k=awClip();if(!k)return;const h=awHit(e);if(!h.t||h.key)return;
    const P0=AN_PROPS[h.t.p];if(P0.kind==='ev'){AW.f=h.f;awRender();const i=$('#awBox [data-awv="ev"]');if(i)i.focus();return}
    const v=anValAt(h.t,h.f);if(v===undefined&&P0.kind==='spr')return;anEdit(()=>awSetKey(k,h.t.p,h.f,v===undefined?P0.def:v));AW.f=h.f;awSyncRows();awDraw()});
  pan.addEventListener('contextmenu',e=>{if(!e.target.closest('#awCvWrap'))return;e.preventDefault();const k=awClip();if(!k)return;const h=awHit(e);
    if(h.key){const id=h.t.p+':'+h.key.f;if(!AW.sel.has(id)){AW.sel.clear();AW.sel.add(id)}awDraw();showMenuAt(e.clientX,e.clientY,[{label:'키 삭제'+(AW.sel.size>1?' ('+AW.sel.size+'개)':''),fn:awDelSel}]);return}
    if(h.t){const P0=AN_PROPS[h.t.p];showMenuAt(e.clientX,e.clientY,[{label:'여기에 키 추가 (프레임 '+h.f+')',disabled:P0.kind==='ev'||(P0.kind==='spr'&&anValAt(h.t,h.f)===undefined),fn:()=>{const v=anValAt(h.t,h.f);anEdit(()=>awSetKey(k,h.t.p,h.f,v===undefined?P0.def:v))}}])}});
  pan.addEventListener('wheel',e=>{
    if(!e.target.closest('#awCvWrap'))return;e.preventDefault();const cv=$('#awCv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left;
    if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){AW.sx=Math.max(0,AW.sx+(e.deltaX||e.deltaY));awDraw();return}
    const f=awXFrame(x);AW.ppf=clamp(AW.ppf*Math.pow(1.0018,-e.deltaY),4,90);AW.sx=Math.max(0,f*AW.ppf-x+8);awDraw();
  },{passive:false});
  pan.addEventListener('keydown',e=>{
    if(!e.target.closest('#awCvWrap'))return;const k=awClip();if(!k)return;
    if(e.code==='Space'){e.preventDefault();e.stopPropagation();awPlay();return}
    if(e.code==='Comma'){e.preventDefault();e.stopPropagation();awSetFrame(Math.max(0,Math.floor(AW.f)-1));return}
    if(e.code==='Period'){e.preventDefault();e.stopPropagation();awSetFrame(Math.floor(AW.f)+1);return}
    if((e.key==='Delete'||e.key==='Backspace')&&AW.sel.size){e.preventDefault();e.stopPropagation();awDelSel();return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyA'){e.preventDefault();e.stopPropagation();AW.sel=new Set();k.tracks.forEach(t=>t.keys.forEach(q=>AW.sel.add(t.p+':'+q.f)));awDraw();return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();e.stopPropagation();anUndo(e.shiftKey);return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){e.preventDefault();e.stopPropagation();anUndo(true)}
  });
  /* 프로젝트 패널에서 스프라이트 끌어다 놓기 */
  const isAD=e=>{const ty=[...((e.dataTransfer&&e.dataTransfer.types)||[])];return ty.includes('application/x-thaniya-sprite')||ty.includes('application/x-thaniya-asset')};
  /* 왼쪽 속성 칸: 스프라이트 줄(또는 속성 목록 아무 곳)에 놓으면 현재 프레임부터 스프라이트 키 (스프라이트 속성이 없으면 새로 만듦) */
  const awLeftZone=e=>{const l=e.target.closest&&e.target.closest('.awleft');if(!l)return null;return l.querySelector('.awrow[data-p="sprite"]')||l};
  const awClrDrop=()=>pan.querySelectorAll('.awleft .drop,.awleft.drop').forEach(x=>x.classList.remove('drop'));
  pan.addEventListener('dragover',e=>{
    if(!isAD(e)||!awClip())return;
    const z=awLeftZone(e);if(z){e.preventDefault();e.dataTransfer.dropEffect='copy';if(!z.classList.contains('drop')){awClrDrop();z.classList.add('drop')}return}
    if(!e.target.closest('#awCvWrap'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';$('#awCvWrap').classList.add('drop')});
  pan.addEventListener('dragleave',e=>{const w=$('#awCvWrap');if(w&&!w.contains(e.relatedTarget))w.classList.remove('drop');const l=$('#awBox .awleft');if(l&&!l.contains(e.relatedTarget))awClrDrop()});
  pan.addEventListener('drop',e=>{
    if(!e.target.closest||!e.target.closest('.awleft')||!isAD(e)||!awClip())return;e.preventDefault();e.stopPropagation();awClrDrop();
    const ref=e.dataTransfer.getData('application/x-thaniya-sprite'),aid=e.dataTransfer.getData('application/x-thaniya-asset'),a=aid&&byId.get(aid),f0=Math.floor(AW.f);
    if(ref&&spriteRef(ref))awAddSprites([ref],f0);
    else if(a&&slCount(a))awAddSprites(a.slices.map(r=>a.id+':'+r.id),f0);
    else if(a)toast('"'+a.name+'"은(는) 스프라이트가 아닙니다. 텍스처 유형을 스프라이트로 바꾸거나 스프라이트 에디터로 나눈 뒤 끌어다 놓으세요');
  });
  document.addEventListener('dragend',()=>{awClrDrop();const w=$('#awCvWrap');if(w)w.classList.remove('drop')});
  pan.addEventListener('drop',e=>{
    const w=e.target.closest('#awCvWrap');if(!w||!isAD(e)||!awClip())return;e.preventDefault();e.stopPropagation();w.classList.remove('drop');
    const h=awHit(e),ref=e.dataTransfer.getData('application/x-thaniya-sprite'),aid=e.dataTransfer.getData('application/x-thaniya-asset'),a=aid&&byId.get(aid);
    if(a&&slCount(a))awAddSprites(a.slices.map(r=>a.id+':'+r.id),h.f);
    else if(ref&&spriteRef(ref))awAddSprites([ref],h.f);
    else if(a)toast('"'+a.name+'"은(는) 스프라이트가 아닙니다. 텍스처 유형을 스프라이트로 바꾸거나 스프라이트 에디터로 나눈 뒤 끌어다 놓으세요');
  });
  new ResizeObserver(()=>{if(anVis('anim'))awDraw()}).observe(pan);
})();
function awDelSel(){const k=awClip();if(!k||!AW.sel.size)return;const s=[...AW.sel];AW.sel.clear();anEdit(()=>{s.forEach(id=>{const i=id.lastIndexOf(':');awDelKey(k,id.slice(0,i),+id.slice(i+1))})})}
function awSheetPick(anchor){
  const list=assets.filter(a=>slCount(a)).sort(byName);
  if(!list.length){toast('나눈 조각이 있는 스프라이트가 없습니다. 프로젝트 패널에서 이미지를 스프라이트 에디터로 나누세요');return}
  showMenu(anchor,list.map(a=>({label:a.name+' ('+a.slices.length+')',fn:()=>{
    const rows={};a.slices.forEach(r=>{const key=Math.round(r.y);(rows[key]||(rows[key]=[])).push(r)});const ks=Object.keys(rows).map(Number).sort((x,y)=>x-y);
    if(ks.length>1){openModal('스프라이트 시트에서 채우기',`<p style="margin-top:0">어느 줄의 조각으로 채울까요? 현재 프레임(${Math.floor(AW.f)})부터 차례로 들어갑니다.</p><div style="display:flex;flex-direction:column;gap:6px">${ks.map((y,i)=>`<button class="btn" data-awrow="${y}" style="height:28px;text-align:left">${i+1}번째 줄 · ${rows[y].length}개 <small style="color:var(--mute)" data-i18n-skip>${esc(rows[y].map(r=>r.name).slice(0,4).join(', '))}${rows[y].length>4?'…':''}</small></button>`).join('')}<button class="btn" data-awrow="all" style="height:28px">전체 ${a.slices.length}개</button></div>`,[{t:'닫기'}]);
      $('#mBody').onclick=ev=>{const b=ev.target.closest('[data-awrow]');if(!b)return;const pick=b.dataset.awrow==='all'?a.slices:rows[+b.dataset.awrow].slice().sort((p,q)=>p.x-q.x);closeModal();awAddSprites(pick.map(r=>a.id+':'+r.id),Math.floor(AW.f))};return}
    awAddSprites(a.slices.map(r=>a.id+':'+r.id),Math.floor(AW.f))}})),false,{search:'스프라이트 검색'});
}
/* 플레이 중: 애니메이터 그래프 진행 막대 · 파라미터 값 · 애니메이션 창 재생 위치를 따라감 */
let anLiveT=0;
function anLive(t){
  if(anVis('animator'))agDraw();
  if(t-anLiveT<150)return;anLiveT=t;
  if(anVis('animator')){const c=agCtrl(),side=$('#agBox .agside');
    if(side&&c&&!side.contains(docOf(side).activeElement)){side.innerHTML=agParamsHtml(c)}}
  if(anVis('anim')&&AW.obj&&play.anim){const rt=play.anim.get(AW.obj),s=rt&&anState(rt.c,rt.st),k=s&&anClip(s.clip);
    if(k){if(k.id!==AW.clip){AW.clip=k.id;awRender()}else{AW.f=anFrameAt(k,rt.t);awDraw();const fi=$('#awBox .awfr');if(fi)fi.value=Math.floor(AW.f)}}}
}


return{anHsSync,anChip,anLines,anMk,anCol,anFitCanvas,anRR,anTrack,anValAt,anEdit,clipPickerModal,clipThumbURL,anObjCtrl,anCtrlClips,anNewClip,agDraw,anAsk,anData,anDirty,anHeroCtrl,anLive,anMigrate,anNewCtrl,anPoseFor,anRenderAll,anShowPanel,anSync,anUndo,anUniq,animProxy,animTick,animatorComp,awDraw,awStop,giveHeroAnimator,objArtA,spritePickerModal,spriteThumbURL,anClip,anCtrl,anState,anLen,anDur,anRt,anEval,anFrameAt,anNormP,AG,AW,agRender,awRender,anVis};
})()}
}
