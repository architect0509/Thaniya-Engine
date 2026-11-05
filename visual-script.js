/* visual-script.js — 비주얼 스크립트 (스크립트 머신 · 상태 머신)
   · 엔진(edit.html) 툴바 「C# | 비주얼 스크립트」의 오른쪽 단추가 여는 창입니다. 스크립트 창처럼 화면 가운데 큰 창으로 열리고, 도킹도 됩니다.
   · 두 가지 그래프
       스크립트 그래프(flow)  : 노드와 선으로 「무엇을 할지」를 잇는 세부 작업 그래프 (새로 만들면 「시작」 · 「업데이트」 이벤트가 들어 있음)
       상태 그래프(state)     : 큰 지도 — 상태(박스)와 전환(화살표). 각 상태 안에는 스크립트 그래프(스크립트 상태)나
                                또 다른 상태 그래프(상위 상태)가 들어 있어 더블클릭으로 속속들이 들어감
   · 서로 이어 주기 (인터페이스 통합)
       스크립트 그래프 안의 「서브그래프」 · 「상태 머신 유닛」 노드 = 그래프 안에 다른 그래프를 품음 (더블클릭으로 들어감)
       상태 안의 스크립트 그래프 → 「상태 바꾸기」 · 「상태 끝내기」 노드로 바깥 상태 그래프를 움직임
       커스텀 이벤트 · 엔진 메시지(OnInteract 등) · 변수(그래프 / 오브젝트 / 씬 / 앱)를 모든 머신과 C# 스크립트가 함께 씀
       C# → VisualScript.Trigger("이벤트") · SetVariable · SetState / 비주얼 → 「C# 메서드 부르기」 노드
   · 컴포넌트: 게임 오브젝트 · UI 요소 · 매니저의 o.vs = [{id, gid, vals}] (인스펙터 「스크립트 추가」 메뉴의 비주얼 스크립트)
   · 플레이 중: 창에서 지금 실행되는 노드 · 선 · 상태가 빛나고, 게임 화면의 「⚡ 이벤트 흐름」 패널에 이벤트 순서가 실시간으로 나옴

   데이터
     P.vgraphs = [그래프]   그래프 = {id, name, kind:'flow'|'state', vars:[{name,type,def}], ...}
       flow : nodes:[{id,t,x,y,v:{}, sub?:그래프}], links:[{id,a,ap,b,bp}]   (a/ap = 나가는 노드/포트, b/bp = 들어가는 노드/포트)
       state: states:[{id,name,x,y,kind:'flow'|'super',g:그래프}], trans:[{id,a,b,c:{t,...}}], start:상태 id

   VISUAL_SCRIPT(get, set) — ui-builder.js와 같은 방식으로 화면 쪽 변수(P · play · openModal · showMenu …)를 이름 그대로 읽습니다. */
