import * as esbuild from 'esbuild'
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function glob(dir, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'scripts') continue
      out.push(...glob(full, base))
    } else if (e.name.endsWith('.ts')) {
      out.push(relative(base, full).replace(/\\/g, '/'))
    }
  }
  return out
}

const srcDir = join(__dirname, 'src')
const outDir = join(__dirname, 'dist')
const entryPoints = glob(srcDir).map((p) => join(srcDir, p))

await esbuild.build({
  entryPoints,
  outdir: outDir,
  outbase: srcDir,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  target: 'node18',
})

console.log('Backend build (esbuild) done.')
