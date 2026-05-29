const prohibitedServices = [
  "Medication management",
  "Injections",
  "Wound care",
  "Clinical tasks",
  "Cash handling",
  "Card PIN or password requests",
  "Off-platform payments",
  "Access-to-valuables requests",
];

export default function ProhibitedServicesPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Prohibited services</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest">Requests the platform must not accept</h1>
      <p className="mt-5 text-lg leading-8 text-stone-700">
        VnukPodNaem is not a medical care service and does not support unsafe financial, credential, or valuables-related requests.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {prohibitedServices.map((service) => (
          <li key={service} className="rounded-2xl border border-red-100 bg-white p-4 font-medium text-stone-800 shadow-sm">
            {service}
          </li>
        ))}
      </ul>
    </section>
  );
}
