import { jsPDF } from 'jspdf'
import type { ReceiptRecord } from '@/lib/types'

// ── Organisation constants ───────────────────────────────────────────────────
const ORG_NAME    = 'Hindu Association of Ireland'
const ORG_REG     = 'Registered Charity | Ireland'
const ORG_ADDRESS = '4 Upper Denmark Street, Co. Limerick, Ireland'
const ORG_PHONE   = '+353 87 495 3334'
const ORG_EMAIL   = 'info@hindutemple.ie'
const ORG_EMAIL2  = 'hinduassociationireland@gmail.com'
const ORG_WEB     = 'www.hindutemple.ie'

// ── Brand colours (HAI green palette) ───────────────────────────────────────
const C_GREEN_DARK:  [number, number, number] = [27,  94,  32]    // deep forest green
const C_GREEN_MID:   [number, number, number] = [56, 142,  60]    // medium green
const C_GREEN_LIGHT: [number, number, number] = [232, 245, 233]   // soft green tint
const C_GOLD:        [number, number, number] = [212, 160,   0]   // warm gold accent
const C_WHITE:       [number, number, number] = [255, 255, 255]
const C_TEXT_DARK:   [number, number, number] = [15,  23,  42]
const C_TEXT_MID:    [number, number, number] = [71,  85, 105]
const C_BORDER:      [number, number, number] = [226, 232, 240]
const C_AMBER_BG:    [number, number, number] = [255, 251, 235]
const C_AMBER_DARK:  [number, number, number] = [120,  53,  15]
const C_AMBER_MID:   [number, number, number] = [146,  64,  14]

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function typeLabel(type: ReceiptRecord['type']): string {
  switch (type) {
    case 'donation':   return 'DONATION'
    case 'membership': return 'MEMBERSHIP'
    case 'event':      return 'EVENT TICKET'
    default:           return 'PAYMENT'
  }
}

function receiptGreeting(r: ReceiptRecord): string {
  const first = r.recipientName ? r.recipientName.trim().split(' ')[0] : 'Friend'
  switch (r.type) {
    case 'donation':
      return (
        `Dear ${first},\n\n` +
        `Thank you for your generous donation to the Hindu Association of Ireland. ` +
        `Your contribution brings us one step closer to establishing a permanent Hindu ` +
        `Temple in Limerick, serving as a spiritual, cultural, and community hub for ` +
        `all Hindus across Ireland. We are truly grateful for your support.`
      )
    case 'membership':
      return (
        `Dear ${first},\n\n` +
        `Welcome to the Hindu Association of Ireland family! Thank you for becoming a ` +
        `valued member. Your membership directly supports our mission to build a ` +
        `permanent Hindu Temple and enrich the lives of the Hindu community throughout ` +
        `Ireland. We look forward to growing together with you.`
      )
    case 'event':
      return (
        `Dear ${first},\n\n` +
        `Thank you for joining us at this event. Your participation enriches our ` +
        `community celebrations and helps us share the beauty of Hindu culture, ` +
        `traditions, and values with everyone. We are delighted to have you with us.`
      )
    default:
      return (
        `Dear ${first},\n\n` +
        `Thank you for your support of the Hindu Association of Ireland. Your ` +
        `contribution is deeply appreciated and helps us serve our community.`
      )
  }
}

