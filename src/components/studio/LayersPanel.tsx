import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Circle,
  CreditCard,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Image,
  Lock,
  LockOpen,
  MousePointerClick,
  PenLine,
  Square,
  Star,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react'
import { useStudio } from '@/store/studio'
import { childGroups, elementsOfGroup, ungroupedElements } from '@/lib/engine'
import type { Group, StudioElement } from '@/lib/types'
import { Button } from '@/components/ui/primitives'

const TYPE_ICONS: Record<string, typeof Square> = {
  rect: Square,
  circle: Circle,
  text: Type,
  button: MousePointerClick,
  card: CreditCard,
  image: Image,
  svg: Star,
  path: PenLine,
}

export function LayersPanel() {
  const doc = useStudio((s) => s.doc)
  const selection = useStudio((s) => s.selection)
  const s = useStudio

  const loose = [...ungroupedElements(doc)].reverse()
  const groups = [...childGroups(doc, null)].reverse()
  const canGroup = [...doc.elements, ...doc.groups].some((n) => selection.includes(n.id))
  const canUngroup = doc.groups.some((g) => selection.includes(g.id))

  return (
    <div className="flex h-full flex-col">
      {(canGroup || canUngroup) && (
        <div className="flex gap-1.5 border-b border-edge/[0.07] p-2">
          <Button
            size="sm"
            variant="soft"
            className="flex-1"
            disabled={!canGroup}
            onClick={() => s.getState().groupSelection()}
            title="Group selection (⌘G)"
          >
            <Folder size={12} />
            Group
          </Button>
          <Button
            size="sm"
            variant="soft"
            className="flex-1"
            disabled={!canUngroup}
            onClick={() => s.getState().ungroupSelection()}
            title="Ungroup (⌘⇧G)"
          >
            <Ungroup size={12} />
            Ungroup
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5">
        {doc.elements.length === 0 && doc.groups.length === 0 && (
          <div className="p-4 text-center text-[12px] leading-relaxed text-mute">
            No layers yet.
            <br />
            Add elements from the left toolbar.
          </div>
        )}

        {groups.map((g) => (
          <GroupRow key={g.id} group={g} selected={selection.includes(g.id)} />
        ))}

        {loose.map((el) => (
          <LayerRow
            key={el.id}
            el={el}
            index={doc.elements.findIndex((e) => e.id === el.id)}
            total={doc.elements.length}
            selected={selection.includes(el.id)}
          />
        ))}
      </div>
    </div>
  )
}

function GroupRow({ group, selected }: { group: Group; selected: boolean }) {
  const s = useStudio
  const doc = useStudio((st) => st.doc)
  const selection = useStudio((st) => st.selection)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const members = [...elementsOfGroup(doc, group.id)].reverse()
  const nested = [...childGroups(doc, group.id)].reverse()
  const childCount = members.length + nested.length

  return (
    <div className="mb-0.5">
      <div
        className={`group flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors ${
          selected ? 'bg-accent/[0.12]' : 'hover:bg-edge/[0.05]'
        }`}
        onClick={(e) => s.getState().select([group.id], e.shiftKey)}
        onDoubleClick={() => {
          setName(group.name)
          setEditing(true)
        }}
      >
        <button
          className="text-mute transition-colors hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            s.getState().toggleGroupOpen(group.id)
          }}
        >
          {group.open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {group.open ? (
          <FolderOpen size={13} className={selected ? 'text-accent' : 'text-mute'} />
        ) : (
          <Folder size={13} className={selected ? 'text-accent' : 'text-mute'} />
        )}
        {editing ? (
          <input
            autoFocus
            className="mc-input !h-6 flex-1 !text-xs"
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false)
              if (name.trim() && name !== group.name) s.getState().renameNode(group.id, name.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <span
            className={`flex-1 truncate text-[12.5px] font-medium ${
              selected ? 'text-ink' : 'text-ink/80'
            } ${!group.visible ? 'opacity-40' : ''}`}
          >
            {group.name}
          </span>
        )}
        <span className="rounded bg-edge/10 px-1 text-[9px] font-semibold text-mute">
          {childCount}
        </span>
        {group.tracks.length > 0 && (
          <span
            className="rounded bg-key/15 px-1 text-[9px] font-semibold text-key"
            title={`${group.tracks.length} animated properties`}
          >
            {group.tracks.length}
          </span>
        )}
        <RowActions
          id={group.id}
          visible={group.visible}
          locked={group.locked}
          onUngroup={
            group.parentId
              ? () => s.getState().moveGroupToParent(group.id, null)
              : undefined
          }
          onDelete={() => {
            s.getState().select([group.id])
            s.getState().removeSelected()
          }}
        />
      </div>

      {group.open && (
        <div className="ml-3 border-l border-edge/10 pl-1.5">
          {childCount === 0 && <div className="px-2 py-1.5 text-[11px] text-mute">Empty group</div>}
          {/* nested groups render through the same row component, so the tree
              goes as deep as the document does */}
          {nested.map((g) => (
            <GroupRow key={g.id} group={g} selected={selection.includes(g.id)} />
          ))}
          {members.map((el) => (
            <LayerRow
              key={el.id}
              el={el}
              index={doc.elements.findIndex((e) => e.id === el.id)}
              total={doc.elements.length}
              selected={selection.includes(el.id)}
              inGroup
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LayerRow({
  el,
  index,
  total,
  selected,
  inGroup = false,
}: {
  el: StudioElement
  index: number
  total: number
  selected: boolean
  inGroup?: boolean
}) {
  const s = useStudio
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(el.name)
  const Icon = TYPE_ICONS[el.type] ?? Square

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        selected ? 'bg-accent/[0.12]' : 'hover:bg-edge/[0.05]'
      }`}
      onClick={(e) => s.getState().select([el.id], e.shiftKey)}
      onDoubleClick={() => {
        setName(el.name)
        setEditing(true)
      }}
    >
      <Icon size={13} className={selected ? 'text-accent' : 'text-mute'} />
      {editing ? (
        <input
          autoFocus
          className="mc-input !h-6 flex-1 !text-xs"
          value={name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setEditing(false)
            if (name.trim() && name !== el.name) s.getState().renameNode(el.id, name.trim())
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span
          className={`flex-1 truncate text-[12.5px] ${selected ? 'font-medium text-ink' : 'text-ink/80'} ${
            !el.visible ? 'opacity-40' : ''
          }`}
        >
          {el.name}
        </span>
      )}
      {el.tracks.length > 0 && (
        <span
          className="rounded bg-key/15 px-1 text-[9px] font-semibold text-key"
          title={`${el.tracks.length} animated properties`}
        >
          {el.tracks.length}
        </span>
      )}
      <RowActions
        id={el.id}
        visible={el.visible}
        locked={el.locked}
        canMoveUp={index < total - 1}
        canMoveDown={index > 0}
        onUp={() => s.getState().reorderElement(el.id, index + 1)}
        onDown={() => s.getState().reorderElement(el.id, index - 1)}
        onUngroup={inGroup ? () => s.getState().moveToGroup(el.id, null) : undefined}
        onDelete={() => {
          s.getState().select([el.id])
          s.getState().removeSelected()
        }}
      />
    </div>
  )
}

function RowActions({
  id,
  visible,
  locked,
  canMoveUp,
  canMoveDown,
  onUp,
  onDown,
  onUngroup,
  onDelete,
}: {
  id: string
  visible: boolean
  locked: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onUp?: () => void
  onDown?: () => void
  onUngroup?: () => void
  onDelete: () => void
}) {
  const s = useStudio
  return (
    <div className="hidden items-center gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
      {onUp && (
        <button
          className="rounded p-0.5 text-mute hover:text-ink disabled:opacity-30"
          disabled={!canMoveUp}
          title="Bring forward"
          onClick={onUp}
        >
          <ArrowUp size={12} />
        </button>
      )}
      {onDown && (
        <button
          className="rounded p-0.5 text-mute hover:text-ink disabled:opacity-30"
          disabled={!canMoveDown}
          title="Send backward"
          onClick={onDown}
        >
          <ArrowDown size={12} />
        </button>
      )}
      {onUngroup && (
        <button className="rounded p-0.5 text-mute hover:text-ink" title="Remove from group" onClick={onUngroup}>
          <Ungroup size={12} />
        </button>
      )}
      <button
        className="rounded p-0.5 text-mute hover:text-ink"
        title={visible ? 'Hide' : 'Show'}
        onClick={() => s.getState().toggleVisible(id)}
      >
        {visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
      <button
        className="rounded p-0.5 text-mute hover:text-ink"
        title={locked ? 'Unlock' : 'Lock'}
        onClick={() => s.getState().toggleLocked(id)}
      >
        {locked ? <Lock size={12} /> : <LockOpen size={12} />}
      </button>
      <button className="rounded p-0.5 text-mute hover:text-red-400" title="Delete" onClick={onDelete}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}
