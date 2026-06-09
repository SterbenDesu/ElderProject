"use client";

// Calm loading skeleton for a caregiver card. Warm tones, gentle pulse — never
// a cold grey box. Mirrors the real card's shape so the layout doesn't jump.

export function CaregiverCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-[1.5rem] border border-moss/15 bg-white p-3 shadow-sm sm:p-4">
      <div className="size-24 shrink-0 rounded-[1.1rem] bg-sage sm:size-28" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-1/3 rounded-full bg-sage" />
          <div className="h-4 w-16 rounded-full bg-cream" />
        </div>
        <div className="h-3.5 w-2/5 rounded-full bg-cream" />
        <div className="flex gap-1.5">
          <div className="h-5 w-20 rounded-full bg-sage" />
          <div className="h-5 w-16 rounded-full bg-sage" />
        </div>
        <div className="h-3 w-full rounded-full bg-cream" />
        <div className="h-3 w-4/5 rounded-full bg-cream" />
        <div className="mt-1 flex items-center justify-between">
          <div className="h-5 w-20 rounded-full bg-sage" />
          <div className="h-8 w-24 rounded-full bg-sage" />
        </div>
      </div>
    </div>
  );
}
