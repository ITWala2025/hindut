import { jsPDF } from 'jspdf'
import type { ReceiptRecord } from '@/lib/types'

const ORG_NAME = 'Hindu Association of Ireland'
const ORG_SUBLINE = 'Registered Charity • CHY 12345'
const ORG_ADDRESS = 'Dublin, Ireland'
const ORG_EMAIL = 'info@hinduireland.ie'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function receiptTitle(type: ReceiptRecord['type']): string {
  switch (type) {
    case 'donation':   return 'Donation Receipt'
    case 'membership': return 'Membership Receipt'
    case 'event':      return 'Event Ticket Receipt'
    default:           return 'Official Receipt'
  }
}

/**
 * Generates and triggers a download of a polished PDF receipt.
 * Uses jsPDF (no html2canvas) so it is fast and works offline.
 */
export function downloadReceiptPdf(r: ReceiptRecord): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = margin

  // ── Header band ──
  doc.setFillColor(234, 88, 12) // orange-600
  doc.rect(0, 0, pageW, 90, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(ORG_NAME, margin, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(ORG_SUBLINE, margin, 60)
  doc.text(`${ORG_ADDRESS} • ${ORG_EMAIL}`, margin, 74)

  // Title block
  y = 130
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(receiptTitle(r.type), margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  y += 18
  doc.text(`Receipt No: ${r.receiptNumber}`, margin, y)
  doc.text(`Date Issued: ${formatDate(r.issuedDate || r.date)}`, pageW - margin, y, { align: 'right' })

  // Divider
  y += 14
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(1)
  doc.line(margin, y, pageW - margin, y)
  y += 28

  // Recipient block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('RECEIVED FROM', margin, y)
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(r.recipientName || '—', margin, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  if (r.recipientEmail) {
    doc.text(r.recipientEmail, margin, y)
    y += 14
  }

  y += 18

  // Amount card
  const cardH = 78
  doc.setFillColor(255, 247, 237) // orange-50
  doc.roundedRect(margin, y, pageW - margin * 2, cardH, 8, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(154, 52, 18)
  doc.text('AMOUNT RECEIVED', margin + 16, y + 24)
  doc.setFontSize(28)
  doc.setTextColor(154, 52, 18)
  const euro = `€${r.amount.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  doc.text(euro, margin + 16, y + 58)

  // Type badge on right of card
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  const typeLabel = r.type.toUpperCase()
  const badgeW = doc.getTextWidth(typeLabel) + 24
  const badgeX = pageW - margin - badgeW - 16
  const badgeY = y + 16
  doc.setFillColor(234, 88, 12)
  doc.roundedRect(badgeX, badgeY, badgeW, 22, 11, 11, 'F')
  doc.text(typeLabel, badgeX + 12, badgeY + 15)

  if (r.isManual) {
    const manualLabel = 'MANUAL / OFFLINE'
    const mLabelW = doc.getTextWidth(manualLabel) + 24
    doc.setFillColor(100, 116, 139)
    doc.roundedRect(pageW - margin - mLabelW - 16, badgeY + 30, mLabelW, 20, 10, 10, 'F')
    doc.text(manualLabel, pageW - margin - mLabelW - 16 + 12, badgeY + 44)
  }

  y += cardH + 30

  // Description block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('DESCRIPTION', margin, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  const descLines = doc.splitTextToSize(r.description || '—', pageW - margin * 2)
  doc.text(descLines, margin, y)
  y += descLines.length * 14 + 18

  // Monthly contribution (membership only)
  const monthlyAmt = r.type === 'membership'
    ? (r.metadata?.monthly_contribution_eur as number | undefined)
    : undefined
  const monthlyStartIso = r.type === 'membership'
    ? (r.metadata?.monthly_start_date as string | undefined)
    : undefined

  if (monthlyAmt && monthlyAmt >= 1) {
    // Decorative band
    doc.setFillColor(240, 253, 244) // green-50
    doc.roundedRect(margin, y, pageW - margin * 2, 72, 8, 8, 'F')
    doc.setDrawColor(134, 239, 172) // green-300
    doc.setLineWidth(1)
    doc.roundedRect(margin, y, pageW - margin * 2, 72, 8, 8, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(22, 101, 52) // green-800
    doc.text('MONTHLY CONTRIBUTION', margin + 16, y + 22)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(21, 128, 61) // green-700
    const monthlyEuro = `€${monthlyAmt.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month`
    doc.text(monthlyEuro, margin + 16, y + 40)

    let startLabel = 'Billing begins on the 1st of next month.'
    if (monthlyStartIso) {
      const startDate = new Date(monthlyStartIso)
      if (!Number.isNaN(startDate.getTime())) {
        startLabel = `Billing begins on ${startDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}, then on the 1st of each month.`
      }
    }
    doc.setFontSize(9)
    doc.setTextColor(22, 101, 52)
    doc.text(startLabel, margin + 16, y + 57)

    y += 72 + 22
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 80
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY, pageW - margin, footerY)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    'This receipt is computer-generated and is valid without a signature.',
    pageW / 2,
    footerY + 20,
    { align: 'center' },
  )
  doc.text(
    `Thank you for supporting ${ORG_NAME}.`,
    pageW / 2,
    footerY + 36,
    { align: 'center' },
  )

  const safeNumber = r.receiptNumber.replace(/[\\/]+/g, '-')
  doc.save(`Receipt-${safeNumber}.pdf`)
}
