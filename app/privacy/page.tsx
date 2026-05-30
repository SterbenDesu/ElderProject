export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Privacy</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Privacy Policy placeholder</h1>
      <div className="mt-8 rounded-[2rem] border border-clay/30 bg-white p-6 text-stone-700 shadow-sm">
        <p className="text-xl font-bold text-forest">Draft only — privacy and legal review required before launch.</p>
        <p className="mt-3 leading-7">
          This page is a placeholder for a future Privacy Policy. It is not final legal text and should not be used for launch until data collection, retention, security, and user rights are reviewed by qualified professionals.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Current data storage</h2>
          <p className="mt-2 leading-7 text-stone-700">When Supabase is configured, this database-backed shell may store test account, profile, booking, helper application, and helper profile data through Supabase Auth and database workflows.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Future scope</h2>
          <p className="mt-2 leading-7 text-stone-700">Terms and Privacy content is placeholder text for review; it should not be treated as final legal, privacy, retention, security, user-rights, or compliance guidance before launch.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Sensitive information</h2>
          <p className="mt-2 leading-7 text-stone-700">The product should avoid unnecessary health, financial, password, valuables, or credential information.</p>
        </article>
      </div>
    </section>
  );
}
