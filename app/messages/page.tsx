"use client";

// The "Messages" inbox: every chat thread the signed-in user takes part in,
// newest activity first, with the counterparty's public-safe name + avatar, a
// last-message preview, the unread count, and the booking status. Threads exist
// only for approved reservations, so this list is the in-platform record of who
// the user is actively talking to.
//
// ACCESS CONTROL: get_my_chat_threads is SECURITY DEFINER and only returns
// threads where the caller is the elder OR owns the caregiver profile. Names +
// avatars are public-safe (elder first name / caregiver display name) — never a
// phone or email. The one-way rule holds: no browse-elders surface here.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  loadMyChatThreads,
  type ChatThreadSummary,
} from "@/lib/supabase/chat";

function previewText(
  thread: ChatThreadSummary,
  t: (text: string) => string,
): { text: string; translate: boolean } {
  if (!thread.lastMessageKind) {
    return { text: t("Say hello to start the conversation"), translate: true };
  }
  const prefix = thread.lastMessageIsMine ? `${t("You")}: ` : "";
  if (thread.lastMessageKind === "voice") {
    return { text: `${prefix}${t("Voice message")}`, translate: true };
  }
  if (thread.lastMessageKind === "image") {
    return { text: `${prefix}${t("Photo")}`, translate: true };
  }
  // Real user text — do not run it through the translator.
  return { text: `${prefix}${thread.lastMessageBody ?? ""}`, translate: false };
}

function ThreadRow({ thread }: { thread: ChatThreadSummary }) {
  const { t, language } = useI18n();
  const locale = language === "bg" ? "bg" : "en";
  const initial = thread.counterpartyName?.trim()?.slice(0, 1)?.toUpperCase() || "?";
  const preview = previewText(thread, t);

  const timeLabel = thread.lastMessageAt
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(thread.lastMessageAt))
    : null;

  return (
    <Link
      href={`/messages/${thread.threadId}`}
      className="flex items-center gap-4 rounded-[1.75rem] border border-sand bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-terracotta/30 hover:shadow-md"
    >
      {thread.counterpartyAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thread.counterpartyAvatarUrl}
          alt=""
          className="size-14 shrink-0 rounded-full object-cover ring-1 ring-sand"
          data-no-translate
        />
      ) : (
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-terracotta text-xl font-bold text-white"
          aria-hidden="true"
          data-no-translate
        >
          {initial}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-lg font-bold text-espresso" data-no-translate>
            {thread.counterpartyName ?? t("Conversation")}
          </p>
          {timeLabel ? (
            <span
              className="shrink-0 text-xs font-semibold text-warmgrey"
              data-no-translate
            >
              {timeLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className="truncate text-sm text-warmgrey"
            {...(preview.translate ? {} : { "data-no-translate": true })}
          >
            {preview.text}
          </p>
          {thread.unreadCount > 0 ? (
            <span className="grid min-h-6 min-w-6 shrink-0 place-items-center rounded-full bg-terracotta px-1.5 text-xs font-bold text-white">
              {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
            </span>
          ) : (
            <ChevronRight
              className="size-5 shrink-0 text-sand"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MessagesPage() {
  const { t } = useI18n();
  const { status, envError } = useCurrentUser();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    setLoading(true);
    const { threads: rows, errorMessage: error } =
      await loadMyChatThreads(supabase);
    setLoading(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setThreads(rows);
  }, []);

  useEffect(() => {
    if (status !== "signed-in") {
      return;
    }
    void refresh();
    // Refresh when the tab regains focus so previews/unread counts stay current
    // without holding an inbox-wide realtime subscription.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, refresh]);

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Account hub")}
        title={t("Messages")}
        description={t(
          "Your private conversations with caregivers and families. A chat opens automatically once a booking is approved.",
        )}
      />

      {status === "loading" ? (
        <div
          className="mt-8 rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm"
          role="status"
        >
          {t("Checking your account…")}
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div
          className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900"
          role="alert"
        >
          <p>{envError}</p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm">
          <h2 className="text-2xl font-bold text-espresso">
            {t("Please sign in")}
          </h2>
          <p className="mt-3 leading-7 text-warmgrey">
            {t("You need to sign in to view your messages.")}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
          >
            {t("Sign in")}
          </Link>
        </div>
      ) : null}

      {status === "signed-in" ? (
        <div className="mt-8 space-y-4">
          {errorMessage ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
              role="alert"
            >
              {t("We couldn't load your messages right now. Please try again.")}
            </div>
          ) : null}

          {loading && threads.length === 0 ? (
            <div
              className="rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm"
              role="status"
            >
              {t("Loading your messages…")}
            </div>
          ) : null}

          {!loading && threads.length === 0 && !errorMessage ? (
            <div className="rounded-[2rem] bg-ivory p-8 text-center ring-1 ring-sand">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-white ring-1 ring-sand">
                <MessagesSquare
                  className="size-6 text-terracotta"
                  aria-hidden="true"
                />
              </span>
              <p className="mt-4 text-lg font-bold text-espresso">
                {t("No conversations yet")}
              </p>
              <p className="mt-1 text-sm text-warmgrey">
                {t(
                  "When a booking is approved, a private chat opens here automatically.",
                )}
              </p>
              <Link
                href="/helpers"
                className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
              >
                {t("Browse caregivers")}
              </Link>
            </div>
          ) : null}

          {threads.map((thread) => (
            <ThreadRow key={thread.threadId} thread={thread} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
