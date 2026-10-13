import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAdminUser, getAdminUsers, getRoles, updateAdminUser } from '../../../lib/api'
import AutoAssignment from './AutoAssignment'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers })
  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: getRoles })

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    queryClient.invalidateQueries({ queryKey: ['reporting-candidates'] })
  }
  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      setName('')
      setEmail('')
      setPassword('')
      setRoleId('')
      setFormMessage('User created.')
      refreshUsers()
    },
    onError: (error) => setFormMessage(error instanceof Error ? error.message : 'Could not create user.'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { role_id?: string; is_active?: boolean; reporting_modalities?: string[] } }) => updateAdminUser(id, changes),
    onSuccess: refreshUsers,
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormMessage('')
    createMutation.mutate({ name, email, password, role_id: roleId })
  }

  const roles = rolesQuery.data || []
  const fieldClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white'
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200'

  return (
    <section className="w-full">
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Administration</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">User management</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create accounts, assign roles, and control access.</p>
      </div>
      <AutoAssignment />

      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className={labelClass} htmlFor="new-user-name">Full name</label><input className={fieldClass} id="new-user-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div><label className={labelClass} htmlFor="new-user-email">Email</label><input className={fieldClass} id="new-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div><label className={labelClass} htmlFor="new-user-password">Temporary password</label><input className={fieldClass} id="new-user-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        <div><label className={labelClass} htmlFor="new-user-role">Role</label><select className={fieldClass} id="new-user-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} required><option value="">Choose role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
        <div className="flex items-end"><button disabled={createMutation.isPending || roles.length === 0} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{createMutation.isPending ? 'Creating…' : 'Create user'}</button></div>
        {formMessage && <p role="status" className="sm:col-span-2 lg:col-span-5 text-sm text-slate-600 dark:text-slate-300">{formMessage}</p>}
      </form>

      {(usersQuery.isLoading || rolesQuery.isLoading) && <p className="py-10 text-center text-slate-500">Loading user accounts…</p>}
      {(usersQuery.isError || rolesQuery.isError) && <p role="alert" className="py-6 text-center text-red-600 dark:text-red-400">{(usersQuery.error || rolesQuery.error)?.message}</p>}

      {usersQuery.data && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400">
              <tr><th className="px-5 py-3 font-medium">User</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Modalities</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersQuery.data.map((user) => {
                const currentRole = roles.find((role) => role.name === user.role)
                return (
                  <tr key={user.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900 dark:text-white">{user.name}</p><p className="mt-0.5 text-slate-500 dark:text-slate-400">{user.email}</p></td>
                    <td className="px-5 py-4"><select aria-label={`Role for ${user.name}`} className={fieldClass} value={currentRole?.id || ''} onChange={(event) => updateMutation.mutate({ id: user.id, changes: { role_id: event.target.value } })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td>
                    <td className="px-5 py-4">{user.role === 'radiologist' ? <div className="flex flex-wrap gap-2">{['CT', 'MRI', 'XR', 'US'].map((modality) => <label key={modality} className="flex items-center gap-1 text-slate-700 dark:text-slate-200"><input type="checkbox" checked={user.reporting_modalities?.includes(modality) ?? false} disabled={updateMutation.isPending} onChange={() => { const selected = user.reporting_modalities ?? []; const next = selected.includes(modality) ? selected.filter((item) => item !== modality) : [...selected, modality]; if (next.length) updateMutation.mutate({ id: user.id, changes: { reporting_modalities: next } }) }} />{modality}</label>)}</div> : <span className="text-slate-500 dark:text-slate-400">—</span>}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => updateMutation.mutate({ id: user.id, changes: { is_active: !user.is_active } })} className="font-medium text-blue-700 hover:underline dark:text-blue-300">{user.is_active ? 'Deactivate' : 'Activate'}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {roles.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{roles.map((role) => <article key={role.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><h3 className="font-semibold text-slate-900 dark:text-white capitalize">{role.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{role.description}</p><p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400">{role.permissions.join(' · ')}</p></article>)}</div>}
    </section>
  )
}
