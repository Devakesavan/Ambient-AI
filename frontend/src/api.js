const API_BASE = '/api'

function getToken() { return localStorage.getItem('token') }
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Login failed') }
  return res.json()
}

export async function me() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function createPatient(data) {
  const res = await fetch(`${API_BASE}/admin/patients`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Failed to create patient') }
  return res.json()
}

export async function listPatients() {
  const res = await fetch(`${API_BASE}/doctor/patients`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch patients')
  return res.json()
}

export async function adminListPatients() {
  const res = await fetch(`${API_BASE}/admin/patients`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch patients')
  return res.json()
}

export async function createConsultation(patientId) {
  const res = await fetch(`${API_BASE}/consultations`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ patient_id: patientId }) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Failed to create consultation') }
  return res.json()
}

export async function getConsultation(id, language = 'en') {
  const res = await fetch(`${API_BASE}/consultations/${id}?language=${language}`, { headers: getHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch consultation (${res.status})`)
  }
  return res.json()
}

export async function listConsultations(patientId = null, language = 'en') {
  let url = `${API_BASE}/consultations?language=${language}`
  if (patientId) url += `&patient_id=${patientId}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch consultations')
  return res.json()
}

export async function mockTranscribe(consultationId) {
  const res = await fetch(`${API_BASE}/consultations/${consultationId}/mock-transcribe`, { method: 'POST', headers: getHeaders() })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Mock transcribe failed') }
  return res.json()
}

export async function uploadAudio(consultationId, blob) {
  const formData = new FormData()
  // If it's a File object, use its name; otherwise use default for Blob
  const filename = blob.name || 'recording.webm'
  formData.append('file', blob, filename)
  const res = await fetch(`${API_BASE}/consultations/${consultationId}/audio`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Upload failed') }
  return res.json()
}

export async function uploadTeachBackAnswerAllAudio(consultationId, blob) {
  const formData = new FormData()
  const filename = blob.name || 'teach-back-recording.webm'
  formData.append('file', blob, filename)
  const res = await fetch(`${API_BASE}/consultations/${consultationId}/teach-back/answer-all-audio`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = Array.isArray(err.detail) ? err.detail.map((d) => d.msg || d).join(', ') : (err.detail || 'Failed to process teach-back audio.')
    throw new Error(msg)
  }
  return res.json()
}

export async function generatePatientReport(consultationId) {
  const res = await fetch(`${API_BASE}/consultations/${consultationId}/patient-report`, { method: 'POST', headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to generate report')
  return res.json()
}

export async function completeConsultation(consultationId) {
  const res = await fetch(`${API_BASE}/consultations/${consultationId}/complete`, { method: 'POST', headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to complete')
  return res.json()
}

export async function patientVisits(language = 'en') {
  const res = await fetch(`${API_BASE}/patient/visits?language=${language}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch visits')
  return res.json()
}
