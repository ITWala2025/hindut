# Event Start/End Time Pickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `time` field in the admin event modal with two structured AM/PM time pickers (Start Time, End Time), storing values in new `start_time`/`end_time` DB columns and propagating them through the full stack.

**Architecture:** Add `start_time TEXT` and `end_time TEXT` to `public.events`. The `useEvents` hook maps these new columns and auto-computes the existing `time` property on `TempleEvent` as `"${startTime} – ${endTime}"` so all 7 display/dialog/email callers stay untouched. `rsvp-submit.ts` reads the new columns directly, removing the fragile regex parser. Times are always in `Europe/Dublin` timezone.

**Tech Stack:** Supabase SQL migrations, TypeScript, React, Shadcn Select components (already in project)

## Global Constraints

- All times are in `Europe/Dublin` timezone (IST UTC+1 in summer, GMT UTC+0 in winter)
- Keep `time?: string` on `TempleEvent` as a computed field — do NOT change display components, dialogs, or email template
- Time picker minutes: 00, 15, 30, 45 only
- Time picker hours: 1–12 with AM/PM toggle
- `end_time` is optional; `start_time` is optional too (event may have no time)
- Migration file naming convention: `YYYYMMDDNNNNNN_description.sql` (next: `20260626000086`)

---

### Task 1: Supabase migration — add start_time and end_time columns

**Files:**
- Create: `supabase/migrations/20260626000086_events_add_start_end_time.sql`

**Interfaces:**
- Produces: `public.events.start_time TEXT`, `public.events.end_time TEXT` columns

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260626000086_events_add_start_end_time.sql
alter table public.events
  add column if not exists start_time text,
  add column if not exists end_time   text;
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `npx supabase db push` (or `supabase migration up` if using the CLI directly)

Expected: Migration runs without error. Verify with:
```bash
npx supabase db diff
```
Expected: No pending diff (migration applied).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260626000086_events_add_start_end_time.sql
git commit -m "feat(db): add start_time and end_time columns to events"
```

---

### Task 2: TypeScript types — add startTime/endTime to TempleEvent

**Files:**
- Modify: `src/data/events.ts`

**Interfaces:**
- Produces: `TempleEvent.startTime?: string`, `TempleEvent.endTime?: string`
- `time?: string` remains on the interface (still used by display components; now computed by hook)

- [ ] **Step 1: Add startTime and endTime to TempleEvent interface**

In `src/data/events.ts`, replace lines 20–36 (`TempleEvent` interface) with:

```typescript
export interface TempleEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  startTime?: string   // e.g. "4:00 PM" — Ireland time
  endTime?: string     // e.g. "7:00 PM" — Ireland time, optional
  time?: string        // computed: "${startTime} – ${endTime}" or startTime; kept for display compat
  location: string
  category: EventCategory
  isPaid: boolean
  price?: number
  image?: string
  stripeProductId?: string
  ticketTiers?: TicketTier[]
  eventServices?: EventService[]
  published: boolean
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

Run: `npx tsc --noEmit`
Expected: No errors relating to `startTime` or `endTime`.

- [ ] **Step 3: Commit**

```bash
git add src/data/events.ts
git commit -m "feat(types): add startTime/endTime to TempleEvent"
```

---

### Task 3: useEvents hook — map new DB columns, compute time

**Files:**
- Modify: `src/hooks/useEvents.ts`

**Interfaces:**
- Consumes: `TempleEvent.startTime?: string`, `TempleEvent.endTime?: string` (from Task 2)
- Consumes: DB columns `start_time TEXT`, `end_time TEXT` (from Task 1)
- Produces: `event.time` auto-computed as `"${startTime} – ${endTime}"`, `"${startTime}"`, or `undefined`

- [ ] **Step 1: Add start_time and end_time to EventRow interface**

In `src/hooks/useEvents.ts`, update the `EventRow` interface (currently lines 14–30) to add the two new columns:

```typescript
interface EventRow {
  id: string
  title: string
  description: string | null
  start_date: string
  location: string | null
  image_url: string | null
  is_paid: boolean
  ticket_price_eur: number | null
  stripe_product_id: string | null
  ticket_tiers: TicketTier[] | null
  event_services: EventService[] | null
  category: string | null
  time_display: string | null
  start_time: string | null
  end_time: string | null
  published: boolean
  slug: string | null
}
```

- [ ] **Step 2: Update toTempleEvent to map new columns and compute time**

