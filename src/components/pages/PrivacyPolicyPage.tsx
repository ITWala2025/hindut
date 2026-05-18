import { ShieldCheck } from '@phosphor-icons/react'

export function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col pt-32 pb-24">
      <div className="bg-linear-to-br from-orange-600 via-amber-600 to-orange-700 py-16 px-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <ShieldCheck size={30} weight="bold" className="text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Privacy Policy
        </h1>
        <p className="text-white/80 text-lg">Last updated: May 2026</p>
      </div>

      <div className="container mx-auto px-6 md:px-12 lg:px-32 max-w-4xl py-16 space-y-10 text-orange-900/80 leading-relaxed">

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Who We Are</h2>
          <p>
            Hindu Association of Ireland (HAI) is a non-profit community organisation based in Limerick, Ireland.
            We are committed to protecting the privacy of everyone who interacts with our website and services.
            If you have any questions about this policy, please contact us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Information We Collect</h2>
          <p className="mb-3">We collect information you voluntarily provide to us, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><span className="font-medium">Contact form</span>: name, email address, phone number, and message.</li>
            <li><span className="font-medium">Membership registration</span>: name, email address, phone number, address, and payment details (processed securely via our payment provider).</li>
            <li><span className="font-medium">Event registration</span>: name, email address, and any details required for the specific event.</li>
          </ul>
          <p className="mt-3">We may also automatically collect technical data such as your IP address, browser type, and pages visited via cookies and analytics tools (see our Cookies Policy).</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>To respond to your enquiries and provide support.</li>
            <li>To process membership applications and payments.</li>
            <li>To send you information about events, services, and community news (with your consent).</li>
            <li>To administer and improve our website and services.</li>
            <li>To comply with our legal and regulatory obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Legal Basis for Processing (GDPR)</h2>
          <p className="mb-3">We process your personal data under the following legal bases as defined by the General Data Protection Regulation (GDPR):</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><span className="font-medium">Contractual necessity</span>: processing required to fulfil membership or event registration.</li>
            <li><span className="font-medium">Legitimate interests</span>: responding to enquiries and operating our organisation.</li>
            <li><span className="font-medium">Consent</span>: sending marketing communications where you have opted in.</li>
            <li><span className="font-medium">Legal obligation</span>: compliance with applicable Irish and EU law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Data Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal data. We may share your data only with trusted third-party service providers (such as payment processors and email platforms) strictly for the purposes described in this policy. All processors are bound by contractual obligations to keep your data secure and confidential.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Data Retention</h2>
          <p>
            We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by law. Membership records are kept for the duration of your membership plus 6 years. Contact form submissions are retained for up to 12 months.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>7. Your Rights</h2>
          <p className="mb-3">Under GDPR you have the right to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request erasure of your data (the "right to be forgotten").</li>
            <li>Object to or restrict our processing of your data.</li>
            <li>Withdraw consent at any time (where processing is consent-based).</li>
            <li>Lodge a complaint with the Data Protection Commission (DPC) at <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">dataprotection.ie</a>.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>8. Security</h2>
          <p>
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. However, no method of transmission over the internet is completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date. We encourage you to review this policy periodically.
          </p>
        </section>

      </div>
    </div>
  )
}
