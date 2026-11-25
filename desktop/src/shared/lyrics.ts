import { uid } from './ids'
import type { SectionKind, Slide } from './types'

export interface SplitOptions {
  maxLines?: number
  idPrefix?: string
  /** Plain text such as notes and names: no Verse/Chorus headings, every paragraph is a screen. */
  plain?: boolean
}

interface Header {
  kind: SectionKind
  label: string
  numbered: boolean
}

const HEADER_PATTERN =
  /^\[?\s*(verse|chorus|refrain|bridge|pre[- ]?chorus|intro|outro|ending|tag)\s*(\d+)?\s*\]?\s*:?$/i

const HEADER_KINDS: Record<string, { kind: SectionKind; label: string }> = {
  verse: { kind: 'verse', label: 'Verse' },
  chorus: { kind: 'chorus', label: 'Chorus' },
  refrain: { kind: 'chorus', label: 'Chorus' },
  bridge: { kind: 'bridge', label: 'Bridge' },
  prechorus: { kind: 'bridge', label: 'Pre-chorus' },
  intro: { kind: 'bridge', label: 'Intro' },
  outro: { kind: 'bridge', label: 'Outro' },
  ending: { kind: 'bridge', label: 'Ending' },
  tag: { kind: 'bridge', label: 'Tag' }
}

export function isSectionHeader(line: string): boolean {
  return readHeader(line) !== null
}

function readHeader(line: string): Header | null {
  const match = HEADER_PATTERN.exec(line.trim())
  if (!match) return null
  const key = match[1].toLowerCase().replace(/[- ]/g, '')
  const base = HEADER_KINDS[key]
  if (!base) return null
  const number = match[2]
  return {
    kind: base.kind,
    label: number ? `${base.label} ${number}` : base.label,
    numbered: key === 'verse' && number !== undefined
  }
}

function chunk(lines: string[], maxLines: number): string[][] {
  const parts = Math.max(1, Math.ceil(lines.length / maxLines))
  const size = Math.ceil(lines.length / parts)
  const chunks: string[][] = []
  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size))
  }
  return chunks
}

export function splitLyrics(text: string, options: SplitOptions = {}): Slide[] {
  const maxLines = options.maxLines ?? 4
  const prefix = options.idPrefix ?? uid('slide')

  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.trim() !== '')
    )
    .filter((block) => block.length > 0)

  if (options.plain) {
    const plain: Slide[] = []
    blocks.forEach((block, number) => {
      const chunks = chunk(block, maxLines)
      chunks.forEach((chunkLines, index) => {
        plain.push({
          id: `${prefix}-${plain.length + 1}`,
          kind: 'text',
          label: chunks.length > 1 ? `Screen ${number + 1} (${index + 1})` : `Screen ${number + 1}`,
          lines: chunkLines
        })
      })
    })
    return plain
  }

  const slides: Slide[] = []
  let verseCount = 0
  let pending: Header | null = null

  for (const block of blocks) {
    let header = readHeader(block[0])
    let lines = header ? block.slice(1) : block

    if (header && lines.length === 0) {
      pending = header
      continue
    }
    if (!header && pending) {
      header = pending
      pending = null
    }

    let kind: SectionKind
    let label: string
    if (header) {
      kind = header.kind
      label = header.label
      if (kind === 'verse' && !header.numbered) {
        verseCount += 1
        label = `Verse ${verseCount}`
      } else if (header.numbered) {
        verseCount = Number(label.replace('Verse ', ''))
      }
    } else {
      kind = 'verse'
      verseCount += 1
      label = `Verse ${verseCount}`
      lines = block
    }

    const chunks = chunk(lines, maxLines)
    chunks.forEach((chunkLines, index) => {
      slides.push({
        id: `${prefix}-${slides.length + 1}`,
        kind,
        label: chunks.length > 1 ? `${label} (${index + 1})` : label,
        lines: chunkLines
      })
    })
  }

  return slides
}
