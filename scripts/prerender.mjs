import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = path.join(root, 'dist', 'index.html')
const serverEntry = path.join(root, 'dist-ssr', 'entry-server.js')

const {
  render,
  SEO_PAGES,
  GALLERY,
  galleryEntryTitle,
  GALLERY_TITLE,
  GALLERY_DESCRIPTION,
  TEMPLATES,
  templateTitle,
  TEMPLATES_TITLE,
  TEMPLATES_DESCRIPTION,
} = await import(pathToFileURL(serverEntry).href)

const template = readFileSync(templatePath, 'utf-8')
const marker = '<div id="root"></div>'
if (!template.includes(marker)) {
  throw new Error('prerender: could not find the root container in dist/index.html')
}

function jsonLd(page) {
  const url = `https://motioncraft.bahukhandi-labs.com/${page.slug}`
  const graph = [
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'en' },
    { '@type': 'SoftwareApplication', name: 'MotionCraft', url: 'https://motioncraft.bahukhandi-labs.com/', applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
  ]
  /*
   * Breadcrumbs. Ninety-odd pages hang off two directories, and without this a
   * crawler has to infer the hierarchy from links alone. Derived from the slug
   * so it cannot disagree with where the page actually lives.
   */
  if (page.crumbs && page.crumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: page.crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        ...(c.path === undefined ? {} : { item: `https://motioncraft.bahukhandi-labs.com${c.path}` }),
      })),
    })
  }

  // only claim an FAQPage when there are actually questions on the page
  if (page.faq && page.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: page.faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
    })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
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

  /*
   * Each page points at its own social card. Ninety-odd pages previously shared
   * one image, so every share of every animation looked identical — and a share
   * is the step before the link that actually counts.
   */
  if (page.card) {
    const image = `https://motioncraft.bahukhandi-labs.com/og/${page.card}.png`
    for (const [pattern, label] of [
      [/(<meta\s+property="og:image"\s+content=")[^"]*("\s*\/?>)/, 'og:image'],
      [/(<meta\s+name="twitter:image"\s+content=")[^"]*("\s*\/?>)/, 'twitter:image'],
    ]) {
      out = replaceOne(out, pattern, (_m, open, close) => `${open}${image}${close}`, label)
    }
    out = replaceOne(
      out,
      /(<meta\s+property="og:image:alt"\s+content=")[^"]*("\s*\/?>)/,
      (_m, open, close) => `${open}${escapeAttr(page.title.split('—')[0].trim())}${close}`,
      'og:image:alt'
    )
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
  page.crumbs = [{ name: 'Home', path: '/' }, { name: page.h1 ?? page.title }]
  page.card = `page-${page.slug}`
  const routeHtml = render(`/${page.slug}`)
  const out = withPageMetadata(template.replace(marker, `<div id="root">${routeHtml}</div>`), page)
  const routeDir = path.join(root, 'dist', page.slug)
  mkdirSync(routeDir, { recursive: true })
  writeFileSync(path.join(routeDir, 'index.html'), out)
}

/*
 * Vercel serves 404.html for anything that matches no file and no rewrite, with
 * a real 404 status. Without it the SPA catch-all handed unknown URLs the
 * homepage at 200 — a soft 404, which search engines treat as thin duplicate
 * content. A 404 must not claim a canonical either, so that tag is removed
 * rather than left pointing somewhere real.
 */
{
  const notFoundBody = render('/__not-found__')
  let out = template.replace(marker, `<div id="root">${notFoundBody}</div>`)
  out = replaceOne(
    out,
    /<title>[\s\S]*?<\/title>/,
    () => '<title>Page Not Found | MotionCraft</title>',
    '<title> (404)'
  )
  out = replaceOne(
    out,
    /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
    (_m, open, close) => `${open}This MotionCraft page does not exist.${close}`,
    'meta description (404)'
  )
  out = replaceOne(
    out,
    /(<meta\s+name="robots"\s+content=")[^"]*("\s*\/?>)/,
    (_m, open, close) => `${open}noindex, follow${close}`,
    'meta robots (404)'
  )
  out = replaceOne(
    out,
    /\n?\s*<link\s+rel="canonical"[^>]*>/,
    () => '',
    'canonical (404)'
  )
  writeFileSync(path.join(root, 'dist', '404.html'), out)
}

/*
 * The studio is a client-only app, but the rewrite handed it dist/index.html —
 * which is the prerendered *homepage*. React went looking for the editor, found
 * a whole landing page, threw the markup away and re-rendered the root from
 * scratch: a flash of the wrong page on every visit to /studio.
 *
 * Its own shell, with the root left empty, puts main.tsx back on the createRoot
 * path it was written for. No canonical, because an empty shell is not a
 * document worth pointing at.
 */
{
  let out = template
  out = replaceOne(
    out,
    /<title>[\s\S]*?<\/title>/,
    () => '<title>Studio — MotionCraft</title>',
    '<title> (studio)'
  )
  out = replaceOne(
    out,
    /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
    (_m, open, close) => `${open}The MotionCraft editor: design CSS animations on a canvas and timeline, then export the code.${close}`,
    'meta description (studio)'
  )
  out = replaceOne(
    out,
    /(<meta\s+name="robots"\s+content=")[^"]*("\s*\/?>)/,
    (_m, open, close) => `${open}noindex, follow${close}`,
    'meta robots (studio)'
  )
  out = replaceOne(out, /\n?\s*<link\s+rel="canonical"[^>]*>/, () => '', 'canonical (studio)')
  mkdirSync(path.join(root, 'dist', 'studio'), { recursive: true })
  writeFileSync(path.join(root, 'dist', 'studio', 'index.html'), out)
}

/**
 * Gallery pages: an index plus one page per animation. Each is a real scene
 * rendered inline — the markup and its CSS are in the HTML, so the animation is
 * part of the indexable content rather than hidden behind an iframe.
 */
function writePage(routePath, outDir, meta) {
  const routeHtml = render(routePath)
  const out = withPageMetadata(template.replace(marker, `<div id="root">${routeHtml}</div>`), meta)
  const dir = path.join(root, 'dist', outDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), out)
}

writePage('/gallery', 'gallery', {
  slug: 'gallery',
  title: GALLERY_TITLE,
  description: GALLERY_DESCRIPTION,
  faq: [],
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Gallery' }],
  card: 'page-gallery',
})

for (const item of GALLERY) {
  writePage(`/gallery/${item.slug}`, path.join('gallery', item.slug), {
    slug: `gallery/${item.slug}`,
    title: galleryEntryTitle(item),
    description: item.description,
    faq: [],
    crumbs: [
      { name: 'Home', path: '/' },
      { name: 'Gallery', path: '/gallery' },
      { name: item.title },
    ],
    card: `gallery-${item.slug}`,
  })
}

/**
 * Templates: whole scenes rather than single animations, so they get their own
 * directory rather than being mixed into the gallery.
 */
writePage('/templates', 'templates', {
  slug: 'templates',
  title: TEMPLATES_TITLE,
  description: TEMPLATES_DESCRIPTION,
  faq: [],
  crumbs: [{ name: 'Home', path: '/' }, { name: 'Templates' }],
  card: 'page-templates',
})

for (const t of TEMPLATES) {
  writePage(`/templates/${t.slug}`, path.join('templates', t.slug), {
    slug: `templates/${t.slug}`,
    title: templateTitle(t),
    description: t.description,
    faq: [],
    crumbs: [
      { name: 'Home', path: '/' },
      { name: 'Templates', path: '/templates' },
      { name: t.name },
    ],
    card: `templates-${t.slug}`,
  })
}

const date = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: 'https://motioncraft.bahukhandi-labs.com/', priority: '1.0' },
  ...SEO_PAGES.map((page) => ({ loc: `https://motioncraft.bahukhandi-labs.com/${page.slug}`, priority: '0.8' })),
  { loc: 'https://motioncraft.bahukhandi-labs.com/templates', priority: '0.9' },
  ...TEMPLATES.map((t) => ({
    loc: `https://motioncraft.bahukhandi-labs.com/templates/${t.slug}`,
    priority: '0.8',
  })),
  { loc: 'https://motioncraft.bahukhandi-labs.com/gallery', priority: '0.9' },
  ...GALLERY.map((item) => ({
    loc: `https://motioncraft.bahukhandi-labs.com/gallery/${item.slug}`,
    priority: '0.7',
  })),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`
writeFileSync(path.join(root, 'dist', 'sitemap.xml'), sitemap)

// the SSR bundle is a build artifact, not something to deploy
if (existsSync(path.join(root, 'dist-ssr'))) {
  rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true })
}

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`
console.log(
  `prerendered ${urls.length} pages — ${SEO_PAGES.length} landing, ${TEMPLATES.length} template, ` +
    `${GALLERY.length} gallery ` +
    `(homepage HTML: ${kb(homepageHtml)})`
)
