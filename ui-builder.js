/* ui-builder.js — UI 빌더 (유니티 UI Builder · 피그마처럼 누구나 쉽게 UI 화면을 만드는 창)
   · 엔진(edit.html)의 「UI 화면 만들기」 버튼이 여는 창입니다. 스크립트 창처럼 화면 가운데 큰 창으로 열리고, 도킹도 됩니다.
   · 왼쪽: 계층 구조(맨 위 폴더 = 화면, 기본 이름 「새 UI」) + 요소 라이브러리(끌어다 놓기)
     가운데: 캔버스(모서리를 끌어 크기 조절 · 게임 뷰와 같은 기기 해상도 목록 · 스마트 가이드 스냅 · 확대/이동)
     오른쪽: 스타일 인스펙터(위치·앵커 · 자동 배치(flex) · 채우기 · 테두리 · 글자 · 효과 · 동작 · CSS)
   · 요소는 실제 HTML/CSS로 그립니다 (패널 · 텍스트 · 버튼 · 이미지 · 체크박스 · 슬라이더 · 입력 상자 · 드롭다운 · 진행 막대)
   · 저장: P.uiDocs (프로젝트와 함께 저장 · 내보내기 JSON의 uiDocs) · 따로 HTML 파일로도 내보낼 수 있음
   · 플레이: 「플레이 시작 시 보이기」 화면을 게임 화면 위에 겹쳐 보여 주고, 버튼 동작 · 스크립트 정적 클래스 UIScreen 으로 다룹니다

   UI_BUILDER(get, set, over) — anim-editor.js와 같은 방식으로 화면 쪽 변수(P · play · openModal · showMenu …)를 이름 그대로 읽습니다.

   데이터
     P.uiDocs = [{id, name, w, h, show:'start'|'manual', scene:''|씬 id, scale:'fit'|'none', match:0~1, modal, root:노드}]
     노드 {id, type, name, ax:'l'|'c'|'r'|'s', ay:'t'|'m'|'b'|'s', x, xr, y, yr, w, h, fx, fy, hidden, locked, st:{스타일}, pr:{속성}, act:{동작}, css, kids:[]}
       가로 앵커 l = 왼쪽에서 x · r = 오른쪽에서 x · c = 가운데에서 x · s = 늘이기(왼쪽 x, 오른쪽 xr) / 세로도 같음 (t·b·m·s)
       w·h는 늘 마지막 크기를 기억 · fx·fy = 자동 배치(flex) 안에서 「채우기」 */
