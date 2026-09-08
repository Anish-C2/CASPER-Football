/* CASPER HOME — federation desk matching the full portal layout. */
(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
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
  function gico(name) {
    return '<span class="material-symbols-outlined" aria-hidden="true">' + name + '</span>';
  }
  function icon(id) {
    if (id === 'football') return gico('stadium');
    if (id === 'cricket') return gico('sports_cricket');
    return gico('sports_soccer');
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
  function newsKind(item) {
    if (item && item.kind) return item.kind;
    var t = String((item && item.title) || item || '').toUpperCase();
    if (/CRICKET|TITAN|RUNS|WICKET/.test(t)) return 'cricket';
    if (/FOOTBALL|SUPERCUP|4V4/.test(t) && !/FUTSAL|FINALE|PIONEER/.test(t)) return 'football';
    if (/AWARD|SEASONAL|POINTS|TSAR|CROWN OF/.test(t)) return 'awards';
    if (/REGIST|GENERAL|SECTOR/.test(t)) return 'general';
    return 'futsal';
  }
  function asStory(item) {
    if (item && typeof item === 'object' && item.title) return item;
    var text = String(item || '');
    return { title: text, dek: '', body: '', kind: newsKind(text), tag: 'Bulletin', season: '2026A' };
  }
  function newsItems() {
    if (typeof generateNewsStories === 'function') {
      try { return generateNewsStories(); } catch (e) {}
    }
    if (typeof generateNews === 'function') {
      try { return generateNews().map(asStory); } catch (e) {}
    }
    return [];
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
    var news = newsItems().map(asStory);
    var ticker = news.slice(0, 8).map(function (n) { return n.title; });
    if (!ticker.length) ticker = ['CASPER archive online', 'Three sports. Infinite legacy.'];
    var feat = news[0] || { title: 'The archive is live', body: 'Champions, series and awards land here as soon as a CSN file is loaded.', tag: 'Desk', kind: 'awards' };
    var featTitle = feat.title;
    var featBody = feat.body || feat.dek || 'Drawn from CSN season files — champions, awards and match lines published as they land.';
    var sportCards = sportsCfg().map(function (c) {
      return '<a class="ca-sport ' + esc(c.id) + '" href="sports/' + esc(c.id) + '.html"><span class="ico">' + icon(c.id) + '</span><span><b>' + esc(c.name) + '</b><span>' + esc(blurb(c.id)) + '</span></span><span class="go">' + gico('chevron_right') + '</span></a>';
    }).join('');
    var newsRows = news.slice(0, 5).map(function (item) {
      var kind = newsKind(item);
      var blurb = item.dek || item.body || '';
      if (blurb.length > 110) blurb = blurb.slice(0, 107) + '…';
      return '<article class="ca-news"><div class="ca-thumb ca-thumb-' + kind + '"></div><div><b>' + esc(item.title) + '</b><p>' + esc(blurb) + '</p><div><span class="ca-badge bg-' + kind + '">' + esc(item.tag || kind) + '</span></div></div><div class="ca-date">' + esc(item.season || '2026A') + '</div></article>';
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
            '<div class="desktop-kicker">Competitive Athletics & Sports Promotion</div>' +
            '<h2>Three sports.<br>Infinite legacy.</h2>' +
            '<p>Futsal. Football. Cricket. United under one global system.</p>' +
            '<div class="ca-hero-actions desktop-actions">' +
              '<a class="btn-gold" href="#competitions">Explore Competitions</a>' +
              '<a class="btn-ghost" href="#archive">View Archive</a>' +
            '</div>' +
            '<div class="ca-manifesto"><span>Play.</span><span>Compete.</span><span>Achieve.</span><span>Be remembered.</span></div>' +
          '</section>' +
          '<div class="ca-ticker ticker"><span class="lbl">' + gico('campaign') + ' Latest</span><div class="items" id="ticker-items">' + esc(ticker.join('  |  ')) + '</div></div>' +
          '<div class="ca-sports">' + sportCards + '</div>' +
          '<div class="ca-stats">' +
            '<div class="ca-stat">' + gico('emoji_events') + '<div><b>' + f.comps + '</b><span>Total Competitions</span></div></div>' +
            '<div class="ca-stat">' + gico('shield') + '<div><b>' + f.clubs + '</b><span>Registered Clubs</span></div></div>' +
            '<div class="ca-stat">' + gico('groups') + '<div><b>' + f.players + '</b><span>Registered Players</span></div></div>' +
            '<div class="ca-stat">' + gico('grid_view') + '<div><b>' + sectorsN + '</b><span>Active Sectors</span></div></div>' +
            '<div class="ca-stat">' + gico('calendar_month') + '<div><b>' + seasonsN + '</b><span>Seasons Completed</span></div></div>' +
            '<div class="ca-stat">' + gico('workspace_premium') + '<div><b>' + recordsN + '</b><span>Major Records</span></div></div>' +
          '</div>' +
          '<div class="ca-lower">' +
            '<article class="ca-card ca-feature-card">' +
              '<div class="ca-hd"><span class="ca-hd-title">' + gico('star') + ' Featured</span> <a class="view-all" href="#news">View All →</a></div>' +
              '<div class="ca-feature"><div class="cap"><span class="ca-badge bg-' + esc(feat.kind || 'awards') + '">' + esc(feat.tag || 'Featured') + '</span><h4>' + esc(featTitle) + '</h4><p>' + esc(featBody) + '</p><a href="#news">Read More →</a></div></div>' +
            '</article>' +
            '<article class="ca-card"><div class="ca-hd"><span class="ca-hd-title">' + gico('newspaper') + ' Latest News</span> <a class="view-all" href="#news">View All →</a></div>' + newsRows + '</article>' +
            '<article class="ca-card"><div class="ca-hd"><span class="ca-hd-title">' + gico('event') + ' Upcoming Matches</span> <a class="view-all" href="#live-scores">View All →</a></div>' + upcoming + '</article>' +
          '</div>' +
        '</div>' +
        '<aside class="ca-rail">' +
          '<div class="ca-time"><div class="hd">' + gico('schedule') + ' CASPER TIME</div><div class="t" id="casper-time">--:--:--</div><div class="d" id="casper-date"></div></div>' +
          '<div class="ca-card"><div class="ca-hd"><span class="ca-hd-title">' + gico('scoreboard') + ' Recent Results</span> <a class="view-all" href="#results">View All →</a></div>' + results + '</div>' +
          '<div class="ca-card">' +
            '<div class="ca-hd"><span class="ca-hd-title">' + gico('leaderboard') + ' Global Rankings</span> <a class="view-all" href="#ranking">View All →</a></div>' +
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
