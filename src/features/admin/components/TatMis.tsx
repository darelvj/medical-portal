import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getReportingCandidates, getTatReport, updateStudyTat, type TatStudy } from '../../../lib/api'

const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

function duration(minutes: number | null) {
  if (minutes === null) return '—'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

function localTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function TatEditor({ study, onClose, onSaved }: { study: TatStudy; onClose: () => void; onSaved: () => void }) {
  const [manualMinutes, setManualMinutes] = useState(study.tat.source === 'manual' ? String(study.tat.minutes) : '')
  const [targetMinutes, setTargetMinutes] = useState(String(study.tat.target_minutes))
  const [note, setNote] = useState(study.tat.note ?? '')
  const mutation = useMutation({ mutationFn: () => updateStudyTat(study.scan_id, {
    manual_minutes: manualMinutes ? Number(manualMinutes) : null,
    target_minutes: Number(targetMinutes),
    note: note.trim(),
  }), onSuccess: onSaved })
  const completed = study.scan_status === 'Completed' || study.report_status === 'Signed'
  return <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30 sm:grid-cols-3">
    <label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">Target (minutes)<input className={field} type="number" min={1} max={100000} value={targetMinutes} onChange={(event) => setTargetMinutes(event.target.value)} /></label>
    {completed && <label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">Manual TAT (minutes; blank = calculated)<input className={field} type="number" min={1} max={100000} value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} /></label>}
    {completed && <label className="grid gap-1 text-xs font-medium text-slate-700 dark:text-slate-200">Reason for manual TAT<input className={field} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} /></label>}
    <div className="flex items-end gap-3"><button type="button" disabled={mutation.isPending || !targetMinutes || Boolean(manualMinutes && !note.trim())} onClick={() => mutation.mutate()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button><button type="button" onClick={onClose} className="text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button></div>
    {mutation.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:col-span-3">{mutation.error.message}</p>}
  </div>
}

export default function TatMis() {
  const queryClient = useQueryClient()
  const [modality, setModality] = useState('')
  const [radiologistId, setRadiologistId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const filters = { modality, radiologist_id: radiologistId, date_from: dateFrom, date_to: dateTo }
  const report = useQuery({ queryKey: ['tat-mis', filters], queryFn: () => getTatReport(filters) })
  const candidates = useQuery({ queryKey: ['reporting-candidates'], queryFn: getReportingCandidates })
  const rows = report.data?.studies ?? []
  const pages = Math.max(1, Math.ceil(rows.length / 25))
  const visible = rows.slice((page - 1) * 25, page * 25)
  const summary = report.data?.summary
  const setFilter = (update: () => void) => { update(); setPage(1); setEditingId(null) }

  return <section className="w-full space-y-6 text-slate-900 dark:text-slate-100">
    <div><p className="text-sm font-medium text-blue-600 dark:text-blue-400">Management information</p><h2 className="mt-1 text-2xl font-bold">Study turnaround time</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Measured from study performed to report signed. Pending studies show elapsed time. Times display in your local timezone; durations are timezone-independent.</p></div>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <label className="grid gap-1 text-sm">Modality<select className={field} value={modality} onChange={(event) => setFilter(() => setModality(event.target.value))}><option value="">All</option>{['CT', 'MRI', 'XR', 'US'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Radiologist<select className={field} value={radiologistId} onChange={(event) => setFilter(() => setRadiologistId(event.target.value))}><option value="">All</option>{candidates.data?.radiologist?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Performed from<input className={field} type="date" value={dateFrom} onChange={(event) => setFilter(() => setDateFrom(event.target.value))} /></label>
      <label className="grid gap-1 text-sm">Through<input className={field} type="date" value={dateTo} onChange={(event) => setFilter(() => setDateTo(event.target.value))} /></label>
      <button type="button" onClick={() => { setModality(''); setRadiologistId(''); setDateFrom(''); setDateTo(''); setPage(1); setEditingId(null) }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700">Clear filters</button>
    </div>
    {report.isLoading && <p className="text-sm text-slate-600 dark:text-slate-300">Loading TAT data…</p>}
    {report.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{report.error.message}</p>}
    {summary && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[
        ['Studies', String(summary.studies)], ['Measured', String(summary.measured)], ['Manual entries', String(summary.manual_count)], ['Average TAT', duration(summary.average_minutes)], ['Median TAT', duration(summary.median_minutes)], ['On time', summary.on_time_percent === null ? '—' : `${summary.on_time_percent}%`],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
      <div className="flex flex-wrap gap-3 text-sm"><p className="rounded-lg bg-amber-100 px-3 py-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Pending past target: {summary.pending_overdue}</p>{Object.entries(summary.by_modality).map(([name, value]) => <p key={name} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">{name}: {duration(value.average_minutes)} avg · {value.count} studies</p>)}</div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"><tr>{['Study', 'Modality', 'Radiologist', 'Performed', 'Signed', 'TAT / elapsed', 'Target', 'Result', ''].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{visible.map((study) => <tr key={study.scan_id} className="align-top"><td className="px-4 py-3"><p className="font-semibold">{study.patient_name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{study.accession_number}</p><p className="text-xs text-slate-500 dark:text-slate-400">{study.report_status}</p>{editingId === study.scan_id && <div className="mt-2 min-w-[600px]"><TatEditor study={study} onClose={() => setEditingId(null)} onSaved={() => { setEditingId(null); queryClient.invalidateQueries({ queryKey: ['tat-mis'] }); queryClient.invalidateQueries({ queryKey: ['patient'] }) }} /></div>}</td><td className="px-4 py-3">{study.modality}</td><td className="px-4 py-3">{study.radiologist_name ?? 'Unassigned'}</td><td className="px-4 py-3">{localTime(study.performed_at)}</td><td className="px-4 py-3">{localTime(study.signed_at)}</td><td className="px-4 py-3 font-semibold">{duration(study.tat.minutes ?? study.tat.elapsed_minutes)}{study.tat.source === 'manual' && <span className="block text-xs font-normal text-blue-700 dark:text-blue-300">Manual</span>}</td><td className="px-4 py-3">{duration(study.tat.target_minutes)}</td><td className="px-4 py-3">{study.tat.breached === null ? '—' : <span className={study.tat.breached ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>{study.tat.breached ? 'Over target' : 'On time'}</span>}</td><td className="px-4 py-3"><button type="button" onClick={() => setEditingId(editingId === study.scan_id ? null : study.scan_id)} className="font-semibold text-blue-700 dark:text-blue-300">{editingId === study.scan_id ? 'Close' : 'Edit TAT'}</button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No studies match these filters.</p>}</div>
      {pages > 1 && <div className="flex items-center justify-center gap-3"><button type="button" className={field} disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm">Page {page} of {pages}</span><button type="button" className={field} disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>}
  </section>
}