function UI_BUILDER(get,set,over){
  over=over||{};
  const OWN=Object.prototype.hasOwnProperty,cache=Object.create(null);
  const H=new Proxy(Object.create(null),{
    has(_,n){if(typeof n!=='string')return false;if(OWN.call(over,n)||cache[n])return true;
      let g;try{g=get(n)}catch(e){return false}
      if(n in globalThis){try{if(g()===globalThis[n])return false}catch(e){}}
      cache[n]=g;return true},
    get(_,n){if(typeof n!=='string')return undefined;if(OWN.call(over,n))return over[n];return(cache[n]||(cache[n]=get(n)))()},
    set(_,n,v){if(OWN.call(over,n))over[n]=v;else set(n,v);return true}
  });
  const __uibHost=H;
  with(H){return(function(){'use strict';

/* ===================== 아이콘 · 요소 종류 ===================== */
const sv=d=>`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
const IC={
  panel:sv('<rect x="2" y="3" width="12" height="10" rx="1.8"/>'),
  text:sv('<path d="M3.5 4h9M8 4v9M6 13h4"/>'),
  button:sv('<rect x="1.8" y="4.5" width="12.4" height="7" rx="3.5"/><path d="M5.5 8h5"/>'),
  image:sv('<rect x="2" y="2.8" width="12" height="10.4" rx="1.5"/><circle cx="5.6" cy="6.2" r="1.2"/><path d="M2.4 12l3.8-3.6 2.6 2.4 1.8-1.6 3 2.8"/>'),
  toggle:sv('<rect x="2.5" y="2.5" width="11" height="11" rx="2.4"/><path d="M5 8.2l2 2 4-4.4"/>'),
  slider:sv('<path d="M2 8h12"/><circle cx="9.5" cy="8" r="2.4" fill="currentColor"/>'),
  input:sv('<rect x="1.8" y="4" width="12.4" height="8" rx="1.6"/><path d="M5 6v4"/>'),
  dropdown:sv('<rect x="1.8" y="4" width="12.4" height="8" rx="1.6"/><path d="M9.6 7.2l1.4 1.4 1.4-1.4"/>'),
  progress:sv('<rect x="1.8" y="6" width="12.4" height="4" rx="2"/><path d="M3.2 8h5.8" stroke-width="2.6"/>'),
  screen:sv('<rect x="1.8" y="2.5" width="12.4" height="9" rx="1.4"/><path d="M6 14h4M8 11.5V14"/>'),
  eye:sv('<path d="M1.6 8s2.4-4.4 6.4-4.4S14.4 8 14.4 8s-2.4 4.4-6.4 4.4S1.6 8 1.6 8z"/><circle cx="8" cy="8" r="1.8"/>'),
  eyeOff:sv('<path d="M2.5 2.5l11 11M6.4 4a6.6 6.6 0 011.6-.4c4 0 6.4 4.4 6.4 4.4a11 11 0 01-1.7 2.2M10 12a6 6 0 01-2 .4C4 12.4 1.6 8 1.6 8a11 11 0 012.3-2.7"/>'),
  lock:sv('<rect x="3.5" y="7" width="9" height="6.5" rx="1.4"/><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7"/>'),
  unlock:sv('<rect x="3.5" y="7" width="9" height="6.5" rx="1.4"/><path d="M5.5 7V5.2a2.5 2.5 0 014.8-1"/>'),
  caret:sv('<path d="M6 4.5L9.5 8 6 11.5"/>'),
  play:sv('<path d="M5 3.5v9l7-4.5z"/>'),
  undo:sv('<path d="M4.5 6.5H10a3 3 0 010 6H7M6.5 4L4 6.5 6.5 9"/>'),
  redo:sv('<path d="M11.5 6.5H6a3 3 0 000 6h3M9.5 4L12 6.5 9.5 9"/>'),
  grid:sv('<path d="M2 5.5h12M2 10.5h12M5.5 2v12M10.5 2v12"/>'),
  guide:sv('<path d="M8 1.5v13M1.5 8h13" stroke-dasharray="2 1.6"/><rect x="3" y="3" width="10" height="10" rx="1"/>'),
  magnet:sv('<path d="M4 2.5v5a4 4 0 008 0v-5M4 5.5h2.6M9.4 5.5H12M6.6 2.5v5a1.4 1.4 0 002.8 0v-5"/>'),
  more:sv('<circle cx="3.5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.5" cy="8" r="1" fill="currentColor"/>'),
  plus:sv('<path d="M8 3v10M3 8h10"/>'),
  rot:sv('<path d="M3 8a5 5 0 018.6-3.4M13 8a5 5 0 01-8.6 3.4M11.8 2.4v2.4H9.4M4.2 13.6v-2.4h2.4"/>'),
  hier:sv('<path d="M3 3h4M5 3v9h4M5 7.5h4"/><rect x="9" y="6" width="5" height="3" rx=".8"/><rect x="9" y="10.5" width="5" height="3" rx=".8"/>'),
  props:sv('<path d="M2.5 4.5h7M12 4.5h1.5M2.5 11.5h1.5M6.5 11.5h7"/><circle cx="10.8" cy="4.5" r="1.4"/><circle cx="5.2" cy="11.5" r="1.4"/>'),
  aL:sv('<path d="M2.5 2v12"/><rect x="4.5" y="4" width="8" height="3" rx=".7"/><rect x="4.5" y="9" width="5" height="3" rx=".7"/>'),
  aC:sv('<path d="M8 2v12"/><rect x="3.5" y="4" width="9" height="3" rx=".7"/><rect x="5" y="9" width="6" height="3" rx=".7"/>'),
  aR:sv('<path d="M13.5 2v12"/><rect x="3.5" y="4" width="8" height="3" rx=".7"/><rect x="6.5" y="9" width="5" height="3" rx=".7"/>'),
  aT:sv('<path d="M2 2.5h12"/><rect x="4" y="4.5" width="3" height="8" rx=".7"/><rect x="9" y="4.5" width="3" height="5" rx=".7"/>'),
  aM:sv('<path d="M2 8h12"/><rect x="4" y="3.5" width="3" height="9" rx=".7"/><rect x="9" y="5" width="3" height="6" rx=".7"/>'),
  aB:sv('<path d="M2 13.5h12"/><rect x="4" y="3.5" width="3" height="8" rx=".7"/><rect x="9" y="6.5" width="3" height="5" rx=".7"/>'),
  row:sv('<rect x="1.5" y="4.5" width="3.6" height="7" rx=".8"/><rect x="6.2" y="4.5" width="3.6" height="7" rx=".8"/><rect x="10.9" y="4.5" width="3.6" height="7" rx=".8"/>'),
  col:sv('<rect x="4.5" y="1.5" width="7" height="3.6" rx=".8"/><rect x="4.5" y="6.2" width="7" height="3.6" rx=".8"/><rect x="4.5" y="10.9" width="7" height="3.6" rx=".8"/>'),
  free:sv('<rect x="2" y="2" width="5" height="4" rx=".8"/><rect x="8.5" y="7" width="5.5" height="4.5" rx=".8"/><rect x="3" y="9.5" width="3.5" height="4" rx=".8"/>'),
  close:sv('<path d="M4 4l8 8M12 4l-8 8"/>'),
  fsOn:sv('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
  fsOff:sv('<path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/>'),
  reset:sv('<path d="M2.8 8a5.2 5.2 0 109-3.5M11.8 1.8v2.9H8.9"/>')
};
const TYPES={
  panel:{n:'패널',box:1,tip:'다른 요소를 담는 상자 (div) · 자동 배치(가로/세로)를 켜면 CSS flex처럼 정렬됩니다',
    d:{w:320,h:200,st:{bg:'#1e2230',bgA:.92,radius:12},pr:{layout:'none',gap:12,pad:16,jc:'start',ai:'start',wrap:false,clip:false}}},
  text:{n:'텍스트',txt:1,tip:'글자 (label)',d:{w:200,h:36,st:{color:'#ffffff',fs:20,ta:'left',va:'middle'},pr:{text:'텍스트'}}},
  button:{n:'버튼',txt:1,tip:'누를 수 있는 버튼 (button) · 오른쪽 「동작」에서 눌렀을 때 할 일을 고릅니다',
    d:{w:160,h:44,st:{bg:'#3b82f6',bgA:1,color:'#ffffff',fs:16,fw:600,ta:'center',va:'middle',radius:10,sh:1},pr:{text:'버튼'},act:{t:'none'}}},
  image:{n:'이미지',tip:'프로젝트의 스프라이트를 보여 줍니다 (img)',d:{w:96,h:96,st:{},pr:{src:'',fit:'contain',pix:true}}},
  toggle:{n:'체크박스',txt:1,tip:'켜고 끄는 체크박스 (input type=checkbox)',d:{w:180,h:32,st:{color:'#ffffff',fs:16,ac:'#3b82f6',tr:'#3a4050',va:'middle'},pr:{text:'체크박스',checked:false,bx:20}}},
  slider:{n:'슬라이더',tip:'값을 끌어서 고르는 막대 (input type=range)',d:{w:220,h:28,st:{ac:'#3b82f6',tr:'#3a4050',kc:'#ffffff'},pr:{min:0,max:100,step:1,value:50,tk:6,kb:18}}},
  input:{n:'입력 상자',tip:'글자를 입력받는 칸 (input)',d:{w:240,h:40,st:{bg:'#11141c',bgA:1,color:'#ffffff',fs:15,radius:8,bw:1,bc:'#3a4050',pad:12},pr:{value:'',ph:'입력하세요',itype:'text',max:0}}},
  dropdown:{n:'드롭다운',tip:'목록에서 하나를 고르는 상자 (select)',d:{w:200,h:40,st:{bg:'#11141c',bgA:1,color:'#ffffff',fs:15,radius:8,bw:1,bc:'#3a4050',pad:12},pr:{opts:'항목 1\n항목 2\n항목 3',value:0}}},
  progress:{n:'진행 막대',tip:'체력·경험치처럼 채워지는 막대',d:{w:220,h:16,st:{bg:'#2a2f3d',bgA:1,ac:'#22c55e',radius:99},pr:{min:0,max:100,value:60}}}
};
const LIB=['panel','text','button','image','toggle','slider','input','dropdown','progress'];
const isBox=n=>!!n&&(n.type==='panel'||n.type==='root');
const ANCH_H=[['l','왼쪽'],['c','가운데'],['r','오른쪽'],['s','늘이기']],ANCH_V=[['t','위'],['m','가운데'],['b','아래'],['s','늘이기']];
const SHADOW=['none','0 1px 3px rgba(0,0,0,.35)','0 4px 14px rgba(0,0,0,.4)','0 14px 36px rgba(0,0,0,.55)'];
const FW=[[300,'얇게'],[400,'보통'],[500,'중간'],[600,'조금 굵게'],[700,'굵게'],[800,'아주 굵게']];

/* ===================== 스타일 (이 창 전용 · 색은 테마 변수만 써서 라이트 테마에도 맞음) ===================== */
const CSS=`
.panel[data-id="uib"] .pbody{display:flex;flex-direction:column;overflow:hidden;padding:0}
.app.narrow .panel[data-id="uib"] .pbody{height:80vh;min-height:460px;flex:none}
.uib{flex:1;min-height:0;display:flex;flex-direction:column;outline:none;position:relative;container-type:inline-size;container-name:uib;font-size:12px;color:var(--fg)}
.uibBar{flex:none;display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);background:var(--head);overflow-x:auto;scrollbar-width:none;white-space:nowrap}
.uibBar::-webkit-scrollbar{display:none}
.uibBar .sep{flex:none;width:1px;height:18px;background:var(--line2);margin:0 2px}
.uibBar select,.uibBar input{height:24px;width:auto;flex:none}
.uibBar input[type=number]{width:62px}
.uibBar .x{color:var(--mute)}
.uibIb{flex:none;height:26px;min-width:26px;padding:0 7px;display:inline-flex;align-items:center;justify-content:center;gap:5px;background:var(--btn);border:1px solid var(--line2);border-radius:6px;color:var(--fg);white-space:nowrap;cursor:pointer}
.uibIb:hover:not(:disabled){background:var(--btn-h)}
.uibIb:disabled{opacity:.35;cursor:default}
.uibIb.on{background:var(--sel);color:var(--sel-fg);border-color:transparent}
.uibIb.danger{color:var(--danger)}
.uibIb.danger:hover:not(:disabled){background:color-mix(in srgb,var(--danger) 16%,transparent)}
.uibIb.pri{background:var(--sel);color:var(--sel-fg);border-color:transparent;font-weight:600}
.uibIb .ic{width:14px;height:14px}
.uibSrc{display:inline-flex;align-items:center;gap:6px;flex:none;max-width:280px;padding:0 4px;white-space:nowrap;overflow:hidden}
.uibSrc>.ic{color:var(--accent-tx,var(--accent));flex:none}.uibSrc .sc{color:var(--mute)}.uibSrc .ar{color:var(--mute)}.uibSrc b{font-weight:600;overflow:hidden;text-overflow:ellipsis}
.uibSrc .dt{width:7px;height:7px;border-radius:50%;background:var(--warn);flex:none}
.uibNb{display:none}
.uibBody{flex:1;min-height:0;display:grid;grid-template-columns:232px minmax(0,1fr) 284px;position:relative}
.uibLeft{display:flex;flex-direction:column;min-height:0;min-width:0;border-right:1px solid var(--line);background:var(--panel)}
.uibRight{min-height:0;min-width:0;overflow:auto;border-left:1px solid var(--line);background:var(--panel)}
.uibCap{flex:none;display:flex;align-items:center;gap:6px;padding:7px 10px 5px;font-size:11px;font-weight:600;color:var(--mute);letter-spacing:.02em}
.uibCap .spacer{flex:1}
.uibHier{flex:1;min-height:60px;overflow:auto;padding:0 0 8px;position:relative}
.uibRow{display:flex;align-items:center;gap:4px;height:26px;padding:0 6px 0 calc(6px + var(--d,0) * 14px);cursor:default;border-radius:5px;margin:0 4px;position:relative;touch-action:none}
.uibRow:hover{background:var(--hover)}
.uibRow.on{background:color-mix(in srgb,#0d99ff 26%,transparent)}
.uibRow.dim .nm{opacity:.45}
.uibRow .cr{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--mute);background:none;border:0;padding:0;cursor:pointer}
.uibRow .cr .ic{width:11px;height:11px;transition:transform .12s}
.uibRow.open .cr .ic{transform:rotate(90deg)}
.uibRow .cr.no{visibility:hidden}
.uibRow .ty{flex:none;color:var(--mute);display:inline-flex}
.uibRow.root .ty{color:var(--accent-tx,var(--accent))}
.uibRow .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uibRow.root .nm{font-weight:600}
.uibRow .tg{flex:none;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;border-radius:4px;color:var(--mute);opacity:0;cursor:pointer;padding:0}
.uibRow .tg.act,.uibRow:hover .tg{opacity:1}
.uibRow .tg:hover{background:var(--hover);color:var(--fg)}
.uibRow input.rn{height:20px;font-size:12px}
.uibHins{position:absolute;left:8px;right:8px;height:2px;background:#0d99ff;border-radius:2px;pointer-events:none;z-index:2}
.uibRow.dropin{box-shadow:inset 0 0 0 1.5px #0d99ff}
.uibLib{flex:none;border-top:1px solid var(--line);padding:0 8px 8px;max-height:48%;overflow:auto}
.uibLibG{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:6px}
.uibLi{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:56px;padding:6px 4px;border:1px solid var(--line2);border-radius:8px;background:var(--btn);color:var(--fg);font-size:11px;cursor:grab;touch-action:none;user-select:none;text-align:center;line-height:1.2}
.uibLi:hover{background:var(--btn-h);border-color:#0d99ff}
.uibLi .ic{width:20px;height:20px}
.uibGhost{position:fixed;z-index:200000;pointer-events:none;padding:6px 10px;border-radius:8px;background:#0d99ff;color:#fff;font-size:12px;font-weight:600;display:flex;gap:6px;align-items:center;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.uibGhost .ic{width:14px;height:14px}
.uibView{position:relative;overflow:hidden;background:var(--canvas);touch-action:none;min-width:0}
.uibView.pan{cursor:grab}.uibView.panning{cursor:grabbing}
.uibScr{position:absolute;left:0;top:0;transform-origin:0 0;background-color:#202027;background-image:conic-gradient(#2a2a32 25%,transparent 0 50%,#2a2a32 0 75%,transparent 0);background-size:20px 20px;box-shadow:0 0 0 1px rgba(127,127,140,.35),0 12px 40px rgba(0,0,0,.4)}
html[data-theme="light"] .uibScr{background-color:#fff;background-image:conic-gradient(#ececf0 25%,transparent 0 50%,#ececf0 0 75%,transparent 0)}
.uibGrid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(13,153,255,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(13,153,255,.14) 1px,transparent 1px);background-size:var(--g,8px) var(--g,8px);z-index:3}
.uibGd{position:absolute;inset:0;pointer-events:none;z-index:3}
.uibGd i{position:absolute;background:rgba(255,64,160,.55)}
.uibGd b{position:absolute;inset:5%;border:1px dashed rgba(255,64,160,.6)}
.uibOver{position:absolute;inset:0;pointer-events:none;z-index:4}
.uibSelB{position:absolute;border:1.5px solid #0d99ff;box-sizing:border-box;pointer-events:none}
.uibSelB.multi{border-style:solid;border-width:1px}
.uibSelB.flow{border-style:dashed}
.uibHov{position:absolute;border:1px solid #0d99ff;box-sizing:border-box;pointer-events:none}
.uibPar{position:absolute;border:1px dashed rgba(13,153,255,.55);box-sizing:border-box;pointer-events:none}
.uibH{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;background:#fff;border:1.5px solid #0d99ff;border-radius:2px;box-sizing:border-box;pointer-events:auto;touch-action:none}
.uibH[data-h=nw],.uibH[data-h=se]{cursor:nwse-resize}.uibH[data-h=ne],.uibH[data-h=sw]{cursor:nesw-resize}
.uibH[data-h=n],.uibH[data-h=s]{cursor:ns-resize}.uibH[data-h=e],.uibH[data-h=w]{cursor:ew-resize}
.uibSz{position:absolute;transform:translate(-50%,6px);background:#0d99ff;color:#fff;font:500 10px var(--f-mono);padding:1px 6px;border-radius:4px;white-space:nowrap;pointer-events:none}
.uibGl{position:absolute;background:#ff40a0;pointer-events:none}
.uibMq{position:absolute;border:1px solid #0d99ff;background:rgba(13,153,255,.08);pointer-events:none}
.uibDrop{position:absolute;box-shadow:inset 0 0 0 2px #0d99ff;background:rgba(13,153,255,.07);pointer-events:none;border-radius:2px}
.uibIns{position:absolute;background:#0d99ff;pointer-events:none;border-radius:2px}
.uibFl{position:absolute;transform:translateY(-100%);padding-bottom:5px;font-size:11px;color:var(--mute);white-space:nowrap;pointer-events:auto;cursor:default;display:flex;gap:6px;align-items:baseline}
.uibFl b{color:var(--fg);font-weight:600}
.uibFh{position:absolute;pointer-events:auto;touch-action:none;z-index:1}
.uibFh.e{width:10px;margin-left:-5px;cursor:ew-resize}.uibFh.s{height:10px;margin-top:-5px;cursor:ns-resize}
.uibFh.se{width:14px;height:14px;margin:-7px 0 0 -7px;cursor:nwse-resize;background:#0d99ff;border:2px solid #fff;border-radius:3px;box-sizing:border-box}
.uibFh.e:hover,.uibFh.s:hover{background:rgba(13,153,255,.35)}
.uibEmpty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;background:color-mix(in srgb,var(--win) 82%,transparent);border:1px solid var(--line2);border-radius:14px;padding:16px 18px;max-width:min(380px,80%);z-index:5;box-shadow:var(--shadow)}
.uibEmpty p{margin:0 0 10px;color:var(--mute);line-height:1.5}
.uibEmpty b{display:block;font-size:14px;margin-bottom:6px;color:var(--fg)}
.uibEmpty .r{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.uibZoomI{position:absolute;right:8px;bottom:8px;font:500 10.5px var(--f-mono);color:var(--mute);background:var(--panel);border:1px solid var(--line2);padding:2px 7px;border-radius:999px;pointer-events:none;z-index:5}
.uibPv{position:absolute;left:50%;top:8px;transform:translateX(-50%);background:#0d99ff;color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;z-index:6;pointer-events:none}
/* 인스펙터 */
.uibIh{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px;background:linear-gradient(var(--panel),var(--panel)),var(--win);border-bottom:1px solid var(--line)}
.uibIh .ty{display:inline-flex;color:var(--accent-tx,var(--accent))}
.uibIh input{flex:1;font-weight:600}
.uibIh small{color:var(--mute);flex:none}
.uibSec{border-bottom:1px solid var(--line)}
.uibSh{display:flex;align-items:center;gap:6px;width:100%;padding:8px 10px;background:none;border:0;color:var(--fg);font-weight:600;font-size:11.5px;text-align:left;cursor:pointer}
.uibSh::before{content:"";width:0;height:0;border-left:4px solid currentColor;border-top:3.5px solid transparent;border-bottom:3.5px solid transparent;transform:rotate(90deg);transition:transform .12s;opacity:.6}
.uibSec.closed .uibSh::before{transform:none}
.uibSec.closed .uibSb{display:none}
.uibSh small{margin-left:auto;color:var(--mute);font-weight:400}
.uibSb{padding:0 10px 10px;display:flex;flex-direction:column;gap:6px}
.uibR{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:center;gap:6px;min-height:24px}
.uibR>.l{color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uibR>.c{display:flex;align-items:center;gap:4px;min-width:0;flex-wrap:wrap}
.uibR>.c>select,.uibR>.c>input[type=text],.uibR>.c>textarea{flex:1;min-width:0}
.uibR textarea{min-height:52px;height:auto;padding:4px 6px;resize:vertical;font:inherit;line-height:1.4}
.uibR textarea.code{font:11px/1.45 var(--f-mono);min-height:70px}
.uibN{display:flex;align-items:center;flex:1;min-width:48px;height:22px;background:var(--field);border:1px solid var(--line2);border-radius:4px;overflow:hidden}
.uibN:focus-within{border-color:var(--accent)}
.uibN>span{flex:none;padding:0 4px 0 6px;color:var(--mute);font-size:10.5px;cursor:ew-resize;user-select:none;touch-action:none;min-width:12px}
.uibN>input{flex:1;min-width:0;border:0!important;background:none!important;height:20px;padding:0 4px 0 0!important}
.uibN>input::-webkit-inner-spin-button{opacity:.5}
.uibCol{display:flex;align-items:center;gap:4px;flex:1;min-width:0}
.uibCol input[type=color]{flex:none;width:26px;height:22px;padding:0;border:1px solid var(--line2);border-radius:4px;background:none;cursor:pointer}
.uibCol input[type=color]::-webkit-color-swatch-wrapper{padding:2px}
.uibCol input[type=color]::-webkit-color-swatch{border:0;border-radius:2px}
.uibCol input[type=text]{flex:1;min-width:0;font-family:var(--f-mono);font-size:11px}
.uibCol .uibN{flex:none;width:58px}
.uibSeg{display:inline-flex;background:var(--field);border:1px solid var(--line2);border-radius:5px;padding:1px;gap:1px;flex:none}
.uibSeg button{height:22px;min-width:24px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;gap:4px;background:none;border:0;border-radius:4px;color:var(--fg);cursor:pointer;font-size:11px}
.uibSeg button:hover{background:var(--hover)}
.uibSeg button.on{background:var(--sel);color:var(--sel-fg)}
.uibSeg .ic{width:13px;height:13px}
.uibChk{display:inline-flex;align-items:center;gap:6px;cursor:pointer;min-height:22px}
.uibAn{display:grid;grid-template-columns:repeat(4,22px);gap:3px;flex:none}
.uibAn button{width:22px;height:22px;padding:0;border:1px solid var(--line2);border-radius:3px;background:var(--field);position:relative;cursor:pointer}
.uibAn button:hover{border-color:#0d99ff}
.uibAn button.on{border-color:#0d99ff;background:color-mix(in srgb,#0d99ff 25%,transparent)}
.uibAn button i{position:absolute;background:currentColor;color:var(--mute);border-radius:1px}
.uibAn button.on i{color:#0d99ff}
.uibAnW{display:flex;gap:10px;align-items:flex-start}
.uibAnT{font-size:11px;color:var(--mute);line-height:1.45}
.uibAnT b{color:var(--fg);font-weight:600}
.uibHint{font-size:11px;color:var(--mute);line-height:1.5;margin:0}
.uibSp{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.uibSp img{width:34px;height:34px;object-fit:contain;image-rendering:pixelated;background:var(--field);border:1px solid var(--line2);border-radius:4px}
.uibCss{font:10.5px/1.5 var(--f-mono);background:var(--field);border:1px solid var(--line2);border-radius:4px;padding:6px 8px;white-space:pre-wrap;word-break:break-all;margin:0;max-height:180px;overflow:auto;user-select:text}
.uibStat{display:flex;gap:10px;flex-wrap:wrap;color:var(--mute);font-size:11px}
.uibStat b{color:var(--fg)}
@container uib (max-width:820px){
  .uibBody{grid-template-columns:minmax(0,1fr)}
  .uibLeft,.uibRight{position:absolute;top:0;bottom:0;z-index:8;width:min(290px,86%);display:none;box-shadow:var(--shadow);background:var(--win)}
  .uibLeft{left:0}.uibRight{right:0}
  .uib.showL .uibLeft{display:flex}.uib.showR .uibRight{display:block}
  .uibNb{display:inline-flex}
}
/* 전체 화면 (엔진 창 전체를 덮음 · 메뉴·대화상자는 그 위에) */
.panel[data-id="uib"].uibFull{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;z-index:99500!important;border-radius:0!important;resize:none!important;margin:0!important;max-width:none!important;max-height:none!important;display:flex!important;flex-direction:column}
.panel[data-id="uib"].uibFull .pbody{flex:1;height:auto!important;min-height:0}
.app.narrow .panel[data-id="uib"].uibFull .pbody{height:auto!important}
.uibToast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:20;background:var(--head);border:1px solid var(--line2);border-left:3px solid var(--accent);border-radius:6px;padding:7px 12px;opacity:0;pointer-events:none;transition:opacity .18s;white-space:nowrap;box-shadow:var(--shadow);background-color:var(--win)}
.uibToast.on{opacity:1}
/* 엔진 인스펙터 · 계층 구조의 UI 빌더 바로가기 */
.uibCard{margin:8px 8px 10px;padding:12px;border-radius:12px;border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel));display:flex;flex-direction:column;gap:8px}
.uibCardH{display:flex;gap:10px;align-items:center}
.uibCardH>.ic{width:22px;height:22px;color:var(--accent-tx,var(--accent));flex:none}
.uibCardH b{display:block;font-size:13px}.uibCardH small{display:block;color:var(--mute);font-size:11px;margin-top:2px;line-height:1.4}
.uibGo{display:flex;align-items:center;justify-content:center;gap:8px;height:38px;border-radius:9px;border:0;background:var(--sel);color:var(--sel-fg);font-weight:700;font-size:13.5px;cursor:pointer}
.uibGo:hover{filter:brightness(1.08)}.uibGo .ic{width:16px;height:16px}
.uibCardL{display:flex;flex-direction:column;gap:3px}
.uibCardL button,.uibNew{display:flex;align-items:center;gap:7px;height:28px;padding:0 9px;border-radius:7px;border:1px solid var(--line2);background:var(--btn);color:var(--fg);cursor:pointer;text-align:left;font-size:12px}
.uibCardL button:hover,.uibNew:hover{background:var(--btn-h);border-color:var(--accent)}
.uibCardL button span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.uibCardL small{color:var(--mute);font-size:10.5px}
.uibNew{justify-content:center;color:var(--mute);border-style:dashed;background:none}
.uibCardL .ic,.uibNew .ic{width:13px;height:13px}
.uibPill{display:inline-flex;align-items:center;gap:4px;margin-left:8px;height:19px;padding:0 9px;border-radius:999px;border:0;background:var(--sel);color:var(--sel-fg);font-size:11px;font-weight:700;cursor:pointer;vertical-align:middle;white-space:nowrap}
.uibPill:hover{filter:brightness(1.1)}
.uibPill .ic{width:11px;height:11px}
.wbadge.uibAll{opacity:.75}
.uibCard.slim{padding:9px;gap:6px}.uibCard.slim .uibGo{height:32px;font-size:12.5px}
.uibCard .uibCardH{margin-top:2px}
.uibIrs{display:flex;flex-direction:column;gap:2px;margin:0 12px 10px}
.uibIr{display:grid;grid-template-columns:80px minmax(0,1fr);gap:8px;align-items:baseline;padding:4px 0;border-bottom:1px solid var(--line);font-size:12px}
.uibIr>span{color:var(--mute)}.uibIr>b{font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis}
.uibIr code{font:11px var(--f-mono);color:var(--mute)}
.uibRight select option.uibOptM,.uibOptM{color:#22c55e;font-weight:700}
.uibRight select.uibActSel.isM{color:#22c55e;font-weight:700;border-color:rgba(34,197,94,.7)}
html[data-theme="light"] .uibRight select option.uibOptM,html[data-theme="light"] .uibOptM,html[data-theme="light"] .uibRight select.uibActSel.isM{color:#15803d}
.uibPvShut{position:absolute;inset:0;z-index:7;display:flex;align-items:center;justify-content:center;pointer-events:none}
.uibPvShut>div{pointer-events:auto;background:color-mix(in srgb,var(--win) 88%,transparent);border:1px solid var(--line2);border-radius:12px;padding:12px 16px;text-align:center;box-shadow:var(--shadow);max-width:80%}
.uibPvShut b{display:block;margin-bottom:4px}.uibPvShut p{margin:0 0 8px;color:var(--mute);font-size:11.5px;line-height:1.5}
/* 그린 UI (편집 · 플레이 · 내보내기 공통) */
.uibS,.uibS *{box-sizing:border-box}
.uibS{font-family:"IBM Plex Sans KR",system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;text-align:left;line-height:1.3;user-select:none}
.uibS.uibS.uibS input,.uibS.uibS.uibS select,.uibS.uibS.uibS button,.uibS.uibS.uibS textarea{all:unset;box-sizing:border-box}
.uibS .t{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;max-width:100%}
.uibS .t[contenteditable]{outline:none;cursor:text;user-select:text;-webkit-user-select:text;min-width:4px}
.uibS.edit *{pointer-events:none!important}
.uibS.edit .t[contenteditable]{pointer-events:auto!important;box-shadow:0 0 0 1px #0d99ff}
.uibS .uE-image{background-repeat:no-repeat;background-position:center}
.uibS .uE-image.ph{background:repeating-linear-gradient(45deg,rgba(127,127,140,.22) 0 6px,rgba(127,127,140,.1) 6px 12px);display:flex;align-items:center;justify-content:center;color:rgba(200,200,210,.75);font-size:12px;box-shadow:inset 0 0 0 1px rgba(127,127,140,.45)}
.uibS .uE-button{cursor:pointer;transition:filter .12s,transform .06s}
.uibS:not(.edit) .uE-button:hover{filter:brightness(1.12)}
.uibS:not(.edit) .uE-button:active{filter:brightness(.92);transform:translateY(1px)}
.uibS .uE-toggle{display:flex;gap:8px;cursor:pointer}
.uibS .uE-toggle .bx{flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;transition:background .12s}
.uibS .uE-toggle .bx svg{width:72%;height:72%;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.uibS .uE-toggle.on .bx svg{opacity:1}
.uibS .uE-slider{display:flex;align-items:center}
.uibS .uR{-webkit-appearance:none;appearance:none;width:100%;height:100%;background:transparent;margin:0;cursor:pointer;display:block}
.uibS .uR::-webkit-slider-runnable-track{height:var(--tk,6px);border-radius:99px;background:linear-gradient(to right,var(--ac) var(--p),var(--tr) var(--p))}
.uibS .uR::-webkit-slider-thumb{-webkit-appearance:none;width:var(--kb,18px);height:var(--kb,18px);border-radius:50%;background:var(--kc,#fff);margin-top:calc((var(--tk,6px) - var(--kb,18px)) / 2);box-shadow:0 1px 4px rgba(0,0,0,.4)}
.uibS .uR::-moz-range-track{height:var(--tk,6px);border-radius:99px;background:var(--tr)}
.uibS .uR::-moz-range-progress{height:var(--tk,6px);border-radius:99px;background:var(--ac)}
.uibS .uR::-moz-range-thumb{width:var(--kb,18px);height:var(--kb,18px);border:0;border-radius:50%;background:var(--kc,#fff);box-shadow:0 1px 4px rgba(0,0,0,.4)}
.uibS .uE-input input{width:100%;height:100%;display:block;cursor:text}
.uibS .uE-input input::placeholder{color:currentColor;opacity:.45}
.uibS .uE-dropdown select{width:100%;height:100%;display:block;cursor:pointer;background-repeat:no-repeat;background-position:right 10px center;background-size:12px 12px;padding-right:30px!important}
.uibS .uE-dropdown select option{background:#1e2230;color:#fff}
.uibS .uE-progress .fill{height:100%;border-radius:inherit;transition:width .2s}
/* 플레이 중 겹쳐 보이는 UI */
.uibRt{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1}
.uibRtS{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.uibRtS .uibS{pointer-events:none}
.uibRtS .uibS.uibS.uibS.uibModal,.uibRtS .uibS.uibS.uibS [data-n]{pointer-events:auto}
`;
{const st=document.createElement('style');st.id='uibCss';st.textContent=CSS;document.head.append(st)}

/* ===================== 상태 ===================== */
const UK='thaniya.uib.v1';
const U={doc:null,sel:[],z:1,px:40,py:40,zoom:'fit',grid:false,guide:true,snap:true,preview:false,dev:'hd',rot:false,fold:new Set(['css']),col:new Set(),
  undo:[],redo:[],pend:null,clip:null,dom:new Map(),hov:null,space:false,edit:null,drag:null,first:true};
try{const v=JSON.parse(localStorage.getItem(UK));if(v&&typeof v==='object'){U.grid=!!v.grid;U.guide=v.guide!==false;U.snap=v.snap!==false;if(Array.isArray(v.fold))U.fold=new Set(v.fold);if(typeof v.doc==='string')U.doc=v.doc}}catch(e){}
const saveU=()=>{try{localStorage.setItem(UK,JSON.stringify({grid:U.grid,guide:U.guide,snap:U.snap,fold:[...U.fold],doc:U.doc}))}catch(e){}};
const nid=()=>'u'+uid()+uid().slice(0,3);
const J=x=>JSON.stringify(x),CL=x=>JSON.parse(JSON.stringify(x));
const r2=v=>Math.round(v*100)/100;
const num=(v,d)=>{v=+v;return isFinite(v)?v:d};
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const T=s=>_t(s);
let tstT=0;
function toast(m){if(!U.full){__uibHost.toast(m);return}let t=BOX.querySelector('.uibToast');if(!t){t=document.createElement('div');t.className='uibToast';t.setAttribute('role','status');BOX.append(t)}t.textContent=m;t.classList.add('on');clearTimeout(tstT);tstT=setTimeout(()=>t.classList.remove('on'),2600)}

/* ===================== 데이터 ===================== */
function normNode(n,root){
  if(!n||typeof n!=='object')n={};
  n.id=String(n.id||nid());
  n.type=root?'root':(TYPES[n.type]?n.type:'panel');
  const td=TYPES[n.type]||{d:{st:{},pr:{layout:'none',gap:12,pad:0,jc:'start',ai:'start'}}};
  n.name=String(n.name==null?(root?'새 UI':T(td.n)):n.name).slice(0,60);
  n.ax=['l','c','r','s'].includes(n.ax)?n.ax:'l';n.ay=['t','m','b','s'].includes(n.ay)?n.ay:'t';
  ['x','xr','y','yr'].forEach(k=>n[k]=num(n[k],0));
  n.w=Math.max(1,num(n.w,td.d.w||100));n.h=Math.max(1,num(n.h,td.d.h||40));
  n.fx=!!n.fx;n.fy=!!n.fy;n.hidden=!!n.hidden;n.locked=!!n.locked;
  n.st=Object.assign({},n.st&&typeof n.st==='object'?n.st:{});
  n.pr=Object.assign({},CL(td.d.pr||{}),n.pr&&typeof n.pr==='object'?n.pr:{});
  if(n.type==='button')n.act=Object.assign({t:'none'},n.act&&typeof n.act==='object'?n.act:{});else delete n.act;
  n.css=typeof n.css==='string'?n.css.slice(0,4000):'';
  n.kids=isBox(n)&&Array.isArray(n.kids)?n.kids.map(k=>normNode(k,false)):[];
  return n;
}
function normDoc(d){
  if(!d||typeof d!=='object')d={};
  d.id=String(d.id||('uid_'+uid()));d.name=String(d.name||T('새 UI')).slice(0,60);
  d.w=cl(Math.round(num(d.w,1280)),64,8192);d.h=cl(Math.round(num(d.h,720)),64,8192);
  d.show=d.show==='manual'?'manual':'start';d.scene=typeof d.scene==='string'?d.scene:'';
  d.scale=d.scale==='none'?'none':'fit';d.match=cl(num(d.match,.5),0,1);d.modal=!!d.modal;
  d.root=normNode(d.root,true);d.root.name=d.name;
  if(d.root.st.bgA==null)d.root.st.bgA=0;
  return d;
}
const NORM=new WeakSet();
/* 작업 중인 화면 하나 (초안): P.uibDraft = {doc, src:{sid 씬 id, gid UI 그룹 id}|null, saved:마지막 저장 때 스냅샷}
   저장하면 고른 씬의 UI 그룹으로 들어감 (그룹 g.uib = 빌더 원본 · 그룹 안 UI 요소 = 엔진이 그리는 사본, u.uibN = 노드 id) */
function DR(){let r=P.uibDraft;if(!r||typeof r!=='object'||!r.doc||typeof r.doc!=='object'){const nd=newDoc();try{const m=cur();if(m&&m.uiCv){nd.w=m.uiCv.w;nd.h=m.uiCv.h}}catch(e){}r=P.uibDraft={doc:nd,src:null,saved:null}}if(!NORM.has(r.doc)){normDoc(r.doc);NORM.add(r.doc)}return r}
function docs(){return[DR().doc]}
function D(){return DR().doc}
const isDirty=()=>{const r=DR();return J(r.doc)!==r.saved&&(r.saved!=null||r.doc.root.kids.length>0)};
function walk(n,fn,p,depth){fn(n,p||null,depth||0);(n.kids||[]).forEach(k=>walk(k,fn,n,(depth||0)+1))}
let MAP=new Map();
function reindex(){MAP=new Map();const d=D();if(d)walk(d.root,(n,p,dp)=>MAP.set(n.id,{n,p,dp}))}
const nodeOf=id=>{const r=MAP.get(id);return r?r.n:null};
const parOf=n=>{const r=n&&MAP.get(n.id);return r?r.p:null};
const isRoot=n=>!!n&&n.type==='root';
const flowOf=p=>!!p&&(p.pr.layout==='row'||p.pr.layout==='col');
function isAnc(a,b){let p=parOf(b);while(p){if(p===a)return true;p=parOf(p)}return false}
function uniq(names,base){base=String(base||'').trim()||'UI';if(!names.includes(base))return base;const m=/^(.*?)(?:\s*\d+)?$/.exec(base),b=m?m[1]:base;let i=2;while(names.includes(b+' '+i))i++;return b+' '+i}
function newNode(type,over){
  const td=TYPES[type],n=normNode(Object.assign({type,name:T(td.n)},CL(td.d),over||{}),false);
  if(over&&over.st)n.st=Object.assign({},CL(td.d.st||{}),over.st);else n.st=Object.assign({},CL(td.d.st||{}),n.st);
  if(over&&over.pr)n.pr=Object.assign({},CL(td.d.pr||{}),over.pr);
  if(td.d.act)n.act=Object.assign({},td.d.act,over&&over.act||{});
  return n;
}
function newDoc(name){let cw=U.lastW||1280,ch=U.lastH||720;try{const m=cur();if(m&&m.uiCv&&!U.lastW){cw=m.uiCv.w;ch=m.uiCv.h}}catch(e){}return normDoc({name:name||T('새 UI'),w:cw,h:ch,root:{type:'root',st:{bgA:0},pr:{layout:'none',gap:12,pad:0,jc:'start',ai:'start'},kids:[]}})}
const sel=()=>U.sel.map(nodeOf).filter(Boolean);
const prim=()=>nodeOf(U.sel[U.sel.length-1])||null;

/* ===================== 실행 취소 · 저장 ===================== */
const snap=()=>J({doc:DR().doc,src:DR().src,sel:U.sel});
function begin(){if(!U.pend)U.pend=snap()}
function commit(){
  if(!U.pend)return;const b=U.pend;U.pend=null;const a=snap();if(a===b)return;
  U.undo.push(b);if(U.undo.length>150)U.undo.shift();U.redo=[];mark();
}
function edit(fn){begin();fn();commit();}
function restore(s){const o=JSON.parse(s),r=DR();r.doc=o.doc;r.src=o.src||null;U.sel=o.sel||[];D();}
function undoStep(redo){
  const from=redo?U.redo:U.undo,to=redo?U.undo:U.redo;if(!from.length){toast(redo?T('다시 실행할 UI 편집이 없습니다'):T('되돌릴 UI 편집이 없습니다'));return}
  to.push(snap());restore(from.pop());mark();renderAll();
}
function mark(){dirty=true;try{renderStatus()}catch(e){}clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(true),1500);try{renderBarSrc()}catch(e){}hostEv('edit',null)}
let hsT=0;function hostSync(){clearTimeout(hsT);hsT=setTimeout(()=>{try{__uibHost.renderHier()}catch(e){}try{__uibHost.renderInsp()}catch(e){}try{need()}catch(e){}},120)}

/* ===================== 좌표 (앵커) ===================== */
/* 부모 안에서의 사각형 (왼쪽 위 기준, 디자인 px) ↔ 앵커 값 */
function getX(n,pw){switch(n.ax){case'r':return pw-n.x-n.w;case'c':return pw/2+n.x-n.w/2;case's':return n.x;default:return n.x}}
function getW(n,pw){return n.ax==='s'?Math.max(1,pw-n.x-n.xr):n.w}
function getY(n,ph){switch(n.ay){case'b':return ph-n.y-n.h;case'm':return ph/2+n.y-n.h/2;case's':return n.y;default:return n.y}}
function getH(n,ph){return n.ay==='s'?Math.max(1,ph-n.y-n.yr):n.h}
function setX(n,pw,x,w){w=Math.max(1,w);n.w=r2(w);switch(n.ax){case'r':n.x=r2(pw-x-w);break;case'c':n.x=r2(x+w/2-pw/2);break;case's':n.x=r2(x);n.xr=r2(pw-x-w);break;default:n.x=r2(x)}}
function setY(n,ph,y,h){h=Math.max(1,h);n.h=r2(h);switch(n.ay){case'b':n.y=r2(ph-y-h);break;case'm':n.y=r2(y+h/2-ph/2);break;case's':n.y=r2(y);n.yr=r2(ph-y-h);break;default:n.y=r2(y)}}
/* 부모 크기 (디자인 px) — 그려진 DOM에서 잼 (transform 영향 없음) */
function psize(p){const d=D();if(!p||isRoot(p))return{w:d.w,h:d.h};const el=U.dom.get(p.id);return el?{w:el.clientWidth||p.w,h:el.clientHeight||p.h}:{w:p.w,h:p.h}}
function relRect(n){const p=parOf(n),s=psize(p);
  if(flowOf(p)){const r=domRect(n),pr=domRect(p);return r&&pr?{x:r.x-pr.x,y:r.y-pr.y,w:r.w,h:r.h,pw:s.w,ph:s.h}:{x:0,y:0,w:n.w,h:n.h,pw:s.w,ph:s.h}}
  return{x:getX(n,s.w),y:getY(n,s.h),w:getW(n,s.w),h:getH(n,s.h),pw:s.w,ph:s.h}}
function setRel(n,x,y,w,h){const p=parOf(n),s=psize(p);
  if(flowOf(p)){if(Math.abs(w-relRect(n).w)>.01){n.w=r2(Math.max(1,w));n.fx=false}if(Math.abs(h-relRect(n).h)>.01){n.h=r2(Math.max(1,h));n.fy=false}return}
  setX(n,s.w,x,w);setY(n,s.h,y,h)}
/* 화면(디자인) 좌표의 사각형: DOM 측정 */
let SR=null;  /* 화면 요소의 화면 좌표 (렌더 후 갱신) */
function domRect(n){const d=D();if(isRoot(n))return{x:0,y:0,w:d.w,h:d.h};const el=U.dom.get(n.id);if(!el||!SR)return null;const r=el.getBoundingClientRect();if(!r.width&&!r.height&&el.offsetParent===null)return null;return{x:(r.left-SR.left)/U.z,y:(r.top-SR.top)/U.z,w:r.width/U.z,h:r.height/U.z}}
function setAnchor(n,ax,ay,move){
  const r=relRect(n);if(ax)n.ax=ax;if(ay)n.ay=ay;
  let{x,y,w,h}=r;
  if(move){
    if(ax==='l')x=0;else if(ax==='r')x=r.pw-w;else if(ax==='c')x=(r.pw-w)/2;else if(ax==='s'){x=0;w=r.pw}
    if(ay==='t')y=0;else if(ay==='b')y=r.ph-h;else if(ay==='m')y=(r.ph-h)/2;else if(ay==='s'){y=0;h=r.ph}
  }
  if(!flowOf(parOf(n))){setX(n,r.pw,x,w);setY(n,r.ph,y,h)}
}

/* ===================== 그리기 (노드 → HTML/CSS) ===================== */
const px=v=>r2(v)+'px';
function col(hex,a){
  if(!hex||typeof hex!=='string')return'transparent';let h=hex.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');if(!/^[0-9a-f]{6}$/i.test(h))return hex;
  a=a==null?1:+a;if(a>=1)return'#'+h;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return`rgba(${r},${g},${b},${r2(a)})`;
}
const SPR=new Map();
function sprUrl(ref){
  if(!ref)return'';if(SPR.has(ref))return SPR.get(ref);
  let u='';try{const sr=spriteRef(ref);if(sr&&sr.a.img){const c=document.createElement('canvas');c.width=Math.max(1,sr.r.w);c.height=Math.max(1,sr.r.h);const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(sr.a.img,sr.r.x,sr.r.y,sr.r.w,sr.r.h,0,0,sr.r.w,sr.r.h);u=c.toDataURL()}}catch(e){u=''}
  if(u)SPR.set(ref,u);return u;
}
function famOf(key){try{return fontFamily(key||'')}catch(e){return'"IBM Plex Sans KR",sans-serif'}}
const JC={start:'flex-start',center:'center',end:'flex-end',between:'space-between',around:'space-evenly'},AI={start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'};
const TA={left:'flex-start',center:'center',right:'flex-end'},VA={top:'flex-start',middle:'center',bottom:'flex-end'};
/* 노드 하나의 CSS (속성 → 값) */
function cssOf(n,p){
  const s=n.st||{},o={},t=n.type,root=isRoot(n);
  if(root){o.position='absolute';o.inset='0';o.overflow='hidden'}
  else if(flowOf(p)){
    o.position='relative';o.flex='none';const row=p.pr.layout==='row';
    if(row){if(n.fx){o.flex='1 1 0';o['min-width']='0'}else o.width=px(n.w);if(n.fy)o['align-self']='stretch';else o.height=px(n.h)}
    else{if(n.fy){o.flex='1 1 0';o['min-height']='0'}else o.height=px(n.h);if(n.fx)o['align-self']='stretch';else o.width=px(n.w)}
  }else{
    o.position='absolute';
    if(n.ax==='l'){o.left=px(n.x);o.width=px(n.w)}else if(n.ax==='r'){o.right=px(n.x);o.width=px(n.w)}
    else if(n.ax==='c'){o.left=`calc(50% + ${px(n.x-n.w/2)})`;o.width=px(n.w)}else{o.left=px(n.x);o.right=px(n.xr)}
    if(n.ay==='t'){o.top=px(n.y);o.height=px(n.h)}else if(n.ay==='b'){o.bottom=px(n.y);o.height=px(n.h)}
    else if(n.ay==='m'){o.top=`calc(50% + ${px(n.y-n.h/2)})`;o.height=px(n.h)}else{o.top=px(n.y);o.bottom=px(n.yr)}
  }
  const bgs=[];
  if(s.img&&(t==='panel'||t==='button'||root)){const u=sprUrl(s.img);if(u){bgs.push(`url(${u})`);const f=s.imgFit||'stretch';o['background-size']=f==='stretch'?'100% 100%':f==='tile'?'auto':f;o['background-repeat']=f==='tile'?'repeat':'no-repeat';o['background-position']='center';if(s.pix!==false)o['image-rendering']='pixelated'}}
  if(t==='image'){const u=sprUrl(n.pr.src);if(u){bgs.push(`url(${u})`);const f=n.pr.fit||'contain';o['background-size']=f==='stretch'?'100% 100%':f;if(n.pr.pix!==false)o['image-rendering']='pixelated'}}
  const bgc=t==='slider'||t==='toggle'?(s.bgA>0?col(s.bg,s.bgA):''):(s.bg&&s.bgA>0?col(s.bg,s.bgA):'');
  if(s.grad&&s.bg2&&bgc){bgs.push(`linear-gradient(${num(s.ga,180)}deg,${bgc},${col(s.bg2,s.bgA)})`)}
  else if(bgc)o['background-color']=bgc;
  if(bgs.length)o['background-image']=bgs.join(',');
  const sh=[];if(s.bw>0)sh.push(`inset 0 0 0 ${px(s.bw)} ${col(s.bc||'#ffffff',s.bcA==null?1:s.bcA)}`);if(s.sh>0)sh.push(SHADOW[s.sh]||SHADOW[1]);if(sh.length)o['box-shadow']=sh.join(',');
  if(s.radius>0)o['border-radius']=px(s.radius);
  if(s.op!=null&&s.op<1)o.opacity=r2(cl(s.op,0,1));
  if(s.blur>0)o['backdrop-filter']=`blur(${px(s.blur)})`;
  if(TYPES[t]&&TYPES[t].txt||t==='input'||t==='dropdown'){
    if(s.color)o.color=s.color;o['font-size']=px(s.fs||16);if(s.fw)o['font-weight']=String(s.fw);o['font-family']=famOf(s.font);
    if(s.it)o['font-style']='italic';if(s.lh)o['line-height']=String(s.lh);if(s.ls)o['letter-spacing']=px(s.ls);
  }
  if(TYPES[t]&&TYPES[t].txt){
    o.display='flex';o['align-items']=VA[s.va||'middle'];o['justify-content']=t==='toggle'?'flex-start':TA[s.ta||'left'];o['text-align']=s.ta||'left';
    if(s.pad>0)o.padding=`0 ${px(s.pad)}`;if(t==='button')o.overflow='hidden';
  }
  if(isBox(n)){
    const L=n.pr.layout;
    if(L==='row'||L==='col'){o.display='flex';o['flex-direction']=L==='row'?'row':'column';o.gap=px(n.pr.gap||0);o['justify-content']=JC[n.pr.jc||'start'];o['align-items']=AI[n.pr.ai||'start'];if(n.pr.wrap)o['flex-wrap']='wrap'}
    if(n.pr.pad>0&&L&&L!=='none')o.padding=px(n.pr.pad);
    if(n.pr.clip&&!root)o.overflow='hidden';
  }
  if(t==='progress')o.overflow='hidden';
  if(n.hidden)o.display='none';
  return o;
}
const cssText=o=>Object.entries(o).map(([k,v])=>k+':'+v).join(';');
function arrowSvg(c){return`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='${c||'#fff'}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>`)}")`}
const pct=(v,a,b)=>b>a?cl((v-a)/(b-a)*100,0,100):0;
/* mode: 'edit' (빌더 캔버스) · 'play' (게임 위) · 'export' (HTML 내보내기) */
function build(n,p,mode,dom){
  const t=n.type,s=n.st||{},pr=n.pr||{},el=document.createElement(t==='button'&&mode!=='edit'?'button':'div');
  el.className='uE uE-'+t;el.dataset.n=n.id;if(mode==='export'&&n.name)el.dataset.name=n.name;
  el.style.cssText=cssText(cssOf(n,p))+(n.css?';'+n.css:'');
  if(t==='text'||t==='button'){const sp=document.createElement('span');sp.className='t';sp.textContent=pr.text==null?'':String(pr.text);el.append(sp)}
  else if(t==='toggle'){
    if(pr.checked)el.classList.add('on');el.setAttribute('role','checkbox');el.setAttribute('aria-checked',pr.checked?'true':'false');if(mode!=='edit')el.tabIndex=0;
    const bx=document.createElement('span');bx.className='bx';const z=num(pr.bx,20);bx.style.cssText=`width:${px(z)};height:${px(z)};background:${pr.checked?col(s.ac||'#3b82f6',1):col(s.tr||'#3a4050',1)}`;
    bx.innerHTML='<svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.6"/></svg>';el.append(bx);
    const sp=document.createElement('span');sp.className='t';sp.textContent=pr.text||'';el.append(sp);
  }else if(t==='slider'){
    const i=document.createElement('input');i.type='range';i.className='uR';i.min=num(pr.min,0);i.max=num(pr.max,100);i.step=num(pr.step,1)||'any';i.value=num(pr.value,0);i.setAttribute('value',i.value);
    i.style.cssText=`--ac:${col(s.ac||'#3b82f6',1)};--tr:${col(s.tr||'#3a4050',1)};--kc:${col(s.kc||'#ffffff',1)};--tk:${px(num(pr.tk,6))};--kb:${px(num(pr.kb,18))};--p:${pct(+i.value,+i.min,+i.max)}%`;
    if(mode==='edit')i.tabIndex=-1;el.append(i);
  }else if(t==='input'){
    const i=document.createElement('input');i.type=pr.itype==='password'?'password':pr.itype==='number'?'number':'text';i.value=pr.value==null?'':String(pr.value);if(i.value)i.setAttribute('value',i.value);i.placeholder=pr.ph||'';if(pr.max>0)i.maxLength=pr.max;
    i.style.cssText=`padding:0 ${px(num(s.pad,12))};color:inherit;font:inherit`;if(mode==='edit'){i.tabIndex=-1;i.readOnly=true}el.append(i);
  }else if(t==='dropdown'){
    const sl=document.createElement('select');String(pr.opts||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach((x,k)=>{const o=document.createElement('option');o.value=k;o.textContent=x;if(k===Math.round(num(pr.value,0)))o.setAttribute('selected','');sl.append(o)});
    sl.value=String(num(pr.value,0));sl.style.cssText=`line-height:${px(Math.max(1,n.h-2))};padding:0 ${px(num(s.pad,12))};color:inherit;font:inherit;background-image:${arrowSvg(s.color||'#fff')}`;if(mode==='edit')sl.tabIndex=-1;el.append(sl);
  }else if(t==='progress'){const f=document.createElement('div');f.className='fill';f.style.cssText=`width:${pct(num(pr.value,0),num(pr.min,0),num(pr.max,100))}%;background:${col(s.ac||'#22c55e',1)}`;el.append(f)}
  else if(t==='image'&&!sprUrl(pr.src)){el.classList.add('ph');if(mode==='edit')el.textContent=T('이미지')}
  if(dom)dom.set(n.id,el);
  (n.kids||[]).forEach(k=>el.append(build(k,n,mode,dom)));
  return el;
}

/* ===================== 창 DOM ===================== */
const BOX=(panelEl.uib&&panelEl.uib.querySelector('#uibBox'))||document.createElement('div');
BOX.className='uib';BOX.tabIndex=-1;
BOX.innerHTML=`<div class="uibBar" role="toolbar" aria-label="UI 빌더 도구">
  <button class="uibIb uibNb" data-a="showL" title="계층 구조 · 요소" aria-label="계층 구조 · 요소">${IC.hier}</button>
  <span class="uibSrc" title="지금 편집 중인 UI 그룹"></span>
  <span class="sep"></span>
  <select data-k="dev" aria-label="화면 크기" title="화면 크기 (게임 뷰와 같은 기기 목록)"></select>
  <input type="number" data-k="w" min="64" max="8192" aria-label="가로" title="가로 (px)"><span class="x">×</span><input type="number" data-k="h" min="64" max="8192" aria-label="세로" title="세로 (px)">
  <button class="uibIb" data-a="rot" title="가로 ↔ 세로" aria-label="가로 세로 바꾸기">${IC.rot}</button>
  <select data-k="zoom" aria-label="확대" title="확대 (Ctrl+휠 · Ctrl+0 맞춤 · Ctrl+1 100%)"><option value="fit">맞춤</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select>
  <span class="sep"></span>
  <button class="uibIb" data-a="grid" title="격자 보기" aria-label="격자">${IC.grid}</button>
  <button class="uibIb" data-a="guide" title="가이드라인 (가운데 선 · 안전 영역 5%)" aria-label="가이드라인">${IC.guide}</button>
  <button class="uibIb" data-a="snap" title="스마트 가이드에 붙이기 (Alt를 누르면 잠시 끔)" aria-label="스냅">${IC.magnet}</button>
  <span class="sep"></span>
  <button class="uibIb" data-a="undo" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소">${IC.undo}</button>
  <button class="uibIb" data-a="redo" title="다시 실행 (Ctrl+Shift+Z)" aria-label="다시 실행">${IC.redo}</button>
  <button class="uibIb danger" data-a="reset" title="이 UI 화면의 요소를 모두 지웁니다 (확인 후 · Ctrl+Z로 되돌리기 가능)">${IC.reset}<span>UI 초기화</span></button>
  <button class="uibIb" data-a="preview" title="미리보기: 버튼·체크박스·슬라이더를 직접 눌러 봅니다" aria-label="미리보기">${IC.play}<span>미리보기</span></button>
  <span style="flex:1 0 8px"></span>
  <button class="uibIb" data-a="export" title="HTML 파일로 내보내기">HTML</button>
  <button class="uibIb pri" data-a="save" title="프로젝트 저장 (Ctrl+S) · UI 화면은 프로젝트와 함께 저장됩니다">저장</button>
  <button class="uibIb" data-a="full" title="전체 화면 (Shift+Space · Esc: 돌아가기)" aria-label="전체 화면">${IC.fsOn}</button>
  <button class="uibIb uibNb" data-a="showR" title="속성" aria-label="속성">${IC.props}</button>
</div>
<div class="uibBody">
  <div class="uibLeft">
    <div class="uibCap"><span>계층 구조</span><span class="spacer"></span></div>
    <div class="uibHier" role="tree" aria-label="UI 계층 구조"></div>
    <div class="uibLib"><div class="uibCap" style="padding:8px 2px 6px"><span>요소</span><span class="spacer"></span><small style="font-weight:400">끌어다 놓기 · 클릭으로 추가</small></div><div class="uibLibG"></div></div>
  </div>
  <div class="uibView" aria-label="UI 캔버스"><div class="uibScr"></div><div class="uibOver"></div><span class="uibZoomI"></span></div>
  <div class="uibRight" aria-label="UI 속성"></div>
</div>`;
const q=s=>BOX.querySelector(s);
const E={bar:q('.uibBar'),src:q('.uibSrc'),dev:q('[data-k=dev]'),w:q('[data-k=w]'),h:q('[data-k=h]'),zoom:q('[data-k=zoom]'),hier:q('.uibHier'),lib:q('.uibLibG'),view:q('.uibView'),scr:q('.uibScr'),over:q('.uibOver'),zi:q('.uibZoomI'),insp:q('.uibRight')};
E.lib.innerHTML=LIB.map(k=>`<div class="uibLi" data-lib="${k}" title="${esc(T(TYPES[k].tip))}" role="button" tabindex="0">${IC[k]}<span>${esc(T(TYPES[k].n))}</span></div>`).join('');

/* ===================== 렌더 ===================== */
function renderAll(){reindex();fixSel();renderBar();renderStage();renderHier();renderInsp()}
function fixSel(){U.sel=U.sel.filter(id=>MAP.has(id))}
function devList(){
  const out=[];try{GV_DEV.forEach(g=>g.items.forEach(d=>{if(d.w)out.push({id:d.id,n:d.n,w:d.w,h:d.h,g:g.g})}));(GV.mine||[]).forEach(m=>out.push({id:'my:'+m.id,n:m.n,w:m.w,h:m.h,g:'내 해상도'}))}catch(e){}
  if(!out.length)out.push({id:'hd',n:'HD',w:1280,h:720,g:'모니터'},{id:'fhd',n:'Full HD',w:1920,h:1080,g:'모니터'});
  return out;
}
function curDev(d){const L0=devList();return L0.find(x=>(x.w===d.w&&x.h===d.h)||(x.w===d.h&&x.h===d.w))||null}
function srcInfo(){const r=DR(),s=r.src;if(!s)return null;const m=(P.maps||[]).find(x=>x.id===s.sid),g=m&&(m.uiGroups||[]).find(x=>x.id===s.gid);return m&&g?{m,g}:null}
function renderBarSrc(){
  const si=srcInfo(),dt=isDirty();
  E.src.innerHTML=`${IC.screen}${si?`<span class="sc" data-i18n-skip>${esc(si.m.name)}</span><span class="ar">›</span><b data-i18n-skip>${esc(si.g.name)}</b>`:`<b>${esc(T('새 UI 그룹'))}</b><span class="sc">${esc(T('아직 저장 안 함'))}</span>`}${dt?`<i class="dt" title="${esc(T('저장하지 않은 변경'))}"></i>`:''}`;
}
function renderBar(){
  const d=D();renderBarSrc();
  const L0=devList(),gs=[...new Set(L0.map(x=>x.g))],cd=d&&curDev(d);
  E.dev.innerHTML=`<option value="custom">${esc(T('사용자 지정'))}</option>`+gs.map(g=>`<optgroup label="${esc(T(g))}">${L0.filter(x=>x.g===g).map(x=>`<option value="${esc(x.id)}">${esc(x.n)} · ${x.w}×${x.h}</option>`).join('')}</optgroup>`).join('');
  E.dev.value=cd?cd.id:'custom';
  if(d){if(document.activeElement!==E.w)E.w.value=d.w;if(document.activeElement!==E.h)E.h.value=d.h}
  E.zoom.value=U.zoom==='fit'?'fit':([...E.zoom.options].some(o=>o.value===String(U.zoom))?String(U.zoom):'fit');
  const tg=(a2,on)=>{const b=E.bar.querySelector(`[data-a=${a2}]`);if(b)b.classList.toggle('on',!!on)};
  tg('grid',U.grid);tg('guide',U.guide);tg('snap',U.snap);tg('preview',U.preview);
  E.bar.querySelector('[data-a=undo]').disabled=!U.undo.length;E.bar.querySelector('[data-a=redo]').disabled=!U.redo.length;
  [E.dev,E.w,E.h,E.bar.querySelector('[data-a=rot]')].forEach(x=>x.disabled=!d);
  E.bar.querySelector('[data-a=reset]').disabled=!d||(!d.root.kids.length&&!d.root.st.bg&&!d.root.st.img);
}
function renderStage(){
  const d=D();U.dom=new Map();E.scr.innerHTML='';
  if(!d){E.scr.style.display='none';E.over.innerHTML='';return}
  E.scr.style.display='';E.scr.style.width=d.w+'px';E.scr.style.height=d.h+'px';
  const root=build(d.root,null,U.preview?'play':'edit',U.dom);root.classList.add('uibS');if(!U.preview)root.classList.add('edit');
  E.scr.append(root);
  if(U.grid&&!U.preview){const g=document.createElement('div');g.className='uibGrid';g.style.setProperty('--g',(U.z<.5?32:U.z<1?16:8)+'px');E.scr.append(g)}
  if(U.guide&&!U.preview){const g=document.createElement('div');g.className='uibGd';const lw=1/U.z;g.innerHTML=`<i style="left:50%;top:0;bottom:0;width:${lw}px"></i><i style="top:50%;left:0;right:0;height:${lw}px"></i><b style="border-width:${lw}px"></b>`;E.scr.append(g)}
  place();
}
/* 확대·이동 적용 + 오버레이 */
function place(){
  const d=D();if(!d)return;
  if(U.zoom==='fit')fitZoom(false);
  E.scr.style.transform=`translate(${r2(U.px)}px,${r2(U.py)}px) scale(${U.z})`;
  E.zi.textContent=Math.round(U.z*100)+'%';
  drawOver();
}
function fitZoom(apply){
  const d=D();if(!d)return;const vw=E.view.clientWidth,vh=E.view.clientHeight;if(vw<40||vh<40)return;
  const z=cl(Math.min((vw-64)/d.w,(vh-72)/d.h),.05,4);U.z=Math.round(z*1000)/1000;U.px=Math.round((vw-d.w*U.z)/2);U.py=Math.round((vh-d.h*U.z)/2+8);
  if(apply)place();
}
function setZoom(z,cx,cy){
  const d=D();if(!d)return;z=cl(z,.05,8);const vr=E.view.getBoundingClientRect();
  if(cx==null){cx=vr.width/2;cy=vr.height/2}
  U.px=cx-(cx-U.px)*z/U.z;U.py=cy-(cy-U.py)*z/U.z;U.z=z;U.zoom=z;E.zoom.value=[...E.zoom.options].some(o=>+o.value===z)?String(z):'';
  renderStage();
}
function vr(){return E.view.getBoundingClientRect()}
/* 디자인 좌표 → 뷰 좌표 */
const vx=x=>U.px+x*U.z,vy=y=>U.py+y*U.z;
function drawOver(extra){
  const d=D();if(!d){E.over.innerHTML='';return}
  SR=E.scr.getBoundingClientRect();
  let h='';
  /* 화면 이름 · 크기 · 프레임 손잡이 */
  h+=`<div class="uibFl" style="left:${vx(0)}px;top:${vy(0)}px" data-fl="1"><b data-i18n-skip>${esc(d.name)}</b><span>${d.w} × ${d.h}</span></div>`;
  if(!U.preview)h+=`<div class="uibFh e" data-fh="e" style="left:${vx(d.w)}px;top:${vy(0)}px;height:${d.h*U.z}px"></div><div class="uibFh s" data-fh="s" style="left:${vx(0)}px;top:${vy(d.h)}px;width:${d.w*U.z}px"></div><div class="uibFh se" data-fh="se" style="left:${vx(d.w)}px;top:${vy(d.h)}px" title="${esc(T('끌어서 화면 크기 바꾸기'))}"></div>`;
  if(!U.preview){
    const hv=U.hov&&nodeOf(U.hov);
    if(hv&&!U.sel.includes(hv.id)&&!isRoot(hv)&&!U.drag){const r=domRect(hv);if(r)h+=`<div class="uibHov" style="${boxCss(r)}"></div>`}
    const S=sel().filter(n=>!isRoot(n));
    if(S.length===1){const p=parOf(S[0]);if(p&&!isRoot(p)){const r=domRect(p);if(r)h+=`<div class="uibPar" style="${boxCss(r)}"></div>`}}
    S.forEach(n=>{const r=domRect(n);if(r)h+=`<div class="uibSelB${S.length>1?' multi':''}${flowOf(parOf(n))?' flow':''}" style="${boxCss(r)}"></div>`});
    if(S.length===1&&!S[0].locked){
      const n=S[0],r=domRect(n);
      if(r){const fl=flowOf(parOf(n)),x0=vx(r.x),y0=vy(r.y),x1=vx(r.x+r.w),y1=vy(r.y+r.h),xm=(x0+x1)/2,ym=(y0+y1)/2;
        const H0=fl?[['e',x1,ym],['s',xm,y1],['se',x1,y1]]:[['nw',x0,y0],['n',xm,y0],['ne',x1,y0],['e',x1,ym],['se',x1,y1],['s',xm,y1],['sw',x0,y1],['w',x0,ym]];
        if(x1-x0<18||y1-y0<18)H0.splice(0,H0.length,...H0.filter(q0=>q0[0].length===2||fl));
        h+=H0.map(([k,x,y])=>`<div class="uibH" data-h="${k}" style="left:${x}px;top:${y}px"></div>`).join('');
        h+=`<div class="uibSz" style="left:${xm}px;top:${y1}px">${Math.round(r.w)} × ${Math.round(r.h)}</div>`}
    }else if(S.length>1){const b=bounds(S.map(domRect).filter(Boolean));if(b)h+=`<div class="uibSelB" style="${boxCss(b)}"></div><div class="uibSz" style="left:${vx(b.x+b.w/2)}px;top:${vy(b.y+b.h)}px">${Math.round(b.w)} × ${Math.round(b.h)}</div>`}
  }
  if(extra)h+=extra;
  if(U.preview)h+=`<div class="uibPv">${esc(T('미리보기 중 · 직접 눌러 보세요 (Esc: 끝내기)'))}</div>`;
  E.over.innerHTML=h;
}
const boxCss=r=>`left:${vx(r.x)}px;top:${vy(r.y)}px;width:${Math.max(1,r.w*U.z)}px;height:${Math.max(1,r.h*U.z)}px`;
function bounds(rs){if(!rs.length)return null;const x=Math.min(...rs.map(r=>r.x)),y=Math.min(...rs.map(r=>r.y)),X=Math.max(...rs.map(r=>r.x+r.w)),Y=Math.max(...rs.map(r=>r.y+r.h));return{x,y,w:X-x,h:Y-y}}

/* ---- 계층 구조 ---- */
function renderHier(){
  const d=D();if(!d){E.hier.innerHTML=`<p class="uibHint" style="padding:10px">${esc(T('UI 화면이 없습니다. 위의 ＋로 만드세요.'))}</p>`;return}
  let h='';
  walk(d.root,(n,p,dp)=>{
    let a=p;while(a){if(U.col.has(a.id))return;a=parOf(a)}
    const root=isRoot(n),kids=n.kids.length,open=!U.col.has(n.id);
    h+=`<div class="uibRow${U.sel.includes(n.id)||(root&&!U.sel.length)?' on':''}${root?' root':''}${open?' open':''}${n.hidden?' dim':''}" data-id="${n.id}" style="--d:${dp}" role="treeitem" aria-selected="${U.sel.includes(n.id)}">`+
      `<button class="cr${kids?'':' no'}" data-cr="${n.id}" tabindex="-1" aria-label="펼치기">${IC.caret}</button><span class="ty">${root?ico('folder'):IC[n.type]}</span><span class="nm" data-i18n-skip>${esc(n.name)}</span>`+
      (root?`<small style="color:var(--mute)">${d.w}×${d.h}</small>`:`<button class="tg${n.locked?' act':''}" data-lock="${n.id}" title="${esc(T(n.locked?'잠금 풀기':'잠그기 (캔버스에서 선택 안 됨)'))}">${n.locked?IC.lock:IC.unlock}</button><button class="tg${n.hidden?' act':''}" data-eye="${n.id}" title="${esc(T(n.hidden?'보이기':'숨기기 (플레이 시작 때도 숨김)'))}">${n.hidden?IC.eyeOff:IC.eye}</button>`)+`</div>`;
  });
  E.hier.innerHTML=h;
}

/* ---- 인스펙터 ---- */
const fmt=v=>{v=+v;return isFinite(v)?String(Math.round(v*100)/100):'0'};
const sec=(k,title,body,sub)=>`<section class="uibSec${U.fold.has(k)?' closed':''}"><button type="button" class="uibSh" data-fold="${k}">${esc(T(title))}${sub?`<small>${sub}</small>`:''}</button><div class="uibSb">${body}</div></section>`;
const row=(l,c,tip)=>`<div class="uibR"${tip?` title="${esc(T(tip))}"`:''}><span class="l">${l?esc(T(l)):''}</span><div class="c">${c}</div></div>`;
const numI=(f,v,o)=>{o=o||{};return`<label class="uibN"${o.tip?` title="${esc(T(o.tip))}"`:''}><span data-scrub="${f}" data-step="${o.step||1}"${o.min!=null?` data-min="${o.min}"`:''}${o.max!=null?` data-max="${o.max}"`:''}>${esc(o.lab||'')}</span><input type="number" data-f="${f}" data-t="num" value="${fmt(v)}" step="${o.step||1}"${o.min!=null?` min="${o.min}"`:''}${o.max!=null?` max="${o.max}"`:''}${o.dis?' disabled':''}></label>`};
const colI=(f,v,a)=>`<span class="uibCol"><input type="color" data-f="${f}" data-t="str" value="${esc(/^#[0-9a-f]{6}$/i.test(v||'')?v:'#ffffff')}"><input type="text" data-f="${f}" data-t="hex" value="${esc(v||'')}" maxlength="7" spellcheck="false" placeholder="${esc(T('없음'))}">${a?numI(a,Math.round(num(av(a),1)*100),{lab:'%',min:0,max:100,step:5,tip:'불투명도 (%)'}):''}</span>`;
const selI=(f,v,opts,re)=>`<select data-f="${f}" data-t="str"${re?' data-re="1"':''}>${opts.map(([k,l])=>`<option value="${esc(k)}"${String(k)===String(v)?' selected':''}>${esc(T(l))}</option>`).join('')}</select>`;
const chkI=(f,v,l,re)=>`<label class="uibChk"><input type="checkbox" data-f="${f}" data-t="bool"${v?' checked':''}${re?' data-re="1"':''}><span>${esc(T(l))}</span></label>`;
const segI=(f,v,opts)=>`<span class="uibSeg">${opts.map(([k,ic,tip])=>`<button type="button" data-seg="${f}" data-v="${esc(k)}" class="${String(v)===String(k)?'on':''}" title="${esc(T(tip))}" aria-label="${esc(T(tip))}">${ic}</button>`).join('')}</span>`;
/* 버튼 「누르면」: 스크립트 메서드 실행을 맨 위 · 초록색으로 */
const ACTS=[['method','스크립트 메서드 실행'],['none','없음'],['close','이 그룹 닫기'],['open','다른 UI 그룹 열기'],['toggle','다른 UI 그룹 열기/닫기'],['scene','씬 이동'],['msg','알림 표시'],['stop','플레이 종료']];
const actSel=v=>`<select data-f="act.t" data-t="str" data-re="1" class="uibActSel${v==='method'?' isM':''}">${ACTS.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}${k==='method'?' class="uibOptM"':''}>${esc(T(l))}</option>`).join('')}</select>`;
const txtI=(f,v,ph,code)=>`<textarea data-f="${f}" data-t="str" rows="${code?4:2}" spellcheck="false"${code?' class="code"':''} placeholder="${esc(T(ph||''))}">${esc(v==null?'':v)}</textarea>`;
const inI=(f,v,ph)=>`<input type="text" data-f="${f}" data-t="str" value="${esc(v==null?'':v)}" placeholder="${esc(T(ph||''))}">`;
/* 경로 값 읽기: st.bg · pr.text · act.t · d.w(화면) · n.name */
function av(f){const d=D(),n=prim()||(d&&d.root);const [a,b]=f.split('.');if(a==='d')return d&&d[b];const o=a==='n'?n:n&&n[a];return o?o[b]:undefined}
function anchorGrid(n){
  const cells=[];const V=['t','m','b','s'],Hh=['l','c','r','s'];
  V.forEach(ay=>Hh.forEach(ax=>{
    const on=n.ax===ax&&n.ay===ay;let i='';
    const hx=ax==='l'?'left:3px':ax==='r'?'right:3px':ax==='c'?'left:9px':'left:3px;right:3px',vy0=ay==='t'?'top:3px':ay==='b'?'bottom:3px':ay==='m'?'top:9px':'top:3px;bottom:3px';
    if(ax==='s'&&ay==='s')i='<i style="left:3px;right:3px;top:3px;bottom:3px;opacity:.5"></i>';
    else if(ax==='s')i=`<i style="${hx};${vy0};height:2px"></i>`;
    else if(ay==='s')i=`<i style="${hx};${vy0};width:2px"></i>`;
    else i=`<i style="${hx};${vy0};width:4px;height:4px;border-radius:50%"></i>`;
    const nm=(ANCH_V.find(z=>z[0]===ay)[1])+' · '+(ANCH_H.find(z=>z[0]===ax)[1]);
    cells.push(`<button type="button" data-anc="${ax}${ay}" class="${on?'on':''}" title="${esc(T(nm))} — ${esc(T('Shift+클릭: 그 자리로 옮기기까지'))}" aria-label="${esc(T(nm))}">${i}</button>`);
  }));
  return`<div class="uibAnW"><div class="uibAn">${cells.join('')}</div><div class="uibAnT"><b>${esc(T('앵커'))}</b><br>${esc(T('가로'))}: ${esc(T(ANCH_H.find(z=>z[0]===n.ax)[1]))}<br>${esc(T('세로'))}: ${esc(T(ANCH_V.find(z=>z[0]===n.ay)[1]))}<br><span style="opacity:.8">${esc(T('화면 크기가 바뀌어도 이 기준을 따라 자리를 지킵니다'))}</span></div></div>`;
}
const alignRow=multi=>row(multi?'정렬':'부모에 맞춤',segI('al','',[['l',IC.aL,'왼쪽 맞춤'],['c',IC.aC,'가로 가운데'],['r',IC.aR,'오른쪽 맞춤']])+segI('al','',[['t',IC.aT,'위쪽 맞춤'],['m',IC.aM,'세로 가운데'],['b',IC.aB,'아래쪽 맞춤']]));
function fontOpts(){const o=[];try{Object.keys(UI_FONTS).forEach(k=>o.push(['g:'+k,UI_FONTS[k].n]));(fonts||[]).forEach(a=>o.push(['f:'+a.id,a.name]))}catch(e){o.push(['g:sans','기본 고딕'])}return o}
function sprPick(f,v){const u=sprUrl(v);return`<span class="uibSp">${u?`<img alt="" src="${u}">`:''}<button type="button" class="uibIb" data-spr="${f}">${esc(T(v?'바꾸기…':'스프라이트 고르기…'))}</button>${v?`<button type="button" class="uibIb" data-sprx="${f}" title="${esc(T('지우기'))}">${IC.close}</button>`:''}</span>`}
function sceneOpts(){return[['','모든 씬']].concat((P.maps||[]).map(m=>[m.id,m.name]))}
function groupOpts(){const si=srcInfo(),m=si?si.m:cur();return(m&&m.uiGroups||[]).filter(g=>!si||g.id!==si.g.id).map(g=>[g.name,g.name])}
function textSec(n){
  const s=n.st;let b='';
  b+=row('글꼴',selI('st.font',s.font||'g:sans',fontOpts()));
  b+=row('크기',numI('st.fs',s.fs||16,{min:4,max:400,step:1,lab:'px'})+selI('st.fw',s.fw||400,FW));
  b+=row('색',colI('st.color',s.color||'#ffffff'));
  if(n.type!=='input'&&n.type!=='dropdown'){
    b+=row('정렬',(n.type==='toggle'?'':segI('st.ta',s.ta||'left',[['left',IC.aL,'왼쪽'],['center',IC.aC,'가운데'],['right',IC.aR,'오른쪽']]))+segI('st.va',s.va||'middle',[['top',IC.aT,'위'],['middle',IC.aM,'가운데'],['bottom',IC.aB,'아래']]));
    b+=row('줄 간격',numI('st.lh',s.lh||1.3,{min:.5,max:4,step:.05})+numI('st.ls',s.ls||0,{lab:'자간',min:-10,max:40,step:.5}));
    b+=row('',chkI('st.it',s.it,'기울임'));
    if(n.type!=='toggle')b+=row('좌우 여백',numI('st.pad',s.pad||0,{min:0,max:200,step:1,lab:'px'}));
  }
  return sec('text','글자',b);
}
function renderInsp(){
  const d=D(),S=sel();
  if(!d){E.insp.innerHTML=`<div style="padding:12px"><p class="uibHint">${esc(T('위의 ＋ 버튼으로 첫 UI 화면을 만드세요.'))}</p></div>`;return}
  let h='';
  if(S.length>1){
    h+=`<div class="uibIh"><span class="ty">${IC.free}</span><b>${esc(_t('{n}개 선택',{n:S.length}))}</b></div>`;
    h+=sec('pos','배치',alignRow(true)+row('간격 맞추기',`<button type="button" class="uibIb" data-a="distH">${esc(T('가로 균등'))}</button><button type="button" class="uibIb" data-a="distV">${esc(T('세로 균등'))}</button>`)+`<p class="uibHint">${esc(T('채우기·테두리 같은 스타일을 바꾸면 고른 요소에 모두 적용됩니다.'))}</p>`);
    const n=S[S.length-1];h+=styleSecs(n,true);
    E.insp.innerHTML=h;return;
  }
  const n=S[0]||d.root;
  if(isRoot(n)){
    h+=`<div class="uibIh"><span class="ty">${IC.screen}</span><input type="text" data-f="d.name" data-t="str" value="${esc(d.name)}" aria-label="그룹 이름" maxlength="30"><small>${esc(T('UI 그룹'))}</small></div>`;
    h+=sec('screen','그룹',row('미리보기 크기',numI('d.w',d.w,{lab:'W',min:64,max:8192})+numI('d.h',d.h,{lab:'H',min:64,max:8192}))+
      row('표시',selI('d.show',d.show,[['start','플레이 시작 시 보이기'],['manual','스크립트·버튼으로 열기']]),'꺼 두면 다른 버튼의 「UI 그룹 열기」나 스크립트 UIScreen.Show("그룹 이름")로 엽니다')+
      row('',chkI('d.modal',d.modal,'열려 있으면 뒤 게임 클릭 막기'))+
      `<p class="uibHint">${esc(T('위 크기는 미리보기용입니다. 저장하면 씬의 UI 캔버스(기준 해상도)에 맞춰 앵커대로 자리를 잡습니다.'))}</p>`+
      `<div class="uibStat"><span>${esc(T('요소'))} <b>${countNodes(d)-1}</b></span><span>${esc(T('스크립트'))}: <code data-i18n-skip>UIGroup.Find("${esc(d.name)}")</code></span></div>`);
    h+=sec('layout','자동 배치',layoutBody(n));
    h+=sec('fill','배경',row('색',colI('st.bg',n.st.bg||'','st.bgA'))+row('이미지',sprPick('st.img',n.st.img))+(n.st.img?row('맞춤',selI('st.imgFit',n.st.imgFit||'stretch',[['stretch','늘이기'],['cover','채우기 (잘림)'],['contain','맞추기'],['tile','바둑판']])):''));
    E.insp.innerHTML=h;return;
  }
  const td=TYPES[n.type],p=parOf(n),fl=flowOf(p),rr=relRect(n);
  h+=`<div class="uibIh"><span class="ty">${IC[n.type]}</span><input type="text" data-f="n.name" data-t="str" value="${esc(n.name)}" aria-label="이름" maxlength="60" title="${esc(T('스크립트에서 이 이름으로 찾습니다'))}"><small>${esc(T(td.n))}</small></div>`;
  /* 내용 */
  let c='';const pr=n.pr;
  if(n.type==='text'||n.type==='button'||n.type==='toggle')c+=row('글자',txtI('pr.text',pr.text,'글자'),'캔버스에서 더블클릭해도 고칠 수 있습니다');
  if(n.type==='toggle')c+=row('',chkI('pr.checked',pr.checked,'처음에 켜짐'))+row('상자 크기',numI('pr.bx',pr.bx,{min:8,max:120,lab:'px'}));
  if(n.type==='slider'||n.type==='progress')c+=row('범위',numI('pr.min',pr.min,{lab:'최소',step:1})+numI('pr.max',pr.max,{lab:'최대',step:1}))+row('값',numI('pr.value',pr.value,{step:n.type==='slider'?pr.step||1:1}));
  if(n.type==='slider')c+=row('단계',numI('pr.step',pr.step,{min:0,step:.1}))+row('막대 · 손잡이',numI('pr.tk',pr.tk,{lab:'막대',min:1,max:100})+numI('pr.kb',pr.kb,{lab:'손잡이',min:4,max:200}));
  if(n.type==='input')c+=row('안내 글자',inI('pr.ph',pr.ph,'placeholder'))+row('처음 값',inI('pr.value',pr.value,''))+row('종류',selI('pr.itype',pr.itype,[['text','글자'],['number','숫자'],['password','비밀번호']]))+row('최대 글자 수',numI('pr.max',pr.max,{min:0,max:9999,tip:'0 = 제한 없음'}));
  if(n.type==='dropdown')c+=row('항목',txtI('pr.opts',pr.opts,'한 줄에 하나씩'),'한 줄에 항목 하나')+row('처음 고른 항목',selI('pr.value',pr.value,String(pr.opts||'').split('\n').map(x=>x.trim()).filter(Boolean).map((x,k)=>[k,x])));
  if(n.type==='image')c+=row('스프라이트',sprPick('pr.src',pr.src))+row('맞춤',selI('pr.fit',pr.fit,[['contain','맞추기'],['cover','채우기 (잘림)'],['stretch','늘이기']]))+row('',chkI('pr.pix',pr.pix!==false,'픽셀 선명하게 (도트 그림)'));
  if(c)h+=sec('content','내용',c);
  /* 위치와 크기 */
  let ps='';
  if(fl){
    ps+=`<p class="uibHint">${esc(_t('「{p}」의 자동 배치({d}) 안에 있어 자리는 순서로 정해집니다. 계층 구조나 캔버스에서 끌어 순서를 바꾸세요.',{p:p.name,d:T(p.pr.layout==='row'?'가로':'세로')}))}</p>`;
    ps+=row('가로 크기',segI('fx',n.fx?'1':'0',[['0','고정','고정 크기'],['1','채우기','남는 공간 채우기']])+(n.fx?'':numI('r.w',rr.w,{lab:'W',min:1})));
    ps+=row('세로 크기',segI('fy',n.fy?'1':'0',[['0','고정','고정 크기'],['1','채우기','남는 공간 채우기']])+(n.fy?'':numI('r.h',rr.h,{lab:'H',min:1})));
  }else{
    ps+=alignRow(false);
    ps+=row('위치',numI('r.x',rr.x,{lab:'X',tip:'부모 왼쪽 위에서 떨어진 거리'})+numI('r.y',rr.y,{lab:'Y'}));
    ps+=row('크기',numI('r.w',rr.w,{lab:'W',min:1})+numI('r.h',rr.h,{lab:'H',min:1}));
    ps+=anchorGrid(n);
  }
  h+=sec('pos','위치와 크기',ps);
  if(isBox(n))h+=sec('layout','자동 배치',layoutBody(n));
  h+=styleSecs(n,false);
  /* 동작 */
  if(n.type==='button'){const a=n.act||{t:'none'};let ab=row('누르면',actSel(a.t));
    if(a.t==='open'||a.t==='toggle')ab+=row('UI 그룹',selI('act.v',a.v||'',[['','(고르기)']].concat(groupOpts())))+(a.t==='open'?row('',chkI('act.cs',a.cs,'이 그룹은 닫기')):'');
    if(a.t==='scene')ab+=row('씬',selI('act.v',a.v||'',[['','(고르기)']].concat((P.maps||[]).map(m=>[m.id,m.name]))));
    if(a.t==='method')ab+=row('메서드 이름',inI('act.v',a.v||'','예: OnStartClick'))+`<p class="uibHint">${esc(T('씬의 게임 오브젝트 · UI · 매니저에 붙은 스크립트에서 이 이름의 메서드를 모두 실행합니다.'))}</p>`;
    if(a.t==='msg')ab+=row('알림 글자',inI('act.v',a.v||'',''));
    h+=sec('act','동작',ab);
  }
  if(['toggle','slider','input','dropdown'].includes(n.type))h+=sec('act','동작',row('값이 바뀌면',inI('pr.onChange',pr.onChange||'','메서드 이름 (예: OnVolumeChanged)'),'이 이름의 스크립트 메서드를 실행합니다. 값은 UIScreen.GetValue("화면", "요소")로 읽습니다')+`<p class="uibHint">${esc(_t('스크립트: UIScreen.GetValue("{s}", "{n}")',{s:d.name,n:n.name}))}</p>`);
  /* CSS */
  const o=cssOf(n,p),cs='.'+cssName(n.name)+' {\n'+Object.entries(o).map(([k,v])=>'  '+k+': '+(String(v).startsWith('url(data:')?'url(…)':v)+';').join('\n')+'\n}';
  h+=sec('css','CSS',`<pre class="uibCss" data-i18n-skip>${esc(cs)}</pre>`+row('추가 CSS',txtI('n.css',n.css,'예: letter-spacing: 2px; text-transform: uppercase;',true),'직접 쓴 CSS가 위 값보다 나중에 붙어 우선합니다'),'');
  E.insp.innerHTML=h;
}
function layoutBody(n){
  const pr=n.pr,L=pr.layout||'none';
  let b=row('배치',segI('pr.layout',L,[['none',IC.free,'자유 배치 (앵커)'],['row',IC.row,'가로로 나란히 (flex row)'],['col',IC.col,'세로로 쌓기 (flex column)']]));
  if(L!=='none'){
    b+=row('간격 · 여백',numI('pr.gap',pr.gap||0,{lab:'간격',min:0,max:999})+numI('pr.pad',pr.pad||0,{lab:'여백',min:0,max:999}));
    b+=row(L==='row'?'가로 정렬':'세로 정렬',selI('pr.jc',pr.jc||'start',[['start','앞쪽'],['center','가운데'],['end','뒤쪽'],['between','양 끝 맞춤'],['around','고르게']]));
    b+=row(L==='row'?'세로 정렬':'가로 정렬',selI('pr.ai',pr.ai||'start',[['start','앞쪽'],['center','가운데'],['end','뒤쪽'],['stretch','늘이기']]));
    b+=row('',chkI('pr.wrap',pr.wrap,'넘치면 줄 바꿈'));
  }else b+=`<p class="uibHint">${esc(T('가로/세로를 고르면 안의 요소가 CSS flex처럼 저절로 줄을 맞춥니다.'))}</p>`;
  if(!isRoot(n))b+=row('',chkI('pr.clip',pr.clip,'넘치는 부분 자르기'));
  return b;
}
function styleSecs(n,multi){
  const s=n.st,t=n.type;let h='';
  if(t!=='image'||multi){
    let f=row(t==='slider'||t==='toggle'?'배경':'색',colI('st.bg',s.bg||'','st.bgA'));
    if(t!=='slider'&&t!=='toggle'&&t!=='progress'){f+=row('',chkI('st.grad',s.grad,'그라데이션',true));if(s.grad)f+=row('두 번째 색',colI('st.bg2',s.bg2||'#000000'))+row('방향',numI('st.ga',num(s.ga,180),{lab:'°',min:0,max:360,step:15}))}
    if(t==='panel'||t==='button'){f+=row('이미지',sprPick('st.img',s.img));if(s.img)f+=row('맞춤',selI('st.imgFit',s.imgFit||'stretch',[['stretch','늘이기'],['cover','채우기 (잘림)'],['contain','맞추기'],['tile','바둑판']]))}
    if(t==='slider'||t==='toggle'||t==='progress')f+=row(t==='progress'?'채움 색':'켜짐 색',colI('st.ac',s.ac||'#3b82f6'));
    if(t==='slider'||t==='toggle')f+=row(t==='toggle'?'상자 색':'막대 색',colI('st.tr',s.tr||'#3a4050'));
    if(t==='slider')f+=row('손잡이 색',colI('st.kc',s.kc||'#ffffff'));
    h+=sec('fill','채우기',f);
  }
  h+=sec('border','테두리',row('두께',numI('st.bw',s.bw||0,{lab:'px',min:0,max:64}))+row('색',colI('st.bc',s.bc||'#ffffff','st.bcA'))+row('둥근 모서리',numI('st.radius',s.radius||0,{lab:'px',min:0,max:999})));
  if(TYPES[t]&&TYPES[t].txt||t==='input'||t==='dropdown')h+=textSec(n);
  h+=sec('fx','효과',row('불투명도',`<input type="range" data-f="st.op" data-t="num" min="0" max="1" step="0.05" value="${num(s.op,1)}" style="flex:1"><span style="width:34px;text-align:right;color:var(--mute)">${Math.round(num(s.op,1)*100)}%</span>`)+
    row('그림자',segI('st.sh',s.sh||0,[[0,'없음','그림자 없음'],[1,'약','약하게'],[2,'중','보통'],[3,'강','강하게']]))+row('뒤 흐리게',numI('st.blur',s.blur||0,{lab:'px',min:0,max:60,tip:'유리처럼 뒤를 흐리게 (backdrop-filter)'})));
  return h;
}
const countNodes=d=>{let c=0;walk(d.root,()=>c++);return c};
const cssName=s=>String(s||'ui').trim().replace(/\s+/g,'-').replace(/[^\w가-힣-]/g,'').replace(/^(\d)/,'_$1')||'ui';

/* ===================== 값 바꾸기 ===================== */
function setField(f,raw,t,live){
  const d=D();if(!d)return;
  let v=raw;
  if(t==='num'){v=parseFloat(raw);if(!isFinite(v))return}
  else if(t==='bool')v=!!raw;
  else if(t==='hex'){v=String(raw).trim();if(v&&v[0]!=='#')v='#'+v;if(v&&!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v))return;if(/^#[0-9a-f]{3}$/i.test(v))v='#'+v.slice(1).split('').map(c=>c+c).join('');v=v.toLowerCase()}
  begin();
  const [a,b]=f.split('.');
  if(a==='d'){
    if(b==='w'||b==='h'){v=cl(Math.round(v),64,8192);if(d[b]===v)return;d[b]=v;if(U.zoom==='fit')fitZoom(false)}
    else if(b==='name'){v=String(v).trim().slice(0,30);if(!v)return;d.name=v;d.root.name=v}
    else if(b==='match')d.match=cl(v,0,1);
    else d[b]=v;
  }else if(a==='r'){
    const n=prim();if(!n||isRoot(n))return;const r=relRect(n);
    let{x,y,w,h}=r;if(b==='x')x=v;else if(b==='y')y=v;else if(b==='w')w=Math.max(1,v);else if(b==='h')h=Math.max(1,v);
    setRel(n,x,y,w,h);
  }else{
    const S=sel().length?sel():[d.root];
    S.forEach(n=>{
      if(a==='n'){if(b==='name'){const s=String(v).slice(0,60);if(s.trim())n.name=s}else if(b==='css')n.css=String(v).slice(0,4000);return}
      if(a==='act'){if(n.type!=='button')return;n.act=n.act||{t:'none'};n.act[b]=v;if(b==='t')n.act.v='';return}
      const o=n[a];if(!o)return;
      if(a==='pr'&&!(b in (TYPES[n.type]?TYPES[n.type].d.pr:{layout:1,gap:1,pad:1,jc:1,ai:1,wrap:1,clip:1}))&&!['onChange'].includes(b)&&!isBox(n))return;
      if(b==='bgA'||b==='bcA'||b==='op')v=cl(b==='op'?v:v/100,0,1);
      if(b==='layout'&&v!==o.layout&&isBox(n)){layoutSwitch(n,v);return}
      o[b]=v;
    });
  }
  if(live){reindex();renderStage();if(a==='d'&&(b==='name'))renderHier();if(a==='n'&&b==='name')renderHier()}
  else{commit();renderAll()}
}
/* 자유 배치 ↔ 자동 배치: 지금 보이는 자리를 지켜 바꿈 */
function layoutSwitch(n,v){
  const rects=n.kids.map(k=>domRect(k)),pr=domRect(n);
  n.pr.layout=v;
  if(v==='none'){reindex();renderStage();n.kids.forEach((k,i)=>{const r=rects[i];if(!r||!pr)return;k.ax='l';k.ay='t';k.x=r2(r.x-pr.x);k.y=r2(r.y-pr.y);k.w=r2(r.w);k.h=r2(r.h);k.fx=k.fy=false})}
  else{/* 위치 순서대로 정렬 */const key=v==='row'?(r=>r?r.x:0):(r=>r?r.y:0);const ord=n.kids.map((k,i)=>[k,key(rects[i]),rects[i]]).sort((A,B)=>A[1]-B[1]);n.kids=ord.map(z=>{if(z[2]){z[0].w=r2(z[2].w);z[0].h=r2(z[2].h)}return z[0]})}
}

/* ===================== 구조 편집 ===================== */
function addNode(type,parent,at,over){
  const d=D();if(!d)return null;parent=parent&&isBox(parent)?parent:d.root;
  const n=newNode(type,over);n.name=uniq(namesAll(),n.name);
  if(!flowOf(parent)){const s=psize(parent);
    let x,y;if(at){x=at.x-n.w/2;y=at.y-n.h/2}else{x=(s.w-n.w)/2;y=(s.h-n.h)/2;const k=parent.kids.length%6;x+=k*12;y+=k*12}
    x=Math.round(x);y=Math.round(y);n.ax='l';n.ay='t';setX(n,s.w,x,n.w);setY(n,s.h,y,n.h)}
  if(at&&at.index!=null)parent.kids.splice(at.index,0,n);else parent.kids.push(n);
  return n;
}
const namesAll=()=>{const a=[];const d=D();if(d)walk(d.root,n=>a.push(n.name));return a};
function topSel(){const S=sel().filter(n=>!isRoot(n));return S.filter(n=>!S.some(o=>o!==n&&isAnc(o,n)))}
function delSel(){const S=topSel();if(!S.length)return;edit(()=>{S.forEach(n=>{const p=parOf(n);if(p)p.kids=p.kids.filter(k=>k!==n)});U.sel=[]});renderAll()}
function cloneNode(n){const c=CL(n);walk(c,x=>x.id=nid());return c}
function dupSel(){const S=topSel();if(!S.length)return;const ids=[];
  edit(()=>{S.forEach(n=>{const p=parOf(n),c=cloneNode(n);c.name=uniq(namesAll(),n.name);if(!flowOf(p)){const s=psize(p);const r=relRect(n);setX(c,s.w,r.x+16,r.w);setY(c,s.h,r.y+16,r.h)}p.kids.splice(p.kids.indexOf(n)+1,0,c);ids.push(c.id)});U.sel=ids});renderAll()}
function copySel(cut){const S=topSel();if(!S.length)return;U.clip=S.map(n=>{const c=CL(n);c._r=relRect(n);return c});toast(_t(cut?'{n}개 잘라냈습니다':'{n}개 복사했습니다',{n:S.length}));if(cut)delSel()}
function paste(){
  if(!U.clip||!U.clip.length)return;const d=D();if(!d)return;
  let p=prim();if(p&&!isBox(p))p=parOf(p);if(!p)p=d.root;const ids=[];
  edit(()=>{U.clip.forEach(src=>{const c=cloneNode(src);delete c._r;walk(c,x=>{delete x._r});normNode(c,false);c.name=uniq(namesAll(),c.name);
    if(!flowOf(p)&&src._r){const s=psize(p);c.ax='l';c.ay='t';setX(c,s.w,cl(src._r.x+16,-c.w+8,s.w-8),src._r.w);setY(c,s.h,cl(src._r.y+16,-c.h+8,s.h-8),src._r.h)}
    p.kids.push(c);ids.push(c.id);reindex()});U.sel=ids});
  renderAll();
}
function order(dir){const S=topSel();if(!S.length)return;edit(()=>{S.forEach(n=>{const p=parOf(n),a=p.kids,i=a.indexOf(n);a.splice(i,1);let j=dir==='top'?a.length:dir==='bottom'?0:dir==='up'?Math.min(a.length,i+1):Math.max(0,i-1);a.splice(j,0,n)})});renderAll()}
function groupSel(){
  const S=topSel();if(!S.length)return;const p=parOf(S[0]);if(!S.every(n=>parOf(n)===p)){toast(T('같은 부모 안의 요소만 묶을 수 있습니다'));return}
  const rs=S.map(domRect),b=bounds(rs.filter(Boolean)),pr=domRect(p);if(!b||!pr)return;
  edit(()=>{const g=newNode('panel',{name:uniq(namesAll(),T('묶음')),st:{bgA:0},pr:{layout:'none'}});g.st.bgA=0;g.st.radius=0;
    const idx=Math.min(...S.map(n=>p.kids.indexOf(n)));p.kids=p.kids.filter(k=>!S.includes(k));p.kids.splice(idx,0,g);
    if(!flowOf(p)){const s=psize(p);g.ax='l';g.ay='t';setX(g,s.w,b.x-pr.x,b.w);setY(g,s.h,b.y-pr.y,b.h)}else{g.w=r2(b.w);g.h=r2(b.h)}
    S.forEach((n,i)=>{const r=rs[i];n.ax='l';n.ay='t';n.fx=n.fy=false;n.x=r2(r.x-b.x);n.y=r2(r.y-b.y);n.w=r2(r.w);n.h=r2(r.h);g.kids.push(n)});U.sel=[g.id]});
  renderAll();
}
function ungroup(){
  const n=prim();if(!n||n.type!=='panel'||!n.kids.length)return;const p=parOf(n);const rs=n.kids.map(domRect),pr=domRect(p);
  edit(()=>{const i=p.kids.indexOf(n),ks=n.kids.slice();ks.forEach((k,j)=>{const r=rs[j];if(r&&pr&&!flowOf(p)){k.ax='l';k.ay='t';k.x=r2(r.x-pr.x);k.y=r2(r.y-pr.y);k.w=r2(r.w);k.h=r2(r.h)}});n.kids=[];p.kids.splice(i+1,0,...ks);if(!n.st.bgA&&!n.st.img&&!n.st.bw)p.kids.splice(i,1);U.sel=ks.map(k=>k.id)});renderAll();
}
/* 다른 부모로 옮기기 (보이는 자리 유지) */
function reparent(nodes,np,index,over){
  const npr=domRect(np);if(!npr)return;const s=psize(np);
  const rs=nodes.map((n,i)=>over&&over[i]||domRect(n));
  nodes.forEach((n,i)=>{const op=parOf(n);if(op){const k=op.kids.indexOf(n);op.kids.splice(k,1);if(op===np&&index!=null&&k<index)index--}});
  nodes.forEach((n,i)=>{
    const r=rs[i];
    if(flowOf(np)){if(r){n.w=r2(r.w);n.h=r2(r.h)}}
    else if(r){n.ax=n.ax==='s'?'l':n.ax;n.ay=n.ay==='s'?'t':n.ay;setX(n,s.w,r.x-npr.x,r.w);setY(n,s.h,r.y-npr.y,r.h)}
    if(index!=null){np.kids.splice(index+i,0,n)}else np.kids.push(n);
  });
  reindex();
}
function alignTo(k){
  const S=topSel();if(!S.length)return;
  edit(()=>{
    if(S.length===1){const n=S[0];if(flowOf(parOf(n)))return;const r=relRect(n);let{x,y,w,h}=r;
      if(k==='l')x=0;else if(k==='c')x=(r.pw-w)/2;else if(k==='r')x=r.pw-w;else if(k==='t')y=0;else if(k==='m')y=(r.ph-h)/2;else if(k==='b')y=r.ph-h;setRel(n,x,y,w,h);return}
    const rs=S.map(domRect),b=bounds(rs);
    S.forEach((n,i)=>{if(flowOf(parOf(n)))return;const r=rs[i],R=relRect(n);let dx=0,dy=0;
      if(k==='l')dx=b.x-r.x;else if(k==='c')dx=b.x+b.w/2-(r.x+r.w/2);else if(k==='r')dx=b.x+b.w-(r.x+r.w);else if(k==='t')dy=b.y-r.y;else if(k==='m')dy=b.y+b.h/2-(r.y+r.h/2);else if(k==='b')dy=b.y+b.h-(r.y+r.h);
      setRel(n,R.x+dx,R.y+dy,R.w,R.h)});
  });renderAll();
}
function distribute(ax){
  const S=topSel().filter(n=>!flowOf(parOf(n)));if(S.length<3){toast(T('세 개 이상 고르세요'));return}
  const it=S.map(n=>({n,r:domRect(n),R:relRect(n)})).sort((a,b)=>ax==='h'?a.r.x-b.r.x:a.r.y-b.r.y);
  const tot=it.reduce((s,o)=>s+(ax==='h'?o.r.w:o.r.h),0),first=it[0].r,last=it[it.length-1].r,span=ax==='h'?last.x+last.w-first.x:last.y+last.h-first.y,gap=(span-tot)/(it.length-1);
  edit(()=>{let pos=ax==='h'?first.x:first.y;it.forEach(o=>{const d0=pos-(ax==='h'?o.r.x:o.r.y);setRel(o.n,o.R.x+(ax==='h'?d0:0),o.R.y+(ax==='h'?0:d0),o.R.w,o.R.h);pos+=(ax==='h'?o.r.w:o.r.h)+gap})});renderAll();
}

/* ===================== 초기화 · 저장 (씬 고르기) ===================== */
const refocus=()=>{setTimeout(()=>{if($('#modal').hidden)BOX.focus({preventScroll:true})},0)};
function resetDoc(){
  const d=D();if(!d)return;
  openModal(T('UI 초기화'),`<p style="margin:0 0 6px"><b data-i18n-skip>${esc(d.name)}</b> ${esc(T('화면의 요소를 모두 지우고 배경도 처음 상태로 되돌릴까요?'))}</p><p class="hint" style="margin:0">${esc(_t('요소 {n}개가 지워집니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.',{n:countNodes(d)-1}))}</p>`,
    [{t:T('취소'),fn:refocus},{t:T('초기화'),cls:'danger',fn:()=>{edit(()=>{d.root.kids=[];d.root.st={bgA:0};d.root.pr={layout:'none',gap:12,pad:0,jc:'start',ai:'start'};d.root.css='';U.sel=[]});renderAll();toast(_t('「{n}」을(를) 초기화했습니다',{n:d.name}));refocus()}}]);
}
/* ===================== 씬 UI 그룹 ↔ UI 빌더 =====================
   저장: 빌더 화면 → 고른 씬의 UI 그룹 (다른 그룹과 똑같이 계층 구조 › UI 아래 · 그룹 안에 엔진 UI 요소)
     · g.uib = 빌더 원본(다시 불러올 때 그대로) · 요소는 씬의 UI 캔버스(기준 해상도) 크기로 그려 잰 자리를 앵커대로 넣음 · u.uibN = 노드 id
     · 플레이 중에는 이 그룹을 빌더의 HTML/CSS로 그리고(엔진은 uibN 요소를 건너뜀), 요소의 보임·글자는 엔진 쪽 값을 따라감
   불러오기: 아무 UI 그룹 → 그 그룹이 맨 위(폴더)인 빌더 화면 (g.uib가 있으면 그대로, 없으면 엔진 요소를 바꿔서) */
/* 다른 화면(학습)이 할 일 확인에 쓰는 알림 · 플레이 화면 자리 (엔진에는 없어서 그냥 넘어감) */
const hostEv=(k,d)=>{try{if(typeof uibEvent==='function')uibEvent(k,d)}catch(e){console.error(e)}};
const playHostEl=()=>typeof uibPlayEl==='function'?uibPlayEl():document.getElementById('play');
const sceneName=id=>{const m=(P.maps||[]).find(x=>x.id===id);return m?m.name:'?'};
function measure(d,cw,ch){
  const dd=CL(d);walk(dd.root,n=>{n.hidden=false});
  const box=document.createElement('div');box.style.cssText=`position:fixed;left:-30000px;top:0;width:${cw}px;height:${ch}px;visibility:hidden;pointer-events:none;contain:layout`;
  const dom=new Map(),m0=MAP;MAP=new Map();walk(dd.root,(n,p,dp)=>MAP.set(n.id,{n,p,dp}));
  const r=build(dd.root,null,'play',dom);r.classList.add('uibS');box.append(r);document.body.append(box);
  const b=box.getBoundingClientRect(),out=new Map();
  dom.forEach((el,id)=>{const q0=el.getBoundingClientRect();out.set(id,{x:q0.left-b.left,y:q0.top-b.top,w:q0.width,h:q0.height})});
  box.remove();MAP=m0;return out;
}
const NAT={panel:'panel',root:'panel',text:'text',button:'button',image:'image',progress:'bar',slider:'bar',toggle:'text',input:'panel',dropdown:'panel'};
function natProps(n,prev){
  const s=n.st||{},pr=n.pr||{},t=n.type,tx={text:String(pr.text==null?'':pr.text),color:s.color||'#ffffff',size:Math.round(num(s.fs,16)),align:s.ta||'left',valign:s.va==='top'?'top':s.va==='bottom'?'bottom':'mid',bold:num(s.fw,400)>=600,shadow:false,font:s.font||''};
  if(t==='text'||t==='toggle')return tx;
  if(t==='button'){const a=n.act||{},o=Object.assign({},tx,{bg:s.bg||'#3b82f6',radius:num(s.radius,0)});
    if(a.t==='scene'){o.action='scene';o.map=a.v||''}else if(a.t==='stop')o.action='stop';else if(a.t==='msg'){o.action='message';o.actionText=a.v||''}else o.action=prev&&prev.action&&!['scene','stop','message'].includes(prev.action)?prev.action:'none';return o}
  if(t==='image')return{sprite:pr.src||''};
  if(t==='progress'||t==='slider'){const v=pct(num(pr.value,0),num(pr.min,0),num(pr.max,100))/100;return{src:pr.src==='hp'?'hp':'fixed',value:r2(v),bg:col(t==='slider'?s.tr||'#3a4050':s.bg||'#2a2f3d',1),fg:col(s.ac||'#22c55e',1),radius:num(s.radius,t==='slider'?99:0),text:prev&&prev.text&&pr.src==='hp'?prev.text:''}}
  return{bg:s.bg||'#000000',alpha:s.bg?num(s.bgA,1):0,radius:num(s.radius,0),border:s.bc||'#ffffff',bw:num(s.bw,0),sprite:s.img||''};
}
/* 빌더 → 그룹: sid 씬, gid 덮어쓸 그룹(없으면 새 그룹) */
function toGroup(sid,gid){
  const m=(P.maps||[]).find(x=>x.id===sid);if(!m)return null;const d=D();
  if(!Array.isArray(m.ui))m.ui=[];if(!Array.isArray(m.uiGroups))m.uiGroups=[];
  let g=gid&&m.uiGroups.find(x=>x.id===gid);
  const nm=String(d.name||T('새 UI')).slice(0,30);
  if(!g){g={id:uid(),name:uniq(m.uiGroups.map(x=>x.name),nm)};m.uiGroups.push(g)}else g.name=uniq(m.uiGroups.filter(x=>x!==g).map(x=>x.name),nm);
  d.name=g.name;d.root.name=g.name;
  const cv=m.uiCv||{w:640,h:360},cw=cv.w,ch=cv.h,R0=measure(d,cw,ch);
  const old=m.ui.filter(u=>u.group===g.id),byN=new Map(old.filter(u=>u.uibN).map(u=>[u.uibN,u])),byId=new Map(old.map(u=>[u.id,u]));
  const vis0=d.show!=='manual',out=[],used=new Set();
  const mk=(n,key,hid)=>{
    const r=R0.get(n.id);if(!r)return;const type=NAT[n.type]||'panel';
    let prev=byN.get(n.id)||(n.nat&&byId.get(n.nat))||null;if(prev&&used.has(prev.id))prev=null;
    const e={id:prev?prev.id:(n.nat&&!byId.has(n.nat)?n.nat:uid()),type,name:String(isRoot(n)?d.name+' '+T('배경'):n.name).slice(0,30),anchor:key,group:g.id,visible:vis0&&!hid,opacity:cl(num(n.st&&n.st.op,1),0,1),
      props:Object.assign({},prev&&prev.type===type?prev.props:{},natProps(n,prev&&prev.props)),uibN:n.id};
    used.add(e.id);
    if(prev){if(prev.scripts)e.scripts=CL(prev.scripts);if(prev.tag)e.tag=prev.tag;if(prev.comps)e.comps=CL(prev.comps).filter(c=>c.type!=='toggle')}
    if(n.type==='toggle'){e.comps=(e.comps||[]).concat([{type:'toggle',props:{isOn:!!n.pr.checked,onColor:col(n.st.ac||'#3b82f6',1),boxColor:col(n.st.tr||'#ffffff',1),box:true,target:''}}])}
    uiSetRect(e,r,cw,ch);out.push(normUi(e));
  };
  if(d.root.st&&((d.root.st.bg&&d.root.st.bgA>0)||d.root.st.img))mk(d.root,'ss',false);
  const free=!flowOf(d.root);
  d.root.kids.forEach(top=>{
    const tk=free?(top.ay+top.ax):'tl';
    walk(top,(n,p)=>{
      let hid=false,a=n;while(a&&!isRoot(a)){if(a.hidden){hid=true;break}a=a===top?null:findIn(top,a)}
      let key=tk;if(n!==top){const v=tk[0]==='s'?(n.ay==='s'&&!flowOf(p)?'s':'m'):tk[0],h=tk[1]==='s'?(n.ax==='s'&&!flowOf(p)?'s':'c'):tk[1];key=v+h}
      mk(n,key,hid);
    });
  });
  let at=m.ui.findIndex(u=>u.group===g.id);m.ui=m.ui.filter(u=>u.group!==g.id);if(at<0||at>m.ui.length)at=m.ui.length;m.ui.splice(at,0,...out);
  const keep=CL(d);g.uib=keep;hostEv('save',{sid,g});
  return g;
}
/* top 안에서 a의 부모 (walk가 넘기지 않는 조상 찾기) */
function findIn(top,a){let r=null;walk(top,(n,p)=>{if(n===a)r=p});return r}
/* 그룹 → 빌더 화면 */
function fromGroup(m,g){
  const cv=m.uiCv||{w:640,h:360},mem=(m.ui||[]).filter(u=>u.group===g.id);
  let d;
  if(g.uib&&typeof g.uib==='object'){d=normDoc(CL(g.uib));
    const known=new Set();walk(d.root,n=>known.add(n.id));
    mem.filter(u=>!u.uibN||!known.has(u.uibN)).filter(u=>!(u.uibN&&u.uibN===d.root.id)).forEach(u=>d.root.kids.push(natNode(u,cv)));
  }else{
    d=newDoc(g.name);d.w=cv.w;d.h=cv.h;
    const allHid=mem.length>0&&mem.every(u=>u.visible===false);if(allHid)d.show='manual';
    mem.forEach(u=>{const n=natNode(u,cv);if(allHid)n.hidden=false;d.root.kids.push(n)});
  }
  d.name=g.name;d.root.name=g.name;normDoc(d);return d;
}
function natNode(u,cv){
  const p=u.props||{},a=UI_ANCH[u.anchor]?u.anchor:'tl',r=uiRect(u,cv.w,cv.h);let n;
  if(u.type==='text')n=newNode('text',{name:u.name,pr:{text:p.text},st:{color:p.color,fs:p.size,ta:p.align||'left',va:p.valign==='mid'?'middle':(p.valign||'middle'),fw:p.bold?700:400,font:p.font||''}});
  else if(u.type==='button')n=newNode('button',{name:u.name,pr:{text:p.text},st:{bg:p.bg,bgA:1,color:p.color,fs:p.size,radius:p.radius,ta:'center',va:'middle',fw:600,font:p.font||''},act:p.action==='scene'?{t:'scene',v:p.map||''}:p.action==='stop'?{t:'stop'}:p.action==='message'?{t:'msg',v:p.actionText||''}:{t:'none'}});
  else if(u.type==='bar')n=newNode('progress',{name:u.name,pr:{min:0,max:100,value:Math.round(num(p.value,1)*100),src:p.src==='hp'?'hp':''},st:{bg:p.bg,bgA:1,ac:p.fg,radius:p.radius}});
  else if(u.type==='image')n=newNode('image',{name:u.name,pr:{src:p.sprite||'',fit:'contain',pix:true}});
  else n=newNode('panel',{name:u.name,st:{bg:p.bg,bgA:num(p.alpha,1),radius:p.radius,bc:p.border,bw:p.bw,img:p.sprite||''},pr:{layout:'none'}});
  n.ay=a[0];n.ax=a[1];n.hidden=u.visible===false;if(u.opacity!=null&&u.opacity<1)n.st.op=u.opacity;n.nat=u.id;
  setX(n,cv.w,r.x,r.w);setY(n,cv.h,r.y,r.h);
  return n;
}
function setDraft(d,src){P.uibDraft={doc:d,src:src||null,saved:J(d)};NORM.add(d);U.undo=[];U.redo=[];U.pend=null;U.sel=[];U.zoom='fit';mark()}
/* 그룹을 빌더로 불러오기 (인스펙터의 「UI 빌더로 편집하기」) */
function loadGroup(sid,gid,nodeId){
  const m=(P.maps||[]).find(x=>x.id===sid),g=m&&(m.uiGroups||[]).find(x=>x.id===gid);if(!g){toast(T('UI 그룹을 찾을 수 없습니다'));return}
  const r=DR(),same=r.src&&r.src.sid===sid&&r.src.gid===gid;
  const go=()=>{if(!same||!g.uib)setDraft(fromGroup(m,g),{sid,gid});hostEv('load',{sid,g});open(nodeId||null)};
  if(same&&g.uib){hostEv('load',{sid,g});open(nodeId||null);return}
  if(isDirty()){openModal(T('저장하지 않은 UI 빌더 작업'),`<p style="margin:0">${esc(_t('UI 빌더의 「{n}」에 저장하지 않은 변경이 있습니다. 버리고 「{g}」 그룹을 불러올까요?',{n:D().name,g:g.name}))}</p>`,
    [{t:T('취소')},{t:T('버리고 불러오기'),cls:'danger',fn:go}]);return}
  go();
}
/* 예전 판(P.uiDocs)의 화면 → 씬 UI 그룹으로 한 번 옮김 */
function migrate(){
  if(!Array.isArray(P.uiDocs)||!P.uiDocs.length){if(P.uiDocs)delete P.uiDocs;return}
  const keep=P.uibDraft;let n=0;
  P.uiDocs.forEach(d0=>{try{const d=normDoc(CL(d0)),sid=(P.maps||[]).some(x=>x.id===d.scene)?d.scene:(P.start||(P.maps[0]&&P.maps[0].id));P.uibDraft={doc:d,src:null,saved:null};NORM.add(d);if(d.root.kids.length&&toGroup(sid,null))n++}catch(e){console.error(e)}});
  delete P.uiDocs;P.uibDraft=keep||undefined;if(!P.uibDraft)delete P.uibDraft;
  if(n){mark();hostSync()}
}
function saveDialog(){
  const d=D(),si=srcInfo(),def=si?si.m.id:(cur()?cur().id:(P.maps[0]&&P.maps[0].id));
  const opts=(P.maps||[]).map(m=>`<option value="${esc(m.id)}"${m.id===def?' selected':''} data-i18n-skip>${esc(m.name)}${cur()&&m.id===cur().id?' '+esc(T('(현재 씬)')):''}</option>`).join('');
  openModal(T('UI 저장'),`<p style="margin:0 0 10px;font-size:13px"><b id="uibSvN" data-i18n-skip style="color:var(--accent-tx,var(--accent))">[${esc(sceneName(def))}]</b>${esc(T('의 UI에 저장하시겠습니까?'))}</p>
    <label class="f"><span>${esc(T('저장할 씬'))}</span><select id="uibSvS">${opts}</select></label>
    <div id="uibSvM" style="margin-top:8px"></div>
    <p class="hint" style="margin:8px 0 0">${esc(_t('「{n}」이(가) 그 씬의 계층 구조 › UI 안에 UI 그룹으로 들어갑니다. 다른 그룹처럼 고르고 숨기고 스크립트로 다룰 수 있습니다.',{n:d.name}))}</p>`,
    [{t:T('취소'),fn:refocus},{t:T('저장'),cls:'pri',fn:()=>{
      const v=$('#uibSvS').value,ow=$('#uibSvO'),over=si&&v===si.m.id&&(!ow||ow.checked);refocus();
      const g=toGroup(v,over?si.g.id:null);if(!g)return;
      const r=DR();r.src={sid:v,gid:g.id};r.saved=J(D());
      try{if(v===curId)__uibHost.commit();else markDirty()}catch(e){}
      renderAll();save(false);hostSync();setTimeout(()=>toast(_t('[{s}]의 UI에 「{n}」 그룹으로 저장했습니다',{s:sceneName(v),n:g.name})),0)}}]);
  const sl=$('#uibSvS'),mo=()=>{const b=$('#uibSvN');if(b)b.textContent='['+sceneName(sl.value)+']';const box=$('#uibSvM');if(!box)return;
    box.innerHTML=si&&sl.value===si.m.id?`<label class="chk"><input type="radio" name="uibSvW" id="uibSvO" checked>${esc(_t('「{g}」 그룹에 덮어쓰기',{g:si.g.name}))}</label><label class="chk"><input type="radio" name="uibSvW">${esc(T('새 그룹으로 저장'))}</label>`:''};
  if(sl){sl.addEventListener('change',mo);mo()}
}

/* ===================== HTML · CSS 내보내기 ===================== */
function exportCss(d){
  reindex();let out=`/* ${d.name} — Thaniya Engine UI Builder (${d.w}×${d.h}) */\n`;
  walk(d.root,(n,p)=>{const o=cssOf(n,p);out+=`.${cssName(n.name)} {\n`+Object.entries(o).map(([k,v])=>`  ${k}: ${String(v).startsWith('url(data:')?'url(…)':v};`).join('\n')+(n.css?'\n  '+n.css:'')+'\n}\n'});
  return out;
}
function copyText(s){(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast(T('복사했습니다'))).catch(()=>toast(T('복사할 수 없습니다')))}
function exportHtml(d){
  reindex();const root=build(d.root,null,'export',null);root.classList.add('uibS');
  const gf=new Set();walk(d.root,n=>{const k=n.st&&n.st.font;if(k&&k.startsWith('g:')){const f=UI_FONTS[k.slice(2)];if(f&&f.gf)gf.add(f.gf)}});
  const fl=['IBM+Plex+Sans+KR:wght@300;400;500;600;700',...gf].map(x=>'family='+x).join('&');
  const css=CSS.slice(CSS.indexOf('/* 그린 UI'),CSS.indexOf('/* 플레이 중'));
  const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fl}&display=swap">
<style>
html,body{margin:0;height:100%;background:#111;overflow:hidden}
#stage{position:fixed;left:0;top:0;transform-origin:0 0}
${css}
</style></head><body>
<!-- Thaniya Engine UI Builder 에서 내보낸 화면 · 기준 해상도 ${d.w}×${d.h} -->
<div id="stage">${root.outerHTML}</div>
<script>
(function(){var W=${d.w},H=${d.h},M=${d.scale==='fit'?d.match:-1},st=document.getElementById('stage');
function fit(){var vw=innerWidth,vh=innerHeight,s=M<0?1:Math.pow(vw/W,1-M)*Math.pow(vh/H,M);st.style.width=(vw/s)+'px';st.style.height=(vh/s)+'px';st.style.transform='scale('+s+')'}
addEventListener('resize',fit);fit();
document.querySelectorAll('.uR').forEach(function(i){function u(){i.style.setProperty('--p',((i.value-i.min)/(i.max-i.min)*100||0)+'%')}i.addEventListener('input',u);u()});
document.querySelectorAll('.uE-toggle').forEach(function(t){t.addEventListener('click',function(){var on=!t.classList.contains('on');t.classList.toggle('on',on);t.setAttribute('aria-checked',on);var b=t.querySelector('.bx');b.style.background=on?t.dataset.ac:t.dataset.tr})});
})();
</script></body></html>`;
  /* 체크박스 색을 data로 */
  const fixed=html.replace(/class="uE uE-toggle([^"]*)" data-n="([^"]+)"/g,(m0,c,id)=>{const n=nodeOf(id);return n?`class="uE uE-toggle${c}" data-n="${id}" data-ac="${col(n.st.ac||'#3b82f6',1)}" data-tr="${col(n.st.tr||'#3a4050',1)}"`:m0});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([fixed],{type:'text/html'}));a.download=(d.name||'ui').replace(/[\\/:*?"<>|]/g,'_')+'.html';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  toast(_t('「{n}」을(를) HTML 파일로 내보냈습니다',{n:d.name}));
}

/* ===================== 캔버스 조작 ===================== */
const toD=(cx,cy)=>{const s=E.scr.getBoundingClientRect();return{x:(cx-s.left)/U.z,y:(cy-s.top)/U.z}};
function pathAt(cx,cy){
  const d=D();if(!d)return[];
  const rec=n=>{for(let i=n.kids.length-1;i>=0;i--){const k=n.kids[i];if(k.hidden||k.locked)continue;const el=U.dom.get(k.id);if(!el)continue;
    const sub=isBox(k)?rec(k):null;if(sub)return[k,...sub];
    const r=el.getBoundingClientRect();if(cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom)return[k]}return null};
  return rec(d.root)||[];
}
/* 피그마식 선택: 처음엔 화면 바로 아래 요소 → 선택한 요소의 형제·자식으로 들어감 · Ctrl/⌘ = 가장 안쪽 */
function pickAt(cx,cy,deep){
  const path=pathAt(cx,cy);if(!path.length)return null;if(deep)return path[path.length-1];
  const S=prim();
  if(S&&!isRoot(S)){const i=path.indexOf(S);if(i>=0)return S;
    const sp=parOf(S);const j=path.findIndex(n=>parOf(n)===sp);if(j>=0)return path[j];
    for(let k=path.length-1;k>=0;k--)if(isAnc(path[k],S)||path[k]===sp)return path[Math.min(k+1,path.length-1)];}
  return path[0];
}
function containerAt(cx,cy,ex){
  const d=D();const rec=n=>{for(let i=n.kids.length-1;i>=0;i--){const k=n.kids[i];if(k.hidden||!isBox(k)||ex.has(k.id))continue;const el=U.dom.get(k.id);if(!el)continue;const r=el.getBoundingClientRect();if(cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom)return rec(k)||k}return null};
  return rec(d.root)||d.root;
}
/* 스마트 가이드: 부모 · 형제의 모서리 · 가운데 */
function snapTargets(nodes){
  const d=D(),ex=new Set();nodes.forEach(n=>walk(n,x=>ex.add(x.id)));
  const X=[0,d.w/2,d.w],Y=[0,d.h/2,d.h];
  const add=r=>{if(!r)return;X.push(r.x,r.x+r.w/2,r.x+r.w);Y.push(r.y,r.y+r.h/2,r.y+r.h)};
  const ps=new Set(nodes.map(parOf).filter(Boolean));
  ps.forEach(p=>{if(!isRoot(p))add(domRect(p));p.kids.forEach(k=>{if(!ex.has(k.id)&&!k.hidden)add(domRect(k))})});
  return{X,Y};
}
function snap1(vals,T0,thr){let best=null;vals.forEach((v,i)=>T0.forEach(t=>{const dd=t-v;if(Math.abs(dd)<=thr&&(!best||Math.abs(dd)<Math.abs(best.d)))best={d:dd,t,i}}));return best}
function guideHtml(gx,gy,b){
  let h='';if(gx!=null)h+=`<div class="uibGl" style="left:${vx(gx)-.5}px;top:${Math.min(vy(0),vy(b.y))}px;width:1px;height:${Math.max(vy(D().h),vy(b.y+b.h))-Math.min(vy(0),vy(b.y))}px"></div>`;
  if(gy!=null)h+=`<div class="uibGl" style="top:${vy(gy)-.5}px;left:${Math.min(vx(0),vx(b.x))}px;height:1px;width:${Math.max(vx(D().w),vx(b.x+b.w))-Math.min(vx(0),vx(b.x))}px"></div>`;
  return h;
}

E.view.addEventListener('pointerdown',e=>{
  const d=D();if(!d)return;
  if(U.edit&&e.target.closest('[contenteditable]'))return;
  if(U.edit)finishText(true);
  if(e.target.closest('.uibEmpty'))return;
  BOX.focus({preventScroll:true});
  if(U.preview)return;
  const pan=e.button===1||U.space||(e.pointerType==='touch'&&!e.target.closest('.uibH,.uibFh')&&!pathAt(e.clientX,e.clientY).length&&!inScr(e));
  if(pan){startPan(e);return}
  if(e.button!==0)return;
  const fh=e.target.closest('[data-fh]');if(fh){startFrame(e,fh.dataset.fh);return}
  const hd=e.target.closest('[data-h]');if(hd){startResize(e,hd.dataset.h);return}
  const n=pickAt(e.clientX,e.clientY,e.ctrlKey||e.metaKey);
  if(n){
    if(e.shiftKey){U.sel=U.sel.includes(n.id)?U.sel.filter(x=>x!==n.id):U.sel.concat(n.id);renderHier();renderInsp();drawOver();return}
    if(!U.sel.includes(n.id)){U.sel=[n.id];renderHier();renderInsp();drawOver()}
    startMove(e);return;
  }
  /* 빈 곳: 상자 선택 (화면 바로 아래 요소) */
  startMarquee(e);
});
const inScr=e=>{const d=D(),p=toD(e.clientX,e.clientY);return p.x>=0&&p.y>=0&&p.x<=d.w&&p.y<=d.h};
function capture(e,mv,up,el){
  const t=el||E.view;try{t.setPointerCapture(e.pointerId)}catch(_){}
  const M=ev=>mv(ev),UP=ev=>{t.removeEventListener('pointermove',M);t.removeEventListener('pointerup',UP);t.removeEventListener('pointercancel',UP);U.drag=null;up(ev)};
  t.addEventListener('pointermove',M);t.addEventListener('pointerup',UP);t.addEventListener('pointercancel',UP);
}
function startPan(e){
  e.preventDefault();const sx=e.clientX,sy=e.clientY,ox=U.px,oy=U.py;E.view.classList.add('panning');U.drag={t:'pan'};
  capture(e,ev=>{U.px=ox+ev.clientX-sx;U.py=oy+ev.clientY-sy;if(U.zoom==='fit'){U.zoom=U.z;E.zoom.value=''}place()},()=>{E.view.classList.remove('panning')});
}
function startFrame(e,k){
  e.preventDefault();const d=D(),w0=d.w,h0=d.h,sx=e.clientX,sy=e.clientY;begin();U.drag={t:'frame'};const keepFit=U.zoom==='fit';if(keepFit){U.zoom=U.z}
  capture(e,ev=>{const dx=(ev.clientX-sx)/U.z,dy=(ev.clientY-sy)/U.z;
    if(k.includes('e'))d.w=cl(Math.round(w0+dx),64,8192);if(k.includes('s'))d.h=cl(Math.round(h0+dy),64,8192);
    if(ev.shiftKey&&k==='se'){const r=w0/h0;d.h=cl(Math.round(d.w/r),64,8192)}
    reindex();renderStage();renderBar();E.w.value=d.w;E.h.value=d.h},
  ()=>{U.lastW=d.w;U.lastH=d.h;commit();if(keepFit)U.zoom='fit';renderAll()});
}
function startMarquee(e){
  const d=D(),p0=toD(e.clientX,e.clientY);let moved=false;U.drag={t:'mq'};const base=e.shiftKey?U.sel.slice():[];
  capture(e,ev=>{const p=toD(ev.clientX,ev.clientY);if(!moved&&Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)<4)return;moved=true;
    const r={x:Math.min(p0.x,p.x),y:Math.min(p0.y,p.y),w:Math.abs(p.x-p0.x),h:Math.abs(p.y-p0.y)};
    const hit=d.root.kids.filter(k=>!k.hidden&&!k.locked).filter(k=>{const q=domRect(k);return q&&q.x<r.x+r.w&&q.x+q.w>r.x&&q.y<r.y+r.h&&q.y+q.h>r.y}).map(k=>k.id);
    U.sel=[...new Set(base.concat(hit))];drawOver(`<div class="uibMq" style="${boxCss(r)}"></div>`)},
  ()=>{if(!moved){U.sel=[]}renderHier();renderInsp();drawOver()});
}
function startMove(e){
  const S=topSel().filter(n=>!n.locked);if(!S.length)return;
  const sx=e.clientX,sy=e.clientY;let on=false,tg=null,rec=null,box=null;
  const go=()=>{
    on=true;begin();
    rec=S.map(n=>({n,p:parOf(n),fl:flowOf(parOf(n)),r:relRect(n),dr:domRect(n)}));
    box=bounds(rec.map(o=>o.dr).filter(Boolean));tg=snapTargets(S);U.drag={t:'move'};
  };
  capture(e,ev=>{
    if(!on){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;go()}
    let dx=(ev.clientX-sx)/U.z,dy=(ev.clientY-sy)/U.z;const thr=6/U.z;let gx=null,gy=null;
    if(U.snap&&!ev.altKey&&box){
      const bx=snap1([box.x+dx,box.x+box.w/2+dx,box.x+box.w+dx],tg.X,thr),by=snap1([box.y+dy,box.y+box.h/2+dy,box.y+box.h+dy],tg.Y,thr);
      if(bx){dx+=bx.d;gx=bx.t}if(by){dy+=by.d;gy=by.t}}
    if(ev.shiftKey){if(Math.abs(dx)>Math.abs(dy)){dy=0;gy=null}else{dx=0;gx=null}}
    /* 놓을 부모 */
    const ex=new Set();S.forEach(n=>walk(n,x=>ex.add(x.id)));
    const np=containerAt(ev.clientX,ev.clientY,ex);
    let extra='';
    if(np&&(np!==rec[0].p||flowOf(np))){
      if(np!==rec[0].p){const r=domRect(np);if(r)extra+=`<div class="uibDrop" style="${boxCss(r)}"></div>`}
      if(flowOf(np)){const ix=flowIndex(np,ev,ex);U.dropIx=ix;extra+=ix.html}else U.dropIx=null;
    }else U.dropIx=null;
    U.mvd={dx,dy};
    U.dropTo=np;
    rec.forEach(o=>{if(!o.fl)setRel(o.n,o.r.x+dx,o.r.y+dy,o.r.w,o.r.h)});
    renderStage();
    const b2={x:box.x+dx,y:box.y+dy,w:box.w,h:box.h};
    if(rec.some(o=>o.fl)){/* 자동 배치 안의 요소: 끌리는 모양 */extra+=`<div class="uibSelB flow" style="${boxCss(b2)};opacity:.6"></div>`}
    drawOver(extra+(rec.some(o=>!o.fl)&&np===rec[0].p?guideHtml(gx,gy,b2):''));
  },ev=>{
    if(!on){/* 클릭만: 더블클릭 대비 */return}
    const np=U.dropTo;U.dropTo=null;
    if(np&&(np!==rec[0].p||flowOf(np))){
      /* 원래 자리 기준으로 옮김 */
      const ix=flowOf(np)&&U.dropIx?U.dropIx.i:null;
      if(np!==rec[0].p||ix!=null){
        if(np===rec[0].p&&flowOf(np)&&S.every(n=>parOf(n)===np)){const a=np.kids;const moving=S.slice();let i=ix;moving.forEach(n=>{const k=a.indexOf(n);if(k<i)i--;a.splice(k,1)});a.splice(i,0,...moving)}
        else{renderStage();const mv0=U.mvd||{dx:0,dy:0};reparent(S,np,ix,rec.map(o=>o.fl&&o.dr?{x:o.dr.x+mv0.dx,y:o.dr.y+mv0.dy,w:o.dr.w,h:o.dr.h}:null))}
      }
    }
    U.dropIx=null;U.mvd=null;commit();renderAll();
  });
}
/* 자동 배치 안에서 끼울 자리 */
function flowIndex(p,ev,ex){
  const row=p.pr.layout==='row',P0=toD(ev.clientX,ev.clientY);const ks=p.kids.filter(k=>!k.hidden);
  let i=p.kids.length,line=null;
  for(const k of ks){if(ex.has(k.id))continue;const r=domRect(k);if(!r)continue;const mid=row?r.x+r.w/2:r.y+r.h/2;if((row?P0.x:P0.y)<mid){i=p.kids.indexOf(k);line=row?{x:r.x-((p.pr.gap||0)/2),y:r.y,h:r.h}:{x:r.x,y:r.y-((p.pr.gap||0)/2),w:r.w};break}}
  if(!line){const last=[...ks].reverse().find(k=>!ex.has(k.id));const r=last?domRect(last):domRect(p);if(r)line=last?(row?{x:r.x+r.w+((p.pr.gap||0)/2),y:r.y,h:r.h}:{x:r.x,y:r.y+r.h+((p.pr.gap||0)/2),w:r.w}):(row?{x:r.x+(p.pr.pad||0),y:r.y+(p.pr.pad||0),h:Math.max(20,r.h-2*(p.pr.pad||0))}:{x:r.x+(p.pr.pad||0),y:r.y+(p.pr.pad||0),w:Math.max(20,r.w-2*(p.pr.pad||0))})}
  let html='';if(line)html=row?`<div class="uibIns" style="left:${vx(line.x)-1.5}px;top:${vy(line.y)}px;width:3px;height:${line.h*U.z}px"></div>`:`<div class="uibIns" style="left:${vx(line.x)}px;top:${vy(line.y)-1.5}px;height:3px;width:${line.w*U.z}px"></div>`;
  return{i,html};
}
function startResize(e,k){
  e.preventDefault();e.stopPropagation();const n=prim();if(!n||isRoot(n))return;
  begin();const r0=relRect(n),dr=domRect(n),po={x:dr.x-r0.x,y:dr.y-r0.y},fl=flowOf(parOf(n)),tg=snapTargets([n]),sx=e.clientX,sy=e.clientY,ar=r0.w/Math.max(1,r0.h);U.drag={t:'size'};
  capture(e,ev=>{
    let dx=(ev.clientX-sx)/U.z,dy=(ev.clientY-sy)/U.z;let{x,y,w,h}=r0;const thr=6/U.z;let gx=null,gy=null;
    const E1=k.includes('e'),W1=k.includes('w'),N1=k.includes('n'),S1=k.includes('s');
    if(U.snap&&!ev.altKey){
      if(E1){const s=snap1([po.x+r0.x+r0.w+dx],tg.X,thr);if(s){dx+=s.d;gx=s.t}}else if(W1){const s=snap1([po.x+r0.x+dx],tg.X,thr);if(s){dx+=s.d;gx=s.t}}
      if(S1){const s=snap1([po.y+r0.y+r0.h+dy],tg.Y,thr);if(s){dy+=s.d;gy=s.t}}else if(N1){const s=snap1([po.y+r0.y+dy],tg.Y,thr);if(s){dy+=s.d;gy=s.t}}
    }
    const c=ev.altKey&&!fl;
    if(E1){w=r0.w+dx*(c?2:1);if(c)x=r0.x-dx}if(W1){w=r0.w-dx*(c?2:1);x=r0.x+dx}
    if(S1){h=r0.h+dy*(c?2:1);if(c)y=r0.y-dy}if(N1){h=r0.h-dy*(c?2:1);y=r0.y+dy}
    if(ev.shiftKey){if(E1||W1){const nh=w/ar;if(N1)y-=nh-h;h=nh}else{const nw=h*ar;w=nw}}
    if(w<2){if(W1)x-=2-w;w=2}if(h<2){if(N1)y-=2-h;h=2}
    setRel(n,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    renderStage();const b=domRect(n);drawOver(b?guideHtml(gx,gy,b):'');
  },()=>{commit();renderAll()});
}
E.view.addEventListener('pointermove',e=>{
  if(U.drag||U.preview||!D())return;const n=e.target.closest('.uibH,.uibFh')?null:pickAt(e.clientX,e.clientY,e.ctrlKey||e.metaKey);const id=n?n.id:null;
  if(id!==U.hov){U.hov=id;drawOver()}
});
E.view.addEventListener('pointerleave',()=>{if(U.hov&&!U.drag){U.hov=null;drawOver()}});
E.view.addEventListener('dblclick',e=>{
  if(U.preview||!D())return;const path=pathAt(e.clientX,e.clientY);if(!path.length)return;const S=prim();
  const i=path.indexOf(S);
  if(S&&i>=0&&i<path.length-1){U.sel=[path[i+1].id];renderHier();renderInsp();drawOver();return}
  const n=S&&path.includes(S)?S:path[path.length-1];
  if(n&&['text','button','toggle'].includes(n.type))startText(n);else if(n){U.sel=[n.id];renderAll()}
});
E.view.addEventListener('wheel',e=>{
  if(!D())return;e.preventDefault();const r=vr();
  if(e.ctrlKey||e.metaKey){const z=U.z*Math.pow(1.0018,-e.deltaY*(e.deltaMode===1?16:1));setZoom(z,e.clientX-r.left,e.clientY-r.top)}
  else{U.px-=e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX;U.py-=e.shiftKey&&!e.deltaX?0:e.deltaY;if(U.zoom==='fit'){U.zoom=U.z;E.zoom.value=''}place()}
},{passive:false});
/* 글자 바로 고치기 */
function startText(n){
  const el=U.dom.get(n.id);if(!el)return;const t=el.querySelector('.t');if(!t)return;
  U.sel=[n.id];U.edit={id:n.id,old:n.pr.text||''};
  try{t.contentEditable='plaintext-only'}catch(e){t.contentEditable='true'}
  if(t.contentEditable!=='plaintext-only')t.contentEditable='true';
  t.focus();const rg=document.createRange();rg.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(rg);
  t.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Escape'){ev.preventDefault();finishText(false)}else if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();finishText(true)}});
  t.addEventListener('blur',()=>finishText(true),{once:true});
  drawOver();
}
function finishText(ok){
  const ed=U.edit;if(!ed)return;U.edit=null;const n=nodeOf(ed.id),el=U.dom.get(ed.id),t=el&&el.querySelector('.t');
  const v=t?t.innerText.replace(/\n$/,''):ed.old;
  if(ok&&n&&v!==ed.old)edit(()=>{n.pr.text=v});
  renderAll();BOX.focus({preventScroll:true});
}

/* ---- 미리보기 모드 (플레이와 같은 동작을 빌더 안에서) ---- */
E.scr.addEventListener('click',e=>{if(!U.preview)return;const el=e.target.closest('[data-n]');if(!el)return;const n=nodeOf(el.dataset.n);if(!n)return;
  if(n.type==='toggle'){const on=!el.classList.contains('on');setToggle(el,n,on);if(n.pr.onChange)toast(_t('값이 바뀜 → {m}()',{m:n.pr.onChange}))}
  if(n.type==='button'){const a=n.act||{},d=D();
    const shut=(why)=>{const r=E.scr.querySelector('.uibS');if(r)r.style.visibility='hidden';const w=document.createElement('div');w.className='uibPvShut';w.innerHTML=`<div><b>${esc(_t('「{g}」 그룹이 닫혔어요',{g:d.name}))}</b><p>${esc(why)}</p><button type="button" class="uibIb" data-pvback="1">${esc(T('다시 보기'))}</button></div>`;E.view.append(w)};
    if(a.t==='close')shut(T('플레이 중에도 이 버튼을 누르면 이렇게 사라져요.'));
    else if(a.t==='open'&&a.v){if(a.cs)shut(_t('플레이에서는 「{v}」 그룹이 열리고 이 그룹은 닫혀요.',{v:a.v}));else toast(_t('플레이에서는 「{v}」 그룹이 열려요',{v:a.v}))}
    else{const L0={none:'동작 없음',toggle:'UI 그룹 열기/닫기',scene:'씬 이동',method:'메서드 실행',msg:'알림',stop:'플레이 종료',open:'UI 그룹 열기'};toast(_t('「{n}」 → {a}',{n:n.name,a:T(L0[a.t]||'동작 없음')+(a.v&&a.t==='method'?' '+a.v+'()':'')}))}
    hostEv('preview',{n,a,d});
  }
});
E.scr.addEventListener('input',e=>{if(!U.preview)return;const i=e.target;if(i.classList.contains('uR'))i.style.setProperty('--p',pct(+i.value,+i.min,+i.max)+'%')});
function setToggle(el,n,on){el.classList.toggle('on',on);el.setAttribute('aria-checked',on?'true':'false');const b=el.querySelector('.bx');if(b)b.style.background=col(on?n.st.ac||'#3b82f6':n.st.tr||'#3a4050',1)}

/* ===================== 요소 라이브러리 (끌어다 놓기 · 클릭) ===================== */
E.lib.addEventListener('pointerdown',e=>{
  const it=e.target.closest('[data-lib]');if(!it||e.button!==0||!D())return;e.preventDefault();BOX.focus({preventScroll:true});
  const type=it.dataset.lib,sx=e.clientX,sy=e.clientY;let g=null,tgt=null;
  try{it.setPointerCapture(e.pointerId)}catch(_){}
  const mv=ev=>{
    if(!g){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;g=document.createElement('div');g.className='uibGhost';g.innerHTML=IC[type]+esc(T(TYPES[type].n));(BOX.ownerDocument.body).append(g)}
    g.style.left=(ev.clientX+12)+'px';g.style.top=(ev.clientY+10)+'px';
    const r=vr();const inV=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
    if(inV&&!U.preview){const np=containerAt(ev.clientX,ev.clientY,new Set());tgt=np;let extra='';const pr=domRect(np);if(pr&&!isRoot(np))extra+=`<div class="uibDrop" style="${boxCss(pr)}"></div>`;if(flowOf(np)){const ix=flowIndex(np,ev,new Set());U.dropIx=ix;extra+=ix.html}else U.dropIx=null;drawOver(extra)}
    else{tgt=null;drawOver()}
  };
  const up=ev=>{it.removeEventListener('pointermove',mv);it.removeEventListener('pointerup',up);it.removeEventListener('pointercancel',up);
    if(g){g.remove();if(tgt&&ev.type==='pointerup'){const np=tgt,pr=domRect(np),p=toD(ev.clientX,ev.clientY);let n;
        edit(()=>{n=addNode(type,np,flowOf(np)?{index:U.dropIx?U.dropIx.i:null}:{x:p.x-(pr?pr.x:0),y:p.y-(pr?pr.y:0)});U.sel=[n.id]});U.dropIx=null;renderAll()}else drawOver();return}
    if(ev.type!=='pointerup')return;
    /* 클릭: 고른 패널 안(아니면 그 부모 · 화면)에 추가 */
    let p=prim();if(p&&!isBox(p))p=parOf(p);let n;edit(()=>{n=addNode(type,p||D().root,null);U.sel=[n.id]});renderAll();
  };
  it.addEventListener('pointermove',mv);it.addEventListener('pointerup',up);it.addEventListener('pointercancel',up);
});
E.lib.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const it=e.target.closest('[data-lib]');if(!it||!D())return;e.preventDefault();let p=prim();if(p&&!isBox(p))p=parOf(p);let n;edit(()=>{n=addNode(it.dataset.lib,p||D().root,null);U.sel=[n.id]});renderAll()}});

/* ===================== 계층 구조 조작 ===================== */
E.hier.addEventListener('click',e=>{
  const cr=e.target.closest('[data-cr]');if(cr){const id=cr.dataset.cr;U.col.has(id)?U.col.delete(id):U.col.add(id);renderHier();return}
  const ey=e.target.closest('[data-eye]');if(ey){const n=nodeOf(ey.dataset.eye);if(n){edit(()=>{n.hidden=!n.hidden});renderAll()}return}
  const lk=e.target.closest('[data-lock]');if(lk){const n=nodeOf(lk.dataset.lock);if(n){edit(()=>{n.locked=!n.locked});renderAll()}return}
});
E.hier.addEventListener('dblclick',e=>{const r=e.target.closest('.uibRow');if(!r||e.target.closest('button'))return;renameRow(r.dataset.id)});
function renameRow(id){
  const n=nodeOf(id);if(!n)return;const row0=E.hier.querySelector(`.uibRow[data-id="${window.CSS.escape(id)}"] .nm`);if(!row0)return;
  const i=document.createElement('input');i.type='text';i.className='rn';i.value=n.name;i.maxLength=60;row0.replaceWith(i);i.focus();i.select();
  const done=ok=>{if(!i.isConnected)return;const v=i.value.trim();if(ok&&v&&v!==n.name){if(isRoot(n))setField('d.name',v,'str',false);else{edit(()=>{n.name=v});renderAll()}}else renderHier()};
  i.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();done(true)}else if(ev.key==='Escape'){ev.preventDefault();done(false)}});
  i.addEventListener('blur',()=>done(true));
}
E.hier.addEventListener('pointerdown',e=>{
  const r=e.target.closest('.uibRow');if(!r||e.button!==0||e.target.closest('button,input'))return;BOX.focus({preventScroll:true});
  const n=nodeOf(r.dataset.id);if(!n)return;
  if(isRoot(n))U.sel=[];
  else if(e.shiftKey||e.ctrlKey||e.metaKey)U.sel=U.sel.includes(n.id)?U.sel.filter(x=>x!==n.id):U.sel.concat(n.id);
  else if(!U.sel.includes(n.id))U.sel=[n.id];
  renderHier();renderInsp();drawOver();
  if(isRoot(n))return;
  const sy=e.clientY,sx=e.clientX;let on=false,ind=null,drop=null;
  const C=E.hier;try{C.setPointerCapture(e.pointerId)}catch(_){}
  const mv=ev=>{
    if(!on){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<5)return;on=true;ind=document.createElement('div');ind.className='uibHins';E.hier.append(ind)}
    E.hier.querySelectorAll('.dropin').forEach(x=>x.classList.remove('dropin'));
    const rows=[...E.hier.querySelectorAll('.uibRow')],hr=E.hier.getBoundingClientRect();drop=null;
    const S=topSel();
    for(const rw of rows){const b=rw.getBoundingClientRect();if(ev.clientY<b.top||ev.clientY>b.bottom)continue;const t=nodeOf(rw.dataset.id);if(!t)break;
      if(S.some(s=>s===t||isAnc(s,t)))break;
      const f=(ev.clientY-b.top)/b.height;
      if(isRoot(t)||(isBox(t)&&f>.28&&f<.72))drop={t,mode:'in',rw};else drop={t,mode:f<.5?'before':'after',rw};
      break}
    if(!drop&&rows.length){const last=rows[rows.length-1].getBoundingClientRect();if(ev.clientY>last.bottom)drop={t:D().root,mode:'in',rw:rows[0]}}
    if(drop&&drop.mode==='in'){drop.rw.classList.add('dropin');ind.style.display='none'}
    else if(drop){const b=drop.rw.getBoundingClientRect();ind.style.display='';ind.style.top=(drop.mode==='before'?b.top:b.bottom)-hr.top+E.hier.scrollTop-1+'px';const dp=+getComputedStyle(drop.rw).getPropertyValue('--d')||0;ind.style.left=(8+dp*14+20)+'px'}
    else ind.style.display='none';
  };
  const up=ev=>{C.removeEventListener('pointermove',mv);C.removeEventListener('pointerup',up);C.removeEventListener('pointercancel',up);if(ind)ind.remove();E.hier.querySelectorAll('.dropin').forEach(x=>x.classList.remove('dropin'));
    if(!on||!drop||ev.type!=='pointerup')return;
    const S=topSel();if(!S.length)return;
    let np,ix;if(drop.mode==='in'){np=drop.t;ix=null}else{np=parOf(drop.t);ix=np.kids.indexOf(drop.t)+(drop.mode==='after'?1:0)}
    edit(()=>{
      if(S.every(s=>parOf(s)===np)){const a=np.kids;let i=ix==null?a.length:ix;S.forEach(s=>{const k=a.indexOf(s);if(k<i)i--;a.splice(k,1)});a.splice(i,0,...S)}
      else reparent(S,np,ix);
      U.col.delete(np.id);
    });renderAll();
  };
  C.addEventListener('pointermove',mv);C.addEventListener('pointerup',up);C.addEventListener('pointercancel',up);
});
E.hier.addEventListener('contextmenu',e=>{const r=e.target.closest('.uibRow');if(!r)return;e.preventDefault();const n=nodeOf(r.dataset.id);if(n&&!isRoot(n)&&!U.sel.includes(n.id)){U.sel=[n.id];renderAll()}if(n&&isRoot(n)){U.sel=[];renderAll()}ctxMenu(e.clientX,e.clientY)});
E.view.addEventListener('contextmenu',e=>{e.preventDefault();if(U.preview||!D())return;const n=pickAt(e.clientX,e.clientY,e.ctrlKey||e.metaKey);if(n&&!U.sel.includes(n.id)){U.sel=[n.id];renderAll()}else if(!n){U.sel=[];renderAll()}ctxMenu(e.clientX,e.clientY)});
function ctxMenu(x,y){
  const S=topSel(),n=prim(),has=S.length>0;
  const items=[];
  if(!has){items.push(...LIB.map(k=>({label:_t('{n} 추가',{n:T(TYPES[k].n)}),fn:()=>{let m;edit(()=>{m=addNode(k,D().root,null);U.sel=[m.id]});renderAll()}})),{sep:1},{label:T('붙여넣기'),key:'Ctrl+V',disabled:!U.clip,fn:paste})}
  else{
    if(S.length===1)items.push({label:T('이름 바꾸기'),key:'F2',fn:()=>renameRow(n.id)});
    if(S.length===1&&['text','button','toggle'].includes(n.type))items.push({label:T('글자 고치기'),key:T('더블클릭'),fn:()=>startText(n)});
    items.push({label:T('복제'),key:'Ctrl+D',fn:dupSel},{label:T('복사'),key:'Ctrl+C',fn:()=>copySel(false)},{label:T('잘라내기'),key:'Ctrl+X',fn:()=>copySel(true)},{label:T('붙여넣기'),key:'Ctrl+V',disabled:!U.clip,fn:paste},{sep:1},
      {label:T('맨 앞으로'),key:'Ctrl+Shift+]',fn:()=>order('top')},{label:T('앞으로'),key:'Ctrl+]',fn:()=>order('up')},{label:T('뒤로'),key:'Ctrl+[',fn:()=>order('down')},{label:T('맨 뒤로'),key:'Ctrl+Shift+[',fn:()=>order('bottom')},{sep:1},
      {label:T('패널로 묶기'),key:'Ctrl+G',fn:groupSel},{label:T('묶음 풀기'),key:'Ctrl+Shift+G',disabled:!(S.length===1&&n.type==='panel'&&n.kids.length),fn:ungroup},{sep:1},
      {label:T(n.hidden?'보이기':'숨기기'),fn:()=>{edit(()=>S.forEach(s=>s.hidden=!n.hidden));renderAll()}},{label:T(n.locked?'잠금 풀기':'잠그기'),fn:()=>{edit(()=>S.forEach(s=>s.locked=!n.locked));renderAll()}},{sep:1},
      {label:T('삭제'),key:'Delete',fn:delSel});
  }
  showMenuAt(x,y,items);
}

/* ===================== 인스펙터 조작 ===================== */
E.insp.addEventListener('input',e=>{const t=e.target,f=t.dataset.f;if(!f)return;
  if(t.type==='color'){const tx=t.parentElement.querySelector('[data-t=hex]');if(tx)tx.value=t.value}
  if(t.dataset.t==='hex'&&!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t.value.trim()))return;
  if(t.tagName==='SELECT'||t.type==='checkbox')return;
  setField(f,t.type==='checkbox'?t.checked:t.value,t.dataset.t,true);
  if(t.type==='range'&&t.nextElementSibling)t.nextElementSibling.textContent=f==='st.op'?Math.round(t.value*100)+'%':fmt(t.value);
  if(t.dataset.t==='hex'){const c=t.parentElement.querySelector('input[type=color]');if(c&&/^#[0-9a-f]{6}$/i.test(t.value))c.value=t.value}
  drawOver();
});
E.insp.addEventListener('change',e=>{const t=e.target,f=t.dataset.f;if(!f)return;
  if(t.tagName==='SELECT'||t.type==='checkbox'){setField(f,t.type==='checkbox'?t.checked:t.value,t.dataset.t,false);return}
  if(t.dataset.t==='hex'&&t.value.trim()===''){begin();sel().forEach(n=>{const[a,b]=f.split('.');if(n[a])delete n[a][b]});if(!sel().length&&f.startsWith('st.'))delete D().root.st[f.slice(3)];commit();renderAll();return}
  commit();if(t.dataset.re||f==='d.w'||f==='d.h'||f==='r.x'||f==='r.y'||f==='r.w'||f==='r.h'||f==='n.name'||f==='d.name')renderAll();else{renderBar();renderStage();renderHier()}
});
E.insp.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input[type=text],input[type=number]')){e.preventDefault();e.target.blur()}});
E.insp.addEventListener('click',e=>{
  const fo=e.target.closest('[data-fold]');if(fo){const k=fo.dataset.fold;U.fold.has(k)?U.fold.delete(k):U.fold.add(k);saveU();fo.parentElement.classList.toggle('closed');return}
  const sg=e.target.closest('[data-seg]');if(sg){const f=sg.dataset.seg,v=sg.dataset.v;
    if(f==='al'){alignTo(v);return}
    if(f==='fx'||f==='fy'){const n=prim();if(n){edit(()=>{n[f]=v==='1'});renderAll()}return}
    const t=/^-?\d+(\.\d+)?$/.test(v)&&f!=='pr.layout'?'num':'str';setField(f,v,t,false);return}
  const an=e.target.closest('[data-anc]');if(an){const n=prim();if(!n||isRoot(n))return;const ax=an.dataset.anc[0],ay=an.dataset.anc[1];edit(()=>setAnchor(n,ax,ay,e.shiftKey));renderAll();return}
  const sp=e.target.closest('[data-spr]');if(sp){const f=sp.dataset.spr,cur0=av(f)||'';spritePickerModal(cur0,ref=>{SPR.clear();setField(f,ref||'','str',false)});return}
  const sx=e.target.closest('[data-sprx]');if(sx){setField(sx.dataset.sprx,'','str',false);return}
  const a=e.target.closest('[data-a]');if(a){if(a.dataset.a==='distH')distribute('h');else if(a.dataset.a==='distV')distribute('v')}
});
/* 라벨 끌어서 값 바꾸기 (피그마처럼) */
E.insp.addEventListener('pointerdown',e=>{
  const s=e.target.closest('[data-scrub]');if(!s||e.button!==0)return;const inp=s.parentElement.querySelector('input');if(!inp||inp.disabled)return;e.preventDefault();
  const f=s.dataset.scrub,st=+s.dataset.step||1,mn=s.dataset.min!=null?+s.dataset.min:-1e9,mx=s.dataset.max!=null?+s.dataset.max:1e9,v0=parseFloat(inp.value)||0,sx=e.clientX;
  try{s.setPointerCapture(e.pointerId)}catch(_){}
  const mv=ev=>{const k=ev.shiftKey?10:ev.altKey?.1:1;let v=v0+Math.round((ev.clientX-sx)/2)*st*k;v=cl(Math.round(v/st/(ev.altKey?.1:1))*st*(ev.altKey?.1:1),mn,mx);v=r2(v);inp.value=v;setField(f,v,'num',true);drawOver()};
  const up=()=>{s.removeEventListener('pointermove',mv);s.removeEventListener('pointerup',up);s.removeEventListener('pointercancel',up);commit();renderAll()};
  s.addEventListener('pointermove',mv);s.addEventListener('pointerup',up);s.addEventListener('pointercancel',up);
});

/* ===================== 위 막대 ===================== */
E.bar.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
  if(a==='rot'){const d=D();if(!d)return;edit(()=>{[d.w,d.h]=[d.h,d.w]});renderAll()}
  else if(a==='grid'){U.grid=!U.grid;saveU();renderBar();renderStage()}
  else if(a==='guide'){U.guide=!U.guide;saveU();renderBar();renderStage()}
  else if(a==='snap'){U.snap=!U.snap;saveU();renderBar();toast(T(U.snap?'스마트 가이드 붙이기 켬':'스마트 가이드 붙이기 끔'))}
  else if(a==='undo')undoStep(false);else if(a==='redo')undoStep(true);
  else if(a==='preview')setPreview(!U.preview);
  else if(a==='export'){const d=D();if(d)exportHtml(d)}
  else if(a==='save')saveDialog();
  else if(a==='reset')resetDoc();
  else if(a==='full')setFull(!U.full);
  else if(a==='showL'){BOX.classList.toggle('showL');BOX.classList.remove('showR')}
  else if(a==='showR'){BOX.classList.toggle('showR');BOX.classList.remove('showL')}
});
E.bar.addEventListener('change',e=>{
  const t=e.target,k=t.dataset.k,d=D();
  if(!d)return;
  if(k==='dev'){const dv=devList().find(x=>x.id===t.value);if(!dv){renderBar();return}edit(()=>{d.w=dv.w;d.h=dv.h;U.lastW=d.w;U.lastH=d.h});U.zoom='fit';renderAll();return}
  if(k==='w'||k==='h'){const v=cl(Math.round(+t.value||0),64,8192);edit(()=>{d[k]=v});renderAll();return}
  if(k==='zoom'){if(t.value==='fit'){U.zoom='fit';place()}else if(t.value)setZoom(+t.value)}
});
function setFull(on){
  U.full=!!on;const el=panelEl.uib;if(el){el.classList.toggle('uibFull',U.full);if(U.full)el.classList.remove('collapsed')}
  const b=E.bar.querySelector('[data-a=full]');if(b){b.innerHTML=U.full?IC.fsOff:IC.fsOn;b.classList.toggle('on',U.full);const t=T(U.full?'전체 화면 끝내기 (Esc)':'전체 화면 (Shift+Space · Esc: 돌아가기)');b.title=t;b.setAttribute('aria-label',t)}
  {const hb=el&&el.querySelector('[data-uibw="full"]');if(hb){try{hb.innerHTML=ico(U.full?'lfullx':'lfull')}catch(e){}const t=T(U.full?'전체화면 끝내기 (Esc)':'전체화면 (Shift+Space)');hb.title=t;hb.setAttribute('aria-label',t)}}
  if(U.zoom==='fit')requestAnimationFrame(()=>place());else requestAnimationFrame(()=>drawOver());
  BOX.focus({preventScroll:true});
}
E.view.addEventListener('click',e=>{if(e.target.closest('[data-pvback]')){const w=E.view.querySelector('.uibPvShut');if(w)w.remove();renderStage()}});
function setPreview(on){{const w=E.view.querySelector('.uibPvShut');if(w)w.remove()}U.preview=!!on;U.hov=null;BOX.classList.toggle('pv',U.preview);if(U.preview)U.sel=[];renderAll()}

/* ===================== 단축키 (이 창에 초점이 있을 때) ===================== */
BOX.addEventListener('pointerdown',e=>{const t=e.target;if(!t.closest('input,select,textarea,[contenteditable],button'))setTimeout(()=>{if(!BOX.contains(document.activeElement)||document.activeElement===document.body)BOX.focus({preventScroll:true})},0)},true);
BOX.addEventListener('keydown',e=>{
  const t=e.target,typing=/INPUT|TEXTAREA|SELECT/.test(t.tagName)&&t.type!=='checkbox'&&t.type!=='range'||t.isContentEditable;
  if(typing)return;
  let combo='';try{combo=kbCombo(e)}catch(_){}
  try{const cmd=combo&&kbFind(combo);if(cmd&&cmd.global)return}catch(_){}
  const k=e.key,ctrl=e.ctrlKey||e.metaKey,code=e.code;let done=true;
  const S=topSel();
  if(U.preview){if(k==='Escape')setPreview(false);else done=false}
  else if(ctrl&&code==='KeyZ'&&!e.shiftKey)undoStep(false);
  else if(ctrl&&(code==='KeyY'||(code==='KeyZ'&&e.shiftKey)))undoStep(true);
  else if(ctrl&&code==='KeyD')dupSel();
  else if(ctrl&&code==='KeyC')copySel(false);
  else if(ctrl&&code==='KeyX')copySel(true);
  else if(ctrl&&code==='KeyV')paste();
  else if(ctrl&&code==='KeyA'){const d=D(),p=prim()&&!isRoot(prim())?parOf(prim()):d.root;U.sel=p.kids.filter(x=>!x.locked&&!x.hidden).map(x=>x.id);renderHier();renderInsp();drawOver()}
  else if(ctrl&&code==='KeyG'&&e.shiftKey)ungroup();
  else if(ctrl&&code==='KeyG')groupSel();
  else if(ctrl&&code==='BracketRight')order(e.shiftKey?'top':'up');
  else if(ctrl&&code==='BracketLeft')order(e.shiftKey?'bottom':'down');
  else if(ctrl&&(code==='Digit0'||code==='Numpad0')){U.zoom='fit';E.zoom.value='fit';place()}
  else if(ctrl&&(code==='Digit1'||code==='Numpad1'))setZoom(1);
  else if(ctrl&&(code==='Equal'||code==='NumpadAdd'))setZoom(U.z*1.25);
  else if(ctrl&&(code==='Minus'||code==='NumpadSubtract'))setZoom(U.z/1.25);
  else if(k==='Delete'||k==='Backspace'){if(S.length)delSel();else done=false}
  else if(k==='F2'){const n=prim();if(n)renameRow(n.id);else{const d=D();if(d)renameRow(d.root.id)}}
  else if(k==='Enter'){const n=prim();if(n&&['text','button','toggle'].includes(n.type))startText(n);else if(n&&n.kids&&n.kids.length){U.sel=[n.kids[0].id];renderAll()}else done=false}
  else if(k==='Escape'){const n=prim();if(n&&!isRoot(n)){const p=parOf(n);U.sel=p&&!isRoot(p)?[p.id]:[];renderAll()}else if(U.full)setFull(false);else done=false}
  else if(code==='Space'&&e.shiftKey)setFull(!U.full);
  else if(k.startsWith('Arrow')&&S.length){const st=e.shiftKey?10:1,dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;
    edit(()=>S.forEach(n=>{if(n.locked)return;const p=parOf(n);if(flowOf(p)){if((p.pr.layout==='row'&&dx)||(p.pr.layout==='col'&&dy)){const a=p.kids,i=a.indexOf(n),j=cl(i+Math.sign(dx||dy),0,a.length-1);a.splice(i,1);a.splice(j,0,n)}return}const r=relRect(n);setRel(n,r.x+dx,r.y+dy,r.w,r.h)}));renderAll()}
  else if(code==='Space'){U.space=true;E.view.classList.add('pan')}
  else done=false;
  if(done){e.preventDefault();e.stopPropagation()}
  else if(!ctrl&&!e.altKey&&combo&&!/^F\d+$/.test(k)){e.stopPropagation()}  /* 씬 도구 단축키(W·E·R…)가 이 창에서 눌리지 않게 */
});
BOX.addEventListener('keyup',e=>{if(e.code==='Space'){U.space=false;E.view.classList.remove('pan')}});
BOX.addEventListener('focusout',()=>{setTimeout(()=>{if(!BOX.contains(document.activeElement)){U.space=false;E.view.classList.remove('pan')}},0)});

/* 전체 화면에서 Esc: 초점이 빌더 밖에 있어도 (대화상자·메뉴가 닫혀 있을 때) */
addEventListener('keydown',e=>{if(!U.full||e.key!=='Escape'||BOX.contains(e.target))return;const t=e.target;if(/INPUT|TEXTAREA|SELECT/.test(t.tagName||'')||t.isContentEditable)return;
  const mo=document.getElementById('modal'),mn=document.getElementById('menu');if((mo&&!mo.hidden)||(mn&&!mn.hidden))return;e.preventDefault();e.stopPropagation();setFull(false)},true);
/* 창 크기 변화 */
let roT=0;
const RO=new ResizeObserver(()=>{cancelAnimationFrame(roT);roT=requestAnimationFrame(()=>{if(!E.view.clientWidth)return;if(U.first&&D()){U.first=false;U.zoom='fit'}place()})});
RO.observe(E.view);

/* ===================== 열기 ===================== */
function open(nodeId){
  reindex();U.sel=nodeId&&MAP.has(nodeId)&&!isRoot(nodeOf(nodeId))?[nodeId]:[];
  D();SPR.clear();
  const id='uib';
  if(POPPED.has(id)){try{POPPED.get(id).win.focus()}catch(e){}renderAll();return}
  if(mqN.matches){L.hidden[id]=false;L.nActive=id;saveLayout();renderLayout()}
  else if(L.hidden[id]){delete L.collapsed[id];movePanel(id,'float',0,bigFloat(),true);raise(id)}
  else{
    const r=rootOf(id);if(L.tabs[id]&&L.active[r]!==id){L.active[r]=id;saveLayout();renderLayout()}
    if([r,...kidsOf(r)].some(k=>L.collapsed[k])){[r,...kidsOf(r)].forEach(k=>{delete L.collapsed[k];panelEl[k].classList.remove('collapsed')});saveLayout()}
    if(L.float[r])raise(r);else if(L.center&&L.center.includes(id)&&L.cActive!==id){L.cActive=id;saveLayout();renderLayout()}
  }
  U.zoom='fit';renderAll();requestAnimationFrame(()=>{place();BOX.focus({preventScroll:true})});
}
function close(){if(U.full)setFull(false);L.hidden.uib=true;saveLayout();renderLayout()}
function toggle(){if(!L.hidden.uib||POPPED.has('uib'))close();else open()}

/* ===================== 플레이: UI 빌더로 만든 그룹을 HTML/CSS로 게임 화면 위에 =====================
   씬에 들어가면 그 씬의 g.uib 그룹마다 DOM을 만들어 #play 위에 겹침 · 그룹의 엔진 요소(u.uibN)가 보이는지·글자를 매 프레임 따라감
   (UIGroup.SetActive · 요소 SetActive · Text 대입 같은 기존 스크립트도 그대로 먹힘) · 정지하면 지움 */
const RT={on:false,el:null,list:[],mid:null,raf:0,key:''};
function rtStart(){
  rtStop();const host=playHostEl();if(!host)return;SPR.clear();
  const el=document.createElement('div');el.className='uibRt';const bar=host.querySelector('.pbar');host.insertBefore(el,bar||null);
  RT.el=el;RT.on=true;RT.mid=null;RT.key='';RT.list=[];
  el.addEventListener('click',rtClick);el.addEventListener('input',rtInput);el.addEventListener('change',rtChange);
  el.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.closest('[data-n]'))e.stopPropagation();if(e.key==='Escape'&&e.target.blur)e.target.blur()});
  el.addEventListener('keyup',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))e.stopPropagation()});
  el.addEventListener('pointerdown',e=>{if(e.target.closest('[data-n]'))e.stopPropagation()});
  rtTick();
}
function rtStop(){RT.on=false;cancelAnimationFrame(RT.raf);if(RT.el)RT.el.remove();RT.el=null;RT.list=[]}
function rtBuild(m){
  RT.el.innerHTML='';RT.list=[];RT.key='';
  (m.uiGroups||[]).forEach(g=>{if(!g.uib||typeof g.uib!=='object')return;
    const d=normDoc(CL(g.uib)),w=document.createElement('div');w.className='uibRtS';w.style.display='none';const dom=new Map();
    const m0=MAP;MAP=new Map();walk(d.root,(n,p,dp)=>MAP.set(n.id,{n,p,dp}));
    walk(d.root,n=>{n.hidden=false});const r=build(d.root,null,'play',dom);r.classList.add('uibS');if(d.modal)r.classList.add('uibModal');w.append(r);MAP=m0;
    RT.el.append(w);RT.list.push({g,d,w,dom,last:new Map(),vis:null});
  });
}
const mirrors=(m,s)=>(m.ui||[]).filter(u=>u.group===s.g.id);
function rtTick(){
  if(!RT.on)return;if(!play){rtStop();return}
  const m=play.m;if(m&&m.id!==RT.mid){RT.mid=m.id;rtBuild(m)}
  RT.list.forEach(s=>{
    const mm=mirrors(m,s),byN=new Map(mm.filter(u=>u.uibN).map(u=>[u.uibN,u])),vis=mm.some(u=>u.visible!==false);
    if(vis!==s.vis){s.vis=vis;s.w.style.display=vis?'':'none'}
    if(!vis)return;
    s.dom.forEach((el,id)=>{if(id===s.d.root.id)return;const u=byN.get(id);if(!u)return;
      const hide=u.visible===false;if(el._h!==hide){el._h=hide;el.style.display=hide?'none':''}
      const n=rtNode(s,id);if(!n)return;
      if((n.type==='text'||n.type==='button'||n.type==='toggle')&&u.props&&u.props.text!==s.last.get(id)){s.last.set(id,u.props.text);if(s.last.has(id+':i')){const t=el.querySelector('.t');if(t)t.textContent=u.props.text==null?'':String(u.props.text);n.pr.text=u.props.text}else s.last.set(id+':i',1)}
      if(n.type==='progress'){const v=n.pr.src==='hp'?cl(num(play.hp,100),0,100):num(u.props&&u.props.value,0)*100;if(v!==s.last.get(id)){s.last.set(id,v);const f=el.querySelector('.fill');if(f)f.style.width=cl(v,0,100)+'%'}}
    });
  });
  const host=RT.el.parentElement,W=host.clientWidth,Hh=host.clientHeight,vw=play.vw||W,vh=play.vh||Hh,key=W+'x'+Hh+'|'+vw+'x'+vh;
  if(key!==RT.key){RT.key=key;let C;try{C=uiScaleFor(m,vw,vh)}catch(e){C={s:1,w:vw,h:vh}}const k=(W||1)/(vw||1);RT.list.forEach(s=>{s.w.style.width=r2(C.w)+'px';s.w.style.height=r2(C.h)+'px';s.w.style.transform=`scale(${C.s*k})`})}
  RT.raf=requestAnimationFrame(rtTick);
}
/* 그룹 보이기/숨기기 (빌더 그룹이든 일반 그룹이든 · 엔진 요소의 visible로) */
function grpVis(m,g,on){const s=RT.list.find(x=>x.g.id===g.id);(m.ui||[]).filter(u=>u.group===g.id).forEach(u=>{let hid=false;if(on&&s&&u.uibN){const n=rtNode(s,u.uibN);if(n&&g.uib){let src=null;walk(g.uib.root,x=>{if(x.id===u.uibN)src=x});hid=!!(src&&src.hidden)}}u.visible=on&&!hid});if(on&&s){RT.el.append(s.w)}hostEv(on?'show':'hide',{g})}
const grpOpen=(m,g)=>(m.ui||[]).some(u=>u.group===g.id&&u.visible!==false);
function rtNode(s,id){let r=null;walk(s.d.root,n=>{if(n.id===id)r=n});return r}
const mirrorOf=(s,n)=>(play.m.ui||[]).find(u=>u.group===s.g.id&&u.uibN===n.id)||null;
function owners(){const m=play.m;return[...m.objs.filter(o=>{try{return objOn(m,o)}catch(e){return true}}),...(m.ui||[]),...(play.mgrs||[])]}
function broadcast(fn){
  if(!play||!fn)return;const m=play.m;let n=0;
  for(const o of owners()){if(!play||play.m!==m)break;try{if(uiHasHandler(o,fn)){n++;csRunMethods(m,o,[fn])}}catch(e){console.error(e)}}
  if(!n)try{clog('warn',_t("UI: '{f}()' 메서드를 가진 스크립트가 씬에 없습니다",{f:fn}))}catch(e){}
}
const rtOf=el=>{const w=el.closest('.uibRtS');return RT.list.find(s=>s.w===w)||null};
const fire=(s,n,fn)=>{try{const u=mirrorOf(s,n);if(u)uiFire(u,fn)}catch(e){console.error(e)}};
function rtClick(e){
  if(!play)return;const el=e.target.closest('[data-n]');if(!el)return;const s=rtOf(el);if(!s)return;const n=rtNode(s,el.dataset.n);if(!n)return;const m=play.m;
  if(n.type==='toggle'){const on=!el.classList.contains('on');n.pr.checked=on;setToggle(el,n,on);fire(s,n,'OnValueChanged');if(n.pr.onChange)broadcast(n.pr.onChange);return}
  if(n.type!=='button')return;e.stopPropagation();
  fire(s,n,'OnClick');if(!play||play.m!==m)return;
  const a=n.act||{};
  if(a.t==='close')grpVis(m,s.g,false);
  else if(a.t==='open'||a.t==='toggle'){const t=(m.uiGroups||[]).find(x=>x.name===a.v);if(t)grpVis(m,t,a.t==='open'?true:!grpOpen(m,t));if(a.t==='open'&&a.cs&&t!==s.g)grpVis(m,s.g,false)}
  else if(a.t==='scene'){if(a.v&&P.maps.some(x=>x.id===a.v)){const pp=play;setTimeout(()=>{if(play&&play===pp)enter(a.v,null,null)},0)}}
  else if(a.t==='method')broadcast(a.v);
  else if(a.t==='msg'){play.msg=a.v||'';play.msgT=2}
  else if(a.t==='stop')setTimeout(()=>stopPlay(),0);
  hostEv('click',{g:s.g,n,a});
}
function rtInput(e){const i=e.target;if(i.classList.contains('uR'))i.style.setProperty('--p',pct(+i.value,+i.min,+i.max)+'%');const el=i.closest('[data-n]'),s=el&&rtOf(el),n=s&&rtNode(s,el.dataset.n);if(!n)return;
  if(n.type==='slider')n.pr.value=+i.value;else if(n.type==='input')n.pr.value=i.value;}
function rtChange(e){const i=e.target,el=i.closest('[data-n]'),s=el&&rtOf(el),n=s&&rtNode(s,el.dataset.n);if(!n)return;
  if(n.type==='dropdown')n.pr.value=+i.value;if(n.type==='slider')n.pr.value=+i.value;if(n.type==='input')n.pr.value=i.value;
  fire(s,n,'OnValueChanged');if(n.pr.onChange)broadcast(n.pr.onChange)}
function rtVal(s,n){const el=s.dom.get(n.id);
  if(n.type==='toggle')return!!n.pr.checked;
  if(n.type==='slider'){const i=el&&el.querySelector('input');return i?+i.value:num(n.pr.value,0)}
  if(n.type==='progress'){const u=mirrorOf(s,n);return u?r2(num(u.props.value,0)*(num(n.pr.max,100)-num(n.pr.min,0))+num(n.pr.min,0)):num(n.pr.value,0)}
  if(n.type==='input'){const i=el&&el.querySelector('input');return i?i.value:String(n.pr.value||'')}
  if(n.type==='dropdown'){const i=el&&el.querySelector('select');return i?+i.value:num(n.pr.value,0)}
  return n.pr.text==null?'':String(n.pr.text)}
function rtSetVal(s,n,v){const el=s.dom.get(n.id);if(!el)return;
  if(n.type==='toggle'){n.pr.checked=!!v&&v!=='false';setToggle(el,n,n.pr.checked)}
  else if(n.type==='slider'){const i=el.querySelector('input');i.value=v;n.pr.value=+i.value;i.style.setProperty('--p',pct(+i.value,+i.min,+i.max)+'%')}
  else if(n.type==='progress'){n.pr.value=+v||0;const u=mirrorOf(s,n);if(u)u.props.value=pct(n.pr.value,num(n.pr.min,0),num(n.pr.max,100))/100;const f=el.querySelector('.fill');if(f)f.style.width=pct(n.pr.value,num(n.pr.min,0),num(n.pr.max,100))+'%'}
  else if(n.type==='input'){const i=el.querySelector('input');i.value=v==null?'':String(v);n.pr.value=i.value}
  else if(n.type==='dropdown'){const i=el.querySelector('select');i.value=String(Math.round(+v||0));n.pr.value=+i.value}
  else rtSetText(s,n,v)}
function rtSetText(s,n,v){if(n.type==='dropdown'||n.type==='input'){rtSetVal(s,n,v);return}const u=mirrorOf(s,n);if(u)u.props.text=v==null?'':String(v);const el=s.dom.get(n.id);n.pr.text=v==null?'':String(v);const t=el&&el.querySelector('.t');if(t)t.textContent=n.pr.text}
/* 스크립트 정적 클래스 UIScreen (script-engine.js의 CSHOST.uiScreen) — 이름 = UI 그룹 이름. 빌더 그룹이 아니어도 보이기·글자는 됨 */
function script(n,a){
  const A=a||[];if(!play)return n==='IsOpen'?false:null;const m=play.m;
  const G=()=>{const g=(m.uiGroups||[]).find(x=>x.name===String(A[0]));if(!g)throw new Error(_t("UI 그룹 '{n}'을(를) 이 씬에서 찾을 수 없습니다",{n:A[0]}));return g};
  if(n==='HideAll'){(m.uiGroups||[]).forEach(g=>grpVis(m,g,false));return null}
  const g=G();
  if(n==='Show'||n==='Hide'){grpVis(m,g,n==='Show');return null}
  if(n==='Toggle'){grpVis(m,g,!grpOpen(m,g));return null}
  if(n==='IsOpen')return grpOpen(m,g);
  const s=RT.list.find(x=>x.g.id===g.id),nm=String(A[1]);
  if(!s){/* 일반 그룹: 엔진 요소 */const u=(m.ui||[]).find(x=>x.group===g.id&&x.name===nm);if(!u)throw new Error(_t("UI 그룹 '{s}'에 '{n}' 요소가 없습니다",{s:g.name,n:nm}));const p=u.props||{};
    if(n==='SetText'){p.text=A[2]==null?'':String(A[2]);return null}if(n==='GetText')return p.text==null?'':String(p.text);
    if(n==='GetValue')return u.type==='bar'?num(p.value,0):(p.text==null?'':String(p.text));if(n==='SetValue'){if(u.type==='bar')p.value=cl(+A[2]||0,0,1);else p.text=String(A[2]);return null}
    if(n==='SetVisible'){u.visible=!!A[2];return null}if(n==='SetColor'){if(u.type==='text')p.color=String(A[2]);else p.bg=String(A[2]);return null}
    throw new Error('UIScreen.'+n+'()')}
  let nd=null;walk(s.d.root,x=>{if(!nd&&x.name===nm&&!isRoot(x))nd=x});if(!nd)throw new Error(_t("UI 그룹 '{s}'에 '{n}' 요소가 없습니다",{s:g.name,n:nm}));
  if(n==='SetText'){rtSetText(s,nd,A[2]);return null}
  if(n==='GetText'){if(nd.type==='dropdown'){const el=s.dom.get(nd.id),i=el&&el.querySelector('select');return i&&i.selectedOptions[0]?i.selectedOptions[0].textContent:''}if(nd.type==='input')return rtVal(s,nd);return nd.pr.text==null?'':String(nd.pr.text)}
  if(n==='GetValue')return rtVal(s,nd);
  if(n==='SetValue'){rtSetVal(s,nd,A[2]);return null}
  if(n==='SetVisible'){const u=mirrorOf(s,nd);if(u)u.visible=!!A[2];return null}
  if(n==='SetColor'){const el=s.dom.get(nd.id);if(el){const c=String(A[2]);if(TYPES[nd.type]&&TYPES[nd.type].txt)el.style.color=c;else el.style.backgroundColor=c}return null}
  throw new Error('UIScreen.'+n+'()');
}

/* ===================== 번역 (영 · 일 · 중) ===================== */
if(window.TI18N)TI18N.add({
'UI 빌더':['UI Builder','UIビルダー','UI 构建器'],'UI 화면 만들기':['Create UI screen','UI画面を作る','创建 UI 界面'],'새 UI':['New UI','新しいUI','新建 UI'],'새 UI 화면':['New UI screen','新しいUI画面','新建 UI 界面'],
'계층 구조':['Hierarchy','ヒエラルキー','层级'],'요소':['Elements','要素','元素'],'끌어다 놓기 · 클릭으로 추가':['Drag & drop · click to add','ドラッグ&ドロップ · クリックで追加','拖放 · 点击添加'],
'패널':['Panel','パネル','面板'],'텍스트':['Text','テキスト','文本'],'버튼':['Button','ボタン','按钮'],'이미지':['Image','画像','图像'],'체크박스':['Checkbox','チェックボックス','复选框'],'슬라이더':['Slider','スライダー','滑块'],'입력 상자':['Input field','入力欄','输入框'],'드롭다운':['Dropdown','ドロップダウン','下拉框'],'진행 막대':['Progress bar','プログレスバー','进度条'],
'미리보기':['Preview','プレビュー','预览'],'저장':['Save','保存','保存'],'맞춤':['Fit','フィット','适应'],'사용자 지정':['Custom','カスタム','自定义'],
'화면':['Screen','画面','界面'],'크기':['Size','サイズ','尺寸'],'표시':['Display','表示','显示'],'씬':['Scene','シーン','场景'],'모든 씬':['All scenes','すべてのシーン','所有场景'],'크기 맞춤':['Scale mode','スケール','缩放模式'],
'플레이 시작 시 보이기':['Show when play starts','プレイ開始時に表示','开始游戏时显示'],'스크립트·버튼으로 열기':['Open by script or button','スクリプト・ボタンで開く','由脚本或按钮打开'],
'화면 크기에 맞춰 늘리기':['Scale with screen size','画面サイズに合わせる','随屏幕尺寸缩放'],'픽셀 그대로':['Constant pixel size','ピクセルそのまま','固定像素'],'가로 ↔ 세로':['Width ↔ Height','幅 ↔ 高さ','宽 ↔ 高'],
'열려 있으면 뒤 게임 클릭 막기':['Block game clicks while open','開いている間ゲームのクリックを遮る','打开时阻止游戏点击'],
'자동 배치':['Auto layout','自動レイアウト','自动布局'],'배치':['Layout','配置','布局'],'배경':['Background','背景','背景'],'채우기':['Fill','塗り','填充'],'테두리':['Border','枠線','边框'],'글자':['Text','文字','文字'],'효과':['Effects','エフェクト','效果'],'동작':['Action','動作','动作'],'내용':['Content','内容','内容'],'위치와 크기':['Position & size','位置とサイズ','位置和尺寸'],
'위치':['Position','位置','位置'],'앵커':['Anchor','アンカー','锚点'],'가로':['Horizontal','横','水平'],'세로':['Vertical','縦','垂直'],'왼쪽':['Left','左','左'],'오른쪽':['Right','右','右'],'가운데':['Center','中央','居中'],'늘이기':['Stretch','ストレッチ','拉伸'],'위':['Top','上','上'],'아래':['Bottom','下','下'],
'색':['Color','色','颜色'],'두께':['Width','太さ','粗细'],'둥근 모서리':['Corner radius','角丸','圆角'],'글꼴':['Font','フォント','字体'],'정렬':['Align','整列','对齐'],'줄 간격':['Line height','行間','行高'],'기울임':['Italic','斜体','斜体'],'좌우 여백':['Side padding','左右余白','左右内边距'],
'불투명도':['Opacity','不透明度','不透明度'],'그림자':['Shadow','影','阴影'],'뒤 흐리게':['Background blur','背景ぼかし','背景模糊'],'그라데이션':['Gradient','グラデーション','渐变'],'두 번째 색':['Second color','2つ目の色','第二颜色'],'방향':['Angle','角度','角度'],
'누르면':['On click','クリック時','点击时'],'없음':['None','なし','无'],'이 화면 닫기':['Close this screen','この画面を閉じる','关闭此界面'],'다른 UI 화면 열기':['Open another UI screen','別のUI画面を開く','打开其他 UI 界面'],'다른 UI 화면 열기/닫기':['Toggle another UI screen','別のUI画面を開閉','切换其他 UI 界面'],'씬 이동':['Load scene','シーン移動','切换场景'],'스크립트 메서드 실행':['Run script method','スクリプトメソッド実行','运行脚本方法'],'알림 표시':['Show message','通知を表示','显示提示'],'플레이 종료':['Stop play','プレイ終了','停止游戏'],
'값이 바뀌면':['On value changed','値が変わったら','值改变时'],'메서드 이름':['Method name','メソッド名','方法名'],'추가 CSS':['Extra CSS','追加CSS','附加 CSS'],
'빈 UI 화면':['Empty UI screen','空のUI画面','空 UI 界面'],'메인 메뉴':['Main menu','メインメニュー','主菜单'],'설정 창':['Settings window','設定ウィンドウ','设置窗口'],'게임 HUD':['Game HUD','ゲームHUD','游戏 HUD'],'확인 대화상자':['Confirm dialog','確認ダイアログ','确认对话框'],
'왼쪽 아래 「요소」에서 버튼·텍스트·슬라이더 등을 캔버스로 끌어다 놓으세요.':['Drag buttons, text, sliders and more from “Elements” at the bottom left onto the canvas.','左下の「要素」からボタン・テキスト・スライダーなどをキャンバスにドラッグしてください。','从左下角「元素」把按钮、文本、滑块等拖到画布上。'],'전체 화면 (Shift+Space · Esc: 돌아가기)':['Fullscreen (Shift+Space · Esc to exit)','全画面 (Shift+Space · Esc: 戻る)','全屏 (Shift+Space · Esc 返回)'],'전체 화면 끝내기 (Esc)':['Exit fullscreen (Esc)','全画面を終了 (Esc)','退出全屏 (Esc)'],'고치려면 위의 「UI 빌더로 편집하기」를 누르세요.':['To change it, press “Edit with UI Builder” above.','編集するには上の「UIビルダーで編集」を押してください。','要修改，请点击上方「用 UI 构建器编辑」。'],'UI 빌더로 만든 UI 화면':['UI screen made with UI Builder','UIビルダーで作ったUI画面','用 UI 构建器创建的界面'],'UI 빌더로 만든 요소':['made with UI Builder','UIビルダーで作成','用 UI 构建器创建'],'UI 초기화':['Reset UI','UIをリセット','重置 UI'],'UI 초기화…':['Reset UI…','UIをリセット…','重置 UI…'],'UI 빌더로 편집하기':['Edit with UI Builder','UIビルダーで編集','用 UI 构建器编辑'],'UI 빌더로 편집':['Edit in UI Builder','UIビルダーで編集','在 UI 构建器中编辑'],'UI 저장':['Save UI','UIを保存','保存 UI'],'모든 씬 (공통 UI)':['All scenes (shared UI)','すべてのシーン (共通UI)','所有场景 (通用 UI)'],
'미리보기 중 · 직접 눌러 보세요 (Esc: 끝내기)':['Previewing · try clicking (Esc to exit)','プレビュー中 · 実際に押してみてください (Esc: 終了)','预览中 · 试着点击 (Esc 退出)'],
'이름 바꾸기':['Rename','名前を変更','重命名'],'복제':['Duplicate','複製','复制副本'],'복사':['Copy','コピー','复制'],'잘라내기':['Cut','切り取り','剪切'],'붙여넣기':['Paste','貼り付け','粘贴'],'삭제':['Delete','削除','删除'],'맨 앞으로':['Bring to front','最前面へ','置于顶层'],'앞으로':['Bring forward','前面へ','上移一层'],'뒤로':['Send backward','背面へ','下移一层'],'맨 뒤로':['Send to back','最背面へ','置于底层'],
'패널로 묶기':['Group into panel','パネルにまとめる','编组为面板'],'묶음 풀기':['Ungroup','グループ解除','取消编组'],'숨기기':['Hide','非表示','隐藏'],'보이기':['Show','表示','显示'],'잠그기':['Lock','ロック','锁定'],'잠금 풀기':['Unlock','ロック解除','解锁'],'글자 고치기':['Edit text','文字を編集','编辑文字'],
'HTML 파일로 내보내기':['Export as HTML file','HTMLファイルに書き出す','导出为 HTML 文件'],'CSS 복사':['Copy CSS','CSSをコピー','复制 CSS'],'UI 화면 이름':['UI screen name','UI画面の名前','UI 界面名称'],'이름':['Name','名前','名称'],
'부모에 맞춤':['Align to parent','親に揃える','对齐到父级'],'가로 균등':['Distribute horizontally','横に均等','水平均分'],'세로 균등':['Distribute vertically','縦に均等','垂直均分'],'간격 맞추기':['Distribute','間隔を揃える','均匀分布'],
'고정':['Fixed','固定','固定'],'가로 크기':['Width','幅','宽度'],'세로 크기':['Height','高さ','高度'],'간격 · 여백':['Gap · padding','間隔 · 余白','间距 · 内边距'],'넘치면 줄 바꿈':['Wrap','折り返し','换行'],'넘치는 부분 자르기':['Clip content','はみ出しを切る','裁剪溢出'],
'스프라이트 고르기…':['Choose sprite…','スプライトを選ぶ…','选择精灵…'],'바꾸기…':['Change…','変更…','更换…'],'스프라이트':['Sprite','スプライト','精灵'],'픽셀 선명하게 (도트 그림)':['Crisp pixels (pixel art)','ピクセルをくっきり (ドット絵)','像素清晰 (像素画)'],
'처음에 켜짐':['On at start','最初はオン','初始开启'],'범위':['Range','範囲','范围'],'값':['Value','値','值'],'단계':['Step','ステップ','步长'],'항목':['Options','項目','选项'],'안내 글자':['Placeholder','プレースホルダー','占位文字'],'처음 값':['Initial value','初期値','初始值'],'종류':['Type','種類','类型'],
'플레이 시작':['Play','プレイ開始','开始游戏'],'가로/세로를 고르면 안의 요소가 CSS flex처럼 저절로 줄을 맞춥니다.':['Pick horizontal or vertical and children line up automatically, like CSS flex.','横/縦を選ぶと中の要素がCSS flexのように自動で並びます。','选择水平/垂直后，子元素会像 CSS flex 一样自动排列。'],'복사했습니다':['Copied','コピーしました','已复制'],'새 UI 화면을 만들었습니다':['Created a new UI screen','新しいUI画面を作りました','已创建新的 UI 界面']
});

/* 엔진 인스펙터: UI 그룹 맨 위 「UI 빌더로 편집하기」 · 빌더로 만든 요소 안내 */
function groupCard(o){
  const m=o.m,g=o.g,ed=srcInfo(),here=ed&&ed.g.id===g.id;
  return`<div class="uibCard"><button type="button" class="uibGo" data-uibg="${esc(g.id)}" data-uibs="${esc(m.id)}">${IC.screen}<span>${esc(T('UI 빌더로 편집하기'))}</span></button>
    <div class="uibCardH"><div><small>${esc(g.uib?T('UI 빌더로 만든 그룹입니다. 누르면 이 그룹이 맨 위 폴더인 채로 UI 빌더에 열립니다.'):T('이 그룹을 맨 위 폴더로 UI 빌더에 불러옵니다. 저장하면 그룹 안 요소가 빌더 내용으로 바뀝니다.'))}${here&&isDirty()?' '+esc(T('(UI 빌더에 저장하지 않은 변경이 있음)')):''}</small></div></div></div>`;
}
function elemNote(o){
  const m=o.m,u=o.u;if(!u||!u.uibN||!u.group)return'';const g=(m.uiGroups||[]).find(x=>x.id===u.group);if(!g||!g.uib)return'';
  return`<div class="uibCard slim"><button type="button" class="uibGo" data-uibg="${esc(g.id)}" data-uibs="${esc(m.id)}" data-uibn="${esc(u.uibN)}">${IC.screen}<span>${esc(T('UI 빌더로 편집하기'))}</span></button>
    <div class="uibCardH"><div><small>${esc(_t('「{g}」 그룹은 UI 빌더로 만들었습니다. 여기서 바꾼 값은 UI 빌더에서 다시 저장하면 빌더 내용으로 바뀝니다.',{g:g.name}))}</small></div></div></div>`;
}

return{open,close,toggle,setFull,toggleFull:()=>setFull(!U.full),groupCard,elemNote,loadGroup,migrate,
  /* 학습 화면 차리기용: 화면을 씬 그룹으로 넣기 · 빈 초안 · 지금 초안 */
  putGroup:(doc,sid)=>{setDraft(normDoc(CL(doc)),null);const g=toGroup(sid,null);DR().src={sid,gid:g.id};DR().saved=J(D());return g},
  newDraft:name=>{setDraft(newDoc(name||T('새 UI')),null);renderAll()},draft:()=>DR(),isDirty,
  newNode:(t,o)=>newNode(t,o),render:()=>{SPR.clear();renderAll()},playStart:rtStart,playStop:rtStop,script,isOpen:()=>!L.hidden.uib||POPPED.has('uib')};
})()}
}
