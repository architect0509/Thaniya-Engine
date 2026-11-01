/* ============================================================================
 * script-editor.js — Thaniya 공용 C# 스크립트 편집기
 *   엔진(edit.html)과 학습(learning.html)이 함께 씁니다. 여기만 고치면 두 화면의 편집기가 똑같이 바뀝니다.
 *  [포함]  코드 색칠(csHighlight) · 자동완성 데이터(CS_API · AC_DOC …) · 자동완성 계산·목록 상자 ·
 *          한/영 자판 보정(ko2key) · 대소문자 자동 보정(acFix) · 편집기 실행 취소(edUndo) · 입력칸 연결(acHook)
 *  [필요]  script-engine.js (parseCS · csBlank · 한글 스크립트 사전) 를 먼저 불러옵니다.
 *  [호스트가 CSED.use({...}) 로 넘기는 것]
 *     scripts()   프로젝트의 C# 스크립트 목록 [{name, code}] — 직접 만든 클래스를 자동완성에 보여 줌
 *     settings()  { ko, acKo, acCase, fxSpark, fxCombo, fxSound } — 한글 스크립트(실험) · 한/영 자판 보정 · 대소문자 자동 보정 · 입력 효과
 * ========================================================================== */
'use strict';
const CSED={
  scripts:()=>[],
  settings:()=>({}),
  use(h){Object.assign(this,h);return this}
};
const csedSet=()=>CSED.settings()||{};
const csedEsc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const csedT=(t,v)=>window.TI18N?TI18N.t(t,v):String(t).replace(/\{(\w+)\}/g,(x,k)=>v&&k in v?v[k]:x);
const csedWin=el=>(el&&el.ownerDocument&&el.ownerDocument.defaultView)||window;
function acKoName(it,owner,dot,attr){
  if(it.u||it.k==='var')return null;
  if(attr)return KO_ATTR_R[it.n]||null;
  if(dot)return (KO_OWN_R[owner]||{})[it.n]||KO_MEM_R[it.n]||null;
  if(it.k==='kw'||it.k==='ty'||it.k==='sn')return KO_KW_R[it.n]||KO_TY_R[it.n]||null;
  if(it.k==='ev'||it.k==='fn')return KO_CALL_R[it.n]||KO_SELF_R[it.n]||null;
  return KO_SELF_R[it.n]||null;
}
const CS_RE=(()=>{
  const kw='public|private|protected|internal|static|void|class|using|new|return|if|else|for|foreach|while|switch|case|break|continue|true|false|null|this|readonly|const|override|virtual|namespace|in|out|ref|var|struct|enum|interface|abstract|sealed|get|set'.split('|').concat(Object.keys(KO_KW));
  const ty='int|uint|float|double|bool|string|char|long|byte|short|decimal|object|Vector2|Vector3|Color|Rigidbody2D|Rigidbody|Transform|GameObject|MonoBehaviour|Collider2D|Debug|Time|Input|Mathf|Quaternion|SpriteRenderer|Animator|Camera|AudioSource|KeyCode|Header|SerializeField|Range|Tooltip|Space|RectTransform|Button|Text|Image|Slider|CanvasGroup|SceneManager|Application|UIGroup|Hero|Random|Light|Light2D|Monster|Npc|Item|Portal|EventTrigger|Dialog|Message|Inventory|Scene|List|Dictionary'.split('|').concat(Object.keys(KO_TY),Object.keys(KO_SELF));
  const alt=a=>[...new Set(a)].sort((x,y)=>y.length-x.length).join('|'),B0='(?<![\\p{L}\\p{N}_])',B1='(?![\\p{L}\\p{N}_])';
  return new RegExp('(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\\\n]|\\\\.)*")|'+B0+'('+alt(kw)+')'+B1+'|'+B0+'('+alt(ty)+')'+B1+'|'+B0+'(\\d+\\.?\\d*[fFdD]?)'+B1+'|'+B0+'([\\p{L}_][\\p{L}\\p{N}_]*)(?=\\s*\\()','gu');
})();
function csHighlight(code){
  let out='',last=0,m;CS_RE.lastIndex=0;
  const e=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  while((m=CS_RE.exec(code))){
    if(m[0]==='')break;
    out+=e(code.slice(last,m.index));
    const c=m[1]?'cm':m[2]?'st':m[3]?'kw':m[4]?'ty':m[5]?'nu':'fn';
    out+=`<span class="t-${c}">${e(m[0])}</span>`;last=m.index+m[0].length;
  }
  return out+e(code.slice(last))+'\n ';
}
/* ---- 스크립트 자동완성 ---- */
const AC_KW=['using','namespace','class','struct','enum','interface','public','private','protected','internal','static','readonly','const','void','new','return','if','else','for','foreach','while','do','switch','case','break','continue','default','true','false','null','this','base','var','in','out','ref','override','virtual','abstract','sealed','is','as','try','catch','finally','throw','yield'];
const AC_NOTYPE=new Set(['return','new','else','if','while','for','foreach','switch','case','throw','in','is','as','using','namespace','class','struct','enum','interface','base','typeof','default','do','catch','try','finally','yield','goto','lock','await','public','private','protected','internal','static','readonly','const','override','virtual','abstract','sealed','out','ref','var']);
const AC_PRIM=['int','uint','long','float','double','bool','string','char','byte','short','decimal','object'];
const AC_NS=['UnityEngine','UnityEngine.UI','System','System.Collections','System.Collections.Generic','System.Linq'];
const _P=(n,t)=>({n,k:'pr',t:t||'',d:t||''});
const _F=(n,t,sig)=>({n,k:'fn',t:t||'void',d:'('+(sig||'')+') → '+(t||'void'),a:!!sig,sig:sig||''});
const _G=n=>({n,k:'fn',gen:true,t:'T',d:'<T>() → T',a:false});
const AC_KEYS=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','Space','Return','Escape','Tab','Backspace','LeftShift','RightShift','LeftControl','RightControl','LeftAlt','RightAlt','UpArrow','DownArrow','LeftArrow','RightArrow','Mouse0','Mouse1','Alpha0','Alpha1','Alpha2','Alpha3','Alpha4','Alpha5','Alpha6','Alpha7','Alpha8','Alpha9'];
const _vec=(T,z)=>[_P('x','float'),_P('y','float'),...(z?[_P('z','float')]:[]),_P('magnitude','float'),_P('normalized',T),_F('Normalize','void'),_F('Set','void','float x, float y'+(z?', float z':''))];
const _vecS=T=>[_P('zero',T),_P('one',T),_P('up',T),_P('down',T),_P('left',T),_P('right',T),_F('Distance','float',T+' a, '+T+' b'),_F('Lerp',T,T+' a, '+T+' b, float t'),_F('Dot','float',T+' a, '+T+' b'),_F('MoveTowards',T,T+' current, '+T+' target, float maxDelta')];
const _base=[_P('gameObject','GameObject'),_P('transform','Transform'),_P('name','string'),_P('tag','string'),_P('enabled','bool'),_G('GetComponent')];
const CS_API={
  'Debug:static':[_F('Log','void','object message'),_F('LogWarning','void','object message'),_F('LogError','void','object message')],
  'Mathf:static':[_P('PI','float'),_P('Infinity','float'),_P('Deg2Rad','float'),_P('Rad2Deg','float'),..._mathf(),_F('Atan2','float','float y, float x'),_F('Pow','float','float f, float p'),_F('Min','float','float a, float b'),_F('Max','float','float a, float b'),_F('Clamp','float','float value, float min, float max'),_F('Lerp','float','float a, float b, float t'),_F('MoveTowards','float','float current, float target, float maxDelta')],
  'Time:static':[_P('deltaTime','float'),_P('fixedDeltaTime','float'),_P('time','float'),_P('timeScale','float'),_P('frameCount','int')],
  'Input:static':[_F('GetKey','bool','KeyCode key'),_F('GetKeyDown','bool','KeyCode key'),_F('GetKeyUp','bool','KeyCode key'),_F('GetAxis','float','string axisName'),_F('GetAxisRaw','float','string axisName'),_F('GetButton','bool','string name'),_F('GetButtonDown','bool','string name'),_F('GetMouseButton','bool','int button'),_F('GetMouseButtonDown','bool','int button'),_P('mousePosition','Vector3')],
  'KeyCode:static':AC_KEYS.map(n=>_P(n,'KeyCode')),
  'Vector2':_vec('Vector2',false),'Vector2:static':_vecS('Vector2'),
  'Vector3':_vec('Vector3',true),'Vector3:static':_vecS('Vector3'),
  'Color':[_P('r','float'),_P('g','float'),_P('b','float'),_P('a','float')],
  'Color:static':['red','green','blue','white','black','yellow','cyan','magenta','gray','grey'].map(n=>_P(n,'Color')),
  'Quaternion':[_P('x','float'),_P('y','float'),_P('z','float'),_P('w','float'),_P('eulerAngles','Vector3')],
  'Quaternion:static':[_P('identity','Quaternion'),_F('Euler','Quaternion','float x, float y, float z')],
  'GameObject':[_P('name','string'),_P('tag','string'),_P('transform','Transform'),_P('activeSelf','bool'),_F('SetActive','void','bool value'),_G('GetComponent')],
  'GameObject:static':[_F('Find','GameObject','string name'),_F('FindWithTag','GameObject','string tag')],
  'UIGroup':[_P('name','string'),_P('transform','RectTransform'),_P('childCount','int'),_P('alpha','float'),_P('visible','bool'),_F('SetActive','void','bool value')],
  'UIGroup:static':[_F('Find','UIGroup','string name')],
  'Transform':[_P('position','Vector3'),_P('localPosition','Vector3'),_P('localScale','Vector3'),_P('rotation','Quaternion'),_P('eulerAngles','Vector3'),_P('parent','Transform'),_P('childCount','int'),_P('gameObject','GameObject'),_F('Translate','void','Vector3 translation'),_F('Rotate','void','float angle'),_F('LookAt','void','Transform target'),_F('Find','Transform','string name'),_F('GetChild','Transform','int index'),_F('SetParent','void','Transform parent')],
  'Rigidbody2D':[_P('velocity','Vector2'),_P('angularVelocity','float'),_P('gravityScale','float'),_P('mass','float'),_P('drag','float'),_P('isKinematic','bool'),_P('simulated','bool'),_F('AddForce','void','Vector2 force'),_F('MovePosition','void','Vector2 position'),..._base],
  'SpriteRenderer':[_P('sprite','Sprite'),_P('color','Color'),_P('flipX','bool'),_P('flipY','bool'),_P('sortingOrder','int'),..._base],
  'Light':[_P('color','Color'),_P('intensity','float'),_P('radius','float'),_P('angle','float'),_P('dir','float'),_P('shadows','bool'),..._base],
  'Monster':[_P('hp','int'),_P('maxHp','int'),_P('speed','int'),_P('range','int'),_P('position','Vector2'),_P('isDead','bool'),_F('Move','bool','Vector2 delta'),_F('CanMove','bool','Vector2 delta'),_F('TakeDamage','int','int amount'),_F('Die','void'),..._base],
  'Npc':[_P('text','string'),_F('Talk','void'),..._base],
  'Item':[_P('qty','int'),..._base],
  'Portal':[_P('tx','int'),_P('ty','int'),_P('targetScene','string'),_F('Teleport','bool'),..._base],
  'EventTrigger':[_P('text','string'),_P('once','bool'),..._base],
  'Dialog:static':[_F('Show','void','string speaker, string text'),_F('Close','void'),_P('isOpen','bool')],
  'Message:static':[_F('Show','void','string text, float seconds')],
  'Inventory:static':[_F('Add','int','string item, int count'),_F('Remove','bool','string item, int count'),_F('Count','int','string item'),_F('Has','bool','string item'),_F('Clear','void')],
  'SceneManager:static':[_F('LoadScene','void','string sceneName'),_F('RestartGame','void'),_F('GetActiveScene','Scene')],
  'Scene':[_P('name','string'),_P('buildIndex','int')],
  'Animator':[_P('speed','float'),_F('SetBool','void','string name, bool value'),_F('SetTrigger','void','string name'),_F('ResetTrigger','void','string name'),_F('SetFloat','void','string name, float value'),_F('SetInteger','void','string name, int value'),_F('GetBool','bool','string name'),_F('GetFloat','float','string name'),_F('GetInteger','int','string name'),_F('Play','void','string stateName'),_F('CrossFade','void','string stateName, float duration'),_F('GetCurrentAnimatorStateInfo','AnimatorStateInfo','int layerIndex'),_F('HasState','bool','int layer, string stateName'),..._base],
  'AnimatorStateInfo':[_P('normalizedTime','float'),_P('length','float'),_P('loop','bool'),_P('speed','float'),_F('IsName','bool','string name')],
  'AudioSource':[_P('volume','float'),_P('pitch','float'),_P('loop','bool'),_P('mute','bool'),_P('playOnAwake','bool'),_P('isPlaying','bool'),_P('time','float'),_P('clip','string'),_P('length','float'),_P('spatialBlend','float'),_P('maxDistance','float'),_F('Play','void'),_F('PlayDelayed','void','float delay'),_F('PlayOneShot','void','string clipName, float volumeScale'),_F('Stop','void'),_F('Pause','void'),_F('UnPause','void'),..._base],
  'Collider2D':[_P('isTrigger','bool'),_F('CompareTag','bool','string tag'),..._base],
  'Collision2D':[_P('gameObject','GameObject'),_P('collider','Collider2D'),_P('transform','Transform')],
  'Camera':[_P('orthographicSize','float'),_P('backgroundColor','Color'),..._base],
  'Camera:static':[_P('main','Camera')],
  'string':[_P('Length','int'),_F('ToUpper','string'),_F('ToLower','string'),_F('Trim','string'),_F('Contains','bool','string value'),_F('StartsWith','bool','string value'),_F('EndsWith','bool','string value'),_F('IndexOf','int','string value'),_F('Substring','string','int start, int length'),_F('Replace','string','string a, string b'),_F('Split','string[]','char separator')],
  'Array':[_P('Length','int')],
  'MonoBehaviour':[..._base,_F('Destroy','void','Object obj'),_F('Instantiate','GameObject','GameObject original'),_F('print','void','object message'),_F('Invoke','void','string method, float time'),_F('InvokeRepeating','void','string method, float time, float rate'),_F('CancelInvoke','void'),_F('StartCoroutine','void','IEnumerator routine')]
};
function _mathf(){return['Abs','Sin','Cos','Tan','Asin','Acos','Atan','Sqrt','Floor','Ceil','Round','Sign','Clamp01'].map(n=>_F(n,'float','float f')).concat(['RoundToInt','FloorToInt','CeilToInt'].map(n=>_F(n,'int','float f')))}
CS_API.Light2D=CS_API.Light;CS_API.NPC=CS_API.Npc;
CS_API.Hero=[_P('position','Vector2'),_P('facing','Vector2'),_P('facingAngle','float'),_P('hp','int'),_P('maxHp','int'),_P('isMoving','bool'),_P('isDead','bool'),_P('isInvincible','bool'),_P('invincibleTime','float'),_P('radius','float'),_F('Move','bool','Vector2 delta'),_F('Face','void','Vector2 dir'),_F('CanMove','bool','Vector2 delta'),_F('Attack','int','int damage, float reach'),_F('Interact','bool','float distance'),_F('TakeDamage','bool','int amount'),_F('Heal','int','int amount'),..._base];
CS_API['Hero:static']=[_P('main','Hero')];
CS_API['Sound:static']=[_F('PlayMusic','void','string name, float volume'),_F('StopMusic','void'),_F('PauseMusic','void'),_F('ResumeMusic','void'),_F('SetMusicVolume','void','float volume'),_F('PlayEffect','void','string name, float volume'),_P('isMusicPlaying','bool'),_P('musicVolume','float'),_P('currentMusic','string')];
CS_API['Random:static']=[_F('Range','float','float min, float max'),_P('value','float')];
CS_API.Camera.unshift(_P('smoothFollow','bool'),_P('smoothTime','float'));
const AC_TYPES=[...AC_PRIM,'Hero','Random','Vector2','Vector3','Color','Quaternion','GameObject','Transform','MonoBehaviour','Rigidbody2D','Collider2D','Collision2D','SpriteRenderer','Animator','AnimatorStateInfo','AudioSource','Camera','Light','Light2D','Monster','Npc','Item','Portal','EventTrigger','Mathf','Debug','Time','Input','KeyCode','List','Dictionary','Dialog','Message','Inventory','SceneManager','UIGroup','Sound'];
const AC_COMPS=['Hero','Light','Light2D','Monster','Npc','Item','Portal','EventTrigger','SpriteRenderer','Rigidbody2D','Collider2D','Animator','AudioSource','Camera','Transform'];
const AC_EV=[['Awake','void Awake()\n{\n    |\n}'],['Start','void Start()\n{\n    |\n}'],['Update','void Update()\n{\n    |\n}'],['FixedUpdate','void FixedUpdate()\n{\n    |\n}'],['LateUpdate','void LateUpdate()\n{\n    |\n}'],['OnEnable','void OnEnable()\n{\n    |\n}'],['OnDisable','void OnDisable()\n{\n    |\n}'],['OnDestroy','void OnDestroy()\n{\n    |\n}'],['OnTriggerEnter2D','void OnTriggerEnter2D(Collider2D other)\n{\n    |\n}'],['OnTriggerExit2D','void OnTriggerExit2D(Collider2D other)\n{\n    |\n}'],['OnCollisionEnter2D','void OnCollisionEnter2D(Collision2D collision)\n{\n    |\n}'],['OnHeroEnter','void OnHeroEnter()\n{\n    |\n}'],['OnHeroExit','void OnHeroExit()\n{\n    |\n}'],['OnInteract','void OnInteract()\n{\n    |\n}'],['OnHit','void OnHit()\n{\n    |\n}'],['OnHeroDeath','void OnHeroDeath()\n{\n    |\n}']];
const AC_SN=[['if','if (|)\n{\n}'],['else','else\n{\n    |\n}'],['for','for (int i = 0; i < |; i++)\n{\n}'],['foreach','foreach (var item in |)\n{\n}'],['while','while (|)\n{\n}'],['switch','switch (|)\n{\n    case 0:\n        break;\n}']];
const AC_ATTR=[['Header','Header("|")'],['SerializeField','SerializeField'],['Range','Range(0, |1)'],['Tooltip','Tooltip("|")'],['Space','Space'],['HideInInspector','HideInInspector']];
const AC_ICON={fn:'ƒ',pr:'◆',var:'v',ty:'T',kw:'k',sn:'{}',ev:'⚡'};
const AC_ORDER={var:0,pr:1,fn:2,ev:3,sn:4,ty:5,kw:6};
function acDecls(clean){
  const d={},meth={};let m;
  const re=/(?<![\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*)(?:\s*<[^<>;(){}]*>)?(\[\])?\s+([\p{L}_][\p{L}\p{N}_]*)(?=\s*(?:[=;,)]|\bin\b))/gu;
  while((m=re.exec(clean))){if(AC_NOTYPE.has(m[1]))continue;if(!(m[3] in d))d[m[3]]=m[2]?'Array':m[1]}
  const rv=/(?<![\p{L}\p{N}_])var\s+([\p{L}_][\p{L}\p{N}_]*)\s*=\s*([^;]+);/gu;
  while((m=rv.exec(clean))){const r=m[2].trim();let t=null,q;
    if((q=/^new\s+([A-Za-z_]\w*)/.exec(r)))t=q[1];else if((q=/GetComponent\s*<\s*(\w+)\s*>\s*\(\s*\)\s*$/.exec(r)))t=q[1];else if(/^gameObject$/.test(r))t='GameObject';else if(/^transform$/.test(r))t='Transform';
    if(t)d[m[1]]=t}
  const rm=/(?<![\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*(?:\[\])?)\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu;
  while((m=rm.exec(clean))){if(['return','new','else','if','while','for','foreach','switch','case','throw','in','is','as','using','typeof','catch','lock','await','class','struct','enum','interface','namespace'].includes(m[1]))continue;meth[m[2]]=m[1]}
  return{vars:d,methods:meth};
}
function acUserType(name){
  for(const s of CSED.scripts()){const r=parseCS(s.code);if((r.cls||s.name)===name)return r}
  return null;
}
function acIsType(name){return AC_TYPES.includes(name)||(name+':static') in CS_API||!!acUserType(name)}
function acMembersOf(type,isStatic){
  const l=(CS_API[type+(isStatic?':static':'')]||[]).slice();
  if(!isStatic){const r=acUserType(type);if(r){r.members.filter(m=>m.kind==='field').forEach(m=>l.push(Object.assign(_P(m.name,m.type),{u:1})));Object.keys(r.methods).forEach(n=>{if(!/^(Awake|Start|Update|FixedUpdate|LateUpdate|OnEnable|OnDisable|OnDestroy)$/.test(n))l.push(Object.assign(_F(n,'','...'),{u:1}))});_base.forEach(b=>l.push(b))}}
  return l;
}
function acChain(lhs){
  let i=lhs.length;
  const skip=(open,close)=>{let d=0;while(i>0){const c=lhs[--i];if(c===close)d++;else if(c===open){d--;if(!d)return true}}return false};
  for(;;){
    while(i>0&&/\s/.test(lhs[i-1]))i--;
    if(lhs[i-1]===')'){if(!skip('(',')'))return null;while(i>0&&/\s/.test(lhs[i-1]))i--}
    if(lhs[i-1]==='>'){if(!skip('<','>'))return null}
    let j=i;while(j>0&&/[\p{L}\p{N}_]/u.test(lhs[j-1]))j--;
    if(j===i)return null;
    i=j;let k=i;while(k>0&&/\s/.test(lhs[k-1]))k--;
    if(lhs[k-1]==='.'){i=k-1;continue}
    break;
  }
  return lhs.slice(i).trim();
}
function acSegs(chain){
  const out=[];let cur='',d=0;
  for(const c of chain){if('(<'.includes(c))d++;else if(')>'.includes(c))d--;if(c==='.'&&d===0){out.push(cur);cur=''}else cur+=c}
  out.push(cur);
  return out.map(s=>{const m=/^\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?:<\s*([\p{L}\p{N}_.]+(?:\s*,\s*[\p{L}\p{N}_.]+)*)\s*>)?\s*(?:\([\s\S]*\))?\s*$/u.exec(s);return m?{name:m[1],gen:m[2]||null}:null});
}
function acResolve(chain,dc){
  const segs=acSegs(chain);if(!segs.length||segs.some(s=>!s))return null;
  let cur=null;
  for(let s=0;s<segs.length;s++){
    let{name,gen}=segs[s];
    if(gen)gen=gen.split(',').map(x=>{x=x.trim();return KO_TY[x]||x}).join(',');
    if(s===0&&!dc.vars[name]){if(name==='게임오브젝트')name=segs[1]&&KO_FINDS.has(segs[1].name)?'GameObject':'gameObject';else if(name==='변환'||name==='트랜스폼')name='transform';else name=koStandEn(name)}
    else if(s>0){const om=KO_OWN[cur.t];name=(om&&om[name])||KO_MEM[name]||name}
    if(s===0){
      if(name==='this'){cur={t:'MonoBehaviour',self:true};continue}
      if(name==='gameObject'){cur={t:'GameObject'};continue}
      if(name==='transform'){cur={t:'Transform'};continue}
      if(dc.vars[name]){cur={t:dc.vars[name]};continue}
      if(acIsType(name)){cur={t:name,st:true};continue}
      return null;
    }
    const mem=acMembersOf(cur.t,!!cur.st).concat(cur.self?_base:[]).find(q=>q.n===name);
    if(!mem)return null;
    if(mem.gen){if(!gen)return null;cur={t:gen.split(',')[0].trim()}}
    else cur={t:mem.t};
    if(!cur.t||cur.t==='void')return null;
  }
  return cur;
}
/* ---- 한/영 자판 보정: 한글 자판 상태로 친 영어(ㅇ듀ㅕㅎ → debug)를 두벌식 키 위치로 되돌림 ---- */
const KO_CHO='rRseEfaqQtTdwWczxvg'.split(''),KO_JUNG='k o i O j p u P h hk ho hl y n nj np nl b m ml l'.split(' '),
  KO_JONG=['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'],
  KO_JAMO='r R rt s sw sg e E f fr fa fq ft fx fv fg a q Q qt t T d w W c z x v g k o i O j p u P h hk ho hl y n nj np nl b m ml l'.split(' ');
