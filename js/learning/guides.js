/* =====================================================================
   기능 가이드 (learning.html #guides · #guide-<id>)
   레슨보다 쉬운 「기능 하나 설명서」. 엔진 창(패널)마다 하나씩, 난이도는 모두 입문.
   가이드 하나 = 영상(엔진 화면을 흉내 낸 움직이는 그림) · 이런 기능이에요 · 이렇게 써요(영상 단계와 같음)
               · 알아 두면 좋아요 · 이럴 때 써 보세요(예시) · 단축키 · 관련 학습(레슨 · 가이드 카드)
   엔진(edit.html)의 창 머리글 「학습」 버튼 → 학습 창이 #guide-<창 id>로 열림.
   「직접 해 보기」 → 엔진 창에 {thaniyaGuide:1,t:'try',panel} 메시지 (엔진이 그 창을 앞으로 꺼내고 학습 창을 축소).

   데이터 모양
   { id, ic(아이콘 키), title, hk:[단축키 글자], lead(카드 한 줄), sum(이런 기능이에요 · <u>강조</u>),
     rm:'lesson-1'(로드맵에서 이어지는 첫 레슨), rel:[관련 레슨 hash], gl:[관련 가이드 id], extra:['search'],
     mock:'영상 화면 HTML (800×450)', css:'이 가이드 영상 전용 CSS (.gd-sc[data-g=id] 안)',
     steps:[{t:제목, d:설명, cap:영상 자막, do:[동작]}], tips:[…], ex:[{h,p,code?}], keys:[[키, 설명]] }

   영상 동작 (do) — 대상은 data-k 값
     {c:k} 클릭 · {d:k} 더블클릭 · {r:k} 우클릭 · {m:k} 마우스 올리기
     {drag:k,to:k,g:'끌고 가는 글자'} 끌어다 놓기 · {drag:k,mv:[x,y]} 그 요소를 (x,y)로 옮기기
     {type:k,v:'글자'} 입력 · {paint:k,cls:'w'} 같은 data-k 요소들을 data-p 순서로 칠하기
     {key:'Ctrl+P'} 키 누르기 · {wait:ms}
     on:'상태' → 동작이 끝나면(클릭은 누르는 순간) 상태를 켬. 상태는 쌓이기만 함.
   화면 요소의 상태 반응 (식: 공백 = 그리고 · '|' = 또는 · '!' = 아님)
     data-show="식" 식이 참일 때만 보임 · data-hide="식" 식이 참이면 숨김
     data-cls="식=클래스;식=클래스" · data-txt="식=글자;식=글자"(마지막으로 맞는 것)
   ===================================================================== */
