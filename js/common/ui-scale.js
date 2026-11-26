/* ui-scale.js — 엔진 화면 크기(UI 배율)
   브라우저를 80%로 축소한 것처럼 버튼 · 글자 · 여백을 한꺼번에 줄인다.
   · 페이지의 <style> 안 px 값을 배율만큼 곱해 다시 쓴다 (원래 글은 기억해 두어 배율을 바꾸면 다시 계산)
   · 나중에 스크립트가 넣는 <style>(타임라인 · 비주얼 스크립트 · 투어 …)도 지켜보다가 같이 바꾼다
   · 1px 이하(테두리 · 머리카락 선) · @media 조건 · url(…) 안은 그대로 둔다
   · CSS zoom을 쓰지 않으므로 getBoundingClientRect · 마우스 좌표 · 캔버스 계산은 그대로 맞는다
   배율은 설정(thaniya.settings.v1.y 의 uiScale, %)에 저장된다. 기본 90% (예전 기본값 80%로 저장된 설정은 90%로 봄 · uiScaleV 2). */
(function(){
  var KEY='thaniya.settings.v1.y',DEF=90,MIN=60,MAX=130;
  var pct=DEF;
  try{var v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&+v.uiScale>=MIN&&+v.uiScale<=MAX)pct=(v.uiScaleV!==2&&Math.round(+v.uiScale)===80)?DEF:Math.round(+v.uiScale)}catch(e){}
  var orig=new WeakMap(),busy=false;
  var RX=/(@(?:media|container|supports)[^{]*)|(url\([^)]*\))|(-?(?:\d+\.\d+|\.\d+|\d+))px\b/g;
  function scaleText(t,k){
    if(k===1)return t;
    return t.replace(RX,function(m,pre,url,n){
      if(pre||url)return m;
      var x=parseFloat(n);if(!x||Math.abs(x)<=1)return m;
      var y=Math.round(x*k*100)/100;
      if(Math.abs(y)<1)y=x<0?-1:1;
      return y+'px';
    });
  }
  function doStyle(el){
    if(el.dataset&&el.dataset.uisSkip!=null)return;
    var o=orig.get(el);
    if(o==null||(el.__uisOut!=null&&el.textContent!==el.__uisOut)){o=el.textContent;orig.set(el,o)}
    var out=scaleText(o,pct/100);
    el.__uisOut=out;
    if(el.textContent!==out){busy=true;el.textContent=out;busy=false}
  }
  /* 같은 사이트의 <link rel=stylesheet>(라이트 테마 CSS 등): 규칙을 읽을 수 있으면 바꾼 <style>로 대신한다 (file://에서는 읽을 수 없어 그대로 둠) */
  function doLink(l){
    if(l.__uisDone||l.rel!=='stylesheet'||!l.href||l.href.indexOf(location.origin)!==0)return;
    var sh=l.sheet;if(!sh){if(!l.__uisWait){l.__uisWait=1;l.addEventListener('load',function(){doLink(l)})}return}
    var txt='';try{var r=sh.cssRules;for(var i=0;i<r.length;i++)txt+=r[i].cssText+'\n'}catch(e){l.__uisDone=1;return}
    l.__uisDone=1;var st=document.createElement('style');st.setAttribute('data-uis-link',l.getAttribute('href'));st.textContent=txt;
    if(l.media)st.media=l.media;l.parentNode.insertBefore(st,l.nextSibling);doStyle(st);l.disabled=true;
  }
  function all(){var s=document.getElementsByTagName('style');for(var i=0;i<s.length;i++)doStyle(s[i]);
    var L=document.querySelectorAll('link[rel=stylesheet]');for(var j=0;j<L.length;j++)doLink(L[j])}
  all();
  document.documentElement.style.setProperty('--ui-k',String(pct/100));
  /* 새로 들어오는 <style> · 내용이 바뀐 <style> */
  try{
    new MutationObserver(function(ms){
      if(busy)return;
      for(var i=0;i<ms.length;i++){var m=ms[i];
        if(m.type==='childList'){
          for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];
            if(n.nodeType!==1&&n.parentNode&&n.parentNode.tagName==='STYLE'){doStyle(n.parentNode);continue}
            if(n.tagName==='STYLE')doStyle(n);
            else if(n.getElementsByTagName){var ss=n.getElementsByTagName('style');for(var q=0;q<ss.length;q++)doStyle(ss[q])}}
          if(m.target&&m.target.tagName==='STYLE')doStyle(m.target);
        }else if(m.type==='characterData'&&m.target.parentNode&&m.target.parentNode.tagName==='STYLE')doStyle(m.target.parentNode);
      }
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }catch(e){}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);
  window.UIScale={
    get:function(){return pct},def:DEF,min:MIN,max:MAX,
    set:function(p){p=Math.round(+p);if(!(p>=MIN&&p<=MAX)||p===pct)return;pct=p;document.documentElement.style.setProperty('--ui-k',String(pct/100));all();
      try{dispatchEvent(new Event('resize'))}catch(e){}},
    refresh:all,
    scale:function(t){return scaleText(t,pct/100)}
  };
})();
