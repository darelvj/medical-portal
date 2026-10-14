import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAuditEvents, type AuditCategory } from '../../../lib/api'

interface Props {
  onOpenStudy: (patientId: string, scanId: string) => void
}

const fieldClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

export default function AuditHistory({ onOpenStudy }: Props) {
  const [category, setCategory] = useState<AuditCategory>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  useEffect(() => setPage(1), [category, search])

  const filters = { category, search, page, per_page: 20 }
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['audit-events', filters],
    queryFn: () => getAuditEvents(filters),
  })
  const pages = data?.pagination.pages ?? 0

  return <section className="w-full space-y-5 text-slate-900 dark:text-slate-100" aria-labelledby="audit-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Administration</p>
        <h2 id="audit-title" className="mt-1 text-2xl font-bold">Study audit history</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tenant-only assignment, report workflow, and TAT events. Report text and raw audit metadata are not shown.</p>
      </div>
      <button type="button" className={buttonClass} disabled={isFetching} onClick={() => refetch()}>{isFetching ? 'Refreshing…' : 'Refresh'}</button>
    </div>

    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <label className="min-w-60 flex-1 text-sm font-medium">Search patient, study, or actor
        <input value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, study UID, or accession" className={`${fieldClass} mt-1 block w-full`} />
      </label>
      <label className="text-sm font-medium">Event type
        <select value={category} onChange={(event) => setCategory(event.target.value as AuditCategory)} className={`${fieldClass} mt-1 block`}>
          <option value="all">All study events</option>
          <option value="assignment">Assignments</option>
          <option value="report">Report workflow</option>
          <option value="tat">TAT changes</option>
        </select>
      </label>
      <button type="button" onClick={() => { setCategory('all'); setSearchInput(''); setSearch(''); setPage(1) }} className={buttonClass}>Reset filters</button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error instanceof Error ? error.message : 'Could not load audit events.'}</p>}
    {isLoading && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Loading audit history…</p>}
    {!isLoading && !error && <>
      <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{data?.total ?? 0} events{isFetching ? ' · Updating…' : ''}</p>
      {data?.data.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No audit events match these filters. Events appear after assignments, report actions, or TAT changes.</div> : <ol className="space-y-3">
        {data?.data.map((event) => <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{event.label}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{event.patient_name} · {event.modality} · <span className="break-all font-mono text-xs">{event.study_uid}</span></p>
              {event.detail && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{event.detail}</p>}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">By {event.actor_name} · <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' })}</time></p>
            </div>
            <button type="button" onClick={() => onOpenStudy(event.patient_id, event.scan_id)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">View study</button>
          </div>
        </li>)}
      </ol>}
      {pages > 1 && <div className="flex items-center justify-center gap-3">
        <button type="button" disabled={page <= 1 || isFetching} onClick={() => setPage((current) => current - 1)} className={buttonClass}>Previous</button>
        <span className="text-sm text-slate-600 dark:text-slate-300">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages || isFetching} onClick={() => setPage((current) => current + 1)} className={buttonClass}>Next</button>
      </div>}
    </>}
  </section>
}
