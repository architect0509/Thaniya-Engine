/* ============================================================================
 * script-engine.js — Thaniya 공용 C# 스크립트 해석기
 *   index.html (엔진) 과 learning.html (학습) 이 함께 씁니다. 여기만 고치면 둘 다 바뀝니다.
 *
 *  [포함]  한글 스크립트(koCode / enToKo) · C# 선언 분석(parseCS) · 토큰/구문 분석 · 실행기 ·
 *          Vector/Mathf/Input/Time/Debug/Random 등 공용 표준 라이브러리(CS_STAT)
 *  [호스트가 CSHOST.use({...}) 로 넘겨야 하는 것]  (각 HTML의 "스크립트 해석기 연결" 부분)
 *     clog(type,msg,sid,det)   콘솔 출력
 *     get play()               플레이 상태 (Time/Input 용, 없으면 null)
 *     objOn(m,o)               오브젝트 활성 여부        isUiEl(o)   UI 요소인지
 *     startCamera(m)           시작 카메라 오브젝트
 *     goProxy / trProxy / camProxy(m,o)   GameObject·Transform·Camera 프록시
 *     csGetComp(m,o,T)         GetComponent<T>()          csDestroy(cx,x)  Destroy()
 *  [전역]  csCur  — 지금 실행 중인 컨텍스트 (호스트가 실행 전후로 대입)
 * ========================================================================== */
'use strict';
const CSHOST={
  clog(){},
  get play(){return null},
  objOn:()=>true,
  isUiEl:()=>false,
  startCamera:()=>null,
  goProxy(){throw csUnsup('GameObject')},
  trProxy(){throw csUnsup('Transform')},
  camProxy(){throw csUnsup('Camera')},
  csGetComp(m,o,T){throw csUnsup('GetComponent<'+T+'>()')},
  csDestroy(){throw csUnsup('Destroy()')},
  uiGo:false,          /* true: UI 요소도 gameObject(SetActive·activeSelf)로 다룸 */
  /* ---- 게임 세계 연결 (정적 클래스 Hero.main · Dialog · Message · Inventory · SceneManager · UIGroup) ----
     화면마다 자기 세계에 맞게 넘깁니다. 넘기지 않은 기능은 「아직 실행할 수 없습니다」로 알려 줍니다 */
  heroMain:null,       /* (m) → 주인공(Hero) 프록시 또는 null */
  say:null,            /* (이름, 문장) 대화창 열기 */
  dialogOpen:null,     /* () → 대화창이 열려 있는지 */
  dialogClose:null,    /* () 대화창 닫기 */
  message:null,        /* (문장, 초) 화면 알림 */
  inventory:null,      /* () → 소지품 객체 {이름: 개수} (플레이 중이 아니면 null) */
  loadScene:null,      /* (이름 또는 순번) */
  restartGame:null,    /* () 처음부터 다시 */
  sceneInfo:null,      /* (m) → {name, index} */
  uiGroupFind:null,    /* (m, 이름) → UI 그룹 프록시 또는 null */
  uiFind:null,         /* (m, 이름) → GameObject.Find 로 찾을 UI 요소·그룹 프록시 또는 null */
  uiGroupH:null,       /* (m, 그룹 id) → UI 그룹 프록시 (public UIGroup 필드) */
  sound:null,          /* ('get', 이름) 또는 ('call', 이름, 인자) — 정적 클래스 Sound (배경 음악 · 효과음) */
  uiScreen:null,       /* (메서드 이름, 인자) — 정적 클래스 UIScreen (UI 빌더로 만든 화면 열기·닫기 · 요소 글자·값) */
  vscript:null,        /* ('get'|'call', 이름, 인자, csCur) — 정적 클래스 VisualScript (비주얼 스크립트 머신과 이벤트 · 변수 · 상태 주고받기) */
  /* 호스트 함수 등록 (getter 도 그대로 복사) */
  use(h){Object.defineProperties(this,Object.getOwnPropertyDescriptors(h));return this}
};
const csPlay=()=>CSHOST.play;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* 주석(과 선택적으로 문자열 내용)을 공백으로 치환 — 인덱스는 그대로 유지 */
function csBlank(code,keepStr){
  let o='',i=0;const n=code.length;
  while(i<n){const c=code[i],d=code[i+1];
    if(c==='/'&&d==='/'){while(i<n&&code[i]!=='\n'){o+=' ';i++}continue}
    if(c==='/'&&d==='*'){o+='  ';i+=2;while(i<n&&!(code[i]==='*'&&code[i+1]==='/')){o+=code[i]==='\n'?'\n':' ';i++}o+='  ';i+=2;continue}
    if(c==='"'){o+='"';i++;while(i<n&&code[i]!=='"'&&code[i]!=='\n'){if(code[i]==='\\'&&i+1<n){o+=keepStr?code[i]+code[i+1]:'  ';i+=2;continue}o+=keepStr?code[i]:' ';i++}o+='"';i++;continue}
    o+=c;i++}
  return o.slice(0,n);
}
const CS_NUM={int:1,uint:1,long:1,ulong:1,short:1,ushort:1,byte:1,sbyte:1,float:0,double:0,decimal:0};
const CS_COLORS={red:'#ff0000',green:'#00ff00',blue:'#0000ff',white:'#ffffff',black:'#000000',yellow:'#ffeb04',cyan:'#00ffff',magenta:'#ff00ff',gray:'#808080',grey:'#808080'};
function csDefault(type,def){
  const d=(def||'').trim();
  if(type in CS_NUM){const v=parseFloat(d.replace(/[fFdDmMlLuU]+$/,''));return isNaN(v)?0:v}
  if(type==='bool')return /^true$/.test(d);
  if(type==='string'){const m=/^"((?:[^"\\]|\\.)*)"$/.exec(d);return m?m[1].replace(/\\n/g,'\n').replace(/\\"/g,'"'):''}
  if(type==='Vector2'||type==='Vector3'){const m=/\(([^)]*)\)/.exec(d),a=m?m[1].split(',').map(x=>parseFloat(x)||0):[];return[a[0]||0,a[1]||0]}
  if(type==='Color'){const m=/Color\.(\w+)/.exec(d);if(m&&CS_COLORS[m[1]])return CS_COLORS[m[1]];const n=/\(([^)]*)\)/.exec(d);if(n){const a=n[1].split(',').map(x=>clamp(parseFloat(x)||0,0,1));return'#'+[0,1,2].map(i=>Math.round((a[i]==null?1:a[i])*255).toString(16).padStart(2,'0')).join('')}return'#ffffff'}
  return null;
}
/* ===================== 한글 스크립트 (실험) =====================
   한글 단어를 C# 단어로 바꿔(koCode) 실행·검사하고, 반대로 C# 예제를 한글로 바꿔(enToKo) 보여 줍니다.
   한글·영어 코드는 섞어 써도 되며, 실행기는 항상 둘 다 인식합니다.
   문맥: '[' 뒤 = 특성 · '.' 뒤 = 멤버(앞 단어 종류별) · 뒤에 '(' '<' = 함수 · 그 밖 = 키워드·형식
   코드에서 변수로 선언한 한글 이름(예: 실수 시간 = 0;)은 바꾸지 않습니다. */
const KO_HAN=/[가-힣]/;
const KO_KW={공개:'public',비공개:'private',보호:'protected',내부:'internal',정적:'static',읽기전용:'readonly',상수:'const',클래스:'class',사용:'using',
  동작:'void',반환없음:'void',반환:'return',만약:'if',아니면:'else',동안:'while',반복:'for',각각:'foreach',하기:'do',중단:'break',계속:'continue',
  참:'true',거짓:'false',없음:'null',널:'null',새:'new',새로:'new',자신:'this',변수:'var'};
const KO_TY={정수:'int',실수:'float',배실수:'double',논리:'bool',문자열:'string',벡터2:'Vector2',벡터3:'Vector3',색:'Color',쿼터니언:'Quaternion',
  게임오브젝트:'GameObject',변환:'Transform',트랜스폼:'Transform',행동스크립트:'MonoBehaviour',주인공:'Hero',애니메이터:'Animator',오디오소스:'AudioSource',사운드:'Sound',입력:'Input',시간:'Time',수학:'Mathf',
  디버그:'Debug',무작위:'Random',랜덤:'Random',키코드:'KeyCode',카메라:'Camera',빛:'Light',볼륨:'Volume',몬스터:'Monster',엔피시:'Npc',아이템:'Item',포탈:'Portal',
  이벤트트리거:'EventTrigger',스프라이트렌더러:'SpriteRenderer',UI그룹:'UIGroup',UI화면:'UIScreen',비주얼스크립트:'VisualScript',텍스트:'Text',버튼:'Button',이미지:'Image',
  씬관리자:'SceneManager',애플리케이션:'Application',유니티엔진:'UnityEngine'};
const KO_SELF={내변환:'transform',내오브젝트:'gameObject',이오브젝트:'gameObject'};
const KO_CALL={컴포넌트가져오기:'GetComponent',출력:'print',파괴:'Destroy',깨어날때:'Awake',시작:'Start',업데이트:'Update',매프레임:'Update',
  고정업데이트:'FixedUpdate',늦은업데이트:'LateUpdate',켜질때:'OnEnable',꺼질때:'OnDisable',파괴될때:'OnDestroy',클릭시:'OnClick',
  마우스들어옴:'OnPointerEnter',마우스나감:'OnPointerExit',트리거들어옴:'OnTriggerEnter2D',트리거나감:'OnTriggerExit2D',충돌시:'OnCollisionEnter2D'};
const KO_ATTR={제목:'Header',범위:'Range',설명:'Tooltip',툴팁:'Tooltip',직렬화:'SerializeField',간격:'Space',숨김:'HideInInspector'};
const KO_MEM={위치:'position',지역위치:'localPosition',배율:'localScale',회전:'rotation',회전각:'eulerAngles',옮기기:'Translate',돌리기:'Rotate',
  자식가져오기:'GetChild',찾기:'Find',자식수:'childCount',부모:'parent',게임오브젝트:'gameObject',변환:'transform',이름:'name',태그:'tag',
  활성:'activeSelf',활성화:'SetActive',태그비교:'CompareTag',컴포넌트가져오기:'GetComponent',켜짐:'enabled',
  바라보는방향:'facing',바라보는각도:'facingAngle',체력:'hp',최대체력:'maxHp',이동중:'isMoving',반지름:'radius',이동:'Move',바라보기:'Face',
  이동가능:'CanMove',움직일수있음:'canMove',대사수:'lineCount',대사가져오기:'GetLine',대화하기:'Talk',공격:'Attack',색:'color',밝기:'intensity',퍼짐각:'angle',방향:'dir',그림자:'shadows',화면크기:'orthographicSize',
  맵밖가리기:'clampToMap',속도:'speed',감지범위:'range',수량:'qty',글자:'text',대사:'text',글자크기:'fontSize',투명도:'alpha',보임:'visible',
  값:'value',크기:'sizeDelta',길이:'magnitude',정규화:'normalized',정규화하기:'Normalize',글자수:'Length',대문자로:'ToUpper',
  소문자로:'ToLower',포함:'Contains',문자열로:'ToString',다듬기:'Trim',
  실수설정:'SetFloat',정수설정:'SetInteger',논리설정:'SetBool',트리거설정:'SetTrigger',트리거해제:'ResetTrigger'};
