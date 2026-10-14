// Use Vite's proxy in development so the browser stays on the same origin
// as the frontend. This is important for the HttpOnly authentication cookie.
const API_BASE_URL = '/api'

function localDateBoundaryAsUtc(date: string, nextDay = false) {
  const boundary = new Date(`${date}T00:00:00`)
  if (nextDay) boundary.setDate(boundary.getDate() + 1)
  return boundary.toISOString()
}

export interface User {
  id: string
  tenant_id: string
  tenant_slug: string
  tenant_name: string
  name: string
  email: string
  role: string
  roles?: string[]
  is_active?: boolean
  reporting_modalities?: string[]
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
}

export interface Patient {
  id: string
  name: string
  age: number
  gender: string
  modality: string
  study_uid: string
  status: string
  scan_id?: string
  body_part?: string
  scheduled_at?: string | null
  performed_at?: string | null
  report_status?: string
  assigned_radiologist_id?: string | null
  assigned_radiologist_name?: string | null
  reviewer_id?: string | null
  reviewer_name?: string | null
  qa_user_id?: string | null
  qa_user_name?: string | null
  signer_id?: string | null
  signer_name?: string | null
  draft_text?: string | null
  report_sections?: ReportSections | null
  review_text?: string | null
  qa_feedback?: string | null
  signed_at?: string | null
  tat?: TatMetrics
}

export interface ReportSections {
  clinical_history: string
  technique: string
  findings: string
  impression: string
}

export interface ReportTemplate {
  id: string
  name: string
  modality: string
  sections: ReportSections
  is_active: boolean
}

export async function getReportTemplates(modality = '', includeInactive = false): Promise<ReportTemplate[]> {
  const query = new URLSearchParams()
  if (modality) query.set('modality', modality)
  if (includeInactive) query.set('include_inactive', '1')
  const response = await apiFetch<{ data: ReportTemplate[] }>(`/reporting/templates?${query}`)
  return response.data
}

export async function createReportTemplate(details: Pick<ReportTemplate, 'name' | 'modality' | 'sections'>): Promise<ReportTemplate> {
  const response = await apiFetch<{ data: ReportTemplate }>('/reporting/templates', { method: 'POST', body: JSON.stringify(details) })
  return response.data
}

export async function updateReportTemplate(id: string, changes: Partial<Pick<ReportTemplate, 'name' | 'modality' | 'sections' | 'is_active'>>): Promise<ReportTemplate> {
  const response = await apiFetch<{ data: ReportTemplate }>(`/reporting/templates/${id}`, { method: 'PUT', body: JSON.stringify(changes) })
  return response.data
}

export interface TatMetrics {
  minutes: number | null
  source: 'calculated' | 'manual' | null
  target_minutes: number
  elapsed_minutes: number | null
  breached: boolean | null
  note: string | null
}

export interface WorklistStudy {
  scan_id: string
  patient_id: string
  patient_name: string
  age: number
  modality: string
  body_part: string
  study_uid: string
  status: string
  report_status: string
  scheduled_at: string | null
  performed_at: string | null
  tat: TatMetrics
}

export interface WorklistQuery {
  role: 'primary' | 'review'
  stage: string
  modality: string
  search: string
  sort: 'oldest' | 'newest'
  page: number
  per_page: number
}

export interface WorklistPage {
  data: WorklistStudy[]
  total: number
  pagination: { page: number; per_page: number; pages: number }
}

export async function getReportingWorklist(filters: WorklistQuery): Promise<WorklistPage> {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => query.set(key, String(value)))
  return apiFetch<WorklistPage>(`/reporting/worklist?${query}`)
}

export interface TatStudy {
  scan_id: string
  patient_id: string
  patient_name: string
  accession_number: string
  modality: string
  body_part: string
  scan_status: string
  report_status: string
  radiologist_id: string | null
  radiologist_name: string | null
  performed_at: string | null
  signed_at: string | null
  tat: TatMetrics
}

