import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import UserManagement from './features/admin/components/UserManagement'
import ReportTemplateManagement from './features/admin/components/ReportTemplateManagement'
import TatMis from './features/admin/components/TatMis'
import AuditHistory from './features/admin/components/AuditHistory'
import LoginForm from './features/auth/components/LoginForm'
import DashboardSummary from './features/dashboard/components/DashboardSummary'
import PatientDetails from './features/patients/components/PatientDetails'
import PatientEditForm from './features/patients/components/PatientEditForm'
import PatientHeader from './features/patients/components/PatientHeader'
import ScanCalendar from './features/patients/components/ScanCalendar'
import RadiologistWorklist from './features/patients/components/RadiologistWorklist'
import { getCurrentUser, getDashboardSummary, getPatient, getPatients, getScanCalendar, getUserPreferences, logout, rescheduleScan, scheduleScan, updatePatient, updateScanStatus, updateUserPreferences, type NewScanSchedule } from './lib/api'
import './App.css'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function App() {
  const queryClient = useQueryClient()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [forceLogin, setForceLogin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [modality, setModality] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20
  const [hasFetched, setHasFetched] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [selectedWorklistScanId, setSelectedWorklistScanId] = useState<string | null>(null)
  const [openReportScanId, setOpenReportScanId] = useState<string | null>(null)
  const [isChoosingPatientToSchedule, setIsChoosingPatientToSchedule] = useState(false)
  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [activeSection, setActiveSection] = useState<'dashboard' | 'worklist' | 'calendar' | 'users' | 'templates' | 'mis' | 'audit'>('dashboard')
  const [calendarRange, setCalendarRange] = useState(() => {
    const now = new Date()
    return { start: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
  })

  const { data: user, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    retry: false,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, reportStatus, modality, dateFrom, dateTo])

  const { data: patientPage, refetch, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['patients', { search: debouncedSearch, status, report_status: reportStatus, modality, date_from: dateFrom, date_to: dateTo, page, per_page: perPage }],
    queryFn: () => getPatients({ search: debouncedSearch, status, report_status: reportStatus, modality, date_from: dateFrom, date_to: dateTo, page, per_page: perPage }),
    enabled: hasFetched && Boolean(user) && !forceLogin,
  });
  const patients = patientPage?.data ?? []

  const canViewScans = Boolean(user?.roles?.some((role) => ['admin', 'clinician', 'radiologist', 'qa', 'signer', 'technician'].includes(role)))
  const isRadiologist = Boolean(user?.roles?.includes('radiologist') || user?.role === 'radiologist')
  const canReviewScans = Boolean(user?.roles?.some((role) => ['admin', 'technician'].includes(role)))
  const reportingQueue = user?.roles?.includes('qa') ? { label: 'QA queue', stage: 'QA Pending' } : user?.roles?.includes('signer') ? { label: 'Signing queue', stage: 'QA Approved' } : null

  useEffect(() => {
    if (isRadiologist) setActiveSection('worklist')
  }, [user?.id, isRadiologist])

  const { data: calendarEvents = [], isLoading: isCalendarLoading, error: calendarError } = useQuery({
    queryKey: ['scan-calendar', calendarRange],
    queryFn: () => getScanCalendar(calendarRange.start, calendarRange.end),
    enabled: activeSection === 'calendar' && canViewScans && Boolean(user) && !forceLogin,
  })

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    enabled: Boolean(user) && !forceLogin,
  })

  const { data: selectedPatient, isLoading: isPatientLoading, error: patientError } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => getPatient(selectedPatientId!),
    enabled: selectedPatientId !== null && Boolean(user) && !forceLogin,
  })

  const { data: preferences } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: getUserPreferences,
    enabled: Boolean(user) && !forceLogin,
  })

  useEffect(() => {
    if (preferences) {
      setIsDarkMode(preferences.theme === 'dark')
    }
  }, [preferences])

  const preferenceMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['user-preferences'], updatedPreferences)
    },
  })

  const patientUpdateMutation = useMutation({
    mutationFn: (changes: Parameters<typeof updatePatient>[1]) => updatePatient(selectedPatientId!, changes),
    onSuccess: (updatedPatient) => {
      queryClient.setQueryData(['patient', selectedPatientId], updatedPatient)
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setIsEditingPatient(false)
    },
  })

  const scanStatusMutation = useMutation({
    mutationFn: ({ scanId, status }: { scanId: string; status: string }) => updateScanStatus(scanId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', selectedPatientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['scan-calendar'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const refreshScheduledScans = () => {
    queryClient.invalidateQueries({ queryKey: ['patient'] })
    queryClient.invalidateQueries({ queryKey: ['patients'] })
    queryClient.invalidateQueries({ queryKey: ['scan-calendar'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
  }

  const scheduleScanMutation = useMutation({
    mutationFn: (details: NewScanSchedule) => scheduleScan(selectedPatientId!, details),
    onSuccess: refreshScheduledScans,
  })

  const rescheduleScanMutation = useMutation({
    mutationFn: ({ scanId, scheduledAt }: { scanId: string; scheduledAt: string }) => rescheduleScan(scanId, scheduledAt),
    onSuccess: refreshScheduledScans,
  })

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark'
    setIsDarkMode(nextTheme === 'dark')
    preferenceMutation.mutate({ theme: nextTheme })
  }

  const handleFetchPatients = () => {
    setHasFetched(true);
    refetch();
  };

  // Get status badge colors
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'in progress':
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
    }
  };

  // Get modality badge colors
  const getModalityBadgeClass = (modality: string) => {
    switch (modality.toUpperCase()) {
      case 'CT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'MR':
      case 'MRI':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'XR':
      case 'X-RAY':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Checking authentication...</div>
  }

  if (forceLogin || !user) {
    return (
      <LoginForm
        onLogin={async (nextUser) => {
          await queryClient.cancelQueries()
          queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'current-user' })
          queryClient.setQueryData(['current-user'], nextUser)
          setHasFetched(false)
          setSelectedPatientId(null)
          setSelectedWorklistScanId(null)
          setOpenReportScanId(null)
          setActiveSection('dashboard')
          setSearchQuery('')
          setDebouncedSearch('')
          setStatus('')
          setReportStatus('')
          setModality('')
          setDateFrom('')
          setDateTo('')
          setPage(1)
          setForceLogin(false)
        }}
      />
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      await queryClient.cancelQueries()
      queryClient.setQueryData(['current-user'], null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'current-user' })
      setForceLogin(true)
      setSelectedPatientId(null)
      setSelectedWorklistScanId(null)
      setOpenReportScanId(null)
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300`}>
      {/* Patient Header Component with state-lifted search */}
      <PatientHeader 
        totalPatients={hasFetched ? (patientPage?.total ?? 0) : 0} 
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        status={status}
        onStatusChange={setStatus}
        modality={modality}
        onModalityChange={setModality}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onResetFilters={() => {
          setSearchQuery('')
          setDebouncedSearch('')
          setStatus('')
          setReportStatus('')
          setModality('')
          setDateFrom('')
          setDateTo('')
          setPage(1)
        }}
        userName={user.name}
        tenantName={user.tenant_name}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center">
        <nav className="mb-8 flex w-full flex-wrap gap-2" aria-label="Portal sections">
          <button type="button" onClick={() => { setActiveSection('dashboard'); setIsChoosingPatientToSchedule(false); setReportStatus('') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'dashboard' && !reportStatus ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>Dashboard & patients</button>
          {isRadiologist && <button type="button" onClick={() => { setActiveSection('worklist'); setIsChoosingPatientToSchedule(false) }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'worklist' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>My worklist</button>}
          {reportingQueue && <button type="button" onClick={() => { setActiveSection('dashboard'); setIsChoosingPatientToSchedule(false); setSearchQuery(''); setDebouncedSearch(''); setStatus(''); setModality(''); setDateFrom(''); setDateTo(''); setReportStatus(reportingQueue.stage); setPage(1); setHasFetched(true) }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'dashboard' && reportStatus === reportingQueue.stage ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{reportingQueue.label}</button>}
          {canReviewScans && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('dashboard'); setSearchQuery(''); setDebouncedSearch(''); setModality(''); setDateFrom(''); setDateTo(''); setReportStatus(''); setStatus('Pending Review'); setPage(1); setHasFetched(true) }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'dashboard' && status === 'Pending Review' ? 'bg-amber-600 text-white' : 'border border-amber-300 bg-white text-amber-800 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200'}`}>Review queue</button>}
          {canViewScans && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('calendar') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'calendar' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>Scan calendar</button>}
          {user.role === 'admin' && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('users') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'users' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>User management</button>}
          {user.role === 'admin' && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('templates') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'templates' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>Report templates</button>}
          {user.role === 'admin' && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('mis') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'mis' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>MIS · TAT</button>}
          {user.role === 'admin' && <button type="button" onClick={() => { setIsChoosingPatientToSchedule(false); setActiveSection('audit') }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeSection === 'audit' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>Audit history</button>}
        </nav>
        {activeSection === 'users' && user.role === 'admin' ? <UserManagement /> : activeSection === 'templates' && user.role === 'admin' ? <ReportTemplateManagement /> : activeSection === 'mis' && user.role === 'admin' ? <TatMis /> : activeSection === 'audit' && user.role === 'admin' ? <AuditHistory onOpenStudy={(patientId, scanId) => { setSelectedWorklistScanId(scanId); setOpenReportScanId(null); setSelectedPatientId(patientId) }} /> : activeSection === 'worklist' && isRadiologist ? (
          <RadiologistWorklist onOpenStudy={(patientId, scanId, openReport) => {
            setSelectedWorklistScanId(scanId)
            setOpenReportScanId(openReport ? scanId : null)
            setSelectedPatientId(patientId)
          }} />
        ) : activeSection === 'calendar' ? (
          <ScanCalendar
            events={calendarEvents}
            isLoading={isCalendarLoading}
            error={calendarError instanceof Error ? calendarError : null}
            onOpenPatient={(patientId) => { setIsChoosingPatientToSchedule(false); setSelectedPatientId(patientId) }}
            onScheduleNew={canReviewScans ? () => {
              setActiveSection('dashboard')
              setIsChoosingPatientToSchedule(true)
              setSearchQuery('')
              setDebouncedSearch('')
              setStatus('')
              setReportStatus('')
              setModality('')
              setDateFrom('')
              setDateTo('')
              setPage(1)
              setHasFetched(true)
            } : undefined}
            onMonthChange={(start, end) => setCalendarRange({ start, end })}
          />
        ) : <>
        {isChoosingPatientToSchedule && <div className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100"><span>Select a patient below to schedule a scan.</span><button type="button" onClick={() => setIsChoosingPatientToSchedule(false)} className="font-semibold underline">Cancel</button></div>}
        <DashboardSummary summary={summary} isLoading={isSummaryLoading} />
        {/* Fetch Action Button Area */}
        <div className="mb-8 text-center">
          <button
            type="button"
            onClick={handleFetchPatients}
            disabled={isFetching}
            className={`px-6 py-3 font-semibold rounded-lg shadow-md text-white transition-all duration-200 
              ${isFetching 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95'
              }`}
          >
            {isFetching ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching Patients...
              </span>
            ) : hasFetched ? (
              'Refresh Patient Data'
            ) : (
              'Load Patient Records'
            )}
          </button>
        </div>

        {/* Dynamic Content States */}
        {!hasFetched && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm max-w-md mx-auto my-12">
            <svg className="w-16 h-16 text-blue-500 mb-4 opacity-75" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V14.25c0-.621-.504-1.125-1.125-1.125H9.75M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Records Loaded</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Click the button above to load patient records from the clinical server database.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-blue-100 dark:border-blue-900/30"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium">Retrieving electronic health records...</p>
          </div>
        )}

        {isError && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl max-w-md mx-auto my-12">
            <svg className="w-12 h-12 text-red-500 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-1">Database Error</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{(error as Error)?.message || 'An error occurred.'}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {hasFetched && !isLoading && !isError && (
          <div className="w-full">
            {patients.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white">No search results</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  We couldn't find any patient matching the selected filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPatientId(patient.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedPatientId(patient.id)
                      }
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          ID: {patient.id}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1 leading-snug">
                          {patient.name}
                        </h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(patient.status)}`}>
                        {patient.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 text-xs block uppercase">Age / Gender</span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {patient.age} yrs / {patient.gender}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 dark:text-gray-500 text-xs block uppercase">Modality</span>
                          <span className={`inline-flex px-2 py-0.5 mt-0.5 rounded text-xs font-bold ${getModalityBadgeClass(patient.modality)}`}>
                            {patient.modality}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-50 dark:border-gray-800/50">
                        <span className="text-gray-500 dark:text-gray-400 text-xs block">Report: {patient.report_status ?? 'Unassigned'}{patient.assigned_radiologist_name ? ` · ${patient.assigned_radiologist_name}` : ''}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs block uppercase">DICOM UID</span>
                        <code className="text-xs block bg-gray-50 dark:bg-gray-950 p-2 rounded border border-gray-100 dark:border-gray-800 break-all text-gray-600 dark:text-gray-400 mt-1 select-all font-mono">
                          {patient.study_uid}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(patientPage?.pagination.pages ?? 0) > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button type="button" disabled={page === 1 || isFetching} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Previous</button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Page {page} of {patientPage?.pagination.pages}</span>
                <button type="button" disabled={page >= (patientPage?.pagination.pages ?? 1) || isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Next</button>
              </div>
            )}
          </div>
        )}
        </>}
      </main>

      {selectedPatientId && (
        <PatientDetails
          key={selectedPatientId}
          user={user}
          onReportChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['patient', selectedPatientId] })
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            queryClient.invalidateQueries({ queryKey: ['reporting-worklist'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
            queryClient.invalidateQueries({ queryKey: ['scan-calendar'] })
            queryClient.invalidateQueries({ queryKey: ['audit-events'] })
          }}
          startWithScheduleForm={isChoosingPatientToSchedule}
          focusedScanId={selectedWorklistScanId}
          openReportScanId={openReportScanId}
          patient={selectedPatient}
          isLoading={isPatientLoading}
          error={patientError}
          onClose={() => { setSelectedPatientId(null); setSelectedWorklistScanId(null); setOpenReportScanId(null); setIsChoosingPatientToSchedule(false) }}
          canEdit={user.role === 'admin'}
          canReview={canReviewScans}
          isUpdatingScan={scanStatusMutation.isPending}
          scanUpdateError={scanStatusMutation.error instanceof Error ? scanStatusMutation.error.message : ''}
          onUpdateScanStatus={(scanId, nextStatus) => scanStatusMutation.mutate({ scanId, status: nextStatus })}
          isScheduling={scheduleScanMutation.isPending || rescheduleScanMutation.isPending}
          isDarkMode={isDarkMode}
          onCreateScan={async (details) => { await scheduleScanMutation.mutateAsync(details) }}
          onRescheduleScan={async (scanId, scheduledAt) => { await rescheduleScanMutation.mutateAsync({ scanId, scheduledAt }) }}
          onEdit={() => setIsEditingPatient(true)}
        />
      )}

      {selectedPatientId && isEditingPatient && selectedPatient && (
        <PatientEditForm
          patient={selectedPatient}
          isSaving={patientUpdateMutation.isPending}
          error={patientUpdateMutation.error instanceof Error ? patientUpdateMutation.error.message : ''}
          onCancel={() => setIsEditingPatient(false)}
          onSave={(changes) => patientUpdateMutation.mutate(changes)}
        />
      )}
    </div>
  )
}

export default App
