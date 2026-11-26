/* Thaniya i18n — mypage · learning · edit 공용 번역 도우미
   · 언어 선택은 index.html과 같은 localStorage 키(thaniya.lang)에 저장되어 모든 페이지가 함께 씁니다.
   · 사전은 "한국어 원문 → [English, 日本語, 中文]" 형식입니다 (lang/*.js 에서 TI18N.add 로 등록).
   · 한국어가 아닐 때만 문서를 지켜보며(MutationObserver) 화면에 나타나는 한국어 글자·title·placeholder·aria-label·alt 를
     사전에 있으면 바꿔 보여 줍니다. 원문은 기억해 두었다가 한국어로 돌아가면 그대로 되돌립니다.
   · 번역하지 않을 영역: script·style·textarea·code·pre·[contenteditable]·[data-i18n-skip]·.notranslate */
(function(){
'use strict';
if(window.TI18N)return;
var KEY='thaniya.lang',LANGS=['ko','en','ja','zh'],IDX={en:0,ja:1,zh:2};
var NAMES={ko:['한국어','KO'],en:['English','EN'],ja:['日本語','JA'],zh:['中文','ZH']};
var LOCALE={ko:'ko-KR',en:'en-US',ja:'ja-JP',zh:'zh-CN'};
var HANGUL=/[가-힣]/;
var D=Object.create(null),PAT=[],SUBS=[],SKIP='script,style,textarea,code,pre,[contenteditable=""],[contenteditable="true"],[data-i18n-skip],.notranslate';
var ATTRS=['title','placeholder','aria-label','alt'];
var lang=detect();

function detect(){
  var s=null;try{s=localStorage.getItem(KEY)}catch(e){}
  if(s&&LANGS.indexOf(s)>=0)return s;
  var n=((navigator.languages&&navigator.languages[0])||navigator.language||'ko').toLowerCase().slice(0,2);
  return LANGS.indexOf(n)>=0?n:'ko';
}

/* ---------- 문자열 번역 ---------- */
function look(s){var e=D[s];return e&&e[IDX[lang]]!=null?e[IDX[lang]]:null}
function core(s){
  if(!s||!HANGUL.test(s))return s;
  var v=look(s);if(v!=null)return v;
  for(var i=0;i<PAT.length;i++){
    var p=PAT[i],m=p.re.exec(s);if(!m)continue;
    var o=p.out[IDX[lang]];if(o==null)continue;
    var bad=false;
    o=o.replace(/\{(\d)\}|\$(\d)/g,function(_,a,b){var g=m[+(a||b)]||'';if(!a)return g;var x=tr(g);if(HANGUL.test(x))bad=true;return x});
    if(!bad)return o;
  }
  /* 「A · B」처럼 가운뎃점으로 이어진 문장은 조각마다 번역 (한국어가 남은 조각이 그대로이면 통째로 두어 반쪽 번역을 막음) */
  if(s.indexOf(' · ')>0){
    var parts=s.split(' · '),ok=true;
    for(var j=0;j<parts.length&&ok;j++){var q=tr(parts[j]);if(q===parts[j]&&HANGUL.test(q))ok=false;else parts[j]=q}
    if(ok)return parts.join(' · ');
  }
  /* 끝의 괄호 설명 「설명 (Ctrl+S)」 */
  var b=/^([\s\S]+?)\s*\(([^()]+)\)$/.exec(s);
  if(b){var h=tr(b[1]),g=tr(b[2]);if((h!==b[1]||!HANGUL.test(h))&&(g!==b[2]||!HANGUL.test(g))&&(h!==b[1]||g!==b[2]))return h+' ('+g+')'}
  /* 괄호로 감싼 말 「(스크립트)」 */
  var w=/^([(（\[])([^()（）\[\]]+)([)）\]])$/.exec(s);
  if(w){var x=tr(w[2]);if(!HANGUL.test(x))return w[1]+x+w[3]}
  /* 앞뒤 기호: 「＋ 새 폴더」「저장…」「이름:」 */
  var a=/^([^\uAC00-\uD7A3]*?)([\uAC00-\uD7A3][\s\S]*?)([…:：.!?]*)$/.exec(s);
  if(a&&(a[1]||a[3])){var c=look(a[2]);if(c!=null)return a[1]+c+a[3]}
  return s;
}
function tr(s){
  if(lang==='ko'||s==null)return s;
  s=String(s);if(!HANGUL.test(s))return s;
  var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  var c=core(m[2]);return c===m[2]?s:m[1]+c+m[3];
}
/* 코드에서 쓰는 번역: t('씬 {n}개',{n:3}) */
function t(s,vars){
  var o=lang!=='ko'&&s!=null?look(String(s)):null;if(o==null)o=tr(s);
  if(vars)o=String(o).replace(/\{(\w+)\}/g,function(x,k){return k in vars?vars[k]:x});
  return o;
}
function add(dict){for(var k in dict)if(Object.prototype.hasOwnProperty.call(dict,k))D[k]=dict[k]}
/* 패턴: [[/^씬 (\d+)개$/, ['$1 scenes','シーン $1 個','$1 个场景']], ...]  $1 = 그대로, {1} = 그 부분도 번역 */
function addPatterns(list){list.forEach(function(p){PAT.push({re:p[0] instanceof RegExp?p[0]:new RegExp(p[0]),out:p[1]})})}

/* ---------- 문서 번역 ---------- */
var TXT=new WeakMap(),ATR=new WeakMap();
function skipped(el){try{return !!(el.closest&&el.closest(SKIP))}catch(e){return false}}
function doText(n){
  var p=n.parentNode;if(!p||p.nodeType!==1)return;
  var cur=n.nodeValue,r=TXT.get(n),src=r&&cur===r.o?r.s:cur;
  if(!HANGUL.test(src)){if(r)TXT.delete(n);return}
  if(skipped(p)){if(r&&cur===r.o){n.nodeValue=r.s;TXT.delete(n)}return}
  var o=tr(src);
  if(o===src){if(r)TXT.delete(n);if(cur!==src)n.nodeValue=src;return}
  TXT.set(n,{s:src,o:o});if(cur!==o)n.nodeValue=o;
}
function doAttr(el,a){
  var cur=el.getAttribute(a);var m=ATR.get(el),r=m&&m[a];
  if(cur==null){if(r)delete m[a];return}
  var src=r&&cur===r.o?r.s:cur;
  if(!HANGUL.test(src)){if(r)delete m[a];return}
  if(el.hasAttribute('data-i18n-skip'))return;
  var o=tr(src);
  if(o===src){if(r)delete m[a];if(cur!==src)el.setAttribute(a,src);return}
  if(!m){m={};ATR.set(el,m)}
  m[a]={s:src,o:o};if(cur!==o)el.setAttribute(a,o);
}
function doEl(el){for(var i=0;i<ATTRS.length;i++)if(el.hasAttribute(ATTRS[i]))doAttr(el,ATTRS[i])}
function walk(root){
  if(!root)return;
  if(root.nodeType===3){doText(root);return}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){var tg=root.tagName;if(tg==='SCRIPT'||tg==='STYLE')return;doEl(root)}
  var d=root.ownerDocument||root,w=d.createTreeWalker(root,5,null),n;
  while((n=w.nextNode())){
    if(n.nodeType===3)doText(n);
    else{var tag=n.tagName;if(tag==='SCRIPT'||tag==='STYLE')continue;doEl(n)}
  }
}
var ROOTS=[document.documentElement],mo=null,busy=false;
function onMut(list){
  if(busy)return;busy=true;
  try{
    for(var i=0;i<list.length;i++){
      var m=list[i];
      if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j])}
      else if(m.type==='characterData')doText(m.target);
      else if(m.type==='attributes'&&m.target.nodeType===1)doAttr(m.target,m.attributeName);
    }
  }finally{busy=false}
}
var OPT={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS};
function observe(on){
  if(on){
    if(!mo)mo=new MutationObserver(onMut);
    ROOTS.forEach(function(r){try{mo.observe(r,OPT)}catch(e){}});
  }else if(mo){mo.disconnect();mo=null}
}
function syncTitle(){/* <title>은 head의 글자라 walk가 처리. 여기서는 lang 속성만 */
  ROOTS.forEach(function(r){try{(r.ownerDocument||r).documentElement.lang=lang}catch(e){}});
}
var META=null;
function meta(){
  var m=document.querySelector('meta[name="description"]');if(!m)return;
  if(META==null)META=m.getAttribute('content')||'';
  m.setAttribute('content',tr(META));
}
function refresh(){
  syncTitle();meta();
  observe(false);
  ROOTS.forEach(function(r){walk(r)});
  if(lang!=='ko')observe(true);
}
/* 다른 문서(엔진 밖으로 꺼낸 패널 창 등)도 함께 번역 */
function attach(root){
  if(!root||ROOTS.indexOf(root)>=0)return;
  ROOTS.push(root);walk(root);try{(root.ownerDocument||root).documentElement.lang=lang}catch(e){}
  if(mo)try{mo.observe(root,OPT)}catch(e){}
}
function detach(root){var i=ROOTS.indexOf(root);if(i>0)ROOTS.splice(i,1);if(mo){observe(false);if(lang!=='ko')observe(true)}}