export interface TatReport {
  summary: {
    studies: number
    measured: number
    manual_count: number
    pending_overdue: number
    average_minutes: number | null
    median_minutes: number | null
    on_time_count: number
    on_time_percent: number | null
    by_modality: Record<string, { count: number; average_minutes: number }>
  }
  studies: TatStudy[]
}

export type AuditCategory = 'all' | 'assignment' | 'report' | 'tat'

export interface AuditEvent {
  id: string
  occurred_at: string
  action: string
  label: string
  detail: string
  actor_name: string
  scan_id: string
  study_uid: string
  modality: string
  patient_id: string
  patient_name: string
}

export interface AuditEventPage {
  data: AuditEvent[]
  total: number
  pagination: { page: number; per_page: number; pages: number }
}

export async function getAuditEvents(filters: { category: AuditCategory; search: string; page: number; per_page: number }): Promise<AuditEventPage> {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value !== '') query.set(key, String(value)) })
  return apiFetch<AuditEventPage>(`/admin/audit-events?${query}`)
}

export interface PatientRecord {
  id: string
  name: string
  age: number
  gender: string
  medical_record_number: string
  blood_type: string | null
  date_of_birth: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  modality?: string
  study_uid?: string
  status?: string
  report_status?: string
  scans: Patient[]
}

export interface DashboardSummary {
  total_patients: number
  completed_studies: number
  pending_review: number
  modality_counts: Record<string, number>
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  records_per_page: number
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const responseText = response.status === 204 ? '' : await response.text()
  let body: unknown = null

  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      throw new ApiError(
        response.status,
        'The API returned an invalid response. Check that the Flask server is running.',
      )
    }
  }

  if (!response.ok) {
    const errorBody = body as { error?: { message?: string } } | null
    throw new ApiError(
      response.status,
      errorBody?.error?.message || 'Unable to reach the API. Check that the Flask server is running.',
    )
  }

  if (!body) {
    throw new ApiError(response.status, 'The API returned an empty response.')
  }

  return body as T
}

export async function login(email: string, password: string) {
  const response = await apiFetch<{ data: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  return response.data
}

export async function getCurrentUser() {
  try {
    const response = await apiFetch<{ data: User }>('/auth/me')
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' })
}

export interface PatientQuery {
  search?: string
  status?: string
  report_status?: string
  modality?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export interface PatientPage {
  data: Patient[]
  total: number
  pagination: { page: number; per_page: number; total: number; pages: number }
}

export interface ScanCalendarEvent {
  id: string
  patient_id: string
  patient_name: string
  scheduled_at: string
  modality: string
  body_part: string
  status: string
}

export async function getScanCalendar(start: string, end: string): Promise<ScanCalendarEvent[]> {
  const query = new URLSearchParams({ start: localDateBoundaryAsUtc(start), end: localDateBoundaryAsUtc(end, true) })
  const response = await apiFetch<{ data: ScanCalendarEvent[] }>(`/scans/calendar?${query}`)
  return response.data
}

export async function updateScanStatus(scanId: string, status: string) {
  const response = await apiFetch<{ data: Patient }>(`/scans/${scanId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return response.data
}

export interface NewScanSchedule {
  modality: string
  body_part: string
  scheduled_at: string
}

export async function scheduleScan(patientId: string, details: NewScanSchedule) {
  const response = await apiFetch<{ data: Patient }>(`/patients/${patientId}/scans`, {
    method: 'POST',
    body: JSON.stringify(details),
  })
  return response.data
}

export async function rescheduleScan(scanId: string, scheduledAt: string) {
  const response = await apiFetch<{ data: Patient }>(`/scans/${scanId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  })
  return response.data
}

export async function getPatients(params: PatientQuery = {}): Promise<PatientPage> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    if (key === 'date_from') query.set(key, localDateBoundaryAsUtc(String(value)))
    else if (key === 'date_to') query.set(key, localDateBoundaryAsUtc(String(value), true))
    else query.set(key, String(value))
  })
  const response = await apiFetch<PatientPage>(`/patients?${query.toString()}`)
  return response
}

