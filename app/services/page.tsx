import Link from "next/link";

const services = [
  "Companionship and conversation",
  "Light errands and shopping support",
  "Walks and outdoor accompaniment",
  "Friendly check-ins",
  "Basic technology help",
  "Accompaniment to appointments or institutions",
];

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Services</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest">Non-medical everyday support</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        VnukPodNaem is planned as a marketplace for practical, non-medical help. Services should be simple, clearly scoped, and suitable for independent helpers.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <article key={service} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h2 className="font-semibold text-forest">{service}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Future booking tools will keep requests within allowed non-medical boundaries.</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl bg-sage p-5 text-stone-700">
        Need the exact boundaries? Review <Link className="font-semibold text-forest underline" href="/allowed-services">allowed services</Link> and <Link className="font-semibold text-forest underline" href="/prohibited-services">prohibited services</Link>.
      </div>
    </section>
  );
}
