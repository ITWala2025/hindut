import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HandsPraying, CalendarBlank, GraduationCap, Users } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { useState } from 'react'

export function ServicesPage() {
  const [activeTab, setActiveTab] = useState('daily')
  const dailyServices = [
    {
      name: 'Mangala Aarti',
      time: '6:00 AM',
      description: 'Early morning worship to awaken the deity with sacred chants and offerings'
    },
    {
      name: 'Shringar Darshan',
      time: '8:00 AM - 12:00 PM',
      description: 'Morning darshan when the deity is adorned in beautiful decorations'
    },
    {
      name: 'Bhog Aarti',
      time: '12:30 PM',
      description: 'Midday offering of prasadam to the deity'
    },
    {
      name: 'Sandhya Aarti',
      time: '7:00 PM',
      description: 'Evening lamp ceremony with devotional singing'
    },
    {
      name: 'Shayan Aarti',
      time: '8:30 PM',
      description: 'Final aarti of the day before the deity retires for rest'
    }
  ]

  const specialServices = [
    {
      title: 'Abhishekam',
      description: 'Sacred bathing ceremony of the deity with milk, honey, ghee, and sacred waters. Can be performed for special occasions or personal celebrations.',
      duration: '1 hour',
      availability: 'By appointment'
    },
    {
      title: 'Havan/Homam',
      description: 'Vedic fire ceremony for specific purposes such as health, prosperity, peace, or special life events. Various types available including Ganapati Homam, Navagraha Homam, and more.',
      duration: '2-3 hours',
      availability: 'Weekends & special occasions'
    },
    {
      title: 'Satyanarayana Puja',
      description: 'A comprehensive worship ceremony invoking Lord Vishnu for blessings, typically performed on full moon days or special occasions.',
      duration: '2 hours',
      availability: 'Monthly & by request'
    },
    {
      title: 'Wedding Ceremonies',
      description: 'Traditional Hindu wedding ceremonies conducted by experienced priests according to Vedic traditions. Full ceremony with all rituals included.',
      duration: '3-4 hours',
      availability: 'By appointment'
    },
    {
      title: 'Naming Ceremony (Namakarana)',
      description: 'Traditional baby naming ceremony with Vedic rituals to bless the newborn with a sacred name.',
      duration: '1.5 hours',
      availability: 'By appointment'
    },
    {
      title: 'Thread Ceremony (Upanayana)',
      description: 'Sacred thread ceremony marking the beginning of spiritual education for young boys.',
      duration: '3 hours',
      availability: 'By appointment'
    }
  ]

  const educationPrograms = [
    {
      title: 'Sunday School',
      description: 'Children\'s classes teaching Hindu values, scriptures, and Sanskrit through engaging activities',
      schedule: 'Every Sunday, 9:00 AM - 11:00 AM',
      ageGroup: 'Ages 5-16'
    },
    {
      title: 'Bhagavad Gita Study Circle',
      description: 'Weekly discussion group exploring the timeless wisdom of the Bhagavad Gita',
      schedule: 'Thursdays, 7:00 PM - 8:30 PM',
      ageGroup: 'Adults'
    },
    {
      title: 'Sanskrit Classes',
      description: 'Learn to read, write, and understand Sanskrit, the sacred language of ancient texts',
      schedule: 'Saturdays, 10:00 AM - 12:00 PM',
      ageGroup: 'All ages (separate batches)'
    },
    {
      title: 'Yoga & Meditation',
      description: 'Traditional yoga asanas and meditation techniques for physical and spiritual wellbeing',
      schedule: 'Tuesday & Thursday, 6:30 AM - 7:30 AM',
      ageGroup: 'Adults'
    },
    {
      title: 'Vedic Chanting',
      description: 'Learn proper pronunciation and chanting of sacred Vedic mantras and shlokas',
      schedule: 'Wednesdays, 7:00 PM - 8:00 PM',
      ageGroup: 'All ages'
    }
  ]

  const communityEvents = [
    {
      title: 'Monthly Satsang',
      description: 'Spiritual gathering with devotional singing, discourses, and community dinner',
      frequency: 'First Saturday of every month'
    },
    {
      title: 'Cultural Celebrations',
      description: 'Grand celebrations of major festivals including Diwali, Holi, Janmashtami, Navaratri, and more',
      frequency: 'Throughout the year'
    },
    {
      title: 'Annadanam (Free Meals)',
      description: 'Free vegetarian meals served to all visitors on special occasions',
      frequency: 'Weekly on Sundays'
    },
    {
      title: 'Senior Citizens Gathering',
      description: 'Monthly social gathering for senior community members with spiritual activities',
      frequency: 'Third Thursday of every month'
    }
  ]

  return (
    <div className="flex flex-col">
      <HeroCarousel
        title="Temple Services"
        subtitle="Spiritual services, educational programs, and community events for all"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6">
          <button
            onClick={() => {
              setActiveTab('daily')
              document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group relative px-4 sm:px-5 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:shadow-orange-400/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              <HandsPraying size={18} weight="duotone" className="hidden sm:block" />
              Daily Pujas
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('special')
              document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group relative px-4 sm:px-5 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:shadow-orange-400/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              <CalendarBlank size={18} weight="duotone" className="hidden sm:block" />
              Special
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('education')
              document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group relative px-4 sm:px-5 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:shadow-orange-400/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              <GraduationCap size={18} weight="duotone" className="hidden sm:block" />
              Education
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('community')
              document.getElementById('services-tabs')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="group relative px-4 sm:px-5 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xs sm:text-sm shadow-lg hover:shadow-orange-400/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center justify-center gap-2">
              <Users size={18} weight="duotone" className="hidden sm:block" />
              Community
            </span>
          </button>
        </div>
      </HeroCarousel>

      <section id="services-tabs" className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-12 h-auto p-2 bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200">
              <TabsTrigger id="daily-tab" value="daily" className="text-sm md:text-base data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-3 font-semibold">
                <HandsPraying className="mr-2 hidden sm:inline" size={20} weight="duotone" />
                Daily Pujas
              </TabsTrigger>
              <TabsTrigger id="special-tab" value="special" className="text-sm md:text-base data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-3 font-semibold">
                <CalendarBlank className="mr-2 hidden sm:inline" size={20} weight="duotone" />
                Special Services
              </TabsTrigger>
              <TabsTrigger id="education-tab" value="education" className="text-sm md:text-base data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-3 font-semibold">
                <GraduationCap className="mr-2 hidden sm:inline" size={20} weight="duotone" />
                Education
              </TabsTrigger>
              <TabsTrigger id="community-tab" value="community" className="text-sm md:text-base data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-3 font-semibold">
                <Users className="mr-2 hidden sm:inline" size={20} weight="duotone" />
                Community
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                  Daily Worship Schedule
                </h2>
                <p className="text-muted-foreground">
                  Join us for our regular daily pujas and aartis
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dailyServices.map((service) => (
                  <Card key={service.name} className="border-l-4 border-l-orange-500 hover-glow-saffron">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>{service.name}</CardTitle>
                        <span className="text-sm font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full glow-saffron">
                          {service.time}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="special" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Special Ceremonies & Rituals
                </h2>
                <p className="text-muted-foreground">
                  Book personalized pujas for special occasions and life events
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specialServices.map((service) => (
                  <Card key={service.title} className="border-orange-200/50 hover:shadow-xl hover:scale-[1.02] transition-all bg-white/80 backdrop-blur-sm hover-glow-saffron">
                    <CardHeader>
                      <CardTitle className="text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{service.description}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                          <span className="font-semibold">Duration:</span> {service.duration}
                        </span>
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                          {service.availability}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="education" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Educational Programs
                </h2>
                <p className="text-muted-foreground">
                  Learn about Hindu philosophy, scriptures, and spiritual practices
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {educationPrograms.map((program) => (
                  <Card key={program.title} className="border-orange-200/50 hover:shadow-xl hover:scale-[1.02] transition-all bg-white/80 backdrop-blur-sm hover-glow-saffron">
                    <CardHeader>
                      <CardTitle className="text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>{program.title}</CardTitle>
                      <CardDescription className="text-base">{program.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded-lg">
                        <CalendarBlank className="text-orange-600" size={18} weight="duotone" />
                        <span className="font-medium text-orange-800">{program.schedule}</span>
                      </div>
                      <div className="bg-linear-to-r from-orange-100 to-amber-100 text-orange-700 px-3 py-1 rounded-full inline-block text-sm font-semibold">
                        {program.ageGroup}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="community" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Community Events
                </h2>
                <p className="text-muted-foreground">
                  Connect with fellow devotees through our community programs
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {communityEvents.map((event) => (
                  <Card key={event.title} className="border-l-4 border-l-orange-500 hover:shadow-xl hover:scale-[1.02] transition-all bg-white/80 backdrop-blur-sm hover-glow-saffron">
                    <CardHeader>
                      <CardTitle className="text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>{event.title}</CardTitle>
                      <CardDescription className="text-base">{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-linear-to-r from-amber-100 to-orange-100 text-orange-700 px-3 py-1 rounded-full inline-block text-sm font-semibold">
                        {event.frequency}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-linear-to-br from-orange-700 via-amber-600 to-orange-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,237,213,0.25),transparent_70%)]" />
        <div className="container mx-auto px-6 md:px-12 lg:px-24 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-glow-saffron" style={{ fontFamily: 'var(--font-heading)' }}>
              Book a Service
            </h2>
            <p className="text-lg text-white/95 leading-relaxed">
              To book any of our special services or get more information about our programs, please contact our office
              at <span className="font-semibold text-white">(087) 495 3334</span> or email us at{' '}
              <span className="font-semibold text-white">hinduassociationireland@gmail.com</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a href="tel:+353874953334" className="inline-flex items-center justify-center bg-white text-orange-700 hover:bg-orange-50 px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105 hover-glow-saffron">
                Call Us Now
              </a>
              <a href="mailto:hinduassociationireland@gmail.com" className="inline-flex items-center justify-center border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-orange-700 px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105 hover-glow-saffron">
                Send Email
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}