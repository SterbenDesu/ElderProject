import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// Data layer for the internal elder <-> caregiver chat (Phase 9).
//
// SECURITY / one-way rule: every call runs with the publishable (anon) key and
// the signed-in user's session.
//   * chat_messages are participant-only by RLS (is_chat_participant), so the
//     message list + realtime stream are already scoped to threads the caller
//     belongs to.
//   * The counterparty's name + avatar come from SECURITY DEFINER RPCs
//     (get_my_chat_threads / get_chat_thread) because a caregiver has NO policy
//     to read public.profiles directly. Those RPCs expose ONLY a public-safe
//     name (elder first name OR caregiver display name) + avatar — never a
//     phone number, email, age, or last name.
//   * Attachments live in the PRIVATE `chat-media` bucket; we store the storage
//     PATH on the message and mint short-lived signed URLs on demand, so files
//     are never publicly readable.

export const CHAT_BUCKET = "chat-media";

export type ChatMessageKind = "text" | "voice" | "image";

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  kind: ChatMessageKind;
  /** Text body, or (for voice) the clip duration in whole seconds as a string. */
  body: string | null;
  /** Storage path in the private bucket (NOT a public URL). */
  attachmentPath: string | null;
  attachmentMime: string | null;
  createdAt: string;
  readAt: string | null;
};

export type ChatThreadHeader = {
  threadId: string;
  reservationId: string;
  reservationStatus: string;
  myRole: "elder" | "caregiver";
  counterpartyName: string | null;
  counterpartyAvatarUrl: string | null;
  regionName: string | null;
  /** True only while the reservation is approved/in_progress — you can send. */
  isOpen: boolean;
};

export type ChatThreadSummary = {
  threadId: string;
  reservationId: string;
  reservationStatus: string;
  counterpartyName: string | null;
  counterpartyAvatarUrl: string | null;
  regionName: string | null;
  lastMessageKind: ChatMessageKind | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageIsMine: boolean | null;
  unreadCount: number;
  isOpen: boolean;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  kind: string;
  body: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  created_at: string;
  read_at: string | null;
};

function toKind(value: string): ChatMessageKind {
  return value === "voice" || value === "image" ? value : "text";
}

function mapMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    kind: toKind(row.kind),
    body: row.body,
    attachmentPath: row.attachment_url,
    attachmentMime: row.attachment_mime,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

// ---------------------------------------------------------------------------
// Inbox + thread header (SECURITY DEFINER RPCs)
// ---------------------------------------------------------------------------

type ThreadSummaryRow = {
  thread_id: string;
  reservation_id: string;
  reservation_status: string;
  counterparty_name: string | null;
  counterparty_avatar_url: string | null;
  region_name: string | null;
  last_message_kind: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_is_mine: boolean | null;
  unread_count: number;
  is_open: boolean;
};

export async function loadMyChatThreads(
  supabase: SupabaseClient,
): Promise<{ threads: ChatThreadSummary[]; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.rpc("get_my_chat_threads");
    if (error) {
      return { threads: [], errorMessage: error.message };
    }
    const threads: ChatThreadSummary[] = (
      (data as ThreadSummaryRow[] | null) ?? []
    ).map((row) => ({
      threadId: row.thread_id,
      reservationId: row.reservation_id,
      reservationStatus: row.reservation_status,
      counterpartyName: row.counterparty_name,
      counterpartyAvatarUrl: row.counterparty_avatar_url,
      regionName: row.region_name,
      lastMessageKind: row.last_message_kind
        ? toKind(row.last_message_kind)
        : null,
      lastMessageBody: row.last_message_body,
      lastMessageAt: row.last_message_at,
      lastMessageIsMine: row.last_message_is_mine,
      unreadCount: typeof row.unread_count === "number" ? row.unread_count : 0,
      isOpen: Boolean(row.is_open),
    }));
    return { threads, errorMessage: null };
  } catch (error) {
    console.error("[chat] failed to load threads", error);
    return {
      threads: [],
      errorMessage:
        error instanceof Error ? error.message : "Failed to load conversations.",
    };
  }
}

type ThreadHeaderRow = {
  thread_id: string;
  reservation_id: string;
  reservation_status: string;
  my_role: string;
  counterparty_name: string | null;
  counterparty_avatar_url: string | null;
  region_name: string | null;
  is_open: boolean;
};

export async function loadChatThread(
  supabase: SupabaseClient,
  threadId: string,
): Promise<{ thread: ChatThreadHeader | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.rpc("get_chat_thread", {
      p_thread_id: threadId,
    });
    if (error) {
      return { thread: null, errorMessage: error.message };
    }
    const row = ((data as ThreadHeaderRow[] | null) ?? [])[0];
    if (!row) {
      // No row = the caller is not a participant (or the thread does not exist).
      return { thread: null, errorMessage: null };
    }
    return {
      thread: {
        threadId: row.thread_id,
        reservationId: row.reservation_id,
        reservationStatus: row.reservation_status,
        myRole: row.my_role === "caregiver" ? "caregiver" : "elder",
        counterpartyName: row.counterparty_name,
        counterpartyAvatarUrl: row.counterparty_avatar_url,
        regionName: row.region_name,
        isOpen: Boolean(row.is_open),
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("[chat] failed to load thread header", error);
    return {
      thread: null,
      errorMessage:
        error instanceof Error ? error.message : "Failed to load conversation.",
    };
  }
}

// ---------------------------------------------------------------------------
// Messages (direct table read — RLS scopes it to participants)
// ---------------------------------------------------------------------------

export async function loadChatMessages(
  supabase: SupabaseClient,
  threadId: string,
  limit = 200,
): Promise<{ messages: ChatMessage[]; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        "id,thread_id,sender_id,kind,body,attachment_url,attachment_mime,created_at,read_at",
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return { messages: [], errorMessage: error.message };
    }
    return {
      messages: ((data as ChatMessageRow[] | null) ?? []).map(mapMessageRow),
      errorMessage: null,
    };
  } catch (error) {
    console.error("[chat] failed to load messages", error);
    return {
      messages: [],
      errorMessage:
        error instanceof Error ? error.message : "Failed to load messages.",
    };
  }
}