function VISUAL_SCRIPT(get,set){
  const OWN=Object.prototype.hasOwnProperty,cache=Object.create(null);
  const H=new Proxy(Object.create(null),{
    has(_,n){if(typeof n!=='string')return false;if(cache[n])return true;
      let g;try{g=get(n)}catch(e){return false}
      if(n in globalThis){try{if(g()===globalThis[n])return false}catch(e){}}
      cache[n]=g;return true},
    get(_,n){if(typeof n!=='string')return undefined;return(cache[n]||(cache[n]=get(n)))()},
    set(_,n,v){set(n,v);return true}
  });
  with(H){return(function(){'use strict';

/* ===================== 공용 ===================== */
const VQ=(s,r)=>(r||document).querySelector(s),VQA=(s,r)=>[...(r||document).querySelectorAll(s)];
const ex=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nid=()=>Math.random().toString(36).slice(2,10);
const CLONE=o=>JSON.parse(JSON.stringify(o));
const now=()=>performance.now();
const tN=v=>{if(typeof v==='number')return v;if(typeof v==='boolean')return v?1:0;const n=parseFloat(v);return isNaN(n)?0:n};
const tS=v=>v==null?'':typeof v==='number'?String(Math.round(v*1000)/1000):String(v);
const tB=v=>typeof v==='string'?!(v===''||v==='false'||v==='0'||v==='거짓'):!!v;
const conv=(v,ty)=>ty==='num'?tN(v):ty==='str'?tS(v):ty==='bool'?tB(v):v;
const sv=d=>`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
const IC={
  flow:sv('<circle cx="3.5" cy="4" r="1.8"/><circle cx="12.5" cy="12" r="1.8"/><rect x="9.5" y="2.2" width="5" height="3.6" rx="1"/><path d="M5.3 4h4.2M12 5.8v4.4"/>'),
  state:sv('<rect x="1.5" y="2.5" width="5" height="3.4" rx="1.7"/><rect x="9.5" y="10.1" width="5" height="3.4" rx="1.7"/><path d="M6.5 4.2c3 0 5 1.6 5 5.9"/><path d="M10 8.6l1.5 1.6 1.5-1.6"/>'),
  enter:sv('<path d="M6 3.5h6.5v9H6M2.5 8h7M7 5.5L9.5 8 7 10.5"/>'),
  up:sv('<path d="M8 13V3.5M4.5 7L8 3.5 11.5 7"/>'),
  plus:sv('<path d="M8 3v10M3 8h10"/>'),
  fit:sv('<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>'),
  x:sv('<path d="M4 4l8 8M12 4l-8 8"/>'),
  bolt:sv('<path d="M9 1.8L3.5 9h4l-1 5.2L12.5 7h-4z"/>'),
  play:sv('<path d="M5 3.2v9.6L12.8 8z"/>'),
  vars:sv('<path d="M3 4h10M3 8h10M3 12h6"/>'),
  more:sv('<circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/>'),
  side:sv('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M10 2.5v11"/>'),
  lib:sv('<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M6 2.5v11"/>'),
  target:sv('<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.2"/><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15"/>'),
  swap:sv('<path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13"/>')
};
const L10=(s,a)=>{try{return _t(s,a)}catch(e){return a?s.replace(/\{(\w+)\}/g,(_,k)=>a[k]):s}};

/* ===================== 노드 정의 =====================
   ins/outs: [키, 이름, 종류]  종류 flow | num | str | bool | any   (데이터 입력의 4번째 = 기본값)
   f: 설정칸 [키, 이름, 'text'|'num'|'sel', 기본값, 고르기 목록]
   ev: 이벤트(시작점)  run(c) → 다음 흐름 포트(문자열 · 배열 · null)  data(c,k) → 데이터 출력 값 */
const KEYS=[['Space','Space'],['Enter','Enter'],['KeyZ','Z'],['KeyX','X'],['KeyC','C'],['KeyE','E'],['KeyQ','Q'],['KeyF','F'],['KeyR','R'],['ShiftLeft','Shift'],['Escape','Esc'],['ArrowUp','↑'],['ArrowDown','↓'],['ArrowLeft','←'],['ArrowRight','→'],['KeyW','W'],['KeyA','A'],['KeyS','S'],['KeyD','D'],['Digit1','1'],['Digit2','2'],['Digit3','3'],['Mouse0','마우스 왼쪽']];
const KEYN=Object.fromEntries(KEYS);
const MSGS=[['OnInteract','말을 걸면 (OnInteract)'],['OnHeroEnter','주인공이 칸에 들어오면 (OnHeroEnter)'],['OnHeroExit','주인공이 칸에서 나가면 (OnHeroExit)'],['OnTriggerEnter2D','트리거에 들어오면 (OnTriggerEnter2D)'],['OnTriggerExit2D','트리거에서 나가면 (OnTriggerExit2D)'],['OnHit','공격받으면 (OnHit)'],['OnHeroDeath','주인공이 쓰러지면 (OnHeroDeath)'],['OnClick','UI를 클릭하면 (OnClick)'],['OnPointerEnter','마우스가 올라오면 (OnPointerEnter)'],['OnPointerExit','마우스가 나가면 (OnPointerExit)'],['OnValueChanged','UI 값이 바뀌면 (OnValueChanged)']];
const MSGN=Object.fromEntries(MSGS.map(([k,v])=>[k,v.replace(/ \(.*\)$/,'')]));
const SCOPES=[['graph','그래프'],['object','오브젝트'],['scene','씬'],['app','앱']];
const TARGETS=[['self','자신'],['name','이름으로 찾기'],['hero','주인공']];
const TRG_EV=[['self','자신의 머신'],['all','씬 전체'],['name','이름으로 찾은 오브젝트']];
const CATS=[['ev','이벤트'],['flow','흐름 제어'],['state','상태 · 그래프'],['send','이벤트 보내기 · C#'],['var','변수'],['val','값 · 계산'],['input','입력'],['obj','게임 오브젝트'],['game','게임 기능']];
/* 색: 엔트리(playentry.org) 블록 색과 같게 — entryjs src/theme/standard.js colorSet.block.default
   시작 #10D35E · 흐름 #31C1EC · 움직임 #BF63FF · 생김새 #FF5174 · 판단 #7E8EFE · 계산 #FEB71A · 자료(변수) #F57DF1 · 함수 #DE6E22 · 하드웨어 #00CFCA · 글상자 #FC5D01
   (darken = 블록 테두리 · 눌린 색) */
const EC={START:'#10D35E',FLOW:'#31C1EC',MOVING:'#BF63FF',LOOKS:'#FF5174',JUDGE:'#7E8EFE',CALC:'#FEB71A',VARIABLE:'#F57DF1',FUNC:'#DE6E22',HARDWARE:'#00CFCA',TEXT:'#FC5D01'};
const ED={START:'#13BF68',FLOW:'#08ACDD',MOVING:'#B13EFE',LOOKS:'#EE3157',JUDGE:'#1B3AD8',CALC:'#FF9C00',VARIABLE:'#EC52E7',FUNC:'#C85404',HARDWARE:'#04B5B0',TEXT:'#E43500'};
const CATE={ev:'START',flow:'FLOW',state:'FUNC',send:'HARDWARE',var:'VARIABLE',val:'CALC',input:'JUDGE',obj:'MOVING',game:'LOOKS'};
const CATC=Object.fromEntries(Object.keys(CATE).map(k=>[k,EC[CATE[k]]]));
/* 글자가 잘 보이게 엔트리 색을 어둡게 낮춘 블록 머리 색(살짝 투명) · 테두리 색 */
const shade=(h,k)=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v*k))};
const CATH=Object.fromEntries(Object.keys(CATE).map(k=>[k,`rgba(${shade(EC[CATE[k]],.62).join(',')},.86)`]));
const CATD=Object.fromEntries(Object.keys(CATE).map(k=>[k,`rgba(${shade(EC[CATE[k]],.45).join(',')},.9)`]));
const TYC={flow:'var(--vsflow)',num:EC.CALC,str:EC.TEXT,bool:EC.JUDGE,any:'#b8b8c4'};
const F=(k,l,ty,d)=>[k,l,ty,d];
const NT={
  /* ---- 이벤트 ---- */
  'ev.start':{cat:'ev',label:'시작 (Start)',ev:1,outs:[F('out','','flow')],tip:'머신이 시작될 때 (씬에 들어오거나 오브젝트가 켜질 때) 한 번 실행합니다.'},
  'ev.update':{cat:'ev',label:'업데이트 (Update)',ev:1,outs:[F('out','','flow'),F('dt','델타 시간','num')],tip:'매 프레임 실행합니다. 델타 시간 = 지난 프레임부터 흐른 초.'},
  'ev.enter':{cat:'ev',label:'상태 진입 (On Enter State)',ev:1,only:'state',outs:[F('out','','flow')],tip:'이 상태로 들어올 때 한 번 실행합니다 (상태 안의 그래프에서만).'},
  'ev.exit':{cat:'ev',label:'상태 나감 (On Exit State)',ev:1,only:'state',outs:[F('out','','flow')],tip:'이 상태에서 다른 상태로 넘어가기 직전에 실행합니다.'},
  'ev.key':{cat:'ev',label:'키 입력 (On Key)',ev:1,f:[['key','키','sel','Space',KEYS],['mode','언제','sel','down',[['down','눌렀을 때'],['up','뗐을 때'],['hold','누르는 동안']]]],outs:[F('out','','flow')],tip:'키보드 키를 누르거나 뗄 때 실행합니다.'},
  'ev.custom':{cat:'ev',label:'커스텀 이벤트 받기',ev:1,f:[['name','이벤트 이름','text','이벤트']],outs:[F('out','','flow'),F('arg','받은 값','any')],tip:'「커스텀 이벤트 보내기」 노드나 C#의 VisualScript.Trigger("이름")가 보낸 이벤트를 받습니다.'},
  'ev.msg':{cat:'ev',label:'엔진 메시지 받기',ev:1,f:[['msg','메시지','sel','OnInteract',MSGS]],outs:[F('out','','flow')],tip:'엔진이 보내는 메시지(말 걸기 · 들어오기 · 클릭 …)를 받습니다. C# 스크립트의 같은 이름 메서드와 함께 불립니다.'},
  'ev.timer':{cat:'ev',label:'타이머 (매 N초)',ev:1,f:[['sec','간격(초)','num',1]],outs:[F('out','','flow'),F('n','횟수','num')],tip:'정한 간격마다 실행합니다.'},
  'g.in':{cat:'state',label:'그래프 입력',ev:1,only:'sub',outs:[F('out','','flow'),F('value','값','any')],tip:'바깥 「서브그래프」 노드로 흐름이 들어오면 여기서 시작합니다.'},
  /* ---- 흐름 제어 ---- */
  'if':{cat:'flow',label:'만약 (If)',ins:[F('in','','flow'),F('cond','조건','bool',true)],outs:[F('yes','참','flow'),F('no','거짓','flow')],run:c=>tB(c.v('cond'))?'yes':'no'},
  'seq':{cat:'flow',label:'순서대로 (Sequence)',ins:[F('in','','flow')],outs:[F('o1','1','flow'),F('o2','2','flow'),F('o3','3','flow')],run:()=>['o1','o2','o3']},
  'wait':{cat:'flow',label:'기다리기 (Wait)',ins:[F('in','','flow'),F('sec','초','num',1)],outs:[F('out','','flow')],run:c=>({wait:Math.max(0,tN(c.v('sec'))),port:'out'})},
  'for':{cat:'flow',label:'반복 (For)',ins:[F('in','','flow'),F('first','처음','num',0),F('last','끝(제외)','num',3)],outs:[F('body','반복할 일','flow'),F('i','번호','num'),F('exit','끝나면','flow')],
    run:c=>{const a=Math.round(tN(c.v('first'))),b=Math.round(tN(c.v('last')));for(let i=a;i<b&&i-a<1000;i++){c.slot('i',i);c.go('body')}return'exit'}},
  'once':{cat:'flow',label:'한 번만 (Once)',ins:[F('in','','flow'),F('reset','다시 열기','flow')],outs:[F('first','처음 한 번','flow'),F('after','그 다음부터','flow')],
    run:c=>{if(c.port==='reset'){c.mem.done=false;return null}if(c.mem.done)return'after';c.mem.done=true;return'first'}},
  'g.out':{cat:'state',label:'그래프 출력',only:'sub',ins:[F('in','','flow'),F('result','결과','any','')],run:c=>{c.subReturn(c.v('result'));return null},tip:'바깥 「서브그래프」 노드의 「다음」으로 흐름을 돌려보냅니다.'},
  'sub':{cat:'state',label:'서브그래프',sub:'flow',ins:[F('in','','flow'),F('value','값','any','')],outs:[F('out','다음','flow'),F('result','결과','any')],tip:'그래프 안에 넣은 작은 스크립트 그래프입니다. 더블클릭하면 안으로 들어갑니다.'},
  'smu':{cat:'state',label:'상태 머신 유닛',sub:'state',ins:[F('start','시작','flow'),F('stop','멈춤','flow')],outs:[F('out','다음','flow'),F('state','지금 상태','str')],tip:'스크립트 그래프 안에 넣은 상태 그래프입니다. 「시작」으로 켜고 「멈춤」으로 끕니다. 더블클릭하면 안으로 들어갑니다.'},
  'st.go':{cat:'state',label:'상태 바꾸기',f:[['state','상태 이름','text','']],ins:[F('in','','flow')],outs:[F('out','','flow')],tip:'이 그래프를 품은 상태 그래프를 그 이름의 상태로 바꿉니다 (가장 가까운 상태 그래프부터 찾음).'},
  'st.done':{cat:'state',label:'상태 끝내기',ins:[F('in','','flow')],outs:[F('out','','flow')],tip:'지금 상태가 끝났다고 알립니다. 전환 조건 「상태가 끝나면」인 화살표를 따라 다음 상태로 넘어갑니다.'},
  'st.cur':{cat:'state',label:'현재 상태',outs:[F('name','상태 이름','str')],data:c=>c.curState()},
  /* ---- 이벤트 보내기 · C# ---- */
  'trig':{cat:'send',label:'커스텀 이벤트 보내기',f:[['name','이벤트 이름','text','이벤트'],['to','받는 곳','target','self',{allow:['self','all','name'],kinds:['obj','ui','mgr']},'tname']],ins:[F('in','','flow'),F('arg','보낼 값','any','')],outs:[F('out','','flow')],
    run:c=>{c.trigger(c.f('to'),c.f('tname'),c.f('name'),c.v('arg'));return'out'},tip:'커스텀 이벤트를 보냅니다. 상태 그래프의 전환(「이벤트를 받으면」)과 다른 머신의 「커스텀 이벤트 받기」가 받습니다.'},
  'cs':{cat:'send',label:'C# 메서드 부르기',f:[['method','메서드 이름','text','OnInteract'],['to','대상','target','self',{allow:['self','name'],kinds:['obj','ui','mgr']},'tname']],ins:[F('in','','flow')],outs:[F('out','','flow')],
    run:c=>{c.callCs(c.f('to'),c.f('tname'),c.f('method'));return'out'},tip:'대상 오브젝트에 붙은 C# 스크립트의 메서드를 부릅니다 (SendMessage처럼 그 오브젝트의 비주얼 스크립트도 같은 메시지를 받음).'},
  /* ---- 변수 ---- */
  'var.get':{cat:'var',label:'변수 가져오기',f:[['scope','범위','sel','graph',SCOPES],['name','이름','text','점수']],outs:[F('value','값','any')],data:c=>c.getVar(c.f('scope'),c.f('name'))},
  'var.set':{cat:'var',label:'변수 설정',f:[['scope','범위','sel','graph',SCOPES],['name','이름','text','점수']],ins:[F('in','','flow'),F('value','값','any',0)],outs:[F('out','','flow'),F('now','설정한 값','any')],
    run:c=>{const v=c.v('value');c.setVar(c.f('scope'),c.f('name'),v);c.slot('now',v);return'out'}},
  'var.add':{cat:'var',label:'변수에 더하기',f:[['scope','범위','sel','graph',SCOPES],['name','이름','text','점수']],ins:[F('in','','flow'),F('amount','더할 값','num',1)],outs:[F('out','','flow'),F('now','더한 결과','num')],
    run:c=>{const v=tN(c.getVar(c.f('scope'),c.f('name')))+tN(c.v('amount'));c.setVar(c.f('scope'),c.f('name'),v);c.slot('now',v);return'out'}},
  /* ---- 값 · 계산 ---- */
  'num':{cat:'val',label:'숫자',f:[['v','','num',0]],outs:[F('value','','num')],data:c=>tN(c.f('v'))},
  'str':{cat:'val',label:'글자',f:[['v','','text','안녕']],outs:[F('value','','str')],data:c=>tS(c.f('v'))},
  'bool':{cat:'val',label:'참 / 거짓',f:[['v','','sel','true',[['true','참'],['false','거짓']]]],outs:[F('value','','bool')],data:c=>c.f('v')==='true'},
  'math':{cat:'val',label:'계산',f:[['op','','sel','+',[['+','+ 더하기'],['-','− 빼기'],['*','× 곱하기'],['/','÷ 나누기'],['%','나머지'],['min','작은 값'],['max','큰 값']]]],ins:[F('a','A','num',0),F('b','B','num',1)],outs:[F('r','결과','num')],
    data:c=>{const a=tN(c.v('a')),b=tN(c.v('b'));switch(c.f('op')){case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':return b?a/b:0;case'%':return b?a%b:0;case'min':return Math.min(a,b);case'max':return Math.max(a,b)}return 0}},
  'cmp':{cat:'val',label:'비교',f:[['op','','sel','>',[['>','A > B'],['<','A < B'],['>=','A ≥ B'],['<=','A ≤ B'],['==','A = B'],['!=','A ≠ B']]]],ins:[F('a','A','any',0),F('b','B','any',0)],outs:[F('r','결과','bool')],
    data:c=>{let a=c.v('a'),b=c.v('b');const op=c.f('op');if(op==='=='||op==='!=')return(tS(a)===tS(b))===(op==='==');a=tN(a);b=tN(b);return op==='>'?a>b:op==='<'?a<b:op==='>='?a>=b:a<=b}},
  'logic':{cat:'val',label:'그리고 / 또는',f:[['op','','sel','and',[['and','그리고 (AND)'],['or','또는 (OR)']]]],ins:[F('a','A','bool',true),F('b','B','bool',true)],outs:[F('r','결과','bool')],data:c=>c.f('op')==='or'?tB(c.v('a'))||tB(c.v('b')):tB(c.v('a'))&&tB(c.v('b'))},
  'not':{cat:'val',label:'반대로 (Not)',ins:[F('a','','bool',false)],outs:[F('r','','bool')],data:c=>!tB(c.v('a'))},
  'concat':{cat:'val',label:'글자 잇기',ins:[F('a','A','str',''),F('b','B','str','')],outs:[F('r','','str')],data:c=>tS(c.v('a'))+tS(c.v('b'))},
  'rand':{cat:'val',label:'무작위 숫자',f:[['int','','sel','int',[['int','정수'],['float','소수']]]],ins:[F('min','최소','num',0),F('max','최대(제외)','num',10)],outs:[F('r','','num')],
    data:c=>{const a=tN(c.v('min')),b=tN(c.v('max'));return c.f('int')==='int'?Math.floor(a+Math.random()*(b-a)):a+Math.random()*(b-a)}},
  'time':{cat:'val',label:'시간',f:[['k','','sel','dt',[['dt','델타 시간 (프레임)'],['t','플레이 시간 (초)'],['st','이 상태에 머문 시간']]]],outs:[F('r','','num')],data:c=>c.time(c.f('k'))},
  /* ---- 입력 ---- */
  'in.key':{cat:'input',label:'키를 누르고 있나',f:[['key','키','sel','Space',KEYS]],outs:[F('r','','bool')],data:c=>{const p=play;return!!(p&&p.kraw&&p.kraw.has(c.f('key')))}},
  'in.axis':{cat:'input',label:'방향 입력',outs:[F('x','가로','num'),F('y','세로','num')],data:(c,k)=>{const q=play&&play.keys||{};return k==='x'?(q.right?1:0)-(q.left?1:0):(q.down?1:0)-(q.up?1:0)}},
  /* ---- 게임 오브젝트 ---- */
  'self':{cat:'obj',label:'자신 이름',outs:[F('name','','str')],data:c=>c.o.name||''},
  'pos':{cat:'obj',label:'위치 가져오기',f:[['to','대상','target','self',{allow:['self','hero','name'],kinds:['obj']},'tname']],outs:[F('x','X(칸)','num'),F('y','Y(칸)','num')],data:(c,k)=>{const q=c.posOf(c.f('to'),c.f('tname'));return q?q[k]:0}},
  'dist':{cat:'obj',label:'거리',f:[['from','A','target','self',{allow:['self','hero','name'],kinds:['obj']},'fname'],['to','B','target','hero',{allow:['self','hero','name'],kinds:['obj']},'tname']],outs:[F('d','칸','num')],
    data:c=>c.dist(c.f('from')||'self',c.f('fname'),c.f('to')||'hero',c.f('tname')),tip:'두 오브젝트 사이의 거리(칸)입니다. 기본은 자신 ↔ 주인공이고, A · B를 눌러 다른 게임 오브젝트로 바꿀 수 있어요.'},
  'move':{cat:'obj',label:'이동하기 (Translate)',f:[['to','대상','target','self',{allow:['self','name'],kinds:['obj']},'tname']],ins:[F('in','','flow'),F('dx','가로(칸)','num',1),F('dy','세로(칸)','num',0)],outs:[F('out','','flow')],
    run:c=>{c.moveBy(c.f('to'),c.f('tname'),tN(c.v('dx')),tN(c.v('dy')));return'out'}},
  'active':{cat:'obj',label:'켜기 / 끄기 (SetActive)',f:[['to','대상','target','self',{allow:['self','name'],kinds:['obj','ui']},'tname']],ins:[F('in','','flow'),F('on','켜기','bool',false)],outs:[F('out','','flow')],
    run:c=>{c.setActive(c.f('to'),c.f('tname'),tB(c.v('on')));return'out'}},
  /* ---- 게임 기능 ---- */
  'log':{cat:'game',label:'Debug.Log',ins:[F('in','','flow'),F('msg','내용','any','Hello')],outs:[F('out','','flow')],run:c=>{c.log(tS(c.v('msg')));return'out'},tip:'콘솔에 글을 찍습니다 (로그 출력).'},
  'msg':{cat:'game',label:'알림 메시지',ins:[F('in','','flow'),F('text','글','str','안녕!'),F('sec','초','num',1.6)],outs:[F('out','','flow')],run:c=>{c.world('message',tS(c.v('text')),Math.max(.1,tN(c.v('sec'))));return'out'}},
  'dialog':{cat:'game',label:'대화창 보이기',ins:[F('in','','flow'),F('name','이름','str',''),F('text','대사','str','안녕하세요')],outs:[F('out','','flow')],run:c=>{c.world('say',tS(c.v('name'))||c.o.name,tS(c.v('text')));return'out'}},
  'ui':{cat:'game',label:'UI 화면 열기 / 닫기',f:[['mode','','sel','Show',[['Show','열기 (Show)'],['Hide','닫기 (Hide)'],['Toggle','전환 (Toggle)']]]],ins:[F('in','','flow'),F('screen','화면(UI 그룹)','str','')],outs:[F('out','','flow')],run:c=>{c.ui(c.f('mode'),[tS(c.v('screen'))]);return'out'}},
  'ui.text':{cat:'game',label:'UI 글자 바꾸기',ins:[F('in','','flow'),F('screen','화면','str',''),F('el','요소','str',''),F('text','글자','str','')],outs:[F('out','','flow')],run:c=>{c.ui('SetText',[tS(c.v('screen')),tS(c.v('el')),tS(c.v('text'))]);return'out'}},
  'ui.val':{cat:'game',label:'UI 값 읽기',ins:[F('screen','화면','str',''),F('el','요소','str','')],outs:[F('r','값','any')],data:c=>c.ui('GetValue',[tS(c.v('screen')),tS(c.v('el'))])},
  'scene':{cat:'game',label:'씬 불러오기',ins:[F('in','','flow'),F('name','씬 이름','str','')],outs:[],run:c=>{c.world('loadScene',tS(c.v('name')));return null}},
  'inv.add':{cat:'game',label:'소지품 넣기 / 빼기',ins:[F('in','','flow'),F('item','이름','str','열쇠'),F('n','개수(빼기는 −)','num',1)],outs:[F('out','','flow')],
    run:c=>{const inv=play&&play.inv;if(inv){const k=tS(c.v('item')),n=Math.round(tN(c.v('n')));inv[k]=(inv[k]||0)+n;if(inv[k]<=0)delete inv[k]}return'out'}},
  'inv.count':{cat:'game',label:'소지품 개수',ins:[F('item','이름','str','열쇠')],outs:[F('r','','num')],data:c=>{const inv=play&&play.inv;return inv?inv[tS(c.v('item'))]||0:0}}
};
const NT_OK=t=>!!NT[t];
const def=n=>NT[n.t]||{label:'(알 수 없는 노드)',cat:'flow',ins:[],outs:[]};
const insOf=n=>def(n).ins||[],outsOf=n=>def(n).outs||[];
const portTy=(n,io,k)=>{const p=(io==='i'?insOf(n):outsOf(n)).find(q=>q[0]===k);return p?p[2]:null};
const nodeLabel=n=>{const d=def(n);if(n.t==='ev.custom')return'⚡ '+(n.v&&n.v.name||'이벤트');if(n.t==='ev.msg')return MSGN[n.v&&n.v.msg]||(n.v&&n.v.msg)||d.label;if(n.t==='trig')return'⚡→ '+(n.v&&n.v.name||'이벤트');if(n.t==='sub'||n.t==='smu')return n.name||d.label;if(n.t==='var.get'||n.t==='var.set'||n.t==='var.add')return d.label.replace('변수',(n.v&&n.v.name)||'변수');return d.label};

/* ===================== 그래프 만들기 · 찾기 ===================== */
function GL(){if(!P)return[];if(!Array.isArray(P.vgraphs))P.vgraphs=[];return P.vgraphs}
function mkNode(t,x,y,extra){const d=NT[t],n={id:nid(),t,x:Math.round(x),y:Math.round(y),v:{}};(d.f||[]).forEach(f=>{n.v[f[0]]=f[3];if(f[2]==='target')n.v[f[5]]=''});(d.ins||[]).forEach(p=>{if(p[2]!=='flow'&&p[3]!==undefined)n.v[p[0]]=p[3]});
  if(d.sub==='flow'){n.sub=newFlow('sub');n.name='서브그래프'}if(d.sub==='state'){n.sub=newState();n.name='상태 머신 유닛'}return Object.assign(n,extra||{})}
function newFlow(mode){
  const g={id:nid(),kind:'flow',nodes:[],links:[],vars:[]};
  if(mode==='machine'){g.nodes.push(mkNode('ev.start',60,60),mkNode('ev.update',60,240))}
  if(mode==='state'){g.nodes.push(mkNode('ev.enter',60,60),mkNode('ev.update',60,220),mkNode('ev.exit',60,380))}
  if(mode==='sub'){const a=mkNode('g.in',40,80),b=mkNode('g.out',420,80);g.nodes.push(a,b);g.links.push({id:nid(),a:a.id,ap:'out',b:b.id,bp:'in'})}
  return g;
}
function mkState(name,x,y,kind){return{id:nid(),name,x:Math.round(x),y:Math.round(y),kind:kind||'flow',g:kind==='super'?newState():newFlow('state')}}
function newState(){const s=mkState('대기',80,120);return{id:nid(),kind:'state',states:[s],trans:[],start:s.id,vars:[]}}
function uniqName(base){let n=base,i=1;while(GL().some(g=>g.name===n))n=base+' '+(++i);return n}
function newAsset(kind,name){const g=kind==='state'?newState():newFlow('machine');g.name=uniqName(name||(kind==='state'?'새 상태 그래프':'새 스크립트 그래프'));GL().push(g);bump();return g}
const gOf=id=>GL().find(g=>g.id===id)||null;
/* 그래프 안의 모든 하위 그래프를 돌기 (fn(그래프, 부모 그래프)) */
function walkG(g,fn,par){if(!g)return;fn(g,par);if(g.kind==='flow')(g.nodes||[]).forEach(n=>{if(n.sub)walkG(n.sub,fn,g)});else(g.states||[]).forEach(s=>walkG(s.g,fn,g))}
let VER=1;const bump=()=>{VER++};
/* 메시지 이름 모음 (엔진 메시지 + 전환 이벤트) — has() 캐시 */
const MCACHE=new WeakMap();
function msgsOf(g){let c=MCACHE.get(g);if(c&&c.v===VER)return c.s;const s=new Set();walkG(g,x=>{if(x.kind==='flow')x.nodes.forEach(n=>{if(n.t==='ev.msg'&&n.v)s.add(n.v.msg)});else x.trans.forEach(t=>{if(t.c&&t.c.t==='event')s.add(t.c.name)})});MCACHE.set(g,{v:VER,s});return s}
function has(o,fn){if(!o||!o.vs||!o.vs.length)return false;return o.vs.some(c=>{const g=gOf(c.gid);return!!g&&msgsOf(g).has(fn)})}
const usersOf=gid=>{const out=[];if(!P)return out;(P.mgrs||[]).forEach(o=>(o.vs||[]).forEach(c=>{if(c.gid===gid)out.push({o,kind:'mgr',scene:null})}));P.maps.forEach(m=>m.objs.concat(m.ui||[]).forEach(o=>(o.vs||[]).forEach(c=>{if(c.gid===gid)out.push({o,kind:isUiEl(o)?'ui':'obj',scene:m})})));return out};

/* ===================== 실행기 (플레이 중) =====================
   머신(M) = 컴포넌트 하나 · 흐름 인스턴스(FI) = 스크립트 그래프 하나 · 상태 인스턴스(SI) = 상태 그래프 하나 */
const R={on:false,mach:new Map(),ovars:new Map(),svars:{},avars:{},mid:null,mo:null,hot:new Map(),cur:new Map(),log:[],t0:0,depth:0,logUpd:false};
const HOTMS=700;
function hot(M,id){R.hot.set(M.owner.id+'|'+id,now())}
function rlog(M,kind,txt){if(!M)return;const e={tm:play?play.tm:0,who:M.owner.name||'',g:M.gname,kind,txt};R.log.push(e);if(R.log.length>80)R.log.shift();R.dirty=true}
function ownersAll(m){const p=play;const L0=m.objs.slice().concat((m.ui||[]).slice());if(p&&p.mgrs)L0.push(...p.mgrs);return L0}
const isMgr=o=>!!(o&&o.mgr);
function ownerLive(M){const p=play;if(!p)return false;if(isMgr(M.owner))return(p.mgrs||[]).includes(M.owner);const m=p.m;if(M.m!==m)return false;if(isUiEl(M.owner))return(m.ui||[]).includes(M.owner);return m.objs.includes(M.owner)&&objOn(m,M.owner)}
function newFI(g,M,parent,host){const fi={kind:'flow',g,M,parent,host,slots:{},mem:{},subs:new Map(),tm:0};(g.nodes||[]).forEach(n=>{if(n.t==='sub'&&n.sub)fi.subs.set(n.id,newFI(n.sub,M,fi,n));if(n.t==='smu'&&n.sub)fi.subs.set(n.id,newSI(n.sub,M,fi,n))});return fi}
function newSI(g,M,parent,host){return{kind:'state',g,M,parent,host,cur:null,child:null,t:0,done:false,running:false}}
function startMachine(m,o,comp){
  const key=o.id+'|'+comp.id,old=R.mach.get(key);if(old&&(isMgr(o)||old.m===m&&old.owner===o))return;
  const g=gOf(comp.gid);if(!g)return;
  const M={key,owner:o,comp,m,gid:g.id,gname:g.name,gvars:{},waits:[],steps:0};
  walkG(g,x=>(x.vars||[]).forEach(v=>{M.gvars[v.name]=conv(v.def,v.type)}));
  Object.keys(comp.vals||{}).forEach(k=>{if(k in M.gvars){const vd=(g.vars||[]).find(q=>q.name===k);M.gvars[k]=conv(comp.vals[k],vd?vd.type:'any')}});
  R.mach.set(key,M);
  M.root=g.kind==='state'?newSI(g,M,null,null):newFI(g,M,null,null);
  rlog(M,'start',L10('{g} 시작',{g:g.name}));
  if(M.root.kind==='state')siStart(M.root);else fiEvent(M.root,n=>n.t==='ev.start',null,true);
}
/* 흐름 인스턴스에 이벤트 보내기 (match(노드) → 맞는 이벤트 노드 실행 · deep = 서브그래프에도) */
function fiEvent(fi,match,slots,deep,ev){
  let n0=0;
  for(const n of fi.g.nodes.slice()){if(!def(n).ev||!match(n))continue;n0++;
    if(slots)Object.keys(slots).forEach(k=>fi.slots[n.id+':'+k]=slots[k]);
    hot(fi.M,n.id);
    if(n.t!=='ev.update')rlog(fi.M,'event',L10(nodeLabel(n)));
    else if(R.logUpd){const t=play?play.tm:0;if(t-(fi.M.updLog||-9)>=.5){fi.M.updLog=t;rlog(fi.M,'upd',L10('업데이트 (Update)'))}}
    flowOut(fi,n,'out');if(!R.on)return n0}
  if(deep)fi.subs.forEach(s=>{if(!R.on)return;if(s.kind==='flow')n0+=fiEvent(s,match,slots,true,ev);else if(s.running){n0+=siEvent(s,match,slots,ev);if(ev&&R.on&&siCheck(s,ev))n0++}});
  return n0;
}
function siEvent(si,match,slots,ev){if(!si.child)return 0;return si.child.kind==='flow'?fiEvent(si.child,match,slots,true,ev):siEvent(si.child,match,slots,ev)}
function stateOf(si,id){return si.g.states.find(s=>s.id===id)||null}
function siStart(si){si.running=true;si.done=false;const st=stateOf(si,si.g.start)||si.g.states[0];if(st)siEnter(si,st,null)}
function siEnter(si,st,via){
  si.cur=st.id;si.t=0;si.done=false;hot(si.M,st.id);R.cur.set(si.M.owner.id+'|'+si.g.id,st.id);
  if(via){hot(si.M,via.id);rlog(si.M,'state',`${(stateOf(si,via.a)||{}).name||'?'} → ${st.name}${via.c?'  ('+condText(via.c)+')':''}`)}else rlog(si.M,'state',L10('상태 시작: {s}',{s:st.name}));
  if(st.kind==='super'&&st.g&&st.g.kind==='state'){si.child=newSI(st.g,si.M,si,null);siStart(si.child)}
  else{si.child=newFI(st.g||newFlow('state'),si.M,si,null);fiEvent(si.child,n=>n.t==='ev.start'||n.t==='ev.enter',null,true)}
}
function siExit(si){
  const c=si.child;if(c){if(c.kind==='flow')fiEvent(c,n=>n.t==='ev.exit',null,true);else siExit(c)}
  si.M.waits=si.M.waits.filter(w=>!within(w.fi,si));si.child=null;
}
const within=(fi,si)=>{for(let x=fi;x;x=x.parent)if(x===si)return true;return false};
function siGo(si,st,tr){if(!si.running)return;const from=si.cur;siExit(si);if(!si.running)return;siEnter(si,st,tr||{id:'_go',a:from,b:st.id,c:{t:'go'}})}
function siStop(si){if(!si.running)return;siExit(si);si.running=false;si.cur=null;R.cur.delete(si.M.owner.id+'|'+si.g.id)}
/* 전환 확인: ev = {t:'event', name} 또는 null(매 프레임) */
function siCheck(si,ev){
  if(!si.running||!si.cur)return false;
  if(si.child&&si.child.kind==='state'&&siCheck(si.child,ev))return true;
  for(const tr of si.g.trans){if(tr.a!==si.cur)continue;const to=stateOf(si,tr.b);if(!to)continue;if(condMet(si,tr.c||{},ev)){siExit(si);siEnter(si,to,tr);return true}}
  return false;
}
function condMet(si,c,ev){
  const M=si.M;
  switch(c.t){
    case'event':return!!ev&&ev.name===c.name;
    case'time':return!ev&&si.t>=tN(c.sec);
    case'done':return si.done;
    case'always':return!ev;
    case'key':{const p=play;return!ev&&!!(p&&p.kdown&&p.kdown.has(c.key))}
    case'var':{if(ev)return false;const a=getVar(M,null,c.scope||'graph',c.name),b=c.val;const op=c.op||'==';if(op==='=='||op==='!=')return(tS(a)===tS(b))===(op==='==');const x=tN(a),y=tN(b);return op==='>'?x>y:op==='<'?x<y:op==='>='?x>=y:x<=y}
    case'dist':{if(ev)return false;const d=distOf(M,'self','',c.to||'hero',c.tname);return(c.op||'<')==='<'?d<tN(c.val):d>tN(c.val)}
  }
  return false;
}
function condText(c){
  switch(c.t){case'event':return L10('이벤트 「{n}」',{n:MSGN[c.name]||c.name||'?'});case'time':return L10('{s}초 뒤',{s:tN(c.sec)});case'done':return L10('상태가 끝나면');case'always':return L10('바로');
    case'key':return L10('{k} 키',{k:KEYN[c.key]||c.key});case'var':return`${c.name||'?'} ${({'==':'=','!=':'≠','>=':'≥','<=':'≤'})[c.op]||c.op||'='} ${c.val==null?'':c.val}`;
    case'dist':return L10('{t}와 거리 {o} {v}',{t:(c.to||'hero')==='name'?(c.tname||'?'):L10('주인공'),o:c.op||'<',v:tN(c.val)});case'go':return L10('상태 바꾸기');}
  return L10('조건 없음');
}
/* 흐름 따라가기 */
function flowOut(fi,n,port){
  const M=fi.M;
  for(const l of fi.g.links){if(l.a!==n.id||l.ap!==port)continue;const b=fi.g.nodes.find(q=>q.id===l.b);if(!b)continue;
    hot(M,l.id);runNode(fi,b,l.bp);if(!R.on||!play)return}
}
function runNode(fi,n,port){
  const M=fi.M;if(++M.steps>20000){if(M.steps===20001){clog('error',L10('[비주얼 스크립트 {g}] 한 프레임에 노드를 너무 많이 실행했습니다 (무한 반복?) · 이번 프레임은 멈춥니다',{g:M.gname}))}return}
  if(R.depth>60){clog('error',L10('[비주얼 스크립트 {g}] 이벤트가 서로를 너무 깊이 부릅니다 (무한 반복?)',{g:M.gname}));return}
  hot(M,n.id);
  /* 서브그래프 · 상태 머신 유닛: 안으로 */
  if(n.t==='sub'){const c=fi.subs.get(n.id);if(c){fiEvent(c,x=>x.t==='g.in',{value:val(fi,n,'value')},false,null)}return}
  if(n.t==='smu'){const s=fi.subs.get(n.id);if(s){if(port==='stop')siStop(s);else{siStop(s);siStart(s)}}flowOut(fi,n,'out');return}
  if(n.t==='st.go'){const nm=String(n.v&&n.v.state||'');let si=null,st=null;for(let x=fi.parent;x;x=x.parent){if(x.kind==='state'){const q=x.g.states.find(s=>s.name===nm);if(q){si=x;st=q;break}}}
    if(!st){const r=M.root;if(r.kind==='state'){const q=findStateDeep(r,nm);if(q){si=q.si;st=q.st}}}
    if(st&&si){const tr=si.g.trans.find(t=>t.a===si.cur&&t.b===st.id);flowOut(fi,n,'out');if(!R.on)return;siGo(si,st,tr||null)}
    else{clog('warn',L10('[비주얼 스크립트 {g}] 상태 「{s}」을(를) 찾을 수 없습니다',{g:M.gname,s:nm}));flowOut(fi,n,'out')}
    return}
  if(n.t==='st.done'){for(let x=fi.parent;x;x=x.parent){if(x.kind==='state'){x.done=true;flowOut(fi,n,'out');if(R.on)siCheck(x,null);return}}flowOut(fi,n,'out');return}
  const d=def(n);if(!d.run){flowOut(fi,n,'out');return}
  let r;
  try{r=d.run(ctx(fi,n,port))}catch(e){clog('error',L10('[비주얼 스크립트 {g}] 「{n}」 노드: {e}',{g:M.gname,n:nodeLabel(n),e:e&&e.message||String(e)}));return}
  if(!R.on||!play)return;
  if(r&&typeof r==='object'&&!Array.isArray(r)&&'wait' in r){M.waits.push({at:(play.tm||0)+r.wait,fi,n,port:r.port});return}
  (Array.isArray(r)?r:r?[r]:[]).forEach(p=>{if(R.on&&play)flowOut(fi,n,p)});
}
function findStateDeep(si,nm){const q=si.g.states.find(s=>s.name===nm);if(q)return{si,st:q};if(si.child&&si.child.kind==='state')return findStateDeep(si.child,nm);return null}
function val(fi,n,k){
  const l=fi.g.links.find(q=>q.b===n.id&&q.bp===k);
  if(!l){const ty=portTy(n,'i',k);const v=n.v?n.v[k]:undefined;return ty?conv(v,ty):v}
  const s=fi.g.nodes.find(q=>q.id===l.a);if(!s)return null;
  hot(fi.M,l.id);
  const d=def(s);
  if(d.data&&!d.run){if(++R.depth>80){R.depth--;throw new Error(L10('값 노드가 서로를 끝없이 부릅니다'))}hot(fi.M,s.id);try{return d.data(ctx(fi,s,null),l.ap)}finally{R.depth--}}
  if(s.t==='sub'&&l.ap==='result')return fi.slots[s.id+':result'];
  if(s.t==='smu'&&l.ap==='state'){const si=fi.subs.get(s.id);const st=si&&si.cur&&stateOf(si,si.cur);return st?st.name:''}
  return fi.slots[s.id+':'+l.ap];
}
function getVar(M,fi,scope,name){
  if(scope==='object'){const o=R.ovars.get(M.owner.id);return o&&name in o?o[name]:null}
  if(scope==='scene')return name in R.svars?R.svars[name]:null;
  if(scope==='app')return name in R.avars?R.avars[name]:null;
  return name in M.gvars?M.gvars[name]:null;
}
function setVar(M,scope,name,v){
  if(scope==='object'){let o=R.ovars.get(M.owner.id);if(!o)R.ovars.set(M.owner.id,o={});o[name]=v;return}
  if(scope==='scene'){R.svars[name]=v;return}if(scope==='app'){R.avars[name]=v;return}
  M.gvars[name]=v;
}
/* 게임 세계 좌표 (주인공 = 플레이어 위치) · UI · 매니저는 위치 없음 */
function worldOf(M,to,tname){const p=play;if(!p)return null;if(to==='hero')return{x:p.px,y:p.py};const o=tgt(M,to,tname);if(!o||isUiEl(o)||isMgr(o))return null;if(o.type==='spawn'&&o===startSpawn(M.m))return{x:p.px,y:p.py};try{return objWorld(M.m,o,p)}catch(e){return null}}
function distOf(M,aTo,aN,bTo,bN){const a=worldOf(M,aTo,aN),b=worldOf(M,bTo,bN);if(!a||!b)return 9999;return Math.hypot(a.x-b.x,a.y-b.y)/TS}
function heroDist(M){const p=play;if(!p||isUiEl(M.owner)||isMgr(M.owner))return 9999;try{const w=objWorld(M.m,M.owner,p);return Math.hypot(w.x-p.px,w.y-p.py)/TS}catch(e){return 9999}}
function findOwner(m,name){return m.objs.find(q=>q.name===name&&objOn(m,q))||m.objs.find(q=>q.name===name)||(m.ui||[]).find(q=>q.name===name)||((play&&play.mgrs)||[]).find(q=>q.name===name)||null}
function tgt(M,to,tname){if(to==='name'){const o=findOwner(M.m,String(tname||''));if(!o)clog('warn',L10('[비주얼 스크립트 {g}] 오브젝트 「{n}」을(를) 찾을 수 없습니다',{g:M.gname,n:tname||''}));return o}return M.owner}
/* 커스텀 이벤트 · 메시지를 소유자의 모든 머신에 */
function sendTo(o,name,arg,from){
  if(!o||!o.vs)return 0;let n=0;
  for(const c of o.vs){const M=R.mach.get(o.id+'|'+c.id);if(!M)continue;n+=dispatch(M,{t:'event',name,arg},from)}
  return n;
}
function dispatch(M,ev,from){
  if(!R.on)return 0;R.depth++;
  try{
    let n=0;
    const match=x=>x.t==='ev.custom'&&(x.v&&x.v.name)===ev.name||x.t==='ev.msg'&&(x.v&&x.v.msg)===ev.name;
    if(M.root.kind==='flow')n+=fiEvent(M.root,match,{arg:ev.arg},true,ev);
    else{n+=siEvent(M.root,match,{arg:ev.arg},ev);if(R.on&&siCheck(M.root,ev))n++}
    return n;
  }finally{R.depth--}
}
function trigger(M,to,tname,name,arg){
  name=String(name||'');if(!name)return;
  rlog(M,'send',L10('「{e}」 보냄 → {t}',{e:name,t:to==='all'?L10('씬 전체'):to==='name'?(tname||'?'):L10('자신')}));
  if(to==='all'){const m=play.m;for(const o of ownersAll(m)){sendTo(o,name,arg,M);if(!R.on)return}return}
  const o=tgt(M,to,tname);if(o)sendTo(o,name,arg,M);
}
function ctx(fi,n,port){
  const M=fi.M;
  return{fi,n,M,port,m:M.m,o:M.owner,mem:(fi.mem[n.id]||(fi.mem[n.id]={})),
    v:k=>val(fi,n,k),f:k=>n.v?n.v[k]:undefined,
    slot:(k,v)=>{fi.slots[n.id+':'+k]=v},go:p=>flowOut(fi,n,p),
    getVar:(s,k)=>getVar(M,fi,s,k),setVar:(s,k,v)=>setVar(M,s,k,v),
    trigger:(to,tn,nm,arg)=>trigger(M,to,tn,nm,arg),
    callCs:(to,tn,fn)=>{const o=tgt(M,to,tn);if(!o||!fn)return;rlog(M,'cs',L10('C# {f}() 부름 → {o}',{f:fn,o:o.name}));R.depth++;try{csRunMethods(play.m,o,[String(fn)])}finally{R.depth--}},
    subReturn:v=>{const pf=fi.parent,h=fi.host;if(pf&&h&&pf.kind==='flow'){pf.slots[h.id+':result']=v;flowOut(pf,h,'out')}},
    curState:()=>{for(let x=fi.parent;x;x=x.parent)if(x.kind==='state'){const s=stateOf(x,x.cur);return s?s.name:''}const r=M.root;if(r.kind==='state'){const s=stateOf(r,r.cur);return s?s.name:''}return''},
    time:k=>{const p=play;if(k==='dt')return p&&p.vsDt||0;if(k==='t')return p?p.tm:0;for(let x=fi.parent;x;x=x.parent)if(x.kind==='state')return x.t;return 0},
    heroDist:()=>heroDist(M),dist:(a,an,b,bn)=>distOf(M,a,an,b,bn),
    posOf:(to,tn)=>{const p=play;if(to==='hero')return{x:p.px/TS-.5,y:p.py/TS-.5};const o=tgt(M,to,tn);if(!o||isUiEl(o)||isMgr(o))return null;try{const t=objTileF(M.m,o);return{x:t.x,y:t.y}}catch(e){return null}},
    moveBy:(to,tn,dx,dy)=>{const o=tgt(M,to,tn);if(!o||isUiEl(o)||isMgr(o))return;const t=objTileF(M.m,o);setObjTile(M.m,o,t.x+dx,t.y+dy)},
    setActive:(to,tn,on)=>{const o=tgt(M,to,tn);if(!o)return;if(isUiEl(o)){o.visible=!!on;return}if(on)delete o.active;else o.active=false},
    log:s=>{clog('info',s);rlog(M,'log','Debug.Log: '+s)},
    world:(k,...a)=>{const f=CS_WORLD[k];if(typeof f==='function')return f(...a)},
    ui:(name,a)=>{try{return UIB.script(name,a)}catch(e){clog('warn',L10('[비주얼 스크립트 {g}] UI: {e}',{g:M.gname,e:e&&e.message||e}));return null}}
  };
}
/* ---- 엔진에서 부르는 것 ---- */
function playStart(){R.on=true;R.mach.clear();R.ovars.clear();R.svars={};R.avars={};R.mid=null;R.mo=null;R.hot.clear();R.cur.clear();R.log=[];R.dirty=true;
  /* 컴포넌트에 넣어 둔 오브젝트 변수 초기값 */
  flowUi(true);}
function playStop(){R.on=false;R.mach.clear();R.cur.clear();flowUi(false);paintLive(true)}
/* csRunMethods(m, o, fns) 다음에 불림: Start = 머신 시작, 그 밖 = 엔진 메시지 */
function msg(m,o,fns){
  if(!R.on||!o||!o.vs||!o.vs.length)return;
  for(const fn of fns){
    if(fn==='Awake')continue;
    if(fn==='Start'){if(R.mo!==m&&!isMgr(o)){sceneSwap(m)}o.vs.forEach(c=>{if(R.on)startMachine(m,o,c)});continue}
    o.vs.forEach(c=>{const M=R.mach.get(o.id+'|'+c.id);if(M&&R.on)dispatch(M,{t:'event',name:fn,arg:null})});
  }
}
function sceneSwap(m){
  /* 씬이 바뀜: 그 씬의 머신만 남기고(매니저는 이어짐) 씬 변수 초기화 */
  R.mid=m.id;R.mo=m;R.svars={};
  [...R.mach.values()].forEach(M=>{if(!isMgr(M.owner)&&M.m!==m)R.mach.delete(M.key)});R.dirty=true;
}
function tick(m,dt,uiOnly){
  if(!R.on||!play)return;
  if(R.mo!==m)sceneSwap(m);
  play.vsDt=dt;
  const list=[...R.mach.values()];
  for(const M of list){
    if(!R.on||!play||play.m!==m)return;
    if(!R.mach.has(M.key))continue;
    if(isMgr(M.owner))M.m=m;
    if(!ownerLive(M))continue;
    if(uiOnly&&!isUiEl(M.owner))continue;
    M.steps=0;
    /* 기다리기 끝난 것 이어서 */
    if(M.waits.length){const t=play.tm||0,due=M.waits.filter(w=>w.at<=t);if(due.length){M.waits=M.waits.filter(w=>w.at>t);due.forEach(w=>{if(R.on)flowOut(w.fi,w.n,w.port)})}}
    tickInst(M.root,dt);
  }
}
function tickInst(x,dt){
  if(!R.on)return;
  if(x.kind==='flow'){
    x.tm+=dt;const p=play;
    fiEvent(x,n=>{
      if(n.t==='ev.update'){x.slots[n.id+':dt']=dt;return true}
      if(n.t==='ev.key'){const k=n.v&&n.v.key,md=n.v&&n.v.mode;return md==='up'?!!(p.kup&&p.kup.has(k)):md==='hold'?!!(p.kraw&&p.kraw.has(k)):!!(p.kdown&&p.kdown.has(k))}
      if(n.t==='ev.timer'){const iv=Math.max(.05,tN(n.v&&n.v.sec));const m0=x.mem[n.id]||(x.mem[n.id]={acc:0,n:0});m0.acc+=dt;if(m0.acc>=iv){m0.acc-=iv;m0.n++;x.slots[n.id+':n']=m0.n;return true}return false}
      return false},null,false,null);
    x.subs.forEach(s=>{if(s.kind==='flow')tickInst(s,dt);else if(s.running)tickInst(s,dt)});
    return;
  }
  if(!x.running)return;
  x.t+=dt;
  if(x.child)tickInst(x.child,dt);
  if(R.on&&x.running)siCheck(x,null);
}
/* ---- C# 정적 클래스 VisualScript ---- */
function csHook(kind,n,a,cx){
  const o=cx&&cx.o,m=cx&&cx.m||(play&&play.m);if(!play)return null;
  const machs=o?(o.vs||[]).map(c=>R.mach.get(o.id+'|'+c.id)).filter(Boolean):[];
  const firstSI=()=>{for(const M of machs){if(M.root.kind==='state')return M.root;let f=null;M.root.subs&&M.root.subs.forEach(s=>{if(!f&&s.kind==='state'&&s.running)f=s});if(f)return f}return null};
  const fake={owner:o||{id:'_',name:'C#'},gname:'C#'};
  if(kind==='get'){
    if(n==='CurrentState'){const si=firstSI();const st=si&&stateOf(si,si.cur);return st?st.name:''}
    throw new Error('VisualScript.'+n+' '+L10('은(는) 없습니다'));
  }
  if(n==='Trigger'){if(o){rlog(machs[0]||fake,'send',L10('C# → 「{e}」',{e:a[0]}));sendTo(o,String(a[0]),a.length>1?a[1]:null,null)}return null}
  if(n==='TriggerAll'){rlog(machs[0]||fake,'send',L10('C# → 「{e}」 씬 전체',{e:a[0]}));for(const q of ownersAll(play.m))sendTo(q,String(a[0]),a.length>1?a[1]:null,null);return null}
  if(n==='TriggerOn'){const q=findOwner(play.m,String(a[0]));if(q)sendTo(q,String(a[1]),a.length>2?a[2]:null,null);return null}
  if(n==='GetVariable'){const k=String(a[0]);const ov=o&&R.ovars.get(o.id);if(ov&&k in ov)return ov[k];for(const M of machs)if(k in M.gvars)return M.gvars[k];if(k in R.svars)return R.svars[k];if(k in R.avars)return R.avars[k];return null}
  if(n==='SetVariable'){if(!o)return null;let ov=R.ovars.get(o.id);if(!ov)R.ovars.set(o.id,ov={});ov[String(a[0])]=a[1];return null}
  if(n==='SetState'){const si=firstSI();if(!si)throw new Error(L10('이 오브젝트에 실행 중인 상태 머신이 없습니다'));const q=findStateDeep(si,String(a[0]));if(!q)throw new Error(L10('상태 「{s}」을(를) 찾을 수 없습니다',{s:a[0]}));siGo(q.si,q.st,null);return null}
  throw new Error('VisualScript.'+n+'() '+L10('은(는) 없습니다'));
}

/* ===================== 게임 화면의 「⚡ 이벤트 흐름」 패널 ===================== */
const FK='thaniya.vs.flow.v1';
let FLOW_ON=true;try{FLOW_ON=localStorage.getItem(FK)!=='0'}catch(e){}
let FE=null;
function anyVs(){if(!P)return false;return(P.mgrs||[]).some(o=>o.vs&&o.vs.length)||P.maps.some(m=>m.objs.concat(m.ui||[]).some(o=>o.vs&&o.vs.length))}
function flowUi(on){
  const host=document.getElementById('play');if(!host)return;
  let b=host.querySelector('#pFlow');
  if(on&&!b){const bar=host.querySelector('.pbar');if(bar){b=document.createElement('button');b.className='btn sm';b.id='pFlow';b.type='button';b.title=L10('비주얼 스크립트의 이벤트 흐름 보기/숨기기');b.addEventListener('click',()=>{FLOW_ON=!FLOW_ON;try{localStorage.setItem(FK,FLOW_ON?'1':'0')}catch(e){}flowSync()});bar.insertBefore(b,bar.firstChild)}}
  if(b)b.hidden=!on||!anyVs();
  if(!on){if(FE){FE.remove();FE=null}return}
  if(!FE){FE=document.createElement('div');FE.className='vsFlow';FE.innerHTML=`<div class="vfh">${IC.bolt}<b>${L10('이벤트 흐름')}</b><span class="vsp"></span><label class="vfu" title="${ex(L10('업데이트(매 프레임) 이벤트도 기록'))}"><input type="checkbox" class="vfupd">${L10('업데이트 포함')}</label><button type="button" class="vfc" title="${ex(L10('지우기'))}">${L10('지우기')}</button><button type="button" class="vfx" aria-label="${ex(L10('닫기'))}">${IC.x}</button></div><div class="vfm"></div><div class="vfl"></div>`;
    FE.querySelector('.vfx').addEventListener('click',()=>{FLOW_ON=false;try{localStorage.setItem(FK,'0')}catch(e){}flowSync()});
    FE.querySelector('.vfc').addEventListener('click',()=>{R.log=[];R.dirty=true});
    FE.querySelector('.vfupd').addEventListener('change',e=>{R.logUpd=e.target.checked});
    FE.addEventListener('pointerdown',e=>e.stopPropagation());
    host.append(FE)}
  flowSync();
}
function flowSync(){const host=document.getElementById('play');const b=host&&host.querySelector('#pFlow');if(b){b.innerHTML=IC.bolt+' '+ex(L10('이벤트 흐름'));b.classList.toggle('on',FLOW_ON)}if(FE)FE.hidden=!FLOW_ON||!R.on||!R.mach.size;R.dirty=true}
const KIND={start:['시작',EC.START],event:['이벤트',EC.START],state:['상태',EC.FUNC],send:['보냄',EC.HARDWARE],cs:['C#',EC.VARIABLE],log:['로그',EC.LOOKS],upd:['업데이트',EC.FLOW]};
function statePath(M){const out=[];let x=M.root;while(x){if(x.kind==='state'){const s=stateOf(x,x.cur);if(!s)break;out.push(s.name);x=x.child}else{let f=null;x.subs.forEach(s=>{if(!f&&s.kind==='state'&&s.running)f=s});x=f}}return out}
function flowPaint(){
  if(!FE)return;FE.hidden=!FLOW_ON||!R.on||!R.mach.size;if(FE.hidden||!R.dirty)return;R.dirty=false;
  const ms=[...R.mach.values()].filter(ownerLive);
  FE.querySelector('.vfm').innerHTML=ms.map(M=>{const sp=statePath(M);return`<div class="vfmr"><i class="vfk" style="--c:${M.root.kind==='state'?EC.FUNC:EC.FLOW}"></i><b data-i18n-skip>${ex(M.owner.name)}</b><span class="vfg" data-i18n-skip>${ex(M.gname)}</span>${sp.length?`<span class="vfst" data-i18n-skip>${sp.map(ex).join(' ▸ ')}</span>`:''}</div>`}).join('');
  const L0=R.log.slice(-14).reverse();
  FE.querySelector('.vfl').innerHTML=L0.length?L0.map((e,i)=>{const k=KIND[e.kind]||KIND.event;return`<div class="vfe${i===0?' new':''}"><span class="vft">${(e.tm||0).toFixed(1)}s</span><i style="background:${k[1]}"></i><span class="vfw" data-i18n-skip>${ex(e.who)}</span><span class="vfx2" data-i18n-skip>${ex(e.txt)}</span></div>`}).join(''):`<div class="vfe0">${ex(L10('아직 이벤트가 없습니다'))}</div>`;
}
/* 업데이트 이벤트 기록 (켜 둔 경우만 · 0.5초마다 한 번) */
let updLogT=0;

/* ===================== 편집 창 ===================== */
const PID='vs';
/* 창 배치 (노드 목록 · 속성 패널 너비 · 좌우 바꾸기) — 이 브라우저에만 저장 */
const UIK='thaniya.vs.ui.v1';
const UI0={libW:200,sideW:260,flip:false};
let UI=Object.assign({},UI0);try{const v=JSON.parse(localStorage.getItem(UIK)||'null');if(v&&typeof v==='object'){if(+v.libW>=140&&+v.libW<=460)UI.libW=+v.libW;if(+v.sideW>=180&&+v.sideW<=520)UI.sideW=+v.sideW;UI.flip=!!v.flip}}catch(e){}
const saveUI=()=>{try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(e){}};
const BOX=document.getElementById('vsBox');
const E={gid:null,path:[],sel:new Set(),selK:null,view:{},undo:[],redo:[],lib:true,side:true,libQ:'',libOpen:{},dbg:null,addAt:null,wire:null};
/* path = [{t:'node'|'state', id}] — 루트 그래프에서 안쪽으로 들어간 길 */
function rootG(){return E.gid?gOf(E.gid):null}
function curG(){let g=rootG();if(!g)return null;const ok=[];for(const s of E.path){let nx=null;if(s.t==='node'&&g.kind==='flow'){const n=g.nodes.find(q=>q.id===s.id);nx=n&&n.sub}else if(s.t==='state'&&g.kind==='state'){const st=g.states.find(q=>q.id===s.id);nx=st&&st.g}if(!nx)break;ok.push(s);g=nx}if(ok.length!==E.path.length)E.path=ok;return g}
function crumbs(){const out=[];let g=rootG();if(!g)return out;out.push({name:g.name,kind:g.kind,depth:0});E.path.forEach((s,i)=>{let nx=null,nm='';if(s.t==='node'){const n=g.nodes.find(q=>q.id===s.id);nx=n&&n.sub;nm=n?(n.name||def(n).label):'?'}else{const st=g.states.find(q=>q.id===s.id);nx=st&&st.g;nm=st?st.name:'?'}if(!nx)return;out.push({name:nm,kind:nx.kind,depth:i+1,t:s.t});g=nx});return out}
const mode=()=>{const s=E.path[E.path.length-1];if(!s)return'machine';if(s.t==='state')return'state';const pg=parentG();const n=pg&&pg.nodes&&pg.nodes.find(q=>q.id===s.id);return n&&n.t==='sub'?'sub':'unit'};
function parentG(){let g=rootG();for(let i=0;i<E.path.length-1;i++){const s=E.path[i];g=s.t==='node'?(g.nodes.find(q=>q.id===s.id)||{}).sub:(g.states.find(q=>q.id===s.id)||{}).g;if(!g)return null}return g}
const vw=()=>{const g=curG();if(!g)return{x:0,y:0,z:1};return E.view[g.id]||(E.view[g.id]={x:40,y:30,z:1})};
/* 실행 취소 (그래프 단위 · 엔진 Ctrl+Z와 따로) */
function snapG(){const g=rootG();return g?JSON.stringify(g):null}
let preEdit=null;
function edit(fn,noRender){const before=snapG();fn();const after=snapG();if(before!==after){E.undo.push({gid:E.gid,s:before});if(E.undo.length>80)E.undo.shift();E.redo=[];bump();markDirty()}if(!noRender)render()}
function restoreG(rec,stackTo){const i=GL().findIndex(g=>g.id===rec.gid);if(i<0)return;stackTo.push({gid:rec.gid,s:JSON.stringify(GL()[i])});GL()[i]=JSON.parse(rec.s);E.gid=rec.gid;E.sel.clear();bump();markDirty();render()}
function doUndo(){const r=E.undo.pop();if(r)restoreG(r,E.redo);else toast(L10('더 이상 되돌릴 작업이 없습니다'))}
function doRedo(){const r=E.redo.pop();if(r)restoreG(r,E.undo)}

/* ---- 창 열기 / 닫기 ---- */
function showPanel(){
  const id=PID;
  if(POPPED.has(id)){try{POPPED.get(id).win.focus()}catch(e){}return}
  if(mqN.matches){L.hidden[id]=false;L.nActive=id;saveLayout();renderLayout()}
  else if(L.hidden[id]){delete L.collapsed[id];movePanel(id,'float',0,bigFloat(),true);raise(id)}
  else{const r=rootOf(id);if(L.tabs[id]&&L.active[r]!==id){L.active[r]=id;saveLayout();renderLayout()}
    if([r,...kidsOf(r)].some(k=>L.collapsed[k])){[r,...kidsOf(r)].forEach(k=>{delete L.collapsed[k];panelEl[k].classList.remove('collapsed')});saveLayout()}
    if(L.float[r])raise(r);else if(L.center&&L.center.includes(id)&&L.cActive!==id){L.cActive=id;saveLayout();renderLayout()}}
}
function close(){L.hidden[PID]=true;saveLayout();renderLayout()}
function ownerNow(){try{return scOwner()}catch(e){return null}}
function open(gid){
  if(!P)return;
  let g=gid&&gOf(gid);
  if(!g){const o=ownerNow();const c=o&&o.vs&&o.vs.find(q=>gOf(q.gid));if(c)g=gOf(c.gid)}
  if(!g&&E.gid)g=gOf(E.gid);
  if(!g&&GL().length)g=GL()[0];
  if(!g){g=newAsset('flow');markDirty();toast(L10('새 스크립트 그래프를 만들었습니다 · 시작 · 업데이트 이벤트가 들어 있어요'))}
  if(E.gid!==g.id){E.gid=g.id;E.path=[];E.sel.clear()}
  showPanel();render();requestAnimationFrame(()=>{fitIfNew();try{BOX.focus({preventScroll:true})}catch(e){}});
}
function fitIfNew(){const g=curG();if(g&&!E.view[g.id+'_f']){E.view[g.id+'_f']=1;fit()}}
function enterInto(step){E.path.push(step);E.sel.clear();render();requestAnimationFrame(fitIfNew)}
function goDepth(d){E.path=E.path.slice(0,d);E.sel.clear();render()}

/* ---- 그리기 ---- */
const isVisible=()=>{const el=panelEl[PID];return!!el&&!L.hidden[PID]&&el.isConnected&&el.offsetWidth>0};
function render(){
  if(!BOX)return;
  /* 다시 그려도 창 안에 키보드 포커스를 남김 (안 그러면 Backspace · Delete가 씬의 오브젝트를 지움) */
  const d0=BOX.ownerDocument,ae=d0.activeElement,keepF=!!ae&&(BOX.contains(ae)&&!/INPUT|SELECT|TEXTAREA/.test(ae.tagName)||(ae===d0.body||!ae.isConnected)&&E.focus);
  const g=curG(),root=rootG();
  const crumbsH=crumbs().map((c,i,a)=>`${i?'<span class="vcs">›</span>':''}<button type="button" class="vcb${i===a.length-1?' on':''}" data-depth="${c.depth}" title="${ex(c.kind==='state'?L10('상태 그래프'):L10('스크립트 그래프'))}">${c.kind==='state'?IC.state:IC.flow}<span data-i18n-skip>${ex(c.name)}</span></button>`).join('');
  const gl=GL();
  const users=root?usersOf(root.id):[];
  const own=ownerNow();
  const canAttach=!!(own&&root&&!(own.vs||[]).some(c=>c.gid===root.id));
  const dbgOpts=R.on&&root?[...R.mach.values()].filter(M=>M.gid===root.id):[];
  if(dbgOpts.length&&!dbgOpts.some(M=>M.owner.id===E.dbg))E.dbg=dbgOpts[0].owner.id;
  BOX.innerHTML=`
  <div class="vtop">
    <div class="vgsel"><button type="button" class="vgpick" id="vsPick" title="${ex(L10('그래프 고르기 · 새로 만들기'))}">${root?(root.kind==='state'?IC.state:IC.flow):IC.flow}<span data-i18n-skip>${ex(root?root.name:L10('그래프 없음'))}</span><svg class="cv" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 4l2.5 2.5L7.5 4"/></svg></button></div>
    ${E.path.length?`<nav class="vcrumb" aria-label="${ex(L10('그래프 위치'))}"><button type="button" class="ib vup" id="vsUp" title="${ex(L10('바깥 그래프로 (Backspace)'))}">${IC.up}</button>${crumbsH}</nav>`:`<span class="vkind">${root?(root.kind==='state'?L10('상태 그래프 · 상태 머신'):L10('스크립트 그래프 · 스크립트 머신')):''}</span>`}
    <span class="vsp"></span>
    ${R.on&&dbgOpts.length?`<label class="vdbg" title="${ex(L10('플레이 중 흐름을 볼 오브젝트'))}"><i class="vlive"></i><select id="vsDbg">${dbgOpts.map(M=>`<option value="${ex(M.owner.id)}"${M.owner.id===E.dbg?' selected':''} data-i18n-skip>${ex(M.owner.name)}</option>`).join('')}</select></label>`:R.on?`<span class="vdbg off"><i class="vlive"></i>${L10('이 그래프를 쓰는 오브젝트가 실행 중이 아닙니다')}</span>`:''}
    ${canAttach?`<button type="button" class="btn sm pri" id="vsAttach" title="${ex(L10('인스펙터에서 고른 오브젝트에 이 그래프를 컴포넌트로 붙입니다'))}">${IC.plus}<span>${L10('붙이기')}:</span><b data-i18n-skip>${ex(own.name)}</b></button>`:''}
    <button type="button" class="ib" id="vsFit" title="${ex(L10('전체 보기 (F)'))}">${IC.fit}</button>
    <button type="button" class="ib${E.lib?' on':''}" id="vsLibT" title="${ex(L10('노드 목록 보이기/숨기기'))}">${IC.lib}</button>
    <button type="button" class="ib${E.side?' on':''}" id="vsSideT" title="${ex(L10('속성 패널 보이기/숨기기'))}">${IC.side}</button>
    <button type="button" class="ib${UI.flip?' on':''}" id="vsFlip" title="${ex(L10('노드 목록 · 속성 패널 좌우 바꾸기'))}">${IC.swap}</button>
    <button type="button" class="ib" id="vsMore" title="${ex(L10('더 보기'))}">${IC.more}</button>
  </div>
  <div class="vmain${UI.flip?' flip':''}" style="--libw:${UI.libW}px;--sidew:${UI.sideW}px">
    ${E.lib&&g?`<aside class="vlib">${libHtml(g)}</aside><div class="vgrip" data-split="lib" role="separator" aria-orientation="vertical" title="${ex(L10('끌어서 너비 조절 · 더블클릭: 기본 너비'))}"></div>`:''}
    <div class="vcv${g&&g.kind==='state'?' st':''}" id="vsCv" tabindex="-1">
      ${g?`<div class="vworld" id="vsWorld"><svg class="vlinks" id="vsLinks"><defs><marker id="vsArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10z" style="fill:#9b9ba6;stroke:none"/></marker><marker id="vsArrS" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10z" style="fill:#e9bd0c;stroke:none"/></marker><marker id="vsArrH" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10z" style="fill:#ffe066;stroke:none"/></marker></defs></svg>${g.kind==='state'?statesHtml(g):nodesHtml(g)}<svg class="vlinks vwire" id="vsWire"><defs><marker id="vsArrW" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10z" style="fill:#e9bd0c;stroke:none"/></marker></defs></svg></div>
      <div class="vhint">${g.kind==='state'?L10('상태를 더블클릭하면 안으로 · 오른쪽 ◉를 끌어 다른 상태에 놓으면 전환 · 오른쪽 클릭으로 상태 추가'):L10('포트를 끌어 선으로 잇기 · 오른쪽 클릭으로 노드 추가 · 빈 곳을 끌면 화면 이동 · 휠로 확대')}</div>`:`<div class="vempty">${emptyHtml()}</div>`}
    </div>
    ${E.side&&g?`<div class="vgrip" data-split="side" role="separator" aria-orientation="vertical" title="${ex(L10('끌어서 너비 조절 · 더블클릭: 기본 너비'))}"></div><aside class="vside">${sideHtml(g,users)}</aside>`:''}
  </div>`;
  if(g){applyView();requestAnimationFrame(drawLinks)}
  if(keepF){const c=VQ('#vsCv',BOX)||BOX;try{c.focus({preventScroll:true})}catch(e){}}
  paintLive(true);
}
function emptyHtml(){return`<div class="vemp"><div class="vemi">${IC.flow}</div><h3>${L10('비주얼 스크립트')}</h3><p>${L10('노드를 선으로 이어 코드 없이 동작을 만들어요.')}</p><div class="vemb"><button type="button" class="btn pri" data-new="flow">${IC.flow}${L10('새 스크립트 그래프')}</button><button type="button" class="btn" data-new="state">${IC.state}${L10('새 상태 그래프')}</button></div></div>`}
function libHtml(g){
  const q=E.libQ.trim().toLowerCase();
  if(g.kind==='state'){
    return`<div class="vlh">${L10('상태 추가')}</div><div class="vlst"><button type="button" class="vli" data-addst="flow">${IC.flow}<span>${L10('스크립트 상태')}</span><small>${L10('안에 스크립트 그래프')}</small></button><button type="button" class="vli" data-addst="super">${IC.state}<span>${L10('상위 상태')}</span><small>${L10('안에 또 상태 그래프')}</small></button></div>
    <div class="vltip"><b>${L10('큰 지도 (상태 머신)')}</b><p>${L10('상태 = 지금 하고 있는 일 (예: 대기 · 쫓아가기 · 대화). 화살표 = 언제 다른 일로 바꿀지.')}</p><p>${L10('각 상태 안에는 스크립트 그래프가 있어 세부 작업을 처리해요. 그 안에서 「상태 바꾸기」 · 「상태 끝내기」 · 「커스텀 이벤트 보내기」로 이 지도를 움직일 수 있어요.')}</p></div>`;
  }
  const md=mode();
  const ok=t=>{const d=NT[t];if(d.only==='state'&&md!=='state')return false;if(d.only==='sub'&&md!=='sub')return false;return true};
  const items=Object.keys(NT).filter(ok).filter(t=>!q||(L10(NT[t].label)+' '+NT[t].label+' '+t+' '+(NT[t].tip||'')).toLowerCase().includes(q));
  return`<div class="vlq"><input type="search" id="vsLibQ" placeholder="${ex(L10('노드 검색'))}" value="${ex(E.libQ)}" autocomplete="off" spellcheck="false"></div><div class="vll">`+
    CATS.map(([c,cn])=>{const L0=items.filter(t=>NT[t].cat===c);if(!L0.length)return'';const shut=!q&&!E.libOpen[c];
      return`<div class="vlc${shut?' vshut':''}"><button type="button" class="vlch" data-vfold="${c}" aria-expanded="${!shut}"><svg class="vchev" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 2l3 3-3 3"/></svg><i style="background:${CATC[c]}"></i><span>${L10(cn)}</span><small>${L0.length}</small></button><div class="vlcb">${L0.map(t=>`<button type="button" class="vln" data-add="${t}" draggable="true" title="${ex(NT[t].tip?L10(NT[t].tip):'')}" style="--cc:${CATC[c]};--ch:${CATH[c]};--cd:${CATD[c]}">${ex(L10(NT[t].label))}</button>`).join('')}</div></div>`}).join('')+
    (items.length?'':`<p class="vlnone">${L10('검색 결과가 없습니다')}</p>`)+'</div>';
}
function portHtml(n,p,io,g){
  const [k,lb,ty]=p,linked=g.links.some(l=>io==='i'?l.b===n.id&&l.bp===k:l.a===n.id&&l.ap===k);
  let ed='';
  if(io==='i'&&ty!=='flow'&&!linked&&p[3]!==undefined){const v=n.v?n.v[k]:p[3];
    if(ty==='bool')ed=`<input type="checkbox" class="vpe" data-v="${k}"${tB(v)?' checked':''}>`;
    else ed=`<input type="${ty==='num'?'number':'text'}" class="vpe" data-v="${k}" value="${ex(v)}"${ty==='num'?' step="any"':''} spellcheck="false">`}
  return`<span class="vp ${io==='i'?'pin':'pout'} t-${ty}${linked?' on':''}" data-p="${k}" data-io="${io}" style="--pc:${TYC[ty]||TYC.any}">${io==='i'?`<i class="vpd"></i>`:''}${lb?`<b>${ex(L10(lb))}</b>`:''}${ed}${io==='o'?`<i class="vpd"></i>`:''}</span>`;
}
const SCOPEC={graph:EC.START,object:EC.FLOW,scene:EC.CALC,app:EC.VARIABLE};
const scopeName=k=>L10((SCOPES.find(q=>q[0]===k)||SCOPES[0])[1]);
const VTN={num:'숫자',str:'글자',bool:'참/거짓'};
function vpickBtn(scope,name,attr){scope=scope||'graph';return`<button type="button" class="vvp" ${attr} title="${ex(L10('변수 고르기'))}"><i style="--sc:${SCOPEC[scope]}">${ex(scopeName(scope))}</i><b data-i18n-skip>${ex(name||L10('변수 고르기'))}</b><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 4l2.5 2.5L7.5 4"/></svg></button>`}
const TGN={self:'자신',hero:'주인공',all:'씬 전체',name:''};
/* 대상 단추: 아이콘 + 이름 (계층 구조 메뉴에서 고름) */
function tpickBtn(spec,to,tname,attr){to=to||'self';let ic='cube',col=EC.MOVING,lb=L10(TGN[to]||'');
  if(to==='self'){ic='target';col=EC.START}else if(to==='hero'){ic='user';col='#4cd98a'}else if(to==='all'){ic='scene';col=EC.HARDWARE}
  else{const o=findOwnerEd(tname);if(o){const r=ownerLook(o);ic=r.icon;col=r.color}lb=tname||L10('오브젝트 고르기')}
  const miss=to==='name'&&tname&&!findOwnerEd(tname);
  return`<button type="button" class="vtp${miss?' miss':''}" ${attr} title="${ex(miss?L10('지금 씬에서 「{n}」을(를) 찾을 수 없어요',{n:tname}):L10('대상 고르기'))}"><span class="vtpi" style="--oc:${col}">${ic==='target'?IC.target:ico(ic)}</span><b${to==='name'?' data-i18n-skip':''}>${ex(lb)}</b><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 4l2.5 2.5L7.5 4"/></svg></button>`}
function findOwnerEd(nm){if(!nm||!P)return null;let m=null;try{m=cur()}catch(e){}if(m){const o=m.objs.find(q=>q.name===nm)||(m.ui||[]).find(q=>q.name===nm);if(o)return o}return(P.mgrs||[]).find(q=>q.name===nm)||null}
function ownerLook(o){if(o.mgr)return{icon:'mgr',color:'#9a8cff',kind:'mgr'};if(isUiEl(o))return{icon:UI_ICON[o.type]||'ui',color:UI_COLOR[o.type]||'#8b90a3',kind:'ui'};return{icon:o.type==='spawn'?'user':(o.props&&o.props.camera?'cam':'cube'),color:(TYPES[o.type]||{}).color||'#8b90a3',kind:'obj'}}
function fieldHtml(n,f){const [k,lb,ty,d,opts]=f,v=n.v&&k in n.v?n.v[k]:d;
  if(ty==='target'){const nk=f[5];return`<div class="vf vft">${lb?`<span>${ex(L10(lb))}</span>`:''}${tpickBtn(opts,v,n.v&&n.v[nk],`data-tpick="${n.id}" data-tk="${k}"`)}</div>`}
  /* 변수 노드: 범위 + 이름 칸 대신 변수 고르기 단추 하나 */
  if(/^var\./.test(n.t)){if(k==='scope')return'';if(k==='name')return`<div class="vf vfv">${vpickBtn(n.v&&n.v.scope,v,`data-vpick="${n.id}"`)}</div>`}
  const c=ty==='sel'?`<select data-f="${k}">${opts.map(o=>`<option value="${ex(o[0])}"${String(o[0])===String(v)?' selected':''}>${ex(L10(o[1]))}</option>`).join('')}</select>`:`<input type="${ty==='num'?'number':'text'}" data-f="${k}" value="${ex(v)}"${ty==='num'?' step="any"':''} spellcheck="false" data-i18n-skip>`;
  if(k==='tname'&&n.v&&n.v.to!=='name')return'';
  return`<label class="vf">${lb?`<span>${ex(L10(lb))}</span>`:''}${c}</label>`}
function nodesHtml(g){
  return g.nodes.map(n=>{const d=def(n),ins=insOf(n),outs=outsOf(n),rows=Math.max(ins.length,outs.length),sel=E.sel.has(n.id);
    const fi=ins.filter(p=>p[2]==='flow'),fo=outs.filter(p=>p[2]==='flow'),di=ins.filter(p=>p[2]!=='flow'),dout=outs.filter(p=>p[2]!=='flow');
    const L1=[...fi,...di],L2=[...fo,...dout];
    let body='';for(let i=0;i<Math.max(L1.length,L2.length);i++)body+=`<div class="vr">${L1[i]?portHtml(n,L1[i],'i',g):'<span></span>'}${L2[i]?portHtml(n,L2[i],'o',g):'<span></span>'}</div>`;
    const fs=(d.f||[]).map(f=>fieldHtml(n,f)).join('');
    const inner=d.sub?`<button type="button" class="vin" data-enter="${n.id}" title="${ex(L10('안으로 들어가기 (더블클릭)'))}">${IC.enter}<span>${d.sub==='state'?L10('상태 {n}개',{n:(n.sub&&n.sub.states||[]).length}):L10('노드 {n}개',{n:(n.sub&&n.sub.nodes||[]).length})}</span></button>`:'';
    return`<div class="vn c-${d.cat}${d.ev?' ev':''}${d.sub?' sub':''}${sel?' sel':''}" data-n="${n.id}" style="left:${n.x}px;top:${n.y}px;--cc:${CATC[d.cat]};--ch:${CATH[d.cat]};--cd:${CATD[d.cat]}"><div class="vnh" title="${ex(d.tip?L10(d.tip):'')}"><i></i><span${n.t==='sub'||n.t==='smu'?' data-i18n-skip':''}>${ex(n.t==='sub'||n.t==='smu'?(n.name||L10(d.label)):L10(nodeLabel(n)))}</span>${d.sub?`<em>${d.sub==='state'?IC.state:IC.flow}</em>`:''}</div>${fs?`<div class="vfs">${fs}</div>`:''}${body?`<div class="vnb">${body}</div>`:''}${inner}</div>`}).join('');
}
function statesHtml(g){
  return g.states.map(s=>{const sel=E.sel.has(s.id),inner=s.kind==='super'?(s.g&&s.g.states||[]).length:(s.g&&s.g.nodes||[]).length;
    return`<div class="vs-st${sel?' sel':''}${g.start===s.id?' start':''}${s.kind==='super'?' super':''}" data-st="${s.id}" style="left:${s.x}px;top:${s.y}px">${g.start===s.id?`<span class="vstart">${L10('시작')}</span>`:''}<div class="vsth">${s.kind==='super'?IC.state:IC.flow}<b data-i18n-skip>${ex(s.name)}</b></div><div class="vstb">${s.kind==='super'?L10('상위 상태 · 상태 {n}개',{n:inner}):L10('스크립트 상태 · 노드 {n}개',{n:inner})}</div><div class="vstbar"><i></i></div><button type="button" class="vsto" data-tr="${s.id}" title="${ex(L10('끌어서 다른 상태에 놓으면 전환 화살표'))}"></button></div>`}).join('')+
  g.trans.map(t=>`<button type="button" class="vtl${E.sel.has(t.id)?' sel':''}" data-tl="${t.id}" title="${ex(L10('전환 조건 — 눌러서 바꾸기'))}">${ex(condText(t.c||{}))}</button>`).join('');
}
function sideHtml(g,users){
  const one=E.sel.size===1?[...E.sel][0]:null;
  const root=rootG();
  if(g.kind==='flow'&&one){const n=g.nodes.find(q=>q.id===one);if(n)return nodeSide(n)}
  if(g.kind==='state'&&one){const s=g.states.find(q=>q.id===one);if(s)return stateSide(g,s);const t=g.trans.find(q=>q.id===one);if(t)return transSide(g,t)}
  /* 그래프 정보 · 변수 · 쓰는 곳 */
  const vars=g.vars||[];
  const ul=users.map(u=>`<li><button type="button" class="vul" data-user="${ex(u.o.id)}" data-scene="${ex(u.scene?u.scene.id:'')}" data-i18n-skip>${ex(u.o.name)}</button><small>${u.kind==='mgr'?L10('매니저'):ex(u.scene.name)}</small></li>`).join('');
  return`<div class="vsec"><div class="vsh">${E.path.length?L10('이 그래프'):L10('그래프')}</div>
    ${E.path.length?`<p class="vsx">${g.kind==='state'?L10('안쪽 상태 그래프'):L10('안쪽 스크립트 그래프')} · <span data-i18n-skip>${ex(root.name)}</span>${L10(' 안에 들어 있어요')}</p>`:`<label class="vsf"><span>${L10('이름')}</span><input type="text" id="vsName" value="${ex(g.name)}" maxlength="40" data-i18n-skip></label><p class="vsx">${g.kind==='state'?L10('상태 그래프 — 상태 머신 컴포넌트로 붙여요'):L10('스크립트 그래프 — 스크립트 머신 컴포넌트로 붙여요')}</p>`}</div>
  <div class="vsec"><div class="vsh">${IC.vars}${L10('그래프 변수')}<span class="vsp"></span><button type="button" class="ib" id="vsVarAdd" title="${ex(L10('변수 추가'))}">${IC.plus}</button></div>
    ${vars.length?`<div class="vvars">${vars.map((v,i)=>`<div class="vvar"><input type="text" data-vn="${i}" value="${ex(v.name)}" spellcheck="false" data-i18n-skip><select data-vt="${i}">${[['num','숫자'],['str','글자'],['bool','참/거짓']].map(o=>`<option value="${o[0]}"${v.type===o[0]?' selected':''}>${L10(o[1])}</option>`).join('')}</select>${v.type==='bool'?`<input type="checkbox" data-vd="${i}"${tB(v.def)?' checked':''}>`:`<input type="${v.type==='num'?'number':'text'}" data-vd="${i}" value="${ex(v.def)}" step="any" data-i18n-skip>`}<button type="button" class="ib" data-vx="${i}" aria-label="${ex(L10('삭제'))}">${IC.x}</button></div>`).join('')}</div>`:`<p class="vsx">${L10('「변수 가져오기 / 설정」 노드의 범위를 「그래프」로 두면 여기 변수를 씁니다. 컴포넌트마다 처음 값을 바꿀 수 있어요.')}</p>`}
    ${R.on&&E.dbg?liveVars():''}</div>
  ${E.path.length?'':`<div class="vsec"><div class="vsh">${L10('이 그래프를 쓰는 곳')} <small>${users.length}</small></div>${users.length?`<ul class="vusers">${ul}</ul>`:`<p class="vsx">${L10('아직 아무 오브젝트에도 붙지 않았어요. 인스펙터의 「스크립트 추가 → 비주얼 스크립트」나 위의 「붙이기」로 붙이세요.')}</p>`}</div>`}
  <div class="vsec vhelp"><div class="vsh">${L10('서로 이어 주기')}</div>
    <p>${L10('⚡ 커스텀 이벤트: 「보내기」 노드 → 다른 머신의 「받기」 노드와 상태 전환(이벤트를 받으면)이 받아요.')}</p>
    <p>${L10('C# 스크립트에서: VisualScript.Trigger("이름") · SetVariable("이름", 값) · SetState("상태") · CurrentState')}</p>
    <p>${L10('엔진 메시지(말 걸기 · 클릭 …)는 C# 메서드와 비주얼 스크립트가 함께 받아요.')}</p></div>`;
}
function liveVars(){const M=[...R.mach.values()].find(x=>x.owner.id===E.dbg&&x.gid===E.gid);if(!M)return'';const ov=R.ovars.get(M.owner.id)||{};
  const row=(k,v,s)=>`<div class="vlv"><small>${s}</small><b data-i18n-skip>${ex(k)}</b><span data-i18n-skip>${ex(tS(v))}</span></div>`;
  const a=Object.keys(M.gvars).map(k=>row(k,M.gvars[k],L10('그래프'))).concat(Object.keys(ov).map(k=>row(k,ov[k],L10('오브젝트'))),Object.keys(R.svars).map(k=>row(k,R.svars[k],L10('씬'))),Object.keys(R.avars).map(k=>row(k,R.avars[k],L10('앱'))));
  return a.length?`<div class="vlvs"><div class="vlvh"><i class="vlive"></i>${L10('지금 값')}</div>${a.join('')}</div>`:''}
function nodeSide(n){const d=def(n);return`<div class="vsec"><div class="vsh"><i class="vcd" style="background:${CATC[d.cat]}"></i>${ex(L10(d.label))}</div>
  ${d.sub?`<label class="vsf"><span>${L10('이름')}</span><input type="text" id="vsNodeName" value="${ex(n.name||'')}" maxlength="40" data-i18n-skip></label><button type="button" class="btn pri vsb" data-enter="${n.id}">${IC.enter}${L10('안으로 들어가기')}</button>`:''}
  <p class="vsx">${ex(d.tip?L10(d.tip):L10(CATS.find(c=>c[0]===d.cat)[1]))}</p>
  <div class="vsbtns"><button type="button" class="btn sm" id="vsDup">${L10('복제 (Ctrl+D)')}</button><button type="button" class="btn sm danger" id="vsDel">${L10('삭제 (Delete)')}</button></div></div>`}
function stateSide(g,s){return`<div class="vsec"><div class="vsh">${s.kind==='super'?IC.state:IC.flow}${L10('상태')}</div>
  <label class="vsf"><span>${L10('이름')}</span><input type="text" id="vsStName" value="${ex(s.name)}" maxlength="30" data-i18n-skip></label>
  <label class="vsf"><span>${L10('종류')}</span><select id="vsStKind"><option value="flow"${s.kind!=='super'?' selected':''}>${L10('스크립트 상태 (안에 스크립트 그래프)')}</option><option value="super"${s.kind==='super'?' selected':''}>${L10('상위 상태 (안에 상태 그래프)')}</option></select></label>
  <div class="vsbtns"><button type="button" class="btn pri sm" data-enterst="${s.id}">${IC.enter}${L10('안으로 들어가기')}</button>${g.start===s.id?`<span class="vsx">★ ${L10('시작 상태')}</span>`:`<button type="button" class="btn sm" id="vsStart">${L10('시작 상태로')}</button>`}</div>
  <div class="vsh" style="margin-top:12px">${L10('나가는 전환')}</div>${g.trans.filter(t=>t.a===s.id).map(t=>`<button type="button" class="vtr" data-tl="${t.id}">→ <b data-i18n-skip>${ex((g.states.find(q=>q.id===t.b)||{}).name||'?')}</b><small>${ex(condText(t.c||{}))}</small></button>`).join('')||`<p class="vsx">${L10('오른쪽 ◉를 끌어 다른 상태에 놓으세요.')}</p>`}
  <div class="vsbtns"><button type="button" class="btn sm danger" id="vsDel">${L10('상태 삭제')}</button></div></div>`}
function transSide(g,t){const c=t.c||(t.c={t:'event',name:'이벤트'}),a=g.states.find(q=>q.id===t.a),b=g.states.find(q=>q.id===t.b);
  const ty=[['event','이벤트를 받으면'],['time','시간이 지나면'],['done','상태가 끝나면'],['var','변수 조건'],['key','키를 누르면'],['dist','오브젝트와의 거리'],['always','바로 (조건 없음)']];
  let p='';
  if(c.t==='event')p=`<label class="vsf"><span>${L10('이벤트 이름')}</span><input type="text" data-c="name" value="${ex(c.name||'')}" list="vsEvList" data-i18n-skip></label><datalist id="vsEvList">${MSGS.map(m=>`<option value="${m[0]}">${ex(L10(m[1]))}</option>`).join('')}${allEvents().map(e=>`<option value="${ex(e)}"></option>`).join('')}</datalist><p class="vsx">${L10('커스텀 이벤트 이름이나 엔진 메시지(OnInteract …)')}</p>`;
  if(c.t==='time')p=`<label class="vsf"><span>${L10('초')}</span><input type="number" data-c="sec" value="${ex(c.sec==null?1:c.sec)}" step="any"></label>`;
  if(c.t==='key')p=`<label class="vsf"><span>${L10('키')}</span><select data-c="key">${KEYS.map(k=>`<option value="${k[0]}"${c.key===k[0]?' selected':''}>${ex(L10(k[1]))}</option>`).join('')}</select></label>`;
  if(c.t==='var')p=`<div class="vsf"><span>${L10('변수')}</span>${vpickBtn(c.scope,c.name,`data-vpickt="${t.id}"`)}</div><label class="vsf"><span>${L10('비교')}</span><select data-c="op">${['==','!=','>','<','>=','<='].map(o=>`<option${(c.op||'==')===o?' selected':''}>${o}</option>`).join('')}</select></label><label class="vsf"><span>${L10('값')}</span><input type="text" data-c="val" value="${ex(c.val==null?'':c.val)}" data-i18n-skip></label>`;
  if(c.t==='dist')p=`<div class="vsf"><span>${L10('누구와')}</span>${tpickBtn({allow:['hero','name'],kinds:['obj']},c.to||'hero',c.tname,`data-tpickt="${t.id}"`)}</div>`+`<label class="vsf"><span>${L10('비교')}</span><select data-c="op"><option value="<"${c.op!=='>'?' selected':''}>${L10('가까우면 (<)')}</option><option value=">"${c.op==='>'?' selected':''}>${L10('멀면 (>)')}</option></select></label><label class="vsf"><span>${L10('칸')}</span><input type="number" data-c="val" value="${ex(c.val==null?2:c.val)}" step="any"></label>`;
  if(c.t==='done')p=`<p class="vsx">${L10('상태 안 그래프의 「상태 끝내기」 노드가 실행되면 넘어갑니다.')}</p>`;
  return`<div class="vsec"><div class="vsh">${L10('전환')}</div><p class="vtrn"><b data-i18n-skip>${ex(a?a.name:'?')}</b> → <b data-i18n-skip>${ex(b?b.name:'?')}</b></p>
  <label class="vsf"><span>${L10('언제')}</span><select data-c="t">${ty.map(o=>`<option value="${o[0]}"${c.t===o[0]?' selected':''}>${L10(o[1])}</option>`).join('')}</select></label>${p}
  <div class="vsbtns"><button type="button" class="btn sm danger" id="vsDel">${L10('전환 삭제')}</button></div></div>`}
function allEvents(){const s=new Set();GL().forEach(g=>walkG(g,x=>{if(x.kind==='flow')x.nodes.forEach(n=>{if((n.t==='ev.custom'||n.t==='trig')&&n.v&&n.v.name)s.add(n.v.name)});else x.trans.forEach(t=>{if(t.c&&t.c.t==='event'&&t.c.name)s.add(t.c.name)})}));return[...s]}

/* ---- 화면 (이동 · 확대) ---- */
function applyView(){const w=VQ('#vsWorld',BOX);if(!w)return;const v=vw();w.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.z})`;const cv=VQ('#vsCv',BOX);if(cv){cv.style.backgroundSize=`${24*v.z}px ${24*v.z}px`;cv.style.backgroundPosition=`${v.x}px ${v.y}px`}}
function fit(){const g=curG(),cv=VQ('#vsCv',BOX);if(!g||!cv)return;const els=VQA('.vn,.vs-st',cv);const v=vw();if(!els.length){v.x=40;v.y=30;v.z=1;applyView();return}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;els.forEach(el=>{const x=el.offsetLeft,y=el.offsetTop;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+el.offsetWidth);y1=Math.max(y1,y+el.offsetHeight)});
  const W=cv.clientWidth,Hh=cv.clientHeight;if(!W||!Hh)return;const z=Math.max(.3,Math.min(1,Math.min((W-60)/(x1-x0||1),(Hh-60)/(y1-y0||1))));
  v.z=z;v.x=(W-(x1-x0)*z)/2-x0*z;v.y=(Hh-(y1-y0)*z)/2-y0*z;applyView();drawLinks()}
const toWorld=(cx,cy)=>{const cv=VQ('#vsCv',BOX),r=cv.getBoundingClientRect(),v=vw();return{x:(cx-r.left-v.x)/v.z,y:(cy-r.top-v.y)/v.z}};

/* ---- 선 그리기 ---- */
function portXY(nid0,io,k){const el=BOX.querySelector(`.vn[data-n="${nid0}"] .vp[data-io="${io}"][data-p="${k}"] .vpd`);if(!el)return null;const w=VQ('#vsWorld',BOX),r=el.getBoundingClientRect(),wr=w.getBoundingClientRect(),z=vw().z;return{x:(r.left+r.width/2-wr.left)/z,y:(r.top+r.height/2-wr.top)/z}}
const bez=(a,b)=>{const dx=Math.max(40,Math.abs(b.x-a.x)*.5);return`M${a.x} ${a.y}C${a.x+dx} ${a.y} ${b.x-dx} ${b.y} ${b.x} ${b.y}`};
function drawLinks(){
  const svg=VQ('#vsLinks',BOX),g=curG();if(!svg||!g)return;
  const defs=svg.querySelector('defs').outerHTML;let h='';
  if(g.kind==='flow'){
    g.links.forEach(l=>{const a=portXY(l.a,'o',l.ap),b=portXY(l.b,'i',l.bp);if(!a||!b)return;const n=g.nodes.find(q=>q.id===l.a),ty=n?portTy(n,'o',l.ap):'any';
      h+=`<path class="vl${ty==='flow'?' fl':''}${E.sel.has(l.id)?' sel':''}" data-l="${l.id}" d="${bez(a,b)}" style="--lc:${TYC[ty]||TYC.any}"/><path class="vlhit" data-l="${l.id}" d="${bez(a,b)}"/>`});
  }else{
    const ctr=s=>{const el=BOX.querySelector(`.vs-st[data-st="${s.id}"]`);return el?{x:s.x+el.offsetWidth/2,y:s.y+el.offsetHeight/2,w:el.offsetWidth/2,h:el.offsetHeight/2}:null};
    g.trans.forEach(t=>{const A=g.states.find(q=>q.id===t.a),B=g.states.find(q=>q.id===t.b);if(!A||!B)return;const a=ctr(A),b=ctr(B);if(!a||!b)return;
      const both=g.trans.some(q=>q.a===t.b&&q.b===t.a);let dx=b.x-a.x,dy=b.y-a.y;const len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,off=both?12:0;
      const edge=(c,ux,uy)=>{const tx=Math.abs(ux)>1e-6?c.w/Math.abs(ux):1e9,ty=Math.abs(uy)>1e-6?c.h/Math.abs(uy):1e9;const k=Math.min(tx,ty)+4;return{x:c.x+ux*k,y:c.y+uy*k}};
      const p1=edge(a,dx/len,dy/len),p2=edge(b,-dx/len,-dy/len);p1.x+=nx*off;p1.y+=ny*off;p2.x+=nx*off;p2.y+=ny*off;
      h+=`<path class="vt${E.sel.has(t.id)?' sel':''}" data-t="${t.id}" d="M${p1.x} ${p1.y}L${p2.x} ${p2.y}" marker-end="url(#${E.sel.has(t.id)?'vsArrS':'vsArr'})"/><path class="vlhit" data-tl="${t.id}" d="M${p1.x} ${p1.y}L${p2.x} ${p2.y}"/>`;
      const lb=BOX.querySelector(`.vtl[data-tl="${t.id}"]`);if(lb){lb.style.left=((p1.x+p2.x)/2)+'px';lb.style.top=((p1.y+p2.y)/2)+'px'}});
  }
  /* 끌고 있는 선은 노드 위 별도 층(#vsWire)에 그려 늘 노드 위로 보이게 */
  let wh='';if(E.wire&&E.wire.a&&E.wire.b) wh=`<path class="vl tmp${E.wire.st?' st':''}${E.wire.snap?' snap':''}" d="${E.wire.st?`M${E.wire.a.x} ${E.wire.a.y}L${E.wire.b.x} ${E.wire.b.y}`:E.wire.rev?bez(E.wire.b,E.wire.a):bez(E.wire.a,E.wire.b)}" style="--lc:${TYC[E.wire.ty]||'#e9bd0c'}"${E.wire.st?' marker-end="url(#vsArrW)"':''}/>`;
  svg.innerHTML=defs+h;
  const ws=VQ('#vsWire',BOX);if(ws){const wd=ws.querySelector('defs');ws.innerHTML=(wd?wd.outerHTML:'')+wh}
}
/* ---- 플레이 중 빛내기 (rAF) ---- */
let liveRaf=0;
function paintLive(force){
  const g=curG();const t=now();
  if(!BOX||!g||!isVisible()){return}
  const own=E.dbg;
  const on=R.on&&own;
  BOX.classList.toggle('live',!!on);
  if(!on&&!force)return;
  const age=id=>{if(!on)return 1e9;const h=R.hot.get(own+'|'+id);return h?t-h:1e9};
  const lv=a=>a<HOTMS?(1-a/HOTMS).toFixed(3):'0';
  if(g.kind==='flow'){
    VQA('.vn',BOX).forEach(el=>{const a=age(el.dataset.n);el.style.setProperty('--hot',lv(a));el.classList.toggle('hot',a<HOTMS)});
    VQA('#vsLinks .vl[data-l]',BOX).forEach(el=>{const a=age(el.dataset.l);el.classList.toggle('hot',a<HOTMS);el.style.setProperty('--hot',lv(a))});
  }else{
    const curId=on?R.cur.get(own+'|'+g.id):null;
    const M=on?[...R.mach.values()].find(x=>x.owner.id===own):null;
    const si=M&&findSI(M.root,g.id);
    VQA('.vs-st',BOX).forEach(el=>{const id=el.dataset.st,isC=!!si&&si.running&&si.cur===id;el.classList.toggle('cur',isC);const a=age(id);el.style.setProperty('--hot',lv(a));
      const bar=el.querySelector('.vstbar i');if(bar){let p=0;if(isC){const tr=g.trans.filter(q=>q.a===id&&q.c&&q.c.t==='time');if(tr.length){const s=Math.min(...tr.map(q=>tN(q.c.sec)||1));p=Math.min(1,si.t/s)}else p=(si.t%1)}bar.style.width=(p*100).toFixed(1)+'%'}});
    VQA('#vsLinks .vt',BOX).forEach(el=>{const a=age(el.dataset.t),h=a<HOTMS*2;if(el.classList.contains('hot')!==h){el.classList.toggle('hot',h);el.setAttribute('marker-end',`url(#${h?'vsArrH':el.classList.contains('sel')?'vsArrS':'vsArr'})`)}});
    VQA('.vtl',BOX).forEach(el=>{const a=age(el.dataset.tl);el.classList.toggle('hot',a<HOTMS*2)});
  }
  if(on&&E.side&&E.sel.size===0){const lvv=VQ('.vlvs',BOX);if(lvv&&t-(paintLive.vt||0)>250){paintLive.vt=t;const fresh=liveVars();const tmp=document.createElement('div');tmp.innerHTML=fresh;if(tmp.firstChild)lvv.replaceWith(tmp.firstChild)}}
}
function findSI(x,gid){if(!x)return null;if(x.kind==='state'){if(x.g.id===gid)return x;return findSI(x.child,gid)}let r=null;x.subs.forEach(s=>{if(!r)r=findSI(s,gid)});return r}
function liveLoop(){
  liveRaf=requestAnimationFrame(liveLoop);
  if(!R.on)return;
  try{flowPaint()}catch(e){}
  if(isVisible())paintLive(false);
}
liveRaf=requestAnimationFrame(liveLoop);
let dbgRefreshT=0;
function onPlayFrame(){/* 디버그 대상 목록이 생기면 위 막대를 다시 그림 */if(!isVisible())return;const t=now();if(t-dbgRefreshT<600)return;dbgRefreshT=t;const root=rootG();if(!root)return;const ids=[...R.mach.values()].filter(M=>M.gid===root.id).map(M=>M.owner.id).join(',');if(ids!==onPlayFrame.k){onPlayFrame.k=ids;const ae=document.activeElement;if(!(ae&&BOX.contains(ae)&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName)))render()}}