const KO_VEC={영:'zero',하나:'one',위:'up',아래:'down',왼쪽:'left',오른쪽:'right',거리:'Distance',보간:'Lerp',향해이동:'MoveTowards',내적:'Dot',길이제한:'ClampMagnitude'};
const KO_OWN={
  Debug:{출력:'Log',경고:'LogWarning',오류:'LogError'},
  Mathf:{절댓값:'Abs',사인:'Sin',코사인:'Cos',탄젠트:'Tan',아크사인:'Asin',아크코사인:'Acos',아크탄젠트:'Atan',아크탄젠트2:'Atan2',제곱근:'Sqrt',
    거듭제곱:'Pow',내림:'Floor',올림:'Ceil',반올림:'Round',부호:'Sign',최소:'Min',최대:'Max',제한:'Clamp',제한01:'Clamp01',보간:'Lerp',
    향해이동:'MoveTowards',정수반올림:'RoundToInt',정수내림:'FloorToInt',정수올림:'CeilToInt',원주율:'PI',도를라디안:'Deg2Rad',
    라디안을도:'Rad2Deg',무한대:'Infinity',되풀이:'Repeat',왕복:'PingPong'},
  Time:{프레임시간:'deltaTime',경과시간:'time',프레임수:'frameCount',시간배율:'timeScale',고정프레임시간:'fixedDeltaTime'},
  Input:{키누르는중:'GetKey',키눌렀을때:'GetKeyDown',키뗐을때:'GetKeyUp',축값:'GetAxis',축값즉시:'GetAxisRaw',버튼누르는중:'GetButton',
    버튼눌렀을때:'GetButtonDown',마우스누르는중:'GetMouseButton',마우스눌렀을때:'GetMouseButtonDown',아무키:'anyKey',마우스위치:'mousePosition'},
  Random:{범위:'Range',값:'value'},
  Vector2:KO_VEC,Vector3:KO_VEC,
  Color:{빨강:'red',초록:'green',파랑:'blue',하양:'white',흰색:'white',검정:'black',노랑:'yellow',청록:'cyan',자홍:'magenta',회색:'gray'},
  KeyCode:Object.assign({스페이스:'Space',엔터:'Return',이스케이프:'Escape',탭:'Tab',백스페이스:'Backspace',왼쪽시프트:'LeftShift',오른쪽시프트:'RightShift',
    왼쪽컨트롤:'LeftControl',오른쪽컨트롤:'RightControl',왼쪽알트:'LeftAlt',오른쪽알트:'RightAlt',위화살표:'UpArrow',아래화살표:'DownArrow',
    왼쪽화살표:'LeftArrow',오른쪽화살표:'RightArrow',마우스왼쪽:'Mouse0',마우스오른쪽:'Mouse1',마우스가운데:'Mouse2'},
    Object.fromEntries([0,1,2,3,4,5,6,7,8,9].map(n=>['숫자'+n,'Alpha'+n]))),
  Camera:{메인:'main'},
  GameObject:{찾기:'Find',태그로찾기:'FindWithTag'},
  UIGroup:{찾기:'Find'},
  UIScreen:{보이기:'Show',열기:'Show',숨기기:'Hide',닫기:'Hide',전환:'Toggle',열려있나:'IsOpen',글자바꾸기:'SetText',글자읽기:'GetText',값읽기:'GetValue',값바꾸기:'SetValue'},
  SceneManager:{씬불러오기:'LoadScene'},
  VisualScript:{이벤트보내기:'Trigger',모두에게보내기:'TriggerAll',대상에게보내기:'TriggerOn',변수읽기:'GetVariable',변수바꾸기:'SetVariable',상태바꾸기:'SetState',현재상태:'CurrentState'},
  Application:{종료:'Quit'},
  Quaternion:{오일러:'Euler',회전없음:'identity'}
};
const KO_FINDS=new Set(['찾기','태그로찾기','Find','FindWithTag']);
const KO_NODECL=new Set(['return','new','else','throw','case','in','is','as','await','yield','goto','using','class','namespace']);
const koRev=o=>{const r={};for(const k in o)if(!(o[k] in r))r[o[k]]=k;return r};
const KO_KW_R=koRev(KO_KW),KO_TY_R=koRev(KO_TY),KO_SELF_R=koRev(KO_SELF),KO_CALL_R=koRev(KO_CALL),KO_ATTR_R=koRev(KO_ATTR),KO_MEM_R=koRev(KO_MEM);
const KO_OWN_R={};for(const k in KO_OWN)KO_OWN_R[k]=koRev(KO_OWN[k]);
const koStandEn=w=>KO_SELF[w]||KO_KW[w]||KO_TY[w]||w;
const KO_IDC=/[\p{L}\p{N}_]/u,KO_IDS=/[\p{L}_]/u;
function koCtx(s,i,j){
  let a=i-1;while(a>=0&&/\s/.test(s[a]))a--;
  let b=j;while(b<s.length&&/\s/.test(s[b]))b++;
  let nw='';if(s[b]==='.'){const q=/^\s*([\p{L}_][\p{L}\p{N}_]*)/u.exec(s.slice(b+1,b+80));if(q)nw=q[1]}
  return{prev:a>=0?s[a]:'',pi:a,next:s[b]||'',nw};
}
/* 단어 하나씩 바꾸기: fn(word, ctx, owner) → 바꾼 단어 (owner = '.' 앞 단어를 바꾼 결과) */
function koWalk(code,fn){
  const bl=csBlank(code,false),re=/[\p{L}_][\p{L}\p{N}_]*/gu;let out='',last=0,prev=null,m;
  while((m=re.exec(bl))){
    const w=m[0],i=m.index,j=i+w.length;
    if(i>0&&/[0-9]/.test(bl[i-1]))continue;
    const c=koCtx(bl,i,j),owner=c.prev==='.'&&prev&&!bl.slice(prev.j,c.pi).trim()?prev.en:'';
    const t=fn(w,c,owner,bl);
    prev={j,en:/[A-Za-z_]/.test(t)&&!KO_HAN.test(t)?t:w};
    if(t!==w){out+=code.slice(last,i)+t;last=j}
  }
  return out+code.slice(last);
}
/* 한글 → C# (실행·검사·자동완성 해석에 사용) */
/* $"... {식} ..." 문자열 보간 구멍 안의 코드도 바꿈 */
const koHoles=(code,fn)=>code.replace(/\$"((?:[^"\\\n]|\\.)*)"/g,(q,b)=>'$"'+b.replace(/\{([^{}]+)\}/g,(z,e)=>{const k=e.search(/:[A-Za-z0-9.]+$/);return'{'+(k>0?fn(e.slice(0,k))+e.slice(k):fn(e))+'}'})+'"');
function koCode(code,decl0){
  if(!KO_HAN.test(code))return code;
  const decl=decl0||new Set(),bl=csBlank(code,false);let m;
  if(!decl0){const dr=/(?<![\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*)(?:\s*<[^<>;(){}]*>)?(?:\s*\[\s*\])?\s+([\p{L}_][\p{L}\p{N}_]*)\s*(?=[=;,)])/gu;
  while((m=dr.exec(bl))){if(!KO_NODECL.has(koStandEn(m[1])))decl.add(m[2])}}
  if(code.includes('$"'))code=koHoles(code,e=>koCode(e,decl));
  return koWalk(code,(w,c,owner)=>{
    if(!KO_HAN.test(w))return w;
    if(c.prev==='['&&KO_ATTR[w])return KO_ATTR[w];
    if(c.prev==='.'){const om=KO_OWN[owner];if(om&&om[w])return om[w];if(decl.has(w))return w;return KO_MEM[w]||w}
    const typeCtx=c.prev==='<'||c.next==='>'||KO_IDS.test(c.next);
    if(decl.has(w)&&!typeCtx){const te=KO_TY[w];if(!(c.next==='.'&&te&&KO_OWN[te]&&KO_OWN[te][c.nw]))return w}
    if(w==='게임오브젝트'&&c.next==='.')return KO_FINDS.has(c.nw)?'GameObject':'gameObject';
    if((w==='변환'||w==='트랜스폼')&&c.next==='.')return 'transform';
    if((c.next==='('||c.next==='<')&&KO_CALL[w])return KO_CALL[w];
    return koStandEn(w);
  });
}
/* C# → 한글 (예제·템플릿·자동완성 삽입에 사용) */
function enToKo(code){
  if(code.includes('$"'))code=koHoles(code,enToKo);
  return koWalk(code,(w,c,owner)=>{
    if(KO_HAN.test(w))return w;
    if(c.prev==='['&&KO_ATTR_R[w])return KO_ATTR_R[w];
    if(c.prev==='.')return (KO_OWN_R[owner]||{})[w]||KO_MEM_R[w]||w;
    if((c.next==='('||c.next==='<')&&KO_CALL_R[w])return KO_CALL_R[w];
    return KO_SELF_R[w]||KO_KW_R[w]||KO_TY_R[w]||w;
  }).replace(/"Horizontal"/g,'"가로"').replace(/"Vertical"/g,'"세로"');
}
/* 설명 글 속 형식 이름만 한글로 (예: "(KeyCode key) → bool" → "(키코드 key) → 논리") */
const koTypes=s=>String(s||'').replace(/[A-Za-z_]\w*/g,w=>KO_TY_R[w]||KO_KW_R[w]||w);
const CS_UIT=new Set(['RectTransform','Button','Text','Image','Slider','CanvasGroup','TMP_Text','TextMeshProUGUI']);
/* 인스펙터 슬롯(오브젝트를 끌어다 놓는 칸)이 되는 필드 형식 — 컴포넌트 형식이면 그 오브젝트의 컴포넌트(예: PlayableDirector)를 씀 */
const CS_OBJT=new Set(['GameObject','Transform','Light','Light2D','SpriteRenderer','MeshRenderer','Renderer','UIGroup','PlayableDirector','Animator','AudioSource','Volume','Rigidbody2D','BoxCollider2D','Collider2D','Rigidbody','BoxCollider','Collider','ParticleSystem',...CS_UIT]);
/* 내가 만든 스크립트 형식(예: public PlayerHealth player;)도 오브젝트 슬롯 — 호스트가 CSHOST.isScriptType 으로 알려 줌 */
const csKind=t=>CS_OBJT.has(t)||(typeof CSHOST.isScriptType==='function'&&/^[A-Z][\w]*$/.test(t)&&CSHOST.isScriptType(t))?'obj':t in CS_NUM?'num':t==='bool'?'bool':t==='string'?'str':t==='Vector2'||t==='Vector3'?'vec':t==='Color'?'color':'ref';
function parseCS(code){
  code=koCode(code);
  const res={cls:null,members:[],errs:[],methods:{},fields:[]},errs=res.errs;
  const clean=csBlank(code,false),nc=csBlank(code,true);
  const lineAt=i=>clean.slice(0,i).split('\n').length;
  const cm=/\bclass\s+([A-Za-z_À-￿][\wÀ-￿]*)/.exec(clean);
  if(!cm){errs.push({line:1,msg:'error CS1022: class 선언이 없습니다'});return res}
  res.cls=cm[1];
  const stack=[],pairs={')':'(',']':'[','}':'{'};
  for(let i=0;i<clean.length;i++){const c=clean[i];
    if('([{'.includes(c))stack.push([c,i]);
    else if(')]}'.includes(c)){const t=stack.pop();if(!t||t[0]!==pairs[c]){errs.push({line:lineAt(i),msg:`error CS1002: '${c}' 짝이 맞지 않습니다`});return res}}}
  if(stack.length){const t=stack[stack.length-1];errs.push({line:lineAt(t[1]),msg:`error CS1513: '${t[0]}' 가 닫히지 않았습니다 (} expected)`});return res}
  const open=clean.indexOf('{',cm.index);
  if(open<0){errs.push({line:lineAt(cm.index),msg:'error CS1514: { expected'});return res}
  let d=0,st=open+1,i=open+1;const n=clean.length;
  const stmt=(a,b,block)=>{
    let s=nc.slice(a,b).trim();if(!s)return;
    const line=lineAt(a+nc.slice(a,b).search(/\S/));
    const attrs=[];let m;
    while((m=/^\[\s*([A-Za-z_]\w*)\s*(?:\(([\s\S]*?)\))?\s*\]\s*/.exec(s))){attrs.push({n:m[1],a:m[2]||''});s=s.slice(m[0].length)}
    if(block){
      /* 'private T x = y' 다음에 ; 없이 메서드가 이어지면 (Unity: CS1002) */
      const hd=s.slice(0,Math.max(0,s.indexOf('(')));
      if(/=/.test(hd)){const eq=nc.indexOf('=',a);errs.push({line:lineAt(eq>=0?eq:a),msg:"error CS1002: ; expected — 필드 선언 끝에 ';'이(가) 빠졌습니다"});return}
      const mm=/([\p{L}_][\p{L}\p{N}_]*)\s*\(/u.exec(s);if(mm){res.methods[mm[1]]={body:nc.slice(a,b),line};if(mm[1]===res.cls)errs.push({line,msg:`error CS0542: '${mm[1]}': 멤버 이름은 바깥 클래스 이름과 같을 수 없습니다`})}return}
    const mods=[];while((m=/^(public|private|protected|internal|static|readonly|const|new|volatile)\s+/.exec(s))){mods.push(m[1]);s=s.slice(m[0].length)}
    if(!s&&attrs.length)return;
    /* 제네릭 형식 안의 공백 없애기: Dictionary<string, int> → Dictionary<string,int> */
    {let g=s.replace(/\s+/g,' '),k=0;while(/<[^<>=]*\s[^<>=]*>/.test(g)&&k++<5)g=g.replace(/<([^<>=]*)>/g,(q,b)=>'<'+b.replace(/\s+/g,'')+'>');s=g}
    const fm=/^([\p{L}_][\p{L}\p{N}_.<>,\[\]?]*)\s+([\p{L}_][\p{L}\p{N}_]*)\s*(?:=\s*([\s\S]+))?$/u.exec(s);
    if(!fm){if(s.includes('('))return;errs.push({line,msg:'error CS1002: ; expected'});return}
    const type=fm[1].replace(/\s/g,''),name=fm[2],def=fm[3];
    if(def&&/\b(public|private|protected|internal)\s/.test(def)){errs.push({line,msg:'error CS1002: ; expected'});return}
    const has=x=>attrs.find(q=>q.n===x),exposed=(mods.includes('public')||has('SerializeField'))&&!mods.includes('static')&&!mods.includes('const')&&!has('HideInInspector');
    res.fields.push({type,name,def,exposed,line});
    if(name===res.cls)errs.push({line,msg:`error CS0542: '${name}': 멤버 이름은 바깥 클래스 이름과 같을 수 없습니다 (클래스 '${res.cls}' 안에 같은 이름의 변수)`});
    if(def&&!mods.includes('static')&&!mods.includes('const')){const dm=/\b(transform|gameObject|GetComponent|this|name|tag|enabled)\b/.exec(def.replace(/"(?:[^"\\]|\\.)*"/g,'""'));
      if(dm)errs.push({line,msg:`error CS0236: 필드 이니셜라이저는 비정적 필드, 메서드 또는 속성 '${dm[1]}'을(를) 참조할 수 없습니다`})}
    if(!exposed)return;
    attrs.filter(q=>q.n==='Space').forEach(()=>res.members.push({kind:'space'}));
    attrs.filter(q=>q.n==='Header').forEach(q=>{const t=/"((?:[^"\\]|\\.)*)"/.exec(q.a);if(t)res.members.push({kind:'header',text:t[1]})});
    const f={kind:'field',type,name,fk:csKind(type),def:csDefault(type,def),line};
    const r=has('Range');if(r){const a=r.a.split(',').map(x=>parseFloat(x));if(a.length>=2&&!isNaN(a[0])&&!isNaN(a[1])){f.min=a[0];f.max=a[1]}}
    const tt=has('Tooltip');if(tt){const t=/"((?:[^"\\]|\\.)*)"/.exec(tt.a);if(t)f.tip=t[1]}
    res.members.push(f);
  };
  let blk=false;
  for(;i<n;i++){const c=clean[i];
    /* 맨 바깥의 { : 메서드 본문 · 단, 앞에 = 가 있으면 필드 초기값 (int[] a = {1, 2}; · new List<int> { 1 }) */
    if('([{'.includes(c)){if(d===0&&c==='{')blk=!/=/.test(clean.slice(st,i).replace(/\([^()]*\)/g,'').replace(/=>/g,''));d++}
    else if(')]}'.includes(c)){if(d===0)break;d--;if(d===0&&c==='}'&&blk){stmt(st,i+1,true);st=i+1;blk=false}}
    else if(c===';'&&d===0){stmt(st,i,false);st=i+1}
  }
  return res;
}
/* 같은 코드를 매번 다시 해석하지 않도록 플레이 중에만 쓰는 캐시 */
const csCache=new Map();
function parseCSc(code){let r=csCache.get(code);if(!r){r=parseCS(code);if(csCache.size>80)csCache.clear();csCache.set(code,r)}return r}
/* ===================== C# 실행기 (Start · Update · 이벤트 메서드) =====================
   메서드 본문을 토큰 → 구문 트리로 바꾼 뒤 직접 실행합니다 (eval 사용 안 함).
   지원: 지역 변수, 필드, if/else, while, do, for, return/break/continue, 산술·비교·논리 연산,
   Vector2/3 연산(+ - * /), 문자열 보간 $"...", 형변환 (int), 자기 메서드 호출,
   Input · Time · Mathf · Debug · Random · Vector2/3 · KeyCode · Camera.main · transform · GetComponent<Hero/Transform/Camera>()
   맨 바깥 문장이 여기서 지원하지 않는 기능(예: UI 텍스트, GameObject.Find)이면 기존 한 줄 실행기로 넘깁니다. */
