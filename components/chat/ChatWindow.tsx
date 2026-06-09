"use client";

// The conversation view: header (counterparty + status), the auto-scrolling
// transcript, and the composer. Owns the message state, the Supabase Realtime
// subscription (correct order: handlers attached BEFORE subscribe, subscribed
// once, cleaned up on unmount), read receipts, and the send/upload flow.
//
// The whole window is rendered inside an ErrorBoundary by the page, so any
// failure here shows a friendly fallback instead of blanking the app.

import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { reservationStatusLabel } from "@/lib/reservationFormat";
import type { ReservationStatus } from "@/lib/supabase/reservations";
import {
  loadChatMessages,
  loadChatThread,
  markThreadRead,
  sendChatMessage,
  subscribeToThreadMessages,
  uploadChatAttachment,
  type ChatMessage,
  type ChatThreadHeader,
} from "@/lib/supabase/chat";

type WindowStatus = "loading" | "ready" | "no-access" | "error";

const VOICE_EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

function upsertMessage(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (prev.some((m) => m.id === message.id)) {
    return prev;
  }
  return [...prev, message].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function HeaderAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  const initial = name?.trim()?.slice(0, 1)?.toUpperCase() || "?";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-11 shrink-0 rounded-full object-cover ring-1 ring-sand"
        data-no-translate
      />
    );
  }
  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-full bg-terracotta text-base font-bold text-white"
      aria-hidden="true"
      data-no-translate
    >
      {initial}
    </span>
  );
}

