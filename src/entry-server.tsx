import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AppRoutes } from './App'
export { SEO_PAGES } from './components/landing/SeoLandingPage'
export { TEMPLATES } from '@/lib/templates'
export { templateTitle } from '@/components/templates/TemplateEntryPage'
export { TEMPLATES_TITLE, TEMPLATES_DESCRIPTION } from '@/components/templates/TemplateIndex'
export { GALLERY } from './lib/gallery'
export { galleryEntryTitle } from './components/gallery/GalleryEntryPage'
export { GALLERY_TITLE, GALLERY_DESCRIPTION } from './components/gallery/GalleryIndex'

/**
 * Build-time render of each marketing route. The interactive studio is not
 * prerendered because it is intentionally excluded from search indexing.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <AppRoutes />
    </StaticRouter>
  )
}
