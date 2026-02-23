import { useState, useEffect } from 'react'
import { createPatient, adminListPatients } from '../api'

export default function AdminDashboard() {
  const [patients, setPatients] = useState([])
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', address: '', preferred_language: 'en' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadPatients = async () => { try { setPatients(await adminListPatients()) } catch (e) { setError('Failed to load patients') } }
  useEffect(() => { loadPatients() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const result = await createPatient(form)
      setSuccess(`Patient "${result.full_name}" created successfully!\nPatient ID: ${result.patient_uid}\nLogin: ${result.email}\nA welcome email with login details has been sent.`)
      setForm({ email: '', password: '', full_name: '', phone: '', address: '', preferred_language: 'en' })
      loadPatients()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-display font-semibold text-xl text-slate-800">Create Patient Account</h2>
          <p className="text-slate-500 text-sm mt-1">Create a patient user before discharge. A unique Patient ID will be auto-generated and emailed to the patient.</p>
        </div>
        <div className="p-6">
          {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
          {success && <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-100 text-primary-800 text-sm whitespace-pre-line">{success}</div>}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label><input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={inputClass} required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="Patient's email — login details will be sent here" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label><input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="Initial password (will be emailed to patient)" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label><input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred Language</label><select value={form.preferred_language} onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))} className={inputClass}><option value="en">English</option><option value="ta">Tamil</option><option value="hi">Hindi</option></select></div>
            <button type="submit" disabled={loading} className="px-5 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating &amp; Sending Email...</>
              ) : 'Create Patient & Send Email'}
            </button>
          </form>
        </div>
      </section>
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50"><h2 className="font-display font-semibold text-xl text-slate-800">Patient List</h2></div>
        <div className="p-6">
          {patients.length === 0 ? <p className="text-slate-500">No patients yet.</p> : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Patient ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Language</th>
                </tr></thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 px-4"><span className="font-mono font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded-md text-xs tracking-wider">{p.patient_uid || '—'}</span></td>
                      <td className="py-3 px-4 font-medium">{p.full_name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.email}</td>
                      <td className="py-3 px-4 text-slate-600">{p.phone || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{{'en': 'English', 'ta': 'Tamil', 'hi': 'Hindi'}[p.preferred_language] || p.preferred_language || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
