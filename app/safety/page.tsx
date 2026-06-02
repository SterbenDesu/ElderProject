"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const safetyPoints = [
  { title: "Clear service limits", text: "The product scope stays focused on companionship and practical everyday help, not medical or licensed care." },
  { title: "Early helper review", text: "The shell includes basic helper applications, admin helper review, helper profile editing, and admin-controlled public helper visibility when Supabase is configured; this still does not guarantee safety." },
  { title: "Future complaint pathways", text: "Disputes and complaint UI are not implemented yet; future booking phases should define concern reporting and admin review before any payment release logic is added." },
  { title: "No absolute guarantees", text: "Good process can reduce risk, but the platform must not promise guaranteed safety." },
];

const allowedServices = [
  { title: "Companionship", text: "Conversation, shared hobbies, reading together, or friendly presence." },
  { title: "Light errands", text: "Simple local tasks that do not involve valuables, cash handling, or private credentials." },
  { title: "Shopping", text: "Shopping lists, accompaniment, or carrying light items within practical limits." },
  { title: "Walks", text: "Outdoor accompaniment for everyday walks, not medical supervision." },
  { title: "Check-ins", text: "Friendly scheduled check-ins within the current early booking-request shell." },
  { title: "Technology help", text: "Basic device assistance without passwords, account takeover, or financial access." },
  { title: "Accompaniment", text: "Going along to appointments or institutions for everyday support, not clinical decisions." },
];

const prohibitedServices = [
  { title: "Medication management", text: "No administering, organizing, reminding as a medical responsibility, or changing medication routines." },
  { title: "Injections or wound care", text: "No clinical procedures, dressing changes, injections, or treatment tasks." },
  { title: "Clinical or emergency tasks", text: "No diagnosis, medical monitoring, emergency response, lifting beyond safe everyday support, or licensed care." },
  { title: "Cash handling", text: "No managing cash, collecting money, or making informal off-platform financial arrangements." },
  { title: "Card PINs and passwords", text: "No requests for bank card PINs, account passwords, one-time codes, or private credentials." },
  { title: "Access to valuables", text: "No requests to access safes, jewelry, property documents, or other valuables." },
  { title: "Off-platform payments", text: "No payment directions are active in this shell, and future payments should use an approved provider only." },
];

type ServiceView = "allowed" | "prohibited";

const serviceTabs: { id: ServiceView; label: string; panelId: string }[] = [
  { id: "allowed", label: "Allowed services", panelId: "allowed-services-panel" },
  { id: "prohibited", label: "Prohibited services", panelId: "prohibited-services-panel" },
];

export default function SafetyPage() {
  const [selectedView, setSelectedView] = useState<ServiceView>("allowed");
  const { t } = useI18n();
  const isAllowedView = selectedView === "allowed";
  const selectedServices = isAllowedView ? allowedServices : prohibitedServices;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">{t("Safety")}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">{t("Trust-focused boundaries for an early marketplace shell")}</h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          {t("Vnuk Pod Naem is planned as a technology marketplace for non-medical everyday assistance. The current testable shell has basic database-backed auth, client elderly profiles, booking requests, helper applications, helper profile editing, public helper visibility, and admin helper review when Supabase is configured. It is not launched, and payments, helper acceptance, disputes, chat, notifications, ratings, subscriptions, and advanced admin workflows are not implemented.")}
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {safetyPoints.map((point) => (
          <article key={point.title} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-bold text-forest">{t(point.title)}</h2>
            <p className="mt-3 leading-7 text-stone-700">{t(point.text)}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] bg-forest p-7 text-white">
        <h2 className="text-2xl font-bold">{t("Important positioning")}</h2>
        <div className="mt-4 grid gap-4 text-stone-100 md:grid-cols-3">
          <p className="leading-7">{t("Helpers are independent marketplace participants, not employees of Vnuk Pod Naem.")}</p>
          <p className="leading-7">{t("The platform is not a medical provider, licensed care provider, or emergency service.")}</p>
          <p className="leading-7">{t("Users should never request card PINs, passwords, cash handling, or access to valuables.")}</p>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">{t("Service scope")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-forest">{t("How requests stay practical")}</h2>
          <p className="mt-3 leading-7 text-stone-700">
            {t("Some services are limited for safety and legal reasons. Use these in-page views to check what can be requested and what should not be requested.")}
          </p>
        </div>

        <div
          aria-label={t("Service scope views")}
          className="mt-6 grid gap-2 rounded-full bg-sage/70 p-1.5 sm:inline-grid sm:min-w-[28rem] sm:grid-cols-2"
          role="tablist"
        >
          {serviceTabs.map((tab) => {
            const isActive = selectedView === tab.id;

            return (
              <button
                key={tab.id}
                aria-controls={tab.panelId}
                aria-selected={isActive}
                className={`rounded-full px-5 py-3 text-center text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:text-base ${
                  isActive
                    ? "bg-forest text-white shadow-sm"
                    : "bg-white/70 text-forest ring-1 ring-forest/10 hover:bg-white"
                }`}
                id={`${tab.id}-services-tab`}
                onClick={() => setSelectedView(tab.id)}
                role="tab"
                type="button"
              >
                {t(tab.label)}
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`${selectedView}-services-tab`}
          className="mt-8"
          id={isAllowedView ? "allowed-services-panel" : "prohibited-services-panel"}
          role="tabpanel"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
              {isAllowedView ? t("What can be requested") : t("What should not be requested")}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-forest">
              {isAllowedView ? t("What helpers may support") : t("Requests the platform must not accept")}
            </h3>
            <p className="mt-3 leading-7 text-stone-700">
              {isAllowedView
                ? t("The first marketplace scope is limited to everyday support. Requests should be safe, practical, and manageable without clinical training.")
                : t("Vnuk Pod Naem does not support unsafe medical, financial, credential, valuables-related, or off-platform transaction requests.")}
            </p>
          </div>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedServices.map((service) => (
              <li
                key={service.title}
                className={`rounded-3xl bg-white p-6 shadow-sm ${
                  isAllowedView ? "ring-1 ring-stone-200" : "border border-clay/20"
                }`}
              >
                <h4 className="text-xl font-bold text-forest">{t(service.title)}</h4>
                <p className="mt-3 leading-7 text-stone-700">{t(service.text)}</p>
              </li>
            ))}
          </ul>

          <div className={`mt-6 rounded-[2rem] p-6 ${isAllowedView ? "bg-sage text-stone-700" : "bg-forest text-white"}`}>
            <h3 className={`text-2xl font-bold ${isAllowedView ? "text-forest" : "text-white"}`}>
              {isAllowedView ? t("Keep requests simple") : t("If in doubt, do not accept the request")}
            </h3>
            <p className={`mt-3 leading-7 ${isAllowedView ? "text-stone-700" : "text-stone-100"}`}>
              {isAllowedView
                ? t("If a request starts to involve health decisions, medication, emergency response, money access, passwords, valuables, or legal authority, it belongs outside this planned marketplace scope.")
                : t("Future product flows should direct users toward appropriate professional, emergency, legal, or financial support when a request falls outside everyday assistance.")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
