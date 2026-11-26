/* ============================================================================
 * script-editor.js — Thaniya 공용 C# 스크립트 편집기
 *   엔진(edit.html)과 학습(learning.html)이 함께 씁니다. 여기만 고치면 두 화면의 편집기가 똑같이 바뀝니다.
 *  [포함]  코드 색칠(csHighlight) · 자동완성 데이터(CS_API · AC_DOC …) · 자동완성 계산·목록 상자 ·
 *          한/영 자판 보정(ko2key) · 대소문자 자동 보정(acFix) · 편집기 실행 취소(edUndo) · 입력칸 연결(acHook)
 *          도움 기능: 이름 번역기(NAMETR · 이름 칸 우클릭) · 스크립트 도움말(EDHELP · help / F1)
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
  const ty='int|uint|float|double|bool|string|char|long|byte|short|decimal|object|Vector2|Vector3|Color|Rigidbody2D|Rigidbody|Transform|GameObject|MonoBehaviour|Collider2D|Debug|Time|Input|Mathf|Quaternion|SpriteRenderer|Animator|PlayableDirector|Camera|AudioSource|Volume|KeyCode|Header|SerializeField|Range|Tooltip|Space|RectTransform|Button|Text|Image|Slider|CanvasGroup|SceneManager|Application|UIGroup|Hero|Random|Light|Light2D|Monster|Npc|Item|Portal|EventTrigger|Dialog|Message|Inventory|Scene|List|Dictionary|Queue|Stack|HashSet|IEnumerator|Coroutine|WaitForSeconds|WaitForSecondsRealtime|WaitUntil|WaitWhile|PlayerPrefs|Physics2D|RaycastHit2D|Collision2D|ContactPoint2D|BoxCollider2D|ParticleSystem|ForceMode2D|RigidbodyType2D|LayerMask|Resources|Exception'.split('|').concat(Object.keys(KO_TY),Object.keys(KO_SELF));
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
  'Npc':[_P('text','string'),_P('lineCount','int'),_F('GetLine','string','int index'),_F('Talk','void'),..._base],
  'Item':[_P('qty','int'),..._base],
  'Portal':[_P('tx','int'),_P('ty','int'),_P('targetScene','string'),_F('Teleport','bool'),..._base],
  'EventTrigger':[_P('text','string'),_P('once','bool'),..._base],
  'Dialog:static':[_F('Show','void','string speaker, string text'),_F('Close','void'),_P('isOpen','bool')],
  'Message:static':[_F('Show','void','string text, float seconds')],
  'Inventory:static':[_F('Add','int','string item, int count'),_F('Remove','bool','string item, int count'),_F('Count','int','string item'),_F('Has','bool','string item'),_F('Clear','void')],
  'SceneManager:static':[_F('LoadScene','void','string sceneName'),_F('RestartGame','void'),_F('GetActiveScene','Scene')],
  'Scene':[_P('name','string'),_P('buildIndex','int')],
  'Animator':[_P('speed','float'),_F('SetBool','void','string name, bool value'),_F('SetTrigger','void','string name'),_F('ResetTrigger','void','string name'),_F('SetFloat','void','string name, float value'),_F('SetInteger','void','string name, int value'),_F('GetBool','bool','string name'),_F('GetFloat','float','string name'),_F('GetInteger','int','string name'),_F('Play','void','string stateName'),_F('CrossFade','void','string stateName, float duration'),_F('GetCurrentAnimatorStateInfo','AnimatorStateInfo','int layerIndex'),_F('HasState','bool','int layer, string stateName'),..._base],
  'PlayableDirector':[_P('time','double'),_P('duration','double'),_P('state','PlayState'),_P('playOnAwake','bool'),_P('extrapolationMode','DirectorWrapMode'),_P('playableAsset','string'),_F('Play','void'),_F('Pause','void'),_F('Resume','void'),_F('Stop','void'),_F('Evaluate','void'),..._base],
  'AnimatorStateInfo':[_P('normalizedTime','float'),_P('length','float'),_P('loop','bool'),_P('speed','float'),_F('IsName','bool','string name')],
  'AudioSource':[_P('volume','float'),_P('pitch','float'),_P('loop','bool'),_P('mute','bool'),_P('playOnAwake','bool'),_P('isPlaying','bool'),_P('time','float'),_P('clip','string'),_P('length','float'),_P('spatialBlend','float'),_P('maxDistance','float'),_F('Play','void'),_F('PlayDelayed','void','float delay'),_F('PlayOneShot','void','string clipName, float volumeScale'),_F('Stop','void'),_F('Pause','void'),_F('UnPause','void'),..._base],
  'Collider2D':[_P('isTrigger','bool'),_F('CompareTag','bool','string tag'),..._base],
  'Collision2D':[_P('gameObject','GameObject'),_P('collider','Collider2D'),_P('transform','Transform')],
  'Camera':[_P('orthographicSize','float'),_P('backgroundColor','Color'),..._base],
  'Volume':[_P('weight','float'),_P('priority','float'),_P('isGlobal','bool'),_P('blendDistance','float'),..._base],
  'Camera:static':[_P('main','Camera')],
  'string':[_P('Length','int'),_F('ToUpper','string'),_F('ToLower','string'),_F('Trim','string'),_F('Contains','bool','string value'),_F('StartsWith','bool','string value'),_F('EndsWith','bool','string value'),_F('IndexOf','int','string value'),_F('Substring','string','int start, int length'),_F('Replace','string','string a, string b'),_F('Split','string[]','char separator')],
  'Array':[_P('Length','int')],
  'MonoBehaviour':[..._base,_F('Destroy','void','Object obj'),_F('Instantiate','GameObject','GameObject original'),_F('print','void','object message'),_F('Invoke','void','string method, float time'),_F('InvokeRepeating','void','string method, float time, float rate'),_F('CancelInvoke','void'),_F('StartCoroutine','void','IEnumerator routine')]
};
function _mathf(){return['Abs','Sin','Cos','Tan','Asin','Acos','Atan','Sqrt','Floor','Ceil','Round','Sign','Clamp01'].map(n=>_F(n,'float','float f')).concat(['RoundToInt','FloorToInt','CeilToInt'].map(n=>_F(n,'int','float f')))}
CS_API.Light2D=CS_API.Light;CS_API.NPC=CS_API.Npc;
CS_API.Hero=[_P('position','Vector2'),_P('facing','Vector2'),_P('facingAngle','float'),_P('hp','int'),_P('maxHp','int'),_P('isMoving','bool'),_P('isDead','bool'),_P('isInvincible','bool'),_P('invincibleTime','float'),_P('radius','float'),_P('canMove','bool'),_F('Move','bool','Vector2 delta'),_F('Face','void','Vector2 dir'),_F('CanMove','bool','Vector2 delta'),_F('Attack','int','int damage, float reach'),_F('Interact','bool','float distance'),_F('TakeDamage','bool','int amount'),_F('Heal','int','int amount'),..._base];
CS_API['Hero:static']=[_P('main','Hero')];
CS_API['Sound:static']=[_F('PlayMusic','void','string name, float volume'),_F('StopMusic','void'),_F('PauseMusic','void'),_F('ResumeMusic','void'),_F('SetMusicVolume','void','float volume'),_F('PlayEffect','void','string name, float volume'),_P('isMusicPlaying','bool'),_P('musicVolume','float'),_P('currentMusic','string')];
CS_API['UIScreen:static']=[_F('Show','void','string screen'),_F('Hide','void','string screen'),_F('Toggle','void','string screen'),_F('HideAll','void'),_F('IsOpen','bool','string screen'),_F('SetText','void','string screen, string element, string text'),_F('GetText','string','string screen, string element'),_F('GetValue','object','string screen, string element'),_F('SetValue','void','string screen, string element, object value'),_F('SetVisible','void','string screen, string element, bool visible'),_F('SetColor','void','string screen, string element, string color')];
CS_API['VisualScript:static']=[_F('Trigger','void','string eventName, object arg'),_F('TriggerAll','void','string eventName, object arg'),_F('TriggerOn','void','string objectName, string eventName, object arg'),_F('GetVariable','object','string name'),_F('SetVariable','void','string name, object value'),_F('SetState','void','string stateName'),_P('CurrentState','string')];
CS_API['Random:static']=[_F('Range','float','float min, float max'),_P('value','float')];
CS_API.Camera.unshift(_P('smoothFollow','bool'),_P('smoothTime','float'));
/* ---- 유니티 기능 보강 (2026-11): 물리 · 파티클 · 코루틴 · 컬렉션 · 저장 ---- */
CS_API.Rigidbody2D=[_P('velocity','Vector2'),_P('linearVelocity','Vector2'),_P('angularVelocity','float'),_P('gravityScale','float'),_P('mass','float'),_P('drag','float'),_P('linearDamping','float'),_P('angularDrag','float'),_P('isKinematic','bool'),_P('bodyType','RigidbodyType2D'),_P('freezeRotation','bool'),_P('simulated','bool'),_P('position','Vector2'),_P('rotation','float'),_F('AddForce','void','Vector2 force, ForceMode2D mode'),_F('AddRelativeForce','void','Vector2 force, ForceMode2D mode'),_F('AddTorque','void','float torque, ForceMode2D mode'),_F('MovePosition','void','Vector2 position'),_F('MoveRotation','void','float angle'),_F('IsTouching','bool','Collider2D collider'),_F('IsTouchingLayers','bool'),..._base];
CS_API['ForceMode2D:static']=[_P('Force','ForceMode2D'),_P('Impulse','ForceMode2D')];
CS_API['RigidbodyType2D:static']=[_P('Dynamic','RigidbodyType2D'),_P('Kinematic','RigidbodyType2D'),_P('Static','RigidbodyType2D')];
CS_API.Collider2D=[_P('isTrigger','bool'),_P('size','Vector2'),_P('offset','Vector2'),_P('attachedRigidbody','Rigidbody2D'),_P('bounds','Bounds'),_F('CompareTag','bool','string tag'),_F('OverlapPoint','bool','Vector2 point'),_F('IsTouching','bool','Collider2D other'),..._base];
CS_API.BoxCollider2D=CS_API.Collider2D;
CS_API.Collision2D=[_P('gameObject','GameObject'),_P('collider','Collider2D'),_P('transform','Transform'),_P('rigidbody','Rigidbody2D'),_P('relativeVelocity','Vector2'),_P('contacts','ContactPoint2D[]'),_P('contactCount','int'),_F('GetContact','ContactPoint2D','int index')];
CS_API.ContactPoint2D=[_P('point','Vector2'),_P('normal','Vector2'),_P('collider','Collider2D')];
CS_API.RaycastHit2D=[_P('collider','Collider2D'),_P('transform','Transform'),_P('rigidbody','Rigidbody2D'),_P('point','Vector2'),_P('normal','Vector2'),_P('distance','float'),_P('fraction','float')];
CS_API['Physics2D:static']=[_F('Raycast','RaycastHit2D','Vector2 origin, Vector2 direction, float distance'),_F('RaycastAll','RaycastHit2D[]','Vector2 origin, Vector2 direction, float distance'),_F('Linecast','RaycastHit2D','Vector2 start, Vector2 end'),_F('OverlapCircle','Collider2D','Vector2 point, float radius'),_F('OverlapCircleAll','Collider2D[]','Vector2 point, float radius'),_F('OverlapBox','Collider2D','Vector2 point, Vector2 size, float angle'),_F('OverlapBoxAll','Collider2D[]','Vector2 point, Vector2 size, float angle'),_F('OverlapPoint','Collider2D','Vector2 point'),_P('gravity','Vector2')];
CS_API['LayerMask:static']=[_F('GetMask','int','string layerName'),_F('NameToLayer','int','string layerName')];
CS_API.ParticleSystem=[_P('isPlaying','bool'),_P('isStopped','bool'),_P('isPaused','bool'),_P('particleCount','int'),_P('time','float'),_P('main','MainModule'),_P('emission','EmissionModule'),_P('shape','ShapeModule'),_F('Play','void'),_F('Stop','void'),_F('Pause','void'),_F('Clear','void'),_F('Emit','void','int count'),..._base];
CS_API.MainModule=[_P('startLifetime','float'),_P('startSpeed','float'),_P('startSize','float'),_P('startColor','Color'),_P('gravityModifier','float'),_P('loop','bool'),_P('duration','float'),_P('maxParticles','int'),_P('playOnAwake','bool')];
CS_API.EmissionModule=[_P('enabled','bool'),_P('rateOverTime','float'),_P('burstCount','int')];
CS_API.ShapeModule=[_P('radius','float'),_P('angle','float'),_P('rotation','Vector3')];
CS_API.SpriteRenderer=[_P('flipX','bool'),_P('flipY','bool'),_P('sortingOrder','int'),_P('sprite','string'),..._base];
CS_API['PlayerPrefs:static']=[_F('SetInt','void','string key, int value'),_F('GetInt','int','string key, int defaultValue'),_F('SetFloat','void','string key, float value'),_F('GetFloat','float','string key, float defaultValue'),_F('SetString','void','string key, string value'),_F('GetString','string','string key, string defaultValue'),_F('HasKey','bool','string key'),_F('DeleteKey','void','string key'),_F('DeleteAll','void'),_F('Save','void')];
CS_API['Time:static']=[_P('deltaTime','float'),_P('unscaledDeltaTime','float'),_P('fixedDeltaTime','float'),_P('time','float'),_P('unscaledTime','float'),_P('timeScale','float'),_P('frameCount','int')];
CS_API['Quaternion:static']=[_P('identity','Quaternion'),_F('Euler','Quaternion','float x, float y, float z'),_F('AngleAxis','Quaternion','float angle, Vector3 axis'),_F('Lerp','Quaternion','Quaternion a, Quaternion b, float t'),_F('Slerp','Quaternion','Quaternion a, Quaternion b, float t'),_F('RotateTowards','Quaternion','Quaternion from, Quaternion to, float maxDegrees'),_F('LookRotation','Quaternion','Vector3 forward')];
CS_API['Random:static']=[_F('Range','float','float min, float max'),_P('value','float'),_P('insideUnitCircle','Vector2'),_P('onUnitCircle','Vector2'),_F('ColorHSV','Color')];
CS_API['Mathf:static'].push(_F('PerlinNoise','float','float x, float y'),_F('SmoothStep','float','float a, float b, float t'),_F('InverseLerp','float','float a, float b, float value'),_F('Repeat','float','float t, float length'),_F('PingPong','float','float t, float length'),_F('DeltaAngle','float','float current, float target'),_F('LerpAngle','float','float a, float b, float t'),_F('MoveTowardsAngle','float','float current, float target, float maxDelta'),_F('Approximately','bool','float a, float b'));
['Vector2:static','Vector3:static'].forEach(k=>{const T=k.split(':')[0];CS_API[k].push(_F('Angle','float',T+' from, '+T+' to'),_F('SignedAngle','float',T+' from, '+T+' to'),_F('ClampMagnitude',T,T+' vector, float maxLength'),_F('Reflect',T,T+' inDirection, '+T+' normal'),_F('Perpendicular',T,T+' dir'),_F('Scale',T,T+' a, '+T+' b'))});
CS_API['GameObject:static']=[_F('Find','GameObject','string name'),_F('FindWithTag','GameObject','string tag'),_F('FindGameObjectsWithTag','GameObject[]','string tag')];
CS_API.GameObject.push(_F('CompareTag','bool','string tag'),_P('activeInHierarchy','bool'),_G('AddComponent'));
CS_API.Transform.push(_P('right','Vector3'),_P('up','Vector3'),_P('root','Transform'),_F('IsChildOf','bool','Transform parent'),_F('DetachChildren','void'));
CS_API.Camera.push(_F('ScreenToWorldPoint','Vector3','Vector3 position'),_F('WorldToScreenPoint','Vector3','Vector3 position'),_F('Shake','void','float strength, float duration'));
CS_API['Application:static']=[_F('Quit','void'),_F('OpenURL','void','string url'),_P('isPlaying','bool')];
CS_API['Resources:static']=[_G('Load')];
CS_API.List=[_P('Count','int'),_F('Add','void','T item'),_F('AddRange','void','IEnumerable<T> items'),_F('Insert','void','int index, T item'),_F('Remove','bool','T item'),_F('RemoveAt','void','int index'),_F('RemoveAll','int','Predicate<T> match'),_F('Clear','void'),_F('Contains','bool','T item'),_F('IndexOf','int','T item'),_F('Find','T','Predicate<T> match'),_F('FindAll','List<T>','Predicate<T> match'),_F('Exists','bool','Predicate<T> match'),_F('ForEach','void','Action<T> action'),_F('Sort','void'),_F('Reverse','void'),_F('ToArray','T[]')];
CS_API.Dictionary=[_P('Count','int'),_P('Keys','KeyCollection'),_P('Values','ValueCollection'),_F('Add','void','TKey key, TValue value'),_F('ContainsKey','bool','TKey key'),_F('ContainsValue','bool','TValue value'),_F('Remove','bool','TKey key'),_F('TryGetValue','bool','TKey key, out TValue value'),_F('Clear','void')];
CS_API.Queue=[_P('Count','int'),_F('Enqueue','void','T item'),_F('Dequeue','T'),_F('Peek','T'),_F('Clear','void'),_F('Contains','bool','T item')];
CS_API.Stack=[_P('Count','int'),_F('Push','void','T item'),_F('Pop','T'),_F('Peek','T'),_F('Clear','void'),_F('Contains','bool','T item')];
CS_API.MonoBehaviour=[..._base,_F('Destroy','void','Object obj, float delay'),_F('Instantiate','GameObject','GameObject original, Vector3 position, Quaternion rotation'),_F('print','void','object message'),_F('Invoke','void','string method, float time'),_F('InvokeRepeating','void','string method, float time, float rate'),_F('CancelInvoke','void','string method'),_F('IsInvoking','bool','string method'),_F('StartCoroutine','Coroutine','IEnumerator routine'),_F('StopCoroutine','void','Coroutine routine'),_F('StopAllCoroutines','void'),_F('SendMessage','void','string methodName, object value'),_F('BroadcastMessage','void','string methodName, object value'),_G('GetComponentInChildren'),_G('GetComponentInParent'),_G('GetComponents'),_G('FindObjectOfType'),_G('FindObjectsOfType')];
const AC_TYPES=[...AC_PRIM,'Hero','Random','Vector2','Vector3','Color','Quaternion','GameObject','Transform','MonoBehaviour','Rigidbody2D','Collider2D','Collision2D','SpriteRenderer','Animator','AnimatorStateInfo','PlayableDirector','AudioSource','Camera','Volume','Light','Light2D','Monster','Npc','Item','Portal','EventTrigger','Mathf','Debug','Time','Input','KeyCode','List','Dictionary','Queue','Stack','HashSet','IEnumerator','Coroutine','WaitForSeconds','WaitForSecondsRealtime','WaitUntil','WaitWhile','PlayerPrefs','Physics2D','RaycastHit2D','ContactPoint2D','BoxCollider2D','ParticleSystem','ForceMode2D','RigidbodyType2D','LayerMask','Application','Resources','Exception','Dialog','Message','Inventory','SceneManager','UIGroup','Sound','UIScreen','VisualScript'];
const AC_COMPS=['Hero','Light','Light2D','Monster','Npc','Item','Portal','EventTrigger','SpriteRenderer','Rigidbody2D','Collider2D','BoxCollider2D','ParticleSystem','Animator','PlayableDirector','AudioSource','Camera','Volume','Transform'];
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
'OnTriggerEnter2D':['트리거 영역에 다른 콜라이더가 들어올 때 호출됩니다.','void OnTriggerEnter2D(Collider2D other)\n{\n    Debug.Log(other.name);\n}'],
'OnTriggerExit2D':['트리거 영역에서 콜라이더가 나갈 때 호출됩니다.','void OnTriggerExit2D(Collider2D other)\n{\n    Debug.Log(other.name);\n}'],
'OnCollisionEnter2D':['다른 콜라이더와 충돌했을 때 호출됩니다.','void OnCollisionEnter2D(Collision2D col)\n{\n    Debug.Log(col.gameObject.name);\n}'],
/* 스니펫·키워드 */
'if':['조건이 참일 때만 실행합니다.','if (hp <= 0)\n{\n    Debug.Log("쓰러짐");\n}'],
'else':['if 조건이 거짓일 때 실행합니다.','else\n{\n    Debug.Log("아직 살아있음");\n}'],
'for':['정해진 횟수만큼 반복합니다.','for (int i = 0; i < 3; i++)\n{\n    Debug.Log(i);\n}'],
'foreach':['목록의 항목을 하나씩 꺼내 반복합니다.','foreach (var item in items)\n{\n    Debug.Log(item);\n}'],
'while':['조건이 참인 동안 반복합니다.','while (count < 5)\n{\n    count++;\n}'],
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
'List':['크기가 변하는 목록입니다. Add · Remove · Count · [번호] · foreach 로 씁니다. 파일 맨 위에 using System.Collections.Generic; 을 쓰세요.','List<GameObject> enemies = new List<GameObject>();\nenemies.Add(enemy);\nforeach (var e in enemies) Debug.Log(e.name);\nDebug.Log(enemies.Count);'],
'MonoBehaviour':['게임 오브젝트에 붙는 스크립트의 기본 클래스입니다.','public class Player : MonoBehaviour\n{\n}'],
/* 특성 */
'Header':['인스펙터에 제목 줄을 표시한다.','[Header("이동")]\npublic float speed = 3f;'],
'SerializeField':['private 변수를 인스펙터에 노출한다.','[SerializeField] private int hp = 3;'],
'Range':['숫자 변수를 슬라이더 범위로 제한한다.','[Range(0, 1)]\npublic float volume = 0.5f;'],
'Tooltip':['인스펙터 속성의 ? 버튼에 설명을 표시한다.','[Tooltip("이동 속도")]\npublic float speed = 3f;'],
'Space':['인스펙터에 빈 간격을 넣는다.','[Space]\npublic int a;'],
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
'Npc.Talk':['이 NPC의 대사 목록을 엔진 기본 대화창에 차례로 띄웁니다. 화면 클릭 · Space로 다음 대사, 마지막 뒤에는 닫힙니다.','GetComponent<Npc>().Talk();'],
'Npc.lineCount':['NPC 컴포넌트에 넣은 대사의 개수입니다.','if (line >= npc.lineCount) CloseDialog();'],
'Npc.GetLine':['번호(0부터)의 대사를 돌려줍니다. 범위를 벗어나면 빈 글자입니다.','UIScreen.SetText("대화창", "대사", npc.GetLine(line));'],
'Hero.canMove':['false로 두면 주인공이 움직이지 않습니다(이동 · 방향 · 공격). 씬의 대화창 UI가 열려 있는 동안에도 자동으로 막힙니다.','Hero.main.canMove = false;'],
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
'x':['X 성분(가로)이다.','float px = transform.position.x;'],
'y':['Y 성분(세로)이다.','float py = transform.position.y;'],
'z':['Z 성분이다. 2D에서는 보통 0이다.','float pz = v.z;'],
'magnitude':['벡터의 길이이다.','float len = v.magnitude;'],
'normalized':['길이가 1인 방향 벡터이다.','Vector3 dir = v.normalized;'],
'Normalize':['벡터의 길이를 1로 만든다.','v.Normalize();'],
'Set':['벡터의 값을 한 번에 지정한다.','v.Set(1f, 2f, 0f);'],
'zero':['(0, 0, 0) 벡터이다.','transform.position = Vector3.zero;'],
'one':['(1, 1, 1) 벡터이다.','transform.localScale = Vector3.one;'],
'up':['위쪽 방향 (0, -1)이다. 이 엔진은 아래쪽이 +y 이다.','Vector2 d = Vector2.up;'],
'down':['아래쪽 방향 (0, 1)이다.','Vector2 d = Vector2.down;'],
'left':['왼쪽 방향 (-1, 0, 0)이다.','Vector3 d = Vector3.left;'],
'right':['오른쪽 방향 (1, 0, 0)이다.','Vector3 d = Vector3.right;'],
'Distance':['두 점 사이의 거리를 구한다.','float d = Vector3.Distance(a, b);'],
'Dot':['두 벡터의 내적을 구한다.','float d = Vector3.Dot(a, b);'],
'Vector2.Lerp':['두 벡터 사이를 t(0~1) 비율로 보간한다.','Vector2 p = Vector2.Lerp(a, b, 0.5f);'],
'Vector3.Lerp':['두 벡터 사이를 t(0~1) 비율로 보간한다.','Vector3 p = Vector3.Lerp(a, b, 0.5f);'],
'Vector2.MoveTowards':['현재 위치를 목표로 일정 거리씩 이동시킨다.','p = Vector2.MoveTowards(p, target, Time.deltaTime);'],
'Vector3.MoveTowards':['현재 위치를 목표로 일정 거리씩 이동시킨다.','p = Vector3.MoveTowards(p, target, Time.deltaTime);'],
'r':['빨강 성분(0~1)이다.','float r = color.r;'],'g':['초록 성분(0~1)이다.','float g = color.g;'],
'b':['파랑 성분(0~1)이다.','float b = color.b;'],'a':['투명도(0~1)이다.','float a = color.a;'],
'Euler':['x, y, z 각도(°)로 회전값을 만든다.','Quaternion q = Quaternion.Euler(0, 0, 90);'],
'identity':['회전이 없는 상태이다.','transform.rotation = Quaternion.identity;'],
'eulerAngles':['회전을 각도(°)로 나타낸다.','Vector3 r = transform.eulerAngles;'],
/* Transform */
'position':['게임 오브젝트의 위치(칸 좌표)이다. 인스펙터의 position과 같다.','transform.position = new Vector3(5, 3, 0);'],
'localPosition':['부모 기준 위치이다.','transform.localPosition = new Vector3(1, 0, 0);'],
'localScale':['크기 배율이다. 인스펙터의 localScale과 같다.','transform.localScale = new Vector3(2, 2, 1);'],
'rotation':['회전값(Quaternion)이다.','transform.rotation = Quaternion.Euler(0, 0, 45);'],
'parent':['부모 Transform이다.','Transform p = transform.parent;'],
'childCount':['자식 오브젝트 수이다.','int n = transform.childCount;'],
'Translate':['지정한 만큼 이동한다.','transform.Translate(new Vector3(1, 0, 0));'],
'Rotate':['지정한 각도만큼 회전한다.','transform.Rotate(90f);'],
'LookAt':['대상을 바라보게 한다.','transform.LookAt(target);'],
'Transform.Find':['이름으로 자식 Transform을 찾는다.','Transform c = transform.Find("Weapon");'],
'GetChild':['순번으로 자식 Transform을 가져온다.','Transform c = transform.GetChild(0);'],
'SetParent':['부모를 지정한다.','transform.SetParent(parent);'],
/* 컴포넌트 */
'velocity':['이동 속도 벡터입니다.','rb.velocity = new Vector2(2, 0);'],
'angularVelocity':['회전 속도입니다.','rb.angularVelocity = 90f;'],
'mass':['질량입니다.','rb.mass = 2f;'],
'drag':['이동 저항(감속)입니다.','rb.drag = 1f;'],
'isKinematic':['true이면 물리 힘의 영향을 받지 않습니다.','rb.isKinematic = true;'],
'simulated':['물리 시뮬레이션 사용 여부입니다.','rb.simulated = false;'],
'sprite':['표시할 스프라이트입니다. 인스펙터의 sprite와 같습니다.','var sr = GetComponent<SpriteRenderer>();\nDebug.Log(sr.sprite);'],
'color':['색상입니다.','GetComponent<Light>().color = Color.yellow;'],
'flipY':['세로로 뒤집습니다.','sr.flipY = true;'],
'sortingOrder':['그려지는 순서입니다. 값이 클수록 위에 그려집니다. 인스펙터의 sortingOrder와 같습니다.','sr.sortingOrder = 20;'],
'intensity':['빛의 세기입니다. (0.1~1)','GetComponent<Light>().intensity = 0.6f;'],
'radius':['빛이 닿는 거리(칸)이다.','GetComponent<Light>().radius = 8f;'],
'angle':['빛이 퍼지는 각도입니다. 360이면 원, 작으면 부채꼴입니다.','GetComponent<Light>().angle = 60f;'],
'dir':['빛이 향하는 각도입니다. 0은 오른쪽, 90은 아래쪽입니다.','GetComponent<Light>().dir = 90f;'],
'shadows':['true이면 벽 타일맵에 빛이 가려집니다.','GetComponent<Light>().shadows = false;'],
'hp':['몬스터의 체력이다.','GetComponent<Monster>().hp = 5;'],
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
'Volume':['볼륨 컴포넌트입니다. 카메라 화면에 후처리 효과(색 보정 · 비네트 · VHS …)를 입힙니다. weight로 효과의 세기를 0~1 사이로 바꿀 수 있어요.','Volume volume = GetComponent<Volume>();\nvolume.weight = 0.5f;'],
'Volume.weight':['볼륨 효과를 얼마나 섞을지입니다 (0 = 없음, 1 = 전부). 매 프레임 조금씩 바꾸면 화면이 서서히 변해요.','volume.weight = Mathf.MoveTowards(volume.weight, 1f, Time.deltaTime);'],
'Volume.priority':['볼륨이 겹칠 때의 순서입니다. 큰 볼륨이 나중에 섞여 더 강하게 적용됩니다.','volume.priority = 10;'],
'Volume.isGlobal':['true면 전역(화면 전체), false면 지역(박스 콜라이더 2D 상자 안) 볼륨입니다.','volume.isGlobal = true;'],
'Volume.blendDistance':['지역 볼륨 상자 밖에서 효과가 서서히 사라지는 거리(칸)입니다.','volume.blendDistance = 3f;'],
'AudioSource':['오디오 소스 컴포넌트입니다. 인스펙터에서 고른 오디오 클립(음악·효과음)을 재생합니다.','AudioSource audioSource = GetComponent<AudioSource>();\naudioSource.Play();'],
'VisualScript':['이 오브젝트에 붙은 비주얼 스크립트(스크립트 머신 · 상태 머신)와 이벤트 · 변수 · 상태를 주고받는 정적 클래스입니다.','VisualScript.Trigger("문 열기");\nVisualScript.SetVariable("점수", score);'],
'VisualScript.Trigger':['내 오브젝트의 비주얼 스크립트에 커스텀 이벤트를 보냅니다 (「커스텀 이벤트 받기」 노드 · 상태 전환 「이벤트를 받으면」이 받음).','VisualScript.Trigger("말걸기");'],
'VisualScript.TriggerAll':['씬의 모든 비주얼 스크립트에 커스텀 이벤트를 보냅니다.','VisualScript.TriggerAll("게임 시작");'],
'VisualScript.TriggerOn':['이름으로 찾은 오브젝트의 비주얼 스크립트에 커스텀 이벤트를 보냅니다.','VisualScript.TriggerOn("문", "열기");'],
'VisualScript.GetVariable':['오브젝트 변수(없으면 씬 · 앱 변수)를 읽습니다.','int hp = VisualScript.GetVariable("체력");'],
'VisualScript.SetVariable':['오브젝트 변수를 바꿉니다. 비주얼 스크립트의 「변수 가져오기 (오브젝트)」가 같은 값을 읽어요.','VisualScript.SetVariable("체력", 3);'],
'VisualScript.SetState':['내 상태 머신을 그 이름의 상태로 바꿉니다.','VisualScript.SetState("공격");'],
'VisualScript.CurrentState':['내 상태 머신의 지금 상태 이름입니다.','if (VisualScript.CurrentState == "대기") { }'],
'UIScreen':['씬의 UI 그룹(UI 빌더로 만든 그룹 포함)을 이름으로 열고 닫고, 그 안 요소의 글자·값을 다루는 정적 클래스입니다.','UIScreen.Show("설정 창");\nUIScreen.SetText("게임 HUD", "점수", "점수 " + score);'],
'UIScreen.Show':['UI 화면을 보이게 합니다 (가장 앞에 놓임).','UIScreen.Show("설정 창");'],
'UIScreen.Hide':['UI 화면을 숨깁니다.','UIScreen.Hide("설정 창");'],
'UIScreen.Toggle':['UI 화면이 보이면 숨기고, 숨어 있으면 보이게 합니다.','if (Input.GetKeyDown(KeyCode.Escape)) UIScreen.Toggle("메인 메뉴");'],
'UIScreen.HideAll':['모든 UI 화면을 숨깁니다.','UIScreen.HideAll();'],
'UIScreen.IsOpen':['UI 화면이 지금 보이는지 알려 줍니다.','if (UIScreen.IsOpen("설정 창")) return;'],
'UIScreen.SetText':['텍스트 · 버튼 · 체크박스의 글자를 바꿉니다.','UIScreen.SetText("게임 HUD", "점수", "점수 " + score);'],
'UIScreen.GetText':['요소의 글자를 읽습니다 (입력 상자 = 입력한 글자, 드롭다운 = 고른 항목 글자).','string name = UIScreen.GetText("설정 창", "이름");'],
'UIScreen.GetValue':['요소의 값을 읽습니다: 슬라이더·진행 막대 = 숫자, 체크박스 = true/false, 드롭다운 = 고른 번호(0부터), 입력 상자 = 글자.','float volume = UIScreen.GetValue("설정 창", "음량");'],
'UIScreen.SetValue':['요소의 값을 바꾼다 (슬라이더 · 진행 막대 · 체크박스 · 드롭다운 · 입력 상자).','UIScreen.SetValue("게임 HUD", "체력 막대", hero.hp);'],
'UIScreen.SetVisible':['화면 안의 요소 하나를 보이거나 숨긴다.','UIScreen.SetVisible("게임 HUD", "메뉴 버튼", false);'],
'UIScreen.SetColor':['요소의 색을 바꾼다 (글자 요소는 글자색, 나머지는 배경색). "#ff0000" 같은 값.','UIScreen.SetColor("게임 HUD", "점수", "#ffd24a");'],
'Sound':['게임 전체의 배경 음악과 효과음을 다루는 정적 클래스이다. 어느 스크립트에서나 쓸 수 있고, 배경 음악은 씬이 바뀌어도 이어서 재생된다. 보통 BGM 매니저에서 쓴다.','Sound.PlayMusic("타니아의 아침", 0.5f);'],
'PlayMusic':['프로젝트 패널의 오디오 이름으로 배경 음악을 반복 재생한다. 이미 같은 음악이 나오고 있으면 처음부터 다시 틀지 않는다.','Sound.PlayMusic("타니아의 아침", 0.5f);'],
'StopMusic':['배경 음악을 멈춘다.','Sound.StopMusic();'],
'PauseMusic':['배경 음악을 잠시 멈춘다. ResumeMusic()으로 이어서 재생한다.','Sound.PauseMusic();'],
'ResumeMusic':['잠시 멈춘 배경 음악을 이어서 재생한다.','Sound.ResumeMusic();'],
'SetMusicVolume':['배경 음악 볼륨(0~1)을 바꾼다.','Sound.SetMusicVolume(0.3f);'],
'PlayEffect':['효과음을 한 번 재생한다 (겹쳐서 재생됨).','Sound.PlayEffect("coin");'],
'isMusicPlaying':['배경 음악이 재생 중인지 알려 준다.','if (!Sound.isMusicPlaying) Sound.PlayMusic("타니아의 아침");'],
'PlayOneShot':['지금 소리를 끊지 않고 효과음을 겹쳐 한 번 재생한다. 클립 이름을 주면 그 클립을, 없으면 지정된 클립을 낸다.','audioSource.PlayOneShot("coin");\naudioSource.PlayOneShot("hit", 0.5f);'],
'PlayDelayed':['몇 초 뒤에 재생한다.','audioSource.PlayDelayed(1.5f);'],
'UnPause':['일시정지한 소리를 이어서 재생한다.','audioSource.UnPause();'],
'AudioSource.clip':['재생할 오디오 클립 이름이다. 프로젝트 패널의 오디오 이름으로 바꿀 수 있다.','audioSource.clip = "boss_bgm";\naudioSource.Play();'],
'AudioSource.isPlaying':['지금 재생 중인지 알려 준다.','if (!audioSource.isPlaying) audioSource.Play();'],
'AudioSource.time':['지금 재생 위치(초)이다.','audioSource.time = 0f;'],
'mute':['소리만 끈다 (재생은 계속).','audioSource.mute = true;'],
'playOnAwake':['시작할 때 저절로 재생할지 정한다.','audioSource.playOnAwake = false;'],
'Animator':['애니메이터 컴포넌트이다. 애니메이터 창의 컨트롤러(상태 · 전환)를 따라 클립을 재생하고, 스크립트는 파라미터를 바꿔 전환을 일으킨다.','Animator animator = GetComponent<Animator>();\nanimator.SetBool("IsMoving", true);'],
'ResetTrigger':['발동해 둔 트리거를 끈다 (전환이 일어나면 저절로 꺼진다).','animator.ResetTrigger("Attack");'],
'GetBool':['Animator의 bool 파라미터 값을 읽는다.','if (animator.GetBool("IsMoving")) Debug.Log("걷는 중");'],
'GetFloat':['Animator의 float 파라미터 값을 읽는다.','float s = animator.GetFloat("Speed");'],
'GetInteger':['Animator의 int 파라미터 값을 읽는다.','int d = animator.GetInteger("Dir");'],
'Animator.CrossFade':['지정한 상태로 바로 넘어간다. (2D 스프라이트 애니메이션이라 섞임 없이 Play와 같다)','animator.CrossFade("Attack", 0.1f);'],
'GetCurrentAnimatorStateInfo':['지금 재생 중인 상태의 정보를 가져온다. IsName("상태 이름") · normalizedTime(1 = 한 번 다 재생)','var info = animator.GetCurrentAnimatorStateInfo(0);\nif (info.IsName("공격") && info.normalizedTime >= 1f) Debug.Log("공격 끝");'],
'HasState':['컨트롤러에 그 이름의 상태가 있는지 알려 준다.','if (animator.HasState(0, "점프")) animator.Play("점프");'],
'IsName':['상태 이름이 맞는지 확인한다.','animator.GetCurrentAnimatorStateInfo(0).IsName("걷기_아래")'],
'normalizedTime':['상태를 재생한 정도이다. 0 = 시작, 1 = 클립 한 번 끝, 반복하면 계속 커진다.','float t = info.normalizedTime % 1f;'],
'volume':['소리 크기(0~1)이다.','audio.volume = 0.5f;'],
'pitch':['소리 높낮이(재생 속도)이다.','audio.pitch = 1.2f;'],
'loop':['반복 재생 여부이다.','audio.loop = true;'],
'isPlaying':['재생 중인지 나타낸다.','if (audio.isPlaying) Debug.Log("재생 중");'],
'AudioSource.Play':['소리를 재생한다.','audio.Play();'],
'PlayableDirector':['타임라인을 재생하는 플레이어블 디렉터 컴포넌트입니다. 타임라인 창에서 만든 트랙(애니메이션 · 활성화 · 오디오 · 시그널)을 시간에 맞춰 재생합니다. 파일 맨 위에 using UnityEngine.Playables; 를 써도 됩니다.','PlayableDirector director = GetComponent<PlayableDirector>();\ndirector.Play();'],
'PlayableDirector.Play':['타임라인을 처음부터(일시 정지였으면 그 자리부터) 재생합니다.','director.Play();'],
'PlayableDirector.Pause':['타임라인을 그 자리에서 멈춥니다. Resume()으로 이어서 재생합니다.','director.Pause();'],
'PlayableDirector.Resume':['일시 정지한 타임라인을 이어서 재생합니다.','director.Resume();'],
'PlayableDirector.Stop':['타임라인을 멈추고 처음으로 되돌립니다. 활성화 트랙은 「끝난 뒤 상태」를 따릅니다.','director.Stop();'],
'PlayableDirector.time':['지금 재생 위치(초)입니다. 대입하면 그 시간으로 건너뜁니다.','director.time = 2.5;'],
'PlayableDirector.duration':['타임라인 길이(초)입니다.','if (director.time >= director.duration) Debug.Log("끝");'],
'PlayableDirector.state':['재생 중이면 "Playing", 아니면 "Paused"입니다.','if (director.state == "Playing") Debug.Log("재생 중");'],
'Stop':['소리를 멈춥니다.','audio.Stop();'],
'Pause':['소리를 일시정지합니다.','audio.Pause();'],
'isTrigger':['true이면 통과하면서 트리거 이벤트만 발생합니다.','col.isTrigger = true;'],
'collider':['충돌한 상대의 Collider2D입니다.','Collider2D c = col.collider;'],
'orthographicSize':['카메라가 위아래로 보여 주는 범위의 절반(칸)입니다. 작을수록 확대됩니다. 인스펙터 카메라의 “크기”와 같습니다.','Camera.main.orthographicSize = 3f;'],
'backgroundColor':['카메라 배경색입니다.','Camera.main.backgroundColor = Color.black;'],
'main':['메인 카메라입니다.','Camera cam = Camera.main;'],
/* 문자열·배열 */
'string.Length':['문자열의 글자 수이다.','int n = "안녕".Length;'],
'Array.Length':['배열의 크기이다.','int n = arr.Length;'],
'ToUpper':['대문자로 바꾼다.','string s = "abc".ToUpper();'],
'ToLower':['소문자로 바꾼다.','string s = "ABC".ToLower();'],
'Trim':['앞뒤 공백을 제거한다.','string s = " 안녕 ".Trim();'],
'Contains':['문자열이 포함되어 있는지 검사한다.','bool b = name.Contains("몬스터");'],
'StartsWith':['해당 문자열로 시작하는지 검사한다.','bool b = name.StartsWith("적");'],
'EndsWith':['해당 문자열로 끝나는지 검사한다.','bool b = name.EndsWith("1");'],
'IndexOf':['문자열이 처음 나오는 위치를 돌려준다.','int i = name.IndexOf("-");'],
'Substring':['문자열의 일부를 잘라낸다.','string s = name.Substring(0, 2);'],
'Replace':['문자열의 일부를 다른 문자열로 바꾼다.','string s = name.Replace("A", "B");'],
'Split':['구분자로 문자열을 나눈다.','string[] p = "a,b".Split(\',\');'],
/* MonoBehaviour */
'Instantiate':['프리팹이나 게임 오브젝트의 복제본을 만듭니다. public GameObject 슬롯에 프로젝트 창의 프리팹을 끌어다 넣고 쓰세요. 위치를 주지 않으면 이 스크립트가 붙은 오브젝트 자리에 생깁니다. 복제본의 Awake()는 바로, Start()는 다음 프레임에 실행됩니다.','public GameObject bulletPrefab;\n\nvoid Fire()\n{\n    GameObject b = Instantiate(bulletPrefab, transform.position, Quaternion.identity);\n    b.GetComponent<Rigidbody2D>().velocity = Vector2.right * 8;\n    Destroy(b, 3f);   // 3초 뒤에 지움\n}'],
'Destroy':['게임 오브젝트(자식 포함)나 컴포넌트를 지웁니다. 두 번째 값으로 초를 주면 그만큼 기다렸다가 지웁니다. 지우기 직전에 그 오브젝트의 OnDestroy()가 불립니다.','Destroy(gameObject);          // 지금 지우기\nDestroy(gameObject, 2f);      // 2초 뒤에\nDestroy(GetComponent<Rigidbody2D>());  // 컴포넌트만'],
'StopCoroutine':['실행 중인 코루틴 하나를 멈춥니다. StartCoroutine 이 돌려준 값이나 메서드 이름을 넣습니다.','Coroutine c = StartCoroutine(Blink());\nStopCoroutine(c);'],
'StopAllCoroutines':['이 스크립트가 시작한 코루틴을 모두 멈춥니다.','StopAllCoroutines();'],
'IsInvoking':['Invoke 로 예약한 메서드가 아직 남아 있는지 알려 줍니다.','if (!IsInvoking("Spawn")) InvokeRepeating("Spawn", 1f, 2f);'],
'IEnumerator':['코루틴 메서드의 반환 형식입니다. 안에서 yield return 으로 기다릴 수 있고, StartCoroutine(메서드()) 으로 시작합니다. 파일 맨 위에 using System.Collections; 를 쓰세요.','IEnumerator Blink()\n{\n    for (int i = 0; i < 3; i++)\n    {\n        gameObject.SetActive(false);\n        yield return new WaitForSeconds(0.1f);\n        gameObject.SetActive(true);\n        yield return new WaitForSeconds(0.1f);\n    }\n}'],
'WaitForSeconds':['코루틴에서 지정한 시간(초)만큼 기다립니다. Time.timeScale 의 영향을 받습니다.','yield return new WaitForSeconds(1.5f);'],
'WaitForSecondsRealtime':['Time.timeScale 과 상관없이 실제 시간(초)만큼 기다립니다. 일시정지 화면에서 씁니다.','yield return new WaitForSecondsRealtime(1f);'],
'WaitUntil':['조건이 참이 될 때까지 코루틴을 기다리게 합니다.','yield return new WaitUntil(() => score >= 10);'],
'WaitWhile':['조건이 참인 동안 코루틴을 기다리게 합니다.','yield return new WaitWhile(() => Dialog.isOpen);'],
'yield':['코루틴(IEnumerator 메서드) 안에서 잠깐 멈췄다가 다음에 이어 갑니다. yield return null = 한 프레임, yield break = 코루틴 끝내기.','yield return null;\nyield return new WaitForSeconds(1f);\nyield break;'],
'SendMessage':['이 오브젝트에 붙은 모든 스크립트에서 그 이름의 메서드를 부릅니다.','other.gameObject.SendMessage("TakeDamage", 10);'],
'GetComponentInChildren':['자신과 자식들에서 처음 찾은 컴포넌트를 꺼냅니다.','var ps = GetComponentInChildren<ParticleSystem>();'],
'GetComponentInParent':['자신과 부모들에서 처음 찾은 컴포넌트를 꺼냅니다.','var rb = GetComponentInParent<Rigidbody2D>();'],
'FindObjectOfType':['씬에서 그 컴포넌트(내 스크립트 포함)를 가진 첫 오브젝트를 찾습니다.','ScoreManager sm = FindObjectOfType<ScoreManager>();'],
'PlayerPrefs':['게임을 꺼도 남는 저장 공간입니다 (최고 점수 · 설정 · 진행 상황). 프로젝트마다 따로 저장되고, 플레이 ▾ 메뉴의 「저장 데이터 지우기」로 지울 수 있어요.','PlayerPrefs.SetInt("최고점수", score);\nint best = PlayerPrefs.GetInt("최고점수", 0);'],
'SetInt':['정수를 저장합니다.','PlayerPrefs.SetInt("coins", 10);'],'GetInt':['저장한 정수를 읽습니다. 없으면 두 번째 값(기본 0)을 돌려줍니다.','int c = PlayerPrefs.GetInt("coins", 0);'],
'SetFloat':['실수를 저장합니다.','PlayerPrefs.SetFloat("volume", 0.8f);'],'GetFloat':['저장한 실수를 읽습니다.','float v = PlayerPrefs.GetFloat("volume", 1f);'],
'SetString':['글자를 저장합니다.','PlayerPrefs.SetString("name", "냥이");'],'GetString':['저장한 글자를 읽습니다.','string n = PlayerPrefs.GetString("name", "");'],
'HasKey':['그 이름으로 저장한 값이 있는지 알려 줍니다.','if (PlayerPrefs.HasKey("save")) Load();'],'DeleteKey':['저장한 값 하나를 지웁니다.','PlayerPrefs.DeleteKey("save");'],'DeleteAll':['이 프로젝트의 저장 값을 모두 지웁니다.','PlayerPrefs.DeleteAll();'],
'timeScale':['시간이 흐르는 빠르기입니다. 0 = 일시정지 · 0.5 = 슬로모션 · 1 = 보통. Update 는 계속 불리지만 deltaTime · 물리 · 애니메이션 · 파티클이 멈춥니다.','Time.timeScale = 0f;   // 일시정지\nTime.timeScale = 1f;   // 다시'],
'unscaledDeltaTime':['timeScale 과 상관없는 실제 프레임 시간입니다. 일시정지 메뉴 애니메이션에 씁니다.','t += Time.unscaledDeltaTime;'],
'Rigidbody2D':['물리로 움직이는 몸입니다. 중력 · 힘 · 충돌을 받습니다. 아래쪽이 +y 라서 위로 점프하려면 Vector2.up(0, -1) 방향으로 힘을 주세요.','Rigidbody2D rb;\nvoid Start() { rb = GetComponent<Rigidbody2D>(); }\nvoid Update()\n{\n    float x = Input.GetAxis("Horizontal");\n    rb.velocity = new Vector2(x * 5, rb.velocity.y);\n    if (Input.GetKeyDown(KeyCode.Space))\n        rb.AddForce(Vector2.up * 7, ForceMode2D.Impulse);\n}'],
'AddForce':['몸에 힘을 줍니다. ForceMode2D.Impulse 는 한 번에 확 밀고(점프 · 폭발), 기본(Force)은 계속 미는 힘입니다 (FixedUpdate 에서 매번).','rb.AddForce(Vector2.up * 7, ForceMode2D.Impulse);'],
'gravityScale':['중력을 받는 정도입니다. 0이면 떠 있고 2면 두 배로 빨리 떨어집니다.','rb.gravityScale = 0;'],
'MovePosition':['다음 물리 단계에 몸을 그 위치로 옮깁니다.','rb.MovePosition(rb.position + dir * speed * Time.fixedDeltaTime);'],
'Physics2D':['광선 · 원 · 상자로 주변의 콜라이더를 찾습니다. 레이어가 없어서 layerMask 값은 무시하고, 부르는 오브젝트 자신(과 부모 · 자식)은 빼고 찾습니다. 타일 벽 · 땅은 이름 Tilemap · 태그 Ground 로 나옵니다.','bool grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);'],
'Raycast':['한 점에서 한 방향으로 광선을 쏴서 처음 맞은 콜라이더를 알려 줍니다. 맞은 것이 없으면 if (hit) 가 거짓입니다.','RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.right, 5f);\nif (hit) Debug.Log(hit.collider.name + " " + hit.distance);'],
'OverlapCircle':['원 안에 있는 콜라이더 하나를 찾습니다 (없으면 null). 땅 검사에 많이 씁니다.','bool onGround = Physics2D.OverlapCircle(feet.position, 0.2f) != null;'],
'OverlapCircleAll':['원 안에 있는 콜라이더를 모두 찾습니다 (폭발 범위 등).','foreach (var c in Physics2D.OverlapCircleAll(transform.position, 2f))\n    if (c.CompareTag("Enemy")) Destroy(c.gameObject);'],
'Collision2D':['OnCollisionEnter2D 로 받는 충돌 정보입니다. gameObject · collider · relativeVelocity · contacts[0].normal','void OnCollisionEnter2D(Collision2D col)\n{\n    if (col.gameObject.CompareTag("Ground")) grounded = true;\n}'],
'OnCollisionExit2D':['닿아 있던 콜라이더에서 떨어질 때 호출됩니다.','void OnCollisionExit2D(Collision2D col)\n{\n    if (col.gameObject.CompareTag("Ground")) grounded = false;\n}'],
'OnCollisionStay2D':['콜라이더와 닿아 있는 동안 매 프레임 호출됩니다.','void OnCollisionStay2D(Collision2D col) { }'],
'OnTriggerStay2D':['트리거 안에 있는 동안 매 프레임 호출됩니다.','void OnTriggerStay2D(Collider2D other) { }'],
'FixedUpdate':['0.02초마다 일정하게 호출됩니다. 물리(리지드바디)를 다루는 코드는 여기에 쓰세요.','void FixedUpdate()\n{\n    rb.AddForce(Vector2.right * 2);\n}'],
'LateUpdate':['모든 Update 와 물리가 끝난 뒤 매 프레임 호출됩니다. 카메라 따라가기에 씁니다.','void LateUpdate()\n{\n    transform.position = target.position + offset;\n}'],
'OnEnable':['오브젝트가 켜질 때(시작할 때 · SetActive(true)) 호출됩니다.','void OnEnable() { Debug.Log("켜짐"); }'],
'OnDisable':['오브젝트가 꺼질 때(SetActive(false)) 호출됩니다.','void OnDisable() { Debug.Log("꺼짐"); }'],
'OnDestroy':['오브젝트가 Destroy 되기 직전에 호출됩니다.','void OnDestroy() { Debug.Log("사라짐"); }'],
'ParticleSystem':['파티클 시스템 컴포넌트입니다. 인스펙터의 프리셋(불꽃 · 연기 · 폭발 · 비 · 눈 …)을 고르고 스크립트로 재생을 조절합니다.','ParticleSystem ps = GetComponent<ParticleSystem>();\nps.Play();\nps.Emit(20);\nvar main = ps.main;\nmain.startColor = Color.cyan;'],
'Emit':['파티클을 지금 바로 그 개수만큼 뿜습니다.','ps.Emit(30);'],
'CompareTag':['태그가 같은지 확인합니다. 태그는 인스펙터 맨 위의 「태그」 칸에서 정합니다 (주인공은 기본 Player).','if (other.CompareTag("Player")) Debug.Log("주인공이 닿았어요");'],
'FindWithTag':['그 태그를 가진 게임 오브젝트 하나를 찾습니다.','GameObject player = GameObject.FindWithTag("Player");'],
'FindGameObjectsWithTag':['그 태그를 가진 게임 오브젝트를 모두 배열로 찾습니다.','GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");\nDebug.Log(enemies.Length);'],
'ScreenToWorldPoint':['화면 좌표(마우스 위치)를 씬 좌표(칸)로 바꿉니다.','Vector3 p = Camera.main.ScreenToWorldPoint(Input.mousePosition);'],
'Shake':['카메라를 잠깐 흔듭니다 (세기 칸 · 시간 초). Thaniya 전용 기능이에요.','Camera.main.Shake(0.3f, 0.25f);'],
'flipX':['그림을 좌우로 뒤집습니다. 왼쪽을 볼 때 씁니다.','GetComponent<SpriteRenderer>().flipX = x < 0;'],
'Dictionary':['키로 값을 찾는 표입니다.','Dictionary<string, int> scores = new Dictionary<string, int>();\nscores["냥이"] = 10;\nif (scores.ContainsKey("냥이")) Debug.Log(scores["냥이"]);'],
'Queue':['먼저 넣은 것이 먼저 나오는 줄입니다.','Queue<string> q = new Queue<string>();\nq.Enqueue("a");\nstring first = q.Dequeue();'],
'switch':['값에 따라 갈래를 나눕니다. case 마다 break 로 끝냅니다.','switch (state)\n{\n    case 0:\n        Debug.Log("대기");\n        break;\n    default:\n        Debug.Log("그 밖");\n        break;\n}'],
'try':['오류가 날 수 있는 코드를 감쌉니다. 오류가 나면 catch 로 넘어갑니다.','try\n{\n    int n = int.Parse(text);\n}\ncatch (System.Exception e)\n{\n    Debug.Log(e.Message);\n}'],
'nameof':['메서드 · 변수 이름을 글자로 바꿉니다. Invoke 에 쓰면 이름을 잘못 쓸 일이 없어요.','Invoke(nameof(Spawn), 2f);'],
'Invoke':['지정한 시간(초) 뒤에 함수를 실행합니다.','Invoke("Fire", 2f);'],
'InvokeRepeating':['지정한 시간 뒤부터 일정 간격으로 함수를 반복 실행합니다.','InvokeRepeating("Fire", 1f, 0.5f);'],
'CancelInvoke':['예약된 Invoke를 모두 취소합니다.','CancelInvoke();'],
'StartCoroutine':['코루틴(시간에 걸친 작업)을 시작합니다.','StartCoroutine(Wait());'],
};
function acDoc(it){
  const g=!it.u&&((it.o&&AC_DOC[it.o+'.'+it.n])||AC_DOC[it.n]);
  if(g)return{ko:g[0],ex:g[1]||''};
  if(it.o==='KeyCode')return{ko:'키보드·마우스 입력 코드 '+it.n+'이다.',ex:'if (Input.GetKey(KeyCode.'+it.n+'))\n    Debug.Log("눌림");'};
  if(it.o==='Color')return{ko:it.n+' 색상이다.',ex:'GetComponent<Light>().color = Color.'+it.n+';'};
  if(it.sn)return{ko:it.k==='ev'?'유니티 메시지 함수이다. Enter로 틀을 삽입한다.':it.k==='sn'?'코드 조각이다. Enter로 틀을 삽입한다.':'',ex:it.sn.replace('|','')};
  if(it.k==='ty'&&it.d==='컴포넌트')return{ko:'GetComponent<T>()로 가져올 수 있는 컴포넌트이다.',ex:'var c = GetComponent<'+it.n+'>();'};
  if(it.k==='ty'&&it.d==='네임스페이스')return{ko:'가져올 수 있는 네임스페이스이다.',ex:'using '+it.n+';'};
  if(it.k==='ty')return{ko:it.n+' 형식(클래스)이다.',ex:it.n+' obj;'};
  if(it.k==='var')return{ko:'이 스크립트에서 선언한 변수이다. (형식: '+(it.t||'?')+')',ex:''};
  if(it.k==='fn'&&(it.u||!it.o))return{ko:'이 스크립트에서 선언한 함수이다.',ex:''};
  if(it.k==='kw')return{ko:'C# 키워드이다.',ex:''};
  return{ko:it.o?it.o+'의 멤버이다.'+(it.t?' (형식: '+it.t+')':''):'',ex:''};
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
  b.innerHTML=`<div class="acl">`+ac.items.map((it,i)=>`<div class="aci${i===ac.sel?' on':''}" data-i="${i}" role="option"><span class="ack ${it.k}">${AC_ICON[it.k]}</span><span class="acn">${csedEsc(csedSet().ko&&it.ko?it.ko:it.n)}</span><span class="acd">${csedEsc(csedSet().ko?(it.ko?it.n+' · ':'')+koTypes(it.d):(it.d||''))}</span></div>`).join('')+`</div><div class="acg">${acGuide(ac.items[ac.sel])}</div><div class="acf">${ac.conv?`<span class="acconv" title="${csedEsc(csedT('한글 자판 상태로 입력한 영어를 바꿔 찾았다 (설정 › 스크립트 편집기에서 끌 수 있음)'))}">${csedEsc(csedT('한/영 보정'))} → <b>${csedEsc(ac.conv)}</b></span> · `:''}↑↓ 선택 · Enter/Tab 삽입 · Esc 닫기</div>`;
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
const FX_TIER=[[100,'전설!','#ff5bd6'],[50,'굉장하다!','#ff5b6b'],[25,'대단하다!','#ff8a2a'],[10,'좋다!','#ffd24a']];
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
/* ---- 괄호 자동 닫기: ( [ { 를 치면 짝 ) ] } 를 함께 넣고 커서는 가운데 ----
   · 선택한 글이 있으면 괄호로 감쌈 · 바로 뒤가 같은 닫는 괄호면 새로 넣지 않고 건너뜀
   · 빈 짝 사이에서 Backspace → 둘 다 지움 · { } 사이에서 Enter → 세 줄로 펼치고 안쪽 들여쓰기
   설정 › 스크립트 편집기의 autoPair가 false면 끔 (공용: 엔진 · 학습 화면) */
const ED_PAIR={'(':')','[':']','{':'}'},ED_CLOSE={')':'(',']':'[','}':'{'};
function edPairs(e,ta){
  if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.keyCode===229)return false;
  try{if(csedSet().autoPair===false)return false}catch(_){}
  const k=e.key,a=ta.selectionStart,b=ta.selectionEnd,v=ta.value;
  const done=(txt,s0,e0,c0,c1,typed)=>{e.preventDefault();ta.setRangeText(txt,s0,e0,'end');ta.setSelectionRange(c0,c1==null?c0:c1);let ev;try{ev=typed?new InputEvent('input',{bubbles:true,inputType:'insertText',data:typed}):null}catch(_){ev=null}ta.dispatchEvent(ev||new Event('input',{bubbles:true}));return true};
  /* 문자열 · 주석 안에서는 하지 않음 (그 줄에서 커서 앞의 따옴표가 홀수개이거나 // 뒤) */
  const ls=v.lastIndexOf('\n',a-1)+1,before=v.slice(ls,a);
  const inStr=((before.replace(/\\"/g,'').match(/"/g)||[]).length%2===1)||/\/\//.test(before.replace(/"[^"]*"/g,''));
  if(ED_PAIR[k]){
    if(a!==b)return done(k+v.slice(a,b)+ED_PAIR[k],a,b,a+1,b+1);
    if(inStr)return false;
    const nx=v[a]||'';if(nx&&!/[\s)\]};,]/.test(nx))return false;
    return done(k+ED_PAIR[k],a,b,a+1,null,k);
  }
  if(ED_CLOSE[k]&&a===b&&v[a]===k){e.preventDefault();ta.setSelectionRange(a+1,a+1);return true}
  if(k==='Backspace'&&a===b&&a>0&&ED_PAIR[v[a-1]]&&v[a]===ED_PAIR[v[a-1]])return done('',a-1,a+1,a-1);
  if((k==='Enter'||e.code==='NumpadEnter')&&!e.shiftKey&&a===b&&v[a-1]==='{'&&v[a]==='}'){
    const ind=/^[ \t]*/.exec(v.slice(ls,a))[0];
    return done('\n'+ind+'    \n'+ind,a,b,a+1+ind.length+4);
  }
  return false;
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
  edHelpHook(ta);   /* help / 도움말 / F1 → 스크립트 도움말 창 */
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
})({"api": {"Debug:static": [{"n": "Log", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 일반 로그를 한 줄 출력한다.", "ex": "Debug.Log(\"Hello, Thaniya!\");"}, {"n": "LogWarning", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 경고(노란색)를 출력한다.", "ex": "Debug.LogWarning(\"배터리가 얼마 남지 않았어요\");"}, {"n": "LogError", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "콘솔에 오류(빨간색)를 출력한다.", "ex": "Debug.LogError(\"저장에 실패했어요\");"}], "Mathf:static": [{"n": "PI", "k": "pr", "t": "float", "d": "원주율 3.14159… 이다."}, {"n": "Infinity", "k": "pr", "t": "float", "d": "무한대이다."}, {"n": "Deg2Rad", "k": "pr", "t": "float", "d": "도(°)를 라디안으로 바꾸는 값이다."}, {"n": "Rad2Deg", "k": "pr", "t": "float", "d": "라디안을 도(°)로 바꾸는 값이다."}, {"n": "Abs", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "절댓값이다.", "ex": "float a = Mathf.Abs(-3f);"}, {"n": "Sqrt", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "제곱근이다.", "ex": "float r = Mathf.Sqrt(16f);"}, {"n": "Pow", "k": "fn", "t": "float", "sig": "float f, float p", "a": true, "d": "f의 p제곱이다.", "ex": "float r = Mathf.Pow(2f, 3f);"}, {"n": "Min", "k": "fn", "t": "float", "sig": "float a, float b", "a": true, "d": "둘 중 작은 값이다."}, {"n": "Max", "k": "fn", "t": "float", "sig": "float a, float b", "a": true, "d": "둘 중 큰 값이다."}, {"n": "Clamp", "k": "fn", "t": "float", "sig": "float value, float min, float max", "a": true, "d": "값을 min~max 사이로 제한한다.", "ex": "hp = Mathf.Clamp(hp, 0, 100);"}, {"n": "Clamp01", "k": "fn", "t": "float", "sig": "float value", "a": true, "d": "값을 0~1 사이로 제한한다."}, {"n": "Lerp", "k": "fn", "t": "float", "sig": "float a, float b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 값이다."}, {"n": "InverseLerp", "k": "fn", "t": "float", "sig": "float a, float b, float value", "a": true, "d": "value가 a~b 사이 어디쯤인지 0~1로 돌려준다."}, {"n": "MoveTowards", "k": "fn", "t": "float", "sig": "float current, float target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가간다."}, {"n": "Floor", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "소수점 아래를 내린다."}, {"n": "Ceil", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "소수점 아래를 올린다."}, {"n": "Round", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "반올림한다."}, {"n": "FloorToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "내림해서 정수로 돌려준다."}, {"n": "CeilToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "올림해서 정수로 돌려준다."}, {"n": "RoundToInt", "k": "fn", "t": "int", "sig": "float f", "a": true, "d": "반올림해서 정수로 돌려준다."}, {"n": "Sin", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "사인 값이다."}, {"n": "Cos", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "코사인 값이다."}, {"n": "Tan", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "탄젠트 값이다."}, {"n": "Atan2", "k": "fn", "t": "float", "sig": "float y, float x", "a": true, "d": "(x, y) 방향의 각도(라디안)이다."}, {"n": "Sign", "k": "fn", "t": "float", "sig": "float f", "a": true, "d": "양수면 1, 음수면 -1이다."}, {"n": "Repeat", "k": "fn", "t": "float", "sig": "float t, float length", "a": true, "d": "t를 0~length 범위로 되감는다."}, {"n": "Approximately", "k": "fn", "t": "bool", "sig": "float a, float b", "a": true, "d": "두 실수가 거의 같은지 검사한다."}], "Time:static": [{"n": "deltaTime", "k": "pr", "t": "float", "d": "지난 프레임부터 걸린 시간(초)이다."}, {"n": "fixedDeltaTime", "k": "pr", "t": "float", "d": "물리 계산 간격(초)이다."}, {"n": "time", "k": "pr", "t": "float", "d": "게임이 시작된 뒤 흐른 시간(초)이다."}, {"n": "timeScale", "k": "pr", "t": "float", "d": "시간이 흐르는 속도이다."}, {"n": "frameCount", "k": "pr", "t": "int", "d": "지금까지 지난 프레임 수이다."}], "Input:static": [{"n": "GetKey", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키를 누르고 있는 동안 true이다.", "ex": "if (Input.GetKey(KeyCode.Space)) Debug.Log(\"누름\");"}, {"n": "GetKeyDown", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키를 누른 그 프레임에만 true이다."}, {"n": "GetKeyUp", "k": "fn", "t": "bool", "sig": "KeyCode key", "a": true, "d": "키에서 손을 뗀 프레임에만 true이다."}, {"n": "GetAxis", "k": "fn", "t": "float", "sig": "string axisName", "a": true, "d": "\"Horizontal\" · \"Vertical\" 입력을 -1~1로 돌려준다.", "ex": "float h = Input.GetAxis(\"Horizontal\");"}, {"n": "GetAxisRaw", "k": "fn", "t": "float", "sig": "string axisName", "a": true, "d": "GetAxis와 같지만 부드럽게 변하지 않는다."}, {"n": "GetButton", "k": "fn", "t": "bool", "sig": "string name", "a": true, "d": "\"Jump\" · \"Fire1\" · \"Submit\" 버튼을 누르고 있으면 true이다."}, {"n": "GetButtonDown", "k": "fn", "t": "bool", "sig": "string name", "a": true, "d": "버튼을 누른 프레임에만 true이다."}, {"n": "GetMouseButton", "k": "fn", "t": "bool", "sig": "int button", "a": true, "d": "마우스 버튼(0 왼쪽, 1 오른쪽)을 누르고 있으면 true이다."}, {"n": "GetMouseButtonDown", "k": "fn", "t": "bool", "sig": "int button", "a": true, "d": "마우스 버튼을 누른 프레임에만 true이다."}, {"n": "anyKey", "k": "pr", "t": "bool", "d": "아무 키나 눌려 있으면 true이다."}], "KeyCode:static": [{"n": "A", "k": "pr", "t": "KeyCode", "d": "A 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.A))\n    Debug.Log(\"눌림\");"}, {"n": "B", "k": "pr", "t": "KeyCode", "d": "B 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.B))\n    Debug.Log(\"눌림\");"}, {"n": "C", "k": "pr", "t": "KeyCode", "d": "C 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.C))\n    Debug.Log(\"눌림\");"}, {"n": "D", "k": "pr", "t": "KeyCode", "d": "D 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.D))\n    Debug.Log(\"눌림\");"}, {"n": "E", "k": "pr", "t": "KeyCode", "d": "E 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.E))\n    Debug.Log(\"눌림\");"}, {"n": "F", "k": "pr", "t": "KeyCode", "d": "F 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.F))\n    Debug.Log(\"눌림\");"}, {"n": "G", "k": "pr", "t": "KeyCode", "d": "G 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.G))\n    Debug.Log(\"눌림\");"}, {"n": "H", "k": "pr", "t": "KeyCode", "d": "H 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.H))\n    Debug.Log(\"눌림\");"}, {"n": "I", "k": "pr", "t": "KeyCode", "d": "I 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.I))\n    Debug.Log(\"눌림\");"}, {"n": "J", "k": "pr", "t": "KeyCode", "d": "J 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.J))\n    Debug.Log(\"눌림\");"}, {"n": "K", "k": "pr", "t": "KeyCode", "d": "K 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.K))\n    Debug.Log(\"눌림\");"}, {"n": "L", "k": "pr", "t": "KeyCode", "d": "L 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.L))\n    Debug.Log(\"눌림\");"}, {"n": "M", "k": "pr", "t": "KeyCode", "d": "M 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.M))\n    Debug.Log(\"눌림\");"}, {"n": "N", "k": "pr", "t": "KeyCode", "d": "N 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.N))\n    Debug.Log(\"눌림\");"}, {"n": "O", "k": "pr", "t": "KeyCode", "d": "O 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.O))\n    Debug.Log(\"눌림\");"}, {"n": "P", "k": "pr", "t": "KeyCode", "d": "P 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.P))\n    Debug.Log(\"눌림\");"}, {"n": "Q", "k": "pr", "t": "KeyCode", "d": "Q 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Q))\n    Debug.Log(\"눌림\");"}, {"n": "R", "k": "pr", "t": "KeyCode", "d": "R 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.R))\n    Debug.Log(\"눌림\");"}, {"n": "S", "k": "pr", "t": "KeyCode", "d": "S 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.S))\n    Debug.Log(\"눌림\");"}, {"n": "T", "k": "pr", "t": "KeyCode", "d": "T 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.T))\n    Debug.Log(\"눌림\");"}, {"n": "U", "k": "pr", "t": "KeyCode", "d": "U 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.U))\n    Debug.Log(\"눌림\");"}, {"n": "V", "k": "pr", "t": "KeyCode", "d": "V 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.V))\n    Debug.Log(\"눌림\");"}, {"n": "W", "k": "pr", "t": "KeyCode", "d": "W 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.W))\n    Debug.Log(\"눌림\");"}, {"n": "X", "k": "pr", "t": "KeyCode", "d": "X 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.X))\n    Debug.Log(\"눌림\");"}, {"n": "Y", "k": "pr", "t": "KeyCode", "d": "Y 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Y))\n    Debug.Log(\"눌림\");"}, {"n": "Z", "k": "pr", "t": "KeyCode", "d": "Z 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Z))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha0", "k": "pr", "t": "KeyCode", "d": "Alpha0 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha0))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha1", "k": "pr", "t": "KeyCode", "d": "Alpha1 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha1))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha2", "k": "pr", "t": "KeyCode", "d": "Alpha2 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha2))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha3", "k": "pr", "t": "KeyCode", "d": "Alpha3 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha3))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha4", "k": "pr", "t": "KeyCode", "d": "Alpha4 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha4))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha5", "k": "pr", "t": "KeyCode", "d": "Alpha5 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha5))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha6", "k": "pr", "t": "KeyCode", "d": "Alpha6 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha6))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha7", "k": "pr", "t": "KeyCode", "d": "Alpha7 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha7))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha8", "k": "pr", "t": "KeyCode", "d": "Alpha8 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha8))\n    Debug.Log(\"눌림\");"}, {"n": "Alpha9", "k": "pr", "t": "KeyCode", "d": "Alpha9 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Alpha9))\n    Debug.Log(\"눌림\");"}, {"n": "Space", "k": "pr", "t": "KeyCode", "d": "Space 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Space))\n    Debug.Log(\"눌림\");"}, {"n": "Return", "k": "pr", "t": "KeyCode", "d": "Return 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Return))\n    Debug.Log(\"눌림\");"}, {"n": "Escape", "k": "pr", "t": "KeyCode", "d": "Escape 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Escape))\n    Debug.Log(\"눌림\");"}, {"n": "Tab", "k": "pr", "t": "KeyCode", "d": "Tab 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Tab))\n    Debug.Log(\"눌림\");"}, {"n": "Backspace", "k": "pr", "t": "KeyCode", "d": "Backspace 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Backspace))\n    Debug.Log(\"눌림\");"}, {"n": "UpArrow", "k": "pr", "t": "KeyCode", "d": "UpArrow 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.UpArrow))\n    Debug.Log(\"눌림\");"}, {"n": "DownArrow", "k": "pr", "t": "KeyCode", "d": "DownArrow 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.DownArrow))\n    Debug.Log(\"눌림\");"}, {"n": "LeftArrow", "k": "pr", "t": "KeyCode", "d": "LeftArrow 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.LeftArrow))\n    Debug.Log(\"눌림\");"}, {"n": "RightArrow", "k": "pr", "t": "KeyCode", "d": "RightArrow 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.RightArrow))\n    Debug.Log(\"눌림\");"}, {"n": "LeftShift", "k": "pr", "t": "KeyCode", "d": "LeftShift 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.LeftShift))\n    Debug.Log(\"눌림\");"}, {"n": "RightShift", "k": "pr", "t": "KeyCode", "d": "RightShift 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.RightShift))\n    Debug.Log(\"눌림\");"}, {"n": "LeftControl", "k": "pr", "t": "KeyCode", "d": "LeftControl 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.LeftControl))\n    Debug.Log(\"눌림\");"}, {"n": "RightControl", "k": "pr", "t": "KeyCode", "d": "RightControl 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.RightControl))\n    Debug.Log(\"눌림\");"}, {"n": "LeftAlt", "k": "pr", "t": "KeyCode", "d": "LeftAlt 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.LeftAlt))\n    Debug.Log(\"눌림\");"}, {"n": "RightAlt", "k": "pr", "t": "KeyCode", "d": "RightAlt 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.RightAlt))\n    Debug.Log(\"눌림\");"}, {"n": "Mouse0", "k": "pr", "t": "KeyCode", "d": "Mouse0 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Mouse0))\n    Debug.Log(\"눌림\");"}, {"n": "Mouse1", "k": "pr", "t": "KeyCode", "d": "Mouse1 키(입력 코드)이다.", "ex": "if (Input.GetKey(KeyCode.Mouse1))\n    Debug.Log(\"눌림\");"}], "Random:static": [{"n": "Range", "k": "fn", "t": "float", "sig": "float min, float max", "a": true, "d": "min 이상 max 미만의 무작위 값이다. (둘 다 정수면 정수)", "ex": "int dice = Random.Range(1, 7);"}, {"n": "value", "k": "pr", "t": "float", "d": "0~1 사이의 무작위 실수이다."}], "Color:static": [{"n": "red", "k": "pr", "t": "Color", "d": "red 색상이다.", "ex": "Color c = Color.red;"}, {"n": "green", "k": "pr", "t": "Color", "d": "green 색상이다.", "ex": "Color c = Color.green;"}, {"n": "blue", "k": "pr", "t": "Color", "d": "blue 색상이다.", "ex": "Color c = Color.blue;"}, {"n": "white", "k": "pr", "t": "Color", "d": "white 색상이다.", "ex": "Color c = Color.white;"}, {"n": "black", "k": "pr", "t": "Color", "d": "black 색상이다.", "ex": "Color c = Color.black;"}, {"n": "yellow", "k": "pr", "t": "Color", "d": "yellow 색상이다.", "ex": "Color c = Color.yellow;"}, {"n": "cyan", "k": "pr", "t": "Color", "d": "cyan 색상이다.", "ex": "Color c = Color.cyan;"}, {"n": "magenta", "k": "pr", "t": "Color", "d": "magenta 색상이다.", "ex": "Color c = Color.magenta;"}, {"n": "gray", "k": "pr", "t": "Color", "d": "gray 색상이다.", "ex": "Color c = Color.gray;"}, {"n": "grey", "k": "pr", "t": "Color", "d": "grey 색상이다.", "ex": "Color c = Color.grey;"}], "Vector2": [{"n": "x", "k": "pr", "t": "float", "d": "가로(X) 값이다.", "ex": "float px = hero.transform.position.x;"}, {"n": "y", "k": "pr", "t": "float", "d": "세로(Y) 값이다. 씬에서는 아래로 갈수록 커진다."}, {"n": "magnitude", "k": "pr", "t": "float", "d": "벡터의 길이이다."}, {"n": "sqrMagnitude", "k": "pr", "t": "float", "d": "길이의 제곱이다."}, {"n": "normalized", "k": "pr", "t": "Vector2", "d": "길이를 1로 맞춘 벡터이다."}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "벡터를 글자로 바꾼다."}], "Vector2:static": [{"n": "zero", "k": "pr", "t": "Vector2", "d": "(0, 0) 이다."}, {"n": "one", "k": "pr", "t": "Vector2", "d": "(1, 1) 이다."}, {"n": "up", "k": "pr", "t": "Vector2", "d": "위쪽 (0, -1) 이다. 씬은 아래로 갈수록 y가 커진다."}, {"n": "down", "k": "pr", "t": "Vector2", "d": "아래쪽 (0, 1) 이다."}, {"n": "left", "k": "pr", "t": "Vector2", "d": "왼쪽 (-1, 0) 이다."}, {"n": "right", "k": "pr", "t": "Vector2", "d": "오른쪽 (1, 0) 이다.", "ex": "slime.transform.position = hero.transform.position + Vector2.right;"}, {"n": "Distance", "k": "fn", "t": "float", "sig": "Vector2 a, Vector2 b", "a": true, "d": "두 점 사이의 거리이다.", "ex": "float d = Vector2.Distance(a, b);"}, {"n": "Dot", "k": "fn", "t": "float", "sig": "Vector2 a, Vector2 b", "a": true, "d": "두 벡터의 내적이다."}, {"n": "Lerp", "k": "fn", "t": "Vector2", "sig": "Vector2 a, Vector2 b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 지점이다.", "ex": "Vector2 p = Vector2.Lerp(a, b, 0.5f);"}, {"n": "MoveTowards", "k": "fn", "t": "Vector2", "sig": "Vector2 current, Vector2 target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가간다."}, {"n": "ClampMagnitude", "k": "fn", "t": "Vector2", "sig": "Vector2 v, float max", "a": true, "d": "길이가 max를 넘지 않게 줄인다."}], "Vector3": [{"n": "x", "k": "pr", "t": "float", "d": "가로(X) 값이다.", "ex": "float px = hero.transform.position.x;"}, {"n": "y", "k": "pr", "t": "float", "d": "세로(Y) 값이다. 씬에서는 아래로 갈수록 커진다."}, {"n": "z", "k": "pr", "t": "float", "d": "깊이(Z) 값이다."}, {"n": "magnitude", "k": "pr", "t": "float", "d": "벡터의 길이이다."}, {"n": "sqrMagnitude", "k": "pr", "t": "float", "d": "길이의 제곱이다."}, {"n": "normalized", "k": "pr", "t": "Vector3", "d": "길이를 1로 맞춘 벡터이다."}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "벡터를 글자로 바꾼다."}], "Vector3:static": [{"n": "zero", "k": "pr", "t": "Vector3", "d": "(0, 0) 이다."}, {"n": "one", "k": "pr", "t": "Vector3", "d": "(1, 1) 이다."}, {"n": "up", "k": "pr", "t": "Vector3", "d": "위쪽 (0, -1) 이다. 씬은 아래로 갈수록 y가 커진다."}, {"n": "down", "k": "pr", "t": "Vector3", "d": "아래쪽 (0, 1) 이다."}, {"n": "left", "k": "pr", "t": "Vector3", "d": "왼쪽 (-1, 0) 이다."}, {"n": "right", "k": "pr", "t": "Vector3", "d": "오른쪽 (1, 0) 이다.", "ex": "slime.transform.position = hero.transform.position + Vector2.right;"}, {"n": "Distance", "k": "fn", "t": "float", "sig": "Vector3 a, Vector3 b", "a": true, "d": "두 점 사이의 거리이다.", "ex": "float d = Vector2.Distance(a, b);"}, {"n": "Dot", "k": "fn", "t": "float", "sig": "Vector3 a, Vector3 b", "a": true, "d": "두 벡터의 내적이다."}, {"n": "Lerp", "k": "fn", "t": "Vector3", "sig": "Vector3 a, Vector3 b, float t", "a": true, "d": "a에서 b까지 t(0~1)만큼 간 지점이다.", "ex": "Vector2 p = Vector2.Lerp(a, b, 0.5f);"}, {"n": "MoveTowards", "k": "fn", "t": "Vector3", "sig": "Vector3 current, Vector3 target, float maxDelta", "a": true, "d": "목표를 향해 최대 maxDelta만큼 다가간다."}, {"n": "ClampMagnitude", "k": "fn", "t": "Vector3", "sig": "Vector3 v, float max", "a": true, "d": "길이가 max를 넘지 않게 줄인다."}], "GameObject": [{"n": "name", "k": "pr", "t": "string", "d": "오브젝트의 이름이다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)이다.", "ex": "slime.transform.position = hero.transform.position;"}, {"n": "activeSelf", "k": "pr", "t": "bool", "d": "켜져 있으면 true이다."}, {"n": "SetActive", "k": "fn", "t": "void", "sig": "bool value", "a": true, "d": "오브젝트를 켜거나 끈다.", "ex": "torch.SetActive(false);"}, {"n": "GetComponent", "k": "fn", "t": "T", "a": false, "gen": true, "d": "이 오브젝트에 붙은 컴포넌트를 꺼낸다. 없으면 null이다.", "ex": "Light light = torch.GetComponent<Light>();"}], "GameObject:static": [{"n": "Find", "k": "fn", "t": "GameObject", "sig": "string name", "a": true, "d": "이름으로 오브젝트를 찾는다. 없으면 null이다.", "ex": "GameObject torch = GameObject.Find(\"횃불\");"}], "Transform": [{"n": "position", "k": "pr", "t": "Vector2", "d": "씬 안에서의 위치이다. 새 값을 대입하면 오브젝트가 이동한다.", "ex": "tr.position = new Vector2(3, 4);"}, {"n": "localPosition", "k": "pr", "t": "Vector2", "d": "부모 기준 위치이다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 Transform이 붙은 게임 오브젝트이다."}, {"n": "name", "k": "pr", "t": "string", "d": "오브젝트의 이름이다."}, {"n": "Translate", "k": "fn", "t": "void", "sig": "Vector2 delta", "a": true, "d": "현재 위치에서 delta만큼 옮긴다.", "ex": "transform.Translate(Vector2.right);"}], "Camera": [{"n": "orthographicSize", "k": "pr", "t": "float", "d": "화면 위아래로 보여 주는 범위의 절반(칸)이다. 작을수록 확대된다.", "ex": "Camera.main.orthographicSize = 2;"}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 카메라가 붙은 게임 오브젝트이다."}], "Camera:static": [{"n": "main", "k": "pr", "t": "Camera", "d": "메인 카메라이다.", "ex": "Camera cam = Camera.main;"}], "Light": [{"n": "enabled", "k": "pr", "t": "bool", "d": "빛이 켜져 있는지 나타낸다. false를 대입하면 꺼진다.", "ex": "light.enabled = false;"}, {"n": "intensity", "k": "pr", "t": "float", "d": "빛의 세기이다. 0.1~1 사이 값이다.", "ex": "light.intensity = 0.3f;"}, {"n": "radius", "k": "pr", "t": "float", "d": "빛이 닿는 거리(칸)이다."}, {"n": "shadows", "k": "pr", "t": "bool", "d": "true이면 벽에 빛이 가려진다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트이다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)이다."}], "Hero": [{"n": "hp", "k": "pr", "t": "int", "d": "주인공의 체력이다.", "ex": "hero.hp = hero.hp / 2;"}, {"n": "maxHp", "k": "pr", "t": "int", "d": "주인공의 최대 체력이다."}, {"n": "position", "k": "pr", "t": "Vector2", "d": "주인공의 위치이다."}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트이다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)이다."}], "Item": [{"n": "qty", "k": "pr", "t": "int", "d": "아이템의 수량이다.", "ex": "potion.qty -= 1;"}, {"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 컴포넌트가 붙은 게임 오브젝트이다."}, {"n": "transform", "k": "pr", "t": "Transform", "d": "위치 정보(Transform)이다."}], "Text": [{"n": "text", "k": "pr", "t": "string", "d": "화면에 보이는 글자이다.", "ex": "label.text = \"포션 \" + potion.qty + \"개\";"}, {"n": "fontSize", "k": "pr", "t": "int", "d": "글자 크기이다."}], "string": [{"n": "Length", "k": "pr", "t": "int", "d": "글자 수이다.", "ex": "int n = \"안녕\".Length;"}, {"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "글자 그대로 돌려준다."}, {"n": "ToUpper", "k": "fn", "t": "string", "a": false, "d": "대문자로 바꾼다."}, {"n": "ToLower", "k": "fn", "t": "string", "a": false, "d": "소문자로 바꾼다."}, {"n": "Trim", "k": "fn", "t": "string", "a": false, "d": "앞뒤 공백을 지운다."}, {"n": "Contains", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "글자가 들어 있는지 검사한다.", "ex": "bool b = name.Contains(\"몬스터\");"}, {"n": "StartsWith", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "해당 글자로 시작하는지 검사한다."}, {"n": "EndsWith", "k": "fn", "t": "bool", "sig": "string value", "a": true, "d": "해당 글자로 끝나는지 검사한다."}, {"n": "IndexOf", "k": "fn", "t": "int", "sig": "string value", "a": true, "d": "처음 나오는 위치를 돌려준다. 없으면 -1이다."}, {"n": "Substring", "k": "fn", "t": "string", "sig": "int start, int length", "a": true, "d": "글자의 일부를 잘라 낸다.", "ex": "string s = name.Substring(0, 2);"}, {"n": "Replace", "k": "fn", "t": "string", "sig": "string a, string b", "a": true, "d": "a를 b로 바꾼다.", "ex": "string s = name.Replace(\"A\", \"B\");"}], "MonoBehaviour": [{"n": "gameObject", "k": "pr", "t": "GameObject", "d": "이 스크립트가 붙은 게임 오브젝트이다.", "ex": "Debug.Log(gameObject.name);"}, {"n": "transform", "k": "pr", "t": "Transform", "d": "이 오브젝트의 위치 정보(Transform)이다.", "ex": "Debug.Log(transform.position.x);"}, {"n": "name", "k": "pr", "t": "string", "d": "이 오브젝트의 이름이다.", "ex": "Debug.Log(name);"}, {"n": "GetComponent", "k": "fn", "t": "T", "a": false, "gen": true, "d": "이 오브젝트에 붙은 컴포넌트를 꺼낸다. 없으면 null이다.", "ex": "Transform tr = GetComponent<Transform>();"}, {"n": "print", "k": "fn", "t": "void", "sig": "object message", "a": true, "d": "Debug.Log와 같이 콘솔에 한 줄 출력한다.", "ex": "print(\"안녕\");"}], "bool": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꾼다.", "ex": "string s = hp.ToString();"}], "double": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꾼다.", "ex": "string s = hp.ToString();"}], "float": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꾼다.", "ex": "string s = hp.ToString();"}], "long": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꾼다.", "ex": "string s = hp.ToString();"}], "int": [{"n": "ToString", "k": "fn", "t": "string", "a": false, "d": "숫자를 글자로 바꾼다.", "ex": "string s = hp.ToString();"}]}, "tydoc": {"Debug": "콘솔에 글을 출력하는 도구 모음이다.", "Mathf": "수학 함수 모음이다. (Sqrt, Clamp, Lerp …)", "Time": "시간 정보를 담고 있다.", "Input": "키보드·마우스 입력을 읽는다.", "KeyCode": "키보드·마우스의 입력 코드 모음이다.", "Random": "무작위 값을 만든다.", "Vector2": "(x, y) 두 값으로 된 좌표이다.", "Vector3": "(x, y, z) 세 값으로 된 좌표이다.", "Color": "색상이다.", "GameObject": "씬 안의 오브젝트이다.", "Transform": "위치 정보 컴포넌트이다.", "Light": "빛 컴포넌트이다.", "Camera": "카메라 컴포넌트이다.", "Hero": "주인공 컴포넌트이다. (hp, maxHp …)", "Item": "아이템 컴포넌트이다. (qty 수량)", "Text": "UI 텍스트이다. 인스펙터 칸에 UI 요소를 끌어다 놓아 연결한다. (text)", "int": "정수 형식이다.", "float": "소수 형식이다. 값 뒤에 f를 붙인다. (0.3f)", "double": "소수 형식이다.", "long": "큰 정수 형식이다.", "bool": "true / false 형식이다.", "string": "글자 형식이다.", "var": "오른쪽 값을 보고 형식을 알아서 정한다."}, "ex": {"int": "int hp = 100;", "float": "float speed = 1.5f;", "bool": "bool ok = true;", "string": "string name = \"슬라임\";", "var": "var tr = GetComponent<Transform>();", "Vector2": "Vector2 p = new Vector2(3, 4);", "Color": "Color c = Color.red;"}, "types": ["int", "float", "double", "long", "bool", "string", "var", "Vector2", "Vector3", "Color", "GameObject", "Transform", "Light", "Camera", "Hero", "Item", "Text"], "comps": ["Transform", "Light", "Camera", "Hero", "Item"], "ev": [["Awake", "void Awake()\n{\n    |\n}"], ["Start", "void Start()\n{\n    |\n}"], ["OnClick", "public void OnClick()\n{\n    |\n}"]]});