(function(){
'use strict';
const DW=800,DH=450;
const X=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TT=(s,v)=>window.TI18N?TI18N.t(s,v):String(s).replace(/\{(\w+)\}/g,(x,k)=>v&&k in v?v[k]:x);

/* ---------- 아이콘 (24 × 24 선) ---------- */
const IC={
  scene:'<path d="M12 3 3 7.5l9 4.5 9-4.5z"/><path d="M3 7.5v9l9 4.5 9-4.5v-9"/><path d="M12 12v9"/>',
  game:'<rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.8" cy="13.8" r=".9"/>',
  hier:'<rect x="3" y="3.5" width="7" height="5" rx="1.3"/><path d="M6.5 8.5v9.5a1.5 1.5 0 0 0 1.5 1.5h4M6.5 13H12"/><rect x="12" y="10.5" width="9" height="5" rx="1.3"/><rect x="12" y="17" width="9" height="5" rx="1.3"/>',
  insp:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  assets:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  palette:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M14 21l6.5-6.5M15.5 13.5h5v5"/>',
  console:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M12.5 15H17"/>',
  script:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  vs:'<rect x="2.5" y="4" width="7.5" height="6" rx="1.5"/><rect x="14" y="14" width="7.5" height="6" rx="1.5"/><path d="M10 7h3a2 2 0 0 1 2 2v1.5M14 17h-3a2 2 0 0 1-2-2v-1.5"/>',
  animator:'<rect x="2.5" y="9" width="6.5" height="6" rx="1.5"/><rect x="15" y="3.5" width="6.5" height="6" rx="1.5"/><rect x="15" y="14.5" width="6.5" height="6" rx="1.5"/><path d="M9 12h2.5l3.5-5.5M11.5 12l3.5 5.5"/>',
  anim:'<path d="M3 19h18"/><path d="M7 15 9.8 12.2 7 9.4 4.2 12.2z"/><path d="M17 15l2.8-2.8L17 9.4l-2.8 2.8z"/><path d="M9.8 12.2h4.4"/>',
  tl:'<path d="M3 6h18M3 12h18M3 18h18" opacity=".35"/><rect x="5" y="4" width="7" height="4" rx="1"/><rect x="10" y="10" width="9" height="4" rx="1"/><rect x="4" y="16" width="6" height="4" rx="1"/>',
  uib:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><rect x="7" y="12.5" width="10" height="4" rx="2"/>'
};
const ico=(k,cls)=>`<svg class="${cls||'gd-i'}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]||IC.scene}</svg>`;

/* ---------- 영상 화면 조각 ---------- */
/* 타일맵: rows = ['..ww..', …]  · = 잔디(3가지) · w 물 · s 돌벽 · 셀마다 a(c,r) 로 속성을 더함 */
function tiles(rows,a,sz){
  sz=sz||40;let h='';
  rows.forEach((row,r)=>[...row].forEach((ch,c)=>{
    const k=ch==='w'?'w':ch==='s'?'s':ch==='d'?'d':'g'+(1+((c*7+r*3)%3));
    h+=`<i class="m-tl ${k}" ${a?a(c,r,ch)||'':''}></i>`;
  }));
  return`<div class="m-grid" style="grid-template-columns:repeat(${rows[0].length},${sz}px);grid-auto-rows:${sz}px">${h}</div>`;
}
/* 창(패널) */
const pan=(title,body,o={})=>`<div class="m-pan ${o.cls||''}" ${o.a||''}><div class="m-ph"><span class="t">${o.ic?ico(o.ic,'m-pi'):''}${title}</span>${o.tabs||''}<i class="sp"></i>${o.head||''}<span class="m-lrn">${ico('anim','m-pi')}학습</span><span class="m-dots">⋮</span></div><div class="m-pb ${o.bcls||''}">${body}</div></div>`;
/* 계층 구조 · 목록 한 줄 */
const row=(label,o={})=>`<div class="m-it ${o.cls||''}" style="padding-left:${6+(o.d||0)*13}px" ${o.k?`data-k="${o.k}"`:''} ${o.a||''}><span class="tw" ${o.tk?`data-k="${o.tk}"`:''} ${o.ta||''}>${o.tw||''}</span><i class="m-dot" style="background:${o.col||'#8b93a3'}"></i><span class="lb" ${o.la||''}>${label}</span>${o.n!=null?`<span class="n">${o.n}</span>`:''}</div>`;
/* 툴바(엔진 맨 위 줄): 레이어 · UI 화면 만들기 · C# · 비주얼 스크립트 · 플레이 */
function tbar(o={}){
  const L=[['ltm','타일맵 1'],['lcol','콜라이더'],['lgo','게임 오브젝트'],['lui','UI']];
  return`<div class="m-tb"><span class="m-seg">${L.map(([k,n])=>`<b class="m-b g" data-k="${k}" ${(o.lay||{})[k]||''}>${n}</b>`).join('')}</span>
    <b class="m-b" data-k="bub" ${o.ub||''}>UI 화면 만들기</b><span class="m-seg"><b class="m-b g" data-k="bcs" ${o.cs||''}>C#</b><b class="m-b g" data-k="bvs" ${o.vs||''}>비주얼 스크립트</b></span>
    <i class="sp"></i><b class="m-b y m-play" data-k="play" ${o.play||''}>▶ 플레이</b><i class="sp"></i>
    <b class="m-ib">↶</b><b class="m-ib">↷</b><b class="m-b">저장</b></div>`;
}
/* 씬 뷰 도구 막대 (세로) */
function tools(kind,a={}){
  const O=[['tQ','✋'],['tW','✥'],['tE','⟳'],['tR','⤡'],['tT','▭'],['tY','✣'],['tB','✚']],
        T=[['tQ','✋'],['tW','↖'],['tE','✎'],['tR','⌫'],['tT','▦'],['tY','◧'],['tI','⌖']];
  const b=(L,pre)=>L.map(([k,g])=>`<b class="m-tool" data-k="${pre}${k}" ${a[pre+k]||''}>${g}<small>${k.slice(1)}</small></b>`).join('');
  return`<div class="m-tools">${kind==='both'?`<span data-hide="${a.tileOn||'x'}">${b(O,'')}</span><span data-show="${a.tileOn||'x'}">${b(T,'p')}</span>`:kind==='tile'?b(T,'p'):b(O,'')}</div>`;
}
/* 고양이 주인공 · 상자 · 나무 */
const cat=(a,cls)=>`<i class="m-cat ${cls||''}" ${a||''}></i>`;
const spr=(k,a,cls)=>`<i class="m-spr ${k} ${cls||''}" ${a||''}></i>`;
/* 입력 칸 */
const fld=(lab,val,a='',vcls='')=>`<div class="m-f"><span class="fl">${lab}</span><span class="m-in ${vcls}" ${a}>${val}</span></div>`;
const chk=(lab,a='',on)=>`<div class="m-f"><span class="fl">${lab}</span><span class="m-ck${on?' on':''}" ${a}></span></div>`;
/* 메뉴 */
const menu=(items,a='',cls='')=>`<div class="m-menu ${cls}" ${a}>${items.map(i=>i==='-'?'<hr>':`<div class="m-mi" ${i[1]?`data-k="${i[1]}"`:''}>${i[0]}${i[2]?`<small>${i[2]}</small>`:''}</div>`).join('')}</div>`;
/* 코드 줄 */
const cl=(n,html,a='')=>`<div class="m-cl" ${a}><i>${n}</i><span>${html}</span></div>`;
const kw=s=>`<span class="kw">${s}</span>`,ty=s=>`<span class="ty">${s}</span>`,str=s=>`<span class="st">${s}</span>`,cm=s=>`<span class="cm">${s}</span>`;
/* 콘솔 줄 */
const log=(kind,msg,a='',n)=>`<div class="m-log ${kind}" ${a}><i></i><span>${msg}</span>${n?`<b>${n}</b>`:''}</div>`;

/* 엔진 화면 틀: 툴바 + (왼쪽 · 가운데 · 오른쪽) + 아래 */
function eng(o){
  return`<div class="m-app">${o.tb!=null?o.tb:tbar(o.tbo)}<div class="m-main"><div class="m-row">${o.left||''}<div class="m-ctr">${o.center||''}</div>${o.right||''}</div>${o.bottom?`<div class="m-bot" style="height:${o.bh||150}px">${o.bottom}</div>`:''}</div>${o.over||''}</div>`;
}
/* 씬 뷰 창 */
function sceneView(o={}){
  const tabs=`<span class="m-vt"><b class="on" data-k="vScene" ${o.vs||''}>씬</b><b data-k="vGame" ${o.vg||''}>게임</b><b data-k="vSplit" ${o.vp||''}>나란히</b></span>`;
  return pan('',`<div class="m-cv" data-k="cv">${o.tools||''}<div class="m-wrap"><div class="m-world" ${o.wa||''}>${o.world||''}</div></div>${o.extra||''}</div>`,{cls:'m-scene',tabs,head:o.head||`<b class="m-b g">⚙ 환경설정 ▾</b><b class="m-zm">− 100% ＋</b>`});
}
/* 기본 마을 맵 (9 × 6) */
const TOWN=['sssssssss','s.......s','s.ww....s','s.ww....s','s.......s','sssssssss'];
const insEmpty=`<div class="m-empty" data-hide="sel">선택한 것이 없다.<br>계층 구조나 씬 뷰에서 고른다.</div>`;
const card=(title,body,a='',ic='▾')=>`<div class="m-card" ${a}><div class="m-ch"><span class="cv">${ic}</span><span class="m-ck on"></span><b>${title}</b><i class="sp"></i><span class="q">?</span></div><div class="m-cb">${body}</div></div>`;

const GUIDES=[
/* ========================= 1. 씬 뷰와 도구 ========================= */
{id:'scene',ic:'scene',title:'씬 뷰와 도구',hk:['Q','W','E','R','F'],rm:'lesson-1',
 lead:'맵을 보고 오브젝트를 고르고 옮기는 작업대',
 sum:'게임 세계를 위에서 내려다보며 <u>맵을 칠하고 오브젝트를 놓고 옮기는 작업대</u>다. 위쪽 레이어 막대로 지금 무엇을 편집할지 고르고, 왼쪽 도구 막대로 손 · 이동 · 회전 · 크기 도구를 바꾼다.',
 rel:['lesson-1','lesson-3','lesson-17'],gl:['palette','hier','insp','game'],
 css:`.m-world{transform:scale(1.32);transform-origin:30% 40%;transition:transform .6s cubic-bezier(.3,.8,.3,1)}.m-world.fit{transform:none}
  .k-chest{left:200px;top:80px}.k-tree{left:40px;top:92px}.k-cat{left:160px;top:160px}`,
 mock:eng({
  tbo:{lay:{ltm:'data-cls="!lgo=on"',lgo:'data-cls="lgo=on"'}},
  left:pan('계층 구조',row('새 게임',{tw:'▾',col:'#f6cd2a'})+row('마을 ★',{d:1,tw:'▾',col:'#8fd4ec'})+row('타일맵',{d:2,tw:'▸'})+row('게임 오브젝트',{d:2,tw:'▾'})+row('주인공',{d:3,col:'#5cc08a'})+row('상자',{d:3,col:'#31c1ec',a:'data-cls="sel=sel"'})+row('나무',{d:3,col:'#31c1ec'})+row('UI',{d:2,tw:'▸',col:'#b69cff'}),{cls:'w150',ic:'hier'}),
  center:sceneView({
    tools:tools('both',{tileOn:'!lgo',tW:'data-cls="tw=on"',tQ:'data-cls="!tw=on"',pptQ:''}),
    wa:'data-cls="fit=fit"',
    head:`<b class="m-b g" data-k="env">⚙ 환경설정 ▾</b><b class="m-zm" data-txt="fit=− 100% ＋">− 132% ＋</b>`,
    world:tiles(TOWN,(c,r,ch)=>ch!=='.'?'data-cls="col=c"':'')+
      spr('m-tree','',' k-tree')+cat('','k-cat')+
      `<i class="m-spr m-chest k-chest" data-k="chest" data-cls="sel=sel"><i class="gz" data-show="sel"></i></i><i class="m-drop" data-k="spot" style="left:280px;top:80px"></i>`,
    extra:`<div class="m-pop" data-show="opt" style="right:8px;top:4px;width:230px"><div class="m-poph">씬 뷰 표시</div>${chk('그리드','',1)}${chk('UI 숨기기')}<div data-k="oCol">${chk('콜라이더 표시','data-cls="col=on"')}</div>${chk('조명 미리보기','',1)}</div>`
  }),
  right:pan('인스펙터',insEmpty+`<div data-show="sel"><div class="m-ih"><i class="m-spr m-chest sm"></i><b>상자</b></div>${card('Transform',fld('위치 X','5','data-txt="moved=7"')+fld('위치 Y','2')+fld('회전','0')+fld('크기','1 · 1'))}${card('스프라이트 렌더러',fld('스프라이트','chest'))}</div>`,{cls:'w180',ic:'insp'})
 }),
 steps:[
  {t:'편집할 레이어 고르기',d:'툴바 왼쪽의 「타일맵 1 · 콜라이더 · 게임 오브젝트 · UI」 중 하나를 누른다. 고른 레이어만 칠하거나 고를 수 있고, 도구 막대도 그 레이어에 맞게 바뀐다.',cap:'툴바에서 「게임 오브젝트」 레이어를 고른다',do:[{c:'lgo',on:'lgo'}]},
  {t:'오브젝트 고르기',d:'이동 도구(W)를 고르고 씬 뷰의 오브젝트를 누른다. 고른 오브젝트에 화살표 손잡이가 생기고, 계층 구조와 인스펙터에도 함께 표시된다.',cap:'이동 도구(W)로 상자를 눌러 고른다',do:[{c:'tW',on:'tw'},{c:'chest',on:'sel'}]},
  {t:'끌어서 옮기기',d:'고른 오브젝트를 끌거나 화살표 손잡이를 끌어 옮긴다. 회전(E) · 크기(R) 도구도 같은 방법으로 원이나 손잡이를 끈다. 인스펙터의 위치 값이 함께 바뀐다.',cap:'상자를 끌어 오른쪽으로 옮긴다',do:[{drag:'chest',mv:[280,80],on:'moved'}]},
  {t:'화면 움직이기 · 전체 보기',d:'손 도구(Q)로 끌거나 스페이스를 누른 채 끌면 화면이 움직이고, 휠로 확대 · 축소한다. F를 누르면 씬 전체가 화면에 딱 맞게 보인다.',cap:'F를 눌러 씬 전체를 화면에 맞춘다',do:[{m:'cv'},{key:'F',on:'fit'}]},
  {t:'표시 옵션 바꾸기',d:'오른쪽 위 「환경설정」에서 그리드 · UI 숨기기 · 콜라이더 표시 · 조명 미리보기를 켜고 끈다. 씬 뷰에서만 바뀌고 게임 화면에는 영향이 없다.',cap:'「환경설정 › 콜라이더 표시」로 막힌 칸을 본다',do:[{c:'env',on:'opt'},{c:'oCol',on:'col'}]}
 ],
 tips:['스페이스를 누른 채 끌면 어떤 도구를 쓰고 있어도 잠깐 손 도구가 된다.','회전 도구에서 Ctrl을 누르고 돌리면 15°씩 딱딱 맞춰진다.','변환 도구(Y)는 이동 · 회전 · 크기 손잡이를 한 번에 보여 준다.','도구 막대는 위쪽 손잡이를 끌어 옮길 수 있고, 「창 › 도구 모음 위치 초기화」로 제자리로 돌린다.','「나란히」 탭을 누르면 씬 뷰와 게임 뷰를 좌우로 함께 보며 고칠 수 있다.'],
 ex:[{h:'상자를 정확히 두 칸 옆으로',p:'이동 도구로 끌어도 되지만, 정확한 자리가 필요하면 인스펙터의 위치 X에 숫자를 넣는 편이 빠르다. 씬 뷰와 인스펙터는 같은 값을 보여 준다.'},
     {h:'맵이 커서 다 안 보일 때',p:'F로 씬 전체를 맞추고, 보고 싶은 곳에 마우스를 올린 채 휠을 굴려 확대한다. 손 도구(Q)로 끌어서 옆으로 옮긴다.'},
     {h:'보이지 않는 벽 찾기',p:'주인공이 아무것도 없는 곳에서 막힌다면 「환경설정 › 콜라이더 표시」를 켠다. 막힌 칸이 빨갛게 겹쳐 보인다.'}],
 keys:[['Q','손 도구 · 화면 이동'],['W','이동 도구 · 고르기와 옮기기'],['E','회전 도구 (타일맵 레이어에서는 브러시)'],['R','크기 도구 (타일맵 레이어에서는 지우개)'],['T','사각형 도구'],['Y','변환 도구'],['B','오브젝트 배치'],['F','씬 전체 보기'],['Space + 끌기','잠깐 손 도구'],['휠','확대 · 축소']]},

/* ========================= 2. 플레이와 게임 뷰 ========================= */
{id:'game',ic:'game',title:'플레이와 게임 뷰',hk:['Ctrl','P'],rm:'lesson-1',
 lead:'게임을 실제 기기 화면처럼 돌려 보기',
 sum:'만든 게임을 <u>실제 기기 화면처럼 돌려 보는 곳</u>이다. 플레이를 누르면 스크립트가 움직이기 시작하고, 게임 뷰에서 휴대폰 · PC 화면 크기를 바꿔 가며 어떻게 보일지 확인한다.',
 rel:['lesson-1','lesson-5','lesson-9'],gl:['scene','console','uib'],
 css:`.m-gv{position:absolute;inset:10px;display:flex;align-items:center;justify-content:center;gap:10px}
  .m-dev{position:relative;width:400px;height:225px;border-radius:12px;border:6px solid #2b2f38;background:#101216;overflow:hidden;transition:width .5s,height .5s}
  .m-dev.ph{width:150px;height:300px;border-radius:22px}
  .m-dev .m-world{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9)}
  .m-dev.ph .m-world{transform:translate(-50%,-50%) scale(.62)}
  .m-gv.sp .m-sv{display:block}.m-sv{display:none;width:250px;height:225px;border-radius:8px;background:#1d2027;position:relative;overflow:hidden}
  .m-gv.sp .m-dev{width:250px;height:141px}.m-gv.sp .m-dev .m-world{transform:translate(-50%,-50%) scale(.55)}
  .m-sv .m-world{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.62)}
  .m-hud{position:absolute;left:8px;top:6px;font:700 11px/1 var(--gdf);color:#fff;text-shadow:0 1px 2px #000;z-index:3}
  .m-hud.ug{outline:1.5px dashed #f6cd2a;outline-offset:3px}
  .m-ugc{position:absolute;inset:4px;border:1.5px dashed rgba(246,205,42,.8);border-radius:6px;z-index:3}
  .k-cat{left:160px;top:160px;transition:left 1.6s linear}.k-cat.mv{left:270px}
  .m-scene .m-cv{background:#101216}`,
 mock:eng({
  tbo:{play:'data-cls="pl=stop" data-txt="pl=■ 정지"'},
  center:pan('',`<div class="m-cv" data-k="cv"><div class="m-gv" data-cls="sp=sp">
     <div class="m-sv"><div class="m-world">${tiles(TOWN,null,28)}</div></div>
     <div class="m-dev" data-cls="ph=ph"><div class="m-hud" data-cls="ug=ug">HP 100</div><i class="m-ugc" data-show="ug"></i><div class="m-world">${tiles(TOWN)}${spr('m-tree','style="left:40px;top:92px"')}${spr('m-chest','style="left:200px;top:80px"')}${cat('data-cls="pl=idle;mv=walk mv"','k-cat')}</div></div>
   </div><div class="m-lock" data-show="pl">● 플레이 중 · 씬 편집 잠김</div>
   ${menu([['PC HD 1280×720'],['iPhone 15  393×852','dIp'],['Galaxy S24  360×780'],['iPad  820×1180']],'data-show="dm" data-hide="ph" style="right:150px;top:2px;width:190px"')}</div>`,
   {cls:'m-scene',tabs:`<span class="m-vt"><b data-k="vScene" data-cls="!gv=on">씬</b><b data-k="vGame" data-cls="gv !sp=on">게임</b><b data-k="vSplit" data-cls="sp=on">나란히</b></span>`,
    head:`<b class="m-sel" data-k="dev"><span data-txt="ph=iPhone 15">PC HD 1280×720</span> ▾</b><b class="m-ib">⟳</b><b class="m-b g">☑ 기기 테두리</b><b class="m-b g" data-k="ug" data-cls="ug=on" data-txt="ug=☑ UI 가이드">☐ UI 가이드</b>`})
 }),
 steps:[
  {t:'게임 뷰 열고 플레이',d:'씬 패널 위쪽의 「게임」 탭을 누르고, 툴바 가운데 「플레이」(Ctrl+P)를 누르면 게임이 시작된다. 다시 누르면 멈춘다.',cap:'「게임」 탭을 열고 「플레이」를 누른다',do:[{c:'vGame',on:'gv'},{c:'play',on:'pl'}]},
  {t:'주인공 움직여 보기',d:'게임 화면을 한 번 누르고 방향키나 WASD로 주인공을 움직인다. 스크립트가 붙은 오브젝트도 이때부터 움직인다.',cap:'방향키로 주인공을 움직인다',do:[{m:'cv'},{key:'→',on:'mv'},{wait:900}]},
  {t:'기기 화면 크기 바꾸기',d:'게임 탭 위쪽 목록에서 PC · 휴대폰 · 태블릿 화면 크기를 고른다. ⟳ 단추로 가로 · 세로를 돌리고, 원하는 크기를 직접 넣어 저장할 수도 있다.',cap:'화면 크기를 「iPhone 15」로 바꾼다',do:[{c:'dev',on:'dm'},{c:'dIp',on:'ph'}]},
  {t:'씬과 게임 나란히 보기',d:'「나란히」 탭을 누르면 씬 뷰와 게임 뷰가 좌우로 함께 보인다. 맵을 고치면서 실제 화면에서 어떻게 보이는지 바로 확인할 수 있다.',cap:'「나란히」로 씬과 게임을 함께 본다',do:[{c:'vSplit',on:'sp'}]},
  {t:'UI가 잘리는지 확인',d:'「UI 가이드」를 켜면 UI 캔버스 경계와 UI 요소 영역이 점선으로 겹쳐 보인다. 화면 크기를 바꿔 가며 글자나 버튼이 화면 밖으로 나가지 않는지 본다.',cap:'「UI 가이드」를 켜서 UI 영역을 확인한다',do:[{c:'ug',on:'ug'}]}
 ],
 tips:['플레이 중에는 씬 편집이 잠긴다. 끌기로 화면 이동 · 클릭으로 오브젝트 선택 · 휠로 확대만 된다.','플레이 막대의 「⛶ 전체 화면」으로 게임만 크게 띄워 볼 수 있다.','원하는 해상도를 직접 넣고 「저장」하면 내 해상도 목록에 남는다.','PlayerPrefs로 저장한 값은 플레이 ▾ 메뉴의 「저장 데이터 지우기」로 지운다.'],
 ex:[{h:'휴대폰에서도 버튼이 보일까?',p:'화면 크기를 iPhone 15로 바꾸고 「UI 가이드」를 켠다. 버튼이 점선 밖으로 나가면 UI의 기준 위치(앵커)를 바꾼다.'},
     {h:'고치고 바로 확인',p:'「나란히」로 두고 씬 뷰에서 오브젝트를 옮기면 게임 뷰에도 곧바로 반영된다. 카메라에 무엇이 찍히는지 보면서 맵을 다듬을 때 편하다.'},
     {h:'스크립트가 움직이는지 확인',p:'플레이 중에 콘솔을 함께 열어 두면 Debug.Log로 찍은 값이 실시간으로 쌓인다.'}],
 keys:[['Ctrl+P','플레이 시작 · 멈춤'],['방향키 · WASD','주인공 이동 (기본 이동 스크립트)'],['F11','브라우저 전체 화면']]},

/* ========================= 3. 계층 구조 ========================= */
{id:'hier',ic:'hier',title:'계층 구조',hk:['Ctrl','D'],rm:'lesson-1',
 lead:'씬에 든 모든 것을 나무 모양으로 정리',
 sum:'씬에 들어 있는 모든 것을 <u>나무 모양 목록으로 보여 주는 창</u>이다. 씬 아래에 타일맵 · 게임 오브젝트 · UI가 펼쳐지고, 여기서 고르고 · 만들고 · 이름을 바꾸고 · 부모와 자식으로 정리한다.',
 rel:['lesson-1','lesson-8','lesson-13'],gl:['insp','scene','assets'],
 css:`.m-pan.big .m-it{height:26px;font-size:12.5px}.m-ren{border:1.5px solid #f6cd2a;border-radius:5px;padding:1px 6px;background:#0e1014;min-width:90px}.m-ren.done{border-color:transparent;background:none;padding:1px 0}
  .k-chest{left:200px;top:80px}`,
 mock:eng({
  left:pan('계층 구조',`<div class="m-ptool"><b class="m-ib" data-k="hadd">＋</b><span class="m-srch">검색</span><b class="m-ib">⇊</b><b class="m-ib">⇈</b></div>`+
   row('새 게임',{tw:'▾',col:'#f6cd2a',n:'1씬'})+row('마을 ★',{d:1,tw:'▾',col:'#8fd4ec'})+row('타일맵',{d:2,tw:'▸'})+
   row('게임 오브젝트',{d:2,tw:'▸',tk:'tw',ta:'data-txt="open=▾"'})+
   `<div data-show="open">${row('주인공',{d:3,col:'#5cc08a',k:'rHero',tw:'',ta:'data-txt="ch=▾"'})}${row('카메라',{d:4,col:'#c9ced8',a:'data-show="ch"'})}${row('카메라',{d:3,col:'#c9ced8',k:'rCam',a:'data-hide="ch"'})}${row('상자',{d:3,col:'#31c1ec',k:'rChest',a:'data-cls="sel !new=sel"'})}
   <div class="m-it sel" style="padding-left:45px" data-show="new" data-cls="ch=nosel"><span class="tw"></span><i class="m-dot" style="background:#31c1ec"></i><span class="lb" data-hide="ren">게임 오브젝트</span><span class="m-ren" data-k="rin" data-show="ren" data-cls="rn=done">게임 오브젝트</span></div></div>`+
   row('UI',{d:2,tw:'▸',col:'#b69cff'})+
   menu([['빈 게임 오브젝트','mEmpty'],['2D 오브젝트','','▸'],['UI','','▸'],['빛','','▸'],'-',['붙여넣기','','Ctrl+V']],'data-show="m" data-hide="new" style="left:30px;top:56px;width:170px"'),{cls:'w260 big',ic:'hier'}),
  center:sceneView({tools:tools('obj'),world:tiles(TOWN)+spr('m-tree','style="left:40px;top:92px"')+cat('style="left:160px;top:160px"')+`<i class="m-spr m-chest k-chest" data-cls="sel !new=sel"><i class="gz" data-show="sel" data-hide="new"></i></i>`}),
  right:pan('인스펙터',insEmpty+`<div data-show="sel"><div class="m-ih"><i class="m-spr m-chest sm" data-hide="new"></i><b data-txt="new=게임 오브젝트;rn=보물상자">상자</b></div>${card('Transform',fld('위치','5 · 2')+fld('회전','0')+fld('크기','1 · 1'))}</div>`,{cls:'w180',ic:'insp'})
 }),
 steps:[
  {t:'펼쳐 보기',d:'줄 왼쪽의 ▸를 누르면 그 아래가 펼쳐진다. 위쪽 ⇊ · ⇈ 단추로 모두 접거나 모두 펼친다.',cap:'「게임 오브젝트」의 ▸를 눌러 펼친다',do:[{c:'tw',on:'open'}]},
  {t:'고르기',d:'줄을 누르면 그 오브젝트가 선택된다. 씬 뷰에서도 함께 표시되고, 인스펙터에 정보가 열린다.',cap:'「상자」 줄을 눌러 고른다',do:[{c:'rChest',on:'sel'}]},
  {t:'새로 만들기',d:'왼쪽 위 ＋를 누르거나 줄을 우클릭해 빈 게임 오브젝트 · 2D 오브젝트 · UI · 빛을 만든다.',cap:'＋ › 「빈 게임 오브젝트」를 만든다',do:[{c:'hadd',on:'m'},{c:'mEmpty',on:'new'}]},
  {t:'이름 바꾸기',d:'F2를 누르면 이름 칸이 열린다. 새 이름을 쓰고 Enter를 누른다. 이 이름은 코드에서 GameObject.Find로 찾을 때 그대로 쓰인다.',cap:'F2를 누르고 「보물상자」로 이름을 바꾼다',do:[{key:'F2',on:'ren'},{type:'rin',v:'보물상자'},{key:'Enter',on:'rn'}]},
  {t:'끌어서 부모 · 자식 만들기',d:'줄을 다른 줄 위로 끌어다 놓으면 그 아래(자식)로 들어간다. 부모가 움직이면 자식도 함께 움직인다.',cap:'「카메라」를 「주인공」 위로 끌어 자식으로 만든다',do:[{drag:'rCam',to:'rHero',g:'카메라',on:'ch'}]}
 ],
 tips:['위쪽 검색 칸에 이름을 치면 맞는 줄만 남는다.','씬이나 그룹 같은 폴더 줄을 더블클릭하면 포커스 모드가 되어 그 폴더만 보고 작업할 수 있다.','Ctrl+D 복제 · Ctrl+G 그룹으로 묶기 · Delete 지우기 · Ctrl+C / Ctrl+V 복사와 붙여넣기.','오른쪽 위 슬라이더나 Ctrl+휠로 줄 크기를 키울 수 있다.','이름이 파란색이면 프리팹 인스턴스다.'],
 ex:[{h:'카메라가 주인공을 따라오게',p:'카메라를 주인공의 자식으로 넣으면 스크립트 없이도 주인공이 움직일 때 카메라가 함께 따라간다.'},
     {h:'몬스터 열 마리 정리',p:'몬스터들을 함께 고르고 Ctrl+G로 그룹을 만들면 한 줄로 접어 둘 수 있다. 목록이 짧아져 찾기 쉽다.'},
     {h:'코드에서 이름으로 찾기',p:'계층 구조에 보이는 이름 그대로 찾는다. 이름이 한 글자라도 다르면 null이 돌아온다.',code:'GameObject box = GameObject.Find("보물상자");\nDebug.Log(box.name);'}],
 keys:[['F2','이름 바꾸기'],['Ctrl+D','복제'],['Ctrl+G','그룹으로 묶기'],['Delete','지우기'],['Ctrl+C · Ctrl+V','복사 · 붙여넣기'],['Ctrl+휠','줄 크기']]},

/* ========================= 4. 인스펙터 ========================= */
{id:'insp',ic:'insp',title:'인스펙터',hk:['선택'],rm:'lesson-1',
 lead:'고른 것의 값과 컴포넌트를 보고 바꾸기',
 sum:'고른 것의 <u>설정값을 모두 보여 주고 바꾸는 창</u>이다. 위치 · 회전 · 크기부터 콜라이더 · 빛 · 스크립트까지, 오브젝트에 붙은 컴포넌트가 한 칸씩 쌓여 보인다.',
 rel:['lesson-3','lesson-4','lesson-13'],gl:['hier','script','assets'],
 css:`.k-chest{left:200px;top:80px;transition:left .6s cubic-bezier(.3,.8,.3,1)}.k-chest.mv6{left:280px}
  .m-bc{position:absolute;inset:-3px;border:2px solid #5cc08a;border-radius:3px}.m-bc.tr{border-style:dashed}`,
 mock:eng({
  left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('게임 오브젝트',{d:1,tw:'▾'})+row('주인공',{d:2,col:'#5cc08a'})+row('상자',{d:2,col:'#31c1ec',k:'rChest',a:'data-cls="sel=sel"'})+row('나무',{d:2,col:'#31c1ec'}),{cls:'w150',ic:'hier'}),
  center:sceneView({tools:tools('obj'),world:tiles(TOWN)+spr('m-tree','style="left:40px;top:92px"')+cat('style="left:160px;top:160px"')+`<i class="m-spr m-chest k-chest" data-cls="sel=sel;px=mv6"><i class="m-bc" data-show="bc" data-cls="tr=tr"></i></i>`}),
  right:pan('인스펙터',insEmpty+`<div data-show="sel" class="m-isc"><div class="m-ih"><i class="m-spr m-chest sm"></i><b>상자</b><i class="sp"></i><span class="m-tag">태그 Untagged</span></div>
    ${card('Transform',fld('위치 X','5','data-k="px"')+fld('위치 Y','2')+fld('크기','1 · 1'))}
    <div data-show="bc">${card('박스 콜라이더 2D',`<div data-k="trg">${chk('트리거','data-cls="tr=on"')}</div>`+fld('크기','1 · 1'))}</div>
    <div data-show="sc">${card('Chest <small>(Script)</small>',fld('Gold','10')+chk('Need Key'))}</div>
    <div class="m-add"><b class="m-b y" data-k="addc">컴포넌트 추가</b><b class="m-b y" data-k="addsc">스크립트 추가</b></div>
    ${menu([['박스 콜라이더 2D','mBox'],['리지드바디 2D'],['오디오 소스'],['빛 2D']],'data-show="m" data-hide="bc" style="left:8px;bottom:36px;width:160px"')}
    ${menu([['Chest.cs','mChest'],['Hero.cs'],'-',['새 C# 스크립트…']],'data-show="sm" data-hide="sc" style="right:8px;bottom:36px;width:150px"')}</div>`,{cls:'w250',ic:'insp',bcls:'m-scroll'})
 }),
 steps:[
  {t:'오브젝트 고르기',d:'계층 구조나 씬 뷰에서 오브젝트를 고르면 인스펙터에 그 오브젝트가 열린다. 맨 위에 이름과 태그, 그 아래로 컴포넌트가 쌓여 있다.',cap:'계층 구조에서 「상자」를 고른다',do:[{c:'rChest',on:'sel'}]},
  {t:'값 바꾸기',d:'숫자 칸을 눌러 새 값을 넣고 Enter를 누른다. 칸 왼쪽 글자를 좌우로 끌면 값이 조금씩 바뀐다. 씬 뷰에 바로 반영된다.',cap:'위치 X를 7로 바꾸자 상자가 옮겨진다',do:[{type:'px',v:'7'},{key:'Enter',on:'px'}]},
  {t:'컴포넌트 붙이기',d:'아래 「컴포넌트 추가」를 눌러 박스 콜라이더 2D · 리지드바디 · 오디오 소스 · 빛 같은 기능을 붙인다.',cap:'「컴포넌트 추가 › 박스 콜라이더 2D」',do:[{c:'addc',on:'m'},{c:'mBox',on:'bc'}]},
  {t:'설정 켜고 끄기',d:'체크 칸을 눌러 기능을 켜고 끈다. 박스 콜라이더의 「트리거」를 켜면 길을 막지 않고 무엇이 닿았는지만 알려 준다.',cap:'「트리거」를 켜서 닿기만 알리게 한다',do:[{c:'trg',on:'tr'}]},
  {t:'스크립트 붙이기',d:'「스크립트 추가」로 C# 스크립트를 붙인다. 스크립트의 public 변수는 인스펙터에 칸으로 생겨서, 코드를 고치지 않고 값을 바꿀 수 있다.',cap:'「스크립트 추가 › Chest.cs」 — public 변수가 칸으로 보인다',do:[{c:'addsc',on:'sm'},{c:'mChest',on:'sc'}]}
 ],
 tips:['칸 이름 옆 ?에 마우스를 올리면 그 값이 무엇인지 설명이 나온다.','태그는 인스펙터 맨 위에서 정한다. 주인공은 기본 Player다.','프로젝트 창의 소리를 인스펙터로 끌어다 놓으면 오디오 소스의 클립으로 들어간다.','프리팹 인스턴스는 맨 위에 파란 프리팹 막대가 생기고 「모두 적용」 · 「모두 되돌리기」로 원본과 맞춘다.','컴포넌트 머리글의 ▾로 접어 두면 긴 인스펙터도 한눈에 보인다.'],
 ex:[{h:'바위를 못 지나가게',p:'바위에 박스 콜라이더 2D를 붙인다. 트리거는 꺼 둔다. 주인공이 부딪혀 멈춘다.'},
     {h:'출구 만들기',p:'출구에 박스 콜라이더 2D를 붙이고 트리거를 켠다. 주인공이 들어오면 스크립트의 OnTriggerEnter2D가 불린다.'},
     {h:'코드 없이 값 바꾸기',p:'스크립트에 public 변수를 두면 인스펙터에 칸이 생긴다. 몬스터마다 다른 공격력을 칸에서 바로 정할 수 있다.',code:'public int damage = 30;   // 인스펙터에 「Damage 30」 칸이 생긴다'}],
 keys:[['Enter','입력한 값 적용'],['글자 좌우로 끌기','숫자 조금씩 바꾸기'],['Ctrl+Z','바꾼 값 되돌리기']]},

/* ========================= 5. 프로젝트 (에셋) ========================= */
{id:'assets',ic:'assets',title:'프로젝트 (에셋)',hk:['Ctrl','C','V'],rm:'lesson-1',
 lead:'그림 · 소리 · 스크립트 · 프리팹을 모아 두는 창고',
 sum:'그림 · 소리 · 스크립트 · 프리팹 같은 <u>게임 재료(에셋)를 폴더로 모아 두는 창고</u>다. 가져오기 · 직접 그리기 · 음악 만들기 · 에셋스토어로 재료를 채우고, 씬이나 인스펙터로 끌어다 쓴다.',
 rel:['lesson-13','lesson-1','lesson-8','lesson-24'],gl:['insp','hier','palette'],
 css:`.m-slime{width:30px;height:22px;border-radius:50% 50% 40% 40%;background:radial-gradient(circle at 35% 35%,#9ff59c,#3fb64a 60%,#2a7f33);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2)}
  .m-world .m-slime{position:absolute}
  .m-pmw{position:absolute;left:150px;top:46px;width:470px;height:300px;border-radius:14px;background:#1b1e25;border:1px solid #3a3f4b;box-shadow:0 20px 50px rgba(0,0,0,.6);z-index:8;display:flex;flex-direction:column;overflow:hidden}
  .m-pmw .hd{height:32px;display:flex;align-items:center;gap:8px;padding:0 10px;border-bottom:1px solid #2b2f38;font-weight:700}
  .m-pmw .bd{flex:1;display:grid;place-items:center;background:repeating-conic-gradient(#2a2d35 0 25%,#23262d 0 50%) 0 0/20px 20px}
  .m-pix{display:grid;grid-template-columns:repeat(8,22px);grid-auto-rows:22px}.m-pix i{background:transparent}.m-pix i.a{background:#f6cd2a}.m-pix i.b{background:#e08a1e}.m-pix i.c{background:#2b1d0b}`,
 mock:(()=>{
  const A=(n,th,o={})=>`<div class="m-a ${o.cls||''}" ${o.k?`data-k="${o.k}"`:''} ${o.a||''}><span class="th" style="${th}">${o.inner||''}</span><span>${n}</span></div>`;
  const img=f=>`background-image:url(assets/base/${f}.png)`;
  const pix=[...'..aaaa....abbbba..abcbbcba.abbbbbba.abbbbbba.abbccbba..abbbba....aaaa..'].map(c=>`<i class="${c==='.'?'':c}"></i>`).join('');
  return eng({bh:205,
   left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('게임 오브젝트',{d:1,tw:'▾'})+row('주인공',{d:2,col:'#5cc08a'})+row('나무',{d:2,col:'#31c1ec'})+row('슬라임 (1)',{d:2,col:'#4f8dff',a:'data-show="pf"',la:'style="color:#7fb0ff"'}),{cls:'w150',ic:'hier'}),
   center:sceneView({tools:tools('obj'),wa:'style="transform:scale(.5)"',world:tiles(TOWN)+spr('m-tree','style="left:40px;top:92px"')+cat('style="left:160px;top:160px"')+`<i class="m-slime" data-show="pf" style="left:245px;top:128px"></i><i class="m-drop" data-k="scSpot" style="left:240px;top:120px"></i>`}),
   bottom:pan('프로젝트',`<div class="m-ptool"><b class="m-b y" data-k="imp">＋ 가져오기</b><b class="m-b" data-k="nd">＋ 새 폴더</b><b class="m-b" data-k="pmb">✎ 직접 그리기</b><b class="m-b">♪ 음악 만들기</b><b class="m-b">에셋스토어</b>
      <span class="m-srch w" data-k="srch" data-hide="q !qx">에셋 검색</span><span class="m-srch w" data-show="q" data-hide="qx"><span data-k="srchv" style="display:inline-block;min-width:6px;height:12px"></span><b class="x" data-k="srchx">✕</b></span><b class="m-sel">모든 태그 ▾</b><span class="m-sl"><i></i></span></div>
     <div class="m-split"><div class="m-ptree">${row('즐겨찾기',{tw:'▾',col:'transparent'})+row('모든 스프라이트',{d:1,col:'#8b93a3'})+row('Assets',{tw:'▾',col:'#f6cd2a',cls:'sel'})+row('스크립트',{d:1,col:'#bf63ff'})}</div>
     <div class="m-ag">
      ${A('몬스터','',{k:'aDir',inner:'<i class="m-fold"></i>',a:'data-show="dir" data-hide="q !qx"'}).replace('</span><span>몬스터',`<b data-show="mv">1</b></span><span>몬스터`)}
      ${A('grass',img('grass')+';background-size:300% 100%;background-position:0 0',{a:'data-hide="q !qx"'})}
      ${A('water',img('water')+';background-size:200% 100%')}
      ${A('tree',img('tree')+';background-size:auto 80%',{a:'data-hide="q !qx"'})}
      ${A('chest',img('chest'),{a:'data-hide="q !qx"'})}
      ${A('hero',img('hero')+';background-size:400% 400%;background-position:0 0',{a:'data-hide="q !qx"'})}
      ${A('아침 BGM','',{inner:'♪',a:'data-hide="q !qx"'})}
      ${A('슬라임','',{cls:'pf',k:'aPf',inner:'<i class="m-slime"></i>',a:'data-hide="q !qx"'})}
      ${A('slime.png','',{k:'aSlime',inner:'<i class="m-slime" style="transform:scale(.8)"></i>',a:'data-show="imp" data-hide="mv|q !qx"'})}
      ${A('my-art','',{inner:'<i style="width:30px;height:30px;border-radius:50%;background:#f6cd2a;box-shadow:inset -4px -4px 0 #e08a1e"></i>',a:'data-show="pmok" data-hide="q !qx"'})}
     </div></div>`,{ic:'assets'}),
   over:`<div class="m-pmw" data-show="pm" data-hide="pmok"><div class="hd">✎ 직접 그리기 · Pixel-meow<i class="sp"></i><b class="m-b y" data-k="pmx">내보내기</b><b class="m-ib">✕</b></div><div class="bd"><div class="m-pix">${pix}</div></div></div>`
  })})(),
 steps:[
  {t:'파일 가져오기',d:'「＋ 가져오기」를 누르거나 컴퓨터의 파일을 창 위로 끌어다 놓는다. PNG 그림과 MP3 · WAV · OGG 소리, 글꼴을 넣을 수 있다.',cap:'「＋ 가져오기」로 slime.png를 넣는다',do:[{c:'imp',on:'imp'}]},
  {t:'폴더로 정리하기',d:'「＋ 새 폴더」로 폴더를 만들고, 에셋을 폴더 위로 끌어다 놓아 옮긴다. 많아져도 찾기 쉽다.',cap:'새 폴더를 만들고 slime.png를 끌어 넣는다',do:[{c:'nd',on:'dir'},{drag:'aSlime',to:'aDir',g:'slime.png',on:'mv'}]},
  {t:'찾기',d:'검색 칸에 이름을 치거나 태그 목록으로 걸러 본다. 오른쪽 슬라이더로 아이콘 크기를 바꾸고, 맨 왼쪽까지 내리면 목록 보기가 된다.',cap:'검색 칸에 「water」를 쳐서 찾는다',do:[{c:'srch',on:'q'},{type:'srchv',v:'water'}]},
  {t:'직접 그리기 · 음악 만들기',d:'「직접 그리기」는 Pixel-meow, 「음악 만들기」는 SoundLab을 엔진 위 창으로 연다. 내보내면 만든 그림이나 음악이 에셋으로 바로 들어온다.',cap:'「직접 그리기」로 그린 그림을 내보낸다',do:[{c:'srchx',on:'qx'},{c:'pmb',on:'pm'},{c:'pmx',on:'pmok'}]},
  {t:'씬으로 끌어다 쓰기',d:'파란 프리팹은 씬 뷰나 계층 구조로 끌어다 놓으면 그 자리에 하나가 생긴다. 소리는 인스펙터로 끌어 오디오 소스에 넣는다.',cap:'슬라임 프리팹을 씬 뷰로 끌어다 놓는다',do:[{drag:'aPf',to:'scSpot',g:'슬라임',on:'pf'}]}
 ],
 tips:['계층 구조의 오브젝트를 이 창으로 끌어다 놓으면 프리팹이 된다.','소리 에셋은 더블클릭하면 미리 들어 볼 수 있다.','「에셋스토어」에서 타일 · 오브젝트 · 음악을 불러올 수 있다.','SoundLab으로 만든 음악은 우클릭 「SoundLab에서 수정」으로 다시 열어 고친다.','오른쪽 위 「크게 보기」로 창을 넓게 쓰고 Esc로 돌아온다.'],
 ex:[{h:'슬라임 몬스터 열 마리',p:'슬라임 하나를 다 꾸민 뒤 계층 구조에서 이 창으로 끌어 프리팹을 만든다. 프리팹을 씬 뷰로 여러 번 끌어다 놓으면 똑같은 슬라임이 생긴다.'},
     {h:'배경 음악 넣기',p:'「음악 만들기」로 곡을 만들 때 「반복 재생용」을 켜 두면 끊기지 않고 반복되는 WAV가 SoundLab 폴더에 들어온다. 그 소리를 오디오 소스에 넣는다.'},
     {h:'내가 그린 캐릭터',p:'「직접 그리기」로 그리고 「내보내기」를 누르면 그림 에셋이 된다. 나중에 고칠 때는 그 에셋을 다시 Pixel-meow로 열어 「원본에 적용」한다.'}],
 keys:[['Ctrl+C · Ctrl+V','에셋 · 폴더 복사와 붙여넣기'],['F2','이름 바꾸기'],['Delete','지우기'],['더블클릭 (소리)','미리 듣기'],['Esc','크게 보기 끝내기']]},

/* ========================= 6. 타일 팔레트 ========================= */
{id:'palette',ic:'palette',title:'타일 팔레트',hk:['E','R','T','Y'],rm:'lesson-1',
 lead:'바닥 · 벽 · 물을 칸 단위로 칠하는 물감 상자',
 sum:'바닥 · 벽 · 물 같은 배경을 <u>칸 단위로 칠하는 물감 상자</u>다. 팔레트에서 타일을 고르고 씬 뷰에 칠하면 맵이 된다. 이웃에 맞춰 모양이 바뀌는 룰 타일과 저절로 움직이는 애니메이션 타일도 여기서 만든다.',
 rel:['lesson-1','lesson-7'],gl:['scene','assets','insp'],
 css:`.m-pal{display:flex;gap:10px;padding:8px}.m-sheet{display:grid;grid-template-columns:repeat(7,38px);grid-auto-rows:38px;gap:3px;padding:6px;border-radius:8px;background:#101216}
  .m-sheet .m-tl{width:38px;height:38px;border-radius:2px}.m-sheet .m-tl.on{box-shadow:0 0 0 2px #f6cd2a,0 0 0 5px rgba(246,205,42,.25)}
  .m-tl.box{outline:2px solid #f6cd2a;outline-offset:-2px}`,
 mock:eng({bh:150,
  tbo:{lay:{ltm:'data-cls="tm !col=on"',lcol:'data-cls="col=on"',lgo:'data-cls="!tm=on"'}},
  center:sceneView({tools:tools('both',{tileOn:'tm',ptE:'data-cls="pw !tt=on"',ptT:'data-cls="tt=on"',ptW:'data-cls="!pw=on"'}),
   world:tiles(['sssssssssss','s.........s','s.........s','s.........s','s.........s','sssssssssss'],(c,r,ch)=>{
     const P={'3,2':1,'4,2':2,'5,2':3,'5,3':4,'4,3':5,'3,3':6}[c+','+r],C={'2,2':1,'2,3':2,'3,4':3,'4,4':4,'5,4':5,'6,3':6,'6,2':7}[c+','+r];
     let a='';if(P)a+=`data-k="pp" data-p="${P}" `;
     if(C)a+=`data-k="cp" data-p="${C}" `;
     if(c===7&&r===1)a+='data-k="b1" ';if(c===9&&r===4)a+='data-k="b2" ';
     if(c>=7&&c<=9&&r>=1&&r<=4)a+='data-cls="box=s" ';
     if(ch==='s')a+='data-cls="col=c" ';
     return a}),wa:'style="transform:scale(.84)"'}),
  bottom:pan('타일 팔레트',`<div class="m-pal"><div class="m-sheet">
    <i class="m-tl g1"></i><i class="m-tl g2"></i><i class="m-tl g3"></i><i class="m-tl w" data-k="pW" data-cls="pw !ps=on"></i><i class="m-tl s" data-k="pS" data-cls="ps=on"></i><i class="m-tl d"></i><i class="m-tl sa"></i></div>
    <div class="m-pinfo"><b>타일셋 · 마을</b><span>타일을 누르거나 여러 칸을 끌어 고른다</span><span class="m-b g">⊞ 타일 합치기</span><span class="m-b g">룰 타일 만들기</span></div></div>`,{ic:'palette',a:'data-cls="tm=hot"'})
 }),
 steps:[
  {t:'타일맵 레이어 고르기',d:'툴바에서 「타일맵 1」을 누른다. 아래 창이 타일 팔레트로 바뀌고, 왼쪽 도구 막대가 브러시 · 지우개 같은 칠하기 도구로 바뀐다.',cap:'툴바에서 「타일맵 1」을 고른다',do:[{c:'ltm',on:'tm'}]},
  {t:'타일 고르기',d:'팔레트의 타일을 누른다. 여러 칸을 끌어서 고르면 그 모양 그대로 도장처럼 찍힌다.',cap:'팔레트에서 물 타일을 고른다',do:[{c:'pW',on:'pw'}]},
  {t:'칠하기',d:'브러시(E)로 씬 뷰를 누르거나 끌면 칸이 칠해진다. 지우개(R)는 칸을 비우고, 피커(I)로 씬의 칸을 누르면 그 타일이 바로 골라진다.',cap:'브러시로 끌어서 연못을 칠한다',do:[{paint:'pp',cls:'w'}]},
  {t:'넓게 채우기',d:'박스 채우기(T)는 사각형을 끌어 한 번에 칠하고, 채우기(Y)는 이어진 같은 타일을 한 번에 바꾼다.',cap:'돌 타일을 고르고 박스 채우기(T)로 끈다',do:[{c:'pS',on:'ps'},{c:'ptT',on:'tt'},{drag:'b1',to:'b2',on:'box'}]},
  {t:'막는 칸 칠하기',d:'그림만 칠하면 주인공이 그 위를 지나간다. 「콜라이더」 레이어를 고르고 막을 칸을 칠하면 빨간 칸이 생기고, 플레이할 때 지나갈 수 없다.',cap:'「콜라이더」 레이어로 연못 둘레를 막는다',do:[{c:'lcol',on:'col'},{paint:'cp',cls:'c'}]}
 ],
 tips:['룰 타일은 칠한 칸마다 이웃 8칸을 보고 가장자리 · 모서리 그림을 저절로 고른다. 지형 시트의 3×3 칸을 고르고 인스펙터에서 만든다.','애니메이션 타일은 여러 프레임을 정한 속도로 넘긴다. 「무작위 시작」을 켜면 물결이 자연스럽다.','「타일 합치기」로 여러 타일을 무한한 격자에 늘어놓고 겹쳐 하나의 타일셋으로 저장한다.','타일맵 레이어에서는 E · R · T · Y가 브러시 · 지우개 · 박스 채우기 · 채우기가 된다.'],
 ex:[{h:'연못 만들기',p:'물 타일로 연못을 칠하고, 콜라이더 레이어로 같은 칸을 칠한다. 보이는 그림과 막는 칸은 따로라서 둘 다 칠해야 한다.'},
     {h:'비밀 통로',p:'벽 그림은 그대로 두고 콜라이더 레이어에서 한 칸만 지운다. 겉보기에는 벽인데 지나갈 수 있는 통로가 된다.'},
     {h:'섬 모양 지형',p:'룰 타일로 잔디 지형을 칠하면 가장자리와 모서리가 저절로 맞춰진다. 외딴 한 칸을 위한 규칙을 하나 더하면 작은 섬도 그린다.'}],
 keys:[['E','브러시'],['R','지우개'],['T','박스 채우기'],['Y','채우기'],['I','피커 (씬에서 타일 집기)'],['Q','손 도구'],['W','이동 도구']]},

/* ========================= 7. 콘솔 ========================= */
{id:'console',ic:'console',title:'콘솔',hk:['Debug.Log'],rm:'lesson-2',
 lead:'스크립트가 찍은 값 · 경고 · 오류를 보는 창',
 sum:'스크립트가 <u>개발자에게 말을 거는 창</u>이다. Debug.Log로 찍은 값과 경고 · 오류가 시간 순서대로 쌓여, 코드가 생각대로 움직이는지 눈으로 확인할 수 있다.',
 rel:['lesson-2','lesson-5'],gl:['script','game'],extra:['search'],
 css:`.m-code .m-cl.hl{background:rgba(234,103,115,.18);box-shadow:inset 3px 0 0 #ea6773}.m-det{margin:2px 6px 6px 26px;padding:7px 9px;border-radius:7px;background:#101216;border:1px solid #2b2f38;font:11px/1.5 var(--gdm);color:#c9ced8}`,
 mock:eng({
  tbo:{play:'data-cls="play=stop" data-txt="play=■ 정지"'},
  left:pan('스크립트',`<div class="m-tabs"><b class="on">Hero.cs</b></div><div class="m-code">
   ${cl(1,kw('using')+' UnityEngine;')}${cl(2,'')}${cl(3,kw('public class')+' '+ty('Hero')+' : '+ty('MonoBehaviour'))}${cl(4,'{')}
   ${cl(5,'    '+kw('public int')+' hp = 100;')}${cl(6,'    '+kw('void')+' '+ty('Start')+'()')}${cl(7,'    {')}
   ${cl(8,'        <span data-k="ln8"></span>')}${cl(9,'        '+ty('Debug')+'.'+ty('LogWarning')+'('+str('"체력이 낮아요"')+');')}
   ${cl(10,'        '+ty('GameObject')+' box = '+kw('null')+';')}${cl(11,'        Debug.Log(box.name);','data-cls="go=hl"')}${cl(12,'    }')}${cl(13,'}')}</div>`,{cls:'w380',ic:'script'}),
  center:pan('콘솔',`<div class="m-ptool"><b class="m-b" data-k="clr">지우기</b><i class="sp"></i>
     <b class="m-cf" data-k="fI" data-cls="fi=off"><i class="d info"></i><span data-txt="play=1;clr=0">0</span></b><b class="m-cf"><i class="d warn"></i><span data-txt="play=1;clr=0">0</span></b><b class="m-cf"><i class="d err"></i><span data-txt="play=1;clr=0">0</span></b></div>
   <div class="m-logs" data-hide="clr">
     ${log('info','HP: 100','data-show="play" data-hide="fi"')}
     ${log('warn','체력이 낮아요','data-show="play"')}
     <div data-show="play" data-k="er">${log('err','NullReferenceException: box가 null이다 · Hero.cs 11번째 줄','data-cls="ex=open"')}</div>
     <div class="m-det" data-show="ex">Hero.cs (11번째 줄)<br>Debug.Log(box.name);<br><b class="m-b y" data-k="go" style="margin-top:6px">스크립트에서 이 줄 보기</b></div>
   </div><div class="m-empty" data-show="clr">콘솔이 비어 있다. Debug.Log 출력과 스크립트 컴파일 결과가 여기에 표시된다.</div>`,{ic:'console'})
 }),
 steps:[
  {t:'코드에 Debug.Log 쓰기',d:'스크립트 안에서 Debug.Log("글자")를 쓴다. 변수를 + 로 이어 붙이면 그 값도 함께 찍힌다.',cap:'Start 안에 Debug.Log("HP: " + hp); 를 쓴다',do:[{type:'ln8',v:'Debug.Log("HP: " + hp);'}]},
  {t:'플레이해서 출력 보기',d:'플레이(Ctrl+P)를 누르면 코드가 실행되고, 찍은 내용이 콘솔에 한 줄씩 쌓인다.',cap:'Ctrl+P로 플레이하면 콘솔에 줄이 쌓인다',do:[{key:'Ctrl+P',on:'play'}]},
  {t:'로그 · 경고 · 오류 구분',d:'흰 줄은 로그, 노란 줄은 경고(Debug.LogWarning), 빨간 줄은 오류다. 오른쪽 위 숫자 단추를 누르면 그 종류만 숨기거나 다시 보인다.',cap:'로그 단추를 눌러 일반 로그를 숨긴다',do:[{c:'fI',on:'fi'}]},
  {t:'오류 난 줄 찾아가기',d:'오류 줄을 누르면 자세한 내용이 펼쳐진다. 「스크립트에서 이 줄 보기」를 누르면 스크립트 창에서 그 줄이 빨갛게 반짝인다.',cap:'오류를 펼치고 「스크립트에서 이 줄 보기」',do:[{c:'er',on:'ex'},{c:'go',on:'go'}]},
  {t:'지우고 다시 보기',d:'「지우기」로 지난 기록을 비운다. 고친 뒤 다시 플레이하면 새 기록만 보여서 비교하기 쉽다.',cap:'「지우기」로 콘솔을 비운다',do:[{c:'clr',on:'clr'}]}
 ],
 tips:['같은 메시지가 연달아 나오면 한 줄로 합쳐지고 옆에 횟수가 붙는다.','Debug.LogError로 일부러 빨간 줄을 찍어 눈에 띄게 할 수 있다.','콘솔이 조용하다면 스크립트가 오브젝트에 붙어 있는지 인스펙터에서 먼저 확인한다.','학습 › 코드 검색에 오류 난 코드를 넣으면 쓰인 코드마다 설명을 볼 수 있다.'],
 ex:[{h:'점수가 왜 안 올라가지?',p:'점수를 더하는 줄 바로 뒤에 값을 찍어 본다. 콘솔에 아무것도 안 나오면 그 줄까지 오지 않은 것이다.',code:'score += 10;\nDebug.Log("점수: " + score);'},
     {h:'함수가 불렸는지 확인',p:'충돌 함수 맨 위에 Debug.Log를 넣어 두면, 닿았을 때 정말 불리는지와 무엇이 닿았는지를 알 수 있다.',code:'void OnTriggerEnter2D(Collider2D other)\n{\n    Debug.Log("닿음: " + other.name);\n}'},
     {h:'경고로 표시하기',p:'꼭 문제는 아니지만 알아 둘 일은 노란 경고로 찍는다.',code:'if (hp < 30)\n    Debug.LogWarning("체력이 낮아요");'}],
 keys:[['Ctrl+P','플레이 (출력 보기)'],['Debug.Log','일반 로그 (흰 줄)'],['Debug.LogWarning','경고 (노란 줄)'],['Debug.LogError','오류 (빨간 줄)']]},

/* ========================= 8. 스크립트 (C#) ========================= */
{id:'script',ic:'script',title:'스크립트 (C#)',hk:['Ctrl','Space'],rm:'lesson-2',
 lead:'자동완성이 있는 엔진 안의 C# 편집기',
 sum:'C# 코드를 쓰는 <u>엔진 안의 코드 편집기</u>다. 자동완성 · 코드 조각 · 찾기 · 도움말이 들어 있어서, 처음 쓰는 사람도 유니티와 같은 문법으로 게임을 움직일 수 있다.',
 rel:['lesson-2','lesson-5','lesson-10','lesson-23'],gl:['console','insp','vs'],extra:['search'],
 css:`.m-ac{position:absolute;left:150px;width:230px;border-radius:9px;background:#22252d;border:1px solid #3a3f4b;box-shadow:0 12px 30px rgba(0,0,0,.5);padding:4px;z-index:6;font:11.5px var(--gdm)}
  .m-ac div{display:flex;justify-content:space-between;padding:3px 8px;border-radius:5px}.m-ac div.on{background:#f6cd2a;color:#1a1400}.m-ac small{opacity:.6;font-family:var(--gdf)}
  .m-dlg{position:absolute;left:30px;top:120px;width:200px;padding:10px;border-radius:12px;background:#22252d;border:1px solid #3a3f4b;box-shadow:0 16px 40px rgba(0,0,0,.55);z-index:7}
  .m-dlg b{display:block;margin-bottom:6px}.m-con{height:34px;border-top:1px solid #262a33;display:flex;align-items:center;padding:0 8px}`,
 mock:eng({
  left:pan('인스펙터',`<div class="m-ih"><i class="m-coin"></i><b>코인</b></div>${card('Transform',fld('위치','3 · 2'))}${card('원 콜라이더 2D',chk('트리거','',1))}
    <div data-show="made">${card('Coin <small>(Script)</small>',fld('Script','Coin'))}</div>
    <div class="m-add"><b class="m-b y">컴포넌트 추가</b><b class="m-b y" data-k="addsc">스크립트 추가</b></div>
    ${menu([['새 C# 스크립트…','newsc'],'-',['Hero.cs'],['NpcTalk.cs']],'data-show="m1" data-hide="nm" style="right:8px;bottom:36px;width:150px"')}
    <div class="m-dlg" data-show="nm" data-hide="made"><b>새 C# 스크립트</b>${fld('이름','','data-k="nmi"')}<div style="text-align:right;margin-top:8px"><b class="m-b y">만들기</b></div></div>`,{cls:'w250',ic:'insp'}),
  tbo:{cs:'data-cls="open=on"',play:'data-cls="play=stop" data-txt="play=■ 정지"'},
  center:`<div class="m-empty big" data-hide="open">툴바의 「C#」을 누르면<br>스크립트 창이 열린다</div>`+pan('스크립트',`<div class="m-tabs"><b class="on">Coin.cs</b><b>Hero.cs</b></div><div class="m-code" style="position:relative;height:calc(100% - 62px)">
    ${cl(1,kw('using')+' UnityEngine;')}${cl(2,'')}${cl(3,kw('public class')+' '+ty('Coin')+' : '+ty('MonoBehaviour'))}${cl(4,'{')}${cl(5,'    '+kw('void')+' '+ty('Start')+'()')}${cl(6,'    {')}
    ${cl(7,'        <span data-k="cl7" data-hide="acok"></span><span data-show="acok">'+ty('Debug')+'.'+ty('Log')+'('+str('"코인 준비!"')+');</span>')}${cl(8,'    }')}
    ${cl(9,'    <span data-k="cl9" data-hide="upd"></span><span data-show="upd">'+kw('void')+' '+ty('Update')+'()</span>')}
    <div data-show="upd">${cl(10,'    {')}${cl(11,'        '+cm('// 매 프레임 실행'))}${cl(12,'    }')}</div>${cl('<span data-txt="upd=13">10</span>','}')}
    <div class="m-ac" style="top:118px" data-show="ac" data-hide="acok"><div class="on">Log<small>메서드</small></div><div>LogWarning<small>메서드</small></div><div>LogError<small>메서드</small></div></div>
    <div class="m-ac" style="top:148px" data-show="ac2" data-hide="upd"><div class="on">Update<small>Unity 메시지</small></div><div>if<small>스니펫</small></div></div>
    </div><div class="m-con">${log('info','코인 준비!','data-show="play"')}</div>`,{ic:'script',a:'data-show="open"',head:'<b class="m-b g">숨기기</b><b class="m-ib">✕</b>'})
 }),
 steps:[
  {t:'새 스크립트 만들기',d:'오브젝트를 고르고 인스펙터의 「스크립트 추가 › 새 C# 스크립트…」를 누른다. 영어 이름을 정하면 스크립트가 만들어지고 그 오브젝트에 바로 붙는다.',cap:'「스크립트 추가 › 새 C# 스크립트…」로 Coin을 만든다',do:[{c:'addsc',on:'m1'},{c:'newsc',on:'nm'},{type:'nmi',v:'Coin'},{key:'Enter',on:'made'}]},
  {t:'스크립트 창 열기',d:'툴바의 「C#」을 누르면 스크립트 창이 열린다. 위쪽 탭으로 여러 스크립트를 오가며 편집한다.',cap:'툴바의 「C#」으로 스크립트 창을 연다',do:[{c:'bcs',on:'open'}]},
  {t:'자동완성으로 쓰기',d:'글자를 치거나 . 을 찍으면 후보 목록이 뜬다. ↑↓로 고르고 Tab으로 넣는다. Ctrl+Space를 누르면 언제든 후보를 볼 수 있다.',cap:'Debug. 을 치고 Tab으로 Log를 넣는다',do:[{type:'cl7',v:'Debug.',on:'ac'},{key:'Tab',on:'acok'}]},
  {t:'틀 통째로 넣기',d:'Start · Update 같은 유니티 메시지 함수나 「스니펫」 후보를 고르고 Enter를 누르면 함수 틀이 통째로 들어간다.',cap:'Upd 까지 치고 Enter로 Update 틀을 넣는다',do:[{type:'cl9',v:'Upd',on:'ac2'},{key:'Enter',on:'upd'}]},
  {t:'플레이로 확인',d:'플레이(Ctrl+P)하면 고친 코드로 게임이 움직인다. 문법이 틀렸으면 콘솔에 빨간 오류와 줄 번호가 뜬다.',cap:'Ctrl+P — 콘솔에 「코인 준비!」가 찍힌다',do:[{key:'Ctrl+P',on:'play'}]}
 ],
 tips:['Ctrl+F로 찾기 막대를 열고 Enter · Shift+Enter로 다음 · 이전을 찾는다.','글자를 드래그해 고르면 같은 내용이 있는 다른 곳에 노란 밑줄이 생긴다.','help를 치거나 F1을 누르면 스크립트 도움말 창이 열린다.','이름 칸을 우클릭하면 한글 이름을 영어 이름으로 바꿔 주는 이름 번역기가 뜬다.','「숨기기」는 열린 탭을 그대로 두고 창만 감추고, ✕는 탭까지 모두 닫는다.'],
 ex:[{h:'코인 줍기',p:'코인에 트리거 콜라이더와 이 스크립트를 붙인다. 주인공이 닿으면 코인이 사라진다.',code:'void OnTriggerEnter2D(Collider2D other)\n{\n    if (other.CompareTag("Player"))\n        Destroy(gameObject);\n}'},
     {h:'키로 움직이기',p:'Update는 매 프레임 불린다. 키를 누르고 있는 동안 오른쪽으로 움직인다.',code:'public float speed = 3f;\n\nvoid Update()\n{\n    if (Input.GetKey(KeyCode.RightArrow))\n        transform.Translate(speed * Time.deltaTime, 0, 0);\n}'},
     {h:'인스펙터에서 조절할 값',p:'public 변수는 인스펙터에 칸이 생긴다. [Header]로 제목을 달 수도 있다.',code:'[Header("이동")]\npublic float speed = 3f;'}],
 keys:[['Ctrl+Space','후보 목록 보기'],['Tab · Enter','후보 넣기'],['Esc','후보 닫기'],['Ctrl+F','찾기'],['F1','스크립트 도움말'],['Ctrl+P','플레이']]},

/* ========================= 9. 비주얼 스크립트 ========================= */
{id:'vs',ic:'vs',title:'비주얼 스크립트',hk:['F'],rm:'lesson-11',
 lead:'노드를 선으로 이어 코드 없이 움직이기',
 sum:'코드를 쓰는 대신 <u>노드(블록)를 선으로 이어 게임을 움직이는 방법</u>이다. 이벤트 노드가 「언제」를, 선으로 이어진 노드들이 「무엇을」 할지 정한다.',
 rel:['lesson-11','lesson-12','lesson-25'],gl:['script','console','animator'],
 css:`.m-vsw{position:absolute;inset:0;display:flex}.m-lib{width:150px;border-right:1px solid #262a33;padding:6px;display:flex;flex-direction:column;gap:2px}
  .m-lib .h{font-size:10.5px;color:#8b909a;margin:6px 4px 2px}.m-lib .n{height:22px;display:flex;align-items:center;gap:6px;padding:0 7px;border-radius:6px;background:#20232a;font-size:11px}
  .m-lib .n i{width:8px;height:8px;border-radius:2px}.m-vcv{flex:1;position:relative;background:#14161b radial-gradient(circle,#2a2e37 1px,transparent 1.2px) 0 0/18px 18px}
  .m-node{position:absolute;width:170px;border-radius:10px;background:#22252d;border:1.5px solid #3a3f4b;box-shadow:0 8px 20px rgba(0,0,0,.4);font-size:11px}
  .m-node .nh{height:24px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:9px 9px 0 0;font-weight:700}
  .m-node.ev .nh{background:#1f5a35;color:#bff5d0}.m-node.ac .nh{background:#3b3367;color:#ddd5ff}
  .m-node .nb{padding:6px 8px;display:flex;flex-direction:column;gap:5px}.m-node .m-f .fl{width:38px}
  .m-port{position:absolute;width:12px;height:12px;top:6px;clip-path:polygon(0 0,100% 50%,0 100%);background:#e9eaee}
  .m-node .pi{left:-7px}.m-node .po{right:-7px}
  .m-node.run{border-color:#f6cd2a;box-shadow:0 0 0 3px rgba(246,205,42,.25),0 8px 20px rgba(0,0,0,.4)}
  .m-wire{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  .m-wire path{fill:none;stroke:#e9eaee;stroke-width:2.5}.m-wire.run path{stroke:#f6cd2a;stroke-dasharray:8 6;animation:mdash .6s linear infinite}
  .m-vbar{position:absolute;left:0;right:0;bottom:0;height:30px;border-top:1px solid #262a33;background:#15171c;display:flex;align-items:center;padding:0 8px}`,
 mock:eng({
  tbo:{vs:'data-cls="open=on"'},
  left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('주인공',{d:1,col:'#5cc08a',cls:'sel'})+row('상자',{d:1,col:'#31c1ec'}),{cls:'w150',ic:'hier'}),
  center:`<div class="m-empty big" data-hide="open">주인공을 고른 뒤<br>툴바의 「비주얼 스크립트」를 누른다</div>`+pan('비주얼 스크립트',`<div class="m-vsw">
    <div class="m-lib"><span class="h">이벤트</span><span class="n"><i style="background:#2fa65a"></i>시작 (Start)</span><span class="n"><i style="background:#2fa65a"></i>업데이트</span><span class="n"><i style="background:#2fa65a"></i>키 입력</span>
     <span class="h">동작</span><span class="n" data-k="libLog"><i style="background:#7a6cff"></i>Debug.Log</span><span class="n"><i style="background:#7a6cff"></i>알림 메시지</span><span class="n"><i style="background:#7a6cff"></i>기다리기</span>
     <span class="h">값</span><span class="n"><i style="background:#e8a33d;border-radius:50%"></i>변수 가져오기</span><span class="n"><i style="background:#e8a33d;border-radius:50%"></i>글자 잇기</span></div>
    <div class="m-vcv" data-k="vcv">
     <div class="m-empty" data-hide="g" style="padding-top:110px">이 오브젝트에 그래프가 없다<br><b class="m-b y" data-k="newg" style="margin-top:10px">＋ 새 스크립트 머신</b></div>
     <svg class="m-wire" data-show="w1" data-cls="play=run"><path d="M 207 101 C 245 101, 240 151, 278 151"/></svg>
     <div class="m-node ev" data-show="g" data-cls="play=run" style="left:30px;top:88px"><div class="nh">▶ 시작 (Start)</div><div class="nb"><small style="color:#8b909a">게임이 시작될 때 한 번</small></div><i class="m-port po" data-k="pS"></i></div>
     <i class="m-drop" data-k="spot" style="left:290px;top:150px"></i>
     <div class="m-node ac" data-show="n1" data-cls="play=run" style="left:285px;top:138px"><div class="nh">Debug.Log</div><div class="nb">${fld('메시지','','data-k="lv"')}</div><i class="m-port pi" data-k="pL"></i><i class="m-port po"></i></div>
     <div class="m-vbar">${log('info','안녕 비주얼!','data-show="play"')}<i class="sp"></i><small style="color:#8b909a">포트를 끌어 선으로 잇기 · 오른쪽 클릭으로 노드 추가</small></div>
    </div></div>`,{ic:'vs',a:'data-show="open"'})
 }),
 steps:[
  {t:'그래프 만들기',d:'오브젝트를 고르고 툴바의 「비주얼 스크립트」를 누른다. 「새 스크립트 머신」을 만들면 「시작」 노드가 있는 그래프가 생긴다. 상태별로 나눠 움직이려면 「새 상태 머신」을 고른다.',cap:'「비주얼 스크립트」를 열고 새 스크립트 머신을 만든다',do:[{c:'bvs',on:'open'},{c:'newg',on:'g'}]},
  {t:'노드 꺼내기',d:'왼쪽 노드 목록에서 노드를 캔버스로 끌어다 놓는다. 캔버스 빈 곳을 오른쪽 클릭해서 고를 수도 있다.',cap:'목록의 Debug.Log를 캔버스로 끌어다 놓는다',do:[{drag:'libLog',to:'spot',g:'Debug.Log',on:'n1'}]},
  {t:'흐름 잇기',d:'노드의 ▶(흐름)를 끌어 다른 노드의 ▶에 놓으면 선이 생긴다. 흐름은 선을 따라 차례로 실행된다.',cap:'시작의 ▶를 끌어 Debug.Log의 ▶에 잇는다',do:[{drag:'pS',to:'pL',on:'w1'}]},
  {t:'값 넣기',d:'노드 안의 칸에 값을 직접 넣거나, 동그라미 포트로 다른 노드의 값을 이어 준다. ▶가 「순서」라면 동그라미는 「값」이 오가는 길이다.',cap:'메시지 칸에 「안녕 비주얼!」을 쓴다',do:[{type:'lv',v:'안녕 비주얼!',on:'v'}]},
  {t:'플레이해 보기',d:'플레이하면 시작 노드부터 흐름이 실행되어 콘솔에 글이 찍힌다. 그래프 이름은 프로젝트에 남아서 다른 오브젝트에도 붙일 수 있다.',cap:'Ctrl+P — 흐름을 따라 콘솔에 글이 찍힌다',do:[{key:'Ctrl+P',on:'play'}]}
 ],
 tips:['「키 입력」 · 「업데이트」 · 「엔진 메시지 받기」 같은 이벤트 노드가 흐름의 시작점이다.','「만약」은 참/거짓 값으로 흐름을 둘로 나눈다. 「비교」 노드와 함께 쓴다.','「기다리기」는 정한 시간만큼 멈췄다가 다음으로 넘어가는데, 그동안 게임은 계속 돌아간다.','상태 머신에서는 상태를 더블클릭해 안으로 들어가고, 오른쪽 ◉를 끌어 다른 상태에 놓으면 전환이 생긴다.','노드 목록 오른쪽 ?에 마우스를 올리면 설명과 예시 그래프가 뜬다.'],
 ex:[{h:'Space를 누르면 알림',p:'「키 입력」 노드에서 Space를 고르고 「알림 메시지」를 잇는다. 누를 때마다 화면에 글이 뜬다.'},
     {h:'점수 세기',p:'그래프 변수 「점수」를 만들고 「변수에 더하기」로 1씩 더한다. 결과를 「글자 잇기」로 「점수: 3」처럼 만들어 찍는다.'},
     {h:'상자를 열면 열쇠',p:'상자 그래프에서 「커스텀 이벤트 보내기」로 신호를 보내고, 문 그래프에서 「커스텀 이벤트 받기」로 받아 문을 연다.'}],
 keys:[['F','그래프 전체 보기'],['오른쪽 클릭','노드 추가'],['빈 곳 끌기','화면 이동'],['휠','확대 · 축소'],['Delete','노드 · 선 지우기']]},

