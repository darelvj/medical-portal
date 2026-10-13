import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReportTemplate, getReportTemplates, updateReportTemplate, type ReportSections, type ReportTemplate } from '../../../lib/api'

const emptySections: ReportSections = { clinical_history: '', technique: '', findings: '', impression: '' }
const fields: { key: keyof ReportSections; label: string }[] = [
  { key: 'clinical_history', label: 'Clinical history' },
  { key: 'technique', label: 'Technique' },
  { key: 'findings', label: 'Findings' },
  { key: 'impression', label: 'Impression' },
]
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white'

export default function ReportTemplateManagement() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [modality, setModality] = useState('CT')
  const [sections, setSections] = useState<ReportSections>(emptySections)
  const [message, setMessage] = useState('')
  const templatesQuery = useQuery({ queryKey: ['report-templates', 'admin'], queryFn: () => getReportTemplates('', true) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['report-templates'] })
  const saveMutation = useMutation({
    mutationFn: () => editingId
      ? updateReportTemplate(editingId, { name, modality, sections })
      : createReportTemplate({ name, modality, sections }),
    onSuccess: () => { setMessage(editingId ? 'Template updated.' : 'Template created.'); resetForm(); refresh() },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Could not save template.'),
  })
  const statusMutation = useMutation({
    mutationFn: (template: ReportTemplate) => updateReportTemplate(template.id, { is_active: !template.is_active }),
    onSuccess: () => { setMessage('Template status updated.'); refresh() },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Could not update template.'),
  })

  function resetForm() {
    setEditingId(null)
    setName('')
    setModality('CT')
    setSections({ ...emptySections })
  }

  function edit(template: ReportTemplate) {
    setEditingId(template.id)
    setName(template.name)
    setModality(template.modality)
    setSections({ ...template.sections })
    setMessage('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    saveMutation.mutate()
  }

  return <section className="w-full text-slate-900 dark:text-white">
    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Administration</p>
    <h2 className="mt-1 text-2xl font-bold">Report templates</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Create reusable, tenant-only outlines. Radiologists must review and save their own report drafts.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-semibold">Available templates</h3>
        {templatesQuery.isLoading && <p className="mt-3 text-sm">Loading templates…</p>}
        {templatesQuery.isError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{templatesQuery.error.message}</p>}
        <div className="mt-3 space-y-2">{templatesQuery.data?.map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div><p className="font-medium">{template.name}</p><p className="text-xs text-slate-600 dark:text-slate-300">{template.modality} · {template.is_active ? 'Active' : 'Archived'}</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => edit(template)} className="text-sm font-semibold text-blue-700 dark:text-blue-300">Edit</button><button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(template)} className="text-sm font-semibold text-slate-700 disabled:opacity-50 dark:text-slate-200">{template.is_active ? 'Archive' : 'Restore'}</button></div>
        </div>)}</div>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-semibold">{editingId ? 'Edit template' : 'New template'}</h3>
        <label className="block text-sm font-medium">Name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 ${fieldClass}`} /></label>
        <label className="block text-sm font-medium">Modality<select value={modality} onChange={(event) => setModality(event.target.value)} className={`mt-1 ${fieldClass}`}>{['CT', 'MRI', 'XR', 'US'].map((item) => <option key={item}>{item}</option>)}</select></label>
        {fields.map(({ key, label }) => <label key={key} className="block text-sm font-medium">{label}<textarea rows={3} maxLength={10000} value={sections[key]} onChange={(event) => setSections((current) => ({ ...current, [key]: event.target.value }))} className={`mt-1 ${fieldClass}`} /></label>)}
        <p className="text-xs text-slate-600 dark:text-slate-300">Use neutral prompts or standard phrasing only; do not insert patient-specific findings.</p>
        <div className="flex gap-2"><button disabled={saveMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saveMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create template'}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">Cancel</button>}</div>
        {message && <p role="status" className="text-sm text-slate-700 dark:text-slate-200">{message}</p>}
      </form>
    </div>
  </section>
}
