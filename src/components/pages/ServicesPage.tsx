import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { HandsPrayingIcon, CalendarBlankIcon, GraduationCapIcon, UsersIcon } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { useServices } from '@/hooks/useServices'
import { useServiceCategories } from '@/hooks/useServiceCategories'
import type { ServiceRecord } from '@/lib/types'
import { SeoMeta } from '@/lib/seo'

const CATEGORY_ICONS: PhosphorIcon[] = [HandsPrayingIcon, CalendarBlankIcon, GraduationCapIcon, UsersIcon]
function getCategoryIcon(index: number): PhosphorIcon {
  return CATEGORY_ICONS[index % CATEGORY_ICONS.length]
}

function ServiceCardSkeleton() {
  return (
    <div className="rounded-xl border border-orange-100 bg-white/80 p-5 space-y-3 animate-pulse">
      <div className="h-5 bg-orange-100 rounded w-2/3" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-5/6" />
    </div>
  )
}

export function ServicesPage() {
  const [activeTab, setActiveTab] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null)
  const { services, loading: servicesLoading } = useServices()
  const { categories, loading: categoriesLoading } = useServiceCategories()

  const loading = servicesLoading || categoriesLoading

  const publishedServices = useMemo(
    () => services.filter((s) => s.published).sort((a, b) => a.sortOrder - b.sortOrder),
    [services],
  )

  const categorizedServices = useMemo(
    () =>
      categories.map((cat) => ({
        category: cat,
        items: publishedServices.filter((s) => s.category === cat.name),
      })),
    [categories, publishedServices],
  )

  const effectiveTab = activeTab || categories[0]?.name || ''

  return (
    <div className="flex flex-col">
      <SeoMeta
        title="Temple Services — Puja, Yoga & Cultural Programs"
        description="Explore sacred services at the Hindu Association of Ireland — daily puja, havan ceremonies, yoga classes, Vedic education and community programs in Limerick."
        canonical="/services"
      />
      <HeroCarousel
        title="Temple Services"
        subtitle="Spiritual services, educational programs, and community events for all"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6">
          {categories.map((cat, i) => {
            const Icon = getCategoryIcon(i)
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.name)
                  document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="group relative px-4 sm:px-5 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:shadow-orange-400/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
              >
                <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <span className="relative flex items-center justify-center gap-2">
                  <Icon size={18} weight="duotone" className="hidden sm:block" />
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>
      </HeroCarousel>

      <section id="services-tabs" className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          {categories.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-16">No service categories yet.</p>
          ) : (
            <Tabs value={effectiveTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
              <TabsList
                className="grid w-full mb-12 h-auto p-2 bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200"
                style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))` }}
              >
                {categories.map((cat, i) => {
                  const Icon = getCategoryIcon(i)
                  return (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.name}
                      className="text-sm md:text-base data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-3 font-semibold"
                    >
                      <Icon className="mr-2 hidden sm:inline" size={20} weight="duotone" />
                      {cat.name}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {categorizedServices.map((group) => (
                <TabsContent key={group.category.id} value={group.category.name} className="space-y-8">
                  <div className="text-center mb-8">
                    <h2
                      className="text-3xl font-bold mb-3 text-orange-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {group.category.name}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => <ServiceCardSkeleton key={i} />)
                      : group.items.length === 0
                        ? (
                          <p className="col-span-2 text-center text-muted-foreground py-12">
                            No services in this category yet.
                          </p>
                        )
                        : group.items.map((s: ServiceRecord) => (
                          <Card
                            key={s.id}
                            onClick={() => setSelectedService(s)}
                            className="border-l-4 border-l-orange-500 hover:shadow-xl hover:scale-[1.02] transition-all bg-white/80 backdrop-blur-sm hover-glow-saffron cursor-pointer"
                          >
                            <CardHeader>
                              <CardTitle
                                className="text-orange-800"
                                style={{ fontFamily: 'var(--font-heading)' }}
                              >
                                {s.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {s.imageUrl && (
                                <img
                                  src={s.imageUrl}
                                  alt={s.title}
                                  className="w-full h-36 object-cover rounded-lg"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              <p className="text-muted-foreground">{s.excerpt}</p>
                            </CardContent>
                          </Card>
                        ))
                    }
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </section>

      <section className="py-8 md:py-12 bg-linear-to-br from-orange-700 via-amber-600 to-orange-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,237,213,0.25),transparent_70%)]" />
        <div className="container mx-auto px-6 md:px-12 lg:px-24 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2
              className="text-3xl md:text-4xl font-bold text-white text-glow-saffron"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Book a Service
            </h2>
            <p className="text-lg text-white/95 leading-relaxed">
              To book any of our special services or get more information about our programs, please contact our office
              at <span className="font-semibold text-white">(087) 495 3334</span> or email us at{' '}
              <span className="font-semibold text-white">hinduassociationireland@gmail.com</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a
                href="tel:+353874953334"
                className="inline-flex items-center justify-center bg-white text-orange-700 hover:bg-orange-50 px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105 hover-glow-saffron"
              >
                Call Us Now
              </a>
              <a
                href="mailto:hinduassociationireland@gmail.com"
                className="inline-flex items-center justify-center border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-orange-700 px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105 hover-glow-saffron"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Service Detail Modal ── */}
      <Dialog open={!!selectedService} onOpenChange={(open) => { if (!open) setSelectedService(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedService && (
            <>
              {selectedService.imageUrl && (
                <div className="relative">
                  <img
                    src={selectedService.imageUrl}
                    alt={selectedService.title}
                    className="w-full h-56 object-cover rounded-t-xl"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent rounded-t-xl" />
                </div>
              )}
              <div className="p-6 space-y-4">
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        {selectedService.category}
                      </span>
                      <DialogTitle
                        className="text-2xl font-bold text-orange-800 mt-1"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {selectedService.title}
                      </DialogTitle>
                    </div>
                  </div>
                  {selectedService.excerpt && (
                    <DialogDescription className="text-base text-muted-foreground leading-relaxed pt-1">
                      {selectedService.excerpt}
                    </DialogDescription>
                  )}
                </DialogHeader>
                {selectedService.content && (
                  <div
                    className="rich-content text-sm leading-relaxed pt-2 border-t border-orange-100"
                    dangerouslySetInnerHTML={{ __html: selectedService.content }}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
