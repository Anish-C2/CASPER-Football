/* CASPER HOTFIX — statistics render + sector-local archive + 2-sector cap. */
(function () {
  'use strict';

  function sectorId() {
    return (window.CASPER_PAGE && window.CASPER_PAGE.mode === 'sector' && window.CASPER_PAGE.sector) || null;
  }
  function sectorRec() {
    var id = sectorId();
    if (!id || typeof STATE === 'undefined') return null;
    var list = (STATE.sectorRegistry && STATE.sectorRegistry.sectors) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
    });
  }
  function row(a, b) { return '<div class="desktop-row"><span>' + a + '</span><b>' + b + '</b></div>'; }
  function card(t, b) { return '<div class="desktop-card"><h3>' + t + '</h3>' + (b || '<div class="desktop-muted">No rows.</div>') + '</div>'; }
  function pLink(n) { return '<a class="desktop-link" href="#player/' + encodeURIComponent(n) + '">' + esc(n) + '</a>'; }

  function pruneToSector() {
    var s = sectorRec();
    if (!s || typeof STATE === 'undefined' || STATE.__sectorPruned) return;
    var clubs = {};
    (s.clubCodes || []).forEach(function (c) { clubs[String(c).toLowerCase()] = 1; });
    var comps = {};
    (s.competitionIds || []).forEach(function (c) { comps[c] = 1; });
    var allowed = {};
    (s.playerIds || []).forEach(function (id) { allowed['ID:' + String(id).toUpperCase()] = 1; });
    Object.keys(STATE.registry || {}).forEach(function (k) {
      if (String(k).charAt(0) === '_') return;
      var r = STATE.registry[k] || {};
      var secs = (r.sectors || []).slice(0, 2);
      if (secs.indexOf(s.id) >= 0) {
        if (r.id) allowed['ID:' + String(r.id).toUpperCase()] = 1;
        allowed['NAME:' + String(r.name || k).toLowerCase()] = 1;
      }
    });
    Object.keys(STATE.sports || {}).forEach(function (id) {
      var sport = STATE.sports[id];
      if (!sport) return;
      if ((s.sports || []).length && s.sports.indexOf(id) < 0) {
        sport.tournaments = [];
        sport.matches = [];
        sport.players = {};
        sport.teams = {};
        return;
      }
      sport.tournaments = (sport.tournaments || []).filter(function (t) {
        return !t.meta || !t.meta.id || comps[t.meta.id];
      });
      sport.matches = (sport.matches || []).filter(function (m) {
        return clubs[String(m.home || '').toLowerCase()] || clubs[String(m.away || '').toLowerCase()];
      });
      var players = {};
      Object.keys(sport.players || {}).forEach(function (k) {
        var p = sport.players[k];
        var name = String((p && p.name) || k).toLowerCase();
        var r = (STATE.registry || {})[name] || {};
        if (allowed['NAME:' + name] || (r.id && allowed['ID:' + String(r.id).toUpperCase()])) players[k] = p;
      });
      sport.players = players;
      var teams = {};
      Object.keys(sport.teams || {}).forEach(function (k) {
        if (clubs[String(k).toLowerCase()] || clubs[String((sport.teams[k] && sport.teams[k].abbr) || '').toLowerCase()]) {
          teams[k] = sport.teams[k];
        }
      });
      sport.teams = teams;
    });
    STATE.__sectorPruned = true;
  }

  function collectPlayers() {
    var map = {};
    function get(name) {
      var k = String(name || '').trim().toLowerCase();
      if (!k) return null;
      if (!map[k]) map[k] = { name: String(name).trim(), goals: 0, assists: 0, runs: 0, matches: 0, wins: 0, draws: 0, losses: 0, hats: 0 };
      return map[k];
    }
    Object.keys((typeof STATE !== 'undefined' && STATE.registry) || {}).forEach(function (k) {
      if (String(k).charAt(0) === '_') return;
      var r = STATE.registry[k] || {};
      if (sectorRec()) {
        var secs = (r.sectors || []).slice(0, 2);
        if (secs.indexOf(sectorRec().id) < 0 && (sectorRec().playerIds || []).indexOf(r.id) < 0) return;
      }
      get(r.name || k);
    });
    ((STATE.sportsCfg && STATE.sportsCfg.sports) || []).forEach(function (cfg) {
      var sp = STATE.sports[cfg.id];
      if (!sp) return;
      Object.keys(sp.players || {}).forEach(function (k) {
        var p = sp.players[k], x = get(p.name || k);
        if (!x) return;
        if (cfg.scoring === 'cricket') x.runs += Number(p.runs != null ? p.runs : (p.goals || 0));
        else { x.goals += Number(p.goals || 0); x.assists += Number(p.assists || 0); x.hats += Number(p.hatTricks || 0); }
        x.matches += Number(p.matches || 0);
        x.wins += Number(p.wins || 0);
        x.draws += Number(p.draws || 0);
        x.losses += Number(p.losses || 0);
      });
    });
    return Object.values(map);
  }

  function statisticsHTML() {
    var ps = collectPlayers();
    var ms = 0, goals = 0, runs = 0, pens = 0;
    ((STATE.sportsCfg && STATE.sportsCfg.sports) || []).forEach(function (cfg) {
      var sp = STATE.sports[cfg.id];
      if (!sp) return;
      (sp.matches || []).forEach(function (m) {
        ms += 1;
        if (m.kind === 'cricket') runs += Number(m.sh || 0) + Number(m.sa || 0);
        else goals += Number(m.sh || 0) + Number(m.sa || 0);
        if (m.p) pens += 1;
      });
    });
    var scorer = ps.filter(function (p) { return p.goals > 0; }).sort(function (a, b) { return b.goals - a.goals || b.assists - a.assists; }).slice(0, 12);
    var runner = ps.filter(function (p) { return p.matches >= 3; }).sort(function (a, b) {
      var ar = a.matches ? a.wins / a.matches : 0, br = b.matches ? b.wins / b.matches : 0;
      return br - ar || b.wins - a.wins;
    }).slice(0, 12);
    var scope = sectorRec() ? sectorRec().name + ' only' : 'Global CASPER';
    return '<div class="desktop-page">' +
      '<div class="desktop-hero"><div class="desktop-kicker">ARCHIVE</div><h2>STATISTICS</h2><p>Generated from loaded season files. Scope: ' + esc(scope) + '. Players may register in two sectors maximum.</p></div>' +
      '<div class="desktop-stats">' +
        '<div class="desktop-stat"><b>' + ps.length + '</b><span>Players</span></div>' +
        '<div class="desktop-stat"><b>' + ms + '</b><span>Matches</span></div>' +
        '<div class="desktop-stat"><b>' + goals + '</b><span>Goals</span></div>' +
        '<div class="desktop-stat"><b>' + runs + '</b><span>Runs</span></div>' +
        '<div class="desktop-stat"><b>' + pens + '</b><span>Pens</span></div>' +
      '</div>' +
      '<div class="desktop-grid2">' +
        card('TOP SCORERS', scorer.map(function (p, i) { return row((i + 1) + '. ' + pLink(p.name), p.goals + ' G \u00b7 ' + p.assists + ' A'); }).join('')) +
        card('WIN RATE \u00b7 3+ MATCHES', runner.map(function (p, i) { return row((i + 1) + '. ' + pLink(p.name), ((p.wins / p.matches) * 100).toFixed(1) + '% \u00b7 ' + p.wins + '-' + p.draws + '-' + p.losses); }).join('')) +
      '</div></div>';
  }

  function isStats() {
    var h = (location.hash || '#home').slice(1);
    return (h.split('/')[0] || 'home') === 'statistics';
  }

  function paintStats() {
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = statisticsHTML();
    document.querySelectorAll('nav.main a').forEach(function (a) {
      var on = a.getAttribute('data-view') === 'statistics';
      a.classList.toggle('active', on);
      a.classList.toggle('on', on);
    });
  }

  function wrap() {
    if (window.__CASPER_HOTFIX_ROUTE) return true;
    if (typeof window.route !== 'function') return false;
    var inner = window.route;
    function wrapped() {
      pruneToSector();
      if (isStats()) { paintStats(); return; }
      try { return inner.apply(this, arguments); }
      catch (err) {
        if (isStats()) { paintStats(); return; }
        var app = document.getElementById('app');
        if (app) app.innerHTML = '<div class="desktop-page"><div class="desktop-hero"><div class="desktop-kicker">ARCHIVE</div><h2>VIEW RECOVERED</h2><p>The previous page stayed on screen because this view crashed. It is safe to keep browsing.</p></div>' + card('DETAIL', row('Error', esc(err && err.message ? err.message : err))) + '</div>';
      }
    }
    window.route = wrapped;
    window.__CASPER_HOTFIX_ROUTE = true;
    return true;
  }

  function bootHook() {
    if (typeof STATE === 'undefined' || !STATE.ready) return false;
    pruneToSector();
    wrap();
    if (isStats()) paintStats();
    return true;
  }

  var n = 0;
  var timer = setInterval(function () {
    n += 1;
    wrap();
    if (bootHook() || n > 120) clearInterval(timer);
  }, 50);
  window.addEventListener('hashchange', function () {
    wrap();
    if (isStats()) paintStats();
  });
})();
