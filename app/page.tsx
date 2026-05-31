import Link from "next/link";

const serviceOptions = [
  "Stay at home",
  "Quick visit",
  "Shopping",
  "House work",
  "Companionship",
  "Accompaniment",
];

const howItWorks = [
  {
    title: "Tell us what you need",
    text: "Start with a city, date, and everyday support type. The homepage form sends you to caregiver listings for now.",
  },
  {
    title: "Review caregivers",
    text: "Browse visible reviewed caregiver profiles and choose a good match for your family situation.",
  },
  {
    title: "Send a request",
    text: "Signed-in client users can create booking requests from the account area. Final reservation and payment steps are not active yet in this shell.",
  },
];

const popularServices = [
  {
    title: "Stay at home",
    text: "Calm presence at home, light conversation, and practical help during a planned visit.",
  },
  {
    title: "Quick visit",
    text: "A shorter check-in for simple errands, company, or help with small everyday tasks.",
  },
  {
    title: "Shopping",
    text: "Help planning a list, going to the store, or bringing back everyday essentials.",
  },
  {
    title: "House work",
    text: "Light home tasks that keep the day easier, such as tidying or simple household help.",
  },
  {
    title: "Companionship",
    text: "Friendly time together for walks, conversation, hobbies, or staying socially connected.",
  },
  {
    title: "Accompaniment",
    text: "Support getting to appointments, offices, shops, or family visits when an extra person helps.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-br from-sage via-cream to-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
              Everyday family support
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-forest sm:text-5xl lg:text-6xl">
              Book trusted everyday support for your family.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
              Find help for visits, errands, shopping, companionship, home
              tasks, and accompaniment.
            </p>
            <p className="mt-5 max-w-2xl rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm font-semibold leading-6 text-stone-600">
              Some services are restricted for safety and legal reasons. You
              can review the calm service boundaries before sending a request.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/helpers"
                className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-stone-800"
              >
                Browse caregivers
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-forest shadow-sm transition hover:bg-sage"
              >
                Explore services
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-stone-300/30 ring-1 ring-stone-200 sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
              Start a search
            </p>
            <h2 className="mt-3 text-2xl font-bold text-forest">
              What kind of help do you need?
            </h2>
            <form action="/helpers" method="get" className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                City or location
                <input
                  name="location"
                  type="text"
                  placeholder="Sofia, Plovdiv, Varna…"
                  autoComplete="address-level2"
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                Date or date range
                <input
                  name="date"
                  type="text"
                  placeholder="Today, next Friday, June 12–14…"
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                Service type
                <select
                  name="service"
                  defaultValue=""
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                >
                  <option value="" disabled>
                    Choose a service
                  </option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-stone-800"
              >
                Browse caregivers
              </button>
            </form>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              This search is visual and query-based only for now. It does not
              create a booking record, reserve time, or take payment.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 lg:px-8" aria-labelledby="how-it-works">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
          How it works
        </p>
        <h2 id="how-it-works" className="mt-3 text-3xl font-bold tracking-tight text-forest sm:text-4xl">
          Simple steps before a final reservation
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {howItWorks.map((step, index) => (
            <article key={step.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
              <span className="grid size-11 place-items-center rounded-full bg-forest text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-bold text-forest">{step.title}</h3>
              <p className="mt-3 leading-7 text-stone-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white/75" aria-labelledby="popular-services">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
            Popular services
          </p>
          <h2 id="popular-services" className="mt-3 text-3xl font-bold tracking-tight text-forest sm:text-4xl">
            Everyday help that is easy to request
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.map((service) => (
              <article key={service.title} className="rounded-3xl bg-cream p-6 ring-1 ring-stone-200">
                <h3 className="text-xl font-bold text-forest">{service.title}</h3>
                <p className="mt-3 leading-7 text-stone-700">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-14 lg:grid-cols-2 lg:px-8" aria-label="Family and caregiver information">
        <article className="rounded-[2rem] bg-forest p-7 text-white shadow-lg shadow-stone-300/30">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sage">
            For families
          </p>
          <h2 className="mt-3 text-3xl font-bold">Find practical support with less friction</h2>
          <p className="mt-4 leading-8 text-stone-100">
            Start with the kind of everyday help you need, browse caregivers,
            and use your account area to manage profiles and booking requests.
          </p>
          <Link href="/helpers" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-5 py-3 font-semibold text-forest transition hover:bg-cream">
            Browse caregivers
          </Link>
        </article>
        <article className="rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
            For caregivers
          </p>
          <h2 className="mt-3 text-3xl font-bold text-forest">Apply after creating your account</h2>
          <p className="mt-4 leading-8 text-stone-700">
            Everyone starts with a normal account. If you want to offer support,
            use the Become a caregiver flow from your profile. Caregivers are
            reviewed before they can offer services.
          </p>
          <Link href="/signup" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
            Become a caregiver
          </Link>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8" aria-labelledby="trust-review">
        <div className="rounded-[2rem] bg-sage p-7 sm:p-9">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
                Trust and review process
              </p>
              <h2 id="trust-review" className="mt-3 text-3xl font-bold text-forest">
                Reviewed caregivers, clear limits, and a careful rollout
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-stone-700">
                Caregiver approval is handled through the existing application
                and admin review flow. Some services are restricted for safety
                and legal reasons. Final reservation and payment steps are not
                active yet in this shell.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                For details, read the <Link href="/safety" className="font-semibold text-forest underline">safety notes</Link> before creating a request.
              </p>
            </div>
            <div className="grid gap-3 sm:flex lg:grid">
              <Link href="/safety" className="rounded-full bg-forest px-6 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-stone-800">
                Read safety notes
              </Link>
              <Link href="/allowed-services" className="rounded-full bg-white px-6 py-4 text-center font-semibold text-forest shadow-sm transition hover:bg-cream">
                See service scope
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
