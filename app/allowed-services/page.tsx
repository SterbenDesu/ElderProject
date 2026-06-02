import { PageIntro } from "@/components/PageIntro";

const allowedServices = [
  { title: "Companionship", text: "Conversation, shared hobbies, reading together, or friendly presence." },
  { title: "Light errands", text: "Simple local tasks that do not involve valuables, cash handling, or private credentials." },
  { title: "Shopping", text: "Shopping lists, accompaniment, or carrying light items within practical limits." },
  { title: "Walks", text: "Outdoor accompaniment for everyday walks, not medical supervision." },
  { title: "Check-ins", text: "Friendly scheduled check-ins within the current early booking-request shell." },
  { title: "Technology help", text: "Basic device assistance without passwords, account takeover, or financial access." },
  { title: "Accompaniment", text: "Going along to appointments or institutions for everyday support, not clinical decisions." },
];

export default function AllowedServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Allowed services"
        title="What helpers may support"
        description="The first marketplace scope is limited to non-medical support and everyday assistance. Requests should be safe, practical, and manageable without clinical training."
      />
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
