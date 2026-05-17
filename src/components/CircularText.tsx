import { useEffect, useRef } from 'react'

interface CircularTextProps {
  text: string
  className?: string
}

export function CircularText({ text, className = '' }: CircularTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const textToDisplay = text + ' • ' // Add separator for continuous feel
    const chars = textToDisplay.split('')
    const angleStep = 360 / chars.length

    // Clear existing content
    container.innerHTML = ''

    // Create a span for each character
    chars.forEach((char, index) => {
      const span = document.createElement('span')
      span.textContent = char
      span.style.transform = `rotate(${index * angleStep}deg)`
      container.appendChild(span)
    })
  }, [text])

  return (
    <div
      ref={containerRef}
      className={`circular-text-container ${className}`}
      aria-hidden="true"
    />
  )
}
