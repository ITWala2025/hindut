import { CurrencyCircleDollar } from '@phosphor-icons/react'

export function RefundPolicyPage() {
  return (
    <div className="flex flex-col pt-32 pb-24">
      <div className="bg-linear-to-br from-orange-600 via-amber-600 to-orange-700 py-16 px-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <CurrencyCircleDollar size={30} weight="bold" className="text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Refund Policy
        </h1>
        <p className="text-white/80 text-lg">Last updated: May 2026</p>
      </div>

      <div className="container mx-auto px-6 md:px-12 lg:px-32 max-w-4xl py-16 space-y-10 text-orange-900/80 leading-relaxed">

        <div className="rounded-xl border border-orange-300 bg-orange-50 p-5">
          <p className="font-medium text-orange-800">
            ℹ️ This Refund Policy applies only to <strong>paid events</strong> organised by the Hindu Association of Ireland. Free events, membership fees, and voluntary donations are not covered by this policy.
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>1. Overview</h2>
          <p>
            The Hindu Association of Ireland (HAI) understands that circumstances can change. Where you have paid to attend one of our events, we aim to be fair and transparent about when and how refunds are issued.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>2. Eligible Refunds</h2>
          <p className="mb-3">You may be entitled to a full or partial refund in the following circumstances:</p>

          <div className="space-y-4">
            <div className="rounded-xl border border-orange-200 bg-white/60 p-5">
              <h3 className="font-semibold text-orange-800 mb-1">Cancelled by HAI</h3>
              <p className="text-sm">
                If HAI cancels an event for any reason, you will receive a <strong>full refund</strong> of the ticket price paid. We will contact you using the email address provided at registration.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-white/60 p-5">
              <h3 className="font-semibold text-orange-800 mb-1">Rescheduled Events</h3>
              <p className="text-sm">
                If an event is rescheduled and you cannot attend the new date, you may request a full refund within <strong>7 days</strong> of receiving notification of the rescheduled date.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-white/60 p-5">
              <h3 className="font-semibold text-orange-800 mb-1">Cancellation by Attendee — More Than 14 Days Before the Event</h3>
              <p className="text-sm">
                If you cancel your booking <strong>14 or more days</strong> before the event date, you are entitled to a <strong>full refund</strong> minus any non-recoverable processing fees charged by our payment provider.
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-white/60 p-5">
              <h3 className="font-semibold text-orange-800 mb-1">Cancellation by Attendee — 7 to 13 Days Before the Event</h3>
              <p className="text-sm">
                If you cancel between <strong>7 and 13 days</strong> before the event, you are entitled to a <strong>50% refund</strong> of the ticket price.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>3. Non-Refundable Situations</h2>
          <p className="mb-3">Refunds will <strong>not</strong> be issued in the following cases:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Cancellations made <strong>less than 7 days</strong> before the event.</li>
            <li>No-shows — failure to attend the event without prior cancellation.</li>
            <li>Partial attendance or early departure from an event.</li>
            <li>Dissatisfaction with the event content, unless HAI determines otherwise at its sole discretion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>4. How to Request a Refund</h2>
          <p className="mb-3">To request a refund, please email us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>{' '}with the following information:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Your full name and email address used at registration.</li>
            <li>The name and date of the event.</li>
            <li>Your reason for requesting a refund.</li>
            <li>Proof of payment (e.g. booking confirmation or receipt).</li>
          </ul>
          <p className="mt-3">We will acknowledge your request within <strong>3 working days</strong> and aim to process eligible refunds within <strong>10 working days</strong>.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>5. Refund Method</h2>
          <p>
            Refunds will be issued to the original payment method used at the time of purchase. We are unable to issue refunds to a different card or account. Processing times may vary depending on your bank or payment provider.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>6. Exceptional Circumstances</h2>
          <p>
            HAI recognises that exceptional personal circumstances (such as bereavement or serious illness) may arise. Such cases will be considered individually and compassionately. Please contact us as early as possible if you are affected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-orange-800 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>7. Contact Us</h2>
          <p>
            For any questions about this Refund Policy, please contact us at{' '}
            <a href="mailto:hinduassociationireland@gmail.com" className="text-orange-600 underline">
              hinduassociationireland@gmail.com
            </a>{' '}or call us on <span className="font-medium">(087) 495 3334</span>.
          </p>
        </section>

      </div>
    </div>
  )
}
