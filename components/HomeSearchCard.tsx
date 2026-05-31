"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulgariaCities } from "@/lib/bulgariaCities";
import { useI18n } from "@/lib/i18n";

export const serviceOptions = [
  { value: "stay-at-home", label: "Stay at home", icon: "🏡" },
  { value: "quick-visit", label: "Quick visit", icon: "☕" },
  { value: "shopping", label: "Shopping", icon: "🛒" },
  { value: "house-work", label: "House work", icon: "🧺" },
  { value: "companionship", label: "Companionship", icon: "🌿" },
  { value: "accompaniment", label: "Accompaniment", icon: "🚶" },
];

export function formatServiceLabel(serviceValue: string, translator?: (text: string) => string) {
  const label =
    serviceOptions.find((service) => service.value === serviceValue)?.label ??
    serviceValue;

  return translator ? translator(label) : label;
}

export function HomeSearchCard() {
  const router = useRouter();
  const { t, language } = useI18n();
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "shopping",
  ]);
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const normalizedEndDate = useMemo(() => {
    if (startDate && endDate && endDate < startDate) {
      return startDate;
    }

    return endDate;
  }, [endDate, startDate]);

  function toggleService(serviceValue: string) {
    setSelectedServices((currentServices) => {
      if (currentServices.includes(serviceValue)) {
        return currentServices.filter((value) => value !== serviceValue);
      }

      return [...currentServices, serviceValue];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = new URLSearchParams();

    if (city) {
      query.set("city", city);
    }

    if (selectedServices.length > 0) {
      query.set("services", selectedServices.join(","));
    }

    if (startDate) {
      query.set("startDate", startDate);
    }

    if (normalizedEndDate) {
      query.set("endDate", normalizedEndDate);
    }

    const queryString = query.toString();
    router.push(queryString ? `/helpers?${queryString}` : "/helpers");
  }

  return (
    <div className="rounded-[2rem] border border-white/90 bg-white/95 p-4 shadow-2xl shadow-stone-300/45 backdrop-blur transition hover:shadow-stone-300/60 sm:p-6">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-sage via-cream to-white p-5 ring-1 ring-white/80 sm:p-6">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-clay">
          {t("Find support")}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-forest sm:text-3xl">
          {t("What kind of help do you need?")}
        </h2>
        <p className="mt-3 text-base leading-7 text-stone-700">
          {t(
            "Choose one or more services, a city, and a date range. We’ll show caregivers using the information that is currently available.",
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <fieldset>
            <legend className="text-sm font-extrabold text-stone-700">
              {t("Service types")}
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceOptions.map((service) => {
                const isSelected = selectedServices.includes(service.value);

                return (
                  <label key={service.value} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="services"
                      value={service.value}
                      checked={isSelected}
                      onChange={() => toggleService(service.value)}
                      className="peer sr-only"
                    />
                    <span className="group flex min-h-16 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-extrabold text-stone-700 shadow-sm shadow-stone-200/60 transition duration-150 peer-checked:-translate-y-0.5 peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-forest/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay hover:-translate-y-0.5 hover:border-moss/50 hover:bg-sage hover:shadow-md active:translate-y-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-xl text-stone-900 ring-1 ring-stone-100 transition group-hover:bg-white peer-checked:bg-white">
                        {service.icon}
                      </span>
                      <span>{t(service.label)}</span>
                      <span
                        aria-hidden="true"
                        className="ml-auto grid size-5 place-items-center rounded-full border border-current text-[0.65rem] opacity-70"
                      >
                        {isSelected ? "✓" : "+"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-extrabold text-stone-700">
              {t("Start date")}
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 transition focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
              />
            </label>

            <label className="grid gap-2 text-sm font-extrabold text-stone-700">
              {t("End date")}
              <input
                name="endDate"
                type="date"
                value={normalizedEndDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 transition focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-extrabold text-stone-700">
            {t("City")}
            <select
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
              className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 transition focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            >
              <option value="">{t("Any listed city")}</option>
              {bulgariaCities.map((cityOption) => (
                <option key={cityOption.value} value={cityOption.value}>
                  {language === "bg" ? cityOption.labelBg : cityOption.labelEn}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-forest/20 transition hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-xl hover:shadow-forest/25 active:translate-y-0"
          >
            {t("Search caregivers")}
          </button>
        </form>
      </div>
    </div>
  );
}
