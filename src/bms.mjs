// BMS codec for Muse Dash charts: Chart model <-> .bms text.
//
// Chart model:
//   {
//     headers: { title, artist, scene, levelDesign, player, rank, playLevel },
//     bpm: Number,
//     notes: [ Note ]
//   }
//   Note = {
//     measure:Int, num:Int, den:Int,   // position = num/den within the measure, in [0,1)
//     lane:'air'|'ground',
//     id:'2-char ibms_id',
//     end?: { measure, num, den }       // present for hold notes (HOLD_IDS)
//   }
//
// Encoding rules (from CustomAlbums Data/Bms.cs):
//  - data line `#<mmm><cc>:<slots>`; mmm=measure, cc=channel, slots=2-char pairs.
//  - position in a measure = slotIndex / slotCount (beats fraction).
//  - note channel -> lane (see tables); the 2-char slot value = ibms_id.
//  - a hold = its id at the start slot and the same id, same channel, at the end slot.

import { CHANNELS, WRITE_CHANNEL, IBMS_IDS, HOLD_IDS } from './tables.mjs';

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const lcm = (a, b) => (a / gcd(a, b)) * b;
const reduce = (a, b) => { const g = gcd(a, b); return [a / g, b / g]; };
const m3 = (n) => String(n).padStart(3, '0');

// ---------------------------------------------------------------- serialize
export function serializeBms(chart) {
  const h = chart.headers || {};
  const lines = [];
  lines.push(`#PLAYER ${h.player ?? 1}`);
  if (h.scene)       lines.push(`#GENRE ${h.scene}`);
  if (h.title)       lines.push(`#TITLE ${h.title}`);
  if (h.artist)      lines.push(`#ARTIST ${h.artist}`);
  if (h.levelDesign) lines.push(`#LEVELDESIGN ${h.levelDesign}`);
  if (h.rank != null)      lines.push(`#RANK ${h.rank}`);
  if (h.playLevel != null) lines.push(`#PLAYLEVEL ${h.playLevel}`);
  lines.push(`#BPM ${chart.bpm}`);
  lines.push('');

  // Gather points: {measure, a, b, ch, id}. Holds contribute start + end points.
  const points = [];
  for (const n of chart.notes) {
    const ch = WRITE_CHANNEL[n.lane];
    if (!ch) throw new Error(`unknown lane: ${n.lane}`);
    points.push({ measure: n.measure, a: n.num, b: n.den, ch, id: n.id });
    if (n.end && HOLD_IDS.has(n.id)) {
      points.push({ measure: n.end.measure, a: n.end.num, b: n.end.den, ch, id: n.id });
    }
  }

  // Group by measure+channel, then pack into layers (overlapping data lines).
  const groups = new Map();
  for (const p of points) {
    const k = `${p.measure}|${p.ch}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(p);
  }

  const dataLines = [];
  for (const [k, pts] of groups) {
    const [measure, ch] = k.split('|');
    const D = pts.reduce((d, p) => lcm(d, p.b), 1);
    const layers = []; // each layer is an Array(D) of '00'
    for (const p of pts) {
      const idx = p.a * (D / p.b);
      let layer = layers.find((L) => L[idx] === '00');
      if (!layer) { layer = new Array(D).fill('00'); layers.push(layer); }
      layer[idx] = p.id;
    }
    for (const L of layers) dataLines.push(`#${m3(Number(measure))}${ch}:${L.join('')}`);
  }
  // deterministic order: by measure then channel
  dataLines.sort();
  return lines.concat(dataLines).join('\n') + '\n';
}

// ------------------------------------------------------------------- parse
export function parseBms(text) {
  const headers = {};
  let bpm = 120;
  const rawPoints = []; // {measure, a, b, ch, lane, id}
  const dataRe = /^#(\d{3})(..):(.*)$/;

  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line.startsWith('#')) continue;
    const m = dataRe.exec(line);
    if (m) {
      const measure = Number(m[1]);
      const ch = m[2].toUpperCase();
      const info = CHANNELS[ch];
      if (!info || info.kind !== 'note') continue; // ignore non-note channels for now
      const data = m[3];
      if (data.length % 2 !== 0) continue;
      const D = data.length / 2;
      for (let i = 0; i < D; i++) {
        const v = data.substr(i * 2, 2);
        if (v === '00') continue;
        rawPoints.push({ measure, a: i, b: D, ch, lane: info.lane, id: v.toUpperCase() });
      }
      continue;
    }
    // header: "#KEY value"
    const sp = line.indexOf(' ');
    const key = (sp === -1 ? line.slice(1) : line.slice(1, sp)).toUpperCase();
    const val = sp === -1 ? '' : line.slice(sp + 1).trim();
    switch (key) {
      case 'BPM': bpm = Number(val) || bpm; break;
      case 'PLAYER': headers.player = Number(val); break;
      case 'GENRE': headers.scene = val; break;
      case 'TITLE': headers.title = val; break;
      case 'ARTIST': headers.artist = val; break;
      case 'LEVELDESIGN': headers.levelDesign = val; break;
      case 'RANK': headers.rank = Number(val); break;
      case 'PLAYLEVEL': headers.playLevel = val; break;
      default: (headers.extra ||= {})[key] = val;
    }
  }

  // Pair holds per channel; everything else is a standalone note.
  const notes = [];
  const byCh = new Map();
  for (const p of rawPoints) (byCh.get(p.ch) ?? byCh.set(p.ch, []).get(p.ch)).push(p);
  for (const pts of byCh.values()) {
    pts.sort((x, y) => (x.measure + x.a / x.b) - (y.measure + y.a / y.b));
    const used = new Array(pts.length).fill(false);
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      const p = pts[i];
      const [num, den] = reduce(p.a, p.b);
      const note = { measure: p.measure, num, den, lane: p.lane, id: p.id };
      if (HOLD_IDS.has(p.id)) {
        let j = -1;
        for (let k = i + 1; k < pts.length; k++) {
          if (!used[k] && pts[k].id === p.id) { j = k; break; }
        }
        if (j !== -1) {
          used[j] = true;
          const q = pts[j];
          const [en, ed] = reduce(q.a, q.b);
          note.end = { measure: q.measure, num: en, den: ed };
        }
      }
      used[i] = true;
      notes.push(note);
    }
  }
  notes.sort((a, b) => (a.measure + a.num / a.den) - (b.measure + b.num / b.den) || a.lane.localeCompare(b.lane));
  return { headers, bpm, notes };
}

// --------------------------------------------------------------- utilities
// Absolute position of a note in beats (4 beats per measure, 4/4 assumed).
export const noteBeats = (n) => n.measure * 4 + (n.num / n.den) * 4;
// Seconds from song start, given a constant BPM.
export const noteSeconds = (n, bpm) => (noteBeats(n) / bpm) * 60;
export const labelFor = (id) => IBMS_IDS[id] ?? `id:${id}`;
