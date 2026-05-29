# Limerick Hindu Temple – Design Documentation

## 1. Design Feedback
### Primary CTA Standardization
- Align **Donate**, **Discover Our Story**, and the main support button with identical fill color, size, corner radius, and hover states to establish a single visual primary action.

### Typography System
- **Brand Headings**: Serif font (e.g., `Merriweather`).
  - H1 = 48 px, weight = 700
  - H2 = 36 px, weight = 600
  - H3 = 30 px, weight = 600
- **Navigation & Body**: Sans‑serif (e.g., `Inter`).
  - Body = 18 px, weight = 400
  - Small = 14 px, weight = 400

### Hero Overlay
- Apply a consistent semi‑transparent dark gradient overlay (`linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))`) across all hero images to guarantee legibility of white headings and secondary CTAs.

### CTA Hierarchy Clarification
- Designate one primary CTA (filled, primary color) and style secondary actions as outline/ghost.
- Reposition the **Donate** button to follow this hierarchy.

### Color Palette Tokens
- **Primary**: Warm brown/orange (`--color-primary: #C75B12`).
- **Secondary**: Neutral gray (`--color-secondary: #6B6B6B`).
- Update all buttons, icons, and navigation accents to reference these tokens.

### Corner Radius & Shadow Normalization
- Single corner‑radius: `8px` for top‑pill navigation, hero CTAs, and small pill elements.
- Uniform shadow: `0px 2px 4px rgba(0,0,0,0.1)` across components.

### Iconography Alignment
- Standardize stroke weight (`2px`), visual size (`24px`), and vertical alignment for the OM, heart, and calendar icons.

### Spacing & Alignment Harmony
- Establish a vertical rhythm baseline of `24px` between headline, sub‑headline, and CTAs.
- Align navigation items baseline with the logo for balanced layout.

## 2. Usability Friction Points & Solutions
1. **Jargon & Cultural Gatekeeping**
   - Add inline definitions or tooltip components for terms like “Rudrabhishekam,” “Sankatahara Chathurthi,” and “Dhoti/Angavastram.”
   - Provide a glossary link for deeper explanations.
2. **Touch Target Size**
   - Ensure all interactive elements meet a minimum `44 × 44 px` touch area.
   - Increase hit‑area padding where necessary.
3. **Alt Text for Deities & Icons**
   - Implement descriptive alt attributes (e.g., `alt="Statue of Lord Vinayaka adorned with flowers for Friday prayers"`).
   - Audit existing images and replace generic filenames with semantic descriptors.
4. **Temple Imagery Utilization**
   - Integrate high‑resolution, context‑relevant temple photography throughout hero sections, background patterns, and card visuals.
5. **Experience‑Layered UX Architecture**
   - Re‑structure navigation to follow the journey: **Discover → Explore → Engage → Visit → Donate**.
   - Map each layer to dedicated landing pages and progressive disclosure components.

## 3. Visual & Emotional Tone
- Emphasize reverence, calmness, wonder, and cultural pride.
- Increase whitespace, reduce competing elements, and adopt larger imagery with a slower visual rhythm.
- Introduce warm, temple‑inspired gradients and subtle patterned overlays.
- Strengthen hierarchy, ensure cleaner pairing of text and visuals, and maintain consistent spacing.

## 4. Accessibility Enhancements
- Offer larger font size options (e.g., 120 % toggle).
- Provide a high‑contrast mode switch.
- Ensure all deity images have rich alt text.
- Enable full keyboard navigation with visible focus states.
- Use readable line spacing (`1.5×`) and proper semantic heading order (H1‑H6).

### Accessibility Checklist
| Item | ✅ |
|------|----|
| Larger font toggle | |
| High‑contrast mode | |
| Descriptive alt text | |
| Keyboard navigation & focus states | |
| Line spacing 1.5× | |
| Semantic heading order | |

## 5. Design Suggestion: “Micro‑Visit” Funnel (Workflow A)
### Scenario
User checks Friday evening for next day visiting hours.
### Current Friction
Hours hidden in accordion or separate “Temple Visit” page.
### Optimization
Place a dynamic micro‑copy banner in the hero area:
```
Next Open: Saturday at 6:45 PM – [Venue Name]
```
### Event Card Improvement
Add representative images to each event card placeholder.
### Volunteer Cards
Standardize strip placement and text alignment across all volunteer cards; ensure consistent padding and typography.

## 6. Deliverables
1. **Markdown file** – this document with headings for each section.
2. **CSS variable snippets** – see below.
3. **Example component markup** – CTA button, tooltip, hero overlay.
4. **Accessibility checklist table** – included above.
5. **Wireframe annotations** – placeholders below.

### CSS Variables (Tailwind `theme.extend` example)
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#C75B12',
        secondary: '#6B6B6B',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        DEFAULT: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      fontSize: {
        h1: ['48px', { lineHeight: '1.2' }],
        h2: ['36px', { lineHeight: '1.3' }],
        body: ['18px', { lineHeight: '1.5' }],
      },
    },
  },
};
```

### Example Component Markup
```tsx
// CTAButton.tsx
export const CTAButton = ({ children, primary = true }: { children: ReactNode; primary?: boolean }) => (
  <button
    className={
      primary
        ? 'bg-primary text-white rounded-md px-6 py-3 shadow-md hover:bg-primary/90 transition'
        : 'border border-primary text-primary rounded-md px-6 py-3 hover:bg-primary/10 transition'
    }
  >
    {children}
  </button>
);

// Tooltip.tsx (for glossary terms)
export const Tooltip = ({ term, definition }: { term: string; definition: string }) => (
  <span className="relative underline cursor-help" tabIndex={0}>
    {term}
    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-sm rounded shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
      {definition}
    </span>
  </span>
);

// HeroOverlay.tsx
export const HeroOverlay = ({ imageUrl, children }: { imageUrl: string; children: ReactNode }) => (
  <div className="relative h-96 bg-cover" style={{ backgroundImage: `url(${imageUrl})` }}>
    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/50" />
    <div className="relative z-10 flex items-center justify-center h-full text-white">
      {children}
    </div>
  </div>
);
```

### Wireframe Annotations (placeholders)
![Home Wireframe](./wireframes/home.png)
![Navigation Flow](./wireframes/navigation-flow.png)