// ---------------------------------------------------------------------------
// Send + read receipts (SECURITY DEFINER RPCs)
// ---------------------------------------------------------------------------

export type SendChatMessageInput = {
  threadId: string;
  kind: ChatMessageKind;
  body?: string | null;
  attachmentPath?: string | null;
  attachmentMime?: string | null;
};

export async function sendChatMessage(
  supabase: SupabaseClient,
  input: SendChatMessageInput,
): Promise<{ message: ChatMessage | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.rpc("send_chat_message", {
      p_thread_id: input.threadId,
      p_kind: input.kind,
      p_body: input.body ?? null,
      p_attachment_url: input.attachmentPath ?? null,
      p_attachment_mime: input.attachmentMime ?? null,
    });
    if (error) {
      return { message: null, errorMessage: error.message };
    }
    const row = data as {
      id: string;
      thread_id: string;
      sender_id: string;
      kind: string;
      body: string | null;
      attachment_url: string | null;
      attachment_mime: string | null;
      created_at: string;
    } | null;
    if (!row) {
      return { message: null, errorMessage: "Message could not be sent." };
    }
    return {
      message: {
        id: row.id,
        threadId: row.thread_id,
        senderId: row.sender_id,
        kind: toKind(row.kind),
        body: row.body,
        attachmentPath: row.attachment_url,
        attachmentMime: row.attachment_mime,
        createdAt: row.created_at,
        readAt: null,
      },
      errorMessage: null,
    };
  } catch (error) {
    console.error("[chat] failed to send message", error);
    return {
      message: null,
      errorMessage:
        error instanceof Error ? error.message : "Failed to send the message.",
    };
  }
}

export async function markThreadRead(
  supabase: SupabaseClient,
  threadId: string,
): Promise<{ errorMessage: string | null }> {
  try {
    const { error } = await supabase.rpc("mark_thread_read", {
      p_thread_id: threadId,
    });
    return { errorMessage: error ? error.message : null };
  } catch (error) {
    console.error("[chat] failed to mark thread read", error);
    return {
      errorMessage:
        error instanceof Error ? error.message : "Failed to update the thread.",
    };
  }
}

// ---------------------------------------------------------------------------
// Attachments (private bucket: upload by path, read via signed URL)
// ---------------------------------------------------------------------------

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
};

function attachmentExtension(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : undefined;
  return fromName || EXTENSION_BY_MIME[file.type] || "bin";
}

/**
 * Upload a voice/image attachment into the PRIVATE chat-media bucket under
 * `{threadId}/{userId}/...`. Storage RLS restricts writes to a participant
 * uploading into their own folder, and reads to the thread's participants.
 * Returns the storage PATH (stored on the message), never a public URL.
 */
export async function uploadChatAttachment(
  supabase: SupabaseClient,
  params: { threadId: string; userId: string; file: File },
): Promise<{ path: string | null; errorMessage: string | null }> {
  const ext = attachmentExtension(params.file);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${params.threadId}/${params.userId}/${unique}.${ext}`;

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.file.type || undefined,
    });

  if (error) {
    return { path: null, errorMessage: error.message };
  }
  return { path, errorMessage: null };
}

/**
 * Mint a short-lived signed URL for a private attachment. The storage SELECT
 * policy re-checks that the caller is a participant of the thread named in the
 * path, so a non-participant can never obtain a URL.
 */
export async function createSignedAttachmentUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 3600,
): Promise<{ url: string | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      return { url: null, errorMessage: error?.message ?? "No signed URL." };
    }
    return { url: data.signedUrl, errorMessage: null };
  } catch (error) {
    console.error("[chat] failed to sign attachment url", error);
    return {
      url: null,
      errorMessage:
        error instanceof Error ? error.message : "Failed to load attachment.",
    };
  }
}

// ---------------------------------------------------------------------------
// Realtime — new messages in a thread, without a refresh
// ---------------------------------------------------------------------------

// CORRECT SUPABASE REALTIME ORDER (do not reorder):
//   1. create the channel
//   2. attach EVERY .on('postgres_changes', …) handler FIRST
//   3. call .subscribe() exactly ONCE, LAST
// Supabase throws "cannot add postgres_changes callbacks … after subscribe()"
// if any .on() is attached after .subscribe(). The whole setup is wrapped in
// try/catch and the subscribe-status error is logged, so a realtime failure
// degrades gracefully (the window still loads + sends) instead of crashing.
//
// RLS still applies on the stream (chat_messages_participants_select), so a
// user only ever receives INSERTs for threads they belong to; the thread_id
// filter is a fast-path, not the security boundary.
export function subscribeToThreadMessages(
  supabase: SupabaseClient,
  threadId: string,
  onInsert: (message: ChatMessage) => void,
): RealtimeChannel | null {
  try {
    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          onInsert(mapMessageRow(payload.new as ChatMessageRow));
        },
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("[chat] realtime subscription error", err);
        }
      });
    return channel;
  } catch (error) {
    console.error("[chat] failed to set up realtime channel", error);
    return null;
  }
}