/* ===================== 편집기 찾기 (Ctrl+F) · 같은 내용 밑줄 =====================
 *  edFind(ta, opt) — 코드 칸(textarea) 아래에 표시 층(<pre class="hl edmk">)을 하나 더 깔아서
 *    · 드래그로 고른 글자와 같은 내용이 코드의 다른 곳에 있으면 노란 밑줄
 *    · Ctrl+F 찾기 막대: 찾은 곳은 노란 상자, 지금 위치는 진한 상자 · Enter/Shift+Enter(F3/Shift+F3)로 다음/이전 · Esc 닫기 · Aa 대소문자 구분
 *  opt.host = 찾기 막대를 넣을 요소(기본: 코드 칸의 부모) · opt.state = 다시 그려도 유지할 상태 객체({open,q,cs})
 *  돌려주는 것: { paint() — 코드가 바뀐 뒤 다시 표시, open(q), close() } */
if(window.TI18N)TI18N.add({"찾기":["Find","検索","查找"],"찾을 코드":["Find in code","コードを検索","查找代码"],"결과 없음":["No results","結果なし","无结果"],"이전 (Shift+Enter)":["Previous (Shift+Enter)","前へ (Shift+Enter)","上一个 (Shift+Enter)"],"다음 (Enter)":["Next (Enter)","次へ (Enter)","下一个 (Enter)"],"대소문자 구분":["Match case","大文字と小文字を区別","区分大小写"],"닫기 (Esc)":["Close (Esc)","閉じる (Esc)","关闭 (Esc)"],"같은 내용 {n}곳":["{n} matches","同じ内容 {n} 箇所","相同内容 {n} 处"]});
function edFind(ta,opt){
  opt=opt||{};const doc=ta.ownerDocument,host=opt.host||ta.parentElement,S=opt.state||{open:false,q:'',cs:false};
  const hl=host.querySelector('pre.hl');
  const mk=doc.createElement('pre');mk.className='hl edmk';mk.setAttribute('aria-hidden','true');
  if(hl)hl.before(mk);else ta.before(mk);
  const cl=doc.createElement('div');cl.className='edcl';cl.setAttribute('aria-hidden','true');mk.before(cl);
  if(!doc.getElementById('edFindCss')){const st=doc.createElement('style');st.id='edFindCss';st.textContent=
    '.edcode pre.edmk{color:transparent!important;z-index:0}.edcode pre.edmk mark{color:transparent;background:none;border-radius:2px}'+
    '.edcode pre.edmk mark.ef-o{text-decoration:underline 2px rgba(246,205,42,.95);text-underline-offset:3px;background:rgba(246,205,42,.08)}'+
    '.edcode pre.edmk mark.ef-f{background:rgba(246,205,42,.26);box-shadow:0 0 0 1px rgba(246,205,42,.45)}.edcode pre.edmk mark.ef-c{background:rgba(255,150,40,.55);box-shadow:0 0 0 1px #ffb347}'+
    '.edfind{position:absolute;top:6px;right:14px;z-index:5;display:flex;align-items:center;gap:4px;padding:4px 5px 4px 8px;border-radius:9px;background:#24242b;border:1px solid rgba(255,255,255,.16);box-shadow:0 8px 22px rgba(0,0,0,.45);font:12px/1 var(--f-body,system-ui,sans-serif);color:#e6e6ea}'+
    '.edfind[hidden]{display:none}.edfind input{width:170px;height:24px;padding:0 7px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:#141418;color:#f2f2f5;font:12px var(--f-mono,monospace);outline:0}.edfind input:focus{border-color:#e9bd0c}'+
    '.edfind input.none{border-color:#ea6773}.edfind .n{min-width:52px;text-align:center;color:#9b9ba6;font-variant-numeric:tabular-nums}'+
    '.edfind button{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:#c9c9d1;font:600 12px var(--f-mono,monospace);cursor:pointer}.edfind button:hover{background:rgba(255,255,255,.1);color:#fff}.edfind button.on{background:rgba(233,189,12,.22);color:#ffdc55}'+
    '.edocc{color:#e9bd0c}'+
    '.edcode .edcl{position:absolute;left:0;right:0;z-index:0;pointer-events:none;background:rgba(255,255,255,.045);box-shadow:inset 2px 0 0 rgba(233,189,12,.55)}'+'.edcode pre.edmk .ig{box-shadow:inset 1px 0 0 rgba(255,255,255,.09)}.edcode pre.edmk .ig.on{box-shadow:inset 1px 0 0 rgba(233,189,12,.42)}'+'html[data-theme="light"] .edcode .edcl{background:rgba(0,0,0,.045)}html[data-theme="light"] .edcode pre.edmk .ig{box-shadow:inset 1px 0 0 rgba(0,0,0,.1)}'+
    'html[data-theme="light"] .edfind{background:#fff;border-color:rgba(0,0,0,.16);color:#222;box-shadow:0 8px 22px rgba(0,0,0,.15)}html[data-theme="light"] .edfind input{background:#f4f5f7;border-color:rgba(0,0,0,.16);color:#121217}html[data-theme="light"] .edfind button{color:#444}html[data-theme="light"] .edfind button:hover{background:rgba(0,0,0,.07)}'+
    'html[data-theme="light"] .edcode pre.edmk mark.ef-o{text-decoration-color:#c99a00;background:rgba(246,205,42,.12)}';
    doc.head.appendChild(st)}
  const bar=doc.createElement('div');bar.className='edfind';bar.hidden=true;bar.setAttribute('role','search');
  bar.innerHTML=`<input type="text" spellcheck="false" placeholder="${csedEsc(csedT('찾을 코드'))}" aria-label="${csedEsc(csedT('찾기'))}"><span class="n"></span><button type="button" data-f="cs" title="${csedEsc(csedT('대소문자 구분'))}">Aa</button><button type="button" data-f="prev" title="${csedEsc(csedT('이전 (Shift+Enter)'))}">↑</button><button type="button" data-f="next" title="${csedEsc(csedT('다음 (Enter)'))}">↓</button><button type="button" data-f="x" title="${csedEsc(csedT('닫기 (Esc)'))}">✕</button>`;
  host.appendChild(bar);
  const inp=bar.querySelector('input'),num=bar.querySelector('.n'),csb=bar.querySelector('[data-f="cs"]');
  let hits=[],cur=-1,occ=[],raf=0;
  const findAll=(v,q,cs)=>{const r=[];if(!q)return r;const V=cs?v:v.toLowerCase(),Q=cs?q:q.toLowerCase();let i=0;while(r.length<2000){const j=V.indexOf(Q,i);if(j<0)break;r.push(j);i=j+Math.max(1,Q.length)}return r};
  const lineH=()=>parseFloat(csedWin(ta).getComputedStyle(ta).lineHeight)||20;
  function render(){
    const v=ta.value,a=ta.selectionStart,b=ta.selectionEnd,sel=v.slice(a,b);
    /* 같은 내용 밑줄: 한 줄 · 공백만은 아님 · 200자 이하 */
    occ=[];
    if(b>a&&b-a<=200&&!/\n/.test(sel)&&sel.trim()){occ=findAll(v,sel,true).filter(i=>i!==a).map(i=>[i,i+sel.length])}
    const marks=[];
    if(S.open&&S.q)hits.forEach((i,k)=>marks.push([i,i+S.q.length,k===cur?'ef-c':'ef-f']));
    occ.forEach(([s,e])=>{if(!marks.some(m=>m[0]<e&&s<m[1]))marks.push([s,e,'ef-o'])});
    marks.sort((x,y)=>x[0]-y[0]);
    const lines=v.split('\n'),ind=lines.map(l=>/^\s*$/.test(l)?-1:/^ */.exec(l)[0].length);
    for(let k=0;k<ind.length;k++)if(ind[k]<0){let p=k-1;while(p>=0&&ind[p]<0)p--;let q=k+1;while(q<ind.length&&ind[q]<0)q++;ind[k]=-Math.min(p>=0?Math.abs(ind[p]):0,q<ind.length?Math.abs(ind[q]):0)-1}
    const curLn=v.slice(0,a).split('\n').length-1,curInd=Math.max(0,Math.abs(ind[curLn]<0?ind[curLn]+1:ind[curLn])),hiLv=Math.floor((curInd-1)/4);
    /* 커서가 있는 블록의 범위(같은 들여쓰기 줄이 이어지는 곳)만 안내선 강조 */
    let b0=curLn,b1=curLn;const lv=hiLv*4+4,deep=k=>{const d=ind[k]<0?-(ind[k]+1):ind[k];return d>=lv};
    if(hiLv>=0){while(b0>0&&deep(b0-1))b0--;while(b1<lines.length-1&&deep(b1+1))b1++}
    const starts=[];let off=0;lines.forEach(l=>{starts.push(off);off+=l.length+1});
    const guide=(k)=>{const d=ind[k]<0?-(ind[k]+1):ind[k],n=Math.floor(d/4);if(!n)return['',0];const sp=ind[k]<0;let h='';for(let g=0;g<n;g++)h+=`<span class="ig${g===hiLv&&k>=b0&&k<=b1?' on':''}">    </span>`;return[h,sp?0:n*4]};
    let out='',last=0,ln=0;
    const emit=(to)=>{while(last<to){if(last===starts[ln]){const[g,used]=guide(ln);out+=g;if(used){last+=used;continue}}const nl=v.indexOf('\n',last),end=nl<0||nl>=to?to:nl+1;out+=csedEsc(v.slice(last,end));if(nl>=0&&nl<to&&end===nl+1)ln++;last=end}};
    for(const[s,e,c]of marks){if(s<last)continue;emit(s);out+=`<mark class="${c}">${csedEsc(v.slice(s,e))}</mark>`;for(let x=s;x<e;x++)if(v[x]==='\n')ln++;last=e}
    emit(v.length);
    mk.innerHTML=out+'\n';
    const lh=lineH(),pt=parseFloat(csedWin(ta).getComputedStyle(ta).paddingTop)||0;cl.style.height=lh+'px';cl.style.top=(pt+curLn*lh-ta.scrollTop)+'px';cl.dataset.ln=curLn;
    sync();
    if(opt.onOcc)opt.onOcc(occ.length?occ.length+1:0);
  }
  const sync=()=>{mk.scrollTop=ta.scrollTop;mk.scrollLeft=ta.scrollLeft;const lh=lineH(),pt=parseFloat(csedWin(ta).getComputedStyle(ta).paddingTop)||0;cl.style.top=(pt+(+cl.dataset.ln||0)*lh-ta.scrollTop)+'px'};
  const later=()=>{if(raf)return;raf=csedWin(ta).requestAnimationFrame(()=>{raf=0;render()})};
  function search(keep){
    S.q=inp.value;S.cs=csb.classList.contains('on');inp.classList.toggle('none',!!S.q&&!hits.length);
    hits=findAll(ta.value,S.q,S.cs);
    if(!keep||cur>=hits.length){const p=ta.selectionStart;cur=hits.length?Math.max(0,hits.findIndex(i=>i>=p)):-1;if(cur<0&&hits.length)cur=0}
    inp.classList.toggle('none',!!S.q&&!hits.length);
    num.textContent=S.q?(hits.length?(cur+1)+' / '+hits.length:csedT('결과 없음')):'';
    render();
  }
  function go(d){
    if(!hits.length)return;cur=(cur+d+hits.length)%hits.length;num.textContent=(cur+1)+' / '+hits.length;
    const i=hits[cur];ta.setSelectionRange(i,i+S.q.length);
    const ln=ta.value.slice(0,i).split('\n').length-1,h=lineH(),top=ln*h;
    if(top<ta.scrollTop+h||top>ta.scrollTop+ta.clientHeight-2*h)ta.scrollTop=Math.max(0,top-ta.clientHeight/3);
    const col=i-ta.value.lastIndexOf('\n',i-1)-1,cw=h*.6*.92;if(col*cw<ta.scrollLeft||col*cw>ta.scrollLeft+ta.clientWidth-60)ta.scrollLeft=Math.max(0,col*cw-60);
    ta.dispatchEvent(new Event('scroll'));render();
  }
  function open(q){
    S.open=true;bar.hidden=false;
    if(q!=null&&q!=='')inp.value=q;else if(S.q)inp.value=S.q;
    inp.focus();inp.select();search(false);if(hits.length)go(0);
  }
  function close(){S.open=false;bar.hidden=true;hits=[];cur=-1;render();ta.focus({preventScroll:true})}
  csb.classList.toggle('on',!!S.cs);
  inp.addEventListener('input',()=>{search(false);if(hits.length)go(0)});
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key==='F3'){e.preventDefault();go(e.shiftKey?-1:1)}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
    else if((e.ctrlKey||e.metaKey)&&(e.key==='f'||e.key==='F')){e.preventDefault();inp.select()}
  });
  bar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;const f=b.dataset.f;
    if(f==='x')close();else if(f==='cs'){b.classList.toggle('on');search(false);if(hits.length)go(0)}else go(f==='prev'?-1:1)});
  ta.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='f'||e.key==='F'||e.code==='KeyF')){e.preventDefault();e.stopPropagation();const s=ta.value.slice(ta.selectionStart,ta.selectionEnd);open(s&&!/\n/.test(s)?s:null);return}
    if(e.key==='F3'&&S.open){e.preventDefault();go(e.shiftKey?-1:1);return}
    if(e.key==='Escape'&&S.open){e.preventDefault();e.stopPropagation();close()}
  });
  ta.addEventListener('scroll',sync);
  ta.addEventListener('input',()=>{if(S.open&&S.q)search(true);else later()});
  ['select','mouseup','keyup'].forEach(ev=>ta.addEventListener(ev,later));
  const sc=()=>{if(doc.activeElement===ta)later()};doc.addEventListener('selectionchange',sc);
  if(S.open){bar.hidden=false;inp.value=S.q||'';search(false)}else render();
  return{paint:()=>{if(S.open&&S.q)search(true);else render()},open,close,destroy:()=>doc.removeEventListener('selectionchange',sc)};
}

