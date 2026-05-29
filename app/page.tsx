import Link from "next/link";

const serviceExamples = [
  { title: "Companionship", text: "Conversation, shared activities, and friendly presence within clear non-medical boundaries.", icon: "♡" },
  { title: "Light errands", text: "Small local tasks and practical support that do not involve cash handling or valuables.", icon: "✓" },
  { title: "Shopping support", text: "Help planning or accompanying routine shopping, without card PINs or private credentials.", icon: "□" },
  { title: "Walks", text: "Calm outdoor accompaniment for everyday movement, not clinical supervision or emergency response.", icon: "↗" },
  { title: "Check-ins", text: "Friendly scheduled visits or calls once real booking and account tools are added later.", icon: "○" },
  { title: "Technology help", text: "Basic phone, tablet, or video-call assistance without password collection.", icon: "⌁" },
];

const trustCards = [
  "Allowed and prohibited service lists are visible before real booking is added.",
  "Future verification can reduce risk, but the platform will not promise absolute safety.",
  "Helpers are independent marketplace participants, not platform employees.",
];

const steps = [
  { title: "Choose a need", text: "A family member or older adult selects a simple non-medical support category." },
  { title: "Review boundaries", text: "The request stays inside practical everyday support, with medical and financial tasks excluded." },
  { title: "Match later", text: "Future phases can add verified helper profiles, booking, confirmations, and dispute review." },
];

export default function Home() {
  return (
    <div>
      <section className="relative isolate bg-[radial-gradient(circle_at_top_left,#edf4ee,transparent_34rem),linear-gradient(180deg,#fffaf2_0%,#fbf7ef_70%)]">
        <div className="absolute right-[-6rem] top-16 -z-10 size-72 rounded-full bg-sage blur-3xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="w-fit rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-clay shadow-sm ring-1 ring-stone-200">
              Planned English-first MVP
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-forest sm:text-5xl lg:text-6xl">
              Warm everyday support, clearly kept non-medical.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl sm:leading-9">
              VnukPodNaem is a planned marketplace for families and older adults who need companionship, errands, walks, check-ins, technology help, or accompaniment from independent helpers.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Link href="/services" className="rounded-full bg-forest px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-stone-800">
                Explore services
              </Link>
              <Link href="/helper/apply" className="rounded-full border border-forest/30 bg-white px-6 py-4 text-center font-semibold text-forest shadow-sm transition hover:bg-sage">
                Planned helper path
              </Link>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
              Not active yet: booking, payment processing, helper workflows, and admin tools are not enabled in this early shell. Supabase authentication and basic profile storage work when configured.
            </p>
          </div>

          <aside className="relative rounded-[2rem] bg-white p-5 shadow-xl shadow-stone-300/30 ring-1 ring-stone-200 sm:p-7" aria-labelledby="boundary-heading">
            <div className="absolute -right-3 -top-3 hidden rounded-2xl bg-clay px-4 py-3 text-sm font-bold text-white shadow-lg sm:block">
              Non-medical only
            </div>
            <div className="rounded-[1.5rem] bg-sage p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-white text-2xl text-forest shadow-sm" aria-hidden="true">♡</span>
                <div>
                  <h2 id="boundary-heading" className="text-xl font-bold text-forest">Built around careful boundaries</h2>
                  <p className="text-sm font-semibold text-moss">Practical help, not clinical care</p>
                </div>
              </div>
              <p className="mt-5 leading-7 text-stone-700">
                The platform does not provide medication management, injections, wound care, clinical tasks, emergency response, cash handling, card PIN requests, or password collection.
              </p>
            </div>
            <div className="mt-5 grid gap-3">
              {trustCards.map((card) => (
                <div key={card} className="flex gap-3 rounded-2xl border border-stone-100 bg-cream/70 p-4 text-sm leading-6 text-stone-700">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white" aria-hidden="true">✓</span>
                  <p>{card}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8" aria-labelledby="services-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Service categories</p>
            <h2 id="services-heading" className="mt-3 text-3xl font-bold tracking-tight text-forest sm:text-4xl">Everyday help families can understand quickly</h2>
          </div>
          <Link href="/allowed-services" className="font-semibold text-forest underline">See allowed scope</Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceExamples.map((service) => (
            <article key={service.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid size-12 place-items-center rounded-2xl bg-sage text-2xl font-bold text-forest" aria-hidden="true">{service.icon}</span>
              <h3 className="mt-5 text-xl font-bold text-forest">{service.title}</h3>
              <p className="mt-3 leading-7 text-stone-700">{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white/75" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">How it works later</p>
            <h2 id="how-heading" className="mt-3 text-3xl font-bold tracking-tight text-forest sm:text-4xl">A simple process before complex marketplace features</h2>
            <p className="mt-4 text-lg leading-8 text-stone-700">
              This shell is intentionally static. It explains the future flow without pretending that real accounts, bookings, payments, or admin review are active.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="relative rounded-3xl border border-stone-200 bg-cream p-6">
                <span className="grid size-11 place-items-center rounded-full bg-forest text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-5 text-xl font-bold text-forest">{step.title}</h3>
                <p className="mt-3 leading-7 text-stone-700">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-14 lg:grid-cols-2 lg:px-8" aria-label="Audience information">
        <article className="rounded-[2rem] bg-forest p-7 text-white shadow-lg shadow-stone-300/30">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sage">For families</p>
          <h2 className="mt-3 text-3xl font-bold">More clarity before asking for help</h2>
          <p className="mt-4 leading-8 text-stone-100">
            Families should be able to see what is allowed, what is prohibited, and what future verification and complaint workflows are expected to cover—without medical promises or safety guarantees.
          </p>
        </article>
        <article className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">For helpers</p>
          <h2 className="mt-3 text-3xl font-bold text-forest">Independent, scoped participation</h2>
          <p className="mt-4 leading-8 text-stone-700">
            Future helpers will apply as independent marketplace participants. This shell does not create jobs, employee relationships, live applications, payouts, or admin approval tools.
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8">
        <div className="rounded-[2rem] bg-sage p-7 sm:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Current status</p>
              <h2 className="mt-3 text-3xl font-bold text-forest">Static MVP shell for review</h2>
              <p className="mt-3 max-w-3xl leading-7 text-stone-700">
                Review the public pages, service boundaries, and placeholders before any database, Stripe, payment, or admin functionality is added.
              </p>
            </div>
            <div className="grid gap-3 sm:flex lg:grid">
              <Link href="/safety" className="rounded-full bg-forest px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-stone-800">Read safety notes</Link>
              <Link href="/prohibited-services" className="rounded-full bg-white px-6 py-4 text-center font-semibold text-forest shadow-sm transition hover:bg-cream">View boundaries</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
