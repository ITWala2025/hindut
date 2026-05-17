# Planning Guide

A comprehensive temple website for Hindu Association of Ireland that serves as a spiritual gateway for devotees to learn about the temple, access services, make donations, and connect with the community.

**Experience Qualities**:
1. **Serene** - The website should evoke a sense of peace and spiritual calm through warm colors, elegant typography, and thoughtful spacing
2. **Reverent** - Design choices should honor the sacred nature of the temple with dignified presentation and culturally appropriate aesthetics
3. **Welcoming** - The interface should feel open and accessible to all visitors, whether they're long-time devotees or first-time explorers

**Complexity Level**: Light Application (multiple features with basic state)
This is a multi-page informational website with navigation, donation functionality, and contact forms - fitting the light application category with straightforward state management for navigation and form handling.

## Essential Features

### Navigation System
- **Functionality**: Multi-page navigation with active state indication and smooth transitions between pages
- **Purpose**: Allows visitors to easily explore all sections of the temple website
- **Trigger**: User clicks navigation links in header or footer
- **Progression**: Click navigation item → Route changes → Page content transitions smoothly → Active state updates
- **Success criteria**: All pages are accessible, active states are clear, mobile navigation works seamlessly

### Home Page
- **Functionality**: Welcome section with hero imagery, temple highlights, upcoming events preview, and quick access to key actions
- **Purpose**: Creates strong first impression and guides visitors to most important content
- **Trigger**: User visits website root URL
- **Progression**: Page loads → Hero image with temple name appears → Key information sections scroll into view → Call-to-action buttons are visible
- **Success criteria**: Page loads quickly, hero is inspiring, key information is immediately accessible

### About Us Page
- **Functionality**: Temple history, mission, values, deity information, and community details
- **Purpose**: Educates visitors about the temple's heritage and spiritual significance
- **Trigger**: User clicks "About Us" navigation
- **Progression**: Navigate to About → Hero section loads → History timeline appears → Deity information displays → Community values shown
- **Success criteria**: Content is well-organized, images are respectful, text is readable and inspiring

### Services Page
- **Functionality**: Display of temple services including daily pujas, special ceremonies, educational programs, and community events
- **Purpose**: Informs visitors about available spiritual services and how to participate
- **Trigger**: User clicks "Services" navigation
- **Progression**: Navigate to Services → Service categories display → User can browse offerings → Contact information for booking is available
- **Success criteria**: Services are clearly categorized, timing information is visible, booking/contact options are obvious

### Contact Page
- **Functionality**: Contact form, temple address with map, phone numbers, email, and visiting hours
- **Purpose**: Enables visitors to reach out with questions and plan their visit
- **Trigger**: User clicks "Contact" navigation
- **Progression**: Navigate to Contact → Form and contact details display → User fills form → Submission confirmation appears
- **Success criteria**: Form validates inputs, contact information is complete, location is clear

### Donation System
- **Functionality**: Prominent donation button in navigation, dedicated donation interface with preset and custom amounts
- **Purpose**: Facilitates financial support for temple operations and programs
- **Trigger**: User clicks "Donation" button in header
- **Progression**: Click Donation → Modal/dialog opens → Select amount or enter custom → (Simulated payment flow) → Thank you message
- **Success criteria**: Donation interface is prominent, amounts are clear, confirmation provides reassurance

## Edge Case Handling

- **Missing Form Fields**: Inline validation with helpful error messages guiding users to complete required fields
- **Network Issues**: Graceful loading states and error messages if content fails to load
- **Mobile Navigation**: Hamburger menu for small screens with smooth drawer animation
- **Long Content**: Proper scrolling with sticky navigation to maintain orientation
- **Empty States**: Informative messages if events or services lists are empty
- **Browser Back/Forward**: Proper route handling to maintain navigation state

## Design Direction

The design should evoke a sense of divine serenity and spiritual warmth. Think traditional temple aesthetics meeting modern web design - warm golds and deep oranges reminiscent of sacred flames and sunrise, combined with clean layouts and elegant typography. The atmosphere should feel both sacred and accessible, inviting visitors into a digital space that reflects the peace and beauty of the physical temple.

## Color Selection

The color scheme draws inspiration from traditional Hindu temple aesthetics - the warm glow of oil lamps, the richness of marigold offerings, and the peaceful earth tones of sacred spaces.

- **Primary Color**: Deep Saffron/Orange `oklch(0.65 0.18 45)` - Represents the sacred saffron color central to Hindu tradition, used for primary actions and key focal points
- **Secondary Colors**: 
  - Warm Gold `oklch(0.75 0.12 75)` for accents and highlights, evoking temple ornaments and divine light
  - Deep Maroon `oklch(0.35 0.15 15)` for grounding elements and cultural authenticity
  - Soft Cream `oklch(0.96 0.01 80)` for backgrounds, providing warmth while maintaining readability
