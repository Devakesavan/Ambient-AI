import { jsPDF } from 'jspdf'

export function downloadReportPDF(content, filename = 'Take-Home-Report.pdf') {
  const doc = new jsPDF({ margin: 20 })
  doc.setFontSize(14)
  doc.text(content, 20, 20, { maxWidth: 170 })
  doc.save(filename)
}
