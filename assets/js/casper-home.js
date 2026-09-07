/* CASPER HOME — federation desk matching the full portal layout. */
(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sportsCfg() {
    return ((typeof STATE !== 'undefined' && STATE.sportsCfg && STATE.sportsCfg.sports) || []);
  }
  function sportOf(id) {
    return (STATE.sports && STATE.sports[id]) || { matches: [], tournaments: [], players: {}, teams: {}, ranked: [] };
  }
  function isSeasonal(t) {
    return t && t.meta && (t.meta.e === 'Seasonal Awards' || t.meta.typ === 'seasonal');
  }
  function blurb(id) {
    return ({ futsal: 'Fast. Technical. Global.', football: 'Clubs. Nations. Passion.', cricket: 'Tradition. Strategy. Prestige.' })[id] || '';
  }
  function icon(id) {
    if (id === 'football') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 3c2.2 2.4 3.2 5.2 3.2 9S14.2 18.6 12 21c-2.2-2.4-3.2-5.2-3.2-9S9.8 5.4 12 3z"/><path d="M4 9.5h16M4 14.5h16"/></svg>';
    if (id === 'cricket') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 20l9-9"/><path d="M12.5 8.5l3 3"/><circle cx="17.5" cy="6.5" r="2.2"/><path d="M4 21h5"/></svg>';
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M8 8.5c1.4-1 2.6-1.5 4-1.5s2.6.5 4 1.5M8 15.5c1.4 1 2.6 1.5 4 1.5s2.6-.5 4-1.5M7 12h10"/></svg>';
  }
  function scoreOf(m) {
    if (!m) return '—';
    var b = m.kind === 'cricket' ? (m.sh + '/' + m.hw + ' – ' + m.sa + '/' + m.aw) : (m.sh + '–' + m.sa);
    if (m.p) b += ' (p ' + m.p[0] + '–' + m.p[1] + ')';
    return b;
  }
  function namesOf(m) {
    return {
      hn: m.names && m.names[m.home] ? m.names[m.home].name : m.home,
      an: m.names && m.names[m.away] ? m.names[m.away].name : m.away
    };
  }
  function clubName(sport, abbr) {
    var t = sport && sport.teams && sport.teams[abbr];
    return (t && t.name) || abbr || '—';
  }
  function holder(t, code) {
    var val = t.aw && t.aw[code];
    if (!val) return '';
    return (t.n && t.n[val] && t.n[val].name) || val;
  }
  function newsKind(text) {
    var t = String(text || '').toUpperCase();
    if (/CRICKET|TITAN|RUNS|WICKET/.test(t)) return 'cricket';
    if (/FOOTBALL|4V4/.test(t) && !/FUTSAL|FINALE|PIONEER/.test(t)) return 'football';
    if (/AWARD|SEASONAL|POINTS/.test(t)) return 'awards';
    if (/REGIST|GENERAL|SECTOR/.test(t)) return 'general';
    return 'futsal';
  }
  function newsTitle(text) {
    var s = String(text || '').replace(/^SEASONAL\s*·\s*/i, '').replace(/^HAT-TRICK\s*·\s*/i, '').replace(/^THRASHING\s*·\s*/i, '');
    if (s.length > 64) s = s.slice(0, 61) + '…';
    return s.replace(/\w+/g, function (w) {
      if (/^\d/.test(w) || w.length <= 2) return w;
      return w.charAt(0) + w.slice(1).toLowerCase();
    });
  }
  function newsItems() {
    if (typeof generateNews === 'function') {
      try { return generateNews(); } catch (e) {}
    }
    var items = [];
    sportsCfg().forEach(function (c) {
      var s = sportOf(c.id);
      if (typeof crownWinner === 'function') {
        var ch = crownWinner(c);
        if (ch) items.push(clubName(s, ch).toUpperCase() + ' HOLD THE ' + String(c.crown).toUpperCase());
      }
      (s.tournaments || []).forEach(function (t) {
        if (t.aw && t.aw.ch) items.push((t.meta.e || t.meta.id).toUpperCase() + ' CHAMPIONS: ' + String(holder(t, 'ch')).toUpperCase());
      });
    });
    return items;
  }
  function facts() {
    var f = { players: 0, clubs: 0, matches: 0, comps: 0 };
    var people = {}, clubs = {};
    sportsCfg().forEach(function (c) {
      var s = sportOf(c.id);
      f.matches += (s.matches || []).length;
      f.comps += (s.tournaments || []).filter(function (t) { return !isSeasonal(t); }).length;
      Object.values(s.players || {}).forEach(function (p) { if (p && p.name) people[String(p.name).toLowerCase()] = 1; });
      Object.values(s.teams || {}).forEach(function (t) { if (t && (t.abbr || t.name)) clubs[String(t.abbr || t.name).toLowerCase()] = 1; });
    });
    Object.keys(STATE.registry || {}).forEach(function (k) {
      if (String(k).charAt(0) === '_') return;
      people[String((STATE.registry[k] && STATE.registry[k].name) || k).toLowerCase()] = 1;
    });
    f.players = Object.keys(people).length;
    f.clubs = Object.keys(clubs).length;
    return f;
  }
  function allMatches() {
    var out = [];
    sportsCfg().forEach(function (c) {
      (sportOf(c.id).matches || []).forEach(function (m) { out.push({ cfg: c, m: m }); });
    });
    return out;
  }
  function inProgress() {
    var out = [];
    sportsCfg().forEach(function (c) {
      (sportOf(c.id).tournaments || []).forEach(function (t) {
        if (/progress|ongoing|live/i.test((t.meta && t.meta.sts) || '')) out.push({ cfg: c, t: t });
      });
    });
    return out;
  }
  function comps() {
    var out = [];
    sportsCfg().forEach(function (c) {
      (sportOf(c.id).tournaments || []).forEach(function (t) {
        if (!isSeasonal(t)) out.push({ cfg: c, t: t });
      });
    });
    return out;
  }
  function initial(name) {
    return String(name || '?').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || 'C';
  }
  function rankRows(id) {
    var ranked = sportOf(id).ranked || [];
    if (ranked.length) return ranked.slice(0, 5);
    return Object.values(sportOf(id).players || {}).sort(function (a, b) {
      return (b.titles || 0) - (a.titles || 0) || (b.goals || 0) - (a.goals || 0);
    }).slice(0, 5);
  }
  function isHome() {
    var h = (location.hash || '#home').slice(1).split('/')[0];
    return !h || h === 'home';
  }
  function html() {
    var f = facts();
    var sectors = ((STATE.sectorRegistry && STATE.sectorRegistry.sectors) || []);
    var sectorsN = sectors.length;
    var seasonsN = 0;
    sectors.forEach(function (s) { seasonsN += (s.seasons || []).length; });
    if (!seasonsN) seasonsN = 1;
    var recordsN = ((STATE.misc && STATE.misc.records) || []).length;
    var news = newsItems();
    var ticker = news.slice(0, 8);
    if (!ticker.length) ticker = ['CASPER archive online', 'Three sports. Infinite legacy.'];
    var featRaw = news[0] || 'CASPER archive is live.';
    var featTitle = newsTitle(featRaw);
    var featBody = /HOLD THE FINALE|FINALE CHAMPION/i.test(featRaw)
      ? 'Black Bird United are crowned champions of the Pioneer Cup / Finale from the loaded 2026A file.'
      : 'Drawn from CSN season files — champions, awards and match lines published as they land.';
    var sportCards = sportsCfg().map(function (c) {
      return '<a class="ca-sport ' + esc(c.id) + '" href="sports/' + esc(c.id) + '.html"><span class="ico">' + icon(c.id) + '</span><span><b>' + esc(c.name) + '</b><span>' + esc(blurb(c.id)) + '</span></span><span class="go">›</span></a>';
    }).join('');
    var newsRows = news.slice(0, 5).map(function (item) {
      var kind = newsKind(item);
      return '<article class="ca-news"><div class="ca-thumb ca-thumb-' + kind + '"></div><div><b>' + esc(newsTitle(item)) + '</b><div><span class="ca-badge bg-' + kind + '">' + esc(kind) + '</span></div></div><div class="ca-date">2026A</div></article>';
    }).join('') || '<div class="desktop-muted">News will appear when CSN awards and results load.</div>';
    var upcoming = inProgress().map(function (x) {
      return '<div class="ca-match"><span>' + icon(x.cfg.id) + '</span><div><b>' + esc(x.t.meta.e || x.t.meta.id) + '</b><div class="desktop-muted">' + esc(x.cfg.name) + ' · ' + esc(x.t.meta.sts || 'In progress') + '</div></div></div>';
    }).join('');
    if (!upcoming) {
      upcoming = comps().slice(0, 4).map(function (x) {
        return '<div class="ca-match"><span>' + icon(x.cfg.id) + '</span><div><b>' + esc(x.t.meta.e || x.t.meta.id) + '</b><div class="desktop-muted">' + esc(x.cfg.name) + ' · ' + esc(holder(x.t, 'ch') || x.t.meta.sts || 'Archive') + '</div></div></div>';
      }).join('');
    }
    var results = allMatches().slice().reverse().slice(0, 4).map(function (x) {
      var nm = namesOf(x.m);
      return '<div class="ca-result"><span class="ico">' + icon(x.cfg.id) + '</span><div><b>' + esc(x.m.event || x.cfg.name) + '</b><div class="desktop-muted">' + esc(nm.hn) + ' ' + esc(scoreOf(x.m)) + ' ' + esc(nm.an) + '</div></div></div>';
    }).join('') || '<div class="desktop-muted">No results loaded.</div>';
    function rankPanel(id, hidden) {
      var rows = rankRows(id).map(function (r, i) {
        var name = r.name || r.player || r.abbr || '—';
        var pts = r.sportPts != null ? Math.round(r.sportPts) : ((r.titles || 0) * 100 + (r.goals || r.runs || 0));
        return '<div class="ca-rank"><b>' + (i + 1) + '</b><span class="ca-avatar mini">' + esc(initial(name)) + '</span><span>' + esc(name) + '</span><em>' + Number(pts).toLocaleString() + '</em></div>';
      }).join('') || '<div class="desktop-muted">No ranking yet.</div>';
      return '<div data-rank-panel="' + id + '"' + (hidden ? ' hidden' : '') + '>' + rows + '</div>';
    }
    return '<div class="desktop-page ca-home">' +
      '<div class="ca-stage">' +
        '<div class="ca-maincol">' +
          '<section class="ca-hero hero-home desktop-hero">' +
            '<div class="desktop-kicker">Competitive Athletics &amp; Sports Promotion</div>' +
            '<h2>Three sports.<br>Infinite legacy.</h2>' +
            '<p>Futsal. Football. Cricket. United under one global system.</p>' +
            '<div class="ca-hero-actions desktop-actions">' +
              '<a class="btn-gold" href="#competitions">Explore Competitions</a>' +
              '<a class="btn-ghost" href="#archive">View Archive</a>' +
            '</div>' +
            '<div class="ca-manifesto"><span>Play.</span><span>Compete.</span><span>Achieve.</span><span>Be remembered.</span></div>' +
          '</section>' +
          '<div class="ca-ticker ticker"><span class="lbl">Latest</span><div class="items" id="ticker-items">' + esc(ticker.join('  |  ')) + '</div></div>' +
          '<div class="ca-sports">' + sportCards + '</div>' +
          '<div class="ca-stats">' +
            '<div class="ca-stat"><b>' + f.comps + '</b><span>Total Competitions</span></div>' +
            '<div class="ca-stat"><b>' + f.clubs + '</b><span>Registered Clubs</span></div>' +
            '<div class="ca-stat"><b>' + f.players + '</b><span>Registered Players</span></div>' +
            '<div class="ca-stat"><b>' + sectorsN + '</b><span>Active Sectors</span></div>' +
            '<div class="ca-stat"><b>' + seasonsN + '</b><span>Seasons Completed</span></div>' +
            '<div class="ca-stat"><b>' + recordsN + '</b><span>Major Records</span></div>' +
          '</div>' +
          '<div class="ca-lower">' +
            '<article class="ca-card ca-feature-card">' +
              '<div class="ca-hd">Featured <a class="view-all" href="#news">View All →</a></div>' +
              '<div class="ca-feature"><div class="cap"><span class="ca-badge bg-awards">Pioneer Cup</span><h4>' + esc(featTitle) + '</h4><p>' + esc(featBody) + '</p><a href="#news">Read More →</a></div></div>' +
            '</article>' +
            '<article class="ca-card"><div class="ca-hd">Latest News <a class="view-all" href="#news">View All →</a></div>' + newsRows + '</article>' +
            '<article class="ca-card"><div class="ca-hd">Upcoming Matches <a class="view-all" href="#live-scores">View All →</a></div>' + upcoming + '</article>' +
          '</div>' +
        '</div>' +
        '<aside class="ca-rail">' +
          '<div class="ca-time"><div class="hd">CASPER TIME</div><div class="t" id="casper-time">--:--:--</div><div class="d" id="casper-date"></div></div>' +
          '<div class="ca-card"><div class="ca-hd">Recent Results <a class="view-all" href="#results">View All →</a></div>' + results + '</div>' +
          '<div class="ca-card">' +
            '<div class="ca-hd">Global Rankings <a class="view-all" href="#ranking">View All →</a></div>' +
            '<div class="ca-tabs">' +
              '<button type="button" class="on" data-rank-tab="futsal">Futsal</button>' +
              '<button type="button" data-rank-tab="football">Football</button>' +
              '<button type="button" data-rank-tab="cricket">Cricket</button>' +
            '</div>' +
            rankPanel('futsal', false) + rankPanel('football', true) + rankPanel('cricket', true) +
          '</div>' +
        '</aside>' +
      '</div>' +
      '<section class="ca-banner">' +
        '<h2>A global stage.<br>A brighter tomorrow.</h2>' +
        '<div class="nums"><div><b>3</b><span>Sports</span></div><div><b>' + sectorsN + '</b><span>Sectors</span></div><div><b>1</b><span>Community</span></div></div>' +
        '<a class="btn-gold" href="join/index.html">Join CASPER →</a>' +
      '</section>' +
    '</div>';
  }
  function paint() {
    if (typeof STATE === 'undefined' || !STATE.ready) return false;
    if ((window.CASPER_PAGE && window.CASPER_PAGE.mode) && window.CASPER_PAGE.mode !== 'hub') return false;
    if (!isHome()) return false;
    var app = document.getElementById('app');
    if (!app) return false;
    app.innerHTML = html();
    if (window.CASPER_SHELL && window.CASPER_SHELL.tickClock) window.CASPER_SHELL.tickClock();
    if (window.CASPER_SHELL && window.CASPER_SHELL.highlightNav) window.CASPER_SHELL.highlightNav();
    return true;
  }
  function wrap() {
    if (window.__CASPER_HOME_WRAP__) return true;
    var prev = window.CASPER_DESKTOP_RENDER;
    if (typeof prev !== 'function') return false;
    window.CASPER_DESKTOP_RENDER = function () {
      prev.apply(this, arguments);
      paint();
    };
    window.__CASPER_HOME_WRAP__ = true;
    return true;
  }
  var n = 0;
  var timer = setInterval(function () {
    n += 1;
    wrap();
    if ((typeof STATE !== 'undefined' && STATE.ready && paint()) || n > 120) clearInterval(timer);
  }, 40);
  window.addEventListener('hashchange', function () { setTimeout(paint, 0); });
})();
