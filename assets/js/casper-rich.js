/* CASPER rich stats + sector filter. Runs after the desktop renderer. */
(function () {
  'use strict';
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v) { return ((Number(v) || 0) * 100).toFixed(1) + '%'; }
  function row(a, b) { return '<div class="desktop-row"><span>' + a + '</span><b>' + b + '</b></div>'; }
  function card(t, b) { return '<div class="desktop-card"><h3>' + t + '</h3>' + (b || '<div class="desktop-muted">No rows.</div>') + '</div>'; }
  function pageSector() { return (window.CASPER_PAGE && window.CASPER_PAGE.sector) || null; }
  function sectorRec() {
    var id = pageSector();
    if (!id || !STATE.sectorRegistry) return null;
    var list = STATE.sectorRegistry.sectors || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function stageName(code) {
    return (typeof STAGE === 'object' && STAGE[code]) || code || 'Stage';
  }

  function injectHomeExtras() {
    var page = document.querySelector('.desktop-page');
    if (!page) return;
    var rec = sectorRec();
    if (rec && !page.querySelector('[data-sector-leagues]')) {
      var leagues = (rec.leagues || []).map(function (l) {
        return card(esc(l.name), row('Sport', esc(l.sport)) + row('Season', esc(l.season || '')) + row('Open', '<a class="desktop-link" href="#competition/' + encodeURIComponent(l.sourceId || l.id) + '">League page</a>'));
      }).join('');
      var wrap = document.createElement('div');
      wrap.setAttribute('data-sector-leagues', '1');
      wrap.className = 'desktop-section';
      wrap.innerHTML = '<div class="desktop-section-title">SECTOR LEAGUES</div><div class="desktop-grid3">' + leagues + '</div>';
      var stats = page.querySelector('.desktop-stats');
      if (stats && stats.parentNode) stats.parentNode.insertBefore(wrap, stats.nextSibling);
    }
    if (!rec && typeof globalRanks === 'function' && !page.querySelector('[data-global-avg]')) {
      var ranks = globalRanks().slice(0, 12).map(function (r, i) {
        return row((i + 1) + '. <a class="desktop-link" href="#team/' + encodeURIComponent(r.abbr) + '">' + esc(r.name) + '</a>', Number(r.avgRank).toFixed(2) + ' avg \u00b7 ' + Math.round(r.totalScore || 0) + ' pts');
      }).join('');
      var box = document.createElement('div');
      box.setAttribute('data-global-avg', '1');
      box.className = 'desktop-section';
      box.innerHTML = '<div class="desktop-section-title">GLOBAL AVERAGE RANK</div>' + card('CLUBS ACROSS SPORTS', ranks);
      var desks = page.querySelector('.desktop-section');
      if (desks && desks.parentNode) desks.parentNode.insertBefore(box, desks.nextSibling);
      else page.appendChild(box);
    }
  }

  function stripClubIndividualAwards() {
    var cards = document.querySelectorAll('.desktop-card');
    Array.prototype.forEach.call(cards, function (c) {
      var h = c.querySelector('h3');
      if (!h) return;
      var title = h.textContent.trim();
      if (title !== 'TROPHIES') return;
      var rows = c.querySelectorAll('.desktop-row');
      Array.prototype.forEach.call(rows, function (r) {
        var label = (r.querySelector('span') && r.querySelector('span').textContent || '').trim();
        if (!label) return;
        if (/champion|runner|third place|fourth place|^ch$|^ru$|^3p$|^4p$/i.test(label)) return;
        r.parentNode.removeChild(r);
      });
    });
  }

  function extraPlayerStats() {
    if ((location.hash || '').indexOf('#player/') !== 0) return;
    if (document.querySelector('[data-rich-player]')) return;
    var name = decodeURIComponent((location.hash || '').slice('#player/'.length));
    var hit = null;
    Object.keys(STATE.sports || {}).forEach(function (id) {
      Object.values((STATE.sports[id] && STATE.sports[id].players) || {}).forEach(function (p) {
        if (String(p.name).toLowerCase() !== name.toLowerCase()) return;
        hit = Object.assign(hit || {}, p, {
          goals: (hit ? hit.goals : 0) + (p.goals || 0),
          assists: (hit ? hit.assists : 0) + (p.assists || 0),
          matches: (hit ? hit.matches : 0) + (p.matches || 0),
          wins: (hit ? hit.wins : 0) + (p.wins || 0),
          draws: (hit ? hit.draws : 0) + (p.draws || 0),
          losses: (hit ? hit.losses : 0) + (p.losses || 0),
          conceded: (hit ? hit.conceded : 0) + (p.conceded || 0),
          hatTricks: (hit ? hit.hatTricks : 0) + (p.hatTricks || 0),
          runs: (hit ? hit.runs : 0) + (p.runs || 0),
          wickets: (hit ? hit.wickets : 0) + (p.wickets || 0),
          ballsFaced: (hit ? hit.ballsFaced : 0) + (p.ballsFaced || 0),
          innings: (hit ? hit.innings : 0) + (p.innings || 0)
        });
      });
    });
    if (!hit) return;
    var box = document.createElement('div');
    box.setAttribute('data-rich-player', '1');
    box.className = 'desktop-grid3';
    var mp = hit.matches || 0;
    box.innerHTML =
      card('SCORING', row('Goals', hit.goals || 0) + row('Non-penalty goals', hit.goals || 0) + row('Goals per match', mp ? ((hit.goals || 0) / mp).toFixed(2) : '0.00') + row('Hat-tricks', hit.hatTricks || 0) + row('Clean sheets', hit.cleanSheets || 0) + row('Goals conceded', hit.conceded || 0) + row('Goal difference', (hit.goals || 0) - (hit.conceded || 0))) +
      card('CREATING', row('Assists', hit.assists || 0) + row('G+A', (hit.goals || 0) + (hit.assists || 0)) + row('Assists per match', mp ? ((hit.assists || 0) / mp).toFixed(2) : '0.00') + row('Win rate', pct(mp ? hit.wins / mp : 0))) +
      card('CRICKET', row('Runs', hit.runs || 0) + row('Balls faced', hit.ballsFaced || 0) + row('Innings', hit.innings || 0) + row('Strike rate', hit.ballsFaced ? (((hit.runs || 0) / hit.ballsFaced) * 100).toFixed(1) : '0.0') + row('Wickets', hit.wickets || 0));
    var page = document.querySelector('.desktop-page');
    if (page) page.appendChild(box);
  }

  function extraClubStats() {
    if ((location.hash || '').indexOf('#team/') !== 0) return;
    if (document.querySelector('[data-rich-club]')) return;
    var abbr = decodeURIComponent((location.hash || '').slice('#team/'.length));
    var t = null;
    Object.keys(STATE.sports || {}).forEach(function (id) {
      var tm = STATE.sports[id] && STATE.sports[id].teams && STATE.sports[id].teams[abbr];
      if (tm) t = tm;
    });
    if (!t) return;
    var mp = t.matches || 0;
    var box = document.createElement('div');
    box.setAttribute('data-rich-club', '1');
    box.innerHTML = card('CLUB STATS', row('Matches played', t.matches || 0) + row('Win rate', pct(mp ? t.wins / mp : 0)) + row('Goals for / against', (t.gf || 0) + ' / ' + (t.ga || 0)) + row('Goal difference', (t.gf || 0) - (t.ga || 0)) + row('Goals per match', mp ? (t.gf / mp).toFixed(2) : '0.00') + row('Conceded per match', mp ? (t.ga / mp).toFixed(2) : '0.00') + row('Clean sheets', t.cleanSheets || 0) + row('Trophies', t.titles || 0));
    var page = document.querySelector('.desktop-page');
    if (page) page.appendChild(box);
  }

  function extraCompetitionStats() {
    if ((location.hash || '').indexOf('#competition/') !== 0) return;
    if (document.querySelector('[data-rich-comp]')) return;
    var id = decodeURIComponent((location.hash || '').slice('#competition/'.length));
    var hit = null;
    Object.keys(STATE.sports || {}).forEach(function (sid) {
      (STATE.sports[sid].tournaments || []).forEach(function (tn) {
        if (tn.meta && tn.meta.id === id) hit = tn;
      });
    });
    if (!hit) return;
    var goals = 0, pens = 0, clean = 0, stages = {};
    (hit.m || []).forEach(function (m) {
      goals += (m.sh || 0) + (m.sa || 0);
      if (m.p) pens++;
      if (m.kind !== 'cricket' && (m.sh === 0 || m.sa === 0)) clean++;
      var sk = m.stage || 'GS';
      if (!stages[sk]) stages[sk] = { n: 0, g: 0 };
      stages[sk].n++; stages[sk].g += (m.sh || 0) + (m.sa || 0);
    });
    var n = (hit.m || []).length;
    var box = document.createElement('div');
    box.setAttribute('data-rich-comp', '1');
    box.className = 'desktop-grid2';
    box.innerHTML = card('COMPETITION STATS', row('Matches', n) + row('Total goals / runs', goals) + row('Average / match', n ? (goals / n).toFixed(2) : '0') + row('Penalty shootouts', pens) + row('Clean sheets', clean) + row('Champion', esc((hit.aw && hit.n && hit.n[hit.aw.ch] && hit.n[hit.aw.ch].name) || (hit.aw && hit.aw.ch) || '\u2014')) + row('Runner-up', esc((hit.aw && hit.n && hit.n[hit.aw.ru] && hit.n[hit.aw.ru].name) || (hit.aw && hit.aw.ru) || '\u2014'))) + card('STAGE SPLIT', Object.keys(stages).map(function (k) { return row(esc(stageName(k)), stages[k].n + ' matches \u00b7 ' + stages[k].g + ' scored'); }).join(''));
    var page = document.querySelector('.desktop-page');
    if (page) page.appendChild(box);
  }

  function patch() {
    if (typeof STATE === 'undefined' || !STATE.ready) return;
    injectHomeExtras();
    stripClubIndividualAwards();
    extraPlayerStats();
    extraClubStats();
    extraCompetitionStats();
  }

  function wrap() {
    var prev = window.CASPER_DESKTOP_RENDER;
    if (typeof prev !== 'function' || prev.__richWrapped) return false;
    var wrapped = function () {
      var out = prev.apply(this, arguments);
      setTimeout(patch, 0);
      return out;
    };
    wrapped.__richWrapped = true;
    window.CASPER_DESKTOP_RENDER = wrapped;
    return true;
  }

  var n = 0;
  var timer = setInterval(function () { n++; if (wrap() || n > 80) clearInterval(timer); }, 25);
  window.addEventListener('hashchange', function () { setTimeout(patch, 0); });
})();
