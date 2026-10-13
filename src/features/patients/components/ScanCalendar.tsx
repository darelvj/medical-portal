import { useMemo, useState } from 'react'
import type { ScanCalendarEvent } from '../../../lib/api'

interface ScanCalendarProps {
  events: ScanCalendarEvent[]
  isLoading: boolean
  error?: Error | null
  onOpenPatient: (patientId: string) => void
  onScheduleNew?: () => void
  onMonthChange: (start: string, end: string) => void
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ScanCalendar({ events, isLoading, error, onOpenPatient, onScheduleNew, onMonthChange }: ScanCalendarProps) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [statusFilter, setStatusFilter] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const filteredEvents = useMemo(() => events.filter((event) =>
    (!statusFilter || event.status === statusFilter) && (!modalityFilter || event.modality === modalityFilter),
  ), [events, statusFilter, modalityFilter])
  const calendarDays = useMemo(() => [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ], [firstWeekday, daysInMonth])
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, ScanCalendarEvent[]>()
    filteredEvents.forEach((event) => {
      const key = dateKey(new Date(event.scheduled_at))
      grouped.set(key, [...(grouped.get(key) ?? []), event])
    })
    return grouped
  }, [filteredEvents])

  const changeMonth = (offset: number) => {
    const next = new Date(year, monthIndex + offset, 1)
    setMonth(next)
    setSelectedDay('')
    onMonthChange(dateKey(next), dateKey(new Date(next.getFullYear(), next.getMonth() + 1, 0)))
  }

  const goToToday = () => {
    const today = new Date()
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setMonth(currentMonth)
    setSelectedDay(dateKey(today))
    onMonthChange(dateKey(currentMonth), dateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)))
  }

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-label="Scan calendar">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Imaging schedule</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{monthLabel}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Times in {Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone'}</p>
        </div>
        <div className="flex items-center gap-2">
          {onScheduleNew && <button type="button" onClick={onScheduleNew} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Schedule scan</button>}
          <button type="button" onClick={goToToday} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-900/70">Today</button>
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">←</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">→</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Modality
          <select value={modalityFilter} onChange={(event) => setModalityFilter(event.target.value)} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="">All modalities</option>
            {[...new Set(events.map((event) => event.modality))].sort().map((modality) => <option key={modality} value={modality}>{modality}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="">All statuses</option>
            {[...new Set(events.map((event) => event.status))].sort().map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{filteredEvents.length} {filteredEvents.length === 1 ? 'scan' : 'scans'}</span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error.message}</p>}
      {isLoading && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Loading scheduled scans…</p>}

      <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="border-b border-r border-slate-200 bg-slate-50 px-1 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:px-2">{day}</div>
        ))}
        {calendarDays.map((day, index) => {
          const key = day ? dateKey(new Date(year, monthIndex, day)) : `blank-${index}`
          const dayEvents = day ? (eventsByDay.get(key) ?? []) : []
          return (
            <div key={key} className={`min-h-24 border-b border-r border-slate-200 p-1 dark:border-slate-700 sm:min-h-32 sm:p-2 ${day ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-950/40'}`}>
              {day && <button type="button" onClick={() => setSelectedDay(key)} aria-label={`Show scans for ${monthLabel} ${day}`} className={`mb-1 block rounded px-1 text-xs font-semibold ${selectedDay === key ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{day}</button>}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button key={event.id} type="button" title={`${event.patient_name} · ${event.modality} ${event.body_part} · ${event.status}`} onClick={() => onOpenPatient(event.patient_id)} className="block w-full truncate rounded bg-blue-100 px-1.5 py-1 text-left text-[10px] font-medium text-blue-900 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900 sm:text-xs">
                    {new Date(event.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {event.patient_name} · {event.modality}
                  </button>
                ))}
                {dayEvents.length > 3 && <button type="button" onClick={() => setSelectedDay(key)} className="block px-1 text-[10px] font-semibold text-blue-700 hover:underline dark:text-blue-300">+{dayEvents.length - 3} more</button>}
              </div>
            </div>
          )
        })}
      </div>
      {selectedDay && (
        <section className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-label="Selected day agenda">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <button type="button" onClick={() => setSelectedDay('')} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Close</button>
          </div>
          {selectedEvents.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No scans match these filters on this day.</p> : (
            <ul className="space-y-2">
              {selectedEvents.map((event) => <li key={event.id}><button type="button" onClick={() => onOpenPatient(event.patient_id)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700"><span className="font-medium text-slate-900 dark:text-white">{new Date(event.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {event.patient_name} · {event.modality} {event.body_part}</span><span className="text-slate-600 dark:text-slate-300">{event.status}</span></button></li>)}
            </ul>
          )}
        </section>
      )}
      {!isLoading && filteredEvents.length === 0 && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No scheduled scans match these filters for this month.</p>}
    </section>
  )
}
