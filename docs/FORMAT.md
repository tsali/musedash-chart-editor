# Muse Dash custom-chart format (`.mdm` / BMS)

Interoperability reference for the editor. Compiled from the open-source
[CustomAlbums](https://github.com/MDMods/CustomAlbums) loader (the `.mdm`
container + BMS dialect) and from the game's own type model recovered by static
analysis of its IL2CPP metadata (note palette and data structures). No game code
or assets are reproduced here — only the format needed for interoperability.

## 1. The `.mdm` container (a ZIP)

CustomAlbums (`Albums/ArchiveAlbum.cs`) reads these entries **by exact name**:

| Entry | Required | Purpose |
|-------|----------|---------|
| `info.json` | yes | album/song metadata (missing = not loaded) |
| `cover.png` | no | cover art |
| `map{N}.bms` | per difficulty | chart for difficulty `N` (1–5) when `difficultyN != "0"` |
| `map{N}.talk` | no | dialog events (JSON, `"version": 2`) |
| music audio | yes | main track (see note) |
| demo audio | no | preview clip |

- A `.mdp` **song pack** is a ZIP whose entries are nested `.mdm` ZIPs.
- Audio entry names/extensions are resolved by the mod's `AudioManager` and are
  not yet pinned here — confirm against a real `.mdm` before finalizing the packer.

### `info.json` fields (`Data/AlbumInfo.cs`, case-insensitive keys)

`name`, `name_romanized`, `author`, `levelDesigner`, `levelDesigner1`–`5`,
`bpm` (**string**), `scene` (default `scene_01`), `sceneEgg`,
`difficulty1`–`difficulty5` (strings; `"0"` = slot absent), `hideBmsMode`
(default `CLICK`), `hideBmsDifficulty`, `hideBmsMessage`, `searchTags` (string[]).

## 2. BMS dialect

Line-based. Lines not starting with `#` are ignored.

- **Headers** `#KEY value`: `PLAYER` (int; air speed), `GENRE` (scene id, e.g.
  `scene_08`), `TITLE`, `ARTIST`, `LEVELDESIGN`, `BANNER`, `RANK`, `PLAYLEVEL`,
  `BPM` + `BPMxx` table entries. `#WAV…` lines are **ignored** (no per-note audio).
- **Data lines** `#mmmcc:dddd`: `mmm` = 3-digit measure, `cc` = channel,
  `dddd` = concatenated 2-char slots. Position in the measure = `slotIndex /
  slotCount` (fraction of the measure). Odd-length data is rejected.

### Channel → lane map (`Data/Bms.cs`)

`pathway`: **1 = air**, **0 = ground/road**.

| Channels | Lane | Notes |
|----------|------|-------|
| `11` `13` `51` `53` | air | standard note channels |
| `12` `14` `52` `54` | ground | standard note channels |
| `31` `33` / `32` `34` | air / ground | `SpBlood` ("heart enemy") variant |
| `D1` `D3` / `D2` `D4` | air / ground | tap-hold (fixed 0.001 s length) |
| `01` | — | scene change |
| `02` | — | time-signature (measure-length multiplier) |
| `03` / `08` | — | BPM direct (hex) / BPM lookup (BPMxx key) |
| `SC` | — | scroll speed |

This editor writes air on `11` and ground on `12`; the reader accepts all variants.

### 2-char value = `ibms_id` (`Data/Bms.cs` `BmsIds`)

The slot value **is** the note id. The game resolves `{ibms_id}-{pathway}-{speed}-{scene}`
to its own `NoteConfigData` (type/timing/score) at load. Selected ids:

`00` None · `01` Small · `02` SmallUp · `03` SmallDown · `04`–`09` Medium1/2 (±) ·
`0A` Large1 · `0B` Large2 · `0C` Raider · `0D` Hammer · `0E` Gemini · `0F` Hold ·
`0G` Masher · `0H` Gear · `0I`/`0J` UpsideDown Raider/Hammer ·
`0O`–`0W` speed commands · `10` Music · `11`–`18` Boss melee/projectile/masher/gear ·
`1A`–`1H` boss phase control · `1J`/`1K` hide/show notes · `1L`/`1M` hide/show boss ·
`20` PItem · `21` Ghost · `22` Heart · `23` Note.

- **Holds**: an id whose game config type is *Press* or *Mul* becomes a hold — its
  id appears again later **on the same channel**; the span is start→that slot.
  Tap-hold `D`-channels use a fixed tiny length.
- **Gemini**: Monster/Hide notes at the same tick in **opposite** lanes pair into a
  double (`isDouble`).
- **Boss**: the loader auto-adds a missing boss-exit and rewrites phase-gear ids.

## 3. Game-side model (from IL2CPP metadata, for reference)

- `PeroPeroGames.GlobalDefines.NoteType`: `None, Monster, Block, Press, Hide, Boss,
  Hp, Music, Mul`, plus control events (`SceneChange`, `AutoOn/Off`, `Disappear*`,
  `SceneHide*`).
- `PeroPeroGames.GlobalDefines.BmsNodeUid`: the full 133-entry node palette
  (Small/Medium/Large, Raider, Hammer, Gemini, LongPress, Mul, Block, Boss*, Hp,
  Music, scene/screen effects, and collab sets: Touhou, fish-cutting).
- `GameLogic.NoteConfigData`: `type`, `pathway` (`PATHWAY_AIR`/`PATHWAY_ROAD`),
  `ibms_id`, `bmsUid`, `speed`, `score`, `damage`, `fever`, `left/right_perfect_range`,
  `left/right_great_range`.
- `GameLogic.MusicData`: a note on the timeline — `tick`, `configData`, `isDouble`,
  `isAir`, `isMul`, long-press fields.
- `Assets.Scripts.GameCore.StageInfo`: the chart — `musicDatas`, `bpm`,
  `difficulty`, `scene`, `md5`, `sceneEvents`, `dialogEvents`.

### Load pipeline

`map{N}.bms` → `DaveMusicConfigReader.CreateMusicDataInRuntime` resolves each slot's
`ibms_id` (+ pathway + speed + scene) against the note-config table → emits
`MusicData` on a `tick` timeline across air/ground → wrapped in `StageInfo`.

## Open items to confirm against a real `.mdm`

- Exact audio entry names/extensions inside `.mdm`.
- `.mdp` pack-level JSON entry name.
- `difficultyN` string value semantics (rating?), `sceneEgg` enum values.
