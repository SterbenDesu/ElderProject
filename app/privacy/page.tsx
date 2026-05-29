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
          <p className="mt-2 leading-7 text-stone-700">This static shell does not collect, store, authenticate, or process real user data.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Future scope</h2>
          <p className="mt-2 leading-7 text-stone-700">Supabase authentication is available when configured. Later phases may add database-backed account data only after privacy requirements and security rules are defined.</p>
        </article>
        <article className="rounded-3xl bg-sage p-5">
          <h2 className="font-bold text-forest">Sensitive information</h2>
          <p className="mt-2 leading-7 text-stone-700">The product should avoid unnecessary health, financial, password, valuables, or credential information.</p>
        </article>
      </div>
    </section>
  );
}