/* ===================== 조작 ===================== */
function addNodeAt(t,x,y,conn){
  const g=curG();if(!g||g.kind!=='flow')return null;let n;
  edit(()=>{n=mkNode(t,x,y);g.nodes.push(n);E.sel=new Set([n.id]);
    if(conn){const ty=conn.ty,want=conn.io==='o'?'i':'o';const P0=(want==='i'?insOf(n):outsOf(n)).find(p=>ty==='flow'?p[2]==='flow':p[2]!=='flow');
      if(P0){if(want==='i')link(g,conn.n,conn.k,n.id,P0[0]);else link(g,n.id,P0[0],conn.n,conn.k)}}});
  return n;
}
const magnetOn=()=>{try{return setv.vsMagnet!==false}catch(e){return true}};
const fxOn=()=>{try{return setv.vsFx!==false}catch(e){return true}};
/* 끌고 있는 선과 이을 수 있는 가장 가까운 포트 (흐름 ↔ 흐름 · 값 ↔ 값 · 같은 노드 제외) */
function nearPort(cx,cy,w){
  const want=w.io==='o'?'i':'o',flow=w.ty==='flow',z=vw().z,R0=34;let best=null,bd=R0;
  BOX.querySelectorAll(`.vn .vp[data-io="${want}"]`).forEach(el=>{
    const nEl=el.closest('.vn');if(!nEl||nEl.dataset.n===w.n)return;
    if(el.classList.contains('t-flow')!==flow)return;
    const d0=el.querySelector('.vpd');if(!d0)return;const r=d0.getBoundingClientRect(),d=Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy);
    if(d<bd){bd=d;best={n:nEl.dataset.n,k:el.dataset.p,io:want,el}}});
  return best;
}
/* 연결 효과: 선이 반짝 · 받는 포트에서 동그란 물결 (설정 > 비주얼 스크립트 > 연결 효과) */
function bornFx(L1,isTr){
  if(!L1||!fxOn())return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const path=BOX.querySelector(isTr?`#vsLinks .vt[data-t="${L1.id}"]`:`#vsLinks .vl[data-l="${L1.id}"]`);if(path)path.classList.add('born');
    const wld=VQ('#vsWorld',BOX);if(!wld)return;
    let at=null;
    if(isTr){const lb=BOX.querySelector(`.vtl[data-tl="${L1.id}"]`);if(lb){lb.classList.add('born');at={x:parseFloat(lb.style.left),y:parseFloat(lb.style.top)}}}
    else{at=portXY(L1.b,'i',L1.bp);const pe=BOX.querySelector(`.vn[data-n="${L1.b}"] .vp[data-io="i"][data-p="${L1.bp}"]`),po=BOX.querySelector(`.vn[data-n="${L1.a}"] .vp[data-io="o"][data-p="${L1.ap}"]`);[pe,po].forEach(x=>x&&x.classList.add('born'))}
    if(!at)return;
    for(let i=0;i<2;i++){const r=BOX.ownerDocument.createElement('div');r.className='vring';r.style.left=at.x+'px';r.style.top=at.y+'px';r.style.animationDelay=(i*.12)+'s';wld.append(r);setTimeout(()=>r.remove(),900)}
  }));
}
function link(g,a,ap,b,bp){
  const na=g.nodes.find(q=>q.id===a),nb=g.nodes.find(q=>q.id===b);if(!na||!nb||a===b)return false;
  const ta=portTy(na,'o',ap),tb=portTy(nb,'i',bp);if(!ta||!tb)return false;
  if((ta==='flow')!==(tb==='flow')){toast(L10('흐름(▶) 포트는 흐름 포트끼리, 값 포트는 값 포트끼리 이어요'));return false}
  if(ta==='flow')g.links=g.links.filter(l=>!(l.a===a&&l.ap===ap));else g.links=g.links.filter(l=>!(l.b===b&&l.bp===bp));
  g.links.push({id:nid(),a,ap,b,bp});return true;
}
function delSel(){
  const g=curG();if(!g||!E.sel.size)return;
  edit(()=>{
    if(g.kind==='flow'){g.nodes=g.nodes.filter(n=>!E.sel.has(n.id));g.links=g.links.filter(l=>!E.sel.has(l.id)&&g.nodes.some(n=>n.id===l.a)&&g.nodes.some(n=>n.id===l.b))}
    else{const del=g.states.filter(s=>E.sel.has(s.id));if(del.length&&del.length>=g.states.length){toast(L10('상태 그래프에는 상태가 하나 이상 있어야 합니다'));return}
      g.states=g.states.filter(s=>!E.sel.has(s.id));g.trans=g.trans.filter(t=>!E.sel.has(t.id)&&g.states.some(s=>s.id===t.a)&&g.states.some(s=>s.id===t.b));if(!g.states.some(s=>s.id===g.start))g.start=g.states[0].id}
    E.sel.clear()});
}
function dupSel(){const g=curG();if(!g||!E.sel.size)return;
  edit(()=>{const map={},ns=new Set();
    if(g.kind==='flow'){g.nodes.filter(n=>E.sel.has(n.id)).forEach(n=>{const c=CLONE(n);c.id=nid();c.x+=30;c.y+=30;if(c.sub)reid(c.sub);map[n.id]=c.id;g.nodes.push(c);ns.add(c.id)});
      g.links.filter(l=>map[l.a]&&map[l.b]).forEach(l=>g.links.push({id:nid(),a:map[l.a],ap:l.ap,b:map[l.b],bp:l.bp}))}
    else g.states.filter(s=>E.sel.has(s.id)).forEach(s=>{const c=CLONE(s);c.id=nid();c.x+=30;c.y+=30;c.name=s.name+' 2';if(c.g)reid(c.g);g.states.push(c);ns.add(c.id)});
    E.sel=ns})}