/* ===================== Tab 들여쓰기: 다음 탭 칸(4의 배수)까지 =====================
 *  edTabStop(ta, shift) — Tab: 커서 앞 칸 수를 4의 배수로 맞춰 채움(2칸 → 4칸, 5칸 → 8칸)
 *                         여러 줄 선택: 줄마다 앞 공백을 다음 4의 배수로
 *  Shift+Tab: 앞 공백을 이전 4의 배수로(6칸 → 4칸, 4칸 → 0칸). 바꿨으면 input 이벤트를 보내고 true */
function edTabStop(ta,shift,W){
  W=W||4;const v=ta.value,a=ta.selectionStart,b=ta.selectionEnd,ls=v.lastIndexOf('\n',a-1)+1;
  const up=n=>n+(W-n%W),down=n=>n%W?n-n%W:Math.max(0,n-W);
  if(a!==b&&v.slice(a,b).includes('\n')){
    const end=v[b-1]==='\n'?b-1:b,blk=v.slice(ls,end).split('\n');
    const out=blk.map(l=>{if(!l.trim())return l;const n=/^ */.exec(l)[0].length,m=shift?down(n):up(n);return ' '.repeat(m)+l.slice(n)}).join('\n');
    if(out===v.slice(ls,end))return true;
    ta.setRangeText(out,ls,end,'select');ta.setSelectionRange(ls,ls+out.length);ta.dispatchEvent(new Event('input'));return true;
  }
  if(shift){const n=/^ */.exec(v.slice(ls))[0].length;if(!n)return true;const m=down(n);ta.setRangeText('',ls+m,ls+n,'preserve');const c=Math.max(ls+m,a-(n-m));ta.setSelectionRange(c,c);ta.dispatchEvent(new Event('input'));return true}
  const col=a-ls,add=W-col%W;ta.setRangeText(' '.repeat(add),a,b,'end');ta.dispatchEvent(new Event('input'));return true;
}

