const allowedServices = [
  "Companionship",
  "Light errands",
  "Shopping",
  "Walks",
  "Check-ins",
  "Technology help",
  "Accompaniment to appointments or institutions",
];

export default function AllowedServicesPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-clay">Allowed services</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest">What helpers may support</h1>
      <p className="mt-5 text-lg leading-8 text-stone-700">
        The first marketplace scope is limited to non-medical support and everyday assistance. Requests should be safe, practical, and manageable without clinical training.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {allowedServices.map((service) => (
          <li key={service} className="rounded-2xl bg-white p-4 font-medium text-stone-800 shadow-sm ring-1 ring-stone-200">
            {service}
          </li>
        ))}
      </ul>
    </section>
  );
}
