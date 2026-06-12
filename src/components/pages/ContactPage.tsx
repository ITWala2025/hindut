import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MapPin, Phone, Envelope, ArrowDown, InstagramLogo, FacebookLogo, TwitterLogo } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'
import { SeoMeta } from '@/lib/seo'

type ContactTarget = 'address' | 'phone' | 'email' | 'form'

const CONTACT_PILLS: { id: ContactTarget; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'form', label: 'Send message' },
]

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [highlightedId, setHighlightedId] = useState<ContactTarget | null>(null)

  const scrollToContact = (id: ContactTarget) => {
    const el = document.getElementById(`contact-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(id)
    window.setTimeout(
      () => setHighlightedId((cur) => (cur === id ? null : cur)),
      1800,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.subject) {
      toast.error('Please enter a subject')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/.netlify/functions/contact-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      toast.success('Thank you for your message! We will get back to you soon.')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (error) {
      console.error('Contact form error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col overflow-x-hidden">
      <SeoMeta
        title="Contact Us — Get in Touch"
        description="Contact the Hindu Association of Ireland. Find our address in Limerick, phone number, email, or send us a message to connect with our community."
        canonical="/contact"
      />
      <HeroCarousel
        title="Contact Us"
        subtitle="We'd love to hear from you. Reach out with any questions or visit us in person."
      >
        {/* Quick-jump pills: each chip scrolls to a contact method or the
            message form below and briefly highlights it. */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm uppercase tracking-[0.2em] text-white/85">Follow Us</p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/hindu_association_of_ireland/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90 hover:shadow-lg"
                style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
              >
                <InstagramLogo size={20} weight="bold" />
              </a>
              <a
                href="https://www.facebook.com/HinduAssociation.Ireland/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: '#1877F2' }}
              >
                <FacebookLogo size={20} weight="bold" />
              </a>
              <a
                href="https://x.com/HinduAssocIRL"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: '#1DA1F2' }}
              >
                <TwitterLogo size={20} weight="bold" />
              </a>
            </div>
          </div>
        </div>
      </HeroCarousel>

      <section className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-6">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Get In Touch
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We're here to help. Reach out with any questions or visit us in person.
                </p>
              </div>

              <div className="space-y-4">
                <Card id="contact-address" className={cn('scroll-mt-32 border-l-4 border-l-orange-500 hover-glow-saffron bg-white/80 backdrop-blur-sm hover:scale-[1.02] transition-all', highlightedId === 'address' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-orange-100 p-3 glow-saffron">
                        <MapPin className="text-orange-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1 text-orange-800">Address</h3>
                        <p className="text-muted-foreground">
                          4 Upper Denmark Street<br />
                          Co. Limerick<br />
                          Ireland
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="contact-phone" className={cn('scroll-mt-32 border-l-4 border-l-orange-500 hover-glow-saffron bg-white/80 backdrop-blur-sm hover:scale-[1.02] transition-all', highlightedId === 'phone' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-orange-100 p-3 glow-saffron">
                        <Phone className="text-orange-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1 text-orange-800">Phone</h3>
                        <p className="text-muted-foreground">
                          +353 87 495 3334<br />
                          (available 9am - 6pm, Mon-Fri)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="contact-email" className={cn('scroll-mt-32 border-l-4 border-l-orange-500 hover-glow-saffron bg-white/80 backdrop-blur-sm hover:scale-[1.02] transition-all', highlightedId === 'email' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-orange-100 p-3 glow-saffron">
                        <Envelope className="text-orange-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1 text-orange-800">Email</h3>
                        <p className="text-muted-foreground break-all">
                          info@hindutemple.ie<br />
                          hinduassociationireland@gmail.com
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </div>
            </div>

            <div className="lg:col-span-3">
              <Card id="contact-form" className={cn('scroll-mt-32 border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow', highlightedId === 'form' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
                      <Envelope className="text-orange-600" size={28} weight="duotone" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                        Send us a Message
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">We'll get back to you within 24 hours</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="contact-name" className="text-sm font-semibold mb-2 block">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contact-name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact-email" className="text-sm font-semibold mb-2 block">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact-phone" className="text-sm font-semibold mb-2 block">
                        Phone
                      </Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="(087) 495 3334"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact-subject" className="text-sm font-semibold mb-2 block">
                        Subject
                      </Label>
                      <Input
                        id="contact-subject"
                        type="text"
                        placeholder="What is this regarding?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact-message" className="text-sm font-semibold mb-2 block">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        placeholder="How can we help you?"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-semibold bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Envelope className="mr-2" size={18} weight="duotone" />
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-card">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
              Find Us
            </h2>
            <div className="rounded-xl overflow-hidden aspect-video shadow-md border border-orange-100">
              <iframe
                src="https://maps.google.com/maps?q=4+Upper+Denmark+Street,+Limerick,+Ireland&output=embed&z=16"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Find Us — Hindu Association of Ireland"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Events also held at Pallaskenry Community Centre and Mungret — see the Events page for details.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}