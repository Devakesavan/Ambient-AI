import { jsPDF } from 'jspdf'

// ── Font configuration for Tamil / Hindi / English ──
const FONT_MAP = {
  ta: { file: '/fonts/NotoSansTamil-Regular.ttf', family: 'NotoSansTamil' },
  hi: { file: '/fonts/NotoSansDevanagari-Regular.ttf', family: 'NotoSansDevanagari' },
}

// ── Translated PDF labels ──
const PDF_LABELS = {
  en: {
    title: 'Patient Take-Home Report',
    patient: 'PATIENT',
    doctor: 'CONSULTING DOCTOR',
    diagnosis: 'Diagnosis Summary',
    medication: 'Medication Instructions',
    warning: 'Warning Signs — Seek Immediate Help If:',
    instructions: 'Detailed Instructions',
    generatedOn: 'Report generated on',
    system: 'Ambient AI Healthcare System',
    physician: 'Consulting Physician',
  },
  ta: {
    title: 'நோயாளி வீட்டிற்கான அறிக்கை',
    patient: 'நோயாளி',
    doctor: 'ஆலோசனை மருத்துவர்',
    diagnosis: 'நோய் கண்டறிதல் சுருக்கம்',
    medication: 'மருந்து வழிமுறைகள்',
    warning: 'எச்சரிக்கை அறிகுறிகள் — உடனடியாக மருத்துவரை அணுகவும்:',
    instructions: 'விரிவான வழிமுறைகள்',
    generatedOn: 'அறிக்கை தயாரிக்கப்பட்ட தேதி',
    system: 'அம்பியன்ட் AI சுகாதார அமைப்பு',
    physician: 'ஆலோசனை மருத்துவர்',
  },
  hi: {
    title: 'रोगी घर ले जाने वाली रिपोर्ट',
    patient: 'रोगी',
    doctor: 'परामर्श चिकित्सक',
    diagnosis: 'निदान सारांश',
    medication: 'दवा निर्देश',
    warning: 'चेतावनी संकेत — तुरंत चिकित्सा सहायता लें यदि:',
    instructions: 'विस्तृत निर्देश',
    generatedOn: 'रिपोर्ट तैयार की गई',
    system: 'एम्बिएंट AI स्वास्थ्य प्रणाली',
    physician: 'परामर्श चिकित्सक',
  },
}

/**
 * Load a Unicode TTF font into jsPDF so Tamil / Hindi text renders correctly.
 * Returns the font family name to use, or 'helvetica' for English / fallback.
 */
async function registerUnicodeFont(doc, language) {
  const info = FONT_MAP[language]
  if (!info) return 'helvetica'

  try {
    const res = await fetch(info.file)
    if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)

    const fileName = info.file.split('/').pop()
    doc.addFileToVFS(fileName, b64)
    doc.addFont(fileName, info.family, 'normal')
    doc.addFont(fileName, info.family, 'bold') // variable font covers weights
    return info.family
  } catch (e) {
    console.warn('Unicode font load failed, falling back to helvetica:', e)
    return 'helvetica'
  }
}

/**
 * Download a professional, structured patient report as PDF.
 * @param {object} consultation - Full consultation object with patient_report, doctor_name, patient_name, etc.
 * @param {function} getSignatureUrl - Function to get signature image URL
 * @param {string} language - 'en' | 'ta' | 'hi'
 */
