import { useEffect } from 'react'
import { useStudio } from '@/store/studio'

/** Drives the playhead with requestAnimationFrame while playing. */
export function usePlayback() {
  const playing = useStudio((s) => s.playing)
  const speed = useStudio((s) => s.speed)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) * speed
      last = now
      useStudio.getState().advance(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed])
}
