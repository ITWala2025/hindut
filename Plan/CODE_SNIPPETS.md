# Code Snippets (Implementation‑Ready)

## 1. Next.js Page Templates

### Home Page (`pages/index.tsx`)
```tsx
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { supabase } from '@/utils/supabaseClient';

export const getStaticProps: GetStaticProps = async () => {
  const { data: events } = await supabase
    .from('events')
    .select('id,title,start_date')
    .order('start_date', { ascending: true })
    .limit(3);
  return { props: { events }, revalidate: 3600 };
};

export default function Home({ events }: { events: any[] }) {
  return (
    <>
      <Head>
        <title>Hindu Temple – Home</title>
        <meta name="description" content="Join the Hindu Temple community in Limerick – events, services, membership and more." />
        <link rel="canonical" href="https://www.hindutemple.ie/" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Hindu Temple Home",
          "description": "Official site for the Hindu Temple in Limerick."
        })}} />
      </Head>
      <section className="hero bg-cover" style={{ backgroundImage: 'url(/hero.jpg)' }}>
        <h1 className="text-4xl font-bold">Join Our Temple Community</h1>
        <Link href="/membership" className="btn btn-primary mt-4">Become a Member</Link>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl mb-4">Upcoming Events</h2>
        <ul className="grid md:grid-cols-3 gap-4">
          {events.map(ev => (
            <li key={ev.id} className="p-4 border rounded">
              <h3>{ev.title}</h3>
              <p>{new Date(ev.start_date).toLocaleDateString()}</p>
              <Link href={`/events/${ev.id}`} className="text-blue-600">Details</Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
```

### About Page (`pages/about.tsx`)
```tsx
import Head from 'next/head';
export default function About() {
  return (
    <>
      <Head>
        <title>About – Hindu Temple</title>
        <meta name="description" content="Learn about the mission, history and community of the Hindu Temple in Limerick." />
        <link rel="canonical" href="https://www.hindutemple.ie/about" />
      </Head>
      <article className="prose mx-auto p-8">
        <h1>About Our Temple</h1>
        <p>...content extracted from the brief...</p>
      </article>
    </>
  );
}
```

## 2. Stripe Integration

### Client‑side Checkout (`components/StripeCheckoutButton.tsx`)
```tsx
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

export default function StripeCheckoutButton({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    const res = await fetch('/api/memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: 'CURRENT_MEMBER_ID', plan }),
    });
    const { checkoutUrl } = await res.json();
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: checkoutUrl });
    setLoading(false);
  };
  return (
    <button onClick={handleClick} disabled={loading} className="btn btn-primary">
      {loading ? 'Redirecting…' : 'Subscribe'}
    </button>
  );
}
```

### Server‑side Webhook (`pages/api/stripe/webhook.ts`)
*See `API_ENDPOINTS.md` for the full implementation.*

## 3. Email Receipt Function (Vercel Function)
```ts
// pages/api/email/receipt.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { to, subject, html } = req.body;
  try {
    await sgMail.send({ to, from: 'no-reply@hindutemple.ie', subject, html });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email send error', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
```

## 4. Media Upload Component (`components/MediaUploader.tsx`)
```tsx
import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function MediaUploader({ bucket }: { bucket: string }) {
  const [file, setFile] = useState<File | null>(null);
  const handleUpload = async () => {
    if (!file) return;
    const filePath = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) console.error('Upload error', error);
    else alert('Uploaded successfully');
  };
  return (
    <div className="flex flex-col gap-2">
      <input type="file" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={handleUpload} className="btn btn-secondary" disabled={!file}>Upload</button>
    </div>
  );
}
```

## 5. Admin UI Components

### DataTable (`components/DataTable.tsx`)
```tsx
import { useMemo } from 'react';
import { useTable, usePagination } from 'react-table';
import { supabase } from '@/utils/supabaseClient';

export default function DataTable({ columns, tableName }: { columns: any[]; tableName: string }) {
  const fetchData = async ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
    if (error) console.error(error);
    return { rows: data ?? [], pageCount: Math.ceil((count ?? 0) / pageSize) };
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    state: { pageIndex, pageSize },
    nextPage,
    previousPage,
  } = useTable(
    { columns, data: [], manualPagination: true, pageCount: 0, fetchData },
    usePagination,
  );

  return (
    <div>
      <table {...getTableProps()} className="min-w-full border">
        <thead>
          {headerGroups.map(hg => (
            <tr {...hg.getHeaderGroupProps()} key={hg.id}>
              {hg.headers.map(col => (
                <th {...col.getHeaderProps()} key={col.id} className="p-2 bg-gray-100">{col.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()} key={row.id}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()} key={cell.column.id} className="p-2 border-t">{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between mt-2">
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>Prev</button>
        <span>Page {pageIndex + 1} of {pageOptions.length}</span>
        <button onClick={() => nextPage()} disabled={!canNextPage}>Next</button>
      </div>
    </div>
  );
}
```

---

*Generated on {{date}}*

