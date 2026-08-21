import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Circle,
  Code2,
  Loader2,
  CreditCard,
  Image,
  Layers,
  LayoutTemplate,
  Monitor,
  Moon,
  MousePointerClick,
  PenLine,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Blocks,
  Sparkles,
  Square,
  Star,
  Sun,
  Type,
  Undo2,
  Upload,
  Link2,
} from 'lucide-react'
import { useStudio } from '@/store/studio'
import { usePlayback } from '@/hooks/usePlayback'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useTheme } from '@/hooks/useTheme'
import type { ElementType } from '@/lib/types'
import { CanvasStage } from './CanvasStage'
import { Timeline } from './Timeline'
import { Inspector } from './Inspector'
import { CodePanel } from './CodePanel'
import { PresetsPanel } from './PresetsPanel'
import { LayersPanel } from './LayersPanel'
import { ComponentsPanel } from './ComponentsPanel'
import { TemplatesPanel } from './TemplatesPanel'
import { DevicePreview } from './DevicePreview'
import { CommandPalette } from './CommandPalette'
import { ImportDialog } from './ImportDialog'
import { ShareDialog } from './ShareDialog'
import { IconButton, Tabs, ToastHost } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/Logo'
import { Seo } from '@/components/Seo'
import { clearShareHash, decodeDoc, readFormatHint, readSharePayload } from '@/lib/share'
import { toast } from '@/components/ui/primitives'

const STUDIO_TITLE = 'Studio — Visual CSS Animation Editor | MotionCraft'
const STUDIO_DESCRIPTION =
  'The MotionCraft editor: animate on a canvas and timeline with keyframes, bezier easing and 60+ presets, then export production-ready CSS, React, Vue, Svelte or Tailwind. Free, no login.'

const TOOLS: { type: ElementType; label: string; icon: typeof Square }[] = [
  { type: 'rect', label: 'Rectangle', icon: Square },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'button', label: 'Button', icon: MousePointerClick },
  { type: 'card', label: 'Card', icon: CreditCard },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'svg', label: 'Star', icon: Star },
  { type: 'path', label: 'Path', icon: PenLine },
]

