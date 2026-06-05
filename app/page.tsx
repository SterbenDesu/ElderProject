import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CircleCheckBig,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HomeSearchCard, ServiceIcon } from "@/components/HomeSearchCard";
import { Reveal } from "@/components/Reveal";

const howItWorks = [
  {
    step: "01",
    Icon: Calendar,
    title: "Share the day you have in mind",
    text: "Choose a city, date or date range, and the everyday support that would make life easier.",
  },
  {
    step: "02",
    Icon: Users,
    title: "Browse reviewed caregivers",
    text: "Use the caregiver listings to compare visible profiles and find a calm, practical match for your family.",
  },
  {
    step: "03",
    Icon: CircleCheckBig,
    title: "Continue from your account",
    text: "Booking requests are handled after sign in. Final reservation and payment steps will come later.",
  },
] as const;

const popularServices = [
  {
    icon: "home",
    title: "Stay at home",
    text: "A steady presence at home with conversation and light practical help during a planned visit.",
  },
  {
    icon: "clock",
    title: "Quick visit",
    text: "A shorter check-in for company, simple errands, or a little help with the day.",
  },
  {
    icon: "cart",
    title: "Shopping",
    text: "Help with lists, store trips, and bringing back everyday essentials without extra stress.",
  },
  {
    icon: "spark",
    title: "House work",
    text: "Light home tasks such as tidying, organizing, and small household support.",
  },
  {
    icon: "heart",
    title: "Companionship",
    text: "Friendly time for conversation, walks, hobbies, or simply staying socially connected.",
  },
  {
    icon: "pin",
    title: "Accompaniment",
    text: "An extra person for appointments, offices, shops, or family visits when support helps.",
  },
] as const;

const trustReasons = [
  {
    title: "Support that feels clear and easy to arrange",
    text: "Choose what you need, review caregiver profiles, and continue step by step.",
  },
  {
    title: "Reviewed profiles before visibility",
    text: "Caregiver profiles are reviewed before they become visible in the public listing.",
  },
  {
    title: "Simple service scope",
    text: "Everyday support categories are kept understandable, with safety limits explained in dedicated pages.",
  },
];

