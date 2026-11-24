// Developer helper: find the "free limit" card component inside app.asar.
// Extracts the renderer assets that mention "session-free-limit" into ./extracted,
// so you can update the chunk name / strings for a new app version.
//
// Usage: npm install && node scripts/scan.mjs

import * as asar from '@electron/asar'
import fs from 'node:fs'
import path from 'node:path'

const archive = path.join(
  process.env.LOCALAPPDATA || '',
  'Programs',
  'ai.opencode.desktop',
  'resources',
  'app.asar',
)
const outDir = path.join(process.cwd(), 'extracted')

if (!fs.existsSync(archive)) {
  console.error('app.asar not found: ' + archive)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const needle = 'session-free-limit'
const files = asar.listPackage(archive).filter((f) => /\\out\\renderer\\.*\.js$/.test(f))
console.log('renderer js files:', files.length)

let found = 0
for (const f of files) {
  const buf = asar.extractFile(archive, f.replace(/^\\/, ''))
  const text = buf.toString('utf8')
  if (!text.includes(needle)) continue
  const name = f.split('\\').pop()
  fs.writeFileSync(path.join(outDir, name), buf)
  console.log(`hit: ${f} (${buf.length} bytes) -> extracted/${name}`)
  found++
}

console.log(found ? `done, ${found} file(s) extracted` : 'no hits')
