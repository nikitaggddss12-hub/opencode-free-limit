// Reports whether the patches are currently applied to the installed app.
// Usage: node scripts/check.cjs [--asar <path>]

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}

const asarPath = arg(
  '--asar',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ai.opencode.desktop', 'resources', 'app.asar'),
)

function readHeader(fd, archiveSize) {
  const head = Buffer.alloc(16)
  fs.readSync(fd, head, 0, 16, 0)
  const headerSize = head.readUInt32LE(4)
  const jsonLen = head.readUInt32LE(12)
  if (headerSize <= 0 || 8 + headerSize > archiveSize) throw new Error('bad asar header size')
  const raw = Buffer.alloc(headerSize)
  fs.readSync(fd, raw, 0, headerSize, 8)
  const json = JSON.parse(raw.slice(8, 8 + jsonLen).toString('utf8'))
  return { json, dataStart: 8 + headerSize }
}

function readFile(fd, json, dataStart, dirs, name) {
  const dir = dirs.split('.').reduce((node, key) => (node && node.files ? node.files[key] : undefined), json)
  const entry = dir && dir.files && dir.files[name]
  if (!entry || typeof entry.offset !== 'string') return null
  const buf = Buffer.alloc(entry.size)
  fs.readSync(fd, buf, 0, entry.size, dataStart + Number(entry.offset))
  return buf
}

const RENDERER = 'route-IwQmm3WU.js'
const MAIN = 'platform-DZ0ycknI.js'
const FREE_LIMIT_PATCHED = 'active:()=>!1'
const FREE_LIMIT_ORIGINAL = 'active:()=>{let t=o();return!e()&&t!==null&&t>i()}'
const AUTOUPDATE_PATCHED = 'let e                          ;'
const AUTOUPDATE_ORIGINAL = 'let e=await x.checkForUpdates();'

if (!fs.existsSync(asarPath)) {
  console.error('app.asar not found: ' + asarPath)
  process.exit(1)
}

const fd = fs.openSync(asarPath, 'r')
try {
  const { json, dataStart } = readHeader(fd, fs.statSync(asarPath).size)

  const renderer = readFile(fd, json, dataStart, 'out.renderer.assets', RENDERER)
  const main = readFile(fd, json, dataStart, 'out.main', MAIN)

  const state = (buf, patched, original) => {
    if (!buf) return 'chunk not found'
    const text = buf.toString('utf8')
    if (text.includes(patched)) return 'patched'
    if (text.includes(original)) return 'original'
    return 'unknown (different app version?)'
  }

  console.log('app.asar:              ' + asarPath)
  console.log('free limit card:       ' + state(renderer, FREE_LIMIT_PATCHED, FREE_LIMIT_ORIGINAL))
  console.log('auto update check:     ' + state(main, AUTOUPDATE_PATCHED, AUTOUPDATE_ORIGINAL))
} finally {
  fs.closeSync(fd)
}
