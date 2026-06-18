import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com']

function getSuggestions(val: string): string[] {
  const atIdx = val.indexOf('@')
  if (atIdx === -1) return []

  const prefix = val.slice(0, atIdx + 1)
  const afterAt = val.slice(atIdx + 1).toLowerCase()

  // Show all three right after "@", or filter by what's been typed
  const matches = DOMAINS.filter((d) => d.startsWith(afterAt) && d !== afterAt)
  return matches.map((d) => prefix + d)
}

interface EmailInputProps {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function EmailInput({ id, value, onChange, placeholder, className, required }: EmailInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e)
    setSuggestions(getSuggestions(e.target.value))
  }

  const pick = (suggestion: string) => {
    // Synthetic event so parent state setters (e.target.value) work unchanged
    onChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>)
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="email"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
        // Delay hide so mousedown on a suggestion fires before blur
        onBlur={() => setTimeout(() => setSuggestions([]), 120)}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s) }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
