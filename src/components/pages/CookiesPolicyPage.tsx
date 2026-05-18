import { Cookie } from '@phosphor-icons/react'

export function CookiesPolicyPage() {
  return (
    <div className="flex flex-col pt-32 pb-24">
      <div className="bg-linear-to-br from-orange-600 via-amber-600 to-orange-700 py-16 px-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Cookie size={30} weight="bold" className="text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Cookies Policy
        </h1>
        <p className="text-white/80 text-lg">Last updated: May 2026</p>
      </div>

      <div className="container mx-auto px-6 md:px-12 lg:px-32 max-w-4xl py-16 space-y-10 text-orange-900/80 leading-relaxed">

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files placed on your device when you visit a website. They help the website function correctly, remember your preferences, and collect analytics information. Cookies cannot execute programs or deliver viruses to your device.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. How We Use Cookies</h2>
          <p>
            The Hindu Association of Ireland website uses cookies to ensure a smooth browsing experience and to understand how visitors use our site so we can continue to improve it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Types of Cookies We Use</h2>

          <div className="space-y-6 mt-4">
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
              <h3 className="font-semibold text-orange-800 text-lg mb-2">Strictly Necessary Cookies</h3>
              <p className="text-sm">
                These cookies are essential for the website to function and cannot be switched off. They are usually set in response to actions you take, such as setting your privacy preferences, logging in, or filling in forms. You can set your browser to block these cookies, but some parts of the site may not work as a result.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
              <h3 className="font-semibold text-orange-800 text-lg mb-2">Preference Cookies</h3>
              <p className="text-sm">
                These cookies enable the website to remember choices you make (such as language or region) and provide enhanced, more personalised features. They may be set by us or by third-party providers whose services we use.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
              <h3 className="font-semibold text-orange-800 text-lg mb-2">Analytics Cookies</h3>
              <p className="text-sm">
                These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us understand which pages are most popular. All information collected by these cookies is aggregated and therefore anonymous.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. Third-Party Cookies</h2>
          <p>
            Some pages on our website may include content from third-party services (such as embedded maps or social media widgets) which may set their own cookies. We do not control these cookies. Please refer to the relevant third party's privacy and cookies policies for more information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Managing Cookies</h2>
          <p className="mb-3">
            You can control and manage cookies in several ways. Most web browsers allow you to refuse or accept cookies through the browser settings. For guidance, refer to your browser's help documentation:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
            <li>Chrome: Settings → Privacy and security → Cookies and other site data</li>
            <li>Firefox: Options → Privacy & Security → Cookies and Site Data</li>
            <li>Safari: Preferences → Privacy → Manage Website Data</li>
            <li>Edge: Settings → Cookies and site permissions</li>
          </ul>
          <p className="mt-3">
            Please note that blocking or deleting cookies may affect your experience on this website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Changes to This Policy</h2>
          <p>
            We may update this Cookies Policy from time to time. Any changes will be published on this page with a revised date. If you have questions about our use of cookies, please contact us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>.
          </p>
        </section>

      </div>
    </div>
  )
}
