import { useState, type FormEvent } from 'react'
import type { NewScanSchedule } from '../../../lib/api'

type ScanScheduleFormProps = {
  isSaving: boolean
  isDarkMode: boolean
  onCancel: () => void
} & (
  | { mode: 'create'; onSave: (details: NewScanSchedule) => Promise<void> }
  | { mode: 'reschedule'; initialTime: string | null | undefined; onSave: (scheduledAt: string) => Promise<void> }
)

function localDateTimeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function ScanScheduleForm(props: ScanScheduleFormProps) {
  const [modality, setModality] = useState('CT')
  const [bodyPart, setBodyPart] = useState('')
  const [localTime, setLocalTime] = useState(() => {
    if (props.mode === 'reschedule' && props.initialTime) return localDateTimeValue(new Date(props.initialTime))
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return localDateTimeValue(tomorrow)
  })
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const chosenTime = new Date(localTime)
    if (Number.isNaN(chosenTime.getTime()) || chosenTime <= new Date()) {
      setError('Choose a future date and time.')
      return
    }
    if (props.mode === 'create' && !bodyPart.trim()) {
      setError('Enter the body part to be scanned.')
      return
    }
    try {
      if (props.mode === 'create') {
        await props.onSave({ modality, body_part: bodyPart.trim(), scheduled_at: chosenTime.toISOString() })
      } else {
        await props.onSave(chosenTime.toISOString())
      }
      props.onCancel()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the scan schedule.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <h4 className="font-semibold text-slate-900 dark:text-white">{props.mode === 'create' ? 'Schedule a scan' : 'Reschedule scan'}</h4>
      {props.mode === 'create' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Modality
            <select value={modality} onChange={(event) => setModality(event.target.value)} style={{ colorScheme: props.isDarkMode ? 'dark' : 'light' }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="CT">CT</option><option value="MRI">MRI</option><option value="XR">X-ray</option><option value="US">Ultrasound</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Body part
            <input type="text" value={bodyPart} onChange={(event) => setBodyPart(event.target.value)} maxLength={80} required placeholder="e.g. Chest" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          </label>
        </div>
      )}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Date and time
        <input type="datetime-local" value={localTime} onChange={(event) => setLocalTime(event.target.value)} min={localDateTimeValue(new Date())} required style={{ colorScheme: props.isDarkMode ? 'dark' : 'light' }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400">Times are shown in {Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone'}.</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={props.isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{props.isSaving ? 'Saving…' : props.mode === 'create' ? 'Schedule scan' : 'Save new time'}</button>
        <button type="button" onClick={props.onCancel} disabled={props.isSaving} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</button>
      </div>
    </form>
  )
}