async function loadImageDataUrl(publicPath: string): Promise<string | null> {
  try {
    const res = await fetch(publicPath)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function downloadReceiptPdf(r: ReceiptRecord): Promise<void> {
  const [logoData, iconData] = await Promise.all([
    loadImageDataUrl('/HAI%20(Green)%20%20Hindu%20Association%20Ireland%20logo-01.jpg'),
    loadImageDataUrl('/favicon.png'),
  ])

  const doc   = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()    // 595.28
  const pageH = doc.internal.pageSize.getHeight()   // 841.89
  const margin = 48
  const cw     = pageW - margin * 2                 // 499.28

  // ── HEADER BAND ────────────────────────────────────────────────────────────
  const headerH = 118
  doc.setFillColor(...C_GREEN_DARK)
  doc.rect(0, 0, pageW, headerH, 'F')

  // Gold accent bar at very top
  doc.setFillColor(...C_GOLD)
  doc.rect(0, 0, pageW, 5, 'F')

  // HAI logo with white circular halo
  const logoSize = 78
  const logoX    = margin
  const logoY    = 18
  if (logoData) {
    doc.setFillColor(...C_WHITE)
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 'F')
    doc.addImage(logoData, 'JPEG', logoX, logoY, logoSize, logoSize)
  } else {
    // Fallback: green circle placeholder
    doc.setFillColor(...C_GREEN_MID)
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F')
  }

  // Org name + details to the right of logo
  const nameX = logoX + logoSize + 18
  doc.setTextColor(...C_WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(ORG_NAME, nameX, logoY + 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(185, 230, 185)
  doc.text(ORG_REG, nameX, logoY + 42)

  doc.setFontSize(8.5)
  doc.setTextColor(170, 215, 170)
  doc.text(`${ORG_WEB}  |  ${ORG_EMAIL}`, nameX, logoY + 56)

  // ── RECEIPT TITLE SECTION ──────────────────────────────────────────────────
  let y = headerH + 28

  // Decorative favicon icon (top-right of body)
  if (iconData) {
    const iconSize = 52
    doc.addImage(iconData, 'PNG', pageW - margin - iconSize, y - 6, iconSize, iconSize)
  }

  doc.setTextColor(...C_GREEN_DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(receiptTitle(r.type), margin, y + 18)

  // Gold underline below title
  doc.setFillColor(...C_GOLD)
  doc.rect(margin, y + 24, 160, 2.5, 'F')

  y += 44

  // Receipt number + date row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C_TEXT_MID)
  doc.text('Receipt No:', margin, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C_TEXT_DARK)
  doc.text(r.receiptNumber, margin + doc.getTextWidth('Receipt No: '), y)

  const dateStr = `Date: ${formatDate(r.issuedDate || r.date)}`
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C_TEXT_MID)
  doc.text(dateStr, pageW - margin, y, { align: 'right' })

  // Divider
  y += 14
  doc.setDrawColor(...C_BORDER)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)

  // ── GREETING ───────────────────────────────────────────────────────────────
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...C_TEXT_DARK)
  const greetText  = receiptGreeting(r)
  const greetLines = doc.splitTextToSize(greetText, cw - 64)  // leave room for icon
  doc.text(greetLines, margin, y)
  y += greetLines.length * 13.5 + 18

  // ── AMOUNT CARD ────────────────────────────────────────────────────────────
  const cardH = 94
  doc.setFillColor(...C_GREEN_LIGHT)
  doc.roundedRect(margin, y, cw, cardH, 8, 8, 'F')
  doc.setDrawColor(...C_GREEN_MID)
  doc.setLineWidth(1.5)
  doc.roundedRect(margin, y, cw, cardH, 8, 8, 'S')

  // Left accent bar
  doc.setFillColor(...C_GREEN_DARK)
  doc.roundedRect(margin, y, 5, cardH, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C_GREEN_MID)
  doc.text('AMOUNT RECEIVED', margin + 18, y + 24)

  doc.setFontSize(28)
  doc.setTextColor(...C_GREEN_DARK)
  const euro = `€${r.amount.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  doc.text(euro, margin + 18, y + 62)

  // Type badge (top-right of card)
  const tLabel  = typeLabel(r.type)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  const badgeW  = doc.getTextWidth(tLabel) + 26
  const badgeX  = pageW - margin - badgeW - 18
  const badgeY  = y + 18
  doc.setFillColor(...C_GREEN_DARK)
  doc.roundedRect(badgeX, badgeY, badgeW, 22, 11, 11, 'F')
  doc.setTextColor(...C_WHITE)
  doc.text(tLabel, badgeX + 13, badgeY + 15)

  if (r.isManual) {
    doc.setFontSize(7.5)
    const mLabel = 'MANUAL / OFFLINE'
    const mW     = doc.getTextWidth(mLabel) + 20
    doc.setFillColor(...C_TEXT_MID)
    doc.roundedRect(badgeX, badgeY + 28, mW, 19, 9, 9, 'F')
    doc.setTextColor(...C_WHITE)
    doc.text(mLabel, badgeX + 10, badgeY + 41)
  }

  y += cardH + 26

  // ── PAYMENT DETAILS ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C_TEXT_MID)
  doc.text('PAYMENT DETAILS', margin, y)
  y += 5
  doc.setFillColor(...C_GREEN_MID)
  doc.rect(margin, y, 100, 1.5, 'F')
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...C_TEXT_DARK)
  const descLines = doc.splitTextToSize(r.description || '—', cw)
  doc.text(descLines, margin, y)
  y += descLines.length * 13.5 + 8

  if (r.paymentReference) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C_TEXT_MID)
    const refLabel = 'Payment Reference:  '
    doc.text(refLabel, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C_TEXT_DARK)
    doc.text(r.paymentReference, margin + doc.getTextWidth(refLabel), y)
    y += 14
  }

  // ── MONTHLY CONTRIBUTION BLOCK (membership only) ───────────────────────────
  const monthlyAmt      = r.type === 'membership'
    ? (r.metadata?.monthly_contribution_eur as number | undefined)
    : undefined
  const monthlyStartIso = r.type === 'membership'
    ? (r.metadata?.monthly_start_date as string | undefined)
    : undefined

  if (monthlyAmt && monthlyAmt >= 1) {
    y += 14
    const mCardH = 80
    doc.setFillColor(...C_AMBER_BG)
    doc.roundedRect(margin, y, cw, mCardH, 8, 8, 'F')
    doc.setDrawColor(252, 211, 77)
    doc.setLineWidth(1)
    doc.roundedRect(margin, y, cw, mCardH, 8, 8, 'S')
    doc.setFillColor(245, 158, 11)
    doc.roundedRect(margin, y, 5, mCardH, 4, 4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C_AMBER_DARK)
    doc.text('MONTHLY CONTRIBUTION', margin + 18, y + 22)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...C_AMBER_MID)
    const mEuro = `€${monthlyAmt.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month`
    doc.text(mEuro, margin + 18, y + 44)

    let startLabel = 'Billing begins on the 1st of next month.'
    if (monthlyStartIso) {
      const sd = new Date(monthlyStartIso)
      if (!Number.isNaN(sd.getTime())) {
        startLabel = `Billing begins on ${sd.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}, then on the 1st of each month.`
      }
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C_AMBER_DARK)
    doc.text(startLabel, margin + 18, y + 62)

    y += mCardH + 16
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const footerH = 96
  const footerY = pageH - footerH

  // Footer background
  doc.setFillColor(...C_GREEN_DARK)
  doc.rect(0, footerY, pageW, footerH, 'F')

  // Gold accent line at top of footer
  doc.setFillColor(...C_GOLD)
  doc.rect(0, footerY, pageW, 3, 'F')

  // Contact details — centred
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(210, 240, 210)
  doc.text(ORG_ADDRESS, pageW / 2, footerY + 20, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(185, 225, 185)
  doc.text(
    `Tel: ${ORG_PHONE}   |   Email: ${ORG_EMAIL}   |   ${ORG_WEB}`,
    pageW / 2,
    footerY + 34,
    { align: 'center' },
  )

  doc.setFontSize(7.5)
  doc.setTextColor(160, 205, 160)
  doc.text(ORG_EMAIL2, pageW / 2, footerY + 47, { align: 'center' })

  // Thin divider
  doc.setDrawColor(80, 130, 80)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY + 55, pageW - margin, footerY + 55)

  // Fine print
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(140, 185, 140)
  doc.text(
    'This receipt is computer-generated and is valid without a signature.',
    pageW / 2,
    footerY + 67,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(
    `Thank you for supporting ${ORG_NAME}. Om Shanti.`,
    pageW / 2,
    footerY + 80,
    { align: 'center' },
  )

  const safeNumber = r.receiptNumber.replace(/[\\/]+/g, '-')
  doc.save(`Receipt-${safeNumber}.pdf`)
}
