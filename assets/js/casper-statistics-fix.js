/* CASPER STATISTICS SAFETY — do not replace the main renderer.
   The old route wrapper hid the last page when statistics threw,
   and it also painted global totals on sector pages. */
(function () {
  'use strict';
  window.__CASPER_STATS_PATCHED = true;
})();
