import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Floating 3D shapes component
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large rotating gradient sphere */}
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-teal-400/30 to-emerald-600/20 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/25 to-teal-300/15 blur-3xl animate-float-reverse" />
      
      {/* 3D Floating cubes */}
      <div className="absolute top-[15%] left-[10%] w-16 h-16 animate-float-cube-1">
        <div className="w-full h-full bg-gradient-to-br from-teal-400/40 to-teal-600/30 rounded-2xl backdrop-blur-sm border border-white/20 shadow-2xl transform rotate-12 hover:rotate-45 transition-transform duration-700" 
             style={{ transform: 'perspective(1000px) rotateX(15deg) rotateY(-15deg)' }} />
      </div>
      <div className="absolute top-[60%] left-[5%] w-12 h-12 animate-float-cube-2">
        <div className="w-full h-full bg-gradient-to-br from-emerald-400/50 to-emerald-600/30 rounded-xl backdrop-blur-sm border border-white/20 shadow-xl"
             style={{ transform: 'perspective(1000px) rotateX(-10deg) rotateY(20deg)' }} />
      </div>
      <div className="absolute top-[25%] right-[8%] w-20 h-20 animate-float-cube-3">
        <div className="w-full h-full bg-gradient-to-br from-teal-300/35 to-emerald-500/25 rounded-3xl backdrop-blur-sm border border-white/25 shadow-2xl"
             style={{ transform: 'perspective(1000px) rotateX(20deg) rotateY(15deg)' }} />
      </div>
      <div className="absolute bottom-[20%] right-[15%] w-14 h-14 animate-float-cube-4">
        <div className="w-full h-full bg-gradient-to-br from-emerald-300/45 to-teal-500/30 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl"
             style={{ transform: 'perspective(1000px) rotateX(-15deg) rotateY(-20deg)' }} />
      </div>

      {/* Floating rings */}
      <div className="absolute top-[40%] left-[20%] w-24 h-24 animate-spin-slow">
        <div className="w-full h-full rounded-full border-4 border-teal-400/30 border-t-teal-400/60" />
      </div>
      <div className="absolute bottom-[35%] right-[25%] w-16 h-16 animate-spin-reverse">
        <div className="w-full h-full rounded-full border-4 border-emerald-400/25 border-b-emerald-400/50" />
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-[70%] left-[30%] w-6 h-6 rounded-full bg-teal-400/60 blur-sm animate-pulse-glow" />
      <div className="absolute top-[20%] right-[30%] w-4 h-4 rounded-full bg-emerald-400/70 blur-sm animate-pulse-glow-delayed" />
      <div className="absolute bottom-[25%] left-[40%] w-5 h-5 rounded-full bg-teal-300/50 blur-sm animate-pulse-glow" />

      {/* DNA-like helix lines */}
      <svg className="absolute top-0 left-[45%] w-20 h-full opacity-20 animate-float-dna" viewBox="0 0 80 800">
        <path d="M40 0 Q0 100 40 200 Q80 300 40 400 Q0 500 40 600 Q80 700 40 800" 
              fill="none" stroke="url(#tealGradient)" strokeWidth="2" />
        <path d="M40 0 Q80 100 40 200 Q0 300 40 400 Q80 500 40 600 Q0 700 40 800" 
              fill="none" stroke="url(#emeraldGradient)" strokeWidth="2" />
        <defs>
          <linearGradient id="tealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// Animated particles
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-teal-400/40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-float ${8 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ 
             backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
             backgroundSize: '50px 50px'
           }} />

      <FloatingShapes />
      <Particles />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className={`w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Left side - Branding */}
          <div className={`flex-1 text-center lg:text-left transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse-slow" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300"
                     style={{ transform: 'perspective(500px) rotateX(5deg) rotateY(-5deg)' }}>
                  {/* Microscope Icon */}
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="3" rx="2" ry="1" />
                    <path d="M12 4v3" />
                    <rect x="10" y="7" width="4" height="2" rx="0.5" />
                    <path d="M12 9v2" />
                    <path d="M10 11h4l1 3h-6l1-3z" />
                    <path d="M11 14v2" />
                    <path d="M13 14v2" />
                    <ellipse cx="12" cy="17" rx="2" ry="1" />
                    <rect x="7" y="18" width="10" height="1" rx="0.5" />
                    <path d="M15 11c3-1 4 0 5 2" />
                    <path d="M20 13v5" />
                    <path d="M6 22h12" />
                    <path d="M8 22v-3h8v3" />
                  </svg>
                </div>
              </div>
              <span className="font-display font-bold text-3xl bg-gradient-to-r from-white to-teal-200 bg-clip-text text-transparent">
                Ambient AI
              </span>
            </div>
            
            <h1 className="font-display font-bold text-4xl sm:text-5xl xl:text-6xl text-white leading-tight mb-6">
              Doctor-Led AI for
              <span className="block mt-2 bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400 bg-clip-text text-transparent animate-gradient-x">
                Patient Understanding
              </span>
            </h1>
            
            <p className="text-teal-100/80 text-lg max-w-md mx-auto lg:mx-0 mb-8">
              Record conversations, extract clinical insights, generate multilingual reports, and measure patient comprehension.
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {['Multilingual', 'Teach-Back', 'AI-Powered'].map((label, i) => (
                <span 
                  key={i} 
                  className={`px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${400 + i * 100}ms` }}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 mr-2 animate-pulse" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right side - Login Card */}
          <div className={`w-full max-w-md transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="relative group">
              {/* Card glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-gradient-xy" />
              
              {/* Main card */}
              <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 sm:p-10 shadow-2xl"
                   style={{ 
                     transform: 'perspective(1000px) rotateX(2deg)',
                     boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset'
                   }}>
                
                {/* Card inner glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
                
                <div className="mb-8">
                  <h2 className="font-display font-semibold text-2xl text-white mb-2">Welcome Back</h2>
                  <p className="text-teal-200/70 text-sm">Sign in to your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/20 backdrop-blur border border-red-400/30 text-red-200 text-sm animate-shake">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-teal-200/90">Email Address</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/50 to-emerald-500/50 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="relative w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-teal-300/40 focus:bg-white/10 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all duration-300" 
                        placeholder="doctor@ambient.ai" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-teal-200/90">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/50 to-emerald-500/50 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="relative w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-teal-300/40 focus:bg-white/10 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all duration-300" 
                        placeholder="••••••••" 
                        required 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="relative w-full py-4 rounded-xl font-bold text-white overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {/* Button gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 bg-[length:200%_100%] animate-gradient-x" />
                    
                    {/* Button shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </div>
                    
                    {/* Button shadow */}
                    <div className="absolute inset-0 rounded-xl shadow-lg shadow-teal-500/40 group-hover:shadow-xl group-hover:shadow-teal-500/50 transition-shadow duration-300" />
                    
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-center text-teal-200/50 text-xs font-medium">
                    Demo Accounts:
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {[
                      { email: 'doctor@ambient.ai', password: 'doctor123', role: 'Doctor' },
                      { email: 'patient1@ambient.ai', password: 'patient123', role: 'Patient' },
                      { email: 'admin@ambient.ai', password: 'admin123', role: 'Admin' }
                    ].map((acc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-teal-200/70 text-xs hover:bg-white/10 hover:text-white transition-all duration-200"
                      >
                        {acc.role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-5deg); }
        }
        @keyframes float-cube-1 {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          25% { transform: translateY(-15px) translateX(10px) rotate(5deg); }
          50% { transform: translateY(-25px) translateX(0) rotate(-3deg); }
          75% { transform: translateY(-10px) translateX(-10px) rotate(3deg); }
        }
        @keyframes float-cube-2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-20px) translateX(15px); }
          66% { transform: translateY(-10px) translateX(-10px); }
        }
        @keyframes float-cube-3 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes float-cube-4 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(10deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes pulse-glow-delayed {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes float-dna {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-50px); }
        }
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          50% { transform: translateY(-100px) translateX(50px); opacity: 0.4; }
          90% { opacity: 0.6; }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 0%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 10s ease-in-out infinite; }
        .animate-float-cube-1 { animation: float-cube-1 12s ease-in-out infinite; }
        .animate-float-cube-2 { animation: float-cube-2 10s ease-in-out infinite; }
        .animate-float-cube-3 { animation: float-cube-3 14s ease-in-out infinite; }
        .animate-float-cube-4 { animation: float-cube-4 9s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 15s linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-pulse-glow-delayed { animation: pulse-glow-delayed 3s ease-in-out infinite 1s; }
        .animate-float-dna { animation: float-dna 15s ease-in-out infinite; }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-gradient-xy { animation: gradient-xy 6s ease infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
