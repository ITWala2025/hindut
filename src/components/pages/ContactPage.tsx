import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MapPin, Phone, Envelope, Clock, ArrowDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'

type ContactTarget = 'address' | 'phone' | 'email' | 'venues' | 'form'

const CONTACT_PILLS: { id: ContactTarget; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'venues', label: 'Venues' },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields')
      return
    }

    toast.success('Thank you for your message! We will get back to you soon.')
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
  }

  return (
    <div className="flex flex-col">
      <HeroCarousel
        title="Contact Us"
        subtitle="We'd love to hear from you. Reach out with any questions or visit us in person."
      >
        {/* Quick-jump pills: each chip scrolls to a contact method or the
            message form below and briefly highlights it. */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-sm uppercase tracking-[0.2em] text-white/85">
            How can we help?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CONTACT_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => scrollToContact(pill.id)}
                className="group inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 hover:shadow-lg"
                aria-label={`Scroll to ${pill.label}`}
              >
                <span>{pill.label}</span>
                <ArrowDown
                  size={14}
                  weight="bold"
                  className="transition-transform group-hover:translate-y-0.5"
                />
              </button>
            ))}
          </div>
        </div>
      </HeroCarousel>

      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50">
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
                          Ahane Hall<br />
                          Ahane, Co. Limerick<br />
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
                          Main Contact: (087) 495 3334<br />
                          WhatsApp available
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
                        <p className="text-muted-foreground">
                          General: hinduassociationireland@gmail.com<br />
                          Membership: hinduassociationireland@gmail.com
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card id="contact-venues" className={cn('scroll-mt-32 border-l-4 border-l-orange-500 hover-glow-saffron bg-white/80 backdrop-blur-sm hover:scale-[1.02] transition-all', highlightedId === 'venues' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-orange-100 p-3 glow-saffron">
                        <Clock className="text-orange-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1 text-orange-800">Event Venues</h3>
                        <div className="text-muted-foreground space-y-1">
                          <p><span className="font-medium text-orange-800">Primary:</span> Ahane Hall, Co. Limerick</p>
                          <p className="text-sm">Also at Pallaskenry Community Centre</p>
                          <p className="text-sm">And Mungret Community Centre</p>
                        </div>
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
                    <div className="rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
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
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron hover:scale-[1.02] transition-all"
                    >
                      <Envelope className="mr-2" size={18} weight="duotone" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
              Find Us
            </h2>
            <div className="bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="mx-auto text-muted-foreground" size={48} />
                <p className="text-muted-foreground">Ahane Hall, Co. Limerick, Ireland</p>
                <p className="text-sm text-muted-foreground">Our primary event venue</p>
              </div>
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