import Link from "next/link";

const serviceExamples = ["Companionship", "Light errands", "Shopping", "Walks", "Check-ins", "Technology help", "Accompaniment to appointments or institutions"];
const steps = [
  "A client or caregiver chooses a non-medical support need.",
  "A future verified helper can be matched through the marketplace.",
  "The platform will keep service boundaries, confirmations, and disputes clear before live payments are added.",
];

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-b from-sage to-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">English-first MVP scaffold</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-forest sm:text-5xl">
              Everyday non-medical support for older adults and their families.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              VnukPodNaem is being built as a calm marketplace where families and elderly people can find independent helpers for companionship, errands, walks, technology help, check-ins, and accompaniment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-full bg-forest px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-stone-800">
                Sign up for updates
              </Link>
              <Link href="/helper/apply" className="rounded-full border border-forest px-6 py-3 text-center font-semibold text-forest transition hover:bg-white">
                Apply as a helper
              </Link>
            </div>
          </div>
          <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200" aria-labelledby="boundary-heading">
            <h2 id="boundary-heading" className="text-xl font-semibold text-forest">Important service boundary</h2>
            <p className="mt-4 leading-7 text-stone-700">
              The first version is not a medical care service. It does not provide medication management, injections, wound care, clinical tasks, or emergency response.
            </p>
            <p className="mt-4 leading-7 text-stone-700">
              The platform can support safer processes, but it cannot guarantee absolute safety. Helpers are independent marketplace participants.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8" aria-labelledby="marketplace-heading">
        <div className="max-w-3xl">
          <h2 id="marketplace-heading" className="text-3xl font-bold tracking-tight text-forest">A small marketplace foundation</h2>
          <p className="mt-4 text-lg leading-8 text-stone-700">
            This scaffold introduces the public pages and safety language before accounts, database records, payments, or admin tools are implemented.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceExamples.map((service) => (
            <div key={service} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
              <h3 className="font-semibold text-forest">{service}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">Non-medical everyday assistance with clear boundaries and future platform-managed booking steps.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/70" aria-labelledby="safety-heading">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 id="safety-heading" className="text-3xl font-bold tracking-tight text-forest">Trust and safety come before transactions</h2>
            <p className="mt-4 leading-7 text-stone-700">
              Future phases will add verification workflows, protected dashboards, complaint review, and provider-managed payments. This first version keeps the scope static so the product boundaries can be reviewed early.
            </p>
          </div>
          <ul className="space-y-3 text-stone-700">
            <li className="rounded-2xl bg-cream p-4">Clear allowed and prohibited service lists.</li>
            <li className="rounded-2xl bg-cream p-4">No medical-service functionality or health-data collection.</li>
            <li className="rounded-2xl bg-cream p-4">No cash, off-platform payment, card PIN, or password language.</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-3xl font-bold tracking-tight text-forest">How it will work</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-sm font-semibold text-clay">Step {index + 1}</p>
              <p className="mt-3 leading-7 text-stone-700">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
