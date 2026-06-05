"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Heart,
  Home,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
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

const serviceIconMap: Record<ServiceIconName, LucideIcon> = {
  home: Home,
  clock: Clock,
  cart: ShoppingCart,
  spark: Sparkles,
  heart: Heart,
  pin: MapPin,
};

export function ServiceIcon({
  name,
  className = "size-5",
}: {
  name: ServiceIconName;
  className?: string;
}) {
  const Icon = serviceIconMap[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
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
    <div className="w-full rounded-[2rem] border border-white bg-white/95 p-5 shadow-2xl shadow-espresso/15 backdrop-blur transition hover:shadow-espresso/20 sm:p-6">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-ivory via-linen to-white p-5 ring-1 ring-sand/70 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-terracotta">
          {t("Find support")}
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.02em] text-espresso sm:text-3xl">
          {t("What kind of help do you need?")}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-espresso-light">
          {t(
            "Choose one or more services, a city, and a date range. We’ll show caregivers using the information that is currently available.",
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <fieldset>
            <legend className="text-sm font-bold text-espresso">
              {t("Service types")}
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {serviceOptions.map((service) => {
                const isSelected = selectedServices.includes(service.value);

                return (
                  <label key={service.value} className="h-full cursor-pointer">
                    <input
                      type="checkbox"
                      name="services"
                      value={service.value}
                      checked={isSelected}
                      onChange={() => toggleService(service.value)}
                      className="peer sr-only"
                    />
                    <span className="group grid min-h-20 grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-center gap-2.5 rounded-2xl border border-sand bg-white px-3 py-3 text-[0.83rem] font-bold text-espresso shadow-sm shadow-espresso/5 transition duration-200 peer-checked:border-terracotta peer-checked:bg-terracotta peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-terracotta/30 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta hover:-translate-y-0.5 hover:border-terracotta/50 hover:bg-ivory hover:shadow-md active:translate-y-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] sm:gap-3 sm:px-4 sm:text-sm">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-sand/70 transition group-hover:bg-white group-hover:text-terracotta ${
                          isSelected
                            ? "bg-white text-terracotta"
                            : "bg-linen text-terracotta"
                        }`}
                      >
                        <ServiceIcon name={service.icon} />
                      </span>
                      <span className="min-w-0 whitespace-normal break-words leading-5">{t(service.label)}</span>
                      <span
                        aria-hidden="true"
                        className={`ml-auto grid size-6 shrink-0 place-items-center rounded-full border border-current transition ${
                          isSelected
                            ? "bg-white text-terracotta opacity-100"
                            : "bg-white/10 text-current opacity-70"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                        ) : (
                          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-espresso">
              {t("Start date")}
              <input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-sand bg-white px-4 py-3 text-base font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-espresso">
              {t("End date")}
              <input
                name="endDate"
                type="date"
                value={normalizedEndDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="min-h-[3.25rem] rounded-2xl border border-sand bg-white px-4 py-3 text-base font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-espresso">
            {t("City")}
            <select
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
              className="min-h-[3.25rem] rounded-2xl border border-sand bg-white px-4 py-3 text-base font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
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
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3 text-base font-bold text-white shadow-lg shadow-terracotta/30 transition hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl hover:shadow-terracotta/40 active:translate-y-0"
          >
            <Search className="size-5" strokeWidth={2} aria-hidden="true" />
            {t("Search caregivers")}
          </button>
        </form>
      </div>
    </div>
  );
}