/* ============================================================================
 *  도움 기능 (2026-11-16) — 엔진 · 학습 화면 공용
 *   ① 이름 번역기 NAMETR : 이름 입력칸 우클릭 → 「번역기」 → 작은 번역기 창 → 변환 → 적용
 *        · 한글(일본어·중국어도)로 쓴 이름을 영어 이름으로 바꿈 (스크립트 이름 = PlayerMove, 오브젝트 이름 = Player Move …)
 *        · 게임 낱말은 내장 사전(주인공 → Hero)으로 바로, 나머지는 인터넷 번역(Google → MyMemory), 안 되면 사전 + 로마자
 *        · Shift+우클릭은 브라우저 기본 메뉴
 *   ② 스크립트 도움말 EDHELP : 편집기의 빈 줄에 help(또는 도움말)를 치거나 F1 → 작은 도움말 창
 *        · 검색칸에 치는 대로 목록이 바로 줄어듦 (제목 · 설명 · 낱말 · 코드 · 초성 ㅋㅍㄴㅌ)
 *        · 항목을 누르면 예시 코드 미리 보기 · Tab / Enter / 「적용」 / 더블클릭 = 커서 자리에 코드 넣기 (들여쓰기 맞춤)
 * ========================================================================== */
const ASSIST_CSS_ID='csAssistCss';
function assistCss(d){
  if(!d||d.getElementById(ASSIST_CSS_ID))return;
  const st=d.createElement('style');st.id=ASSIST_CSS_ID;st.textContent=
  /* 공통 떠 있는 작은 창 */
  '.aswin{position:fixed;z-index:2147482990;display:flex;flex-direction:column;background:#202027;color:#ececf1;border:1px solid rgba(255,255,255,.14);border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.55);font:12.5px/1.45 var(--f-body,"IBM Plex Sans KR","Malgun Gothic",system-ui,sans-serif);overflow:hidden}'+
  '.aswin .ashd{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;background:rgba(255,255,255,.045);border-bottom:1px solid rgba(255,255,255,.08);cursor:move;user-select:none;touch-action:none}'+
  '.aswin .ashd b{font-size:12.5px;font-weight:700}.aswin .ashd .asic{display:grid;place-items:center;width:20px;height:20px;border-radius:6px;background:#e9bd0c;color:#1a1400;font:700 11px var(--f-mono,monospace)}'+
  '.aswin .ashd small{color:#9b9ba6;font-size:11px}.aswin .ashd .sp{flex:1}'+
  '.aswin .asx{width:24px;height:24px;border:0;border-radius:6px;background:transparent;color:#b9b9c3;cursor:pointer;font:13px/1 system-ui}.aswin .asx:hover{background:rgba(255,255,255,.1);color:#fff}'+
  '.aswin input[type=text],.aswin input[type=search]{width:100%;height:30px;padding:0 9px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#131317;color:#f4f4f7;font:13px var(--f-body,system-ui);outline:0}'+
  '.aswin input:focus{border-color:#e9bd0c;box-shadow:0 0 0 2px rgba(233,189,12,.18)}'+
  '.aswin .asbtn{height:28px;padding:0 12px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#ececf1;font:600 12px var(--f-body,system-ui);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}'+
  '.aswin .asbtn:hover{background:rgba(255,255,255,.15)}.aswin .asbtn.pri{background:#e9bd0c;border-color:#e9bd0c;color:#1a1400}.aswin .asbtn.pri:hover{filter:brightness(1.08)}.aswin .asbtn:disabled{opacity:.45;cursor:default}'+
  '.aswin kbd{font:600 10px var(--f-mono,monospace);padding:1px 4px;border-radius:4px;background:rgba(0,0,0,.22);border:1px solid rgba(0,0,0,.18)}'+
  /* 우클릭 작은 메뉴 */
  '.asmenu{position:fixed;z-index:2147482995;min-width:210px;padding:4px;background:#24242b;border:1px solid rgba(255,255,255,.14);border-radius:9px;box-shadow:0 12px 30px rgba(0,0,0,.5);font:12.5px var(--f-body,system-ui,sans-serif);color:#ececf1}'+
  '.asmenu button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}'+
  '.asmenu button:hover,.asmenu button:focus-visible{background:#e9bd0c;color:#1a1400;outline:0}.asmenu button:hover small{color:#4a3a00}'+
  '.asmenu .asic{display:grid;place-items:center;width:18px;height:18px;border-radius:5px;background:rgba(233,189,12,.2);color:#e9bd0c;font:700 10px var(--f-mono,monospace)}.asmenu button:hover .asic{background:rgba(0,0,0,.15);color:#1a1400}'+
  '.asmenu small{margin-left:auto;color:#8d8d98;font-size:10.5px}.asmenu .ashint{padding:5px 10px 4px;color:#8d8d98;font-size:10.5px;border-top:1px solid rgba(255,255,255,.07);margin-top:3px}'+
  /* 번역기 */
  '.ntwin{width:340px}.ntwin .ntb{display:flex;flex-direction:column;gap:9px;padding:11px 12px 12px}'+
  '.ntwin .ntrow{display:flex;gap:6px;align-items:center}.ntwin .ntl{font-size:11px;color:#9b9ba6;margin-bottom:-4px}'+
  '.ntwin .ntst{display:flex;flex-wrap:wrap;gap:4px}.ntwin .ntst button{height:24px;padding:0 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#c9c9d1;font:11.5px var(--f-mono,monospace);cursor:pointer}'+
  '.ntwin .ntst button.on{background:rgba(233,189,12,.18);border-color:#e9bd0c;color:#ffe27a}.ntwin .ntst button:hover{border-color:rgba(255,255,255,.3)}'+
  '.ntwin .ntout{font:600 14px var(--f-mono,monospace)!important;color:#ffe27a!important}'+
  '.ntwin .ntalt{display:flex;flex-wrap:wrap;gap:4px;min-height:0}.ntwin .ntalt:empty{display:none}.ntwin .ntalt button{height:22px;padding:0 7px;border-radius:11px;border:1px dashed rgba(255,255,255,.22);background:transparent;color:#c9c9d1;font:11px var(--f-mono,monospace);cursor:pointer}.ntwin .ntalt button:hover{border-style:solid;border-color:#e9bd0c;color:#ffe27a}'+
  '.ntwin .ntmsg{font-size:11px;color:#9b9ba6;min-height:15px}.ntwin .ntmsg.bad{color:#ff8a96}.ntwin .ntmsg.ok{color:#7fdca4}'+
  '.ntwin .ntfoot{display:flex;gap:6px;justify-content:flex-end}'+
  '@keyframes asSpin{to{transform:rotate(360deg)}}.ntwin .spin{display:inline-block;width:10px;height:10px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:asSpin .7s linear infinite;vertical-align:-1px;margin-right:4px}'+
  /* 스크립트 도움말 */
  '.ehwin{width:430px;height:470px;min-width:320px;min-height:300px;resize:both}'+
  '.ehwin .ehq{padding:9px 10px 7px;display:flex;gap:6px;align-items:center}.ehwin .ehq input{flex:1}'+
  '.ehwin .ehcats{display:flex;gap:4px;padding:0 10px 7px;overflow-x:auto;scrollbar-width:none}.ehwin .ehcats::-webkit-scrollbar{display:none}'+
  '.ehwin .ehcats button{flex:none;height:22px;padding:0 8px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#b9b9c3;font:11px var(--f-body,system-ui);cursor:pointer}.ehwin .ehcats button.on{background:#e9bd0c;border-color:#e9bd0c;color:#1a1400;font-weight:700}'+
  '.ehwin .ehlist{flex:1 1 45%;min-height:90px;overflow:auto;padding:0 6px 6px;border-bottom:1px solid rgba(255,255,255,.08)}'+
  '.ehwin .ehi{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}'+
  '.ehwin .ehi:hover{background:rgba(255,255,255,.06)}.ehwin .ehi.on{background:rgba(233,189,12,.16);box-shadow:inset 2px 0 0 #e9bd0c}'+
  '.ehwin .ehi .c{flex:none;min-width:44px;font-size:10px;color:#9b9ba6;text-align:center;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.06)}'+
  '.ehwin .ehi .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ehwin .ehi .t em{font-style:normal;color:#ffe27a;background:rgba(233,189,12,.16);border-radius:3px}'+
  '.ehwin .ehi .k{flex:none;font:10.5px var(--f-mono,monospace);color:#7fb9ff;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
  '.ehwin .ehnone{padding:22px 10px;text-align:center;color:#8d8d98}'+
  '.ehwin .ehprev{flex:1 1 55%;min-height:110px;display:flex;flex-direction:column;overflow:hidden}'+
  '.ehwin .ehd{padding:8px 12px 6px;color:#d4d4dc;font-size:12px}.ehwin .ehd b{color:#fff}.ehwin .ehd .w{display:inline-block;margin-left:6px;font-size:10.5px;color:#7fdca4;border:1px solid rgba(127,220,164,.35);border-radius:5px;padding:0 5px}'+
  '.ehwin pre.ehcode{flex:1;margin:0 10px;padding:9px 10px;overflow:auto;background:#141418;border:1px solid rgba(255,255,255,.08);border-radius:8px;font:12px/1.55 var(--f-mono,monospace);color:#e6e6ea;white-space:pre;tab-size:4}'+
  '.ehwin .ehfoot{display:flex;align-items:center;gap:8px;padding:8px 10px}.ehwin .ehfoot .h{flex:1;font-size:10.5px;color:#8d8d98}'+
  /* 밝은 테마 */
  'html[data-theme="light"] .aswin,html[data-theme="light"] .asmenu{background:#fff;color:#1d1d22;border-color:rgba(0,0,0,.14);box-shadow:0 14px 36px rgba(0,0,0,.18)}'+
  'html[data-theme="light"] .aswin .ashd{background:#f4f5f7;border-color:rgba(0,0,0,.08)}html[data-theme="light"] .aswin input[type=text],html[data-theme="light"] .aswin input[type=search]{background:#f4f5f7;border-color:rgba(0,0,0,.16);color:#121217}'+
  'html[data-theme="light"] .aswin .asbtn{background:#f0f1f4;border-color:rgba(0,0,0,.14);color:#222}html[data-theme="light"] .aswin .asbtn.pri{background:#e9bd0c;color:#1a1400}'+
  'html[data-theme="light"] .ntwin .ntout{color:#8a6a00!important}html[data-theme="light"] .ntwin .ntst button{color:#444;border-color:rgba(0,0,0,.15)}html[data-theme="light"] .ntwin .ntst button.on{color:#6b5200;background:rgba(233,189,12,.22)}'+
  'html[data-theme="light"] .ntwin .ntalt button{color:#444;border-color:rgba(0,0,0,.25)}html[data-theme="light"] .ehwin .ehcats button{color:#444;border-color:rgba(0,0,0,.15)}'+
  'html[data-theme="light"] .ehwin .ehi:hover{background:rgba(0,0,0,.05)}html[data-theme="light"] .ehwin .ehi.on{background:rgba(233,189,12,.2)}html[data-theme="light"] .ehwin .ehi .t em{color:#6b5200}'+
  'html[data-theme="light"] .ehwin .ehd{color:#333}html[data-theme="light"] .ehwin .ehd b{color:#000}html[data-theme="light"] .ehwin .ehi .k{color:#2a6fd6}html[data-theme="light"] .asmenu button:hover{color:#1a1400}'+
  'html[data-theme="light"] .ehwin pre.ehcode{background:#1b1b21;color:#e6e6ea}'+
  '@media (prefers-reduced-motion:reduce){.ntwin .spin{animation:none}}';
  d.head.appendChild(st);
}
/* 창 끌기 (제목 줄) · 화면 안으로 */
function assistPlace(el,x,y){
  const w=el.ownerDocument.defaultView||window,W=el.offsetWidth,H=el.offsetHeight;
  el.style.left=Math.round(clamp(x,6,Math.max(6,w.innerWidth-W-6)))+'px';
  el.style.top=Math.round(clamp(y,6,Math.max(6,w.innerHeight-H-6)))+'px';
}
function assistDrag(el,head){
  head.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button,input'))return;
    e.preventDefault();const r=el.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
    try{head.setPointerCapture(e.pointerId)}catch(_){}
    const mv=ev=>assistPlace(el,ev.clientX-dx,ev.clientY-dy);
    const up=()=>{head.removeEventListener('pointermove',mv);head.removeEventListener('pointerup',up);head.removeEventListener('pointercancel',up)};
    head.addEventListener('pointermove',mv);head.addEventListener('pointerup',up);head.addEventListener('pointercancel',up);
  });
}
/* 값을 넣고 화면 쪽 이벤트(input · change)를 보냄 */
function assistSetValue(inp,v){
  const P=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp),'value');
  if(P&&P.set)P.set.call(inp,v);else inp.value=v;
  inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
}