/* ========================= 10. UI 빌더 ========================= */
{id:'uib',ic:'uib',title:'UI 빌더',hk:['Shift','Space'],rm:'lesson-1',
 lead:'버튼 · 텍스트로 게임 화면을 끌어다 놓아 만들기',
 sum:'버튼 · 텍스트 · 슬라이더 같은 게임 화면 UI를 <u>끌어다 놓아 디자인하는 창</u>이다. 만든 화면은 씬의 UI 그룹으로 저장되고, 버튼 하나로 다른 화면을 열고 닫을 수 있다.',
 rel:['lesson-9','lesson-10','lesson-12'],gl:['hier','script','game'],
 css:`.m-ubw{position:absolute;inset:0;display:flex}.m-ubl{width:150px;border-right:1px solid #262a33;display:flex;flex-direction:column}
  .m-ubl .lib{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px;margin-top:auto;border-top:1px solid #262a33}
  .m-ubl .lib span{height:40px;border-radius:8px;background:#20232a;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10.5px;gap:2px}
  .m-ubl .lib span i{font-style:normal;font-size:13px;color:#f6cd2a}
  .m-ubc{flex:1;display:grid;place-items:center;background:#101216}
  .m-scr{position:relative;width:330px;height:186px;border-radius:6px;background:linear-gradient(160deg,#2b3d6b,#162038);overflow:hidden;box-shadow:0 0 0 1px #3a3f4b}
  .m-scr .ttl{position:absolute;left:0;right:0;top:34px;text-align:center;font:800 22px var(--gdf);color:#fff;letter-spacing:-.02em}
  .m-ubtn{position:absolute;left:105px;top:112px;width:120px;height:34px;border-radius:9px;background:#e9eaee;color:#1a1d24;display:grid;place-items:center;font-weight:700;font-size:12px;box-shadow:0 0 0 2px #4f8dff;transition:background .3s}
  .m-ubtn.yel{background:#f6cd2a;color:#1a1400}
  .m-ubr{width:212px;border-left:1px solid #262a33;padding:6px;font-size:11px}.m-ubr .m-f .fl{width:74px}
  .m-sw{display:flex;gap:5px;margin:4px 0}.m-sw i{width:18px;height:18px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
  .m-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:#2b2f38;color:#e9eaee;font-size:11.5px;z-index:9;box-shadow:0 8px 20px rgba(0,0,0,.5)}`,
 mock:eng({
  tbo:{ub:'data-cls="open=on"'},
  center:`<div class="m-empty big" data-hide="open">툴바의 「UI 화면 만들기」를 누르면<br>UI 빌더 창이 열린다</div>`+pan('UI 빌더',`<div class="m-ubw">
   <div class="m-ubl"><div style="padding:6px">${row('메인 화면',{tw:'▾',col:'#b69cff'})}${row('제목',{d:1,col:'#8b93a3'})}${row('버튼',{d:1,col:'#f6cd2a',a:'data-show="b"',cls:'sel'})}</div>
     <div class="lib"><span><i>T</i>텍스트</span><span data-k="eBtn"><i>▭</i>버튼</span><span><i>▣</i>이미지</span><span><i>☑</i>체크박스</span><span><i>━</i>슬라이더</span><span><i>⌨</i>입력 상자</span></div></div>
   <div class="m-ubc"><div class="m-scr"><div class="ttl">숲속 모험</div><i class="m-drop" data-k="cvSpot" style="left:150px;top:116px"></i>
     <div class="m-ubtn" data-show="b" data-cls="c=yel"><span data-txt="t=게임 시작">버튼</span></div></div></div>
   <div class="m-ubr"><div class="m-empty" data-hide="b" style="padding:30px 4px">요소를 고르면<br>여기서 꾸민다</div><div data-show="b">
     <b style="display:block;margin:2px 0 6px">버튼</b>${fld('글자','버튼','data-k="itx"')}<div class="m-f"><span class="fl">배경</span><span class="m-sw"><i style="background:#e9eaee"></i><i style="background:#f6cd2a" data-k="sw"></i><i style="background:#4f8dff"></i><i style="background:#ea6773"></i></span></div>
     ${fld('둥근 모서리','9')}<div class="m-f"><span class="fl">누르면</span><span class="m-in" data-k="onp" data-txt="oa=「게임 UI」 그룹 열기">동작 없음 ▾</span></div><div data-show="oa">${chk('이 그룹은 닫기','',1)}</div>
     ${menu([['동작 없음'],['UI 그룹 열기 · 게임 UI','oOpen'],['스크립트 메서드 실행']],'data-show="om" data-hide="oa" style="right:6px;top:150px;width:170px"')}</div></div>
  </div>`,{ic:'uib',a:'data-show="open"',head:'<b class="m-b g">미리보기</b><b class="m-b y" data-k="save">저장</b><b class="m-ib">✕</b>'}),
  over:`<div class="m-dlg2" data-show="sv" data-hide="ok"><p><b style="color:#f6cd2a">[마을]</b>의 UI에 저장하시겠습니까?</p>${fld('저장할 씬','마을 ▾')}${fld('그룹 이름','메인 화면')}<div style="text-align:right;margin-top:10px"><b class="m-b">취소</b> <b class="m-b y" data-k="svok">저장</b></div></div><div class="m-toast" data-show="ok">「메인 화면」을 마을의 UI에 저장했다</div>`
 }),
 steps:[
  {t:'빌더 열기',d:'툴바의 「UI 화면 만들기」를 누른다. 가운데가 화면 캔버스, 왼쪽이 계층 구조와 요소 목록, 오른쪽이 인스펙터다.',cap:'툴바의 「UI 화면 만들기」를 누른다',do:[{c:'bub',on:'open'}]},
  {t:'요소 넣기',d:'왼쪽 아래 요소 목록에서 텍스트 · 버튼 · 이미지 같은 요소를 캔버스로 끌어다 놓거나 눌러서 넣는다.',cap:'「버튼」을 캔버스로 끌어다 놓는다',do:[{drag:'eBtn',to:'cvSpot',g:'버튼',on:'b'}]},
  {t:'꾸미기',d:'요소를 고르고 오른쪽 인스펙터에서 글자 · 배경색 · 둥근 모서리를 바꾼다. 캔버스에서 모서리를 끌어 크기도 바꾼다.',cap:'글자를 「게임 시작」으로, 배경을 노랑으로',do:[{type:'itx',v:'게임 시작',on:'t'},{c:'sw',on:'c'}]},
  {t:'누르면 할 일 정하기',d:'버튼 인스펙터의 「누르면」에서 다른 UI 그룹 열기 · 스크립트 메서드 실행 같은 동작을 고른다. 「이 그룹은 닫기」를 켜면 지금 화면이 함께 닫힌다.',cap:'「누르면 › 게임 UI 그룹 열기」',do:[{c:'onp',on:'om'},{c:'oOpen',on:'oa'}]},
  {t:'씬에 저장하기',d:'「저장」을 누르면 어느 씬의 UI에 저장할지 묻는다. 저장한 화면은 그 씬의 UI 그룹이 되어 계층 구조의 UI 아래에 들어간다.',cap:'「저장」 — 마을 씬의 UI 그룹으로 저장된다',do:[{c:'save',on:'sv'},{c:'svok',on:'ok'}]}
 ],
 tips:['「미리보기」로 버튼을 직접 눌러 보고 Esc로 끝낸다.','표시를 「스크립트·버튼으로 열기」로 두면 플레이를 시작할 때는 숨어 있다가 필요할 때 열린다.','패널의 배치를 가로 · 세로로 고르면 안의 요소가 저절로 줄을 맞춘다.','저장한 그룹은 계층 구조에서 고르고 인스펙터의 「UI 빌더로 편집하기」로 다시 연다.','Ctrl+휠로 확대 · 축소, Ctrl+0으로 화면에 맞춘다. Shift+Space는 빌더 전체 화면이다.'],
 ex:[{h:'메인 화면 → 게임 시작',p:'메인 화면의 버튼 「누르면」을 게임 UI 그룹 열기로 두고 「이 그룹은 닫기」를 켠다. 스크립트 없이 화면이 바뀐다.'},
     {h:'코드로 화면 바꾸기',p:'같은 일을 스크립트로도 할 수 있다. 버튼의 「누르면」에서 스크립트 메서드 실행을 고르고 그룹 이름으로 열고 닫는다.',code:'public void OnStart()\n{\n    UIScreen.Show("게임 UI");\n    UIScreen.Hide("메인 화면");\n}'},
     {h:'NPC 대화창',p:'이름 · 대사 텍스트가 든 「대화창」 그룹을 만들어 두고, NPC 스크립트에서 글자를 바꿔 연다.',code:'UIScreen.SetText("대화창", "대사", "어서 오세요!");\nUIScreen.Show("대화창");'}],
 keys:[['Shift+Space','빌더 전체 화면'],['Esc','전체 화면 · 미리보기 끝내기'],['Ctrl+휠','확대 · 축소'],['Ctrl+0','화면에 맞추기'],['Ctrl+1','100%로 보기']]},