function set(l,opt){
  if(LANGS.indexOf(l)<0)l='ko';
  if(!(opt&&opt.nosave))try{localStorage.setItem(KEY,l)}catch(e){}
  if(l===lang)return;
  var prev=lang;lang=l;
  refresh();
  pickers.forEach(function(p){p.sync()});
  SUBS.slice().forEach(function(f){try{f(lang,prev)}catch(e){console.error(e)}});
}
function onChange(f){SUBS.push(f);return function(){var i=SUBS.indexOf(f);if(i>=0)SUBS.splice(i,1)}}
/* 다른 탭 · 학습 창(iframe) · 엔진에서 언어를 바꾸면 따라감 */
addEventListener('storage',function(e){if(e.key===KEY&&e.newValue&&LANGS.indexOf(e.newValue)>=0)set(e.newValue,{nosave:true})});

/* ---------- 언어 선택 버튼 (index.html과 같은 모양) ---------- */
var pickers=[],cssDone=false;
var GLOBE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
var CHEV='<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function css(){
  if(cssDone)return;cssDone=true;
  var s=document.createElement('style');s.id='ti18n-css';
  s.textContent='.tl{position:relative;display:inline-flex}'+
  '.tl-btn{display:inline-flex;align-items:center;gap:7px;height:var(--tl-h,38px);padding:0 12px 0 11px;border-radius:999px;border:1px solid var(--tl-line,rgba(255,255,255,.16));background:var(--tl-bg,rgba(255,255,255,.04));color:var(--tl-fg,#f2f2f5);font:500 14px/1 inherit;font-family:inherit;cursor:pointer;transition:background .15s,border-color .15s;white-space:nowrap}'+
  '.tl-btn:hover,.tl-btn[aria-expanded="true"]{background:var(--tl-hover,rgba(255,255,255,.1));border-color:var(--tl-line-h,rgba(255,255,255,.28))}'+
  '.tl-btn svg{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}'+
  '.tl-btn .chev{width:14px;height:14px;opacity:.6;transition:transform .15s}.tl-btn[aria-expanded="true"] .chev{transform:rotate(180deg)}'+
  '.tl-code{display:none;font:500 12px ui-monospace,Menlo,Consolas,monospace}'+
  '.tl-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:1000;min-width:150px;margin:0;padding:6px;list-style:none;background:var(--tl-menu,#1d1d24);border:1px solid var(--tl-line,rgba(255,255,255,.16));border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.5);text-align:left}'+
  '.tl-menu[hidden]{display:none}'+
  '.tl-menu li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border-radius:9px;font-size:14px;line-height:1.3;color:var(--tl-fg,#f2f2f5);cursor:pointer}'+
  '.tl-menu li:hover,.tl-menu li:focus-visible{background:var(--tl-hover,rgba(255,255,255,.09));outline:none}'+
  '.tl-menu li[aria-selected="true"]{color:var(--tl-accent,#e9bd0c);font-weight:600}.tl-menu li[aria-selected="true"]::after{content:"\\2713";font-size:13px}'+
  '.tl.compact .tl-name{display:none}.tl.compact .tl-code{display:inline}.tl.compact .tl-btn{padding:0 9px;gap:5px}'+
  '@media (max-width:640px){.tl .tl-name{display:none}.tl .tl-code{display:inline}.tl .tl-btn{padding:0 9px;gap:5px}}';
  (document.head||document.documentElement).appendChild(s);
}
function picker(host,opt){
  opt=opt||{};css();
  var wrap=document.createElement('div');wrap.className='tl'+(opt.compact?' compact':'');wrap.setAttribute('data-i18n-skip','');
  var id='tlMenu'+pickers.length;
  wrap.innerHTML='<button type="button" class="tl-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+id+'">'+GLOBE+
    '<span class="tl-name"></span><span class="tl-code"></span>'+CHEV+'</button><ul class="tl-menu" id="'+id+'" role="listbox" hidden>'+
    LANGS.map(function(l){return '<li role="option" tabindex="-1" data-lang="'+l+'" lang="'+l+'">'+NAMES[l][0]+'</li>'}).join('')+'</ul>';
  var btn=wrap.firstChild,menu=wrap.lastChild,items=[].slice.call(menu.children);
  function sync(){
    var lab=t('언어 선택');btn.setAttribute('aria-label',lab);btn.title=lab;menu.setAttribute('aria-label',lab);
    btn.querySelector('.tl-name').textContent=NAMES[lang][0];btn.querySelector('.tl-code').textContent=NAMES[lang][1];
    items.forEach(function(li){li.setAttribute('aria-selected',li.getAttribute('data-lang')===lang?'true':'false')});
  }
  function open(o){
    menu.hidden=!o;btn.setAttribute('aria-expanded',o?'true':'false');
    if(o){var s=items.filter(function(li){return li.getAttribute('data-lang')===lang})[0]||items[0];s.focus()}
  }
  function choose(l){open(false);btn.focus();set(l)}
  btn.addEventListener('click',function(){open(menu.hidden)});
  btn.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();open(true)}});
  items.forEach(function(li,i){
    li.addEventListener('click',function(){choose(li.getAttribute('data-lang'))});
    li.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(li.getAttribute('data-lang'))}
      else if(e.key==='ArrowDown'){e.preventDefault();items[(i+1)%items.length].focus()}
      else if(e.key==='ArrowUp'){e.preventDefault();items[(i-1+items.length)%items.length].focus()}
      else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();open(false);btn.focus()}
    });
  });
  document.addEventListener('click',function(e){if(!menu.hidden&&!wrap.contains(e.target))open(false)});
  var p={el:wrap,sync:sync};pickers.push(p);sync();
  if(host)host.appendChild(wrap);
  return wrap;
}

window.TI18N={
  get lang(){return lang},LANGS:LANGS.slice(),NAMES:NAMES,
  t:t,tr:tr,add:add,addPatterns:addPatterns,set:set,onChange:onChange,
  attach:attach,detach:detach,refresh:refresh,picker:picker,
  locale:function(){return LOCALE[lang]},
  has:function(s){return !!D[s]}
};
add({'언어 선택':['Select language','言語を選択','选择语言'],'언어':['Language','言語','语言']});
document.documentElement.lang=lang;
/* 페이지가 그려지는 동안 바로 번역해 한국어가 깜빡이지 않게 함 */
if(lang!=='ko')observe(true);
document.addEventListener('DOMContentLoaded',function(){if(lang!=='ko'){walk(document.documentElement);meta()}});
})();
