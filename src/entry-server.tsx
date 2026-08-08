import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Landing } from './components/landing/Landing'

/**
 * Build-time render of the marketing page. Only the landing route is
 * prerendered — the studio is an application shell with nothing to index, and
 * lazy-loading it keeps the static payload small.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <Landing />
    </StaticRouter>
  )
}