/* ========================= 11. 애니메이터 ========================= */
{id:'animator',ic:'animator',title:'애니메이터',hk:['상태','전환'],rm:'lesson-1',
 lead:'서기 · 걷기 · 뛰기의 흐름을 지도처럼 짜기',
 sum:'캐릭터가 서 있다가 걷고 뛰는 <u>애니메이션의 흐름을 지도처럼 짜는 창</u>이다. 네모 하나가 상태(재생할 클립), 화살표가 전환, 왼쪽 파라미터 값이 전환이 일어날 조건이다.',
 rel:['lesson-6','lesson-14'],gl:['anim','script','vs'],
 css:`.m-agw{position:absolute;inset:0;display:flex}.m-prm{width:140px;border-right:1px solid #262a33;padding:6px;position:relative}
  .m-prm .ph{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#8b909a;margin-bottom:4px}
  .m-prm .p{height:24px;display:flex;align-items:center;justify-content:space-between;padding:0 7px;border-radius:6px;background:#20232a;margin-bottom:3px;font-size:11px}
  .m-agc{flex:1;position:relative;background:#14161b radial-gradient(circle,#2a2e37 1px,transparent 1.2px) 0 0/18px 18px}
  .m-st{position:absolute;width:104px;height:34px;border-radius:9px;background:#2b2f38;border:1.5px solid #4a505d;display:grid;place-items:center;font-weight:700;font-size:11.5px;overflow:hidden}
  .m-st.def{background:#7a4a16;border-color:#e8a33d}.m-st.any{background:#1c5452;border-color:#3cb9b2}
  .m-st.run{border-color:#4f8dff;box-shadow:0 0 0 3px rgba(79,141,255,.3)}.m-st.run::after{content:"";position:absolute;left:0;bottom:0;height:3px;width:100%;background:#4f8dff;transform-origin:0 50%;animation:mprog 1.2s linear infinite}
  .m-arr{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}.m-arr path{fill:none;stroke:#c9ced8;stroke-width:2;marker-end:url(#mah)}.m-arr path.on{stroke:#f6cd2a}
  .m-hit{position:absolute;width:26px;height:26px;border-radius:50%}
  .m-agr{width:160px;border-left:1px solid #262a33;padding:8px;font-size:11px}
  .m-hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:5px 11px;border-radius:999px;background:#f6cd2a;color:#1a1400;font-weight:700;font-size:11px;white-space:nowrap}`,
 mock:eng({
  left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('주인공',{d:1,col:'#5cc08a',k:'hHero',a:'data-cls="sel=sel"'})+row('촌장',{d:1,col:'#31c1ec'}),{cls:'w150',ic:'hier'}),
  center:pan('애니메이터',`<div class="m-empty big" data-hide="sel">애니메이터 컴포넌트가 붙은<br>오브젝트를 고른다</div><div class="m-agw" data-show="sel">
    <div class="m-prm"><div class="ph">파라미터<b class="m-ib" data-k="padd">＋</b></div><div class="p">Speed<small>Float · 0</small></div><div class="p" data-show="p">Hop<small>Trigger ○</small></div>
     ${menu([['Float'],['Int'],['Bool'],['Trigger','ptrig']],'data-show="pm" data-hide="p" style="left:60px;top:28px;width:110px"')}</div>
    <div class="m-agc"><svg class="m-arr"><defs><marker id="mah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c9ced8" stroke="none"/></marker></defs>
      <path d="M 116 131 L 186 131"/><path d="M 186 143 L 116 143"/><path data-show="t" data-cls="ts=on" d="M 116 51 L 194 51"/></svg>
      <div class="m-st any" data-k="nAny" style="left:10px;top:34px">Any State</div>
      <div class="m-st def" data-cls="play=run" style="left:10px;top:120px">대기</div>
      <div class="m-st" style="left:190px;top:120px">걷기</div>
      <div class="m-st" data-k="nHop" style="left:198px;top:34px;width:90px">깡충</div>
      <i class="m-hit" data-k="arr" style="left:142px;top:38px"></i>
      <div class="m-hint" data-show="lk" data-hide="t">이을 상태를 클릭하세요 (Esc: 취소)</div>
      ${menu([['전환 만들기','mkT'],['기본 상태로 지정'],'-',['상태 삭제']],'data-show="cm" data-hide="lk" style="left:60px;top:66px;width:140px"')}</div>
    <div class="m-agr"><div class="m-empty" data-hide="ts">상태나 화살표를 누르면<br>여기서 설정한다</div><div data-show="ts"><b>Any State → 깡충</b>
      <div style="margin:8px 0 4px;color:#8b909a">조건</div><div class="m-in" data-show="cc">Hop</div><div class="m-warn" data-hide="cc">조건 없음 · 일어나지 않음</div>
      <b class="m-b" data-k="cadd" style="margin-top:6px">＋ 조건</b></div></div>
  </div>`,{ic:'animator'})
 }),
 steps:[
  {t:'컨트롤러 열기',d:'애니메이터 컴포넌트가 붙은 오브젝트를 고르면 그 컨트롤러가 열린다. 주황색 상태가 플레이를 시작할 때 처음 재생되는 기본 상태다.',cap:'계층 구조에서 「주인공」을 고른다',do:[{c:'hHero',on:'sel'}]},
  {t:'파라미터 만들기',d:'왼쪽 파라미터 목록의 ＋로 Float · Int · Bool · Trigger 값을 만든다. 「지금 한 번!」 같은 신호에는 Trigger가 알맞다.',cap:'＋ › Trigger로 「Hop」 파라미터를 만든다',do:[{c:'padd',on:'pm'},{c:'ptrig',on:'p'}]},
  {t:'전환 잇기',d:'상태를 우클릭해 「전환 만들기」를 누르고 이을 상태를 클릭하면 화살표가 생긴다. Any State에서 나가는 전환은 지금 어느 상태든 일어날 수 있다.',cap:'Any State 우클릭 › 「전환 만들기」 › 깡충',do:[{r:'nAny',on:'cm'},{c:'mkT',on:'lk'},{c:'nHop',on:'t'}]},
  {t:'조건 정하기',d:'화살표를 누르고 오른쪽에서 조건을 더한다. 조건이 없는 전환은 일어나지 않으니 꼭 하나를 정한다. 파라미터가 조건을 만족하는 순간 전환된다.',cap:'화살표를 누르고 조건으로 Hop을 고른다',do:[{c:'arr',on:'ts'},{c:'cadd',on:'cc'}]},
  {t:'플레이로 확인',d:'플레이하면 지금 재생 중인 상태에 파란 테두리와 진행 막대가 생긴다. 파라미터 값도 실시간으로 보이고, 바꾸면 바로 반영된다.',cap:'Ctrl+P — 재생 중인 상태가 파랗게 표시된다',do:[{key:'Ctrl+P',on:'play'}]}
 ],
 tips:['다른 상태를 우클릭해 「기본 상태로 지정」으로 처음 상태를 바꾼다.','Trigger는 전환이 일어나면 저절로 꺼진다. 한 번만 일어나는 동작에 쓴다.','스크립트는 애니메이터의 파라미터만 바꾼다. 어떤 클립을 재생할지는 그래프가 정한다.','편집한 클립은 애니메이션 창에서 바로 미리 볼 수 있다.'],
 ex:[{h:'Space로 깡충',p:'Any State → 깡충 전환의 조건을 Hop(Trigger)으로 정하고, 스크립트에서 신호만 보낸다.',code:'Animator animator = GetComponent<Animator>();\n\nif (Input.GetKeyDown(KeyCode.Space))\n    animator.SetTrigger("Hop");'},
     {h:'걷기와 멈추기',p:'Speed(Float)가 0.1보다 크면 대기 → 걷기, 작으면 걷기 → 대기로 가게 조건을 둔다.',code:'animator.SetFloat("Speed", velocity.magnitude);'},
     {h:'한 번만 재생되는 공격',p:'공격 상태 다음에 조건 없이 「종료 시간」으로 대기로 돌아오는 전환을 두면, 클립이 끝난 뒤 자연스럽게 돌아온다.'}],
 keys:[['우클릭 (상태)','전환 만들기 · 기본 상태로 지정'],['Esc','전환 잇기 취소'],['Delete','상태 · 전환 지우기'],['Ctrl+Z','애니메이터 편집 되돌리기']]},

