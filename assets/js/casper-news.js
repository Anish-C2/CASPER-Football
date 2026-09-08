/* CASPER news desk — writes short reports from loaded CSN files. */
(function () {
  'use strict';
  function sports() {
    var list = (STATE.sportsCfg && STATE.sportsCfg.sports) || [];
    var only = window.CASPER_PAGE && window.CASPER_PAGE.sport;
    return only ? list.filter(function (c) { return c.id === only; }) : list;
  }
  function sp(id) { return (STATE.sports && STATE.sports[id]) || { matches: [], tournaments: [], players: {}, teams: {} }; }
  function awardLabel(code) { return (STATE.config && STATE.config.awardLabels && STATE.config.awardLabels[code]) || code; }
  function ctxOf(n) { return (STATE.config && STATE.config.playerContext && STATE.config.playerContext[String(n || '').toLowerCase()]) || ''; }
  function clubName(sport, abbr) { var t = sport && sport.teams && sport.teams[abbr]; return (t && t.name) || abbr || '—'; }
  function holderName(t, code) {
    var val = t.aw && t.aw[code];
    if (!val) return '';
    return (t.n && t.n[val] && t.n[val].name) || val;
  }
  function namesOf(m) {
    return {
      hn: m.names && m.names[m.home] ? m.names[m.home].name : m.home,
      an: m.names && m.names[m.away] ? m.names[m.away].name : m.away
    };
  }
  function scoreOf(m) {
    if (!m) return '—';
    var b = m.kind === 'cricket' ? (m.sh + '/' + m.hw + ' – ' + m.sa + '/' + m.aw) : (m.sh + '–' + m.sa);
    if (m.p) b += ' (p ' + m.p[0] + '–' + m.p[1] + ')';
    if (m.et) b += ' aet';
    return b;
  }
  function resOf(m) {
    if (typeof resultOf === 'function') return resultOf(m);
    if (m.p) return m.p[0] > m.p[1] ? 'H' : 'A';
    return m.sh === m.sa ? 'D' : (m.sh > m.sa ? 'H' : 'A');
  }
  function isSeasonal(t) { return t && t.meta && (t.meta.e === 'Seasonal Awards' || t.meta.typ === 'seasonal'); }
  function firstSentence(text) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var dot = s.indexOf('. ');
    return dot > 12 ? s.slice(0, dot + 1) : s;
  }
  function stageLabel(m) {
    var raw = String((m && (m.stageLabel || m.stage)) || '');
    var map = { GS: 'group play', QF: 'the quarter-finals', SF: 'the semi-finals', F: 'the final', TP: 'the third-place match' };
    if (map[raw]) return map[raw];
    if (/^\d+$/.test(raw)) return 'Game ' + raw;
    return raw ? raw.toLowerCase() : 'the fixture';
  }
  function winnerOf(m) {
    var r = resOf(m), nm = namesOf(m);
    if (r === 'H') return { name: nm.hn, loser: nm.an };
    if (r === 'A') return { name: nm.an, loser: nm.hn };
    return null;
  }
  function finalOf(t) {
    var list = t.m || [];
    var hit = list.filter(function (m) { return m.stage === 'F' || /final/i.test(String(m.stageLabel || '')); });
    return hit.length ? hit[hit.length - 1] : list[list.length - 1] || null;
  }
  function seriesWins(t) {
    var wins = {};
    (t.m || []).forEach(function (m) {
      var r = resOf(m);
      if (r === 'H') wins[m.home] = (wins[m.home] || 0) + 1;
      else if (r === 'A') wins[m.away] = (wins[m.away] || 0) + 1;
    });
    return wins;
  }
  function story(s) {
    return {
      title: s.title, dek: s.dek || '', body: s.body || '',
      kind: s.kind || 'general', tag: s.tag || 'Bulletin',
      sport: s.sport || '', season: s.season || '2026A', weight: s.weight || 1
    };
  }
  function buildNewsStories() {
    var items = [];
    sports().forEach(function (c) {
      var s = sp(c.id);
      var sportName = c.name;
      var kind = c.id === 'football' ? 'football' : (c.id === 'cricket' ? 'cricket' : 'futsal');
      if (typeof crownWinner === 'function') {
        var crownAbbr = crownWinner(c);
        if (crownAbbr) {
          var crownClub = clubName(s, crownAbbr);
          items.push(story({
            title: crownClub + ' hold the ' + c.crown,
            dek: sportName + ' crown · Season 2026A',
            body: crownClub + ' sit at the top of the ' + sportName.toLowerCase() + ' tree as holders of the ' + c.crown + '. Every other club on the desk is now chasing that name.',
            kind: kind, tag: 'Crown', sport: sportName, weight: 100
          }));
        }
      }
      (s.tournaments || []).forEach(function (t) {
        var event = (t.meta && (t.meta.e || t.meta.id)) || 'Competition';
        var season = (t.meta && t.meta.s) || '2026A';
        var note = String(t.nt || '').replace(/\s+/g, ' ').trim();
        if (isSeasonal(t)) {
          var aw = t.aw || {};
          var keys = Object.keys(aw);
          if (keys.length) {
            var head = keys.slice(0, 4).map(function (k) { return aw[k] + ' (' + awardLabel(k) + ')'; }).join(', ');
            var leader = keys[0] ? aw[keys[0]] : '';
            var ctx = leader ? firstSentence(ctxOf(leader)) : '';
            items.push(story({
              title: 'Season 2026A locks its honours cabinet',
              dek: 'Seasonal awards · ' + keys.length + ' titles handed out',
              body: 'The year-end list is in: ' + head + (keys.length > 4 ? ' and more' : '') + '. ' + (ctx || 'Those names now sit on the federation record for the inaugural season.'),
              kind: 'awards', tag: 'Awards', sport: sportName, season: season, weight: 85
            }));
          }
          if (t.ranks && t.ranks[0]) {
            var top = t.ranks[0];
            var chase = t.ranks[1] ? ' ' + t.ranks[1].name + ' finished second' + (t.ranks[1].points != null ? ' on ' + t.ranks[1].points + ' points' : '') + '.' : '';
            items.push(story({
              title: top.name + ' wins the season points race',
              dek: 'Seasonal standings · ' + (top.points != null ? top.points + ' points' : 'table-topper'),
              body: top.name + ' closed Season 2026A at the top of the points list' + (top.points != null ? ' with ' + top.points + ' points' : '') + '.' + chase + ' The rest of the field is now measured against that mark.',
              kind: 'awards', tag: 'Standings', sport: sportName, season: season, weight: 80
            }));
          }
          return;
        }
        if (t.aw && t.aw.ch) {
          var champ = holderName(t, 'ch');
          var runner = holderName(t, 'ru');
          var fin = finalOf(t);
          var body = champ + ' are champions of the ' + event + '.';
          if (fin) {
            var nm = namesOf(fin);
            var w = winnerOf(fin);
            body += ' In ' + stageLabel(fin) + ' they finished ' + scoreOf(fin) + ' against ' + (w && w.name === champ ? w.loser : (nm.hn === champ ? nm.an : nm.hn)) + '.';
          }
          if (runner) body += ' ' + runner + ' took the silver medal.';
          if (note) body += ' ' + note.replace(/\.$/, '') + '.';
          else body += ' The result is now part of the 2026A archive.';
          var weight = /finale|pioneer/i.test(event) ? 95 : 70;
          items.push(story({
            title: champ + ' win the ' + event,
            dek: sportName + ' · ' + ((t.m || []).length) + ' matches · ' + ((t.meta && t.meta.sts) || 'Completed'),
            body: body, kind: kind, tag: 'Champions', sport: sportName, season: season, weight: weight
          }));
        } else if (/progress|ongoing|live/i.test((t.meta && t.meta.sts) || '')) {
          var wins = seriesWins(t);
          var clubs = Object.keys(t.n || {});
          var lead = clubs.slice().sort(function (a, b) { return (wins[b] || 0) - (wins[a] || 0); })[0];
          var leadName = lead && t.n[lead] ? t.n[lead].name : 'The leaders';
          var board = clubs.map(function (a) { return (t.n[a] ? t.n[a].name : a) + ' ' + (wins[a] || 0); }).join(', ');
          var last = (t.m || [])[(t.m || []).length - 1];
          var lastLine = '';
          if (last) {
            var lnm = namesOf(last);
            lastLine = ' Last out: ' + lnm.hn + ' ' + scoreOf(last) + ' ' + lnm.an + '.';
          }
          items.push(story({
            title: event + ' is still live',
            dek: sportName + ' · ' + (t.meta.sts || 'In progress'),
            body: leadName + ' currently front the series' + (board ? ' at ' + board : '') + '.' + lastLine + ' The next result can still swing the crown.',
            kind: kind, tag: 'Live', sport: sportName, season: season, weight: 110
          }));
        }
      });
      (s.matches || []).forEach(function (m) {
        var nm = namesOf(m);
        var event = m.event || c.name;
        var win = winnerOf(m);
        var diff = Math.abs((m.sh || 0) - (m.sa || 0));
        if (m.kind === 'cricket' && Math.max(m.sh || 0, m.sa || 0) >= 18 && Math.min(m.sh || 0, m.sa || 0) <= 4) {
          items.push(story({
            title: (win ? win.name : nm.hn) + ' blow the innings open',
            dek: event + ' · ' + stageLabel(m),
            body: nm.hn + ' posted ' + scoreOf(m) + ' against ' + nm.an + ' in ' + stageLabel(m) + '. In a short-format cup, that scoreboard ends the argument early.',
            kind: 'cricket', tag: 'Match report', sport: sportName, weight: 55
          }));
        } else if (m.kind !== 'cricket' && diff >= 5) {
          items.push(story({
            title: (win ? win.name : nm.hn) + ' run up a ' + scoreOf(m) + ' scoreline',
            dek: event + ' · ' + stageLabel(m),
            body: (win ? win.name : nm.hn) + ' put ' + (win ? win.loser : nm.an) + ' away ' + scoreOf(m) + ' in ' + stageLabel(m) + ' of the ' + event + '. A five-goal swing is the archive’s idea of a statement win.',
            kind: kind, tag: 'Statement', sport: sportName, weight: 50
          }));
        }
        function hatStory(g, side, opp) {
          if (!g || g.n < 3) return;
          var word = g.n >= 5 ? 'a handful' : (g.n === 4 ? 'four' : 'a hat-trick');
          items.push(story({
            title: g.name + ' hits ' + word + ' against ' + opp,
            dek: event + ' · ' + side + ' ' + scoreOf(m) + ' ' + opp,
            body: g.name + ' scored ' + g.n + ' for ' + side + ' as they met ' + opp + ' in ' + stageLabel(m) + ' of the ' + event + '. Nights like that are why the scorer board exists.',
            kind: kind, tag: 'Hat-trick', sport: sportName, weight: 60
          }));
        }
        (m.gh || []).forEach(function (g) { hatStory(g, nm.hn, nm.an); });
        (m.ga || []).forEach(function (g) { hatStory(g, nm.an, nm.hn); });
      });
    });
    var seen = {};
    return items.filter(function (x) {
      if (!x.title || seen[x.title]) return false;
      seen[x.title] = 1;
      return true;
    }).sort(function (a, b) { return b.weight - a.weight; }).slice(0, 22);
  }
  window.generateNewsStories = buildNewsStories;
  window.generateNews = function () { return buildNewsStories().map(function (s) { return s.title; }); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
    });
  }
  function newsDesk() {
    var stories = buildNewsStories();
    var blocks = stories.map(function (n) {
      return '<article class="ca-card ca-story">' +
        '<div class="ca-hd"><span class="ca-hd-title">' + esc(n.tag) + (n.sport ? ' · ' + esc(n.sport) : '') + '</span><span class="ca-date">' + esc(n.season) + '</span></div>' +
        '<h3>' + esc(n.title) + '</h3>' +
        (n.dek ? '<p class="ca-dek">' + esc(n.dek) + '</p>' : '') +
        '<p>' + esc(n.body) + '</p></article>';
    }).join('') || '<div class="ca-empty">No copy yet — load a CSN file and the desk will write.</div>';
    return '<div class="desktop-page">' +
      '<div class="desktop-hero"><div class="desktop-kicker">NEWS DESK</div><h2>Written from the results</h2><p>Champions, live series, awards and the nights that actually moved a table.</p></div>' +
      '<div class="ca-story-grid">' + blocks + '</div></div>';
  }
  function installRoute() {
    if (typeof window.route !== 'function' || window.__CASPER_NEWS_ROUTE__) return !!window.__CASPER_NEWS_ROUTE__;
    var prev = window.route;
    window.route = function () {
      var h = (location.hash || '#home').slice(1).split('/')[0];
      if (h === 'news') {
        var app = document.getElementById('app');
        if (app) app.innerHTML = newsDesk();
        return;
      }
      return prev.apply(this, arguments);
    };
    window.__CASPER_NEWS_ROUTE__ = true;
    return true;
  }
  var n = 0;
  var timer = setInterval(function () {
    n += 1;
    if (installRoute() || n > 80) clearInterval(timer);
  }, 40);
})();
