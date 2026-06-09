"use client";

// The notification center — a bell with an unread-count badge in the top nav,
// visible only to signed-in users. Clicking it opens a panel listing the user's
// own notifications, newest first, and marks them read on open.
//
// REAL-TIME: we subscribe to the user's notification stream via Supabase
// Realtime (postgres_changes on public.notifications, filtered to recipient_id).
// RLS scopes the stream to the user's own rows, so a caregiver sees a brand-new
// request the moment it lands — no polling, no refresh. If the realtime channel
// can't connect, the panel still refreshes every time it is opened.

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  loadNotifications,
  markNotificationsRead,
  subscribeToNotifications,
  type AppNotification,
} from "@/lib/supabase/notifications";

function notificationHref(n: AppNotification): string {
  // A new chat message links straight to its conversation.
  if (n.type === "chat_message" && n.chatThreadId) {
    return `/messages/${n.chatThreadId}`;
  }
  switch (n.type) {
    case "reservation_requested":
    case "reservation_cancelled":
    case "dispute_update":
      // Caregiver-facing events live in the Requests area.
      return "/dashboard/requests";
    default:
      // Elder-facing events (approved/rejected/ready) live in My bookings.
      return "/dashboard/reservations";
  }
}

function notificationText(
  n: AppNotification,
  t: (text: string) => string,
): string {
  const name = n.counterpartyName?.trim();
  switch (n.type) {
    case "reservation_requested":
      return name
        ? t("New booking request from {name}").replace("{name}", name)
        : t("New booking request");
    case "reservation_approved":
      return name
        ? t("Your booking with {name} was approved").replace("{name}", name)
        : t("Your booking was approved");
    case "reservation_rejected":
      return t("Your booking request was declined");
    case "reservation_cancelled":
      return t("A booking was cancelled");
    case "completion_ready":
      return t("A booking is ready to confirm");
    case "chat_message":
      return t("New message");
    case "dispute_update":
    default:
      return t("Update on a booking");
  }
}

export function NotificationBell({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { t, language } = useI18n();
  const { status, user } = useCurrentUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const refresh = useCallback(async () => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    setLoading(true);
    // loadNotifications never throws (it catches transport errors internally),
    // but guard anyway so a refresh can never bubble an uncaught rejection.
    try {
      const { notifications: rows, errorMessage: error } =
        await loadNotifications(supabase);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage(null);
      setNotifications(rows);
    } catch (error) {
      console.error("[NotificationBell] refresh failed", error);
      setErrorMessage("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Key the effect on the stable user id (not the whole user object, whose
  // reference can change on auth events) so we don't needlessly tear down and
  // recreate the channel — which is what risks the duplicate-subscription error.
  const userId = user?.id ?? null;

  // Initial load + realtime subscription, tied to the signed-in user.
  useEffect(() => {
    if (status !== "signed-in" || !userId) {
      setNotifications([]);
      return;
    }

    let active = true;
    void refresh();

    const { supabase } = getSupabaseBrowserClient();
    // Subscribe-once guard: only ever hold a single live channel. If one already
    // exists (e.g. a fast re-render), reuse it rather than opening a second.
    if (supabase && !channelRef.current) {
      channelRef.current = subscribeToNotifications(supabase, userId, () => {
        if (active) {
          void refresh();
        }
      });
    }

    return () => {
      active = false;
      const { supabase: client } = getSupabaseBrowserClient();
      if (channelRef.current && client) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [status, userId, refresh]);

  // Close the panel when clicking outside it.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await refresh();
      // Mark-as-read on open: clear the badge and the server state.
      if (unreadCount > 0) {
        setNotifications((current) =>
          current.map((n) => ({ ...n, isRead: true })),
        );
        const { supabase } = getSupabaseBrowserClient();
        if (supabase) {
          await markNotificationsRead(supabase);
        }
      }
    }
  }

  if (status !== "signed-in") {
    return null;
  }

  const dateFormatter = new Intl.DateTimeFormat(language === "bg" ? "bg" : "en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const panelWidth = variant === "mobile" ? "w-full" : "w-80 sm:w-96";

  return (
    <div
      ref={containerRef}
      className={variant === "mobile" ? "relative" : "relative"}
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? t("Notifications, {count} unread").replace(
                "{count}",
                String(unreadCount),
              )
            : t("Notifications")
        }
        className="relative flex min-h-12 min-w-12 items-center justify-center rounded-full border border-stone-200 bg-white text-forest shadow-sm transition hover:border-moss/40 hover:bg-sage"
      >
        <Bell className="size-5" strokeWidth={2} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[0.7rem] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-3 ${panelWidth} max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-300/40`}
          role="dialog"
          aria-label={t("Notifications")}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-bold text-forest">{t("Notifications")}</p>
            <Link
              href="/dashboard/reservations"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-clay transition hover:text-forest"
            >
              {t("My bookings")}
            </Link>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-stone-500" role="status">
                {t("Loading…")}
              </p>
            ) : errorMessage ? (
              <p className="px-4 py-6 text-sm font-semibold text-clay" role="alert">
                {t("We couldn't load your notifications right now.")}
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell
                  className="mx-auto size-7 text-stone-300"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm font-semibold text-stone-600">
                  {t("No notifications yet")}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {t("You'll see booking updates here.")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={notificationHref(n)}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition hover:bg-sage"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          n.isRead ? "bg-transparent" : "bg-clay"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-5 text-forest">
                          {notificationText(n, t)}
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500">
                          {dateFormatter.format(new Date(n.createdAt))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