/* =========================== ① 이름 번역기 =========================== */
/* 게임에서 자주 쓰는 낱말 (긴 낱말부터 맞춤 · 엔진 용어에 맞춤: 주인공 = Hero) */
const NT_DICT={
 '주인공':'Hero','플레이어':'Player','캐릭터':'Character','적':'Enemy','몬스터':'Monster','보스':'Boss','슬라임':'Slime','엔피씨':'Npc','상인':'Merchant','마을사람':'Villager','주민':'Villager',
 '이동':'Move','움직임':'Movement','컨트롤러':'Controller','조작':'Control','공격':'Attack','점프':'Jump','달리기':'Run','걷기':'Walk','대시':'Dash','방어':'Defend','회피':'Dodge',
 '체력바':'HealthBar','체력':'Health','생명':'Life','에이치피':'Hp','데미지':'Damage','피해':'Damage','회복':'Heal','부활':'Respawn','죽음':'Death','쓰러짐':'Death','사망':'Death',
 '아이템':'Item','열쇠':'Key','보물상자':'TreasureChest','상자':'Chest','보물':'Treasure','동전':'Coin','코인':'Coin','돈':'Money','골드':'Gold','보석':'Gem','물약':'Potion','포션':'Potion','약초':'Herb',
 '점수':'Score','최고점수':'HighScore','시간':'Time','타이머':'Timer','카운트다운':'Countdown','카메라':'Camera','배경음악':'Bgm','배경':'Background','음악':'Music','효과음':'Sfx','소리':'Sound','사운드':'Sound','소리크기':'Volume','볼륨':'Volume',
 '버튼':'Button','메뉴':'Menu','시작화면':'TitleScreen','시작':'Start','종료':'Quit','끝':'End','게임오버':'GameOver','게임':'Game','매니저':'Manager','관리자':'Manager','관리':'Manager',
 '대화창':'DialogBox','대화':'Dialog','텍스트':'Text','글자':'Text','문구':'Label','이름':'Name','화면':'Screen','창':'Window','패널':'Panel','바':'Bar','표시':'Display','아이콘':'Icon','그림':'Image','이미지':'Image',
 '총알':'Bullet','화살':'Arrow','무기':'Weapon','칼':'Sword','검':'Sword','활':'Bow','방패':'Shield','마법':'Magic','스킬':'Skill','불꽃':'Flame','불':'Fire','물':'Water','바람':'Wind','얼음':'Ice','번개':'Lightning',
 '땅':'Ground','벽':'Wall','바닥':'Floor','함정':'Trap','가시':'Spike','발판':'Platform','사다리':'Ladder','포탈':'Portal','출구':'Exit','입구':'Entrance','문':'Door',
 '숲':'Forest','동굴':'Cave','성':'Castle','집':'House','마을':'Village','나무':'Tree','돌':'Stone','바위':'Rock','풀':'Grass','꽃':'Flower','하늘':'Sky','구름':'Cloud','강':'River','바다':'Sea','산':'Mountain','다리':'Bridge','길':'Road',
 '조명':'Light','빛':'Light','그림자':'Shadow','어둠':'Darkness','손전등':'Flashlight',
 '레벨업':'LevelUp','레벨':'Level','단계':'Stage','스테이지':'Stage','씬':'Scene','장면':'Scene','저장':'Save','불러오기':'Load','설정':'Settings','일시정지':'Pause','다시시작':'Restart','재시작':'Restart','승리':'Victory','패배':'Defeat','클리어':'Clear',
 '생성기':'Spawner','생성':'Spawn','스폰':'Spawn','소환':'Summon','따라가기':'Follow','추적':'Chase','순찰':'Patrol','도망':'Flee','회전':'Rotate','흔들림':'Shake','깜빡임':'Blink','사라짐':'Disappear','나타남':'Appear',
 '열기':'Open','닫기':'Close','열림':'Open','닫힘':'Closed','상태':'State','정보':'Info','인벤토리':'Inventory','가방':'Bag','소지품':'Inventory','상점':'Shop','가게':'Shop','퀘스트':'Quest','임무':'Mission','목표':'Goal',
 '미니맵':'Minimap','지도':'Map','맵':'Map','타일맵':'Tilemap','타일':'Tile','애니메이션':'Animation','효과':'Effect','파티클':'Particle','폭발':'Explosion','충돌':'Collision','감지':'Detector','센서':'Sensor','트리거':'Trigger','이벤트':'Event',
 '스위치':'Switch','레버':'Lever','발사기':'Launcher','발사':'Shoot','대포':'Cannon','속도':'Speed','빠른':'Fast','느린':'Slow','큰':'Big','작은':'Small','새로운':'New','첫번째':'First','두번째':'Second','세번째':'Third','마지막':'Last','메인':'Main',
 '빨간':'Red','빨강':'Red','파란':'Blue','파랑':'Blue','초록':'Green','노란':'Yellow','노랑':'Yellow','검은':'Black','검정':'Black','흰':'White','하얀':'White',
 '고양이':'Cat','강아지':'Dog','물고기':'Fish','용':'Dragon','유령':'Ghost','해골':'Skeleton','좀비':'Zombie','기사':'Knight','마법사':'Wizard','왕':'King','공주':'Princess','친구':'Friend','펫':'Pet','새':'Bird','박쥐':'Bat','거미':'Spider','늑대':'Wolf',
 '위':'Up','아래':'Down','왼쪽':'Left','오른쪽':'Right','앞':'Front','뒤':'Back','가운데':'Center',
 '그룹':'Group','오브젝트':'Object','스크립트':'Script','데이터':'Data','목록':'List','리스트':'List','키':'Key','입력':'Input','마우스':'Mouse','클릭':'Click','터치':'Touch','확인':'Confirm','취소':'Cancel',
 '도움말':'Help','튜토리얼':'Tutorial','안내':'Guide','경고':'Warning','알림':'Notice','메시지':'Message','로고':'Logo','제목':'Title','타이틀':'Title','크레딧':'Credits','순위':'Rank','랭킹':'Ranking','기록':'Record',
 '경험치':'Exp','공격력':'AttackPower','방어력':'Defense','마나':'Mana','에너지':'Energy','스태미나':'Stamina','배고픔':'Hunger','날씨':'Weather','비':'Rain','눈':'Snow','낮':'Day','밤':'Night','하루':'Day'
};
const NT_PART=new Set(['의','을','를','은','는','이','가','에','에서','로','으로','와','과','도','만','하기','하는','하다','기','용','한','할','된','되는']);
const NT_MAXK=Math.max(...Object.keys(NT_DICT).map(k=>k.length));
/* 한글 → 로마자 (사전에 없는 낱말) */
function ntRoman(s){
  const C=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'],
        V=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'],
        F=['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
  let o='';for(const ch of s){const c=ch.charCodeAt(0)-0xAC00;if(c<0||c>11171){o+=ch;continue}o+=C[(c/588)|0]+V[((c%588)/28)|0]+F[c%28]}
  return o;
}
/* 사전으로 낱말 나누기 → {words:[…], sure: 모든 한글 낱말을 사전에서 찾았는지} */
function ntDict(src){
  const words=[];let sure=true;
  String(src).split(/[\s_\-·.,/]+/).filter(Boolean).forEach(tok=>{
    if(!/[가-힣]/.test(tok)){words.push(...tok.split(/[^A-Za-z0-9]+/).filter(Boolean));return}
    let i=0,unk='';
    const flush=()=>{if(!unk)return;if(!NT_PART.has(unk)){words.push(ntRoman(unk));sure=false}unk=''};
    while(i<tok.length){
      if(!/[가-힣]/.test(tok[i])){flush();let j=i;while(j<tok.length&&!/[가-힣]/.test(tok[j]))j++;words.push(...tok.slice(i,j).split(/[^A-Za-z0-9]+/).filter(Boolean));i=j;continue}
      let hit=null;for(let L=Math.min(NT_MAXK,tok.length-i);L>0;L--){const k=tok.slice(i,i+L);if(NT_DICT[k]){hit=k;break}}
      if(hit){flush();words.push(NT_DICT[hit]);i+=hit.length}else{unk+=tok[i];i++}
    }
    flush();
  });
  return{words,sure:sure&&words.length>0};
}
/* 영어 낱말 → 이름 꼴 */
const NT_STYLES=[['pascal','PlayerMove'],['camel','playerMove'],['title','Player Move'],['snake','player_move']];
function ntWords(text){
  let w=String(text||'').replace(/[’']/g,'').split(/[^A-Za-z0-9]+/).filter(Boolean);
  /* PascalCase로 붙어 온 낱말은 나눔: PlayerMove → Player Move */
  w=w.flatMap(x=>x.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2').split(' '));
  if(w.length>1&&/^(the|a|an)$/i.test(w[0]))w.shift();
  return w;
}
function ntFormat(text,style,code){
  const w=ntWords(text);if(!w.length)return'';
  const cap=x=>/^[A-Z0-9]{2,4}$/.test(x)?x:x.charAt(0).toUpperCase()+x.slice(1).toLowerCase();
  let out;
  if(style==='camel')out=w.map((x,i)=>i?cap(x):x.toLowerCase()).join('');
  else if(style==='snake')out=w.map(x=>x.toLowerCase()).join('_');
  else if(style==='title')out=w.map(cap).join(' ');
  else out=w.map(cap).join('');
  if(code){out=out.replace(/\s+/g,'');if(/^\d/.test(out))out='_'+out}
  return out;
}
/* 인터넷 번역 (Google → MyMemory) · 4.5초 안에 답이 없으면 다음으로 */
async function ntFetch(url,pick){
  const ac=typeof AbortController==='function'?new AbortController():null,t=setTimeout(()=>{try{ac&&ac.abort()}catch(_){}},4500);
  try{const r=await fetch(url,ac?{signal:ac.signal}:{});if(!r.ok)throw new Error('http '+r.status);const v=pick(await r.json());if(!v||!String(v).trim())throw new Error('empty');return String(v)}
  finally{clearTimeout(t)}
}
async function ntOnline(src){
  const q=encodeURIComponent(src);
  try{return await ntFetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q='+q,j=>(j&&j[0]||[]).map(x=>x&&x[0]||'').join(''))}catch(e){}
  const lp=/[가-힣]/.test(src)?'ko':/[぀-ヿ]/.test(src)?'ja':/[一-鿿]/.test(src)?'zh':'ko';
  return await ntFetch('https://api.mymemory.translated.net/get?q='+q+'&langpair='+lp+'|en',j=>{const v=j&&j.responseData&&j.responseData.translatedText;return v&&!/MYMEMORY WARNING|INVALID/i.test(v)?v:''});
}
const NT_KEY='thaniya.nametr.v1';
const NT={win:null,target:null,menu:null,kind:'name',seq:0,src:''};
const ntPrefs=()=>{try{return JSON.parse(localStorage.getItem(NT_KEY))||{}}catch(e){return{}}};
const ntSavePref=(k,v)=>{const p=ntPrefs();p[k]=v;try{localStorage.setItem(NT_KEY,JSON.stringify(p))}catch(e){}};
/* 이 입력칸이 「이름」 칸인지 */
function ntIsName(el){
  if(!el||el.tagName!=='INPUT')return false;
  const ty=(el.getAttribute('type')||'text').toLowerCase();if(ty!=='text')return false;
  if(el.readOnly||el.disabled||el.closest('.aswin'))return false;
  if(el.dataset.nameInput==='0'||el.closest('[data-no-nametr]'))return false;
  if(el.dataset.nameInput)return true;
  if(el.classList.contains('rn')||el.classList.contains('iname'))return true;
  if(/name$/i.test(el.id||''))return true;
  for(const k in el.dataset)if(el.dataset[k]==='name')return true;
  if(/이름|\bname\b/i.test((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('placeholder')||'')))return true;
  const fr=el.closest('.fr,.field');if(fr){const lb=fr.querySelector('label');if(lb&&!lb.contains(el)&&/이름|\bname\b/i.test(lb.textContent))return true}
  const lb=el.closest('label');if(lb&&/이름|\bname\b/i.test(lb.textContent))return true;
  return false;
}
/* 코드 이름(스크립트 · 클래스 · 변수) 칸이면 띄어쓰기 없는 꼴만 */
function ntIsCode(el){
  if(el.dataset.nameInput==='code'||el.id==='nsName')return true;
  const fr=el.closest('.fr,.field,label'),t=((fr&&fr.textContent)||'')+' '+(el.getAttribute('aria-label')||'');
  return /스크립트|클래스|변수|script|class|variable/i.test(t);
}
function ntHideMenu(){if(NT.menu){NT.menu.remove();NT.menu=null}NT.menuFor=null}
function ntMenu(inp,x,y){
  const d=inp.ownerDocument;assistCss(d);ntHideMenu();
  const m=d.createElement('div');m.className='asmenu';m.setAttribute('role','menu');
  m.innerHTML=`<button type="button" role="menuitem" data-a="tr"><span class="asic">A</span>${csedEsc(csedT('번역기'))}<small>${csedEsc(csedT('영어 이름 만들기'))}</small></button>`+
    `<button type="button" role="menuitem" data-a="all"><span class="asic">⌘</span>${csedEsc(csedT('모두 선택'))}</button>`+
    `<div class="ashint">${csedEsc(csedT('Shift+우클릭 = 브라우저 기본 메뉴'))}</div>`;
  d.body.append(m);assistPlace(m,x,y);NT.menu=m;
  m.addEventListener('mousedown',e=>e.preventDefault());   /* 이름 칸의 포커스를 지킴 (인라인 이름 바꾸기가 닫히지 않게) */
  m.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;ntHideMenu();
    if(b.dataset.a==='tr')NAMETR.open(inp);else{inp.focus();inp.select()}});
  const off=e=>{if(!m.contains(e.target)){ntHideMenu();d.removeEventListener('pointerdown',off,true);d.removeEventListener('keydown',kd,true)}};
  const kd=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ntHideMenu();d.removeEventListener('pointerdown',off,true);d.removeEventListener('keydown',kd,true)}};
  setTimeout(()=>{d.addEventListener('pointerdown',off,true);d.addEventListener('keydown',kd,true)},0);
  NT.menuFor=inp;   /* 메뉴에 포커스를 옮기지 않음 → 이름 칸이 blur 되지 않음 (인라인 이름 바꾸기 유지) */
}
const NAMETR={
  /* 다른 문서(엔진 밖으로 꺼낸 창)에도 우클릭 연결 */
  attach(d){
    if(!d||d.__ntOn)return;d.__ntOn=true;
    d.addEventListener('contextmenu',e=>{
      const inp=e.target;if(e.shiftKey||!ntIsName(inp))return;
      e.preventDefault();e.stopPropagation();ntMenu(inp,e.clientX+2,e.clientY+2);
    },true);
  },
  /* 번역기 창이 이 입력칸을 붙잡고 있는지 (인라인 이름 바꾸기는 blur 때 확정하므로 이때는 확정하지 않음) */
  holds(el){return !!((NT.win&&NT.win.isConnected&&NT.target===el)||(NT.menu&&NT.menuFor===el))},
  close(back){
    const w=NT.win,t=NT.target;NT.win=null;NT.target=null;NT.seq++;if(w)w.remove();
    if(back&&t&&t.isConnected){try{t.focus({preventScroll:true})}catch(_){}}
  },
  open(inp){
    const d=inp.ownerDocument;assistCss(d);this.close(false);
    NT.target=inp;NT.kind=ntIsCode(inp)?'code':'name';
    const pr=ntPrefs(),styles=NT.kind==='code'?NT_STYLES.filter(s=>s[0]!=='title'):NT_STYLES;
    let style=pr[NT.kind]||(NT.kind==='code'?'pascal':'title');if(!styles.some(s=>s[0]===style))style=styles[0][0];
    const cur=inp.value||'',pre=/[^\x00-\x7f]/.test(cur)?cur:'';
    const w=d.createElement('div');w.className='aswin ntwin';w.setAttribute('role','dialog');w.setAttribute('aria-label',csedT('이름 번역기'));
    w.innerHTML=`<div class="ashd"><span class="asic">A</span><b>${csedEsc(csedT('이름 번역기'))}</b><small>${csedEsc(NT.kind==='code'?csedT('코드 이름'):csedT('오브젝트 이름'))}</small><span class="sp"></span><button type="button" class="asx" data-a="x" aria-label="${csedEsc(csedT('닫기'))}">✕</button></div>
      <div class="ntb">
        <div class="ntl">${csedEsc(csedT('바꿀 말 (한글 등)'))}</div>
        <div class="ntrow"><input type="text" class="ntin" data-i18n-skip spellcheck="false" autocomplete="off" placeholder="${csedEsc(csedT('예: 플레이어 이동, 보물 상자'))}" value="${csedEsc(pre)}"><button type="button" class="asbtn pri" data-a="go">${csedEsc(csedT('변환'))}</button></div>
        <div class="ntst" role="radiogroup" aria-label="${csedEsc(csedT('이름 모양'))}">${styles.map(s=>`<button type="button" role="radio" data-st="${s[0]}" aria-checked="${s[0]===style}" class="${s[0]===style?'on':''}">${s[1]}</button>`).join('')}</div>
        <div class="ntl">${csedEsc(csedT('영어 이름'))}</div>
        <input type="text" class="ntout" data-i18n-skip spellcheck="false" autocomplete="off" placeholder="—">
        <div class="ntalt"></div>
        <div class="ntmsg" aria-live="polite"></div>
        <div class="ntfoot"><button type="button" class="asbtn" data-a="copy">${csedEsc(csedT('복사'))}</button><button type="button" class="asbtn pri" data-a="apply" disabled>${csedEsc(csedT('적용'))} <kbd>Enter</kbd></button></div>
      </div>`;
    d.body.append(w);NT.win=w;
    const r=inp.getBoundingClientRect();assistPlace(w,r.left,r.bottom+6);
    if(r.bottom+6+w.offsetHeight>(d.defaultView||window).innerHeight-6)assistPlace(w,r.left,r.top-w.offsetHeight-6);
    assistDrag(w,w.querySelector('.ashd'));
    const src=w.querySelector('.ntin'),out=w.querySelector('.ntout'),msg=w.querySelector('.ntmsg'),alt=w.querySelector('.ntalt'),ap=w.querySelector('[data-a="apply"]');
    let raw=[];   /* 후보: [영어 원문, 출처] — 모양을 바꾸면 다시 꾸밈 */
    const say=(t,c)=>{msg.className='ntmsg'+(c?' '+c:'');msg.innerHTML=t};
    const fmt=t=>ntFormat(t,style,NT.kind==='code');
    const show=()=>{
      const seen=new Set(),list=raw.map(([t,s])=>[fmt(t),s]).filter(([f])=>f&&!seen.has(f)&&seen.add(f));
      if(list.length&&!out.dataset.touched)out.value=list[0][0];
      alt.innerHTML=list.filter(([f])=>f!==out.value).map(([f,s])=>`<button type="button" data-alt="${csedEsc(f)}" title="${csedEsc(s)}">${csedEsc(f)}</button>`).join('');
      ap.disabled=!out.value.trim();
    };
    const go=async()=>{
      const s=src.value.trim();if(!s){say(csedEsc(csedT('바꿀 말을 입력하세요')),'bad');src.focus();return}
      const my=++NT.seq;raw=[];delete out.dataset.touched;out.value='';alt.innerHTML='';ap.disabled=true;
      if(!/[^\x00-\x7f]/.test(s)){raw=[[s,csedT('입력한 그대로')]];show();say(csedEsc(csedT('영어 낱말을 이름 모양으로 맞췄어요')),'ok');return}
      const D=ntDict(s),dict=D.words.join(' ');
      if(D.sure){raw=[[dict,csedT('내장 사전')]];show();say(csedEsc(csedT('✓ 게임 낱말 사전으로 바꿨어요 · 다른 후보를 찾는 중…')),'ok')}
      else say('<span class="spin"></span>'+csedEsc(csedT('번역하는 중…')));
      let net='';try{net=await ntOnline(s)}catch(e){net=''}
      if(my!==NT.seq||!NT.win)return;
      if(net)raw.push([net,csedT('인터넷 번역')]);
      if(!D.sure&&dict)raw.push([dict,csedT('내장 사전 + 로마자')]);
      show();
      if(!raw.length){say(csedEsc(csedT('바꿀 수 없었어요. 다른 말로 입력해 보세요')),'bad');return}
      say(csedEsc(D.sure?csedT('✓ 변환했어요 · 아래 후보를 눌러 바꿀 수 있어요'):net?csedT('✓ 인터넷 번역으로 바꿨어요'):csedT('인터넷 번역을 쓸 수 없어 내장 사전과 로마자로 바꿨어요')),net||D.sure?'ok':'bad');
      out.focus({preventScroll:true});out.select();
    };
    const apply=()=>{
      let v=out.value.trim();if(!v)return;
      const t=NT.target;if(NT.kind==='code')v=v.replace(/\s+/g,'');
      if(t&&t.maxLength>0)v=v.slice(0,t.maxLength);
      if(!t||!t.isConnected){
        try{navigator.clipboard.writeText(v)}catch(_){}
        say(csedEsc(csedT('이름 칸이 닫혀서 복사해 두었어요 · 붙여넣기 하세요')),'bad');return}
      this.close(false);
      try{t.focus({preventScroll:true})}catch(_){}
      assistSetValue(t,v);try{t.setSelectionRange(v.length,v.length)}catch(_){}
    };
    w.addEventListener('click',e=>{
      const a=e.target.closest('[data-a]'),st=e.target.closest('[data-st]'),al=e.target.closest('[data-alt]');
      if(st){style=st.dataset.st;ntSavePref(NT.kind,style);w.querySelectorAll('[data-st]').forEach(b=>{const on=b===st;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});delete out.dataset.touched;show();return}
      if(al){out.value=al.dataset.alt;out.dataset.touched='1';show();out.focus();return}
      if(!a)return;
      if(a.dataset.a==='x')this.close(true);
      else if(a.dataset.a==='go')go();
      else if(a.dataset.a==='apply')apply();
      else if(a.dataset.a==='copy'){const v=out.value.trim();if(!v)return;try{navigator.clipboard.writeText(v);say(csedEsc(csedT('복사했어요')),'ok')}catch(_){out.select()}}
    });
    out.addEventListener('input',()=>{out.dataset.touched='1';ap.disabled=!out.value.trim()});
    w.addEventListener('keydown',e=>{
      e.stopPropagation();   /* 엔진 단축키(삭제 · F2 …)가 먹지 않게 */
      if(e.key==='Escape'){e.preventDefault();this.close(true);return}
      if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){
        e.preventDefault();
        if(e.target===src&&!(e.ctrlKey||e.metaKey))go();else apply();
      }
    });
    src.focus();src.select();
    if(pre)go();
  }
};
NAMETR.attach(document);
window.NAMETR=NAMETR;

