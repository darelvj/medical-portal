import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReportTemplates, saveStructuredDraft, type Patient, type ReportSections } from '../../../lib/api'

interface Props {
  scan: Patient
  onChanged: () => void
  onClose: () => void
}

const sectionFields: { key: keyof ReportSections; label: string; hint: string; rows: number }[] = [
  { key: 'clinical_history', label: 'Clinical history', hint: 'Reason for the study and relevant history', rows: 3 },
  { key: 'technique', label: 'Technique', hint: 'How the study was performed', rows: 3 },
  { key: 'findings', label: 'Findings', hint: 'Describe the observations', rows: 7 },
  { key: 'impression', label: 'Impression', hint: 'Summarize the key conclusions', rows: 4 },
]

function initialSections(scan: Patient): ReportSections {
  return scan.report_sections ?? {
    clinical_history: '',
    technique: '',
    findings: scan.draft_text ?? '',
    impression: '',
  }
}

export default function StructuredReportEditor({ scan, onChanged, onClose }: Props) {
  const [sections, setSections] = useState<ReportSections>(() => initialSections(scan))
  const [savedSections, setSavedSections] = useState<ReportSections>(() => initialSections(scan))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const templatesQuery = useQuery({ queryKey: ['report-templates', scan.modality], queryFn: () => getReportTemplates(scan.modality) })
  const isDirty = sectionFields.some(({ key }) => sections[key] !== savedSections[key])
  const hasContent = sectionFields.some(({ key }) => sections[key].trim())
  const reportLength = sectionFields
    .map(({ key, label }) => sections[key].trim() ? `${label.toUpperCase()}\n${sections[key].trim()}` : '')
    .filter(Boolean)
    .join('\n\n').length
  const isTooLong = reportLength > 20000

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  function close() {
    if (isSaving) return
    if (!isDirty || window.confirm('Discard your unsaved report changes?')) onClose()
  }

  function applyTemplate() {
    const template = templatesQuery.data?.find((item) => item.id === selectedTemplateId)
    if (!template || isSaving) return
    if (hasContent && !window.confirm('Replace the current editor text with this template? Your saved report remains unchanged until you save this draft.')) return
    setSections({ ...template.sections })
    setError('')
    setSavedMessage('Template applied locally. Review every section, then save the draft.')
  }

  async function save() {
    if (!scan.scan_id || !hasContent || isTooLong || isSaving) return
    setError('')
    setSavedMessage('')
    setIsSaving(true)
    try {
      const updated = await saveStructuredDraft(scan.scan_id, sections)
      const persisted = updated.report_sections ?? sections
      setSections(persisted)
      setSavedSections(persisted)
      setSavedMessage('Draft saved to this study. Send it to QA separately when ready.')
      onChanged()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The draft could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="report-editor-title" className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Study report · {scan.modality} {scan.body_part}</p>
            <h2 id="report-editor-title" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{scan.name}</h2>
            <p className="mt-2 break-all text-xs text-slate-600 dark:text-slate-300">Study UID: {scan.study_uid}</p>
          </div>
          <button type="button" onClick={close} disabled={isSaving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Close editor</button>
        </div>

        {!scan.report_sections && scan.draft_text && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">This older free-text draft has been placed in Findings. Review and reorganize it before saving the structured version.</p>}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <label htmlFor="report-template" className="block text-sm font-semibold text-slate-900 dark:text-white">Report template</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <select id="report-template" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
              <option value="">Choose a {scan.modality} outline</option>
              {templatesQuery.data?.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <button type="button" onClick={applyTemplate} disabled={!selectedTemplateId || isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Apply template</button>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Applying replaces editor text only; it never saves or submits a report automatically.</p>
          {templatesQuery.isError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{templatesQuery.error.message}</p>}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {sectionFields.map(({ key, label, hint, rows }) => (
            <label key={key} className={`block ${key === 'findings' ? 'lg:col-span-2' : ''}`}>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
              <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">{hint}</span>
              <textarea
                value={sections[key]}
                onChange={(event) => { setSections((current) => ({ ...current, [key]: event.target.value })); setSavedMessage('') }}
                disabled={isSaving}
                rows={rows}
                maxLength={10000}
                className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>
          ))}
        </div>
        <p className={`mt-4 text-xs ${isTooLong ? 'text-red-700 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'}`}>You can save a partial draft. Findings and Impression are required before submitting it to QA. {reportLength.toLocaleString()} / 20,000 characters in the final report.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {savedMessage && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{savedMessage}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
          <button type="button" disabled={isSaving || !hasContent || !isDirty || isTooLong} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving…' : 'Save draft'}</button>
          <span className="text-sm text-slate-600 dark:text-slate-300">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
      </section>
    </div>
  )
}
