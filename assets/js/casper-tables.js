/* CASPER TABLES — league tables + top scorers. No route getter/setter. */
(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pageSport() { return (window.CASPER_PAGE && window.CASPER_PAGE.sport) || null; }
  function sports() {
    var list = (typeof STATE !== 'undefined' && STATE.sportsCfg && STATE.sportsCfg.sports) || [];
    var only = pageSport();
    return only ? list.filter(function (c) { return c.id === only; }) : list;
  }
  function goalSports() { return sports().filter(function (c) { return c.scoring !== 'cricket'; }); }
  function sp(id) { return (STATE.sports && STATE.sports[id]) || { matches: [], tournaments: [], players: {}, teams: {} }; }
  function officialClub(abbr) {
    var key = String(abbr || '').toLowerCase();
    var map = (STATE && STATE.clubRegistry) || {};
    return map[key] || map[abbr] || '';
  }
  function ownerOfClub(abbr) {
    var key = String(abbr || '').toLowerCase();
    var hit = '';
    Object.keys((STATE && STATE.registry) || {}).forEach(function (k) {
      if (String(k).charAt(0) === '_') return;
      var info = STATE.registry[k] || {};
      if ((info.clubs || []).map(function (c) { return String(c).toLowerCase(); }).indexOf(key) >= 0 && !hit) {
        hit = info.name || k;
      }
    });
    return hit;
  }
  function clubLabels(codes) {
    return (codes || []).map(function (code) { return officialClub(code) || String(code).toUpperCase(); }).filter(Boolean);
  }
  function regOf(n) { return ((STATE && STATE.registry) || {})[String(n || '').toLowerCase()] || null; }
  function pLink(n) { return '<a class="desktop-link" href="#player/' + encodeURIComponent(n) + '">' + esc(n) + '</a>'; }
  function tLink(a, n) { return '<a class="desktop-link" href="#team/' + encodeURIComponent(a) + '">' + esc(n || a) + '</a>'; }
  function card(t, b) { return '<div class="desktop-card"><h3>' + t + '</h3>' + (b || '<div class="desktop-muted">No rows.</div>') + '</div>'; }
  function resOf(m) {
    if (typeof resultOf === 'function') return resultOf(m);
    if (m.p) return m.p[0] > m.p[1] ? 'H' : 'A';
    if (m.sh === m.sa) return 'D';
    return m.sh > m.sa ? 'H' : 'A';
  }
  function isSeasonal(t) { return t && t.meta && (t.meta.e === 'Seasonal Awards' || t.meta.typ === 'seasonal'); }
  function hashView() { return ((location.hash || '#home').slice(1).split('/')[0] || 'home'); }
  function htmlTable(headers, rows) {
    if (!rows || !rows.length) return '<div class="desktop-muted">No rows.</div>';
    var head = '<thead><tr>' + headers.map(function (h) {
      var num = /^(#|P|W|D|L|GF|GA|GD|Pts|G|A|HT)$/i.test(h);
      return '<th' + (num ? ' class="num"' : '') + '>' + h + '</th>';
    }).join('') + '</tr></thead>';
    var body = '<tbody>' + rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        var num = /^(#|P|W|D|L|GF|GA|GD|Pts|G|A|HT)$/i.test(headers[i] || '');
        return '<td' + (num ? ' class="num"' : '') + '>' + c + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<div class="casper-table-wrap"><table class="casper-table">' + head + body + '</table></div>';
  }
  function standHead() { return ['#', 'Club', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts']; }
  function scoreHead() { return ['#', 'Player', 'Club', 'G', 'A', 'HT']; }

  function sportStanding(c) {
    var s = sp(c.id);
    var clubs = {};
    function rowFor(code, fallback) {
      if (!clubs[code]) {
        clubs[code] = {
          abbr: code,
          name: officialClub(code) || fallback || code,
          owner: ownerOfClub(code),
          p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
        };
      }
      return clubs[code];
    }
    Object.keys(s.teams || {}).forEach(function (a) { rowFor(a, s.teams[a] && s.teams[a].name); });
    (s.matches || []).forEach(function (m) {
      var h = rowFor(m.home);
      var a = rowFor(m.away);
      h.p++; a.p++;
      h.gf += m.sh || 0; h.ga += m.sa || 0;
      a.gf += m.sa || 0; a.ga += m.sh || 0;
      var r = resOf(m);
      if (r === 'H') { h.w++; a.l++; h.pts += 3; }
      else if (r === 'A') { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    return Object.values(clubs).filter(function (r) { return r.p > 0; })
      .sort(function (a, b) { return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf; });
  }

  function standingRows(list) {
    return list.map(function (r, i) {
      return [
        (i + 1),
        tLink(r.abbr, r.name) + (r.owner ? '<div class="desktop-muted">' + esc(r.owner) + '</div>' : ''),
        r.p, r.w, r.d, r.l, r.gf, r.ga, (r.gf - r.ga), r.pts
      ];
    });
  }

  function cleanName(n) { return String(n || '').replace(/\(.*?\)/g, '').trim(); }

  function topScorers(c, n) {
    var named = {};
    function bump(name) {
      var display = cleanName(name);
      if (!display) return null;
      var k = display.toLowerCase();
      if (!named[k]) named[k] = { name: display, goals: 0, assists: 0, hats: 0 };
      return named[k];
    }
    (sp(c.id).matches || []).forEach(function (m) {
      (m.gh || []).concat(m.ga || []).forEach(function (g) {
        var p = bump(g.name); if (!p) return;
        p.goals += g.n || 0;
        if ((g.n || 0) >= 3) p.hats++;
      });
      (m.ah || []).concat(m.aa || []).forEach(function (g) {
        var p = bump(g.name); if (p) p.assists += g.n || 0;
      });
    });
    var list = Object.keys(named).length
      ? Object.values(named)
      : Object.values(sp(c.id).players || {}).map(function (p) {
        return { name: cleanName(p.name), goals: p.goals || 0, assists: p.assists || 0, hats: p.hatTricks || 0 };
      });
    return list.filter(function (p) { return (p.goals || 0) > 0 || (p.assists || 0) > 0; })
      .sort(function (a, b) { return b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name); })
      .slice(0, n || 20);
  }

  function playerClubLabel(p) {
    var info = regOf(p && p.name);
    if (info && info.clubs && info.clubs.length) return clubLabels(info.clubs).join(' \u00b7 ');
    return '\u2014';
  }

  function scorerRows(list) {
    return list.map(function (p, i) {
      return [(i + 1), pLink(p.name), esc(playerClubLabel(p)), p.goals || 0, p.assists || 0, p.hats || 0];
    });
  }

  function groupTable(t, allStages) {
    var clubs = {};
    Object.keys(t.n || {}).forEach(function (a) {
      var info = t.n[a] || {};
      clubs[a] = {
        abbr: a,
        name: officialClub(a) || info.name || a,
        owner: ownerOfClub(a) || info.player || '',
        p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
      };
    });
    (t.m || []).filter(function (m) { return allStages || !m.stage || m.stage === 'GS'; }).forEach(function (m) {
      if (!clubs[m.home] || !clubs[m.away]) return;
      var h = clubs[m.home], a = clubs[m.away];
      h.p++; a.p++;
      h.gf += m.sh || 0; h.ga += m.sa || 0;
      a.gf += m.sa || 0; a.ga += m.sh || 0;
      var r = resOf(m);
      if (r === 'H') { h.w++; a.l++; h.pts += 3; }
      else if (r === 'A') { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    });
    return Object.values(clubs).filter(function (r) { return r.p > 0; })
      .sort(function (a, b) { return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga); });
  }

  function sportBlock(c, limit, withComps) {
    var html = '<div class="desktop-grid2">' +
      card((c.name || 'SPORT').toUpperCase() + ' TABLE', htmlTable(standHead(), standingRows(sportStanding(c)))) +
      card('TOP SCORERS', htmlTable(scoreHead(), scorerRows(topScorers(c, limit || 12)))) +
      '</div>';
    if (!withComps) return html;
    (sp(c.id).tournaments || []).forEach(function (t) {
      if (isSeasonal(t)) return;
      var gs = groupTable(t, false);
      var all = groupTable(t, true);
      var use = gs.length ? gs : all;
      if (!use.length) return;
      html += card(esc((t.meta && (t.meta.e || t.meta.id)) || 'Competition') + (gs.length ? ' \u00b7 GROUP' : ' \u00b7 TABLE'), htmlTable(standHead(), standingRows(use)));
    });
    return html;
  }

  function tablesPage() {
    var list = goalSports();
    var title = pageSport() && list[0] ? String(list[0].name).toUpperCase() : 'CASPER';
    if (!list.length) {
      return '<div class="desktop-page"><div class="desktop-hero"><div class="desktop-kicker">CASPER</div><h2>TABLES</h2><p>No football or futsal archive is loaded.</p></div></div>';
    }
    return '<div class="desktop-page casper-tables-page">' +
      '<div class="desktop-hero"><div class="desktop-kicker">' + esc(title) + '</div><h2>TABLES</h2>' +
      '<p>Auto-generated from CSN matches. Club names come from clubs.json. Owners come from player-registry.json.</p></div>' +
      list.map(function (c) { return '<div class="desktop-section"><div class="desktop-section-title">' + esc(c.name).toUpperCase() + '</div>' + sportBlock(c, 20, true) + '</div>'; }).join('') +
      '</div>';
  }

  function markNav() {
    document.querySelectorAll('nav.main a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-view') === 'tables');
    });
  }

  function paintTablesPage() {
    var app = document.getElementById('app');
    if (!app) return;
    if (app.querySelector('.casper-tables-page')) return;
    app.innerHTML = tablesPage();
    markNav();
  }

  function injectHomeTables() {
    var app = document.getElementById('app');
    if (!app) return;
    var page = app.querySelector('.desktop-page');
    if (!page || page.querySelector('.casper-tables-block')) return;
    var list = goalSports();
    if (!list.length) return;
    var block = document.createElement('div');
    block.className = 'desktop-section casper-tables-block';
    block.innerHTML = '<div class="desktop-section-title">TABLES</div>' +
      list.map(function (c) { return sportBlock(c, pageSport() ? 15 : 8, !!pageSport()); }).join('');
    var stats = page.querySelector('.desktop-stats');
    if (stats && stats.nextSibling) page.insertBefore(block, stats.nextSibling);
    else if (stats) page.appendChild(block);
    else if (page.firstChild && page.firstChild.nextSibling) page.insertBefore(block, page.firstChild.nextSibling);
    else page.appendChild(block);
  }

  function patchRegistryClubs() {
    document.querySelectorAll('.desktop-card').forEach(function (card) {
      var h = card.querySelector('h3');
      if (!h || h.textContent.trim() !== 'REGISTRY') return;
      card.querySelectorAll('.desktop-row').forEach(function (r) {
        var label = r.querySelector('span');
        var val = r.querySelector('b');
        if (!label || !val || label.textContent.trim() !== 'Clubs') return;
        if (val.dataset.casperNamed === '1') return;
        var raw = val.textContent.trim();
        if (!raw || raw === '\u2014') return;
        var codes = raw.split(/[,\s]+/).filter(Boolean);
        var names = clubLabels(codes);
        if (names.length) {
          val.textContent = names.join(' \u00b7 ');
          val.dataset.casperNamed = '1';
        }
      });
    });
  }

  function tick() {
    if (typeof STATE === 'undefined' || !STATE.ready) return;
    var view = hashView();
    if (view === 'tables') {
      paintTablesPage();
      return;
    }
    if (view === 'home' || view === '') {
      var mode = window.CASPER_PAGE && window.CASPER_PAGE.mode;
      if (mode === 'sport' || mode === 'sector') injectHomeTables();
    }
    if (view.indexOf('player') === 0) patchRegistryClubs();
  }

  window.addEventListener('hashchange', function () {
    setTimeout(tick, 0);
    setTimeout(tick, 80);
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href="#tables"], a[data-view="tables"]') : null;
    if (!a) return;
    setTimeout(tick, 0);
    setTimeout(tick, 80);
  }, true);
  var n = 0;
  var timer = setInterval(function () {
    n += 1;
    tick();
    if ((typeof STATE !== 'undefined' && STATE.ready && n > 8) || n > 80) clearInterval(timer);
  }, 80);
})();
