-- =============================================================================
-- Migration: 20260518000025_seed_services.sql
-- Purpose : Seed all individual services from ServicesPage.tsx hardcoded data.
--           Each service belongs to one of four categories:
--             'Daily Pujas' | 'Special Ceremonies' | 'Education Programs' | 'Community Programs'
-- Run AFTER 20260518000026_create_service_categories.sql (requires service_categories to exist)
-- =============================================================================

INSERT INTO public.services (title, slug, category_id, excerpt, content, published, sort_order) VALUES

-- ─────────────────────────────────────────────────────────
-- CATEGORY: Daily Pujas
-- ─────────────────────────────────────────────────────────
(
  'Mangala Aarti',
  'mangala-aarti',
  (SELECT id FROM public.service_categories WHERE name = 'Daily Pujas'),
  'Early morning worship to awaken the deity with sacred chants and offerings.',
  '<p>Mangala Aarti is the first puja of the day, performed at the auspicious hour of dawn to awaken the presiding deity with sacred Vedic chants, bells and offerings of incense and light.</p>
<ul>
  <li><strong>Time:</strong> 6:00 AM daily</li>
  <li><strong>Duration:</strong> Approximately 30 minutes</li>
</ul>
<p>All devotees are welcome to attend and participate in this serene morning ritual.</p>',
  true, 1
),
(
  'Shringar Darshan',
  'shringar-darshan',
  (SELECT id FROM public.service_categories WHERE name = 'Daily Pujas'),
  'Morning darshan when the deity is adorned in beautiful decorations.',
  '<p>During Shringar Darshan, the presiding deity is dressed in elaborate traditional garments and adorned with flowers, jewellery and fine decorations. Devotees can take darshan and offer their prayers during this period.</p>
<ul>
  <li><strong>Time:</strong> 8:00 AM – 12:00 PM daily</li>
</ul>
<p>This is the longest darshan window of the day and is ideal for families and working devotees to visit the temple.</p>',
  true, 2
),
(
  'Bhog Aarti',
  'bhog-aarti',
  (SELECT id FROM public.service_categories WHERE name = 'Daily Pujas'),
  'Midday offering of prasadam to the deity.',
  '<p>Bhog Aarti is the midday ritual in which prepared food offerings (prasadam) are presented to the deity with great reverence before being distributed to devotees.</p>
<ul>
  <li><strong>Time:</strong> 12:30 PM daily</li>
  <li><strong>Duration:</strong> Approximately 20 minutes</li>
</ul>',
  true, 3
),
(
  'Sandhya Aarti',
  'sandhya-aarti',
  (SELECT id FROM public.service_categories WHERE name = 'Daily Pujas'),
  'Evening lamp ceremony with devotional singing.',
  '<p>Sandhya Aarti is the atmospheric evening worship ceremony performed at dusk. Lamps are lit, conches are blown and the community joins together in devotional singing (bhajans) to welcome the evening hours.</p>
<ul>
  <li><strong>Time:</strong> 7:00 PM daily</li>
  <li><strong>Duration:</strong> Approximately 30–45 minutes</li>
</ul>
<p>This is one of the most popular services and is a wonderful opportunity for group devotion.</p>',
  true, 4
),
(
  'Shayan Aarti',
  'shayan-aarti',
  (SELECT id FROM public.service_categories WHERE name = 'Daily Pujas'),
  'Final aarti of the day before the deity retires for rest.',
  '<p>Shayan Aarti is the last puja of the day, performed to bid the deity goodnight. Soft hymns and gentle lamp offerings mark the close of the temple''s daily worship schedule.</p>
<ul>
  <li><strong>Time:</strong> 8:30 PM daily</li>
  <li><strong>Duration:</strong> Approximately 15 minutes</li>
</ul>',
  true, 5
),