class CsUnsup extends Error{}
const csErr=(msg,p)=>{const e=new Error(msg);e.p=p;return e};
const csUnsup=(msg,p)=>{const e=new CsUnsup(msg);if(p!=null)e.p=p;return e};
const CsV=(x,y,z,v3)=>({__v:1,x:+x||0,y:+y||0,z:+z||0,v3:!!v3});
const isCsV=v=>!!v&&v.__v===1;
/* Quaternion (2D 엔진이라 z축 회전만): deg = 각도(도) */
const CsQ=deg=>{const r=(+deg||0)*Math.PI/360;return{__q:1,x:0,y:0,z:Math.sin(r),w:Math.cos(r),deg:+deg||0}};
const isCsQ=v=>!!v&&v.__q===1;
const CS_KW=new Set(['return','new','else','if','while','for','foreach','do','switch','case','break','continue','throw','using','goto','yield','await','this','base','true','false','null','typeof','is','as','in','out','ref','default','try','catch','finally']);
const CS_OP3=['<<=','>>='],CS_OP2=['==','!=','<=','>=','&&','||','++','--','+=','-=','*=','/=','%=','=>','??'];
function csTok(src,from,to){
  const t=[];let i=from||0;const n=to==null?src.length:to;
  while(i<n){
    const c=src[i];
    if(/\s/.test(c)){i++;continue}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){
      const m=/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFdDmMlLuU]*/.exec(src.slice(i,i+40));
      let s=m[0];if(/\.$/.test(s.replace(/[fFdDmMlLuU]+$/,''))&&/[A-Za-z_]/.test(src[i+s.length]||''))s=s.slice(0,-1);
      t.push({k:'num',v:parseFloat(s),p:i,e:i+s.length});i+=s.length;continue}
    if(c==='"'||((c==='$'||c==='@')&&src[i+1]==='"')){
      const interp=c==='$',verb=c==='@';let j=i+(c==='"'?1:2),s='',dep=0;
      while(j<n&&(dep>0||src[j]!=='"')){
        if(interp){
          if(src[j]==='{'&&src[j+1]==='{'&&!dep){s+='{{';j+=2;continue}
          if(src[j]==='{'){dep++;s+='{';j++;continue}
          if(src[j]==='}'&&dep){dep--;s+='}';j++;continue}
          if(dep&&src[j]==='"'){let k=j+1;while(k<n&&src[k]!=='"'&&src[k]!=='\n'){if(src[k]==='\\')k++;k++}s+=src.slice(j,k+1);j=k+1;continue}
          if(dep){s+=src[j++];continue}
        }
        if(!verb&&src[j]==='\\'&&j+1<n){const e=src[j+1];s+=e==='n'?'\n':e==='t'?'\t':e==='r'?'':e;j+=2;continue}
        if(src[j]==='\n'&&!verb)throw csErr('문자열이 닫히지 않았습니다',i);
        s+=src[j++];
      }
      if(j>=n)throw csErr('문자열이 닫히지 않았습니다',i);
      t.push({k:interp?'istr':'str',v:s,p:i,e:j+1});i=j+1;continue}
    if(c==="'"){const m=/^'(\\.|[^'\\])'/.exec(src.slice(i,i+5));if(!m)throw csErr('문자 리터럴이 올바르지 않습니다',i);const ch=m[1].length>1?({n:'\n',t:'\t'}[m[1][1]]||m[1][1]):m[1];t.push({k:'str',v:ch,p:i,e:i+m[0].length});i+=m[0].length;continue}
    if(/[A-Za-z_\u0080-\uffff]/.test(c)){let j=i+1;while(j<n&&/[\w\u0080-\uffff]/.test(src[j]))j++;t.push({k:'id',v:src.slice(i,j),p:i,e:j});i=j;continue}
    const s3=src.slice(i,i+3),s2=src.slice(i,i+2);
    if(CS_OP3.includes(s3)){t.push({k:'op',v:s3,p:i,e:i+3});i+=3;continue}
    if(CS_OP2.includes(s2)){t.push({k:'op',v:s2,p:i,e:i+2});i+=2;continue}
    if('+-*/%<>=!&|?:.,;(){}[]^~'.includes(c)){t.push({k:'op',v:c,p:i,e:i+1});i++;continue}
    throw csErr(`알 수 없는 문자 '${c}'`,i);
  }
  return t;
}
function csParser(toks,src){
  let i=0;const N={k:'eof',v:'',p:src.length,e:src.length};
  const pk=(o=0)=>toks[i+o]||N;
  const is=(v,o=0)=>{const t=pk(o);return(t.k==='op'||t.k==='id')&&t.v===v};
  const err=(m,t)=>csErr(m,(t||pk()).p);
  const eat=v=>{if(!is(v))throw err(`'${v}'이(가) 필요합니다`);return toks[i++]};
  const typeLen=o=>{
    let j=o;if(pk(j).k!=='id'||CS_KW.has(pk(j).v))return 0;j++;
    while(is('.',j)&&pk(j+1).k==='id')j+=2;
    if(is('<',j)){let d=0;do{if(is('<',j))d++;else if(is('>',j))d--;else if(!(pk(j).k==='id'||is(',',j)||is('.',j)))return 0;j++}while(d>0&&pk(j).k!=='eof')}
    if(is('?',j)&&pk(j+1).k==='id')j++;
    while(is('[',j)&&is(']',j+1))j+=2;
    return j-o;
  };
  const isDecl=()=>{const L=typeLen(0);if(!L)return false;const n=pk(L);return n.k==='id'&&!CS_KW.has(n.v)&&(is('=',L+1)||is(';',L+1)||is(',',L+1))};
  function block(){const t0=eat('{');const b=[];while(!is('}')){if(pk().k==='eof')throw err("'}'이(가) 필요합니다",t0);b.push(stmt())}i++;return{t:'block',b,p:t0.p}}
  function stmt(){const s0=pk().p;const n=stmt0();if(n.p==null)n.p=s0;n.src=src.slice(s0,(toks[i-1]||N).e);n.y=csHasY(n);return n}
  /* foreach (var x in 목록) · foreach (Transform t in transform) */
  function foreachSt(){
    const t0=toks[i++];eat('(');let n=null;
    while(pk().k!=='eof'&&!is('in')){if(pk().k==='id')n=pk().v;i++}
    if(!n)throw err('foreach 변수 이름이 필요합니다',t0);eat('in');const e=expr();eat(')');
    return{t:'foreach',n,e,body:stmt(),p:t0.p};
  }
  /* switch (값) { case 1: case 2: ... break; default: ... } */
  function switchSt(){
    const t0=toks[i++];eat('(');const e=expr();eat(')');const ob=eat('{');const secs=[];let sec=null;
    while(!is('}')){
      if(pk().k==='eof')throw err("'}'이(가) 필요합니다",ob);
      if(is('case')||is('default')){
        const isDef=is('default');i++;const lab=isDef?null:expr();eat(':');
        if(!sec||sec.body.length){sec={labels:[],body:[]};secs.push(sec)}
        sec.labels.push(lab);continue;
      }
      if(!sec)throw err("switch 안에는 'case' 또는 'default'가 먼저 와야 합니다");
      sec.body.push(stmt());
    }
    i++;return{t:'switch',e,secs,p:t0.p};
  }
  /* try { } catch (Exception e) { } finally { } */
  function trySt(){
    const t0=toks[i++];const tb=block();let cn=null,cb=null,fb=null;
    if(is('catch')){i++;if(is('(')){i++;let last=null;while(pk().k!=='eof'&&!is(')')){if(pk().k==='id')last=pk().v;i++}eat(')');cn=last&&last!=='Exception'?last:null}cb=block()}
    if(is('finally')){i++;fb=block()}
    if(!cb&&!fb)throw err("try 뒤에는 catch 또는 finally가 필요합니다",t0);
    return{t:'try',tb,cn,cb,fb,p:t0.p};
  }
  function stmt0(){
    const t=pk();
    if(is('{'))return block();
    if(is(';')){i++;return{t:'nop'}}
    if(t.k==='id')switch(t.v){
      case'if':{i++;eat('(');const c=expr();eat(')');const a=stmt();let b=null;if(is('else')){i++;b=stmt()}return{t:'if',c,a,b}}
      case'while':{i++;eat('(');const c=expr();eat(')');return{t:'while',c,body:stmt()}}
      case'do':{i++;const body=stmt();eat('while');eat('(');const c=expr();eat(')');eat(';');return{t:'do',c,body}}
      case'for':{i++;eat('(');let init=null;if(!is(';'))init=isDecl()?decl():{t:'expr',e:expr()};eat(';');const c=is(';')?null:expr();eat(';');const st=[];if(!is(')')){do{st.push(expr())}while(is(',')&&++i)}eat(')');return{t:'for',init,c,st,body:stmt()}}
      case'return':{i++;const e=is(';')?null:expr();eat(';');return{t:'ret',e}}
      case'break':i++;eat(';');return{t:'brk'};
      case'continue':i++;eat(';');return{t:'cnt'};
      case'foreach':return foreachSt();
      case'switch':return switchSt();
      case'try':return trySt();
      case'throw':{i++;const e=is(';')?null:expr();eat(';');return{t:'throw',e}}
      case'yield':{i++;if(is('break')){i++;eat(';');return{t:'ybrk'}}eat('return');const e=is(';')?null:expr();eat(';');return{t:'yret',e}}
      case'goto':throw csUnsup(t.v+' 문',t.p);
    }
    /* const float X = 1; (지역 상수) */
    if(t.k==='id'&&t.v==='const'&&pk(1).k==='id'){i++;const d=decl();eat(';');return d}
    if(isDecl()){const d=decl();eat(';');return d}
    const e=expr();eat(';');return{t:'expr',e};
  }
  function decl(){
    const t0=pk(),L=typeLen(0),ty=toks.slice(i,i+L).map(x=>x.v).join('');i+=L;
    const vars=[];
    do{const n=pk();if(n.k!=='id')throw err('변수 이름이 필요합니다');i++;let e=null;if(is('=')){i++;e=is('{')?arrLit(ty):expr()}vars.push({n:n.v,e})}while(is(',')&&++i);
    return{t:'decl',ty,vars,p:t0.p};
  }
  function expr(){return asg()}
  function asg(){const l=tern();if(pk().k==='op'&&['=','+=','-=','*=','/=','%='].includes(pk().v)){const op=toks[i++].v;const r=asg();if(!['id','mem','idx'].includes(l.t))throw err('여기에는 값을 대입할 수 없습니다');return{t:'asg',op,l,r,p:l.p}}return l}
  function tern(){const c=bin(0);if(is('?')){i++;const a=asg();eat(':');const b=asg();return{t:'tern',c,a,b,p:c.p}}if(is('??')){i++;const b=asg();return{t:'coal',a:c,b,p:c.p}}return c}
  const PREC=[['||'],['&&'],['==','!='],['<','>','<=','>='],['+','-'],['*','/','%']];
  function bin(lv){if(lv>=PREC.length)return unary();let l=bin(lv+1);while(pk().k==='op'&&PREC[lv].includes(pk().v)){const op=toks[i++].v;const r=bin(lv+1);l={t:'bin',op,l,r,p:l.p}}return l}
  const CASTS=['int','float','double','long','short','byte','string','bool'];
  function unary(){
    const t=pk();
    if(t.k==='op'&&['!','-','+'].includes(t.v)){i++;return{t:'un',op:t.v,e:unary(),p:t.p}}
    if(is('++')||is('--')){i++;return{t:'pre',op:t.v,e:unary(),p:t.p}}
    if(is('(')&&pk(1).k==='id'&&CASTS.includes(pk(1).v)&&is(')',2)){const ty=pk(1).v;i+=3;return{t:'cast',ty,e:unary(),p:t.p}}
    return post();
  }
  /* out int v · out var v · out v · ref v (TryGetValue · int.TryParse 등) */
  function arg1(){
    if(is('out')||is('ref')){const t0=toks[i++];const L=typeLen(0);let decl=false;if(L&&pk(L).k==='id'){i+=L;decl=true}const n=pk();if(n.k!=='id')throw err('변수 이름이 필요합니다');i++;return{t:'out',n:n.v,decl,p:t0.p}}
    return expr();
  }
  function args(){const a=[];if(!is(')')){do{a.push(arg1())}while(is(',')&&++i)}eat(')');return a}
  /* { 1, 2, 3 } · { {"a", 1}, {"b", 2} } */
  function arrLit(ty){const t0=eat('{');const items=[];while(!is('}')){items.push(is('{')?arrLit(''):expr());if(!is(','))break;i++}eat('}');return{t:'arr',ty:String(ty||'').replace(/\[\]$/,''),items,p:t0.p}}
  /* 람다: () => 식 · x => 식 · (a, b) => { 문장 } */
  function lamAt(){
    if(pk().k==='id'&&!CS_KW.has(pk().v)&&is('=>',1))return 1;
    if(!is('('))return 0;let j=1;
    while(pk(j).k==='id'||is(',',j))j++;
    return is(')',j)&&is('=>',j+1)?j+1:0;
  }
  function lambda(){
    const t0=pk(),ps=[];
    if(is('(')){i++;while(!is(')')){const a=pk();if(a.k==='id'){if(pk(1).k==='id'){i++;continue}ps.push(a.v)}i++}i++}else{ps.push(toks[i++].v)}
    eat('=>');
    if(is('{'))return{t:'lam',ps,body:block(),blk:true,p:t0.p};
    return{t:'lam',ps,body:expr(),blk:false,p:t0.p};
  }
  function post(){
    let e=prim();
    for(;;){
      if(is('.')){i++;const n=pk();if(n.k!=='id')throw err('멤버 이름이 필요합니다');i++;
        if(is('<')&&pk(1).k==='id'&&is('>',2)&&is('(',3)){const ga=pk(1).v;i+=3;e={t:'mem',o:e,n:n.v,ga,p:e.p}}
        else e={t:'mem',o:e,n:n.v,p:e.p};continue}
      if(is('(')){const t0=toks[i++];e={t:'call',f:e,a:args(),p:e.p==null?t0.p:e.p};continue}
      if(is('[')){i++;const ix=expr();eat(']');e={t:'idx',o:e,i:ix,p:e.p};continue}
      if(is('++')||is('--')){e={t:'post',op:toks[i++].v,e,p:e.p};continue}
      break;
    }
    return e;
  }
  function prim(){
    const t=pk();
    if(t.k==='num'||t.k==='str'){i++;return{t:'lit',v:t.v,p:t.p}}
    if(t.k==='istr'){i++;return csIstr(t)}
    if(lamAt())return lambda();
    if(is('(')){i++;const e=expr();eat(')');return e}
    if(t.k==='id'){
      if(t.v==='true'||t.v==='false'){i++;return{t:'lit',v:t.v==='true',p:t.p}}
      if(t.v==='null'){i++;return{t:'lit',v:null,p:t.p}}
      if(t.v==='this'){i++;return{t:'this',p:t.p}}
      if(t.v==='new'){
        i++;let ty='';while(pk().k==='id'||(ty&&is('.'))){ty+=toks[i++].v}
        /* new int[] { 1, 2 } · new int[5] · new { } 없이 배열 초기화 */
        if(!ty&&is('[')&&is(']',1)&&is('{',2)){i+=2;return arrLit('')}
        if(!ty)throw err('형식 이름이 필요합니다');
        let ga='';
        if(is('<')){let d=0;do{const q=toks[i++];if(q.v==='<')d++;else if(q.v==='>')d--;ga+=q.v}while(d>0&&pk().k!=='eof');ga=ga.slice(1,-1)}
        if(is('[')){i++;if(is(']')){i++;if(!is('{'))throw err("'{'이(가) 필요합니다");return arrLit(ty)}const n=expr();eat(']');return{t:'newarr',ty,n,p:t.p}}
        let a=[];if(is('(')){i++;a=args()}else if(!is('{'))throw csUnsup('new '+ty,t.p);
        const init=is('{')?arrLit('').items:null;
        return{t:'new',ty,ga,a,init,p:t.p};
      }
      if(CS_KW.has(t.v))throw err(`'${t.v}'을(를) 여기에 쓸 수 없습니다`);
      i++;
      if(is('<')&&pk(1).k==='id'&&is('>',2)&&is('(',3)){const ga=pk(1).v;i+=3;return{t:'id',n:t.v,ga,p:t.p}}
      return{t:'id',n:t.v,p:t.p};
    }
    throw err(t.k==='eof'?'문장이 끝나지 않았습니다':`예상하지 못한 '${t.v}'`);
  }
  function exprOnly(){const e=expr();if(pk().k!=='eof')throw err(`예상하지 못한 '${pk().v}'`);return e}
  return{block,exprOnly,stmts:()=>{const b=[];while(pk().k!=='eof')b.push(stmt());return b}};
}
/* $"HP {hp} / 위치 {pos.x:F1}" */
function csIstr(t){
  const s=t.v,parts=[];let cur='',i=0;
  while(i<s.length){
    const c=s[i];
    if(c==='{'&&s[i+1]==='{'){cur+='{';i+=2;continue}
    if(c==='}'&&s[i+1]==='}'){cur+='}';i+=2;continue}
    if(c==='{'){
      let d=1,j=i+1;while(j<s.length&&d){if(s[j]==='"'){j++;while(j<s.length&&s[j]!=='"'){if(s[j]==='\\')j++;j++}j++;continue}if(s[j]==='{')d++;else if(s[j]==='}')d--;if(d)j++}
      if(d)throw csErr('문자열 보간의 { } 짝이 맞지 않습니다',t.p);
      let inner=s.slice(i+1,j),f=null;
      let pd=0,q=false;for(let k=0;k<inner.length;k++){const ch=inner[k];if(ch==='"'&&inner[k-1]!=='\\')q=!q;if(q)continue;if(ch==='(')pd++;else if(ch===')')pd--;else if(ch===':'&&pd===0&&!inner.slice(0,k).includes('?')){f=inner.slice(k+1).trim();inner=inner.slice(0,k);break}}
      if(cur)parts.push(cur);cur='';
      const e=csParser(csTok(inner),inner).exprOnly();parts.push({e,f});i=j+1;continue;
    }
    cur+=c;i++;
  }
  if(cur)parts.push(cur);
  return{t:'istr',parts,p:t.p};
}
function csFmt(v,f){
  if(f&&typeof v==='number'){const m=/^[FfNn](\d*)$/.exec(f);if(m)return v.toFixed(m[1]===''?2:+m[1]);if(/^0(\.0+)?$/.test(f))return v.toFixed((f.split('.')[1]||'').length)}
  if(v==null)return'';
  if(typeof v==='boolean')return v?'True':'False';
  if(typeof v==='number')return Number.isInteger(v)?String(v):String(+v.toFixed(6));
  if(isCsV(v))return'('+v.x.toFixed(2)+', '+v.y.toFixed(2)+(v.v3?', '+v.z.toFixed(2):'')+')';
  if(isCsQ(v))return'('+[v.x,v.y,v.z,v.w].map(q=>q.toFixed(5)).join(', ')+')';
  if(v.__h)return v.name||v.__h;
  if(isCsL(v))return v.arr?`${v.ty||'object'}[${v.a.length}]`:`${v.kind||'List'}<${v.ty||'T'}> (Count = ${v.a.length})`;
  if(isCsD(v))return`Dictionary<${v.ty||'K,V'}> (Count = ${v.m.size})`;
  if(v.__fn)return'(람다)';if(v.__w)return'Wait';if(v.__ex)return'Exception: '+v.msg;
  return String(v);
}
/* RaycastHit2D 처럼 「맞은 것이 없으면 거짓」인 결과는 __falsy 로 표시 (if (hit) 가 false) */
const csTruth=v=>!!v&&!(typeof v==='object'&&v.__falsy);
function csN(v){
  if(typeof v==='number')return v;
  if(v==null)throw new Error('null 값은 숫자로 쓸 수 없습니다');
  if(typeof v==='boolean')throw new Error('true/false 값은 숫자로 쓸 수 없습니다');
  if(isCsV(v))throw new Error('벡터는 숫자로 쓸 수 없습니다 (.x / .y 를 쓰세요)');
  if(isCsQ(v))throw new Error("error CS0029: 'Quaternion' 형식을 'float' 형식으로 암시적으로 변환할 수 없습니다 (각도가 필요하면 .eulerAngles.z 를 쓰세요)");
  throw new Error(`'${csFmt(v)}'은(는) 숫자가 아닙니다`);
}
function csEq(a,b){
  if(isCsV(a)&&isCsV(b))return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1e-5;
  if(a&&b&&a.__h&&b.__h&&a.__o&&a.__h===b.__h)return a.__o===b.__o;
  if(a==null||b==null)return a==null&&b==null;
  return a===b;
}
function csBin(op,a,b){
  if(op==='+'&&(typeof a==='string'||typeof b==='string'))return csFmt(a)+csFmt(b);
  if(op==='=='||op==='!='){const q=csEq(a,b);return op==='=='?q:!q}
  const va=isCsV(a),vb=isCsV(b);
  if(va||vb){
    const v3=(va&&a.v3)||(vb&&b.v3);
    if(va&&vb&&op==='+')return CsV(a.x+b.x,a.y+b.y,a.z+b.z,v3);
    if(va&&vb&&op==='-')return CsV(a.x-b.x,a.y-b.y,a.z-b.z,v3);
    if(op==='*'&&va&&!vb){const k=csN(b);return CsV(a.x*k,a.y*k,a.z*k,v3)}
    if(op==='*'&&vb&&!va){const k=csN(a);return CsV(b.x*k,b.y*k,b.z*k,v3)}
    if(op==='/'&&va&&!vb){const k=csN(b);return CsV(a.x/k,a.y/k,a.z/k,v3)}
    throw new Error(`벡터에는 '${op}' 연산을 쓸 수 없습니다`);
  }
  const x=csN(a),y=csN(b);
  switch(op){case'+':return x+y;case'-':return x-y;case'*':return x*y;case'/':return x/y;case'%':return x%y;case'<':return x<y;case'>':return x>y;case'<=':return x<=y;case'>=':return x>=y}
  throw csUnsup(`'${op}' 연산`);
}
function csZero(ty){
  if(/^(int|uint|long|ulong|short|ushort|byte|sbyte|float|double|decimal)$/.test(ty))return 0;
  if(ty==='bool')return false;
  if(ty==='Vector2'||ty==='Vector3')return CsV(0,0,0,ty==='Vector3');
  return null;
}
/* ===================== 목록 (List<T> · 배열 T[] · Dictionary<K,V>) ===================== */
const CsL=(a,ty,arr)=>({__l:1,a,ty:ty||'',arr:!!arr});
const isCsL=v=>!!v&&v.__l===1;
const CsD=(ty)=>({__d:1,m:new Map(),ty:ty||''});
const isCsD=v=>!!v&&v.__d===1;
/* Dictionary 키: 게임 오브젝트 프록시는 매번 새로 만들어지므로 실제 오브젝트로 비교 */
const csKey=k=>k&&typeof k==='object'?(k.__o||(isCsV(k)?'v:'+k.x+','+k.y+','+k.z:k)):k;
const csKV=(k,v)=>csH('KeyValuePair',n=>{if(n==='Key')return k;if(n==='Value')return v;throw csUnsup('KeyValuePair.'+n)});
function csElemZero(ty){ty=String(ty||'');return csZero(ty)!=null?csZero(ty):ty==='string'?null:null}
/* 배열 길이를 넘는 번호 */
function csIdxOk(l,k){const n=csN(k);if(!Number.isInteger(n)||n<0||n>=l.a.length)throw new Error(l.arr?`IndexOutOfRangeException: 번호 ${n}은(는) 배열 범위(0 ~ ${l.a.length-1})를 벗어났습니다`:`ArgumentOutOfRangeException: 번호 ${n}은(는) 목록 범위(0 ~ ${l.a.length-1})를 벗어났습니다 (Count = ${l.a.length})`);return n}
function csCmp(a,b){if(typeof a==='number'&&typeof b==='number')return a-b;const x=csFmt(a),y=csFmt(b);return x<y?-1:x>y?1:0}
/* 반복 가능한 값 → 배열 (foreach) */
function csIter(v){
  if(v==null)throw new Error('NullReferenceException: foreach 할 목록이 null 입니다');
  if(isCsL(v))return v.a.slice();
  if(isCsD(v))return[...v.m.values()].map(([k,x])=>csKV(k,x));
  if(typeof v==='string')return[...v];
  if(v.__h&&typeof v.iter==='function')return v.iter();
  throw new Error(`'${csFmt(v)}'은(는) foreach 로 하나씩 꺼낼 수 없습니다 (List · 배열 · Dictionary · transform)`);
}
/* 람다·대리자 호출: (x) => x > 3 */
function csInvoke(fn,args){
  if(!fn)throw new Error('NullReferenceException: 실행할 함수가 null 입니다');
  if(fn.__mref){return csCallUser(fn.cx,fn.n,args||[])}
  if(!fn.__fn)throw new Error(`'${csFmt(fn)}'은(는) 함수가 아닙니다`);
  const cx=fn.cx,sv=cx.scopes;cx.scopes=fn.scopes.concat([new Map(fn.ps.map((p,k)=>[p,(args||[])[k]]))]);
  try{
    if(!fn.blk)return csE(fn.body,cx);
    try{for(const s of fn.body.b)csX(s,cx);return undefined}catch(e){if(e&&e.__c==='ret')return e.v;throw e}
  }finally{cx.scopes=sv}
}
function csListM(l,n,a,cx){
  const A=l.a;
  if(l.kind==='Queue'||l.kind==='Stack'){
    const emp=()=>{if(!A.length)throw new Error(`InvalidOperationException: ${l.kind==='Queue'?'큐':'스택'}가 비어 있습니다 (Count 를 먼저 확인하세요)`)};
    if(n==='Enqueue'||n==='Push'){A.push(a[0]);return null}
    if(n==='Dequeue'){emp();return A.shift()}if(n==='Pop'){emp();return A.pop()}
    if(n==='Peek'){emp();return l.kind==='Queue'?A[0]:A[A.length-1]}
  }
  if(l.kind==='HashSet'&&n==='Add'){if(A.some(x=>csEq(x,a[0])))return false;A.push(a[0]);return true}
  if(l.arr&&!['Contains','IndexOf','ToList','ToArray','ToString','GetLength','Clone','CopyTo'].includes(n))throw new Error(`배열에는 ${n}()이(가) 없습니다 — 크기를 바꾸려면 List<${l.ty||'T'}>을(를) 쓰세요`);
  switch(n){
    case'Add':A.push(a[0]);return null;
    case'AddRange':A.push(...csIter(a[0]));return null;
    case'Insert':{const k=csN(a[0]);if(k<0||k>A.length)throw new Error(`ArgumentOutOfRangeException: Insert 위치 ${k}`);A.splice(k,0,a[1]);return null}
    case'Remove':{const k=A.findIndex(x=>csEq(x,a[0]));if(k<0)return false;A.splice(k,1);return true}
    case'RemoveAt':{const k=csIdxOk(l,a[0]);A.splice(k,1);return null}
    case'RemoveRange':{A.splice(csN(a[0]),csN(a[1]));return null}
    case'RemoveAll':{let c=0;for(let k=A.length-1;k>=0;k--)if(csTruth(csInvoke(a[0],[A[k]]))){A.splice(k,1);c++}return c}
    case'Clear':A.length=0;return null;
    case'Contains':return A.some(x=>csEq(x,a[0]));
    case'IndexOf':return A.findIndex(x=>csEq(x,a[0]));
    case'LastIndexOf':{for(let k=A.length-1;k>=0;k--)if(csEq(A[k],a[0]))return k;return-1}
    case'Find':{const x=A.find(q=>csTruth(csInvoke(a[0],[q])));return x===undefined?csElemZero(l.ty):x}
    case'FindIndex':return A.findIndex(q=>csTruth(csInvoke(a[0],[q])));
    case'FindAll':return CsL(A.filter(q=>csTruth(csInvoke(a[0],[q]))),l.ty);
    case'Exists':return A.some(q=>csTruth(csInvoke(a[0],[q])));
    case'TrueForAll':return A.every(q=>csTruth(csInvoke(a[0],[q])));
    case'ForEach':A.slice().forEach(q=>csInvoke(a[0],[q]));return null;
    case'Sort':if(a.length)A.sort((x,y)=>csN(csInvoke(a[0],[x,y])));else A.sort(csCmp);return null;
    case'Reverse':A.reverse();return null;
    case'ToArray':return CsL(A.slice(),l.ty,true);
    case'ToList':return CsL(A.slice(),l.ty);
    case'Clone':return CsL(A.slice(),l.ty,l.arr);
    case'GetRange':return CsL(A.slice(csN(a[0]),csN(a[0])+csN(a[1])),l.ty);
    case'ToString':return csFmt(l);
    case'GetLength':return A.length;
  }
  throw csUnsup((l.arr?'배열.':'List.')+n+'()');
}
function csDictM(d,n,a){
  const M=d.m;
  switch(n){
    case'Add':{const k=csKey(a[0]);if(M.has(k))throw new Error(`ArgumentException: 같은 키 '${csFmt(a[0])}'이(가) 이미 있습니다 (값을 바꾸려면 dict[키] = 값)`);M.set(k,[a[0],a[1]]);return null}
    case'ContainsKey':return M.has(csKey(a[0]));
    case'ContainsValue':return[...M.values()].some(([,v])=>csEq(v,a[0]));
    case'Remove':return M.delete(csKey(a[0]));
    case'Clear':M.clear();return null;
    case'TryGetValue':{const q=M.get(csKey(a[0]));if(a[1]&&a[1].__out)a[1].set(q?q[1]:null);return!!q}
    case'TryAdd':{const k=csKey(a[0]);if(M.has(k))return false;M.set(k,[a[0],a[1]]);return true}
    case'GetValueOrDefault':{const q=M.get(csKey(a[0]));return q?q[1]:(a.length>1?a[1]:null)}
    case'ToString':return csFmt(d);
  }
  throw csUnsup('Dictionary.'+n+'()');
}
/* 구문 안에 yield 가 있는지 (코루틴은 yield 가 있는 문장만 멈출 수 있게 따로 실행) */
function csHasY(n){
  if(!n)return false;
  switch(n.t){
    case'yret':case'ybrk':return true;
    case'block':return n.b.some(x=>x.y);
    case'if':return!!(n.a&&n.a.y)||!!(n.b&&n.b.y);
    case'while':case'do':case'for':case'foreach':return!!(n.body&&n.body.y);
    case'switch':return n.secs.some(s=>s.body.some(x=>x.y));
    case'try':return!!(n.tb.y||(n.cb&&n.cb.y)||(n.fb&&n.fb.y));
  }
  return false;
}
/* 예외 (throw new Exception("…") · try/catch) */
class CsThrown extends Error{}
const csExProxy=msg=>csH('Exception',n=>{if(n==='Message')return msg;throw csUnsup('Exception.'+n)},(n)=>{if(n==='ToString')return'Exception: '+msg;throw csUnsup('Exception.'+n+'()')});
/* 필드 처음 값 (목록 · 배열 · Dictionary 같은 참조 형식): 초기값 식을 실행해서 만들고,
   초기값이 없으면 공개(public) 배열·List 는 빈 목록 (유니티 인스펙터가 만들어 주는 것처럼) · 비공개는 null */
