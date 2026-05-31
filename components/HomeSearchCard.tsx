"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulgariaCities } from "@/lib/bulgariaCities";

const serviceOptions = [
  { value: "stay-at-home", label: "Stay at home", icon: "🏡" },
  { value: "quick-visit", label: "Quick visit", icon: "☕" },
  { value: "shopping", label: "Shopping", icon: "🛒" },
  { value: "house-work", label: "House work", icon: "🧺" },
  { value: "companionship", label: "Companionship", icon: "🌿" },
  { value: "accompaniment", label: "Accompaniment", icon: "🚶" },
];

export function formatServiceLabel(serviceValue: string) {
  return (
    serviceOptions.find((service) => service.value === serviceValue)?.label ??
    serviceValue
  );
}

export function HomeSearchCard() {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState("shopping");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const normalizedEndDate = useMemo(() => {
    if (startDate && endDate && endDate < startDate) {
      return startDate;
    }

    return endDate;
  }, [endDate, startDate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = new URLSearchParams();

    if (city) {
      query.set("city", city);
    }

    if (selectedService) {
      query.set("service", selectedService);
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
    <div className="rounded-[2rem] border border-white/90 bg-white/95 p-4 shadow-2xl shadow-stone-300/50 backdrop-blur sm:p-6">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-sage via-cream to-white p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
          Find support
        </p>
        <h2 className="mt-3 text-2xl font-bold text-forest sm:text-3xl">
          What kind of help do you need?
        </h2>
        <p className="mt-3 text-base leading-7 text-stone-700">
          Choose a service, city, and date range. We’ll show matching caregivers.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <fieldset>
            <legend className="text-sm font-bold text-stone-700">
              Service type
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceOptions.map((service) => (
                <label key={service.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="service"
                    value={service.value}
                    checked={selectedService === service.value}
                    onChange={() => setSelectedService(service.value)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 shadow-sm transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay hover:border-moss/50 hover:bg-sage">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-xl text-stone-900 peer-checked:bg-white">
                      {service.icon}
                    </span>
                    <span>{service.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-stone-700">
              Start date
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 focus:border-clay focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-stone-700">
              End date
              <input
                name="endDate"
                type="date"
                value={normalizedEndDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 focus:border-clay focus:outline-none"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-stone-700">
            City
            <select
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
              className="min-h-[3.25rem] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-inner shadow-stone-100 focus:border-clay focus:outline-none"
            >
              <option value="">Any listed city</option>
              {bulgariaCities.map((cityOption) => (
                <option key={cityOption.value} value={cityOption.value}>
                  {cityOption.labelEn}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-forest px-6 py-4 text-base font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-stone-800"
          >
            Browse caregivers
          </button>
        </form>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          This search opens caregiver listings only. It does not create a booking,
          reserve time, or take payment.
        </p>
      </div>
    </div>
  );
}