/* 복제한 그래프 안의 id 새로 (디버그 표시가 섞이지 않게) */
function reid(g){const map={};g.id=nid();if(g.kind==='flow'){g.nodes.forEach(n=>{map[n.id]=n.id=nid();if(n.sub)reid(n.sub)});g.links.forEach(l=>{l.id=nid();l.a=map[l.a]||l.a;l.b=map[l.b]||l.b})}else{g.states.forEach(s=>{map[s.id]=s.id=nid();if(s.g)reid(s.g)});g.trans.forEach(t=>{t.id=nid();t.a=map[t.a]||t.a;t.b=map[t.b]||t.b});g.start=map[g.start]||g.start}}
function addState(kind,x,y){const g=curG();if(!g||g.kind!=='state')return;let s;edit(()=>{let nm=kind==='super'?L10('상위 상태'):L10('새 상태'),i=1;const b=nm;while(g.states.some(q=>q.name===nm))nm=b+' '+(++i);s=mkState(nm,x,y,kind);g.states.push(s);E.sel=new Set([s.id])});return s}
/* 노드 추가 팝업 (오른쪽 클릭 · 선을 빈 곳에 놓기) */
function addMenu(cx,cy,conn){
  const g=curG();if(!g)return;const at=toWorld(cx,cy);
  if(g.kind==='state'){showMenuAt(cx,cy,[{label:L10('＋ 스크립트 상태'),fn:()=>addState('flow',at.x,at.y)},{label:L10('＋ 상위 상태 (상태 그래프 품기)'),fn:()=>addState('super',at.x,at.y)},{sep:1},{label:L10('전체 보기'),fn:fit}]);return}
  const md=mode();
  const fits=t=>{const d=NT[t];if(d.only==='state'&&md!=='state')return false;if(d.only==='sub'&&md!=='sub')return false;if(!conn)return true;const want=conn.io==='o'?(d.ins||[]):(d.outs||[]);return want.some(p=>conn.ty==='flow'?p[2]==='flow':p[2]!=='flow')};
  const groups=[];CATS.forEach(([c,cn])=>{const L0=Object.keys(NT).filter(t=>NT[t].cat===c&&fits(t));if(L0.length)groups.push({c,name:L10(cn),items:L0.map(t=>({t,label:L10(NT[t].label),tip:NT[t].tip?L10(NT[t].tip):''}))})});
  hideMenu();catMenu(cx,cy,groups,t=>addNodeAt(t,at.x,at.y,conn));
}
/* 오른쪽 클릭 메뉴: 분류 목록 → 마우스를 올리거나 누르면 옆에 그 분류의 노드 목록 (메뉴 속 메뉴) · 맨 위 검색은 전체에서 바로 찾기
   키보드: ↑↓ 이동 · → 분류 열기 · ← 분류로 돌아가기 · Enter 고르기 · Esc 닫기 */