function ko2key(str){
  let o='';
  for(const ch of String(str)){const c=ch.charCodeAt(0);
    if(c>=0xAC00&&c<=0xD7A3){const k=c-0xAC00;o+=KO_CHO[Math.floor(k/588)]+KO_JUNG[Math.floor(k%588/28)]+KO_JONG[k%28]}
    else if(c>=0x3131&&c<=0x3163)o+=KO_JAMO[c-0x3131];
    else o+=ch}
  return o;
}
const hasHan=t=>/[ㄱ-ㆎ가-힣]/.test(t);
/* 한글 스크립트(실험)를 끈 상태에서만: 한글로 친 단어를 영어 키로 바꿔 후보를 찾음 */
const acKoFix=()=>!csedSet().ko&&csedSet().acKo!==false;
function acCompute(v,pos,force){
  const ls=v.lastIndexOf('\n',pos-1)+1,line=v.slice(ls,pos);
  const pm=/[\wÀ-￿]*$/.exec(line),prefix=pm?pm[0]:'',start=pos-prefix.length;
  const clean=csBlank(v,false);
  if(clean.slice(Math.max(ls,start-1),pos)!==v.slice(Math.max(ls,start-1),pos))return null;
  const before=v.slice(ls,start),dc=acDecls(koCode(clean)),attrCtx=/^\s*\[\s*$/.test(before);
  let items=null,dot=false,owner='';
  const dm=/\.\s*$/.exec(before);
  if(dm){
    dot=true;
    const chain=acChain(before.slice(0,dm.index));if(!chain)return null;
    const cur=acResolve(chain,dc);if(!cur)return null;
    items=acMembersOf(cur.t,!!cur.st).slice();owner=cur.t;
    if(cur.self){_base.forEach(b=>{if(!items.some(q=>q.n===b.n))items.push(b)});Object.keys(dc.vars).forEach(n=>items.push(Object.assign(_P(n,dc.vars[n]),{u:1})));Object.keys(dc.methods).forEach(n=>items.push(Object.assign(_F(n,dc.methods[n]),{u:1})))}
    if(!items.length)return null;
  }else if(/(?:GetComponent|컴포넌트가져오기)\s*<\s*$/.test(before)){
    items=AC_COMPS.concat(CSED.scripts().map(s=>parseCS(s.code).cls||s.name)).filter((x,i,a)=>a.indexOf(x)===i).map(n=>({n,k:'ty',t:'',d:'컴포넌트'}));
  }else if(/^\s*\[\s*$/.test(before)){
    items=AC_ATTR.map(([n,sn])=>({n,k:'sn',d:'특성',sn}));
  }else if(/^\s*using\s+[\w.]*$/.test(before)){
    items=AC_NS.map(n=>({n,k:'ty',d:'네임스페이스'}));
  }else{
    if(!prefix&&!force)return null;
    const pw0=/([\p{L}_][\p{L}\p{N}_]*)\s+$/u.exec(before),pw=pw0?[pw0[0],koStandEn(pw0[1])]:null;
    if(pw&&!force&&!AC_NOTYPE.has(pw[1])&&pw[1]!=='void'&&(AC_PRIM.includes(pw[1])||acIsType(pw[1])||/^[A-Z]/.test(pw[1])))return null;
    const afterNew=!!pw&&pw[1]==='new';
    const types=AC_TYPES.concat(CSED.scripts().map(s=>parseCS(s.code).cls||s.name)).filter((x,i,a)=>a.indexOf(x)===i).map(n=>({n,k:'ty',d:'타입'}));
    if(afterNew)items=types;
    else if(pw&&pw[1]==='void')items=AC_EV.map(([n])=>({n,k:'fn',t:'void',d:'Unity 메시지',a:false}));
    else{
      items=[];
      Object.keys(dc.vars).forEach(n=>items.push({n,k:'var',t:dc.vars[n],d:dc.vars[n],u:1}));
      Object.keys(dc.methods).forEach(n=>items.push({n,k:'fn',t:dc.methods[n],d:'() → '+dc.methods[n],a:false,u:1}));
      if(!/\S/.test(before))AC_EV.forEach(([n,sn])=>items.push({n,k:'ev',d:'Unity 메시지',sn}));
      AC_SN.forEach(([n,sn])=>items.push({n,k:'sn',d:'스니펫',sn}));
      _base.concat(CS_API.MonoBehaviour).forEach(b=>{if(!items.some(q=>q.n===b.n))items.push(b)});
      items=items.concat(types,AC_KW.map(n=>({n,k:'kw',d:'키워드'})));
    }
  }
  const conv=prefix&&acKoFix()&&hasHan(prefix)&&/^[\u3131-\u318E\uAC00-\uD7A3\w]+$/.test(prefix)?ko2key(prefix):'';
  const pfx=conv||prefix,p=pfx.toLowerCase(),seen=new Set(),res=[];
  const scOf=nm=>{if(!nm)return 9;const nl=nm.toLowerCase();if(!p)return 1;if(nm.startsWith(pfx))return 0;if(nl.startsWith(p))return 1;if(p.length>=2&&nm.replace(/[^A-Z]/g,'').toLowerCase().startsWith(p))return 2;if(nl.includes(p))return 3;return 9};
  const koOn=!!(csedSet().ko);
  items.forEach(it0=>{
    const key=it0.n+'|'+it0.k;if(seen.has(key))return;seen.add(key);
    const kn=acKoName(it0,owner,dot,attrCtx),sc=Math.min(scOf(it0.n),scOf(kn));if(sc>=9)return;
    const it=Object.assign({sc,o:owner},it0);if(kn)it.ko=kn;
    if(koOn&&it.sn)it.sn=attrCtx?(kn?it.sn.replace(it0.n,kn):it.sn):enToKo(it.sn);
    res.push(it);
  });
  if(!res.length)return null;
  const dn=x=>koOn&&x.ko?x.ko:x.n;res.sort((a,b)=>a.sc-b.sc||(AC_ORDER[a.k]-AC_ORDER[b.k])||(koOn?(!!b.ko)-(!!a.ko):0)||dn(a).localeCompare(dn(b),'ko'));
  /* 단어를 끝까지 입력한 경우: 목록 없이 도움말만 (스니펫·유니티 메시지는 Enter로 틀을 넣을 수 있게 목록 유지) */
  const exact=!conv&&res.find(r=>r.n===prefix||r.ko===prefix);
  if(exact&&!force&&!exact.sn)return{items:[exact],start,prefix,guide:true};
  return{items:res.slice(0,80),start,prefix,conv};
}
/* ---- 자동완성 가이드(한국어 설명 + 예시 코드) ---- */
const AC_DOC={
/* Unity 메시지 */
'Awake':['오브젝트가 만들어질 때 가장 먼저 한 번 호출됩니다.','void Awake()\n{\n    Debug.Log("깨어남");\n}'],
'Start':['첫 번째 Update 전에 한 번 호출됩니다. 초기 설정에 사용합니다.','void Start()\n{\n    Debug.Log("시작!");\n}'],
'Update':['매 프레임 호출됩니다. 입력 처리와 이동에 사용합니다.','void Update()\n{\n    if (Input.GetKeyDown(KeyCode.Space))\n        Debug.Log("스페이스!");\n}'],
'FixedUpdate':['일정한 시간 간격으로 호출됩니다. 물리 계산에 사용합니다.','void FixedUpdate()\n{\n    // 물리 처리\n}'],
'LateUpdate':['모든 Update가 끝난 뒤 매 프레임 호출됩니다.','void LateUpdate()\n{\n    // 카메라 추적 등\n}'],
'OnEnable':['오브젝트가 활성화될 때 호출됩니다.','void OnEnable()\n{\n    Debug.Log("활성화");\n}'],
'OnDisable':['오브젝트가 비활성화될 때 호출됩니다.','void OnDisable()\n{\n    Debug.Log("비활성화");\n}'],
'OnDestroy':['오브젝트가 제거될 때 호출됩니다.','void OnDestroy()\n{\n    Debug.Log("제거됨");\n}'],
'OnTriggerEnter2D':['트리거 영역에 다른 콜라이더가 들어올 때 호출됩니다.','void OnTriggerEnter2D(Collider2D other)\n{\n    Debug.Log(other.name);\n}'],
'OnTriggerExit2D':['트리거 영역에서 콜라이더가 나갈 때 호출됩니다.','void OnTriggerExit2D(Collider2D other)\n{\n    Debug.Log(other.name);\n}'],
'OnCollisionEnter2D':['다른 콜라이더와 충돌했을 때 호출됩니다.','void OnCollisionEnter2D(Collision2D col)\n{\n    Debug.Log(col.gameObject.name);\n}'],
/* 스니펫·키워드 */
'if':['조건이 참일 때만 실행합니다.','if (hp <= 0)\n{\n    Debug.Log("쓰러짐");\n}'],
'else':['if 조건이 거짓일 때 실행합니다.','else\n{\n    Debug.Log("아직 살아있음");\n}'],
'for':['정해진 횟수만큼 반복합니다.','for (int i = 0; i < 3; i++)\n{\n    Debug.Log(i);\n}'],
'foreach':['목록의 항목을 하나씩 꺼내 반복합니다.','foreach (var item in items)\n{\n    Debug.Log(item);\n}'],
'while':['조건이 참인 동안 반복합니다.','while (count < 5)\n{\n    count++;\n}'],
'switch':['값에 따라 여러 경우로 나눕니다.','switch (state)\n{\n    case 0:\n        break;\n}'],
'case':['switch 문의 한 경우를 나타냅니다.','case 1:\n    Debug.Log("하나");\n    break;'],
'break':['반복문이나 switch를 즉시 빠져나옵니다.','break;'],
'continue':['반복문의 나머지를 건너뛰고 다음 반복으로 갑니다.','continue;'],
'return':['함수를 끝내고 값을 돌려줍니다.','return 0;'],
'new':['새 객체를 만듭니다.','Vector3 p = new Vector3(1, 2, 0);'],
'var':['오른쪽 값으로 형식을 자동 결정하는 변수입니다.','var speed = 2.5f;'],
'void':['돌려주는 값이 없는 함수에 씁니다.','void Fire()\n{\n}'],
'public':['인스펙터에 노출되는 공개 멤버입니다.','public float speed = 3f;'],
'private':['이 클래스 안에서만 쓰는 멤버입니다.','private int count;'],
'static':['인스턴스 없이 클래스에 속하는 멤버입니다.','static int total;'],
'class':['클래스를 선언합니다.','public class Player : MonoBehaviour\n{\n}'],
'true':['참 값입니다.','bool alive = true;'],
'false':['거짓 값입니다.','bool alive = false;'],
'null':['아무것도 가리키지 않는 빈 값입니다.','if (target == null) return;'],
'this':['현재 스크립트 자신을 가리킵니다.','this.enabled = false;'],
'using':['네임스페이스를 가져옵니다.','using UnityEngine;'],
/* 타입 */
'int':['정수 형식입니다.','int count = 3;'],'float':['소수 형식입니다. 숫자 뒤에 f를 붙입니다.','float speed = 2.5f;'],
'bool':['참/거짓 형식입니다.','bool alive = true;'],'string':['문자열 형식입니다.','string msg = "안녕";'],
'List':['크기가 변하는 목록입니다.','List<int> nums = new List<int>();'],
'Dictionary':['키와 값을 짝지어 저장합니다.','Dictionary<string, int> hp = new Dictionary<string, int>();'],
'MonoBehaviour':['게임 오브젝트에 붙는 스크립트의 기본 클래스입니다.','public class Player : MonoBehaviour\n{\n}'],
/* 특성 */
'Header':['인스펙터에 제목 줄을 표시합니다.','[Header("이동")]\npublic float speed = 3f;'],
'SerializeField':['private 변수를 인스펙터에 노출합니다.','[SerializeField] private int hp = 3;'],
'Range':['숫자 변수를 슬라이더 범위로 제한합니다.','[Range(0, 1)]\npublic float volume = 0.5f;'],
'Tooltip':['인스펙터 속성의 ? 버튼에 설명을 표시합니다.','[Tooltip("이동 속도")]\npublic float speed = 3f;'],
'Space':['인스펙터에 빈 간격을 넣습니다.','[Space]\npublic int a;'],
'HideInInspector':['public 변수를 인스펙터에서 숨깁니다.','[HideInInspector] public int temp;'],
/* 공통 멤버 */
'gameObject':['이 컴포넌트가 붙은 게임 오브젝트입니다.','gameObject.name = "플레이어";'],
'transform':['위치·크기를 다루는 Transform 컴포넌트입니다.','transform.position = new Vector3(5, 3, 0);'],
'name':['게임 오브젝트의 이름입니다.','name = "펌킹";'],
'tag':['오브젝트를 분류하는 태그입니다.','if (tag == "Enemy") Debug.Log("적");'],
'enabled':['컴포넌트를 켜거나 끕니다.','enabled = false;'],
'GetComponent':['같은 오브젝트의 컴포넌트를 가져옵니다.','var light = GetComponent<Light>();\nlight.intensity = 0.5f;'],
'SetActive':['게임 오브젝트를 켜거나 끕니다. 꺼진 오브젝트(와 자식)는 보이지 않고 충돌·스크립트도 멈추며, 다시 켜면 돌아옵니다. 인스펙터 이름 옆 체크박스와 같습니다.','gameObject.SetActive(false);'],
'activeSelf':['오브젝트 자신이 켜져 있는지 나타냅니다. 부모가 꺼져 있는지는 activeInHierarchy로 확인합니다.','if (gameObject.activeSelf) Debug.Log("켜짐");'],
'GameObject.Find':['이름으로 게임 오브젝트를 찾습니다. UI 요소·UI 그룹 이름도 찾을 수 있습니다.','GameObject npc = GameObject.Find("펌킹");'],
'UIGroup.Find':['이름으로 UI 그룹(계층 구조의 UI 폴더)을 찾습니다. 그룹 안 요소 전체를 한 번에 옮기거나 크기를 바꿀 수 있습니다.','UIGroup.Find("메뉴").transform.position = new Vector2(0, 40);'],
'FindWithTag':['태그로 게임 오브젝트를 찾습니다.','GameObject p = GameObject.FindWithTag("Player");'],
/* Debug / Mathf / Time / Input */
'Log':['콘솔 창에 메시지를 출력합니다.','Debug.Log("안녕!");'],
'LogWarning':['콘솔 창에 경고를 출력합니다.','Debug.LogWarning("주의!");'],
'LogError':['콘솔 창에 오류를 출력합니다.','Debug.LogError("오류!");'],
'print':['콘솔 창에 값을 출력합니다.','print("hp = " + hp);'],
'PI':['원주율(3.14159…)입니다.','float c = 2 * Mathf.PI * r;'],
'Infinity':['무한대 값입니다.','float far = Mathf.Infinity;'],
'Deg2Rad':['도(°)를 라디안으로 바꾸는 값입니다.','float rad = 90 * Mathf.Deg2Rad;'],
'Rad2Deg':['라디안을 도(°)로 바꾸는 값입니다.','float deg = rad * Mathf.Rad2Deg;'],
'Abs':['절댓값을 구합니다.','float a = Mathf.Abs(-3f);'],
'Sin':['사인 값을 구합니다. (라디안)','float y = Mathf.Sin(Time.time);'],
'Cos':['코사인 값을 구합니다. (라디안)','float x = Mathf.Cos(Time.time);'],
'Tan':['탄젠트 값을 구합니다.','float t = Mathf.Tan(0.5f);'],
'Asin':['아크사인 값을 구합니다.','float a = Mathf.Asin(0.5f);'],
'Acos':['아크코사인 값을 구합니다.','float a = Mathf.Acos(0.5f);'],
'Atan':['아크탄젠트 값을 구합니다.','float a = Mathf.Atan(1f);'],
'Atan2':['(x, y) 방향의 각도(라디안)를 구합니다.','float a = Mathf.Atan2(dy, dx);'],
'Sqrt':['제곱근을 구합니다.','float r = Mathf.Sqrt(9f);'],
'Pow':['거듭제곱을 구합니다.','float v = Mathf.Pow(2f, 3f);'],
'Floor':['소수점을 내림합니다.','float v = Mathf.Floor(2.7f);'],
'Ceil':['소수점을 올림합니다.','float v = Mathf.Ceil(2.1f);'],
'Round':['소수점을 반올림합니다.','float v = Mathf.Round(2.5f);'],
'Sign':['부호(1 또는 -1)를 구합니다.','float s = Mathf.Sign(-4f);'],
'RoundToInt':['반올림해서 정수로 돌려줍니다.','int n = Mathf.RoundToInt(2.6f);'],
'FloorToInt':['내림해서 정수로 돌려줍니다.','int n = Mathf.FloorToInt(2.6f);'],
'CeilToInt':['올림해서 정수로 돌려줍니다.','int n = Mathf.CeilToInt(2.1f);'],
'Min':['두 값 중 작은 값을 돌려줍니다.','float v = Mathf.Min(a, b);'],
'Max':['두 값 중 큰 값을 돌려줍니다.','float v = Mathf.Max(a, b);'],
'Clamp':['값을 최소~최대 범위로 제한합니다.','hp = Mathf.Clamp(hp, 0, 10);'],
'Clamp01':['값을 0~1 범위로 제한합니다.','float t = Mathf.Clamp01(t);'],
'Mathf.Lerp':['두 값 사이를 t(0~1) 비율로 보간합니다.','float v = Mathf.Lerp(0f, 10f, 0.5f);'],
'Mathf.MoveTowards':['현재 값을 목표 값으로 일정량씩 이동시킵니다.','x = Mathf.MoveTowards(x, 10f, Time.deltaTime);'],
'deltaTime':['이전 프레임 이후 지난 시간(초)입니다. 속도에 곱해 프레임과 무관하게 움직입니다.','x += speed * Time.deltaTime;'],
'fixedDeltaTime':['물리 업데이트 간격(초)입니다.','float dt = Time.fixedDeltaTime;'],
'time':['게임 시작 후 지난 시간(초)입니다.','float t = Time.time;'],
'timeScale':['게임 진행 속도입니다. 0이면 멈춥니다.','Time.timeScale = 0.5f;'],
'frameCount':['지금까지 지난 프레임 수입니다.','int f = Time.frameCount;'],
'GetKey':['키를 누르고 있는 동안 true입니다.','if (Input.GetKey(KeyCode.W))\n    Debug.Log("전진");'],
'GetKeyDown':['키를 누른 그 프레임에만 true입니다.','if (Input.GetKeyDown(KeyCode.Space))\n    Debug.Log("점프");'],
'GetKeyUp':['키에서 손을 뗀 프레임에만 true입니다.','if (Input.GetKeyUp(KeyCode.Space))\n    Debug.Log("뗌");'],
'GetAxis':['축 입력값을 돌려줍니다. Horizontal: 왼쪽 -1 · 오른쪽 +1, Vertical: 위 -1 · 아래 +1 (이 엔진은 아래쪽이 +y)','float h = Input.GetAxis("Horizontal");'],
'GetAxisRaw':['축 입력값(-1, 0, 1)을 즉시 돌려줍니다. Vertical은 위 -1 · 아래 +1 입니다.','float v = Input.GetAxisRaw("Vertical");'],
'Hero.Move':['주인공을 이동시킵니다 (단위: 칸). 벽에 막히면 막히지 않은 축으로만 미끄러지듯 움직이고, 움직였으면 true를 돌려줍니다.','hero.Move(dir * speed * Time.deltaTime);'],
'Hero.Face':['주인공이 바라보는 방향을 정합니다. 공격 방향과 손전등(빛) 방향에 쓰입니다.','hero.Face(new Vector2(1, 0));'],
'Hero.CanMove':['그 거리만큼 움직일 수 있는지(벽에 막히지 않는지) 검사합니다.','if (hero.CanMove(Vector2.right)) Debug.Log("오른쪽이 비었음");'],
'Dialog':['대화창을 열고 닫는 엔진 기능입니다. 열려 있는 동안 게임이 멈추고 Space로 닫힙니다.','Dialog.Show("상인", "어서 오세요!");'],
'Message':['화면 아래에 짧은 알림 메시지를 띄우는 엔진 기능입니다.','Message.Show("문이 열렸다");'],
'Inventory':['주인공의 소지품(아이템 이름 → 개수)을 다루는 엔진 기능입니다. UI 텍스트의 {items}에 표시됩니다.','Inventory.Add("약초", 2);'],
'SceneManager':['씬을 불러오거나 게임을 다시 시작하는 엔진 기능입니다.','SceneManager.LoadScene("숲 입구");'],
'OnHeroEnter':['주인공이 이 오브젝트의 칸에 들어왔을 때 호출됩니다. (씬에 들어올 때 이미 겹쳐 있던 경우는 제외) 아이템 줍기·이벤트·포탈에 씁니다.','void OnHeroEnter()\n{\n    Debug.Log("들어옴");\n}'],
'OnHeroExit':['주인공이 이 오브젝트의 칸에서 나갔을 때 호출됩니다.','void OnHeroExit()\n{\n    Debug.Log("나감");\n}'],
'OnInteract':['주인공이 가까이에서 말을 걸면(hero.Interact) 호출됩니다. NPC 대화·상자 열기 등에 씁니다.','void OnInteract()\n{\n    Dialog.Show(name, "안녕!");\n}'],
'OnHit':['주인공의 공격(hero.Attack)에 맞았을 때 호출됩니다. 몬스터는 체력이 먼저 줄어든 뒤 불립니다.','void OnHit()\n{\n    Debug.Log("맞음");\n}'],
'OnHeroDeath':['주인공의 체력이 0이 되면 씬의 모든 스크립트(UI 포함)에 한 번 호출됩니다. 쓰러짐 화면을 여는 데 씁니다.','void OnHeroDeath()\n{\n    UIGroup.Find("쓰러짐 화면").SetActive(true);\n}'],
'Hero.main':['씬의 주인공입니다. 몬스터·NPC 스크립트에서 주인공 위치·체력을 볼 때 씁니다.','Hero hero = Hero.main;\nfloat d = Vector2.Distance(transform.position, hero.position);'],
'Hero.TakeDamage':['주인공에게 피해를 줍니다. 맞은 뒤 invincibleTime(기본 0.8초) 동안은 무적이라 false를 돌려줍니다. 체력이 0이 되면 OnHeroDeath()가 불립니다.','Hero.main.TakeDamage(10);'],
'Hero.Heal':['주인공의 체력을 회복합니다 (최대 100).','hero.Heal(20);'],
'Hero.Interact':['거리(칸) 안의 가장 가까운, OnInteract()를 가진 오브젝트에게 말을 겁니다. 대상이 있으면 true입니다.','if (hero.Interact(1.4f)) return;'],
'Hero.isDead':['주인공이 쓰러졌는지 나타냅니다.','if (hero.isDead) return;'],
'Hero.invincibleTime':['피해를 받은 뒤 무적인 시간(초)입니다. 기본 0.8초입니다.','hero.invincibleTime = 1.5f;'],
'Monster.Move':['몬스터를 이동시킵니다 (단위: 칸). 벽·NPC·박스 콜라이더에 막히면 false입니다.','monster.Move(dir * 2f * Time.deltaTime);'],
'Monster.TakeDamage':['몬스터의 체력을 줄이고 잠깐 깜빡이게 합니다. 남은 체력을 돌려줍니다.','monster.TakeDamage(1);'],
'Monster.Die':['몬스터를 쓰러뜨려 숨깁니다. (스크립트도 멈춤)','if (monster.hp <= 0) monster.Die();'],
'Monster.position':['몬스터의 현재 위치(칸 좌표)입니다.','float d = Vector2.Distance(monster.position, hero.position);'],
'Npc.Talk':['이 NPC의 대사를 대화창에 띄웁니다.','GetComponent<Npc>().Talk();'],
'Portal.Teleport':['포탈에 지정한 씬의 도착 위치로 주인공을 이동시킵니다.','GetComponent<Portal>().Teleport();'],
'Dialog.Show':['대화창을 엽니다. 열려 있는 동안 게임이 멈추고 Space로 닫힙니다.','Dialog.Show("상인", "어서 오세요!");'],
'Dialog.Close':['열린 대화창을 닫습니다.','Dialog.Close();'],
'Message.Show':['화면 아래에 짧은 메시지를 잠깐 띄웁니다. 두 번째 값은 표시 시간(초)입니다.','Message.Show("열쇠 획득", 2f);'],
'Inventory.Add':['소지품에 아이템을 더합니다.','Inventory.Add("열쇠", 1);'],
'Inventory.Remove':['소지품에서 아이템을 뺍니다. 모자라면 false입니다.','if (Inventory.Remove("열쇠", 1)) Debug.Log("문이 열림");'],
'Inventory.Count':['소지품에 있는 아이템 개수입니다.','int n = Inventory.Count("약초");'],
'Inventory.Has':['소지품에 그 아이템이 있는지 나타냅니다.','if (Inventory.Has("열쇠")) portal.Teleport();'],
'SceneManager.LoadScene':['이름(또는 순번)으로 씬을 불러옵니다.','SceneManager.LoadScene("숲 입구");'],
'SceneManager.RestartGame':['체력을 채우고 시작 씬에서 게임을 다시 시작합니다. (소지품은 유지)','SceneManager.RestartGame();'],
'UIGroup.SetActive':['UI 그룹 안의 요소를 모두 보이거나 숨깁니다.','UIGroup.Find("쓰러짐 화면").SetActive(true);'],
'Hero.Attack':['주인공이 바라보는 방향으로 공격합니다 (피해, 사거리(칸)). 맞힌 대상 수를 돌려줍니다. 인자 없이 부르면 가까운 대상에게 말을 걸거나 공격합니다.','if (Input.GetKeyDown(KeyCode.X)) hero.Attack();'],
'Hero.position':['주인공의 현재 위치(칸 좌표)입니다. 대입하면 벽을 무시하고 순간 이동합니다.','hero.position = new Vector2(3, 4);'],
'Hero.facing':['주인공이 바라보는 방향입니다.','Vector2 f = hero.facing;'],
'Hero.hp':['주인공의 체력(0~100)입니다.','hero.hp = 100;'],
'Hero.isMoving':['이번 프레임에 주인공이 움직였는지 나타냅니다.','if (hero.isMoving) Debug.Log("이동 중");'],
'Hero.radius':['벽 충돌 판정 반경(칸)입니다. 기본 약 0.28칸입니다.','hero.radius = 0.4f;'],
'Hero':['주인공 컴포넌트입니다. 이동 스크립트에서 GetComponent<Hero>()로 가져와 Move·Face로 주인공을 움직입니다.','Hero hero = GetComponent<Hero>();\nhero.Move(new Vector2(1, 0) * Time.deltaTime);'],
'Random.Range':['범위 안의 무작위 값을 돌려줍니다. 두 값이 정수면 최댓값을 뺀 정수를 돌려줍니다.','int n = Random.Range(0, 3);'],
'Random.value':['0~1 사이의 무작위 값입니다.','if (Random.value < 0.5f) Debug.Log("반반");'],
'smoothFollow':['카메라가 대상을 부드럽게(살짝 늦게) 따라갈지 정합니다.','Camera.main.smoothFollow = true;'],
'smoothTime':['부드럽게 따라가기에서 대상에 거의 따라붙는 데 걸리는 시간(초)입니다. 클수록 느긋하게 따라옵니다.','Camera.main.smoothTime = 0.5f;'],
'GetButton':['버튼을 누르고 있는 동안 true입니다.','if (Input.GetButton("Fire1")) Debug.Log("발사");'],
'GetButtonDown':['버튼을 누른 프레임에만 true입니다.','if (Input.GetButtonDown("Jump")) Debug.Log("점프");'],
'GetMouseButton':['마우스 버튼을 누르고 있는 동안 true입니다. (0=왼쪽)','if (Input.GetMouseButton(0)) Debug.Log("클릭 중");'],
'GetMouseButtonDown':['마우스 버튼을 누른 프레임에만 true입니다.','if (Input.GetMouseButtonDown(0)) Debug.Log("클릭");'],
'mousePosition':['마우스 화면 좌표입니다.','Vector3 m = Input.mousePosition;'],
/* 벡터·색 */
'x':['X 성분(가로)입니다.','float px = transform.position.x;'],
'y':['Y 성분(세로)입니다.','float py = transform.position.y;'],
'z':['Z 성분입니다. 2D에서는 보통 0입니다.','float pz = v.z;'],
'magnitude':['벡터의 길이입니다.','float len = v.magnitude;'],
'normalized':['길이가 1인 방향 벡터입니다.','Vector3 dir = v.normalized;'],
'Normalize':['벡터의 길이를 1로 만듭니다.','v.Normalize();'],
'Set':['벡터의 값을 한 번에 지정합니다.','v.Set(1f, 2f, 0f);'],
'zero':['(0, 0, 0) 벡터입니다.','transform.position = Vector3.zero;'],
'one':['(1, 1, 1) 벡터입니다.','transform.localScale = Vector3.one;'],
'up':['위쪽 방향 (0, -1)입니다. 이 엔진은 아래쪽이 +y 입니다.','Vector2 d = Vector2.up;'],
'down':['아래쪽 방향 (0, 1)입니다.','Vector2 d = Vector2.down;'],
'left':['왼쪽 방향 (-1, 0, 0)입니다.','Vector3 d = Vector3.left;'],
'right':['오른쪽 방향 (1, 0, 0)입니다.','Vector3 d = Vector3.right;'],
'Distance':['두 점 사이의 거리를 구합니다.','float d = Vector3.Distance(a, b);'],
'Dot':['두 벡터의 내적을 구합니다.','float d = Vector3.Dot(a, b);'],
'Vector2.Lerp':['두 벡터 사이를 t(0~1) 비율로 보간합니다.','Vector2 p = Vector2.Lerp(a, b, 0.5f);'],
'Vector3.Lerp':['두 벡터 사이를 t(0~1) 비율로 보간합니다.','Vector3 p = Vector3.Lerp(a, b, 0.5f);'],
'Vector2.MoveTowards':['현재 위치를 목표로 일정 거리씩 이동시킵니다.','p = Vector2.MoveTowards(p, target, Time.deltaTime);'],
'Vector3.MoveTowards':['현재 위치를 목표로 일정 거리씩 이동시킵니다.','p = Vector3.MoveTowards(p, target, Time.deltaTime);'],
'r':['빨강 성분(0~1)입니다.','float r = color.r;'],'g':['초록 성분(0~1)입니다.','float g = color.g;'],
'b':['파랑 성분(0~1)입니다.','float b = color.b;'],'a':['투명도(0~1)입니다.','float a = color.a;'],
'Euler':['x, y, z 각도(°)로 회전값을 만듭니다.','Quaternion q = Quaternion.Euler(0, 0, 90);'],
'identity':['회전이 없는 상태입니다.','transform.rotation = Quaternion.identity;'],
'eulerAngles':['회전을 각도(°)로 나타냅니다.','Vector3 r = transform.eulerAngles;'],
/* Transform */
'position':['게임 오브젝트의 위치(칸 좌표)입니다. 인스펙터의 position과 같습니다.','transform.position = new Vector3(5, 3, 0);'],
'localPosition':['부모 기준 위치입니다.','transform.localPosition = new Vector3(1, 0, 0);'],
'localScale':['크기 배율입니다. 인스펙터의 localScale과 같습니다.','transform.localScale = new Vector3(2, 2, 1);'],
'rotation':['회전값(Quaternion)입니다.','transform.rotation = Quaternion.Euler(0, 0, 45);'],
'parent':['부모 Transform입니다.','Transform p = transform.parent;'],
'childCount':['자식 오브젝트 수입니다.','int n = transform.childCount;'],
'Translate':['지정한 만큼 이동합니다.','transform.Translate(new Vector3(1, 0, 0));'],
'Rotate':['지정한 각도만큼 회전합니다.','transform.Rotate(90f);'],
'LookAt':['대상을 바라보게 합니다.','transform.LookAt(target);'],
'Transform.Find':['이름으로 자식 Transform을 찾습니다.','Transform c = transform.Find("Weapon");'],
'GetChild':['순번으로 자식 Transform을 가져옵니다.','Transform c = transform.GetChild(0);'],
'SetParent':['부모를 지정합니다.','transform.SetParent(parent);'],
/* 컴포넌트 */
'velocity':['이동 속도 벡터입니다.','rb.velocity = new Vector2(2, 0);'],
'angularVelocity':['회전 속도입니다.','rb.angularVelocity = 90f;'],
'gravityScale':['중력 배율입니다.','rb.gravityScale = 0f;'],
'mass':['질량입니다.','rb.mass = 2f;'],
'drag':['이동 저항(감속)입니다.','rb.drag = 1f;'],
'isKinematic':['true이면 물리 힘의 영향을 받지 않습니다.','rb.isKinematic = true;'],
'simulated':['물리 시뮬레이션 사용 여부입니다.','rb.simulated = false;'],
'AddForce':['힘을 가합니다.','rb.AddForce(new Vector2(0, 5));'],
'MovePosition':['지정한 위치로 이동시킵니다.','rb.MovePosition(new Vector2(3, 4));'],
'sprite':['표시할 스프라이트입니다. 인스펙터의 sprite와 같습니다.','var sr = GetComponent<SpriteRenderer>();\nDebug.Log(sr.sprite);'],
'color':['색상입니다.','GetComponent<Light>().color = Color.yellow;'],
'flipX':['가로로 뒤집습니다.','sr.flipX = true;'],
'flipY':['세로로 뒤집습니다.','sr.flipY = true;'],
'sortingOrder':['그려지는 순서입니다. 값이 클수록 위에 그려집니다. 인스펙터의 sortingOrder와 같습니다.','sr.sortingOrder = 20;'],
'intensity':['빛의 세기입니다. (0.1~1)','GetComponent<Light>().intensity = 0.6f;'],
'radius':['빛이 닿는 거리(칸)입니다.','GetComponent<Light>().radius = 8f;'],
'angle':['빛이 퍼지는 각도입니다. 360이면 원, 작으면 부채꼴입니다.','GetComponent<Light>().angle = 60f;'],
'dir':['빛이 향하는 각도입니다. 0은 오른쪽, 90은 아래쪽입니다.','GetComponent<Light>().dir = 90f;'],
'shadows':['true이면 벽 타일맵에 빛이 가려집니다.','GetComponent<Light>().shadows = false;'],
'hp':['몬스터의 체력입니다.','GetComponent<Monster>().hp = 5;'],
'speed':['이동 속도입니다. (Monster: 추적 속도)','GetComponent<Monster>().speed = 80;'],
'range':['감지 범위(칸)입니다.','GetComponent<Monster>().range = 6;'],
'text':['표시되는 문장입니다. (Npc 대사, EventTrigger 메시지)','GetComponent<Npc>().text = "어서 와.";'],
'qty':['아이템 수량입니다.','GetComponent<Item>().qty = 3;'],
'tx':['포탈 도착 위치의 X 칸 좌표입니다.','GetComponent<Portal>().tx = 10;'],
'ty':['포탈 도착 위치의 Y 칸 좌표입니다.','GetComponent<Portal>().ty = 4;'],
'SetBool':['Animator의 bool 파라미터를 설정합니다.','anim.SetBool("run", true);'],
'SetTrigger':['Animator의 트리거를 발동합니다.','anim.SetTrigger("attack");'],
'SetFloat':['Animator의 float 파라미터를 설정합니다.','anim.SetFloat("speed", 1.5f);'],
'SetInteger':['Animator의 int 파라미터를 설정합니다.','anim.SetInteger("state", 2);'],
'Animator.Play':['지정한 애니메이션 상태를 재생합니다.','anim.Play("Walk");'],
'Animator.speed':['애니메이션 재생 속도입니다.','anim.speed = 2f;'],
'AudioSource':['오디오 소스 컴포넌트입니다. 인스펙터에서 고른 오디오 클립(음악·효과음)을 재생합니다.','AudioSource audioSource = GetComponent<AudioSource>();\naudioSource.Play();'],
'Sound':['게임 전체의 배경 음악과 효과음을 다루는 정적 클래스입니다. 어느 스크립트에서나 쓸 수 있고, 배경 음악은 씬이 바뀌어도 이어서 재생됩니다. 보통 BGM 매니저에서 씁니다.','Sound.PlayMusic("타니아의 아침", 0.5f);'],
'PlayMusic':['프로젝트 패널의 오디오 이름으로 배경 음악을 반복 재생합니다. 이미 같은 음악이 나오고 있으면 처음부터 다시 틀지 않습니다.','Sound.PlayMusic("타니아의 아침", 0.5f);'],
'StopMusic':['배경 음악을 멈춥니다.','Sound.StopMusic();'],
'PauseMusic':['배경 음악을 잠시 멈춥니다. ResumeMusic()으로 이어서 재생합니다.','Sound.PauseMusic();'],
'ResumeMusic':['잠시 멈춘 배경 음악을 이어서 재생합니다.','Sound.ResumeMusic();'],
'SetMusicVolume':['배경 음악 볼륨(0~1)을 바꿉니다.','Sound.SetMusicVolume(0.3f);'],
'PlayEffect':['효과음을 한 번 재생합니다 (겹쳐서 재생됨).','Sound.PlayEffect("coin");'],
'isMusicPlaying':['배경 음악이 재생 중인지 알려 줍니다.','if (!Sound.isMusicPlaying) Sound.PlayMusic("타니아의 아침");'],
'PlayOneShot':['지금 소리를 끊지 않고 효과음을 겹쳐 한 번 재생합니다. 클립 이름을 주면 그 클립을, 없으면 지정된 클립을 냅니다.','audioSource.PlayOneShot("coin");\naudioSource.PlayOneShot("hit", 0.5f);'],
'PlayDelayed':['몇 초 뒤에 재생합니다.','audioSource.PlayDelayed(1.5f);'],
'UnPause':['일시정지한 소리를 이어서 재생합니다.','audioSource.UnPause();'],
'AudioSource.clip':['재생할 오디오 클립 이름입니다. 프로젝트 패널의 오디오 이름으로 바꿀 수 있습니다.','audioSource.clip = "boss_bgm";\naudioSource.Play();'],
'AudioSource.isPlaying':['지금 재생 중인지 알려 줍니다.','if (!audioSource.isPlaying) audioSource.Play();'],
'AudioSource.time':['지금 재생 위치(초)입니다.','audioSource.time = 0f;'],
'mute':['소리만 끕니다 (재생은 계속).','audioSource.mute = true;'],
'playOnAwake':['시작할 때 저절로 재생할지 정합니다.','audioSource.playOnAwake = false;'],
'Animator':['애니메이터 컴포넌트입니다. 애니메이터 창의 컨트롤러(상태 · 전환)를 따라 클립을 재생하고, 스크립트는 파라미터를 바꿔 전환을 일으킵니다.','Animator animator = GetComponent<Animator>();\nanimator.SetBool("IsMoving", true);'],
'ResetTrigger':['발동해 둔 트리거를 끕니다 (전환이 일어나면 저절로 꺼집니다).','animator.ResetTrigger("Attack");'],
'GetBool':['Animator의 bool 파라미터 값을 읽습니다.','if (animator.GetBool("IsMoving")) Debug.Log("걷는 중");'],
'GetFloat':['Animator의 float 파라미터 값을 읽습니다.','float s = animator.GetFloat("Speed");'],
'GetInteger':['Animator의 int 파라미터 값을 읽습니다.','int d = animator.GetInteger("Dir");'],
'Animator.CrossFade':['지정한 상태로 바로 넘어갑니다. (2D 스프라이트 애니메이션이라 섞임 없이 Play와 같습니다)','animator.CrossFade("Attack", 0.1f);'],
'GetCurrentAnimatorStateInfo':['지금 재생 중인 상태의 정보를 가져옵니다. IsName("상태 이름") · normalizedTime(1 = 한 번 다 재생)','var info = animator.GetCurrentAnimatorStateInfo(0);\nif (info.IsName("공격") && info.normalizedTime >= 1f) Debug.Log("공격 끝");'],
'HasState':['컨트롤러에 그 이름의 상태가 있는지 알려 줍니다.','if (animator.HasState(0, "점프")) animator.Play("점프");'],
'IsName':['상태 이름이 맞는지 확인합니다.','animator.GetCurrentAnimatorStateInfo(0).IsName("걷기_아래")'],
'normalizedTime':['상태를 재생한 정도입니다. 0 = 시작, 1 = 클립 한 번 끝, 반복하면 계속 커집니다.','float t = info.normalizedTime % 1f;'],
'volume':['소리 크기(0~1)입니다.','audio.volume = 0.5f;'],
'pitch':['소리 높낮이(재생 속도)입니다.','audio.pitch = 1.2f;'],
'loop':['반복 재생 여부입니다.','audio.loop = true;'],
'isPlaying':['재생 중인지 나타냅니다.','if (audio.isPlaying) Debug.Log("재생 중");'],
'AudioSource.Play':['소리를 재생합니다.','audio.Play();'],
'Stop':['소리를 멈춥니다.','audio.Stop();'],
'Pause':['소리를 일시정지합니다.','audio.Pause();'],
'isTrigger':['true이면 통과하면서 트리거 이벤트만 발생합니다.','col.isTrigger = true;'],
'CompareTag':['태그가 같은지 검사합니다.','if (other.CompareTag("Player")) Debug.Log("주인공");'],
'collider':['충돌한 상대의 Collider2D입니다.','Collider2D c = col.collider;'],
'orthographicSize':['카메라가 위아래로 보여 주는 범위의 절반(칸)입니다. 작을수록 확대됩니다. 인스펙터 카메라의 “크기”와 같습니다.','Camera.main.orthographicSize = 3f;'],
'backgroundColor':['카메라 배경색입니다.','Camera.main.backgroundColor = Color.black;'],
'main':['메인 카메라입니다.','Camera cam = Camera.main;'],
/* 문자열·배열 */
'string.Length':['문자열의 글자 수입니다.','int n = "안녕".Length;'],
'Array.Length':['배열의 크기입니다.','int n = arr.Length;'],
'ToUpper':['대문자로 바꿉니다.','string s = "abc".ToUpper();'],
'ToLower':['소문자로 바꿉니다.','string s = "ABC".ToLower();'],
'Trim':['앞뒤 공백을 제거합니다.','string s = " 안녕 ".Trim();'],
'Contains':['문자열이 포함되어 있는지 검사합니다.','bool b = name.Contains("몬스터");'],
'StartsWith':['해당 문자열로 시작하는지 검사합니다.','bool b = name.StartsWith("적");'],
'EndsWith':['해당 문자열로 끝나는지 검사합니다.','bool b = name.EndsWith("1");'],
'IndexOf':['문자열이 처음 나오는 위치를 돌려줍니다.','int i = name.IndexOf("-");'],
'Substring':['문자열의 일부를 잘라냅니다.','string s = name.Substring(0, 2);'],
'Replace':['문자열의 일부를 다른 문자열로 바꿉니다.','string s = name.Replace("A", "B");'],
'Split':['구분자로 문자열을 나눕니다.','string[] p = "a,b".Split(\',\');'],
/* MonoBehaviour */
'Destroy':['게임 오브젝트를 제거합니다.','Destroy(gameObject);'],
'Instantiate':['게임 오브젝트를 복제해서 만듭니다.','Instantiate(prefab);'],
'Invoke':['지정한 시간(초) 뒤에 함수를 실행합니다.','Invoke("Fire", 2f);'],
'InvokeRepeating':['지정한 시간 뒤부터 일정 간격으로 함수를 반복 실행합니다.','InvokeRepeating("Fire", 1f, 0.5f);'],
'CancelInvoke':['예약된 Invoke를 모두 취소합니다.','CancelInvoke();'],
'StartCoroutine':['코루틴(시간에 걸친 작업)을 시작합니다.','StartCoroutine(Wait());'],
};
function acDoc(it){
  const g=!it.u&&((it.o&&AC_DOC[it.o+'.'+it.n])||AC_DOC[it.n]);
  if(g)return{ko:g[0],ex:g[1]||''};
  if(it.o==='KeyCode')return{ko:'키보드·마우스 입력 코드 '+it.n+'입니다.',ex:'if (Input.GetKey(KeyCode.'+it.n+'))\n    Debug.Log("눌림");'};
  if(it.o==='Color')return{ko:it.n+' 색상입니다.',ex:'GetComponent<Light>().color = Color.'+it.n+';'};
  if(it.sn)return{ko:it.k==='ev'?'유니티 메시지 함수입니다. Enter로 틀을 삽입합니다.':it.k==='sn'?'코드 조각입니다. Enter로 틀을 삽입합니다.':'',ex:it.sn.replace('|','')};
  if(it.k==='ty'&&it.d==='컴포넌트')return{ko:'GetComponent<T>()로 가져올 수 있는 컴포넌트입니다.',ex:'var c = GetComponent<'+it.n+'>();'};
  if(it.k==='ty'&&it.d==='네임스페이스')return{ko:'가져올 수 있는 네임스페이스입니다.',ex:'using '+it.n+';'};
  if(it.k==='ty')return{ko:it.n+' 형식(클래스)입니다.',ex:it.n+' obj;'};
  if(it.k==='var')return{ko:'이 스크립트에서 선언한 변수입니다. (형식: '+(it.t||'?')+')',ex:''};
  if(it.k==='fn'&&(it.u||!it.o))return{ko:'이 스크립트에서 선언한 함수입니다.',ex:''};
  if(it.k==='kw')return{ko:'C# 키워드입니다.',ex:''};
  return{ko:it.o?it.o+'의 멤버입니다.'+(it.t?' (형식: '+it.t+')':''):'',ex:''};
}
function acGuide(it){
  if(!it)return'';
  const d=acDoc(it),ko=!!csedSet().ko,nm=ko&&it.ko?it.ko:it.n,T=x=>ko?koTypes(x):x;
  let sig='';
  if(it.k==='fn')sig=it.gen?'T '+nm+'<T>()':T(it.t||'void')+' '+nm+T((it.d||'').split(' → ')[0]||'()');
  else if((it.k==='pr'||it.k==='var')&&it.t)sig=T(it.t)+' '+nm;
  const sub=ko&&it.ko?(it.o?it.o+'.':'')+it.n:it.o;
  const ex=d.ex&&ko?enToKo(d.ex):d.ex;
  return`<div class="acg-h"><b>${csedEsc(nm)}</b>${sub?`<span>${csedEsc(sub)}</span>`:''}</div>`+(sig?`<code class="acg-s">${csedEsc(sig)}</code>`:'')+(d.ko?`<p class="acg-d">${csedEsc(d.ko)}</p>`:'')+(ex?`<div class="acg-l">예시</div><pre class="acg-x">${csedEsc(ex)}</pre>`:'');
}
const ac={on:false,items:[],sel:0,start:0,ta:null,mute:false,el:null,guide:false};
function acEl(){
  if(ac.el)return ac.el;
  const b=document.createElement('div');b.className='acbox';b.setAttribute('role','listbox');
  b.addEventListener('mousedown',e=>{e.preventDefault();const r=e.target.closest('.aci');if(r)acAccept(+r.dataset.i)});
  b.addEventListener('mouseover',e=>{const r=e.target.closest('.aci'),g=b.querySelector('.acg');if(r&&g)g.innerHTML=acGuide(ac.items[+r.dataset.i])});
  b.addEventListener('mouseleave',()=>{const g=b.querySelector('.acg');if(g)g.innerHTML=acGuide(ac.items[ac.sel])});
  document.body.append(b);ac.el=b;return b;
}
function acHide(){ac.on=false;if(ac.el)ac.el.style.display='none'}
function acCharW(cs){const c=acCharW.c||(acCharW.c=document.createElement('canvas').getContext('2d'));c.font=cs.fontSize+' '+cs.fontFamily;return c.measureText('0').width}
function acPlace(){
  const b=ac.el,ta=ac.ta;if(!b||!ta)return;
  const tw=csedWin(ta);if(b.ownerDocument!==ta.ownerDocument)ta.ownerDocument.body.append(b);
  const cs=tw.getComputedStyle(ta),lh=parseFloat(cs.lineHeight)||21,cw=acCharW(cs),r=ta.getBoundingClientRect();
  const lines=ta.value.slice(0,ac.start).split('\n'),ln=lines.length-1;let vc=0;
  for(const ch of lines[ln])vc=ch==='\t'?((vc/4)|0)*4+4:vc+1;
  let x=r.left+parseFloat(cs.paddingLeft)+vc*cw-ta.scrollLeft,y=r.top+parseFloat(cs.paddingTop)+(ln+1)*lh-ta.scrollTop;
  b.style.display='block';const w=b.offsetWidth,h=b.offsetHeight;
  if(y+h>tw.innerHeight-8)y=Math.max(8,y-lh-h);
  x=clamp(x,8,Math.max(8,tw.innerWidth-w-8));
  b.style.left=Math.round(x)+'px';b.style.top=Math.round(y)+'px';
}
function acRender(){
  const b=acEl();
  b.classList.toggle('guide',!!ac.guide);
  if(ac.guide){b.innerHTML=`<div class="acg">${acGuide(ac.items[0])}</div><div class="acf">. 입력 시 멤버 목록 · Ctrl+Space 후보 보기 · Esc 닫기</div>`;acPlace();return}
  b.innerHTML=`<div class="acl">`+ac.items.map((it,i)=>`<div class="aci${i===ac.sel?' on':''}" data-i="${i}" role="option"><span class="ack ${it.k}">${AC_ICON[it.k]}</span><span class="acn">${csedEsc(csedSet().ko&&it.ko?it.ko:it.n)}</span><span class="acd">${csedEsc(csedSet().ko?(it.ko?it.n+' · ':'')+koTypes(it.d):(it.d||''))}</span></div>`).join('')+`</div><div class="acg">${acGuide(ac.items[ac.sel])}</div><div class="acf">${ac.conv?`<span class="acconv" title="${csedEsc(csedT('한글 자판 상태로 입력한 영어를 바꿔 찾았습니다 (설정 › 스크립트 편집기에서 끌 수 있음)'))}">${csedEsc(csedT('한/영 보정'))} → <b>${csedEsc(ac.conv)}</b></span> · `:''}↑↓ 선택 · Enter/Tab 삽입 · Esc 닫기</div>`;
  acPlace();
  const on=b.querySelector('.aci.on');if(on)on.scrollIntoView({block:'nearest'});
}
function acUpdate(ta,force){
  if(ta.selectionStart!==ta.selectionEnd){acHide();return}
  let r=null;try{r=acCompute(ta.value,ta.selectionStart,force)}catch(err){r=null}
  if(!r){acHide();return}
  const same=ac.on&&ac.ta===ta&&ac.start===r.start;
  ac.on=true;ac.ta=ta;ac.items=r.items;ac.start=r.start;ac.guide=!!r.guide;ac.conv=r.conv||'';if(!same||ac.guide)ac.sel=0;ac.sel=Math.min(ac.sel,r.items.length-1);
  acRender();
}
function acAccept(i){
  const it=ac.items[i],ta=ac.ta;if(!it||!ta)return;
  const v=ta.value,a=ac.start,b=ta.selectionStart;
  const ls=v.lastIndexOf('\n',a-1)+1,ind=/^[ \t]*/.exec(v.slice(ls,a))[0];
  const nm=csedSet().ko&&it.ko?it.ko:it.n;
  let txt=nm,cur=a+txt.length,retrig=false;
  if(it.sn){const s=it.sn.replace(/\n/g,'\n'+ind),ci=s.indexOf('|');txt=s.replace('|','');cur=ci>=0?a+ci:a+txt.length}
  else if(it.k==='fn'&&v[b]!=='('){
    if(it.gen){txt=nm+'<>()';cur=a+nm.length+1;retrig=true}
    else{txt=nm+'()';cur=a+nm.length+(it.a?1:2)}
  }
  ta.setRangeText(txt,a,b,'end');ta.setSelectionRange(cur,cur);
  ac.mute=true;ta.dispatchEvent(new Event('input'));ac.mute=false;
  acHide();ta.focus();
  if(retrig)setTimeout(()=>acUpdate(ta,true),0);
}
/* 코드 편집기 실행 취소: 자동 들여쓰기(Tab · Enter · 자동완성)가 브라우저 기본 실행 취소 기록을 끊기 때문에 직접 기록합니다.
   Ctrl+Z 되돌리기 · Ctrl+Y / Ctrl+Shift+Z 다시 실행 · 이어서 친 글자는 한 번에 되돌려요 */
function edUndo(ta){
  if(ta._undo)return;const H=ta._undo={st:[],i:-1,t:0,typing:false,busy:false};
  const snap=()=>({v:ta.value,s:ta.selectionStart,e:ta.selectionEnd});
  const sync=()=>{if(!H.st.length||H.st[H.i].v!==ta.value){H.st=[snap()];H.i=0;H.typing=false}};
  const apply=q=>{H.busy=true;ta.value=q.v;try{ta.setSelectionRange(q.s,q.e)}catch(e){}ta.dispatchEvent(new Event('input',{bubbles:true}));H.busy=false;H.typing=false};
  ta.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.code==='KeyZ'||e.code==='KeyY')){
      e.preventDefault();e.stopImmediatePropagation();sync();
      if(e.code==='KeyY'||e.shiftKey){if(H.i<H.st.length-1){H.i++;apply(H.st[H.i])}}
      else if(H.i>0){H.i--;apply(H.st[H.i])}
      return;
    }
    sync();
  },true);
  ta.addEventListener('focus',sync);
  ta.addEventListener('input',e=>{
    if(H.busy)return;
    const q=snap(),now=Date.now(),typing=e.inputType==='insertText'&&!!e.data&&e.data.length===1;
    if(!H.st.length){H.st=[q];H.i=0;H.typing=typing;H.t=now;return}
    H.st=H.st.slice(0,H.i+1);
    if(typing&&H.typing&&now-H.t<1000&&H.i>0)H.st[H.i]=q;
    else{H.st.push(q);if(H.st.length>300)H.st.shift();H.i=H.st.length-1}
    H.typing=typing;H.t=now;
  });
}
/* ---- 자동 보정: '.' 이나 '(' 를 치는 순간 바로 앞 단어를 고침 ----
   · 대소문자: debug. → Debug. · Debug.log( → Debug.Log( (그 자리에 대소문자만 다른 후보가 있고, 똑같은 이름이 없을 때만)
   · 한/영: ㅇ듀ㅕㅎ. → Debug. (한글 스크립트를 끈 상태)
   설정 › 스크립트 편집기에서 각각 끌 수 있습니다 */