export default function Home() {
  return (
    <div className="bg-linen">

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section className="hero-gradient relative isolate overflow-hidden">
        {/* Soft warm blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-16 size-72 rounded-full bg-terracotta/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-0 size-80 rounded-full bg-ivory/60 blur-3xl"
        />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(30rem,1fr)] lg:items-center lg:px-8 lg:py-24 xl:gap-16">

          {/* Left — headline copy */}
          <div className="animate-fade-up relative z-10 flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">
              Everyday family support
            </p>

            <h1 className="mt-4 font-display text-5xl font-black leading-[1.05] tracking-[-0.03em] text-espresso sm:text-6xl lg:text-7xl">
              Find trusted support for the&nbsp;people you&nbsp;love.
            </h1>

            <p className="mt-6 max-w-lg text-lg font-light leading-8 text-warmgrey sm:text-xl">
              Calm, practical help with visits, companionship, shopping,
              errands, and home tasks — arranged through reviewed caregivers.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/helpers"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-terracotta px-7 py-3 text-base font-bold text-white shadow-lg shadow-terracotta/30 transition hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl hover:shadow-terracotta/40 active:translate-y-0"
              >
                Browse caregivers
                <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white/80 px-7 py-3 text-base font-bold text-espresso shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0"
              >
                Explore services
              </Link>
            </div>

            <p className="mt-6 max-w-md rounded-2xl border border-sand/80 bg-white/60 px-5 py-3.5 text-sm font-medium leading-6 text-warmgrey backdrop-blur">
              Caregivers are reviewed before becoming visible. Some services
              are restricted for safety and legal reasons.
            </p>
          </div>

          {/* Right — search card */}
          <div
            className="animate-fade-up relative z-10 w-full lg:justify-self-end"
            style={{ animationDelay: "100ms" }}
          >
            <HomeSearchCard />
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ─────────────────────────────────────────── */}
      <section
        className="mx-auto max-w-6xl px-5 py-20 lg:px-8"
        aria-labelledby="how-it-works"
      >
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">
              How it works
            </p>
            <h2
              id="how-it-works"
              className="mt-3 font-display text-4xl font-black tracking-[-0.03em] text-espresso sm:text-5xl"
            >
              A simple path from need to next step
            </h2>
          </div>
          <p className="max-w-xl text-lg font-light leading-8 text-warmgrey">
            Describe the support you are looking for, then continue to
            caregiver listings without making a reservation too early.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {howItWorks.map(({ step, Icon, title, text }, index) => (
            <Reveal
              key={step}
              as="article"
              delay={index * 120}
              className="group rounded-2xl border border-sand bg-ivory p-7 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-terracotta/10"
            >
              {/* Big editorial numeral + icon */}
              <div className="flex items-start justify-between">
                <span className="font-display text-7xl font-black leading-none text-terracotta">
                  {step}
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-terracotta/10 text-terracotta transition group-hover:bg-terracotta/20">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-espresso">
                {title}
              </h3>
              <p className="mt-3 leading-7 text-warmgrey">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 3. SERVICE TYPE CARDS ────────────────────────────────────── */}
      <section
        className="bg-white/50"
        aria-labelledby="popular-services"
      >
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">
              Popular support types
            </p>
            <h2
              id="popular-services"
              className="mt-3 font-display text-4xl font-black tracking-[-0.03em] text-espresso sm:text-5xl"
            >
              Everyday help that is easy to understand
            </h2>
            <p className="mt-5 text-lg font-light leading-8 text-warmgrey">
              Clear, familiar service categories help older adults and families
              scan choices without feeling rushed.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularServices.map((service, index) => (
              <Reveal
                key={service.title}
                as="article"
                delay={index * 80}
                className="group rounded-2xl border border-sand bg-ivory p-7 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-terracotta/10"
              >
                {/* Icon in warm circle */}
                <span className="grid size-14 place-items-center rounded-full bg-terracotta/10 text-terracotta transition group-hover:bg-terracotta/20">
                  <ServiceIcon name={service.icon} className="size-7" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-espresso">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-warmgrey">
                  {service.text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. TRUST / WHY FAMILIES ──────────────────────────────────── */}
      <section
        className="mx-auto max-w-6xl px-5 py-20 lg:px-8"
        aria-labelledby="why-families"
      >
        <Reveal className="grid gap-8 rounded-3xl border border-sand bg-ivory p-8 shadow-md shadow-terracotta/5 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">
              Why families choose us
            </p>
            <h2
              id="why-families"
              className="mt-3 font-display text-4xl font-black tracking-[-0.03em] text-espresso sm:text-5xl"
            >
              Choose what you need, then continue step by step
            </h2>
            <p className="mt-5 max-w-sm text-lg font-light leading-8 text-warmgrey">
              Review caregiver profiles, and move forward at a steady pace with clear next steps.
            </p>
            <Link
              href="/helpers"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-terracotta px-7 py-3 font-bold text-white shadow-lg shadow-terracotta/25 transition hover:-translate-y-0.5 hover:bg-terracotta-dark active:translate-y-0"
            >
              Browse caregivers
              <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
          <div className="grid content-center gap-4">
            {trustReasons.map((reason, index) => (
              <Reveal
                key={reason.title}
                as="article"
                delay={index * 100}
                className="rounded-2xl border border-sand/60 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h3 className="font-display text-lg font-bold text-espresso">
                  {reason.title}
                </h3>
                <p className="mt-1.5 text-sm leading-7 text-warmgrey">
                  {reason.text}
                </p>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 5. BECOME A CAREGIVER ────────────────────────────────────── */}
      <section
        className="relative isolate overflow-hidden bg-terracotta"
        aria-labelledby="become-a-caregiver"
      >
        {/* Dot pattern overlay */}
        <div
          aria-hidden="true"
          className="dot-pattern absolute inset-0 opacity-100"
        />
        {/* Soft glow orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-terracotta-dark/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 right-0 size-96 rounded-full bg-espresso/20 blur-3xl"
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-5 py-20 text-center lg:px-8 lg:py-28">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-ivory/80">
              Become a caregiver
            </p>
            <h2
              id="become-a-caregiver"
              className="mt-4 font-display text-4xl font-black leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl"
            >
              Turn the time you give into trusted everyday support.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg font-light leading-8 text-ivory/90">
              Everyone starts with a normal account. When you are ready to offer
              companionship, errands, or practical help, apply in minutes —
              caregivers become visible only after admin review.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-bold text-terracotta shadow-xl shadow-espresso/20 transition hover:-translate-y-0.5 hover:bg-ivory hover:shadow-2xl active:translate-y-0"
              >
                Create your account
                <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <Link
                href="/helper/apply"
                className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-8 py-3 text-base font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0"
              >
                See how applying works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 6. SAFETY NOTE ───────────────────────────────────────────── */}
      <section
        className="mx-auto max-w-6xl px-5 py-20 lg:px-8"
        aria-label="Safety information"
      >
        <Reveal
          as="article"
          className="flex flex-col gap-5 rounded-3xl border border-sand bg-ivory p-8 sm:flex-row sm:items-center sm:gap-8 sm:p-10"
        >
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-terracotta/10 text-terracotta"
            aria-hidden="true"
          >
            <ShieldCheck className="size-7" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-terracotta">
              Calm safety note
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-espresso">
              Clear boundaries, dedicated pages
            </h2>
            <p className="mt-2 max-w-xl leading-7 text-warmgrey">
              Service limits are in dedicated safety and service scope pages so
              families can review them before sending a request.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/safety"
              className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-terracotta/25 transition hover:-translate-y-0.5 hover:bg-terracotta-dark active:translate-y-0"
            >
              Safety notes
            </Link>
            <Link
              href="/allowed-services"
              className="inline-flex min-h-11 items-center rounded-full border border-sand bg-white px-5 py-2.5 text-sm font-bold text-espresso transition hover:-translate-y-0.5 hover:bg-linen active:translate-y-0"
            >
              Service scope
            </Link>
          </div>
        </Reveal>
      </section>

    </div>
  );
}
