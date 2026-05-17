import { MapPin, Phone, Envelope, Clock, InstagramLogo, FacebookLogo, TwitterLogo } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  return (
    <footer className="border-t border-orange-200/40 bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 shadow-inner shadow-orange-200/50">
      <div className="container mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 glow-saffron">
                <span className="text-xl font-bold text-white">ॐ</span>
              </div>
              <span className="text-lg font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Hindu Temple
              </span>
            </div>
            <p className="text-sm text-orange-700/80 leading-relaxed">
              Hindu Association of Ireland (HAI) — a united platform working to
              establish a permanent Hindu Temple in Limerick to serve as a spiritual,
              cultural and community hub.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.instagram.com/hindu_association_of_ireland/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90"
                style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
              >
                <InstagramLogo size={18} weight="bold" />
              </a>
              <a
                href="https://www.facebook.com/HinduAssociation.Ireland/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90"
                style={{ backgroundColor: '#1877F2' }}
              >
                <FacebookLogo size={18} weight="bold" />
              </a>
              <a
                href="https://x.com/HinduAssocIRL"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-110 hover:opacity-90"
                style={{ backgroundColor: '#1DA1F2' }}
              >
                <TwitterLogo size={18} weight="bold" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-orange-800">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { label: 'Home', target: '/' },
                { label: 'About Us', target: '/about' },
                { label: 'Services', target: '/services' },
                { label: 'Events', target: '/events' },
                { label: 'Membership', target: '/membership' },
                { label: 'Contact', target: '/contact' },
              ].map((item) => (
                <li key={item.target}>
                  <Link
                    to={item.target}
                    className="text-sm text-orange-700/80 hover:text-orange-600 transition-all hover:translate-x-1 inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-orange-800">Temple Hours</h3>
            <div className="space-y-2 text-sm text-orange-700/80">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 flex-shrink-0 text-orange-600" size={16} />
                <div>
                  <p className="font-medium text-orange-800">Morning Darshan</p>
                  <p>6:00 AM - 12:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 flex-shrink-0 text-orange-600" size={16} />
                <div>
                  <p className="font-medium text-orange-800">Evening Darshan</p>
                  <p>5:00 PM - 9:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-orange-800">Contact Info</h3>
            <ul className="space-y-3 text-sm text-orange-700/80">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 flex-shrink-0 text-orange-600" size={16} />
                <span>4 Denmark Street, Co. Limerick, Ireland</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="flex-shrink-0 text-orange-600" size={16} />
                <span>(087) 495 3334</span>
              </li>
              <li className="flex items-center gap-2">
                <Envelope className="flex-shrink-0 text-orange-600" size={16} />
                <span>info@hindutemple.ie</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-orange-300/50" />

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-orange-600/70 mb-6">
          {[
            { label: 'Privacy Policy', to: '/privacy-policy' },
            { label: 'Cookies Policy', to: '/cookies-policy' },
            { label: 'Terms & Conditions', to: '/terms-and-conditions' },
            { label: 'Refund Policy', to: '/refund-policy' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hover:text-orange-600 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-orange-700/80">
          <p>© {new Date().getFullYear()} Hindu Association of Ireland. All rights reserved.</p>
          <p className="text-center">Built with devotion and care by <a href="https://it-wala.com" className="hover:text-orange-600 transition-colors">IT Wala</a></p>
        </div>
      </div>
    </footer>
  )
}