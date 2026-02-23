import { useState, useEffect } from 'react'
import { patientVisits, getImageUrl, getSignatureUrl } from '../api'
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
    failedLoad: 'Failed to load visits',
    medicalImages: 'Medical Images',
    medicalImagesDesc: 'X-rays, scans, and other medical images from your visit.',
    noImages: 'No images available for this visit.'
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
    failedLoad: 'வருகைகளை ஏற்ற முடியவில்லை',
    medicalImages: 'மருத்துவ படங்கள்',
    medicalImagesDesc: 'உங்கள் வருகையின் எக்ஸ்-ரே, ஸ்கேன் மற்றும் பிற மருத்துவ படங்கள்.',
    noImages: 'இந்த வருகைக்கு படங்கள் இல்லை.'
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
    failedLoad: 'दौरे लोड करने में विफल',
    medicalImages: 'मेडिकल इमेज',
    medicalImagesDesc: 'आपके दौरे की एक्स-रे, स्कैन और अन्य मेडिकल इमेज।',
    noImages: 'इस दौरे के लिए कोई इमेज उपलब्ध नहीं है।'
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
                    <div className="rounded-2xl border border-primary-200 bg-white shadow-sm overflow-hidden">
                      {/* Report Header */}
                      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-white font-bold text-lg">{t.takeHomeReport}</h3>
                            <p className="text-primary-100 text-sm mt-0.5">{t.visit} #{displayVisit.id} — {new Date(displayVisit.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <button onClick={() => downloadReportPDF(displayVisit, getSignatureUrl, language)} className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 backdrop-blur-sm flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {t.downloadPdf}
                          </button>
                        </div>
                      </div>

                      {/* Patient & Doctor Info */}
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</span>
                            <p className="text-slate-800 font-medium">{displayVisit.patient_name || `Patient #${displayVisit.patient_id}`}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doctor</span>
                            <p className="text-slate-800 font-medium">{(displayVisit.doctor_name || 'N/A').startsWith('Dr') ? displayVisit.doctor_name : `Dr. ${displayVisit.doctor_name || 'N/A'}`}</p>
                          </div>
                        </div>
                      </div>

                      {/* Report Body */}
                      <div className="px-6 py-5 space-y-5">
                        {displayVisit.patient_report.diagnosis_summary && (
                          <div>
                            <h4 className="text-sm font-bold text-primary-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              {t.diagnosis}
                            </h4>
                            <p className="text-slate-700 leading-relaxed pl-6">{displayVisit.patient_report.diagnosis_summary}</p>
                          </div>
                        )}

                        {displayVisit.patient_report.medication_instructions && (
                          <div>
                            <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                              {t.medications}
                            </h4>
                            <div className="pl-6 text-slate-700 leading-relaxed whitespace-pre-wrap">{displayVisit.patient_report.medication_instructions}</div>
                          </div>
                        )}

                        {displayVisit.patient_report.warning_signs && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Warning Signs
                            </h4>
                            <div className="pl-6 text-red-800 leading-relaxed whitespace-pre-wrap">{displayVisit.patient_report.warning_signs}</div>
                          </div>
                        )}

                        {displayVisit.patient_report.content && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" /></svg>
                              Detailed Instructions
                            </h4>
                            <div className="pl-6 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{displayVisit.patient_report.content}</div>
                          </div>
                        )}
                      </div>

                      {/* Signature & Footer */}
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <div className="flex justify-between items-end">
                          <div className="text-xs text-slate-400">
                            <p>Report generated on {new Date(displayVisit.patient_report.created_at).toLocaleString('en-IN')}</p>
                            <p>Ambient AI Healthcare System</p>
                          </div>
                          <div className="text-right">
                            {displayVisit.doctor_signature_filename && (
                              <div className="flex flex-col items-end">
                                <img 
                                  src={getSignatureUrl(displayVisit.doctor_signature_filename)} 
                                  alt="Doctor's Signature" 
                                  className="h-16 max-w-[200px] object-contain mb-1"
                                />
                                <div className="border-t border-slate-300 pt-1 min-w-[160px] text-center">
                                  <p className="text-sm font-semibold text-slate-700">{(displayVisit.doctor_name || 'N/A').startsWith('Dr') ? displayVisit.doctor_name : `Dr. ${displayVisit.doctor_name || 'N/A'}`}</p>
                                  <p className="text-xs text-slate-500">Consulting Physician</p>
                                </div>
                              </div>
                            )}
                            {!displayVisit.doctor_signature_filename && (
                              <div className="border-t border-slate-300 pt-1 min-w-[160px] text-center">
                                <p className="text-sm font-semibold text-slate-700">{(displayVisit.doctor_name || 'N/A').startsWith('Dr') ? displayVisit.doctor_name : `Dr. ${displayVisit.doctor_name || 'N/A'}`}</p>
                                <p className="text-xs text-slate-500">Consulting Physician</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {displayVisit.teach_back_items?.some((tb) => tb.understanding_score != null) && (
                    <div className="p-5 rounded-xl bg-accent-50/80 border border-accent-100">
                      <h3 className="font-semibold text-accent-900 mb-1">{t.understandingScore}</h3>
                      <p className="text-sm text-accent-800 mb-3">{t.understandingDesc}</p>
                      {displayVisit.overall_understanding_score != null && (
                        <div className="mb-3 p-3 rounded-lg bg-white border-2 border-accent-200">
                          <span className="font-semibold text-accent-900">{t.understandingScore}: </span>
                          <span className={`font-bold text-lg ${displayVisit.overall_understanding_score >= 80 ? 'text-green-600' : displayVisit.overall_understanding_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {displayVisit.overall_understanding_score}/100
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4">
                        {displayVisit.teach_back_items.filter((tb) => tb.understanding_score != null).map((tb, i) => (
                          <span key={tb.id} className="px-3 py-1.5 rounded-lg bg-white border border-accent-200 text-sm font-medium">Q{i + 1}: {tb.understanding_score}/100</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Medical Images Section */}
                  {displayVisit.medical_images?.length > 0 && (
                    <div className="p-5 rounded-xl bg-blue-50/80 border border-blue-100">
                      <h3 className="font-semibold text-blue-900 mb-2">{t.medicalImages}</h3>
                      <p className="text-sm text-blue-700 mb-4">{t.medicalImagesDesc}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {displayVisit.medical_images.map((img) => (
                          <div key={img.id} className="group">
                            <a 
                              href={getImageUrl(img.filename)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block aspect-square rounded-lg overflow-hidden bg-white border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <img 
                                src={getImageUrl(img.filename)} 
                                alt={img.description || img.image_type || 'Medical image'}
                                className="w-full h-full object-cover"
                              />
                            </a>
                            <div className="mt-1">
                              <span className="text-xs font-medium text-blue-600 uppercase">{img.image_type || 'Image'}</span>
                              {img.description && <p className="text-xs text-slate-600 truncate">{img.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!displayVisit.transcript && !displayVisit.clinical_report && !displayVisit.patient_report && !displayVisit.medical_images?.length && (
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
