/* timeline.js — 타임라인 창 (유니티 Timeline · PlayableDirector) · 엔진(edit.html) 전용
   · 타임라인 에셋은 프로젝트 데이터 P.anim.tls 에 저장 → 애니메이션 창 · 애니메이터 창과 같은 실행 취소(Ctrl+Z) · 내보내기에 함께 들어감
   · 게임 오브젝트의 「플레이어블 디렉터」 컴포넌트(props.director)가 어떤 타임라인을 재생할지, 각 트랙이 어떤 오브젝트를 움직일지(바인딩)를 정함
   · 트랙: 활성화(Activation) · 애니메이션(Animation) · 오디오(Audio) · 시그널(Signal)

   TIMELINE(get, set) — anim-editor.js 와 같은 방식으로 부르는 화면의 변수를 「이름 그대로」 읽습니다.
   돌려주는 것(TLH): pose · act(그리기 · 활성 상태 훅) · tick(플레이) · render · live · directorComp · dirProxy … */
function TIMELINE(get,set){
  const OWN=Object.prototype.hasOwnProperty,cache=Object.create(null);
  const H=new Proxy(Object.create(null),{
    has(_,n){if(typeof n!=='string')return false;if(cache[n])return true;
      let g;try{g=get(n)}catch(e){return false}
      if(n in globalThis){try{if(g()===globalThis[n])return false}catch(e){}}
      cache[n]=g;return true},
    get(_,n){if(typeof n!=='string')return undefined;return(cache[n]||(cache[n]=get(n)))()},
    set(_,n,v){set(n,v);return true}
  });
  void OWN;
  with(H){return(function(){'use strict';

/* ---------- 트랙 종류 ---------- */
const TL_T={
  act:{n:'활성화 트랙',en:'Activation Track',c:'#3fae7d',ic:'tlact',bind:true,clip:'활성'},
  anim:{n:'애니메이션 트랙',en:'Animation Track',c:'#4a8fe0',ic:'anim',bind:true},
  audio:{n:'오디오 트랙',en:'Audio Track',c:'#e0953a',ic:'sound',bind:false},
  sig:{n:'시그널 트랙',en:'Signal Track',c:'#b9bcc9',ic:'tlsig',bind:true}
};
const TL_ORDER=['act','anim','audio','sig'];
const TL_WRAP=[['none','없음 (끝나면 멈춤)'],['hold','유지 (마지막 장면에서 멈춤)'],['loop','반복']];
const TL_POST=[['revert','되돌리기 (원래 상태)'],['active','켜 두기'],['inactive','꺼 두기'],['keep','마지막 상태 그대로']];
const TL_FPS=[24,25,30,50,60];
const TL_RH=46,TL_TOP=26,TL_HW=230;

/* ---------- 데이터 ---------- */
const tlNormed=new WeakSet();
function tlList(){
  const d=ANX.anData();if(!Array.isArray(d.tls))d.tls=[];
  if(!tlNormed.has(d.tls)){d.tls=d.tls.filter(t=>t&&typeof t==='object').map(tlNormOne);tlNormed.add(d.tls)}
  return d.tls;
}
const tlGet=id=>id?tlList().find(t=>t.id===id)||null:null;
const tlNum=(v,d,a,b)=>{v=+v;if(!isFinite(v))v=d;return clamp(v,a,b)};
function tlNormOne(t){
  const o={id:String(t.id||uid()),name:String(t.name||'타임라인').slice(0,40),fps:TL_FPS.includes(+t.fps)?+t.fps:60,fixed:!!t.fixed,len:tlNum(t.len,5,.1,3600),tracks:[]};
  (Array.isArray(t.tracks)?t.tracks:[]).forEach(r=>{if(!r||!TL_T[r.type])return;
    const tr={id:String(r.id||uid()),type:r.type,name:String(r.name||_t(TL_T[r.type].n)).slice(0,40),mute:!!r.mute,clips:[],marks:[]};
    if(r.type==='act')tr.post=TL_POST.some(q=>q[0]===r.post)?r.post:'revert';
    (Array.isArray(r.clips)?r.clips:[]).forEach(c=>{if(!c||r.type==='sig')return;
      const q={id:String(c.id||uid()),s:tlNum(c.s,0,0,3600),d:tlNum(c.d,1,1/240,3600)};
      if(r.type==='anim'){q.k=String(c.k||'');q.spd=tlNum(c.spd,1,.05,10);q.in=tlNum(c.in,0,0,3600);if(c.rec)q.rec=true}
      else if(r.type==='audio'){q.a=String(c.a||'');q.vol=tlNum(c.vol,1,0,1);q.in=tlNum(c.in,0,0,3600)}
      tr.clips.push(q)});
    tr.clips.sort((a,b)=>a.s-b.s);
    if(r.type==='sig')(Array.isArray(r.marks)?r.marks:[]).forEach(m=>{if(!m)return;tr.marks.push({id:String(m.id||uid()),t:tlNum(m.t,0,0,3600),m:String(m.m||'').slice(0,60)})});
    tr.marks.sort((a,b)=>a.t-b.t);
    o.tracks.push(tr)});
  return o;
}
/* 타임라인 길이(초): 고정 길이 또는 마지막 클립 · 시그널 끝 */
function tlDur(tl){if(!tl)return 0;if(tl.fixed)return tl.len;let e=0;tl.tracks.forEach(tr=>{tr.clips.forEach(c=>{e=Math.max(e,c.s+c.d)});tr.marks.forEach(m=>{e=Math.max(e,m.t)})});return e}
const tlTrack=(tl,id)=>tl&&id?tl.tracks.find(t=>t.id===id)||null:null;
const tlFr=(tl,t)=>Math.round(t*(tl?tl.fps:60)+1e-6);
const tlSnapT=(tl,t)=>Math.max(0,Math.round(t*tl.fps)/tl.fps);
function tlClipAt(tr,t){let r=null;for(const c of tr.clips){if(t>=c.s-1e-9&&t<=c.s+c.d+1e-9)r=c}return r}
function tlClipName(tr,c){
  if(tr.type==='act')return _t('활성');
  if(tr.type==='anim'){const k=ANX.anClip(c.k);return k?k.name:_t('(클립 없음)')}
  if(tr.type==='audio'){const a=audOf(c.a);return a?a.name:_t('(오디오 없음)')}
  return'';
}
/* 디렉터 */
const tlDirOf=o=>o&&!isUiEl(o)&&o.props&&o.props.director?o.props.director:null;
function tlDirNorm(d){if(!d.binds||typeof d.binds!=='object')d.binds={};if(!['none','hold','loop'].includes(d.wrap))d.wrap='none';if(d.awake==null)d.awake=true;return d}
/* 트랙이 움직일 오브젝트 (바인딩) */
function tlBound(m,dirO,tr){const id=dirO&&dirO.props.director&&dirO.props.director.binds[tr.id];return id?m.objs.find(o=>o.id===id)||null:null}

/* ---------- 계산 (편집 미리보기 · 플레이 공용) ---------- */
/* 오브젝트 o가 시간 t에 받을 애니메이션 포즈 (여러 트랙이면 아래쪽 트랙이 이김) */
function tlPoseAt(tl,binds,oid,t,only){
  let q=null;
  for(const tr of tl.tracks){if(tr.type!=='anim'||tr.mute||binds[tr.id]!==oid||(only&&tr.id!==only))continue;
    const r=tlTrackPose(tr,t);if(r)q=Object.assign(q||{},r)}
  return q;
}
/* 한 트랙의 시간 t 포즈: 그 시간에 걸친 클립을 차례로 겹침 (뒤 클립이 이김) · 녹화 클립은 끝난 뒤에도 마지막 값을 유지(Hold) */
function tlTrackPose(tr,t,skip){
  let q=null;
  for(const c of tr.clips){if(c===skip||!(t>=c.s-1e-9&&(c.rec||t<=c.s+c.d+1e-9)))continue;const k=ANX.anClip(c.k);if(!k)continue;
    q=Object.assign(q||{},ANX.anEval(k,ANX.anFrameAt(k,(t-c.s)*(c.spd||1)+(c.in||0))))}
  return q;
}
/* 활성화 트랙: 클립 안이면 켜짐, 밖이면 꺼짐 · 묶인 트랙이 없으면 null */
function tlActAt(tl,binds,oid,t){
  let r=null;
  for(const tr of tl.tracks){if(tr.type!=='act'||tr.mute||binds[tr.id]!==oid)continue;r=!!tlClipAt(tr,t)||r===true}
  return r;
}
/* 한 디렉터의 지금 결과를 pose · act 맵에 모음 */
function tlCollect(tl,binds,t,pose,act){
  const ids=new Set();tl.tracks.forEach(tr=>{const id=binds[tr.id];if(id&&!tr.mute&&(tr.type==='anim'||tr.type==='act'))ids.add(id)});
  ids.forEach(id=>{const q=tlPoseAt(tl,binds,id,t);if(q)pose.set(id,q);const a=tlActAt(tl,binds,id,t);if(a!=null)act.set(id,a)});
}

/* ---------- 타임라인 창 상태 ---------- */
const TL={rec:null,obj:null,sel:null,t:0,playing:false,preview:true,pps:120,sx:0,drag:null,raf:0,last:0,vis:false,ctx:null,lock:false};
const tlVisNow=()=>{try{return ANX.anVis('tl')}catch(e){return false}};
/* 창이 보여 주는 디렉터: 선택한 오브젝트에 디렉터가 있으면 그것, 아니면 마지막으로 보던 것(같은 씬에 남아 있으면) */
function tlTarget(){
  const m=play?play.m:cur();if(!m)return{m:null};
  const s=getSel(),so=s&&!isUiEl(s)&&m.objs.find(o=>o.id===s.id)||null;
  let o=null;
  if(!TL.lock&&so&&tlDirOf(so))o=so;
  if(!o&&TL.obj)o=m.objs.find(q=>q.id===TL.obj&&tlDirOf(q))||null;
  if(!o&&so&&tlDirOf(so))o=so;
  if(o)TL.obj=o.id;
  const d=o?tlDirNorm(o.props.director):null,tl=d?tlGet(d.tl):null;
  return{m,o,d,tl,so};
}
/* 편집 중 미리보기 맵 (창이 보이고 미리보기가 켜져 있을 때) */
function tlPrevRefresh(){
  const had=!!TL.ctx;TL.ctx=null;
  if(!play&&TL.preview&&TL.vis){const{m,o,d,tl}=tlTarget();if(m&&o&&tl){const pose=new Map(),act=new Map();tlCollect(tl,d.binds,TL.t,pose,act);
    if(TL.rec){const q=pose.get(TL.rec.oid);if(q){const r=Object.assign({},q);REC_P.forEach(k=>delete r[k]);pose.set(TL.rec.oid,r)}}
    TL.ctx={m,pose,act}}}
  if(had||TL.ctx)need();
}

/* ---------- 그리기 훅 (anim-editor.js의 anPoseFor · edit.html의 objOn이 부름) ---------- */
function pose(m,o,p){
  if(play){if(p!==play)return null;const R=play.tl;return R&&R.m===m?R.pose.get(o.id)||null:null}
  const c=TL.ctx;return c&&c.m===m?c.pose.get(o.id)||null:null;
}
function act(m,o){
  if(play){const R=play.tl;if(!R||R.m!==m||!R.act.size)return null;const v=R.act.get(o.id);return v==null?null:v}
  const c=TL.ctx;if(!c||c.m!==m||!c.act.size)return null;const v=c.act.get(o.id);return v==null?null:v;
}

/* ---------- 플레이 런타임 ---------- */
function tlRt(p){
  if(!p.tl||p.tl.m!==p.m){if(p.tl)p.tl.dirs.forEach(d=>tlAudStop(d));p.tl={m:p.m,dirs:new Map(),pose:new Map(),act:new Map()};
    p.m.objs.forEach(o=>{if(tlDirOf(o))p.tl.dirs.set(o.id,{o,t:0,st:'stopped',aud:[],boot:false,first:false})})}
  return p.tl;
}
function tlDirRt(p,o){const R=tlRt(p);let d=R.dirs.get(o.id);if(!d){d={o,t:0,st:'stopped',aud:[],boot:true,first:false};R.dirs.set(o.id,d)}return d}
function tlAudStop(d){(d.aud||[]).forEach(x=>{try{x.el.pause()}catch(e){}});d.aud=[]}
/* 오디오 트랙: 지금 시간이 들어 있는 클립만 소리가 나게 맞춤 */
function tlAudSync(p,d,tl){
  const want=[];
  if(d.st==='playing')tl.tracks.forEach(tr=>{if(tr.type!=='audio'||tr.mute)return;const c=tlClipAt(tr,d.t);if(c&&d.t<c.s+c.d-1e-3)want.push(c)});
  d.aud=d.aud.filter(x=>{if(want.includes(x.c))return true;try{x.el.pause()}catch(e){}return false});
  want.forEach(c=>{if(d.aud.some(x=>x.c===c))return;const a=audOf(c.a);if(!a||!a.src)return;
    const el=new Audio(a.src);el.volume=clamp(+c.vol,0,1);try{el.currentTime=Math.max(0,d.t-c.s+(c.in||0))}catch(e){}
    el.play().catch(()=>{});d.aud.push({c,el});if(Array.isArray(p.sfx))p.sfx.push(el);else p.sfx=[el]});
}
/* 시그널: (t0, t1] 사이의 마커를 차례로 부름 (incl0 = t0도 포함) */
function tlSignals(p,d,tl,t0,t1,incl0){
  const m=p.m;
  for(const tr of tl.tracks){if(tr.type!=='sig'||tr.mute)continue;
    for(const mk of tr.marks){if(!mk.m)continue;if(!((incl0?mk.t>=t0:mk.t>t0)&&mk.t<=t1))continue;
      if(!/^[A-Za-z_가-힣][\w가-힣]*$/.test(mk.m)){continue}
      const tgt=tlBound(m,d.o,tr)||d.o;if(!objOn(m,tgt))continue;
      d.t=mk.t;csRunMethods(m,tgt,[mk.m]);if(!play||play.m!==m)return false}}
  return true;
}
function tlPlay(p,d){const tl=tlGet(d.o.props.director.tl);if(!tl)return;if(d.st==='stopped'){d.t=0}d.st='playing';d.first=true;tlAudSync(p,d,tl)}
function tlPause(p,d){if(d.st!=='playing')return;d.st='paused';tlAudStop(d)}
function tlStop(p,d,natural){
  const tl=tlGet(d.o.props.director.tl),m=p.m;
  /* 활성화 트랙의 「끝난 뒤」 상태 */
  if(tl)tl.tracks.forEach(tr=>{if(tr.type!=='act'||tr.mute)return;const o=tlBound(m,d.o,tr);if(!o)return;
    const post=tr.post||'revert',last=!!tlClipAt(tr,d.t);
    if(post==='active'||(post==='keep'&&last))delete o.active;else if(post==='inactive'||(post==='keep'&&!last))o.active=false});
  d.st='stopped';d.t=0;tlAudStop(d);void natural;
}
function tick(p,dt){
  const m=p.m;if(!m)return;const R=tlRt(p);
  if(R.dirs.size){
    for(const d of[...R.dirs.values()]){
      if(!m.objs.includes(d.o)){tlAudStop(d);R.dirs.delete(d.o.id);continue}
      const dc=tlDirOf(d.o);if(!dc){tlAudStop(d);R.dirs.delete(d.o.id);continue}
      const tl=tlGet(dc.tl),on=objOn(m,d.o);
      if(!d.boot){d.boot=true;if(dc.awake!==false&&tl&&on)tlPlay(p,d)}
      if(d.st!=='playing'||!tl||!on)continue;
      const dur=tlDur(tl),t0=d.t;let t1=t0+dt;const incl=d.first;d.first=false;
      if(t1>=dur){
        const w=dc.wrap||'none';
        if(!tlSignals(p,d,tl,t0,dur,incl))return;
        if(w==='loop'&&dur>0){t1=t1%dur;tlAudStop(d);if(!tlSignals(p,d,tl,0,t1,true))return;d.t=t1}
        else if(w==='hold'){d.t=dur}
        else{d.t=dur;tlStop(p,d,true);continue}
      }else{if(!tlSignals(p,d,tl,t0,t1,incl))return;d.t=t1}
      tlAudSync(p,d,tl);
    }
  }
  tlRtCollect(p,dt);
}
function tlRtCollect(p,dt){
  const R=p.tl;if(!R)return;R.pose=new Map();R.act=new Map();
  R.dirs.forEach(d=>{if(d.st==='stopped')return;const dc=tlDirOf(d.o),tl=dc&&tlGet(dc.tl);if(!tl)return;tlDirNorm(dc);tlCollect(tl,dc.binds,d.t,R.pose,R.act)});
  /* 위치(x · y) 키: 그림만 옮기지 않고 오브젝트를 실제로 옮김 (스크립트 · 충돌 · 카메라가 따라옴) — 기준 = 씬에 놓인 자리 */
  const m=p.m,hero=startSpawn(m);if(!R.base)R.base=new Map();R.heroDrive=false;
  R.pose.forEach((q,id)=>{
    if(q.x==null&&q.y==null)return;const o=m.objs.find(x=>x.id===id);if(!o)return;
    if(!R.base.has(id))R.base.set(id,{x:o.x,y:o.y});const b=R.base.get(id),nx=b.x+(q.x||0),ny=b.y+(q.y||0);
    if(o===hero){const px=(nx+.5)*TS,py=(ny+.5)*TS,dx=px-p.px,dy=py-p.py,mv=Math.abs(dx)+Math.abs(dy)>.05;
      p.px=px;p.py=py;R.heroDrive=true;
      if(mv&&dt>0){heroFace(p,dx,dy);p.moved=true;p.walk=(p.walk||0)+dt}
      /* 주인공 기본 애니메이터: 움직이는 동안 걷기 · 방향 (스프라이트 키가 없을 때만) */
      const rt=p.anim&&p.anim.get(o.id);
      if(rt&&q.sprite==null&&dt>0){const has=n=>rt.c.params.some(x=>x.n===n);
        if(has('IsMoving'))rt.prm.IsMoving=mv;if(has('Dir')&&mv)rt.prm.Dir=Math.abs(dx)>=Math.abs(dy)?(dx<0?2:3):(dy<0?1:0)}}
    else{o.x=nx;o.y=ny}
    const r=Object.assign({},q);delete r.x;delete r.y;R.pose.set(id,r);
  });
}

/* ---------- 스크립트: GetComponent<PlayableDirector>() ---------- */
function dirProxy(m,o){
  const D=()=>{if(!play||play.m!==m)throw new Error('PlayableDirector는 플레이 중에만 쓸 수 있습니다');if(!tlDirOf(o))throw new Error(`MissingComponentException: ${o.name}의 플레이어블 디렉터(PlayableDirector) 컴포넌트가 제거되었습니다`);return tlDirRt(play,o)};
  const TLo=()=>tlGet(o.props.director.tl);
  return{__h:'PlayableDirector',__o:o,name:o.name,
    get(n){
      if(n==='gameObject')return goProxy(m,o);if(n==='transform')return trProxy(m,o);if(n==='name')return o.name;
      const d=D();
      if(n==='time')return d.t;
      if(n==='duration')return tlDur(TLo());
      if(n==='state')return d.st==='playing'?'Playing':'Paused';
      if(n==='isPlaying')return d.st==='playing';
      if(n==='playOnAwake')return o.props.director.awake!==false;
      if(n==='extrapolationMode'){const w=o.props.director.wrap;return w==='loop'?'Loop':w==='hold'?'Hold':'None'}
      if(n==='playableAsset'){const t=TLo();return t?t.name:''}
      throw csUnsup('PlayableDirector.'+n);
    },
    set(n,v){
      const d=D();
      if(n==='time'){const tl=TLo();d.t=clamp(csN(v),0,tlDur(tl)||0);if(tl&&d.st==='playing'){tlAudStop(d);tlAudSync(play,d,tl)}if(d.st==='stopped')d.st='paused';tlRtCollect(play);return}
      if(n==='playOnAwake'){o.props.director.awake=!!v;return}
      if(n==='extrapolationMode'){const s=String(csFmt(v)).replace(/^.*\./,'').toLowerCase();o.props.director.wrap=s==='loop'?'loop':s==='hold'?'hold':'none';return}
      if(n==='playableAsset'){const nm=csFmt(v),t=tlList().find(x=>x.name===nm);if(!t){clog('warn',`PlayableDirector.playableAsset: '${nm}' 타임라인이 없습니다`);return}o.props.director.tl=t.id;tlStop(play,d);return}
      throw csUnsup('PlayableDirector.'+n+' 대입');
    },
    call(n,a){
      const d=D();
      switch(n){
        case'Play':{if(a&&a.length){const nm=csFmt(a[0]),t=tlList().find(x=>x.name===nm);if(t&&t.id!==o.props.director.tl){o.props.director.tl=t.id;tlStop(play,d)}}
          if(!TLo()){clog('warn',`PlayableDirector.Play: ${o.name}의 디렉터에 타임라인이 없습니다`);return null}tlPlay(play,d);tlRtCollect(play);return null}
        case'Pause':tlPause(play,d);return null;
        case'Resume':if(d.st==='paused'){d.st='playing';const tl=TLo();if(tl)tlAudSync(play,d,tl)}return null;
        case'Stop':tlStop(play,d);tlRtCollect(play);return null;
        case'Evaluate':tlRtCollect(play);return null;
      }
      throw csUnsup('PlayableDirector.'+n+'()');
    }};
}

/* ---------- 인스펙터: 플레이어블 디렉터 컴포넌트 ---------- */
function directorComp(o){
  const d=tlDirNorm(o.props.director),tl=tlGet(d.tl),m=cur(),L0=tlList();
  const objs=m?m.objs.filter(q=>!isUiEl(q)):[];
  const binds=tl?tl.tracks.filter(tr=>TL_T[tr.type].bind).map(tr=>{const cur0=d.binds[tr.id]||'';const miss=cur0&&!objs.some(q=>q.id===cur0);
    return`<div class="tlib"><span class="tlibn" style="--tc:${TL_T[tr.type].c}" title="${esc(_t(TL_T[tr.type].n))}">${ico(TL_T[tr.type].ic)}<span data-i18n-skip>${esc(tr.name)}</span></span><select data-tldb="${tr.id}" aria-label="${esc(tr.name)}"><option value="">(없음)</option>${objs.map(q=>`<option value="${q.id}"${q.id===cur0?' selected':''} data-i18n-skip>${esc(q.name)}</option>`).join('')}${miss?`<option value="${esc(cur0)}" selected>(찾을 수 없음)</option>`:''}</select></div>`}).join(''):'';
  return comp('cd','timeline','플레이어블 디렉터'+compEn('PlayableDirector'),
    fr('타임라인',`<select data-tld="tl"><option value="">(없음)</option>${L0.map(x=>`<option value="${x.id}"${x.id===d.tl?' selected':''} data-i18n-skip>${esc(x.name)}</option>`).join('')}${d.tl&&!tl?'<option value="'+esc(d.tl)+'" selected>(찾을 수 없음)</option>':''}<option value="+new">＋ 새 타임라인…</option></select>`,false,'playableAsset','이 디렉터가 재생할 타임라인 에셋입니다. 타임라인 창에서 트랙과 클립을 편집합니다.')+
    fr('시작할 때 재생',`<input type="checkbox" data-tld="awake"${d.awake!==false?' checked':''}>`,false,'playOnAwake','켜면 플레이를 시작하거나 이 씬에 들어올 때 바로 재생합니다. 끄면 스크립트에서 director.Play()로 재생합니다.')+
    fr('끝나면',`<select data-tld="wrap">${TL_WRAP.map(([v,l])=>`<option value="${v}"${v===d.wrap?' selected':''}>${l}</option>`).join('')}</select>`,false,'extrapolationMode','타임라인 끝에 닿았을 때: 없음 = 멈추고 처음 상태로, 유지 = 마지막 장면에 머묾, 반복 = 처음부터 다시.')+
    (tl?`<div class="tlibh">바인딩 <small>트랙이 움직일 게임 오브젝트 · 계층 구조에서 타임라인 창의 트랙 머리로 끌어다 놓아도 됩니다</small></div>${binds||'<p class="hint" style="margin:2px 0 6px">아직 트랙이 없습니다. 타임라인 창의 「＋ 트랙」으로 추가하세요.</p>'}`:'')+
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn sm" data-anopen="tl">${ico('timeline')} 타임라인 창</button></div>`,
    '타임라인을 재생하는 컴포넌트입니다(유니티 PlayableDirector). 컷신처럼 여러 오브젝트의 애니메이션 · 켜고 끄기 · 소리 · 스크립트 호출(시그널)을 시간에 맞춰 한 번에 연출합니다. 스크립트: GetComponent<PlayableDirector>().Play()');
}
function newTimeline(name){const tl=tlNormOne({id:uid(),name:anUniq(tlList().map(x=>x.name),name||_t('타임라인')),fps:60,tracks:[]});tlList().push(tl);return tl}
/* 오브젝트에 디렉터 + 새 타임라인 (애니메이터 · 스프라이트가 있으면 애니메이션 트랙도 하나) */
function tlCreateFor(o){
  if(!o||isUiEl(o))return;if(o.mgr){toast('매니저에는 플레이어블 디렉터를 붙일 수 없습니다');return}
  let tl;ANX.anEdit(()=>{tl=newTimeline(_t('{name} 타임라인',{name:o.name}));
    if(o.props.animator||o.props.sprite||o.type==='spawn'){const tr={id:uid(),type:'anim',name:_t('애니메이션 트랙'),mute:false,clips:[],marks:[]};tl.tracks.push(tr);tl._bind=tr.id}},true);
  const b={};if(tl._bind){b[tl._bind]=o.id;delete tl._bind}
  o.props.director={tl:tl.id,awake:true,wrap:'none',binds:b};TL.obj=o.id;TL.t=0;TL.sel=null;
  commit();renderInsp();renderHier();render();need();toast(_t('「{name}」 타임라인과 플레이어블 디렉터를 만들었습니다',{name:tl.name}));
}
function tlNewFor(o){anAsk(_t('새 타임라인'),_t('타임라인 이름'),anUniq(tlList().map(x=>x.name),_t('{name} 타임라인',{name:o.name})),v=>{let tl;ANX.anEdit(()=>{tl=newTimeline(v)},true);tlDirNorm(o.props.director).tl=tl.id;TL.obj=o.id;TL.t=0;TL.sel=null;commit();renderInsp();render();need()})}
(()=>{
  const ins=$('#insp');
  ins.addEventListener('change',e=>{
    const t=e.target,o=inspObj();if(!o||!o.props||!o.props.director)return;const d=tlDirNorm(o.props.director);
    if(t.dataset.tld==='tl'){if(t.value==='+new'){t.value=d.tl||'';tlNewFor(o);return}d.tl=t.value;TL.obj=o.id;TL.sel=null;commit();renderInsp();render();need();return}
    if(t.dataset.tld==='awake'){d.awake=t.checked;commit();return}
    if(t.dataset.tld==='wrap'){d.wrap=t.value;commit();render();return}
    if(t.dataset.tldb){if(t.value)d.binds[t.dataset.tldb]=t.value;else delete d.binds[t.dataset.tldb];commit();render();need();return}
  });
})();

/* ======================= 타임라인 창 ======================= */
const tlX=t=>t*TL.pps-TL.sx+10;
const tlT=x=>(x-10+TL.sx)/TL.pps;
const tlFmt=(tl,t)=>{const fps=tl?tl.fps:60,f=Math.round(t*fps),s=Math.floor(f/fps);return s+':'+String(f%fps).padStart(2,'0')};
let tlSig='';
/* 안내문 칩 (컴포넌트 · 창 · 에셋 이름) */
const TLC=()=>{const c=ANX.anChip;return{dir:c('timeline','플레이어블 디렉터'),tl:c('timeline','타임라인'),animator:c('animator','애니메이터'),spr:c('uiimg','스프라이트'),atr:c('anim','애니메이션 트랙'),hier:c('hier','계층 구조'),go:c('cube','게임 오브젝트'),insp:c('info','인스펙터'),mgr:c('mgr','매니저')}};
function render(){
  recCheck();
  const box=$('#tlBox');TL.vis=!!box&&tlVisNow();
  if(!box||!TL.vis){tlPrevRefresh();return}
  const{m,o,d,tl,so}=tlTarget();
  if(!o){
    tlSig='';
    const C=TLC(),L=ANX.anLines;
    box.innerHTML=so?`<div class="anempty"><b data-i18n-skip>${esc(so.name)}</b>${so.mgr?L([['{a}에는 {b}을 붙일 수 없습니다.',{a:C.mgr,b:C.tl}]]):L([['이 오브젝트로 타임라인을 시작하려면 {a} 컴포넌트와 {b} 에셋을 만드세요.',{a:C.dir,b:C.tl}]])+ANX.anMk('<button class="btn pri sm" data-tl="create">만들기</button>',['플레이어블 디렉터와 타임라인을 한 번에 만듭니다.','애니메이터나 스프라이트가 있으면 이 오브젝트를 움직이는 애니메이션 트랙도 넣습니다.'])}</div>`
      :`<div class="anempty"><b>타임라인</b>${L([['타임라인을 만들려면 {a}에서 {b}를 선택하세요.',{a:C.hier,b:C.go}]])}${L(['여러 오브젝트의 애니메이션 · 켜고 끄기 · 소리 · 스크립트 호출을 한 줄의 시간 위에 늘어놓습니다.','컷신처럼 연출할 때 씁니다 (유니티 Timeline).'],true)}</div>`;
    tlPrevRefresh();return}
  if(!tl){
    tlSig='';
    const C=TLC(),L=ANX.anLines;
    box.innerHTML=`<div class="anempty"><b data-i18n-skip>${esc(o.name)}</b>${L([['{a}에 {b}이 지정되지 않았습니다.',{a:C.dir,b:C.tl}]])}<button class="btn pri sm" data-tl="newtl">＋ 새 타임라인</button>${tlList().length?L([['또는 {a}의 {b}에서 기존 타임라인을 고르세요.',{a:C.insp,b:C.dir}]],true):''}</div>`;
    tlPrevRefresh();return}
  const dur=tlDur(tl),rt=play&&play.tl&&play.tl.dirs.get(o.id);
  if(rt)TL.t=rt.t;
  const selC=tlSelGet(tl);
  if(TL.rec)recApply();
  const rec=TL.rec&&tlTrack(tl,TL.rec.tr),recO=rec&&m.objs.find(x=>x.id===TL.rec.oid);
  box.innerHTML=`<div class="awwin tlwin${rec?' recon':''}">
    <div class="antop">
      <button class="awpv${TL.preview?' on':''}" data-tl="preview" title="미리보기: 씬 뷰에서 이 시간의 타임라인 결과를 보여 줍니다"${play?' disabled':''}><i></i>미리보기</button>
      <span class="awtr">
        <button class="ib" data-tl="first" title="처음으로" aria-label="처음으로">⏮</button><button class="ib" data-tl="prev" title="이전 프레임 (,)" aria-label="이전 프레임">◀</button>
        <button class="ib awplay${tlIsPlaying(o)?' on':''}" data-tl="play" title="재생 / 일시 정지 (Space)" aria-label="재생">${tlIsPlaying(o)?'❚❚':'▶'}</button>
        <button class="ib" data-tl="next" title="다음 프레임 (.)" aria-label="다음 프레임">▶|</button><button class="ib" data-tl="last" title="끝으로" aria-label="끝으로">⏭</button>
      </span>
      <input type="number" class="awfr" data-tl="frame" min="0" step="1" value="${tlFr(tl,TL.t)}" title="현재 프레임" aria-label="현재 프레임">
      <span class="awlen tltime">${tlFmt(tl,TL.t)}</span>
      <button type="button" class="tpbtn tlpick" data-tl="pick" title="이 디렉터가 재생할 타임라인 (눌러서 선택)">${ico('timeline')}<span class="tpn"><b data-i18n-skip>${esc(tl.name)}</b></span><svg class="tpc" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <button class="btn sm" data-tl="addtrack" title="트랙 추가">＋ 트랙</button>
      <button class="ib" data-tl="menu" title="타임라인 메뉴" aria-label="타임라인 메뉴">${ico('more')}</button>
      <span class="awlen" title="${esc(_t(tl.fixed?'고정 길이':'자동 길이 (마지막 클립까지)'))}">${tl.fixed?esc(_t('고정'))+' · ':''}${dur.toFixed(2)}s · ${tl.fps}fps</span>
      <span class="spacer"></span>
      <button class="ib tllock${TL.lock?' on':''}" data-tl="lock" title="${TL.lock?'잠금 해제: 다른 디렉터를 선택하면 그 타임라인으로 바뀝니다':'잠금: 다른 오브젝트를 선택해도 이 타임라인을 계속 보여 줍니다'}" aria-label="잠금">${TL.lock?'🔒':'🔓'}</button>
      <span class="anchip on" title="플레이어블 디렉터가 있는 오브젝트">${ico('cube')}<span data-i18n-skip>${esc(o.name)}</span></span>
    </div>
    ${rec?`<div class="tlrecbar"><b>● 녹화 중</b><span class="tlrecn" data-i18n-skip>${esc(rec.name)} · ${esc(recO?recO.name:'')}</span><button class="btn sm" data-tl="reckey" title="지금 상태를 이 시간에 키로 남깁니다 (가만히 서 있는 구간을 만들 때)">◆ 키 남기기</button><button class="btn sm" data-tl="recdel" title="이 시간에 있는 녹화 키를 지웁니다">이 시간 키 지우기</button><button class="btn sm pri" data-tl="recstop">녹화 끝</button><span class="spacer"></span>${qb(['재생 위치를 옮기고 씬 뷰나 인스펙터에서 위치 · 회전 · 크기 · 스프라이트를 바꾸면 그 시간에 키가 생깁니다.','키와 키 사이는 천천히 이어집니다.','◆ 키를 끌면 0.05초 단위로 옮겨집니다.','Shift를 누른 채 끌면 단위 없이 옮깁니다.','◆ 키를 누른 뒤 Delete로 지웁니다 (녹화 중이 아니어도 됩니다).'].map(x=>_t(x)).join('\n'),'qwide')}</div>`:''}
    <div id="tlProp">${selC?tlPropHtml(tl,selC):tlPropEmpty()}</div>
    <div class="awmain tlmain">
      <div class="tlleft" id="tlLeft">
        <div class="awlh tllh"><span>트랙</span><span class="spacer"></span><span class="tlhint">${d.awake!==false?'▶ 시작할 때 재생':'스크립트로 재생'} · ${({none:'끝나면 멈춤',hold:'끝나면 유지',loop:'반복'})[d.wrap]}</span></div>
        ${tl.tracks.map(tr=>tlHeadHtml(m,o,d,tl,tr)).join('')}
        <div class="awadd"><button class="btn sm" data-tl="addtrack">＋ 트랙 추가</button><small class="awaddh">계층 구조의 오브젝트를 트랙 머리에 끌어다 놓으면 그 오브젝트에 묶이고, 프로젝트 패널의 오디오는 오디오 트랙에 끌어다 놓으면 클립이 됩니다.</small></div>
      </div>
      <div class="awright" id="tlCvWrap" tabindex="0"><canvas id="tlCv"></canvas>${tl.tracks.length?'':`<div class="awdrop">「＋ 트랙」으로 활성화 · 애니메이션 · 오디오 · 시그널 트랙을 추가하세요</div>`}</div>
    </div></div>`;
  tlSig=tl.id;
  const lf=$('#tlLeft');if(lf){lf.scrollTop=TL.sy||0}
  tlPrevRefresh();
  requestAnimationFrame(draw);
}
function tlHeadHtml(m,o,d,tl,tr){
  const T=TL_T[tr.type],b=tlBound(m,o,tr),bid=d.binds[tr.id]||'';
  const objs=m.objs.filter(q=>!isUiEl(q));
  const bsel=T.bind?`<select class="tlbind" data-tlb="${tr.id}" title="이 트랙이 움직일 게임 오브젝트 (바인딩)" aria-label="바인딩"><option value="">${tr.type==='sig'?'(디렉터 오브젝트)':'(없음)'}</option>${objs.map(q=>`<option value="${q.id}"${q.id===bid?' selected':''} data-i18n-skip>${esc(q.name)}</option>`).join('')}${bid&&!b?`<option value="${esc(bid)}" selected>(찾을 수 없음)</option>`:''}</select>`
    :`<span class="tlnob">${tr.clips.length?_t('클립 {n}개',{n:tr.clips.length}):'오디오를 끌어다 놓으세요'}</span>`;
  const sel=TL.sel&&TL.sel.tr===tr.id;
  return`<div class="tlhead${tr.mute?' muted':''}${sel?' on':''}${T.bind&&!b&&tr.type!=='sig'?' nobind':''}" data-tlh="${tr.id}" style="--tc:${T.c}">
    <span class="tlbar"></span>
    <div class="tlhc"><div class="tlhr"><span class="tlic" title="${esc(_t(T.n))} (${T.en})">${ico(T.ic)}</span><span class="tlnm" data-tl="rename" data-tr="${tr.id}" title="${esc(_t(T.n))} · 더블클릭해서 이름 바꾸기" data-i18n-skip>${esc(tr.name)}</span>
      ${tr.type==='anim'?`<button class="ib tlrec${TL.rec&&TL.rec.tr===tr.id?' on':''}" data-tl="rec" data-tr="${tr.id}" title="${TL.rec&&TL.rec.tr===tr.id?'녹화 끝':'녹화: 재생 위치마다 바인딩된 오브젝트의 위치 · 회전 · 크기 · 스프라이트를 바꾸면 키로 기록하고, 키 사이는 천천히 이어집니다'}" aria-label="녹화">●</button>`:''}<button class="ib tlm${tr.mute?' on':''}" data-tl="mute" data-tr="${tr.id}" title="${tr.mute?'음소거 해제 (이 트랙을 다시 재생)':'음소거 (이 트랙을 재생하지 않음)'}" aria-label="음소거">M</button><button class="ib" data-tl="trmenu" data-tr="${tr.id}" title="트랙 메뉴" aria-label="트랙 메뉴">${ico('more')}</button></div>
    <div class="tlhr">${bsel}</div></div></div>`;
}
/* 선택한 클립 · 마커 속성 줄 */
function tlSelGet(tl){
  const s=TL.sel;if(!s)return null;const tr=tlTrack(tl,s.tr);if(!tr){TL.sel=null;return null}
  if(s.c){const c=tr.clips.find(x=>x.id===s.c);if(!c){TL.sel=null;return null}
    if(s.kf!=null){const k=ANX.anClip(c.k);if(!k||!k.tracks.some(T=>T.keys.some(q=>q.f===s.kf))){TL.sel={tr:s.tr,c:s.c};return{tr,c}}return{tr,c,kf:s.kf,k}}
    return{tr,c}}
  if(s.mk){const mk=tr.marks.find(x=>x.id===s.mk);if(!mk){TL.sel=null;return null}return{tr,mk}}
  TL.sel=null;return null;
}
/* 아무것도 고르지 않았을 때도 같은 높이로 (더블클릭 사이에 캔버스가 움직이지 않게) */
const tlPropEmpty=()=>TL.rec?'':`<div class="tlprop tlprop0"><span>클립이나 시그널을 누르면 여기에서 시작 · 길이 · 모션 등을 바꿉니다 · 빈 곳 더블클릭 = 추가 · 끝을 끌면 길이 조절 · Alt = 맞춤 끄기</span></div>`;
function tlPropHtml(tl,S){
  if(S.kf!=null){const T=TL_T.anim,t=tlKeyT(S.c,S.k,S.kf);
    return`<div class="tlprop" style="--tc:${T.c}"><b>◆ <span>녹화 키</span></b><label class="tlpf" title="${esc(_t('초'))}"><span>시간</span><input type="number" data-tlp="kt" step="0.05" min="0" value="${+t.toFixed(3)}"></label>
      <span class="tlkv" data-i18n-skip>${esc(tlKeyDesc(S.k,S.kf))}</span><span class="spacer"></span><button class="ib" data-tl="delsel" title="키 삭제 (Delete)" aria-label="키 삭제">${ico('trash')}</button></div>`}
  const fps=tl.fps,f=v=>(+v).toFixed(3).replace(/\.?0+$/,''),T=TL_T[S.tr.type];
  const fld=(lab,h,tip)=>`<label class="tlpf"${tip?` title="${esc(tip)}"`:''}><span>${lab}</span>${h}</label>`;
  if(S.mk)return`<div class="tlprop" style="--tc:${T.c}"><b>${ico('tlsig')}시그널</b>
    ${fld('시간',`<input type="number" data-tlp="mt" step="${1/fps}" min="0" value="${f(S.mk.t)}">`,'초')}
    ${fld('부를 메서드',`<input type="text" data-tlp="mm" value="${esc(S.mk.m)}" placeholder="${esc(_t('메서드 이름'))}" spellcheck="false" style="width:150px">`,'이 시간에 바인딩된 오브젝트(없으면 디렉터 오브젝트)의 스크립트에서 이 이름의 메서드를 부릅니다 (예: ShowTitle)')}
    <span class="spacer"></span><button class="ib" data-tl="delsel" title="삭제 (Delete)" aria-label="삭제">${ico('trash')}</button></div>`;
  const c=S.c;let ex='';
  if(S.tr.type==='anim'){const k=ANX.anClip(c.k);ex=fld('모션',`<button type="button" class="tpbtn tlclip" data-tl="clippick" title="애니메이션 클립 (눌러서 선택)"><img alt="" src="${ANX.clipThumbURL(k,48)}"><span class="tpn"><b data-i18n-skip>${esc(k?k.name:_t('(클립 없음)'))}</b></span></button>`)+fld('속도',`<input type="number" data-tlp="spd" step="0.05" min="0.05" max="10" value="${f(c.spd)}">`,'재생 속도 배율')+fld('시작 지점',`<input type="number" data-tlp="in" step="${1/fps}" min="0" value="${f(c.in)}">`,'클립을 몇 초 지점부터 재생할지 (Clip In)')+(k?`<button class="btn sm" data-tl="fitclip" title="타임라인 클립 길이를 애니메이션 클립 한 번 재생 길이에 맞춤">길이 맞추기</button><button class="btn sm" data-tl="editclip" title="애니메이션 창에서 이 클립 편집">${ico('anim')} 편집</button>`:'')}
  else if(S.tr.type==='audio'){const a=audOf(c.a);ex=fld('오디오',`<select data-tlp="a"><option value="">(없음)</option>${audios.map(x=>`<option value="${x.id}"${x.id===c.a?' selected':''} data-i18n-skip>${esc(x.name)}</option>`).join('')}</select>`)+fld('볼륨',`<input type="number" data-tlp="vol" step="0.05" min="0" max="1" value="${f(c.vol)}">`)+fld('시작 지점',`<input type="number" data-tlp="in" step="${1/fps}" min="0" value="${f(c.in)}">`,'소리를 몇 초 지점부터 재생할지 (Clip In)')+(a&&a.dur?`<button class="btn sm" data-tl="fitclip" title="오디오 길이에 맞춤">길이 맞추기</button>`:'')}
  return`<div class="tlprop" style="--tc:${T.c}"><b>${ico(T.ic)}<span data-i18n-skip>${esc(tlClipName(S.tr,c))}</span></b>
    ${fld('시작',`<input type="number" data-tlp="s" step="${1/fps}" min="0" value="${f(c.s)}">`,'초')}
    ${fld('길이',`<input type="number" data-tlp="d" step="${1/fps}" min="${1/fps}" value="${f(c.d)}">`,'초')}
    ${ex}<span class="spacer"></span><button class="ib" data-tl="dup" title="복제 (Ctrl+D)" aria-label="복제">${ico('copy')}</button><button class="ib" data-tl="delsel" title="삭제 (Delete)" aria-label="삭제">${ico('trash')}</button></div>`;
}
/* 선택 바꾸기: 속성 줄이 생기거나 없어질 때만 창을 다시 만듦 (캔버스를 갈아 끼우면 더블클릭이 끊김) */
function tlSelect(sel){
  TL.sel=sel;const box=$('#tlBox'),R=tlCur();if(!box||!R)return;
  const pb=$('#tlProp',box);if(pb){const sc=tlSelGet(R.tl);pb.innerHTML=sc?tlPropHtml(R.tl,sc):tlPropEmpty()}
  box.querySelectorAll('.tlhead').forEach(x=>x.classList.toggle('on',!!TL.sel&&x.dataset.tlh===TL.sel.tr));draw();
}
const tlIsPlaying=o=>{if(play){const d=play.tl&&play.tl.dirs.get(o.id);return!!d&&d.st==='playing'}return TL.playing};
function tlCur(){const r=tlTarget();return r.tl?r:null}

/* ---------- 캔버스 ---------- */
function draw(){
  const cv=$('#tlCv');if(!cv||!cv.isConnected)return;const r=tlCur();if(!r)return;const{m,o,d,tl}=r;
  const{w,h,d:dpr}=ANX.anFitCanvas(cv),g=cv.getContext('2d'),C=ANX.anCol(),acc=css('--accent')||'#e9bd0c',dur=tlDur(tl),fps=tl.fps;
  TL.sx=Math.max(0,TL.sx);const sy=TL.sy||0;
  g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=C.bg;g.fillRect(0,0,w,h);
  g.save();g.beginPath();g.rect(0,TL_TOP,w,h-TL_TOP);g.clip();
  tl.tracks.forEach((tr,i)=>{const y=TL_TOP+i*TL_RH-sy;if(i%2===0){g.fillStyle=C.row;g.fillRect(0,y,w,TL_RH)}if(TL.sel&&TL.sel.tr===tr.id&&!TL.sel.c&&!TL.sel.mk){g.fillStyle='rgba(233,189,12,.06)';g.fillRect(0,y,w,TL_RH)}});
  const xe=tlX(dur);if(xe<w){g.fillStyle=C.dim;g.fillRect(Math.max(0,xe),TL_TOP,w-Math.max(0,xe),h-TL_TOP)}
  g.restore();
  /* 눈금자 */
  g.fillStyle=C.ruler;g.fillRect(0,0,w,TL_TOP);g.strokeStyle=C.grid2;g.beginPath();g.moveTo(0,TL_TOP-.5);g.lineTo(w,TL_TOP-.5);g.stroke();
  const ppf=TL.pps/fps;let stepF=1;for(const s of[1,2,5,10,15,30,60,120,300,600,1800,3600]){if(s*ppf>=56){stepF=s;break}stepF=s}
  let minor=stepF>=fps?Math.max(1,Math.round(stepF/(stepF>=fps*10?10:stepF>=fps*5?5:fps>=50?4:5))):Math.max(1,Math.round(stepF/5));if(minor*ppf<6)minor=stepF;
  const f0=Math.max(0,Math.floor(tlT(0)*fps/minor)*minor),f1=Math.ceil(tlT(w)*fps);
  g.font='10px '+css('--f-mono');g.textAlign='left';g.textBaseline='middle';
  for(let f=f0;f<=f1;f+=minor){const x=Math.round(tlX(f/fps))+.5;
    if(f%stepF===0){g.strokeStyle=C.grid2;g.beginPath();g.moveTo(x,TL_TOP-10);g.lineTo(x,h);g.stroke();g.fillStyle=C.sub;g.fillText(tlFmt(tl,f/fps),x+3,9)}
    else{g.strokeStyle=C.grid;g.beginPath();g.moveTo(x,TL_TOP-4);g.lineTo(x,TL_TOP);g.stroke()}}
  if(xe>0&&xe<w){g.strokeStyle=acc;g.globalAlpha=.7;g.setLineDash([3,3]);g.beginPath();g.moveTo(Math.round(xe)+.5,TL_TOP-12);g.lineTo(Math.round(xe)+.5,h);g.stroke();g.setLineDash([]);g.globalAlpha=1;g.fillStyle=acc;g.beginPath();g.moveTo(xe,TL_TOP-1);g.lineTo(xe-5,TL_TOP-7);g.lineTo(xe+5,TL_TOP-7);g.closePath();g.fill()}
  /* 클립 · 마커 */
  g.save();g.beginPath();g.rect(0,TL_TOP,w,h-TL_TOP);g.clip();
  tl.tracks.forEach((tr,i)=>{
    const y=TL_TOP+i*TL_RH-sy,T=TL_T[tr.type];if(y>h||y+TL_RH<TL_TOP)return;
    const ga=tr.mute?.4:1;g.globalAlpha=ga;
    const keyQ=[];
    tr.clips.forEach(c=>{
      const x0=tlX(c.s),x1=tlX(c.s+c.d);if(x1<-4||x0>w+4)return;const on=TL.sel&&TL.sel.c===c.id,cw=Math.max(3,x1-x0);
      const cy=y+5,ch=TL_RH-10;
      g.fillStyle=T.c+(on?'':'cc');ANX.anRR(g,x0,cy,cw,ch,5);g.fill();
      g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x0+1,cy+ch-11,cw-2,10);
      g.save();ANX.anRR(g,x0,cy,cw,ch,5);g.clip();
      if(tr.type==='anim'){const k=ANX.anClip(c.k);
        if(k){/* 반복 경계 · 스프라이트 미리보기 */
          const one=ANX.anDur(k)/(c.spd||1);if(one>0&&one*TL.pps>8){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;for(let s=c.s+one-(c.in||0)/(c.spd||1);s<c.s+c.d-1e-6;s+=one){const lx=Math.round(tlX(s))+.5;if(lx>x0+2){g.beginPath();g.moveTo(lx,cy+2);g.lineTo(lx,cy+ch-2);g.stroke()}}}
          const tk=k.tracks.find(q=>q.p==='sprite'&&q.keys.length);
          /* 녹화 클립: 키 자리에 하얀 ◆ (재생 위치에 있는 키는 빨간 테두리 · 고른 키는 빛남) */
          if(c.rec)keyQ.push({c,k,cy,ch,x0,x1});
          if(tk&&cw>40&&!c.rec){const sz=ch-14;const sr=spriteRef(ANX.anValAt(tk,0));if(sr){const rr=sr.r,sc=Math.min(sz/rr.w,sz/rr.h);g.imageSmoothingEnabled=false;g.drawImage(sr.a.img,rr.x,rr.y,rr.w,rr.h,x0+5,cy+2+(sz-rr.h*sc)/2,rr.w*sc,rr.h*sc)}}}
        else{g.fillStyle='rgba(255,90,100,.55)';g.fillRect(x0,cy,cw,ch-11)}}
      else if(tr.type==='audio'){const a=audOf(c.a);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();const mid=cy+(ch-11)/2;
        for(let x=Math.max(x0+2,0);x<Math.min(x1-2,w);x+=3){const tt=tlT(x)-c.s+(c.in||0),amp=(Math.abs(Math.sin(tt*7.3)*Math.cos(tt*2.1+ (a?a.name.length:1)))*.8+.2)*(ch-15)/2;g.moveTo(x+.5,mid-amp);g.lineTo(x+.5,mid+amp)}g.stroke();
        if(!a){g.fillStyle='rgba(255,90,100,.55)';g.fillRect(x0,cy,cw,ch-11)}}
      else if(tr.type==='act'){g.fillStyle='rgba(255,255,255,.12)';for(let x=x0-ch;x<x1;x+=10){g.beginPath();g.moveTo(x,cy+ch);g.lineTo(x+ch,cy);g.lineTo(x+ch+4,cy);g.lineTo(x+4,cy+ch);g.closePath();g.fill()}}
      g.fillStyle='#fff';g.font='600 10.5px '+css('--f-ui');g.textBaseline='middle';g.textAlign='left';
      const lab=tlClipName(tr,c);if(cw>24)g.fillText(lab,x0+(tr.type==='anim'&&cw>40?ch-6:6),tr.type==='anim'?cy+ch-18:cy+ch/2-5);
      g.font='9.5px '+css('--f-mono');g.fillStyle='rgba(255,255,255,.85)';if(cw>60)g.fillText(c.d.toFixed(2)+'s',x0+5,cy+ch-5.5);
      g.restore();
      if(on){g.strokeStyle=acc;g.lineWidth=2;ANX.anRR(g,x0+1,cy+1,cw-2,ch-2,4);g.stroke();g.fillStyle=acc;g.fillRect(x0+1,cy+ch/2-7,3,14);g.fillRect(x1-4,cy+ch/2-7,3,14)}
    });
    /* 녹화 키 ◆: 같은 트랙의 다른 클립이 겹쳐 있어도 맨 위에 완전 하얀색으로 */
    g.globalAlpha=1;
    keyQ.forEach(({c,k,cy,ch,x0,x1})=>{
        {const fs=new Set();k.tracks.forEach(T=>T.keys.forEach(q=>fs.add(q.f)));const cyk=cy+ch/2-3;
            fs.forEach(f=>{const kt=tlKeyT(c,k,f),kx=tlX(kt);if(kx<x0-6||kx>x1+6)return;const now=Math.abs(kt-TL.t)<.5/tl.fps,sel=TL.sel&&TL.sel.c===c.id&&TL.sel.kf===f,z=sel?6.5:5;
              g.save();g.translate(kx,cyk);g.rotate(Math.PI/4);
              if(sel){/* 고른 키: 하얗게 빛남 */g.shadowColor='rgba(255,255,255,.95)';g.shadowBlur=14;g.fillStyle='#fff';g.fillRect(-z,-z,z*2,z*2);g.shadowBlur=6;g.fillRect(-z,-z,z*2,z*2);g.shadowBlur=0;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.5;g.strokeRect(-z-2.5,-z-2.5,z*2+5,z*2+5)}
              else{/* 완전 하얀색 (재생 위치에 있는 키는 빨간 테두리) */g.fillStyle='#fff';g.fillRect(-z,-z,z*2,z*2);g.strokeStyle=now?'#ff3b3b':'rgba(0,0,0,.55)';g.lineWidth=now?2:1;g.strokeRect(-z,-z,z*2,z*2)}
              g.restore();
              if(sel&&TL.drag&&TL.drag.t==='key'){const lab=kt.toFixed(2)+'s';g.font='600 10px '+css('--f-mono');const lw=g.measureText(lab).width+10;g.fillStyle='rgba(0,0,0,.75)';ANX.anRR(g,kx+10,cyk-7.5,lw,15,4);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(lab,kx+10+lw/2,cyk)}})}
    });
    if(tr.type==='sig')tr.marks.forEach(mk=>{const x=tlX(mk.t);if(x<-20||x>w+20)return;const on=TL.sel&&TL.sel.mk===mk.id,cy=y+TL_RH/2;
      g.strokeStyle=on?acc:'rgba(200,205,220,.55)';g.lineWidth=1;g.beginPath();g.moveTo(Math.round(x)+.5,y+4);g.lineTo(Math.round(x)+.5,y+TL_RH-4);g.stroke();
      g.fillStyle=on?acc:mk.m?T.c:'#ff6b78';g.beginPath();g.moveTo(x,cy+9);g.lineTo(x-7,cy);g.lineTo(x-7,cy-9);g.lineTo(x+7,cy-9);g.lineTo(x+7,cy);g.closePath();g.fill();
      g.strokeStyle='rgba(0,0,0,.4)';g.stroke();
      g.fillStyle=C.nodeT;g.font='10.5px '+css('--f-ui');g.textAlign='left';g.textBaseline='middle';g.fillText(mk.m||_t('(메서드 없음)'),x+10,cy-3)});
    g.globalAlpha=1;
  });
  /* 끌어 놓을 자리 미리보기 */
  if(TL.dropAt){const i=tl.tracks.findIndex(q=>q.id===TL.dropAt.tr);if(i>=0){const y=TL_TOP+i*TL_RH-sy,x=tlX(TL.dropAt.t);g.strokeStyle=acc;g.setLineDash([4,3]);g.strokeRect(x+.5,y+5.5,Math.max(30,TL.dropAt.d*TL.pps),TL_RH-11);g.setLineDash([])}}
  g.restore();
  /* 재생 위치 */
  ANX.anHsSync(cv.parentElement,Math.max((Math.max(dur,TL.t)+2)*TL.pps+20,w*1.5),w,TL.sx,v=>{TL.sx=v;draw()});
  const px=Math.round(tlX(TL.t))+.5;g.strokeStyle='#ff5b5b';g.lineWidth=1.5;g.beginPath();g.moveTo(px,TL_TOP-12);g.lineTo(px,h);g.stroke();
  const lab=tlFmt(tl,TL.t),lw=Math.max(30,g.measureText(lab).width+12);
  g.fillStyle='#ff5b5b';ANX.anRR(g,px-lw/2,1,lw,13,4);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='600 10px '+css('--f-mono');g.textBaseline='middle';g.fillText(lab,px,8);
  void m;void o;void d;
}
function tlHit(e){
  const cv=$('#tlCv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,R=tlCur();
  if(!R)return{x,y,row:-1};const tl=R.tl,sy=TL.sy||0;
  const row=y<TL_TOP?-1:Math.floor((y-TL_TOP+sy)/TL_RH),tr=row>=0?tl.tracks[row]||null:null;
  let c=null,mk=null,edge=0,kc=null,kf=null;
  if(tr&&tr.type==='anim'){const rt=TL_TOP+row*TL_RH-sy,cyk=rt+20;
    if(Math.abs(y-cyk)<=9){let best=7;tr.clips.forEach(q=>{if(!q.rec)return;const k=ANX.anClip(q.k);if(!k)return;const fs=new Set();k.tracks.forEach(T=>T.keys.forEach(z=>fs.add(z.f)));
      fs.forEach(f=>{const dx=Math.abs(tlX(tlKeyT(q,k,f))-x);if(dx<best){best=dx;kc=q;kf=f}})})}}
  if(tr){
    if(tr.type==='sig'){let best=9;tr.marks.forEach(q=>{const dx=Math.abs(tlX(q.t)-x);if(dx<=best){best=dx;mk=q}})}
    else for(let i=tr.clips.length-1;i>=0;i--){const q=tr.clips[i],x0=tlX(q.s),x1=tlX(q.s+q.d);if(x>=x0-3&&x<=x1+3){c=q;const ew=Math.min(7,(x1-x0)/3);edge=x<=x0+ew?-1:x>=x1-ew?1:0;break}}
  }
  return{x,y,row,tr,c,mk,edge,kc,kf,t:Math.max(0,tlT(x)),R};
}
/* 녹화 키: 클립 안 프레임 f ↔ 타임라인 시간 */
const TL_KSTEP=.05;
const tlKeyT=(c,k,f)=>c.s+(f/k.fps-(c.in||0))/(c.spd||1);
const tlKeyF=(c,k,t)=>Math.max(0,Math.round(((t-c.s)*(c.spd||1)+(c.in||0))*k.fps));
function tlKeyDesc(k,f){const v=p=>{const T=k.tracks.find(x=>x.p===p),q=T&&T.keys.find(x=>x.f===f);return q?q.v:null};
  const a=[];const x=v('x'),y=v('y'),r=v('rot');if(x!=null||y!=null)a.push(_t('위치')+' '+(+x||0).toFixed(2)+', '+(+y||0).toFixed(2));if(r)a.push(_t('회전')+' '+(+r).toFixed(0)+'°');const s=v('sprite');if(s)a.push(_t('스프라이트'));return a.join(' · ')}
/* 키 옮기기: tracks = 시작 때 복사본(없으면 지금 것) · 같은 자리 키는 덮어씀 */
function tlKeyMove(c,k,f0,nf,base){
  const src=base?JSON.parse(base):k.tracks;
  k.tracks=src.map(T=>{const ks=T.keys.map(q=>({f:q.f,v:q.v})),q=ks.find(x=>x.f===f0);if(!q||nf===f0)return{p:T.p,keys:ks};
    const rest=ks.filter(x=>x!==q&&x.f!==nf);rest.push({f:nf,v:q.v});rest.sort((a,b)=>a.f-b.f);return{p:T.p,keys:rest}});
  const end=tlKeyT(c,k,nf)+1/k.fps/(c.spd||1);if(end>c.s+c.d)c.d=+(end-c.s).toFixed(4);
}
/* 시간 맞추기: 프레임 + 가까운 클립 끝 · 재생 위치 (Alt = 끄기) */
function tlSnap(tl,t,skip,e){
  if(e&&e.altKey)return Math.max(0,t);
  let best=null,bd=7/TL.pps;
  const cand=[0,TL.t];tl.tracks.forEach(tr=>tr.clips.forEach(c=>{if(skip&&skip.has(c.id))return;cand.push(c.s,c.s+c.d)}));
  cand.forEach(v=>{const dd=Math.abs(v-t);if(dd<bd){bd=dd;best=v}});
  return best!=null?best:tlSnapT(tl,t);
}
function tlSetT(t,keep){
  const R=tlCur();if(!R)return;const tl=R.tl;if(!keep)tlStopPrev();
  TL.t=Math.max(0,tlSnapT(tl,t));
  if(play){const d=play.tl&&play.tl.dirs.get(R.o.id)||(play.m.objs.includes(R.o)?tlDirRt(play,R.o):null);if(d){d.t=Math.min(TL.t,tlDur(tl));if(d.st==='stopped')d.st='paused';tlAudStop(d);if(d.st==='playing')tlAudSync(play,d,tl);tlRtCollect(play)}}
  else if(R.o)TL.preview=true;
  if(TL.rec)recApply();
  tlSyncTop();tlPrevRefresh();draw();need();
}
function tlSyncTop(){
  const box=$('#tlBox');if(!box)return;const R=tlCur();if(!R)return;
  const fi=$('.awfr',box),ae=docOf(box).activeElement;if(fi&&fi!==ae)fi.value=tlFr(R.tl,TL.t);
  const tt=$('.tltime',box);if(tt)tt.textContent=tlFmt(R.tl,TL.t);
  const pb=$('.awpv',box);if(pb)pb.classList.toggle('on',TL.preview);
  const pl=$('.awplay',box);if(pl){const on=tlIsPlaying(R.o);pl.classList.toggle('on',on);pl.textContent=on?'❚❚':'▶'}
}
/* 편집 중 미리 재생 (씬 뷰에서 확인) */
function tlPlayPrev(){
  const R=tlCur();if(!R)return;
  if(play){const d=tlDirRt(play,R.o);if(d.st==='playing')tlPause(play,d);else tlPlay(play,d);tlRtCollect(play);tlSyncTop();return}
  if(TL.playing){tlStopPrev();return}
  const dur=tlDur(R.tl);if(dur<=0){toast('타임라인이 비어 있습니다. 트랙에 클립을 넣으세요');return}
  TL.playing=true;TL.preview=true;if(TL.t>=dur-1e-6)TL.t=0;TL.last=performance.now();tlSyncTop();
  const step=now=>{if(!TL.playing)return;const C=tlCur();if(!C||play){tlStopPrev();return}
    const dd=tlDur(C.tl);TL.t+=Math.min(.1,(now-TL.last)/1000);TL.last=now;
    if(TL.t>=dd){const w=C.d.wrap;if(w==='loop'&&dd>0)TL.t%=dd;else{TL.t=dd;tlStopPrev();tlPrevRefresh();draw();need();return}}
    if(TL.rec)recApply();tlPrevRefresh();draw();need();tlSyncTop();TL.raf=requestAnimationFrame(step)};
  TL.raf=requestAnimationFrame(step);
}
function tlStopPrev(){if(!TL.playing)return;TL.playing=false;cancelAnimationFrame(TL.raf);TL.t=tlCur()?tlSnapT(tlCur().tl,TL.t):TL.t;tlSyncTop()}

/* ---------- 녹화 (유니티 Timeline의 ● 녹화) ----------
   애니메이션 트랙의 ●를 누르면 녹화 중. 재생 위치를 옮기고 씬 뷰 · 인스펙터에서 바인딩된 오브젝트를 바꾸면(commit 때)
   그 시간에 키가 생김 → 키 사이는 「부드럽게」 보간(천천히 출발해 천천히 멈춤)으로 이어짐.
   · 키는 트랙의 「녹화」 클립(애니메이션 클립 하나 · 0초부터)에 들어가고, 값은 녹화를 시작할 때의 자리(base)에서 얼마나 바뀌었는지
     (위치 x·y = 칸 오프셋, 회전 = 더한 각도, 크기 = 곱한 배율, 스프라이트 = 그대로)
   · 녹화 중에는 오브젝트의 실제 값이 재생 위치의 값이 됨 (그래서 그 자리에서 바로 끌어 고칠 수 있음) — 녹화를 끝내면 base로 되돌림
   · 페이지를 닫아도 o._tlRec(base)가 남아 있어 다음에 열 때 되돌림 */
const REC_P=['x','y','rot','sx','sy','sprite'];
const recNum=(v,d)=>v==null||v===''||!isFinite(+v)?d:+v;
function recObj(){const m=cur();return TL.rec&&m?m.objs.find(o=>o.id===TL.rec.oid)||null:null}
function recBaseOf(o){return{x:o.x,y:o.y,rot:o.props.rot,sx:o.props.sx,sy:o.props.sy,sprite:o.props.sprite}}
function recPut(o,b){o.x=b.x;o.y=b.y;['rot','sx','sy','sprite'].forEach(k=>{if(b[k]===undefined)delete o.props[k];else o.props[k]=b[k]})}
/* 재생 위치에서 녹화 트랙이 정하는 값 (base 기준으로 계산한 실제 값) */
function recExpect(){
  const R=tlCur();if(!R||!TL.rec)return null;const tr=tlTrack(R.tl,TL.rec.tr);if(!tr)return null;
  const b=TL.rec.base,q=tlTrackPose(tr,TL.t)||{};
  const brot=recNum(b.rot,0),bsx=recNum(b.sx,1),bsy=recNum(b.sy,1);
  return{x:b.x+(q.x||0),y:b.y+(q.y||0),rot:brot+(q.rot||0),sx:bsx*(q.sx==null?1:q.sx),sy:bsy*(q.sy==null?1:q.sy),sprite:q.sprite!=null?q.sprite:(b.sprite||'')};
}
function recApply(){
  const o=recObj(),e=recExpect();if(!o||!e)return;const b=TL.rec.base;
  o.x=+e.x.toFixed(4);o.y=+e.y.toFixed(4);
  const set=(k,v,def)=>{if(b[k]===undefined&&Math.abs(v-def)<1e-6)delete o.props[k];else o.props[k]=+v.toFixed(4)};
  set('rot',e.rot,0);set('sx',e.sx,1);set('sy',e.sy,1);
  if(e.sprite)o.props.sprite=e.sprite;else if(b.sprite===undefined)delete o.props.sprite;else o.props.sprite=b.sprite;
  try{renderInsp()}catch(_){}need();
}
function recStart(trId){
  if(play){toast('플레이 중에는 녹화할 수 없습니다');return}
  const R=tlCur();if(!R)return;const tr=tlTrack(R.tl,trId);if(!tr||tr.type!=='anim')return;
  const o=tlBound(R.m,R.o,tr);if(!o){toast('먼저 이 트랙에 움직일 게임 오브젝트를 묶어 주세요 (트랙 머리의 바인딩)');return}
  if(TL.rec)recStop();
  tlStopPrev();
  const base=recBaseOf(o);o._tlRec=JSON.parse(JSON.stringify(base));
  TL.rec={tr:trId,oid:o.id,base};TL.preview=true;TL.sel={tr:trId};
  recApply();render();
  try{$('#stage').classList.add('tlrec')}catch(_){}
  toast(_t('● 녹화: 재생 위치를 옮기고 「{name}」을(를) 움직여 보세요',{name:o.name}));
}
function recStop(){
  const r=TL.rec;if(!r)return;TL.rec=null;
  const m=cur(),o=m&&m.objs.find(x=>x.id===r.oid);
  if(o){recPut(o,r.base);delete o._tlRec;TL.recSkip=true;try{commit()}finally{TL.recSkip=false}}
  try{$('#stage').classList.remove('tlrec')}catch(_){}
  try{renderInsp()}catch(_){}render();need();
}
/* 다른 씬 · 플레이 · 트랙이 사라짐 → 녹화 끝 · 지난번에 녹화 중 닫혔던 오브젝트는 원래 자리로 */
function recCheck(){
  if(TL.rec){const R=tlCur(),bad=play||!R||!tlTrack(R.tl,TL.rec.tr)||!recObj();if(bad)recStop();return}
  const m=cur();if(!m||play)return;
  m.objs.forEach(o=>{if(o._tlRec&&typeof o._tlRec==='object'){recPut(o,o._tlRec);delete o._tlRec;try{markDirty()}catch(_){}}});
}
/* 녹화 클립 (트랙에 하나 · 없으면 만듦) */
function recClip(R,tr,mk){
  const t=TL.t,recs=tr.clips.filter(x=>x.rec&&ANX.anClip(x.k));
  let c=recs.filter(x=>x.s<=t+1e-9).sort((a,b)=>b.s-a.s)[0]||null;if(c||!mk)return c;
  /* 재생 위치 앞에 녹화 클립이 없으면 새로 (처음이면 0초부터, 뒤에 다른 녹화 클립이 있으면 재생 위치부터) */
  return tlNewRecClip(R,tr,recs.length?tlSnapT(R.tl,t):0,1/R.tl.fps,recObj());
}
/* 빈 녹화 클립 (애니메이션 그림 없이 이동 · 방향 · 크기 키만 담는 클립) */
function tlNewRecClip(R,tr,s,d,o){
  const D=ANX.anData();
  const k={id:uid(),name:anUniq(D.clips.map(x=>x.name),_t('{name} 녹화',{name:o?o.name:tr.name})),fps:R.tl.fps,loop:false,smooth:true,tracks:[]};D.clips.push(k);
  const c={id:uid(),s,d,k:k.id,spd:1,in:0,rec:true};tr.clips.push(c);tr.clips.sort((a,b)=>a.s-b.s);return c;
}
/* 바뀐 값 → 키 (all = 바뀌지 않았어도 지금 값을 모두 남김) */
function recKey(all){
  const R=tlCur(),o=recObj(),e=recExpect();if(!R||!o||!e)return false;
  const b=TL.rec.base,cur0={x:o.x,y:o.y,rot:recNum(o.props.rot,0),sx:recNum(o.props.sx,1),sy:recNum(o.props.sy,1),sprite:o.props.sprite||''};
  const ch=(k)=>k==='sprite'?cur0.sprite!==e.sprite:Math.abs(cur0[k]-e[k])>1e-5;
  /* 찍은 시간마다 자세 전체(위치 · 회전 · 크기)를 키로 → 키와 키 사이에서만 움직임 (스프라이트는 바뀌었을 때만) */
  const any=all||['x','y','rot','sx','sy','sprite'].some(ch);if(!any)return false;
  const want=['x','y','rot','sx','sy'];if(ch('sprite')||(all&&cur0.sprite))want.push('sprite');
  const brot=recNum(b.rot,0),bsx=recNum(b.sx,1)||1,bsy=recNum(b.sy,1)||1;
  const val={x:+(cur0.x-b.x).toFixed(4),y:+(cur0.y-b.y).toFixed(4),rot:+(cur0.rot-brot).toFixed(3),sx:+(cur0.sx/bsx).toFixed(4),sy:+(cur0.sy/bsy).toFixed(4),sprite:cur0.sprite};
  const trId=TL.rec.tr,t=TL.t;
  ANX.anEdit(()=>{
    const R2=tlCur(),tr=tlTrack(R2.tl,trId),c=recClip(R2,tr,true),k=ANX.anClip(c.k);
    const q0=tlTrackPose(tr,c.s,c)||{};
    const neutral={x:q0.x||0,y:q0.y||0,rot:q0.rot||0,sx:q0.sx==null?1:q0.sx,sy:q0.sy==null?1:q0.sy,sprite:q0.sprite||b.sprite||''};
    const f=Math.max(0,Math.round(((t-c.s)*(c.spd||1)+(c.in||0))*k.fps));
    want.forEach(p=>{
      if(p==='sprite'&&!val.sprite)return;
      const T=ANX.anTrack(k,p,true);
      /* 처음 키를 0초가 아닌 곳에 찍으면 0초에 시작 상태(녹화 시작 때 자리)도 같이 → 그 사이를 천천히 움직임 */
      if(!T.keys.length&&f>0&&!(p==='sprite'&&!neutral.sprite))T.keys.push({f:0,v:neutral[p]});
      const q=T.keys.find(x=>x.f===f);if(q)q.v=val[p];else{T.keys.push({f,v:val[p]});T.keys.sort((a,b)=>a.f-b.f)}
    });
    const end=c.s+(f+1)/k.fps/(c.spd||1);if(end>c.s+c.d)c.d=+(end-c.s).toFixed(4);
  },true);
  render();need();return true;
}
function recDelKey(){
  const R=tlCur();if(!R||!TL.rec)return;const tr=tlTrack(R.tl,TL.rec.tr),c=tr&&recClip(R,tr,false),k=c&&ANX.anClip(c.k);
  if(!k){toast('지울 녹화 키가 없습니다');return}
  const f=Math.round(((TL.t-c.s)*(c.spd||1)+(c.in||0))*k.fps);
  if(!k.tracks.some(T=>T.keys.some(q=>q.f===f))){toast('이 시간에는 녹화 키가 없습니다');return}
  ANX.anEdit(()=>{const k2=ANX.anClip(c.k);k2.tracks.forEach(T=>{T.keys=T.keys.filter(q=>q.f!==f)});k2.tracks=k2.tracks.filter(T=>T.keys.length)},true);
  recApply();render();need();
}
/* edit.html의 commit()이 부름: 녹화 중인 오브젝트가 바뀌었으면 키로 */
function recHook(){if(!TL.rec||TL.recSkip||play)return;try{recKey(false)}catch(e){console.error(e)}}
/* ---------- 편집 (애니메이션 실행 취소 스택 사용) ---------- */
function tlEdit(fn){ANX.anEdit(fn,true);render();need()}
/* 끌기처럼 여러 번 바꾼 것을 한 번의 실행 취소로: 시작 때 상태(before)로 돌려놓고 끝 상태를 anEdit로 적용 */
function tlCommitFrom(before){const after=JSON.stringify(ANX.anData());if(after===before)return;P.anim=JSON.parse(before);ANX.anEdit(()=>{P.anim=JSON.parse(after)},true);render();need()}
function tlAddTrack(type){
  const R=tlCur();if(!R)return;const{o,d}=R;let id;
  tlEdit(()=>{const tl=tlCur().tl,T=TL_T[type];const tr={id:uid(),type,name:anUniq(tl.tracks.map(x=>x.name),_t(T.n)),mute:false,clips:[],marks:[]};if(type==='act')tr.post='revert';tl.tracks.push(tr);id=tr.id});
  if(type==='anim'||type==='sig'){if(!Object.values(d.binds).includes(o.id)||type==='sig'){d.binds[id]=o.id;commit()}}
  TL.sel={tr:id};render();renderInsp();
}
function tlTrackMenu(anchor,trId,at){
  const R=tlCur();if(!R)return;const tl=R.tl,tr=tlTrack(tl,trId);if(!tr)return;const i=tl.tracks.indexOf(tr);
  const items=[{head:_t(TL_T[tr.type].n),sub:tr.name,kind:'gen'}];
  if(tr.type==='act')items.push({label:'활성 클립 추가 (재생 위치)',fn:()=>tlAddClip(tr.id,at!=null?at:TL.t)});
  if(tr.type==='anim')items.push({label:'클립 추가… (재생 위치 · 빈 클립 또는 애니메이션)',fn:()=>tlAddClip(tr.id,at!=null?at:TL.t)});
  if(tr.type==='audio')items.push({label:'오디오 클립 추가… (재생 위치)',fn:()=>tlAddClip(tr.id,at!=null?at:TL.t)});
  if(tr.type==='sig')items.push({label:'시그널 추가 (재생 위치)',fn:()=>tlAddClip(tr.id,at!=null?at:TL.t)});
  items.push({sep:1},{label:'이름 바꾸기…',fn:()=>anAsk(_t('트랙 이름'),_t('이름'),tr.name,v=>tlEdit(()=>{const t2=tlTrack(tlCur().tl,trId);if(t2)t2.name=v.slice(0,40)}))},
    {label:tr.mute?'음소거 해제':'음소거',fn:()=>tlEdit(()=>{const t2=tlTrack(tlCur().tl,trId);t2.mute=!t2.mute})},
    {label:'위로 옮기기',disabled:i<=0,fn:()=>tlEdit(()=>{const L0=tlCur().tl.tracks;const j=L0.findIndex(x=>x.id===trId);if(j>0)[L0[j-1],L0[j]]=[L0[j],L0[j-1]]})},
    {label:'아래로 옮기기',disabled:i>=tl.tracks.length-1,fn:()=>tlEdit(()=>{const L0=tlCur().tl.tracks;const j=L0.findIndex(x=>x.id===trId);if(j>=0&&j<L0.length-1)[L0[j+1],L0[j]]=[L0[j],L0[j+1]]})},
    {label:'트랙 복제',fn:()=>tlEdit(()=>{const tl2=tlCur().tl,t2=tlTrack(tl2,trId),n=JSON.parse(JSON.stringify(t2));n.id=uid();n.name=anUniq(tl2.tracks.map(x=>x.name),t2.name);n.clips.forEach(c=>c.id=uid());n.marks.forEach(q=>q.id=uid());tl2.tracks.splice(tl2.tracks.indexOf(t2)+1,0,n);const dd=tlCur().d;if(dd.binds[trId]){dd.binds[n.id]=dd.binds[trId];commit()}})});
  if(tr.type==='act'){items.push({sep:1},{head:_t('끝난 뒤 상태'),sub:_t('타임라인이 멈추면 바인딩된 오브젝트를'),kind:'gen'});TL_POST.forEach(([v,l])=>items.push({label:l,checked:(tr.post||'revert')===v,fn:()=>tlEdit(()=>{tlTrack(tlCur().tl,trId).post=v})}))}
  items.push({sep:1},{label:'트랙 삭제',fn:()=>{tlEdit(()=>{const tl2=tlCur().tl;tl2.tracks=tl2.tracks.filter(x=>x.id!==trId)});const dd=tlCur()&&tlCur().d;if(dd&&dd.binds[trId]){delete dd.binds[trId];commit()}TL.sel=null;render();renderInsp()}});
  if(anchor)showMenu(anchor,items,false);else showMenuAt(TL.mx||100,TL.my||100,items);
}
function tlAddClip(trId,t,ref){
  const R=tlCur();if(!R)return;const tl=R.tl,tr=tlTrack(tl,trId);if(!tr)return;t=tlSnapT(tl,Math.max(0,t));
  const put=(mk)=>{let nid;tlEdit(()=>{const t2=tlTrack(tlCur().tl,trId);const c=mk();c.id=uid();nid=c.id;if(tr.type==='sig'){t2.marks.push(c);t2.marks.sort((a,b)=>a.t-b.t)}else{t2.clips.push(c);t2.clips.sort((a,b)=>a.s-b.s)}});TL.sel=tr.type==='sig'?{tr:trId,mk:nid}:{tr:trId,c:nid};render()};
  if(tr.type==='act'){put(()=>({s:t,d:1}));return}
  if(tr.type==='sig'){anAsk(_t('시그널'),_t('부를 메서드 이름 (예: ShowTitle)'),'',v=>{const nm=v.trim();if(!/^[A-Za-z_가-힣][\w가-힣]*$/.test(nm)){toast('메서드 이름은 글자 · 숫자 · _ 만 쓸 수 있습니다');return}put(()=>({t,m:nm}))});return}
  if(tr.type==='anim'){
    const pk=k=>{const kk=ANX.anClip(k);if(!kk)return;put(()=>({s:t,d:Math.max(1/tl.fps,ANX.anDur(kk)),k,spd:1,in:0}))};
    if(ref){pk(ref);return}
    const D=ANX.anData(),b=tlBound(R.m,R.o,tr),c=b&&ANX.anObjCtrl(b),mine=c?ANX.anCtrlClips(c):[];
    /* 빈 클립: 애니메이션 그림 없이 이동 · 방향만 — 만들고 바로 녹화 (바인딩된 오브젝트가 있으면) */
    const empty=()=>{let nid;tlEdit(()=>{const R2=tlCur(),t2=tlTrack(R2.tl,trId);nid=tlNewRecClip(R2,t2,t,2,b).id});TL.sel={tr:trId,c:nid};
      tlSetT(t);if(b){recStart(trId);toast(_t('빈 클립을 만들고 녹화를 시작했어요. 재생 위치를 옮기며 「{name}」을(를) 움직이거나 돌려 보세요',{name:b.name}))}else{render();toast('빈 클립을 만들었어요. 트랙에 움직일 오브젝트를 묶은 뒤 ●로 녹화하세요')}};
    const pick=()=>{const groups=mine.length?[{title:_t('바인딩된 오브젝트의 클립'),clips:mine},{title:_t('다른 클립'),clips:D.clips.filter(x=>!mine.includes(x))}].filter(g=>g.clips.length):[{clips:D.clips}];
      ANX.clipPickerModal(groups,'',{},v=>{if(v&&v!=='+new')pk(v)})};
    showMenuAt(TL.mx||100,TL.my||100,[{head:_t('애니메이션 트랙에 추가'),sub:tlFmt(tl,t),kind:'gen'},
      {label:_t('빈 클립 (이동 · 방향만) — 녹화로 키 넣기'),ic:'tmove',fn:empty},
      {label:_t('애니메이션 클립 고르기…'),ic:'anim',disabled:!D.clips.length,fn:pick}]);return}
  if(tr.type==='audio'){
    const pk=id=>{const a=audOf(id);if(!a)return;put(()=>({s:t,d:Math.max(1/tl.fps,+a.dur||2),a:id,vol:1,in:0}))};
    if(ref){pk(ref);return}
    if(!audios.length){toast('오디오가 없습니다. 프로젝트 패널의 「＋ 오디오 가져오기」로 소리 파일을 넣으세요');return}
    showMenuAt(TL.mx||100,TL.my||100,[{head:_t('오디오 클립'),sub:_t('재생 위치에 넣습니다'),kind:'gen'},...audios.map(a=>({label:a.name+(a.dur?' ('+(+a.dur).toFixed(1)+'s)':''),fn:()=>pk(a.id)}))]);return}
}
function tlDelSel(){
  const R=tlCur();if(!R||!TL.sel)return;const s=TL.sel;
  if(!s.c&&!s.mk){tlTrackMenu(null,s.tr);return}
  if(s.kf!=null){tlEdit(()=>{const tr=tlTrack(tlCur().tl,s.tr),c=tr&&tr.clips.find(x=>x.id===s.c),k=c&&ANX.anClip(c.k);if(!k)return;
    k.tracks.forEach(T=>{T.keys=T.keys.filter(q=>q.f!==s.kf)});k.tracks=k.tracks.filter(T=>T.keys.length)});TL.sel={tr:s.tr,c:s.c};render();return}
  tlEdit(()=>{const tr=tlTrack(tlCur().tl,s.tr);if(!tr)return;if(s.c)tr.clips=tr.clips.filter(x=>x.id!==s.c);else tr.marks=tr.marks.filter(x=>x.id!==s.mk)});TL.sel={tr:s.tr};render();
}
function tlDup(){
  const R=tlCur();if(!R||!TL.sel||!TL.sel.c||TL.sel.kf!=null)return;const s=TL.sel;let nid;
  tlEdit(()=>{const tr=tlTrack(tlCur().tl,s.tr),c=tr&&tr.clips.find(x=>x.id===s.c);if(!c)return;const n=Object.assign({},c,{id:uid(),s:c.s+c.d});nid=n.id;tr.clips.push(n);tr.clips.sort((a,b)=>a.s-b.s)});
  if(nid){TL.sel={tr:s.tr,c:nid};render()}
}
function tlFit(){const R=tlCur();if(!R)return;const cv=$('#tlCv');if(!cv)return;const w=cv.parentElement.clientWidth,dur=Math.max(1,tlDur(R.tl));TL.pps=clamp((w-40)/dur,8,2000);TL.sx=0;draw()}
function tlMenu(anchor){
  const R=tlCur();if(!R)return;const tl=R.tl;
  showMenu(anchor,[
    {label:'이름 바꾸기…',fn:()=>anAsk(_t('타임라인 이름'),_t('이름'),tl.name,v=>tlEdit(()=>{tlCur().tl.name=anUniq(tlList().filter(x=>x.id!==tl.id).map(x=>x.name),v)}))},
    {label:'복제해서 이 디렉터에 쓰기',fn:()=>{let nid;tlEdit(()=>{const n=JSON.parse(JSON.stringify(tlCur().tl));n.id=uid();n.name=anUniq(tlList().map(x=>x.name),tl.name+' '+_t('복사'));tlList().push(tlNormOne(n));nid=n.id});const d=tlCur().d;const old=tlGet(d.tl);const nt=tlGet(nid);if(old&&nt){const nb={};old.tracks.forEach((t2,i)=>{if(d.binds[t2.id]&&nt.tracks[i])nb[nt.tracks[i].id]=d.binds[t2.id]});d.binds=nb}d.tl=nid;commit();renderInsp();render()}},
    {label:'새 타임라인…',fn:()=>tlNewFor(R.o)},
    {sep:1},{head:_t('길이'),kind:'gen'},
    {label:'자동 (마지막 클립까지)',checked:!tl.fixed,fn:()=>tlEdit(()=>{tlCur().tl.fixed=false})},
    {label:'고정 길이…',checked:tl.fixed,fn:()=>anAsk(_t('타임라인 길이 (초)'),_t('길이'),String(+(tl.fixed?tl.len:Math.max(1,tlDur(tl))).toFixed(2)),v=>{const n=parseFloat(v);if(!(n>0)){toast('0보다 큰 숫자를 넣어 주세요');return}tlEdit(()=>{const t2=tlCur().tl;t2.fixed=true;t2.len=clamp(n,.1,3600)})})},
    {sep:1},{head:_t('프레임 속도'),kind:'gen'},
    ...TL_FPS.map(f=>({label:f+' fps',checked:tl.fps===f,fn:()=>tlEdit(()=>{tlCur().tl.fps=f})})),
    {sep:1},{label:'모두 보기 (F)',fn:tlFit},
    {label:'타임라인 삭제…',fn:()=>openModal(_t('타임라인 삭제'),`<p style="margin-top:0">${esc(_t('「{name}」을(를) 지울까요?',{name:tl.name}))}</p><p class="hint">${esc(_t('이 타임라인을 쓰는 디렉터는 타임라인이 비게 됩니다.'))}</p>`,[{t:'취소'},{t:'삭제',cls:'danger',fn:()=>{tlEdit(()=>{const D=ANX.anData();D.tls=tlList().filter(x=>x.id!==tl.id)});TL.sel=null;render();renderInsp()}}])}
  ],false);
}
function tlPickMenu(anchor){
  const R=tlCur();if(!R)return;
  showMenu(anchor,[...tlList().map(x=>({label:x.name,checked:x.id===R.tl.id,fn:()=>{R.d.tl=x.id;TL.sel=null;commit();renderInsp();render();need()}})),{sep:1},{label:'＋ 새 타임라인…',fn:()=>tlNewFor(R.o)}],false,tlList().length>8?{search:_t('타임라인 검색')}:undefined);
}

/* ---------- 창 이벤트 ---------- */
(()=>{
  const pan=panelEl.tl;if(!pan)return;
  pan.addEventListener('click',e=>{
    const b=e.target.closest('[data-tl]');if(!b)return;const a=b.dataset.tl;
    if(a==='create'){const s=getSel();if(s)tlCreateFor(s);return}
    if(a==='newtl'){const R=tlTarget();if(R.o)tlNewFor(R.o);return}
    const R=tlCur();if(!R)return;
    if(a==='preview'){TL.preview=!TL.preview;if(!TL.preview)tlStopPrev();tlSyncTop();tlPrevRefresh();need()}
    else if(a==='play')tlPlayPrev();
    else if(a==='first')tlSetT(0);
    else if(a==='last')tlSetT(tlDur(R.tl));
    else if(a==='prev')tlSetT(TL.t-1/R.tl.fps);
    else if(a==='next')tlSetT(TL.t+1/R.tl.fps);
    else if(a==='lock'){TL.lock=!TL.lock;render()}
    else if(a==='addtrack')showMenu(b,[{head:_t('트랙 추가'),sub:_t('유니티 Timeline 트랙'),kind:'gen'},...TL_ORDER.map(k=>({label:TL_T[k].n+' ('+TL_T[k].en+')',ic:TL_T[k].ic,fn:()=>tlAddTrack(k)}))],false);
    else if(a==='menu')tlMenu(b);
    else if(a==='pick')tlPickMenu(b);
    else if(a==='rec'){const id=b.dataset.tr;if(TL.rec&&TL.rec.tr===id)recStop();else recStart(id)}
    else if(a==='recstop')recStop();
    else if(a==='reckey')recKey(true);
    else if(a==='recdel')recDelKey();
    else if(a==='mute'){const id=b.dataset.tr;tlEdit(()=>{const t2=tlTrack(tlCur().tl,id);if(t2)t2.mute=!t2.mute})}
    else if(a==='trmenu')tlTrackMenu(b,b.dataset.tr);
    else if(a==='delsel')tlDelSel();
    else if(a==='dup')tlDup();
    else if(a==='clippick'){const S=tlSelGet(R.tl);if(!S||!S.c)return;const D=ANX.anData();const bo=tlBound(R.m,R.o,S.tr),c=bo&&ANX.anObjCtrl(bo),mine=c?ANX.anCtrlClips(c):[];
      const groups=mine.length?[{title:_t('바인딩된 오브젝트의 클립'),clips:mine},{title:_t('다른 클립'),clips:D.clips.filter(x=>!mine.includes(x))}].filter(g=>g.clips.length):[{clips:D.clips}];
      ANX.clipPickerModal(groups,S.c.k,{},v=>{if(!v||v==='+new')return;const ids={tr:S.tr.id,c:S.c.id};tlEdit(()=>{const c2=tlTrack(tlCur().tl,ids.tr).clips.find(x=>x.id===ids.c);if(c2)c2.k=v})})}
    else if(a==='fitclip'){const S=tlSelGet(R.tl);if(!S||!S.c)return;const ids={tr:S.tr.id,c:S.c.id};tlEdit(()=>{const tr=tlTrack(tlCur().tl,ids.tr),c2=tr.clips.find(x=>x.id===ids.c);if(!c2)return;
      if(tr.type==='anim'){const k=ANX.anClip(c2.k);if(k)c2.d=Math.max(1/240,ANX.anDur(k)/(c2.spd||1))}else if(tr.type==='audio'){const au=audOf(c2.a);if(au&&au.dur)c2.d=Math.max(1/240,+au.dur-(c2.in||0))}})}
    else if(a==='editclip'){const S=tlSelGet(R.tl);if(S&&S.c&&S.c.k){ANX.AW.clip=S.c.k;ANX.AW.f=0;anShowPanel('anim')}}
  });
  pan.addEventListener('dblclick',e=>{const n=e.target.closest('[data-tl="rename"]');if(!n)return;const id=n.dataset.tr,tr=tlTrack(tlCur()&&tlCur().tl,id);if(!tr)return;
    anAsk(_t('트랙 이름'),_t('이름'),tr.name,v=>tlEdit(()=>{const t2=tlTrack(tlCur().tl,id);if(t2)t2.name=v.slice(0,40)}))});
  /* 트랙 머리 클릭 = 트랙 선택 */
  pan.addEventListener('pointerdown',e=>{const h=e.target.closest('.tlhead');if(!h||e.target.closest('button,select,input'))return;tlSelect({tr:h.dataset.tlh})});
  pan.addEventListener('change',e=>{
    const t=e.target,R=tlCur();if(!R)return;
    if(t.dataset.tl==='frame'){tlSetT((Math.max(0,Math.round(+t.value||0)))/R.tl.fps);return}
    if(t.dataset.tlb){if(t.value)R.d.binds[t.dataset.tlb]=t.value;else delete R.d.binds[t.dataset.tlb];commit();renderInsp();render();need();return}
    if(t.dataset.tlp){const S=tlSelGet(R.tl);if(!S)return;const k=t.dataset.tlp,ids={tr:S.tr.id,c:S.c&&S.c.id,mk:S.mk&&S.mk.id},fps=R.tl.fps;
      tlEdit(()=>{const tr=tlTrack(tlCur().tl,ids.tr);if(!tr)return;
        if(k==='kt'&&S.kf!=null){const c=tr.clips.find(x=>x.id===ids.c),kk=c&&ANX.anClip(c.k);const v=parseFloat(t.value);if(!kk||!isFinite(v))return;const nf=tlKeyF(c,kk,Math.max(c.s,v));tlKeyMove(c,kk,S.kf,nf);TL.sel={tr:ids.tr,c:ids.c,kf:nf};return}
        if(ids.mk){const mk=tr.marks.find(x=>x.id===ids.mk);if(!mk)return;if(k==='mt'){const v=parseFloat(t.value);if(isFinite(v))mk.t=Math.max(0,Math.round(v*fps)/fps);tr.marks.sort((a,b)=>a.t-b.t)}else if(k==='mm'){const v=t.value.trim();if(v&&!/^[A-Za-z_가-힣][\w가-힣]*$/.test(v)){toast('메서드 이름은 글자 · 숫자 · _ 만 쓸 수 있습니다');return}mk.m=v}return}
        const c=tr.clips.find(x=>x.id===ids.c);if(!c)return;
        if(k==='a'){c.a=t.value;return}
        const v=parseFloat(t.value);if(!isFinite(v))return;
        if(k==='s')c.s=Math.max(0,Math.round(v*fps)/fps);else if(k==='d')c.d=Math.max(1/fps,Math.round(v*fps)/fps);else if(k==='spd')c.spd=clamp(v,.05,10);else if(k==='in')c.in=Math.max(0,v);else if(k==='vol')c.vol=clamp(v,0,1);
        tr.clips.sort((a,b)=>a.s-b.s)})}
  });
  pan.addEventListener('keydown',e=>{if(e.target.dataset&&e.target.dataset.tl==='frame'&&e.key==='Enter'){e.preventDefault();const R=tlCur();if(R)tlSetT((+e.target.value||0)/R.tl.fps)}});
  /* 왼쪽 트랙 목록 세로 스크롤 = 캔버스도 같이 */
  pan.addEventListener('scroll',e=>{if(e.target.id==='tlLeft'){TL.sy=e.target.scrollTop;draw()}},true);
  /* 캔버스 */
  pan.addEventListener('pointerdown',e=>{
    const wrap=e.target.closest('#tlCvWrap');if(!wrap||e.button!==0)return;const R=tlCur();if(!R)return;wrap.focus({preventScroll:true});
    const h=tlHit(e),tl=R.tl;try{wrap.setPointerCapture(e.pointerId)}catch(_){}
    if(h.row<0){TL.drag={t:'scrub'};tlSetT(h.t);return}
    /* 녹화 키 ◆: 누르면 선택, 끌면 시간 옮기기 (녹화 중이 아니어도) */
    if(h.kc){const k=ANX.anClip(h.kc.k);tlSelect({tr:h.tr.id,c:h.kc.id,kf:h.kf});
      TL.drag={t:'key',tr:h.tr.id,c:h.kc.id,f0:h.kf,t0:tlKeyT(h.kc,k,h.kf),x0:h.x,base:JSON.stringify(k.tracks),before:JSON.stringify(ANX.anData()),moved:false};wrap.style.cursor='ew-resize';return}
    /* 빨간 재생 위치 선을 잡으면 클립 위에서도 끌어 옮김 (클립 끝 · 시그널은 그대로) */
    if(!h.mk&&!h.edge&&Math.abs(h.x-tlX(TL.t))<=5){TL.drag={t:'scrub'};wrap.style.cursor='ew-resize';return}
    if(h.c){const before=JSON.stringify(ANX.anData());tlSelect({tr:h.tr.id,c:h.c.id});
      TL.drag={t:h.edge<0?'trimL':h.edge>0?'trimR':'move',tr:h.tr.id,c:h.c.id,x0:h.x,s0:h.c.s,d0:h.c.d,in0:h.c.in||0,before,moved:false,row0:h.row};return}
    if(h.mk){const before=JSON.stringify(ANX.anData());tlSelect({tr:h.tr.id,mk:h.mk.id});TL.drag={t:'mk',tr:h.tr.id,mk:h.mk.id,x0:h.x,t0:h.mk.t,before,moved:false};return}
    if(h.tr){tlSelect({tr:h.tr.id});TL.drag={t:'scrub'};tlSetT(h.t);return}
    tlSelect(null);TL.drag={t:'scrub'};tlSetT(h.t);
  });
  pan.addEventListener('pointermove',e=>{
    TL.mx=e.clientX;TL.my=e.clientY;
    if(!TL.drag){const w=e.target.closest&&e.target.closest('#tlCvWrap');if(w&&!e.target.closest('.anhs')&&tlCur()){const h=tlHit(e);w.style.cursor=h.row>=0&&!h.mk&&(h.edge?true:Math.abs(h.x-tlX(TL.t))<=5)?'ew-resize':''}}
    const D=TL.drag;if(!D)return;const R=tlCur();if(!R)return;const tl=R.tl,h=tlHit(e);
    if(D.t==='scrub'){tlSetT(h.t);return}
    const dt=(h.x-D.x0)/TL.pps;if(!D.moved&&Math.abs(h.x-D.x0)<3)return;D.moved=true;
    if(D.t==='key'){const tr=tlTrack(tl,D.tr),c=tr&&tr.clips.find(x=>x.id===D.c),k=c&&ANX.anClip(c.k);if(!k)return;
      /* 0.05초 단위 · Shift를 누르는 동안은 단위 없이(프레임까지) */
      let nt=Math.max(c.s,D.t0+dt);if(!e.shiftKey)nt=Math.max(c.s,Math.round(nt/TL_KSTEP)*TL_KSTEP);
      const nf=tlKeyF(c,k,nt);tlKeyMove(c,k,D.f0,nf,D.base);TL.sel={tr:D.tr,c:D.c,kf:nf};
      if(TL.rec)recApply();tlPrevRefresh();draw();need();return}
    if(D.t==='mk'){const tr=tlTrack(tl,D.tr),mk=tr&&tr.marks.find(x=>x.id===D.mk);if(!mk)return;mk.t=tlSnap(tl,Math.max(0,D.t0+dt),null,e);tlPrevRefresh();draw();return}
    let tr=tlTrack(tl,D.tr);const c=tr&&tr.clips.find(x=>x.id===D.c);if(!c)return;const sk=new Set([c.id]);
    if(D.t==='move'){
      let s=tlSnap(tl,Math.max(0,D.s0+dt),sk,e);const e2=tlSnap(tl,s+c.d,sk,e);if(!e||!e.altKey){if(Math.abs(e2-(s+c.d))>1e-9&&Math.abs(e2-(D.s0+dt+c.d))<Math.abs(s-(D.s0+dt)))s=Math.max(0,e2-c.d)}
      c.s=s;
      /* 같은 종류의 다른 트랙으로 옮기기 */
      if(h.tr&&h.tr.id!==tr.id&&h.tr.type===tr.type){tr.clips=tr.clips.filter(x=>x!==c);h.tr.clips.push(c);D.tr=h.tr.id;TL.sel={tr:h.tr.id,c:c.id};tr=h.tr}
      tr.clips.sort((a,b)=>a.s-b.s)}
    else if(D.t==='trimR'){const end=tlSnap(tl,D.s0+D.d0+dt,sk,e);c.d=Math.max(1/tl.fps,end-c.s)}
    else if(D.t==='trimL'){const end=D.s0+D.d0;let s=tlSnap(tl,Math.max(0,D.s0+dt),sk,e);s=Math.min(s,end-1/tl.fps);const ds=s-D.s0;c.s=s;c.d=end-s;if(tr.type!=='act')c.in=Math.max(0,D.in0+ds*(tr.type==='anim'?(c.spd||1):1))}
    tlPrevRefresh();draw();need();
  });
  const end=()=>{const D=TL.drag;TL.drag=null;if(!D)return;if(D.before&&D.moved)tlCommitFrom(D.before)};
  pan.addEventListener('pointerup',end);pan.addEventListener('pointercancel',end);
  pan.addEventListener('dblclick',e=>{if(!e.target.closest('#tlCvWrap'))return;const R=tlCur();if(!R)return;const h=tlHit(e);if(!h.tr||h.c||h.mk)return;TL.mx=e.clientX;TL.my=e.clientY;tlAddClip(h.tr.id,h.t)});
  pan.addEventListener('contextmenu',e=>{
    if(!e.target.closest('#tlCvWrap')&&!e.target.closest('.tlhead'))return;e.preventDefault();const R=tlCur();if(!R)return;TL.mx=e.clientX;TL.my=e.clientY;
    const hd=e.target.closest('.tlhead');if(hd){tlTrackMenu(null,hd.dataset.tlh);return}
    const h=tlHit(e);
    if(h.kc){tlSelect({tr:h.tr.id,c:h.kc.id,kf:h.kf});showMenuAt(e.clientX,e.clientY,[{label:'재생 위치를 이 키로',fn:()=>tlSetT(tlKeyT(h.kc,ANX.anClip(h.kc.k),h.kf))},{label:'키 삭제 (Delete)',fn:tlDelSel}]);return}
    if(h.c){tlSelect({tr:h.tr.id,c:h.c.id});const items=[{label:'복제 (Ctrl+D)',fn:tlDup},{label:'삭제 (Delete)',fn:tlDelSel}];
      if(h.tr.type==='anim'&&ANX.anClip(h.c.k))items.unshift({label:'애니메이션 창에서 클립 편집',fn:()=>{ANX.AW.clip=h.c.k;ANX.AW.f=0;anShowPanel('anim')}});
      if(h.tr.type!=='act')items.unshift({label:'길이를 원래 길이에 맞추기',fn:()=>{TL.sel={tr:h.tr.id,c:h.c.id};const b=$('#tlBox [data-tl="fitclip"]');if(b)b.click()}});
      showMenuAt(e.clientX,e.clientY,items);return}
    if(h.mk){tlSelect({tr:h.tr.id,mk:h.mk.id});showMenuAt(e.clientX,e.clientY,[{label:'삭제 (Delete)',fn:tlDelSel}]);return}
    if(h.tr){tlTrackMenu(null,h.tr.id,tlSnapT(R.tl,h.t));return}
    showMenuAt(e.clientX,e.clientY,TL_ORDER.map(k=>({label:_t('{t} 추가',{t:_t(TL_T[k].n)}),ic:TL_T[k].ic,fn:()=>tlAddTrack(k)})));
  });
  pan.addEventListener('wheel',e=>{
    if(!e.target.closest('#tlCvWrap'))return;e.preventDefault();const cv=$('#tlCv'),r=cv.getBoundingClientRect(),x=e.clientX-r.left;
    if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){TL.sx=Math.max(0,TL.sx+(e.deltaX||e.deltaY));draw();return}
    if(e.altKey){const lf=$('#tlLeft');if(lf){lf.scrollTop+=e.deltaY}return}
    const t=tlT(x);TL.pps=clamp(TL.pps*Math.pow(1.0018,-e.deltaY),8,2000);TL.sx=Math.max(0,t*TL.pps-x+10);draw();
  },{passive:false});
  pan.addEventListener('keydown',e=>{
    if(!e.target.closest('#tlCvWrap'))return;const R=tlCur();if(!R)return;const fps=R.tl.fps;
    if(e.code==='Space'){e.preventDefault();e.stopPropagation();tlPlayPrev();return}
    if(e.code==='Comma'){e.preventDefault();e.stopPropagation();tlSetT(TL.t-1/fps);return}
    if(e.code==='Period'){e.preventDefault();e.stopPropagation();tlSetT(TL.t+1/fps);return}
    if(e.code==='Home'){e.preventDefault();e.stopPropagation();tlSetT(0);return}
    if(e.code==='End'){e.preventDefault();e.stopPropagation();tlSetT(tlDur(R.tl));return}
    if(e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopPropagation();tlFit();return}
    if((e.key==='Delete'||e.key==='Backspace')&&TL.sel&&(TL.sel.c||TL.sel.mk)){e.preventDefault();e.stopPropagation();tlDelSel();return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyD'){e.preventDefault();e.stopPropagation();tlDup();return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();e.stopPropagation();anUndo(e.shiftKey);return}
    if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){e.preventDefault();e.stopPropagation();anUndo(true)}
  });
  /* 끌어다 놓기: 계층 구조의 오브젝트 → 트랙 머리(바인딩) · 프로젝트 패널의 오디오 → 오디오 트랙 · 애니메이션 클립은 메뉴로 */
  const types=e=>[...((e.dataTransfer&&e.dataTransfer.types)||[])];
  const hierIds=()=>{try{if(dnd&&dnd.kind==='obj')return dnd.ids||[]}catch(_){}return null};
  const clr=()=>{pan.querySelectorAll('.tlhead.drop').forEach(x=>x.classList.remove('drop'));const w=$('#tlCvWrap');if(w)w.classList.remove('drop');if(TL.dropAt){TL.dropAt=null;draw()}};
  pan.addEventListener('dragover',e=>{
    const R=tlCur();if(!R)return;const ty=types(e);
    const hd=e.target.closest&&e.target.closest('.tlhead');
    if(hd&&ty.includes('text/plain')&&hierIds()&&hierIds().length){const tr=tlTrack(R.tl,hd.dataset.tlh);if(tr&&TL_T[tr.type].bind){e.preventDefault();e.dataTransfer.dropEffect='move';if(!hd.classList.contains('drop')){clr();hd.classList.add('drop')}return}}
    if(ty.includes(AUD_MIME)){
      const w=e.target.closest&&e.target.closest('#tlCvWrap'),tr=hd?tlTrack(R.tl,hd.dataset.tlh):w?tlHit(e).tr:null;
      if(tr&&tr.type==='audio'){e.preventDefault();e.dataTransfer.dropEffect='copy';if(w){TL.dropAt={tr:tr.id,t:tlSnapT(R.tl,tlHit(e).t),d:1};draw()}else if(!hd.classList.contains('drop')){clr();hd.classList.add('drop')}return}
      if(w&&!R.tl.tracks.some(x=>x.type==='audio')){e.preventDefault();e.dataTransfer.dropEffect='copy';w.classList.add('drop');return}
    }
  });
  pan.addEventListener('dragleave',e=>{if(!pan.contains(e.relatedTarget))clr()});
  pan.addEventListener('drop',e=>{
    const R=tlCur();if(!R)return;const ty=types(e),hd=e.target.closest&&e.target.closest('.tlhead');
    if(hd&&hierIds()&&hierIds().length){const tr=tlTrack(R.tl,hd.dataset.tlh);if(tr&&TL_T[tr.type].bind){e.preventDefault();e.stopPropagation();clr();const id=hierIds()[0],ob=R.m.objs.find(q=>q.id===id);if(!ob||isUiEl(ob)){toast('게임 오브젝트만 묶을 수 있습니다');return}
      R.d.binds[tr.id]=ob.id;commit();renderInsp();render();need();toast(_t('{track} ← {name}',{track:tr.name,name:ob.name}));return}}
    if(ty.includes(AUD_MIME)){const aid=e.dataTransfer.getData(AUD_MIME);if(!aid)return;e.preventDefault();e.stopPropagation();
      const w=e.target.closest&&e.target.closest('#tlCvWrap');let tr=hd?tlTrack(R.tl,hd.dataset.tlh):w?tlHit(e).tr:null;const at=w?tlHit(e).t:TL.t;clr();
      if(!tr||tr.type!=='audio'){tr=R.tl.tracks.find(x=>x.type==='audio');if(!tr){tlAddTrack('audio');tr=tlCur().tl.tracks.find(x=>x.type==='audio')}}
      if(tr)tlAddClip(tr.id,at,aid);return}
  });
  document.addEventListener('dragend',clr);
  new ResizeObserver(()=>{const v=tlVisNow();if(v!==TL.vis){TL.vis=v;if(v)render();else{tlStopPrev();tlPrevRefresh()}need()}else if(v)draw()}).observe(pan);
})();
/* 플레이 중: 보고 있는 디렉터의 재생 위치를 따라감 */
function live(){
  if(!TL.vis)return;const R=tlCur();if(!R)return;const d=play&&play.tl&&play.tl.dirs.get(R.o.id);
  const t=d?d.t:0;if(Math.abs(t-TL.t)>1e-6||TL._pl!==(d&&d.st)){TL.t=t;TL._pl=d&&d.st;tlSyncTop();draw()}
}
/* 플레이를 멈추면 창을 편집 상태로 */
function playEnd(){TL.t=0;TL._pl=null;render()}

/* ---------- 번역 ---------- */
if(window.TI18N)TI18N.add({
'타임라인':['Timeline','タイムライン','时间轴'],'플레이어블 디렉터':['Playable Director','プレイアブルディレクター','可播放导演'],
'활성화 트랙':['Activation Track','アクティベーショントラック','激活轨道'],'애니메이션 트랙':['Animation Track','アニメーショントラック','动画轨道'],'오디오 트랙':['Audio Track','オーディオトラック','音频轨道'],'시그널 트랙':['Signal Track','シグナルトラック','信号轨道'],
'트랙':['Tracks','トラック','轨道'],'＋ 트랙':['＋ Track','＋ トラック','＋ 轨道'],'트랙 추가':['Add Track','トラックを追加','添加轨道'],'＋ 트랙 추가':['＋ Add Track','＋ トラックを追加','＋ 添加轨道'],
'유니티 Timeline 트랙':['Unity Timeline tracks','Unity Timeline のトラック','Unity Timeline 轨道'],
'활성':['Active','アクティブ','激活'],'(클립 없음)':['(no clip)','(クリップなし)','(无片段)'],'(오디오 없음)':['(no audio)','(オーディオなし)','(无音频)'],'(메서드 없음)':['(no method)','(メソッドなし)','(无方法)'],
'(디렉터 오브젝트)':['(Director object)','(ディレクターのオブジェクト)','(导演对象)'],'오디오를 끌어다 놓으세요':['Drop audio here','オーディオをドロップ','拖入音频'],'클립 {n}개':['{n} clips','クリップ {n} 個','{n} 个片段'],
'시작할 때 재생':['Play On Awake','開始時に再生','唤醒时播放'],'끝나면':['Wrap Mode','終了時','结束时'],'바인딩':['Bindings','バインディング','绑定'],
'없음 (끝나면 멈춤)':['None (stop at end)','なし（終わると停止）','无（结束时停止）'],'유지 (마지막 장면에서 멈춤)':['Hold (stay on last frame)','ホールド（最後の場面で停止）','保持（停在最后一帧）'],'반복':['Loop','ループ','循环'],
'되돌리기 (원래 상태)':['Revert (original state)','元に戻す（元の状態）','还原（原始状态）'],'켜 두기':['Active','アクティブのまま','保持激活'],'꺼 두기':['Inactive','非アクティブ','保持停用'],'마지막 상태 그대로':['Leave as is','最後の状態のまま','保持最后状态'],
'끝난 뒤 상태':['Post-playback state','再生後の状態','播放后状态'],'타임라인이 멈추면 바인딩된 오브젝트를':['When the timeline stops, the bound object is','タイムライン停止後、バインドされたオブジェクトを','时间轴停止后，绑定的对象'],
'＋ 새 타임라인':['＋ New Timeline','＋ 新しいタイムライン','＋ 新建时间轴'],'＋ 새 타임라인…':['＋ New Timeline…','＋ 新しいタイムライン…','＋ 新建时间轴…'],'새 타임라인':['New Timeline','新しいタイムライン','新建时间轴'],'새 타임라인…':['New Timeline…','新しいタイムライン…','新建时间轴…'],'타임라인 이름':['Timeline name','タイムライン名','时间轴名称'],
'{name} 타임라인':['{name} Timeline','{name} タイムライン','{name} 时间轴'],'타임라인 창':['Timeline window','タイムラインウィンドウ','时间轴窗口'],
'「{name}」 타임라인과 플레이어블 디렉터를 만들었습니다':['Created timeline “{name}” and a Playable Director','タイムライン「{name}」とプレイアブルディレクターを作成しました','已创建时间轴“{name}”和可播放导演'],
'타임라인을 만들려면 계층 구조에서 게임 오브젝트를 선택하세요.':['Select a GameObject in the Hierarchy to create a timeline.','タイムラインを作成するには、ヒエラルキーでゲームオブジェクトを選択してください。','要创建时间轴，请在层级中选择游戏对象。'],
'이 오브젝트로 타임라인을 시작하려면 플레이어블 디렉터 컴포넌트와 타임라인 에셋을 만드세요.':['To begin a new timeline with this object, create a Director component and a Timeline asset.','このオブジェクトでタイムラインを始めるには、ディレクターコンポーネントとタイムラインアセットを作成します。','要用此对象开始时间轴，请创建导演组件和时间轴资源。'],
'플레이어블 디렉터에 타임라인이 지정되지 않았습니다.':['The Playable Director has no timeline assigned.','プレイアブルディレクターにタイムラインが設定されていません。','可播放导演未指定时间轴。'],
'만들기':['Create','作成','创建'],'잠금':['Lock','ロック','锁定'],'시그널':['Signal','シグナル','信号'],'부를 메서드':['Method','呼び出すメソッド','调用方法'],'시작':['Start','開始','开始'],'길이':['Duration','長さ','时长'],'모션':['Motion','モーション','动作'],'속도':['Speed','速度','速度'],'시작 지점':['Clip In','開始位置','片段起点'],'볼륨':['Volume','音量','音量'],'오디오':['Audio','オーディオ','音频'],
'길이 맞추기':['Match length','長さを合わせる','匹配时长'],'고정 길이':['Fixed length','固定の長さ','固定时长'],'자동 길이 (마지막 클립까지)':['Auto length (to last clip)','自動の長さ（最後のクリップまで）','自动时长（到最后一个片段）'],
'자동 (마지막 클립까지)':['Auto (to last clip)','自動（最後のクリップまで）','自动（到最后一个片段）'],'고정 길이…':['Fixed length…','固定の長さ…','固定时长…'],'프레임 속도':['Frame rate','フレームレート','帧率'],'모두 보기 (F)':['Frame all (F)','すべて表示 (F)','全部显示 (F)'],
'타임라인 삭제…':['Delete timeline…','タイムラインを削除…','删除时间轴…'],'타임라인 삭제':['Delete timeline','タイムラインを削除','删除时间轴'],'복제해서 이 디렉터에 쓰기':['Duplicate for this director','複製してこのディレクターで使う','复制并用于此导演'],
'활성 클립 추가 (재생 위치)':['Add Active clip (at playhead)','アクティブクリップを追加（再生位置）','添加激活片段（播放头处）'],'애니메이션 클립 추가… (재생 위치)':['Add Animation clip… (at playhead)','アニメーションクリップを追加…（再生位置）','添加动画片段…（播放头处）'],
'오디오 클립 추가… (재생 위치)':['Add Audio clip… (at playhead)','オーディオクリップを追加…（再生位置）','添加音频片段…（播放头处）'],'시그널 추가 (재생 위치)':['Add Signal (at playhead)','シグナルを追加（再生位置）','添加信号（播放头处）'],
'음소거':['Mute','ミュート','静音'],'음소거 해제':['Unmute','ミュート解除','取消静音'],'위로 옮기기':['Move up','上へ移動','上移'],'아래로 옮기기':['Move down','下へ移動','下移'],'트랙 복제':['Duplicate track','トラックを複製','复制轨道'],'트랙 삭제':['Delete track','トラックを削除','删除轨道'],'트랙 이름':['Track name','トラック名','轨道名称'],
'클립이나 시그널을 누르면 여기에서 시작 · 길이 · 모션 등을 바꿉니다 · 빈 곳 더블클릭 = 추가 · 끝을 끌면 길이 조절 · Alt = 맞춤 끄기':['Click a clip or signal to edit its start, duration, motion and more here · double-click empty space to add · drag an edge to trim · Alt = no snapping','クリップやシグナルを押すと、ここで開始・長さ・モーションなどを変更できます · 空いた所をダブルクリック = 追加 · 端をドラッグで長さ調整 · Alt = スナップなし','点击片段或信号即可在此修改开始、时长、动作等 · 双击空白处 = 添加 · 拖动边缘调整时长 · Alt = 不吸附'],
'복제 (Ctrl+D)':['Duplicate (Ctrl+D)','複製 (Ctrl+D)','复制 (Ctrl+D)'],'삭제 (Delete)':['Delete (Delete)','削除 (Delete)','删除 (Delete)'],'길이를 원래 길이에 맞추기':['Match original length','元の長さに合わせる','匹配原始时长'],'애니메이션 창에서 클립 편집':['Edit clip in Animation window','アニメーションウィンドウでクリップを編集','在动画窗口中编辑片段'],
'{t} 추가':['Add {t}','{t} を追加','添加{t}'],'바인딩된 오브젝트의 클립':['Clips of the bound object','バインドされたオブジェクトのクリップ','绑定对象的片段'],'오디오 클립':['Audio clip','オーディオクリップ','音频片段'],'재생 위치에 넣습니다':['Inserted at the playhead','再生位置に入れます','插入到播放头处'],
'타임라인 검색':['Search timelines','タイムラインを検索','搜索时间轴'],'타임라인 길이 (초)':['Timeline length (seconds)','タイムラインの長さ（秒）','时间轴时长（秒）'],
'타임라인이 비어 있습니다. 트랙에 클립을 넣으세요':['The timeline is empty. Add clips to a track.','タイムラインが空です。トラックにクリップを入れてください','时间轴为空，请向轨道添加片段'],
'부를 메서드 이름 (예: ShowTitle)':['Method name to call (e.g. ShowTitle)','呼び出すメソッド名（例: ShowTitle）','要调用的方法名（例: ShowTitle）'],
'메서드 이름은 글자 · 숫자 · _ 만 쓸 수 있습니다':['Method names may only use letters, digits and _','メソッド名には文字・数字・_ だけ使えます','方法名只能使用字母、数字和 _'],
'▶ 시작할 때 재생':['▶ Play On Awake','▶ 開始時に再生','▶ 唤醒时播放'],'스크립트로 재생':['Played by script','スクリプトで再生','由脚本播放'],'끝나면 멈춤':['stop at end','終わると停止','结束时停止'],'끝나면 유지':['hold at end','終わるとホールド','结束时保持'],
'미리보기: 씬 뷰에서 이 시간의 타임라인 결과를 보여 줍니다':['Preview: show the timeline at this time in the Scene view','プレビュー: この時間のタイムライン結果をシーンビューに表示','预览：在场景视图中显示此时刻的时间轴效果'],
'처음으로':['Go to start','先頭へ','到开头'],'끝으로':['Go to end','末尾へ','到结尾'],'재생 / 일시 정지 (Space)':['Play / Pause (Space)','再生 / 一時停止 (Space)','播放 / 暂停 (Space)'],
'이 디렉터가 재생할 타임라인 (눌러서 선택)':['Timeline played by this director (click to choose)','このディレクターが再生するタイムライン（クリックで選択）','此导演播放的时间轴（点击选择）'],'타임라인 메뉴':['Timeline menu','タイムラインメニュー','时间轴菜单'],'트랙 메뉴':['Track menu','トラックメニュー','轨道菜单'],
'플레이어블 디렉터가 있는 오브젝트':['Object with the Playable Director','プレイアブルディレクターを持つオブジェクト','带可播放导演的对象'],
'이 트랙이 움직일 게임 오브젝트 (바인딩)':['GameObject driven by this track (binding)','このトラックが動かすゲームオブジェクト（バインディング）','此轨道驱动的游戏对象（绑定）'],
'「＋ 트랙」으로 활성화 · 애니메이션 · 오디오 · 시그널 트랙을 추가하세요':['Use “＋ Track” to add Activation, Animation, Audio or Signal tracks','「＋ トラック」でアクティベーション・アニメーション・オーディオ・シグナルのトラックを追加します','用“＋ 轨道”添加激活、动画、音频或信号轨道'],
'계층 구조의 오브젝트를 트랙 머리에 끌어다 놓으면 그 오브젝트에 묶이고, 프로젝트 패널의 오디오는 오디오 트랙에 끌어다 놓으면 클립이 됩니다.':['Drag an object from the Hierarchy onto a track header to bind it. Drag audio from the Project panel onto an audio track to add a clip.','ヒエラルキーのオブジェクトをトラックヘッダーにドラッグするとバインドされ、プロジェクトパネルのオーディオをオーディオトラックにドラッグするとクリップになります。','把层级中的对象拖到轨道头即可绑定；把项目面板中的音频拖到音频轨道即可生成片段。'],
'여러 오브젝트의 애니메이션 · 켜고 끄기 · 소리 · 스크립트 호출을 한 줄의 시간 위에 늘어놓아 컷신처럼 연출합니다 (유니티 Timeline).':['Arrange animation, activation, sound and script calls for several objects on one time line to stage cutscenes (Unity Timeline).','複数のオブジェクトのアニメーション・オンオフ・音・スクリプト呼び出しを一本の時間軸に並べ、カットシーンのように演出します（Unity Timeline）。','把多个对象的动画、启用/停用、声音和脚本调用排在一条时间线上，像过场动画一样编排（Unity Timeline）。'],
'디렉터 컴포넌트 · 타임라인을 한 번에 만들고, 애니메이터나 스프라이트가 있으면 이 오브젝트를 움직이는 애니메이션 트랙도 넣습니다.':['Creates a Director component and a Timeline together, plus an Animation track for this object if it has an Animator or sprite.','ディレクターコンポーネントとタイムラインを一度に作り、アニメーターかスプライトがあればこのオブジェクトを動かすアニメーショントラックも入れます。','一次创建导演组件和时间轴；若对象有动画器或精灵，还会加入驱动它的动画轨道。'],
'또는 인스펙터의 플레이어블 디렉터에서 기존 타임라인을 고르세요.':['Or pick an existing timeline in the Playable Director in the Inspector.','またはインスペクターのプレイアブルディレクターで既存のタイムラインを選んでください。','或在检查器的可播放导演中选择已有时间轴。'],
'매니저에는 타임라인을 붙일 수 없습니다.':['Timelines cannot be added to managers.','マネージャーにはタイムラインを付けられません。','管理器无法添加时间轴。'],
'아직 트랙이 없습니다. 타임라인 창의 「＋ 트랙」으로 추가하세요.':['No tracks yet. Add one with “＋ Track” in the Timeline window.','まだトラックがありません。タイムラインウィンドウの「＋ トラック」で追加してください。','还没有轨道。请在时间轴窗口用“＋ 轨道”添加。'],
'트랙이 움직일 게임 오브젝트 · 계층 구조에서 타임라인 창의 트랙 머리로 끌어다 놓아도 됩니다':['GameObjects driven by each track · you can also drag from the Hierarchy onto a track header in the Timeline window','各トラックが動かすゲームオブジェクト · ヒエラルキーからタイムラインウィンドウのトラックヘッダーへドラッグしても設定できます','各轨道驱动的游戏对象 · 也可从层级拖到时间轴窗口的轨道头'],
'애니메이션 트랙':['Animation Track','アニメーショントラック','动画轨道'],'인스펙터':['Inspector','インスペクター','检查器'],'매니저':['Manager','マネージャー','管理器'],
'{a}에는 {b}을 붙일 수 없습니다.':['A {b} cannot be added to a {a}.','{a} には {b} を付けられません。','{a} 无法添加 {b}。'],
'이 오브젝트로 타임라인을 시작하려면 {a} 컴포넌트와 {b} 에셋을 만드세요.':['To begin a timeline with this object, create a {a} component and a {b} asset.','このオブジェクトでタイムラインを始めるには、{a} コンポーネントと {b} アセットを作成してください。','要用此对象开始时间轴，请创建 {a} 组件和 {b} 资源。'],
'플레이어블 디렉터와 타임라인을 한 번에 만듭니다.':['Creates the Playable Director and the Timeline at once.','プレイアブルディレクターとタイムラインを一度に作ります。','一次创建可播放导演和时间轴。'],
'애니메이터나 스프라이트가 있으면 이 오브젝트를 움직이는 애니메이션 트랙도 넣습니다.':['If the object has an Animator or a Sprite, an Animation Track that moves it is added too.','アニメーターかスプライトがあれば、このオブジェクトを動かすアニメーショントラックも入れます。','如果对象有动画器或精灵，还会加入驱动它的动画轨道。'],
'{a}와 {b}을 한 번에 만듭니다.':['Creates the {a} and the {b} at once.','{a} と {b} を一度に作ります。','一次创建 {a} 和 {b}。'],
'{a}나 {b}가 있으면 이 오브젝트를 움직이는 {c}도 넣습니다.':['If the object has an {a} or a {b}, an {c} that moves it is added too.','{a} か {b} があれば、このオブジェクトを動かす {c} も入れます。','如果对象有 {a} 或 {b}，还会加入驱动它的 {c}。'],
'타임라인을 만들려면 {a}에서 {b}를 선택하세요.':['To create a timeline, select a {b} in the {a}.','タイムラインを作るには、{a} で {b} を選択してください。','要创建时间轴，请在 {a} 中选择 {b}。'],
'여러 오브젝트의 애니메이션 · 켜고 끄기 · 소리 · 스크립트 호출을 한 줄의 시간 위에 늘어놓습니다.':['Lay out animation, activation, sound and script calls for several objects on one time line.','複数のオブジェクトのアニメーション・オンオフ・音・スクリプト呼び出しを一本の時間軸に並べます。','把多个对象的动画、启用/停用、声音和脚本调用排在一条时间线上。'],
'컷신처럼 연출할 때 씁니다 (유니티 Timeline).':['Use it to stage cutscenes (Unity Timeline).','カットシーンのような演出に使います（Unity Timeline）。','用于编排过场动画（Unity Timeline）。'],
'{a}에 {b}이 지정되지 않았습니다.':['The {a} has no {b} assigned.','{a} に {b} が設定されていません。','{a} 未指定 {b}。'],
'또는 {a}의 {b}에서 기존 타임라인을 고르세요.':['Or pick an existing timeline in the {b} in the {a}.','または {a} の {b} で既存のタイムラインを選んでください。','或在 {a} 的 {b} 中选择已有时间轴。'],
'재생 위치를 옮기고 씬 뷰나 인스펙터에서 위치 · 회전 · 크기 · 스프라이트를 바꾸면 그 시간에 키가 생깁니다.':['Move the playhead, then change position, rotation, scale or sprite in the Scene view or Inspector to key it at that time.','再生位置を動かし、シーンビューやインスペクターで位置・回転・サイズ・スプライトを変えると、その時間にキーが入ります。','移动播放头后，在场景视图或检查器中修改位置、旋转、缩放或精灵，即会在该时间添加关键帧。'],
'키와 키 사이는 천천히 이어집니다.':['Motion between keys eases smoothly.','キーとキーの間はなめらかにつながります。','关键帧之间会平滑过渡。'],
'◆ 키를 끌면 시간을 옮기고, 누른 뒤 Delete로 지웁니다 (녹화 중이 아니어도 됩니다).':['Drag a ◆ key to change its time; click it and press Delete to remove it (works even when not recording).','◆ キーをドラッグすると時間を動かし、クリックして Delete で消します（録画中でなくても使えます）。','拖动 ◆ 关键帧可改变时间，点击后按 Delete 删除（不在录制时也可以）。'],
'◆ 키를 끌면 0.05초 단위로 옮겨집니다.':['Dragging a ◆ key moves it in 0.05 s steps.','◆ キーをドラッグすると 0.05 秒単位で動きます。','拖动 ◆ 关键帧时以 0.05 秒为单位移动。'],
'Shift를 누른 채 끌면 단위 없이 옮깁니다.':['Hold Shift while dragging to move freely.','Shift を押しながらドラッグすると単位なしで動かせます。','按住 Shift 拖动可自由移动。'],
'◆ 키를 누른 뒤 Delete로 지웁니다 (녹화 중이 아니어도 됩니다).':['Click a ◆ key and press Delete to remove it (works even when not recording).','◆ キーをクリックして Delete で消します（録画中でなくても使えます）。','点击 ◆ 关键帧后按 Delete 删除（不在录制时也可以）。'],
'애니메이션 트랙에 추가':['Add to Animation Track','アニメーショントラックに追加','添加到动画轨道'],
'빈 클립 (이동 · 방향만) — 녹화로 키 넣기':['Empty clip (movement · direction only) — key it by recording','空のクリップ（移動・向きだけ）— 録画でキーを入れる','空片段（仅移动 · 方向）— 用录制添加关键帧'],
'애니메이션 클립 고르기…':['Choose an animation clip…','アニメーションクリップを選ぶ…','选择动画片段…'],
'클립 추가… (재생 위치 · 빈 클립 또는 애니메이션)':['Add clip… (at playhead · empty or animation)','クリップを追加…（再生位置・空またはアニメーション）','添加片段…（播放头处 · 空片段或动画）'],
'빈 클립을 만들고 녹화를 시작했어요. 재생 위치를 옮기며 「{name}」을(를) 움직이거나 돌려 보세요':['Created an empty clip and started recording. Move the playhead and move or rotate “{name}”.','空のクリップを作って録画を始めました。再生位置を動かしながら「{name}」を動かしたり回したりしてみましょう','已创建空片段并开始录制。移动播放头并移动或旋转“{name}”。'],
'빈 클립을 만들었어요. 트랙에 움직일 오브젝트를 묶은 뒤 ●로 녹화하세요':['Created an empty clip. Bind an object to the track, then record with ●.','空のクリップを作りました。トラックに動かすオブジェクトをバインドしてから ● で録画してください','已创建空片段。为轨道绑定对象后用 ● 录制。'],
'녹화 키':['Recorded key','録画キー','录制关键帧'],'시간':['Time','時間','时间'],'위치':['Position','位置','位置'],'회전':['Rotation','回転','旋转'],'재생 위치를 이 키로':['Move playhead to this key','再生位置をこのキーへ','把播放头移到此关键帧'],'키 삭제 (Delete)':['Delete key (Delete)','キーを削除 (Delete)','删除关键帧 (Delete)'],
'● 녹화 중':['● Recording','● 録画中','● 录制中'],'◆ 키 남기기':['◆ Add key','◆ キーを残す','◆ 添加关键帧'],'이 시간 키 지우기':['Delete key here','この時間のキーを消す','删除此处关键帧'],'녹화 끝':['Stop recording','録画終了','结束录制'],
'재생 위치를 옮기고 씬 뷰나 인스펙터에서 위치 · 회전 · 크기 · 스프라이트를 바꾸면 그 시간에 키가 생깁니다. 키와 키 사이는 천천히 이어집니다.':['Move the playhead, then change position, rotation, scale or sprite in the Scene view or Inspector to key it at that time. Motion between keys eases smoothly.','再生位置を動かし、シーンビューやインスペクターで位置・回転・サイズ・スプライトを変えると、その時間にキーが入ります。キーとキーの間はなめらかにつながります。','移动播放头后，在场景视图或检查器中修改位置、旋转、缩放或精灵，即会在该时间添加关键帧。关键帧之间会平滑过渡。'],
'지금 상태를 이 시간에 키로 남깁니다 (가만히 서 있는 구간을 만들 때)':['Keep the current state as a key at this time (to make a pause)','今の状態をこの時間にキーとして残します（止まっている区間を作るとき）','把当前状态记录为此时间的关键帧（用于制作停顿）'],
'이 시간에 있는 녹화 키를 지웁니다':['Delete the recorded key at this time','この時間の録画キーを消します','删除此时间的录制关键帧'],
'녹화 끝':['Stop recording','録画終了','结束录制'],
'녹화: 재생 위치마다 바인딩된 오브젝트의 위치 · 회전 · 크기 · 스프라이트를 바꾸면 키로 기록하고, 키 사이는 천천히 이어집니다':['Record: change the bound object’s position, rotation, scale or sprite at each playhead time to key it; motion between keys eases smoothly','録画: 再生位置ごとにバインドされたオブジェクトの位置・回転・サイズ・スプライトを変えるとキーとして記録し、キーの間はなめらかにつながります','录制：在各播放时间修改绑定对象的位置、旋转、缩放或精灵即记录为关键帧，关键帧之间平滑过渡'],
'{name} 녹화':['{name} Recording','{name} 録画','{name} 录制'],
'● 녹화: 재생 위치를 옮기고 「{name}」을(를) 움직여 보세요':['● Recording: move the playhead and move “{name}”','● 録画: 再生位置を動かして「{name}」を動かしてみましょう','● 录制：移动播放头并移动“{name}”'],
'먼저 이 트랙에 움직일 게임 오브젝트를 묶어 주세요 (트랙 머리의 바인딩)':['Bind a GameObject to this track first (binding in the track header)','先にこのトラックに動かすゲームオブジェクトをバインドしてください（トラックヘッダーのバインディング）','请先为此轨道绑定要移动的游戏对象（轨道头的绑定）'],
'플레이 중에는 녹화할 수 없습니다':['You can’t record during Play mode','プレイ中は録画できません','运行时无法录制'],
'지울 녹화 키가 없습니다':['No recorded keys to delete','消す録画キーがありません','没有可删除的录制关键帧'],'이 시간에는 녹화 키가 없습니다':['No recorded key at this time','この時間には録画キーがありません','此时间没有录制关键帧'],
/* 설정 · 애니메이션 창 (이번에 함께 추가한 문구) */
'애니메이션 타일 미리 재생':['Preview animated tiles','アニメーションタイルをプレビュー再生','预览动画图块'],
'플레이 중이 아닐 때도 애니메이션 타일 재생':['Play animated tiles even when not in Play mode','プレイ中でなくてもアニメーションタイルを再生','非运行时也播放动画图块'],
'플레이 중이 아닐 때 씬 뷰 · 게임 뷰에 칠한 애니메이션 타일(룰 타일의 「애니메이션」 출력 포함)을 움직이게 할지 정합니다. 끄면(기본) 첫 프레임에 멈춰 있어 타일을 칠하고 고르기 편하고, 플레이를 누르면 언제나 움직입니다. 타일 팔레트 · 인스펙터의 특수 타일 미리보기는 이 설정과 상관없이 움직입니다.':['Choose whether animated tiles painted in the Scene and Game views (including Rule Tile “Animation” outputs) move while not in Play mode. Off (default) keeps them on the first frame so painting and picking is easier; they always animate in Play mode. Special-tile previews in the Tile Palette and Inspector always animate.','プレイ中でないとき、シーンビュー・ゲームビューに塗ったアニメーションタイル（ルールタイルの「アニメーション」出力を含む）を動かすかを決めます。オフ（既定）なら最初のフレームで止まり、塗ったり選んだりしやすくなります。プレイ中は常に動きます。タイルパレット・インスペクターの特殊タイルのプレビューはこの設定に関係なく動きます。','设置非运行时场景视图和游戏视图中绘制的动画图块（包括规则图块的“动画”输出）是否播放。关闭（默认）时停在第一帧，便于绘制和选择；运行时总会播放。图块调色板和检查器中的特殊图块预览不受此设置影响。'],
'프로젝트 패널의 스프라이트를 스프라이트 속성(또는 여기)에 끌어다 놓으면 현재 프레임에 키가 들어갑니다':['Drop sprites from the Project panel onto the Sprite property (or here) to key them at the current frame','プロジェクトパネルのスプライトをスプライトプロパティ（またはここ）にドロップすると現在のフレームにキーが入ります','把项目面板中的精灵拖到精灵属性（或这里）即可在当前帧添加关键帧'],
'이 프레임의 스프라이트 (눌러서 선택 · 프로젝트 패널에서 끌어다 놓아도 됩니다 · 바꾸면 키가 만들어집니다)':['Sprite at this frame (click to choose · or drop from the Project panel · changing it creates a key)','このフレームのスプライト（クリックで選択・プロジェクトパネルからドロップも可・変えるとキーが作られます）','此帧的精灵（点击选择 · 也可从项目面板拖入 · 修改会创建关键帧）']
});

return{pose,act,tick,render,live,playEnd,directorComp,dirProxy,tlCreateFor,recHook,recStop,TL};
})()}
}
