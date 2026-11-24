// Patch: remove the "free limit reached" card (session-free-limit) from the
// installed OpenCode desktop app.
//
// The card is rendered by the composer slot when `active()` of the free-limit
// hook returns true. We make it always return false (same byte length, padded
// with spaces), so the normal composer is always shown instead of the card.
//
// Usage: node remove-free-limit.cjs [--dry-run] [--asar <path>] [--log <path>]
//
// The archive is edited in place: the renderer chunk keeps its size, and the
// per-file SHA-256 integrity hash in the asar header is updated to match.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const CHUNK = 'route-IwQmm3WU.js'
const OLD = 'active:()=>{let t=o();return!e()&&t!==null&&t>i()}'
const HEAD = 'active:()=>!1'
const NEW = HEAD + ' '.repeat(OLD.length - HEAD.length)

if (NEW.length !== OLD.length) throw new Error('replacement must keep the same length')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const arg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}

const lines = []
const say = (s) => {
  lines.push(s)
  console.log(s)
}
const saveLog = () => {
  const lf = arg('--log')
  if (lf) fs.writeFileSync(lf, lines.join('\n') + '\n', 'utf8')
}
const done = (code) => {
  saveLog()
  process.exit(code)
}
const fail = (msg) => {
  say('FAIL: ' + msg)
  done(1)
}

function readHeader(fd, archiveSize) {
  const head = Buffer.alloc(16)
  fs.readSync(fd, head, 0, 16, 0)
  const headerSize = head.readUInt32LE(4) // pickle size of the header buffer
  const jsonLen = head.readUInt32LE(12)
  if (headerSize <= 0 || 8 + headerSize > archiveSize) throw new Error('bad asar header size')
  const raw = Buffer.alloc(headerSize)
  fs.readSync(fd, raw, 0, headerSize, 8)
  const jsonText = raw.slice(8, 8 + jsonLen).toString('utf8')
  const json = JSON.parse(jsonText)
  if (!json.files || !json.files.out) throw new Error('unexpected asar header layout')
  return { raw, json, headerSize, dataStart: 8 + headerSize }
}

function entryPath(json) {
  const dirs = json.files.out.files.renderer.files.assets.files
  const entry = dirs && dirs[CHUNK]
  if (!entry || typeof entry.offset !== 'string') throw new Error('renderer chunk not found in asar header')
  return entry
}

function main() {
  const asarPath = arg(
    '--asar',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'ai.opencode.desktop', 'resources', 'app.asar'),
  )
  if (!fs.existsSync(asarPath)) fail('app.asar not found: ' + asarPath)

  const archiveSize = fs.statSync(asarPath).size
  const fd = fs.openSync(asarPath, 'r+')
  try {
    let { raw, json, headerSize, dataStart } = readHeader(fd, archiveSize)
    const entry = entryPath(json)
    const fileStart = dataStart + Number(entry.offset)
    const original = Buffer.alloc(entry.size)
    fs.readSync(fd, original, 0, entry.size, fileStart)

    const text = original.toString('utf8')
    if (text.indexOf(OLD) === -1 && text.indexOf(HEAD) !== -1) {
      say('already patched, nothing to do')
      done(0)
    }

    const first = text.indexOf(OLD)
    if (first === -1) fail('active() expression not found in ' + CHUNK)
    if (text.indexOf(OLD, first + 1) !== -1) fail('active() expression is not unique, refusing to patch')

    const oldSha = crypto.createHash('sha256').update(original).digest('hex')
    const headerHash = entry.integrity && entry.integrity.hash
    if (headerHash && headerHash !== oldSha) {
      fail('current chunk hash does not match the asar header; refusing to touch it')
    }

    const patched = Buffer.from(text.replace(OLD, NEW), 'utf8')
    if (patched.length !== original.length) fail('patched chunk changed size')
    const newSha = crypto.createHash('sha256').update(patched).digest('hex')

    say('asar:      ' + asarPath)
    say('chunk:     ' + CHUNK)
    say('offset:    ' + fileStart + ' (size ' + entry.size + ')')
    say('old sha256:' + oldSha)
    say('new sha256:' + newSha)
    say('patch:     ' + JSON.stringify(OLD) + ' -> ' + JSON.stringify(HEAD))

    // the patched chunk must still be valid JS
    const checkPath = path.join(process.env.TEMP || '.', 'route-check.tmp.mjs')
    fs.writeFileSync(checkPath, patched)
    try {
      require('child_process').execFileSync(process.execPath, ['--check', checkPath], { stdio: 'pipe' })
      say('check:     patched chunk parses')
    } catch (e) {
      fail('patched chunk does not parse: ' + (e.stderr ? e.stderr.toString() : e.message))
    } finally {
      try {
        fs.unlinkSync(checkPath)
      } catch {}
    }

    if (dryRun) {
      say('dry run: nothing written')
      done(0)
    }

    const backup = asarPath + '.bak'
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(asarPath, backup)
      say('backup:    ' + backup)
    } else {
      say('backup:    already exists, kept')
    }

    // 1) chunk bytes (same size, so every offset stays valid)
    fs.writeSync(fd, patched, 0, patched.length, fileStart)

    // 2) integrity hash in the header (64 hex chars, same size)
    if (headerHash) {
      const from = Buffer.from(headerHash, 'utf8')
      const to = Buffer.from(newSha, 'utf8')
      let at = raw.indexOf(from)
      let count = 0
      while (at !== -1) {
        to.copy(raw, at)
        count++
        at = raw.indexOf(from, at + from.length)
      }
      if (count === 0) fail('could not locate integrity hash in the asar header')
      say('hash refs: ' + count)
      fs.writeSync(fd, raw, 0, raw.length, 8)
    }

    fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }

  // 3) verify from disk with a fresh read
  const vfd = fs.openSync(asarPath, 'r')
  try {
    const { json, dataStart } = readHeader(vfd, fs.statSync(asarPath).size)
    const entry = entryPath(json)
    const buf = Buffer.alloc(entry.size)
    fs.readSync(vfd, buf, 0, entry.size, dataStart + Number(entry.offset))
    if (buf.toString('utf8').indexOf(HEAD) === -1) fail('verification failed: patched expression missing on disk')
    if (entry.integrity && entry.integrity.hash) {
      const sha = crypto.createHash('sha256').update(buf).digest('hex')
      if (sha !== entry.integrity.hash) fail('verification failed: integrity hash mismatch on disk')
    }
    if (archiveSize !== fs.statSync(asarPath).size) fail('verification failed: asar size changed')
    say('verify:    chunk patched, integrity hash matches, size unchanged')
  } finally {
    fs.closeSync(vfd)
  }

  say('OK')
  done(0)
}

try {
  main()
} catch (e) {
  fail(e && e.message ? e.message : String(e))
}
