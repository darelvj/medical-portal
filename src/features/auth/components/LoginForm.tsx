import { type FormEvent, useState } from 'react'
import { login, type User } from '../../../lib/api'
import loginBackground from '../../../assets/medical-login-background.png'

interface LoginFormProps {
  onLogin: (user: User) => void | Promise<void>
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const inputClasses = 'border-slate-600 bg-slate-800 text-white placeholder-slate-400'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const user = await login(email.trim(), password)
      await onLogin(user)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 bg-slate-950 text-slate-100"
      style={{
        backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.68), rgba(2, 6, 23, 0.82)), url(${loginBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <section className="w-full max-w-md border border-slate-700 rounded-2xl shadow-2xl shadow-black/30 p-8 backdrop-blur-sm bg-slate-900/95">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ color: '#f8fafc' }}
          >
            Medical Portal
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Sign in to access patient records
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="doctor@example.com"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-slate-200">
              Password
            </label>
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-200">
              <input
                type="checkbox"
                checked={isPasswordVisible}
                onChange={(event) => setIsPasswordVisible(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-blue-500"
              />
              Show password
            </label>
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-md transition-colors">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
