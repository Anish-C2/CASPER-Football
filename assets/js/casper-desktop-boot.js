/* CASPER DESKTOP BOOT — never leave the hub stuck on the loading banner. */
(function () {
  'use strict';
  var VERSION = '20260906a';

  function root() {
    return (window.CASPER_PAGE && window.CASPER_PAGE.root) || '';
  }

  function loadJson(path, fallback) {
    return fetch(root() + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VERSION)
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }

  function tickClock() {
    var t = document.getElementById('casper-time');
    var d = document.getElementById('casper-date');
    var now = new Date();
    if (t) t.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    if (d) d.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function paintError(msg) {
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '<div class="desktop-page"><div class="desktop-hero"><div class="desktop-kicker">CASPER</div><h2>ARCHIVE DID NOT FINISH LOADING</h2><p>' +
      String(msg || 'Unknown renderer error') +
      '</p><div class="desktop-actions"><a href="' + root() + 'index.html">RELOAD HOME</a></div></div></div>';
  }

  function renderNow() {
    try {
      if (typeof window.CASPER_DESKTOP_RENDER === 'function') {
        window.CASPER_DESKTOP_RENDER();
        return document.getElementById('app') && document.getElementById('app').innerHTML.indexOf('LOADING CASPER ARCHIVE') === -1;
      }
    } catch (err) {
      paintError(err && err.message ? err.message : err);
      return true;
    }
    return false;
  }

  function clubMap(data) {
    if (!data) return {};
    if (data.clubs && typeof data.clubs === 'object' && !Array.isArray(data.clubs)) return data.clubs;
    return data;
  }

  function ownerMap(registry) {
    var owners = {};
    Object.keys(registry || {}).forEach(function (k) {
      if (String(k).charAt(0) === '_') return;
      var info = registry[k] || {};
      var name = info.name || k;
      (info.clubs || []).forEach(function (code, idx) {
        var key = String(code || '').toLowerCase();
        if (!key) return;
        if (!owners[key] || idx === 0) owners[key] = name;
      });
    });
    return owners;
  }

  function findTeamKey(teams, code) {
    if (!teams) return null;
    if (teams[code]) return code;
    var low = String(code || '').toLowerCase();
    var keys = Object.keys(teams);
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === low) return keys[i];
    }
    return null;
  }

  function emptyRegisteredTeam(code, name, owner) {
    return {
      abbr: code,
      name: name || code,
      player: owner || '',
      matches: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0,
      titles: 0, runnerUps: 0, thirds: 0, cleanSheets: 0, biggestWin: 0,
      trophies: [], form: [],
      runsFor: 0, runsAg: 0, wktsLost: 0, wktsTook: 0, ballsFaced: 0, ballsBowled: 0, sportPts: 0,
      registered: true
    };
  }

  function applyClubRegistry(data) {
    var clubs = clubMap(data);
    var owners = ownerMap(typeof STATE !== 'undefined' ? STATE.registry : {});
    Object.keys(owners).forEach(function (code) {
      if (!clubs[code]) clubs[code] = String(code).toUpperCase();
    });
    if (typeof STATE !== 'undefined') STATE.clubRegistry = clubs;

    Object.keys(STATE.sports || {}).forEach(function (sportId) {
      var sport = STATE.sports[sportId];
      if (!sport) return;
      if (!sport.teams) sport.teams = {};

      function stamp(entry, code) {
        if (!entry) return;
        var key = String(code || '').toLowerCase();
        if (clubs[key]) entry.name = clubs[key];
        else if (clubs[code]) entry.name = clubs[code];
        if (owners[key]) entry.player = owners[key];
      }

      Object.keys(clubs).forEach(function (code) {
        var existing = findTeamKey(sport.teams, code);
        if (existing) {
          stamp(sport.teams[existing], existing);
          return;
        }
        sport.teams[code] = emptyRegisteredTeam(code, clubs[code], owners[String(code).toLowerCase()]);
      });

      Object.keys(sport.teams).forEach(function (code) {
        stamp(sport.teams[code], code);
      });

      (sport.tournaments || []).forEach(function (t) {
        Object.keys(t.n || {}).forEach(function (code) {
          stamp(t.n[code], code);
        });
      });

      (sport.matches || []).forEach(function (m) {
        Object.keys(m.names || {}).forEach(function (code) {
          stamp(m.names[code], code);
        });
      });
    });
  }

  function boot() {
    var readyState = typeof STATE !== 'undefined' ? STATE : null;
    if (!readyState) {
      paintError('casper-core.js did not create STATE.');
      return;
    }

    Promise.all([
      loadJson('config.json', {}),
      loadJson('sports.json', { sports: [] }),
      loadJson('misc.json', {}),
      loadJson('player-registry.json', {}),
      loadJson('data/sectors/sector-1/clubs.json', { sector: 'sector-1', clubs: {} }),
      loadJson('data/sectors/sector-2/clubs.json', { sector: 'sector-2', clubs: {} }),
      loadJson('sectors.json', { sectors: [] })
    ]).then(function (pack) {
      readyState.config = pack[0] || {};
      readyState.sportsCfg = pack[1] || { sports: [] };
      readyState.misc = pack[2] || {};
      readyState.registry = Object.assign({}, pack[3] || {}, readyState.config.playerRegistry || {});
      readyState.clubRegistry = Object.assign({}, (pack[4] && pack[4].clubs) || {}, (pack[5] && pack[5].clubs) || {});
      readyState.sectorRegistry = pack[6] || { sectors: [] };
      readyState.sectorClubs = {
        'sector-1': (pack[4] && pack[4].clubs) || {},
        'sector-2': (pack[5] && pack[5].clubs) || {}
      };
      var list = (readyState.sportsCfg.sports || []).slice();
      var chain = Promise.resolve();
      list.forEach(function (cfg) {
        chain = chain.then(function () {
          return fetch(root() + (cfg.manifest || '') + '?v=' + VERSION)
            .then(function (r) { return r.ok ? r.json() : []; })
            .catch(function () { return []; })
            .then(function (files) {
              if (!Array.isArray(files)) files = [];
              var tours = [];
              var filesChain = Promise.resolve();
              files.forEach(function (f) {
                filesChain = filesChain.then(function () {
                  return fetch(root() + (cfg.dataDir || 'data') + '/' + f + '?v=' + VERSION)
                    .then(function (r) { return r.ok ? r.text() : ''; })
                    .then(function (text) {
                      if (text && typeof parseCSN === 'function') {
                        var parsed = parseCSN(text);
                        if (parsed && parsed.length) tours.push.apply(tours, parsed);
                      }
                    })
                    .catch(function () {});
                });
              });
              return filesChain.then(function () {
                readyState.sports[cfg.id] = typeof buildSport === 'function'
                  ? buildSport(cfg, tours)
                  : { cfg: cfg, tournaments: tours, matches: [], players: {}, teams: {}, ranked: [] };
                applyClubRegistry({ clubs: readyState.clubRegistry });
              });
            });
        });
      });
      return chain.then(function () {
        return fetch(root() + 'data/sectors/sector-2/Season_2026A.csn?v=' + VERSION)
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (text) {
            if (!text || typeof parseCSN !== 'function') return;
            var extra = parseCSN(text) || [];
            var fut = readyState.sports.futsal;
            if (!fut) return;
            var existing = {};
            (fut.tournaments || []).forEach(function (t) { if (t.meta && t.meta.id) existing[t.meta.id] = 1; });
            var fresh = extra.filter(function (t) { return t.meta && t.meta.id && !existing[t.meta.id]; });
            if (!fresh.length) return;
            var merged = (fut.tournaments || []).concat(fresh);
            readyState.sports.futsal = typeof buildSport === 'function' ? buildSport(fut.cfg, merged) : fut;
          })
          .catch(function () {});
      });
    }).then(function () {
      applyClubRegistry({ clubs: readyState.clubRegistry });
      readyState.ready = true;
      var tick = document.getElementById('ticker-items');
      if (tick && typeof generateNews === 'function') {
        try { tick.textContent = generateNews().slice(0, 8).join('  |  '); }
        catch (e) { tick.textContent = 'CASPER archive online'; }
      } else if (tick) {
        tick.textContent = 'CASPER archive online';
      }
      tickClock();
      setInterval(tickClock, 1000);
      if (!renderNow()) {
        var n = 0;
        var id = setInterval(function () {
          n += 1;
          if (renderNow() || n > 40) clearInterval(id);
        }, 50);
      }
    }).catch(function (err) {
      paintError(err && err.message ? err.message : err);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