- **Accent Color**: Bright Gold `oklch(0.80 0.15 85)` for call-to-action elements like the donation button and important highlights
- **Foreground/Background Pairings**: 
  - Primary (Deep Saffron oklch(0.65 0.18 45)): White text (oklch(0.99 0 0)) - Ratio 5.2:1 ✓
  - Secondary (Deep Maroon oklch(0.35 0.15 15)): Cream text (oklch(0.96 0.01 80)) - Ratio 8.1:1 ✓
  - Accent (Bright Gold oklch(0.80 0.15 85)): Dark Brown text (oklch(0.25 0.05 35)) - Ratio 9.5:1 ✓
  - Background (Soft Cream oklch(0.96 0.01 80)): Dark text (oklch(0.20 0.02 35)) - Ratio 12.8:1 ✓

## Font Selection

Typography should balance traditional elegance with modern readability, suggesting both ancient wisdom and contemporary accessibility.

- **Primary Font**: Crimson Pro - A serif typeface that brings editorial sophistication and traditional gravitas, perfect for headings and important content
- **Secondary Font**: Inter - A clean sans-serif for body text ensuring excellent readability across all devices

- **Typographic Hierarchy**:
  - H1 (Page Titles): Crimson Pro Bold/48px/tight letter spacing/-0.02em
  - H2 (Section Headers): Crimson Pro Semibold/36px/tight/0em  
  - H3 (Subsection Headers): Crimson Pro Semibold/24px/normal/0em
  - Body Text: Inter Regular/16px/relaxed line height 1.7
  - Navigation: Inter Medium/15px/normal/0.01em
  - Captions/Small Text: Inter Regular/14px/normal

## Animations

Animations should feel peaceful and intentional, like the gentle movement of incense smoke or the flicker of oil lamps. Use subtle fade-ins as content enters the viewport to create a sense of revelation. Navigation transitions should be smooth (300ms) with gentle easing. The donation button can have a subtle pulse or glow effect to draw attention without being aggressive. Page transitions should use fade effects rather than slides to maintain serenity. Hover states on buttons should include slight scale increases (1.02x) and shadow depth changes for tangible feedback.

## Component Selection

- **Components**:
  - `Button` for all CTAs with variant customizations (primary with saffron bg, secondary with outline)
  - `Card` for service listings, event previews, and content sections with custom shadow and border-radius
  - `Dialog` for the donation interface, providing focused interaction
  - `Sheet` for mobile navigation drawer, sliding in from the left
  - `Form` with `Input`, `Textarea`, `Label` for contact form with inline validation
  - `Separator` to divide content sections elegantly
  - `Tabs` if services need categorization
  - Custom hero components for page headers with background images
  
- **Customizations**:
  - Custom navigation component with logo placement and sticky behavior
  - Custom footer with temple information, quick links, and hours
  - Custom donation amount selector with preset buttons
  - Hero sections with parallax or overlay effects for depth
  
- **States**:
  - Buttons: Default (saffron/gold), Hover (deeper shade with shadow lift), Active (pressed inset), Disabled (muted opacity)
  - Inputs: Default (cream border), Focus (saffron ring), Error (maroon border with message), Success (subtle green tint)
  - Navigation links: Default (dark gray), Active (saffron with underline), Hover (saffron color shift)
  
- **Icon Selection**:
  - `House` for Home navigation
  - `Info` for About Us
  - `Hands` or `ListChecks` for Services  
  - `Envelope` or `Phone` for Contact
  - `Heart` or `CurrencyDollar` for Donation
  - `MapPin` for location/address
  - `Clock` for hours/timings
  - `Calendar` for events
  
- **Spacing**:
  - Page padding: px-6 md:px-12 lg:px-24
  - Section spacing: py-16 md:py-24
  - Card padding: p-6 md:p-8
  - Component gaps: gap-4 for tight groupings, gap-8 for section separation
  - Navigation height: h-20 with py-4
  
- **Mobile**:
  - Navigation collapses to hamburger menu below 768px with Sheet drawer
  - Hero text sizes reduce proportionally (H1 from 48px to 32px)
  - Grid layouts shift from 3 columns to 2 to 1 as screen narrows
  - Padding reduces from lg:px-24 to md:px-12 to px-6
  - Footer links stack vertically on mobile
  - Donation dialog becomes full-screen on mobile for focused interaction
