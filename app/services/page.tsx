"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const services = [
  { title: "Companionship and conversation", detail: "Friendly visits, shared activities, reading together, or conversation that helps older adults feel connected." },
  { title: "Light errands", detail: "Small practical tasks such as picking up simple items, mailing something, or handling a short local errand." },
  { title: "Shopping support", detail: "Help planning a routine shopping list, accompanying someone to a shop, or carrying light everyday items." },
  { title: "Walks and outdoor accompaniment", detail: "Calm walks or accompaniment outside the home when the request is practical, planned, and comfortable for everyone." },
  { title: "Friendly check-ins", detail: "Scheduled visits or calls that give families a simple way to arrange a warm everyday check-in." },
  { title: "Basic technology help", detail: "Help with simple phone, tablet, video-call, or app basics so an older adult can stay more connected." },
  { title: "Accompaniment", detail: "Going with an older adult to appointments, offices, or local institutions as everyday support." },
];

export default function ServicesPage() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">{t("Services")}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-forest sm:text-5xl">
          {t("Everyday support categories")}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          {t("Vnuk Pod Naem presents practical support types that families can understand quickly before creating a basic request. Each category is meant to describe ordinary, everyday help in a clear and limited way.")}
        </p>
      </div>

      <aside className="mt-8 rounded-[2rem] border border-forest/10 bg-sage/80 px-6 py-5 text-stone-700 shadow-sm sm:px-7 lg:flex lg:items-start lg:justify-between lg:gap-8">
        <div className="max-w-4xl">
          <h2 className="text-xl font-bold text-forest">{t("Current service scope")}</h2>
          <p className="mt-3 leading-7">
            {t("These service categories support the current test version. Families can browse support types and create basic requests, while live availability, helper acceptance, payments, disputes, ratings, and advanced marketplace workflows are not active yet.")}
          </p>
        </div>
        <Link
          className="mt-4 inline-flex text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-4 transition hover:text-stone-800 lg:mt-1 lg:shrink-0"
          href="/safety"
        >
          {t("For detailed limits, review the Safety page.")}
        </Link>
      </aside>

      <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-bold text-forest">{t(service.title)}</h2>
            <p className="mt-3 leading-7 text-stone-700">{t(service.detail)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
