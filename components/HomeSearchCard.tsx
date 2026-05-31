"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulgariaCities } from "@/lib/bulgariaCities";
import { useI18n } from "@/lib/i18n";

export const serviceOptions = [
  { value: "stay-at-home", label: "Stay at home", icon: "home" },
  { value: "quick-visit", label: "Quick visit", icon: "clock" },
  { value: "shopping", label: "Shopping", icon: "cart" },
  { value: "house-work", label: "House work", icon: "spark" },
  { value: "companionship", label: "Companionship", icon: "heart" },
  { value: "accompaniment", label: "Accompaniment", icon: "pin" },
] as const;

type ServiceIconName = (typeof serviceOptions)[number]["icon"];

export function ServiceIcon({ name, className = "size-5" }: { name: ServiceIconName; className?: string }) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <path d="m3 11 9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
        <path d="M4 4.5 2.5 6" />
        <path d="M20 4.5 21.5 6" />
      </svg>
    );
  }

  if (name === "cart") {
    return (
      <svg {...commonProps}>
        <path d="M5 6h16l-2 8H7L5 3H3" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...commonProps}>
        <path d="M4 18h16" />
        <path d="M7 18v-7a5 5 0 0 1 10 0v7" />
        <path d="M9 14h6" />
        <path d="M12 3v2" />
        <path d="M19 5.5 17.5 7" />
        <path d="M5 5.5 6.5 7" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...commonProps}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        <path d="M9 13h6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M5 21h14" />
    </svg>
  );
}

function SelectionIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3.5"
    >
      {selected ? <path d="m5 10 3 3 7-7" /> : <path d="M10 5v10M5 10h10" />}
    </svg>
  );
}

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
    <div className="rounded-[2rem] border border-white/90 bg-white/95 p-5 shadow-2xl shadow-stone-300/45 backdrop-blur transition hover:shadow-stone-300/60 sm:p-6">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-sage via-cream to-white p-5 ring-1 ring-white/80 sm:p-7">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-clay">
          {t("Find support")}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-forest sm:text-3xl">
          {t("What kind of help do you need?")}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
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
                    <span className="group flex min-h-[4.75rem] items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-extrabold text-stone-700 shadow-sm shadow-stone-200/60 transition duration-150 peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-forest/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-clay hover:border-moss/50 hover:bg-sage hover:shadow-md active:translate-y-0">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-stone-100 transition group-hover:bg-white group-hover:text-forest ${
                          isSelected
                            ? "bg-white text-forest"
                            : "bg-cream text-forest"
                        }`}
                      >
                        <ServiceIcon name={service.icon} />
                      </span>
                      <span className="leading-5">{t(service.label)}</span>
                      <span
                        aria-hidden="true"
                        className={`ml-auto grid size-6 shrink-0 place-items-center rounded-full border border-current transition ${
                          isSelected
                            ? "bg-white text-forest opacity-100"
                            : "bg-white/10 text-current opacity-80"
                        }`}
                      >
                        <SelectionIcon selected={isSelected} />
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
