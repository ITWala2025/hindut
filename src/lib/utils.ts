import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalises any date string (ISO YYYY-MM-DD, DD/MM/YYYY, or ISO timestamp)
 * into standard ISO date string "YYYY-MM-DD" for consistent database storage.
 */
export function normalizeDateToIso(dateStr?: string | null): string {
  if (!dateStr) return ''
  const trimmed = String(dateStr).trim()
  if (!trimmed) return ''

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // If YYYY-MM-DDTHH:mm:ss...
  if (trimmed.length >= 10 && trimmed.charAt(4) === '-' && trimmed.charAt(7) === '-') {
    return trimmed.slice(0, 10)
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return trimmed
}

/**
 * Consistently formats any date string into standard Irish display format "DD/MM/YYYY" (en-IE).
 * Ensures uniform rendering across UI badges, table cells, modal dialogs, and exported data.
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return ''
  const iso = normalizeDateToIso(dateStr)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split('-')
    return `${day}/${month}/${year}`
  }
  return dateStr
}