/* ========================= 12. 애니메이션 ========================= */
{id:'anim',ic:'anim',title:'애니메이션',hk:['◆','키'],rm:'lesson-1',
 lead:'프레임마다 키를 찍어 움직임 클립 만들기',
 sum:'애니메이션 클립 하나를 <u>프레임마다 키를 찍어 편집하는 창</u>이다. 왼쪽은 클립이 바꾸는 속성, 오른쪽 시간 줄의 ◆가 그 시간에 정해 둔 값(키)이다.',
 rel:['lesson-6','lesson-14'],gl:['animator','tl','assets'],
 css:`.m-aw{position:absolute;inset:0;display:flex;flex-direction:column}.m-awt{height:30px;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #262a33}
  .m-awb{flex:1;display:flex;position:relative}.m-awl{width:150px;border-right:1px solid #262a33}.m-awl .r{height:40px;display:flex;align-items:center;padding:0 8px;border-bottom:1px solid #20232a;font-size:11px;gap:6px}
  .m-awr{flex:1;position:relative;background:repeating-linear-gradient(90deg,#1b1e25 0 1px,transparent 1px 24px)}
  
  .m-awr .r{height:40px;position:relative;border-bottom:1px solid #20232a}
  .m-sk{position:absolute;top:4px;width:28px;height:32px;border-radius:4px;background:#2b2f38 url(assets/base/hero.png) 0 66.667%/400% 400%;image-rendering:pixelated}
  .m-phd{position:absolute;top:0;bottom:0;width:2px;background:#ea6773;left:0;transition:left .4s}.m-phd.f6{left:144px}.m-phd.pl{animation:mphd 1.4s linear infinite}
  .m-prev{position:absolute;right:10px;bottom:10px;width:110px;height:80px;border-radius:8px;background:#1d2027;overflow:hidden}
  .m-prev .m-cat{position:absolute;left:39px;top:30px;transform:scale(1.2)}.m-prev .m-cat.hop{animation:mhop 1.4s ease-in-out infinite}`,
 mock:eng({bh:112,
  left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('주인공',{d:1,col:'#5cc08a',cls:'sel'}),{cls:'w150',ic:'hier'}),
  center:pan('애니메이션',`<div class="m-aw"><div class="m-awt"><b class="m-sel" data-k="clip"><span data-txt="nc=Hop">대기</span> ▾</b><b class="m-ib" data-k="aplay" data-cls="pl=on">▶</b><b class="m-ib">◆</b><span style="color:#8b909a;font-size:11px">FPS 12</span><b class="m-b g">☑ 반복</b><b class="m-b g">☐ 부드럽게</b><i class="sp"></i></div>
    ${menu([['대기'],['걷기'],'-',['＋ 새 클립…','newc']],'data-show="cl" data-hide="nc" style="left:8px;top:28px;width:140px"')}
    <div class="m-awb"><div class="m-awl"><div style="height:18px"></div><div class="r">${ico('anim','m-pi')}스프라이트</div><div class="r" data-show="py">위치 Y</div><div class="r" style="border:0"><b class="m-b" data-k="addp">＋ 속성 추가</b></div>
      ${menu([['위치','ppos'],['회전'],['크기'],['켜기 / 끄기']],'data-show="pm" data-hide="py" style="left:96px;top:86px;width:120px"')}</div>
     <div class="m-awr" data-k="tlr"><div class="m-ruler">${Array.from({length:13},(_,i)=>`<span ${i===6?'data-k="f6"':''}>${i}</span>`).join('')}</div>
      <div class="r"><span data-hide="nc">${[0,72,144,216].map((x,i)=>`<i class="m-sk" style="left:${x+1}px;background-position-x:${i*33.333}%"></i>`).join('')}</span><span data-show="sp">${[0,48,96,144].map((x,i)=>`<i class="m-sk" style="left:${x+1}px;background-position:${i*33.333}% 100%"></i>`).join('')}</span></div>
      <div class="r" data-show="py"><i class="m-key" style="left:1px"></i><i class="m-key" data-show="k6" style="left:145px"></i><i class="m-key" style="left:289px"></i></div>
      <i class="m-phd" data-cls="f6=f6;pl=pl"></i></div>
     <div class="m-prev">${cat('data-cls="pl=hop"')}</div></div></div>`,{ic:'anim'}),
  bottom:pan('프로젝트',`<div class="m-ag" style="display:flex;gap:10px;padding:6px 8px"><div class="m-a" data-k="asp"><span class="th" style="background:#23262e url(assets/base/hero.png) 0 100%/400% 400%;image-rendering:pixelated"></span><span>hero_jump (4)</span></div><div class="m-a"><span class="th" style="background:#23262e url(assets/base/hero.png) 0 66.667%/400% 400%"></span><span>hero_walk (4)</span></div></div>`,{ic:'assets'})
 }),
 steps:[
  {t:'클립 고르기 · 새 클립',d:'오브젝트를 고르고 위쪽 클립 칸을 눌러 편집할 클립을 고른다. 「새 클립」을 만들면 애니메이터에도 상태로 함께 추가된다.',cap:'클립 칸 › 「＋ 새 클립…」으로 Hop 클립을 만든다',do:[{c:'clip',on:'cl'},{c:'newc',on:'nc'}]},
  {t:'스프라이트 프레임 넣기',d:'프로젝트 창의 스프라이트(나눈 조각)를 시간 줄로 끌어다 놓으면 프레임이 차례로 들어간다.',cap:'점프 그림 4장을 시간 줄로 끌어다 놓는다',do:[{drag:'asp',to:'tlr',g:'hero_jump × 4',on:'sp'}]},
  {t:'속성 더하기',d:'「＋ 속성 추가」로 위치 · 회전 · 크기 · 켜기/끄기 같은 속성을 더한다. 속성마다 시간 줄이 한 줄씩 생긴다.',cap:'「＋ 속성 추가 › 위치」',do:[{c:'addp',on:'pm'},{c:'ppos',on:'py'}]},
  {t:'키 찍기',d:'시간 줄에서 프레임을 고르고 씬 뷰에서 오브젝트를 옮기거나 값을 바꾸면 그 프레임에 ◆ 키가 생긴다. 키와 키 사이는 저절로 이어진다.',cap:'6프레임을 고르고 위로 올린 자리에 키를 찍는다',do:[{c:'f6',on:'f6'},{wait:300,on:'k6'}]},
  {t:'미리 보기',d:'▶를 누르면 클립을 반복해서 미리 본다. 「부드럽게」를 켜면 키 사이를 천천히 출발해 천천히 멈춘다.',cap:'▶로 깡충 뛰는 동작을 미리 본다',do:[{c:'aplay',on:'pl'},{wait:1200}]}
 ],
 tips:['FPS를 올리면 같은 프레임 수라도 빨리 재생된다.','「반복」을 끄면 마지막 프레임에서 멈춘다. 한 번만 하는 동작에 쓴다.','◆ 단추는 모든 속성에 지금 프레임의 키를 한 번에 넣는다.','편집한 클립은 애니메이터 창의 상태에 연결되어 플레이 때 재생된다.'],
 ex:[{h:'걷기 클립',p:'걷는 그림 4장을 끌어다 놓고 FPS를 8~12로 맞춘다. 반복을 켜 두면 걷는 동안 계속 돈다.'},
     {h:'제자리 깡충',p:'위치 Y 속성을 더하고 0프레임에 0, 6프레임에 위로, 12프레임에 다시 0을 찍는다. 「부드럽게」를 켜면 통통 튀는 느낌이 난다.'},
     {h:'반짝이는 아이템',p:'크기 속성으로 1 → 1.2 → 1 을 반복하면 아이템이 숨 쉬듯 반짝인다.'}],
 keys:[['◆','모든 속성에 키 추가'],['Space','재생 · 멈춤 (창을 고른 상태)'],['Delete','고른 키 지우기'],['Ctrl+Z','애니메이션 편집 되돌리기']]},

/* ========================= 13. 타임라인 ========================= */
{id:'tl',ic:'tl',title:'타임라인',hk:['Space'],rm:'lesson-1',
 lead:'움직임 · 소리 · 대사를 시간 위에 늘어놓는 연출',
 sum:'여러 오브젝트의 움직임 · 켜고 끄기 · 소리 · 스크립트 호출을 <u>한 줄의 시간 위에 늘어놓는 연출 창</u>이다. 컷씬처럼 정해 둔 대로 흘러가는 장면을 만든다.',
 rel:['lesson-14','lesson-6'],gl:['anim','insp','animator'],
 css:`.m-tlw{position:absolute;inset:0;display:flex;flex-direction:column}.m-tlt{height:28px;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #262a33}
  .m-tlb{flex:1;display:flex;position:relative}.m-trh{width:170px;border-right:1px solid #262a33}.m-trh .r{height:34px;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #20232a;font-size:11px}
  .m-trh .r .bd{margin-left:auto;padding:2px 7px;border-radius:6px;background:#20232a;color:#8b909a;font-size:10.5px}.m-trh .r .bd.on{color:#e9eaee;background:#2b3a55}
  .m-trs{flex:1;position:relative;background:repeating-linear-gradient(90deg,#1b1e25 0 1px,transparent 1px 60px)}
  .m-trs .m-ruler span{width:60px;flex:none}.m-trs .r{height:34px;border-bottom:1px solid #20232a;position:relative}
  .m-clip{position:absolute;top:5px;height:24px;border-radius:6px;background:#3b4f7a;border:1px solid #5b74a8;font-size:10.5px;display:flex;align-items:center;padding:0 6px}
  .m-ph2{position:absolute;top:0;bottom:0;left:0;width:2px;background:#ea6773;z-index:2}.m-ph2::before{content:"";position:absolute;left:-5px;top:0;width:12px;height:12px;background:#ea6773;clip-path:polygon(0 0,100% 0,50% 100%)}
  .m-ph2.pl{animation:mph2 2.4s linear infinite}
  .m-b.m-rec{color:#ea6773}.m-b.m-rec.recon{background:#ea6773;color:#fff;border-color:#ea6773}
  .m-trs .m-key{top:11px}
  .k-eld{left:120px;top:160px}.k-eld.pl{animation:meld 2.4s linear infinite}`,
 mock:eng({bh:150,
  left:pan('계층 구조',row('마을 ★',{tw:'▾',col:'#8fd4ec'})+row('컷씬',{d:1,col:'#c9ced8',cls:'sel'})+row('촌장',{d:1,col:'#31c1ec',k:'hEld'})+row('주인공',{d:1,col:'#5cc08a'}),{cls:'w150',ic:'hier'}),
  center:sceneView({tools:tools('obj'),wa:'style="transform:scale(.8)"',world:tiles(TOWN)+spr('m-tree','style="left:40px;top:92px"')+`<i class="m-cat k-eld" data-k="eld" data-cls="pl=pl" style="filter:sepia(1) saturate(3) hue-rotate(-20deg) brightness(1.4)"></i>`}),
  right:pan('인스펙터',`<div class="m-ih"><b>컷씬</b></div>${card('Transform',fld('위치','0 · 0'))}<div data-show="pd">${card('플레이어블 디렉터',fld('타임라인','컷씬 타임라인')+chk('시작할 때 재생','',1))}</div>
    <div class="m-add"><b class="m-b y" data-k="add">컴포넌트 추가</b></div>${menu([['박스 콜라이더 2D'],['오디오 소스'],['플레이어블 디렉터','mPd']],'data-show="m" data-hide="pd" style="left:8px;bottom:36px;width:160px"')}`,{cls:'w180',ic:'insp'}),
  bottom:pan('타임라인',`<div class="m-empty" data-hide="pd" style="padding-top:40px">플레이어블 디렉터가 있는 오브젝트를 고른다</div><div class="m-tlw" data-show="pd">
    <div class="m-tlt"><b class="m-b" data-k="addt">＋ 트랙</b><b class="m-b m-rec" data-k="rec" data-cls="rec=recon">● 녹화</b><b class="m-ib">⏮</b><b class="m-ib" data-cls="pl=on">▶</b><b class="m-b g">◆ 키 남기기</b><i class="sp"></i><small style="color:#8b909a">컷씬 타임라인 · 4초</small></div>
    ${menu([['활성화 트랙'],['애니메이션 트랙','tAni'],['오디오 트랙'],['시그널 트랙']],'data-show="tm" data-hide="ta" style="left:8px;top:26px;width:140px"')}
    <div class="m-tlb"><div class="m-trh"><div style="height:18px"></div><div class="m-empty" data-hide="ta" style="padding:8px">아직 트랙이 없다. 「＋ 트랙」으로 추가한다.</div><div class="r" data-show="ta" data-k="thd">애니메이션 트랙<span class="bd" data-cls="bd=on" data-txt="bd=촌장">(없음)</span></div></div>
     <div class="m-trs"><div class="m-ruler">${[0,1,2,3,4].map(i=>`<span>${i}초</span>`).join('')}</div><div class="r" data-show="ta"><div class="m-clip" data-show="k" style="left:0;width:122px">녹화 클립</div><i class="m-key" data-show="rec" style="left:1px"></i><i class="m-key" data-show="k" style="left:121px"></i></div>
      <i class="m-ph2" data-k="ph" data-cls="pl=pl"></i></div></div></div>`,{ic:'tl'})
 }),
 steps:[
  {t:'디렉터 붙이기',d:'컷씬을 맡을 빈 오브젝트를 고르고 인스펙터 「컴포넌트 추가 › 플레이어블 디렉터」를 누른다. 디렉터(감독)와 타임라인(대본)이 한 번에 만들어진다.',cap:'「컴포넌트 추가 › 플레이어블 디렉터」',do:[{c:'add',on:'m'},{c:'mPd',on:'pd'}]},
  {t:'트랙 더하기',d:'타임라인 창의 「＋ 트랙」에서 활성화 · 애니메이션 · 오디오 · 시그널 트랙을 고른다. 트랙 하나가 한 줄의 할 일이다.',cap:'「＋ 트랙 › 애니메이션 트랙」',do:[{c:'addt',on:'tm'},{c:'tAni',on:'ta'}]},
  {t:'움직일 오브젝트 묶기',d:'계층 구조의 오브젝트를 트랙 머리로 끌어다 놓아 이 트랙이 움직일 대상(바인딩)을 정한다.',cap:'「촌장」을 트랙 머리로 끌어다 놓는다',do:[{drag:'hEld',to:'thd',g:'촌장',on:'bd'}]},
  {t:'녹화로 움직임 만들기',d:'● 녹화를 누르고 재생 위치를 옮긴 뒤 씬 뷰에서 오브젝트를 옮기면 그 시간에 ◆ 키가 생긴다. 키 사이는 부드럽게 이어진다.',cap:'● 녹화 › 2초로 옮기고 › 촌장을 끌어 옮긴다',do:[{c:'rec',on:'rec'},{drag:'ph',mv:[122,0]},{drag:'eld',mv:[240,160],on:'k'}]},
  {t:'재생하고 시작 방법 정하기',d:'Space로 재생해 본다. 디렉터의 「시작할 때 재생」을 끄면 스크립트에서 director.Play()로 원하는 순간에 튼다.',cap:'Space로 재생 — 촌장이 걸어간다',do:[{key:'Space',on:'pl'},{wait:1400}]}
 ],
 tips:['가만히 서 있는 구간은 「◆ 키 남기기」로 지금 상태를 그 시간에 키로 남긴다.','활성화 트랙의 「끝난 뒤 상태」를 켜 두기로 하면 컷씬이 끝나도 오브젝트가 남는다.','시그널 트랙은 정한 시간에 스크립트 메서드를 이름으로 부른다 (예: Greet).','오디오 트랙에는 프로젝트 창의 음악을 끌어다 놓는다.','플레이 중에는 녹화할 수 없다. 멈춘 상태에서 녹화한다.'],
 ex:[{h:'촌장의 마중 컷씬',p:'주인공 · 촌장 애니메이션 트랙, 선물 상자 활성화 트랙, 음악 오디오 트랙, 인사 시그널 트랙을 쌓는다.'},
     {h:'입구에 들어서면 재생',p:'디렉터의 「시작할 때 재생」을 끄고, 입구의 트리거에서 재생한다.',code:'public PlayableDirector director;\nprivate bool played = false;\n\nvoid OnTriggerEnter2D(Collider2D other)\n{\n    if (played) return;\n    played = true;\n    director.Play();\n}'},
     {h:'보스 등장 연출',p:'카메라를 보스 쪽으로 옮기는 키, 경고음 오디오, 체력 바 UI를 켜는 활성화 트랙을 같은 시간에 맞춘다.'}],
 keys:[['Space','재생 · 일시 정지'],['F','모두 보기'],['Ctrl+D','클립 복제'],['Delete','클립 · 키 지우기'],['Alt + 끌기','맞춤 끄고 옮기기']]}
];