-- ─────────────────────────────────────────────────────────
-- CATEGORY: Special Ceremonies
-- ─────────────────────────────────────────────────────────
(
  'Abhishekam',
  'abhishekam',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'Sacred bathing ceremony of the deity with milk, honey, ghee and sacred waters.',
  '<p>Abhishekam is a deeply purifying and auspicious ceremony in which the deity is ritually bathed with a sequence of sacred substances — milk, curds, honey, ghee, rose water and sacred river water — accompanied by continuous Vedic chanting.</p>
<p>Abhishekam can be sponsored by devotees for personal occasions such as birthdays, anniversaries, recovery from illness, or as an act of general devotion.</p>
<ul>
  <li><strong>Duration:</strong> Approximately 1 hour</li>
  <li><strong>Availability:</strong> By appointment</li>
</ul>
<p>Please contact the temple office to schedule your Abhishekam.</p>',
  true, 10
),
(
  'Havan / Homam',
  'havan-homam',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'Vedic fire ceremony for health, prosperity, peace or special life events.',
  '<p>A Havan (or Homam) is a sacred Vedic fire ritual in which offerings are made into consecrated fire accompanied by the chanting of specific mantras. Different types of Homam invoke different blessings:</p>
<ul>
  <li><strong>Ganapati Homam</strong> — for removal of obstacles and new beginnings</li>
  <li><strong>Navagraha Homam</strong> — for planetary harmony and wellbeing</li>
  <li><strong>Maha Mrityunjaya Homam</strong> — for health and protection</li>
  <li><strong>Lakshmi Homam</strong> — for prosperity and abundance</li>
  <li><strong>Ayush Homam</strong> — for longevity and good health</li>
</ul>
<ul>
  <li><strong>Duration:</strong> 2–3 hours</li>
  <li><strong>Availability:</strong> Weekends &amp; special occasions</li>
</ul>',
  true, 11
),
(
  'Satyanarayana Puja',
  'satyanarayana-puja',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'A comprehensive worship ceremony invoking Lord Vishnu for blessings.',
  '<p>Sri Satyanarayana Puja is a comprehensive Vaishnava puja performed in honour of Lord Vishnu in his aspect as Satyanarayana — the Lord of Truth. It is traditionally performed on full moon days and is widely observed for family wellbeing, prosperity and fulfilment of wishes.</p>
<p>The puja includes the reading of the Satyanarayana Katha (sacred story) and distribution of prasadam to all attendees.</p>
<ul>
  <li><strong>Duration:</strong> Approximately 2 hours</li>
  <li><strong>Availability:</strong> Monthly on the full moon &amp; by special request</li>
</ul>',
  true, 12
),
(
  'Wedding Ceremonies',
  'wedding-ceremonies',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'Traditional Hindu wedding ceremonies conducted by experienced priests according to Vedic traditions.',
  '<p>Our experienced priests conduct full traditional Hindu wedding ceremonies following authentic Vedic rites. All key rituals are included:</p>
<ul>
  <li>Ganesh Puja &amp; Nandi Shradha</li>
  <li>Muhurta (auspicious timing)</li>
  <li>Kanyadaan (giving away of the bride)</li>
  <li>Saptapadi (seven steps)</li>
  <li>Mangalsutra and Sindoor ceremony</li>
  <li>Ashirvaad (blessings)</li>
</ul>
<ul>
  <li><strong>Duration:</strong> 3–4 hours</li>
  <li><strong>Availability:</strong> By appointment — please contact us well in advance to discuss requirements</li>
</ul>',
  true, 13
),
(
  'Naming Ceremony (Namakarana)',
  'namakarana',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'Traditional baby naming ceremony with Vedic rituals to bless the newborn with a sacred name.',
  '<p>Namakarana is one of the sixteen Samskaras (sacred rites of passage) in Hindu tradition. Performed on an auspicious day determined by the child''s birth chart, the ceremony involves Vedic prayers, jyotish consultation for the name''s first syllable, and blessings for the newborn''s health and prosperity.</p>
<ul>
  <li><strong>Duration:</strong> Approximately 1.5 hours</li>
  <li><strong>Availability:</strong> By appointment</li>
</ul>',
  true, 14
),
(
  'Thread Ceremony (Upanayana)',
  'upanayana',
  (SELECT id FROM public.service_categories WHERE name = 'Special Ceremonies'),
  'Sacred thread ceremony marking the beginning of spiritual education for young boys.',
  '<p>Upanayana (also known as the Janeu or Munja ceremony) is the sacred rite of passage in which a young boy receives the sacred thread (yajnopavita) and is initiated into the Brahmacharya stage of life. This ceremony marks his formal entry into spiritual study under a guru.</p>
<ul>
  <li><strong>Duration:</strong> Approximately 3 hours</li>
  <li><strong>Availability:</strong> By appointment on auspicious dates</li>
</ul>
<p>Please contact the temple well in advance to discuss the appropriate date and preparations.</p>',
  true, 15
),

