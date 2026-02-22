import { useState, useEffect } from 'react'
import { patientVisits } from '../api'
import { downloadReportPDF } from '../components/DownloadReportPDF'

export default function PatientDashboard() {
  const [visits, setVisits] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    setLoading(true)
    patientVisits(language)
      .then((data) => {
        setVisits(data)
        setSelectedVisit((prev) => {
          if (!prev) return null
          const matching = data.find((v) => v.id === prev.id)
          return matching || data[0] || null
        })
      })
      .catch(() => setError('Failed to load visits'))
      .finally(() => setLoading(false))
  }, [language])

  if (loading && visits.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading your visits...</p>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-3">
        <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    )
  }

  const displayVisit = selectedVisit || visits[0]
  const translatingLabel = language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : 'English'

  return (
    <div className="space-y-8 animate-fade-in relative">
      {loading && visits.length > 0 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-soft border border-slate-200">
            <div className="w-12 h-12 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-slate-600 font-medium">Translating to {translatingLabel}...</p>
          </div>
        </div>
      )}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="font-display font-semibold text-xl text-slate-800">Your Visit History</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">View in:</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20">
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>
        {visits.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-600 font-medium">No visits yet</p>
            <p className="text-slate-500 text-sm mt-1">Your doctor will add consultation records here.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-72 shrink-0 p-4 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30">
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
                {visits.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVisit(v)}
                    className={`shrink-0 lg:shrink w-full text-left px-4 py-3 rounded-xl border transition-all ${displayVisit?.id === v.id ? 'border-primary-400 bg-primary-50 text-primary-800 shadow-soft' : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/50'}`}
                  >
                    <span className="font-semibold">Visit #{v.id}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{new Date(v.created_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 p-6 space-y-6 min-w-0">
              {displayVisit && (
                <>
                  {displayVisit.transcript && (
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                      <h3 className="font-semibold text-slate-800 mb-2">Conversation Transcript</h3>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin rounded-lg p-4 bg-white">{displayVisit.transcript.content}</pre>
                    </div>
                  )}
                  {displayVisit.clinical_report && (
                    <div className="p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                      <h3 className="font-semibold text-primary-900 mb-3">Clinical Report</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['symptoms', 'diagnosis', 'medications', 'follow_up'].map((k) => (
                          <div key={k} className="p-3 rounded-lg bg-white/80 border border-primary-100/50">
                            <span className="text-xs font-medium text-primary-600 uppercase">{k.replace('_', ' ')}</span>
                            <p className="text-slate-800 mt-0.5">{displayVisit.clinical_report[k]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {displayVisit.patient_report && (
                    <div className="p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                        <h3 className="font-semibold text-primary-900">Your Take-Home Report</h3>
                        <button onClick={() => downloadReportPDF(displayVisit.patient_report.content, `Take-Home-Report-Visit-${displayVisit.id}.pdf`)} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
                          Download PDF
                        </button>
                      </div>
                      <pre className="text-sm text-slate-800 whitespace-pre-wrap scrollbar-thin rounded-lg p-4 bg-white/80">{displayVisit.patient_report.content}</pre>
                    </div>
                  )}
                  {displayVisit.teach_back_items?.some((tb) => tb.understanding_score != null) && (
                    <div className="p-5 rounded-xl bg-accent-50/80 border border-accent-100">
                      <h3 className="font-semibold text-accent-900 mb-1">Understanding Score</h3>
                      <p className="text-sm text-accent-800 mb-3">Your doctor assessed your understanding during the visit.</p>
                      <div className="flex flex-wrap gap-4">
                        {displayVisit.teach_back_items.filter((tb) => tb.understanding_score != null).map((tb, i) => (
                          <span key={tb.id} className="px-3 py-1.5 rounded-lg bg-white border border-accent-200 text-sm font-medium">Q{i + 1}: {tb.understanding_score}/100</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!displayVisit.transcript && !displayVisit.clinical_report && !displayVisit.patient_report && (
                    <div className="p-12 text-center text-slate-500">No reports available for this visit yet.</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