export function Studio() {
  usePlayback()
  useHotkeys()
  const { isDark, cycle, theme } = useTheme()

  const s = useStudio
  const docName = useStudio((st) => st.doc.name)
  const canUndo = useStudio((st) => st.past.length > 0)
  const canRedo = useStudio((st) => st.future.length > 0)
  const leftTab = useStudio((st) => st.leftTab)
  const rightTab = useStudio((st) => st.rightTab)
  const deviceOn = useStudio((st) => st.device.on)

  /*
   * A share link carries the whole scene in its fragment. This runs on load and
   * again on hashchange: pasting a link while the studio is already open only
   * changes the fragment, which does not remount anything.
   */
  useEffect(() => {
    let cancelled = false

    const adopt = () => {
      const payload = readSharePayload()
      if (!payload) return
      const format = readFormatHint()
      decodeDoc(payload).then((shared) => {
        if (cancelled) return
        if (!shared) {
          toast('That share link could not be read')
          clearShareHash()
          return
        }
        useStudio.getState().loadSharedDoc(shared)
        // arriving from a page about one format? open on that one
        if (format) useStudio.getState().setExportFormat(format)
        // the scene is autosaved by now, so drop the payload from the address bar
        clearShareHash()
        toast('Opened shared scene — ⌘Z returns to your work')
      })
    }

    adopt()
    window.addEventListener('hashchange', adopt)
    return () => {
      cancelled = true
      window.removeEventListener('hashchange', adopt)
    }
  }, [])

  useEffect(() => {
    // An untouched scene would otherwise index as "Untitled Motion — MotionCraft",
    // which is a meaningless search result; only reflect a name the user chose.
    document.title =
      docName && docName !== 'Untitled Motion'
        ? `${docName} — MotionCraft`
        : STUDIO_TITLE
  }, [docName])

  return (
    // The studio needs elbow room; below ~1040px scroll horizontally rather
    // than letting the side panels get clipped.
    <div className="h-screen overflow-x-auto overflow-y-hidden bg-bg">
    <Seo title={STUDIO_TITLE} description={STUDIO_DESCRIPTION} path="/studio" noindex />
    <div className="flex h-full min-w-[1040px] flex-col overflow-hidden bg-bg">
      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-edge/10 bg-panel px-3">
        <Link to="/" className="flex items-center gap-2 pr-1" title="Back to home">
          <Logo />
          <span className="text-[13px] font-bold tracking-tight">MotionCraft</span>
        </Link>
        <div className="mx-1 h-5 w-px bg-edge/10" />
        <input
          className="h-8 w-52 rounded-lg border border-transparent bg-transparent px-2 text-[13px] font-medium text-ink outline-none transition-colors hover:border-edge/10 focus:border-accent/50 focus:bg-raised"
          value={docName}
          onChange={(e) => s.getState().setDocName(e.target.value)}
          spellCheck={false}
        />
        <button
          onClick={() => s.getState().setPaletteOpen(true)}
          className="ml-2 hidden h-8 items-center gap-2 rounded-lg border border-edge/10 bg-raised/60 px-2.5 text-[12px] text-mute transition-colors hover:border-edge/20 hover:text-ink lg:flex"
          title="Search everything (⌘K)"
        >
          <Search size={13} />
          Search
          <kbd className="rounded border border-edge/15 px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        <div className="ml-auto" />
        <SaveStatus />

        <div className="flex items-center gap-1">
          <IconButton
            title={deviceOn ? 'Back to canvas' : 'Device preview'}
            active={deviceOn}
            onClick={() => s.getState().setDevice({ on: !deviceOn })}
          >
            <Monitor size={15} />
          </IconButton>
          <IconButton title="Undo (⌘Z)" disabled={!canUndo} onClick={() => s.getState().undo()} className="disabled:opacity-30">
            <Undo2 size={15} />
          </IconButton>
          <IconButton title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={() => s.getState().redo()} className="disabled:opacity-30">
            <Redo2 size={15} />
          </IconButton>
          <IconButton
            title="New scene (clears canvas)"
            onClick={() => {
              if (confirm('Start a new scene? Current work stays in undo history.')) s.getState().resetDoc()
            }}
          >
            <RotateCcw size={15} />
          </IconButton>
          <IconButton title={`Theme: ${theme}`} onClick={cycle}>
            {isDark ? <Moon size={15} /> : <Sun size={15} />}
          </IconButton>
          <IconButton title="Share link" onClick={() => s.getState().setShareOpen(true)}>
            <Link2 size={15} />
          </IconButton>
          <IconButton title="Import CSS" onClick={() => s.getState().setImportOpen(true)}>
            <Upload size={15} />
          </IconButton>
          <button
            onClick={() => s.getState().setRightTab('code')}
            className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_12px_rgb(var(--mc-accent)/0.4)] transition-all hover:brightness-110 active:scale-95"
          >
            <Code2 size={14} />
            Export
          </button>
        </div>
      </header>

      {/* main area */}
      <div className="flex min-h-0 flex-1">
        {/* tool rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-edge/10 bg-panel py-2">
          {TOOLS.map((t) => (
            <IconButton key={t.type} title={`Add ${t.label}`} onClick={() => s.getState().addElement(t.type)}>
              <t.icon size={16} />
            </IconButton>
          ))}
        </div>

        {/* left panel */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-edge/10 bg-panel xl:w-60">
          <div className="p-2 pb-0">
            <Tabs
              tabs={[
                { id: 'layers' as const, label: <span className="inline-flex items-center gap-1"><Layers size={10} /> Layers</span> },
                { id: 'presets' as const, label: <span className="inline-flex items-center gap-1"><Sparkles size={10} /> Motion</span> },
                { id: 'components' as const, label: <span className="inline-flex items-center gap-1"><Blocks size={10} /> Parts</span> },
                { id: 'templates' as const, label: <span className="inline-flex items-center gap-1"><LayoutTemplate size={10} /> Scenes</span> },
              ]}
              value={leftTab}
              onChange={(t) => s.getState().setLeftTab(t)}
            />
          </div>
          <div className="min-h-0 flex-1">
            {leftTab === 'layers' ? (
              <LayersPanel />
            ) : leftTab === 'presets' ? (
              <PresetsPanel />
            ) : leftTab === 'templates' ? (
              <TemplatesPanel />
            ) : (
              <ComponentsPanel />
            )}
          </div>
        </aside>

        {/* canvas */}
        <main className="min-w-[240px] flex-1">
          {deviceOn ? <DevicePreview /> : <CanvasStage />}
        </main>

        {/* right panel */}
        <aside className="flex w-[268px] shrink-0 flex-col border-l border-edge/10 bg-panel xl:w-[300px]">
          <div className="p-2 pb-0">
            <Tabs
              tabs={[
                { id: 'inspect' as const, label: <span className="inline-flex items-center gap-1"><SlidersHorizontal size={11} /> Inspect</span> },
                { id: 'code' as const, label: <span className="inline-flex items-center gap-1"><Code2 size={11} /> Code</span> },
              ]}
              value={rightTab}
              onChange={(t) => s.getState().setRightTab(t)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {rightTab === 'inspect' ? <Inspector /> : <CodePanel />}
          </div>
        </aside>
      </div>

      {/* timeline */}
      <div className="h-[264px] shrink-0">
        <Timeline />
      </div>

      <ToastHost />
      <CommandPalette />
      <ImportDialog />
      <ShareDialog />
    </div>
    </div>
  )
}

/**
 * "Saved to this browser" — the only reassurance on offer.
 *
 * There is no account and no server copy, so a visitor has no way to tell
 * whether closing the tab loses the work. Saying it plainly, and saying where
 * it went, is the whole point: local is a feature, but only if it is visible.
 */
function SaveStatus() {
  const saveState = useStudio((s) => s.saveState)
  const savedAt = useStudio((s) => s.savedAt)
  const [, tick] = useState(0)

  // re-render on a slow beat so "2 min ago" does not go stale while idle
  useEffect(() => {
    if (!savedAt) return
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [savedAt])

  if (saveState === 'idle' && !savedAt) return null

  const saving = saveState === 'saving'
  const mins = savedAt ? Math.floor((Date.now() - savedAt) / 60000) : 0
  const when = saving ? 'Saving…' : mins < 1 ? 'Saved' : mins === 1 ? 'Saved 1 min ago' : `Saved ${mins} min ago`

  return (
    <div
      className="mr-2 hidden items-center gap-1.5 text-[11.5px] text-mute md:flex"
      title="Your scene is stored in this browser only — never uploaded"
      aria-live="polite"
    >
      {saving ? (
        <Loader2 size={12} className="animate-spin text-mute" />
      ) : (
        <Check size={12} className="text-green-500/80" />
      )}
      <span>{when}</span>
      <span className="hidden text-mute/60 lg:inline">{'\u00A0'}&middot; on this device</span>
    </div>
  )
}
