# Muse Dash Chart Editor

A standalone, visual **chart/level editor for Muse Dash custom songs**. Design a
beatmap on a two-lane (air / ground) timeline synced to your audio, then export a
**`.mdm`** file that the [CustomAlbums](https://github.com/MDMods/CustomAlbums)
mod loads directly — no engine patching, no game files redistributed.

> Status: **working build.** The visual editor (`index.html`) runs in any browser —
> two-lane timeline, note palette, audio + waveform, and real `.mdm` / `.bms`
> export & import. See [docs/FORMAT.md](docs/FORMAT.md) for the full format spec.

**▶ Live editor: <https://tsali.github.io/musedash-chart-editor/>** (or open `index.html` locally — no build step).

## Why

The Muse Dash custom-chart community has chart *loading* (CustomAlbums) and chart
*hosting* ([mdmc.moe](https://mdmc.moe)), but authoring is still done by hand in
general-purpose BMS editors like iBMSC. This project aims to be a **purpose-built,
Muse-Dash-aware visual editor** that stays fully compatible with the existing
`.mdm` ecosystem.

## What works today

- **BMS codec** (`src/bms.mjs`): converts a note model ⇆ Muse Dash `.bms` text —
  two lanes, all note ids, hold notes, gemini doubles, fractional timing.
  Verified by a round-trip test: `npm test`.
- **Format tables** (`src/tables.mjs`): BMS channel → lane map and the ibms_id →
  note palette, documented in [docs/FORMAT.md](docs/FORMAT.md).

## Roadmap

- [x] BMS note codec (parse + serialize), round-trip tested
- [x] `.mdm` zip packager + `info.json` writer
- [x] Import an existing `.mdm` / `.bms` to edit
- [x] Web UI: two-lane timeline, BPM grid, note palette, audio + waveform, demo-song playback
- [x] Publish as a static site (GitHub Pages)
- [ ] Confirm audio entry name + `.mdp` packs against a real `.mdm`
- [ ] `.talk` dialog events, boss-phase helpers

## Run the tests

```
npm test
```

(No dependencies required for the codec.)

## Scope & etiquette

- **Personal / offline use.** Custom charts are for playing your own maps; keep
  them off the official leaderboards.
- **No game assets.** This repo contains only original code and format
  documentation derived from interoperability analysis. You supply your own audio.
  It redistributes none of Muse Dash's files, code, or art.

## Credits

Format compatibility is built on the open-source
[CustomAlbums](https://github.com/MDMods/CustomAlbums) mod and the
[MDMC](https://discord.gg/mdmc) community's `.mdm` conventions.

## License

MIT — see [LICENSE](LICENSE).
