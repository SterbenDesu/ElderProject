import Link from "next/link";

const services = [
  { title: "Companionship and conversation", detail: "Friendly visits, shared activities, or conversation that reduce isolation without replacing licensed care." },
  { title: "Light errands", detail: "Small practical tasks such as picking up simple items, with no cash handling or access-to-valuables requests." },
  { title: "Shopping support", detail: "Planning or accompaniment for routine shopping while avoiding card PINs, passwords, or private payment details." },
  { title: "Walks and outdoor accompaniment", detail: "Calm everyday walks or accompaniment, not clinical monitoring, mobility treatment, or emergency response." },
  { title: "Friendly check-ins", detail: "Scheduled non-medical visits or calls once future account and booking tools are implemented." },
  { title: "Basic technology help", detail: "Help with phone, tablet, or video-call basics without collecting passwords or taking over accounts." },
  { title: "Accompaniment", detail: "Going with an older adult to appointments or institutions as everyday support, not as medical advocacy or clinical care." },
];

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_0.65fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Services</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Non-medical everyday support categories</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
            VnukPodNaem is planned as a marketplace for practical, non-medical help. Each service should be easy to understand, limited in scope, and suitable for independent helpers.
          </p>
        </div>
        <aside className="rounded-3xl bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">Not active yet</h2>
          <p className="mt-3 leading-7">
            These are static categories for MVP review. Real search, booking, helper matching, payment, storage, and account features are not implemented.
          </p>
        </aside>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-bold text-forest">{service.title}</h2>
            <p className="mt-3 leading-7 text-stone-700">{service.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-forest">Before any future request</h2>
          <p className="mt-3 leading-7 text-stone-700">
            Families and helpers should check whether the request is allowed, safe, practical, and non-medical.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <Link className="rounded-full bg-forest px-5 py-4 text-center font-semibold text-white transition hover:bg-stone-800" href="/allowed-services">Allowed services</Link>
          <Link className="rounded-full border border-forest/30 px-5 py-4 text-center font-semibold text-forest transition hover:bg-sage" href="/prohibited-services">Prohibited services</Link>
        </div>
      </div>
    </section>
  );
}
