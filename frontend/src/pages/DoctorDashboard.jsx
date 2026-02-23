import { useState, useEffect } from 'react'
import { listPatients, createConsultation, getConsultation, uploadAudio, mockTranscribe, uploadTeachBackAnswerAllAudio, generatePatientReport, completeConsultation, listConsultations } from '../api'
import AudioRecorder from '../components/AudioRecorder'
import { downloadReportPDF } from '../components/DownloadReportPDF'

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [consultations, setConsultations] = useState([])
  const [currentConsultation, setCurrentConsultation] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recordingTeachBack, setRecordingTeachBack] = useState(false)
  const [showPatientSelector, setShowPatientSelector] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientSortBy, setPatientSortBy] = useState('name')
  const [viewLanguage, setViewLanguage] = useState('en')
  const [languageLoading, setLanguageLoading] = useState(false)

  const loadPatients = async () => { try { setPatients(await listPatients()) } catch (e) { setError('Failed to load patients') } }
  const loadConsultations = async () => { try { setConsultations(await listConsultations(null, viewLanguage)) } catch (e) { setError('Failed to load consultations') } }

  useEffect(() => { loadPatients() }, [])
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLanguageLoading(true)
      setError('')
      try {
        await loadConsultations()
        if (currentConsultation && !cancelled) {
          const updated = await getConsultation(currentConsultation.id, viewLanguage)
          if (!cancelled) setCurrentConsultation(updated)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLanguageLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [viewLanguage])

  const startConsultation = async (patientId = null) => {
    const pid = patientId ?? selectedPatientId
    if (!pid) { setShowPatientSelector(true); return }
    setError('')
    setLoading(true)
    try {
      const c = await createConsultation(pid)
      setCurrentConsultation(await getConsultation(c.id, viewLanguage))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleRecordingComplete = async (blob) => {
    if (!currentConsultation) return
    setLoading(true)
    setError('')
    try {
      await uploadAudio(currentConsultation.id, blob)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleTeachBackRecordingComplete = async (blob) => {
    setLoading(true)
    setError('')
    setRecordingTeachBack(false)
    try {
      await uploadTeachBackAnswerAllAudio(currentConsultation.id, blob)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) {
      setError(e.message || 'Teach-back processing failed. Try recording again or upload an audio file.')
    } finally { setLoading(false) }
  }

  const handleTeachBackFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentConsultation) return
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
      setError('Please upload a valid audio file (WAV, MP3, WebM, OGG, or M4A)')
      return
    }
    setLoading(true)
    setError('')
    try {
      await uploadTeachBackAnswerAllAudio(currentConsultation.id, file)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) {
      setError(e.message || 'Failed to process teach-back audio.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleGenerateReport = async () => {
    setLoading(true)
    setError('')
    try {
      await generatePatientReport(currentConsultation.id)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentConsultation) return
    
    // Validate file type
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
      setError('Please upload a valid audio file (WAV, MP3, WebM, OGG, or M4A)')
      return
    }

    setLoading(true)
    setError('')
    try {
      await uploadAudio(currentConsultation.id, file)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) { 
      setError(e.message) 
    } finally { 
      setLoading(false)
      // Reset the file input
      e.target.value = ''
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')
    try {
      await completeConsultation(currentConsultation.id)
      setCurrentConsultation(null)
      setSelectedPatientId(null)
      loadConsultations()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const langName = viewLanguage === 'ta' ? 'Tamil' : viewLanguage === 'hi' ? 'Hindi' : 'English'

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="font-display font-semibold text-xl text-slate-800">Consultation</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">View in:</span>
              <select value={viewLanguage} onChange={(e) => setViewLanguage(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-500/20">
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-6">
          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
          {!currentConsultation ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Search by name or ID..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 w-52 focus:ring-2 focus:ring-primary-500/20" />
                <select value={patientSortBy} onChange={(e) => setPatientSortBy(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200">
                  <option value="name">Sort by Name</option>
                  <option value="id">Sort by Patient ID</option>
                </select>
                <select value={selectedPatientId || ''} onChange={(e) => setSelectedPatientId(parseInt(e.target.value) || null)} className="px-4 py-2.5 rounded-xl border border-slate-200 min-w-[220px]">
                  <option value="">Select patient</option>
                  {[...patients].filter((p) => !patientSearch.trim() || (p.full_name?.toLowerCase().includes(patientSearch.toLowerCase()) || String(p.id).includes(patientSearch) || p.email?.toLowerCase().includes(patientSearch.toLowerCase())))
                    .sort((a, b) => patientSortBy === 'name' ? (a.full_name || '').localeCompare(b.full_name || '') : a.id - b.id)
                    .map((p) => <option key={p.id} value={p.id}>{p.full_name} (ID: {p.id}) — {p.email}</option>)}
                </select>
                <button onClick={() => startConsultation()} disabled={loading || !selectedPatientId} className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {loading ? 'Starting...' : 'Start Consultation'}
                </button>
              </div>
              {showPatientSelector && !selectedPatientId && <p className="text-accent-600 text-sm">Please select a patient first.</p>}
            </div>
          ) : (
            <div className="relative">
              {languageLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/90 backdrop-blur-sm min-h-[200px]">
                  <div className="w-12 h-12 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  <p className="mt-4 text-slate-600 font-medium">Translating to {langName}...</p>
                </div>
              )}
              <div className={`space-y-6 transition-opacity duration-200 ${languageLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                <p className="text-slate-600 text-sm">Consultation #{currentConsultation.id} — Patient ID: {currentConsultation.patient_id}</p>
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-1">Ambient AI Recording</h3>
                  <p className="text-sm text-slate-500 mb-4">Record the doctor-patient conversation, upload an audio file, or use sample data for demo.</p>
                  <div className="flex gap-4 items-center flex-wrap">
                    <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={loading} />
                    
                    {/* Upload Audio Button */}
                    <label className={`relative px-4 py-2.5 rounded-xl border-2 border-teal-300 bg-teal-50 text-teal-800 text-sm font-medium hover:bg-teal-100 cursor-pointer transition-all flex items-center gap-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Audio
                      <input 
                        type="file" 
                        accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a"
                        onChange={handleAudioUpload}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>

                    <button onClick={async () => { setLoading(true); setError(''); try { await mockTranscribe(currentConsultation.id); setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage)); } catch (e) { setError(e.message); } finally { setLoading(false); } }} disabled={loading} className="px-4 py-2.5 rounded-xl border-2 border-accent-300 bg-accent-50 text-accent-800 text-sm font-medium hover:bg-accent-100">
                      Use Sample Data (Demo)
                    </button>
                  </div>
                </div>
                {currentConsultation.transcript && (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-100">
                    <h3 className="font-semibold text-slate-800 mb-3">Full Transcript</h3>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap max-h-52 overflow-y-auto scrollbar-thin rounded-lg p-4 bg-white border border-slate-100">{currentConsultation.transcript.content}</pre>
                  </div>
                )}
                {currentConsultation.clinical_report && (
                  <div className="p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                    <h3 className="font-semibold text-primary-900 mb-3">Clinical Report</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['symptoms', 'diagnosis', 'medications', 'follow_up'].map((k) => (
                        <div key={k} className="p-3 rounded-lg bg-white/80 border border-primary-100/50">
                          <span className="text-xs font-medium text-primary-600 uppercase">{k.replace('_', ' ')}</span>
                          <p className="text-slate-800 mt-0.5">{currentConsultation.clinical_report[k]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentConsultation.teach_back_items?.length > 0 && (
                  <div className="p-5 rounded-xl bg-accent-50/80 border border-accent-100">
                    <h3 className="font-semibold text-accent-900 mb-2">Teach-Back Questions</h3>
                    <p className="text-sm text-accent-800 mb-4">Click Record before asking. Ask all questions verbally, then stop.</p>
                    {recordingTeachBack ? (
                      <div className="flex flex-col gap-3 p-5 bg-white rounded-xl border border-accent-200">
                        <span className="text-sm text-slate-600">Recording — ask all questions, then stop.</span>
                        <AudioRecorder onRecordingComplete={handleTeachBackRecordingComplete} disabled={loading} />
                        <button onClick={() => setRecordingTeachBack(false)} className="text-sm text-slate-500 hover:text-slate-700 w-fit">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 items-center mb-4">
                        <button onClick={() => setRecordingTeachBack(true)} disabled={loading} className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                          Start Recording (Ask Questions After)
                        </button>
                        <label className={`relative px-4 py-2.5 rounded-xl border-2 border-teal-300 bg-teal-50 text-teal-800 text-sm font-medium hover:bg-teal-100 cursor-pointer transition-all flex items-center gap-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload teach-back audio
                          <input type="file" accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a" onChange={handleTeachBackFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </label>
                      </div>
                    )}
                    {(() => {
                      const scores = currentConsultation.teach_back_items.filter((tb) => tb.understanding_score != null).map((tb) => tb.understanding_score)
                      const overallScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
                      return (
                        <>
                          {overallScore != null && (
                            <div className="mb-4 p-4 rounded-xl bg-white border-2 border-accent-200">
                              <span className="font-semibold text-accent-900">Overall Understanding Score: </span>
                              <span className={`font-bold text-xl ${overallScore >= 80 ? 'text-green-600' : 'text-accent-600'}`}>{overallScore}/100</span>
                            </div>
                          )}
                          <div className="space-y-3">
                            {currentConsultation.teach_back_items.map((tb) => (
                              <div key={tb.id} className="p-4 rounded-xl bg-white border border-accent-100">
                                <p className="font-medium text-slate-800">{tb.question}</p>
                                {tb.patient_answer != null && tb.patient_answer !== '' && (
                                  <p className="mt-2 text-slate-600 text-sm">
                                    <span className="font-medium text-slate-700">Patient: </span>
                                    {tb.patient_answer}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
                {currentConsultation.clinical_report && (
                  <div className="flex gap-4">
                    {!currentConsultation.patient_report ? (
                      <button onClick={handleGenerateReport} disabled={loading} className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                        Generate Patient Report
                      </button>
                    ) : (
                      <div className="flex-1 p-5 rounded-xl bg-primary-50/80 border border-primary-100">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-primary-900">Patient Take-Home Report</h3>
                          <button onClick={() => downloadReportPDF(currentConsultation.patient_report.content, `Patient-Report-Visit-${currentConsultation.id}.pdf`)} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
                            Download PDF
                          </button>
                        </div>
                        <pre className="text-sm text-slate-800 whitespace-pre-wrap scrollbar-thin max-h-48 overflow-y-auto rounded-lg p-4 bg-white/80">{currentConsultation.patient_report.content}</pre>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={handleComplete} disabled={loading} className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 disabled:opacity-50">
                    Complete Consultation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-display font-semibold text-xl text-slate-800">Recent Consultations</h2>
        </div>
        <div className="p-6">
          {consultations.length === 0 ? <p className="text-slate-500">No consultations yet.</p> : (
            <ul className="space-y-2">
              {consultations.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80">
                  <span>#{c.id} — Patient {c.patient_id} — <span className="font-medium">{c.status}</span></span>
                  <button onClick={async () => setCurrentConsultation(await getConsultation(c.id, viewLanguage))} className="text-primary-600 text-sm font-semibold hover:underline">Open</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
