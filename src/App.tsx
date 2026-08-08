import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Landing } from '@/components/landing/Landing'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/studio"
          element={
            <Suspense fallback={<StudioFallback />}>
              <Studio />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
