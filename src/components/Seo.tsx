import { useEffect } from 'react'

export const SITE_URL = 'https://motioncraft.bahukhandi-labs.com'

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Keeps title/description/canonical correct per route.
 *
 * The landing page ships these statically in index.html (it is prerendered, so
 * crawlers see them without running JS). This component exists for the routes
 * that share that same HTML shell — without it, /studio would inherit the
 * landing page's tags and declare the wrong canonical URL.
 */
export function Seo({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string
  description: string
  path: string
  noindex?: boolean
}) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`
    document.title = title
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setLink('canonical', url)
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'
    )
  }, [title, description, path, noindex])

  return null
}
