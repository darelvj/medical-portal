import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { autoAssignScans, getReportingCandidates } from '../../../lib/api'

const selectClass = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export default function AutoAssignment() {
  const queryClient = useQueryClient()
  const { data: candidates, error } = useQuery({ queryKey: ['reporting-candidates'], queryFn: getReportingCandidates })
  const [mode, setMode] = useState<'least_active' | 'round_robin'>('least_active')
  const [qaId, setQaId] = useState('')
  const [signerId, setSignerId] = useState('')
  const mutation = useMutation({
    mutationFn: autoAssignScans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['scan-calendar'] })
    },
  })

  return <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h3 className="font-semibold text-slate-900 dark:text-white">Automatic study assignment</h3>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Assign up to 100 unassigned studies per run. Only active radiologists eligible for each study’s modality are considered.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm text-slate-700 dark:text-slate-200">Method<select className={selectClass} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="least_active">Fewest active reports</option><option value="round_robin">Round robin by modality</option></select></label>
      <label className="grid gap-1 text-sm text-slate-700 dark:text-slate-200">QA user<select className={selectClass} value={qaId} onChange={(event) => setQaId(event.target.value)}><option value="">Choose QA</option>{candidates?.qa?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm text-slate-700 dark:text-slate-200">Signer<select className={selectClass} value={signerId} onChange={(event) => setSignerId(event.target.value)}><option value="">Choose signer</option>{candidates?.signer?.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <button type="button" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={mutation.isPending || !qaId || !signerId} onClick={() => mutation.mutate({ mode, qa_user_id: qaId, signer_id: signerId })}>Assign unassigned studies</button>
    </div>
    {mutation.data && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">Assigned {mutation.data.assigned} studies; skipped {mutation.data.skipped} with no eligible radiologist.</p>}
    {(mutation.error || error) && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{(mutation.error || error)?.message}</p>}
  </section>
}
