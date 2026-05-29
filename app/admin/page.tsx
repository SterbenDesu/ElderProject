import Link from "next/link";

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Planned feature</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest">Admin</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
        <p className="text-lg leading-8">
          This is a static placeholder. Real authentication, protected access, data storage, and admin logic are planned for a later implementation phase and are not active yet.
        </p>
        <p className="mt-4 leading-7">
          For now, review the <Link href="/safety" className="font-semibold text-forest underline">safety boundaries</Link> and service scope before the marketplace workflows are built.
        </p>
      </div>
    </section>
  );
}
