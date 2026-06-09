"use client";

import { ArrowUpDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { MarketplaceSort } from "@/lib/marketplace/criteria";
import { SORT_OPTIONS } from "@/lib/marketplace/sort";

export function SortDropdown({
  value,
  /** Proximity needs a searched address; disabled without one. */
  canSortByProximity,
  onChange,
}: {
  value: MarketplaceSort;
  canSortByProximity: boolean;
  onChange: (value: MarketplaceSort) => void;
}) {
  const { t } = useI18n();

  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-sand bg-white py-1.5 pl-3 pr-1.5 text-sm font-semibold text-forest shadow-sm">
      <ArrowUpDown className="size-4 shrink-0 text-moss" aria-hidden="true" />
      <span className="hidden text-stone-500 sm:inline">{t("Sort by")}</span>
      <select
        aria-label={t("Sort by")}
        value={value}
        onChange={(event) => onChange(event.target.value as MarketplaceSort)}
        className="min-h-9 cursor-pointer rounded-full bg-sage px-3 py-1.5 font-bold text-forest outline-none transition hover:bg-cream focus:ring-2 focus:ring-forest/30"
      >
        {SORT_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.value === "proximity" && !canSortByProximity}
          >
            {t(option.label)}
          </option>
        ))}
      </select>
    </label>
  );
}
