import { PageIntro } from "@/components/PageIntro";

const prohibitedServices = [
  { title: "Medication management", text: "No administering, organizing, reminding as a medical responsibility, or changing medication routines." },
  { title: "Injections or wound care", text: "No clinical procedures, dressing changes, injections, or treatment tasks." },
  { title: "Clinical or emergency tasks", text: "No diagnosis, medical monitoring, emergency response, lifting beyond safe everyday support, or licensed care." },
  { title: "Cash handling", text: "No managing cash, collecting money, or making informal off-platform financial arrangements." },
  { title: "Card PINs and passwords", text: "No requests for bank card PINs, account passwords, one-time codes, or private credentials." },
  { title: "Access to valuables", text: "No requests to access safes, jewelry, property documents, or other valuables." },
  { title: "Off-platform payments", text: "No payment directions are active in this shell, and future payments should use an approved provider only." },
];

export default function ProhibitedServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Prohibited services"
        title="Requests the platform must not accept"
        description="Vnuk Pod Naem is not a medical care service and does not support unsafe financial, credential, valuables-related, or off-platform transaction requests."
      />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prohibitedServices.map((service) => (
          <li key={service.title} className="rounded-3xl border border-clay/20 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-forest">{service.title}</h2>
            <p className="mt-3 leading-7 text-stone-700">{service.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 rounded-[2rem] bg-forest p-6 text-white">
        <h2 className="text-2xl font-bold">If in doubt, do not accept the request</h2>
        <p className="mt-3 leading-7 text-stone-100">
          Future product flows should direct users toward appropriate professional, emergency, legal, or financial support when a request falls outside non-medical everyday assistance.
        </p>
      </div>
    </section>
  );
}
