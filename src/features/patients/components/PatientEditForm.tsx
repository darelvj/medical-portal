import { type FormEvent, useEffect, useState } from 'react'
import { type PatientRecord } from '../../../lib/api'

interface PatientEditFormProps {
  patient: PatientRecord
  isSaving: boolean
  error: string
  onCancel: () => void
  onSave: (changes: Partial<PatientRecord>) => void
}

export default function PatientEditForm({ patient, isSaving, error, onCancel, onSave }: PatientEditFormProps) {
  const [firstName, setFirstName] = useState(patient.first_name)
  const [lastName, setLastName] = useState(patient.last_name)
  const [dateOfBirth, setDateOfBirth] = useState(patient.date_of_birth)
  const [gender, setGender] = useState(patient.gender)
  const [bloodType, setBloodType] = useState(patient.blood_type || '')
  const [phone, setPhone] = useState(patient.phone || '')
  const [email, setEmail] = useState(patient.email || '')
  const [medicalRecordNumber, setMedicalRecordNumber] = useState(patient.medical_record_number)

  useEffect(() => {
    setFirstName(patient.first_name)
    setLastName(patient.last_name)
    setDateOfBirth(patient.date_of_birth)
    setGender(patient.gender)
    setBloodType(patient.blood_type || '')
    setPhone(patient.phone || '')
    setEmail(patient.email || '')
    setMedicalRecordNumber(patient.medical_record_number)
  }, [patient])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      gender,
      blood_type: bloodType || null,
      phone: phone || null,
      email: email || null,
      medical_record_number: medicalRecordNumber,
    })
  }

  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1'
  const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-patient-heading" className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <h2 id="edit-patient-heading" className="text-xl font-bold text-slate-900 dark:text-white">Edit patient information</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update the fictional demographic record for {patient.name}.</p>
        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass} htmlFor="first-name">First name</label><input className={inputClass} id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></div>
          <div><label className={labelClass} htmlFor="last-name">Last name</label><input className={inputClass} id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></div>
          <div><label className={labelClass} htmlFor="date-of-birth">Date of birth</label><input className={inputClass} id="date-of-birth" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required /></div>
          <div><label className={labelClass} htmlFor="gender">Gender</label><select className={inputClass} id="gender" value={gender} onChange={(event) => setGender(event.target.value)}><option>Female</option><option>Male</option><option>Non-binary</option></select></div>
          <div><label className={labelClass} htmlFor="blood-type">Blood type</label><select className={inputClass} id="blood-type" value={bloodType} onChange={(event) => setBloodType(event.target.value)}><option value="">Not recorded</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => <option key={type}>{type}</option>)}</select></div>
          <div><label className={labelClass} htmlFor="medical-record-number">Medical record number</label><input className={inputClass} id="medical-record-number" value={medicalRecordNumber} onChange={(event) => setMedicalRecordNumber(event.target.value)} required /></div>
          <div><label className={labelClass} htmlFor="patient-phone">Phone</label><input className={inputClass} id="patient-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelClass} htmlFor="patient-email">Email</label><input className={inputClass} id="patient-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          {error && <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