Replace the `toTempleEvent` function (lines 32–50) with:

```typescript
function toTempleEvent(row: EventRow): TempleEvent {
  const startTime = row.start_time ?? undefined
  const endTime   = row.end_time   ?? undefined
  const time = startTime && endTime
    ? `${startTime} – ${endTime}`
    : startTime ?? undefined

  return {
    id: row.id,
    slug: row.slug ?? toSlug(row.title),
    title: row.title,
    description: row.description ?? '',
    date: row.start_date.slice(0, 10),
    startTime,
    endTime,
    time,
    location: row.location ?? '',
    category: (row.category as EventCategory) ?? 'community',
    isPaid: row.is_paid,
    price: row.ticket_price_eur ?? undefined,
    image: row.image_url ?? undefined,
    stripeProductId: row.stripe_product_id ?? undefined,
    ticketTiers: row.ticket_tiers ?? undefined,
    eventServices: row.event_services ?? undefined,
    published: row.published,
  }
}
```

- [ ] **Step 3: Update addEvent to write start_time, end_time, and auto-generate time_display**

In `addEvent` (lines 79–103), replace the insert object with:

```typescript
const { data, error: err } = await supabase
  .from('events')
  .insert({
    title: event.title,
    description: event.description,
    start_date: event.date,
    location: event.location,
    category: event.category,
    start_time: event.startTime ?? null,
    end_time:   event.endTime   ?? null,
    time_display: event.startTime && event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime ?? null,
    is_paid: event.isPaid,
    ticket_price_eur: event.price ?? null,
    stripe_product_id: event.stripeProductId ?? null,
    ticket_tiers: event.ticketTiers ?? null,
    event_services: event.isPaid ? [] : (event.eventServices ?? []),
    image_url: event.image ?? null,
    published: true,
    slug: event.slug || toSlug(event.title),
  })
  .select('id')
  .single()
```

- [ ] **Step 4: Update updateEvent to write start_time, end_time, and regenerate time_display**

In `updateEvent` (lines 105–126), add these three mappings after the existing `if` blocks (before the `supabase.from('events').update` call):

```typescript
if (patch.startTime !== undefined) update.start_time = patch.startTime ?? null
if (patch.endTime   !== undefined) update.end_time   = patch.endTime   ?? null

// Regenerate time_display whenever either time field changes
if (patch.startTime !== undefined || patch.endTime !== undefined) {
  const st = patch.startTime ?? undefined
  const et = patch.endTime   ?? undefined
  update.time_display = st && et ? `${st} – ${et}` : st ?? null
}
```

Also remove the old `time_display` mapping line:
```typescript
// DELETE this line:
if (patch.time !== undefined)          update.time_display     = patch.time
```

- [ ] **Step 5: Verify TypeScript compiles with no errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useEvents.ts
git commit -m "feat(hook): map start_time/end_time from DB, compute time display string"
```

---

### Task 4: EventsSection — time picker UI

**Files:**
- Modify: `src/components/admin/sections/EventsSection.tsx`

**Interfaces:**
- Consumes: `TempleEvent.startTime?: string`, `TempleEvent.endTime?: string` (from Task 2)
- Produces: form state with `startTime: string`, `endTime: string` replacing `time: string`

- [ ] **Step 1: Add TimePicker helper component above EventsSection**

Add this function before the `EMPTY_FORM` constant (around line 66). It renders three Select dropdowns for hour, minute, and AM/PM:

```typescript
/** Parses "4:00 PM" → { h: '4', m: '00', period: 'PM' } or null */
function parseTimeStr(val: string): { h: string; m: string; period: string } | null {
  const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  return { h: match[1], m: match[2], period: match[3].toUpperCase() }
}

interface TimePickerProps {
  value: string          // "4:00 PM" or ""
  onChange: (v: string) => void
  label: string
  required?: boolean
}