-- ─────────────────────────────────────────────────────────
-- CATEGORY: Education Programs
-- ─────────────────────────────────────────────────────────
(
  'Sunday School',
  'sunday-school',
  (SELECT id FROM public.service_categories WHERE name = 'Education Programs'),
  'Children''s classes teaching Hindu values, scriptures and Sanskrit through engaging activities.',
  '<p>Our Sunday School provides a nurturing and engaging environment for children to learn about Hindu culture, values and scriptures. Classes combine stories, activities, arts &amp; crafts and simple Sanskrit to make learning fun and meaningful.</p>
<h3>What children learn</h3>
<ul>
  <li>Stories from the Ramayana, Mahabharata and Puranas</li>
  <li>Core Hindu values and ethics</li>
  <li>Basic Sanskrit shlokas and their meanings</li>
  <li>Introduction to major festivals and their significance</li>
  <li>Bhajans and devotional songs</li>
</ul>
<ul>
  <li><strong>Schedule:</strong> Every Sunday, 9:00 AM – 11:00 AM</li>
  <li><strong>Age Group:</strong> Ages 5–16 (classes split by age group)</li>
</ul>',
  true, 20
),
(
  'Bhagavad Gita Study Circle',
  'bhagavad-gita-study-circle',
  (SELECT id FROM public.service_categories WHERE name = 'Education Programs'),
  'Weekly discussion group exploring the timeless wisdom of the Bhagavad Gita.',
  '<p>The Bhagavad Gita Study Circle is a weekly gathering of adults who come together to read, discuss and reflect on the teachings of the Bhagavad Gita. Each session focuses on a few verses with explanation, discussion and practical application to daily life.</p>
<p>No prior knowledge of Sanskrit or the Gita is required — all are welcome.</p>
<ul>
  <li><strong>Schedule:</strong> Thursdays, 7:00 PM – 8:30 PM</li>
  <li><strong>Age Group:</strong> Adults</li>
</ul>',
  true, 21
),
(
  'Sanskrit Classes',
  'sanskrit-classes',
  (SELECT id FROM public.service_categories WHERE name = 'Education Programs'),
  'Learn to read, write and understand Sanskrit, the sacred language of ancient texts.',
  '<p>Sanskrit is the language of the Vedas, Upanishads, Bhagavad Gita and countless other sacred texts. Our Sanskrit classes are offered in separate batches for beginners and intermediate students, teaching the Devanagari script, grammar and pronunciation.</p>
<ul>
  <li>Beginners: Devanagari script, basic vocabulary, simple sentences</li>
  <li>Intermediate: Grammar, verb conjugation, reading of sacred texts</li>
</ul>
<ul>
  <li><strong>Schedule:</strong> Saturdays, 10:00 AM – 12:00 PM</li>
  <li><strong>Age Group:</strong> All ages (separate batches for children and adults)</li>
</ul>',
  true, 22
),
(
  'Yoga & Meditation',
  'yoga-meditation',
  (SELECT id FROM public.service_categories WHERE name = 'Education Programs'),
  'Traditional yoga asanas and meditation techniques for physical and spiritual wellbeing.',
  '<p>Our yoga and meditation sessions draw on classical Hatha Yoga traditions, combining asanas (postures), pranayama (breathwork) and guided meditation for a holistic practice that benefits body, mind and spirit.</p>
<ul>
  <li>Beginner-friendly — all levels welcome</li>
  <li>Bring your own mat</li>
  <li>Sessions follow the traditional sequence of warm-up, asanas, pranayama and savasana</li>
</ul>
<ul>
  <li><strong>Schedule:</strong> Tuesday &amp; Thursday, 6:30 AM – 7:30 AM</li>
  <li><strong>Age Group:</strong> Adults</li>
</ul>',
  true, 23
),
(
  'Vedic Chanting',
  'vedic-chanting',
  (SELECT id FROM public.service_categories WHERE name = 'Education Programs'),
  'Learn proper pronunciation and chanting of sacred Vedic mantras and shlokas.',
  '<p>Vedic chanting is both a spiritual practice and a living art form. Our weekly sessions teach the correct pronunciation (svara), rhythm and meaning of key Vedic mantras, stotras and shlokas, preserving this ancient oral tradition.</p>
<ul>
  <li>Beginners welcome</li>
  <li>Suitable for those who wish to participate more fully in temple pujas</li>
  <li>Repertoire includes Vishnu Sahasranama, Lalitha Sahasranama, Hanuman Chalisa and more</li>
</ul>
<ul>
  <li><strong>Schedule:</strong> Wednesdays, 7:00 PM – 8:00 PM</li>
  <li><strong>Age Group:</strong> All ages</li>
</ul>',
  true, 24
),