function acFix(ta){
  const v=ta.value,pos=ta.selectionStart-1;if(pos<1||ta.selectionStart!==ta.selectionEnd)return false;
  const ls=v.lastIndexOf('\n',pos-1)+1,wm=/[A-Za-z_ㄱ-ㆎ가-힣][\wㄱ-ㆎ가-힣]*$/.exec(v.slice(ls,pos));if(!wm)return false;
  const word=wm[0],ws=pos-word.length,han=hasHan(word);
  if(han?!acKoFix():csedSet().acCase===false)return false;
  const lat=han?ko2key(word):word;if(!/^[A-Za-z_]\w*$/.test(lat))return false;
  let r=null;try{r=acCompute(v.slice(0,ws)+lat+v.slice(pos),ws+lat.length,true)}catch(e){r=null}
  if(!r||!r.items.length)return false;
  if(r.items.some(it=>it.n===lat||it.ko===word)){if(!han)return false}
  const L=lat.toLowerCase(),hit=r.items.find(it=>it.n===lat)||r.items.find(it=>it.n.toLowerCase()===L);
  if(!hit||hit.n===word)return false;
  ta.setRangeText(hit.n,ws,pos,'end');const c=ws+hit.n.length+1;ta.setSelectionRange(c,c);
  ac.mute=true;ta.dispatchEvent(new Event('input',{bubbles:true}));ac.mute=false;
  return true;
}