export async function downloadReportPDF(consultation, getSignatureUrl, language = 'en') {
  const report = consultation.patient_report
  if (!report) return

  const L = PDF_LABELS[language] || PDF_LABELS.en
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fontFamily = await registerUnicodeFont(doc, language)

  const pageW = doc.internal.pageSize.getWidth()
  const marginL = 20
  const marginR = 20
  const contentW = pageW - marginL - marginR
  let y = 0

  // Helper to set font
  const setFont = (style = 'normal', size = 10) => {
    doc.setFontSize(size)
    doc.setFont(fontFamily, style)
  }

  // ── Header Banner ──
  doc.setFillColor(15, 118, 110) // teal-700
  doc.rect(0, 0, pageW, 32, 'F')
  doc.setTextColor(255, 255, 255)
  setFont('bold', 18)
  doc.text(L.title, marginL, 15)
  setFont('normal', 10)
  const dateStr = new Date(consultation.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Consultation #${consultation.id}  |  ${dateStr}`, marginL, 24)
  y = 40

  // ── Patient & Doctor Info ──
  doc.setFillColor(248, 250, 252) // slate-50
  doc.rect(marginL - 2, y - 4, contentW + 4, 20, 'F')
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.rect(marginL - 2, y - 4, contentW + 4, 20, 'S')

  doc.setTextColor(148, 163, 184) // slate-400
  setFont('bold', 7)
  doc.text(L.patient, marginL + 2, y + 2)
  doc.text(L.doctor, pageW / 2 + 5, y + 2)

  doc.setTextColor(30, 41, 59) // slate-800
  setFont('bold', 11)
  doc.text(consultation.patient_name || `Patient #${consultation.patient_id}`, marginL + 2, y + 10)
  const drName = (consultation.doctor_name || 'N/A').startsWith('Dr') ? consultation.doctor_name : `Dr. ${consultation.doctor_name || 'N/A'}`
  doc.text(drName, pageW / 2 + 5, y + 10)
  y += 26

  // Helper: add section with page break awareness
  const addSection = (title, content, opts = {}) => {
    if (!content) return
    const { titleColor = [15, 118, 110], bgColor = null, textColor = [51, 65, 85] } = opts

    // Section title
    if (y > 260) { doc.addPage(); y = 20 }
    setFont('bold', 9)
    doc.setTextColor(...titleColor)
    doc.text(title.toUpperCase(), marginL, y)
    y += 5

    // Content
    setFont('normal', 10)
    doc.setTextColor(...textColor)

    const lines = doc.splitTextToSize(content, contentW - 8)
    const blockH = lines.length * 5 + 6

    if (bgColor) {
      if (y + blockH > 270) { doc.addPage(); y = 20 }
      doc.setFillColor(...bgColor)
      doc.roundedRect(marginL - 2, y - 2, contentW + 4, blockH + 2, 2, 2, 'F')
    }

    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20 }
      doc.text(line, marginL + 4, y + 3)
      y += 5
    }
    y += 6
  }

  // ── Sections ──
  addSection(L.diagnosis, report.diagnosis_summary, { titleColor: [15, 118, 110] })
  addSection(L.medication, report.medication_instructions, { titleColor: [29, 78, 216] })
  addSection(L.warning, report.warning_signs, {
    titleColor: [185, 28, 28], bgColor: [254, 242, 242], textColor: [153, 27, 27],
  })
  addSection(L.instructions, report.content, { titleColor: [100, 116, 139] })

  // ── Signature & Footer ──
  if (y > 240) { doc.addPage(); y = 20 }
  y = Math.max(y + 10, 250)

  // Divider line
  doc.setDrawColor(203, 213, 225) // slate-300
  doc.line(marginL, y, pageW - marginR, y)
  y += 6

  // Footer left
  setFont('normal', 7)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`${L.generatedOn} ${new Date(report.created_at).toLocaleString('en-IN')}`, marginL, y)
  doc.text(L.system, marginL, y + 4)

  // Signature right
  const sigX = pageW - marginR - 50

  // Try to load and embed signature image
  if (consultation.doctor_signature_filename && getSignatureUrl) {
    try {
      const sigUrl = getSignatureUrl(consultation.doctor_signature_filename)
      const img = await loadImage(sigUrl)
      if (img) {
        const maxW = 45, maxH = 18
        const ratio = Math.min(maxW / img.width, maxH / img.height)
        const w = img.width * ratio
        const h = img.height * ratio
        doc.addImage(img.src, 'PNG', sigX + (45 - w) / 2, y - 20, w, h)
      }
    } catch (e) {
      // Signature image failed to load, skip it
    }
  }

  // Doctor name line
  doc.setDrawColor(148, 163, 184)
  doc.line(sigX, y, sigX + 45, y)
  setFont('bold', 9)
  doc.setTextColor(51, 65, 85)
  const drNameSig = (consultation.doctor_name || 'N/A').startsWith('Dr') ? consultation.doctor_name : `Dr. ${consultation.doctor_name || 'N/A'}`
  doc.text(drNameSig, sigX + 22.5, y + 5, { align: 'center' })
  setFont('normal', 7)
  doc.setTextColor(148, 163, 184)
  doc.text(L.physician, sigX + 22.5, y + 9, { align: 'center' })

  doc.save(`Patient-Report-Visit-${consultation.id}.pdf`)
}

/**
 * Load an image as an HTMLImageElement (for PDF embedding).
 */
function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}