function TimePicker({ value, onChange, label, required }: TimePickerProps) {
  const parsed = value ? parseTimeStr(value) : null
  const h      = parsed?.h      ?? ''
  const m      = parsed?.m      ?? ''
  const period = parsed?.period ?? 'AM'

  const emit = (newH: string, newM: string, newP: string) => {
    if (newH && newM) onChange(`${newH}:${newM} ${newP}`)
    else onChange('')
  }

  return (
    <Field label={label} required={required}>
      <div className="flex gap-1.5 items-center">
        <Clock size={15} className="shrink-0 text-muted-foreground" />
        {/* Hour */}
        <Select value={h} onValueChange={(v) => emit(v, m, period)}>
          <SelectTrigger className="w-16 px-2">
            <SelectValue placeholder="H" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hr) => (
              <SelectItem key={hr} value={hr}>{hr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">:</span>
        {/* Minute */}
        <Select value={m} onValueChange={(v) => emit(h, v, period)}>
          <SelectTrigger className="w-16 px-2">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {['00', '15', '30', '45'].map((min) => (
              <SelectItem key={min} value={min}>{min}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* AM/PM */}
        <Select value={period} onValueChange={(v) => emit(h, m, v)}>
          <SelectTrigger className="w-18 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Field>
  )
}
```

- [ ] **Step 2: Update EMPTY_FORM to use startTime/endTime instead of time**

Replace `EMPTY_FORM` (lines 66–81):

```typescript
const EMPTY_FORM: Omit<TempleEvent, 'id'> = {
  slug: '',
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  location: 'Ahane Hall, Limerick',
  category: 'prayer',
  isPaid: false,
  price: undefined,
  image: undefined,
  stripeProductId: '',
  ticketTiers: [],
  eventServices: [],
  published: true,
}
```

- [ ] **Step 3: Update openEdit to populate startTime/endTime from the event**

In `openEdit` (lines 128–142), the spread `...rest` already copies all TempleEvent properties, which now includes `startTime` and `endTime`. Just ensure the EMPTY_FORM spread works correctly — confirm the body of `openEdit` still looks like:

```typescript
const openEdit = (e: TempleEvent) => {
  setEditing(e)
  const { id: _id, ...rest } = e
  void _id
  setForm({
    ...EMPTY_FORM,
    ...rest,
    image: rest.image ?? undefined,
    stripeProductId: rest.stripeProductId ?? '',
    ticketTiers: rest.ticketTiers ?? [],
    eventServices: rest.eventServices ?? [],
  })
  setSlugManuallyEdited(true)
  setOpen(true)
}
```

No change needed here — `startTime` and `endTime` flow through `...rest` automatically.

- [ ] **Step 4: Replace the free-text Time input with two TimePicker components**

Find the Date/time/location section in the form (around lines 576–605). Replace only the `<Field label="Time">` block:

**Remove:**
```tsx
<Field label="Time">
  <div className="relative">
    <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    <Input
      value={form.time ?? ''}
      onChange={(e) => setForm({ ...form, time: e.target.value })}
      placeholder="4:00 PM – 7:00 PM"
      className="pl-9"
    />
  </div>
</Field>
```

**Add (replacing the above, keeping the grid structure):**

The grid currently has 2 cols: `[Date] [Time]`. Change it to just Date in its own row, then a full-width 2-col row for both time pickers:

```tsx
{/* Date */}
<div className="grid grid-cols-2 gap-4">
  <Field label="Date" required>
    <div className="relative">
      <CalendarBlank size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
        className="pl-9"
        required
      />
    </div>
  </Field>
</div>

{/* Start / End time pickers */}
<div className="mt-4 grid grid-cols-2 gap-4">
  <TimePicker
    label="Start Time"
    value={form.startTime ?? ''}
    onChange={(v) => setForm({ ...form, startTime: v, endTime: v ? form.endTime ?? '' : '' })}
  />
  <TimePicker
    label="End Time"
    value={form.endTime ?? ''}
    onChange={(v) => setForm({ ...form, endTime: v })}
  />
</div>
```

- [ ] **Step 5: Remove the old `time` import from the Clock icon usage**

`Clock` is now used inside `TimePicker` so it's still needed in imports. No change needed to the import line.

- [ ] **Step 6: Verify TypeScript compiles with no errors**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/sections/EventsSection.tsx
git commit -m "feat(admin): replace time text input with start/end AM-PM time pickers"
```

---

### Task 5: rsvp-submit backend — use start_time/end_time directly

**Files:**
- Modify: `netlify/functions/rsvp-submit.ts`

**Interfaces:**
- Consumes: DB columns `start_time TEXT`, `end_time TEXT` (from Task 1)
- `buildEventDates` receives `startTimeStr: string | null, endTimeStr: string | null` instead of `timeDisplay: string | null`

- [ ] **Step 1: Update buildEventDates signature and internals**

Replace the `buildEventDates` function (lines 100–142) with:

```typescript
/**
 * Builds correct UTC start/end Dates from the DB start_date (date-only, midnight UTC)
 * and explicit start_time / end_time strings (e.g. "4:00 PM", "7:00 PM") in Europe/Dublin time.
 * Falls back to start_date + 2 h if times are absent or unparseable.
 */
function buildEventDates(
  startDateStr: string,
  startTimeStr: string | null,
  endTimeStr:   string | null,
): { startDate: Date; endDate: Date } {
  const datePart = startDateStr.slice(0, 10) // "YYYY-MM-DD"

  // Probe Dublin UTC offset for this date (noon avoids DST edge cases)
  const probe = new Date(`${datePart}T12:00:00Z`)
  const dublinNoon = parseInt(
    probe.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin', hour: '2-digit', hour12: false }),
    10,
  )
  const offsetHours = dublinNoon - 12 // +1 in IST (summer), 0 in GMT (winter)

  function dublinToUTC(h: number, m: number): Date {
    const baseMs = new Date(`${datePart}T00:00:00Z`).getTime()
    return new Date(baseMs + (h - offsetHours) * 3_600_000 + m * 60_000)
  }

  function parseAMPM(t: string): { h: number; m: number } | null {
    const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
    if (!match) return null
    let h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (match[3].toUpperCase() === 'AM' && h === 12) h = 0
    return { h, m }
  }

  if (startTimeStr) {
    const start = parseAMPM(startTimeStr)
    if (start) {
      const startDate = dublinToUTC(start.h, start.m)
      if (endTimeStr) {
        const end = parseAMPM(endTimeStr)
        if (end) {
          return { startDate, endDate: dublinToUTC(end.h, end.m) }
        }
      }
      // start only — default 2-hour duration
      return { startDate, endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000) }
    }
  }

  const startDate = new Date(startDateStr)
  return { startDate, endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000) }
}
```

- [ ] **Step 2: Update the events DB query to select start_time and end_time**

Find the query around line 214–218:

```typescript
// BEFORE:
const { data: evtRow, error: evtErr } = await supabase
  .from('events')
  .select('id, title, slug, start_date, location, is_paid, published, time_display')
  .eq('id', data.eventId)
  .single()
```

Replace with:

```typescript
// AFTER:
const { data: evtRow, error: evtErr } = await supabase
  .from('events')
  .select('id, title, slug, start_date, location, is_paid, published, time_display, start_time, end_time')
  .eq('id', data.eventId)
  .single()
```

- [ ] **Step 3: Update the buildEventDates call and formattedTime**

Find lines 261–268:

```typescript
// BEFORE:
const { startDate, endDate } = buildEventDates(evtRow.start_date, evtRow.time_display ?? null)
const locale = 'en-IE'

const formattedDate = startDate.toLocaleDateString(locale, {
  timeZone: 'Europe/Dublin',
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})
const formattedTime: string = evtRow.time_display ?? ''
```

Replace with:

```typescript
// AFTER:
const { startDate, endDate } = buildEventDates(
  evtRow.start_date,
  evtRow.start_time ?? null,
  evtRow.end_time   ?? null,
)
const locale = 'en-IE'

const formattedDate = startDate.toLocaleDateString(locale, {
  timeZone: 'Europe/Dublin',
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})
const formattedTime: string = evtRow.time_display ?? ''
```

Note: `formattedTime` still uses `time_display` — this is correct because `time_display` is auto-generated by the hook as `"${startTime} – ${endTime}"` and is what the email template displays.

- [ ] **Step 4: Verify TypeScript compiles with no errors**

Run: `npx tsc --noEmit` (from repo root, or `cd netlify && npx tsc --noEmit` if there's a separate tsconfig)
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/rsvp-submit.ts
git commit -m "feat(rsvp): use start_time/end_time columns directly for calendar date building"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DB migration ✓, types ✓, hook ✓, admin form UI ✓, backend ✓, Ireland timezone ✓, `time_display` backward compat ✓, display components untouched ✓
- [x] **Placeholders:** None — every step has exact code
- [x] **Type consistency:** `startTime`/`endTime` used consistently across Tasks 2–4; `start_time`/`end_time` DB column names used consistently across Tasks 1, 3, 5
- [x] **Time backward compat:** `time` on `TempleEvent` is still populated via `toTempleEvent`; `time_display` in DB is still written on save; email template unchanged
- [x] **Ireland timezone:** `buildEventDates` probes `Europe/Dublin` offset — handles both IST and GMT seasons
