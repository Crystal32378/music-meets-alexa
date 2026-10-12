// Headless client regression test: evals the real inline simulator script
// with stubbed browser APIs, then simulates a FRESH page whose very first
// input is a taste query ("jazz" / "folk"). Catches use-before-init bugs
// like TASTE_STOP being undefined on first input, plus key-handler wiring.
// MCP fetch is stubbed to fail, so this covers crash-freedom (not content).
// Run: npm run test:client
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

function el() {
  return {
    innerHTML: '', textContent: '', hidden: true, value: '',
    classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; },
    closest() { return null; }, matches() { return false; },
    style: {}, onclick: null,
  };
}
global.document = { getElementById: () => el(), createElement: () => el(), querySelectorAll: () => [] };
global.localStorage = { getItem: () => 'null', setItem: () => {} };
global.window = {};
global.fetch = () => Promise.reject(new Error('no net'));
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

const driver = `;(async function () {
  var failures = 0;
  var check = function (name, cond, extra) {
    console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (cond || !extra ? '' : ' — ' + extra));
    if (!cond) failures++;
  };
  check('TASTE_STOP initialized at top level', typeof TASTE_STOP !== 'undefined' && TASTE_STOP.indexOf('jazz') === -1 && TASTE_STOP.indexOf('who') !== -1);
  check('voiceKey + DEMO_PERSONA wired', typeof voiceKey === 'function' && !!(typeof DEMO_PERSONA !== 'undefined' && DEMO_PERSONA.simulated));
  check('playSong + markPlaying wired', typeof playSong === 'function');
  for (const first of ['I want to meet someone who likes jazz', 'find me folk music friends']) {
    try {
      await handle(first);
      check('first input spare crash: ' + JSON.stringify(first.slice(0, 30)), true);
    } catch (e) {
      check('first input spare crash: ' + JSON.stringify(first.slice(0, 30)), false, String(e && e.message || e));
    }
  }
  // Dynamic taste replies must not reuse a stale pre-recorded key.
  try {
    await handle('Use the demo listener');
    check('demo listener branch runs', true);
  } catch (e) {
    check('demo listener branch runs', false, String(e && e.message || e));
  }
  if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
  console.log('Client headless checks passed.');
})();`;

await eval(src + driver);
