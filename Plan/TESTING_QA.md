# Testing & QA Guidelines

## 1. Unit Tests (Jest & React Testing Library)
* **Components** – test rendering, props handling, and interaction (e.g., `MediaUploader`, `DataTable`).
* **Utility functions** – mock Supabase client and verify query building.
* Example test (`components/__tests__/MediaUploader.test.tsx`):
```tsx
import { render, fireEvent } from '@testing-library/react';
import MediaUploader from '@/components/MediaUploader';
import { supabase } from '@/utils/supabaseClient';
jest.mock('@/utils/supabaseClient');

test('uploads a file', async () => {
  const file = new File(['dummy'], 'test.png', { type: 'image/png' });
  const { getByLabelText, getByText } = render(<MediaUploader bucket="public-gallery" />);
  const input = getByLabelText(/file/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(getByText(/upload/i));
  expect(supabase.storage.from).toHaveBeenCalledWith('public-gallery');
});
```

## 2. End‑to‑End Tests (Cypress)
* **Membership purchase flow** – visit home, click CTA, complete Stripe Checkout (use Stripe test mode), verify DB entry via Supabase API.
* **Donation flow** – similar to membership, test one‑time and recurring.
* **Event registration** – register for a paid event, ensure ticket record created.
* Sample spec (`cypress/integration/membership.spec.js`):
```js
describe('Membership purchase', () => {
  it('completes checkout and creates membership', () => {
    cy.visit('/');
    cy.contains('Become a Member').click();
    // Stripe test checkout – use test card 4242 4242 4242 4242
    cy.get('input[name="cardnumber"]').type('4242424242424242');
    cy.get('input[name="exp-date"]').type('12/34');
    cy.get('input[name="cvc"]').type('123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/membership/success');
    // Verify via Supabase REST endpoint (use service role key in env)
    cy.request({ method: 'GET', url: `${Cypress.env('SUPABASE_URL')}/rest/v1/memberships`, headers: { apiKey: Cypress.env('SUPABASE_SERVICE_ROLE_KEY') } })
      .its('body')
      .should('contain', { plan: 'annual' });
  });
});
```

## 3. Accessibility Checklist (WCAG 2.1 AA)
* Use **axe-core** integration in Cypress (`cypress-axe`).
* Verify color contrast, focus order, ARIA labels on all interactive elements (CTA buttons, forms, modals).
* Ensure all images have meaningful `alt` text – required for SEO and accessibility.

## 4. Performance & SEO Validation
* Run **Lighthouse** CI on each PR (GitHub Action) – enforce scores > 90 for Performance, SEO, Accessibility.
* Validate **structured data** with Google Rich Results Test for each page type (WebPage, Event, Organization, DonateAction).

---

*Generated on {{date}}*

