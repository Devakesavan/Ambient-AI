import { useState, useEffect } from 'react'
import { listPatients, createConsultation, getConsultation, uploadAudio, mockTranscribe, uploadTeachBackAnswerAllAudio, generatePatientReport, completeConsultation, listConsultations, uploadMedicalImage, deleteMedicalImage, getImageUrl, uploadSignature, getSignatureUrl } from '../api'
import AudioRecorder from '../components/AudioRecorder'
import { downloadReportPDF } from '../components/DownloadReportPDF'
import ECG3DLoader from '../components/ECG3DLoader'

const IMAGE_TYPES = [
  { value: 'xray', label: 'X-Ray' },
  { value: 'scan', label: 'CT/MRI Scan' },
  { value: 'injury', label: 'Injury Photo' },
  { value: 'burn', label: 'Burn' },
  { value: 'skin', label: 'Skin Condition' },
  { value: 'wound', label: 'Wound' },
  { value: 'other', label: 'Other' },
]

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [consultations, setConsultations] = useState([])
  const [currentConsultation, setCurrentConsultation] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [teachbackLoading, setTeachbackLoading] = useState(false)
  const [loading, setLoading] = useState(false) // for general UI, e.g. start consultation, etc.
  const [error, setError] = useState('')
  const [recordingTeachBack, setRecordingTeachBack] = useState(false)
  const [showPatientSelector, setShowPatientSelector] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientSortBy, setPatientSortBy] = useState('name')
  const [viewLanguage, setViewLanguage] = useState('en')
  const [languageLoading, setLanguageLoading] = useState(false)
  const [imageUploadType, setImageUploadType] = useState('xray')
  const [imageDescription, setImageDescription] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)

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
    setAudioLoading(true)
    setError('')
    try {
      await uploadAudio(currentConsultation.id, blob)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) { setError(e.message) }
    finally { setAudioLoading(false) }
  }

  const handleTeachBackRecordingComplete = async (blob) => {
    setTeachbackLoading(true)
    setError('')
    setRecordingTeachBack(false)
    try {
      await uploadTeachBackAnswerAllAudio(currentConsultation.id, blob)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) {
      setError(e.message || 'Teach-back processing failed. Try recording again or upload an audio file.')
    } finally { setTeachbackLoading(false) }
  }

  const handleTeachBackFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentConsultation) return
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
      setError('Please upload a valid audio file (WAV, MP3, WebM, OGG, or M4A)')
      return
    }
    setTeachbackLoading(true)
    setError('')
    try {
      await uploadTeachBackAnswerAllAudio(currentConsultation.id, file)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) {
      setError(e.message || 'Failed to process teach-back audio.')
    } finally {
      setTeachbackLoading(false)
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
    setAudioLoading(true)
    setError('')
    try {
      await uploadAudio(currentConsultation.id, file)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) { 
      setError(e.message) 
    } finally { 
      setAudioLoading(false)
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentConsultation) return
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, WebP, or BMP)')
      return
    }
    
    setUploadingImage(true)
    setError('')
    try {
      await uploadMedicalImage(currentConsultation.id, file, imageUploadType, imageDescription)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
      setImageDescription('')
    } catch (e) {
      setError(e.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Delete this image?')) return
    setLoading(true)
    try {
      await deleteMedicalImage(imageId)
      setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
    } catch (e) {
      setError(e.message || 'Failed to delete image')
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSignature(true)
    setError('')
    try {
      await uploadSignature(file)
      if (currentConsultation) {
        setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage))
      }
    } catch (e) {
      setError(e.message || 'Failed to upload signature')
    } finally {
      setUploadingSignature(false)
      e.target.value = ''
    }
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
                  <div className="flex gap-4 items-center flex-wrap min-h-[100px]">
                    {audioLoading ? (
                      <div className="w-full flex justify-center items-center">
                        <ECG3DLoader text="Processing audio..." />
                      </div>
                    ) : (
                      <>
                        <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={audioLoading || teachbackLoading || loading} />
                        {/* Upload Audio Button */}
                        <label className={`relative px-4 py-2.5 rounded-xl border-2 border-teal-300 bg-teal-50 text-teal-800 text-sm font-medium hover:bg-teal-100 cursor-pointer transition-all flex items-center gap-2 ${(audioLoading || teachbackLoading || loading) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Audio
                          <input 
                            type="file" 
                            accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a"
                            onChange={handleAudioUpload}
                            disabled={audioLoading || teachbackLoading || loading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </label>
                        <button onClick={async () => { setAudioLoading(true); setError(''); try { await mockTranscribe(currentConsultation.id); setCurrentConsultation(await getConsultation(currentConsultation.id, viewLanguage)); } catch (e) { setError(e.message); } finally { setAudioLoading(false); } }} disabled={audioLoading || teachbackLoading || loading} className="px-4 py-2.5 rounded-xl border-2 border-accent-300 bg-accent-50 text-accent-800 text-sm font-medium hover:bg-accent-100">
                          Use Sample Data (Demo)
                        </button>
                      </>
                    )}
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
                
                {/* Medical Images Section */}
                <div className="p-5 rounded-xl bg-blue-50/80 border border-blue-100">
                  <h3 className="font-semibold text-blue-900 mb-3">Medical Images</h3>
                  <p className="text-sm text-blue-700 mb-4">Upload X-rays, injury photos, or other medical images for this consultation.</p>
                  
                  {/* Upload Form */}
                  <div className="flex flex-wrap gap-3 items-end mb-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-blue-700">Image Type</label>
                      <select 
                        value={imageUploadType} 
                        onChange={(e) => setImageUploadType(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm"
                      >
                        {IMAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                      <label className="text-xs font-medium text-blue-700">Description (optional)</label>
                      <input 
                        type="text" 
                        value={imageDescription}
                        onChange={(e) => setImageDescription(e.target.value)}
                        placeholder="e.g., Left arm X-ray, Front view"
                        className="px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm"
                      />
                    </div>
                    <label className={`relative px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer transition-all flex items-center gap-2 ${uploadingImage || loading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      <input 
                        type="file" 
                        accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                        onChange={handleImageUpload}
                        disabled={uploadingImage || loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  {/* Uploaded Images Grid */}
                  {currentConsultation.medical_images?.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                      {currentConsultation.medical_images.map((img) => (
                        <div key={img.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-white border border-blue-200 shadow-sm">
                            <img 
                              src={getImageUrl(img.filename)} 
                              alt={img.description || img.image_type || 'Medical image'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="mt-1">
                            <span className="text-xs font-medium text-blue-600 uppercase">{img.image_type || 'Image'}</span>
                            {img.description && <p className="text-xs text-slate-600 truncate">{img.description}</p>}
                          </div>
                          <button 
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Delete image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(!currentConsultation.medical_images || currentConsultation.medical_images.length === 0) && (
                    <p className="text-sm text-blue-600 italic">No images uploaded yet.</p>
                  )}
                </div>
                
                {currentConsultation.teach_back_items?.length > 0 && (
                  <div className="p-5 rounded-xl bg-accent-50/80 border border-accent-100">
                    <h3 className="font-semibold text-accent-900 mb-2">Teach-Back Questions</h3>
                    <p className="text-sm text-accent-800 mb-4">Click Record before asking. Ask all questions verbally, then stop.</p>
                    {teachbackLoading ? (
                      <div className="w-full flex justify-center items-center min-h-[100px]">
                        <ECG3DLoader text="Processing teach-back..." />
                      </div>
                    ) : recordingTeachBack ? (
                      <div className="flex flex-col gap-3 p-5 bg-white rounded-xl border border-accent-200">
                        <span className="text-sm text-slate-600">Recording — ask all questions, then stop.</span>
                        <AudioRecorder onRecordingComplete={handleTeachBackRecordingComplete} disabled={audioLoading || teachbackLoading || loading} />
                        <button onClick={() => setRecordingTeachBack(false)} className="text-sm text-slate-500 hover:text-slate-700 w-fit">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 items-center mb-4">
                        <button onClick={() => setRecordingTeachBack(true)} disabled={audioLoading || teachbackLoading || loading} className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50">
                          Start Recording (Ask Questions After)
                        </button>
                        <label className={`relative px-4 py-2.5 rounded-xl border-2 border-teal-300 bg-teal-50 text-teal-800 text-sm font-medium hover:bg-teal-100 cursor-pointer transition-all flex items-center gap-2 ${(audioLoading || teachbackLoading || loading) ? 'opacity-50 pointer-events-none' : ''}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload teach-back audio
                          <input type="file" accept="audio/*,.wav,.mp3,.webm,.ogg,.m4a" onChange={handleTeachBackFileUpload} disabled={audioLoading || teachbackLoading || loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </label>
                      </div>
                    )}
                    {(() => {
                      const overallScore = currentConsultation.overall_understanding_score
                      return (
                        <>
                          {overallScore != null && (
                            <div className="mb-4 p-4 rounded-xl bg-white border-2 border-accent-200">
                              <span className="font-semibold text-accent-900">Overall Understanding Score: </span>
                              <span className={`font-bold text-xl ${overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{overallScore}/100</span>
                            </div>
                          )}
                          <div className="space-y-3">
                            {currentConsultation.teach_back_items.map((tb, idx) => (
                              <div key={tb.id} className="p-4 rounded-xl bg-white border border-accent-100">
                                <div className="flex justify-between items-start gap-3">
                                  <p className="font-medium text-slate-800 flex-1">Q{idx + 1}: {tb.question}</p>
                                  {tb.understanding_score != null && (
                                    <span className={`shrink-0 px-3 py-1 rounded-lg text-sm font-bold ${tb.understanding_score >= 80 ? 'bg-green-100 text-green-700' : tb.understanding_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                      {tb.understanding_score}/100
                                    </span>
                                  )}
                                </div>
                                {tb.patient_answer != null && tb.patient_answer !== '' && (
                                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <p className="text-slate-700 text-sm">
                                      {tb.patient_answer}
                                    </p>
                                  </div>
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
                      <div className="flex-1">
                        {/* Structured Patient Report Card */}
                        <div className="rounded-2xl border border-primary-200 bg-white shadow-sm overflow-hidden">
                          {/* Report Header */}
                          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-white font-bold text-lg">Patient Take-Home Report</h3>
                                <p className="text-primary-100 text-sm mt-0.5">Consultation #{currentConsultation.id} — {new Date(currentConsultation.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              </div>
                              <button onClick={() => downloadReportPDF(currentConsultation, getSignatureUrl, 'en')} className="px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 backdrop-blur-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Download PDF
                              </button>
                            </div>
                          </div>
                          
                          {/* Patient & Doctor Info */}
                          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</span>
                                <p className="text-slate-800 font-medium">{currentConsultation.patient_name || `Patient #${currentConsultation.patient_id}`}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consulting Doctor</span>
                                <p className="text-slate-800 font-medium">{(currentConsultation.doctor_name || 'N/A').startsWith('Dr') ? currentConsultation.doctor_name : `Dr. ${currentConsultation.doctor_name || 'N/A'}`}</p>
                              </div>
                            </div>
                          </div>

                          {/* Report Body */}
                          <div className="px-6 py-5 space-y-5">
                            {/* Diagnosis */}
                            {currentConsultation.patient_report.diagnosis_summary && (
                              <div>
                                <h4 className="text-sm font-bold text-primary-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  Diagnosis Summary
                                </h4>
                                <p className="text-slate-700 leading-relaxed pl-6">{currentConsultation.patient_report.diagnosis_summary}</p>
                              </div>
                            )}

                            {/* Medications */}
                            {currentConsultation.patient_report.medication_instructions && (
                              <div>
                                <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                  Medication Instructions
                                </h4>
                                <div className="pl-6 text-slate-700 leading-relaxed whitespace-pre-wrap">{currentConsultation.patient_report.medication_instructions}</div>
                              </div>
                            )}

                            {/* Warning Signs */}
                            {currentConsultation.patient_report.warning_signs && (
                              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  Warning Signs — Seek Immediate Help If:
                                </h4>
                                <div className="pl-6 text-red-800 leading-relaxed whitespace-pre-wrap">{currentConsultation.patient_report.warning_signs}</div>
                              </div>
                            )}

                            {/* Full Report Content */}
                            {currentConsultation.patient_report.content && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" /></svg>
                                  Detailed Instructions
                                </h4>
                                <div className="pl-6 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto scrollbar-thin">{currentConsultation.patient_report.content}</div>
                              </div>
                            )}
                          </div>

                          {/* Signature & Footer */}
                          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                            <div className="flex justify-between items-end">
                              <div className="text-xs text-slate-400">
                                <p>Report generated on {new Date(currentConsultation.patient_report.created_at).toLocaleString('en-IN')}</p>
                                <p>Ambient AI Healthcare System</p>
                              </div>
                              <div className="text-right">
                                {currentConsultation.doctor_signature_filename ? (
                                  <div className="flex flex-col items-end">
                                    <img 
                                      src={getSignatureUrl(currentConsultation.doctor_signature_filename)} 
                                      alt="Doctor's Signature" 
                                      className="h-16 max-w-[200px] object-contain mb-1"
                                    />
                                    <div className="border-t border-slate-300 pt-1 min-w-[160px] text-center">
                                      <p className="text-sm font-semibold text-slate-700">{(currentConsultation.doctor_name || 'N/A').startsWith('Dr') ? currentConsultation.doctor_name : `Dr. ${currentConsultation.doctor_name || 'N/A'}`}</p>
                                      <p className="text-xs text-slate-500">Consulting Physician</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-2">
                                    <p className="text-xs text-amber-600 italic">No signature uploaded</p>
                                    <label className={`relative px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 cursor-pointer flex items-center gap-1.5 ${uploadingSignature ? 'opacity-50 pointer-events-none' : ''}`}>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      {uploadingSignature ? 'Uploading...' : 'Upload Signature'}
                                      <input type="file" accept="image/*,.png,.jpg,.jpeg" onChange={handleSignatureUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signature Management (below report card) */}
                        {currentConsultation.doctor_signature_filename && (
                          <div className="mt-3 flex justify-end">
                            <label className={`relative px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-200 cursor-pointer flex items-center gap-1.5 ${uploadingSignature ? 'opacity-50 pointer-events-none' : ''}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              {uploadingSignature ? 'Uploading...' : 'Replace Signature'}
                              <input type="file" accept="image/*,.png,.jpg,.jpeg" onChange={handleSignatureUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </label>
                          </div>
                        )}
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
