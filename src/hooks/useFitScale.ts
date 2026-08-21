import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** `useLayoutEffect` warns during SSR, and these pages are prerendered. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Scales a fixed-size artboard into whatever width its column gives it.
 *
 * The scenes are laid out in absolute pixels, so they cannot reflow — they can
 * only be scaled. Keep the *box* sized by CSS (aspect-ratio) and let this
 * handle the contents, or the first paint is the wrong height and the
 * measurement moves it.
 */
export function useFitScale(docWidth: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useIsoLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setScale(node.clientWidth / docWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [docWidth])
  return { ref, scale }
}
