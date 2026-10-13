import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assignScan, getReportingCandidates, reportAction, type Patient, type User } from '../../../lib/api'
import StructuredReportEditor from './StructuredReportEditor'

interface Props {
  scan: Patient
  user: User
  onChanged: () => void
  openEditorOnMount?: boolean
}

const field = 'w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const button = 'rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50'

export default function ScanReporting({ scan, user, onChanged, openEditorOnMount = false }: Props) {
  const [mode, setMode] = useState<'manual' | 'least_active' | 'round_robin'>('manual')
  const [radiologistId, setRadiologistId] = useState(scan.assigned_radiologist_id ?? '')
  const [qaId, setQaId] = useState(scan.qa_user_id ?? '')
  const [signerId, setSignerId] = useState(scan.signer_id ?? '')
  const [reviewerId, setReviewerId] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(openEditorOnMount)
  const [review, setReview] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isAdmin = user.roles?.includes('admin') || user.role === 'admin'
  const isRadiologist = user.id === scan.assigned_radiologist_id
  const isReviewer = user.id === scan.reviewer_id
  const isQa = user.id === scan.qa_user_id
  const isSigner = user.id === scan.signer_id
  const hasRequiredSections = !scan.report_sections || Boolean(scan.report_sections.findings.trim() && scan.report_sections.impression.trim())
  const { data: candidates } = useQuery({ queryKey: ['reporting-candidates'], queryFn: getReportingCandidates, enabled: isAdmin || isRadiologist })
  const eligibleRadiologists = candidates?.radiologist?.filter((candidate) => candidate.modalities.includes(scan.modality)) ?? []

  useEffect(() => setRadiologistId(scan.assigned_radiologist_id ?? ''), [scan.assigned_radiologist_id])
  useEffect(() => setQaId(scan.qa_user_id ?? ''), [scan.qa_user_id])
  useEffect(() => setSignerId(scan.signer_id ?? ''), [scan.signer_id])

  async function run(operation: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await operation()
      onChanged()
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The report could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
    <p className="font-semibold">Report · {scan.report_status ?? 'Unassigned'}</p>
    <p>Radiologist: {scan.assigned_radiologist_name ?? 'Unassigned'} · QA: {scan.qa_user_name ?? 'Unassigned'} · Signer: {scan.signer_name ?? 'Unassigned'}</p>
    {scan.reviewer_name && <p>Second reviewer: {scan.reviewer_name}</p>}
    {isAdmin && scan.report_status !== 'Signed' && scan.status !== 'Cancelled' && <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <label className="block">Assignment method<select className={field} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="manual">Manual</option><option value="least_active">Fewest active reports</option><option value="round_robin">Round robin</option></select></label>
      {mode === 'manual' && <label className="block">Radiologist<select className={field} value={radiologistId} onChange={(event) => setRadiologistId(event.target.value)}><option value="">Select radiologist</option>{eligibleRadiologists.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>}
      <label className="block">QA reviewer<select className={field} value={qaId} onChange={(event) => setQaId(event.target.value)}><option value="">Assign later</option>{candidates?.qa?.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
      <label className="block">Signer<select className={field} value={signerId} onChange={(event) => setSignerId(event.target.value)}><option value="">Assign later</option>{candidates?.signer?.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
      <button type="button" className={button} disabled={busy || mode === 'manual' && !radiologistId} onClick={() => run(() => assignScan(scan.scan_id!, { mode, radiologist_id: radiologistId, qa_user_id: qaId, signer_id: signerId }))}>Save assignment</button>
    </div>}
    {scan.report_sections ? <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="font-semibold">Draft report</p>{([
      ['clinical_history', 'Clinical history'], ['technique', 'Technique'], ['findings', 'Findings'], ['impression', 'Impression'],
    ] as const).map(([key, label]) => scan.report_sections?.[key] && <div key={key}><p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p><p className="mt-1 whitespace-pre-wrap">{scan.report_sections?.[key]}</p></div>)}</div> : scan.draft_text && <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="font-semibold">Draft report</p><p className="whitespace-pre-wrap">{scan.draft_text}</p></div>}
    {scan.review_text && <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="font-semibold">Second opinion</p><p className="whitespace-pre-wrap">{scan.review_text}</p></div>}
    {scan.qa_feedback && <p className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">QA feedback: {scan.qa_feedback}</p>}
    {isRadiologist && ['Assigned', 'Draft', 'QA Rejected'].includes(scan.report_status ?? '') && <div><button type="button" className={button} onClick={() => setIsEditorOpen(true)}>{scan.draft_text ? 'Edit report draft' : 'Open report editor'}</button><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Clinical history, technique, findings, and impression</p></div>}
    {isEditorOpen && isRadiologist && ['Assigned', 'Draft', 'QA Rejected'].includes(scan.report_status ?? '') && <StructuredReportEditor scan={scan} onChanged={onChanged} onClose={() => setIsEditorOpen(false)} />}
    {isRadiologist && scan.report_status === 'Draft' && <div className="flex flex-wrap items-end gap-2"><label>Optional second opinion<select className={field} value={reviewerId} onChange={(event) => setReviewerId(event.target.value)}><option value="">Select another radiologist</option>{eligibleRadiologists.filter((candidate) => candidate.id !== user.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><button type="button" className={button} disabled={busy || !reviewerId} onClick={() => run(() => reportAction(scan.scan_id!, 'review-request', { reviewer_id: reviewerId }))}>Request review</button><button type="button" className={button} disabled={busy || !hasRequiredSections} onClick={() => run(() => reportAction(scan.scan_id!, 'submit-qa'))}>Send to QA</button>{!hasRequiredSections && <p className="w-full text-xs text-amber-800 dark:text-amber-200">Add Findings and Impression before sending this report to QA.</p>}</div>}
    {isReviewer && scan.report_status === 'Review Requested' && <div className="space-y-2"><label className="block">Second opinion<textarea className={`${field} mt-1 min-h-24`} value={review} onChange={(event) => setReview(event.target.value)} maxLength={20000} /></label><button type="button" className={button} disabled={busy || !review.trim()} onClick={() => run(() => reportAction(scan.scan_id!, 'review', { text: review }))}>Submit review</button></div>}
    {isRadiologist && scan.report_status === 'Reviewed' && <button type="button" className={button} disabled={busy || !hasRequiredSections} onClick={() => run(() => reportAction(scan.scan_id!, 'submit-qa'))}>Send reviewed draft to QA</button>}
    {isQa && scan.report_status === 'QA Pending' && <div className="space-y-2"><label className="block">QA feedback<textarea className={`${field} mt-1 min-h-20`} value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={20000} /></label><div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => run(() => reportAction(scan.scan_id!, 'qa', { decision: 'approve', feedback }))}>Approve</button><button type="button" className={button} disabled={busy || !feedback.trim()} onClick={() => run(() => reportAction(scan.scan_id!, 'qa', { decision: 'reject', feedback }))}>Return for edits</button></div></div>}
    {isSigner && scan.report_status === 'QA Approved' && <button type="button" className={button} disabled={busy} onClick={() => run(() => reportAction(scan.scan_id!, 'sign'))}>Sign and complete report</button>}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
  </section>
}
