import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReportingWorklist, type WorklistQuery, type WorklistStudy } from '../../../lib/api'

interface Props {
  onOpenStudy: (patientId: string, scanId: string, openReport: boolean) => void
}

const selectClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const secondaryButton = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

function tatLabel(study: WorklistStudy) {
  if (study.tat.minutes !== null) return `${study.tat.minutes} min completed`
  if (study.tat.elapsed_minutes !== null) return `${study.tat.elapsed_minutes} min elapsed`
  return 'Not started'
}

export default function RadiologistWorklist({ onOpenStudy }: Props) {
  const [role, setRole] = useState<WorklistQuery['role']>('primary')
  const [stage, setStage] = useState('active')
  const [modality, setModality] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<WorklistQuery['sort']>('oldest')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => setPage(1), [role, stage, modality, search, sort])

  const filters: WorklistQuery = { role, stage, modality, search, sort, page, per_page: 20 }
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['reporting-worklist', filters],
    queryFn: () => getReportingWorklist(filters),
  })
  const pages = data?.pagination.pages ?? 0

  return (
    <section className="w-full space-y-6" aria-labelledby="worklist-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Reporting workspace</p>
          <h1 id="worklist-title" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">My worklist</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Only studies assigned to you appear here.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setStage('active'); setModality(''); setSort('oldest'); setPage(1) }} className={secondaryButton}>Reset filters</button>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className={secondaryButton}>{isFetching ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Assignment type">
        {(['primary', 'review'] as const).map((value) => <button key={value} type="button" onClick={() => { setRole(value); setStage('active') }} aria-pressed={role === value} className={`rounded-lg px-4 py-2 text-sm font-semibold ${role === value ? 'bg-blue-600 text-white' : secondaryButton}`}>{value === 'primary' ? 'My reports' : 'Second opinions'}</button>)}
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Search patient or study
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, MRN, or study UID" className={`${selectClass} mt-1 w-full`} />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Report stage
          <select value={stage} onChange={(event) => setStage(event.target.value)} className={`${selectClass} mt-1 w-full`}>
            <option value="active">Active work</option><option value="all">All stages</option>
            {['Assigned', 'Draft', 'QA Rejected', 'Review Requested', 'Reviewed', 'QA Pending', 'QA Approved', 'Signed'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Modality
          <select value={modality} onChange={(event) => setModality(event.target.value)} className={`${selectClass} mt-1 w-full`}><option value="">All modalities</option>{['CT', 'MRI', 'XR', 'US'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Scheduled order
          <select value={sort} onChange={(event) => setSort(event.target.value as WorklistQuery['sort'])} className={`${selectClass} mt-1 w-full`}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">Could not load the worklist: {error instanceof Error ? error.message : 'Please try again.'}</div>}
      {isLoading && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Loading assigned studies…</p>}
      {!isLoading && !error && <>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{data?.total ?? 0} {role === 'primary' ? 'assigned reports' : 'second opinions'}{isFetching ? ' · Updating…' : ''}</p>
        {data?.data.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No studies match these filters. {stage === 'active' ? 'Try All stages to see completed studies, or ask an administrator to assign new work.' : 'Try changing the search or filters.'}</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-4">Patient / study</th><th scope="col" className="p-4">Modality</th><th scope="col" className="p-4">Scheduled</th><th scope="col" className="p-4">Stage</th><th scope="col" className="p-4">TAT</th><th scope="col" className="p-4">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data?.data.map((study) => {
                  const canEdit = role === 'primary' && Boolean(study.performed_at) && ['Assigned', 'Draft', 'QA Rejected'].includes(study.report_status)
                  return <tr key={study.scan_id} className="text-slate-800 dark:text-slate-100">
                    <td className="p-4"><p className="font-semibold">{study.patient_name} <span className="font-normal text-slate-500 dark:text-slate-400">· {study.age} yrs</span></p><p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{study.study_uid}</p></td>
                    <td className="p-4">{study.modality} · {study.body_part}</td>
                    <td className="p-4">{study.scheduled_at ? new Date(study.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}</td>
                    <td className="p-4"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-200">{study.report_status}</span></td>
                    <td className="p-4"><span className={study.tat.breached ? 'font-semibold text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}>{tatLabel(study)}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Target {study.tat.target_minutes} min{study.tat.breached ? ' · Over target' : ''}</span></td>
                    <td className="p-4"><button type="button" onClick={() => onOpenStudy(study.patient_id, study.scan_id, canEdit)} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">{canEdit ? 'Open report' : role === 'review' && study.report_status === 'Review Requested' ? 'Open review' : 'View study'}</button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && <div className="flex items-center justify-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className={secondaryButton}>Previous</button><span className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className={secondaryButton}>Next</button></div>}
      </>}
    </section>
  )
}
