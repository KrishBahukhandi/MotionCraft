import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = path.join(root, 'dist', 'index.html')
const serverEntry = path.join(root, 'dist-ssr', 'entry-server.js')

const { render, SEO_PAGES } = await import(pathToFileURL(serverEntry).href)

const template = readFileSync(templatePath, 'utf-8')
const marker = '<div id="root"></div>'
if (!template.includes(marker)) {
  throw new Error('prerender: could not find the root container in dist/index.html')
}

function jsonLd(page) {
  const url = `https://motioncraft.bahukhandi-labs.com/${page.slug}`
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'en' },
      { '@type': 'SoftwareApplication', name: 'MotionCraft', url: 'https://motioncraft.bahukhandi-labs.com/', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
      { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: page.faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
    ],
  })
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Rewrite one tag's value, throwing if the tag wasn't found.
 *
 * These replacements used to fail silently, which shipped every SEO page with
 * the homepage's canonical URL — telling Google the whole set was duplicate
 * content. A hard failure here turns "markup changed" into a broken build
 * instead of a quietly de-indexed site.
 */
function replaceOne(html, pattern, build, label) {
  let hits = 0
  const out = html.replace(pattern, (...args) => {
    hits++
    return build(...args)
  })
  if (hits !== 1) {
    throw new Error(
      `prerender: expected exactly 1 match for ${label} in index.html, found ${hits}. ` +
        `The head markup changed — update scripts/prerender.mjs to match.`
    )
  }
  return out
}

function withPageMetadata(html, page) {
  const url = `https://motioncraft.bahukhandi-labs.com/${page.slug}`
  let out = html

  out = replaceOne(
    out,
    /<title>[\s\S]*?<\/title>/,
    () => `<title>${escapeAttr(page.title)}</title>`,
    '<title>'
  )

  // note the closing group is `>` — an earlier `>>` here matched nothing
  const attrs = [
    [/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/, page.description, 'meta description'],
    [/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/, url, 'canonical'],
    [/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/, page.title, 'og:title'],
    [/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/, page.description, 'og:description'],
    [/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/, url, 'og:url'],
    [/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/, page.title, 'twitter:title'],
    [/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/, page.description, 'twitter:description'],
  ]
  for (const [pattern, value, label] of attrs) {
    out = replaceOne(out, pattern, (_m, open, close) => `${open}${escapeAttr(value)}${close}`, label)
  }

  return replaceOne(
    out,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    () => `<script type="application/ld+json">${jsonLd(page)}</script>`,
    'JSON-LD block'
  )
}

const homepageHtml = render('/')
const homepage = template.replace(marker, `<div id="root">${homepageHtml}</div>`)
writeFileSync(templatePath, homepage)

for (const page of SEO_PAGES) {
  const routeHtml = render(`/${page.slug}`)
  const out = withPageMetadata(template.replace(marker, `<div id="root">${routeHtml}</div>`), page)
  const routeDir = path.join(root, 'dist', page.slug)
  mkdirSync(routeDir, { recursive: true })
  writeFileSync(path.join(routeDir, 'index.html'), out)
}

const date = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: 'https://motioncraft.bahukhandi-labs.com/', priority: '1.0' },
  ...SEO_PAGES.map((page) => ({ loc: `https://motioncraft.bahukhandi-labs.com/${page.slug}`, priority: '0.8' })),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`
writeFileSync(path.join(root, 'dist', 'sitemap.xml'), sitemap)

// the SSR bundle is a build artifact, not something to deploy
if (existsSync(path.join(root, 'dist-ssr'))) {
  rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
}

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`
console.log(`prerendered ${urls.length} marketing pages (homepage HTML: ${kb(homepageHtml)})`)
