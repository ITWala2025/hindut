# Circular Text Animation Feature

## Overview

Added a beautiful circular text animation that surrounds the central ॐ (Om) symbol in the Home page hero section. The text rotates continuously in a smooth, futuristic halo effect, creating a high-end, minimal design aesthetic.

## Features

### 1. Circular Text Component
**File:** `src/components/CircularText.tsx`

A reusable React component that arranges text characters in a perfect circle and animates them continuously.

**Props:**
- `text` (string, required): The text to display in circular format
- `className` (string, optional): Additional CSS classes for styling

**Functionality:**
- Automatically calculates character positions based on text length
- Distributes characters evenly around 360° circle
- Adds bullet separator (•) for continuous visual flow
- Uses `transform-origin` for perfect circular arrangement

### 2. Smooth Rotation Animation
**File:** `src/styles/theme.css:355-406`

**Animation Specifications:**
- **Duration:** 30 seconds per full rotation
- **Easing:** Linear (consistent speed)
- **Direction:** Clockwise continuous rotation
- **Effect:** Soft, minimal motion creating halo effect

**CSS Keyframes:**
```css
@keyframes rotate-circular {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

### 3. Responsive Design

**Desktop (1024px+):**
- Circle diameter: 500px
- Font size: 18px
- Transform origin: 250px

**Tablet/Default (768px - 1023px):**
- Circle diameter: 400px
- Font size: 16px
- Transform origin: 200px

**Mobile (<768px):**
- Circle diameter: 280px
- Font size: 12px
- Transform origin: 140px

The animation scales proportionally on all screen sizes while maintaining perfect circular arrangement.

## Implementation

### Home Page Integration
**File:** `src/components/pages/HomePage.tsx:140-152`

The circular text surrounds the central Om symbol with the following text:
```
॥ OM ॥ HINDU ASSOCIATION OF IRELAND ॥ LIMERICK • AHANE • PALLASKENRY • MUNGRET ॥
```

**Layout Structure:**
```tsx
<div className="relative flex items-center justify-center">
  {/* Rotating circular text (background layer) */}
  <CircularText
    text="॥ OM ॥ HINDU ASSOCIATION OF IRELAND ॥ LIMERICK • AHANE • PALLASKENRY • MUNGRET ॥"
    className="text-white/80"
  />

  {/* Stationary central Om symbol (foreground layer) */}
  <div className="absolute ... z-10">
    <span>ॐ</span>
  </div>
</div>
```

**Z-Index Hierarchy:**
1. Background: Rotating circular text
2. Foreground (z-10): Static Om symbol with pulsing glow

## Technical Details

### Character Positioning Algorithm

Each character is positioned using:
1. **Angle Calculation:** `angleStep = 360 / totalCharacters`
2. **Individual Rotation:** Each character rotated by `index * angleStep` degrees
3. **Transform Origin:** Set to half the circle diameter (e.g., 200px for 400px circle)

This ensures perfect spacing regardless of text length.

### Performance Optimizations

- **GPU Acceleration:** Uses `transform` property (hardware accelerated)
- **Single Animation:** One rotation animation for entire container (not per character)
- **Minimal Repaints:** Text content only rendered once on mount
- **Smooth 60fps:** Linear animation maintains consistent frame rate

### Accessibility

- **aria-hidden="true":** Hidden from screen readers (decorative element)
- **No interaction:** Purely visual enhancement
- **Doesn't obstruct content:** Placed behind central symbol with proper z-index

## Styling

### Text Appearance
- **Color:** `text-white/80` (80% opacity white)
- **Font Weight:** 500 (medium)
- **Letter Spacing:** 2px (for readability while rotating)
- **Opacity:** 0.7 (subtle, doesn't overpower)

### Visual Effects
- Soft, elegant motion
- High contrast with dark hero background
- Complements emerald green theme
- Creates depth and dimension

## Customization

### Changing the Text
Edit the text prop in `HomePage.tsx:144`:
```tsx
<CircularText
  text="YOUR CUSTOM TEXT HERE"
  className="text-white/80"
/>
```

### Adjusting Speed
Modify animation duration in `theme.css:360`:
```css
animation: rotate-circular 30s linear infinite;
```
- Increase number (e.g., 40s) for slower rotation
- Decrease number (e.g., 20s) for faster rotation

### Changing Size
Modify circle dimensions in `theme.css:357-359`:
```css
.circular-text-container {
  width: 400px;  /* Change both width and height */
  height: 400px;
}
```

And update transform-origin accordingly:
```css
.circular-text-container span {
  transform-origin: 0 200px;  /* Half of container size */
}
```

### Styling the Text
Add classes to the `className` prop:
```tsx
<CircularText
  text="..."
  className="text-emerald-300 font-bold opacity-90"
/>
```

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (including iOS)
- ✅ Mobile browsers: Responsive and performant

## Use Cases

### Current Implementation
- Surrounds central Om symbol in hero section
- Displays temple name and spiritual message
- Creates premium, modern aesthetic

### Other Potential Uses
1. **About page hero:** Circular text around temple logo
2. **Services page:** Category labels in circular arrangement
3. **Event announcements:** Dates and times in circular format
4. **Loading states:** Animated circular progress text

## Files Modified

1. **src/components/CircularText.tsx** (new file)
   - Core circular text component
   - Character positioning logic
   - Dynamic text rendering

2. **src/styles/theme.css**
   - Lines 355-406: Circular text CSS
   - Animation keyframes
   - Responsive breakpoints

3. **src/components/pages/HomePage.tsx**
   - Line 6: Import CircularText component
   - Lines 140-152: Implementation in hero section

## Design Inspiration

The circular text animation draws inspiration from:
- High-end luxury brand websites
- Modern spiritual/wellness sites
- Premium product launches
- Futuristic UI/UX design patterns

## Future Enhancements (Optional)

1. **Reverse Direction Option:** Add prop for counter-clockwise rotation
2. **Pause on Hover:** Stop animation when user hovers
3. **Variable Speed:** Different rotation speeds for multiple circles
4. **Gradient Text:** Apply gradient colors to rotating text
5. **Stagger Effect:** Characters appear with delay
6. **Multiple Rings:** Concentric circles with different texts and speeds

---

## Summary

The circular text animation adds a sophisticated, futuristic element to the hero section. It creates visual interest without being distracting, reinforces the spiritual theme with continuous motion (like a mandala), and establishes the site as modern and high-quality.

The implementation is performant, responsive, and accessible - meeting all requirements for a professional production website.
