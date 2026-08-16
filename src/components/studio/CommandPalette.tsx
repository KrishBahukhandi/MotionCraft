import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Blocks,
  Box,
  Code2,
  CornerDownLeft,
  Diamond,
  Folder,
  Layers,
  Play,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useStudio } from '@/store/studio'
import { isGroup } from '@/lib/types'
import { PRESETS } from '@/lib/presets'
import { COMPONENT_PRESETS } from '@/lib/components'
import { PROP_DEFS } from '@/lib/properties'
import { EXPORT_FORMATS } from '@/lib/exporters'
import { ELEMENT_SPECS } from '@/lib/elements'
import { toast } from '@/components/ui/primitives'

interface Item {
  id: string
  label: string
  hint?: string
  section: string
  icon: typeof Box
  run: () => void
}

/** Subsequence match — "fiu" matches "Fade In Up". Returns null when no match. */
function score(query: string, text: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const direct = t.indexOf(q)
  if (direct >= 0) return direct === 0 ? 0 : 1 + direct * 0.01
  let qi = 0
  let gaps = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
    else if (qi > 0) gaps++
  }
  return qi === q.length ? 50 + gaps * 0.01 : null
}

export function CommandPalette() {
  const open = useStudio((s) => s.paletteOpen)
  const doc = useStudio((s) => s.doc)
  const selection = useStudio((s) => s.selection)
  const setOpen = useStudio((s) => s.setPaletteOpen)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const s = useStudio.getState()
    const out: Item[] = []

    // layers (elements + groups)
    for (const node of [...doc.groups, ...doc.elements]) {
      out.push({
        id: `layer-${node.id}`,
        label: node.name,
        hint: isGroup(node) ? 'Group' : node.type,
        section: 'Layers',
        icon: isGroup(node) ? Folder : Layers,
        run: () => {
          s.select([node.id])
          s.setRightTab('inspect')
        },
      })
    }

    // commands
    const cmds: [string, string, typeof Box, () => void][] = [
      ['Play / Pause', 'Space', Play, () => s.togglePlay()],
      ['Restart animation', '', Play, () => s.restart()],
      ['Undo', '⌘Z', Wand2, () => s.undo()],
      ['Redo', '⌘⇧Z', Wand2, () => s.redo()],
      ['Group selection', '⌘G', Folder, () => s.groupSelection()],
      ['Ungroup selection', '⌘⇧G', Folder, () => s.ungroupSelection()],
      ['Duplicate selection', '⌘D', Layers, () => s.duplicateSelected()],
      ['Delete selection', 'Delete', Layers, () => s.removeSelected()],
      [
        'Select all',
        '⌘A',
        Layers,
        () =>
          s.select([
            ...doc.groups.filter((g) => !g.parentId).map((g) => g.id),
            ...doc.elements.filter((e) => !e.groupId).map((e) => e.id),
          ]),
      ],
      ['Toggle device preview', '', Box, () => s.setDevice({ on: !s.device.on })],
      ['Toggle loop', '', Play, () => s.setLoop(!s.loop)],
      ['Import CSS', '', Code2, () => s.setImportOpen(true)],
      ['Share this scene', '', Code2, () => s.setShareOpen(true)],
      ['Show code panel', '', Code2, () => s.setRightTab('code')],
      ['Show motion presets', '', Sparkles, () => s.setLeftTab('presets')],
      ['Show components', '', Blocks, () => s.setLeftTab('components')],
      ['Add CSS variable', '', Wand2, () => s.addVariable()],
      ['Zoom to 100%', '⌘0', Box, () => s.setCanvasView({ zoom: 1, x: 0, y: 0 })],
      ['New scene', '', Box, () => s.resetDoc()],
    ]
    for (const [label, hint, icon, run] of cmds) {
      out.push({ id: `cmd-${label}`, label, hint, section: 'Commands', icon, run })
    }

    // insert elements
    for (const spec of ELEMENT_SPECS) {
      out.push({
        id: `add-${spec.type}`,
        label: `Add ${spec.label}`,
        section: 'Insert',
        icon: Box,
        run: () => s.addElement(spec.type),
      })
    }

    // component presets insert finished UI, so they need no selection
    for (const preset of COMPONENT_PRESETS) {
      out.push({
        id: `component-${preset.id}`,
        label: preset.label,
        hint: preset.category,
        section: 'Components',
        icon: Blocks,
        run: () => {
          s.insertComponent(preset)
          if (preset.duration) s.restart()
          toast(`Inserted “${preset.label}”`)
        },
      })
    }

    // presets
    for (const preset of PRESETS) {
      out.push({
        id: `preset-${preset.id}`,
        label: preset.label,
        hint: `${preset.category} · ${preset.duration}ms`,
        section: 'Presets',
        icon: Sparkles,
        run: () => {
          if (useStudio.getState().selection.length === 0) {
            toast('Select an element first')
            return
          }
          s.applyPreset(preset)
          s.restart()
          toast(`Applied “${preset.label}”`)
        },
      })
    }

    // animatable properties — keyframe them on the selection
    if (selection.length > 0) {
      for (const def of PROP_DEFS) {
        out.push({
          id: `prop-${def.key}`,
          label: `Keyframe ${def.label}`,
          hint: def.group,
          section: 'Properties',
          icon: Diamond,
          run: () => {
            for (const id of useStudio.getState().selection) s.toggleKeyframe(id, def.key)
            toast(`Keyframed ${def.label}`)
          },
        })
      }
    }

    // export formats
    for (const f of EXPORT_FORMATS) {
      out.push({
        id: `fmt-${f.id}`,
        label: `Export as ${f.label}`,
        hint: f.file,
        section: 'Export',
        icon: Code2,
        run: () => s.setRightTab('code'),
      })
    }

    return out
  }, [doc, selection])

  const results = useMemo(() => {
    if (!query.trim()) {
      return items.filter((i) => i.section === 'Commands' || i.section === 'Layers').slice(0, 12)
    }
    const scored: { item: Item; s: number }[] = []
    for (const item of items) {
      const sc = score(query.trim(), `${item.label} ${item.hint ?? ''}`)
      if (sc !== null) scored.push({ item, s: sc })
    }
    return scored.sort((a, b) => a.s - b.s).slice(0, 24).map((x) => x.item)
  }, [items, query])

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)))
  }, [results.length])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const runActive = () => {
    const item = results[active]
    if (!item) return
    setOpen(false)
    // let the overlay unmount before mutating the doc
    requestAnimationFrame(() => item.run())
  }

  let lastSection = ''

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-[min(620px,92vw)] overflow-hidden rounded-2xl border border-edge/10 bg-panel shadow-float">
        <div className="flex items-center gap-2.5 border-b border-edge/[0.07] px-4">
          <Search size={15} className="text-mute" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers, presets, properties, commands…"
            className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                runActive()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setOpen(false)
              }
            }}
          />
          <kbd className="rounded-md border border-edge/15 bg-raised px-1.5 py-0.5 font-mono text-[10px] text-mute">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-mute">No matches</div>
          )}
          {results.map((item, i) => {
            const header = item.section !== lastSection ? item.section : null
            lastSection = item.section
            return (
              <div key={item.id}>
                {header && (
                  <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-mute">
                    {header}
                  </div>
                )}
                <button
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={runActive}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    i === active ? 'bg-accent/[0.14]' : 'hover:bg-edge/[0.05]'
                  }`}
                >
                  <item.icon size={14} className={i === active ? 'text-accent' : 'text-mute'} />
                  <span className="flex-1 truncate text-[13px]">{item.label}</span>
                  {item.hint && (
                    <span className="shrink-0 text-[11px] capitalize text-mute">{item.hint}</span>
                  )}
                  {i === active && <CornerDownLeft size={12} className="text-mute" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
