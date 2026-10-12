// Verifies the generative music engine headlessly: stubs browser APIs,
// evals the real inline script, then schedules all 64 steps of every song
// through scheduleStep with counting stubs. Fails on bad MIDI or empty songs.
// Also asserts every catalog track has its own loop (row/Now Playing/audio
// must always agree on the same song).
import fs from 'node:fs';
import { tracks } from '../data/profiles.js';

const html = fs.readFileSync('public/index.html', 'utf8');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

const songKeys = [...html.matchAll(/^\s*'(t-[a-z]+)': \{ name:/gm)].map((m) => m[1]);
const missing = tracks.map((t) => t.id).filter((id) => !songKeys.includes(id));
const extra = songKeys.filter((id) => !tracks.some((t) => t.id === id));
if (missing.length || extra.length) {
  console.error('FAIL  track/song mismatch — missing loops:', missing.join(',') || '-', '| orphan loops:', extra.join(',') || '-');
  process.exit(1);
}
console.log('PASS  every catalog track has its own loop (' + songKeys.length + ')');

function el() {
  return {
    innerHTML: '', textContent: '', hidden: true, value: '',
    classList: { add() {}, remove() {} },
    addEventListener() {}, appendChild() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; },
    style: {}, onclick: null,
  };
}
global.document = { getElementById: () => el(), createElement: () => el(), querySelectorAll: () => [] };
global.localStorage = { getItem: () => 'null', setItem: () => {} };
global.window = {};
global.fetch = () => Promise.reject(new Error('no net'));
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

const driver = `;(function(){
  audioCtx = { currentTime: 0, sampleRate: 44100, state: 'running',
    createOscillator: () => ({ type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {} }),
    createAnalyser: () => ({ fftSize: 2048, getByteTimeDomainData() {} }),
    destination: {} };
  masterGain = { gain: { value: 0 }, connect() {} };
  var perSong = {};
  var realTone = tone, realKick = kickDrum, realNoise = noiseHit;
  tone = function (o) {
    if (o.m < 20 || o.m > 100) throw new Error('MIDI out of range: ' + o.m);
    if (!(o.dur > 0)) throw new Error('bad dur');
    perSong.n = (perSong.n || 0) + 1;
  };
  kickDrum = function () { perSong.k = (perSong.k || 0) + 1; };
  noiseHit = function () { perSong.h = (perSong.h || 0) + 1; };
  var ids = Object.keys(SONGS);
  if (ids.length !== 10) throw new Error('expected 10 songs, got ' + ids.length);
  ids.forEach(function (id) {
    var S = SONGS[id];
    if (!S.name || !S.title || !S.bpm || !S.by) throw new Error(id + ' missing meta');
    if (S.prog.length !== 4) throw new Error(id + ' prog!=4 bars');
    if (S.roots.length !== 4) throw new Error(id + ' roots!=4 bars');
    perSong = {};
    var M = buildMaps(S);
    var step = 60 / S.bpm / 4;
    for (var st = 0; st < 64; st++) scheduleStep(S, M, st, st * step, step);
    var total = (perSong.n || 0) + (perSong.k || 0) + (perSong.h || 0);
    if (total < 20) throw new Error(id + ' too quiet: ' + total + ' events');
    var secs = (64 * step).toFixed(1);
    console.log('PASS  ' + S.name + ' (' + S.bpm + 'bpm, loop ' + secs + 's): ' + total + ' events {' + 'tones:' + (perSong.n||0) + ' kick:' + (perSong.k||0) + ' hats:' + (perSong.h||0) + '}');
  });
})();`;

eval(src + driver);
console.log('Music engine verified: ' + songKeys.length + ' songs, all MIDI in range, all loops non-empty.');
