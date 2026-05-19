/**
 * WhatsAppButton
 * Persistent fixed button — bottom-right corner on all public pages.
 * Opens https://wa.me/353874953334 in a new tab.
 * No external dependencies — official WhatsApp SVG inlined.
 */
export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/353874953334"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="whatsapp-fab group"
    >
      {/* Ripple ring */}
      <span className="whatsapp-fab__ring" aria-hidden="true" />

      {/* Official WhatsApp logo SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        className="whatsapp-fab__icon"
      >
        <circle cx="24" cy="24" r="24" fill="#25D366" />
        <path
          fill="#fff"
          d="M34.56 13.4A14.83 14.83 0 0 0 24.04 9C16.28 9 10 15.26 10 23.02c0 2.47.65 4.88 1.88 7.01L10 39l9.17-1.84a14.96 14.96 0 0 0 6.87 1.68h.01c7.76 0 14.04-6.26 14.04-14.02a13.93 13.93 0 0 0-5.53-11.42zM24.04 36.3a12.4 12.4 0 0 1-6.33-1.73l-.45-.27-4.7.94.99-4.57-.3-.47a12.3 12.3 0 0 1-1.9-6.18c0-6.8 5.54-12.32 12.35-12.32a12.3 12.3 0 0 1 12.33 12.35c0 6.8-5.54 12.25-12.33 12.25h.34zm6.77-9.21c-.37-.19-2.2-1.09-2.54-1.21-.34-.12-.59-.18-.83.18-.25.37-.96 1.21-1.18 1.46-.22.25-.43.28-.8.09-.37-.19-1.56-.57-2.97-1.83a11.1 11.1 0 0 1-2.06-2.55c-.21-.37-.02-.57.16-.75.17-.17.37-.43.55-.65.18-.22.24-.37.37-.62.12-.25.06-.46-.03-.65-.09-.18-.83-2-.14-3.66.22-.53.62-.75 1.04-.75h.97c.34 0 .9.12 1.37 1.09.47 1 1.6 3.76 1.73 4.03.14.28.24.62.05.99-.19.37-.28.62-.55.9-.28.28-.58.62-.83.83-.28.24-.57.5-.25 1.06.34.56 1.5 2.47 3.22 3.99 2.21 1.97 4.07 2.58 4.65 2.87.57.28.9.24 1.24-.15.34-.4 1.46-1.7 1.85-2.28.4-.59.8-.5 1.34-.3.56.19 3.54 1.67 4.15 1.97.62.3 1.03.46 1.18.72.15.25.15 1.46-.34 2.87-.5 1.4-2.95 2.68-4.1 2.77-.7.06-1.34.1-4.29-1.1z"
        />
      </svg>

      {/* Tooltip */}
      <span
        className="whatsapp-fab__tooltip"
        role="tooltip"
      >
        Chat on WhatsApp
      </span>
    </a>
  )
}
