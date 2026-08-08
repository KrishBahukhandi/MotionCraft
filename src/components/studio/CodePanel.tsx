import { useMemo, useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { useStudio } from '@/store/studio'
import { EXPORT_FORMATS, getFormat } from '@/lib/exporters'
import { CodeBlock } from '@/lib/highlight'
import { copyText, download } from '@/lib/utils'
import { Button, Select } from '@/components/ui/primitives'

export function CodePanel() {
  const doc = useStudio((s) => s.doc)
  const [formatId, setFormatId] = useState('css')
  const [loop, setLoop] = useState(true)
  const [minify, setMinify] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [copied, setCopied] = useState(false)

  const format = getFormat(formatId)
  const code = useMemo(
    () => format.generate(doc, { loop, minify, reducedMotion }),
    [doc, format, loop, minify, reducedMotion]
  )

  const onCopy = async () => {
    if (await copyText(code)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <Select
          className="flex-1"
          value={formatId}
          onChange={setFormatId}
          options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
        />
        <Button size="sm" variant="soft" onClick={onCopy} title="Copy to clipboard">
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          size="sm"
          variant="soft"
          onClick={() => download(format.file, code)}
          title={`Download ${format.file}`}
        >
          <Download size={13} />
        </Button>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-mute">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="accent-[rgb(var(--mc-accent))]" />
          Loop
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} className="accent-[rgb(var(--mc-accent))]" />
          Reduced-motion guard
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={minify} onChange={(e) => setMinify(e.target.checked)} className="accent-[rgb(var(--mc-accent))]" />
          Minify
        </label>
      </div>

      <CodeBlock code={code} language={format.language} className="min-h-0 flex-1" />

      <div className="text-[10.5px] leading-relaxed text-mute">
        Updates live as you edit. {doc.elements.filter((e) => e.visible && e.tracks.length > 0).length}{' '}
        animated element(s) · {format.file}
      </div>
    </div>
  )
}