const GB={};GUIDES.forEach((g,i)=>{g.no=i+1;GB[g.id]=g});

/* ---------- 본 가이드 기록 (이 브라우저) ---------- */
const SEEN_K='thaniya.guides.seen.v1';
let SEEN={};try{SEEN=JSON.parse(localStorage.getItem(SEEN_K))||{}}catch(e){}
const isSeen=id=>!!SEEN[id];
function markSeen(id){if(SEEN[id])return;SEEN[id]=Date.now();try{localStorage.setItem(SEEN_K,JSON.stringify(SEEN))}catch(e){}}

/* ---------- CSS ---------- */
const CSS=`
.gd,.gd-sc{--gdf:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;--gdm:"D2Coding","JetBrains Mono","Cascadia Mono",Consolas,monospace}
.gd{--gp:#1a1c22;--gp2:#202329;--gb:rgba(255,255,255,.08);--gb2:rgba(255,255,255,.14);--gt:#eceef2;--gm:#9aa0ab;--gy:#f6cd2a;--gyt:#ffdc55;
  font-family:var(--gdf);color:var(--gt);max-width:1080px;margin:0 auto;padding:26px 24px 80px;letter-spacing:-.005em}
html[data-theme="light"] .gd{--gp:#fff;--gp2:#f4f5f7;--gb:rgba(0,0,0,.08);--gb2:rgba(0,0,0,.14);--gt:#15171c;--gm:#5b616d;--gyt:#8a6d00}
.gd *{box-sizing:border-box}
.gd-crumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--gm);margin-bottom:16px}.gd-crumb a{color:inherit;text-decoration:none}.gd-crumb a:hover{color:var(--gt)}
/* 머리 */
.gd-hero{display:flex;align-items:center;gap:16px;margin-bottom:18px}
.gd-ic{width:56px;height:56px;border-radius:16px;flex:none;display:grid;place-items:center;background:linear-gradient(160deg,#ffd84a,#e9b80c);color:#2a1f00;box-shadow:0 10px 24px -8px rgba(246,205,42,.55)}
.gd-ic .gd-i{width:28px;height:28px}
.gd-i{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block}
.gd-hero h1{margin:0;font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1.15}
.gd-sub{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:12.5px;color:var(--gm)}
.gd kbd,.gd-kbd{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:6px;background:var(--gp2);border:1px solid var(--gb2);border-bottom-width:2px;font:700 11.5px var(--gdf);color:var(--gt)}
.gd-lv{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;background:rgba(92,192,138,.14);color:#6fd49a;font-weight:700;font-size:11.5px}
html[data-theme="light"] .gd-lv{color:#1f8a52}
.gd-seen{color:#6fd49a;font-weight:700}
.gd-try{margin-left:auto;height:42px;padding:0 20px;border-radius:12px;border:0;background:var(--gy);color:#1a1400;font:800 14px var(--gdf);display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 8px 20px -8px rgba(246,205,42,.6);white-space:nowrap}
.gd-try:hover{filter:brightness(1.06);transform:translateY(-1px)}
/* 영상 */
.gd-vid{border-radius:20px;background:var(--gp);border:1px solid var(--gb);padding:14px;box-shadow:0 18px 40px -24px rgba(0,0,0,.7)}
.gd-scr{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#0f1115;cursor:pointer;outline:none}
.gd-scr:focus-visible{box-shadow:0 0 0 2px var(--gy)}
.gd-cap{display:flex;align-items:center;gap:10px;min-height:40px;margin:12px 2px 8px;font-size:15px;font-weight:700}
.gd-cn{flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--gy);color:#1a1400;font-size:13px;font-weight:800}
.gd-ctl{display:flex;align-items:center;gap:8px}
.gd-cb{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--gb2);background:var(--gp2);color:var(--gt);display:grid;place-items:center;cursor:pointer;font:700 12px var(--gdf)}
.gd-cb:hover{border-color:var(--gy)}.gd-cb svg{width:15px;height:15px;fill:currentColor}
.gd-cb.sp{width:auto;padding:0 12px;border-radius:10px;margin-left:4px}
.gd-segs{flex:1;display:flex;gap:6px}
.gd-seg{flex:1;height:6px;border:0;padding:0;border-radius:99px;background:var(--gb2);overflow:hidden;cursor:pointer;position:relative}
.gd-seg i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--gy);border-radius:inherit}
.gd-seg:hover{background:rgba(246,205,42,.3)}
/* 이런 기능이에요 */
.gd-what{margin:18px 0 0;padding:18px 20px;border-radius:16px;background:var(--gp);border:1px solid var(--gb)}
.gd-lb{display:block;font-size:12.5px;font-weight:800;color:var(--gyt);margin-bottom:8px}
.gd-what p{margin:0;font-size:17px;line-height:1.75;font-weight:500}
.gd-what u{text-decoration:none;font-weight:800;background:linear-gradient(transparent 62%,rgba(246,205,42,.38) 62%)}
/* 이렇게 써요 · 알아 두면 좋아요 */
.gd-cols{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:16px;margin-top:16px;align-items:start}
.gd-box{padding:18px;border-radius:16px;background:var(--gp);border:1px solid var(--gb)}
.gd-box h2{margin:0 0 12px;font-size:15px;font-weight:800;display:flex;align-items:center;gap:7px}
.gd-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.gd-steps li{display:flex;gap:12px;padding:11px 12px;border-radius:12px;cursor:pointer;transition:background .2s}
.gd-steps li:hover{background:var(--gp2)}
.gd-steps li.on{background:rgba(246,205,42,.09);box-shadow:inset 0 0 0 1px rgba(246,205,42,.22)}
.gd-steps .n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--gp2);border:1px solid var(--gb2);font-size:12.5px;font-weight:800;color:var(--gm);transition:all .2s}
.gd-steps li.on .n{background:var(--gy);border-color:var(--gy);color:#1a1400}
.gd-steps b{display:block;font-size:14.5px;margin-bottom:2px}.gd-steps span{display:block;font-size:13.5px;line-height:1.65;color:var(--gm)}
.gd-tips{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.gd-tips li{position:relative;padding-left:15px;font-size:13.5px;line-height:1.65}
.gd-tips li::before{content:"";position:absolute;left:0;top:.62em;width:6px;height:6px;border-radius:50%;background:var(--gy)}
.gd-box h2 .bulb{color:var(--gy)}
.gd-keys{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
.gd-keys td{padding:6px 0;border-top:1px solid var(--gb);vertical-align:top}.gd-keys td:first-child{width:42%;padding-right:8px;white-space:nowrap}
/* 예시 */
.gd-sec{margin-top:30px}.gd-sec>h2{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.02em}.gd-sec>p{margin:0 0 14px;font-size:13.5px;color:var(--gm)}
.gd-exs{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.gd-ex{padding:16px 18px;border-radius:16px;background:var(--gp);border:1px solid var(--gb);display:flex;flex-direction:column;gap:6px}
.gd-ex h3{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}.gd-ex h3 i{font-style:normal;font-size:11px;font-weight:800;color:#1a1400;background:var(--gy);border-radius:6px;padding:2px 6px}
.gd-ex p{margin:0;font-size:13.5px;line-height:1.65;color:var(--gm)}
.gd-ex pre{margin:6px 0 0;padding:11px 13px;border-radius:10px;background:#0f1115;border:1px solid rgba(255,255,255,.07);font:12.5px/1.6 var(--gdm);color:#dfe3ea;overflow:auto;white-space:pre}
/* 관련 학습 그리드 */
.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.gd-card{display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:var(--gp);border:1px solid var(--gb);color:inherit;text-decoration:none;transition:transform .2s,border-color .2s,box-shadow .2s}
.gd-card:hover,.gd-card:focus-visible{transform:translateY(-3px);border-color:rgba(246,205,42,.5);box-shadow:0 14px 30px -16px rgba(0,0,0,.7);outline:none}
.gd-card .th{position:relative;display:block;aspect-ratio:16/9;background:#14161b center/cover no-repeat;overflow:hidden}
.gd-card .th .mini{position:absolute;inset:0;transform-origin:0 0;pointer-events:none}
.gd-card .th.gd-cgt::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.6))}
.gd-card .gd-cico{position:absolute;left:12px;bottom:12px;z-index:2}.gd-card .gd-cico .gd-ic{width:40px;height:40px;border-radius:12px}.gd-card .gd-cico .gd-i{width:20px;height:20px}
.gd-card .th:not([style]):not(.gd-cgt):not(.gd-cst){background:radial-gradient(120% 120% at 80% 0%,#2b3350,#151820 60%)}
.gd-card .th.gd-cgt{background:radial-gradient(120% 120% at 20% 0%,#3a3214,#1a1810 60%,#121212)}
.gd-card .th.gd-cst{background:radial-gradient(120% 90% at 20% 0%,#24304a 0,#141822 55%,#0e1016 100%);font:600 11px/1.6 var(--gdm);color:#9fb0cc;white-space:pre;padding:34px 14px 14px}
.gd-card .th .gd-cno{position:absolute;inset:0;display:grid;place-items:center;font:800 34px var(--gdf);color:rgba(255,255,255,.14)}
.gd-card .gd-ctg{position:absolute;z-index:3;white-space:nowrap;left:10px;top:10px;padding:3px 9px;border-radius:999px;background:rgba(11,11,14,.72);color:#fff;font-size:11px;font-weight:700}
.gd-card .gd-ctg.g{background:var(--gy);color:#1a1400}
.gd-card .gd-cbd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;flex:1}
.gd-card b{font-size:14.5px;line-height:1.35}.gd-card .gd-cds{font-size:12.5px;line-height:1.55;color:var(--gm);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gd-card .gd-cft{margin-top:auto;padding-top:6px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--gm)}
.gd-card .gd-cft .gd-cok{color:#6fd49a;font-weight:700}
.gd-card .gd-cft .gd-cgo{margin-left:auto;color:var(--gyt);font-weight:800}
/* 이전 · 다음 */
.gd-nav{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px}
.gd-nv{display:flex;flex-direction:column;gap:3px;padding:14px 18px;border-radius:14px;background:var(--gp);border:1px solid var(--gb);color:inherit;text-decoration:none}
.gd-nv:hover{border-color:rgba(246,205,42,.5)}.gd-nv small{color:var(--gm);font-size:12px}.gd-nv b{font-size:15px}.gd-nv.nx{text-align:right;grid-column:2}
/* 목록 페이지 */
.gd-lh{display:flex;align-items:flex-end;gap:18px;margin-bottom:18px}
.gd-lh h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.03em}.gd-lh p{margin:6px 0 0;font-size:14px;color:var(--gm);line-height:1.6}
.gd-lh .cnt{margin-left:auto;font-size:13px;color:var(--gm);white-space:nowrap}
.gd-flt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.gd-fb{height:32px;padding:0 14px;border-radius:999px;border:1px solid var(--gb2);background:var(--gp);color:var(--gt);font:600 13px var(--gdf);cursor:pointer}
.gd-fb[aria-pressed="true"]{background:var(--gy);border-color:var(--gy);color:#1a1400}
.gd-lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.gd-lc .th{aspect-ratio:16/9}.gd-lc .gd-keysm{display:flex;gap:4px;flex-wrap:wrap}.gd-lc .gd-keysm kbd{height:19px;min-width:19px;font-size:10.5px}
@media (max-width:820px){.gd-cols{grid-template-columns:1fr}.gd-hero{flex-wrap:wrap}.gd-try{margin-left:0}.gd-what p{font-size:15.5px}}
@media (max-width:560px){.gd{padding:18px 14px 60px}.gd-vid{padding:10px;border-radius:16px}.gd-cap{font-size:13.5px}.gd-nav{grid-template-columns:1fr}.gd-nv.nx{grid-column:1}}

/* ===== 영상 화면 (800 × 450 고정 · 크기에 맞춰 축소) ===== */
.gd-sc{position:absolute;left:0;top:0;width:${DW}px;height:${DH}px;transform-origin:0 0;background:#0f1115;color:#e3e6ec;font:12px/1.35 var(--gdf);overflow:hidden;user-select:none;text-align:left;letter-spacing:0}
.gd-sc *{box-sizing:border-box}.gd-sc [hidden]{display:none!important}
.gd-sc .sp{flex:1}
.gd-mk{position:absolute;inset:0}
.m-app{position:absolute;inset:0;display:flex;flex-direction:column;background:#0f1115}
.m-tb{height:36px;flex:none;display:flex;align-items:center;gap:6px;padding:0 8px;background:#16181e;border-bottom:1px solid #262a33}
.m-seg{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:#0f1115;border:1px solid #262a33}
.m-b{height:24px;padding:0 9px;border-radius:7px;background:#23272f;border:1px solid #30353f;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#d7dae0;white-space:nowrap;transition:background .2s,color .2s}
.m-b.g{background:none;border-color:transparent;color:#aeb3bd}
.m-b.y,.m-b.on{background:#f6cd2a!important;color:#1a1400!important;border-color:#f6cd2a!important}
.m-b.stop{background:#ea6773!important;border-color:#ea6773!important;color:#fff!important}
.m-play{padding:0 16px;height:26px;border-radius:9px}
.m-ib{width:24px;height:24px;border-radius:7px;display:inline-grid;place-items:center;background:#23272f;border:1px solid #30353f;font-size:11px;font-weight:700;color:#cfd3da;flex:none}
.m-ib.on{background:#f6cd2a;color:#1a1400;border-color:#f6cd2a}
.m-sel{height:24px;padding:0 9px;border-radius:7px;background:#0f1115;border:1px solid #30353f;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;white-space:nowrap}
.m-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:6px}
.m-row{flex:1;min-height:0;display:flex;gap:6px}
.m-ctr{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
.m-bot{flex:none;display:flex}.m-bot>.m-pan{flex:1}
.m-pan{flex:1;background:#181a20;border:1px solid #262a33;border-radius:10px;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0;position:relative}
.m-pan.w150{flex:none;width:150px}.m-pan.w150 .m-lrn{display:none}.m-pan.w180{flex:none;width:180px}.m-pan.w250{flex:none;width:250px}.m-pan.w260{flex:none;width:260px}.m-pan.w380{flex:none;width:380px}
.m-pan.hot{box-shadow:inset 0 0 0 1.5px rgba(246,205,42,.6)}
.m-ph{height:28px;flex:none;display:flex;align-items:center;gap:6px;padding:0 7px;border-bottom:1px solid #262a33;font-weight:700;font-size:11px}
.m-ph .t{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;background:rgba(246,205,42,.16);color:#f6cd2a;white-space:nowrap}
.m-ph .t:empty{display:none}
.m-pi{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.m-lrn{white-space:nowrap;display:inline-flex;align-items:center;gap:3px;color:#8b909a;font-size:10.5px;font-weight:600}.m-dots{color:#8b909a}
.m-pb{flex:1;min-height:0;position:relative;padding:4px;overflow:hidden}
.m-ptool{display:flex;align-items:center;gap:5px;padding:2px 2px 6px}
.m-srch{height:22px;flex:1;border-radius:6px;background:#0f1115;border:1px solid #2b2f38;padding:0 7px;display:inline-flex;align-items:center;color:#6b717c;font-size:11px;gap:4px;min-width:60px}
.m-srch.w{flex:0 1 150px;color:#e3e6ec}.m-srch .x{margin-left:auto;color:#8b909a;font-size:10px;padding:0 3px}
.m-it{height:22px;display:flex;align-items:center;gap:5px;padding-right:6px;border-radius:6px;font-size:11.5px;white-space:nowrap;transition:background .2s}
.m-it .tw{width:10px;flex:none;color:#8b909a;font-size:9px;text-align:center}
.m-it .lb{overflow:hidden;text-overflow:ellipsis}.m-it .n{margin-left:auto;color:#6b717c;font-size:10px}
.m-it.sel{background:#f6cd2a;color:#1a1400;font-weight:700}.m-it.sel .tw,.m-it.sel .n{color:#1a1400}
.m-it.nosel{background:none;color:inherit;font-weight:400}
.m-dot{width:9px;height:9px;border-radius:3px;flex:none}
.m-vt{display:inline-flex;gap:2px}.m-vt b{white-space:nowrap;height:22px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;font-size:11px;color:#aeb3bd}.m-vt b.on{background:rgba(246,205,42,.16);color:#f6cd2a}
.m-zm{font-size:10.5px;color:#aeb3bd;white-space:nowrap}
.m-scene>.m-pb{padding:0}
.m-cv{position:absolute;inset:0;background:#1c1f26;overflow:hidden}
.m-wrap{position:absolute;inset:0;display:grid;place-items:center}
.m-world{position:relative}
.m-grid{display:grid}
.m-tl{position:relative;display:block;background:url(assets/base/grass.png) 0 0/300% 100%;image-rendering:pixelated;transition:filter .2s}
.m-tl.g2{background-position:50% 0}.m-tl.g3{background-position:100% 0}
.m-tl.d{background:url(assets/base/dirt.png) 0 0/200% 100%}.m-tl.sa{background:url(assets/base/sand.png) 0 0/100% 100%}
.m-tl.w{background:url(assets/base/water.png) 0 0/200% 100%;animation:mwater 1.2s steps(1) infinite}
.m-tl.s{background:url(assets/base/stone_wall.png) 0 0/100% 100%;animation:none}
.m-tl.c::after{content:"";position:absolute;inset:0;background:rgba(235,60,80,.5);box-shadow:inset 0 0 0 1px rgba(255,130,130,.85)}
.m-tl.paint{animation:mpaint .35s ease-out}
.m-spr{position:absolute;display:block;width:40px;height:40px;background:center/100% 100% no-repeat;image-rendering:pixelated;transition:left .5s,top .5s}
.m-chest{background-image:url(assets/base/chest.png)}.m-tree{background-image:url(assets/base/tree.png);width:40px;height:60px}
.m-spr.sm,.m-chest.sm{position:relative;width:22px;height:22px;display:inline-block}
.m-spr.sel{outline:2px solid #f6cd2a;outline-offset:1px}
.m-spr .gz{position:absolute;left:50%;top:50%;width:0;height:0}
.m-spr .gz::before{content:"";position:absolute;left:0;top:-1.5px;width:44px;height:3px;background:#ea6773;box-shadow:40px 0 0 0 transparent}
.m-spr .gz::after{content:"";position:absolute;left:-1.5px;top:-44px;width:3px;height:44px;background:#5cc08a}
.m-cat{position:absolute;display:block;width:40px;height:40px;background:url(assets/base/hero.png) 0 0/400% 400%;image-rendering:pixelated}
.m-cat.idle{animation:mcatI .8s steps(4) infinite}
.m-cat.walk{background-position-y:66.667%;animation:mcatW .5s steps(4) infinite}
.m-drop{position:absolute;width:40px;height:40px;pointer-events:none}
.m-tools{position:absolute;left:8px;top:8px;z-index:3;display:flex;flex-direction:column;gap:2px;padding:3px;border-radius:10px;background:rgba(22,24,30,.92);border:1px solid #2b2f38}
.m-tools>span{display:flex;flex-direction:column;gap:2px}
.m-tool{position:relative;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font-size:12px;color:#cfd3da}
.m-tool small{position:absolute;right:1px;bottom:0;font-size:7.5px;color:#6b717c}
.m-tool.on{background:#f6cd2a;color:#1a1400}.m-tool.on small{color:#5a4a00}
.m-pop,.m-menu,.m-dlg2{position:absolute;z-index:6;border-radius:11px;background:#22252d;border:1px solid #3a3f4b;box-shadow:0 14px 34px rgba(0,0,0,.55);padding:5px}
.m-poph{font-weight:700;padding:4px 6px 6px}.m-pop .m-f .fl{width:auto;flex:1}.m-pop .m-f{padding:0 6px}
.m-mi{height:26px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 9px;border-radius:7px;font-size:11.5px;white-space:nowrap}
.m-mi small{color:#8b909a;font-size:10px}.m-menu hr{border:0;border-top:1px solid #3a3f4b;margin:3px 2px}
.m-dlg2{left:250px;top:150px;width:300px;padding:14px}.m-dlg2 p{margin:0 0 10px;font-size:12.5px}
.m-f{display:flex;align-items:center;gap:6px;min-height:24px;font-size:11px}
.m-f .fl{width:62px;flex:none;color:#9aa0ab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-in{flex:1;min-width:0;height:22px;border-radius:6px;background:#0f1115;border:1px solid #2b2f38;padding:0 7px;display:flex;align-items:center;font-size:11px;white-space:nowrap;overflow:hidden}
.m-ck{width:15px;height:15px;border-radius:4px;border:1.5px solid #4a505d;display:inline-grid;place-items:center;flex:none;transition:background .2s}
.m-ck.on{background:#f6cd2a;border-color:#f6cd2a}.m-ck.on::after{content:"✓";color:#1a1400;font-size:10px;font-weight:900;line-height:1}
.m-empty{padding:26px 10px;text-align:center;color:#7d838e;font-size:11.5px;line-height:1.6}
.m-empty.big{position:absolute;inset:0;display:grid;place-items:center;padding:0;font-size:13px;border:1.5px dashed #2b2f38;border-radius:10px}
.m-ih{display:flex;align-items:center;gap:7px;padding:4px 4px 8px;font-size:13px}
.m-tag{font-size:10px;color:#8b909a;border:1px solid #2b2f38;border-radius:6px;padding:1px 6px}
.m-card{border-radius:9px;background:#1f2228;border:1px solid #2b2f38;margin-bottom:5px;overflow:hidden}
.m-ch{height:24px;display:flex;align-items:center;gap:5px;padding:0 7px;font-size:11px;background:#23262e}.m-ch .cv{font-size:9px;color:#8b909a}.m-ch .m-ck{width:12px;height:12px}.m-ch .m-ck.on::after{font-size:8px}.m-ch .q{width:13px;height:13px;border-radius:50%;border:1px solid #4a505d;font-size:8px;display:grid;place-items:center;color:#8b909a}
.m-ch small{font-weight:400;color:#8b909a}
.m-cb{padding:5px 7px;display:flex;flex-direction:column;gap:3px}
.m-add{display:flex;gap:4px;padding:4px 0}.m-add .m-b{flex:1;justify-content:center}
.m-warn{font-size:10.5px;color:#e8a33d}
.m-cf{height:22px;padding:0 8px;border-radius:999px;border:1px solid #30353f;display:inline-flex;align-items:center;gap:5px;font-size:10.5px;transition:opacity .2s}.m-cf.off{opacity:.35}
.m-cf .d,.m-log i{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block}
.d.info,.m-log.info i{background:#c9ced8}.d.warn,.m-log.warn i{background:#e8a33d}.d.err,.m-log.err i{background:#ea6773}
.m-logs{display:flex;flex-direction:column;gap:3px}
.m-log{min-height:26px;display:flex;align-items:center;gap:8px;padding:3px 8px;border-radius:7px;background:#1f2228;font:11px/1.4 var(--gdm)}
.m-log.warn{background:rgba(232,163,61,.09);color:#f2c47e}.m-log.err{background:rgba(234,103,115,.1);color:#f3a1a9}
.m-log.open{box-shadow:inset 0 0 0 1px rgba(234,103,115,.5)}.m-log b{margin-left:auto;font-size:10px;padding:0 6px;border-radius:99px;background:#2b2f38}
.m-tabs{display:flex;gap:2px;padding:0 0 4px}.m-tabs b{padding:3px 10px;border-radius:7px 7px 0 0;font-size:11px;color:#8b909a;background:#15171c}.m-tabs b.on{color:#e3e6ec;background:#0f1115}
.m-code{background:#0f1115;border-radius:7px;padding:5px 0;font:11.5px/1.75 var(--gdm);color:#dfe3ea;overflow:hidden;height:calc(100% - 26px)}
.m-cl{display:flex;white-space:pre;transition:background .3s}.m-cl i{width:28px;flex:none;text-align:right;padding-right:10px;color:#4b515c;font-style:normal}
.m-code .kw{color:#c792ea}.m-code .ty{color:#82aaff}.m-code .st{color:#c3e88d}.m-code .cm{color:#6b7a99}
.m-coin{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff2a8,#f6cd2a 55%,#c99a06);display:inline-block}
.m-ag{display:flex;flex-wrap:wrap;gap:8px;padding:6px 8px;align-content:flex-start}
.m-a{width:64px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;color:#c9ced8;padding:4px 2px;border-radius:7px}
.m-a .th{width:46px;height:46px;border-radius:7px;background:#23262e center/70% no-repeat;image-rendering:pixelated;display:grid;place-items:center;font-size:20px;position:relative}
.m-a.pf .th{box-shadow:0 0 0 2px #4f8dff}.m-a.pf span{color:#7fb0ff}
.m-a .th b{position:absolute;right:-4px;top:-4px;min-width:16px;height:16px;border-radius:8px;background:#f6cd2a;color:#1a1400;font:700 10px/16px var(--gdf);text-align:center}
.m-ruler{height:18px;display:flex;font:10px var(--gdm);color:#8b909a;border-bottom:1px solid #262a33}.m-ruler span{flex:none;width:24px;padding-left:2px}
.m-key{position:absolute;top:14px;width:12px;height:12px;background:#f6cd2a;transform:rotate(45deg);margin-left:-6px}
.m-fold{width:34px;height:26px;border-radius:4px 4px 5px 5px;background:linear-gradient(#f6cd2a,#e0b40d);position:relative;display:block}.m-fold::before{content:"";position:absolute;left:0;top:-5px;width:14px;height:7px;border-radius:3px 3px 0 0;background:#e0b40d}
.m-split{display:flex;height:calc(100% - 30px)}.m-ptree{width:140px;border-right:1px solid #262a33;padding-right:4px}
.m-sl{width:60px;height:4px;border-radius:9px;background:#2b2f38;position:relative}.m-sl i{position:absolute;left:30%;top:-4px;width:12px;height:12px;border-radius:50%;background:#f6cd2a}
.m-lock{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);padding:4px 12px;border-radius:999px;background:rgba(234,103,115,.18);color:#f3a1a9;font-size:11px;font-weight:700;z-index:4}
.m-pinfo{display:flex;flex-direction:column;gap:6px;font-size:11px;color:#9aa0ab}.m-pinfo b{color:#e3e6ec}
.m-isc{position:relative;height:100%}
.m-scroll{overflow:hidden}
.m-new{animation:mnew .42s cubic-bezier(.2,.8,.2,1)}
.m-menu.m-new,.m-pop.m-new,.m-dlg2.m-new{animation:mpop .22s ease-out}
/* 커서 · 효과 */
.gd-cur{position:absolute;left:0;top:0;width:22px;height:22px;z-index:40;pointer-events:none;transition:transform .08s;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.gd-cur.dn svg{transform:scale(.84)}.gd-cur svg{transform-origin:3px 2px;transition:transform .08s}
.gd-rip{position:absolute;z-index:39;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2.5px solid #f6cd2a;pointer-events:none;animation:mrip .5s ease-out forwards}
.gd-rip.r{border-color:#8fd4ec}
.gd-rtag{position:absolute;z-index:41;padding:2px 7px;border-radius:6px;background:#8fd4ec;color:#0b2530;font-size:10px;font-weight:800;pointer-events:none;animation:mfade .9s ease-out forwards}
.gd-ghost{position:absolute;z-index:38;padding:4px 10px;border-radius:8px;background:rgba(246,205,42,.92);color:#1a1400;font-size:11px;font-weight:800;pointer-events:none;box-shadow:0 8px 18px rgba(0,0,0,.4);white-space:nowrap}
.gd-hot{box-shadow:0 0 0 2px #f6cd2a,0 0 0 6px rgba(246,205,42,.22)!important;border-radius:7px;position:relative;z-index:5}
.gd-typing::after{content:"";display:inline-block;width:1.5px;height:1.05em;margin-left:1px;background:#f6cd2a;vertical-align:-2px;animation:mblink .8s steps(1) infinite}
.gd-kc{position:absolute;left:50%;bottom:16px;z-index:42;transform:translateX(-50%);display:flex;gap:6px;align-items:center;padding:8px 12px;border-radius:14px;background:rgba(15,17,21,.88);border:1px solid #3a3f4b;box-shadow:0 12px 30px rgba(0,0,0,.5);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}
.gd-kc.on{opacity:1;transform:translateX(-50%) translateY(-4px)}
.gd-kc kbd{min-width:30px;height:30px;padding:0 9px;border-radius:8px;background:#2b2f38;border:1px solid #4a505d;border-bottom-width:3px;display:inline-grid;place-items:center;font:800 13px var(--gdf);color:#fff}
.gd-kc.on.dn kbd{border-bottom-width:1px;transform:translateY(2px);background:#f6cd2a;color:#1a1400;border-color:#e0b40d}
.gd-kc span{color:#8b909a;font-weight:800}
.gd-end{position:absolute;inset:0;z-index:45;display:grid;place-items:center;background:rgba(10,11,14,.55);opacity:0;pointer-events:none;transition:opacity .3s}
.gd-end.on{opacity:1}.gd-end b{padding:10px 18px;border-radius:999px;background:#f6cd2a;color:#1a1400;font:800 14px var(--gdf)}
.gd-big{position:absolute;inset:0;z-index:44;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .2s}
.gd-big.on{opacity:1}.gd-big i{width:74px;height:74px;border-radius:50%;background:rgba(15,17,21,.72);display:grid;place-items:center}.gd-big svg{width:28px;height:28px;fill:#fff}
@keyframes mrip{to{width:46px;height:46px;margin:-23px 0 0 -23px;opacity:0}}
@keyframes mfade{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
@keyframes mnew{from{opacity:0;transform:translateY(5px) scale(.97)}}
@keyframes mpop{from{opacity:0;transform:scale(.96)}}
@keyframes mblink{50%{opacity:0}}
@keyframes mwater{50%{background-position:100% 0}}
@keyframes mpaint{from{filter:brightness(1.8)}}
@keyframes mcatI{to{background-position-x:133.333%}}
@keyframes mcatW{to{background-position-x:133.333%}}
@keyframes mdash{to{stroke-dashoffset:-14}}
@keyframes mprog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes mphd{from{left:0}to{left:288px}}
@keyframes mph2{from{left:0}to{left:240px}}
@keyframes mhop{0%,100%{transform:scale(1.2) translateY(0)}50%{transform:scale(1.2) translateY(-22px)}}
@keyframes meld{from{left:120px}50%{left:240px}to{left:240px}}
`;
function injectCss(){
  if(document.getElementById('gdCss'))return;
  const s=document.createElement('style');s.id='gdCss';
  s.textContent=CSS+GUIDES.map(g=>g.css?g.css.replace(/(^|\})\s*([^{}@][^{}]*)\{/g,(m,a,sel)=>a+sel.split(',').map(x=>`.gd-sc[data-g="${g.id}"] ${x.trim()}`).join(',')+'{'):'').join('\n');
  document.head.appendChild(s);
}

