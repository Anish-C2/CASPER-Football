/* CASPER SHELL — clock, search, theme. Initialize once. */
(function () {
  'use strict';
  if (window.__CASPER_SHELL__) return;
  window.__CASPER_SHELL__ = true;

  function $(id) { return document.getElementById(id); }

  function tickClock() {
    var now = new Date();
    var t = $('casper-time');
    var d = $('casper-date');
    if (t) t.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    if (d) d.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function bindSearch() {
    var form = document.getElementById('ca-search-form');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = (form.q && form.q.value || '').trim();
      if (!q) return;
      var root = (window.CASPER_PAGE && window.CASPER_PAGE.root) || '';
      var mode = window.CASPER_PAGE && window.CASPER_PAGE.mode;
      if (mode === 'hub' || mode === 'sport' || mode === 'sector') {
        location.hash = '#player/' + encodeURIComponent(q);
      } else {
        location.href = root + 'index.html#player/' + encodeURIComponent(q);
      }
    });
  }

  function bindTheme() {
    var btn = document.getElementById('ca-theme-toggle');
    try {
      if (localStorage.getItem('casper-theme') === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('casper-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      } catch (e) {}
    });
  }

  function bindRankTabs() {
    if (window.__CASPER_RANK_TABS__) return;
    window.__CASPER_RANK_TABS__ = true;
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-rank-tab]');
      if (!btn) return;
      var sport = btn.getAttribute('data-rank-tab');
      document.querySelectorAll('[data-rank-tab]').forEach(function (b) {
        b.classList.toggle('on', b === btn);
      });
      document.querySelectorAll('[data-rank-panel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-rank-panel') !== sport;
      });
    });
  }

  function highlightNav() {
    var path = location.pathname || '';
    var hash = (location.hash || '#home').slice(1).split('/')[0] || 'home';
    var mode = (window.CASPER_PAGE && window.CASPER_PAGE.mode) || 'hub';
    var sport = window.CASPER_PAGE && window.CASPER_PAGE.sport;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var key = a.getAttribute('data-nav');
      var on = false;
      if (key === 'home' && mode === 'hub' && (hash === 'home' || hash === '')) on = true;
      if (key === sport) on = true;
      if (key === 'sectors' && path.indexOf('/sectors') !== -1) on = true;
      if (key === 'governance' && path.indexOf('/governance') !== -1) on = true;
      if (key === 'join' && path.indexOf('/join') !== -1) on = true;
      if (key === 'api' && path.indexOf('/api') !== -1) on = true;
      if (key === 'archive' && (hash === 'archive' || hash === 'competitions')) on = true;
      if (['competitions', 'players', 'clubs', 'archive', 'governance'].indexOf(key) >= 0) {
        if (key === 'clubs' && (hash === 'teams' || hash === 'clubs')) on = true;
        if (key === 'competitions' && (hash === 'competitions' || hash === 'archive')) on = true;
        if (key === hash) on = true;
      }
      a.classList.toggle('on', on);
      a.classList.toggle('active', on);
    });
  }

  function boot() {
    tickClock();
    if (!window.__CASPER_CLOCK__) window.__CASPER_CLOCK__ = setInterval(tickClock, 1000);
    bindSearch();
    bindTheme();
    bindRankTabs();
    highlightNav();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('hashchange', highlightNav);
  window.CASPER_SHELL = { tickClock: tickClock, highlightNav: highlightNav };
})();
