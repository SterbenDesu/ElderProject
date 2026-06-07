"use client";

// Section 1 of the caregiver dashboard: pick which catalogue services you
// perform, set YOUR OWN price (in лв.) for each, and add optional priced extras.
// Saves are owner-scoped by RLS — a caregiver can only edit their own rows.

import { Check, CircleCheck, Coins, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatLevaAmount,
  loadCaregiverServices,
  loadServiceCatalog,
  loadServiceExtras,
  parseLevaToMinor,
  saveCaregiverServices,
  saveServiceExtras,
  type ServiceCatalogItem,
} from "@/lib/supabase/caregiverDashboard";

type ServiceRowState = { enabled: boolean; price: string };
type ExtraRowState = { id?: string; label: string; price: string };

const cardClass =
  "rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8";
const priceInputClass =
  "min-h-12 w-28 rounded-2xl border border-sand bg-white px-3 py-2 text-right text-lg font-semibold text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";
const textInputClass =
  "min-h-12 w-full rounded-2xl border border-sand bg-white px-4 py-2 text-base text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60";

export function ServicesPricingSection({
  caregiverProfileId,
}: {
  caregiverProfileId: string;
}) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [serviceState, setServiceState] = useState<
    Record<string, ServiceRowState>
  >({});
  const [extras, setExtras] = useState<ExtraRowState[]>([]);
  const [existingExtraIds, setExistingExtraIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [savingServices, setSavingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesSuccess, setServicesSuccess] = useState<string | null>(null);

  const [savingExtras, setSavingExtras] = useState(false);
  const [extrasError, setExtrasError] = useState<string | null>(null);
  const [extrasSuccess, setExtrasSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setLoadError(envError);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const [catalogResult, servicesResult, extrasResult] = await Promise.all([
      loadServiceCatalog(supabase),
      loadCaregiverServices(supabase, caregiverProfileId),
      loadServiceExtras(supabase, caregiverProfileId),
    ]);

    const firstError =
      catalogResult.errorMessage ||
      servicesResult.errorMessage ||
      extrasResult.errorMessage;
    if (firstError) {
      setLoadError(firstError);
      setIsLoading(false);
      return;
    }

    setCatalog(catalogResult.data);

    const nextServiceState: Record<string, ServiceRowState> = {};
    for (const service of catalogResult.data) {
      const existing = servicesResult.data.find(
        (row) => row.service_id === service.id,
      );
      nextServiceState[service.id] = existing
        ? { enabled: true, price: formatLevaAmount(existing.price_amount) }
        : { enabled: false, price: "" };
    }
    setServiceState(nextServiceState);

    setExtras(
      extrasResult.data.map((row) => ({
        id: row.id,
        label: row.label,
        price: formatLevaAmount(row.price_amount),
      })),
    );
    setExistingExtraIds(extrasResult.data.map((row) => row.id));

    setIsLoading(false);
  }, [caregiverProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleService(serviceId: string) {
    setServicesSuccess(null);
    setServiceState((current) => {
      const row = current[serviceId] ?? { enabled: false, price: "" };
      return { ...current, [serviceId]: { ...row, enabled: !row.enabled } };
    });
  }

  function setServicePrice(serviceId: string, price: string) {
    setServicesSuccess(null);
    setServiceState((current) => {
      const row = current[serviceId] ?? { enabled: false, price: "" };
      return { ...current, [serviceId]: { ...row, price } };
    });
  }

  async function handleSaveServices() {
    setServicesError(null);
    setServicesSuccess(null);

    const desired = catalog.map((service) => {
      const row = serviceState[service.id] ?? { enabled: false, price: "" };
      return {
        serviceId: service.id,
        enabled: row.enabled,
        priceMinor: parseLevaToMinor(row.price) ?? -1,
        name: service.name,
      };
    });

    const invalid = desired.find(
      (item) => item.enabled && item.priceMinor < 0,
    );
    if (invalid) {
      setServicesError(
        `Please enter a valid price in лв. for "${invalid.name}" (0 or more).`,
      );
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setServicesError(envError);
      return;
    }

    setSavingServices(true);
    const { errorMessage } = await saveCaregiverServices(
      supabase,
      caregiverProfileId,
      desired.map(({ serviceId, enabled, priceMinor }) => ({
        serviceId,
        enabled,
        priceMinor,
      })),
    );
    setSavingServices(false);

    if (errorMessage) {
      setServicesError(`Could not save your services: ${errorMessage}`);
      return;
    }

    setServicesSuccess("Your services and prices were saved.");
    await load();
  }

  function addExtra() {
    setExtrasSuccess(null);
    setExtras((current) => [...current, { label: "", price: "" }]);
  }

  function updateExtra(index: number, patch: Partial<ExtraRowState>) {
    setExtrasSuccess(null);
    setExtras((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeExtra(index: number) {
    setExtrasSuccess(null);
    setExtras((current) => current.filter((_, i) => i !== index));
  }

  async function handleSaveExtras() {
    setExtrasError(null);
    setExtrasSuccess(null);

    const cleaned: { id?: string; label: string; priceMinor: number }[] = [];
    for (const row of extras) {
      const label = row.label.trim();
      if (!label) {
        setExtrasError("Please give every extra a short name, or remove it.");
        return;
      }
      const priceMinor = parseLevaToMinor(row.price);
      if (priceMinor === null) {
        setExtrasError(`Please enter a valid price in лв. for "${label}".`);
        return;
      }
      cleaned.push({ id: row.id, label, priceMinor });
    }

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setExtrasError(envError);
      return;
    }

    setSavingExtras(true);
    const { errorMessage } = await saveServiceExtras(
      supabase,
      caregiverProfileId,
      cleaned,
      existingExtraIds,
    );
    setSavingExtras(false);

    if (errorMessage) {
      setExtrasError(`Could not save your extras: ${errorMessage}`);
      return;
    }

    setExtrasSuccess("Your optional extras were saved.");
    await load();
  }

  if (isLoading) {
    return (
      <div className={cardClass}>
        <p className="flex items-center gap-2 text-espresso-light" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Loading your services…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h3 className="text-xl font-bold">Could not load your services</h3>
        <p className="mt-3 text-sm leading-6">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linen text-terracotta">
            <Coins className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-espresso">
              My services &amp; prices
            </h2>
            <p className="mt-1 text-base leading-7 text-espresso-light">
              Turn on the services you perform and set your own price in лв. for
              each. These prices appear on your public profile and the
              marketplace.
            </p>
          </div>
        </div>

        <ul className="mt-6 grid gap-3">
          {catalog.map((service) => {
            const row = serviceState[service.id] ?? {
              enabled: false,
              price: "",
            };
            return (
              <li
                key={service.id}
                className={`rounded-2xl border p-4 transition ${
                  row.enabled
                    ? "border-terracotta/40 bg-linen"
                    : "border-sand bg-ivory"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-espresso">
                      {service.name}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-espresso-light">
                      {service.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {row.enabled ? (
                      <label className="flex items-center gap-2">
                        <span className="sr-only">
                          Price for {service.name}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.price}
                          onChange={(event) =>
                            setServicePrice(service.id, event.target.value)
                          }
                          placeholder="0.00"
                          className={priceInputClass}
                          aria-label={`Price in leva for ${service.name}`}
                        />
                        <span className="text-base font-bold text-espresso">
                          лв.
                        </span>
                      </label>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => toggleService(service.id)}
                      aria-pressed={row.enabled}
                      className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                        row.enabled
                          ? "bg-terracotta text-white hover:bg-terracotta-dark"
                          : "border border-sand bg-white text-terracotta hover:bg-linen"
                      }`}
                    >
                      {row.enabled ? (
                        <>
                          <Check className="size-4" aria-hidden="true" />
                          Offered
                        </>
                      ) : (
                        "Offer this"
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {servicesError ? (
          <p
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {servicesError}
          </p>
        ) : null}
        {servicesSuccess ? (
          <p
            className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            {servicesSuccess}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSaveServices}
          disabled={savingServices}
          className={`mt-6 ${primaryButtonClass}`}
        >
          {savingServices ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {savingServices ? "Saving…" : "Save services"}
        </button>
      </div>

      <div className={cardClass}>
        <h2 className="font-display text-2xl font-extrabold text-espresso">
          Optional extras
        </h2>
        <p className="mt-1 text-base leading-7 text-espresso-light">
          Small add-ons an elder can choose at booking time, each with its own
          price in лв. — for example taking out the trash or a light tidy-up.
        </p>

        <ul className="mt-5 grid gap-3">
          {extras.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-sand bg-ivory px-4 py-6 text-center text-sm text-espresso-light">
              No extras yet. Add one below if you offer small add-ons.
            </li>
          ) : null}
          {extras.map((row, index) => (
            <li
              key={row.id ?? `new-${index}`}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand bg-ivory p-4"
            >
              <input
                type="text"
                value={row.label}
                onChange={(event) =>
                  updateExtra(index, { label: event.target.value })
                }
                placeholder="Extra name (e.g. Take out the trash)"
                className={`${textInputClass} flex-1`}
                aria-label="Extra name"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.price}
                  onChange={(event) =>
                    updateExtra(index, { price: event.target.value })
                  }
                  placeholder="0.00"
                  className={priceInputClass}
                  aria-label="Extra price in leva"
                />
                <span className="text-base font-bold text-espresso">лв.</span>
              </div>
              <button
                type="button"
                onClick={() => removeExtra(index)}
                className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-sand bg-white px-4 py-2 text-sm font-bold text-clay transition hover:bg-cream"
                aria-label={`Remove ${row.label || "extra"}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addExtra}
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-sand bg-white px-5 py-2.5 text-sm font-bold text-terracotta transition hover:bg-linen"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add an extra
        </button>

        {extrasError ? (
          <p
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {extrasError}
          </p>
        ) : null}
        {extrasSuccess ? (
          <p
            className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            {extrasSuccess}
          </p>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSaveExtras}
            disabled={savingExtras}
            className={primaryButtonClass}
          >
            {savingExtras ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {savingExtras ? "Saving…" : "Save extras"}
          </button>
        </div>
      </div>
    </div>
  );
}
