import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'doctor') navigate('/doctor')
      else if (user.role === 'admin') navigate('/admin')
      else navigate('/patient')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute top-20 left-16 right-16 space-y-8 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-4h.01M17 11h2m-4 0h-2v2m0-4v-2h2m0 4v2m-4 0h2" />
              </svg>
            </div>
            <span className="font-display font-bold text-2xl text-white">Ambient AI</span>
          </div>
          <h1 className="font-display font-bold text-4xl xl:text-5xl text-white leading-tight">
            Doctor-Led AI for<br /><span className="text-primary-200">Patient Understanding</span>
          </h1>
          <p className="text-primary-100 text-lg max-w-md">Record conversations, extract clinical insights, generate multilingual reports, and measure patient comprehension.</p>
          <div className="flex gap-4 pt-4">
            {['Multilingual', 'Teach-Back', 'AI-Powered'].map((l, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-white/15 text-white text-sm font-medium backdrop-blur">{l}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-display font-bold text-2xl text-primary-700">Ambient AI Healthcare</h1>
            <p className="text-slate-500 mt-1 text-sm">Doctor-Led, Multilingual Patient Understanding</p>
          </div>
          <div className="bg-white rounded-2xl sm:shadow-soft sm:border border-slate-100 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="font-display font-semibold text-xl text-slate-800">Welcome back</h2>
              <p className="text-slate-500 mt-1 text-sm">Sign in to access your dashboard</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="doctor@hospital.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 shadow-soft">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <p className="mt-6 text-center text-slate-400 text-xs">Demo: doctor@hospital.com / doctor123 · patient@demo.com / patient123 · admin@hospital.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
