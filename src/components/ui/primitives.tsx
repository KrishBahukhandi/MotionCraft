import { clsx } from 'clsx'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'

// ---------------------------------------------------------------- Button

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'soft', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex select-none items-center justify-center gap-1.5 rounded-xl font-medium outline-none transition-all duration-150 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' && 'h-7 px-2.5 text-xs',
        size === 'md' && 'h-9 px-3.5 text-[13px]',
        size === 'lg' && 'h-11 px-5 text-sm',
        variant === 'primary' &&
          'bg-accent text-white shadow-[0_2px_12px_rgb(var(--mc-accent)/0.4)] hover:brightness-110',
        variant === 'soft' && 'bg-edge/[0.07] text-ink hover:bg-edge/[0.12]',
        variant === 'ghost' && 'text-mute hover:bg-edge/[0.07] hover:text-ink',
        variant === 'danger' && 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
        className
      )}
      {...rest}
    />
  )
}

export function IconButton({
  active,
  className,
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={clsx('mc-toolbar-btn', active && 'active', className)}
      {...rest}
    />
  )
}

// ---------------------------------------------------------------- Tabs

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: ReactNode }[]
  value: T
  onChange: (t: T) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-edge/[0.06] p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'flex-1 rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
            value === t.id ? 'bg-panel text-ink shadow-sm' : 'text-mute hover:text-ink'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- NumberField (scrubbable)

export function NumberField({
  label,
  value,
  onChange,
  onCommit,
  min,
  max,
  step = 1,
  unit,
  className,
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  /** called once when a scrub/edit gesture starts (for history) */
  onCommit?: () => void
  min?: number
  max?: number
  step?: number
  unit?: string
  className?: string
}) {
  const [text, setText] = useState<string | null>(null)
  const dragging = useRef(false)

  const clampV = useCallback(
    (v: number) => {
      if (min !== undefined) v = Math.max(min, v)
      if (max !== undefined) v = Math.min(max, v)
      const decimals = step < 1 ? 2 : 0
      return parseFloat(v.toFixed(decimals))
    },
    [min, max, step]
  )

  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startV = value
    let started = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      if (!started && Math.abs(dx) > 2) {
        started = true
        dragging.current = true
        onCommit?.()
      }
      if (started) onChange(clampV(startV + dx * step * (ev.shiftKey ? 10 : 1)))
    }
    const up = () => {
      dragging.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const display = text ?? String(Math.round(value * 100) / 100)

  return (
    <label className={clsx('flex items-center gap-1.5', className)}>
      {label && (
        <span
          onPointerDown={startScrub}
          className="w-[62px] shrink-0 cursor-ew-resize select-none truncate text-[10.5px] font-medium uppercase tracking-wide text-mute"
          title={`${label} — drag to scrub`}
        >
          {label}
        </span>
      )}
      <div className="relative flex-1">
        <input
          className="mc-input pr-7"
          value={display}
          inputMode="decimal"
          onFocus={(e) => {
            setText(display)
            e.target.select()
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== null) {
              const v = parseFloat(text)
              if (!Number.isNaN(v)) {
                onCommit?.()
                onChange(clampV(v))
              }
              setText(null)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setText(null)
              ;(e.target as HTMLInputElement).blur()
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)
              onCommit?.()
              onChange(clampV(value + delta))
              setText(null)
            }
          }}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-mute">
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

// ---------------------------------------------------------------- ColorField

export function ColorField({
  label,
  value,
  onChange,
  onCommit,
  className,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  onCommit?: () => void
  className?: string
}) {
  const [text, setText] = useState<string | null>(null)
  // native color input only supports #rrggbb
  const hex6 = /^#[0-9a-fA-F]{8}$/.test(value) ? value.slice(0, 7) : /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  const alpha = /^#[0-9a-fA-F]{8}$/.test(value) ? parseInt(value.slice(7, 9), 16) / 255 : 1
  const committed = useRef(false)

  const commitOnce = () => {
    if (!committed.current) {
      committed.current = true
      onCommit?.()
      setTimeout(() => (committed.current = false), 500)
    }
  }

  const setAlpha = (a: number) => {
    const aa = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')
    onChange(`${hex6}${aa === 'ff' ? '' : aa}`)
  }

  return (
    <div className={clsx('flex items-center gap-1.5', className)}>
      {label && (
        <span
          className="w-[62px] shrink-0 truncate text-[10.5px] font-medium uppercase tracking-wide text-mute"
          title={label}
        >
          {label}
        </span>
      )}
      <div className="mc-checker rounded-lg">
        <input
          type="color"
          className="mc-swatch"
          value={hex6}
          onChange={(e) => {
            commitOnce()
            const aa =
              alpha < 1
                ? Math.round(alpha * 255)
                    .toString(16)
                    .padStart(2, '0')
                : ''
            onChange(`${e.target.value}${aa}`)
          }}
          style={{ opacity: 0.99 }}
        />
      </div>
      <input
        className="mc-input flex-1 font-mono text-xs"
        value={text ?? value}
        spellCheck={false}
        onFocus={(e) => {
          setText(value)
          e.target.select()
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== null && /^#[0-9a-fA-F]{3,8}$/.test(text.trim())) {
            onCommit?.()
            onChange(text.trim())
          }
          setText(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <input
        type="range"
        className="mc-range w-14"
        min={0}
        max={1}
        step={0.01}
        value={alpha}
        title={`Alpha ${Math.round(alpha * 100)}%`}
        onPointerDown={() => onCommit?.()}
        onChange={(e) => setAlpha(parseFloat(e.target.value))}
      />
    </div>
  )
}

// ---------------------------------------------------------------- Select

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      className={clsx('mc-input cursor-pointer appearance-none', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------- Section

export function Section({
  title,
  children,
  right,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  right?: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-edge/[0.07] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-mute transition-colors hover:text-ink"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={clsx('transition-transform duration-150', open ? 'rotate-90' : '')}
          >
            <path d="M2 1 L6 4 L2 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {title}
        </button>
        {right}
      </div>
      {open && <div className="mt-2.5 flex flex-col gap-2">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- Kbd

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-edge/15 bg-raised px-1.5 py-0.5 font-mono text-[10px] text-mute">
      {children}
    </kbd>
  )
}

// ---------------------------------------------------------------- Toast (simple)

let toastFn: ((msg: string) => void) | null = null

export function toast(msg: string) {
  toastFn?.(msg)
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    toastFn = (m) => {
      setMsg(m)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 2200)
    }
    return () => {
      toastFn = null
    }
  }, [])
  if (!msg) return null
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div className="animate-[mc-float-slow_0.01s] rounded-xl border border-edge/10 bg-panel px-4 py-2.5 text-[13px] font-medium shadow-float">
        {msg}
      </div>
    </div>
  )
}