/* =========================== ② 스크립트 도움말 =========================== */
/* [분류, 제목, 설명, 찾을 낱말, 넣는 곳(c: 클래스 안 · m: 함수 안), 코드] */
const EH_ITEMS=[
 ['기본','콘솔에 글 출력하기','콘솔 창에 글이나 값을 보여 준다. 값이 어떻게 바뀌는지 확인할 때 쓴다.','debug log 로그 출력 print 콘솔','m','Debug.Log("안녕하세요!");\nDebug.Log("지난 시간: " + Time.time);\nDebug.LogWarning("조심하세요");\nDebug.LogError("문제가 생겼어요");'],
 ['기본','인스펙터에 보이는 변수 만들기','public 변수는 인스펙터에 나타나서 값을 바로 바꿀 수 있어요. [Header]로 제목을 붙일 수 있어요.','변수 public field header serializefield 인스펙터','c','[Header("설정")]\npublic float speed = 3f;\npublic int maxHp = 100;\npublic string displayName = "용사";\n[SerializeField] private bool canJump = true;'],
 ['기본','Start · Update 기본 틀','Start는 시작할 때 한 번, Update는 매 프레임 불립니다.','start update 시작 매프레임 틀 기본','c','void Start()\n{\n    // 처음 한 번\n}\n\nvoid Update()\n{\n    // 매 프레임\n}'],
 ['컴포넌트','컴포넌트 불러오기','GetComponent<T>()로 이 오브젝트에 붙은 컴포넌트를 가져와 변수에 담아 둡니다.','getcomponent 컴포넌트 가져오기 불러오기 component animator audiosource','c','Animator animator;\nAudioSource audioSource;\n\nvoid Start()\n{\n    animator = GetComponent<Animator>();\n    audioSource = GetComponent<AudioSource>();\n}'],
 ['컴포넌트','다른 오브젝트 찾기','이름으로 씬의 게임 오브젝트를 찾습니다. UI 요소 이름도 찾을 수 있어요.','gameobject find 찾기 이름 오브젝트','m','GameObject door = GameObject.Find("문");\nif (door != null)\n    Debug.Log(door.name + "을(를) 찾았어요");'],
 ['컴포넌트','다른 오브젝트의 컴포넌트 쓰기','찾은 오브젝트에서 GetComponent로 컴포넌트를 꺼냅니다.','find getcomponent 다른 오브젝트 컴포넌트','m','GameObject lamp = GameObject.Find("램프");\nLight light = lamp.GetComponent<Light>();\nlight.intensity = 2f;'],
 ['컴포넌트','오브젝트 켜고 끄기','SetActive(false)로 숨기고 true로 다시 보이게 합니다.','setactive 켜기 끄기 숨기기 보이기 active','m','gameObject.SetActive(false);\n\nGameObject wall = GameObject.Find("비밀 벽");\nwall.SetActive(!wall.activeSelf);'],
 ['컴포넌트','오브젝트 없애기','Destroy로 오브젝트를 씬에서 지웁니다. (아이템 먹기 · 적 처치)','destroy 삭제 없애기 지우기 제거','m','Destroy(gameObject);'],
 ['컴포넌트','주인공 가져오기','Hero.main은 씬의 주인공입니다. 몬스터 · NPC 스크립트에서 주인공 위치나 체력을 볼 때 써요.','hero main 주인공 플레이어 player','m','Hero hero = Hero.main;\nDebug.Log("주인공 위치: " + hero.position);\nDebug.Log("주인공 체력: " + hero.hp);'],
 ['입력','키를 눌렀을 때','GetKeyDown은 키를 누른 그 순간 한 번만 true입니다.','input getkeydown 키 누르기 키보드 keycode','m','if (Input.GetKeyDown(KeyCode.Space))\n{\n    Debug.Log("스페이스를 눌렀어요");\n}'],
 ['입력','키를 누르고 있는 동안','GetKey는 누르고 있는 동안 계속 true입니다. GetKeyUp은 뗀 순간이에요.','input getkey getkeyup 누르고있는 동안 키보드','m','if (Input.GetKey(KeyCode.LeftShift))\n{\n    Debug.Log("Shift를 누르고 있어요");\n}\nif (Input.GetKeyUp(KeyCode.LeftShift))\n{\n    Debug.Log("Shift에서 손을 뗐어요");\n}'],
 ['입력','방향키 · WASD로 움직이기','GetAxisRaw로 -1~1 방향을 읽고, 주인공 컴포넌트의 Move로 움직입니다.','방향키 wasd getaxis horizontal vertical 이동 움직이기 move','c','public float speed = 4f;\nHero hero;\n\nvoid Start()\n{\n    hero = GetComponent<Hero>();\n}\n\nvoid Update()\n{\n    float h = Input.GetAxisRaw("Horizontal");\n    float v = Input.GetAxisRaw("Vertical");\n    Vector2 dir = new Vector2(h, v);\n    if (dir.magnitude > 0)\n    {\n        hero.Face(dir);\n        hero.Move(dir.normalized * speed * Time.deltaTime);\n    }\n}'],
 ['입력','마우스 클릭','GetMouseButtonDown(0)은 왼쪽, (1)은 오른쪽 버튼입니다.','mouse 마우스 클릭 click getmousebuttondown','m','if (Input.GetMouseButtonDown(0))\n{\n    Debug.Log("왼쪽 클릭!");\n}'],
 ['이동','위치 바꾸기','transform.position에 새 좌표를 넣으면 바로 그 자리로 옮겨집니다.','transform position 위치 순간이동 좌표 vector','m','transform.position = new Vector3(3, 2, 0);'],
 ['이동','일정한 속도로 움직이기','Time.deltaTime을 곱하면 컴퓨터 속도와 상관없이 1초에 speed만큼 움직여요.','translate 이동 속도 deltatime 움직이기 speed','c','public float speed = 2f;\n\nvoid Update()\n{\n    transform.Translate(new Vector3(speed * Time.deltaTime, 0, 0));\n}'],
 ['이동','목표 지점으로 다가가기','MoveTowards는 목표를 넘어가지 않게 한 걸음씩 다가갑니다.','movetowards 목표 다가가기 따라가기 target','c','public Vector3 target = new Vector3(5, 0, 0);\npublic float speed = 2f;\n\nvoid Update()\n{\n    transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);\n}'],
 ['이동','두 위치 사이 거리','Vector2.Distance로 두 점 사이의 거리(칸)를 잽니다.','distance 거리 가까이 멀리 vector2','m','float d = Vector2.Distance(transform.position, Hero.main.position);\nif (d < 2f)\n{\n    Debug.Log("주인공이 가까이 있어요");\n}'],
 ['이동','주인공 따라가기','주인공이 가까이 오면 그쪽으로 다가갑니다. (몬스터 · 펫)','따라가기 추적 chase follow 몬스터 펫 주인공','c','public float speed = 1.5f;\npublic float sight = 5f;\n\nvoid Update()\n{\n    Vector3 target = Hero.main.position;\n    if (Vector2.Distance(transform.position, target) < sight)\n    {\n        transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);\n    }\n}'],
 ['이동','왔다 갔다 순찰하기','두 지점 사이를 계속 오갑니다. (움직이는 발판 · 순찰 적)','순찰 patrol 왕복 왔다갔다 발판 pingpong','c','public Vector3 a = new Vector3(0, 0, 0);\npublic Vector3 b = new Vector3(4, 0, 0);\npublic float speed = 2f;\nbool toB = true;\n\nvoid Update()\n{\n    Vector3 goal = toB ? b : a;\n    transform.position = Vector3.MoveTowards(transform.position, goal, speed * Time.deltaTime);\n    if (Vector2.Distance(transform.position, goal) < 0.01f)\n        toB = !toB;\n}'],
 ['이동','빙글빙글 돌리기','Rotate로 매 프레임 조금씩 돌립니다.','rotate 회전 돌리기 빙글','c','public float turnSpeed = 90f;\n\nvoid Update()\n{\n    transform.Rotate(turnSpeed * Time.deltaTime);\n}'],
 ['이동','크기 바꾸기','localScale로 크기를 바꿉니다. 1이 원래 크기예요.','scale localscale 크기 커지기 작아지기','m','transform.localScale = new Vector3(2, 2, 1);'],
 ['연출','좌우 뒤집기','localScale의 x를 -1로 하면 그림이 좌우로 뒤집힙니다. (바라보는 방향)','flip 뒤집기 좌우 방향 localscale 반전','m','float h = Input.GetAxisRaw("Horizontal");\nif (h < 0)\n    transform.localScale = new Vector3(-1, 1, 1);\nelse if (h > 0)\n    transform.localScale = new Vector3(1, 1, 1);'],
 ['연출','카메라 확대 · 축소','시작 카메라의 orthographicSize를 바꿉니다. 작을수록 크게 보여요.','camera 카메라 줌 zoom 확대 축소 orthographicsize','m','Camera cam = Camera.main;\nif (Input.GetKeyDown(KeyCode.Q))\n    cam.orthographicSize = 3f;\nif (Input.GetKeyDown(KeyCode.E))\n    cam.orthographicSize = 6f;'],
 ['연출','애니메이션 바꾸기','Animator의 파라미터를 바꿔 애니메이터 창의 전환을 일으킵니다.','animator 애니메이션 setbool settrigger play 전환','m','Animator animator = GetComponent<Animator>();\nanimator.SetBool("isWalking", true);\nanimator.SetTrigger("Attack");\n// 바로 재생: animator.Play("Idle");'],
 ['연출','소리 재생하기','AudioSource 컴포넌트에서 고른 소리를 재생합니다.','audiosource 소리 효과음 음악 재생 play sound','m','AudioSource audioSource = GetComponent<AudioSource>();\nif (!audioSource.isPlaying)\n    audioSource.Play();'],
 ['연출','화면 효과 서서히 켜기 (볼륨)','Volume의 weight를 0에서 1로 천천히 올려 후처리 효과(공포 · 회상 …)를 부드럽게 켭니다.','volume 볼륨 후처리 화면 효과 weight 페이드 공포 필터 post processing','c','public float fadeTime = 2f;\nVolume volume;\n\nvoid Start()\n{\n    volume = GetComponent<Volume>();\n    volume.weight = 0f;\n}\n\nvoid Update()\n{\n    volume.weight = Mathf.MoveTowards(volume.weight, 1f, Time.deltaTime / fadeTime);\n}'],
 ['연출','빛 밝기 바꾸기','Light 컴포넌트의 밝기 · 색을 바꿉니다.','light 빛 조명 밝기 intensity','m','Light light = GetComponent<Light>();\nlight.intensity = 1.5f;\nlight.color = Color.yellow;'],
 ['시간','타이머 (몇 초마다)','시간을 더해 가다가 정해 둔 초가 지나면 할 일을 하고 0으로 되돌립니다.','타이머 timer 초마다 반복 시간 deltatime interval','c','public float interval = 2f;\nfloat timer = 0f;\n\nvoid Update()\n{\n    timer += Time.deltaTime;\n    if (timer >= interval)\n    {\n        timer = 0f;\n        Debug.Log(interval + "초가 지났어요");\n    }\n}'],
 ['시간','몇 초 뒤에 한 번','남은 시간을 줄여 가다가 0이 되면 한 번만 실행합니다.','지연 delay 몇초뒤 나중에 한번 invoke','c','public float delay = 3f;\nbool done = false;\n\nvoid Update()\n{\n    if (done) return;\n    delay -= Time.deltaTime;\n    if (delay <= 0f)\n    {\n        done = true;\n        Message.Show("3초가 지났어요!", 2f);\n    }\n}'],
 ['충돌','영역에 들어왔을 때 (트리거)','박스 콜라이더 2D의 트리거를 켜면 주인공이 들어올 때 OnTriggerEnter2D, 나갈 때 OnTriggerExit2D가 불립니다.','ontriggerenter2d ontriggerexit2d 트리거 trigger 닿았을때 영역 콜라이더','c','void OnTriggerEnter2D(Collider2D other)\n{\n    Message.Show("주인공이 들어왔어요", 2f);\n}\n\nvoid OnTriggerExit2D(Collider2D other)\n{\n    Debug.Log("주인공이 나갔어요");\n}'],
 ['충돌','공격을 맞았을 때','주인공이 공격(휘두르기)으로 이 오브젝트를 맞히면 OnHit이 불립니다. (항아리 · 상자 부수기)','onhit 공격 맞음 부수기 때리기 hit','c','public int hits = 3;\n\nvoid OnHit()\n{\n    hits--;\n    if (hits <= 0)\n    {\n        Message.Show("부서졌다!", 1f);\n        Destroy(gameObject);\n    }\n}'],
 ['충돌','주인공이 닿았을 때 (엔진 전용)','주인공이 이 오브젝트 칸에 들어오고 나갈 때 불립니다.','onheroenter onheroexit 주인공 닿음 밟음','c','void OnHeroEnter()\n{\n    Message.Show("반짝이는 무언가가 있다", 2f);\n}\n\nvoid OnHeroExit()\n{\n    Debug.Log("주인공이 떠났어요");\n}'],
 ['충돌','말 걸었을 때 (NPC)','주인공이 가까이서 말 걸기(Space)를 하면 OnInteract가 불립니다.','oninteract 말걸기 npc 상호작용 대화','c','void OnInteract()\n{\n    Dialog.Show("마을 사람", "안녕! 오늘 날씨 좋네.");\n}'],
 ['게임','대화창 띄우기','대화창을 엽니다. 열려 있는 동안 게임이 멈추고 Space로 닫혀요.','dialog 대화창 대화 말 npc show','m','Dialog.Show("상인", "어서 오세요!");'],
 ['게임','알림 메시지 띄우기','화면 아래에 짧은 메시지를 몇 초 동안 보여 줍니다.','message 알림 메시지 안내 show 토스트','m','Message.Show("열쇠를 얻었다!", 2f);'],
 ['게임','아이템 얻기 · 쓰기','Inventory로 소지품을 더하고 빼고 개수를 셉니다.','inventory 인벤토리 아이템 소지품 add remove count','m','Inventory.Add("약초", 1);\nint n = Inventory.Count("약초");\nif (Inventory.Remove("약초", 1))\n{\n    Hero.main.Heal(20);\n}'],
 ['게임','열쇠가 있으면 문 열기','소지품에 열쇠가 있는지 보고 문을 엽니다.','열쇠 key 문 door has 조건 inventory','c','void OnInteract()\n{\n    if (Inventory.Has("열쇠"))\n    {\n        Inventory.Remove("열쇠", 1);\n        Message.Show("문이 열렸다!", 2f);\n        gameObject.SetActive(false);\n    }\n    else\n    {\n        Message.Show("잠겨 있다. 열쇠가 필요해", 2f);\n    }\n}'],
 ['게임','아이템 먹기','주인공이 닿으면 소지품에 넣고 사라집니다.','아이템 먹기 줍기 코인 동전 pickup collect','c','public string itemName = "동전";\n\nvoid OnHeroEnter()\n{\n    Inventory.Add(itemName, 1);\n    Message.Show(itemName + " +1", 1f);\n    Destroy(gameObject);\n}'],
 ['게임','주인공 체력 깎기 · 회복','TakeDamage로 피해를 주고 Heal로 회복합니다.','takedamage heal 체력 데미지 피해 회복 hp','m','Hero.main.TakeDamage(10);\nHero.main.Heal(20);\nif (Hero.main.hp <= 0)\n    Debug.Log("쓰러졌어요");'],
 ['게임','함정 (닿으면 피해)','주인공이 닿을 때마다 피해를 줍니다.','함정 trap 가시 spike 피해 데미지','c','public int damage = 15;\n\nvoid OnHeroEnter()\n{\n    Hero.main.TakeDamage(damage);\n    Message.Show("아야!", 1f);\n}'],
 ['게임','씬 이동하기','이름으로 다른 씬을 불러옵니다.','scenemanager loadscene 씬 이동 장면 맵','m','SceneManager.LoadScene("숲 입구");'],
 ['게임','게임 다시 시작','체력을 채우고 시작 씬에서 다시 시작합니다.','restart 다시시작 재시작 restartgame 게임오버','m','SceneManager.RestartGame();'],
 ['게임','UI 그룹 보이기 · 숨기기','계층 구조의 UI 그룹을 찾아 한 번에 보이거나 숨깁니다.','uigroup ui 그룹 메뉴 창 보이기 숨기기 find','m','UIGroup menu = UIGroup.Find("메뉴");\nmenu.SetActive(true);'],
 ['문법','조건문 (if · else)','조건이 맞을 때와 아닐 때 다른 일을 합니다.','if else 조건 만약 아니면 비교','m','int hp = Hero.main.hp;\nif (hp <= 0)\n{\n    Debug.Log("쓰러짐");\n}\nelse if (hp < 30)\n{\n    Debug.Log("위험해요");\n}\nelse\n{\n    Debug.Log("괜찮아요");\n}'],
 ['문법','반복문 (for)','정해진 횟수만큼 되풀이합니다.','for 반복 되풀이 loop 횟수','m','for (int i = 0; i < 5; i++)\n{\n    Debug.Log(i + "번째");\n}'],
 ['문법','글자 이어 붙이기','+ 나 $"…{값}…" 으로 글자와 값을 이어 붙입니다.','string 문자열 글자 이어붙이기 보간 interpolation 텍스트','m','string monster = "슬라임";\nint hp = 30;\nDebug.Log(monster + "의 체력: " + hp);\nDebug.Log($"{monster}의 체력은 {hp}입니다");'],
 ['문법','상태 나누기 (switch)','값에 따라 여러 경우로 나눕니다.','switch case 상태 state 경우','m','int state = Random.Range(0, 3);\nswitch (state)\n{\n    case 0:\n        Debug.Log("대기");\n        break;\n    case 1:\n        Debug.Log("공격");\n        break;\n    default:\n        Debug.Log("알 수 없음");\n        break;\n}'],
 ['문법','무작위 값','Random.Range로 정해진 범위 안의 값을 뽑습니다. 정수는 끝 값이 나오지 않아요.','random range 랜덤 무작위 주사위 확률','m','int dice = Random.Range(1, 7);\nfloat x = Random.Range(-3f, 3f);\nif (Random.value < 0.3f)\n    Debug.Log("30% 확률 당첨!");'],
 ['문법','함수 만들기','같은 일을 이름 붙여 묶어 두고 여러 번 부릅니다.','함수 method 메서드 function void return','c','int Add(int a, int b)\n{\n    return a + b;\n}\n\nvoid Start()\n{\n    Debug.Log(Add(2, 3));\n}'],
 ['물리','플랫포머 이동 · 점프','리지드바디 2D(중력 1)로 좌우로 걷고 Space로 점프한다. 땅에 닿아 있을 때만 점프해요.','platformer 플랫포머 점프 jump rigidbody2d 리지드바디 중력 velocity 땅','c','public float moveSpeed = 5f;\npublic float jumpPower = 8f;\nRigidbody2D rb;\nbool grounded;\n\nvoid Start()\n{\n    rb = GetComponent<Rigidbody2D>();\n}\n\nvoid Update()\n{\n    float x = Input.GetAxisRaw(\"Horizontal\");\n    rb.velocity = new Vector2(x * moveSpeed, rb.velocity.y);\n    if (x != 0) GetComponent<SpriteRenderer>().flipX = x < 0;\n\n    // 발밑 0.6칸 안에 땅이 있으면 점프할 수 있어요 (아래쪽이 +y)\n    grounded = Physics2D.Raycast(transform.position, Vector2.down, 0.6f);\n    if (grounded && Input.GetKeyDown(KeyCode.Space))\n        rb.velocity = new Vector2(rb.velocity.x, -jumpPower);\n}'],
 ['물리','힘으로 밀기 (AddForce)','리지드바디 2D에 힘을 준다. Impulse는 한 번에 확 민다.','addforce 힘 밀기 impulse 폭발 넉백 knockback','m','Rigidbody2D rb = GetComponent<Rigidbody2D>();\nrb.AddForce(new Vector2(3, -6), ForceMode2D.Impulse);'],
 ['물리','부딪쳤을 때 (OnCollisionEnter2D)','리지드바디 2D가 벽 · 땅 · 다른 콜라이더에 부딪치면 불린다. 타일 벽 · 땅의 태그는 Ground예요.','oncollisionenter2d collision 충돌 부딪침 ground 땅 태그','c','void OnCollisionEnter2D(Collision2D col)\n{\n    Debug.Log(col.gameObject.name + \"에 부딪쳤어요\");\n    if (col.gameObject.CompareTag(\"Enemy\"))\n        Destroy(col.gameObject);\n}'],
 ['물리','광선 쏘기 (Raycast)','한 방향으로 광선을 쏴서 처음 맞은 것을 알아낸다. (시야 · 땅 검사 · 레이저)','raycast 광선 레이 시야 감지 physics2d hit','m','RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.right, 5f);\nif (hit)\n{\n    Debug.Log(hit.collider.name + \" 까지 \" + hit.distance + \"칸\");\n}'],
 ['물리','주변 적 모두 찾기 (폭발 범위)','원 안의 콜라이더를 모두 찾아 태그가 Enemy인 것만 지운다.','overlapcircleall 범위 폭발 주변 찾기 enemy 태그','m','Collider2D[] hits = Physics2D.OverlapCircleAll(transform.position, 2f);\nforeach (Collider2D c in hits)\n{\n    if (c.CompareTag(\"Enemy\"))\n        Destroy(c.gameObject);\n}'],
 ['생성','총알 쏘기 (프리팹 Instantiate)','프리팹을 슬롯에 넣고 Space를 누를 때마다 복제해서 날린다. 총알 프리팹에는 리지드바디 2D(스크립트로만)와 박스 콜라이더 2D(트리거)를 붙인다.','instantiate 프리팹 prefab 총알 bullet 발사 생성 복제 shoot','c','public GameObject bulletPrefab;\npublic float bulletSpeed = 10f;\n\nvoid Update()\n{\n    if (Input.GetKeyDown(KeyCode.Space))\n    {\n        GameObject b = Instantiate(bulletPrefab, transform.position, Quaternion.identity);\n        b.GetComponent<Rigidbody2D>().velocity = Vector2.right * bulletSpeed;\n        Destroy(b, 2f);\n    }\n}'],
 ['생성','적을 일정 시간마다 만들기','InvokeRepeating으로 몇 초마다 프리팹을 무작위 위치에 만든다.','spawner 스포너 생성 적 enemy invokerepeating 반복 random','c','public GameObject enemyPrefab;\npublic float every = 2f;\n\nvoid Start()\n{\n    InvokeRepeating(nameof(Spawn), 1f, every);\n}\n\nvoid Spawn()\n{\n    Vector2 p = (Vector2)transform.position + Random.insideUnitCircle * 3f;\n    Instantiate(enemyPrefab, p, Quaternion.identity);\n}'],
 ['생성','총알이 맞았을 때 (트리거)','총알(트리거)이 적에 닿으면 적에게 피해를 주고 총알은 사라진다.','bullet 총알 맞음 ontriggerenter2d 피해 적 hit','c','public int damage = 1;\n\nvoid OnTriggerEnter2D(Collider2D other)\n{\n    if (other.CompareTag(\"Enemy\"))\n    {\n        Monster m = other.GetComponent<Monster>();\n        if (m != null) m.TakeDamage(damage);\n        Destroy(gameObject);\n    }\n}'],
 ['시간','코루틴으로 기다렸다 하기','IEnumerator와 yield return으로 시간 순서대로 일을 한다. (깜빡임 · 연출 · 순서대로 등장)','coroutine 코루틴 ienumerator yield waitforseconds 기다리기 startcoroutine','c','void Start()\n{\n    StartCoroutine(Countdown());\n}\n\nIEnumerator Countdown()\n{\n    for (int i = 3; i > 0; i--)\n    {\n        Message.Show(i + \"\", 0.8f);\n        yield return new WaitForSeconds(1f);\n    }\n    Message.Show(\"시작!\", 1f);\n}'],
 ['시간','깜빡이기 (무적 시간)','코루틴으로 그림을 몇 번 껐다 켠다.','blink 깜빡 무적 피격 spriterenderer coroutine','c','public IEnumerator Blink()\n{\n    SpriteRenderer sr = GetComponent<SpriteRenderer>();\n    for (int i = 0; i < 6; i++)\n    {\n        sr.enabled = !sr.enabled;\n        yield return new WaitForSeconds(0.1f);\n    }\n    sr.enabled = true;\n}'],
 ['시간','몇 초 뒤에 실행 (Invoke)','Invoke로 메서드를 몇 초 뒤에 한 번 부른다.','invoke 지연 delay 몇초뒤 nameof','c','void Start()\n{\n    Invoke(nameof(OpenDoor), 3f);\n}\n\nvoid OpenDoor()\n{\n    Message.Show(\"문이 열렸다!\", 2f);\n}'],
 ['시간','일시정지 (timeScale)','P를 누르면 게임 시간이 멈추고, 다시 누르면 이어진다.','pause 일시정지 timescale 멈춤 슬로모션 slow','c','bool paused;\n\nvoid Update()\n{\n    if (Input.GetKeyDown(KeyCode.P))\n    {\n        paused = !paused;\n        Time.timeScale = paused ? 0f : 1f;\n        Message.Show(paused ? \"일시정지\" : \"계속\", 1f);\n    }\n}'],
 ['게임','최고 점수 저장 (PlayerPrefs)','PlayerPrefs는 게임을 꺼도 남아요. 점수가 최고 기록보다 높으면 저장한다.','playerprefs 저장 save load 불러오기 최고점수 highscore 기록','m','int best = PlayerPrefs.GetInt(\"best\", 0);\nint score = 120;\nif (score > best)\n{\n    PlayerPrefs.SetInt(\"best\", score);\n    Message.Show(\"새 기록! \" + score, 2f);\n}'],
 ['연출','파티클 터뜨리기','파티클 시스템을 재생하거나 지금 바로 몇 개를 뿜는다.','particle 파티클 효과 이펙트 폭발 emit play','m','ParticleSystem ps = GetComponent<ParticleSystem>();\nps.Emit(30);\n// 처음부터 다시 재생: ps.Play();'],
 ['연출','카메라 흔들기','맞았을 때 · 폭발할 때 화면을 잠깐 흔든다. (세기 칸, 시간 초)','shake 흔들기 카메라 진동 타격감 camera','m','Camera.main.Shake(0.3f, 0.25f);'],
 ['연출','마우스 쪽 바라보기','마우스 위치를 씬 좌표로 바꿔 그쪽으로 돌린다.','mouse 마우스 조준 aim screentoworldpoint 바라보기 회전','c','void Update()\n{\n    Vector3 m = Camera.main.ScreenToWorldPoint(Input.mousePosition);\n    Vector2 d = (Vector2)m - (Vector2)transform.position;\n    float angle = Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg;\n    transform.eulerAngles = new Vector3(0, 0, angle);\n}'],
 ['문법','목록 (List) 쓰기','List에 값을 넣고 빼고 foreach로 하나씩 꺼낸다.','list 목록 리스트 add remove count foreach 배열','m','List<string> bag = new List<string>();\nbag.Add(\"사과\");\nbag.Add(\"열쇠\");\nbag.Remove(\"사과\");\nforeach (string item in bag)\n{\n    Debug.Log(item);\n}\nDebug.Log(\"개수: \" + bag.Count);'],
 ['문법','배열 · Dictionary','배열은 크기가 정해진 목록, Dictionary는 이름(키)으로 값을 찾는 표이다.','array 배열 dictionary 사전 키 key 표','m','int[] scores = { 10, 20, 30 };\nDebug.Log(scores[0] + \" · 개수 \" + scores.Length);\n\nDictionary<string, int> price = new Dictionary<string, int>();\nprice[\"포션\"] = 50;\nif (price.ContainsKey(\"포션\"))\n    Debug.Log(\"포션 \" + price[\"포션\"] + \"원\");'],
 ['컴포넌트','다른 스크립트의 값 · 함수 쓰기','GetComponent<스크립트 이름>()으로 내가 만든 스크립트를 꺼내 public 변수와 함수를 씁니다.','getcomponent 다른 스크립트 public 함수 호출 참조','m','PlayerHealth hp = GameObject.Find(\"Player\").GetComponent<PlayerHealth>();\nhp.health -= 10;\nhp.Hurt();'],
 ['컴포넌트','태그로 찾기','태그는 인스펙터 맨 위에서 정한다. 주인공은 기본 Player이다.','tag 태그 findwithtag comparetag player enemy','m','GameObject player = GameObject.FindWithTag(\"Player\");\nGameObject[] enemies = GameObject.FindGameObjectsWithTag(\"Enemy\");\nDebug.Log(\"적 \" + enemies.Length + \"마리\");'],
];
const EH_CATS=['전체',...[...new Set(EH_ITEMS.map(x=>x[0]))]];
const EH_KO_CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const ehCho=s=>String(s).replace(/[가-힣]/g,c=>EH_KO_CHO[((c.charCodeAt(0)-0xAC00)/588)|0]);
const ehNorm=s=>String(s).toLowerCase().replace(/\s+/g,'');
const EH={win:null,ta:null,q:'',cat:'전체',sel:0,list:[]};
function ehCode(it){
  let c=it[5];
  try{if(csedSet().ko&&typeof enToKo==='function')c=enToKo(c)}catch(_){}
  return c;
}
function ehFilter(){
  const terms=EH.q.trim().split(/\s+/).filter(Boolean).map(t=>t.toLowerCase());
  const jamo=t=>/^[ㄱ-ㅎ]+$/.test(t);
  return EH_ITEMS.map((it,i)=>({it,i})).filter(({it})=>{
    if(EH.cat!=='전체'&&it[0]!==EH.cat)return false;
    if(!terms.length)return true;
    const tr=csedT(it[1]),hay=ehNorm(it[0]+' '+it[1]+' '+tr+' '+it[2]+' '+it[3]+' '+it[5]),cho=ehCho(hay);
    return terms.every(t=>{const n=ehNorm(t);if(hay.includes(n))return true;if(jamo(n)&&cho.includes(n))return true;
      /* 한글 자판 상태로 친 영어 (ㅎㄷㅅ → get) */
      try{if(/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(n)&&typeof ko2key==='function'){const k=ko2key(n).toLowerCase();if(k&&k!==n&&hay.includes(k))return true}}catch(_){}
      return false});
  }).map(({it,i})=>{
    /* 제목에 맞으면 위로 */
    const tt=ehNorm(it[1]+' '+csedT(it[1]));let sc=0;terms.forEach(t=>{const n=ehNorm(t);if(tt.includes(n))sc-=2;else if(ehNorm(it[3]).includes(n))sc-=1});
    return{it,i,sc};
  }).sort((a,b)=>a.sc-b.sc||a.i-b.i).map(x=>x.it);
}
function ehMark(t){
  const e=csedEsc(t),terms=EH.q.trim().split(/\s+/).filter(x=>x&&!/^[ㄱ-ㅎ]+$/.test(x));
  if(!terms.length)return e;
  const re=new RegExp('('+terms.map(x=>csedEsc(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
  return e.replace(re,'<em>$1</em>');
}
function ehRender(keepScroll){
  const w=EH.win;if(!w)return;
  EH.list=ehFilter();EH.sel=Math.max(0,Math.min(EH.sel,EH.list.length-1));
  const L=w.querySelector('.ehlist'),st=L.scrollTop;
  w.querySelector('.ehn').textContent=csedT('{n}개',{n:EH.list.length});
  w.querySelectorAll('.ehcats [data-cat]').forEach(b=>b.classList.toggle('on',b.dataset.cat===EH.cat));
  L.innerHTML=EH.list.length?EH.list.map((it,i)=>{const api=(/\b([A-Z]\w+\.[A-Z]\w+|GetComponent|OnTrigger\w+|OnCollision\w+|On[A-Z]\w+|Destroy|SetActive|List)\b/.exec(it[5])||[''])[0];
    return `<button type="button" class="ehi${i===EH.sel?' on':''}" data-i="${i}" role="option" aria-selected="${i===EH.sel}"><span class="c">${csedEsc(csedT(it[0]))}</span><span class="t">${ehMark(csedT(it[1]))}</span><span class="k" data-i18n-skip>${csedEsc(api)}</span></button>`}).join('')
    :`<div class="ehnone">${csedEsc(csedT('맞는 도움말이 없다'))}<br><small>${csedEsc(csedT('다른 낱말로 찾아보세요 (예: 이동, 키, 소리)'))}</small></div>`;
  if(keepScroll)L.scrollTop=st;
  ehPreview();
}
function ehPreview(){
  const w=EH.win;if(!w)return;const it=EH.list[EH.sel],d=w.querySelector('.ehd'),pre=w.querySelector('.ehcode'),ap=w.querySelector('[data-a="apply"]');
  ap.disabled=!it;
  if(!it){d.innerHTML='';pre.innerHTML='';return}
  d.innerHTML=`<b>${csedEsc(csedT(it[1]))}</b><span class="w">${csedEsc(it[4]==='c'?csedT('클래스 안에 넣기'):csedT('함수 안에 넣기'))}</span><br>${csedEsc(csedT(it[2]))}`;
  pre.innerHTML=csHighlight(ehCode(it)).replace(/\n $/,'');
  const on=w.querySelector('.ehi.on');if(on)on.scrollIntoView({block:'nearest'});
}
/* 중괄호 블록 찾기 (문자열 · 주석 안은 건너뜀) → [{o: 여는 위치, c: 닫는 위치, d: 깊이(0 = 바깥)}] */
function ehBlocks(v){
  const out=[],st=[],n=v.length;let i=0;
  while(i<n){const c=v[i],d=v[i+1];
    if(c==='/'&&d==='/'){const j=v.indexOf('\n',i);i=j<0?n:j;continue}
    if(c==='/'&&d==='*'){const j=v.indexOf('*/',i+2);i=j<0?n:j+2;continue}
    if(c==='"'||c==="'"){const q=c;i++;while(i<n&&v[i]!==q&&v[i]!=='\n'){if(v[i]==='\\')i++;i++}i++;continue}
    if(c==='{')st.push(i);else if(c==='}'&&st.length){const o=st.pop();out.push({o,c:i,d:st.length})}
    i++}
  return out.sort((x,y)=>x.o-y.o);
}
const ehLS=(v,p)=>v.lastIndexOf('\n',p-1)+1;
const ehIndOf=(v,p)=>/^[ \t]*/.exec(v.slice(ehLS(v,p)))[0];
/* 블록 앞의 머리(함수 선언 줄) 시작 위치와 이름 */
function ehHead(v,b){
  let k=b.o-1;while(k>=0&&!';{}'.includes(v[k]))k--;
  let h=k+1;while(h<b.o&&/\s/.test(v[h]))h++;
  /* 머리 앞의 // 주석 줄도 함께 (예: // 매 프레임 호출됩니다) */
  let hs=ehLS(v,h);
  for(;;){const pl=ehLS(v,hs-1);if(hs===0)break;const line=v.slice(pl,hs-1);if(/^\s*\/\//.test(line)&&pl>k)hs=pl;else break}
  const head=v.slice(h,b.o).trim(),m=/([\p{L}_][\p{L}\p{N}_]*)\s*\([^()]*\)\s*$/u.exec(head);
  return{start:hs,hStart:ehLS(v,h),name:m?m[1]:null};
}
/* 예시 코드를 클래스 안에 알맞게 놓기 */
function ehPlace(v,a,b,code,kind){
  const B=ehBlocks(v),cls=B.find(x=>x.d===0&&/\bclass\b|클래스/.test(v.slice(Math.max(0,x.o-200),x.o)))||B.find(x=>x.d===0);
  if(!cls||a<=cls.o||a>cls.c)return null;
  const inner=B.filter(x=>x.o>cls.o&&x.c<cls.c),depth=1+inner.filter(x=>x.o<a&&a<=x.c).length;
  if(kind==='m'&&depth>=2)return null;                       /* 함수 안 예시를 함수 안에 → 커서 자리 */
  if(kind==='m')code='void Start()\n{\n'+code.split('\n').map(l=>l?'    '+l:l).join('\n')+'\n}';   /* 함수 밖에서 고르면 Start() 안으로 */
  /* 예시를 변수 줄 · 함수로 나눔 */
  const SB=ehBlocks(code).filter(x=>x.d===0),meth=[],fieldTxt=[];let last=0;
  SB.forEach(x=>{const h=ehHead(code,x);fieldTxt.push(code.slice(last,h.hStart));meth.push({name:h.name,full:code.slice(h.hStart,x.c+1),body:code.slice(x.o+1,x.c)});last=x.c+1});
  fieldTxt.push(code.slice(last));
  const members=inner.filter(x=>x.d===1).map(x=>Object.assign({b:x},ehHead(v,x)));
  const memInd=members.length?ehIndOf(v,members[0].hStart):ehIndOf(v,cls.o)+'    ';
  const clsTxt=v.slice(cls.o,cls.c);
  /* 이미 있는 변수는 빼기 */
  const fields=fieldTxt.join('\n').split('\n').filter(l=>{
    const m=/^\s*(?:\[[^\]]*\]\s*)*(?:(?:public|private|protected|internal|static|readonly|const)\s+)*[\p{L}_][\p{L}\p{N}_<>,\[\]]*\s+([\p{L}_][\p{L}\p{N}_]*)\s*(?:=|;)/u.exec(l);
    return !(m&&new RegExp('[\\p{L}\\p{N}_>\\]]\\s+'+m[1]+'\\s*[=;]','u').test(clsTxt));
  }).join('\n').replace(/^\n+|\n+$/g,'').replace(/\n{3,}/g,'\n\n');
  /* 고칠 일 목록 (뒤에서부터 적용해야 위치가 안 밀림) */
  const edits=[];let focus=null;
  const addBody=(mb,body)=>{   /* 이미 있는 함수 끝에 몸통 이어 붙이기 */
    const lines=body.replace(/^\s*\n|\s+$/g,'').split('\n'),hi=ehIndOf(v,mb.hStart);
    const txt=lines.map(l=>l.trim()?hi+l.replace(/^ {4}/,'    '):'').join('\n');
    const cl=ehLS(v,mb.b.c),cur=v.slice(mb.b.o+1,cl);
    if(!v.slice(cl,mb.b.c).trim()){
      if(!cur.trim()){edits.push([mb.b.o+1,cl,'\n'+txt+'\n',1+txt.length])}
      else edits.push([cl,cl,(cur.endsWith('\n')?'':'\n')+txt+'\n',txt.length])}
    else edits.push([mb.b.c,mb.b.c,'\n'+txt+'\n'+hi,txt.length+1]);
  };
  const newM=[];
  meth.forEach(m=>{const ex=m.name&&members.find(x=>x.name===m.name);if(ex)addBody(ex,m.body);else newM.push(m.full)});
  const ind=t=>t.split('\n').map(l=>l.trim()?memInd+l:'').join('\n');
  const enc=depth>=2?members.find(x=>x.b.o<a&&a<=x.b.c):null;
  if(enc){
    if(fields)edits.push([enc.start,enc.start,ind(fields)+'\n\n',ind(fields).length]);
    if(newM.length){const e=v.indexOf('\n',enc.b.c),p=e<0?v.length:e;const t='\n\n'+ind(newM.join('\n\n'));edits.push([p,p,t,t.length])}
  }else{
    const parts=[fields,...newM].filter(Boolean);
    if(parts.length){
      const ls=ehLS(v,a),le0=v.indexOf('\n',b),le=le0<0?v.length:le0,blank=!v.slice(ls,le).trim();
      const t=ind(parts.join('\n\n'));
      const prev=v.slice(0,ls).replace(/\s+$/,''),gap=/[}\]);]$/.test(prev)&&!/\n[ \t]*\n[ \t]*$/.test(v.slice(0,ls))?'\n':'';
      if(blank)edits.push([ls,le,gap+t,gap.length+t.length]);else{const p=le;edits.push([p,p,'\n'+t,t.length+1])}
    }
  }
  if(!edits.length)return{v,pos:a};
  /* 먼저 나오는 곳에 커서 · 뒤에서부터 고침 */
  edits.sort((x,y)=>x[0]-y[0]);focus=edits[0];
  let out=v,shift=0;
  edits.slice().sort((x,y)=>y[0]-x[0]).forEach(([s,e,t])=>{out=out.slice(0,s)+t+out.slice(e)});
  edits.forEach(([s,e,t])=>{if(s<focus[0])shift+=t.length-(e-s)});
  return{v:out,pos:focus[0]+shift+focus[3]};
}
const EDHELP={
  isOpen(){return !!(EH.win&&EH.win.isConnected)},
  close(back){const w=EH.win,ta=EH.ta;EH.win=null;if(w)w.remove();if(back&&ta&&ta.isConnected){try{ta.focus({preventScroll:true})}catch(_){}}},
  /* 고른 예시를 넣음 — 함수 안 예시는 커서 자리(들여쓰기 맞춤), 클래스 안 예시는 지금 함수 옆에 놓고
     같은 이름의 함수(Start · Update …)가 이미 있으면 그 안에 이어 붙임 · 이미 있는 변수는 다시 만들지 않음 */
  apply(){
    const it=EH.list[EH.sel],ta=EH.ta;if(!it||!ta||!ta.isConnected){this.close(false);return}
    this.close(false);ta.focus({preventScroll:true});
    const old=ta.value;let nv=null,pos=0;
    try{const r=ehPlace(old,ta.selectionStart,ta.selectionEnd,ehCode(it),it[4]);if(r){nv=r.v;pos=r.pos}}catch(e){nv=null}
    if(nv==null){   /* 클래스를 못 찾음 → 커서 자리에 그대로 */
      const a=ta.selectionStart,b=ta.selectionEnd,ls=old.lastIndexOf('\n',a-1)+1,before=old.slice(ls,a),ind=/^[ \t]*/.exec(before)[0];
      let code=ehCode(it).replace(/\n/g,'\n'+ind),pre=before.trim()?'\n'+ind:'';
      const le=old.indexOf('\n',b),after=old.slice(b,le<0?old.length:le);if(after.trim())code+='\n'+ind;
      nv=old.slice(0,a)+pre+code+old.slice(b);pos=a+pre.length+code.length;
    }
    /* 바뀐 가운데만 갈아 끼움 (실행 취소 · 스크롤 유지) */
    let p0=0;while(p0<old.length&&p0<nv.length&&old[p0]===nv[p0])p0++;
    let e0=old.length,e1=nv.length;while(e0>p0&&e1>p0&&old[e0-1]===nv[e1-1]){e0--;e1--}
    ta.setRangeText(nv.slice(p0,e1),p0,e0,'end');ta.setSelectionRange(pos,pos);
    try{ac.mute=true;ta.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}))}catch(_){ta.dispatchEvent(new Event('input',{bubbles:true}))}finally{ac.mute=false}
    try{acHide()}catch(_){}
    /* 넣은 곳이 보이게 */
    try{const lh=parseFloat(csedWin(ta).getComputedStyle(ta).lineHeight)||20,ln=nv.slice(0,pos).split('\n').length-1,top=ln*lh;
      if(top<ta.scrollTop||top>ta.scrollTop+ta.clientHeight-2*lh){ta.scrollTop=Math.max(0,top-ta.clientHeight/3);ta.dispatchEvent(new Event('scroll'))}}catch(_){}
  },
  open(ta,q){
    const d=ta.ownerDocument;assistCss(d);this.close(false);try{acHide()}catch(_){}
    EH.ta=ta;EH.q=q||'';EH.sel=0;if(!EH_CATS.includes(EH.cat))EH.cat='전체';
    const w=d.createElement('div');w.className='aswin ehwin';w.setAttribute('role','dialog');w.setAttribute('aria-label',csedT('스크립트 도움말'));
    w.innerHTML=`<div class="ashd"><span class="asic">?</span><b>${csedEsc(csedT('스크립트 도움말'))}</b><small class="ehn"></small><span class="sp"></span><button type="button" class="asx" data-a="x" aria-label="${csedEsc(csedT('닫기'))}">✕</button></div>
      <div class="ehq"><input type="search" data-i18n-skip spellcheck="false" autocomplete="off" placeholder="${csedEsc(csedT('무엇을 하고 싶나요? (예: 컴포넌트, 이동, 대화)'))}" aria-label="${csedEsc(csedT('도움말 검색'))}" value="${csedEsc(EH.q)}"></div>
      <div class="ehcats">${EH_CATS.map(c=>`<button type="button" data-cat="${csedEsc(c)}">${csedEsc(csedT(c))}</button>`).join('')}</div>
      <div class="ehlist" role="listbox" aria-label="${csedEsc(csedT('도움말 목록'))}"></div>
      <div class="ehprev"><div class="ehd"></div><pre class="ehcode" data-i18n-skip></pre></div>
      <div class="ehfoot"><span class="h">${csedEsc(csedT('↑↓ 고르기 · Tab 적용 · Esc 닫기'))}</span><button type="button" class="asbtn" data-a="copy">${csedEsc(csedT('복사'))}</button><button type="button" class="asbtn pri" data-a="apply">${csedEsc(csedT('적용'))} <kbd>Tab</kbd></button></div>`;
    d.body.append(w);EH.win=w;
    /* 커서 아래(자리가 없으면 위)에 띄움 */
    let x=0,y=0;try{const p=fxCaret(ta);x=p.x-20;y=p.y+14;const H=w.offsetHeight,vh=(d.defaultView||window).innerHeight;if(y+H>vh-6)y=Math.max(6,p.y-14-H)}catch(_){const r=ta.getBoundingClientRect();x=r.right-w.offsetWidth-16;y=r.top+10}
    assistPlace(w,x,y);assistDrag(w,w.querySelector('.ashd'));
    const inp=w.querySelector('.ehq input');
    inp.addEventListener('input',()=>{EH.q=inp.value;EH.sel=0;ehRender(false)});
    w.addEventListener('keydown',e=>{
      e.stopPropagation();
      const n=EH.list.length,mv=dd=>{e.preventDefault();if(!n)return;EH.sel=(EH.sel+dd+n)%n;ehRender(true)};
      if(e.key==='Escape'){e.preventDefault();this.close(true)}
      else if(e.key==='ArrowDown')mv(1);
      else if(e.key==='ArrowUp')mv(-1);
      else if(e.key==='PageDown'){e.preventDefault();EH.sel=Math.min(n-1,EH.sel+6);ehRender(true)}
      else if(e.key==='PageUp'){e.preventDefault();EH.sel=Math.max(0,EH.sel-6);ehRender(true)}
      else if((e.key==='Tab'&&!e.shiftKey)||(e.key==='Enter'&&e.target===inp&&!e.isComposing&&e.keyCode!==229)){e.preventDefault();this.apply()}
      else if(e.key==='Tab'&&e.shiftKey){e.preventDefault();const i=EH_CATS.indexOf(EH.cat);EH.cat=EH_CATS[(i+1)%EH_CATS.length];EH.sel=0;ehRender(false)}
    });
    w.addEventListener('mousedown',e=>{if(e.target.closest('.ehi,[data-cat],[data-a]'))e.preventDefault()});
    w.addEventListener('click',e=>{
      const r=e.target.closest('.ehi'),c=e.target.closest('[data-cat]'),a=e.target.closest('[data-a]');
      if(r){EH.sel=+r.dataset.i;ehRender(true);inp.focus({preventScroll:true});return}
      if(c){EH.cat=c.dataset.cat;EH.sel=0;ehRender(false);inp.focus({preventScroll:true});return}
      if(!a)return;
      if(a.dataset.a==='x')this.close(true);
      else if(a.dataset.a==='apply')this.apply();
      else if(a.dataset.a==='copy'){const it=EH.list[EH.sel];if(it){try{navigator.clipboard.writeText(ehCode(it))}catch(_){}const s=w.querySelector('.ehfoot .h');s.textContent=csedT('복사했어요');setTimeout(()=>{if(s.isConnected)s.textContent=csedT('↑↓ 고르기 · Tab 적용 · Esc 닫기')},1400)}}
    });
    w.addEventListener('dblclick',e=>{if(e.target.closest('.ehi'))this.apply()});
    ehRender(false);inp.focus({preventScroll:true});inp.select();
  }
};
window.EDHELP=EDHELP;
/* 편집기 연결: 빈 줄에 help / 도움말 을 치면 그 글자를 지우고 도움말 창 · F1 */
function edHelpHook(ta){
  if(!ta||ta.tagName!=='TEXTAREA'||ta._ehOn)return;ta._ehOn=true;
  const check=()=>{
    if(ta.selectionStart!==ta.selectionEnd)return false;
    const v=ta.value,a=ta.selectionStart,ls=v.lastIndexOf('\n',a-1)+1,le0=v.indexOf('\n',a),le=le0<0?v.length:le0;
    const line=v.slice(ls,le),m=/^([ \t]*)(help|도움말)[ \t]*$/i.exec(line);
    if(!m||a<ls+m[1].length+m[2].length)return false;
    const s=ls+m[1].length;ta.setRangeText('',s,le,'end');ta.setSelectionRange(s,s);
    try{ac.mute=true;ta.dispatchEvent(new Event('input',{bubbles:true}))}finally{ac.mute=false}
    EDHELP.open(ta);return true;
  };
  ta.addEventListener('input',e=>{if(e.isComposing||e.inputType==='insertCompositionText')return;if(e.inputType==='insertText'&&/[pP]/.test(e.data||''))setTimeout(check,0)});
  ta.addEventListener('compositionend',()=>setTimeout(check,0));
  ta.addEventListener('keydown',e=>{if(e.key==='F1'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();e.stopPropagation();EDHELP.open(ta)}});
}
/* ---- 번역 (영어 · 日本語 · 中文) ---- */
if(window.TI18N)TI18N.add({
 '번역기':['Translator','翻訳機','翻译器'],'영어 이름 만들기':['Make English name','英語の名前を作る','生成英文名称'],'모두 선택':['Select all','すべて選択','全选'],
 'Shift+우클릭 = 브라우저 기본 메뉴':['Shift+right-click = browser menu','Shift+右クリック = ブラウザのメニュー','Shift+右键 = 浏览器菜单'],
 '이름 번역기':['Name translator','名前翻訳機','名称翻译器'],'코드 이름':['Code name','コード名','代码名称'],'오브젝트 이름':['Object name','オブジェクト名','对象名称'],
 '바꿀 말 (한글 등)':['Text to convert (Korean, etc.)','変換する言葉（韓国語など）','要转换的文字（韩文等）'],'예: 플레이어 이동, 보물 상자':['e.g. 플레이어 이동, 보물 상자','例: プレイヤー移動、宝箱','例：玩家移动、宝箱'],
 '변환':['Convert','変換','转换'],'이름 모양':['Name style','名前の形','名称样式'],'영어 이름':['English name','英語の名前','英文名称'],'복사':['Copy','コピー','复制'],'적용':['Apply','適用','应用'],'닫기':['Close','閉じる','关闭'],
 '바꿀 말을 입력하세요':['Type something to convert','変換する言葉を入力してください','请输入要转换的文字'],'입력한 그대로':['As typed','入力のまま','按输入'],
 '영어 낱말을 이름 모양으로 맞췄어요':['Formatted the English words as a name','英単語を名前の形に整えました','已将英文单词整理为名称格式'],
 '내장 사전':['Built-in dictionary','内蔵辞書','内置词典'],'✓ 게임 낱말 사전으로 바꿨어요 · 다른 후보를 찾는 중…':['✓ Converted with the game dictionary · looking for more…','✓ ゲーム用語辞書で変換しました · 他の候補を検索中…','✓ 已用游戏词典转换 · 正在查找其他候选…'],
 '번역하는 중…':['Translating…','翻訳中…','正在翻译…'],'인터넷 번역':['Online translation','オンライン翻訳','在线翻译'],'내장 사전 + 로마자':['Dictionary + romanization','辞書 + ローマ字','词典 + 罗马字'],
 '바꿀 수 없었어요. 다른 말로 입력해 보세요':['Couldn’t convert. Try different words','変換できませんでした。別の言葉で試してください','无法转换。请换个说法试试'],
 '✓ 변환했어요 · 아래 후보를 눌러 바꿀 수 있어요':['✓ Converted · click a suggestion below to switch','✓ 変換しました · 下の候補を押して変更できます','✓ 已转换 · 可点击下方候选替换'],
 '✓ 인터넷 번역으로 바꿨어요':['✓ Converted with online translation','✓ オンライン翻訳で変換しました','✓ 已通过在线翻译转换'],
 '인터넷 번역을 쓸 수 없어 내장 사전과 로마자로 바꿨어요':['Online translation unavailable · used the dictionary and romanization','オンライン翻訳が使えないため辞書とローマ字で変換しました','无法使用在线翻译 · 已用词典和罗马字转换'],
 '이름 칸이 닫혀서 복사해 두었어요 · 붙여넣기 하세요':['The name field closed, so it was copied · paste it','名前欄が閉じたのでコピーしました · 貼り付けてください','名称栏已关闭，已复制 · 请粘贴'],'복사했어요':['Copied','コピーしました','已复制'],
 '스크립트 도움말':['Script help','スクリプトヘルプ','脚本帮助'],'무엇을 하고 싶나요? (예: 컴포넌트, 이동, 대화)':['What do you want to do? (e.g. component, move, dialog)','何をしたいですか？（例: コンポーネント、移動、会話）','想做什么？（例：组件、移动、对话）'],
 '도움말 검색':['Search help','ヘルプ検索','搜索帮助'],'도움말 목록':['Help list','ヘルプ一覧','帮助列表'],'↑↓ 고르기 · Tab 적용 · Esc 닫기':['↑↓ choose · Tab apply · Esc close','↑↓ 選択 · Tab 適用 · Esc 閉じる','↑↓ 选择 · Tab 应用 · Esc 关闭'],
 '{n}개':['{n}','{n}件','{n}项'],'맞는 도움말이 없다':['No matching help','該当するヘルプがありません','没有匹配的帮助'],'다른 낱말로 찾아보세요 (예: 이동, 키, 소리)':['Try other words (e.g. move, key, sound)','別の言葉で探してください（例: 移動、キー、音）','请换个词搜索（例：移动、按键、声音）'],
 '클래스 안에 넣기':['Goes inside the class','クラスの中に入れる','放在类中'],'함수 안에 넣기':['Goes inside a method','関数の中に入れる','放在函数中'],
 '전체':['All','すべて','全部'],'기본':['Basics','基本','基础'],'컴포넌트':['Components','コンポーネント','组件'],'입력':['Input','入力','输入'],'이동':['Movement','移動','移动'],'연출':['Effects','演出','表现'],'시간':['Time','時間','时间'],'충돌':['Collision','衝突','碰撞'],'게임':['Game','ゲーム','游戏'],'문법':['Syntax','文法','语法'],
 '콘솔에 글 출력하기':['Print to the console','コンソールに出力','输出到控制台'],'콘솔 창에 글이나 값을 보여 준다. 값이 어떻게 바뀌는지 확인할 때 쓴다.':['Shows text or values in the console. Useful for checking how values change.','コンソールに文字や値を表示します。値の変化を確かめるときに使います。','在控制台显示文字或数值，用于检查数值变化。'],
 '인스펙터에 보이는 변수 만들기':['Variables shown in the Inspector','インスペクターに表示される変数','在检查器中显示的变量'],'public 변수는 인스펙터에 나타나서 값을 바로 바꿀 수 있어요. [Header]로 제목을 붙일 수 있어요.':['Public variables appear in the Inspector so you can edit them. [Header] adds a heading.','public 変数はインスペクターに表示され、すぐ値を変えられます。[Header] で見出しを付けられます。','public 变量会显示在检查器中，可直接修改。[Header] 可加标题。'],
 'Start · Update 기본 틀':['Start · Update template','Start · Update の基本形','Start · Update 基本框架'],'Start는 시작할 때 한 번, Update는 매 프레임 불린다.':['Start runs once at the beginning, Update runs every frame.','Start は最初に一度、Update は毎フレーム呼ばれます。','Start 在开始时调用一次，Update 每帧调用。'],
 '다른 오브젝트 찾기':['Find another object','他のオブジェクトを探す','查找其他对象'],'이름으로 씬의 게임 오브젝트를 찾는다. UI 요소 이름도 찾을 수 있다.':['Finds a game object in the scene by name. UI element names work too.','名前でシーンのゲームオブジェクトを探します。UI 要素の名前も探せます。','按名称查找场景中的游戏对象，也可查找 UI 元素。'],
 '다른 오브젝트의 컴포넌트 쓰기':['Use another object’s component','他のオブジェクトのコンポーネントを使う','使用其他对象的组件'],'찾은 오브젝트에서 GetComponent로 컴포넌트를 꺼낸다.':['Gets a component from a found object with GetComponent.','見つけたオブジェクトから GetComponent でコンポーネントを取り出します。','用 GetComponent 从找到的对象取出组件。'],
 '오브젝트 켜고 끄기':['Turn objects on and off','オブジェクトのオン・オフ','开启和关闭对象'],'SetActive(false)로 숨기고 true로 다시 보이게 한다.':['SetActive(false) hides it, true shows it again.','SetActive(false) で隠し、true で再表示します。','SetActive(false) 隐藏，true 重新显示。'],
 '오브젝트 없애기':['Destroy an object','オブジェクトを消す','销毁对象'],'Destroy로 오브젝트를 씬에서 지운다. (아이템 먹기 · 적 처치)':['Destroy removes the object from the scene. (picking up items · defeating enemies)','Destroy でオブジェクトをシーンから消します。（アイテム取得・敵の撃破）','Destroy 从场景中移除对象。（拾取物品 · 击败敌人）'],
 '주인공 가져오기':['Get the hero','主人公を取得','获取主角'],'Hero.main은 씬의 주인공이다. 몬스터 · NPC 스크립트에서 주인공 위치나 체력을 볼 때 쓴다.':['Hero.main is the scene’s hero. Use it in monster or NPC scripts to read the hero’s position or HP.','Hero.main はシーンの主人公です。モンスター・NPC のスクリプトで主人公の位置や体力を見るときに使います。','Hero.main 是场景的主角。在怪物 · NPC 脚本中查看主角位置或体力时使用。'],
 '키를 눌렀을 때':['When a key is pressed','キーを押したとき','按下按键时'],'GetKeyDown은 키를 누른 그 순간 한 번만 true이다.':['GetKeyDown is true only on the frame the key is pressed.','GetKeyDown はキーを押した瞬間だけ true です。','GetKeyDown 只在按下的那一帧为 true。'],
 '키를 누르고 있는 동안':['While a key is held','キーを押している間','按住按键期间'],'GetKey는 누르고 있는 동안 계속 true이다. GetKeyUp은 뗀 순간이다.':['GetKey stays true while held. GetKeyUp is the moment it’s released.','GetKey は押している間ずっと true です。GetKeyUp は離した瞬間です。','GetKey 在按住期间一直为 true，GetKeyUp 是松开的瞬间。'],
 '방향키 · WASD로 움직이기':['Move with arrows · WASD','矢印キー・WASD で移動','用方向键 · WASD 移动'],'GetAxisRaw로 -1~1 방향을 읽고, 주인공 컴포넌트의 Move로 움직인다.':['Reads a -1~1 direction with GetAxisRaw and moves with the Hero component’s Move.','GetAxisRaw で -1~1 の方向を読み、主人公コンポーネントの Move で動かします。','用 GetAxisRaw 读取 -1~1 方向，并用主角组件的 Move 移动。'],
 '마우스 클릭':['Mouse click','マウスクリック','鼠标点击'],'GetMouseButtonDown(0)은 왼쪽, (1)은 오른쪽 버튼이다.':['GetMouseButtonDown(0) is the left button, (1) is the right.','GetMouseButtonDown(0) は左、(1) は右ボタンです。','GetMouseButtonDown(0) 为左键，(1) 为右键。'],
 '위치 바꾸기':['Set the position','位置を変える','改变位置'],'transform.position에 새 좌표를 넣으면 바로 그 자리로 옮겨진다.':['Assigning transform.position moves it there instantly.','transform.position に新しい座標を入れるとすぐ移動します。','给 transform.position 赋新坐标即可立即移动。'],
 '일정한 속도로 움직이기':['Move at a steady speed','一定の速さで動かす','匀速移动'],'Time.deltaTime을 곱하면 컴퓨터 속도와 상관없이 1초에 speed만큼 움직인다.':['Multiplying by Time.deltaTime moves speed units per second on any computer.','Time.deltaTime を掛けるとパソコンの速さに関係なく 1 秒に speed だけ動きます。','乘以 Time.deltaTime 后，无论电脑快慢每秒都移动 speed。'],
 '목표 지점으로 다가가기':['Move toward a target','目標へ近づく','向目标靠近'],'MoveTowards는 목표를 넘어가지 않게 한 걸음씩 다가간다.':['MoveTowards steps closer without overshooting the target.','MoveTowards は目標を越えないように少しずつ近づきます。','MoveTowards 逐步靠近且不会越过目标。'],
 '두 위치 사이 거리':['Distance between two points','2 点間の距離','两点之间的距离'],'Vector2.Distance로 두 점 사이의 거리(칸)를 잰다.':['Vector2.Distance measures the distance (in tiles) between two points.','Vector2.Distance で 2 点間の距離（マス）を測ります。','用 Vector2.Distance 测量两点间的距离（格）。'],
 '주인공 따라가기':['Follow the hero','主人公を追いかける','跟随主角'],'주인공이 가까이 오면 그쪽으로 다가간다. (몬스터 · 펫)':['Moves toward the hero when it gets close. (monsters · pets)','主人公が近づくとそちらへ向かいます。（モンスター・ペット）','主角靠近时向其移动。（怪物 · 宠物）'],
 '왔다 갔다 순찰하기':['Patrol back and forth','行ったり来たり巡回','来回巡逻'],'두 지점 사이를 계속 오간다. (움직이는 발판 · 순찰 적)':['Keeps moving between two points. (moving platforms · patrolling enemies)','2 点の間を往復し続けます。（動く足場・巡回する敵）','在两点之间来回移动。（移动平台 · 巡逻敌人）'],
 '빙글빙글 돌리기':['Spin around','くるくる回す','旋转'],'Rotate로 매 프레임 조금씩 돌린다.':['Rotate turns it a little every frame.','Rotate で毎フレーム少しずつ回します。','用 Rotate 每帧旋转一点。'],
 '크기 바꾸기':['Change the size','大きさを変える','改变大小'],'localScale로 크기를 바꾼다. 1이 원래 크기이다.':['Change size with localScale. 1 is the original size.','localScale で大きさを変えます。1 が元の大きさです。','用 localScale 改变大小，1 为原始大小。'],
 '애니메이션 바꾸기':['Change animation','アニメーションを変える','切换动画'],'Animator의 파라미터를 바꿔 애니메이터 창의 전환을 일으킨다.':['Change Animator parameters to trigger transitions from the Animator window.','Animator のパラメーターを変えてアニメーター画面の遷移を起こします。','修改 Animator 参数以触发动画器窗口中的过渡。'],
 '소리 재생하기':['Play a sound','音を再生','播放声音'],'AudioSource 컴포넌트에서 고른 소리를 재생한다.':['Plays the sound chosen in the AudioSource component.','AudioSource コンポーネントで選んだ音を再生します。','播放 AudioSource 组件中选择的声音。'],
 '화면 효과 서서히 켜기 (볼륨)':['Fade in screen effects (Volume)','画面効果をゆっくりオン（ボリューム）','逐渐开启画面效果（体积）'],'Volume의 weight를 0에서 1로 천천히 올려 후처리 효과(공포 · 회상 …)를 부드럽게 켠다.':['Raises the Volume’s weight from 0 to 1 slowly to fade in post-processing (horror, flashback…).','Volume の weight を 0 から 1 へゆっくり上げて、ポストエフェクト（ホラー・回想…）をなめらかにオンにします。','将 Volume 的 weight 从 0 慢慢升到 1，平滑开启后期效果（恐怖、回忆…）。'],
 '빛 밝기 바꾸기':['Change light brightness','光の明るさを変える','改变灯光亮度'],'Light 컴포넌트의 밝기 · 색을 바꾼다.':['Changes the Light component’s brightness · color.','Light コンポーネントの明るさ・色を変えます。','改变 Light 组件的亮度 · 颜色。'],
 '타이머 (몇 초마다)':['Timer (every N seconds)','タイマー（N 秒ごと）','计时器（每隔 N 秒）'],'시간을 더해 가다가 정해 둔 초가 지나면 할 일을 하고 0으로 되돌린다.':['Adds up time and, once the set seconds pass, does the job and resets to 0.','時間を足していき、決めた秒数が過ぎたら処理して 0 に戻します。','累加时间，达到设定秒数后执行并归零。'],
 '몇 초 뒤에 한 번':['Once after N seconds','N 秒後に一度','N 秒后执行一次'],'남은 시간을 줄여 가다가 0이 되면 한 번만 실행한다.':['Counts down and runs once when it reaches 0.','残り時間を減らしていき、0 になったら一度だけ実行します。','倒计时到 0 时只执行一次。'],
 '주인공이 닿았을 때 (엔진 전용)':['When the hero touches (engine only)','主人公が触れたとき（エンジン専用）','主角接触时（引擎专用）'],'주인공이 이 오브젝트 칸에 들어오고 나갈 때 불린다.':['Called when the hero enters and leaves this object’s tile.','主人公がこのオブジェクトのマスに入る・出るときに呼ばれます。','主角进入和离开此对象所在格时调用。'],
 '말 걸었을 때 (NPC)':['When talked to (NPC)','話しかけられたとき（NPC）','被搭话时（NPC）'],'주인공이 가까이서 말 걸기(Space)를 하면 OnInteract가 불린다.':['OnInteract is called when the hero talks nearby (Space).','主人公が近くで話しかける（Space）と OnInteract が呼ばれます。','主角在附近搭话（Space）时调用 OnInteract。'],
 '대화창 띄우기':['Show a dialog','会話ウィンドウを表示','显示对话框'],'대화창을 연다. 열려 있는 동안 게임이 멈추고 Space로 닫힌다.':['Opens the dialog box. The game pauses while it’s open; Space closes it.','会話ウィンドウを開きます。開いている間はゲームが止まり、Space で閉じます。','打开对话框。打开期间游戏暂停，按 Space 关闭。'],
 '알림 메시지 띄우기':['Show a message','お知らせメッセージを表示','显示提示消息'],'화면 아래에 짧은 메시지를 몇 초 동안 보여 준다.':['Shows a short message at the bottom of the screen for a few seconds.','画面下に短いメッセージを数秒表示します。','在屏幕下方显示简短消息几秒。'],
 '아이템 얻기 · 쓰기':['Get · use items','アイテムを得る・使う','获得 · 使用物品'],'Inventory로 소지품을 더하고 빼고 개수를 센다.':['Inventory adds, removes and counts items.','Inventory で持ち物を増やし、減らし、数えます。','用 Inventory 添加、移除和统计物品。'],
 '열쇠가 있으면 문 열기':['Open a door with a key','鍵があれば扉を開ける','有钥匙就开门'],'소지품에 열쇠가 있는지 보고 문을 연다.':['Checks the inventory for a key and opens the door.','持ち物に鍵があるか調べて扉を開けます。','检查背包中是否有钥匙并开门。'],
 '아이템 먹기':['Pick up an item','アイテムを拾う','拾取物品'],'주인공이 닿으면 소지품에 넣고 사라진다.':['When the hero touches it, it goes into the inventory and disappears.','主人公が触れると持ち物に入り、消えます。','主角接触后放入背包并消失。'],
 '주인공 체력 깎기 · 회복':['Damage · heal the hero','主人公の体力を減らす・回復','扣除 · 恢复主角体力'],'TakeDamage로 피해를 주고 Heal로 회복한다.':['TakeDamage deals damage and Heal restores HP.','TakeDamage でダメージを与え、Heal で回復します。','用 TakeDamage 造成伤害，用 Heal 恢复。'],
 '함정 (닿으면 피해)':['Trap (damage on touch)','罠（触れるとダメージ）','陷阱（接触受伤）'],'주인공이 닿을 때마다 피해를 준다.':['Damages the hero each time it touches.','主人公が触れるたびにダメージを与えます。','主角每次接触都会受伤。'],
 '씬 이동하기':['Change scenes','シーンを移動','切换场景'],'이름으로 다른 씬을 불러온다.':['Loads another scene by name.','名前で別のシーンを読み込みます。','按名称加载其他场景。'],
 '게임 다시 시작':['Restart the game','ゲームを再スタート','重新开始游戏'],'체력을 채우고 시작 씬에서 다시 시작한다.':['Refills HP and restarts from the start scene.','体力を回復して開始シーンから再スタートします。','恢复体力并从起始场景重新开始。'],
 'UI 그룹 보이기 · 숨기기':['Show · hide a UI group','UI グループの表示・非表示','显示 · 隐藏 UI 组'],'계층 구조의 UI 그룹을 찾아 한 번에 보이거나 숨긴다.':['Finds a UI group in the hierarchy and shows or hides it all at once.','ヒエラルキーの UI グループを探し、まとめて表示・非表示にします。','查找层级中的 UI 组并一次性显示或隐藏。'],
 '조건문 (if · else)':['Conditions (if · else)','条件文（if · else）','条件语句（if · else）'],'조건이 맞을 때와 아닐 때 다른 일을 한다.':['Does different things depending on whether a condition is true.','条件が合うときと合わないときで別の処理をします。','根据条件是否成立执行不同操作。'],
 '반복문 (for)':['Loops (for)','繰り返し（for）','循环（for）'],'정해진 횟수만큼 되풀이한다.':['Repeats a set number of times.','決まった回数だけ繰り返します。','重复指定次数。'],
 '상태 나누기 (switch)':['Branch by state (switch)','状態で分ける（switch）','按状态分支（switch）'],'값에 따라 여러 경우로 나눈다.':['Splits into several cases depending on a value.','値によっていくつかの場合に分けます。','根据值分成多种情况。'],
 '무작위 값':['Random values','ランダムな値','随机值'],'Random.Range로 정해진 범위 안의 값을 뽑는다. 정수는 끝 값이 나오지 않는다.':['Random.Range picks a value in a range. For integers the max is excluded.','Random.Range で範囲内の値を選びます。整数では最大値は出ません。','用 Random.Range 在范围内取值。整数不包含最大值。'],
 '함수 만들기':['Write a method','関数を作る','编写函数'],'같은 일을 이름 붙여 묶어 두고 여러 번 부른다.':['Groups work under a name so you can call it many times.','同じ処理に名前を付けてまとめ、何度も呼び出します。','给相同操作命名封装，便于多次调用。'],
 '좌우 뒤집기':['Flip horizontally','左右反転','左右翻转'],'localScale의 x를 -1로 하면 그림이 좌우로 뒤집힌다. (바라보는 방향)':['Setting localScale x to -1 mirrors the sprite. (facing direction)','localScale の x を -1 にすると左右反転します。（向き）','将 localScale 的 x 设为 -1 即可左右翻转。（朝向）'],
 '카메라 확대 · 축소':['Camera zoom in · out','カメラのズーム','摄像机缩放'],'시작 카메라의 orthographicSize를 바꾼다. 작을수록 크게 보인다.':['Changes the start camera’s orthographicSize. Smaller means closer.','開始カメラの orthographicSize を変えます。小さいほど大きく見えます。','修改起始摄像机的 orthographicSize，数值越小看起来越大。'],
 '박스 콜라이더 2D의 트리거를 켜면 주인공이 들어올 때 OnTriggerEnter2D, 나갈 때 OnTriggerExit2D가 불린다.':['With Box Collider 2D’s trigger on, OnTriggerEnter2D runs when the hero enters and OnTriggerExit2D when it leaves.','Box Collider 2D のトリガーをオンにすると、主人公が入ると OnTriggerEnter2D、出ると OnTriggerExit2D が呼ばれます。','开启 Box Collider 2D 的触发器后，主角进入时调用 OnTriggerEnter2D，离开时调用 OnTriggerExit2D。'],
 '공격을 맞았을 때':['When hit by an attack','攻撃を受けたとき','被攻击时'],'주인공이 공격(휘두르기)으로 이 오브젝트를 맞히면 OnHit이 불린다. (항아리 · 상자 부수기)':['OnHit runs when the hero’s attack hits this object. (breaking pots · crates)','主人公の攻撃がこのオブジェクトに当たると OnHit が呼ばれます。（壺・箱を壊す）','主角的攻击击中此对象时调用 OnHit。（打碎罐子 · 箱子）'],
 '글자 이어 붙이기':['Join text','文字をつなげる','拼接文字'],'+ 나 $"…{값}…" 으로 글자와 값을 이어 붙인다.':['Join text and values with + or $"…{value}…".','+ や $"…{値}…" で文字と値をつなげます。','用 + 或 $"…{值}…" 拼接文字和数值。'],
 '컴포넌트 불러오기':['Get a component','コンポーネントを取得','获取组件'],'GetComponent<T>()로 이 오브젝트에 붙은 컴포넌트를 가져와 변수에 담아 둔다.':['Use GetComponent<T>() to get a component on this object and keep it in a variable.','GetComponent<T>() でこのオブジェクトのコンポーネントを取得して変数に入れます。','用 GetComponent<T>() 获取此对象上的组件并存入变量。'],
 '영역에 들어왔을 때 (트리거)':['Entering an area (trigger)','範囲に入ったとき（トリガー）','进入区域时（触发器）'],
 'help 도움말':['help = Help','help ヘルプ','help 帮助']
});
/* 2026-11 추가 도움말 (물리 · 생성 · 코루틴 · 저장 · 파티클) 번역 */
if(window.TI18N)TI18N.add({
 '물리':['Physics','物理','物理'],'생성':['Spawning','生成','生成'],
 '플랫포머 이동 · 점프':['Platformer move · jump','プラットフォーマー移動・ジャンプ','平台跳跃移动 · 跳跃'],'리지드바디 2D(중력 1)로 좌우로 걷고 Space로 점프한다. 땅에 닿아 있을 때만 점프해요.':['Walk left/right with a Rigidbody 2D (gravity 1) and jump with Space — only while touching the ground.','リジッドボディ 2D（重力 1）で左右に歩き、Space でジャンプします。地面に触れているときだけジャンプします。','用刚体 2D（重力 1）左右行走，按 Space 跳跃，仅在接触地面时可跳。'],
 '힘으로 밀기 (AddForce)':['Push with a force (AddForce)','力で押す (AddForce)','用力推动 (AddForce)'],'리지드바디 2D에 힘을 준다. Impulse는 한 번에 확 민다.':['Applies a force to a Rigidbody 2D. Impulse pushes all at once.','リジッドボディ 2D に力を加えます。Impulse は一度に強く押します。','给刚体 2D 施加力。Impulse 会一次性猛推。'],
 '부딪쳤을 때 (OnCollisionEnter2D)':['On collision (OnCollisionEnter2D)','ぶつかったとき (OnCollisionEnter2D)','碰撞时 (OnCollisionEnter2D)'],'리지드바디 2D가 벽 · 땅 · 다른 콜라이더에 부딪치면 불린다. 타일 벽 · 땅의 태그는 Ground예요.':['Called when a Rigidbody 2D hits a wall, the ground or another collider. Tile walls and ground have the tag Ground.','リジッドボディ 2D が壁・地面・他のコライダーにぶつかると呼ばれます。タイルの壁・地面のタグは Ground です。','刚体 2D 撞到墙、地面或其他碰撞体时调用。图块墙和地面的标签为 Ground。'],
 '광선 쏘기 (Raycast)':['Cast a ray (Raycast)','光線を飛ばす (Raycast)','发射射线 (Raycast)'],'한 방향으로 광선을 쏴서 처음 맞은 것을 알아낸다. (시야 · 땅 검사 · 레이저)':['Casts a ray in one direction and finds the first thing it hits (sight, ground checks, lasers).','一方向に光線を飛ばし、最初に当たったものを調べます（視界・接地判定・レーザー）。','向一个方向发射射线，找到第一个命中的物体（视野、地面检测、激光）。'],
 '주변 적 모두 찾기 (폭발 범위)':['Find all nearby enemies (blast radius)','周りの敵をすべて探す（爆発範囲）','查找周围所有敌人（爆炸范围）'],'원 안의 콜라이더를 모두 찾아 태그가 Enemy인 것만 지운다.':['Finds every collider in a circle and destroys the ones tagged Enemy.','円の中のコライダーをすべて探し、タグが Enemy のものだけ消します。','查找圆内所有碰撞体，只删除标签为 Enemy 的。'],
 '총알 쏘기 (프리팹 Instantiate)':['Shoot bullets (prefab Instantiate)','弾を撃つ（プレハブ Instantiate）','发射子弹（预制体 Instantiate）'],'프리팹을 슬롯에 넣고 Space를 누를 때마다 복제해서 날린다. 총알 프리팹에는 리지드바디 2D(스크립트로만)와 박스 콜라이더 2D(트리거)를 붙인다.':['Put a prefab in the slot; each Space press clones and fires it. Give the bullet prefab a Rigidbody 2D (Kinematic) and a Box Collider 2D (trigger).','プレハブをスロットに入れ、Space を押すたびに複製して飛ばします。弾のプレハブにはリジッドボディ 2D（スクリプトのみ）とボックスコライダー 2D（トリガー）を付けましょう。','把预制体放入槽位，每按一次 Space 就复制并发射。子弹预制体请添加刚体 2D（仅脚本）和盒形碰撞体 2D（触发器）。'],
 '적을 일정 시간마다 만들기':['Spawn enemies on a timer','一定時間ごとに敵を作る','定时生成敌人'],'InvokeRepeating으로 몇 초마다 프리팹을 무작위 위치에 만든다.':['Uses InvokeRepeating to spawn a prefab at a random spot every few seconds.','InvokeRepeating で数秒ごとにプレハブをランダムな位置に作ります。','用 InvokeRepeating 每隔几秒在随机位置生成预制体。'],
 '총알이 맞았을 때 (트리거)':['When a bullet hits (trigger)','弾が当たったとき（トリガー）','子弹命中时（触发器）'],'총알(트리거)이 적에 닿으면 적에게 피해를 주고 총알은 사라진다.':['When the bullet (trigger) touches an enemy, it damages the enemy and disappears.','弾（トリガー）が敵に触れると敵にダメージを与え、弾は消えます。','子弹（触发器）碰到敌人时对其造成伤害并消失。'],
 '코루틴으로 기다렸다 하기':['Wait, then act (coroutine)','コルーチンで待ってから実行','用协程等待后执行'],'IEnumerator와 yield return으로 시간 순서대로 일을 한다. (깜빡임 · 연출 · 순서대로 등장)':['Does things in timed order with IEnumerator and yield return (blinking, cutscenes, staggered spawns).','IEnumerator と yield return で時間順に処理します（点滅・演出・順番に登場）。','用 IEnumerator 和 yield return 按时间顺序执行（闪烁、演出、依次登场）。'],
 '깜빡이기 (무적 시간)':['Blink (invincibility)','点滅（無敵時間）','闪烁（无敌时间）'],'코루틴으로 그림을 몇 번 껐다 켠다.':['Turns the sprite off and on a few times with a coroutine.','コルーチンで絵を数回消したり表示したりします。','用协程把图像关开几次。'],
 '몇 초 뒤에 실행 (Invoke)':['Run after a delay (Invoke)','数秒後に実行 (Invoke)','几秒后执行 (Invoke)'],'Invoke로 메서드를 몇 초 뒤에 한 번 부른다.':['Calls a method once after a few seconds with Invoke.','Invoke でメソッドを数秒後に1回呼びます。','用 Invoke 在几秒后调用一次方法。'],
 '일시정지 (timeScale)':['Pause (timeScale)','一時停止 (timeScale)','暂停 (timeScale)'],'P를 누르면 게임 시간이 멈추고, 다시 누르면 이어진다.':['Press P to freeze game time; press again to resume.','P を押すとゲームの時間が止まり、もう一度押すと再開します。','按 P 暂停游戏时间，再按一次继续。'],
 '최고 점수 저장 (PlayerPrefs)':['Save a high score (PlayerPrefs)','ハイスコアを保存 (PlayerPrefs)','保存最高分 (PlayerPrefs)'],'PlayerPrefs는 게임을 꺼도 남아요. 점수가 최고 기록보다 높으면 저장한다.':['PlayerPrefs survives closing the game. Saves the score when it beats the best record.','PlayerPrefs はゲームを閉じても残ります。スコアが最高記録より高ければ保存します。','PlayerPrefs 关闭游戏后仍会保留。分数超过最高纪录时保存。'],
 '파티클 터뜨리기':['Burst particles','パーティクルを出す','喷发粒子'],'파티클 시스템을 재생하거나 지금 바로 몇 개를 뿜는다.':['Plays the particle system or emits a few particles right now.','パーティクルシステムを再生するか、今すぐいくつか出します。','播放粒子系统，或立即发射若干粒子。'],
 '카메라 흔들기':['Camera shake','カメラを揺らす','镜头抖动'],'맞았을 때 · 폭발할 때 화면을 잠깐 흔든다. (세기 칸, 시간 초)':['Briefly shakes the screen on hits or explosions (strength in cells, time in seconds).','被弾・爆発のときに画面を少し揺らします（強さはマス、時間は秒）。','受击或爆炸时短暂晃动画面（强度为格，时间为秒）。'],
 '마우스 쪽 바라보기':['Look at the mouse','マウスの方を向く','朝向鼠标'],'마우스 위치를 씬 좌표로 바꿔 그쪽으로 돌린다.':['Converts the mouse position to scene coordinates and rotates toward it.','マウスの位置をシーン座標に変えてその方向に回します。','把鼠标位置转换为场景坐标并朝其旋转。'],
 '목록 (List) 쓰기':['Using a List','リスト (List) を使う','使用列表 (List)'],'List에 값을 넣고 빼고 foreach로 하나씩 꺼낸다.':['Add and remove values in a List and go through them with foreach.','List に値を入れたり出したりして、foreach で1つずつ取り出します。','向 List 添加、移除值，并用 foreach 逐个取出。'],
 '배열 · Dictionary':['Arrays · Dictionary','配列・Dictionary','数组 · Dictionary'],'배열은 크기가 정해진 목록, Dictionary는 이름(키)으로 값을 찾는 표이다.':['An array is a fixed-size list; a Dictionary looks values up by key.','配列はサイズが決まったリスト、Dictionary は名前（キー）で値を探す表です。','数组是固定大小的列表，Dictionary 是按键查找值的表。'],
 '다른 스크립트의 값 · 함수 쓰기':['Use another script\'s values and functions','他のスクリプトの値・関数を使う','使用其他脚本的值和函数'],'GetComponent<스크립트 이름>()으로 내가 만든 스크립트를 꺼내 public 변수와 함수를 씁니다.':['Get your own script with GetComponent<ScriptName>() and use its public variables and functions.','GetComponent<スクリプト名>() で自分のスクリプトを取り出し、public 変数と関数を使います。','用 GetComponent<脚本名>() 获取自己的脚本并使用其 public 变量和函数。'],
 '태그로 찾기':['Find by tag','タグで探す','按标签查找'],'태그는 인스펙터 맨 위에서 정한다. 주인공은 기본 Player이다.':['Set tags at the top of the Inspector. The hero is Player by default.','タグはインスペクターの一番上で決めます。主人公は既定で Player です。','标签在检查器顶部设置。主角默认为 Player。']
});
