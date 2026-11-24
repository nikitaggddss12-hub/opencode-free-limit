# OpenCode Unlimited

### Remove the "free limit reached" banner in OpenCode Desktop — once and for all

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/nikitaggddss12-hub/opencode-unlimited)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![OpenCode](https://img.shields.io/badge/OpenCode%20Desktop-2.4.1-black)](https://opencode.ai)
[![CI](https://github.com/nikitaggddss12-hub/opencode-unlimited/actions/workflows/ci.yml/badge.svg)](https://github.com/nikitaggddss12-hub/opencode-unlimited/actions/workflows/ci.yml)

🇷🇺 [Русская версия](README.md)

The "free limit reached" banner sits on top of the composer, covers the chat and
comes back after every app update. This repo gets rid of it with two commands and
turns off auto-updates so the patch is not overwritten.

---

## ⚡ Quick start

```bash
git clone https://github.com/nikitaggddss12-hub/opencode-unlimited.git
cd opencode-unlimited
node scripts/remove-free-limit.cjs
node scripts/disable-autoupdate.cjs
```

Restart OpenCode — the banner is gone and the normal composer is back.

## 🚀 How to reset the limit itself

The easiest way is to **change your IP**. Turn on airplane mode for 10–15 seconds
and turn it off again (restarting the router or switching on a VPN works too) — the
limit resets and the free model is available again.

## 🧨 What the patch changes

| File inside `app.asar` | Change |
| --- | --- |
| `out/renderer/assets/route-IwQmm3WU.js` | the `session-free-limit` card gate becomes `active:()=>!1`, so the "free limit reached" card is never rendered and the composer shows up instead |
| `out/main/platform-DZ0ycknI.js` | `await x.checkForUpdates()` is dropped from the update check, so the app never asks the network for updates and always reports being up to date |

The patch is byte-length preserving: the same number of bytes is replaced, the
SHA-256 integrity hash in the `app.asar` header is recomputed and the archive size
stays identical. Nothing is re-downloaded — two lines in the installed app change.

## 🖥 Requirements

- Windows 10/11
- OpenCode Desktop **2.4.1** (chunk names and strings are version specific)
- Node.js 22+

## 🛠 Usage

```bash
node scripts/check.cjs                        # what is already patched
node scripts/remove-free-limit.cjs --dry-run  # preview without writing
node scripts/remove-free-limit.cjs            # remove the banner
node scripts/disable-autoupdate.cjs           # disable auto-updates
```

Or via npm:

```bash
npm run check
npm run free-limit:dry
npm run free-limit
npm run no-autoupdate
```

Default archive path:
`%LOCALAPPDATA%\Programs\ai.opencode.desktop\resources\app.asar`.
Installed elsewhere? Pass `--asar <path>`.

## 🔄 Backup and rollback

- `remove-free-limit.cjs` creates `app.asar.bak` next to the archive on its first
  run (≈255 MB). Delete it once everything works.
- Full rollback: reinstall OpenCode.

## ❓ FAQ

**The banner is back after an update.**
Auto-update overwrote `app.asar`. Run `disable-autoupdate.cjs`, then the patch
scripts again.

**A new OpenCode version is out.**
Chunk names and strings differ. Find the new ones with `node scripts/scan.mjs`
(needs `npm install`) and update the constants in the scripts.

**Is this safe?**
Only bytes inside `app.asar` change, the checksum is recomputed and the archive
size is untouched. You can always go back to the stock build by reinstalling.

## 📁 Layout

```
scripts/
  check.cjs              — shows whether the patches are applied
  remove-free-limit.cjs  — removes the "free limit reached" card
  disable-autoupdate.cjs — disables the update check
  scan.mjs               — locates the card inside app.asar (new versions)
test/
  patch.test.cjs         — builds a fake app.asar and tests every script
```

## 🧪 Development

```bash
npm test
```

The test builds a synthetic `app.asar` with the same layout (offsets, integrity
hashes), then checks that a dry run writes nothing, both patches keep the file size,
the header hash is updated, second runs are no-ops and unknown versions are refused.
CI runs it on Linux and Windows with Node 22 and 24.

## ⭐ Support

If this helped, leave a star so others can find it.

## 📄 License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 nikitaggddss12.
