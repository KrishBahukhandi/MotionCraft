import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = path.join(root, 'dist', 'index.html')
const serverEntry = path.join(root, 'dist-ssr', 'entry-server.js')

const { render } = await import(pathToFileURL(serverEntry).href)

const template = readFileSync(templatePath, 'utf-8')
const appHtml = render('/')

const marker = '<div id="root"></div>'
if (!template.includes(marker)) {
  throw new Error('prerender: could not find the root container in dist/index.html')
}

const out = template.replace(marker, `<div id="root">${appHtml}</div>`)
writeFileSync(templatePath, out)

// the SSR bundle is a build artifact, not something to deploy
if (existsSync(path.join(root, 'dist-ssr'))) {
  rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
}

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`
console.log(`prerendered / → ${kb(appHtml)} of static HTML (index.html now ${kb(out)})`)