export async function getPatient(patientId: string) {
  const response = await apiFetch<{ data: PatientRecord }>(`/patients/${patientId}`)
  return response.data
}

export async function updatePatient(patientId: string, changes: Partial<PatientRecord>) {
  const response = await apiFetch<{ data: PatientRecord }>(`/patients/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  })
  return response.data
}

export async function getAdminUsers() {
  const response = await apiFetch<{ data: User[] }>('/admin/users')
  return response.data
}

export async function getRoles() {
  const response = await apiFetch<{ data: Role[] }>('/admin/roles')
  return response.data
}

export async function createAdminUser(user: { name: string; email: string; password: string; role_id: string }) {
  const response = await apiFetch<{ data: User }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(user),
  })
  return response.data
}

export async function updateAdminUser(userId: string, changes: { role_id?: string; is_active?: boolean; reporting_modalities?: string[] }) {
  const response = await apiFetch<{ data: User }>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  })
  return response.data
}

export async function getDashboardSummary() {
  const response = await apiFetch<{ data: DashboardSummary }>('/dashboard/summary')
  return response.data
}

export async function getUserPreferences() {
  const response = await apiFetch<{ data: UserPreferences }>('/preferences')
  return response.data
}

export async function updateUserPreferences(preferences: Partial<UserPreferences>) {
  const response = await apiFetch<{ data: UserPreferences }>('/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
  return response.data
}

export interface ReportingCandidate {
  id: string
  name: string
  modalities: string[]
}

export async function getReportingCandidates() {
  const response = await apiFetch<{ data: Partial<Record<'radiologist' | 'qa' | 'signer', ReportingCandidate[]>> }>('/reporting/candidates')
  return response.data
}

export async function assignScan(scanId: string, assignment: {
  mode: 'manual' | 'least_active' | 'round_robin'
  radiologist_id?: string
  qa_user_id?: string
  signer_id?: string
}) {
  const response = await apiFetch<{ data: Patient }>(`/scans/${scanId}/assignment`, { method: 'POST', body: JSON.stringify(assignment) })
  return response.data
}

export async function autoAssignScans(assignment: { mode: 'least_active' | 'round_robin'; qa_user_id: string; signer_id: string }) {
  const response = await apiFetch<{ data: { assigned: number; skipped: number; limit: number } }>('/reporting/auto-assign', {
    method: 'POST', body: JSON.stringify(assignment),
  })
  return response.data
}

export async function reportAction(scanId: string, action: 'draft' | 'review-request' | 'review' | 'submit-qa' | 'qa' | 'sign', payload: Record<string, string> = {}) {
  const response = await apiFetch<{ data: Patient }>(`/scans/${scanId}/report/${action}`, {
    method: action === 'draft' ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  })
  return response.data
}

export async function saveStructuredDraft(scanId: string, sections: ReportSections) {
  const response = await apiFetch<{ data: Patient }>(`/scans/${scanId}/report/draft`, {
    method: 'PUT',
    body: JSON.stringify({ sections }),
  })
  return response.data
}

export async function getTatReport(filters: { modality?: string; radiologist_id?: string; date_from?: string; date_to?: string } = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (!value) return
    if (key === 'date_from') query.set(key, localDateBoundaryAsUtc(value))
    else if (key === 'date_to') query.set(key, localDateBoundaryAsUtc(value, true))
    else query.set(key, value)
  })
  const response = await apiFetch<{ data: TatReport }>(`/admin/mis/tat?${query}`)
  return response.data
}

export async function updateStudyTat(scanId: string, changes: { manual_minutes?: number | null; target_minutes?: number | null; note?: string }) {
  const response = await apiFetch<{ data: { scan_id: string; tat: TatMetrics } }>(`/admin/scans/${scanId}/tat`, {
    method: 'PATCH', body: JSON.stringify(changes),
  })
  return response.data
}
