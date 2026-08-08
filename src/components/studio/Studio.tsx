import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Circle,
  Code2,
  CreditCard,
  Image,
  Layers,
  Monitor,
  Moon,
  MousePointerClick,
  PenLine,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Sun,
  Type,
  Undo2,
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
import { DevicePreview } from './DevicePreview'
import { CommandPalette } from './CommandPalette'
import { IconButton, Tabs, ToastHost } from '@/components/ui/primitives'
import { Logo } from '@/components/ui/Logo'

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

  useEffect(() => {
    document.title = `${docName} — MotionCraft`
  }, [docName])

  return (
    // The studio needs elbow room; below ~1040px scroll horizontally rather
    // than letting the side panels get clipped.
    <div className="h-screen overflow-x-auto overflow-y-hidden bg-bg">
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

        <div className="ml-auto flex items-center gap-1">
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
                { id: 'layers' as const, label: <span className="inline-flex items-center gap-1"><Layers size={11} /> Layers</span> },
                { id: 'presets' as const, label: <span className="inline-flex items-center gap-1"><Sparkles size={11} /> Presets</span> },
              ]}
              value={leftTab}
              onChange={(t) => s.getState().setLeftTab(t)}
            />
          </div>
          <div className="min-h-0 flex-1">{leftTab === 'layers' ? <LayersPanel /> : <PresetsPanel />}</div>
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
    </div>
    </div>
  )
}
