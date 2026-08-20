import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Landing } from '@/components/landing/Landing'
import { SeoLandingPage } from '@/components/landing/SeoLandingPage'
import { GalleryIndex } from '@/components/gallery/GalleryIndex'
import { GalleryEntryPage } from '@/components/gallery/GalleryEntryPage'

const Studio = lazy(() =>
  import('@/components/studio/Studio').then((m) => ({ default: m.Studio }))
)

function StudioFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <div className="text-[13px] text-mute">Loading studio…</div>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* static segments outrank /:slug in React Router's ranking, so the
          gallery routes are safe alongside the SEO slug catch-all */}
      <Route path="/gallery" element={<GalleryIndex />} />
      <Route path="/gallery/:slug" element={<GalleryEntryPage />} />
      <Route path="/:slug" element={<SeoLandingPage />} />
      <Route
        path="/studio"
        element={
          <Suspense fallback={<StudioFallback />}>
            <Studio />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
