import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

// Microscope SVG Icon Component
function MicroscopeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Eyepiece */}
      <ellipse cx="12" cy="3" rx="2" ry="1" />
      {/* Tube */}
      <path d="M12 4v3" />
      <rect x="10" y="7" width="4" height="2" rx="0.5" />
      {/* Body */}
      <path d="M12 9v2" />
      <path d="M10 11h4l1 3h-6l1-3z" />
      {/* Objective lens */}
      <path d="M11 14v2" />
      <path d="M13 14v2" />
      <ellipse cx="12" cy="17" rx="2" ry="1" />
      {/* Stage */}
      <rect x="7" y="18" width="10" height="1" rx="0.5" />
      {/* Arm */}
      <path d="M15 11c3-1 4 0 5 2" />
      <path d="M20 13v5" />
      {/* Base */}
      <path d="M6 22h12" />
      <path d="M8 22v-3h8v3" />
    </svg>
  )
}

// 3D Floating Elements for empty spaces
function Floating3DElements({ role }) {
  const roleColors = {
    doctor: { primary: 'teal', secondary: 'emerald' },
    patient: { primary: 'emerald', secondary: 'teal' },
    admin: { primary: 'cyan', secondary: 'teal' },
  }
  const colors = roleColors[role] || roleColors.doctor

  return (
    <>
      {/* Left side - Medical themed floating elements */}
      <div className="fixed left-0 top-20 bottom-0 w-28 pointer-events-none overflow-hidden hidden xl:block">
        {/* Smaller DNA Helix */}
        <div className="absolute top-[8%] left-5 animate-float-slow">
          <svg className="w-10 h-24 opacity-50" viewBox="0 0 40 100">
            <path d="M10 0 Q30 12 10 25 Q-10 38 10 50 Q30 62 10 75 Q-10 88 10 100" 
                  fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
            <path d="M30 0 Q10 12 30 25 Q50 38 30 50 Q10 62 30 75 Q50 88 30 100" 
                  fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="12" x2="28" y2="12" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
            <line x1="12" y1="37" x2="28" y2="37" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
            <line x1="12" y1="62" x2="28" y2="62" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
            <line x1="12" y1="87" x2="28" y2="87" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
          </svg>
        </div>

        {/* Floating Medical Cross */}
        <div className="absolute top-[45%] left-6 animate-float-cross">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-emerald-500/10 rounded-xl blur-md" />
            <svg className="relative w-12 h-12 text-teal-500/60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H14V0H10V3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM18 14H14V18H10V14H6V10H10V6H14V10H18V14Z" opacity="0.3"/>
              <path d="M14 10V6H10V10H6V14H10V18H14V14H18V10H14Z"/>
            </svg>
          </div>
        </div>

        {/* Heartbeat/Pulse Line */}
        <svg className="absolute top-[62%] left-2 w-24 h-16 opacity-50" viewBox="0 0 100 40">
          <path 
            d="M0 20 L15 20 L20 20 L25 5 L30 35 L35 10 L40 25 L45 20 L100 20" 
            fill="none" 
            stroke="url(#pulseGrad)" 
            strokeWidth="2" 
            strokeLinecap="round"
            className="animate-pulse-line"
          />
          <defs>
            <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
              <stop offset="30%" stopColor="#14b8a6" stopOpacity="1" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Molecule/Cell */}
        <div className="absolute top-[78%] left-5 animate-molecule-spin">
          <svg className="w-14 h-14 opacity-40" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="8" fill="none" stroke="#14b8a6" strokeWidth="2" />
            <circle cx="25" cy="10" r="5" fill="#14b8a6" opacity="0.6" />
            <circle cx="40" cy="30" r="5" fill="#10b981" opacity="0.6" />
            <circle cx="10" cy="30" r="5" fill="#0d9488" opacity="0.6" />
            <line x1="25" y1="17" x2="25" y2="15" stroke="#14b8a6" strokeWidth="2" />
            <line x1="32" y1="28" x2="35" y2="29" stroke="#10b981" strokeWidth="2" />
            <line x1="18" y1="28" x2="15" y2="29" stroke="#0d9488" strokeWidth="2" />
          </svg>
        </div>

        {/* Stethoscope Icon floating */}
        <div className="absolute top-[28%] left-3 animate-steth-float">
          <svg className="w-10 h-10 text-teal-400/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3" strokeLinecap="round"/>
            <path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4" strokeLinecap="round"/>
            <circle cx="20" cy="10" r="2"/>
          </svg>
        </div>
      </div>

      {/* Right side 3D elements with real-life icons */}
      <div className="fixed right-0 top-20 bottom-0 w-24 pointer-events-none overflow-hidden hidden xl:block">
        {/* Healthcare icons */}
        <div className="absolute top-[8%] right-6 animate-float-cube-2">
          <div className={`w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md border border-${colors.primary}-200/50 shadow-xl flex items-center justify-center`}
               style={{ transform: 'perspective(500px) rotateX(10deg) rotateY(20deg)' }}>
            <svg className={`w-6 h-6 text-${colors.primary}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
        
        <div className="absolute top-[22%] right-3 animate-float-slow">
          <div className={`w-10 h-10 rounded-xl bg-white/70 backdrop-blur-md border border-${colors.secondary}-200/50 shadow-lg flex items-center justify-center`}
               style={{ transform: 'perspective(500px) rotateX(-15deg) rotateY(-15deg)' }}>
            <svg className={`w-5 h-5 text-${colors.secondary}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-[38%] right-8 animate-float-cube-1">
          <div className={`w-14 h-14 rounded-2xl bg-white/75 backdrop-blur-md border border-${colors.primary}-200/50 shadow-xl flex items-center justify-center`}
               style={{ transform: 'perspective(500px) rotateX(5deg) rotateY(-25deg)' }}>
            <svg className={`w-7 h-7 text-${colors.primary}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-[55%] right-4 animate-float-cube-3">
          <div className={`w-11 h-11 rounded-xl bg-white/80 backdrop-blur-md border border-${colors.secondary}-200/50 shadow-lg flex items-center justify-center`}
               style={{ transform: 'perspective(500px) rotateX(-10deg) rotateY(15deg)' }}>
            <svg className={`w-6 h-6 text-${colors.secondary}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-[70%] right-7 animate-float-slow">
          <div className={`w-9 h-9 rounded-lg bg-white/70 backdrop-blur-md border border-${colors.primary}-200/50 shadow-md flex items-center justify-center`}
               style={{ transform: 'perspective(500px) rotateX(20deg) rotateY(-10deg)' }}>
            <svg className={`w-5 h-5 text-${colors.primary}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>

        <div className="absolute top-[85%] right-3 animate-float-cube-2">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-${colors.primary}-400/30 to-${colors.secondary}-500/20 backdrop-blur-sm border border-white/30 shadow-lg`} />
        </div>

        {/* Connecting curves */}
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 100 600">
          <path d="M60 30 Q90 100 60 180 Q30 260 60 340 Q90 420 60 500 Q30 580 60 600" 
                fill="none" stroke={`url(#rightGrad-${role})`} strokeWidth="1" strokeDasharray="4 4" className="animate-dash-reverse" />
          <defs>
            <linearGradient id={`rightGrad-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom decorative wave */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden opacity-30">
        <svg className="absolute bottom-0 w-full h-32" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z" 
                fill={`url(#waveGrad-${role})`} className="animate-wave" />
          <defs>
            <linearGradient id={`waveGrad-${role}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  )
}

export default function Layout({ children, role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const roleConfig = {
    doctor: { 
      label: 'Doctor', 
      icon: '🩺',
      class: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30',
      headerBg: 'from-white/95 to-teal-50/95',
      accent: 'teal'
    },
    patient: { 
      label: 'Patient', 
      icon: '👤',
      class: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30',
      headerBg: 'from-white/95 to-emerald-50/95',
      accent: 'emerald'
    },
    admin: { 
      label: 'Admin', 
      icon: '⚙️',
      class: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30',
      headerBg: 'from-white/95 to-cyan-50/95',
      accent: 'cyan'
    },
  }
  const cfg = roleConfig[role] || roleConfig.doctor

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/40">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
           style={{ 
             backgroundImage: `radial-gradient(circle at 1px 1px, #14b8a6 1px, transparent 0)`,
             backgroundSize: '40px 40px'
           }} />
      
      {/* Gradient orbs in background */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-200/20 to-emerald-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/15 to-teal-300/10 rounded-full blur-3xl pointer-events-none" />

      <Floating3DElements role={role} />

      {/* Header */}
      <header className={`sticky top-0 z-50 bg-gradient-to-r ${cfg.headerBg} backdrop-blur-xl border-b border-teal-200/50 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {/* Logo with Microscope */}
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 shadow-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                       style={{ boxShadow: '0 4px 20px -4px rgba(20, 184, 166, 0.5)' }}>
                    <MicroscopeIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="font-display font-bold text-lg bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    Ambient AI
                  </h1>
                  <p className="text-[10px] text-teal-500/70 font-medium -mt-0.5">Healthcare Intelligence</p>
                </div>
              </div>
              
              {/* Role Badge */}
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cfg.class} flex items-center gap-1.5 transform hover:scale-105 transition-transform`}>
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </span>
            </div>

            {/* User section */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/60 backdrop-blur border border-teal-100">
                {/* Avatar using DiceBear API - generates unique avatar based on user name */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br from-${cfg.accent}-400 to-${cfg.accent}-600 rounded-full blur-sm opacity-40`} />
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.full_name || user?.email || 'User')}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                    alt={user?.full_name || 'User'}
                    className="relative w-9 h-9 rounded-full ring-2 ring-white shadow-md object-cover"
                  />
                  {/* Online status indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <span className="text-teal-800 text-sm font-semibold">{user?.full_name}</span>
              </div>
              <button 
                onClick={() => { logout(); navigate('/login') }} 
                className="px-4 py-2 rounded-xl text-sm font-semibold text-teal-600 hover:text-white bg-white/60 hover:bg-gradient-to-r hover:from-teal-500 hover:to-emerald-500 border border-teal-200 hover:border-transparent shadow-sm hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes float-cube-1 {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-20px) translateX(0); }
          75% { transform: translateY(-8px) translateX(-5px); }
        }
        @keyframes float-cube-2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
        @keyframes float-cube-3 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.05); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes dash-reverse {
          to { stroke-dashoffset: 20; }
        }
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
        }
        @keyframes dna-pulse {
          0%, 100% { opacity: 0.4; stroke-width: 3; }
          50% { opacity: 0.8; stroke-width: 4; }
        }
        @keyframes rung-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes float-cross {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(5deg); }
          50% { transform: translateY(-15px) rotate(0deg); }
          75% { transform: translateY(-8px) rotate(-5deg); }
        }
        @keyframes pulse-line {
          0% { stroke-dashoffset: 200; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: -200; opacity: 0; }
        }
        @keyframes molecule-spin {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        @keyframes steth-float {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-10px) translateX(3px) rotate(5deg); }
          66% { transform: translateY(-5px) translateX(-3px) rotate(-3deg); }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-cube-1 { animation: float-cube-1 8s ease-in-out infinite; }
        .animate-float-cube-2 { animation: float-cube-2 7s ease-in-out infinite; }
        .animate-float-cube-3 { animation: float-cube-3 9s ease-in-out infinite; }
        .animate-dash { animation: dash 3s linear infinite; }
        .animate-dash-reverse { animation: dash-reverse 3s linear infinite; }
        .animate-wave { animation: wave 8s ease-in-out infinite; }
        .animate-dna-pulse { animation: dna-pulse 3s ease-in-out infinite; }
        .animate-dna-pulse-delayed { animation: dna-pulse 3s ease-in-out infinite 1.5s; }
        .animate-rung-glow { animation: rung-glow 2s ease-in-out infinite; }
        .animate-float-cross { animation: float-cross 8s ease-in-out infinite; }
        .animate-pulse-line { 
          stroke-dasharray: 200; 
          animation: pulse-line 3s ease-in-out infinite; 
        }
        .animate-molecule-spin { animation: molecule-spin 12s ease-in-out infinite; }
        .animate-steth-float { animation: steth-float 7s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
