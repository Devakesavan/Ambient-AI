import { useState, useEffect } from 'react'
import { patientVisits } from '../api'
import { downloadReportPDF } from '../components/DownloadReportPDF'

// Translations for patient dashboard UI
const translations = {
  en: {
    visitHistory: 'Your Visit History',
    viewIn: 'View in:',
    loading: 'Loading your visits...',
    translating: 'Translating to English...',
    noVisits: 'No visits yet',
    noVisitsDesc: 'Your doctor will add consultation records here.',
    visit: 'Visit',
    transcript: 'Conversation Transcript',
    clinicalReport: 'Clinical Report',
    symptoms: 'Symptoms',
    diagnosis: 'Diagnosis',
    medications: 'Medications',
    followUp: 'Follow Up',
    takeHomeReport: 'Your Take-Home Report',
    downloadPdf: 'Download PDF',
    understandingScore: 'Understanding Score',
    understandingDesc: 'Your doctor assessed your understanding during the visit.',
    noReports: 'No reports available for this visit yet.',
    failedLoad: 'Failed to load visits'
  },
  ta: {
    visitHistory: 'உங்கள் வருகை வரலாறு',
    viewIn: 'இதில் காண்க:',
    loading: 'உங்கள் வருகைகளை ஏற்றுகிறது...',
    translating: 'தமிழில் மொழிபெயர்க்கிறது...',
    noVisits: 'இன்னும் வருகைகள் இல்லை',
    noVisitsDesc: 'உங்கள் மருத்துவர் இங்கு ஆலோசனை பதிவுகளை சேர்ப்பார்.',
    visit: 'வருகை',
    transcript: 'உரையாடல் படியெடுப்பு',
    clinicalReport: 'மருத்துவ அறிக்கை',
    symptoms: 'அறிகுறிகள்',
    diagnosis: 'நோய் கண்டறிதல்',
    medications: 'மருந்துகள்',
    followUp: 'பின்தொடர்தல்',
    takeHomeReport: 'உங்கள் வீட்டிற்கான அறிக்கை',
    downloadPdf: 'PDF பதிவிறக்கம்',
    understandingScore: 'புரிதல் மதிப்பெண்',
    understandingDesc: 'உங்கள் மருத்துவர் வருகையின் போது உங்கள் புரிதலை மதிப்பிட்டார்.',
    noReports: 'இந்த வருகைக்கான அறிக்கைகள் இன்னும் கிடைக்கவில்லை.',
    failedLoad: 'வருகைகளை ஏற்ற முடியவில்லை'
  },
  hi: {
    visitHistory: 'आपका दौरा इतिहास',
    viewIn: 'भाषा में देखें:',
    loading: 'आपके दौरे लोड हो रहे हैं...',
    translating: 'हिंदी में अनुवाद हो रहा है...',
    noVisits: 'अभी तक कोई दौरा नहीं',
    noVisitsDesc: 'आपके डॉक्टर यहां परामर्श रिकॉर्ड जोड़ेंगे।',
    visit: 'दौरा',
    transcript: 'बातचीत का प्रतिलेख',
    clinicalReport: 'क्लीनिकल रिपोर्ट',
    symptoms: 'लक्षण',
    diagnosis: 'निदान',
    medications: 'दवाइयाँ',
    followUp: 'फॉलो अप',
    takeHomeReport: 'आपकी घर ले जाने वाली रिपोर्ट',
    downloadPdf: 'PDF डाउनलोड करें',
    understandingScore: 'समझ का स्कोर',
    understandingDesc: 'आपके डॉक्टर ने दौरे के दौरान आपकी समझ का मूल्यांकन किया।',
    noReports: 'इस दौरे के लिए अभी कोई रिपोर्ट उपलब्ध नहीं है।',
    failedLoad: 'दौरे लोड करने में विफल'
  }
}

// Map for clinical report keys to translation keys
const clinicalKeyMap = {
  symptoms: 'symptoms',
  diagnosis: 'diagnosis',
  medications: 'medications',
  follow_up: 'followUp'
}

export default function PatientDashboard() {
  const [visits, setVisits] = useState([])
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en')

  // Get translations for current language
  const t = translations[language] || translations.en

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
      .catch(() => setError(t.failedLoad))
      .finally(() => setLoading(false))
  }, [language])

  if (loading && visits.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">{t.loading}</p>
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

  return (
    <div className="space-y-8 animate-fade-in relative">
      {loading && visits.length > 0 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-soft border border-slate-200">
            <div className="w-12 h-12 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-slate-600 font-medium">{t.translating}</p>
          </div>
        </div>
      )}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="font-display font-semibold text-xl text-slate-800">{t.visitHistory}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{t.viewIn}</span>
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
            <p className="text-slate-600 font-medium">{t.noVisits}</p>
            <p className="text-slate-500 text-sm mt-1">{t.noVisitsDesc}</p>
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
                    <span className="font-semibold">{t.visit} #{v.id}</span>
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
                      <h3 className="font-semibold text-slate-800 mb-2">{t.transcript}</h3>
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin rounded-lg p-4 bg-white">{displayVisit.transcript.content}</pre>
                    </div>
                  )}
                  {displayVisit.clinical_report && (
                    <div className="p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                      <h3 className="font-semibold text-primary-900 mb-3">{t.clinicalReport}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['symptoms', 'diagnosis', 'medications', 'follow_up'].map((k) => (
                          <div key={k} className="p-3 rounded-lg bg-white/80 border border-primary-100/50">
                            <span className="text-xs font-medium text-primary-600 uppercase">{t[clinicalKeyMap[k]]}</span>
                            <p className="text-slate-800 mt-0.5">{displayVisit.clinical_report[k]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {displayVisit.patient_report && (
                    <div className="p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                        <h3 className="font-semibold text-primary-900">{t.takeHomeReport}</h3>
                        <button onClick={() => downloadReportPDF(displayVisit.patient_report.content, `Take-Home-Report-Visit-${displayVisit.id}.pdf`)} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
                          {t.downloadPdf}
                        </button>
                      </div>
                      <pre className="text-sm text-slate-800 whitespace-pre-wrap scrollbar-thin rounded-lg p-4 bg-white/80">{displayVisit.patient_report.content}</pre>
                    </div>
                  )}
                  {displayVisit.teach_back_items?.some((tb) => tb.understanding_score != null) && (
                    <div className="p-5 rounded-xl bg-accent-50/80 border border-accent-100">
                      <h3 className="font-semibold text-accent-900 mb-1">{t.understandingScore}</h3>
                      <p className="text-sm text-accent-800 mb-3">{t.understandingDesc}</p>
                      <div className="flex flex-wrap gap-4">
                        {displayVisit.teach_back_items.filter((tb) => tb.understanding_score != null).map((tb, i) => (
                          <span key={tb.id} className="px-3 py-1.5 rounded-lg bg-white border border-accent-200 text-sm font-medium">Q{i + 1}: {tb.understanding_score}/100</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!displayVisit.transcript && !displayVisit.clinical_report && !displayVisit.patient_report && (
                    <div className="p-12 text-center text-slate-500">{t.noReports}</div>
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
