# OpenCode Free Limit

### Remove the "free limit reached" card from OpenCode Desktop — and keep it gone

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows)](https://github.com/nikitaggddss12-hub/opencode-free-limit)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![OpenCode](https://img.shields.io/badge/OpenCode%20Desktop-2.4.1-black)](https://opencode.ai)
[![CI](https://github.com/nikitaggddss12-hub/opencode-free-limit/actions/workflows/ci.yml/badge.svg)](https://github.com/nikitaggddss12-hub/opencode-free-limit/actions/workflows/ci.yml)

🇷🇺 [Русская версия](README.ru.md)

When the free quota runs out, OpenCode Desktop does not just notify you — it replaces the
composer with a card that covers the chat, and it comes back after every update. This patch
removes the card from the UI and turns off auto-updates so it stays removed.

**It does not restore the quota.** The limit is enforced server-side; sending a request still
fails. What you get back is a usable client: a normal composer, readable chat, model switching,
your own API keys.

---

## ⚡ Quick start

```bash
git clone https://github.com/nikitaggddss12-hub/opencode-free-limit.git
cd opencode-free-limit
node scripts/remove-free-limit.cjs
node scripts/disable-autoupdate.cjs
```

Restart OpenCode — the card is gone, the composer is back.

## 🧨 What the patch changes

| File inside `app.asar` | Change |
| --- | --- |
| `out/renderer/assets/route-IwQmm3WU.js` | the `session-free-limit` gate becomes `active:()=>!1`, so the card is never rendered and the composer shows instead |
| `out/main/platform-DZ0ycknI.js` | `await x.checkForUpdates()` is dropped, so the app never asks the network for updates and always reports up to date |

The patch is byte-length preserving: the same number of bytes is replaced, the SHA-256
integrity hash in the `app.asar` header is recomputed, the archive size stays identical.
Nothing is re-downloaded and no binary is shipped — two strings change in the app you already
have installed.

## 🖥 Requirements

- Windows 10/11
- OpenCode Desktop **2.4.1** (chunk names and strings are version specific)
- Node.js 22+

## 🛠 Usage

```bash
node scripts/check.cjs                        # what is already patched
node scripts/remove-free-limit.cjs --dry-run  # print the change, write nothing
node scripts/remove-free-limit.cjs            # remove the card
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

- `remove-free-limit.cjs` creates `app.asar.bak` next to the archive on the first run
  (≈255 MB). Delete it once everything works.
- Full rollback: reinstall OpenCode.

## ❓ FAQ

**The card is back after an update.**
Auto-update overwrote `app.asar`. Run `disable-autoupdate.cjs`, then the patch scripts again.

**A new OpenCode version is out.**
Chunk names and strings differ. Find the new ones with `node scripts/scan.mjs` (needs
`npm install`), update the constants and open a PR.

**Why not a config flag?**
There is none. The card is rendered by the client bundle; no setting, env var or flag
disables it.

**Is this safe?**
Only bytes inside `app.asar` change, the integrity hash is recomputed and the archive size is
untouched. The scripts are ~200 readable lines with no network access and no telemetry.
You can always return to the stock build by reinstalling.

**Does it give me free usage?**
No. It removes a UI blocker, not a server-side quota.

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

The test builds a synthetic `app.asar` with the same layout (offsets, SHA-256 integrity
hashes) and checks that a dry run writes nothing, both patches keep the file size, the header
hash is updated, a second run is a no-op, and an archive from another version is refused
instead of mangled. CI runs it on Linux and Windows with Node 22 and 24.

## ⭐ Support

If this saved you a click, leave a star so others find it.

## 📄 License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 nikitaggddss12.
