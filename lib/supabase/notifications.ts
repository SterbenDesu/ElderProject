import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// Data layer for the notification center.
//
// SECURITY / one-way rule: every read here runs with the publishable (anon) key
// and the signed-in user's session. Notifications are recipient-only by RLS, and
// the enriching name (counterparty_name) comes from the SECURITY DEFINER RPC
// get_my_notifications, which exposes ONLY a public-safe name (elder first name
// OR caregiver display name) — never a phone number, email, or last name.

export type NotificationType =
  | "reservation_requested"
  | "reservation_approved"
  | "reservation_rejected"
  | "reservation_cancelled"
  | "chat_message"
  | "completion_ready"
  | "dispute_update";

export type AppNotification = {
  id: string;
  type: NotificationType;
  reservationId: string | null;
  chatThreadId: string | null;
  isRead: boolean;
  createdAt: string;
  /** Public-safe counterparty name (elder first name or caregiver display name). */
  counterpartyName: string | null;
  reservationStatus: string | null;
};

type NotificationRpcRow = {
  id: string;
  type: string;
  reservation_id: string | null;
  chat_thread_id: string | null;
  is_read: boolean;
  created_at: string;
  counterparty_name: string | null;
  reservation_status: string | null;
};

const KNOWN_TYPES: NotificationType[] = [
  "reservation_requested",
  "reservation_approved",
  "reservation_rejected",
  "reservation_cancelled",
  "chat_message",
  "completion_ready",
  "dispute_update",
];

function toNotificationType(value: string): NotificationType {
  return (KNOWN_TYPES as string[]).includes(value)
    ? (value as NotificationType)
    : "dispute_update";
}

export async function loadNotifications(
  supabase: SupabaseClient,
  limit = 30,
): Promise<{ notifications: AppNotification[]; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("get_my_notifications", {
    p_limit: limit,
  });

  if (error) {
    return { notifications: [], errorMessage: error.message };
  }

  const notifications: AppNotification[] = (
    (data as NotificationRpcRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    type: toNotificationType(row.type),
    reservationId: row.reservation_id,
    chatThreadId: row.chat_thread_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    counterpartyName: row.counterparty_name,
    reservationStatus: row.reservation_status,
  }));

  return { notifications, errorMessage: null };
}

// Marks the caller's own notifications read. Pass specific ids, or omit to mark
// every unread one. Returns the number of rows updated.
export async function markNotificationsRead(
  supabase: SupabaseClient,
  ids?: string[],
): Promise<{ updated: number; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids && ids.length > 0 ? ids : null,
  });

  if (error) {
    return { updated: 0, errorMessage: error.message };
  }

  return { updated: typeof data === "number" ? data : 0, errorMessage: null };
}

// Subscribe to the signed-in user's notification stream. RLS scopes the stream
// to rows where recipient_id = the user, so the filter is a fast-path, not the
// security boundary. `onChange` fires on insert/update/delete; the caller should
// re-fetch via loadNotifications to get the name-enriched rows.
export function subscribeToNotifications(
  supabase: SupabaseClient,
  recipientId: string,
  onChange: () => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications:${recipientId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${recipientId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return channel;
}
