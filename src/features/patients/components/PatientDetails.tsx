import { useEffect, useState } from 'react'
import { type NewScanSchedule, type PatientRecord, type User } from '../../../lib/api'
import ScanScheduleForm from './ScanScheduleForm'
import ScanReporting from './ScanReporting'

interface PatientDetailsProps {
  patient?: PatientRecord
  user: User
  onReportChanged: () => void
  isLoading: boolean
  error?: Error | null
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
  canReview: boolean
  isUpdatingScan: boolean
  scanUpdateError: string
  onUpdateScanStatus: (scanId: string, status: string) => void
  isScheduling: boolean
  isDarkMode: boolean
  onCreateScan: (details: NewScanSchedule) => Promise<void>
  onRescheduleScan: (scanId: string, scheduledAt: string) => Promise<void>
  startWithScheduleForm?: boolean
  focusedScanId?: string | null
  openReportScanId?: string | null
}

const scanStatuses = ['Scheduled', 'In Progress', 'Pending Review', 'Cancelled']

export default function PatientDetails({ patient, user, onReportChanged, isLoading, error, onClose, onEdit, canEdit, canReview, isUpdatingScan, onUpdateScanStatus, isDarkMode, onCreateScan, onRescheduleScan, scanUpdateError, isScheduling, startWithScheduleForm = false, focusedScanId, openReportScanId }: PatientDetailsProps) {
  const [scheduleAction, setScheduleAction] = useState<null | { mode: 'create' } | { mode: 'reschedule'; scanId: string; scheduledAt: string | null | undefined }>(startWithScheduleForm ? { mode: 'create' } : null)

  useEffect(() => {
    if (patient && focusedScanId && !openReportScanId) {
      document.getElementById(`study-${focusedScanId}`)?.scrollIntoView({ block: 'center' })
    }
  }, [patient, focusedScanId, openReportScanId])

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center p-4 bg-slate-950/50" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="patient-details-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Patient record</p>
            <h2 id="patient-details-title" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? 'Loading patient…' : patient?.name ?? 'Patient details'}
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {patient && canEdit && <button type="button" onClick={onEdit} className="rounded-md px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950">Edit</button>}
            {patient && canReview && <button type="button" onClick={() => setScheduleAction({ mode: 'create' })} className="rounded-md px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950">Schedule scan</button>}
            <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Close</button>
          </div>
        </div>

        {error && <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">{error.message}</p>}

        {patient && scheduleAction?.mode === 'create' && <ScanScheduleForm mode="create" isSaving={isScheduling} isDarkMode={isDarkMode} onSave={onCreateScan} onCancel={() => setScheduleAction(null)} />}
        {patient && scheduleAction?.mode === 'reschedule' && <ScanScheduleForm key={scheduleAction.scanId} mode="reschedule" initialTime={scheduleAction.scheduledAt} isSaving={isScheduling} isDarkMode={isDarkMode} onSave={(scheduledAt) => onRescheduleScan(scheduleAction.scanId, scheduledAt)} onCancel={() => setScheduleAction(null)} />}

        {patient && !isLoading && (
          <>
          <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">
            <div><dt className="text-slate-500 dark:text-slate-400">Patient ID</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{patient.id}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Age / Gender</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{patient.age} years / {patient.gender}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Medical record number</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{patient.medical_record_number}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Blood type</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{patient.blood_type || 'Not recorded'}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Recent study</dt><dd className="mt-1 font-medium text-slate-900 dark:text-white">{patient.modality || 'No studies'}</dd></div>
            <div className="col-span-2"><dt className="text-slate-500 dark:text-slate-400">Recent study UID</dt><dd className="mt-1 break-all rounded-md bg-slate-100 dark:bg-slate-950 p-3 font-mono text-xs text-slate-700 dark:text-slate-300">{patient.study_uid || 'No study available'}</dd></div>
          </dl>
          <section className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700">
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Imaging studies</h3>
            {scanUpdateError && <p role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{scanUpdateError}</p>}
            {patient.scans.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No scans recorded.</p> : (
              <ul className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                {patient.scans.map((scan) => (
                  <li key={scan.scan_id ?? scan.study_uid} id={scan.scan_id ? `study-${scan.scan_id}` : undefined} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{scan.modality} · {scan.body_part || 'Study'}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{scan.scheduled_at ? new Date(scan.scheduled_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'Schedule not set'}</p>
                        <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{scan.study_uid}</p>
                        {scan.tat && <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">TAT: {scan.tat.minutes !== null ? `${scan.tat.minutes} min${scan.tat.source === 'manual' ? ' (manual)' : ''}` : scan.tat.elapsed_minutes !== null ? `${scan.tat.elapsed_minutes} min elapsed` : 'Not started'} · Target {scan.tat.target_minutes} min{scan.tat.breached ? ' · Over target' : ''}</p>}
                      </div>
                      {canReview && scan.scan_id && scan.status !== 'Completed' && scan.report_status !== 'Signed' ? (
                        <div className="flex flex-col items-start gap-2">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Status
                            <select value={scan.status} disabled={isUpdatingScan || isScheduling} onChange={(event) => onUpdateScanStatus(scan.scan_id!, event.target.value)} className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                              {scanStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </label>
                          {scan.status === 'Scheduled' && !scan.performed_at && <button type="button" disabled={isScheduling} onClick={() => setScheduleAction({ mode: 'reschedule', scanId: scan.scan_id!, scheduledAt: scan.scheduled_at })} className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-300">Reschedule</button>}
                        </div>
                      ) : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{scan.status}</span>}
                    </div>
                    {scan.scan_id && <ScanReporting key={scan.scan_id} scan={scan} user={user} onChanged={onReportChanged} openEditorOnMount={openReportScanId === scan.scan_id} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
        )}
      </section>
    </div>
  )
}
