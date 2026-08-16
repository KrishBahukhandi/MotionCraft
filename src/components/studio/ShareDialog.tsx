import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Copy, Link2, X } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { buildShareUrl, describeLength, encodeDoc } from '@/lib/share'
import { Button, toast } from '@/components/ui/primitives'
import { copyText } from '@/lib/utils'

export function ShareDialog() {
  const open = useStudio((s) => s.shareOpen)
  const setOpen = useStudio((s) => s.setShareOpen)
  const doc = useStudio((s) => s.doc)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setUrl(null)
    encodeDoc(doc).then((payload) => {
      if (!cancelled) setUrl(buildShareUrl(payload))
    })
    return () => {
      cancelled = true
    }
  }, [open, doc])

  if (!open) return null

  const size = url ? describeLength(url) : null

  const copy = async () => {
    if (!url) return
    if (await copyText(url)) {
      setCopied(true)
      toast('Share link copied')
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="w-[min(620px,94vw)] overflow-hidden rounded-2xl border border-edge/10 bg-panel shadow-float">
        <div className="flex items-center gap-3 border-b border-edge/[0.07] px-5 py-3.5">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <Link2 size={15} className="text-accent" />
              Share this scene
            </h2>
            <p className="mt-0.5 text-[11.5px] text-mute">
              The whole scene is packed into the link itself — nothing is uploaded and no account
              is involved.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-edge/10 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2">
            <input
              readOnly
              value={url ?? 'Packing scene…'}
              onFocus={(e) => e.currentTarget.select()}
              className="mc-input flex-1 font-mono !text-[11px]"
            />
            <Button variant="primary" disabled={!url} onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {size && (
            <div
              className={`mt-2.5 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-snug ${
                size.level === 'ok'
                  ? 'bg-edge/[0.05] text-mute'
                  : 'bg-amber-500/10 text-amber-500'
              }`}
            >
              {size.level !== 'ok' && <AlertTriangle size={12} className="mt-px shrink-0" />}
              <span>{size.detail}</span>
            </div>
          )}

          <ul className="mt-4 flex flex-col gap-1.5 text-[11.5px] leading-relaxed text-mute">
            <li>· Anyone opening it gets an editable copy — their own work stays undoable.</li>
            <li>· The scene lives in the part of the URL browsers never send to a server.</li>
            <li>· Links keep working offline and don't expire, because nothing is hosted.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