/* ---------- 영상 재생기 ---------- */
const CUR_SVG='<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2l14 9.2-6.3 1.1 3.6 6.6-2.6 1.4-3.6-6.6L3.5 18z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const MV=650;
function evalX(S,expr){return expr.split('|').some(p=>p.trim().split(/\s+/).filter(Boolean).every(t=>t[0]==='!'?!S.has(t.slice(1)):S.has(t)))}
function pairs(s){return String(s).split(';').map(p=>{const i=p.indexOf('=');return i<0?null:[p.slice(0,i).trim(),p.slice(i+1)]}).filter(Boolean)}

function Player(root,G,onStep){
  const scr=root.querySelector('.gd-scr'),cap=root.querySelector('.gd-cap'),segs=[...root.querySelectorAll('.gd-seg i')],
        bPlay=root.querySelector('[data-gv="play"]'),bSpd=root.querySelector('[data-gv="spd"]');
  const sc=document.createElement('div');sc.className='gd-sc';sc.dataset.g=G.id;scr.appendChild(sc);
  const mk=document.createElement('div');mk.className='gd-mk';sc.appendChild(mk);
  const cur=document.createElement('div');cur.className='gd-cur';cur.innerHTML=CUR_SVG;sc.appendChild(cur);
  const kc=document.createElement('div');kc.className='gd-kc';sc.appendChild(kc);
  const end=document.createElement('div');end.className='gd-end';end.innerHTML=`<b>↻ ${X(TT('처음부터 다시'))}</b>`;sc.appendChild(end);
  const big=document.createElement('div');big.className='gd-big';sc.appendChild(big);
  const steps=G.steps;let S=new Set(),i=0,t=0,ops=[],playing=false,spd=1,raf=0,last=0,cx=640,cy=400,k=1,dead=false,userPaused=false,endT=-1;
  const q=key=>mk.querySelector(`[data-k="${key}"]`);
  const qa=key=>[...mk.querySelectorAll(`[data-k="${key}"]`)].sort((a,b)=>(+a.dataset.p||0)-(+b.dataset.p||0));
  function fit(){const w=scr.clientWidth;if(!w)return;k=w/DW;sc.style.transform=`scale(${k})`}
  const ro=window.ResizeObserver?new ResizeObserver(fit):null;if(ro)ro.observe(scr);fit();
  function ctr(el){if(!el)return[cx,cy];const r=el.getBoundingClientRect(),b=sc.getBoundingClientRect(),kk=b.width/DW||k||1;return[(r.left-b.left+r.width/2)/kk,(r.top-b.top+r.height/2)/kk]}
  function setCur(x,y){cx=x;cy=y;cur.style.transform=`translate(${x-3}px,${y-2}px)`}
  function apply(anim){
    mk.querySelectorAll('[data-show],[data-hide]').forEach(el=>{
      const sh=el.dataset.show,hd=el.dataset.hide,vis=(!sh||evalX(S,sh))&&(!hd||!evalX(S,hd));
      if(el.hasAttribute('hidden')===vis){if(vis)el.removeAttribute('hidden');else el.setAttribute('hidden','');if(vis&&anim){el.classList.remove('m-new');void el.offsetWidth;el.classList.add('m-new')}}
    });
    mk.querySelectorAll('[data-cls]').forEach(el=>pairs(el.dataset.cls).forEach(([e,c])=>{const on=evalX(S,e);c.trim().split(/\s+/).forEach(x=>el.classList.toggle(x,on))}));
    mk.querySelectorAll('[data-txt]').forEach(el=>{if(el._t0==null)el._t0=el.textContent;let v=el._t0;pairs(el.dataset.txt).forEach(([e,s])=>{if(evalX(S,e))v=s});if(el.textContent!==v)el.textContent=v});
  }
  function on(o,anim){let ch=false;String(o.on||'').split(/\s+/).filter(Boolean).forEach(s=>{if(!S.has(s)){S.add(s);ch=true}});if(ch)apply(anim)}
  function rip(x,y,r){const d=document.createElement('i');d.className='gd-rip'+(r?' r':'');d.style.left=x+'px';d.style.top=y+'px';sc.appendChild(d);setTimeout(()=>d.remove(),520);
    if(r){const g=document.createElement('span');g.className='gd-rtag';g.textContent=TT('우클릭');g.style.left=(x+14)+'px';g.style.top=(y+8)+'px';sc.appendChild(g);setTimeout(()=>g.remove(),950)}}
  function press(){cur.classList.add('dn');setTimeout(()=>cur.classList.remove('dn'),140)}
  let hotEl=null;function hot(el){if(hotEl&&hotEl!==el)hotEl.classList.remove('gd-hot');hotEl=el;if(el)el.classList.add('gd-hot')}
  /* 동작 하나 = {dur, run(e), end(), ff()} */
  function mkOp(o){
    let st=0,from,to,el,fx=false;const doFx=a=>{if(fx)return;fx=true;on(o,a)};
    const mvTo=(e,dst)=>{const p=ease(Math.min(1,e/MV));setCur(from[0]+(dst[0]-from[0])*p,from[1]+(dst[1]-from[1])*p)};
    if(o.c||o.d||o.r||o.m){const kk=o.c||o.d||o.r||o.m,kind=o.c?'c':o.d?'d':o.r?'r':'m',aft=kind==='d'?700:kind==='m'?300:480;
      return{dur:MV+aft,
        run(e){if(!st){st=1;el=q(kk);from=[cx,cy];to=ctr(el)}
          if(e<MV){mvTo(e,to);return}
          if(st<2){st=2;setCur(...to);hot(el);if(kind!=='m'){press();rip(...to,kind==='r')}if(kind==='c'||kind==='r'||kind==='m')doFx(true)}
          if(kind==='d'&&st<3&&e>MV+240){st=3;press();rip(...to);doFx(true)}},
        end(){if(to)setCur(...to);hot(null);doFx(true)},
        ff(){const t2=ctr(q(kk));setCur(...t2);on(o,false)}};
    }
    if(o.drag){let a,b,gh,el0,dx=0,dy=0;
      return{dur:MV+200+1050+300,
        run(e){if(!st){st=1;el0=q(o.drag);from=[cx,cy];a=ctr(el0)}
          if(e<MV){mvTo(e,a);return}
          if(st<2){st=2;setCur(...a);hot(el0);press();
            if(o.mv){const L=parseFloat(el0.style.left||getComputedStyle(el0).left)||0,T=parseFloat(el0.style.top||getComputedStyle(el0).top)||0;dx=o.mv[0]-L;dy=o.mv[1]-T;b=[a[0]+dx*(k?1:1),a[1]+dy];
              /* 세계가 확대돼 있으면 화면 거리도 그만큼 */const r0=el0.getBoundingClientRect(),sk=(r0.width/(el0.offsetWidth||1))/(k||1);b=[a[0]+dx*sk,a[1]+dy*sk];el0._sk=sk}
            else b=ctr(q(o.to));
            if(o.g){gh=document.createElement('div');gh.className='gd-ghost';gh.textContent=o.g;sc.appendChild(gh)}}
          if(e<MV+200)return;
          const p=ease(Math.min(1,(e-MV-200)/1050)),x=a[0]+(b[0]-a[0])*p,y=a[1]+(b[1]-a[1])*p;setCur(x,y);
          if(gh){gh.style.left=(x+12)+'px';gh.style.top=(y+10)+'px'}
          if(o.mv&&el0){const sk=el0._sk||1;el0.style.transform=`translate(${(x-a[0])/sk}px,${(y-a[1])/sk}px)`;el0.style.transition='none'}
          if(st<3&&p>=1){st=3;press();if(!o.mv){const tg=q(o.to);hot(tg)}}},
        end(){if(gh)gh.remove();if(o.mv&&el0){el0.style.transform='';el0.style.left=o.mv[0]+'px';el0.style.top=o.mv[1]+'px';requestAnimationFrame(()=>{el0.style.transition=''})}if(b)setCur(...b);hot(null);doFx(true)},
        ff(){const e0=q(o.drag);if(o.mv&&e0){e0.style.left=o.mv[0]+'px';e0.style.top=o.mv[1]+'px';setCur(...ctr(e0))}else setCur(...ctr(q(o.to)));on(o,false)}};
    }
    if(o.type!=null){const v=String(o.v||'');let n=-1;
      return{dur:MV+260+v.length*85+380,
        run(e){if(!st){st=1;el=q(o.type);from=[cx,cy];to=ctr(el)}
          if(e<MV){mvTo(e,to);return}
          if(st<2){st=2;setCur(...to);press();rip(...to);hot(el);if(el)el.classList.add('gd-typing')}
          const m=Math.max(0,Math.min(v.length,Math.floor((e-MV-260)/85)+1));if(e>MV+260&&m!==n&&el){n=m;el.textContent=v.slice(0,m)}},
        end(){if(el){el.textContent=v;el.classList.remove('gd-typing')}hot(null);doFx(true)},
        ff(){const e0=q(o.type);if(e0)e0.textContent=v;on(o,false)}};
    }
    if(o.paint){let L,pts,done=0;const per=240;
      return{get dur(){return MV+150+(L?L.length:6)*per+300},
        run(e){if(!st){st=1;L=qa(o.paint);pts=L.map(ctr);from=[cx,cy];this._d=MV+150+L.length*per+300}
          if(!L.length)return;
          if(e<MV){mvTo(e,pts[0]);return}
          if(st<2){st=2;press();rip(...pts[0])}
          const f=Math.max(0,(e-MV-150)/per),j=Math.min(L.length-1,Math.floor(f)),fr=Math.min(1,f-j);
          const A=pts[j],B=pts[Math.min(L.length-1,j+1)];setCur(A[0]+(B[0]-A[0])*fr,A[1]+(B[1]-A[1])*fr);
          while(done<=j&&done<L.length){L[done].classList.add(o.cls,'paint');done++}},
        end(){(L||qa(o.paint)).forEach(x=>x.classList.add(o.cls));doFx(true)},
        ff(){const L2=qa(o.paint);L2.forEach(x=>x.classList.add(o.cls));if(L2.length)setCur(...ctr(L2[L2.length-1]));on(o,false)}};
    }
    if(o.key){const ks=String(o.key).split('+');
      return{dur:1250,
        run(e){if(!st){st=1;kc.innerHTML=ks.map(x=>`<kbd>${X(x)}</kbd>`).join('<span>+</span>');kc.classList.add('on')}
          if(st<2&&e>420){st=2;kc.classList.add('dn');doFx(true)}
          if(st<3&&e>700){st=3;kc.classList.remove('dn')}
          if(st<4&&e>1050){st=4;kc.classList.remove('on')}},
        end(){kc.classList.remove('on','dn');doFx(true)},
        ff(){on(o,false)}};
    }
    return{dur:o.wait||600,run(){},end(){doFx(true)},ff(){on(o,false)}};
  }
  function build(){mk.innerHTML=G.mock;S=new Set();apply(false);setCur(640,400);hot(null);kc.classList.remove('on','dn');end.classList.remove('on')}
  function prep(n){ /* n번째 단계 시작 */
    i=n;t=0;endT=-1;ops=(steps[n].do||[]).map(mkOp);let a=0;ops.forEach(o=>{o.t0=a;a+=o.dur;o.st=0});
    cap.innerHTML=`<span class="gd-cn">${n+1}</span><span>${X(TT(steps[n].cap||steps[n].t))}</span>`;
    segs.forEach((s,j)=>s.style.width=j<n?'100%':'0%');
    if(onStep)onStep(n);
  }
  const stepDur=()=>{let a=0;ops.forEach(o=>{o.t0=a;a+=(o._d||o.dur)});return a+(steps[i].hold||1300)};
  function seek(n,play){
    n=Math.max(0,Math.min(steps.length-1,n));build();
    for(let j=0;j<n;j++)(steps[j].do||[]).map(mkOp).forEach(o=>o.ff());
    prep(n);if(play!=null)setPlay(play);draw();
  }
  function tick(dt){
    if(endT>=0){endT+=dt;if(endT>1800){seek(0)}return}
    t+=dt;const D=stepDur();
    ops.forEach(o=>{if(t>=o.t0&&o.st<2){const e=t-o.t0,d=(o._d||o.dur);if(e<d){o.st=1;o.run(e)}else{if(!o.st)o.run(d-1);o.end();o.st=2}}});
    segs[i].style.width=Math.min(100,t/D*100)+'%';
    if(t>=D){if(i<steps.length-1)prep(i+1);else{endT=0;end.classList.add('on')}}
  }
  function draw(){segs.forEach((s,j)=>{if(j>i)s.style.width='0%'})}
  function loop(ts){if(dead)return;raf=requestAnimationFrame(loop);if(!playing){last=ts;return}const dt=Math.min(64,ts-(last||ts))*spd;last=ts;tick(dt)}
  const ICP='<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z"/></svg>',ICS='<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>';
  function setPlay(p){playing=p;bPlay.innerHTML=p?ICS:ICP;bPlay.setAttribute('aria-label',TT(p?'일시 정지':'재생'));bPlay.title=TT(p?'일시 정지 (Space)':'재생 (Space)')}
  function flash(p){big.innerHTML=`<i>${p?ICP:ICS}</i>`;big.classList.add('on');clearTimeout(flash.t);flash.t=setTimeout(()=>big.classList.remove('on'),420)}
  function toggle(){if(endT>=0){seek(0,true);userPaused=false;return}setPlay(!playing);userPaused=!playing;flash(playing)}
  bPlay.onclick=toggle;
  scr.onclick=toggle;
  scr.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle()}else if(e.key==='ArrowRight'){e.preventDefault();seek(i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();seek(i-1)}};
  root.querySelector('[data-gv="re"]').onclick=()=>{userPaused=false;seek(0,true)};
  const SP=[1,1.5,2,.75];bSpd.onclick=()=>{spd=SP[(SP.indexOf(spd)+1)%SP.length];bSpd.textContent=spd+'×'};
  root.querySelectorAll('.gd-seg').forEach((s,j)=>s.onclick=()=>{userPaused=false;seek(j,true)});
  build();prep(0);setPlay(false);
  raf=requestAnimationFrame(loop);
  /* 화면에 보일 때만 재생 (사용자가 멈췄으면 그대로) */
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let io=null;if(window.IntersectionObserver){io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting&&x.intersectionRatio>.35){if(!userPaused&&!reduce)setPlay(true)}else if(playing){setPlay(false)}}),{threshold:[0,.35,.6]});io.observe(scr)}
  else if(!reduce)setPlay(true);
  /* 점검용: 모든 동작의 대상이 그 순간 화면에 보이는지 */
  function check(){const bad=[];build();steps.forEach((stp,j)=>(stp.do||[]).forEach(o=>{
      const keys=[o.c,o.d,o.r,o.m,o.drag,o.to,o.type,o.paint].filter(x=>x!=null&&x!=='');
      keys.forEach(kk=>{const L=qa(kk);if(!L.length||!L.some(e=>e.getClientRects().length&&e.offsetWidth+e.offsetHeight>0))bad.push((j+1)+':'+kk)});
      mkOp(o).ff()}));
    seek(0,false);return bad}
  function ffTo(n){setPlay(false);userPaused=true;build();for(let j=0;j<=n;j++)(steps[j].do||[]).map(mkOp).forEach(o=>o.ff());if(n>=0)cap.innerHTML=`<span class="gd-cn">${n+1}</span><span>${X(steps[n].cap||steps[n].t)}</span>`}
  return{check,ffTo,seek:(n)=>{userPaused=false;seek(n,true)},destroy(){dead=true;cancelAnimationFrame(raf);if(ro)ro.disconnect();if(io)io.disconnect()}};
}