let CM=null;
function cmClose(){if(!CM)return;const c=CM;CM=null;c.el.remove();c.doc.removeEventListener('pointerdown',c.out,true);c.win.removeEventListener('blur',cmClose)}
function catMenu(cx,cy,groups,pick){
  cmClose();const doc=BOX.ownerDocument,win=doc.defaultView;
  const el=doc.createElement('div');el.className='vcm';
  el.innerHTML=`<div class="vcm1"><div class="vcmq"><input type="search" placeholder="${ex(L10('노드 검색'))}" autocomplete="off" spellcheck="false"></div><div class="vcml"></div></div><div class="vcm2" hidden></div>`;
  doc.body.append(el);
  const L1=el.querySelector('.vcml'),P2=el.querySelector('.vcm2'),q=el.querySelector('input');
  const item=(it,c)=>`<button type="button" class="vcmi" data-t="${it.t}" title="${ex(it.tip||'')}" style="--cc:${CATC[c]};--ch:${CATH[c]};--cd:${CATD[c]}"><span>${ex(it.label)}</span></button>`;
  let cur=-1;
  const cats=()=>{cur=-1;P2.hidden=true;L1.innerHTML=groups.map((g,i)=>`<button type="button" class="vcmc" data-g="${i}" style="--cc:${CATC[g.c]}"><i></i><span>${ex(g.name)}</span><small>${g.items.length}</small><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 2l3 3-3 3"/></svg></button>`).join('')};
  const place=()=>{const W=win.innerWidth,H=win.innerHeight,r=el.getBoundingClientRect();let x=cx,y=cy;if(x+r.width>W-6)x=Math.max(6,W-r.width-6);if(y+r.height>H-6)y=Math.max(6,H-r.height-6);el.style.left=x+'px';el.style.top=y+'px'};
  const openSub=i=>{const g=groups[i];if(!g)return;cur=i;L1.querySelectorAll('.vcmc').forEach(b=>b.classList.toggle('on',+b.dataset.g===i));
    P2.innerHTML=`<div class="vcmh" style="--cc:${CATC[g.c]}"><i></i>${ex(g.name)}</div>`+g.items.map(it=>item(it,g.c)).join('');P2.hidden=false;
    const row=L1.querySelector(`.vcmc[data-g="${i}"]`),er=el.getBoundingClientRect(),rr=row.getBoundingClientRect();
    /* 화면 오른쪽 끝이면 왼쪽으로 펼침 */
    el.classList.toggle('flip',er.right+P2.offsetWidth>win.innerWidth-6);
    let top=rr.top-er.top-4;const H=win.innerHeight;if(er.top+top+P2.offsetHeight>H-6)top=Math.max(-er.top+6,H-6-er.top-P2.offsetHeight);P2.style.marginTop=top+'px'};
  const search=()=>{const k=q.value.trim().toLowerCase();if(!k){cats();return}P2.hidden=true;cur=-1;
    const hits=[];groups.forEach(g=>g.items.forEach(it=>{if((it.label+' '+it.t+' '+(it.tip||'')).toLowerCase().includes(k))hits.push(item(it,g.c))}));
    L1.innerHTML=hits.join('')||`<p class="vcm0">${ex(L10('검색 결과가 없습니다'))}</p>`};
  cats();place();
  let hoverT=0;
  L1.addEventListener('pointerover',e=>{const b=e.target.closest('.vcmc');if(!b||+b.dataset.g===cur)return;clearTimeout(hoverT);hoverT=setTimeout(()=>openSub(+b.dataset.g),90)});
  el.addEventListener('click',e=>{const c=e.target.closest('.vcmc');if(c){clearTimeout(hoverT);openSub(+c.dataset.g);return}const b=e.target.closest('.vcmi');if(b){cmClose();pick(b.dataset.t)}});
  q.addEventListener('input',search);
  el.addEventListener('keydown',e=>{e.stopPropagation();const k=e.key;
    const vis=s=>[...el.querySelectorAll(s)].filter(b=>b.offsetParent);
    const ae=doc.activeElement;
    if(k==='Escape'){e.preventDefault();if(ae&&ae.classList.contains('vcmi')&&!P2.hidden&&!q.value){const c=L1.querySelector('.vcmc.on');if(c){c.focus();return}}cmClose();try{(VQ('#vsCv',BOX)||BOX).focus({preventScroll:true})}catch(_){}return}
    if(k==='Enter'){if(ae===q){e.preventDefault();const f=vis('.vcmi')[0];if(f)f.click();else{const c=vis('.vcmc')[0];if(c){openSub(+c.dataset.g);const i0=P2.querySelector('.vcmi');if(i0)i0.focus()}}}return}
    if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();const inSub=ae&&P2.contains(ae);const L0=inSub?vis('.vcm2 .vcmi'):vis('.vcml button');if(!L0.length)return;let i=L0.indexOf(ae);i=i<0?(k==='ArrowDown'?0:L0.length-1):Math.max(0,Math.min(L0.length-1,i+(k==='ArrowDown'?1:-1)));L0[i].focus();if(!inSub&&L0[i].classList.contains('vcmc'))openSub(+L0[i].dataset.g);return}
    if(k==='ArrowRight'&&ae&&ae.classList.contains('vcmc')){e.preventDefault();openSub(+ae.dataset.g);const i0=P2.querySelector('.vcmi');if(i0)i0.focus();return}
    if(k==='ArrowLeft'&&ae&&P2.contains(ae)){e.preventDefault();const c=L1.querySelector('.vcmc.on');if(c)c.focus();return}
  });
  const out=e=>{if(!el.contains(e.target))cmClose()};
  CM={el,doc,win,out};doc.addEventListener('pointerdown',out,true);win.addEventListener('blur',cmClose);
  setTimeout(()=>{try{q.focus({preventScroll:true})}catch(_){}},0);
}

