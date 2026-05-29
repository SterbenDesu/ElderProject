import Link from "next/link";

export default function ApplyPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Planned feature</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Apply as a helper</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Static placeholder only</h2>
          <p className="mt-4 text-lg leading-8">
            Future helper applications may include verification review, but this page does not submit forms, store documents, approve helpers, or create employment relationships.
          </p>
          <p className="mt-4 leading-7">
            Supabase authentication is available when configured, but storage, booking, payment processing, and admin functionality are not active yet. Stripe, database logic, payment logic, and admin actions have not been added.
          </p>
          <Link href="/allowed-services" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
            See allowed services
          </Link>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">What remains intentionally inactive</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• No live accounts or protected sessions.</li>
            <li>• No database writes, helper approvals, bookings, or payments.</li>
            <li>• No medical care, guaranteed safety, or employment positioning.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
