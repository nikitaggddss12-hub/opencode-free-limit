// Self-contained test for the patch scripts.
//
// Builds a synthetic app.asar with the same layout the scripts expect
// (out/renderer/assets + out/main, offsets as strings, SHA-256 integrity
// per file), then runs every script against it and checks the result:
// dry run writes nothing, patching keeps the archive size, the integrity
// hash in the header is updated, and a second run is a no-op.
//
// Usage: node test/patch.test.cjs

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const SCRIPTS = path.join(ROOT, 'scripts')

const RENDERER = 'out/renderer/assets/route-IwQmm3WU.js'
const MAIN = 'out/main/platform-DZ0ycknI.js'

// Same strings the scripts look for.
const RENDERER_TEXT = 'var A={active:()=>{let t=o();return!e()&&t!==null&&t>i()}};export{A};\n'
const MAIN_TEXT = 'import{app as g}from"electron";var x={checkForUpdates:async()=>null};let e=await x.checkForUpdates();console.log(e,g);\n'

const FREE_LIMIT_PATCHED = 'active:()=>!1'
const AUTOUPDATE_PATCHED = 'let e                          ;'

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

function buildAsar(entries) {
  const header = { files: {} }
  const blobs = []
  let offset = 0

  for (const [file, data] of entries) {
    const parts = file.split('/')
    let node = header
    for (const dir of parts.slice(0, -1)) {
      node.files[dir] = node.files[dir] || { files: {} }
      node = node.files[dir]
    }
    const hash = sha(data)
    node.files[parts[parts.length - 1]] = {
      size: data.length,
      offset: String(offset),
      integrity: { algorithm: 'SHA256', hash, blockSize: 4 * 1024 * 1024, blocks: [hash] },
    }
    blobs.push(data)
    offset += data.length
  }

  const json = Buffer.from(JSON.stringify(header), 'utf8')
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4)
  json.copy(padded)

  // 4 bytes marker, 4 bytes pickle size, then the pickle itself:
  // payload size, string length, JSON + zero padding.
  const prelude = Buffer.alloc(16)
  prelude.writeUInt32LE(4, 0)
  prelude.writeUInt32LE(8 + padded.length, 4)
  prelude.writeUInt32LE(4 + padded.length, 8)
  prelude.writeUInt32LE(json.length, 12)

  return Buffer.concat([prelude, padded, ...blobs])
}

// Independent reader, deliberately not shared with the scripts.
function readAsar(file) {
  const buf = fs.readFileSync(file)
  const headerSize = buf.readUInt32LE(4)
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.slice(16, 16 + jsonLen).toString('utf8'))
  const dataStart = 8 + headerSize

  const file_ = (dirs, name) => {
    const dir = dirs.reduce((node, key) => node && node.files && node.files[key], json)
    const entry = dir && dir.files && dir.files[name]
    if (!entry) return null
    const at = dataStart + Number(entry.offset)
    return { entry, data: buf.slice(at, at + entry.size), hash: sha(buf.slice(at, at + entry.size)) }
  }

  return {
    headerJsonRaw: buf.slice(8, 8 + headerSize),
    size: buf.length,
    renderer: file_(['out', 'renderer', 'assets'], 'route-IwQmm3WU.js'),
    main: file_(['out', 'main'], 'platform-DZ0ycknI.js'),
  }
}

function run(script, ...args) {
  return execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

const checks = []
const ok = (name) => {
  checks.push(name)
  console.log('ok   ' + name)
}

// 1. every script must at least parse
for (const file of ['check.cjs', 'remove-free-limit.cjs', 'disable-autoupdate.cjs', 'scan.mjs']) {
  execFileSync(process.execPath, ['--check', path.join(SCRIPTS, file)], { stdio: 'pipe' })
  ok('scripts/' + file + ' parses')
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-patch-'))
const asar = path.join(dir, 'app.asar')
const backup = asar + '.bak'

try {
  fs.writeFileSync(
    asar,
    buildAsar([
      [RENDERER, Buffer.from(RENDERER_TEXT, 'utf8')],
      [MAIN, Buffer.from(MAIN_TEXT, 'utf8')],
    ]),
  )
  const originalSize = fs.statSync(asar).size
  const originalBytes = fs.readFileSync(asar)

  // 2. pristine archive is reported as untouched
  let out = run('check.cjs', '--asar', asar)
  assert.match(out, /free limit card:\s+original/)
  assert.match(out, /auto update check:\s+original/)
  ok('check.cjs sees an unpatched archive')

  // 3. dry run must not touch a single byte
  out = run('remove-free-limit.cjs', '--asar', asar, '--dry-run')
  assert.match(out, /dry run: nothing written/)
  assert.deepEqual(fs.readFileSync(asar), originalBytes)
  assert.equal(fs.existsSync(backup), false)
  ok('--dry-run leaves the archive untouched')

  // 4. patch the free limit card
  out = run('remove-free-limit.cjs', '--asar', asar)
  assert.match(out, /^OK$/m)
  assert.equal(fs.statSync(asar).size, originalSize)
  assert.equal(fs.existsSync(backup), true)
  ok('free limit patch applies, size unchanged')

  let archive = readAsar(asar)
  assert.equal(archive.renderer.data.toString('utf8').includes(FREE_LIMIT_PATCHED), true)
  assert.equal(archive.renderer.entry.integrity.hash, archive.renderer.hash)
  ok('free limit patch updates the integrity hash')

  // 5. running it again is a no-op
  const afterFirst = fs.readFileSync(asar)
  out = run('remove-free-limit.cjs', '--asar', asar)
  assert.match(out, /already patched, nothing to do/)
  assert.deepEqual(fs.readFileSync(asar), afterFirst)
  ok('free limit patch is idempotent')

  // 6. disable the auto-updater
  out = run('disable-autoupdate.cjs', '--asar', asar)
  assert.match(out, /^OK$/m)
  assert.equal(fs.statSync(asar).size, originalSize)
  ok('auto update patch applies, size unchanged')

  archive = readAsar(asar)
  assert.equal(archive.main.data.toString('utf8').includes(AUTOUPDATE_PATCHED), true)
  assert.equal(archive.main.entry.integrity.hash, archive.main.hash)
  ok('auto update patch updates the integrity hash')

  out = run('disable-autoupdate.cjs', '--asar', asar)
  assert.match(out, /already patched, nothing to do/)
  ok('auto update patch is idempotent')

  // 7. both patches visible to check.cjs
  out = run('check.cjs', '--asar', asar)
  assert.match(out, /free limit card:\s+patched/)
  assert.match(out, /auto update check:\s+patched/)
  ok('check.cjs sees both patches')

  // 8. an archive from another version is refused instead of being mangled
  const other = path.join(dir, 'other.asar')
  fs.writeFileSync(
    other,
    buildAsar([
      [RENDERER, Buffer.from('var A={active:()=>!0};export{A};\n', 'utf8')],
      [MAIN, Buffer.from('let e=1;console.log(e);\n', 'utf8')],
    ]),
  )
  const otherBytes = fs.readFileSync(other)
  assert.throws(
    () => run('remove-free-limit.cjs', '--asar', other),
    (e) => /active\(\) expression not found/.test(String(e.stdout || '') + String(e.stderr || '')),
  )
  assert.deepEqual(fs.readFileSync(other), otherBytes)
  out = run('check.cjs', '--asar', other)
  assert.match(out, /free limit card:\s+unknown/)
  ok('unknown app versions are refused, not modified')

  console.log('\n' + checks.length + ' checks passed')
} finally {
  fs.rmSync(dir, { recursive: true, force: true })
}
