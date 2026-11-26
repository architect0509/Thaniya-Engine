/* Thaniya 테마 (다크 · 라이트 · 시스템) — 모든 페이지(index · mypage · learning · edit)가 함께 씀
 *   window.TTheme = { pref, theme, set(p), toggle(), onChange(fn), button(host, {small}) }
 *   pref : 'dark' | 'light' | 'system' (저장되는 값)   theme : 'dark' | 'light' (지금 화면에 쓰는 값)
 *   <html data-theme="light"> 를 붙이면 css/light-*.css 가 적용됨. 다른 탭 · 학습 창(iframe)도 저장소 이벤트로 따라 바뀜.
 *   <head> 위쪽에서 불러야 화면이 깜빡이지 않음. */
(function(){
  'use strict';
  if(window.TTheme)return;
  var K='thaniya.theme',PREFS=['dark','light','system'],fns=[];
  var mq=window.matchMedia?matchMedia('(prefers-color-scheme: light)'):null;
  function read(){try{var v=localStorage.getItem(K);return PREFS.indexOf(v)>=0?v:'dark'}catch(e){return 'dark'}}
  var pref=read();
  function eff(){return pref==='system'?(mq&&mq.matches?'light':'dark'):pref}
  function apply(){var t=eff(),h=document.documentElement;h.setAttribute('data-theme',t);h.style.colorScheme=t;T.pref=pref;T.theme=t}
  function emit(){fns.slice().forEach(function(f){try{f(T.theme,T.pref)}catch(e){}});syncBtns()}
  var T={pref:pref,theme:'dark',
    set:function(p){pref=PREFS.indexOf(p)>=0?p:'dark';try{localStorage.setItem(K,pref)}catch(e){}apply();emit()},
    toggle:function(){T.set(eff()==='light'?'dark':'light')},
    onChange:function(f){if(typeof f==='function')fns.push(f)},
    button:function(host,opt){
      if(!host)return null;injectCss();
      var b=document.createElement('button');b.type='button';b.className='tt-btn'+(opt&&opt.small?' sm':'');
      b.addEventListener('click',function(){T.toggle()});host.appendChild(b);btns.push(b);syncBtns();return b}};
  var btns=[];
  var SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  var MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
  function tr(s){try{return window.TI18N&&TI18N.t?TI18N.t(s):s}catch(e){return s}}
  function syncBtns(){btns.forEach(function(b){var l=T.theme==='light',lab=tr(l?'다크 모드로 전환':'라이트 모드로 전환');b.innerHTML=l?MOON:SUN;b.title=lab;b.setAttribute('aria-label',lab);b.setAttribute('aria-pressed',String(l))})}
  var cssDone=false;
  function injectCss(){if(cssDone)return;cssDone=true;var s=document.createElement('style');s.textContent=
    '.tt-btn{--h:var(--tl-h,28px);width:var(--h);height:var(--h);display:inline-grid;place-items:center;padding:0;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:inherit;cursor:pointer;transition:background .15s,border-color .15s;flex:none}'+
    '.tt-btn.sm{--h:var(--tl-h,26px)}.tt-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3)}'+
    '.tt-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'+
    '.tt-btn:focus-visible{outline:2px solid #e9bd0c;outline-offset:2px}'+
    'html[data-theme="light"] .tt-btn{border-color:rgba(0,0,0,.16);background:rgba(0,0,0,.04)}html[data-theme="light"] .tt-btn:hover{background:rgba(0,0,0,.09);border-color:rgba(0,0,0,.28)}';
    (document.head||document.documentElement).appendChild(s)}
  apply();
  if(mq){var onMq=function(){if(pref==='system'){apply();emit()}};mq.addEventListener?mq.addEventListener('change',onMq):mq.addListener&&mq.addListener(onMq)}
  window.addEventListener('storage',function(e){if(e.key===K){pref=read();apply();emit()}});
  if(window.TI18N&&TI18N.onChange)TI18N.onChange(syncBtns);else document.addEventListener('DOMContentLoaded',function(){if(window.TI18N&&TI18N.onChange)TI18N.onChange(syncBtns)});
  window.TTheme=T;
})();