/* ---------- 페이지 ---------- */
const LTH={1:'lesson-1-0',2:'lesson-2-0',3:'lesson-3-1',4:'lesson-4-2',5:'lesson-5-2',6:'lesson-6-0',7:'lesson-7-0',8:'lesson-8-0',9:'lesson-9-0',10:'lesson-10-0',11:'lesson-11-0',12:'lesson-12-0',13:'lesson-13-0',14:'lesson-14-0',15:'lesson-15-0',16:'lesson-16-0'};
const G_CATS=[['all','전체'],['view','화면 둘러보기'],['make','맵 · 재료'],['code','스크립트'],['move','애니메이션 · 연출'],['ui','UI']];
const G_CAT={scene:'view',game:'view',hier:'view',insp:'view',console:'code',assets:'make',palette:'make',script:'code',vs:'code',animator:'move',anim:'move',tl:'move',uib:'ui'};
let GF='all',PL=null;
const lessons=()=>(typeof LESSONS!=='undefined'?LESSONS:[]);
const lessonOf=h=>lessons().find(L=>L.hash===h);
const lessonHref=L=>'#'+((window.PV_DATA&&PV_DATA[L.hash])?'about-':'')+L.hash;
function lessonStat(L){try{const t=L.problems.length,n=L.problems.filter(p=>st.done[p.id]).length;return{n,t}}catch(e){return{n:0,t:0}}}
const hl=c=>{try{return typeof csHighlight==='function'?csHighlight(c):X(c)}catch(e){return X(c)}};
const kbds=a=>(a||[]).map(k=>`<kbd>${X(TT(k))}</kbd>`).join('');
const lvChipG=()=>`<span class="gd-lv">● ${X(TT('난이도'))} ${X(TT('입문'))}</span>`;

function lessonCard(L){
  const s=lessonStat(L),th=LTH[L.no],done=s.t&&s.n===s.t;
  return`<a class="gd-card" href="${lessonHref(L)}"><div class="th" ${th?`style="background-image:url(assets/learn/${th}.webp)"`:''}>${th?'':`<span class="gd-cno">${L.no}</span>`}<span class="gd-ctg">${X(TT('레슨 {n}',{n:L.no}))}</span></div>
   <div class="gd-cbd"><b>${X(TT(L.title))}</b><span class="gd-cds">${X(TT(L.lead||''))}</span><div class="gd-cft">${done?`<span class="gd-cok">✓ ${X(TT('완료'))}</span>`:s.n?`<span>${X(TT('{n} / {t} 문제',s))}</span>`:`<span>${X(TT('문제 {t}개',{t:s.t}))}</span>`}<span class="gd-cgo">${X(TT('레슨 보기'))} →</span></div></div></a>`;
}
function guideCard(g,cls){
  return`<a class="gd-card ${cls||''}" href="#guide-${g.id}"><div class="th gd-cgt">${miniMock(g)}<span class="gd-cico"><span class="gd-ic">${ico(g.ic)}</span></span><span class="gd-ctg g">${X(TT('기능 가이드'))}</span></div>
   <div class="gd-cbd"><b>${X(TT(g.title))}</b><span class="gd-cds">${X(TT(g.lead))}</span><div class="gd-cft">${isSeen(g.id)?`<span class="gd-cok">✓ ${X(TT('봤어요'))}</span>`:`<span>${X(TT('영상 {n}단계',{n:g.steps.length}))}</span>`}<span class="gd-cgo">${X(TT('가이드 보기'))} →</span></div></div></a>`;
}
/* 카드 썸네일: 영상 첫 화면을 작게 (상태 반영 없이 처음 모습) */
function miniMock(g){return`<div class="mini" data-mini="${g.id}"></div>`}
function fillMinis(box){
  box.querySelectorAll('[data-mini]').forEach(m=>{
    const g=GB[m.dataset.mini];if(!g||m.firstChild)return;
    const sc=document.createElement('div');sc.className='gd-sc';sc.dataset.g=g.id;sc.innerHTML=`<div class="gd-mk">${g.mock}</div>`;m.appendChild(sc);
    /* 썸네일은 영상이 끝난 모습(모든 상태를 켠 화면)으로 */
    const S=new Set();g.steps.forEach(st=>(st.do||[]).forEach(o=>String(o.on||'').split(/\s+/).forEach(x=>x&&S.add(x))));
    sc.querySelectorAll('[data-show]').forEach(el=>{if(!evalX(S,el.dataset.show))el.setAttribute('hidden','')});
    sc.querySelectorAll('[data-hide]').forEach(el=>{if(evalX(S,el.dataset.hide))el.setAttribute('hidden','')});
    sc.querySelectorAll('[data-cls]').forEach(el=>pairs(el.dataset.cls).forEach(([e,c])=>{if(evalX(S,e))c.split(/\s+/).forEach(x=>x&&el.classList.add(x))}));
    sc.querySelectorAll('[data-txt]').forEach(el=>{let v=null;pairs(el.dataset.txt).forEach(([e,t])=>{if(evalX(S,e))v=t});if(v!=null)el.textContent=v});
    g.steps.forEach(st=>(st.do||[]).forEach(o=>{if(o.paint)sc.querySelectorAll(`[data-k="${o.paint}"]`).forEach(x=>x.classList.add(o.cls))}));
    sc.querySelectorAll('.m-pop,.m-menu,.m-dlg2,.m-hint,.m-toast,.m-ac').forEach(x=>x.setAttribute('hidden',''));
    const fitM=()=>{const w=m.clientWidth;if(w)sc.style.transform=`scale(${w/DW})`};fitM();
    if(window.ResizeObserver)new ResizeObserver(fitM).observe(m);
  });
}
function searchCard(){
  return`<a class="gd-card" href="#search"><div class="th gd-cst">void Start()\n{\n    Debug.Log("HP: " + hp);\n}<span class="gd-ctg">${X(TT('도구'))}</span></div><div class="gd-cbd"><b>${X(TT('코드 검색'))}</b><span class="gd-cds">${X(TT('코드를 넣으면 쓰인 코드마다 설명과 예시를 보여 줘요'))}</span><div class="gd-cft"><span>${X(TT('레슨 아님 · 찾아보기'))}</span><span class="gd-cgo">${X(TT('검색 열기'))} →</span></div></div></a>`;
}
function stop(){if(PL){PL.destroy();PL=null}}
const curPlayer=()=>PL;

function renderGuide(id,box){
  stop();injectCss();const g=GB[id];if(!g){renderList(box);return}
  markSeen(g.id);
  const ix=GUIDES.indexOf(g),prev=GUIDES[ix-1],next=GUIDES[ix+1];
  const rel=(g.rel||[]).map(lessonOf).filter(Boolean);
  box.innerHTML=`<div class="gd">
   <nav class="gd-crumb"><a href="#guides">${X(TT('기능 가이드'))}</a><span>›</span><span>${X(TT(g.title))}</span></nav>
   <header class="gd-hero"><span class="gd-ic">${ico(g.ic)}</span><div><h1>${X(TT(g.title))}</h1>
     <div class="gd-sub">${lvChipG()}<span>${X(TT('단축키'))}</span>${kbds(g.hk)}<span>·</span><span>${X(TT('영상 {n}단계',{n:g.steps.length}))}</span></div></div>
     <button type="button" class="gd-try" data-try="${g.id}">→ ${X(TT('직접 해 보기'))}</button></header>
   <section class="gd-vid" aria-label="${X(TT('사용 방법 영상'))}">
     <div class="gd-scr" tabindex="0" role="img" aria-label="${X(TT(g.title))} · ${X(TT('사용 방법 영상'))}"></div>
     <div class="gd-cap" aria-live="polite"></div>
     <div class="gd-ctl"><button type="button" class="gd-cb" data-gv="play"></button><button type="button" class="gd-cb" data-gv="re" title="${X(TT('처음부터'))}" aria-label="${X(TT('처음부터'))}"><svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg></button>
       <div class="gd-segs">${g.steps.map((s,j)=>`<button type="button" class="gd-seg" title="${j+1}. ${X(TT(s.t))}" aria-label="${j+1}. ${X(TT(s.t))}"><i></i></button>`).join('')}</div>
       <button type="button" class="gd-cb sp" data-gv="spd" title="${X(TT('재생 속도'))}">1×</button></div>
   </section>
   <section class="gd-what"><span class="gd-lb">${X(TT('이런 기능이에요'))}</span><p>${g.sum}</p></section>
   <div class="gd-cols">
    <section class="gd-box"><h2>${X(TT('이렇게 써요'))}</h2><ol class="gd-steps">${g.steps.map((s,j)=>`<li data-st="${j}" tabindex="0"><span class="n">${j+1}</span><div><b>${X(TT(s.t))}</b><span>${X(TT(s.d))}</span></div></li>`).join('')}</ol></section>
    <aside class="gd-box"><h2><svg class="gd-i bulb" viewBox="0 0 24 24" width="17" height="17"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>${X(TT('알아 두면 좋아요'))}</h2>
     <ul class="gd-tips">${g.tips.map(x=>`<li>${X(TT(x))}</li>`).join('')}</ul>
     ${g.keys&&g.keys.length?`<table class="gd-keys">${g.keys.map(([k,d])=>`<tr><td>${k.split(' · ').map(x=>`<kbd>${X(x)}</kbd>`).join(' ')}</td><td>${X(TT(d))}</td></tr>`).join('')}</table>`:''}</aside>
   </div>
   <section class="gd-sec"><h2>${X(TT('이럴 때 써 보세요'))}</h2><p>${X(TT('실제로 자주 만나는 상황과 예시다.'))}</p>
    <div class="gd-exs">${g.ex.map((e,j)=>`<article class="gd-ex"><h3><i>${X(TT('예시'))} ${j+1}</i>${X(TT(e.h))}</h3><p>${X(TT(e.p))}</p>${e.code?`<pre translate="no">${hl(e.code)}</pre>`:''}</article>`).join('')}</div></section>
   <section class="gd-sec"><h2>${X(TT('관련 학습'))}</h2><p>${X(TT('이 기능을 직접 써 보는 레슨과, 함께 보면 좋은 가이드다.'))}</p>
    <div class="gd-grid">${rel.map(lessonCard).join('')}${(g.gl||[]).map(x=>GB[x]).filter(Boolean).map(x=>guideCard(x)).join('')}${(g.extra||[]).includes('search')?searchCard():''}</div></section>
   <nav class="gd-nav">${prev?`<a class="gd-nv" href="#guide-${prev.id}"><small>← ${X(TT('이전 가이드'))}</small><b>${X(TT(prev.title))}</b></a>`:''}${next?`<a class="gd-nv nx" href="#guide-${next.id}"><small>${X(TT('다음 가이드'))} →</small><b>${X(TT(next.title))}</b></a>`:''}</nav>
  </div>`;
  fillMinis(box);
  const lis=[...box.querySelectorAll('.gd-steps li')];
  PL=Player(box.querySelector('.gd-vid'),g,n=>lis.forEach((li,j)=>li.classList.toggle('on',j===n)));
  lis.forEach(li=>{const go=()=>{PL.seek(+li.dataset.st);const v=box.querySelector('.gd-vid'),r=v.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)v.scrollIntoView({behavior:'smooth',block:'center'})};li.onclick=go;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  box.querySelector('[data-try]').onclick=()=>tryIt(g);
  document.title='Thaniya Engine Edu · '+TT(g.title)+' '+TT('기능 가이드');
}
function renderList(box){
  stop();injectCss();
  const show=GUIDES.filter(g=>GF==='all'||G_CAT[g.id]===GF),seenN=GUIDES.filter(g=>isSeen(g.id)).length;
  box.innerHTML=`<div class="gd"><header class="gd-lh"><div><h1>${X(TT('기능 가이드'))}</h1><p>${X(TT('레슨보다 가볍게, 엔진 기능 하나를 짧은 영상과 그림으로 익혀요. 모두 입문 난이도예요.'))}<br>${X(TT('엔진의 창마다 있는 「학습」 버튼을 누르면 그 창의 가이드가 바로 열려요.'))}</p></div><span class="cnt">${X(TT('본 가이드 {n} / {t}',{n:seenN,t:GUIDES.length}))}</span></header>
   <div class="gd-flt" role="group" aria-label="${X(TT('분류'))}">${G_CATS.map(([k,n])=>`<button type="button" class="gd-fb" data-gf="${k}" aria-pressed="${GF===k}">${X(TT(n))}</button>`).join('')}</div>
   <div class="gd-lgrid">${show.map(g=>guideCard(g,'gd-lc')).join('')}</div></div>`;
  fillMinis(box);
  box.querySelectorAll('[data-gf]').forEach(b=>b.onclick=()=>{GF=b.dataset.gf;renderList(box);const f=box.querySelector(`[data-gf="${GF}"]`);if(f)f.focus()});
  document.title='Thaniya Engine Edu · '+TT('기능 가이드');
}
/* 「직접 해 보기」: 엔진 안 학습 창이면 엔진에, 엔진이 띄운 새 창이면 그 엔진에 알림. 따로 열었으면 엔진을 그 창과 함께 엶 */
function tryIt(g){
  const msg={thaniyaGuide:1,t:'try',panel:g.id};
  try{if(window.parent&&window.parent!==window){window.parent.postMessage(msg,'*');return}}catch(e){}
  try{const o=window.opener;if(o&&!o.closed){o.postMessage(msg,'*');try{o.focus()}catch(_){}return}}catch(e){}
  location.href='edit.html?guide='+encodeURIComponent(g.id);
}

window.GUIDE={player:()=>PL,list:GUIDES,byId:id=>GB[id],renderGuide,renderList,stop,isSeen,ico,injectCss,fillMinis,miniMock,cats:G_CAT};
if(window.TI18N)TI18N.add({"기능 가이드":["Feature guides","機能ガイド","功能指南"],"직접 해 보기":["Try it","やってみる","动手试试"],"이런 기능이에요":["What it does","こんな機能です","功能介绍"],"이렇게 써요":["How to use it","使い方","使用方法"],"알아 두면 좋아요":["Good to know","知っておくと便利","小贴士"],
 "이럴 때 써 보세요":["When to use it","こんなときに","适用场景"],"실제로 자주 만나는 상황과 예시다.":["Common situations and examples.","よくある場面と例です。","常见情况和示例。"],"관련 학습":["Related learning","関連する学習","相关学习"],
 "이 기능을 직접 써 보는 레슨과, 함께 보면 좋은 가이드다.":["Lessons that use this feature, and guides worth reading with it.","この機能を実際に使うレッスンと、一緒に見ると良いガイドです。","实际使用此功能的课程，以及值得一起看的指南。"],
 "이전 가이드":["Previous guide","前のガイド","上一篇"],"다음 가이드":["Next guide","次のガイド","下一篇"],"단축키":["Shortcut","ショートカット","快捷键"],"영상 {n}단계":["{n}-step video","動画 {n}ステップ","视频 {n} 步"],"입문":["Beginner","入門","入门"],
 "사용 방법 영상":["How-to video","使い方動画","使用视频"],"처음부터":["Restart","最初から","从头开始"],"처음부터 다시":["Play again","もう一度","重新播放"],"재생 속도":["Playback speed","再生速度","播放速度"],"재생":["Play","再生","播放"],"일시 정지":["Pause","一時停止","暂停"],
 "재생 (Space)":["Play (Space)","再生 (Space)","播放 (Space)"],"일시 정지 (Space)":["Pause (Space)","一時停止 (Space)","暂停 (Space)"],"우클릭":["Right-click","右クリック","右键"],"예시":["Example","例","示例"],
 "봤어요":["Viewed","見ました","已看"],"이어서 해 볼 레슨":["Lessons to try next","次に試すレッスン","接下来可以学的课程"],"다시 보기":["Watch again","もう一度見る","再看一遍"],"입문 · 엔진 기능을 짧은 영상으로":["Beginner · engine features in short videos","入門 · エンジン機能を短い動画で","入门 · 用短视频了解引擎功能"],"가이드 보기":["Open guide","ガイドを見る","查看指南"],"레슨 보기":["View lesson","レッスンを見る","查看课程"],"문제 {t}개":["{t} problems","問題 {t}問","{t} 道题"],"도구":["Tool","ツール","工具"],
 "레슨보다 가볍게, 엔진 기능 하나를 짧은 영상과 그림으로 익혀요. 모두 입문 난이도예요.":["Lighter than lessons: learn one engine feature at a time with a short video. All guides are beginner level.","レッスンより気軽に、エンジンの機能をひとつずつ短い動画で学べます。すべて入門レベルです。","比课程更轻松，用短视频逐个了解引擎功能。全部为入门难度。"],
 "엔진의 창마다 있는 「학습」 버튼을 누르면 그 창의 가이드가 바로 열려요.":["The “Learn” button on each engine panel opens that panel’s guide.","エンジンの各ウィンドウの「学習」ボタンで、そのウィンドウのガイドが開きます。","点击引擎各窗口的“学习”按钮即可打开该窗口的指南。"],
 "본 가이드 {n} / {t}":["Viewed {n} / {t}","閲覧 {n} / {t}","已看 {n} / {t}"],"화면 둘러보기":["Editor basics","画面の基本","界面基础"],"맵 · 재료":["Maps & assets","マップ・素材","地图与素材"],"스크립트":["Scripting","スクリプト","脚本"],"애니메이션 · 연출":["Animation & cutscenes","アニメーション・演出","动画与演出"],
 "씬 뷰와 도구":["Scene view & tools","シーンビューとツール","场景视图与工具"],"플레이와 게임 뷰":["Play & Game view","プレイとゲームビュー","运行与游戏视图"],"계층 구조":["Hierarchy","ヒエラルキー","层级"],"인스펙터":["Inspector","インスペクター","检查器"],"프로젝트 (에셋)":["Project (assets)","プロジェクト（アセット）","项目（资源）"],
 "타일 팔레트":["Tile Palette","タイルパレット","瓦片调色板"],"콘솔":["Console","コンソール","控制台"],"스크립트 (C#)":["Scripts (C#)","スクリプト (C#)","脚本 (C#)"],"비주얼 스크립트":["Visual Scripting","ビジュアルスクリプト","可视化脚本"],"UI 빌더":["UI Builder","UIビルダー","UI 构建器"],"애니메이터":["Animator","アニメーター","动画器"],"애니메이션":["Animation","アニメーション","动画"],"타임라인":["Timeline","タイムライン","时间轴"]});
})();