export function ChatWindow({ threadId }: { threadId: string }) {
  const { t } = useI18n();
  const { status: authStatus, user } = useCurrentUser();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<WindowStatus>("loading");
  const [header, setHeader] = useState<ChatThreadHeader | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ---- Initial load: header + messages, then mark read. -------------------
  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }
    if (authStatus !== "signed-in") {
      setStatus("no-access");
      return;
    }
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      return;
    }

    let active = true;
    setStatus("loading");

    void (async () => {
      const [{ thread, errorMessage: headerError }, { messages: rows, errorMessage: msgError }] =
        await Promise.all([
          loadChatThread(supabase, threadId),
          loadChatMessages(supabase, threadId),
        ]);
      if (!active) {
        return;
      }
      if (headerError || msgError) {
        setStatus("error");
        return;
      }
      if (!thread) {
        setStatus("no-access");
        return;
      }
      setHeader(thread);
      setMessages(rows);
      setStatus("ready");
      // Clear unread state for everything already on screen.
      void markThreadRead(supabase, threadId);
    })();

    return () => {
      active = false;
    };
  }, [threadId, authStatus]);

  // ---- Realtime: new messages without a refresh. --------------------------
  // Separate effect so it is set up once per thread and torn down cleanly,
  // independent of the data-load lifecycle above.
  useEffect(() => {
    if (authStatus !== "signed-in" || !userId) {
      return;
    }
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase || channelRef.current) {
      return;
    }

    channelRef.current = subscribeToThreadMessages(
      supabase,
      threadId,
      (message) => {
        setMessages((prev) => upsertMessage(prev, message));
        // An incoming message from the other party is read as soon as it lands
        // here (the window is open), so clear its unread state + bell entry.
        // `userId` is captured fresh because this effect re-subscribes whenever
        // it changes (it is in the dependency array below).
        if (message.senderId !== userId) {
          void markThreadRead(supabase, threadId);
        }
      },
    );

    return () => {
      const { supabase: client } = getSupabaseBrowserClient();
      if (channelRef.current && client) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [threadId, authStatus, userId]);

  // ---- Send handlers ------------------------------------------------------
  const handleSendText = useCallback(
    async (text: string): Promise<boolean> => {
      const { supabase } = getSupabaseBrowserClient();
      if (!supabase) {
        return false;
      }
      setSending(true);
      setSendError(null);
      const { message, errorMessage } = await sendChatMessage(supabase, {
        threadId,
        kind: "text",
        body: text,
      });
      setSending(false);
      if (errorMessage || !message) {
        setSendError(errorMessage ?? "Failed to send.");
        return false;
      }
      setMessages((prev) => upsertMessage(prev, message));
      return true;
    },
    [threadId],
  );

  const handleSendImage = useCallback(
    async (file: File): Promise<boolean> => {
      const { supabase } = getSupabaseBrowserClient();
      if (!supabase || !userId) {
        return false;
      }
      setSending(true);
      setSendError(null);
      const upload = await uploadChatAttachment(supabase, {
        threadId,
        userId,
        file,
      });
      if (upload.errorMessage || !upload.path) {
        setSending(false);
        setSendError(upload.errorMessage ?? "Upload failed.");
        return false;
      }
      const { message, errorMessage } = await sendChatMessage(supabase, {
        threadId,
        kind: "image",
        attachmentPath: upload.path,
        attachmentMime: file.type || null,
      });
      setSending(false);
      if (errorMessage || !message) {
        setSendError(errorMessage ?? "Failed to send.");
        return false;
      }
      setMessages((prev) => upsertMessage(prev, message));
      return true;
    },
    [threadId, userId],
  );

  const handleSendVoice = useCallback(
    async (blob: Blob, durationSeconds: number): Promise<boolean> => {
      const { supabase } = getSupabaseBrowserClient();
      if (!supabase || !userId) {
        return false;
      }
      setSending(true);
      setSendError(null);
      const ext = VOICE_EXT_BY_MIME[blob.type] ?? "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, {
        type: blob.type || "audio/webm",
      });
      const upload = await uploadChatAttachment(supabase, {
        threadId,
        userId,
        file,
      });
      if (upload.errorMessage || !upload.path) {
        setSending(false);
        setSendError(upload.errorMessage ?? "Upload failed.");
        return false;
      }
      const { message, errorMessage } = await sendChatMessage(supabase, {
        threadId,
        kind: "voice",
        body: String(Math.round(durationSeconds)),
        attachmentPath: upload.path,
        attachmentMime: blob.type || "audio/webm",
      });
      setSending(false);
      if (errorMessage || !message) {
        setSendError(errorMessage ?? "Failed to send.");
        return false;
      }
      setMessages((prev) => upsertMessage(prev, message));
      return true;
    },
    [threadId, userId],
  );

  // ---- Render states ------------------------------------------------------
  if (status === "loading") {
    return (
      <div className="grid flex-1 place-items-center p-8" role="status">
        <p className="text-base font-semibold text-warmgrey">
          {t("Loading conversation…")}
        </p>
      </div>
    );
  }

  if (status === "no-access") {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-ivory ring-1 ring-sand">
            <Lock className="size-5 text-warmgrey" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-espresso">
            {t("Conversation not available")}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-warmgrey">
            {t(
              "This conversation doesn't exist or you're not part of it. Chats open only after a booking is approved.",
            )}
          </p>
          <Link
            href="/messages"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
          >
            {t("Back to messages")}
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error" || !header) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-espresso">
            {t("We couldn't load this conversation")}
          </h2>
          <p className="mt-2 text-sm text-warmgrey">
            {t("Please check your connection and try again.")}
          </p>
          <Link
            href="/messages"
            className="mt-5 inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-espresso transition hover:bg-linen"
          >
            {t("Back to messages")}
          </Link>
        </div>
      </div>
    );
  }

  const statusLabel = t(
    reservationStatusLabel(header.reservationStatus as ReservationStatus),
  );

  return (
    <div className="flex h-full flex-col bg-linen">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sand bg-ivory px-3 py-3 sm:px-4">
        <Link
          href="/messages"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-sand bg-white text-espresso transition hover:bg-linen"
          aria-label={t("Back to messages")}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <HeaderAvatar
          name={header.counterpartyName}
          avatarUrl={header.counterpartyAvatarUrl}
        />
        <div className="min-w-0 flex-1">
          <h1
            className="truncate text-lg font-bold text-espresso"
            data-no-translate
          >
            {header.counterpartyName ??
              (header.myRole === "elder" ? t("Your caregiver") : t("The family"))}
          </h1>
          <p className="truncate text-xs font-semibold text-warmgrey">
            {header.regionName ? (
              <span data-no-translate>{header.regionName} · </span>
            ) : null}
            {statusLabel}
          </p>
        </div>
        <Link
          href={
            header.myRole === "caregiver"
              ? "/dashboard/requests"
              : "/dashboard/reservations"
          }
          className="hidden shrink-0 rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-espresso transition hover:bg-linen sm:inline-flex"
        >
          {t("View booking")}
        </Link>
      </div>

      {/* Stay-in-platform nudge (calm, shown once at the top of the thread). */}
      <div className="flex items-center justify-center gap-2 bg-sage/60 px-4 py-1.5 text-center text-xs font-semibold text-terracotta-dark">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
        {t("For your safety, keep messages here. Phone numbers are never shared.")}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4" data-no-translate>
        <ChatMessageList
          messages={messages}
          myUserId={userId}
          counterpartyName={header.counterpartyName}
          counterpartyAvatarUrl={header.counterpartyAvatarUrl}
        />
      </div>

      {/* Send error (transient) */}
      {sendError ? (
        <p
          className="bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700"
          role="alert"
        >
          {t("Your message couldn't be sent. Please try again.")}
        </p>
      ) : null}

      {/* Composer */}
      <ChatComposer
        isOpen={header.isOpen}
        sending={sending}
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        onSendVoice={handleSendVoice}
      />
    </div>
  );
}
