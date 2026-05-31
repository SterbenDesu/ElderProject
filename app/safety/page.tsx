import Link from "next/link";

const safetyPoints = [
  { title: "Clear service limits", text: "The product scope stays focused on companionship and practical everyday help, not medical or licensed care." },
  { title: "Early helper review", text: "The shell includes basic helper applications, admin helper review, helper profile editing, and admin-controlled public helper visibility when Supabase is configured; this still does not guarantee safety." },
  { title: "Future complaint pathways", text: "Disputes and complaint UI are not implemented yet; future booking phases should define concern reporting and admin review before any payment release logic is added." },
  { title: "No absolute guarantees", text: "Good process can reduce risk, but the platform must not promise guaranteed safety." },
];

export default function SafetyPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Safety</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Trust-focused boundaries for an early marketplace shell</h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          Vnuk Pod Naem is planned as a technology marketplace for non-medical everyday assistance. The current testable shell has basic database-backed auth, client elderly profiles, booking requests, helper applications, helper profile editing, public helper visibility, and admin helper review when Supabase is configured. It is not launched, and payments, helper acceptance, disputes, chat, notifications, ratings, subscriptions, Bulgarian localization, and advanced admin workflows are not implemented.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {safetyPoints.map((point) => (
          <article key={point.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-bold text-forest">{point.title}</h2>
            <p className="mt-3 leading-7 text-stone-700">{point.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] bg-forest p-7 text-white">
        <h2 className="text-2xl font-bold">Important positioning</h2>
        <div className="mt-4 grid gap-4 text-stone-100 md:grid-cols-3">
          <p className="leading-7">Helpers are independent marketplace participants, not employees of Vnuk Pod Naem.</p>
          <p className="leading-7">The platform is not a medical provider, licensed care provider, or emergency service.</p>
          <p className="leading-7">Users should never request card PINs, passwords, cash handling, or access to valuables.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/allowed-services" className="rounded-full bg-sage px-5 py-4 text-center font-semibold text-forest transition hover:bg-white">Review allowed services</Link>
        <Link href="/prohibited-services" className="rounded-full bg-white px-5 py-4 text-center font-semibold text-forest shadow-sm ring-1 ring-stone-200 transition hover:bg-sage">Review prohibited services</Link>
      </div>
    </section>
  );
}
