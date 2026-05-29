const allowedServices = [
  { title: "Companionship", text: "Conversation, shared hobbies, reading together, or friendly presence." },
  { title: "Light errands", text: "Simple local tasks that do not involve valuables, cash handling, or private credentials." },
  { title: "Shopping", text: "Shopping lists, accompaniment, or carrying light items within practical limits." },
  { title: "Walks", text: "Outdoor accompaniment for everyday walks, not medical supervision." },
  { title: "Check-ins", text: "Friendly scheduled check-ins once real booking tools exist." },
  { title: "Technology help", text: "Basic device assistance without passwords, account takeover, or financial access." },
  { title: "Accompaniment", text: "Going along to appointments or institutions for everyday support, not clinical decisions." },
];

export default function AllowedServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Allowed services</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">What helpers may support</h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          The first marketplace scope is limited to non-medical support and everyday assistance. Requests should be safe, practical, and manageable without clinical training.
        </p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allowedServices.map((service) => (
          <li key={service.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-bold text-forest">{service.title}</h2>
            <p className="mt-3 leading-7 text-stone-700">{service.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 rounded-[2rem] bg-sage p-6 text-stone-700">
        <h2 className="text-2xl font-bold text-forest">Keep requests simple</h2>
        <p className="mt-3 leading-7">
          If a request starts to involve health decisions, medication, emergency response, money access, passwords, valuables, or legal authority, it belongs outside this planned marketplace scope.
        </p>
      </div>
    </section>
  );
}
