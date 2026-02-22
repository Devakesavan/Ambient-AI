import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children, role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const roleConfig = {
    doctor: { label: 'Doctor', class: 'bg-primary-100 text-primary-800 border-primary-200' },
    patient: { label: 'Patient', class: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    admin: { label: 'Admin', class: 'bg-accent-100 text-accent-800 border-accent-200' },
  }
  const cfg = roleConfig[role] || roleConfig.doctor

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-soft">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-4h.01M17 11h2m-4 0h-2v2m0-4v-2h2m0 4v2m-4 0h2" />
                  </svg>
                </div>
                <h1 className="font-display font-bold text-lg text-slate-800">Ambient AI Healthcare</h1>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.class}`}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 text-sm font-medium">{user?.full_name}</span>
              <button onClick={() => { logout(); navigate('/login') }} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
