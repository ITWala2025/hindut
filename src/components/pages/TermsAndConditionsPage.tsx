import { Scroll } from '@phosphor-icons/react'

export function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col pt-32 pb-24">
      <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 py-16 px-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Scroll size={30} weight="bold" className="text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Terms &amp; Conditions
        </h1>
        <p className="text-white/80 text-lg">Last updated: May 2026</p>
      </div>

      <div className="container mx-auto px-6 md:px-12 lg:px-32 max-w-4xl py-16 space-y-10 text-orange-900/80 leading-relaxed">

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Introduction</h2>
          <p>
            These Terms and Conditions govern your use of the Hindu Association of Ireland (HAI) website and services.
            By accessing our website or using our services, you agree to be bound by these terms. If you do not agree, please do not use our website.
          </p>
          <p className="mt-3">
            HAI is a non-profit community organisation registered in Ireland, operating from Limerick. Our contact email is{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Use of the Website</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>You must be at least 18 years old to use this website, or have parental/guardian consent.</li>
            <li>You agree to use this website only for lawful purposes and in a way that does not infringe the rights of others.</li>
            <li>You must not attempt to gain unauthorised access to any part of the website or its related systems.</li>
            <li>You must not submit false, misleading, or fraudulent information through any forms on this website.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Membership</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Membership of HAI is open to individuals who support the aims and objectives of the association.</li>
            <li>Membership fees are non-refundable except where required by law or at the sole discretion of HAI.</li>
            <li>HAI reserves the right to decline or revoke membership for conduct that is contrary to the values and objectives of the association.</li>
            <li>Membership details must be kept accurate and up to date. Notify us promptly of any changes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Events</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>HAI reserves the right to cancel, reschedule, or modify any event at any time. We will endeavour to provide adequate notice where possible.</li>
            <li>Attendees are expected to behave respectfully towards all participants, staff, and volunteers.</li>
            <li>HAI accepts no liability for personal injury, loss, or damage arising from participation in events, except where required by law.</li>
            <li>Photography or recording at events may be permitted; however, consent of individuals must be obtained before sharing images publicly.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Intellectual Property</h2>
          <p>
            All content on this website, including text, images, logos, and graphics, is the property of HAI or its licensors and is protected by applicable intellectual property laws. You may not reproduce, distribute, or use any content without our prior written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Donations</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>All donations made to HAI are voluntary and are used to further the aims of the association.</li>
            <li>Donations are generally non-refundable. Refund requests will be considered on a case-by-case basis.</li>
            <li>HAI is not responsible for any tax implications arising from your donations. Please consult a tax adviser if needed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by Irish and EU law, HAI shall not be liable for any indirect, incidental, or consequential damages arising from your use of this website or participation in our events or services. Our total liability to you shall not exceed the amount you paid to us, if any.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>8. Links to Third-Party Websites</h2>
          <p>
            Our website may contain links to third-party websites for your convenience. We are not responsible for the content, accuracy, or privacy practices of those websites. Visiting them is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>9. Governing Law</h2>
          <p>
            These Terms and Conditions are governed by the laws of Ireland. Any disputes shall be subject to the exclusive jurisdiction of the courts of Ireland.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>10. Changes to These Terms</h2>
          <p>
            We may update these Terms and Conditions at any time. Continued use of the website after changes are posted constitutes acceptance of the new terms. For questions, contact us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>.
          </p>
        </section>

      </div>
    </div>
  )
}
