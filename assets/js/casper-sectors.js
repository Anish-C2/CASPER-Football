/* CASPER Sector Registry UI. A sector is a physical/local CASPER operating area. */
(function(root){'use strict';
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
function siteRoot(){return (window.CASPER_PAGE && window.CASPER_PAGE.root) || '../';}
function loadJson(path, fallback){
  return fetch(siteRoot()+path).then(function(r){return r.ok?r.json():fallback}).catch(function(){return fallback});
}
function playersFor(sector, registry){
  var names=[];
  Object.keys(registry||{}).forEach(function(k){
    if(String(k).charAt(0)==='_')return;
    var r=registry[k]||{};
    var secs=(r.sectors||[]).slice(0,2);
    if(secs.indexOf(sector.id)>=0 || (sector.playerIds||[]).indexOf(r.id)>=0){
      names.push(r.name||k);
    }
  });
  names.sort();
  return names;
}
function card(s, registry){
  var l=(s.leagues||[]).length,se=(s.seasons||[]).length,p=(s.playerIds||[]).length,c=(s.clubCodes||[]).length;
  var people=playersFor(s, registry);
  if(people.length) p=people.length;
  return '<article class="sector-card"><div class="sector-head"><div><div class="sector-code">'+esc(s.code||s.id)+'</div><h3>'+esc(s.name)+'</h3><div class="sector-type">'+esc(s.type||'Operating Area')+'</div></div><span class="sector-status">'+esc(s.status||'Active')+'</span></div><p>'+esc(s.description||'CASPER operating sector.')+'</p><div class="sector-grid"><div><b>'+l+'</b><span>Leagues</span></div><div><b>'+se+'</b><span>Seasons</span></div><div><b>'+p+'</b><span>Players</span></div><div><b>'+c+'</b><span>Clubs</span></div></div><div class="sector-meta"><b>Sports</b> '+esc((s.sports||[]).join(' · ')||'Not configured')+'<br><b>League system</b> '+esc((s.leagues||[]).map(function(x){return x.name}).join(' · ')||'Not configured')+'<br><b>Players</b> '+esc(people.join(' · ')||'No registered players')+'</div><a class="sector-open" href="sector.html?id='+encodeURIComponent(s.id)+'">Open Sector →</a></article>';
}
async function render(){
  var el=document.getElementById('sector-list');
  if(!el)return;
  try{
    var pack=await Promise.all([
      loadJson('sectors.json', {sectors:[]}),
      loadJson('player-registry.json', {})
    ]);
    var items=pack[0].sectors||[];
    el.innerHTML=items.length?items.map(function(s){return card(s, pack[1])}).join(''):'<div class="sector-empty">No CASPER sectors have been registered yet.</div>';
  }catch(e){
    el.innerHTML='<div class="sector-empty"><b>Sector registry error</b><br>'+esc(e.message)+'</div>';
  }
}
root.CASPER_SECTORS={render:render};
document.addEventListener('DOMContentLoaded',render);
})(window);