/* 변수 고르기: 스크립트(그래프 · C#)별로 쓰는 변수를 모아 보여 줌 · 검색 · 새 변수 만들기 */
function varIndex(){
  const groups=[],root=rootG();
  const add=(map,scope,name,type)=>{if(!name)return;const k=scope+'|'+name;const it=map.get(k)||{scope,name,type:type||null,uses:0};it.uses++;if(type&&!it.type)it.type=type;map.set(k,it)};
  GL().forEach(G=>{const map=new Map();
    walkG(G,x=>{(x.vars||[]).forEach(v=>{add(map,'graph',v.name,v.type);map.get('graph|'+v.name).uses--;map.get('graph|'+v.name).decl=true});
      if(x.kind==='flow')x.nodes.forEach(n=>{if(/^var\./.test(n.t)&&n.v)add(map,n.v.scope||'graph',n.v.name)});else x.trans.forEach(t=>{if(t.c&&t.c.t==='var')add(map,t.c.scope||'graph',t.c.name)})});
    if(map.size)groups.push({kind:G.kind,title:G.name,cur:!!root&&G.id===root.id,items:[...map.values()]})});
  /* C# 스크립트: VisualScript.SetVariable / GetVariable("이름") */
  try{(SC()||[]).forEach(sc=>{const map=new Map(),re=/VisualScript\s*\.\s*(?:Set|Get)Variable\s*\(\s*"((?:[^"\\]|\\.)*)"/g;let m;while((m=re.exec(sc.code||'')))add(map,'object',m[1]);if(map.size)groups.push({kind:'cs',title:sc.name+'.cs',items:[...map.values()]})})}catch(e){}
  groups.sort((a,b)=>(b.cur?1:0)-(a.cur?1:0));
  groups.forEach(g=>g.items.sort((a,b)=>(a.decl?0:1)-(b.decl?0:1)||a.name.localeCompare(b.name)));
  return groups;
}
function varPicker(anchor,scope0,name0,pick){
  cmClose();const doc=BOX.ownerDocument,win=doc.defaultView;let scope=scope0||'graph';
  const el=doc.createElement('div');el.className='vcm vvm';
  el.innerHTML=`<div class="vvbox"><div class="vvtop"><input type="search" placeholder="${ex(L10('변수 이름 검색 · 새 이름 입력'))}" autocomplete="off" spellcheck="false" data-i18n-skip></div>
    <div class="vvsc" role="radiogroup" aria-label="${ex(L10('범위'))}">${SCOPES.map(sc=>`<button type="button" data-sc="${sc[0]}" style="--sc:${SCOPEC[sc[0]]}" title="${ex(L10({graph:'이 머신 안에서만',object:'같은 오브젝트의 모든 머신 · C#',scene:'이 씬의 모든 오브젝트',app:'씬이 바뀌어도 계속'}[sc[0]]))}">${ex(L10(sc[1]))}</button>`).join('')}</div>
    <div class="vvl"></div><div class="vvnew" hidden></div></div>`;
  doc.body.append(el);
  const q=el.querySelector('input'),list=el.querySelector('.vvl'),nw=el.querySelector('.vvnew');
  const all=varIndex();
  const syncSc=()=>el.querySelectorAll('[data-sc]').forEach(b=>b.classList.toggle('on',b.dataset.sc===scope));
  const draw=()=>{const k=q.value.trim().toLowerCase();let n0=0,exact=false;
    list.innerHTML=all.map(g=>{const its=g.items.filter(it=>!k||it.name.toLowerCase().includes(k));if(!its.length)return'';n0+=its.length;
      return`<div class="vvg"><div class="vvgh">${g.kind==='cs'?'<em>C#</em>':g.kind==='state'?IC.state:IC.flow}<span data-i18n-skip>${ex(g.title)}</span>${g.cur?`<small class="cur">${L10('지금 편집 중')}</small>`:''}<small>${its.length}</small></div>`+
        its.map(it=>{if(it.name===q.value.trim()&&it.scope===scope)exact=true;const on=it.name===name0&&it.scope===scope0;
          return`<button type="button" class="vvi${on?' on':''}" data-pn="${ex(it.name)}" data-ps="${it.scope}"><i style="--sc:${SCOPEC[it.scope]}">${ex(scopeName(it.scope))}</i><b data-i18n-skip>${ex(it.name)}</b>${it.type?`<small>${ex(L10(VTN[it.type]||it.type))}</small>`:''}${it.decl?`<small class="dc">${L10('선언')}</small>`:''}${it.uses>0?`<small>×${it.uses}</small>`:''}${on?'<span class="ck">✓</span>':''}</button>`}).join('')+'</div>'}).join('')||`<p class="vcm0">${ex(k?L10('맞는 변수가 없습니다'):L10('아직 쓰는 변수가 없습니다'))}</p>`;
    const typed=q.value.trim();nw.hidden=!typed||exact;
    if(typed&&!exact)nw.innerHTML=`<button type="button" class="vvadd" data-new="1">${IC.plus}<span>${L10('새 변수')}</span><i style="--sc:${SCOPEC[scope]}">${ex(scopeName(scope))}</i><b data-i18n-skip>${ex(typed)}</b><kbd>Enter</kbd></button>`};
  syncSc();draw();
  const ar=anchor.getBoundingClientRect(),r=el.getBoundingClientRect();
  let x=ar.left,y=ar.bottom+4;if(x+r.width>win.innerWidth-6)x=Math.max(6,win.innerWidth-r.width-6);if(y+r.height>win.innerHeight-6)y=Math.max(6,ar.top-r.height-4);
  el.style.left=x+'px';el.style.top=y+'px';
  const done=(sc,nm)=>{nm=String(nm||'').trim();if(!nm)return;cmClose();pick(sc,nm);try{(VQ('#vsCv',BOX)||BOX).focus({preventScroll:true})}catch(_){}};
  q.addEventListener('input',draw);
  el.addEventListener('click',e=>{const s0=e.target.closest('[data-sc]');if(s0){scope=s0.dataset.sc;syncSc();draw();q.focus();return}
    const it=e.target.closest('.vvi');if(it){done(it.dataset.ps,it.dataset.pn);return}
    if(e.target.closest('.vvadd'))done(scope,q.value)});
  el.addEventListener('keydown',e=>{e.stopPropagation();const ae=doc.activeElement;
    if(e.key==='Escape'){e.preventDefault();cmClose();try{anchor.focus()}catch(_){}return}
    if(e.key==='Enter'&&ae===q){e.preventDefault();const t=q.value.trim();if(!t){const f=list.querySelector('.vvi');if(f)f.click();return}const ex0=all.some(g=>g.items.some(it=>it.name===t&&it.scope===scope));if(ex0)done(scope,t);else{const f=[...list.querySelectorAll('.vvi')].find(b=>b.dataset.pn===t);done(f?f.dataset.ps:scope,t)}return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const L0=[...el.querySelectorAll('.vvi,.vvadd')].filter(b=>b.offsetParent);if(!L0.length)return;let i=L0.indexOf(ae);i=i<0?0:Math.max(0,Math.min(L0.length-1,i+(e.key==='ArrowDown'?1:-1)));L0[i].focus()}});
  const out=e=>{if(!el.contains(e.target)&&!anchor.contains(e.target))cmClose()};
  CM={el,doc,win,out};doc.addEventListener('pointerdown',out,true);win.addEventListener('blur',cmClose);
  setTimeout(()=>{try{q.focus({preventScroll:true})}catch(_){}},0);
}

/* 대상 고르기: 계층 구조와 같은 모양(씬 → 게임 오브젝트 폴더 · 부모/자식 → UI → 매니저)에서 바로 고름 */
function objPicker(anchor,spec,to0,name0,pick){
  cmClose();const doc=BOX.ownerDocument,win=doc.defaultView;spec=spec||{allow:['self','name'],kinds:['obj']};
  const allow=new Set(spec.allow),kinds=new Set(spec.kinds||['obj']);
  let tree=[];try{tree=spkTree()}catch(e){}
  const fold={};
  const el=doc.createElement('div');el.className='vcm vom';
  const SP=[['self','자신','target',EC.START,'이 스크립트가 붙은 오브젝트'],['hero','주인공','user','#4cd98a','플레이어가 움직이는 주인공'],['all','씬 전체','scene',EC.HARDWARE,'씬의 모든 오브젝트 · UI · 매니저']].filter(x=>allow.has(x[0]));
  el.innerHTML=`<div class="vobox"><div class="vvtop"><input type="search" placeholder="${ex(L10('오브젝트 이름 검색'))}" autocomplete="off" spellcheck="false"></div>
    <div class="vosp">${SP.map(x=>`<button type="button" class="vos${to0===x[0]?' on':''}" data-to="${x[0]}" title="${ex(L10(x[4]))}" style="--oc:${x[3]}"><span class="vtpi">${x[2]==='target'?IC.target:ico(x[2])}</span>${ex(L10(x[1]))}</button>`).join('')}</div>
    ${allow.has('name')?`<div class="votree" role="tree"></div>`:''}<div class="vofoot"></div></div>`;
  doc.body.append(el);
  const q=el.querySelector('input'),T=el.querySelector('.votree'),foot=el.querySelector('.vofoot');
  const pickable=nd=>nd.o&&kinds.has(nd.kind);
  const match=(nd,k)=>!k||String(nd.label||'').toLowerCase().includes(k)||(nd.kids||[]).some(c=>match(c,k));
  const rows=(L0,d,k)=>L0.filter(nd=>match(nd,k)).map(nd=>{const key=nd.key||nd.id,kids=(nd.kids||[]).filter(c=>match(c,k)),open=k?true:!fold[key];
      const can=pickable(nd),on=to0==='name'&&nd.o&&nd.o.name===name0;
      const hit=!!k&&String(nd.label||'').toLowerCase().includes(k);
      const row=`<div class="vor${nd.o?'':' fol'}${can?'':' no'}${on?' on':''}${nd.off?' off':''}${hit?' hit':''}" style="--d:${d}"${can?` data-pk="${ex(nd.o.name)}" tabindex="0" role="treeitem"`:''}>${kids.length?`<button type="button" class="vof${open?' open':''}" data-fk="${ex(key)}" aria-label="${ex(L10('펼치기/접기'))}"><svg viewBox="0 0 10 10"><path d="M3.5 2l3 3-3 3"/></svg></button>`:'<span class="vof sp"></span>'}<span class="vtpi" style="--oc:${nd.color||'var(--mute)'}">${ico(nd.icon||'cube')}</span><b data-i18n-skip>${ex(nd.label)}</b>${nd.kind==='scene'?`<small>${L10('지금 씬')}</small>`:nd.sub?`<small>${ex(L10(nd.sub))}</small>`:''}${on?'<span class="ck">✓</span>':''}</div>`;
      return row+(kids.length&&open?rows(kids,d+1,k):'')}).join('');
  const draw=()=>{if(!T)return;const k=q.value.trim().toLowerCase();const h=rows(tree,0,k);T.innerHTML=h||`<p class="vcm0">${ex(L10('맞는 오브젝트가 없습니다'))}</p>`;
    foot.textContent=kinds.has('ui')||kinds.has('mgr')?L10('흐린 줄은 이 노드에서 고를 수 없어요'):L10('위치가 있는 게임 오브젝트만 고를 수 있어요')};
  draw();
  const ar=anchor.getBoundingClientRect(),r=el.getBoundingClientRect();
  let x=ar.left,y=ar.bottom+4;if(x+r.width>win.innerWidth-6)x=Math.max(6,win.innerWidth-r.width-6);if(y+r.height>win.innerHeight-6)y=Math.max(6,ar.top-r.height-4);
  el.style.left=x+'px';el.style.top=y+'px';
  const done=(to,nm)=>{cmClose();pick(to,nm||'');try{(VQ('#vsCv',BOX)||BOX).focus({preventScroll:true})}catch(_){}};
  q.addEventListener('input',draw);
  el.addEventListener('click',e=>{const f=e.target.closest('[data-fk]');if(f){const k0=f.dataset.fk;fold[k0]=!fold[k0];draw();return}
    const s0=e.target.closest('[data-to]');if(s0){done(s0.dataset.to,'');return}
    const rw=e.target.closest('[data-pk]');if(rw)done('name',rw.dataset.pk)});
  el.addEventListener('keydown',e=>{e.stopPropagation();const ae=doc.activeElement;
    if(e.key==='Escape'){e.preventDefault();cmClose();try{anchor.focus()}catch(_){}return}
    if(e.key==='Enter'){e.preventDefault();if(ae&&ae.dataset&&ae.dataset.pk){done('name',ae.dataset.pk);return}if(ae===q){const f=el.querySelector('.vor.hit[data-pk]')||el.querySelector('[data-pk]');if(f)done('name',f.dataset.pk)}return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const L0=[...el.querySelectorAll('.vos,[data-pk]')];if(!L0.length)return;let i=L0.indexOf(ae);i=i<0?0:Math.max(0,Math.min(L0.length-1,i+(e.key==='ArrowDown'?1:-1)));L0[i].focus()}});
  const out=e=>{if(!el.contains(e.target)&&!anchor.contains(e.target))cmClose()};
  CM={el,doc,win,out};doc.addEventListener('pointerdown',out,true);win.addEventListener('blur',cmClose);
  setTimeout(()=>{try{q.focus({preventScroll:true});const on=el.querySelector('.vor.on');if(on)on.scrollIntoView({block:'nearest'})}catch(_){}},0);
}

/* ---- 포인터 ---- */
let PD=null;
BOX.addEventListener('pointerdown',e=>{
  const sp=e.target.closest&&e.target.closest('.vgrip');
  if(sp&&e.button===0){e.preventDefault();const k=sp.dataset.split,mn=sp.parentElement,x0=e.clientX,w0=k==='lib'?UI.libW:UI.sideW;
    /* 좌우를 바꿨으면 끄는 방향도 반대 */
    const sign=(k==='lib'?1:-1)*(UI.flip?-1:1);sp.classList.add('on');sp.setPointerCapture(e.pointerId);
    const mv=ev=>{const w=Math.round(w0+(ev.clientX-x0)*sign);if(k==='lib'){UI.libW=Math.max(140,Math.min(460,w));mn.style.setProperty('--libw',UI.libW+'px')}else{UI.sideW=Math.max(180,Math.min(520,w));mn.style.setProperty('--sidew',UI.sideW+'px')}drawLinks()};
    const up=()=>{sp.classList.remove('on');sp.removeEventListener('pointermove',mv);sp.removeEventListener('pointerup',up);sp.removeEventListener('pointercancel',up);saveUI()};
    sp.addEventListener('pointermove',mv);sp.addEventListener('pointerup',up);sp.addEventListener('pointercancel',up);return}
  const cv=e.target.closest&&e.target.closest('#vsCv');if(!cv)return;
  if(e.target.closest('input,select,textarea,button:not(.vsto)'))return;
  const g=curG();if(!g)return;
  try{cv.focus({preventScroll:true})}catch(_){}
  const v=vw();
  if(e.button===1||(e.button===0&&e.altKey)){PD={k:'pan',x:e.clientX,y:e.clientY,vx:v.x,vy:v.y};cv.setPointerCapture(e.pointerId);e.preventDefault();return}
  if(e.button!==0)return;
  /* 포트 → 선 */
  const pt=e.target.closest('.vp');
  if(pt&&g.kind==='flow'&&(e.target.closest('.vpd')||e.target.tagName==='B')){
    const nEl=pt.closest('.vn'),n=g.nodes.find(q=>q.id===nEl.dataset.n),io=pt.dataset.io,k=pt.dataset.p,ty=portTy(n,io,k);
    if(e.ctrlKey||e.metaKey){edit(()=>{g.links=g.links.filter(l=>!(io==='o'?l.a===n.id&&l.ap===k:l.b===n.id&&l.bp===k))});return}
    /* 입력 포트에서 끌면: 이미 이어진 선을 떼어 다시 잇기 */
    if(io==='i'){const ex0=g.links.find(l=>l.b===n.id&&l.bp===k);if(ex0&&ty!=='flow'){const src=g.nodes.find(q=>q.id===ex0.a);edit(()=>{g.links=g.links.filter(l=>l!==ex0)},true);render();E.wire={n:src.id,k:ex0.ap,io:'o',ty,a:portXY(src.id,'o',ex0.ap),b:toWorld(e.clientX,e.clientY)};PD={k:'wire'};BOX.setPointerCapture(e.pointerId);drawLinks();e.preventDefault();return}}
    E.wire={n:n.id,k,io,ty,rev:io==='i',a:portXY(n.id,io,k),b:toWorld(e.clientX,e.clientY)};PD={k:'wire'};BOX.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  /* 상태 → 전환 화살표 */
  const tro=e.target.closest('.vsto');
  if(tro&&g.kind==='state'){const s=g.states.find(q=>q.id===tro.dataset.tr);const el=tro.closest('.vs-st');E.wire={st:s.id,ty:'flow',a:{x:s.x+el.offsetWidth/2,y:s.y+el.offsetHeight/2},b:toWorld(e.clientX,e.clientY)};PD={k:'swire'};BOX.setPointerCapture(e.pointerId);e.preventDefault();return}
  /* 노드 · 상태 끌기 */
  const it=e.target.closest('.vn,.vs-st');
  if(it){const id=it.dataset.n||it.dataset.st;
    if(e.shiftKey||e.ctrlKey||e.metaKey){if(E.sel.has(id))E.sel.delete(id);else E.sel.add(id)}else if(!E.sel.has(id))E.sel=new Set([id]);
    syncSel();
    const list=(g.kind==='flow'?g.nodes:g.states).filter(q=>E.sel.has(q.id));
    PD={k:'move',x:e.clientX,y:e.clientY,orig:list.map(q=>({q,x:q.x,y:q.y})),before:snapG(),moved:false};cv.setPointerCapture(e.pointerId);e.preventDefault();return}
  /* 선 고르기 */
  const lh=e.target.closest('.vlhit,.vtl');
  if(lh){const id=lh.dataset.l||lh.dataset.tl;E.sel=new Set([id]);syncSel();drawLinks();renderSide();return}
  /* 빈 곳: Shift = 상자 선택, 아니면 화면 이동 */
  if(e.shiftKey){const p=toWorld(e.clientX,e.clientY);PD={k:'box',a:p,x:e.clientX,y:e.clientY};const bx=document.createElement('div');bx.className='vbox';cv.append(bx);PD.el=bx;cv.setPointerCapture(e.pointerId);return}
  PD={k:'pan',x:e.clientX,y:e.clientY,vx:v.x,vy:v.y,click:true};cv.setPointerCapture(e.pointerId);
});
BOX.addEventListener('pointermove',e=>{
  if(!PD)return;const v=vw();
  if(PD.k==='pan'){const dx=e.clientX-PD.x,dy=e.clientY-PD.y;if(Math.abs(dx)+Math.abs(dy)>3)PD.click=false;v.x=PD.vx+dx;v.y=PD.vy+dy;applyView();return}
  if(PD.k==='move'){const dx=(e.clientX-PD.x)/v.z,dy=(e.clientY-PD.y)/v.z;if(Math.abs(dx)+Math.abs(dy)>1)PD.moved=true;
    PD.orig.forEach(o=>{o.q.x=Math.round((o.x+dx)/8)*8;o.q.y=Math.round((o.y+dy)/8)*8;const el=BOX.querySelector(`[data-n="${o.q.id}"].vn,[data-st="${o.q.id}"].vs-st`);if(el){el.style.left=o.q.x+'px';el.style.top=o.q.y+'px'}});drawLinks();return}
  if(PD.k==='wire'){const w=E.wire;w.b=toWorld(e.clientX,e.clientY);
    /* 자석: 가까운(화면 34px 안) 맞는 포트에 선 끝이 착 붙음 — 진짜 연결은 버튼을 뗄 때 */
    const sn=magnetOn()?nearPort(e.clientX,e.clientY,w):null;
    if(sn){const q=portXY(sn.n,sn.io,sn.k);if(q)w.b=q}
    const key=sn?sn.n+'|'+sn.k:null;
    if(key!==w.snapKey){VQA('.vp.mag',BOX).forEach(x=>x.classList.remove('mag'));if(sn){sn.el.classList.add('mag')}w.snapKey=key}
    w.snap=sn;
    VQA('.vp.can',BOX).forEach(x=>x.classList.remove('can'));
    if(!sn){const t=BOX.ownerDocument.elementFromPoint(e.clientX,e.clientY),pp=t&&t.closest&&t.closest('.vp');if(pp&&pp.dataset.io!==w.io)pp.classList.add('can')}
    drawLinks();return}
  if(PD.k==='swire'){E.wire.b=toWorld(e.clientX,e.clientY);
    VQA('.vp.can',BOX).forEach(x=>x.classList.remove('can'));const t=BOX.ownerDocument.elementFromPoint(e.clientX,e.clientY),pp=t&&t.closest&&t.closest('.vp');if(pp&&pp.dataset.io!==E.wire.io)pp.classList.add('can');
    VQA('.vs-st.can',BOX).forEach(x=>x.classList.remove('can'));const ss=t&&t.closest&&t.closest('.vs-st');if(ss&&PD.k==='swire')ss.classList.add('can');
    drawLinks();return}
  if(PD.k==='box'){const cv=VQ('#vsCv',BOX),r=cv.getBoundingClientRect();const x0=Math.min(PD.x,e.clientX)-r.left,y0=Math.min(PD.y,e.clientY)-r.top;Object.assign(PD.el.style,{left:x0+'px',top:y0+'px',width:Math.abs(e.clientX-PD.x)+'px',height:Math.abs(e.clientY-PD.y)+'px'});PD.b=toWorld(e.clientX,e.clientY)}
});
function endPD(e){
  if(!PD)return;const g=curG(),k=PD.k,pd=PD;PD=null;
  if(k==='pan'){if(pd.click&&E.sel.size){E.sel.clear();syncSel();drawLinks();renderSide()}return}
  if(k==='move'){if(pd.moved){const after=snapG();if(after!==pd.before){E.undo.push({gid:E.gid,s:pd.before});E.redo=[];bump();markDirty()}}renderSide();return}
  if(k==='box'){pd.el.remove();if(!pd.b)return;const x0=Math.min(pd.a.x,pd.b.x),x1=Math.max(pd.a.x,pd.b.x),y0=Math.min(pd.a.y,pd.b.y),y1=Math.max(pd.a.y,pd.b.y);
    (g.kind==='flow'?g.nodes:g.states).forEach(q=>{if(q.x>=x0&&q.x<=x1&&q.y>=y0&&q.y<=y1)E.sel.add(q.id)});render();return}
  if(k==='wire'){const w=E.wire;E.wire=null;VQA('.vp.can,.vp.mag',BOX).forEach(x=>x.classList.remove('can','mag'));
    const t=e&&BOX.ownerDocument.elementFromPoint(e.clientX,e.clientY);let pp=t&&t.closest&&t.closest('.vp');
    let n2=null,k2=null;
    if(w.snap){n2=w.snap.n;k2=w.snap.k}else if(pp&&pp.dataset.io!==w.io){n2=pp.closest('.vn').dataset.n;k2=pp.dataset.p}
    if(n2){let ok=false;edit(()=>{ok=w.io==='o'?link(g,w.n,w.k,n2,k2):link(g,n2,k2,w.n,w.k)});if(ok){const L1=g.links[g.links.length-1];bornFx(L1)}return}
    if(t&&t.closest&&t.closest('#vsCv')&&!pp&&e){drawLinks();addMenu(e.clientX,e.clientY,{n:w.n,k:w.k,io:w.io,ty:w.ty});return}
    drawLinks();return}
  if(k==='swire'){const w=E.wire;E.wire=null;VQA('.vs-st.can',BOX).forEach(x=>x.classList.remove('can'));const t=e&&BOX.ownerDocument.elementFromPoint(e.clientX,e.clientY),ss=t&&t.closest&&t.closest('.vs-st');
    if(ss&&ss.dataset.st!==w.st){const b=ss.dataset.st;if(g.trans.some(q=>q.a===w.st&&q.b===b)){toast(L10('이미 같은 방향 전환이 있습니다'));drawLinks();return}let tr;edit(()=>{tr={id:nid(),a:w.st,b,c:{t:'event',name:L10('이벤트')}};g.trans.push(tr);E.sel=new Set([tr.id]);E.side=true});bornFx(tr,true);return}
    if(t&&t.closest&&t.closest('#vsCv')&&!ss&&e){const at=toWorld(e.clientX,e.clientY);const s=addState('flow',at.x-60,at.y-30);if(s){edit(()=>{const tr={id:nid(),a:w.st,b:s.id,c:{t:'event',name:L10('이벤트')}};g.trans.push(tr);E.sel=new Set([tr.id])})}return}
    drawLinks();return}
}
BOX.addEventListener('pointerup',endPD);BOX.addEventListener('pointercancel',()=>{if(PD&&PD.el)PD.el.remove();PD=null;E.wire=null;drawLinks()});
function renderSide(){const sd=VQ('.vside',BOX),g=curG();if(sd&&g)sd.innerHTML=sideHtml(g,E.path.length?[]:usersOf(E.gid))}
function syncSel(){VQA('.vn,.vs-st',BOX).forEach(el=>el.classList.toggle('sel',E.sel.has(el.dataset.n||el.dataset.st)))}
BOX.addEventListener('wheel',e=>{const cv=e.target.closest&&e.target.closest('#vsCv');if(!cv||e.target.closest('select'))return;e.preventDefault();const v=vw(),r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  if(!e.ctrlKey&&Math.abs(e.deltaX)>Math.abs(e.deltaY)){v.x-=e.deltaX;applyView();return}
  const z=Math.max(.25,Math.min(2,v.z*Math.exp(-e.deltaY*.0015)));v.x=mx-(mx-v.x)*z/v.z;v.y=my-(my-v.y)*z/v.z;v.z=z;applyView()},{passive:false});
BOX.addEventListener('contextmenu',e=>{const cv=e.target.closest&&e.target.closest('#vsCv');if(!cv||e.target.closest('input,select'))return;e.preventDefault();
  const it=e.target.closest('.vn,.vs-st');const g=curG();
  /* 선 · 전환 화살표 오른쪽 클릭: 삭제 */
  const lh=e.target.closest('.vlhit,.vtl');
  if(lh&&g){const id=lh.dataset.l||lh.dataset.tl;E.sel=new Set([id]);syncSel();drawLinks();renderSide();
    const isTr=g.kind==='state',items=[];
    if(isTr){const tr=g.trans.find(t=>t.id===id);if(!tr)return;const A=g.states.find(q=>q.id===tr.a),B=g.states.find(q=>q.id===tr.b);
      items.push({head:(A?A.name:'?')+' → '+(B?B.name:'?'),sub:condText(tr.c||{})},{label:L10('조건 바꾸기'),fn:()=>{E.side=true;render()}},{label:L10('방향 뒤집기'),disabled:g.trans.some(q=>q.a===tr.b&&q.b===tr.a),fn:()=>edit(()=>{const x=tr.a;tr.a=tr.b;tr.b=x})},{sep:1},{label:L10('전환 삭제'),fn:delSel})}
    else{const l=g.links.find(q=>q.id===id);if(!l)return;const A=g.nodes.find(q=>q.id===l.a),B=g.nodes.find(q=>q.id===l.b);
      items.push({head:L10(A?nodeLabel(A):'?')+' → '+L10(B?nodeLabel(B):'?')},{label:L10('선 삭제'),fn:delSel})}
    showMenuAt(e.clientX,e.clientY,items);return}
  if(it&&g){const id=it.dataset.n||it.dataset.st;if(!E.sel.has(id)){E.sel=new Set([id]);render()}
    const st=g.kind==='state'&&g.states.find(s=>s.id===id),n=g.kind==='flow'&&g.nodes.find(q=>q.id===id);
    const items=[];if(st)items.push({label:L10('안으로 들어가기'),fn:()=>enterInto({t:'state',id})},{label:L10('시작 상태로'),disabled:g.start===id,fn:()=>edit(()=>{g.start=id})},{label:st.kind==='super'?L10('스크립트 상태로 바꾸기'):L10('상위 상태로 바꾸기'),fn:()=>setKind(st,st.kind==='super'?'flow':'super')},{sep:1});
    if(n&&n.sub)items.push({label:L10('안으로 들어가기'),fn:()=>enterInto({t:'node',id})},{sep:1});
    items.push({label:L10('복제'),fn:dupSel},{label:L10('삭제'),fn:delSel});showMenuAt(e.clientX,e.clientY,items);return}
  addMenu(e.clientX,e.clientY,null)});
BOX.addEventListener('dblclick',e=>{
  const sp=e.target.closest&&e.target.closest('.vgrip');if(sp){if(sp.dataset.split==='lib')UI.libW=UI0.libW;else UI.sideW=UI0.sideW;saveUI();render();return}
  /* 포인터 캡처 때문에 e.target이 캔버스로 바뀌므로 실제로 누른 곳을 다시 찾음 */
  const tg=BOX.ownerDocument.elementFromPoint(e.clientX,e.clientY)||e.target;
  const g=curG();if(!g||tg.closest('input,select,button'))return;
  const st=tg.closest('.vs-st');if(st&&g.kind==='state'){enterInto({t:'state',id:st.dataset.st});return}
  const n=tg.closest('.vn');if(n&&g.kind==='flow'){const q=g.nodes.find(x=>x.id===n.dataset.n);if(q&&q.sub){enterInto({t:'node',id:q.id});return}}
  if(tg.closest('#vsCv')&&!tg.closest('.vtl')&&!n&&!st&&g.kind==='state'){const at=toWorld(e.clientX,e.clientY);addState('flow',at.x-60,at.y-30)}
});
/* 라이브러리 끌어다 놓기 */
BOX.addEventListener('dragstart',e=>{const b=e.target.closest&&e.target.closest('[data-add]');if(!b)return;e.dataTransfer.setData('text/x-vs-node',b.dataset.add);e.dataTransfer.effectAllowed='copy'});
BOX.addEventListener('dragover',e=>{if(e.target.closest&&e.target.closest('#vsCv')&&[...e.dataTransfer.types].includes('text/x-vs-node')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
BOX.addEventListener('drop',e=>{const t=e.dataTransfer.getData('text/x-vs-node');if(!t||!NT[t])return;e.preventDefault();const p=toWorld(e.clientX,e.clientY);addNodeAt(t,p.x-80,p.y-16)});
function setKind(st,k){if(st.kind===k)return;const has=st.g&&((st.g.nodes||[]).length>3||(st.g.states||[]).length>1);
  const go=()=>edit(()=>{st.kind=k;st.g=k==='super'?newState():newFlow('state')});
  if(has)openModal(L10('상태 종류 바꾸기'),`<p style="margin:0">${ex(L10('「{s}」 안의 그래프가 새 그래프로 바뀝니다. 계속할까요?',{s:st.name}))}</p>`,[{t:L10('취소')},{t:L10('바꾸기'),cls:'danger',fn:go}]);else go()}

/* ---- 클릭 · 입력 ---- */
BOX.addEventListener('click',e=>{
  const t=e.target;const g=curG();
  const q=s=>t.closest&&t.closest(s);
  if(q('[data-new]')){const k=q('[data-new]').dataset.new;const ng=newAsset(k);E.gid=ng.id;E.path=[];E.sel.clear();render();requestAnimationFrame(fitIfNew);return}
  if(q('#vsPick')){pickMenu(q('#vsPick'));return}
  if(q('#vsUp')){goDepth(E.path.length-1);requestAnimationFrame(fitIfNew);return}
  const cb=q('.vcb');if(cb){goDepth(+cb.dataset.depth);return}
  if(q('#vsFit')){fit();return}
  if(q('#vsLibT')){E.lib=!E.lib;render();return}
  if(q('#vsSideT')){E.side=!E.side;render();return}
  if(q('#vsFlip')){UI.flip=!UI.flip;saveUI();render();return}
  if(q('#vsMore')){moreMenu(q('#vsMore'));return}
  if(q('#vsAttach')){const o=ownerNow();if(o)attach(o,E.gid);return}
  const tp=q('[data-tpick]');if(tp&&g){const n=g.nodes.find(x=>x.id===tp.dataset.tpick);const fd=n&&(def(n).f||[]).find(f=>f[0]===tp.dataset.tk);if(n&&fd){const nk=fd[5];objPicker(tp,fd[4],n.v[fd[0]]||fd[3],n.v[nk]||'',(to,nm)=>edit(()=>{n.v[fd[0]]=to;n.v[nk]=to==='name'?nm:''}))}return}
  const tt=q('[data-tpickt]');if(tt&&g){const tr=g.trans.find(x=>x.id===tt.dataset.tpickt);if(tr){tr.c=tr.c||{};objPicker(tt,{allow:['hero','name'],kinds:['obj']},tr.c.to||'hero',tr.c.tname||'',(to,nm)=>edit(()=>{tr.c.to=to;tr.c.tname=to==='name'?nm:''}))}return}
  const vp=q('[data-vpick]');if(vp&&g){const n=g.nodes.find(x=>x.id===vp.dataset.vpick);if(n)varPicker(vp,n.v.scope||'graph',n.v.name||'',(sc,nm)=>{edit(()=>{n.v.scope=sc;n.v.name=nm})});return}
  const vt=q('[data-vpickt]');if(vt&&g){const tr=g.trans.find(x=>x.id===vt.dataset.vpickt);if(tr){tr.c=tr.c||{};varPicker(vt,tr.c.scope||'graph',tr.c.name||'',(sc,nm)=>{edit(()=>{tr.c.scope=sc;tr.c.name=nm})})}return}
  const en=q('[data-enter]');if(en){enterInto({t:'node',id:en.dataset.enter});return}
  const es=q('[data-enterst]');if(es){enterInto({t:'state',id:es.dataset.enterst});return}
  const ad=q('[data-add]');if(ad){const cv=VQ('#vsCv',BOX),r=cv.getBoundingClientRect();const p=toWorld(r.left+r.width/2,r.top+r.height/2);const n=addNodeAt(ad.dataset.add,p.x-80+Math.random()*40,p.y-30+Math.random()*40);return}
  const as=q('[data-addst]');if(as){const cv=VQ('#vsCv',BOX),r=cv.getBoundingClientRect();const p=toWorld(r.left+r.width/2,r.top+r.height/2);addState(as.dataset.addst,p.x-70,p.y-30);return}
  const fo=q('[data-vfold]');if(fo){const c=fo.dataset.vfold,open=!E.libOpen[c];
    /* 한 번에 한 분류만 펼침 (아코디언) */
    E.libOpen=open?{[c]:true}:{};
    VQA('.vlib .vlc',BOX).forEach(x=>{const b=x.querySelector('[data-vfold]'),on=!!E.libOpen[b.dataset.vfold];x.classList.toggle('vshut',!on);b.setAttribute('aria-expanded',String(on))});
    if(open){const lc=fo.parentElement;requestAnimationFrame(()=>{try{lc.scrollIntoView({block:'nearest'})}catch(_){}})}
    return}
  const tl=q('.vtr,.vtl');if(tl){E.sel=new Set([tl.dataset.tl]);E.side=true;render();return}
  if(q('#vsDel')){delSel();return}
  if(q('#vsDup')){dupSel();return}
  if(q('#vsStart')&&g){const id=[...E.sel][0];edit(()=>{g.start=id});return}
  if(q('#vsVarAdd')&&g){edit(()=>{const vs=g.vars||(g.vars=[]);let nm=L10('변수'),i=1;while(vs.some(v=>v.name===nm))nm=L10('변수')+(++i);vs.push({name:nm,type:'num',def:0})});return}
  const vx=q('[data-vx]');if(vx&&g){edit(()=>{g.vars.splice(+vx.dataset.vx,1)});return}
  const us=q('[data-user]');if(us){gotoUser(us.dataset.user,us.dataset.scene);return}
});
BOX.addEventListener('input',e=>{
  const t=e.target,g=curG();if(!g)return;
  if(t.id==='vsLibQ'){E.libQ=t.value;const lib=VQ('.vlib',BOX);if(lib){const pos=t.selectionStart;lib.innerHTML=libHtml(g);const i=VQ('#vsLibQ',BOX);i.focus();try{i.setSelectionRange(pos,pos)}catch(_){}}return}
  if(t.id==='vsName'){const r=rootG();if(r){r.name=t.value.slice(0,40)||r.name;bump();markDirty();const pk=VQ('#vsPick span',BOX);if(pk)pk.textContent=r.name;renderInspSafe()}return}
  if(t.id==='vsNodeName'){const n=g.nodes.find(q=>q.id===[...E.sel][0]);if(n){n.name=t.value.slice(0,40);markDirty();const h=BOX.querySelector(`.vn[data-n="${n.id}"] .vnh span`);if(h)h.textContent=n.name||def(n).label}return}
  if(t.id==='vsStName'){const s=g.states.find(q=>q.id===[...E.sel][0]);if(s){s.name=t.value.slice(0,30)||s.name;markDirty();bump();const h=BOX.querySelector(`.vs-st[data-st="${s.id}"] .vsth b`);if(h)h.textContent=s.name}return}
  const nEl=t.closest&&t.closest('.vn');
  if(nEl&&(t.dataset.f||t.dataset.v)){const n=g.nodes.find(q=>q.id===nEl.dataset.n);if(!n)return;const k=t.dataset.f||t.dataset.v;n.v=n.v||{};
    const v=t.type==='checkbox'?t.checked:t.type==='number'?(t.value===''?0:parseFloat(t.value)):t.value;n.v[k]=v;markDirty();bump();
    if(t.tagName==='SELECT'||t.type==='checkbox'){const ps=snapG();render()}else{const h=nEl.querySelector('.vnh span');if(h&&n.t!=='sub'&&n.t!=='smu')h.textContent=L10(nodeLabel(n))}
    return}
  if(t.dataset.c){const tr=g.trans.find(q=>q.id===[...E.sel][0]);if(!tr)return;tr.c=tr.c||{};const k=t.dataset.c;tr.c[k]=t.type==='number'?parseFloat(t.value)||0:t.value;markDirty();bump();
    if(k==='t'){const keep={t:tr.c.t};if(keep.t==='event')keep.name=L10('이벤트');if(keep.t==='time')keep.sec=1;if(keep.t==='key')keep.key='Space';if(keep.t==='var'){keep.scope='graph';keep.name='';keep.op='==';keep.val=''}if(keep.t==='dist'){keep.op='<';keep.val=2}tr.c=keep;render()}
    else{const lb=BOX.querySelector(`.vtl[data-tl="${tr.id}"]`);if(lb)lb.textContent=condText(tr.c);drawLinks()}return}
  const vn=t.dataset.vn,vt=t.dataset.vt,vd=t.dataset.vd;
  if(vn!=null){g.vars[+vn].name=t.value;markDirty();bump();return}
  if(vt!=null){const v=g.vars[+vt];v.type=t.value;v.def=conv(v.def,v.type);markDirty();render();return}
  if(vd!=null){const v=g.vars[+vd];v.def=t.type==='checkbox'?t.checked:conv(t.value,v.type);markDirty();return}
});
BOX.addEventListener('change',e=>{const t=e.target;
  if(t.id==='vsDbg'){E.dbg=t.value;render();return}
  if(t.id==='vsStKind'){const g=curG(),s=g&&g.states.find(q=>q.id===[...E.sel][0]);if(s)setKind(s,t.value);return}
  if(t.id==='vsLibQ')return;
  /* 입력 끝 = 실행 취소 한 단계 */
  if(preEdit&&preEdit!==snapG()){E.undo.push({gid:E.gid,s:preEdit});if(E.undo.length>80)E.undo.shift();E.redo=[]}preEdit=snapG();
  if(t.id==='vsStName'||t.id==='vsName'||t.dataset.vn!=null)render()
});
BOX.addEventListener('focusin',()=>{E.focus=true});
document.addEventListener('pointerdown',e=>{if(!BOX.contains(e.target))E.focus=false},true);
BOX.addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('input,select'))preEdit=snapG()});
BOX.addEventListener('keydown',e=>{
  const t=e.target,typing=/INPUT|TEXTAREA|SELECT/.test(t.tagName)&&t.type!=='checkbox';
  const ctrl=e.ctrlKey||e.metaKey,k=e.key;
  if(typing){if(k==='Escape'||k==='Enter'&&t.tagName==='INPUT'&&t.type!=='search'){t.blur()}e.stopPropagation();return}
  let done=true;
  if((k==='Delete'||k==='Backspace')&&E.sel.size)delSel();
  else if(k==='Backspace'&&E.path.length)goDepth(E.path.length-1);
  else if(ctrl&&(k==='z'||k==='Z')&&!e.shiftKey)doUndo();
  else if(ctrl&&(k==='y'||k==='Y'||((k==='z'||k==='Z')&&e.shiftKey)))doRedo();
  else if(ctrl&&(k==='d'||k==='D'))dupSel();
  else if(ctrl&&(k==='a'||k==='A')){const g=curG();if(g){E.sel=new Set((g.kind==='flow'?g.nodes:g.states).map(q=>q.id));syncSel()}}
  else if(!ctrl&&(k==='f'||k==='F'))fit();
  else if(k==='Escape'){if(E.sel.size){E.sel.clear();render()}else if(E.path.length)goDepth(E.path.length-1)}
  else if(k===' '&&!ctrl){const r=VQ('#vsCv',BOX).getBoundingClientRect();addMenu(r.left+r.width/2,r.top+r.height/2,null)}
  else done=false;
  if(done)e.preventDefault();
  /* 창 안에서 누른 키는 씬 도구 단축키로 새지 않게 (Ctrl+S 저장 · 플레이 단축키는 그대로) */
  if(done||(!ctrl&&!e.altKey&&k.length===1))e.stopPropagation();
});
function renderInspSafe(){try{renderInsp()}catch(e){}}
function pickMenu(btn){
  const gl=GL();const items=[{head:L10('그래프')}];
  gl.forEach(g=>items.push({label:(g.kind==='state'?'◆ ':'◇ ')+g.name,checked:g.id===E.gid,fn:()=>{E.gid=g.id;E.path=[];E.sel.clear();render();requestAnimationFrame(fitIfNew)}}));
  if(!gl.length)items.push({label:L10('아직 그래프가 없습니다'),disabled:true});
  items.push({sep:1},{label:L10('＋ 새 스크립트 그래프 (시작 · 업데이트)'),fn:()=>{const g=newAsset('flow');E.gid=g.id;E.path=[];render();requestAnimationFrame(fitIfNew)}},{label:L10('＋ 새 상태 그래프 (상태 머신)'),fn:()=>{const g=newAsset('state');E.gid=g.id;E.path=[];render();requestAnimationFrame(fitIfNew)}});
  showMenu(btn,items,false,gl.length>6?{search:L10('그래프 검색')}:undefined);
}
function moreMenu(btn){const r=rootG();showMenu(btn,[
  {label:L10('실행 취소 (Ctrl+Z)'),disabled:!E.undo.length,fn:doUndo},{label:L10('다시 실행 (Ctrl+Y)'),disabled:!E.redo.length,fn:doRedo},{sep:1},
  {label:L10('그래프 복제'),disabled:!r,fn:()=>{const c=CLONE(r);reid(c);c.name=uniqName(r.name);GL().push(c);bump();markDirty();E.gid=c.id;E.path=[];render()}},
  {label:L10('그래프 삭제…'),disabled:!r,fn:()=>delGraph(r)},{sep:1},
  {label:L10('C# 스크립트 창 열기'),fn:()=>{try{openScriptHub()}catch(e){}}},
  {label:L10('비주얼 스크립트 창 닫기'),fn:close}],true)}
function delGraph(g){const us=usersOf(g.id);
  openModal(L10('그래프 삭제'),`<p style="margin:0"><b data-i18n-skip>${ex(g.name)}</b>${ex(L10('을(를) 삭제합니다.'))}${us.length?' '+ex(L10('이 그래프를 쓰는 컴포넌트 {n}개도 함께 사라집니다.',{n:us.length})):''}</p>`,[{t:L10('취소')},{t:L10('삭제'),cls:'danger',fn:()=>{
    P.vgraphs=GL().filter(x=>x.id!==g.id);(P.mgrs||[]).concat(...P.maps.map(m=>m.objs.concat(m.ui||[]))).forEach(o=>{if(o.vs){o.vs=o.vs.filter(c=>c.gid!==g.id);if(!o.vs.length)delete o.vs}});
    E.gid=GL()[0]?GL()[0].id:null;E.path=[];bump();markDirty();try{commit()}catch(e){}render();renderInspSafe()}}])}
function gotoUser(oid,sid){if(play){toast(L10('플레이 중에는 오브젝트로 이동할 수 없습니다'));return}
  try{if((P.mgrs||[]).some(o=>o.id===oid)){mgrPick(oid);return}if(sid&&sid!==curId)selectScene(sid);renderHier();const r=document.querySelector('#hier .tr[data-rk="'+(window.CSS&&CSS.escape?CSS.escape(oid):oid)+'"]');if(r){r.click();try{r.scrollIntoView({block:'nearest'})}catch(_){}}}catch(e){console.error(e)}}

/* ===================== 인스펙터 컴포넌트 ===================== */
function attach(o,gid){(o.vs||(o.vs=[])).push({id:nid(),gid,vals:{}});bump();try{commit()}catch(e){}markDirty();renderInspSafe();try{renderHier()}catch(e){}const g=gOf(gid);toast(L10('「{o}」에 {g}을(를) 붙였습니다',{o:o.name,g:g?g.name:''}));if(isVisible())render()}
function compsHtml(o){
  if(!o||!o.vs||!o.vs.length)return'';
  return o.vs.map(c=>{const g=gOf(c.gid),key='vs:'+c.id,st=g&&g.kind==='state';
    let fold=false;try{fold=insFold.has(key)}catch(e){}
    const opts=GL().map(x=>`<option value="${ex(x.id)}"${x.id===c.gid?' selected':''} data-i18n-skip>${x.kind==='state'?'◆':'◇'} ${ex(x.name)}</option>`).join('');
    let b=`<div class="fr"><label>${L10('그래프')}</label><div class="fv"><select data-vsg="${c.id}">${g?'':`<option value="">(${L10('없음')})</option>`}${opts}</select></div></div>`;
    if(g&&(g.vars||[]).length)b+=`<div class="shead">${L10('그래프 변수 (처음 값)')}</div>`+g.vars.map(v=>{const val=c.vals&&v.name in c.vals?c.vals[v.name]:v.def;const at=`data-vsv="${c.id}" data-vsn="${ex(v.name)}"`;
      return`<div class="fr"><label data-i18n-skip>${ex(v.name)}</label><div class="fv">${v.type==='bool'?`<input type="checkbox" ${at}${tB(val)?' checked':''}>`:`<input type="${v.type==='num'?'number':'text'}" ${at} value="${ex(val)}" step="any">`}</div></div>`}).join('');
    if(R.on&&play){const M=[...R.mach.values()].find(x=>x.owner.id===o.id&&x.comp.id===c.id);if(M){const sp=statePath(M);if(sp.length)b+=`<p class="hint" style="margin:6px 0 0"><span class="vlive"></span> ${L10('지금 상태')}: <b data-i18n-skip>${ex(sp.join(' ▸ '))}</b></p>`}}
    b+=`<div style="margin-top:8px;display:flex;gap:6px"><button class="btn" data-vsedit="${ex(c.gid)}" style="height:24px">${L10('그래프 편집')}</button></div>`;
    return`<div class="comp vscomp${fold?' closed':''}" data-comp="${key}"><button class="chead">${st?IC.state:IC.flow}<span>${st?L10('상태 머신'):L10('스크립트 머신')} <small style="color:var(--mute);font-weight:400">(${st?'State Machine':'Script Machine'})</small></span></button><button class="crm" data-vsrm="${c.id}" title="${ex(L10('컴포넌트 제거'))}" aria-label="${ex(L10('컴포넌트 제거'))}">✕</button><div class="cbody">${b}</div></div>`}).join('');
}
function menuItems(o){
  if(!o)return[];const items=[{sep:1},{head:L10('비주얼 스크립트'),sub:L10('노드로 만드는 스크립트 · 상태 머신')}];
  const mk=(k)=>{const g=newAsset(k,(o.name||'')+(k==='state'?' 상태 머신':' 스크립트'));attach(o,g.id);E.gid=g.id;E.path=[];open(g.id)};
  items.push({label:L10('새 스크립트 머신 (스크립트 그래프)…'),fn:()=>mk('flow')},{label:L10('새 상태 머신 (상태 그래프)…'),fn:()=>mk('state')});
  GL().forEach(g=>items.push({label:(g.kind==='state'?'◆ ':'◇ ')+g.name,fn:()=>attach(o,g.id)}));
  return items;
}
const INSP=document.getElementById('insp');
if(INSP){
  INSP.addEventListener('click',e=>{
    const rm=e.target.closest('[data-vsrm]');if(rm){const o=ownerNow();if(o&&o.vs){o.vs=o.vs.filter(c=>c.id!==rm.dataset.vsrm);if(!o.vs.length)delete o.vs;bump();try{commit()}catch(_){}markDirty();renderInspSafe()}return}
    const ed=e.target.closest('[data-vsedit]');if(ed){E.gid=null;open(ed.dataset.vsedit);return}
  });
  INSP.addEventListener('change',e=>{
    const t=e.target;
    if(t.dataset.vsg){const o=ownerNow(),c=o&&(o.vs||[]).find(q=>q.id===t.dataset.vsg);if(c){c.gid=t.value;c.vals={};bump();try{commit()}catch(_){}markDirty();renderInspSafe()}return}
    if(t.dataset.vsv){const o=ownerNow(),c=o&&(o.vs||[]).find(q=>q.id===t.dataset.vsv);if(!c)return;const g=gOf(c.gid),v=g&&(g.vars||[]).find(q=>q.name===t.dataset.vsn);c.vals=c.vals||{};c.vals[t.dataset.vsn]=t.type==='checkbox'?t.checked:conv(t.value,v?v.type:'str');try{commit()}catch(_){}markDirty();return}
  });
}

/* ===================== 스타일 ===================== */
const VS_CSS=`
:root{--vsflow:#f2f2f5}html[data-theme="light"]{--vsflow:#3d3d48}
#vsBox{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0;outline:none;font-size:12px}
.panel[data-id="vs"] .pbody{position:relative;padding:0;overflow:hidden;display:flex;flex-direction:column}
.vtop{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--line);flex:none;min-width:0;flex-wrap:nowrap;overflow:hidden}
.vtop .ib{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:transparent;border:1px solid transparent;color:var(--mute);flex:none}
.vtop .ib:hover{background:var(--hover);color:var(--fg)}.vtop .ib.on{color:var(--fg);background:var(--btn)}
.vtop .btn{display:inline-flex;align-items:center;gap:5px;flex:none;max-width:260px;overflow:hidden}.vtop .btn b{overflow:hidden;text-overflow:ellipsis}
.vgpick{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:7px;background:var(--btn);border:1px solid var(--line2);color:var(--fg);font-weight:600;max-width:240px;flex:none}
.vgpick span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vgpick .cv{width:10px;height:10px;stroke:currentColor;fill:none;stroke-width:1.5;flex:none;opacity:.7}
.vgpick:hover{background:var(--btn-h)}
.vcrumb{display:flex;align-items:center;gap:2px;min-width:0;overflow:hidden;flex:0 1 auto}
.vcb{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 7px;border-radius:5px;border:0;background:transparent;color:var(--mute);white-space:nowrap;max-width:180px;overflow:hidden}
.vcb span{overflow:hidden;text-overflow:ellipsis}.vcb:hover{background:var(--hover);color:var(--fg)}.vcb.on{color:var(--fg);font-weight:600}
.vcs{color:var(--mute);opacity:.6}
.vkind{color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.vsp{flex:1;min-width:4px}
.vdbg{display:inline-flex;align-items:center;gap:6px;color:var(--ok);font-weight:600;white-space:nowrap;flex:none}.vdbg select{height:24px;max-width:150px}.vdbg.off{color:var(--mute);font-weight:400}
.vlive{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px rgba(76,217,138,.25);animation:vsPulse 1.2s ease-in-out infinite;flex:none}
@keyframes vsPulse{50%{box-shadow:0 0 0 6px rgba(76,217,138,0)}}
.vmain{flex:1;display:flex;min-height:0}
.vlib{width:var(--libw,200px);flex:none;overflow:auto;padding:6px}
.vmain.flip{flex-direction:row-reverse}
.vgrip{flex:none;width:5px;margin:0 -2px;position:relative;z-index:5;cursor:col-resize;touch-action:none}
.vgrip::after{content:"";position:absolute;top:0;bottom:0;left:2px;width:1px;background:var(--line)}
.vgrip:hover::after,.vgrip.on::after{left:1px;width:3px;background:var(--accent);opacity:.8}
.vlq input{width:100%;height:26px}
.vll{margin-top:6px}
.vlch{display:flex;align-items:center;gap:7px;width:100%;height:24px;border:0;background:transparent;color:var(--fg);font-weight:600;padding:0 4px;border-radius:5px}
.vlch:hover{background:var(--hover)}.vlch small{margin-left:auto;color:var(--mute);font-weight:400;flex:none}
.vlch i,.vln i,.vcd{width:8px;height:8px;border-radius:2px;flex:none;display:inline-block}
.vlc.vshut .vlcb{display:none}
.vlc{width:100%;min-width:0}
.vlch span{flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vchev{width:9px;height:9px;flex:none;fill:none;stroke:var(--mute);stroke-width:1.6;transition:transform .12s;transform:rotate(90deg)}
.vlc.vshut .vchev{transform:none}
.vln{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vlcb{padding:1px 0 6px 6px}
.vln{display:flex;align-items:center;gap:7px;width:calc(100% - 4px);min-height:26px;margin:3px 0;border:0;border-bottom:2px solid var(--cd);background:var(--ch);color:#fff;font-weight:600;text-align:left;padding:3px 10px;border-radius:7px;cursor:grab;text-shadow:0 1px 1px rgba(0,0,0,.35)}
.vln:hover{filter:brightness(1.08)}.vln:active{background:var(--cd)}
.vlnone{color:var(--mute);padding:8px}
.vlh{font-weight:600;padding:4px 4px 6px}
.vlst{display:flex;flex-direction:column;gap:6px}
.vli{display:grid;grid-template-columns:18px 1fr;grid-template-rows:auto auto;column-gap:6px;text-align:left;padding:8px;border-radius:8px;border:1px solid var(--line2);background:var(--btn);color:var(--fg)}
.vli:hover{background:var(--btn-h)}.vli .ic{grid-row:span 2;margin-top:2px}.vli small{color:var(--mute)}
.vltip{margin-top:12px;padding:10px;border-radius:8px;background:var(--head);color:var(--mute);line-height:1.55}.vltip b{color:var(--fg)}.vltip p{margin:6px 0 0}
.vcv{position:relative;flex:1;min-width:0;overflow:hidden;background-color:var(--canvas);background-image:radial-gradient(circle,var(--grid) 1.2px,transparent 1.3px);outline:none;cursor:default;touch-action:none}
.vworld{position:absolute;left:0;top:0;transform-origin:0 0}
.vlinks{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none}
.vlinks path{fill:none}
.vlinks.vwire{z-index:60}
.vl{stroke:var(--lc);stroke-width:2;opacity:.75}.vl.fl{stroke-width:2.6;opacity:.9}
.vl.sel{stroke:var(--accent)!important;opacity:1;stroke-width:3.2}
.vl.tmp{stroke-dasharray:6 5;opacity:1;stroke:var(--accent)}
.vl.hot{opacity:1;stroke:#ffe066;stroke-width:3.4;stroke-dasharray:10 7;animation:vsDash .45s linear infinite;filter:drop-shadow(0 0 4px rgba(255,224,102,.8))}
@keyframes vsDash{to{stroke-dashoffset:-17}}
.vlhit{stroke:transparent;stroke-width:12;pointer-events:stroke;cursor:pointer}
.vt{stroke:var(--mute);stroke-width:2.2;opacity:.9}.vt.sel{stroke:var(--accent)}.vt.hot{stroke:#ffe066;stroke-width:3.4;stroke-dasharray:10 7;animation:vsDash .45s linear infinite}
.vn{position:absolute;min-width:170px;max-width:270px;border-radius:9px;background:color-mix(in srgb,var(--win) 78%,transparent);backdrop-filter:blur(3px);border:1.5px solid var(--cd);box-shadow:0 6px 18px rgba(0,0,0,.28);user-select:none;--hot:0}
.vn.sel{border-color:var(--accent);box-shadow:0 0 0 1.5px var(--accent),0 6px 18px rgba(0,0,0,.28)}
.vn.hot{box-shadow:0 0 0 2px rgba(255,224,102,var(--hot)),0 0 22px rgba(255,224,102,calc(var(--hot)*.7)),0 6px 18px rgba(0,0,0,.28)}
.vnh{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:8px 8px 0 0;background:var(--ch);border-bottom:2px solid var(--cd);color:#fff;font-weight:700;cursor:grab;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.35)}
.vnh span{overflow:hidden;text-overflow:ellipsis;flex:1}.vnh>i{width:8px;height:8px;border-radius:2px;background:#fff;opacity:.85;flex:none}
.vn.ev .vnh{border-radius:16px 16px 0 0}.vn.ev .vnh>i{border-radius:50%}
.vnh em{font-style:normal;color:#fff;display:inline-flex}
.vn.sub{border-style:dashed}
.vfs{padding:6px 9px 2px;display:flex;flex-direction:column;gap:4px}
.vf{display:flex;align-items:center;gap:6px}.vf span{color:var(--mute);flex:none;min-width:34px}.vf input,.vf select{flex:1;min-width:0;height:22px;font-size:11.5px}
.vnb{padding:4px 0 7px}
.vr{display:flex;justify-content:space-between;gap:10px;min-height:22px;align-items:center}
.vp{display:inline-flex;align-items:center;gap:5px;min-width:0;color:var(--fg);font-size:11.5px}
.vp b{font-weight:500;color:var(--mute);white-space:nowrap;cursor:crosshair}.vp.pout{margin-left:auto;justify-content:flex-end}
.vpd{width:11px;height:11px;border-radius:50%;border:2px solid var(--pc);background:var(--win);flex:none;cursor:crosshair;position:relative}
.vp.pin .vpd{margin-left:-6px}.vp.pout .vpd{margin-right:-6px}
.vp.on .vpd{background:var(--pc)}
.vp.t-flow .vpd{border-radius:2px;width:11px;height:12px;clip-path:polygon(0 0,100% 50%,0 100%);border:0;background:color-mix(in srgb,var(--pc) 45%,transparent)}
.vp.t-flow.on .vpd{background:var(--pc)}
.vp.can .vpd{transform:scale(1.5);box-shadow:0 0 0 3px var(--accent)}
.vpe{width:70px;height:20px;font-size:11px;padding:0 4px}.vpe[type=checkbox]{width:auto;height:auto}
.vin{display:flex;align-items:center;gap:6px;width:calc(100% - 14px);margin:0 7px 7px;height:24px;border-radius:6px;border:1px dashed var(--cc);background:var(--head);color:var(--cc);justify-content:center}
.vin:hover{background:var(--hover)}
.vs-st{position:absolute;width:170px;border-radius:12px;background:var(--win);border:1.5px solid var(--line2);box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:grab;user-select:none;--hot:0}
.vs-st.super{border-style:double;border-width:3px}
.vs-st.start{border-color:#4cd98a}
.vs-st.sel{box-shadow:0 0 0 2px var(--accent),0 6px 18px rgba(0,0,0,.28)}
.vs-st.cur{border-color:#ffe066;box-shadow:0 0 0 3px rgba(255,224,102,.55),0 0 26px rgba(255,224,102,.45)}
.vs-st.can{box-shadow:0 0 0 3px var(--accent)}
.vsth{display:flex;align-items:center;gap:7px;padding:9px 12px 3px;font-weight:600}.vsth b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vstb{padding:0 12px 9px;color:var(--mute);font-size:11px}
.vstbar{height:3px;margin:0 10px 8px;border-radius:2px;background:var(--line);overflow:hidden}.vstbar i{display:block;height:100%;width:0;background:#ffe066}
.vs-st:not(.cur) .vstbar{opacity:0}
.vstart{position:absolute;top:-9px;left:10px;font:600 9.5px var(--f-body);background:#4cd98a;color:#062513;border-radius:999px;padding:1px 7px}
.vsto{position:absolute;right:-8px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:50%;border:2px solid var(--accent);background:var(--win);cursor:crosshair;padding:0}
.vsto:hover{background:var(--accent)}
.vtl{position:absolute;transform:translate(-50%,-50%);padding:2px 8px;border-radius:999px;border:1px solid var(--line2);background:var(--win);color:var(--fg);font-size:11px;white-space:nowrap;cursor:pointer;max-width:200px;overflow:hidden;text-overflow:ellipsis}
.vtl.sel{border-color:var(--accent);color:var(--accent)}.vtl.hot{background:#ffe066;color:#1a1400;border-color:#ffe066}
.vhint{position:absolute;left:10px;bottom:8px;color:var(--mute);font-size:11px;pointer-events:none;background:color-mix(in srgb,var(--canvas) 80%,transparent);padding:2px 6px;border-radius:5px;max-width:calc(100% - 20px)}
.vbox{position:absolute;border:1px dashed var(--accent);background:rgba(233,189,12,.08);pointer-events:none}
.vempty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.vemp{text-align:center;max-width:360px;padding:20px}.vemp h3{margin:10px 0 4px}.vemp p{color:var(--mute)}.vemi .ic{width:40px;height:40px;color:var(--accent)}
.vemb{display:flex;gap:8px;justify-content:center;margin-top:12px}.vemb .btn{height:30px;display:inline-flex;align-items:center;gap:6px}
.vside{width:var(--sidew,260px);flex:none;overflow:auto;padding:4px 10px 12px}
.vsec{padding:8px 0;border-bottom:1px solid var(--line)}.vsec:last-child{border-bottom:0}
.vsh{display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:6px}.vsh small{color:var(--mute);font-weight:400}
.vsh .ib{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;border:0;background:transparent;color:var(--mute)}.vsh .ib:hover{background:var(--hover);color:var(--fg)}
.vsf{display:flex;flex-direction:column;gap:3px;margin:6px 0}.vsf span{color:var(--mute);font-size:11px}.vsf input,.vsf select{height:26px;width:100%}
.vsx{color:var(--mute);line-height:1.5;margin:4px 0}
.vsbtns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.vsbtns .btn,.vsb{display:inline-flex;align-items:center;gap:5px}
.vsb{margin-top:6px}
.vvars{display:flex;flex-direction:column;gap:4px}
.vvar{display:grid;grid-template-columns:1fr 64px 56px 22px;gap:4px;align-items:center}.vvar input,.vvar select{height:24px;min-width:0;width:100%}.vvar input[type=checkbox]{width:auto;justify-self:start}
.vvar .ib{width:22px;height:22px;border:0;background:transparent;color:var(--mute);border-radius:5px;display:inline-flex;align-items:center;justify-content:center}.vvar .ib:hover{color:var(--danger);background:var(--hover)}
.vusers{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}.vusers li{display:flex;align-items:center;gap:6px}.vusers small{color:var(--mute);margin-left:auto}
.vul{border:0;background:transparent;color:var(--fg);padding:3px 4px;border-radius:4px;text-align:left}.vul:hover{background:var(--hover);color:var(--accent)}
.vhelp p{color:var(--mute);line-height:1.5;margin:4px 0;font-size:11.5px}
.vtr{display:flex;align-items:center;gap:6px;width:100%;padding:5px 6px;border-radius:6px;border:1px solid var(--line);background:var(--head);color:var(--fg);margin-bottom:4px;text-align:left}.vtr small{margin-left:auto;color:var(--mute)}.vtr:hover{border-color:var(--accent)}
.vtrn{margin:2px 0 6px}
.vlvs{margin-top:10px;padding:8px;border-radius:8px;background:var(--head)}.vlvh{display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:4px;color:var(--ok)}
.vlv{display:grid;grid-template-columns:44px 1fr auto;gap:6px;padding:2px 0;align-items:center}.vlv small{color:var(--mute)}.vlv span{font-family:var(--f-mono);color:var(--accent)}
#vsBox.live .vcv{box-shadow:inset 0 0 0 2px rgba(76,217,138,.35)}
.tgroup.codegrp{display:inline-flex;gap:0;margin-left:6px;border-radius:7px;overflow:hidden;border:1px solid var(--line2);background:var(--btn)}
.tgroup.codegrp .tbtn{margin:0;border:0;border-radius:0;background:transparent;height:28px}
.tgroup.codegrp .tbtn:hover{background:var(--btn-h)}
.tgroup.codegrp .tbtn+.tbtn{border-left:1px solid var(--line2)}
.tgroup.codegrp .cgl{font:600 10.5px var(--f-mono);color:var(--mute);padding-right:2px}
@media (max-width:900px){.tgroup.codegrp .tbtn{font-size:0;gap:0;padding:0 8px}.tgroup.codegrp .tbtn .ic{font-size:14px}}
.vscomp .chead .ic{color:var(--accent)}
#vsCv:focus,#vsCv:focus-visible{outline:none!important}
/* 자석 연결 · 연결 효과 */
.vpd{transition:transform .09s ease-out,box-shadow .09s}
.vp.mag .vpd{transform:scale(1.7);box-shadow:0 0 0 4px rgba(233,189,12,.35),0 0 14px rgba(255,224,102,.9);animation:vsPop .22s ease-out}
.vp.mag.t-flow .vpd{background:var(--accent)}
.vl.tmp.snap{stroke-dasharray:none;stroke-width:3;filter:drop-shadow(0 0 5px rgba(255,224,102,.8))}
.vl.born,.vt.born{animation:vsBorn .65s ease-out}
@keyframes vsBorn{0%{stroke:#fffbe6;stroke-width:6;filter:drop-shadow(0 0 10px #ffe066)}100%{filter:none}}
.vp.born .vpd{animation:vsPop .4s ease-out}
@keyframes vsPop{0%{transform:scale(1)}40%{transform:scale(1.9)}100%{transform:scale(1)}}
.vtl.born{animation:vsTl .6s ease-out}@keyframes vsTl{0%{background:#ffe066;color:#1a1400;transform:translate(-50%,-50%) scale(1.25)}}
.vring{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #ffe066;pointer-events:none;opacity:0;animation:vsRing .6s ease-out forwards}
@keyframes vsRing{0%{transform:scale(.5);opacity:1}100%{transform:scale(3.6);opacity:0}}
@media (prefers-reduced-motion:reduce){.vl.born,.vt.born,.vp.born .vpd,.vp.mag .vpd,.vtl.born{animation:none}.vring{display:none}}
/* 오른쪽 클릭 노드 메뉴 (분류 → 노드) */
.vcm{position:fixed;z-index:100000;display:flex;align-items:flex-start;gap:4px;font:12.5px var(--f-body);color:var(--fg)}
.vcm.flip{flex-direction:row-reverse}
.vcm1,.vcm2{background:color-mix(in srgb,var(--win) 92%,transparent);backdrop-filter:blur(10px);border:1px solid var(--line2);border-radius:10px;box-shadow:var(--shadow);padding:5px}
.vcm1{width:200px}.vcm2{width:210px;max-height:min(420px,calc(100vh - 12px));overflow:auto}
.vcmq input{width:100%;height:28px;margin-bottom:4px}
.vcml{max-height:min(380px,calc(100vh - 60px));overflow:auto}
.vcmc{display:flex;align-items:center;gap:8px;width:100%;height:30px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--fg);text-align:left}
.vcmc i,.vcmh i{width:10px;height:10px;border-radius:3px;background:var(--cc);flex:none}
.vcmc span{flex:1;font-weight:600}.vcmc small{color:var(--mute)}
.vcmc svg{width:9px;height:9px;fill:none;stroke:var(--mute);stroke-width:1.6;flex:none}
.vcmc:hover,.vcmc.on,.vcmc:focus-visible{background:var(--hover);outline:none}.vcmc.on{box-shadow:inset 3px 0 0 var(--cc)}
.vcmh{display:flex;align-items:center;gap:7px;padding:4px 6px 6px;font-weight:700;color:var(--mute)}
.vcmi{display:flex;align-items:center;width:100%;min-height:28px;margin:3px 0;padding:3px 10px;border:0;border-bottom:2px solid var(--cd);border-radius:7px;background:var(--ch);color:#fff;font-weight:600;text-align:left;text-shadow:0 1px 1px rgba(0,0,0,.35)}
.vcmi span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vcmi:hover,.vcmi:focus-visible{filter:brightness(1.15);outline:2px solid var(--accent);outline-offset:1px}
.vcm0{color:var(--mute);padding:8px;margin:0}
/* 변수 고르기 */
.vvp{display:flex;align-items:center;gap:6px;width:100%;min-width:0;height:26px;padding:0 8px 0 4px;border-radius:7px;border:1px solid var(--line2);background:var(--field);color:var(--fg)}
.vvp:hover{border-color:var(--accent)}
.vvp i,.vvi i,.vvadd i{font:600 10px var(--f-body);font-style:normal;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--sc) 30%,transparent);color:color-mix(in srgb,var(--sc) 55%,var(--fg));border:1px solid color-mix(in srgb,var(--sc) 60%,transparent);flex:none;white-space:nowrap}
.vvp b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-weight:600}
.vvp svg{width:10px;height:10px;fill:none;stroke:var(--mute);stroke-width:1.5;flex:none}
.vfv{display:block}
.vvbox{width:280px;background:color-mix(in srgb,var(--win) 94%,transparent);backdrop-filter:blur(10px);border:1px solid var(--line2);border-radius:12px;box-shadow:var(--shadow);padding:8px;display:flex;flex-direction:column;gap:6px;max-height:min(460px,calc(100vh - 12px))}
.vvtop input{width:100%;height:30px}
.vvsc{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.vvsc button{height:26px;border-radius:7px;border:1px solid var(--line2);background:transparent;color:var(--mute);font-weight:600;font-size:11.5px}
.vvsc button:hover{color:var(--fg)}
.vvsc button.on{background:color-mix(in srgb,var(--sc) 28%,transparent);border-color:var(--sc);color:var(--fg)}
.vvl{overflow:auto;min-height:0;flex:1;margin:0 -2px;padding:0 2px}
.vvg{margin-top:4px}
.vvgh{display:flex;align-items:center;gap:6px;padding:4px 4px;color:var(--mute);font-weight:600;font-size:11.5px;position:sticky;top:0;background:var(--win);z-index:1}
.vvgh span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vvgh em{font:700 9.5px var(--f-mono);font-style:normal;background:${EC.VARIABLE};color:#fff;border-radius:4px;padding:1px 4px}
.vvgh small.cur{color:var(--accent);font-weight:600}
.vvi{display:flex;align-items:center;gap:7px;width:100%;min-height:30px;padding:3px 8px;border:0;border-radius:7px;background:transparent;color:var(--fg);text-align:left}
.vvi:hover,.vvi:focus-visible{background:var(--hover);outline:none}
.vvi.on{background:color-mix(in srgb,var(--accent) 16%,transparent)}
.vvi b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.vvi small{color:var(--mute);font-size:10.5px;flex:none}.vvi small.dc{color:${EC.START}}
.vvi .ck{color:var(--accent);font-weight:700}
.vvadd{display:flex;align-items:center;gap:7px;width:100%;height:32px;padding:0 8px;border-radius:8px;border:1px dashed var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--fg)}
.vvadd b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.vvadd kbd{font:10px var(--f-mono);color:var(--mute);border:1px solid var(--line2);border-radius:4px;padding:0 4px}
.vvadd:hover,.vvadd:focus-visible{background:color-mix(in srgb,var(--accent) 20%,transparent);outline:none}
/* 대상 고르기 */
.vft{display:flex;align-items:center;gap:6px}
.vtp{display:flex;align-items:center;gap:6px;flex:1;min-width:0;height:26px;padding:0 8px 0 4px;border-radius:7px;border:1px solid var(--line2);background:var(--field);color:var(--fg)}
.vtp:hover{border-color:var(--accent)}.vtp.miss{border-color:var(--danger)}.vtp.miss b{color:var(--danger)}
.vtp b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;font-weight:600}
.vtp>svg{width:10px;height:10px;fill:none;stroke:var(--mute);stroke-width:1.5;flex:none}
.vtpi{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:color-mix(in srgb,var(--oc) 22%,transparent);color:var(--oc);flex:none}
.vtpi .ic{width:13px;height:13px}
.vobox{width:300px;background:color-mix(in srgb,var(--win) 94%,transparent);backdrop-filter:blur(10px);border:1px solid var(--line2);border-radius:12px;box-shadow:var(--shadow);padding:8px;display:flex;flex-direction:column;gap:6px;max-height:min(480px,calc(100vh - 12px))}
.vosp{display:flex;gap:4px;flex-wrap:wrap}
.vos{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px 0 5px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--fg);font-weight:600}
.vos:hover,.vos:focus-visible{background:var(--hover);outline:none}.vos.on{border-color:var(--oc);background:color-mix(in srgb,var(--oc) 16%,transparent)}
.votree{overflow:auto;min-height:0;flex:1;border-top:1px solid var(--line);padding-top:4px}
.vor{display:flex;align-items:center;gap:6px;min-height:28px;padding:2px 8px 2px calc(4px + var(--d)*16px);border-radius:7px;cursor:pointer}
.vor b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.vor small{color:var(--mute);font-size:10.5px;flex:none}
.vor:hover,.vor:focus-visible{background:var(--hover);outline:none}
.vor.on{background:color-mix(in srgb,var(--accent) 16%,transparent)}
.vor.hit b{color:var(--accent)}.vor .ck{color:var(--accent);font-weight:700}
.vor.fol,.vor.no{cursor:default}.vor.fol:hover,.vor.no:hover{background:transparent}
.vor.fol b{font-weight:500;color:var(--mute)}.vor.no:not(.fol) b{opacity:.45}.vor.no .vtpi{opacity:.45}
.vor.off b{text-decoration:line-through;text-decoration-color:var(--mute)}
.vof{width:16px;height:16px;padding:0;border:0;background:none;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--mute)}
.vof svg{width:9px;height:9px;fill:none;stroke:currentColor;stroke-width:1.6;transition:transform .1s}.vof.open svg{transform:rotate(90deg)}
.vofoot{color:var(--mute);font-size:11px;padding:2px 4px 0}
/* 게임 화면 이벤트 흐름 */
.vsFlow{position:absolute;left:calc(8px + env(safe-area-inset-left,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:3;width:min(340px,calc(100% - 16px));max-height:min(46%,330px);display:flex;flex-direction:column;border-radius:10px;background:rgba(14,14,18,.82);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.14);color:#f2f2f5;font:12px var(--f-body);box-shadow:0 10px 30px rgba(0,0,0,.45);overflow:hidden}
.vsFlow .ic{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.5}
.vfh{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1);color:#ffe066}.vfh b{color:#fff}
.vfh button{border:0;background:rgba(255,255,255,.08);color:#ddd;border-radius:5px;height:22px;padding:0 7px;font-size:11px;display:inline-flex;align-items:center}.vfh button:hover{background:rgba(255,255,255,.16)}
.vfu{display:inline-flex;align-items:center;gap:4px;color:#bbb;font-size:11px}
.vfm{padding:5px 8px;display:flex;flex-direction:column;gap:3px;border-bottom:1px solid rgba(255,255,255,.08);max-height:96px;overflow:auto;flex:none}
.vfmr{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap}.vfmr b{overflow:hidden;text-overflow:ellipsis;max-width:90px}
.vfk{width:7px;height:7px;border-radius:50%;background:var(--c);flex:none}
.vfg{color:#9b9ba6;overflow:hidden;text-overflow:ellipsis;max-width:100px}
.vfst{margin-left:auto;background:#ffe066;color:#1a1400;border-radius:999px;padding:0 7px;font-weight:600;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.vfl{overflow:auto;padding:4px 0;flex:1;min-height:0}
.vfe{display:grid;grid-template-columns:40px 8px auto 1fr;gap:6px;align-items:center;padding:2px 8px;white-space:nowrap}
.vfe.new{animation:vsNew .6s ease-out}
@keyframes vsNew{from{background:rgba(255,224,102,.3)}to{background:transparent}}
.vfe i{width:7px;height:7px;border-radius:50%}.vft{color:#8a8a96;font-family:var(--f-mono);font-size:10.5px;text-align:right}
.vfw{color:#fff;font-weight:600;max-width:90px;overflow:hidden;text-overflow:ellipsis}.vfx2{color:#d4d4dc;overflow:hidden;text-overflow:ellipsis}
.vfe0{color:#8a8a96;padding:6px 10px}
#pFlow.on{background:rgba(233,189,12,.9)!important;color:#1a1400!important;border-color:transparent!important}
#pFlow .ic{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.6}
html[data-theme="light"] .vn{background:rgba(255,255,255,.8)}html[data-theme="light"] .vs-st,html[data-theme="light"] .vtl{background:#fff}
html[data-theme="light"] .vpd{background:#fff}
`;
{const st=document.createElement('style');st.id='vsCss';st.textContent=VS_CSS;document.head.append(st)}

/* ===================== 번역 ===================== */
if(window.TI18N)TI18N.add({
'비주얼 스크립트':['Visual Scripting','ビジュアルスクリプト','可视化脚本'],
'선 연결 자석':['Wire magnet','ワイヤーのマグネット','连线磁吸'],'가까운 포트에 선 끝을 착 붙이기':['Snap wire ends to nearby ports','近くのポートに線をくっつける','连线末端吸附到附近端口'],
'거리':['Distance','距離','距离'],'대상 고르기':['Pick target','対象を選ぶ','选择目标'],'오브젝트 고르기':['Pick object','オブジェクトを選ぶ','选择对象'],'오브젝트 이름 검색':['Search objects','オブジェクトを検索','搜索对象'],'지금 씬':['Current scene','現在のシーン','当前场景'],'맞는 오브젝트가 없습니다':['No matching objects','一致するオブジェクトはありません','没有匹配的对象'],'누구와':['With','誰と','与谁'],'오브젝트와의 거리':['Distance to object','オブジェクトとの距離','与对象的距离'],'위치가 있는 게임 오브젝트만 고를 수 있어요':['Only game objects with a position','位置のあるゲームオブジェクトのみ','只能选择有位置的游戏对象'],'흐린 줄은 이 노드에서 고를 수 없어요':['Dimmed rows cannot be picked here','薄い行は選べません','灰色行无法选择'],
'변수 고르기':['Pick variable','変数を選ぶ','选择变量'],'변수 이름 검색 · 새 이름 입력':['Search or type a new name','変数を検索 · 新しい名前','搜索或输入新名称'],'새 변수':['New variable','新しい変数','新变量'],'지금 편집 중':['Editing','編集中','正在编辑'],'선언':['declared','宣言','已声明'],'맞는 변수가 없습니다':['No matching variables','一致する変数はありません','没有匹配的变量'],'아직 쓰는 변수가 없습니다':['No variables yet','まだ変数がありません','还没有变量'],'노드 목록 · 속성 패널 좌우 바꾸기':['Swap node list and properties','ノード一覧とプロパティを左右入れ替え','交换节点列表和属性面板'],'끌어서 너비 조절 · 더블클릭: 기본 너비':['Drag to resize · Double-click to reset','ドラッグで幅調整 · ダブルクリックで既定','拖动调整宽度 · 双击恢复'],
'선 삭제':['Delete wire','線を削除','删除连线'],'방향 뒤집기':['Reverse direction','向きを反転','反转方向'],'조건 바꾸기':['Edit condition','条件を変更','修改条件'],'연결 효과':['Connect effect','接続エフェクト','连接特效'],'연결할 때 반짝이는 효과':['Sparkle when connecting','接続時にきらめく','连接时闪光'],
'C#':['C#','C#','C#'],
'스크립트 그래프':['Script Graph','スクリプトグラフ','脚本图'],'상태 그래프':['State Graph','ステートグラフ','状态图'],
'새 스크립트 그래프':['New Script Graph','新しいスクリプトグラフ','新建脚本图'],'새 상태 그래프':['New State Graph','新しいステートグラフ','新建状态图'],
'스크립트 머신':['Script Machine','スクリプトマシン','脚本机'],'상태 머신':['State Machine','ステートマシン','状态机'],
'이벤트 흐름':['Event Flow','イベントフロー','事件流'],'업데이트 포함':['Include Update','Updateも表示','包含 Update'],'지우기':['Clear','クリア','清除'],'닫기':['Close','閉じる','关闭'],
'아직 이벤트가 없습니다':['No events yet','まだイベントはありません','还没有事件'],
'이벤트':['Events','イベント','事件'],'흐름 제어':['Flow Control','フロー制御','流程控制'],'상태 · 그래프':['State · Graph','ステート · グラフ','状态 · 图'],'이벤트 보내기 · C#':['Send Events · C#','イベント送信 · C#','发送事件 · C#'],'변수':['Variables','変数','变量'],'값 · 계산':['Values · Math','値 · 計算','值 · 计算'],'입력':['Input','入力','输入'],'게임 오브젝트':['Game Object','ゲームオブジェクト','游戏对象'],'게임 기능':['Game Features','ゲーム機能','游戏功能'],
'노드 검색':['Search nodes','ノードを検索','搜索节点'],'검색 결과가 없습니다':['No results','検索結果がありません','没有搜索结果'],
'시작 (Start)':['Start','Start','Start'],'업데이트 (Update)':['Update','Update','Update'],'상태 진입 (On Enter State)':['On Enter State','On Enter State','On Enter State'],'상태 나감 (On Exit State)':['On Exit State','On Exit State','On Exit State'],
'키 입력 (On Key)':['On Key','キー入力','按键输入'],'커스텀 이벤트 받기':['Receive Custom Event','カスタムイベントを受信','接收自定义事件'],'엔진 메시지 받기':['Receive Engine Message','エンジンメッセージを受信','接收引擎消息'],'타이머 (매 N초)':['Timer (every N s)','タイマー (N秒ごと)','计时器 (每N秒)'],
'그래프 입력':['Graph Input','グラフ入力','图输入'],'그래프 출력':['Graph Output','グラフ出力','图输出'],'만약 (If)':['If','If','If'],'순서대로 (Sequence)':['Sequence','Sequence','Sequence'],'기다리기 (Wait)':['Wait','Wait','Wait'],'반복 (For)':['For Loop','For ループ','For 循环'],'한 번만 (Once)':['Once','Once','Once'],
'서브그래프':['Subgraph','サブグラフ','子图'],'상태 머신 유닛':['State Machine Unit','ステートマシンユニット','状态机单元'],'상태 바꾸기':['Set State','ステート切替','切换状态'],'상태 끝내기':['Finish State','ステート終了','结束状态'],'현재 상태':['Current State','現在のステート','当前状态'],
'커스텀 이벤트 보내기':['Trigger Custom Event','カスタムイベント送信','触发自定义事件'],'C# 메서드 부르기':['Call C# Method','C# メソッド呼び出し','调用 C# 方法'],
'변수 가져오기':['Get Variable','変数を取得','获取变量'],'변수 설정':['Set Variable','変数を設定','设置变量'],'변수에 더하기':['Add to Variable','変数に加算','变量加值'],
'숫자':['Number','数値','数字'],'글자':['Text','テキスト','文本'],'참 / 거짓':['Boolean','真偽','布尔'],'계산':['Math','計算','计算'],'비교':['Compare','比較','比较'],'그리고 / 또는':['And / Or','かつ / または','与 / 或'],'반대로 (Not)':['Not','Not','Not'],'글자 잇기':['Concat','文字列連結','拼接文本'],'무작위 숫자':['Random','ランダム','随机数'],'시간':['Time','時間','时间'],
'키를 누르고 있나':['Is Key Held','キー押下中?','按键是否按住'],'방향 입력':['Direction Input','方向入力','方向输入'],'자신 이름':['Self Name','自分の名前','自身名称'],'위치 가져오기':['Get Position','位置を取得','获取位置'],'주인공과의 거리':['Distance to Hero','主人公との距離','与主角距离'],'이동하기 (Translate)':['Translate','移動 (Translate)','移动 (Translate)'],'켜기 / 끄기 (SetActive)':['SetActive','SetActive','SetActive'],
'알림 메시지':['Show Message','通知メッセージ','提示消息'],'대화창 보이기':['Show Dialog','会話ウィンドウ表示','显示对话框'],'UI 화면 열기 / 닫기':['Show / Hide UI Screen','UI 画面 開く/閉じる','打开/关闭 UI 画面'],'UI 글자 바꾸기':['Set UI Text','UI テキスト変更','设置 UI 文本'],'UI 값 읽기':['Get UI Value','UI 値を取得','读取 UI 值'],'씬 불러오기':['Load Scene','シーン読み込み','加载场景'],'소지품 넣기 / 빼기':['Add / Remove Item','アイテム追加/削除','添加/移除物品'],'소지품 개수':['Item Count','アイテム数','物品数量'],
'그래프':['Graph','グラフ','图'],'그래프 변수':['Graph Variables','グラフ変数','图变量'],'이 그래프를 쓰는 곳':['Used by','このグラフの使用先','使用此图的对象'],'서로 이어 주기':['Connecting Everything','相互連携','相互连接'],
'상태 추가':['Add State','ステート追加','添加状态'],'스크립트 상태':['Script State','スクリプトステート','脚本状态'],'상위 상태':['Super State','スーパーステート','超级状态'],'안에 스크립트 그래프':['Contains a script graph','中にスクリプトグラフ','内含脚本图'],'안에 또 상태 그래프':['Contains a state graph','中にステートグラフ','内含状态图'],
'안으로 들어가기':['Open inside','中に入る','进入内部'],'시작 상태로':['Set as start','開始ステートにする','设为起始'],'시작 상태':['Start state','開始ステート','起始状态'],'시작':['Start','開始','开始'],'전환':['Transition','遷移','转换'],'전환 삭제':['Delete transition','遷移を削除','删除转换'],'상태 삭제':['Delete state','ステートを削除','删除状态'],'나가는 전환':['Outgoing transitions','出ていく遷移','传出转换'],
'언제':['When','いつ','何时'],'이벤트를 받으면':['On event','イベントを受けたら','收到事件时'],'시간이 지나면':['After time','時間が経ったら','时间经过后'],'상태가 끝나면':['When state finishes','ステート終了時','状态结束时'],'변수 조건':['Variable condition','変数条件','变量条件'],'키를 누르면':['On key press','キーを押したら','按键时'],'바로 (조건 없음)':['Immediately','すぐに','立即'],
'이름':['Name','名前','名称'],'종류':['Type','種類','类型'],'범위':['Scope','スコープ','范围'],'값':['Value','値','值'],'초':['Seconds','秒','秒'],'키':['Key','キー','按键'],'칸':['Tiles','マス','格'],
'오브젝트':['Object','オブジェクト','对象'],'씬':['Scene','シーン','场景'],'앱':['App','アプリ','应用'],'지금 값':['Live values','現在の値','当前值'],'지금 상태':['Current state','現在のステート','当前状态'],
'그래프 편집':['Edit Graph','グラフを編集','编辑图'],'그래프 변수 (처음 값)':['Graph variables (initial)','グラフ変数 (初期値)','图变量 (初始值)'],'컴포넌트 제거':['Remove component','コンポーネントを削除','移除组件'],
'새 스크립트 머신 (스크립트 그래프)…':['New Script Machine (Script Graph)…','新しいスクリプトマシン…','新建脚本机…'],'새 상태 머신 (상태 그래프)…':['New State Machine (State Graph)…','新しいステートマシン…','新建状态机…'],'노드로 만드는 스크립트 · 상태 머신':['Node-based scripts · State machines','ノードで作るスクリプト · ステートマシン','节点脚本 · 状态机'],
'전체 보기 (F)':['Frame all (F)','全体表示 (F)','全部显示 (F)'],'노드 목록 보이기/숨기기':['Toggle node library','ノード一覧の表示切替','显示/隐藏节点列表'],'속성 패널 보이기/숨기기':['Toggle properties','プロパティの表示切替','显示/隐藏属性'],'더 보기':['More','その他','更多'],
'비주얼 스크립트 — 노드를 선으로 이어 스크립트 머신 · 상태 머신을 만듭니다':['Visual Scripting — connect nodes to build Script Machines and State Machines','ビジュアルスクリプト — ノードをつないでスクリプトマシン・ステートマシンを作ります','可视化脚本 — 连接节点创建脚本机和状态机'],
'C# 스크립트 편집하기 — 스크립트 창을 열고, 현재 씬과 매니저의 스크립트를 계층 구조 그대로 골라 편집합니다':['Edit C# Scripts — open the Script window and pick scripts from the current scene and managers, laid out like the Hierarchy','C# スクリプト編集 — スクリプトウィンドウを開き、ヒエラルキーの形でスクリプトを選んで編集します','编辑 C# 脚本 — 打开脚本窗口，按层级结构选择脚本进行编辑'],
'노드를 선으로 이어 코드 없이 동작을 만들어요.':['Connect nodes with wires to build behaviour without code.','ノードを線でつないで、コードなしで動きを作ります。','用连线连接节点，无需代码即可创建行为。'],
'포트를 끌어 선으로 잇기 · 오른쪽 클릭으로 노드 추가 · 빈 곳을 끌면 화면 이동 · 휠로 확대':['Drag ports to connect · Right-click to add nodes · Drag empty space to pan · Wheel to zoom','ポートをドラッグして接続 · 右クリックでノード追加 · 空白ドラッグで移動 · ホイールで拡大','拖动端口连线 · 右键添加节点 · 拖动空白处平移 · 滚轮缩放'],
'상태를 더블클릭하면 안으로 · 오른쪽 ◉를 끌어 다른 상태에 놓으면 전환 · 오른쪽 클릭으로 상태 추가':['Double-click a state to open it · Drag the ◉ onto another state for a transition · Right-click to add states','ステートをダブルクリックで中へ · ◉ を別のステートへドラッグで遷移 · 右クリックでステート追加','双击状态进入 · 将 ◉ 拖到另一状态创建转换 · 右键添加状态']
});

/* ===================== 내보내기 ===================== */
return{open,close,render,has,msg,tick,playStart,playStop,csHook,compsHtml,menuItems,onPlayFrame,isVisible,
  get on(){return R.on},_R:R,_E:E,_NT:NT};
})()}
}
