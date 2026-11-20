// Muse Dash chart format tables.
//
// Sources (interop knowledge only — no game assets are redistributed):
//  - Note palette (ibms node UIDs) recovered from the game's IL2CPP metadata
//    (PeroPeroGames.GlobalDefines.BmsNodeUid, 133 entries) via static analysis.
//  - BMS channel map + 2-char value -> note id encoding read from the open-source
//    CustomAlbums mod loader (github.com/MDMods/CustomAlbums, Data/Bms.cs).
//
// The 2-char "value" placed in a note-channel slot IS the note's ibms_id.
// The game resolves each ibms_id (+ pathway + speed + scene) to its own
// NoteConfigData (type/timing/score) at load time, so an editor only has to
// emit correct ids, lanes (channels), and positions.

// --- BMS channels (cc in `#mmmcc:...`) -------------------------------------
// pathway: 1 = air, 0 = ground/road. Primary note channels used when writing.
export const CHANNELS = {
  // control
  '01': { kind: 'scene' },
  '02': { kind: 'timesig' },
  '03': { kind: 'bpmDirect' },  // value = hex BPM
  '08': { kind: 'bpmLookup' },  // value = key into BPMxx table
  'SC': { kind: 'scroll' },
  // note channels
  '11': { kind: 'note', lane: 'air',    pathway: 1 },
  '13': { kind: 'note', lane: 'air',    pathway: 1 },
  '51': { kind: 'note', lane: 'air',    pathway: 1 },
  '53': { kind: 'note', lane: 'air',    pathway: 1 },
  '12': { kind: 'note', lane: 'ground', pathway: 0 },
  '14': { kind: 'note', lane: 'ground', pathway: 0 },
  '52': { kind: 'note', lane: 'ground', pathway: 0 },
  '54': { kind: 'note', lane: 'ground', pathway: 0 },
  '31': { kind: 'note', lane: 'air',    pathway: 1, spBlood: true },
  '33': { kind: 'note', lane: 'air',    pathway: 1, spBlood: true },
  '32': { kind: 'note', lane: 'ground', pathway: 0, spBlood: true },
  '34': { kind: 'note', lane: 'ground', pathway: 0, spBlood: true },
  'D1': { kind: 'note', lane: 'air',    pathway: 1, tapHold: true },
  'D3': { kind: 'note', lane: 'air',    pathway: 1, tapHold: true },
  'D2': { kind: 'note', lane: 'ground', pathway: 0, tapHold: true },
  'D4': { kind: 'note', lane: 'ground', pathway: 0, tapHold: true },
};

// Primary channel we write each lane on (readers accept all the variants above).
export const WRITE_CHANNEL = { air: '11', ground: '12' };

// Set of channel codes that are note channels, grouped by lane.
export const NOTE_CHANNELS = Object.entries(CHANNELS)
  .filter(([, c]) => c.kind === 'note')
  .reduce((m, [code, c]) => { (m[c.lane] ||= []).push(code); return m; }, {});

// --- ibms_id (2-char base36 value) -> label --------------------------------
// From CustomAlbums Data/Bms.cs BmsIds. Labels are the mod's names.
export const IBMS_IDS = {
  '00': 'None',
  '01': 'Small',   '02': 'SmallUp',   '03': 'SmallDown',
  '04': 'Medium1', '05': 'Medium1Up', '06': 'Medium1Down',
  '07': 'Medium2', '08': 'Medium2Up', '09': 'Medium2Down',
  '0A': 'Large1',  '0B': 'Large2',
  '0C': 'Raider',  '0D': 'Hammer',    '0E': 'Gemini',
  '0F': 'Hold',    '0G': 'Masher',    '0H': 'Gear',
  '0I': 'UpsideDownRaider', '0J': 'UpsideDownHammer',
  // speed-change commands (affect following notes, not hittable)
  '0O': 'Speed1Both', '0P': 'Speed2Both', '0Q': 'Speed3Both',
  '0R': 'Speed1Low',  '0S': 'Speed2Low',  '0T': 'Speed3Low',
  '0U': 'Speed1High', '0V': 'Speed2High', '0W': 'Speed3High',
  '10': 'Music',
  '11': 'BossMelee1', '12': 'BossMelee2',
  '13': 'BossProjectile1', '14': 'BossProjectile2', '15': 'BossProjectile3',
  '16': 'BossMasher1', '17': 'BossMasher2', '18': 'BossGear',
  '1A': 'BossEntrance', '1B': 'BossExit',
  '1C': 'BossReadyPhase1', '1D': 'BossEndPhase1',
  '1E': 'BossReadyPhase2', '1F': 'BossEndPhase2',
  '1G': 'BossSwapPhase12', '1H': 'BossSwapPhase21',
  '1J': 'HideNotes', '1K': 'UnhideNotes',
  '1L': 'HideBoss',  '1M': 'UnhideBoss',
  '20': 'PItem', '21': 'Ghost', '22': 'Heart', '23': 'Note',
};

// ids whose game note-config type is a long-press/hold (Press or Mul):
// encoded as a start slot plus a later slot with the same id on the same channel.
export const HOLD_IDS = new Set(['0F', '0G']);

// ids that are commands/events, not hittable notes (no paired end, no judgement).
export const COMMAND_IDS = new Set([
  '00', '0O', '0P', '0Q', '0R', '0S', '0T', '0U', '0V', '0W',
  '1J', '1K', '1L', '1M',
]);

// --- Editor-facing palette (curated subset of playable notes) --------------
// `lanes` = which lanes the editor offers for this note. `hold` marks durations.
export const PALETTE = [
  { key: 'small',    label: 'Monster (small)',  id: '01', lanes: ['air', 'ground'] },
  { key: 'smallUp',  label: 'Monster (up)',     id: '02', lanes: ['air', 'ground'] },
  { key: 'smallDn',  label: 'Monster (down)',   id: '03', lanes: ['air', 'ground'] },
  { key: 'medium',   label: 'Monster (medium)', id: '04', lanes: ['air', 'ground'] },
  { key: 'large',    label: 'Monster (large)',  id: '0A', lanes: ['air', 'ground'] },
  { key: 'raider',   label: 'Raider',           id: '0C', lanes: ['air', 'ground'] },
  { key: 'hammer',   label: 'Hammer',           id: '0D', lanes: ['air', 'ground'] },
  { key: 'gemini',   label: 'Gemini (double)',  id: '0E', lanes: ['air', 'ground'] },
  { key: 'hold',     label: 'Hold',             id: '0F', lanes: ['air', 'ground'], hold: true },
  { key: 'masher',   label: 'Masher (mul)',     id: '0G', lanes: ['air', 'ground'], hold: true },
  { key: 'gear',     label: 'Gear',             id: '0H', lanes: ['air', 'ground'] },
  { key: 'music',    label: 'Music (score)',    id: '10', lanes: ['air', 'ground'] },
  { key: 'heart',    label: 'Heart (Hp)',       id: '22', lanes: ['air', 'ground'] },
  { key: 'ghost',    label: 'Ghost',            id: '21', lanes: ['air', 'ground'] },
];

export const PALETTE_BY_ID = PALETTE.reduce((m, p) => (m[p.id] = p, m), {});
