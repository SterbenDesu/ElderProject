import Link from "next/link";
import { HomeSearchCard } from "@/components/HomeSearchCard";

const howItWorks = [
  {
    title: "Share the day you have in mind",
    text: "Choose a city, date or date range, and the everyday support that would make life easier.",
  },
  {
    title: "Browse reviewed caregivers",
    text: "Use the caregiver listings to compare visible profiles and find a calm, practical match for your family.",
  },
  {
    title: "Continue from your account",
    text: "Booking requests are handled after sign in. Final reservation and payment steps will come later.",
  },
];

const popularServices = [
  {
    icon: "🏡",
    title: "Stay at home",
    text: "A steady presence at home with conversation and light practical help during a planned visit.",
  },
  {
    icon: "☕",
    title: "Quick visit",
    text: "A shorter check-in for company, simple errands, or a little help with the day.",
  },
  {
    icon: "🛒",
    title: "Shopping",
    text: "Help with lists, store trips, and bringing back everyday essentials without extra stress.",
  },
  {
    icon: "🧺",
    title: "House work",
    text: "Light home tasks such as tidying, organizing, and small household support.",
  },
  {
    icon: "🌿",
    title: "Companionship",
    text: "Friendly time for conversation, walks, hobbies, or simply staying socially connected.",
  },
  {
    icon: "🚶",
    title: "Accompaniment",
    text: "An extra person for appointments, offices, shops, or family visits when support helps.",
  },
];

const trustReasons = [
  {
    title: "Built around everyday life",
    text: "The focus is practical support, companionship, errands, home tasks, and accompaniment.",
  },
  {
    title: "Caregiver review first",
    text: "Caregivers apply after creating a normal account and are reviewed before offering services.",
  },
  {
    title: "Clear service boundaries",
    text: "Some services are restricted for safety and legal reasons, with details kept in dedicated pages.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(237,244,238,0.95),transparent_32%),linear-gradient(135deg,#fbf7ef_0%,#f7efe2_44%,#ffffff_100%)]">
        <div
          aria-hidden="true"
          className="absolute -left-20 top-24 size-56 rounded-full bg-sage/80 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-10 size-72 rounded-full bg-clay/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div className="relative z-10 flex flex-col justify-center">
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-[-0.04em] text-forest sm:text-5xl lg:text-6xl">
              Find trusted everyday support for the people you love.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700 sm:text-xl">
              VnukPodNaem helps families look for calm, practical help with
              visits, companionship, shopping, errands, home tasks, and
              accompaniment.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/helpers"
                className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-forest/20 transition hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-xl active:translate-y-0"
              >
                Browse caregivers
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-6 py-3 text-base font-extrabold text-forest shadow-sm transition hover:-translate-y-0.5 hover:bg-sage hover:shadow-md active:translate-y-0"
              >
                Explore services
              </Link>
            </div>

            <p className="mt-5 max-w-xl rounded-2xl border border-stone-200/80 bg-white/65 px-4 py-3 text-sm font-semibold leading-6 text-stone-600">
              Caregivers are reviewed before becoming visible. Some services
              are restricted for safety and legal reasons.
            </p>
          </div>

          <div className="relative z-10 grid content-center gap-5">
            <HomeSearchCard />
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-6xl px-5 py-16 lg:px-8"
        aria-labelledby="how-it-works"
      >
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
              How it works
            </p>
            <h2
              id="how-it-works"
              className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-forest sm:text-4xl"
            >
              A simple path from need to next step
            </h2>
          </div>
          <p className="text-lg leading-8 text-stone-700">
            The homepage keeps the first action easy: describe the support you
            are looking for, then continue to caregiver listings without making
            a reservation too early.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {howItWorks.map((step, index) => (
            <article
              key={step.title}
              className="rounded-[2rem] bg-white p-6 shadow-sm shadow-stone-200/60 ring-1 ring-stone-200 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/80"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-sage text-base font-bold text-forest">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-forest">
                {step.title}
              </h3>
              <p className="mt-3 leading-7 text-stone-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="bg-white/70"
        aria-labelledby="popular-services"
      >
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
              Popular support types
            </p>
            <h2
              id="popular-services"
              className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-forest sm:text-4xl"
            >
              Everyday help that is easy to understand
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-700">
              Clear, familiar service categories help older adults and families
              scan choices without feeling rushed.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.map((service) => (
              <article
                key={service.title}
                className="group rounded-[2rem] bg-cream p-6 shadow-sm shadow-stone-200/60 ring-1 ring-stone-200 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-stone-200/80"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
                  {service.icon}
                </span>
                <h3 className="mt-5 text-xl font-extrabold text-forest">
                  {service.title}
                </h3>
                <p className="mt-3 leading-7 text-stone-700">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-6xl px-5 py-16 lg:px-8"
        aria-labelledby="why-families"
      >
        <div className="grid gap-8 rounded-[2.5rem] bg-forest p-6 text-white shadow-xl shadow-stone-300/40 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage">
              Why families choose us
            </p>
            <h2 id="why-families" className="mt-3 text-3xl font-bold sm:text-4xl">
              Warm help with clear expectations
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-100">
              The experience is designed to feel approachable for families while
              keeping review, service scope, and next steps easy to find.
            </p>
            <Link
              href="/helpers"
              className="mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-6 py-3 font-semibold text-forest shadow-sm transition hover:bg-cream"
            >
              Browse caregivers
            </Link>
          </div>
          <div className="grid gap-4">
            {trustReasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-[1.75rem] bg-white/10 p-5 ring-1 ring-white/20 transition hover:bg-white/15"
              >
                <h3 className="text-xl font-bold">{reason.title}</h3>
                <p className="mt-2 leading-7 text-stone-100">{reason.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto grid max-w-6xl gap-5 px-5 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8"
        aria-label="Caregiver and safety information"
      >
        <article className="relative overflow-hidden rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 size-32 rounded-full bg-sage"
          />
          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
              Become a caregiver
            </p>
            <h2 className="mt-3 text-3xl font-bold text-forest">
              Apply when you are ready to offer support
            </h2>
            <p className="mt-4 leading-8 text-stone-700">
              Everyone starts with a normal account. People who want to offer
              support can apply later, and caregiver status depends on admin
              review before becoming visible.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
            >
              Create account
            </Link>
          </div>
        </article>

        <article className="rounded-[2rem] bg-sage p-7 shadow-sm ring-1 ring-stone-200 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
            Calm safety note
          </p>
          <h2 className="mt-3 text-3xl font-bold text-forest">
            Clear boundaries without making the page feel heavy
          </h2>
          <p className="mt-4 leading-8 text-stone-700">
            VnukPodNaem keeps service limits in dedicated safety and service
            scope pages so families can review them before sending a request.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/safety"
              className="inline-flex min-h-12 items-center rounded-full bg-white px-5 py-3 font-semibold text-forest shadow-sm transition hover:bg-cream"
            >
              Read safety notes
            </Link>
            <Link
              href="/allowed-services"
              className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-cream px-5 py-3 font-semibold text-forest transition hover:bg-white"
            >
              See service scope
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