/* ---- 스크립트 입력 효과 (설정 › 스크립트 편집기 · 기본 꺼짐) ----
   fxSpark: 키를 칠 때마다 커서에서 불똥이 튀고 편집기가 살짝 흔들림 (콤보가 쌓일수록 세짐)
   fxCombo: 빠르게 이어 치면 콤보가 쌓여 게임처럼 숫자·칭호가 뜸 (1.2초 쉬면 끝)
   fxSound: 타자기 같은 키 소리 (Space·Enter는 낮은 소리, 지우기는 짧은 소리) */
const FX={n:0,last:0,best:0,t:0};
const fxReduced=w=>{try{return w.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
function fxCaret(ta){
  const w=csedWin(ta),cs=w.getComputedStyle(ta),lh=parseFloat(cs.lineHeight)||21,cw=acCharW(cs),r=ta.getBoundingClientRect();
  const lines=ta.value.slice(0,ta.selectionStart).split('\n'),ln=lines.length-1;let vc=0;
  for(const ch of lines[ln])vc=ch==='\t'?((vc/4)|0)*4+4:vc+1;
  const x=r.left+parseFloat(cs.paddingLeft)+vc*cw-ta.scrollLeft,y=r.top+parseFloat(cs.paddingTop)+ln*lh+lh/2-ta.scrollTop;
  return{x:clamp(x,r.left,r.right),y:clamp(y,r.top,r.bottom),r};
}
/* 불똥: 문서마다 화면 전체 캔버스 하나 (클릭은 통과) */
function fxLayer(d){
  let c=d.__fxCv;if(c&&c.isConnected)return c;
  c=d.createElement('canvas');c.className='csfx';c.setAttribute('aria-hidden','true');
  c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000';
  d.body.append(c);d.__fxCv=c;c.parts=[];c.run=false;return c;
}
function fxSparks(ta,del,pow){
  const d=ta.ownerDocument,w=csedWin(ta),c=fxLayer(d),p=fxCaret(ta),n=del?5:Math.round(6+pow*10);
  const hot=['#fff3b0','#ffd24a','#ffb02e','#ff7a1a','#e9bd0c'],cold=['#ffd0d6','#ff8a96','#ff5b6b'];
  for(let i=0;i<n;i++){const a=del?Math.PI*(1+Math.random()):-Math.PI/2+(Math.random()-.5)*Math.PI*1.4,v=(1.4+Math.random()*3.2)*(1+pow*.8);
    c.parts.push({x:p.x,y:p.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(del?0:1),life:1,dec:.022+Math.random()*.03,sz:1+Math.random()*(1.6+pow*1.6),col:(del?cold:hot)[(Math.random()*(del?3:5))|0]})}
  if(c.parts.length>500)c.parts.splice(0,c.parts.length-500);
  if(c.run)return;c.run=true;
  const step=()=>{
    const dpr=w.devicePixelRatio||1,W=w.innerWidth,H=w.innerHeight;
    if(c.width!==Math.round(W*dpr)||c.height!==Math.round(H*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.globalCompositeOperation='lighter';
    c.parts=c.parts.filter(q=>(q.life-=q.dec)>0);
    for(const q of c.parts){q.vy+=.12;q.vx*=.985;q.x+=q.vx;q.y+=q.vy;g.globalAlpha=Math.min(1,q.life*1.4);g.fillStyle=q.col;
      g.beginPath();g.arc(q.x,q.y,q.sz*(.5+q.life*.6),0,6.3);g.fill();
      g.globalAlpha*=.35;g.beginPath();g.arc(q.x-q.vx*1.5,q.y-q.vy*1.5,q.sz*.7,0,6.3);g.fill()}
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    if(c.parts.length)w.requestAnimationFrame(step);else{g.clearRect(0,0,W,H);c.run=false}
  };
  w.requestAnimationFrame(step);
}
function fxShake(ta,pow){
  const w=csedWin(ta);if(fxReduced(w))return;
  const el=ta.closest('.edcode,.sed,.lcode,.code')||ta.parentElement||ta;if(!el.animate)return;
  const a=1.2+pow*4,k=()=>((Math.random()*2-1)*a).toFixed(1)+'px';
  try{if(el.__fxA)el.__fxA.cancel();el.__fxA=el.animate([{transform:'translate(0,0)'},{transform:`translate(${k()},${k()})`},{transform:`translate(${k()},${k()})`},{transform:'translate(0,0)'}],{duration:110+pow*60,easing:'ease-out'})}catch(e){}
}
const FX_TIER=[[100,'전설!','#ff5bd6'],[50,'굉장해요!','#ff5b6b'],[25,'대단해요!','#ff8a2a'],[10,'좋아요!','#ffd24a']];
function fxComboEl(d){
  let b=d.__fxCombo;if(b&&b.isConnected)return b;
  b=d.createElement('div');b.className='cscombo';b.setAttribute('aria-hidden','true');
  b.innerHTML='<b class="ccn">0</b><span class="ccl">COMBO</span><i class="cct"></i><em class="ccw"></em>';
  b.style.cssText='position:fixed;z-index:2147483001;pointer-events:none;display:none;text-align:right;font-family:"IBM Plex Mono",ui-monospace,monospace;line-height:1;transition:opacity .35s;';
  if(!d.getElementById('cscomboCss')){const st=d.createElement('style');st.id='cscomboCss';st.textContent=
    '.cscombo .ccn{display:block;font-size:44px;font-weight:700;color:var(--cc,#ffd24a);text-shadow:0 0 18px var(--cc,#ffd24a),0 3px 0 rgba(0,0,0,.45);letter-spacing:-1px}'+
    '.cscombo .ccl{display:block;font-size:11px;font-weight:700;letter-spacing:4px;color:#fff;opacity:.85;margin-top:2px;text-shadow:0 1px 2px rgba(0,0,0,.6)}'+
    '.cscombo .cct{display:block;height:3px;margin:6px 0 0 auto;border-radius:3px;background:var(--cc,#ffd24a);width:100%;transform-origin:right;box-shadow:0 0 8px var(--cc,#ffd24a)}'+
    '.cscombo .ccw{display:block;font-style:normal;font-size:15px;font-weight:700;margin-top:6px;color:var(--cc,#ffd24a);text-shadow:0 0 12px var(--cc,#ffd24a),0 2px 0 rgba(0,0,0,.5);min-height:15px}'+
    '.cscombo.pop .ccn{animation:ccPop .18s ease-out}.cscombo.big .ccw{animation:ccWord .9s ease-out}'+
    '@keyframes ccPop{0%{transform:scale(1.45)}100%{transform:scale(1)}}@keyframes ccWord{0%{transform:scale(.4) rotate(-8deg);opacity:0}25%{transform:scale(1.25) rotate(3deg);opacity:1}100%{transform:scale(1);opacity:1}}'+
    '@media (prefers-reduced-motion:reduce){.cscombo .ccn,.cscombo .ccw{animation:none!important}}';d.head.append(st)}
  d.body.append(b);d.__fxCombo=b;return b;
}
function fxCombo(ta){
  const d=ta.ownerDocument,w=csedWin(ta),b=fxComboEl(d),r=ta.getBoundingClientRect();
  b.style.left='auto';b.style.right=Math.max(8,w.innerWidth-r.right+22)+'px';b.style.top=(r.top+14)+'px';
  b.style.display='block';b.style.opacity='1';
  const tier=FX_TIER.find(t=>FX.n>=t[0]),col=tier?tier[2]:'#ffe9a8';b.style.setProperty('--cc',col);
  b.querySelector('.ccn').textContent=FX.n;
  b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
  const hit=FX_TIER.find(t=>FX.n===t[0])||(FX.n>100&&FX.n%50===0?FX_TIER[0]:null);
  if(hit){const ww=b.querySelector('.ccw');ww.textContent=csedT(hit[1]);b.classList.remove('big');void b.offsetWidth;b.classList.add('big')}
  else if(FX.n<10)b.querySelector('.ccw').textContent='';
  const bar=b.querySelector('.cct');if(bar.animate){try{if(bar.__a)bar.__a.cancel();bar.__a=bar.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:1200,fill:'forwards'})}catch(e){}}
  w.clearTimeout(FX.t);FX.t=w.setTimeout(()=>{FX.best=Math.max(FX.best,FX.n);b.style.opacity='0';FX.n=0;w.setTimeout(()=>{if(!FX.n)b.style.display='none'},380)},1200);
}
let fxAC=null;
function fxSound(ta,kind){
  const w=csedWin(ta),AC=w.AudioContext||w.webkitAudioContext;if(!AC)return;
  try{if(!fxAC)fxAC=new AC();if(fxAC.state==='suspended')fxAC.resume();
    const a=fxAC,t=a.currentTime,dur=kind==='del'?.03:kind==='big'?.07:.045,len=Math.ceil(a.sampleRate*dur),buf=a.createBuffer(1,len,a.sampleRate),ch=buf.getChannelData(0);
    for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/len,kind==='big'?2:3);
    const src=a.createBufferSource();src.buffer=buf;
    const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=(kind==='big'?700:kind==='del'?2600:1600+Math.random()*900);f.Q.value=kind==='big'?1.2:2.5;
    const gn=a.createGain();gn.gain.value=kind==='big'?.55:.35;
    src.connect(f);f.connect(gn);gn.connect(a.destination);src.start(t);
    if(kind==='big'){const o=a.createOscillator(),og=a.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(70,t+.08);og.gain.setValueAtTime(.18,t);og.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(og);og.connect(a.destination);o.start(t);o.stop(t+.1)}
  }catch(e){}
}
function csedFx(ta,e){
  const S=csedSet();if(!S.fxSpark&&!S.fxCombo&&!S.fxSound)return;
  if(ta.tagName!=='TEXTAREA')return;
  const it=e.inputType||'',del=it.startsWith('delete'),ins=it.startsWith('insert');if(!del&&!ins)return;
  if(it==='insertCompositionText'&&e.data&&e.data.length>1&&FX.lastComp===e.data.slice(0,-1)){FX.lastComp=e.data}else FX.lastComp=e.data||'';
  const now=Date.now();
  if(!del){FX.n=now-FX.last<1200?FX.n+1:1;FX.last=now}
  const pow=Math.min(1,FX.n/60);
  if(S.fxCombo&&!del)fxCombo(ta);
  if(S.fxSpark){fxSparks(ta,del,pow);fxShake(ta,del?pow*.4:pow)}
  if(S.fxSound)fxSound(ta,del?'del':(it==='insertLineBreak'||e.data===' '||e.data==='\n')?'big':'key');
}
function acHook(ta){
  ta.addEventListener('keydown',e=>{
    if(e.ctrlKey&&!e.altKey&&!e.metaKey&&e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();acUpdate(ta,true);return}
    const enterTab=e.key==='Enter'||e.key==='Tab'||e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Tab';
    /* 한글 조합 중 Enter/Tab: 조합이 끝난 뒤(compositionend) 후보를 넣음 */
    if((e.isComposing||e.keyCode===229)&&enterTab&&ac.on&&ac.ta===ta&&!ac.guide){e.preventDefault();e.stopImmediatePropagation();ac.pend=Date.now();return}
    /* 조합을 끝내며 들어온 같은 Enter가 한 번 더 오는 브라우저: 넣은 직후의 Enter/Tab은 버림 */
    if(enterTab&&Date.now()-(ac.swallow||0)<150){e.preventDefault();e.stopImmediatePropagation();ac.swallow=0;return}
    if(!ac.on||ac.ta!==ta)return;
    if(ac.guide){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation()}if(!['Shift','Control','Alt','Meta','CapsLock'].includes(e.key)&&!(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey)&&e.key!=='Backspace')acHide();return}
    const n=ac.items.length,mv=d=>{e.preventDefault();e.stopImmediatePropagation();ac.sel=(ac.sel+d+n)%n;acRender()};
    if(e.key==='ArrowDown')mv(1);
    else if(e.key==='ArrowUp')mv(-1);
    else if(e.key==='PageDown'){e.preventDefault();e.stopImmediatePropagation();ac.sel=Math.min(n-1,ac.sel+8);acRender()}
    else if(e.key==='PageUp'){e.preventDefault();e.stopImmediatePropagation();ac.sel=Math.max(0,ac.sel-8);acRender()}
    else if((e.key==='Enter'||e.key==='Tab')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();ac.pend=0;acAccept(ac.sel)}
    else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();acHide()}
    else if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))acHide();
  });
  ta.addEventListener('input',e=>{
    try{csedFx(ta,e)}catch(_){}
    if(ac.mute)return;
    if(e.inputType==='insertText'&&(e.data==='.'||e.data==='('))acFix(ta);
    if(e.inputType==='insertText'||e.inputType==='insertCompositionText'||(ac.on&&e.inputType==='deleteContentBackward'))acUpdate(ta,false);
    else if(ac.on)acHide();
  });
  ta.addEventListener('compositionend',()=>{
    acUpdate(ta,false);
    if(!ac.pend||Date.now()-ac.pend>1500)return;
    setTimeout(()=>{if(!ac.pend)return;ac.pend=0;if(ac.on&&ac.ta===ta&&!ac.guide){acAccept(ac.sel);ac.swallow=Date.now()}},0);
  });
  ta.addEventListener('blur',()=>setTimeout(acHide,120));
  ta.addEventListener('click',acHide);
  ta.addEventListener('scroll',()=>{if(ac.on&&ac.ta===ta)acPlace()});
}
/* ---- 학습 화면에서 다듬어 둔 API·설명 합치기 (엔진에 없던 멤버는 추가, 설명이 없던 항목에는 학습용 설명) ---- */
(function csedMerge(M){
  Object.keys(M.api).forEach(k=>{
    const L=CS_API[k]||(CS_API[k]=[]),owner=k.replace(':static','');
    M.api[k].forEach(it=>{
      if(!L.some(q=>q.n===it.n)){const t=it.t||(it.k==='fn'?'void':'');L.push(it.k==='fn'?(it.gen?_G(it.n):_F(it.n,t,it.sig||'')):_P(it.n,t))}
      if(it.d&&!AC_DOC[owner+'.'+it.n]&&!AC_DOC[it.n])AC_DOC[owner+'.'+it.n]=[it.d,it.ex||''];
    });
  });
  Object.keys(M.tydoc).forEach(n=>{if(!AC_DOC[n])AC_DOC[n]=[M.tydoc[n],M.ex[n]||'']});
  M.types.forEach(n=>{if(n!=='var'&&!AC_TYPES.includes(n))AC_TYPES.push(n)});
  M.comps.forEach(n=>{if(!AC_COMPS.includes(n))AC_COMPS.push(n)});
  M.ev.forEach(e=>{if(!AC_EV.some(x=>x[0]===e[0]))AC_EV.push(e)});
})({"api": {"Debug:static": [{"n": "Log", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 일반 로그를 한 줄 출력합니다.", "ex": "Debug.Log(\"Hello, Thaniya!\");"}, {"n": "LogWarning", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 경고(노란색)를 출력합니다.", "ex": "Debug.LogWarning(\"배터리가 얼마 남지 않았어요\");"}, {"n": "LogError", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 오류(빨간색)를 출력합니다.", "ex": "Debug.LogError(\"저장에 실패했어요\");"}], "Mathf:static": [{"n": "PI", "k": "pr", "t": "float", "d": "원주율 3.14159… 입니다."}, {"n": "Infinity", "k": "pr", "t": "float", "d": "무한대입니다."}, {"n": "Deg2Rad", "k": "pr", "t": "float", "d": "도(°)를 라디안으로 바꾸는 값입니다."}, {"n": "Rad2Deg", "k": "pr", "t": "float", "d": "라디안을 도(°)로 바꾸는 값입니다."}, {"n": "Abs", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "절댓값입니다.", "ex": "float a = Mathf.Abs(-3f);"}, {"n": "Sqrt", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "제곱근입니다.", "ex": "float r = Mathf.Sqrt(16f);"}, {"n": "Pow", "k": "fn", "t": "float", "sig": "float f, float p", "a": true, "d": "f의 p제곱입니다.", "ex": "float r = Mathf.Pow(2f, 3f);"}, {"n": "Min", "k": "fn", "t": "float", "sig": "float a, float b", "a": true, "d": "둘 중 작은 값입니다."}, {"n": "Max", "k": "fn", "t": "float", "sig": "float a, float b", "a": true, "d": "둘 중 큰 값입니다."}, {"n": "Clamp", "k": "fn", "t": "float", "sig": "float value, float min, float max", "a": true, "d": "값을 min~max 사이로 제한합니다.", "ex": "hp = Mathf.Clamp(hp, 0, 100);"}, {"n": "Clamp01", "k": "fn", "t": "float", "sig": "float value", "a": true, "d": "값을 0~1 사이로 제한합니다."}, {"n": "Lerp", "k": "fn", "t": "float", "sig": "float a, float b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 값입니다."}, {"n": "InverseLerp", "k": "fn", "t": "float", "sig": "float a, float b, float value", "a": true, "d": "value가 a~b 사이 어디쯤인지 0~1로 돌려줍니다."}, {"n": "MoveTowards", "k": "fn", "t": "float", "sig": "float current, float target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가갑니다."}, {"n": "Floor", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "소수점 아래를 내립니다."}, {"n": "Ceil", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "소수점 아래를 올립니다."}, {"n": "Round", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "반올림합니다."}, {"n": "FloorToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "내림해서 정수로 돌려줍니다."}, {"n": "CeilToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "올림해서 정수로 돌려줍니다."}, {"n": "RoundToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "반올림해서 정수로 돌려줍니다."}, {"n": "Sin", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "사인 값입니다."}, {"n": "Cos", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "코사인 값입니다."}, {"n": "Tan", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "탄젠트 값입니다."}, {"n": "Atan2", "k": "fn", "t": "float", "sig": "float y, float x", "a": true, "d": "(x, y) 방향의 각도(라디안)입니다."}, {"n": "Sign", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "양수면 1, 음수면 -1입니다."}, {"n": "Repeat", "k": "fn", "t": "float", "sig": "float t, float length", "a": true, "d": "t를 0~length 범위로 되감습니다."}, {"n": "Approximately", "k": "fn", "t": "bool", "sig": "float a, float b", "a": true, "d": "두 실수가 거의 같은지 검사합니다."}], "Time:static": [{"n": "deltaTime", "k": "pr", "t": "float", "d": "지난 프레임부터 걸린 시간(초)입니다."}, {"n": "fixedDeltaTime", "k": "pr", "t": "float", "d": "물리 계산 간격(초)입니다."}, {"n": "time", "k": "pr", "t": "float", "d": "게임이 시작된 뒤 흐른 시간(초)입니다."}, {"n": "timeScale", "k": "pr", "t": "float", "d": "시간이 흐르는 속도입니다."}, {"n": "frameCount", "k": "pr", "t": "int", "d": "지금까지 지난 프레임 수입니다."}], "Input:static": [{"n": "GetKey", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키를 누르고 있는 동안 true입니다.", "ex": "if (Input.GetKey(KeyCode.Space)) Debug.Log(\"누름\");"}, {"n": "GetKeyDown", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키를 누른 그 프레임에만 true입니다."}, {"n": "GetKeyUp", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키에서 손을 뗀 프레임에만 true입니다."}, {"n": "GetAxis", "k": "fn", "t": "float", "sig": "string axisName", "a": true, "d": "\"Horizontal\" · \"Vertical\" 입력을 -1~1로 돌려줍니다.", "ex": "float h = Input.GetAxis(\"Horizontal\");"}, {"n": "GetAxisRaw", "k": "fn", "t": "float", "sig": "string axisName", "a": true, "d": "GetAxis와 같지만 부드럽게 변하지 않습니다."}, {"n": "GetButton", "k": "fn", "t": "bool", "sig": "string name", "a": true, "d": "\"Jump\" · \"Fire1\" · \"Submit\" 버튼을 누르고 있으면 true입니다."}, {"n": "GetButtonDown", "k": "fn", "t": "bool", "sig": "string name", "a": true, "d": "버튼을 누른 프레임에만 true입니다."}, {"n": "GetMouseButton", "k": "fn", "t": "bool", "sig": "int button", "a": true, "d": "마우스 버튼(0 왼쪽, 1 오른쪽)을 누르고 있으면 true입니다."}, {"n": "GetMouseButtonDown", "k": "fn", "t": "bool", "sig": "int button", "a": true, "d": "마우스 버튼을 누른 프레임에만 true입니다."}, {"n": "anyKey", "k": "pr", "t": "bool", "d": "아무 키나 눌려 있으면 true입니다."}], "KeyCode:static": [{"n": "A", "k": "pr", "t": "KeyCode", "d": "A 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.A))\n    Debug.Log(\"눌림\");"}, {"n": "B", "k": "pr", "t": "KeyCode", "d": "B 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.B))\n    Debug.Log(\"눌림\");"}, {"n": "C", "k": "pr", "t": "KeyCode", "d": "C 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.C))\n    Debug.Log(\"눌림\");"}, {"n": "D", "k": "pr", "t": "KeyCode", "d": "D 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.D))\n    Debug.Log(\"눌림\");"}, {"n": "E", "k": "pr", "t": "KeyCode", "d": "E 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.E))\n    Debug.Log(\"눌림\");"}, {"n": "F", "k": "pr", "t": "KeyCode", "d": "F 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.F))\n    Debug.Log(\"눌림\");"}, {"n": "G", "k": "pr", "t": "KeyCode", "d": "G 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.G))\n    Debug.Log(\"눌림\");"}, {"n": "H", "k": "pr", "t": "KeyCode", "d": "H 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.H))\n    Debug.Log(\"눌림\");"}, {"n": "I", "k": "pr", "t": "KeyCode", "d": "I 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.I))\n    Debug.Log(\"눌림\");"}, {"n": "J", "k": "pr", "t": "KeyCode", "d": "J 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.J))\n    Debug.Log(\"눌림\");"}, {"n": "K", "k": "pr", "t": "KeyCode", "d": "K 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.K))\n    Debug.Log(\"눌림\");"}, {"n": "L", "k": "pr", "t": "KeyCode", "d": "L 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.L))\n    Debug.Log(\"눌림\");"}, {"n": "M", "k": "pr", "t": "KeyCode", "d": "M 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.M))\n    Debug.Log(\"눌림\");"}, {"n": "N", "k": "pr", "t": "KeyCode", "d": "N 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.N))\n    Debug.Log(\"눌림\");"}, {"n": "O", "k": "pr", "t": "KeyCode", "d": "O 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.O))\n    Debug.Log(\"눌림\");"}, {"n": "P", "k": "pr", "t": "KeyCode", "d": "P 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.P))\n    Debug.Log(\"눌림\");"}, {"n": "Q", "k": "pr", "t": "KeyCode", "d": "Q 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Q))\n    Debug.Log(\"눌림\");"}, {"n": "R", "k": "pr", "t": "KeyCode", "d": "R 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.R))\n    Debug.Log(\"눌림\");"}, {"n": "S", "k": "pr", "t": "KeyCode", "d": "S 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.S))\n    Debug.Log(\"눌림\");"}, {"n": "T", "k": "pr", "t": "KeyCode", "d": "T 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.T))\n    Debug.Log(\"눌림\");"}, {"n": "U", "k": "pr", "t": "KeyCode", "d": "U 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.U))\n    Debug.Log(\"눌림\");"}, {"n": "V", "k": "pr", "t": "KeyCode", "d": "V 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.V))\n    Debug.Log(\"눌림\");"}, {"n": "W", "k": "pr", "t": "KeyCode", "d": "W 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.W))\n    Debug.Log(\"눌림\");"}, {"n": "X", "k": "pr", "t": "KeyCode", "d": "X 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.X))\n    Debug.Log(\"눌림\");"}, {"n": "Y", "k": "pr", "t": "KeyCode", "d": "Y 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Y))\n    Debug.Log(\"눌림\");"}, {"n": "Z", "k": "pr", "t": "KeyCode", "d": "Z 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Z))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha0", "k": "pr", "t": "KeyCode", "d": "Alpha0 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha0))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha1", "k": "pr", "t": "KeyCode", "d": "Alpha1 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha1))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha2", "k": "pr", "t": "KeyCode", "d": "Alpha2 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha2))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha3", "k": "pr", "t": "KeyCode", "d": "Alpha3 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha3))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha4", "k": "pr", "t": "KeyCode", "d": "Alpha4 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha4))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha5", "k": "pr", "t": "KeyCode", "d": "Alpha5 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha5))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha6", "k": "pr", "t": "KeyCode", "d": "Alpha6 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha6))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha7", "k": "pr", "t": "KeyCode", "d": "Alpha7 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha7))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha8", "k": "pr", "t": "KeyCode", "d": "Alpha8 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha8))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha9", "k": "pr", "t": "KeyCode", "d": "Alpha9 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Alpha9))\n    Debug.Log(\"눌림\");"}, {"n": "Space", "k": "pr", "t": "KeyCode", "d": "Space 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Space))\n    Debug.Log(\"눌림\");"}, {"n": "Return", "k": "pr", "t": "KeyCode", "d": "Return 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Return))\n    Debug.Log(\"눌림\");"}, {"n": "Escape", "k": "pr", "t": "KeyCode", "d": "Escape 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Escape))\n    Debug.Log(\"눌림\");"}, {"n": "Tab", "k": "pr", "t": "KeyCode", "d": "Tab 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Tab))\n    Debug.Log(\"눌림\");"}, {"n": "Backspace", "k": "pr", "t": "KeyCode", "d": "Backspace 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Backspace))\n    Debug.Log(\"눌림\");"}, {"n": "UpArrow", "k": "pr", "t": "KeyCode", "d": "UpArrow 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.UpArrow))\n    Debug.Log(\"눌림\");"}, {"n": "DownArrow", "k": "pr", "t": "KeyCode", "d": "DownArrow 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.DownArrow))\n    Debug.Log(\"눌림\");"}, {"n": "LeftArrow", "k": "pr", "t": "KeyCode", "d": "LeftArrow 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.LeftArrow))\n    Debug.Log(\"눌림\");"}, {"n": "RightArrow", "k": "pr", "t": "KeyCode", "d": "RightArrow 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.RightArrow))\n    Debug.Log(\"눌림\");"}, {"n": "LeftShift", "k": "pr", "t": "KeyCode", "d": "LeftShift 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.LeftShift))\n    Debug.Log(\"눌림\");"}, {"n": "RightShift", "k": "pr", "t": "KeyCode", "d": "RightShift 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.RightShift))\n    Debug.Log(\"눌림\");"}, {"n": "LeftControl", "k": "pr", "t": "KeyCode", "d": "LeftControl 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.LeftControl))\n    Debug.Log(\"눌림\");"}, {"n": "RightControl", "k": "pr", "t": "KeyCode", "d": "RightControl 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.RightControl))\n    Debug.Log(\"눌림\");"}, {"n": "LeftAlt", "k": "pr", "t": "KeyCode", "d": "LeftAlt 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.LeftAlt))\n    Debug.Log(\"눌림\");"}, {"n": "RightAlt", "k": "pr", "t": "KeyCode", "d": "RightAlt 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.RightAlt))\n    Debug.Log(\"눌림\");"}, {"n": "Mouse0", "k": "pr", "t": "KeyCode", "d": "Mouse0 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Mouse0))\n    Debug.Log(\"눌림\");"}, {"n": "Mouse1", "k": "pr", "t": "KeyCode", "d": "Mouse1 키(입력 코드)입니다.", "ex": "if (Input.GetKey(KeyCode.Mouse1))\n    Debug.Log(\"눌림\");"}], "Random:static": [{"n": "Range", "k": "fn", "t": "float", "sig": "float min, float max", "a": true, "d": "min 이상 max 미만의 무작위 값입니다. (둘 다 정수면 정수)", "ex": "int dice = Random.Range(1, 7);"}, {"n": "value", "k": "pr", "t": "float", "d": "0~1 사이의 무작위 실수입니다."}], "Color:static": [{"n": "red", "k": "pr", "t": "Color", "d": "red 색상입니다.", "ex": "Color c = Color.red;"}, {"n": "green", "k": "pr", "t": "Color", "d": "green 색상입니다.", "ex": "Color c = Color.green;"}, {"n": "blue", "k": "pr", "t": "Color", "d": "blue 색상입니다.", "ex": "Color c = Color.blue;"}, {"n": "white", "k": "pr", "t": "Color", "d": "white 색상입니다.", "ex": "Color c = Color.white;"}, {"n": "black", "k": "pr", "t": "Color", "d": "black 색상입니다.", "ex": "Color c = Color.black;"}, {"n": "yellow", "k": "pr", "t": "Color", "d": "yellow 색상입니다.", "ex": "Color c = Color.yellow;"}, {"n": "cyan", "k": "pr", "t": "Color", "d": "cyan 색상입니다.", "ex": "Color c = Color.cyan;"}, {"n": "magenta", "k": "pr", "t": "Color", "d": "magenta 색상입니다.", "ex": "Color c = Color.magenta;"}, {"n": "gray", "k": "pr", "t": "Color", "d": "gray 색상입니다.", "ex": "Color c = Color.gray;"}, {"n": "grey", "k": "pr", "t": "Color", "d": "grey 색상입니다.", "ex": "Color c = Color.grey;"}], "Vector2": [{"n": "x", "k": "pr", "t": "float", "d": "가로(X) 값입니다.", "ex": "float px = hero.transform.position.x;"}, {"n": "y", "k": "pr", "t": "float", "d": "세로(Y) 값입니다. 씬에서는 아래로 갈수록 커져요."}, {"n": "magnitude", "k": "pr", "t": "float", "d": "벡터의 길이입니다."}, {"n": "sqrMagnitude", "k": "pr", "t": "float", "d": "길이의 제곱입니다."}, {"n": "normalized", "k": "pr", "t": "Vector2", "d": "길이를 1로 맞춘 벡터입니다."}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "벡터를 글자로 바꿉니다."}], "Vector2:static": [{"n": "zero", "k": "pr", "t": "Vector2", "d": "(0, 0) 입니다."}, {"n": "one", "k": "pr", "t": "Vector2", "d": "(1, 1) 입니다."}, {"n": "up", "k": "pr", "t": "Vector2", "d": "위쪽 (0, -1) 입니다. 씬은 아래로 갈수록 y가 커져요."}, {"n": "down", "k": "pr", "t": "Vector2", "d": "아래쪽 (0, 1) 입니다."}, {"n": "left", "k": "pr", "t": "Vector2", "d": "왼쪽 (-1, 0) 입니다."}, {"n": "right", "k": "pr", "t": "Vector2", "d": "오른쪽 (1, 0) 입니다.", "ex": "slime.transform.position = hero.transform.position + Vector2.right;"}, {"n": "Distance", "k": "fn", "t": "float", "sig": "Vector2 a, Vector2 b", "a": true, "d": "두 점 사이의 거리입니다.", "ex": "float d = Vector2.Distance(a, b);"}, {"n": "Dot", "k": "fn", "t": "float", "sig": "Vector2 a, Vector2 b", "a": true, "d": "두 벡터의 내적입니다."}, {"n": "Lerp", "k": "fn", "t": "Vector2", "sig": "Vector2 a, Vector2 b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 지점입니다.", "ex": "Vector2 p = Vector2.Lerp(a, b, 0.5f);"}, {"n": "MoveTowards", "k": "fn", "t": "Vector2", "sig": "Vector2 current, Vector2 target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가갑니다."}, {"n": "ClampMagnitude", "k": "fn", "t": "Vector2", "sig": "Vector2 v, float max", "a": true, "d": "길이가 max를 넘지 않게 줄입니다."}], "Vector3": [{"n": "x", "k": "pr", "t": "float", "d": "가로(X) 값입니다.", "ex": "float px = hero.transform.position.x;"}, {"n": "y", "k": "pr", "t": "float", "d": "세로(Y) 값입니다. 씬에서는 아래로 갈수록 커져요."}, {"n": "z", "k": "pr", "t": "float", "d": "깊이(Z) 값입니다."}, {"n": "magnitude", "k": "pr", "t": "float", "d": "벡터의 길이입니다."}, {"n": "sqrMagnitude", "k": "pr", "t": "float", "d": "길이의 제곱입니다."}, {"n": "normalized", "k": "pr", "t": "Vector3", "d": "길이를 1로 맞춘 벡터입니다."}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "벡터를 글자로 바꿉니다."}], "Vector3:static": [{"n": "zero", "k": "pr", "t": "Vector3", "d": "(0, 0) 입니다."}, {"n": "one", "k": "pr", "t": "Vector3", "d": "(1, 1) 입니다."}, {"n": "up", "k": "pr", "t": "Vector3", "d": "위쪽 (0, -1) 입니다. 씬은 아래로 갈수록 y가 커져요."}, {"n": "down", "k": "pr", "t": "Vector3", "d": "아래쪽 (0, 1) 입니다."}, {"n": "left", "k": "pr", "t": "Vector3", "d": "왼쪽 (-1, 0) 입니다."}, {"n": "right", "k": "pr", "t": "Vector3", "d": "오른쪽 (1, 0) 입니다.", "ex": "slime.transform.position = hero.transform.position + Vector2.right;"}, {"n": "Distance", "k": "fn", "t": "float", "sig": "Vector3 a, Vector3 b", "a": true, "d": "두 점 사이의 거리입니다.", "ex": "float d = Vector2.Distance(a, b);"}, {"n": "Dot", "k": "fn", "t": "float", "sig": "Vector3 a, Vector3 b", "a": true, "d": "두 벡터의 내적입니다."}, {"n": "Lerp", "k": "fn", "t": "Vector3", "sig": "Vector3 a, Vector3 b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 지점입니다.", "ex": "Vector2 p = Vector2.Lerp(a, b, 0.5f);"}, {"n": "MoveTowards", "k": "fn", "t": "Vector3", "sig": "Vector3 current, Vector3 target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가갑니다."}, {"n": "ClampMagnitude", "k": "fn", "t": "Vector3", "sig": "Vector3 v, float max", "a": true, "d": "길이가 max를 넘지 않게 줄입니다."}], "GameObject": [{"n": "name", "k": "pr", "t": "string", "d": "오브젝트의 이름입니다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)입니다.", "ex": "slime.transform.position = hero.transform.position;"}, {"n": "activeSelf", "k": "pr", "t": "bool", "d": "켜져 있으면 true입니다."}, {"n": "SetActive", "k": "fn", "t": "void", "sig": "bool value", "a": true, "d": "오브젝트를 켜거나 끕니다.", "ex": "torch.SetActive(false);"}, {"n": "GetComponent", "k": "fn", "t": "T", "a": false, "gen": true, "d": "이 오브젝트에 붙은 컴포넌트를 꺼냅니다. 없으면 null이에요.", "ex": "Light light = torch.GetComponent<Light>();"}], "GameObject:static": [{"n": "Find", "k": "fn", "t": "GameObject", "sig": "string name", "a": true, "d": "이름으로 오브젝트를 찾습니다. 없으면 null이에요.", "ex": "GameObject torch = GameObject.Find(\"횃불\");"}], "Transform": [{"n": "position", "k": "pr", "t": "Vector2", "d": "씬 안에서의 위치입니다. 새 값을 대입하면 오브젝트가 이동해요.", "ex": "tr.position = new Vector2(3, 4);"}, {"n": "localPosition", "k": "pr", "t": "Vector2", "d": "부모 기준 위치입니다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 Transform이 붙은 게임 오브젝트입니다."}, {"n": "name", "k": "pr", "t": "string", "d": "오브젝트의 이름입니다."}, {"n": "Translate", "k": "fn", "t": "void", "sig": "Vector2 delta", "a": true, "d": "현재 위치에서 delta만큼 옮깁니다.", "ex": "transform.Translate(Vector2.right);"}], "Camera": [{"n": "orthographicSize", "k": "pr", "t": "float", "d": "화면 위아래로 보여 주는 범위의 절반(칸)입니다. 작을수록 확대돼요.", "ex": "Camera.main.orthographicSize = 2;"}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 카메라가 붙은 게임 오브젝트입니다."}], "Camera:static": [{"n": "main", "k": "pr", "t": "Camera", "d": "메인 카메라입니다.", "ex": "Camera cam = Camera.main;"}], "Light": [{"n": "enabled", "k": "pr", "t": "bool", "d": "빛이 켜져 있는지 나타냅니다. false를 대입하면 꺼져요.", "ex": "light.enabled = false;"}, {"n": "intensity", "k": "pr", "t": "float", "d": "빛의 세기입니다. 0.1~1 사이 값입니다.", "ex": "light.intensity = 0.3f;"}, {"n": "radius", "k": "pr", "t": "float", "d": "빛이 닿는 거리(칸)입니다."}, {"n": "shadows", "k": "pr", "t": "bool", "d": "true이면 벽에 빛이 가려집니다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트입니다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)입니다."}], "Hero": [{"n": "hp", "k": "pr", "t": "int", "d": "주인공의 체력입니다.", "ex": "hero.hp = hero.hp / 2;"}, {"n": "maxHp", "k": "pr", "t": "int", "d": "주인공의 최대 체력입니다."}, {"n": "position", "k": "pr", "t": "Vector2", "d": "주인공의 위치입니다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트입니다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)입니다."}], "Item": [{"n": "qty", "k": "pr", "t": "int", "d": "아이템의 수량입니다.", "ex": "potion.qty -= 1;"}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트입니다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)입니다."}], "Text": [{"n": "text", "k": "pr", "t": "string", "d": "화면에 보이는 글자입니다.", "ex": "label.text = \"포션 \" + potion.qty + \"개\";"}, {"n": "fontSize", "k": "pr", "t": "int", "d": "글자 크기입니다."}], "string": [{"n": "Length", "k": "pr", "t": "int", "d": "글자 수입니다.", "ex": "int n = \"안녕\".Length;"}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "글자 그대로 돌려줍니다."}, {"n": "ToUpper", "k": "fn", "t": "string", "a": false, "d": "대문자로 바꿉니다."}, {"n": "ToLower", "k": "fn", "t": "string", "a": false, "d": "소문자로 바꿉니다."}, {"n": "Trim", "k": "fn", "t": "string", "a": false, "d": "앞뒤 공백을 지웁니다."}, {"n": "Contains", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "글자가 들어 있는지 검사합니다.", "ex": "bool b = name.Contains(\"몬스터\");"}, {"n": "StartsWith", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "해당 글자로 시작하는지 검사합니다."}, {"n": "EndsWith", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "해당 글자로 끝나는지 검사합니다."}, {"n": "IndexOf", "k": "fn", "t": "int", "sig": "string value", "a": true, "d": "처음 나오는 위치를 돌려줍니다. 없으면 -1입니다."}, {"n": "Substring", "k": "fn", "t": "string", "sig": "int start, int length", "a": true, "d": "글자의 일부를 잘라 냅니다.", "ex": "string s = name.Substring(0, 2);"}, {"n": "Replace", "k": "fn", "t": "string", "sig": "string a, string b", "a": true, "d": "a를 b로 바꿉니다.", "ex": "string s = name.Replace(\"A\", \"B\");"}], "MonoBehaviour": [{"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 스크립트가 붙은 게임 오브젝트입니다.", "ex": "Debug.Log(gameObject.name);"}, {"n": "transform", "k": "pr", "t": "Transform", "d": "이 오브젝트의 위치 정보(Transform)입니다.", "ex": "Debug.Log(transform.position.x);"}, {"n": "name", "k": "pr", "t": "string", "d": "이 오브젝트의 이름입니다.", "ex": "Debug.Log(name);"}, {"n": "GetComponent", "k": "fn", "t": "T", "a": false, "gen": true, "d": "이 오브젝트에 붙은 컴포넌트를 꺼냅니다. 없으면 null이에요.", "ex": "Transform tr = GetComponent<Transform>();"}, {"n": "print", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "Debug.Log와 같이 콘솔에 한 줄 출력합니다.", "ex": "print(\"안녕\");"}], "bool": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꿉니다.", "ex": "string s = hp.ToString();"}], "double": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꿉니다.", "ex": "string s = hp.ToString();"}], "float": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꿉니다.", "ex": "string s = hp.ToString();"}], "long": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꿉니다.", "ex": "string s = hp.ToString();"}], "int": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꿉니다.", "ex": "string s = hp.ToString();"}]}, "tydoc": {"Debug": "콘솔에 글을 출력하는 도구 모음입니다.", "Mathf": "수학 함수 모음입니다. (Sqrt, Clamp, Lerp …)", "Time": "시간 정보를 담고 있습니다.", "Input": "키보드·마우스 입력을 읽습니다.", "KeyCode": "키보드·마우스의 입력 코드 모음입니다.", "Random": "무작위 값을 만듭니다.", "Vector2": "(x, y) 두 값으로 된 좌표입니다.", "Vector3": "(x, y, z) 세 값으로 된 좌표입니다.", "Color": "색상입니다.", "GameObject": "씬 안의 오브젝트입니다.", "Transform": "위치 정보 컴포넌트입니다.", "Light": "빛 컴포넌트입니다.", "Camera": "카메라 컴포넌트입니다.", "Hero": "주인공 컴포넌트입니다. (hp, maxHp …)", "Item": "아이템 컴포넌트입니다. (qty 수량)", "Text": "UI 텍스트입니다. 인스펙터 칸에 UI 요소를 끌어다 놓아 연결해요. (text)", "int": "정수 형식입니다.", "float": "소수 형식입니다. 값 뒤에 f를 붙여요. (0.3f)", "double": "소수 형식입니다.", "long": "큰 정수 형식입니다.", "bool": "true / false 형식입니다.", "string": "글자 형식입니다.", "var": "오른쪽 값을 보고 형식을 알아서 정합니다."}, "ex": {"int": "int hp = 100;", "float": "float speed = 1.5f;", "bool": "bool ok = true;", "string": "string name = \"슬라임\";", "var": "var tr = GetComponent<Transform>();", "Vector2": "Vector2 p = new Vector2(3, 4);", "Color": "Color c = Color.red;"}, "types": ["int", "float", "double", "long", "bool", "string", "var", "Vector2", "Vector3", "Color", "GameObject", "Transform", "Light", "Camera", "Hero", "Item", "Text"], "comps": ["Transform", "Light", "Camera", "Hero", "Item"], "ev": [["Awake", "void Awake()\n{\n    |\n}"], ["Start", "void Start()\n{\n    |\n}"], ["OnClick", "public void OnClick()\n{\n    |\n}"]]});