-- ─────────────────────────────────────────────────────────
-- CATEGORY: Community Programs
-- ─────────────────────────────────────────────────────────
(
  'Monthly Satsang',
  'monthly-satsang',
  (SELECT id FROM public.service_categories WHERE name = 'Community Programs'),
  'Spiritual gathering with devotional singing, discourses and community dinner.',
  '<p>Satsang — literally "company of the truth" — is a gathering of devotees to sing bhajans, listen to spiritual discourses and share in community. Our monthly Satsang is open to all and is a wonderful opportunity to connect with the wider Hindu community in Limerick.</p>
<p>The evening typically includes:</p>
<ul>
  <li>Bhajan and kirtan session</li>
  <li>Short spiritual discourse or talk</li>
  <li>Question &amp; answer</li>
  <li>Community vegetarian dinner (prasadam)</li>
</ul>
<ul>
  <li><strong>Frequency:</strong> First Saturday of every month</li>
  <li><strong>All are welcome — no booking required</strong></li>
</ul>',
  true, 30
),
(
  'Cultural Celebrations',
  'cultural-celebrations',
  (SELECT id FROM public.service_categories WHERE name = 'Community Programs'),
  'Grand celebrations of major Hindu festivals including Diwali, Holi, Janmashtami, Navaratri and more.',
  '<p>Throughout the year, the temple organises vibrant celebrations of all major Hindu festivals. These events bring together the entire community — members and non-members alike — for puja, cultural performances, traditional food and joyful festivities.</p>
<h3>Key festivals celebrated</h3>
<ul>
  <li><strong>Diwali</strong> — Festival of Lights (October/November)</li>
  <li><strong>Holi</strong> — Festival of Colours (March)</li>
  <li><strong>Janmashtami</strong> — Birth of Lord Krishna (August)</li>
  <li><strong>Navaratri &amp; Durga Puja</strong> — Nine Nights of the Goddess (September/October)</li>
  <li><strong>Ganesh Chaturthi</strong> — Birth of Lord Ganesha (August/September)</li>
  <li><strong>Ram Navami</strong> — Birth of Lord Rama (April)</li>
  <li><strong>Shivaratri</strong> — Night of Lord Shiva (February/March)</li>
</ul>
<ul>
  <li><strong>Frequency:</strong> Throughout the year — see the Events page for upcoming dates</li>
</ul>',
  true, 31
),
(
  'Annadanam (Free Meals)',
  'annadanam',
  (SELECT id FROM public.service_categories WHERE name = 'Community Programs'),
  'Free vegetarian meals served to all visitors on special occasions as an act of community seva.',
  '<p>Annadanam — the gift of food — is considered one of the highest forms of seva (selfless service) in Hindu tradition. Every Sunday and on all major festival days, the temple serves free vegetarian prasadam to all visitors, regardless of background or membership.</p>
<blockquote><em>"Anna daanam param daanam" — The gift of food is the greatest gift.</em></blockquote>
<ul>
  <li>Fully vegetarian meals prepared with devotion</li>
  <li>No booking or payment required</li>
  <li>Volunteers always welcome in the kitchen</li>
</ul>
<ul>
  <li><strong>Frequency:</strong> Weekly on Sundays &amp; all major festival days</li>
</ul>',
  true, 32
),
(
  'Senior Citizens Gathering',
  'senior-citizens-gathering',
  (SELECT id FROM public.service_categories WHERE name = 'Community Programs'),
  'Monthly social gathering for senior community members with spiritual activities and companionship.',
  '<p>Our Senior Citizens Gathering is a warm and welcoming monthly event dedicated to the elders of our community. The afternoon includes spiritual activities, light bhajans, storytelling, and a shared meal — providing companionship and a sense of belonging.</p>
<ul>
  <li>Open to all senior members of the Hindu community</li>
  <li>Transport assistance may be available — please contact the temple</li>
  <li>Refreshments and vegetarian meal provided</li>
</ul>
<ul>
  <li><strong>Frequency:</strong> Third Thursday of every month</li>
</ul>',
  true, 33
)
ON CONFLICT (slug) DO NOTHING;
