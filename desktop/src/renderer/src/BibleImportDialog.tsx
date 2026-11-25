import { useMemo, useState } from 'react'
import { installedVersions, registerBible } from '../../shared/bible'
import { buildBibleText, parseBibleFile, VERSION_PATTERN } from '../../shared/bibleImport'
import type { BibleFileContents } from '../../shared/types'

interface Props {
  file: BibleFileContents
  onClose: () => void
  onSaved: (version: string) => void
}

export function BibleImportDialog({ file, onClose, onSaved }: Props): React.JSX.Element {
  const result = useMemo(() => parseBibleFile(file.fileName, file.text), [file])
  const [version, setVersion] = useState(result.ok ? result.suggestedVersion : '')
  const [name, setName] = useState(result.ok ? result.suggestedName : '')
  const [allowed, setAllowed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const code = version.trim()
  const isBuiltIn = code.toUpperCase() === 'KJV'
  const replaces = !isBuiltIn && installedVersions().some((v) => v.version === code)
  const codeProblem = !VERSION_PATTERN.test(code)
    ? 'Use 1 to 12 letters, numbers, - or _ (for example NIV).'
    : isBuiltIn
      ? 'KJV is built in. Choose another short name.'
      : null
  const canImport = result.ok && !codeProblem && name.trim() !== '' && allowed && !saving

  async function save(): Promise<void> {
    if (!result.ok) return
    setSaving(true)
    const bible = buildBibleText(code, name.trim(), result.books, result.bookLabels)
    const problem = await window.api.saveBible(bible)
    if (problem) {
      setError(problem)
      setSaving(false)
      return
    }
    registerBible(bible)
    onSaved(code)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add a Bible">
        <h2>Add a Bible</h2>
        <p className="muted">File: {file.fileName}</p>
        {!result.ok ? (
          <>
            <p className="modal-error">{result.error}</p>
            <p className="muted">
              Supported: text or CSV files with one verse per line (like <code>John 3:16 For God so loved…</code>), and JSON files.
              Book names can be English or Kiswahili.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-summary">
              {result.stats.books} books · {result.stats.chapters.toLocaleString()} chapters · {result.stats.verses.toLocaleString()} verses
              {result.stats.missingBooks.length > 0 && (
                <div className="muted">
                  {result.stats.missingBooks.length} books are not in this file
                  {result.stats.books === 27 && result.stats.missingBooks.length === 39 ? ' (New Testament only)' : ''}.
                </div>
              )}
              {(result.stats.skippedLines > 0 || result.stats.unknownBooks.length > 0) && (
                <div className="modal-warn">
                  {result.stats.skippedLines} lines could not be read
                  {result.stats.unknownBooks.length > 0 ? `. Unknown book names: ${result.stats.unknownBooks.join(', ')}` : ''}.
                </div>
              )}
            </div>
            <label className="field">
              Short name (shown after each verse)
              <input value={version} maxLength={12} onChange={(e) => setVersion(e.target.value)} aria-label="Short name" />
              {codeProblem && <span className="modal-error">{codeProblem}</span>}
              {replaces && !codeProblem && <span className="modal-warn">This will replace the {code} you added before.</span>}
            </label>
            <label className="field">
              Full name
              <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
            </label>
            <label className="check">
              <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} />
              <span>
                I have the right to use this Bible text, for example a copy my church has bought or been licensed for. Song and
                Scripture does not supply copyrighted Bibles.
              </span>
            </label>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!canImport} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Add Bible'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
