import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AppRoutes } from './App'
export { SEO_PAGES } from './components/landing/SeoLandingPage'
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
