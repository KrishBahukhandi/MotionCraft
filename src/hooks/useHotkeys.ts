import { useEffect } from 'react'
import { useStudio } from '@/store/studio'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/** Global studio keyboard shortcuts. */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStudio.getState()
      const mod = e.metaKey || e.ctrlKey

      // the palette toggle works even while a field has focus
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        s.setPaletteOpen(!s.paletteOpen)
        return
      }
      if (isEditable(e.target) || s.paletteOpen) return
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) s.ungroupSelection()
        else s.groupSelection()
        return
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        s.duplicateSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        s.copySelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        s.paste()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        // select top-level objects, not everything inside groups
        s.select([
          ...s.doc.groups.filter((g) => !g.parentId).map((g) => g.id),
          ...s.doc.elements.filter((el) => !el.groupId).map((el) => el.id),
        ])
        return
      }
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        s.setCanvasView({ zoom: s.canvas.zoom * 1.2 })
        return
      }
      if (mod && e.key === '-') {
        e.preventDefault()
        s.setCanvasView({ zoom: s.canvas.zoom / 1.2 })
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        s.setCanvasView({ zoom: 1, x: 0, y: 0 })
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          s.togglePlay()
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (s.selectedKf) s.removeKeyframe(s.selectedKf)
          else s.removeSelected()
          break
        case 'Escape':
          s.select([])
          s.selectKf(null)
          break
        case 'ArrowLeft':
          if (s.selection.length && !e.altKey) {
            e.preventDefault()
            s.pushHistory()
            s.nudgeSelected(e.shiftKey ? -10 : -1, 0)
          } else {
            s.stepFrame(-1)
          }
          break
        case 'ArrowRight':
          if (s.selection.length && !e.altKey) {
            e.preventDefault()
            s.pushHistory()
            s.nudgeSelected(e.shiftKey ? 10 : 1, 0)
          } else {
            s.stepFrame(1)
          }
          break
        case 'ArrowUp':
          if (s.selection.length) {
            e.preventDefault()
            s.pushHistory()
            s.nudgeSelected(0, e.shiftKey ? -10 : -1)
          }
          break
        case 'ArrowDown':
          if (s.selection.length) {
            e.preventDefault()
            s.pushHistory()
            s.nudgeSelected(0, e.shiftKey ? 10 : 1)
          }
          break
        case 'Home':
          s.setTime(0)
          break
        case 'End':
          s.setTime(s.doc.duration)
          break
        case 'k':
        case 'K': {
          // toggle keyframe on x/y for selected elements (quick position key)
          for (const id of s.selection) {
            s.toggleKeyframe(id, 'x')
            s.toggleKeyframe(id, 'y')
          }
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
