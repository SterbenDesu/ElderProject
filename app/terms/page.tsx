export default function TermsPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Terms</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Terms of Service placeholder</h1>
      <div className="mt-8 rounded-[2rem] border border-clay/30 bg-white p-6 text-stone-700 shadow-sm">
        <p className="text-xl font-bold text-forest">Draft only — legal review required before launch.</p>
        <p className="mt-3 leading-7">
          This page is a placeholder for future Terms of Service. It is not final legal text and should not be used for a public launch until reviewed by a qualified professional.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Marketplace role</h2>
          <p className="mt-2 leading-7 text-stone-700">The planned product is a technology marketplace, not a medical provider, licensed care provider, employer, or safety guarantor.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Current shell accounts</h2>
          <p className="mt-2 leading-7 text-stone-700">Supabase Auth and database-backed shell workflows may store test account/profile, booking-request, helper application, helper profile, and admin helper-review data when configured.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Future payments</h2>
          <p className="mt-2 leading-7 text-stone-700">No payment processing, refunds, payout handling, payment-provider integration, helper acceptance, full booking lifecycle, disputes, chat, notifications, ratings, or subscriptions are implemented yet.</p>
        </article>
      </div>
    </section>
  );
}