function csInitRef(fd){
  const ty=String(fd.type||'').replace(/\s/g,''),def=String(fd.def||'').trim();
  if(def){
    try{
      const src=def.startsWith('{')?'new '+(ty.replace(/\[\]$/,'')||'object')+'[]'+def:def;
      const node=csParser(csTok(src),src).exprOnly();
      const cx={m:null,o:{name:''},inst:null,rt:{f:{},ty:{}},pr:{r:{methods:{}}},dt:0,scopes:[new Map()],me:null,depth:0,loops:0,s:{name:'',id:''}};
      const prev=csCur;csCur=cx;try{return csE(node,cx)}finally{csCur=prev}
    }catch(e){return null}
  }
  if(!fd.exposed)return null;
  if(/\[\]$/.test(ty))return CsL([],ty.slice(0,-2),true);
  const g=/^(List|HashSet|Queue|Stack)<(.*)>$/.exec(ty);if(g){const l=CsL([],g[2]);if(g[1]!=='List')l.kind=g[1];return l}
  const d=/^Dictionary<(.*)>$/.exec(ty);if(d)return CsD(d[1]);
  return null;
}
/* 코드 해석 결과 캐시 (같은 코드는 한 번만 해석) */
const csProgs=new Map();
function csProg(code){let p=csProgs.get(code);if(!p){p={r:parseCSc(code),ast:{}};if(csProgs.size>60)csProgs.clear();csProgs.set(code,p)}return p}
function csMethodAst(pr,name){
  if(pr.ast[name])return pr.ast[name];
  const me=pr.r.methods[name];if(!me)return null;
  const body=me.body,ob=body.indexOf('{');let res;
  const pm=/\(([^)]*)\)/.exec(body.slice(0,ob<0?body.length:ob));
  const params=pm&&pm[1].trim()?pm[1].split(',').map(x=>{const w=x.replace(/=.*$/,'').trim().split(/\s+/);return w[w.length-1]}):[];
  try{if(ob<0)throw csErr('{ 가 필요합니다',0);const P=csParser(csTok(body,ob),body);const blk=P.block();res={params,body:blk.b,me}}
  catch(e){res={err:e,me,params}}
  return pr.ast[name]=res;
}
const csLine=(me,p)=>{if(!me||p==null)return null;const b=me.body,f=Math.max(0,b.search(/\S/));return me.line+((b.slice(f,Math.max(f,p)).match(/\n/g)||[]).length)};
/* 실행 */
let csCur=null;
function csX(st,cx){
  try{csX0(st,cx)}
  catch(e){if(e&&typeof e==='object'&&!e.__c&&e.line==null&&st.p!=null)e.line=csLine(cx.me,st.p);throw e}
}
function csLoop(cx){if(++cx.loops>200000)throw new Error('반복이 너무 많습니다 (무한 반복인지 확인하세요)')}
function csX0(st,cx){
  switch(st.t){
    case'nop':return;
    case'block':{cx.scopes.push(new Map());try{for(const s of st.b)csX(s,cx)}finally{cx.scopes.pop()}return}
    case'decl':{const sc=cx.scopes[cx.scopes.length-1];st.vars.forEach(v=>sc.set(v.n,v.e?csE(v.e,cx):csZero(st.ty)));return}
    case'expr':csE(st.e,cx);return;
    case'if':if(csTruth(csE(st.c,cx)))csX(st.a,cx);else if(st.b)csX(st.b,cx);return;
    case'while':while(csTruth(csE(st.c,cx))){csLoop(cx);try{csX(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(e&&e.__c==='cnt')continue;throw e}}return;
    case'do':do{csLoop(cx);try{csX(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}}while(csTruth(csE(st.c,cx)));return;
    case'for':{
      cx.scopes.push(new Map());
      try{
        if(st.init){if(st.init.t==='decl')csX0(st.init,cx);else csE(st.init.e,cx)}
        while(!st.c||csTruth(csE(st.c,cx))){
          csLoop(cx);
          try{csX(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}
          st.st.forEach(x=>csE(x,cx));
        }
      }finally{cx.scopes.pop()}
      return;
    }
    case'ret':throw{__c:'ret',v:st.e?csE(st.e,cx):undefined};
    case'brk':throw{__c:'brk'};
    case'cnt':throw{__c:'cnt'};
    case'foreach':{
      const items=csIter(csE(st.e,cx));cx.scopes.push(new Map());
      try{for(const it of items){csLoop(cx);cx.scopes[cx.scopes.length-1].set(st.n,it);try{csX(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}}}
      finally{cx.scopes.pop()}
      return;
    }
    case'switch':{
      const k=csSwitchAt(st,cx);if(k<0)return;cx.scopes.push(new Map());
      try{for(let j=k;j<st.secs.length;j++)for(const s of st.secs[j].body)csX(s,cx)}
      catch(e){if(e&&e.__c==='brk')return;throw e}
      finally{cx.scopes.pop()}
      return;
    }
    case'throw':{const v=st.e?csE(st.e,cx):null;const msg=v&&v.__ex?v.msg:csFmt(v);const e=new CsThrown('Exception: '+msg);e.exMsg=msg;throw e}
    case'try':{
      try{csX(st.tb,cx)}
      catch(e){
        if(!st.cb||(e&&e.__c)||e instanceof CsUnsup)throw e;
        cx.scopes.push(new Map(st.cn?[[st.cn,csExProxy(e.exMsg!=null?e.exMsg:String(e&&e.message||e))]]:[]));
        try{csX(st.cb,cx)}finally{cx.scopes.pop()}
      }
      finally{if(st.fb)csX(st.fb,cx)}
      return;
    }
    case'yret':case'ybrk':throw new Error('yield 는 IEnumerator 를 돌려주는 메서드(코루틴) 안에서만 쓸 수 있습니다 — StartCoroutine(메서드이름())으로 시작하세요');
  }
  throw csUnsup(st.t);
}
/* switch: 맞는 case 칸 번호 (없으면 default · 그것도 없으면 -1) */
function csSwitchAt(st,cx){
  const v=csE(st.e,cx);let def=-1;
  for(let j=0;j<st.secs.length;j++)for(const lab of st.secs[j].labels){if(lab===null){def=j;continue}if(csEq(v,csE(lab,cx)))return j}
  return def;
}
/* ===================== 코루틴 (IEnumerator · yield return) =====================
   yield 가 들어 있는 문장만 생성기(function*)로 실행해서 멈췄다가 다음 프레임에 이어 갑니다 */
function* csXG(st,cx){
  if(!st.y){csX(st,cx);return}
  try{yield* csXG0(st,cx)}
  catch(e){if(e&&typeof e==='object'&&!e.__c&&e.line==null&&st.p!=null)e.line=csLine(cx.me,st.p);throw e}
}
function* csXG0(st,cx){
  switch(st.t){
    case'yret':yield st.e?csE(st.e,cx):null;return;
    case'ybrk':throw{__c:'ybrk'};
    case'block':{cx.scopes.push(new Map());try{for(const s of st.b)yield* csXG(s,cx)}finally{cx.scopes.pop()}return}
    case'if':if(csTruth(csE(st.c,cx)))yield* csXG(st.a,cx);else if(st.b)yield* csXG(st.b,cx);return;
    case'while':while(csTruth(csE(st.c,cx))){csLoop(cx);try{yield* csXG(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(e&&e.__c==='cnt')continue;throw e}}return;
    case'do':do{csLoop(cx);try{yield* csXG(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}}while(csTruth(csE(st.c,cx)));return;
    case'for':{
      cx.scopes.push(new Map());
      try{
        if(st.init){if(st.init.t==='decl')csX0(st.init,cx);else csE(st.init.e,cx)}
        while(!st.c||csTruth(csE(st.c,cx))){
          csLoop(cx);
          try{yield* csXG(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}
          st.st.forEach(x=>csE(x,cx));
        }
      }finally{cx.scopes.pop()}
      return;
    }
    case'foreach':{
      const items=csIter(csE(st.e,cx));cx.scopes.push(new Map());
      try{for(const it of items){csLoop(cx);cx.scopes[cx.scopes.length-1].set(st.n,it);try{yield* csXG(st.body,cx)}catch(e){if(e&&e.__c==='brk')break;if(!(e&&e.__c==='cnt'))throw e}}}
      finally{cx.scopes.pop()}
      return;
    }
    case'switch':{
      const k=csSwitchAt(st,cx);if(k<0)return;cx.scopes.push(new Map());
      try{for(let j=k;j<st.secs.length;j++)for(const s of st.secs[j].body)yield* csXG(s,cx)}
      catch(e){if(e&&e.__c==='brk')return;throw e}
      finally{cx.scopes.pop()}
      return;
    }
    case'try':{
      try{yield* csXG(st.tb,cx)}
      catch(e){
        if(!st.cb||(e&&e.__c)||e instanceof CsUnsup)throw e;
        cx.scopes.push(new Map(st.cn?[[st.cn,csExProxy(e.exMsg!=null?e.exMsg:String(e&&e.message||e))]]:[]));
        try{yield* csXG(st.cb,cx)}finally{cx.scopes.pop()}
      }
      finally{if(st.fb)yield* csXG(st.fb,cx)}
      return;
    }
  }
  csX0(st,cx);
}
/* IEnumerator 메서드인지 (메서드 이름 앞의 반환 형식) */
function csIsIter(me){if(!me)return false;const b=me.body,k=b.indexOf('(');return/\bIEnumerator\b/.test(b.slice(0,k<0?b.length:k))}
/* 코루틴 객체 만들기: 메서드를 부르기만 하면 아직 실행하지 않고, StartCoroutine 이 시작합니다 (유니티와 같음) */
function csCoMake(cx,n,ast,args){
  const cx2=Object.assign({},cx,{scopes:[new Map(ast.params.map((p,k)=>[p,args[k]]))],me:ast.me,depth:0,loops:0});
  const gen=(function*(){
    try{for(const s of ast.body)yield* csXG(s,cx2)}
    catch(e){if(e&&(e.__c==='ybrk'||e.__c==='ret'))return;throw e}
  })();
  return{__co:1,__h:'Coroutine',name:n,gen,cx:cx2,done:false,started:false,wait:null,get(q){throw csUnsup('Coroutine.'+q)},call(q){throw csUnsup('Coroutine.'+q+'()')},set(q){throw csUnsup('Coroutine.'+q)}};
}
/* 기다리기 명령 (yield return 값) → 기다림 정보 */
function csWaitOf(v,co){
  if(v==null||v===false)return{k:'frame'};
  if(v.__w)return Object.assign({},v);
  if(v.__co){if(!v.started)CSCO.start(v,v.cx);return{k:'co',co:v}}
  if(typeof v==='number')return{k:'frame'};
  void co;return{k:'frame'};
}
/* 코루틴 · Invoke · 늦춘 Destroy 를 한곳에서 돌리는 스케줄러 — 호스트가 매 프레임 CSCO.tick(dt, 실제dt) 를 부름 */
const CSCO={
  L:[],
  frame(){const p=csPlay();return p&&p.frame||0},
  start(co,cx){
    if(!co||!co.__co)throw new Error('StartCoroutine에는 IEnumerator 메서드를 불러서 넣으세요 (예: StartCoroutine(Blink()))');
    if(co.started)return co;co.started=true;co.owner=cx||co.cx;this.L.push(co);this.step(co);return co;
  },
  step(co){
    if(co.done)return;const prev=csCur;csCur=co.cx;co.cx.loops=0;co.at=this.frame();let r;
    try{r=co.gen.next()}
    catch(e){co.done=true;csCur=prev;this.err(co.cx,co.name+'() 코루틴',e);return}
    csCur=prev;
    if(r.done){co.done=true;return}
    co.wait=csWaitOf(r.value,co);
  },
  err(cx,what,e){
    if(e&&e.__c)return;
    const msg=e instanceof CsUnsup?'이 구문은 아직 실행할 수 없습니다: '+e.message:(e&&e.message)||String(e);
    const s=cx&&cx.s;CSHOST.clog('error',`[${s?s.name:'?'}] ${what}${e&&e.line?' '+e.line+'번째 줄':''}: ${msg}`,s&&s.id,{kind:'runtime',fn:what,line:e&&e.line||0,stmt:'',err:msg});
  },
  /* 시간 기다림 · Invoke 예약 */
  timer(t,fn,rate,tag){const q={tm:1,t:Math.max(0,t),fn,rate:rate>0?Math.max(.01,rate):0,tag:tag||null,done:false};this.L.push(q);return q},
  alive(x){if(!csPlay()&&typeof CSHOST.coAlive!=='function')return true;if(x.keep)return!!csPlay();const cx=x.cx||x.owner;return!cx||typeof CSHOST.coAlive!=='function'||CSHOST.coAlive(cx,x.tm?'timer':'co')},
  tick(dt,udt){
    const f=this.frame();
    for(const q of this.L.slice()){
      if(q.done)continue;
      if(!this.alive(q)){q.done=true;continue}
      if(q.tm){q.t-=q.real?udt:dt;if(q.t>0)continue;
        try{q.fn()}catch(e){this.err(q.cx,q.what||'Invoke',e)}
        if(q.rate&&!q.done)q.t+=q.rate;else q.done=true;continue}
      if(q.at===f)continue;
      const w=q.wait||{k:'frame'};let go=false;
      try{
        switch(w.k){
          case'frame':go=true;break;
          case'sec':w.t-=dt;go=w.t<=0;break;
          case'real':w.t-=udt;go=w.t<=0;break;
          case'until':{const prev=csCur;csCur=q.cx;try{go=csTruth(csInvoke(w.f,[]))}finally{csCur=prev}break}
          case'while':{const prev=csCur;csCur=q.cx;try{go=!csTruth(csInvoke(w.f,[]))}finally{csCur=prev}break}
          case'co':go=w.co.done;break;
          default:go=true;
        }
      }catch(e){q.done=true;this.err(q.cx,q.name+'() 코루틴',e);continue}
      if(go){if(q.cx)q.cx.dt=dt;this.step(q)}
    }
    this.L=this.L.filter(q=>!q.done);
  },
  /* 소유자(스크립트 인스턴스)의 코루틴·예약 멈추기 — name: 코루틴 메서드 이름 또는 Invoke 메서드 이름 */
  stop(inst,pred){for(const q of this.L){const cx=q.cx||q.owner;if(cx&&cx.inst===inst&&(!pred||pred(q)))q.done=true}},
  stopObj(o){for(const q of this.L){const cx=q.cx||q.owner;if(cx&&cx.o===o)q.done=true}},
  clear(){this.L=[]}
};
const csNodeName=n=>n.t==='id'?n.n:n.t==='mem'?csNodeName(n.o)+'.'+n.n:n.t==='call'?csNodeName(n.f)+'()':n.t==='this'?'this':'값';
const csNRE=n=>new Error(`NullReferenceException: ${csNodeName(n)}이(가) null 입니다`);
function csE(e,cx){
  switch(e.t){
    case'lit':return e.v;
    case'istr':return e.parts.map(q=>typeof q==='string'?q:csFmt(csE(q.e,cx),q.f)).join('');
    case'this':return csThis(cx);
    case'id':return csId(e.n,cx);
    case'mem':{const b=csE(e.o,cx);if(b==null)throw csNRE(e.o);return csGet(b,e.n)}
    case'call':return csCall(e,cx);
    case'new':{
      const r=csNew(e.ty,e.a.map(a=>csE(a,cx)),e.ga);
      if(e.init){
        if(isCsL(r))e.init.forEach(q=>r.a.push(csE(q,cx)));
        else if(isCsD(r))e.init.forEach(q=>{if(q.t!=='arr'||q.items.length<2)throw new Error('Dictionary 초기화는 { {키, 값}, ... } 모양으로 쓰세요');const k=csE(q.items[0],cx);r.m.set(csKey(k),[k,csE(q.items[1],cx)])});
        else throw csUnsup('new '+e.ty+' { }');
      }
      return r;
    }
    case'arr':return CsL(e.items.map(q=>csE(q,cx)),e.ty,true);
    case'newarr':{const n=csN(csE(e.n,cx));if(!Number.isInteger(n)||n<0)throw new Error(`배열 크기는 0 이상의 정수여야 합니다 (${n})`);const z=csZero(e.ty);return CsL(Array.from({length:n},()=>isCsV(z)?CsV(0,0,0,z.v3):z),e.ty,true)}
    case'lam':return{__fn:1,ps:e.ps,body:e.body,blk:e.blk,scopes:cx.scopes.slice(),cx};
    case'out':{const sc=cx.scopes;return{__out:1,set(v){if(e.decl){sc[sc.length-1].set(e.n,v);return}csSet({t:'id',n:e.n},v,cx)}}}
    case'un':{const v=csE(e.e,cx);if(e.op==='!')return!csTruth(v);if(isCsV(v))return e.op==='-'?CsV(-v.x,-v.y,-v.z,v.v3):v;return e.op==='-'?-csN(v):csN(v)}
    case'bin':
      if(e.op==='&&')return csTruth(csE(e.l,cx))&&csTruth(csE(e.r,cx));
      if(e.op==='||')return csTruth(csE(e.l,cx))||csTruth(csE(e.r,cx));
      return csBin(e.op,csE(e.l,cx),csE(e.r,cx));
    case'tern':return csTruth(csE(e.c,cx))?csE(e.a,cx):csE(e.b,cx);
    case'coal':{const a=csE(e.a,cx);return a!=null?a:csE(e.b,cx)}
    case'cast':{const v=csE(e.e,cx);if(e.ty==='string')return csFmt(v);if(e.ty==='bool')return csTruth(v);const n=csN(v);return['int','long','short','byte'].includes(e.ty)?Math.trunc(n):n}
    case'asg':{let v=csE(e.r,cx);if(e.op!=='=')v=csBin(e.op[0],csE(e.l,cx),v);csSet(e.l,v,cx);return v}
    case'pre':case'post':{const old=csN(csE(e.e,cx)),nv=e.op==='++'?old+1:old-1;csSet(e.e,nv,cx);return e.t==='pre'?nv:old}
    case'idx':{const o=csE(e.o,cx),k=csE(e.i,cx);if(o==null)throw csNRE(e.o);if(typeof o==='string')return o[csN(k)]||'';
      if(isCsL(o))return o.a[csIdxOk(o,k)];
      if(isCsD(o)){const q=o.m.get(csKey(k));if(!q)throw new Error(`KeyNotFoundException: 키 '${csFmt(k)}'이(가) Dictionary에 없습니다 (ContainsKey 로 먼저 확인하세요)`);return q[1]}
      throw csUnsup('[ ] 인덱스')}
  }
  throw csUnsup(e.t);
}
function csField(n,cx){
  const f=cx.rt.f;
  if(Object.prototype.hasOwnProperty.call(f,n)){const v=f[n];if(v&&v.__ref)return{ok:true,v:csRefVal(v,(cx.rt.ty||{})[n],cx)};return{ok:true,v}}
  return{ok:false};
}
/* 오브젝트 참조 필드(GameObject·Transform·컴포넌트 타입) 읽기:
   인스펙터 슬롯에 넣은 오브젝트 → 해당 프록시, 비어 있으면 null (private Transform t; 처럼 코드에서 채우는 필드 포함) */
function csRefVal(v,T,cx){
  const id=v.id||'';if(!id)return null;
  /* 프로젝트 창의 프리팹을 넣은 슬롯 (Instantiate 용) */
  if(id.startsWith('pf:'))return typeof CSHOST.prefabRef==='function'?CSHOST.prefabRef(id.slice(3)):null;
  const m=cx.m;
  if(id.startsWith('uig:')){const g=CSHOST.uiGroupH&&CSHOST.uiGroupH(m,id.slice(4));if(g)return g;throw csUnsup('UIGroup 필드')}
  const o=m.objs.find(z=>z.id===id)||(m.ui||[]).find(z=>z.id===id);if(!o)return null;
  if(!T||T==='GameObject')return CSHOST.isUiEl(o)&&!CSHOST.uiGo?(()=>{throw csUnsup('UI 요소 필드')})():CSHOST.goProxy(m,o);
  if(CS_UIT.has(T)||CSHOST.isUiEl(o))throw csUnsup(T+' 필드');
  return CSHOST.csGetComp(m,o,T);
}
function csIdNoLocal(n,cx){
  const r=csField(n,cx);if(r.ok)return r.v;
  if(Object.prototype.hasOwnProperty.call(CS_STAT,n))return CS_STAT[n];
  const o=cx.o;
  if(n==='transform'){if(CSHOST.isUiEl(o))throw csUnsup(n);return CSHOST.trProxy(cx.m,o)}
  if(n==='gameObject'){if(CSHOST.isUiEl(o)&&!CSHOST.uiGo)throw csUnsup(n);return CSHOST.goProxy(cx.m,o)}
  if(n==='name')return o.name;
  /* 이 스크립트 컴포넌트가 켜져 있는지 (인스펙터 체크박스 · 코드의 enabled = false 도 같은 값) */
  if(n==='enabled'&&cx.inst)return cx.inst.on!==false&&!(cx.rt&&cx.rt.dis);
  if(n==='enabled')return!(cx.rt&&cx.rt.dis);
  if(n==='tag'&&typeof CSHOST.objTag==='function')return CSHOST.objTag(cx.m,o);
  throw csUnsup(n);
}
function csId(n,cx){
  for(let k=cx.scopes.length-1;k>=0;k--)if(cx.scopes[k].has(n))return cx.scopes[k].get(n);
  return csIdNoLocal(n,cx);
}
function csSetField(n,v,cx){
  const f=cx.rt.f;
  if(Object.prototype.hasOwnProperty.call(f,n)){f[n]=v;return}
  if(n==='name'){cx.o.name=csFmt(v);return}
  /* 이 스크립트 끄기 = 인스펙터 체크박스를 끈 것과 같다: Start · Update · FixedUpdate · LateUpdate 를 부르지 않음 */
  if(n==='enabled'&&cx.inst){if(v)delete cx.inst.on;else cx.inst.on=false;if(cx.rt)cx.rt.dis=false;return}
  if(n==='enabled'){if(cx.rt)cx.rt.dis=!v;return}
  if(n==='tag'){cx.o.tag=csFmt(v);return}
  throw csUnsup(n);
}
function csSet(node,v,cx){
  if(node.t==='id'){
    for(let k=cx.scopes.length-1;k>=0;k--)if(cx.scopes[k].has(node.n)){cx.scopes[k].set(node.n,v);return}
    csSetField(node.n,v,cx);return;
  }
  if(node.t==='mem'){
    if(node.o.t==='this'){csSetField(node.n,v,cx);return}
    const b=csE(node.o,cx);
    if(b==null)throw csNRE(node.o);
    if(isCsV(b)){if(!['x','y','z'].includes(node.n))throw new Error(`벡터의 '${node.n}'에는 대입할 수 없습니다`);const nv=Object.assign({},b);nv[node.n]=csN(v);csSet(node.o,nv,cx);return}
    if(b.__h){b.set(node.n,v);return}
    throw csUnsup(node.n);
  }
  if(node.t==='idx'){
    const o=csE(node.o,cx),k=csE(node.i,cx);if(o==null)throw csNRE(node.o);
    if(isCsL(o)){o.a[csIdxOk(o,k)]=v;return}
    if(isCsD(o)){o.m.set(csKey(k),[k,v]);return}
    if(typeof o==='string')throw new Error('error CS0200: 문자열의 글자는 바꿀 수 없습니다 (새 문자열을 만들어 대입하세요)');
    throw csUnsup('[ ] 대입');
  }
  throw csUnsup('대입');
}
function csGet(b,n){
  if(isCsV(b)){
    if(n==='x'||n==='y'||n==='z')return b[n];
    const L=Math.hypot(b.x,b.y,b.z);
    if(n==='magnitude')return L;if(n==='sqrMagnitude')return L*L;
    if(n==='normalized')return L>1e-9?CsV(b.x/L,b.y/L,b.z/L,b.v3):CsV(0,0,0,b.v3);
    throw csUnsup('Vector.'+n);
  }
  if(b==null)throw new Error(`NullReferenceException: 비어 있는(null) 값에서 '.${n}'을(를) 읽으려 했습니다 — 변수에 오브젝트가 들어 있는지(인스펙터 슬롯·GetComponent 결과) 확인하세요`);
  if(isCsQ(b)){if(n==='x'||n==='y'||n==='z'||n==='w')return b[n];if(n==='eulerAngles')return CsV(0,0,((b.deg%360)+360)%360,true);throw csUnsup('Quaternion.'+n)}
  if(typeof b==='string'){if(n==='Length')return b.length;throw csUnsup('string.'+n)}
  if(isCsL(b)){if(n==='Count'&&!b.arr)return b.a.length;if(n==='Length'&&b.arr)return b.a.length;if(n==='Capacity')return b.a.length;
    throw new Error(b.arr?`배열에는 '${n}'이(가) 없습니다 (길이는 .Length)`:`List에는 '${n}'이(가) 없습니다 (개수는 .Count)`)}
  if(isCsD(b)){if(n==='Count')return b.m.size;if(n==='Keys')return CsL([...b.m.values()].map(q=>q[0]),'',false);if(n==='Values')return CsL([...b.m.values()].map(q=>q[1]),'',false);throw csUnsup('Dictionary.'+n)}
  if(b.__h)return b.get(n);
  throw csUnsup(n);
}
function csStrM(s,n,a){
  switch(n){
    case'ToString':return s;case'ToUpper':return s.toUpperCase();case'ToLower':return s.toLowerCase();case'Trim':return s.trim();
    case'Contains':return s.includes(csFmt(a[0]));case'StartsWith':return s.startsWith(csFmt(a[0]));case'EndsWith':return s.endsWith(csFmt(a[0]));
    case'IndexOf':return s.indexOf(csFmt(a[0]));case'Substring':return a.length>1?s.substr(csN(a[0]),csN(a[1])):s.slice(csN(a[0]));
    case'Replace':return s.split(csFmt(a[0])).join(csFmt(a[1]));
    case'Split':{const seps=a.length?a.map(csFmt):[' '];let parts=[s];seps.forEach(p=>{parts=parts.flatMap(x=>x.split(p))});return CsL(parts,'string',true)}
    case'PadLeft':return s.padStart(csN(a[0]),a.length>1?csFmt(a[1]):' ');
    case'PadRight':return s.padEnd(csN(a[0]),a.length>1?csFmt(a[1]):' ');
    case'TrimStart':return s.replace(/^\s+/,'');case'TrimEnd':return s.replace(/\s+$/,'');
    case'Equals':return s===csFmt(a[0]);
    case'LastIndexOf':return s.lastIndexOf(csFmt(a[0]));
    case'Remove':return a.length>1?s.slice(0,csN(a[0]))+s.slice(csN(a[0])+csN(a[1])):s.slice(0,csN(a[0]));
    case'Insert':return s.slice(0,csN(a[0]))+csFmt(a[1])+s.slice(csN(a[0]));
    case'ToCharArray':return CsL([...s],'char',true);
  }
  throw csUnsup('string.'+n+'()');
}
/* MonoBehaviour 의 기능 (그냥 이름으로 부름): 코루틴 · Invoke · Instantiate · SendMessage */
function csMB(n,a,cx,raw){
  const nameOf=v=>typeof v==='string'?v:v&&v.__co?v.name:csFmt(v);
  switch(n){
    case'StartCoroutine':{
      let co=a[0];
      if(typeof co==='string'){if(!cx.pr.r.methods[co])throw new Error(`StartCoroutine: 메서드 '${co}'이(가) 없습니다`);co=csCallUser(cx,co,a.slice(1))}
      return CSCO.start(co,cx);
    }
    case'StopCoroutine':{const v=a[0];if(v&&v.__co){v.done=true;return null}const nm=nameOf(v);CSCO.stop(cx.inst,q=>q.__co&&q.name===nm);return null}
    case'StopAllCoroutines':CSCO.stop(cx.inst,q=>!!q.__co);return null;
    case'Invoke':case'InvokeRepeating':{
      const nm=nameOf(a[0]);if(!cx.pr.r.methods[nm])throw new Error(`${n}: 메서드 '${nm}'이(가) 없습니다 (이름의 철자를 확인하세요 · nameof(메서드) 를 쓰면 편해요)`);
      const t=a.length>1?csN(a[1]):0,rate=n==='InvokeRepeating'?(a.length>2?csN(a[2]):0):0;
      if(n==='InvokeRepeating'&&!(rate>0))throw new Error('InvokeRepeating: 반복 간격(세 번째 값)은 0보다 커야 합니다');
      const host=cx.o,m=cx.m,inst=cx.inst;
      const q=CSCO.timer(t,()=>{if(typeof CSHOST.runMethod==='function')CSHOST.runMethod(m,host,inst,nm);else csCallUser(cx,nm,[])},rate,nm);
      q.cx=cx;q.what=nm+'() (Invoke)';return null;
    }
    case'CancelInvoke':{const nm=a.length?nameOf(a[0]):null;CSCO.stop(cx.inst,q=>q.tm&&q.tag!=null&&(!nm||q.tag===nm));return null}
    case'IsInvoking':{const nm=a.length?nameOf(a[0]):null;return CSCO.L.some(q=>!q.done&&q.tm&&q.cx&&q.cx.inst===cx.inst&&q.tag!=null&&(!nm||q.tag===nm))}
    case'Instantiate':{if(typeof CSHOST.instantiate!=='function')throw csUnsup('Instantiate()');return CSHOST.instantiate(cx,a)}
    case'Destroy':case'DestroyImmediate':{
      const t=a.length>1?csN(a[1]):0;
      if(t>0){const x=a[0],q=CSCO.timer(t,()=>CSHOST.csDestroy(cx,x),0,null);q.cx=Object.assign({},cx,{inst:null});q.what='Destroy';q.keep=true;return null}
      CSHOST.csDestroy(cx,a[0]);return null;
    }
    case'SendMessage':case'BroadcastMessage':{if(typeof CSHOST.sendMessage!=='function')throw csUnsup(n+'()');CSHOST.sendMessage(cx.m,cx.o,csFmt(a[0]),a.slice(1),n==='BroadcastMessage');return null}
    case'FindObjectOfType':case'FindAnyObjectByType':case'FindFirstObjectByType':{if(!raw||!raw.ga||typeof CSHOST.findOfType!=='function')throw csUnsup(n+'()');const L=CSHOST.findOfType(cx.m,raw.ga);return L.length?L[0]:null}
    case'FindObjectsOfType':case'FindObjectsByType':{if(!raw||!raw.ga||typeof CSHOST.findOfType!=='function')throw csUnsup(n+'()');return CsL(CSHOST.findOfType(cx.m,raw.ga),raw.ga,true)}
  }
  return undefined;
}
const CS_MBN=new Set(['StartCoroutine','StopCoroutine','StopAllCoroutines','Invoke','InvokeRepeating','CancelInvoke','IsInvoking','Instantiate','Destroy','DestroyImmediate','SendMessage','BroadcastMessage','FindObjectOfType','FindObjectsOfType','FindAnyObjectByType','FindFirstObjectByType','FindObjectsByType']);
function csCall(e,cx){
  const f=e.f,ev=()=>e.a.map(x=>csE(x,cx));
  if(f.t==='id'){
    if(f.ga){
      if(f.n==='GetComponent'||f.n==='GetComponentInChildren'||f.n==='GetComponentInParent'||f.n==='GetComponents'||f.n==='GetComponentsInChildren')return csGetCompX(cx.m,cx.o,f.n,f.ga);
      if(CS_MBN.has(f.n))return csMB(f.n,ev(),cx,f);
      throw csUnsup(f.n+'<'+f.ga+'>()')}
    /* nameof(Fire) → "Fire" */
    if(f.n==='nameof'){const q=e.a[0];return q?(q.t==='id'?q.n:q.t==='mem'?q.n:csNodeName(q)):''}
    if(cx.pr.r.methods[f.n])return csCallUser(cx,f.n,ev());
    /* 지역 변수에 든 람다: var f = x => x * 2; f(3) */
    for(let k=cx.scopes.length-1;k>=0;k--)if(cx.scopes[k].has(f.n)){const fn=cx.scopes[k].get(f.n);if(fn&&(fn.__fn||fn.__mref))return csInvoke(fn,ev());break}
    if(f.n==='print'){const a=ev();CSHOST.clog('info',csFmt(a[0]),cx.s.id);return null}
    if(CS_MBN.has(f.n)){const r=csMB(f.n,ev(),cx,f);if(r!==undefined)return r}
    throw csUnsup(f.n+'()');
  }
  if(f.t==='mem'){
    if(f.o.t==='this'&&cx.pr.r.methods[f.n])return csCallUser(cx,f.n,ev());
    if(f.o.t==='this'&&CS_MBN.has(f.n)){const r=csMB(f.n,ev(),cx,f);if(r!==undefined)return r}
    const b=csE(f.o,cx);
    if(b==null)throw csNRE(f.o);
    if(f.ga){
      if(b.__o&&(f.n==='GetComponent'||f.n==='GetComponentInChildren'||f.n==='GetComponentInParent'||f.n==='GetComponents'||f.n==='GetComponentsInChildren'))return csGetCompX(cx.m,b.__o,f.n,f.ga);
      if(f.n==='TryGetComponent'&&b.__o){const c=csGetCompX(cx.m,b.__o,'GetComponent',f.ga);const a=ev();if(a[0]&&a[0].__out)a[0].set(c);return c!=null}
      if(b.__h&&typeof b.callG==='function')return b.callG(f.n,f.ga,ev());
      throw csUnsup(f.n+'<'+f.ga+'>()')}
    const a=ev();
    if(isCsV(b)){
      if(f.n==='ToString')return csFmt(b);
      if(f.n==='Normalize'){const L=Math.hypot(b.x,b.y,b.z);csSet(f.o,L>1e-9?CsV(b.x/L,b.y/L,b.z/L,b.v3):CsV(0,0,0,b.v3),cx);return null}
      if(f.n==='Set'){csSet(f.o,CsV(csN(a[0]||0),csN(a[1]||0),csN(a[2]||0),b.v3),cx);return null}
      if(f.n==='Equals')return csEq(b,a[0]);
      throw csUnsup('Vector.'+f.n+'()')}
    if(typeof b==='string')return csStrM(b,f.n,a);
    if(typeof b==='number'||typeof b==='boolean'){if(f.n==='ToString')return csFmt(b,a[0]);if(f.n==='Equals')return b===a[0];if(f.n==='CompareTo')return csCmp(b,a[0]);throw csUnsup(f.n+'()')}
    if(isCsL(b))return csListM(b,f.n,a,cx);
    if(isCsD(b))return csDictM(b,f.n,a);
    if(b.__fn&&f.n==='Invoke')return csInvoke(b,a);
    if(b.__h)return b.call(f.n,a);
  }
  if(f.t==='lam'||f.t==='call'||f.t==='idx'){const fn=csE(f,cx);return csInvoke(fn,ev())}
  throw csUnsup('호출');
}
/* GetComponent 계열: InChildren(자신 포함 자손) · InParent(자신 포함 조상) · 복수형은 배열 */
function csGetCompX(m,o,n,T){
  if(n==='GetComponent')return CSHOST.csGetComp(m,o,T);
  const many=n==='GetComponents'||n==='GetComponentsInChildren',dir=n==='GetComponentInParent'?'up':n==='GetComponents'?'self':'down';
  const L=typeof CSHOST.relatives==='function'?CSHOST.relatives(m,o,dir):[o];
  const out=[];for(const q of L){const c=CSHOST.csGetComp(m,q,T);if(c){if(!many)return c;out.push(c)}}
  return many?CsL(out,T,true):null;
}
function csCallUser(cx,n,args){
  const ast=csMethodAst(cx.pr,n);
  if(ast.err)throw ast.err instanceof CsUnsup?ast.err:new Error(`${n}(): ${ast.err.message}`);
  if(++cx.depth>64){cx.depth--;throw new Error('함수 호출이 너무 깊습니다 (자기 자신을 계속 부르고 있는지 확인하세요)')}
  if(csIsIter(ast.me)){cx.depth--;return csCoMake(cx,n,ast,args)}
  const sv=cx.scopes,sm=cx.me;cx.scopes=[new Map(ast.params.map((p,k)=>[p,args[k]]))];cx.me=ast.me;
  try{for(const s of ast.body)csX(s,cx);return undefined}
  catch(e){if(e&&e.__c==='ret')return e.v;throw e}
  finally{cx.scopes=sv;cx.me=sm;cx.depth--}
}
function csNew(ty,a,ga){
  ty=String(ty).replace(/^System\.Collections\.Generic\./,'');
  if(ty==='List'||ty==='HashSet'||ty==='Queue'||ty==='Stack'){const l=CsL([],ga||'');if(ty!=='List')l.kind=ty;if(a.length&&a[0]&&typeof a[0]==='object')l.a.push(...csIter(a[0]));return l}
  if(ty==='Dictionary')return CsD(ga||'');
  if(ty==='WaitForSeconds')return{__w:1,k:'sec',t:csN(a[0]||0)};
  if(ty==='WaitForSecondsRealtime')return{__w:1,k:'real',t:csN(a[0]||0)};
  if(ty==='WaitForEndOfFrame'||ty==='WaitForFixedUpdate')return{__w:1,k:'frame'};
  if(ty==='WaitUntil'||ty==='WaitWhile'){if(!a[0]||!a[0].__fn)throw new Error(ty+'에는 람다를 넣으세요 (예: new '+ty+'(() => 점수 >= 10))');return{__w:1,k:ty==='WaitUntil'?'until':'while',f:a[0]}}
  if(ty==='Exception'||/Exception$/.test(ty))return{__ex:1,msg:a.length?csFmt(a[0]):ty};
  if(ty==='Quaternion')return CsQ(0);
  if(ty==='GameObject'){if(typeof CSHOST.newObject!=='function')throw csUnsup('new GameObject()');return CSHOST.newObject(a.length?csFmt(a[0]):'New Game Object')}
  if(ty==='Vector2')return CsV(csN(a[0]||0),csN(a[1]||0),0,false);
  if(ty==='Vector3')return CsV(csN(a[0]||0),csN(a[1]||0),csN(a[2]||0),true);
  if(ty==='Color'){const h=x=>Math.round(clamp(csN(x==null?1:x),0,1)*255).toString(16).padStart(2,'0');return'#'+h(a[0])+h(a[1])+h(a[2])}
  throw csUnsup('new '+ty);
}
/* ---- 호스트 객체 (엔진 기능) ---- */
const csH=(name,get,call,set)=>({__h:name,name,
  get:get||(n=>{throw csUnsup(name+'.'+n)}),call:call||(n=>{throw csUnsup(name+'.'+n+'()')}),set:set||(n=>{throw csUnsup(name+'.'+n+' 대입')})});
const csVArg=(a,k=0)=>isCsV(a[k])?a[k]:CsV(csN(a[k]||0),csN(a[k+1]||0));
function csKeyCode(n){
  if(/^[A-Z]$/.test(n))return'Key'+n;
  let m=/^Alpha(\d)$/.exec(n);if(m)return'Digit'+m[1];
  m=/^Keypad(\d)$/.exec(n);if(m)return'Numpad'+m[1];
  if(/^F\d{1,2}$/.test(n))return n;
  return({Space:'Space',Return:'Enter',KeypadEnter:'NumpadEnter',Escape:'Escape',Tab:'Tab',Backspace:'Backspace',UpArrow:'ArrowUp',DownArrow:'ArrowDown',LeftArrow:'ArrowLeft',RightArrow:'ArrowRight',LeftShift:'ShiftLeft',RightShift:'ShiftRight',LeftControl:'ControlLeft',RightControl:'ControlRight',LeftAlt:'AltLeft',RightAlt:'AltRight',Mouse0:'Mouse0',Mouse1:'Mouse1',Mouse2:'Mouse2'})[n]||null;
}
function csKeyArg(v){
  const s=String(v);if(/^(Key[A-Z]|Digit\d|Numpad\d|F\d+|Mouse\d|Arrow|Shift|Control|Alt|Space$|Enter$|Escape$|Tab$|Backspace$|NumpadEnter$)/.test(s))return s;
  if(/^[a-z]$/i.test(s))return'Key'+s.toUpperCase();if(/^\d$/.test(s))return'Digit'+s;
  return({스페이스:'Space',엔터:'Enter',이스케이프:'Escape',탭:'Tab',위:'ArrowUp',아래:'ArrowDown',왼쪽:'ArrowLeft',오른쪽:'ArrowRight',왼쪽시프트:'ShiftLeft',오른쪽시프트:'ShiftRight',space:'Space',enter:'Enter',return:'Enter',escape:'Escape',tab:'Tab',up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight','left shift':'ShiftLeft','right shift':'ShiftRight'})[s.toLowerCase()]||s;
}
const CS_MATH={Abs:Math.abs,Sin:Math.sin,Cos:Math.cos,Tan:Math.tan,Asin:Math.asin,Acos:Math.acos,Atan:Math.atan,Atan2:Math.atan2,Sqrt:Math.sqrt,Pow:Math.pow,Exp:Math.exp,
  Log:(x,b)=>b==null?Math.log(x):Math.log(x)/Math.log(b),Log10:Math.log10,Floor:Math.floor,Ceil:Math.ceil,Round:Math.round,Sign:x=>x>=0?1:-1,
  Min:(...v)=>Math.min(...v),Max:(...v)=>Math.max(...v),Clamp:(v,a,b)=>Math.min(Math.max(v,a),b),Clamp01:v=>Math.min(Math.max(v,0),1),
  Lerp:(a,b,t)=>a+(b-a)*Math.min(Math.max(t,0),1),LerpUnclamped:(a,b,t)=>a+(b-a)*t,InverseLerp:(a,b,v)=>a===b?0:Math.min(Math.max((v-a)/(b-a),0),1),
  MoveTowards:(c,t,d)=>Math.abs(t-c)<=d?t:c+Math.sign(t-c)*d,RoundToInt:Math.round,FloorToInt:Math.floor,CeilToInt:Math.ceil,
  Repeat:(t,l)=>t-Math.floor(t/l)*l,PingPong:(t,l)=>{t=t-Math.floor(t/(l*2))*l*2;return l-Math.abs(t-l)},Approximately:(a,b)=>Math.abs(a-b)<1e-6,
  SmoothStep:(a,b,t)=>{t=Math.min(Math.max(t,0),1);t=t*t*(3-2*t);return a+(b-a)*t},
  DeltaAngle:(a,b)=>{let d=((b-a)%360+360)%360;if(d>180)d-=360;return d},
  LerpAngle:(a,b,t)=>{let d=((b-a)%360+360)%360;if(d>180)d-=360;return a+d*Math.min(Math.max(t,0),1)},
  MoveTowardsAngle:(c,t,m)=>{let d=((t-c)%360+360)%360;if(d>180)d-=360;return Math.abs(d)<=m?c+d:c+Math.sign(d)*m},
  PerlinNoise:(x,y)=>csPerlin(x,y||0),
  ClosestPowerOfTwo:v=>Math.pow(2,Math.round(Math.log2(Math.max(1,v)))),IsPowerOfTwo:v=>v>0&&(v&(v-1))===0};
/* Mathf.PerlinNoise: 0~1 사이의 부드러운 무늬 (지형 · 흔들림 · 구름) */
const CS_PERM=(()=>{const p=[];for(let i=0;i<256;i++)p[i]=i;let s=1337;for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);[p[i],p[j]]=[p[j],p[i]]}return p.concat(p)})();
function csPerlin(x,y){
  const fade=t=>t*t*t*(t*(t*6-15)+10),lerp=(a,b,t)=>a+(b-a)*t;
  const gr=(h,x,y)=>{const g=h&7,u=g<4?x:y,v=g<4?y:x;return((g&1)?-u:u)+((g&2)?-2*v:2*v)};
  const X=Math.floor(x)&255,Y=Math.floor(y)&255;x-=Math.floor(x);y-=Math.floor(y);const u=fade(x),v=fade(y),P=CS_PERM;
  const a=P[X]+Y,b=P[X+1]+Y;
  const r=lerp(lerp(gr(P[a],x,y),gr(P[b],x-1,y),u),lerp(gr(P[a+1],x,y-1),gr(P[b+1],x-1,y-1),u),v);
  return Math.min(1,Math.max(0,(r/2.4)+.5));
}
const cs3D=()=>{const p=csPlay();return!!(p&&p.m&&p.m.dim==='3d')};
const csVecStat=v3=>csH(v3?'Vector3':'Vector2',n=>{
    const V=(x,y,z)=>CsV(x,y,z,v3);
    /* 3D 씬에서는 유니티처럼 Y가 위 (2D 씬은 화면 아래쪽이 +Y) */
    const d3=cs3D();
    switch(n){case'zero':return V(0,0,0);case'one':return V(1,1,v3?1:0);case'up':return V(0,d3?1:-1,0);case'down':return V(0,d3?-1:1,0);case'left':return V(-1,0,0);case'right':return V(1,0,0);case'forward':return V(0,0,1);case'back':return V(0,0,-1)}
    throw csUnsup((v3?'Vector3.':'Vector2.')+n);
  },(n,a)=>{
    const A=a[0],B=a[1];
    switch(n){
      case'Distance':return Math.hypot(A.x-B.x,A.y-B.y,A.z-B.z);
      case'Dot':return A.x*B.x+A.y*B.y+A.z*B.z;
      case'Cross':return CsV(A.y*B.z-A.z*B.y,A.z*B.x-A.x*B.z,A.x*B.y-A.y*B.x,v3);
      case'Normalize':{const L=Math.hypot(A.x,A.y,A.z)||1;return CsV(A.x/L,A.y/L,A.z/L,v3)}
      case'Lerp':{const t=clamp(csN(a[2]),0,1);return CsV(A.x+(B.x-A.x)*t,A.y+(B.y-A.y)*t,A.z+(B.z-A.z)*t,v3)}
      case'MoveTowards':{const d=csN(a[2]),dx=B.x-A.x,dy=B.y-A.y,dz=B.z-A.z,L=Math.hypot(dx,dy,dz);if(L<=d||L===0)return CsV(B.x,B.y,B.z,v3);return CsV(A.x+dx/L*d,A.y+dy/L*d,A.z+dz/L*d,v3)}
      case'ClampMagnitude':{const m=csN(B),L=Math.hypot(A.x,A.y,A.z);if(L<=m)return A;return CsV(A.x/L*m,A.y/L*m,A.z/L*m,v3)}
      case'LerpUnclamped':{const t=csN(a[2]);return CsV(A.x+(B.x-A.x)*t,A.y+(B.y-A.y)*t,A.z+(B.z-A.z)*t,v3)}
      /* 2D 엔진은 아래쪽이 +y 라서, 화면에서 보이는 각도(시계 방향 +)와 맞춥니다 */
      case'Angle':{const la=Math.hypot(A.x,A.y,A.z),lb=Math.hypot(B.x,B.y,B.z);if(!la||!lb)return 0;return Math.acos(clamp((A.x*B.x+A.y*B.y+A.z*B.z)/(la*lb),-1,1))*180/Math.PI}
      case'SignedAngle':{let d=(Math.atan2(B.y,B.x)-Math.atan2(A.y,A.x))*180/Math.PI;d=((d+180)%360+360)%360-180;return d}
      case'Perpendicular':return CsV(-A.y,A.x,0,v3);
      case'Reflect':{const d=A.x*B.x+A.y*B.y+A.z*B.z;return CsV(A.x-2*d*B.x,A.y-2*d*B.y,A.z-2*d*B.z,v3)}
      case'Scale':return CsV(A.x*B.x,A.y*B.y,A.z*B.z,v3);
      case'Max':return CsV(Math.max(A.x,B.x),Math.max(A.y,B.y),Math.max(A.z,B.z),v3);
      case'Min':return CsV(Math.min(A.x,B.x),Math.min(A.y,B.y),Math.min(A.z,B.z),v3);
      case'Cross':return CsV(A.y*B.z-A.z*B.y,A.z*B.x-A.x*B.z,A.x*B.y-A.y*B.x,true);
    }
    throw csUnsup((v3?'Vector3.':'Vector2.')+n+'()');
  });
const CS_STAT={
  Debug:csH('Debug',null,(n,a)=>{const t={Log:'info',LogWarning:'warn',LogError:'error'}[n];if(!t)throw csUnsup('Debug.'+n+'()');CSHOST.clog(t,csFmt(a[0]),csCur&&csCur.s.id);return null}),
  /* timeScale: 0 = 멈춤(일시정지) · 0.5 = 느리게 · 호스트가 play.ts 를 읽어 deltaTime 에 곱함 */
  Time:csH('Time',n=>{const p=csPlay();switch(n){case'deltaTime':case'smoothDeltaTime':return csCur?csCur.dt:0;case'fixedDeltaTime':return .02;case'time':case'timeSinceLevelLoad':return(p||{tm:0}).tm||0;
    case'frameCount':return(p||{}).frame||0;case'timeScale':return p&&p.ts!=null?p.ts:1;case'unscaledDeltaTime':return p&&p.udt!=null?p.udt:(csCur?csCur.dt:0);case'unscaledTime':case'realtimeSinceStartup':return p&&p.utm!=null?p.utm:(p||{tm:0}).tm||0}throw csUnsup('Time.'+n)},
    null,(n,v)=>{if(n==='timeScale'){const p=csPlay();if(p)p.ts=clamp(csN(v),0,100);return}throw csUnsup('Time.'+n+' 대입')}),
  Input:csH('Input',n=>{const p=csPlay();if(n==='anyKey')return!!(p&&p.kraw&&p.kraw.size);if(n==='anyKeyDown')return!!(p&&p.kdown&&p.kdown.size);
    /* 마우스 위치: 게임 화면 픽셀 · 유니티처럼 왼쪽 아래가 (0, 0) — Camera.main.ScreenToWorldPoint 로 씬 좌표(칸)로 바꿈 */
    if(n==='mousePosition'){const q=p&&p.mouse,v=p&&p.view;return q&&v?CsV(q.x,v.H-q.y,0,true):CsV(0,0,0,true)}
    if(n==='touchCount')return p&&p.kraw&&p.kraw.has('Mouse0')?1:0;
    throw csUnsup('Input.'+n)},(n,a)=>{
    const p=csPlay();if(!p)return 0;const kk=p.keys||{};
    if(n==='GetAxis'||n==='GetAxisRaw'){const ax=({가로:'Horizontal',세로:'Vertical'})[String(a[0])]||String(a[0]);
      /* 한 프레임 안에 눌렀다 뗀 아주 짧은 입력도 그 프레임에는 누른 것으로 (kdown) */
      const dn=p.kdown||new Set(),on=(k,a,b)=>!!kk[k]||dn.has(a)||dn.has(b);
      if(ax==='Horizontal')return(on('right','ArrowRight','KeyD')?1:0)-(on('left','ArrowLeft','KeyA')?1:0);
      if(ax==='Vertical'){const v=(on('down','ArrowDown','KeyS')?1:0)-(on('up','ArrowUp','KeyW')?1:0);return cs3D()?-v:v}
      /* 마우스가 이번 프레임에 움직인 양 (유니티처럼 픽셀 × 0.1 · 위쪽이 +) */
      if(ax==='Mouse X')return(p.mdx||0)*.1;if(ax==='Mouse Y')return(p.mdy||0)*.1;
      throw new Error(`입력 축 '${ax}'이(가) 없습니다 (Horizontal, Vertical, Mouse X, Mouse Y)`)}
    const set=suf=>suf==='Down'?p.kdown:suf==='Up'?p.kup:p.kraw;
    let m=/^GetKey(Down|Up)?$/.exec(n);if(m){const s=set(m[1]);return!!s&&s.has(csKeyArg(a[0]))}
    m=/^GetButton(Down|Up)?$/.exec(n);if(m){const c={Jump:'Space',Fire1:'Mouse0',Submit:'Enter',Cancel:'Escape',점프:'Space',발사:'Mouse0',확인:'Enter',취소:'Escape'}[a[0]];if(!c)throw new Error(`버튼 '${a[0]}'이(가) 없습니다 (Jump, Fire1, Submit)`);const s=set(m[1]);return!!s&&s.has(c)}
    m=/^GetMouseButton(Down|Up)?$/.exec(n);if(m){const s=set(m[1]);return!!s&&s.has('Mouse'+csN(a[0]))}
    throw csUnsup('Input.'+n+'()');
  }),
  KeyCode:csH('KeyCode',n=>{const c=csKeyCode(n);if(!c)throw csUnsup('KeyCode.'+n);return c}),
  Mathf:csH('Mathf',n=>{switch(n){case'PI':return Math.PI;case'Infinity':return Infinity;case'NegativeInfinity':return-Infinity;case'Deg2Rad':return Math.PI/180;case'Rad2Deg':return 180/Math.PI;case'Epsilon':return 1.4e-45}throw csUnsup('Mathf.'+n)},
    (n,a)=>{const f=CS_MATH[n];if(!f)throw csUnsup('Mathf.'+n+'()');return f(...a.map(csN))}),
  Random:csH('Random',n=>{
    if(n==='value')return Math.random();
    if(n==='insideUnitCircle'){const r=Math.sqrt(Math.random()),t=Math.random()*Math.PI*2;return CsV(Math.cos(t)*r,Math.sin(t)*r)}
    if(n==='onUnitCircle'){const t=Math.random()*Math.PI*2;return CsV(Math.cos(t),Math.sin(t))}
    if(n==='rotation'){return CsQ(Math.random()*360)}
    if(n==='ColorHSV'||n==='color'){const h=x=>Math.round(Math.random()*255).toString(16).padStart(2,'0');return'#'+h()+h()+h()}
    throw csUnsup('Random.'+n)},(n,a)=>{
    if(n==='Range'){const x=csN(a[0]),y=csN(a[1]);return Number.isInteger(x)&&Number.isInteger(y)?Math.floor(x+Math.random()*(y-x)):x+Math.random()*(y-x)}
    if(n==='ColorHSV'){const h=x=>Math.round(Math.random()*255).toString(16).padStart(2,'0');return'#'+h()+h()+h()}
    if(n==='InitState'){return null}
    throw csUnsup('Random.'+n+'()')}),
  Vector2:csVecStat(false),Vector3:csVecStat(true),
  Space:csH('Space',n=>{if(n==='World'||n==='Self')return'Space.'+n;throw csUnsup('Space.'+n)}),
  Color:csH('Color',n=>{if(CS_COLORS[n])return CS_COLORS[n];throw csUnsup('Color.'+n)}),
  GameObject:csH('GameObject',null,(n,a)=>{
    const m=csCur&&csCur.m;if(!m)return null;
    if(n==='Find'){const nm=csFmt(a[0]),o=m.objs.find(q=>q.name===nm&&CSHOST.objOn(m,q))||m.objs.find(q=>q.name===nm);if(o)return CSHOST.goProxy(m,o);
      if(typeof CSHOST.uiFind==='function'){const u=CSHOST.uiFind(m,nm);if(u)return u}
      if((m.ui||[]).some(q=>q.name===nm)||(m.uiGroups||[]).some(q=>q.name===nm))throw csUnsup('GameObject.Find(UI)');return null}
    if(n==='FindWithTag'||n==='FindGameObjectWithTag'){const L=csHook('findTag','GameObject.'+n+'()')(m,csFmt(a[0]));return L.length?L[0]:null}
    if(n==='FindGameObjectsWithTag')return CsL(csHook('findTag','GameObject.'+n+'()')(m,csFmt(a[0])),'GameObject',true);
    if(n==='Instantiate'&&typeof CSHOST.instantiate==='function')return CSHOST.instantiate(csCur,a);
    if(n==='Destroy'){CSHOST.csDestroy(csCur,a[0]);return null}
    throw csUnsup('GameObject.'+n+'()')}),
  /* Physics2D 의 layerMask 인자는 받기만 하고 쓰지 않음 (레이어가 없음) */
  LayerMask:csH('LayerMask',null,(n,a)=>{if(n==='GetMask')return-1;if(n==='NameToLayer')return 0;if(n==='LayerToName')return'Default';throw csUnsup('LayerMask.'+n+'()')}),
  ForceMode2D:csH('ForceMode2D',n=>{if(n==='Force'||n==='Impulse')return n;throw csUnsup('ForceMode2D.'+n)}),
  ForceMode:csH('ForceMode',n=>{if(['Force','Impulse','Acceleration','VelocityChange'].includes(n))return n;throw csUnsup('ForceMode.'+n)}),
  RigidbodyType2D:csH('RigidbodyType2D',n=>{if(n==='Dynamic'||n==='Kinematic'||n==='Static')return n;throw csUnsup('RigidbodyType2D.'+n)}),
  Resources:Object.assign(csH('Resources',null,(n,a)=>{if(n==='Load'){const r=typeof CSHOST.prefabByName==='function'?CSHOST.prefabByName(csFmt(a[0])):null;return r}throw csUnsup('Resources.'+n+'()')}),
    {callG(n,T,a){if(n==='Load'){if(T!=='GameObject')throw csUnsup('Resources.Load<'+T+'>()');return typeof CSHOST.prefabByName==='function'?CSHOST.prefabByName(csFmt(a[0])):null}throw csUnsup('Resources.'+n+'<'+T+'>()')}}),
  Camera:csH('Camera',n=>{if(n==='main'){const m=csCur&&csCur.m,c=m&&CSHOST.startCamera(m);return c?CSHOST.camProxy(m,c):null}throw csUnsup('Camera.'+n)}),
  /* ---- 게임 세계 기능 (CSHOST 의 연결 함수로 동작) ---- */
  Hero:csH('Hero',n=>{if(n==='main'){const m=csCur&&csCur.m;return m?csHook('heroMain','Hero.main')(m):null}throw csUnsup('Hero.'+n)}),
  Dialog:csH('Dialog',n=>{if(n==='isOpen')return!!csHook('dialogOpen','Dialog.isOpen')();throw csUnsup('Dialog.'+n)},(n,a)=>{
    if(n==='Show'){csHook('say','Dialog.Show()')(a.length>1?csFmt(a[0]):'',csFmt(a.length>1?a[1]:a[0]));return null}
    if(n==='Close'){csHook('dialogClose','Dialog.Close()')();return null}
    throw csUnsup('Dialog.'+n+'()')}),
  Message:csH('Message',null,(n,a)=>{if(n==='Show'){csHook('message','Message.Show()')(csFmt(a[0]),a.length>1?Math.max(.1,csN(a[1])):1.6);return null}throw csUnsup('Message.'+n+'()')}),
  Inventory:csH('Inventory',n=>{if(n==='count'||n==='Count'){const inv=csHook('inventory','Inventory')();return inv?Object.keys(inv).length:0}throw csUnsup('Inventory.'+n)},(n,a)=>{
    const inv=csHook('inventory','Inventory.'+n+'()')();if(!inv)return null;const k=a.length?csFmt(a[0]):'',c=a.length>1?Math.round(csN(a[1])):1;
    if(n==='Add'){inv[k]=(inv[k]||0)+c;if(inv[k]<=0)delete inv[k];return inv[k]||0}
    if(n==='Remove'){if((inv[k]||0)<c)return false;inv[k]-=c;if(inv[k]<=0)delete inv[k];return true}
    if(n==='Count')return inv[k]||0;if(n==='Has')return(inv[k]||0)>0;
    if(n==='Clear'){Object.keys(inv).forEach(x=>delete inv[x]);return null}
    throw csUnsup('Inventory.'+n+'()')}),
  SceneManager:csH('SceneManager',null,(n,a)=>{
    if(n==='LoadScene'){const v=a[0];csHook('loadScene','SceneManager.LoadScene()')(typeof v==='number'?v:csFmt(v));return null}
    if(n==='RestartGame'){csHook('restartGame','SceneManager.RestartGame()')();return null}
    if(n==='GetActiveScene'){const m=csCur&&csCur.m,q=csHook('sceneInfo','SceneManager.GetActiveScene()')(m)||{};return csH('Scene',x=>{if(x==='name')return q.name||'';if(x==='buildIndex')return q.index==null?-1:q.index;throw csUnsup('Scene.'+x)})}
    throw csUnsup('SceneManager.'+n+'()')}),
  Sound:csH('Sound',n=>csHook('sound','Sound.'+n)('get',n),(n,a)=>csHook('sound','Sound.'+n+'()')('call',n,a)),
  UIGroup:csH('UIGroup',null,(n,a)=>{if(n==='Find'){const m=csCur&&csCur.m;return m?csHook('uiGroupFind','UIGroup.Find()')(m,csFmt(a[0])):null}throw csUnsup('UIGroup.'+n+'()')}),
  /* UI 빌더 화면: UIScreen.Show("설정 창") · SetText("HUD", "점수", "점수 10") · GetValue("설정 창", "음량") */
  UIScreen:csH('UIScreen',null,(n,a)=>csHook('uiScreen','UIScreen.'+n+'()')(n,a.map(v=>typeof v==='number'||typeof v==='boolean'?v:csFmt(v)))),
  /* 비주얼 스크립트: VisualScript.Trigger("문 열기") · SetVariable("점수", 10) · CurrentState */
  VisualScript:csH('VisualScript',n=>csHook('vscript','VisualScript.'+n)('get',n,[],csCur),(n,a)=>csHook('vscript','VisualScript.'+n+'()')('call',n,a.map(v=>v==null||typeof v==='number'||typeof v==='boolean'?v:csFmt(v)),csCur)),
  /* 저장 · 불러오기 (브라우저에 프로젝트별로 남음): PlayerPrefs.SetInt("최고 점수", 10) */
  PlayerPrefs:csH('PlayerPrefs',null,(n,a)=>{
    const D=csPrefs(),k=a.length?csFmt(a[0]):'';
    switch(n){
      case'SetInt':D[k]=Math.trunc(csN(a[1]));csPrefsSave();return null;
      case'SetFloat':D[k]=csN(a[1]);csPrefsSave();return null;
      case'SetString':D[k]=csFmt(a[1]);csPrefsSave();return null;
      case'GetInt':{const v=D[k];return typeof v==='number'?Math.trunc(v):(a.length>1?Math.trunc(csN(a[1])):0)}
      case'GetFloat':{const v=D[k];return typeof v==='number'?v:(a.length>1?csN(a[1]):0)}
      case'GetString':{const v=D[k];return typeof v==='string'?v:(a.length>1?csFmt(a[1]):'')}
      case'HasKey':return Object.prototype.hasOwnProperty.call(D,k);
      case'DeleteKey':delete D[k];csPrefsSave();return null;
      case'DeleteAll':Object.keys(D).forEach(x=>delete D[x]);csPrefsSave();return null;
      case'Save':csPrefsSave();return null;
    }
    throw csUnsup('PlayerPrefs.'+n+'()')}),
  Quaternion:csH('Quaternion',n=>{if(n==='identity')return CsQ(0);throw csUnsup('Quaternion.'+n)},(n,a)=>{
    switch(n){
      case'Euler':return CsQ(isCsV(a[0])?a[0].z:csN(a[2]==null?0:a[2]));
      case'AngleAxis':return CsQ(csN(a[0])*(isCsV(a[1])&&a[1].z<0?-1:1));
      case'Lerp':case'Slerp':case'LerpUnclamped':case'SlerpUnclamped':{const A=a[0].deg,B=a[1].deg;let d=((B-A)%360+360)%360;if(d>180)d-=360;const t=/Unclamped/.test(n)?csN(a[2]):clamp(csN(a[2]),0,1);return CsQ(A+d*t)}
      case'RotateTowards':{const A=a[0].deg,B=a[1].deg,m=csN(a[2]);let d=((B-A)%360+360)%360;if(d>180)d-=360;return CsQ(Math.abs(d)<=m?A+d:A+Math.sign(d)*m)}
      case'Angle':{let d=Math.abs(((a[1].deg-a[0].deg)%360+360)%360);return d>180?360-d:d}
      case'Inverse':return CsQ(-a[0].deg);
      /* 2D: 바라볼 방향 벡터 → z 회전 (오른쪽이 0°, 아래쪽이 90°) */
      case'LookRotation':case'FromToRotation':{const v=n==='FromToRotation'?a[1]:a[0];return CsQ(Math.atan2(v.y,v.x)*180/Math.PI)}
    }
    throw csUnsup('Quaternion.'+n+'()')}),
  Application:csH('Application',n=>{if(n==='isPlaying')return!!csPlay();if(n==='platform')return'WebGLPlayer';if(n==='targetFrameRate')return 60;if(n==='isMobilePlatform')return typeof navigator!=='undefined'&&/Mobi|Android/i.test(navigator.userAgent||'');throw csUnsup('Application.'+n)},
    (n,a)=>{if(n==='Quit'){if(typeof CSHOST.quit==='function')CSHOST.quit();return null}if(n==='OpenURL'){try{window.open(csFmt(a[0]),'_blank','noopener')}catch(e){}return null}throw csUnsup('Application.'+n+'()')},
    (n)=>{if(n==='targetFrameRate')return;throw csUnsup('Application.'+n+' 대입')}),
  /* 물리 질의: 호스트가 CSHOST.physics 로 넘김 (Raycast · OverlapCircle …) */
  Physics2D:csH('Physics2D',n=>csHook('physics','Physics2D.'+n)('get',n,[]),(n,a)=>csHook('physics','Physics2D.'+n+'()')('call',n,a),(n,v)=>csHook('physics','Physics2D.'+n)('set',n,[v])),
  string:csStrStat(),String:csStrStat(),
  int:csNumStat(true),Int32:csNumStat(true),float:csNumStat(false),Single:csNumStat(false),double:csNumStat(false)
};
function csStrStat(){return csH('string',n=>{if(n==='Empty')return'';throw csUnsup('string.'+n)},(n,a)=>{
  switch(n){
    case'IsNullOrEmpty':return a[0]==null||a[0]==='';
    case'IsNullOrWhiteSpace':return a[0]==null||!String(a[0]).trim();
    case'Join':{const sep=csFmt(a[0]),rest=a.slice(1);const items=rest.length===1&&rest[0]&&typeof rest[0]==='object'&&(isCsL(rest[0])||isCsD(rest[0]))?csIter(rest[0]):rest;return items.map(x=>csFmt(x)).join(sep)}
    case'Concat':return a.map(x=>csFmt(x)).join('');
    case'Format':{const f=csFmt(a[0]);return f.replace(/\{(\d+)(?::([^}]+))?\}/g,(q,i,fm)=>csFmt(a[+i+1],fm))}
    case'Equals':return csFmt(a[0])===csFmt(a[1]);
  }
  throw csUnsup('string.'+n+'()')})}
function csNumStat(isInt){return csH(isInt?'int':'float',n=>{if(n==='MaxValue')return isInt?2147483647:3.4028235e38;if(n==='MinValue')return isInt?-2147483648:-3.4028235e38;if(n==='Epsilon')return 1.4e-45;if(n==='PositiveInfinity')return Infinity;if(n==='NegativeInfinity')return-Infinity;if(n==='NaN')return NaN;throw csUnsup((isInt?'int.':'float.')+n)},(n,a)=>{
  const parse=v=>{const t=csFmt(v).trim();if(!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)||(isInt&&!/^[+-]?\d+$/.test(t)))return null;return isInt?parseInt(t,10):parseFloat(t)};
  if(n==='Parse'){const v=parse(a[0]);if(v==null)throw new Error(`FormatException: '${csFmt(a[0])}'은(는) ${isInt?'정수':'숫자'}로 바꿀 수 없습니다 (TryParse 를 쓰면 안전해요)`);return v}
  if(n==='TryParse'){const v=parse(a[0]);if(a[1]&&a[1].__out)a[1].set(v==null?0:v);return v!=null}
  if(n==='IsNaN')return Number.isNaN(csN(a[0]));
  throw csUnsup((isInt?'int.':'float.')+n+'()')})}
/* PlayerPrefs 저장소: 호스트가 CSHOST.prefsKey() 로 프로젝트마다 다른 이름을 줌 */
let csPrefsD=null,csPrefsK='';
function csPrefsKey(){try{return'thaniya.prefs.'+(typeof CSHOST.prefsKey==='function'?CSHOST.prefsKey():'default')}catch(e){return'thaniya.prefs.default'}}
function csPrefs(){const k=csPrefsKey();if(csPrefsD&&csPrefsK===k)return csPrefsD;csPrefsK=k;try{csPrefsD=JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){csPrefsD={}}return csPrefsD}
function csPrefsSave(){try{localStorage.setItem(csPrefsK||csPrefsKey(),JSON.stringify(csPrefsD||{}))}catch(e){}}
function csPrefsClear(){const k=csPrefsKey();try{localStorage.removeItem(k)}catch(e){}csPrefsD=null}
/* 연결 함수 꺼내기: 화면이 넘기지 않았으면 「아직 실행할 수 없습니다」 */
function csHook(k,label){const f=CSHOST[k];if(typeof f!=='function')throw csUnsup(label);return f}
function csThis(cx){return{__h:cx.s.name,__o:cx.o,name:cx.o.name,get:n=>csIdNoLocal(n,cx),set:(n,v)=>csSetField(n,v,cx),call:(n,a)=>{if(cx.pr.r.methods[n])return csCallUser(cx,n,a);throw csUnsup(n+'()')}}}
