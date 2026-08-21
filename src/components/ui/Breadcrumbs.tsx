import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  /** omitted on the current page, which is not a link */
  to?: string
}

/**
 * Visible trail for the directory pages.
 *
 * Ninety-odd pages hang off two sections, and until now a visitor two levels
 * deep had one link back and no sense of where they were. The matching
 * BreadcrumbList is emitted at build time in scripts/prerender.mjs, because
 * that is what a crawler reads.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-5 pt-6">
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-mute">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-mute/50" />}
            {c.to ? (
              <Link to={c.to} className="transition-colors hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink/70" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
