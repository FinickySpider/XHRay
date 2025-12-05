// Entry point executed by the userscript runtime. It simply imports the
// bootstrap function and invokes it once the page is ready.
import { bootstrap } from './core/bootstrap.js';

(function () {
  'use strict';
  // Initialise the telemetry tooling on page load
  bootstrap();
})();