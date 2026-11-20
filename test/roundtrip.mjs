// Round-trip test for the BMS codec: model -> .bms -> model must be stable.
import { serializeBms, parseBms } from '../src/bms.mjs';

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const red = (a, b) => { const g = gcd(a, b); return [a / g, b / g]; };

const chart = {
  headers: { title: 'Round Trip Test', artist: 'REA', scene: 'scene_08', player: 2 },
  bpm: 180,
  notes: [
    { measure: 0, num: 0, den: 1, lane: 'air',    id: '01' },
    { measure: 0, num: 1, den: 4, lane: 'ground', id: '01' },
    { measure: 0, num: 1, den: 2, lane: 'air',    id: '0A' },
    { measure: 0, num: 3, den: 4, lane: 'ground', id: '0C' },
    // gemini double: both lanes, same tick
    { measure: 1, num: 0, den: 1, lane: 'air',    id: '0E' },
    { measure: 1, num: 0, den: 1, lane: 'ground', id: '0E' },
    // hold on air, 1/2 -> 3/4
    { measure: 1, num: 1, den: 2, lane: 'air',    id: '0F', end: { measure: 1, num: 3, den: 4 } },
    // triplet position
    { measure: 2, num: 1, den: 3, lane: 'ground', id: '10' },
  ],
};

const norm = (notes) => notes
  .map((n) => {
    const [num, den] = red(n.num, n.den);
    const e = n.end ? (() => { const [a, b] = red(n.end.num, n.end.den); return { measure: n.end.measure, num: a, den: b }; })() : null;
    return { measure: n.measure, num, den, lane: n.lane, id: n.id, end: e };
  })
  .sort((a, b) => (a.measure + a.num / a.den) - (b.measure + b.num / b.den) || a.lane.localeCompare(b.lane) || a.id.localeCompare(b.id));

const bms = serializeBms(chart);
const parsed = parseBms(bms);

const inN = JSON.stringify(norm(chart.notes), null, 0);
const outN = JSON.stringify(norm(parsed.notes), null, 0);

console.log('--- generated .bms ---');
console.log(bms);
console.log('--- parsed headers ---', JSON.stringify(parsed.headers), 'bpm=', parsed.bpm);
console.log('notes in :', chart.notes.length, ' notes out:', parsed.notes.length);

let ok = true;
function check(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); if (!cond) ok = false; }
check('note count preserved', chart.notes.length === parsed.notes.length);
check('notes round-trip exactly', inN === outN);
check('bpm preserved', parsed.bpm === chart.bpm);
check('scene header preserved', parsed.headers.scene === 'scene_08');
check('hold end preserved', parsed.notes.some((n) => n.id === '0F' && n.end && n.end.num === 3 && n.end.den === 4));

if (!ok) {
  console.log('\nEXPECTED', inN);
  console.log('ACTUAL  ', outN);
  process.exit(1);
}
console.log('\nALL PASS');
