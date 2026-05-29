import Link from "next/link";

export default function HelperApplyPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Planned feature</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest">Apply as a helper</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
        <p className="text-lg leading-8">
          This helper application page is a static placeholder. Application forms, verification review, database storage, and admin approval are planned for a later implementation phase.
        </p>
        <p className="mt-4 leading-7">
          Future helpers will be independent marketplace participants. Review the <Link href="/allowed-services" className="font-semibold text-forest underline">allowed service scope</Link> before applying in a future version.
        </p>
      </div>
    </section>
  );
}
