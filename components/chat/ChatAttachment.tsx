"use client";

// Renders a chat attachment from the PRIVATE chat-media bucket.
//
// We never store public URLs: the message carries a storage PATH, and this
// component mints a short-lived signed URL on mount (the storage SELECT policy
// re-checks that the viewer is a participant of the thread, so a non-participant
// can never obtain a URL). Images render as a tappable thumbnail that opens a
// full-size lightbox; voice notes render as an inline audio player with the
// recorded duration.

import { useEffect, useRef, useState } from "react";
import { ImageOff, Mic, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createSignedAttachmentUrl,
  type ChatMessage,
} from "@/lib/supabase/chat";

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!path) {
      return;
    }
    setUrl(null);
    setFailed(false);

    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      setFailed(true);
      return;
    }

    void createSignedAttachmentUrl(supabase, path).then(({ url: signed }) => {
      if (!active) {
        return;
      }
      if (signed) {
        setUrl(signed);
      } else {
        setFailed(true);
      }
    });

    return () => {
      active = false;
    };
  }, [path]);

  return { url, failed };
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function VoiceAttachment({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  const { url, failed } = useSignedUrl(message.attachmentPath);
  const durationSeconds = message.body ? Number(message.body) : NaN;

  return (
    <div className="flex items-center gap-3" data-no-translate>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-terracotta/15 text-terracotta">
        <Mic className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {failed ? (
          <p className="text-sm font-semibold text-warmgrey">
            {t("Voice message unavailable")}
          </p>
        ) : url ? (
          <audio
            src={url}
            controls
            preload="metadata"
            className="h-10 w-56 max-w-full"
          />
        ) : (
          <p className="text-sm font-semibold text-warmgrey" role="status">
            {t("Loading…")}
          </p>
        )}
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-warmgrey">
          {t("Voice message")}
          {Number.isFinite(durationSeconds) && durationSeconds > 0
            ? ` · ${formatDuration(durationSeconds)}`
            : ""}
        </p>
      </div>
    </div>
  );
}

function ImageAttachment({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  const { url, failed } = useSignedUrl(message.attachmentPath);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (failed) {
    return (
      <span className="flex items-center gap-2 text-sm font-semibold text-warmgrey">
        <ImageOff className="size-4" aria-hidden="true" />
        {t("Photo unavailable")}
      </span>
    );
  }

  if (!url) {
    return (
      <div
        className="grid h-40 w-56 max-w-full place-items-center rounded-2xl bg-black/5 text-sm font-semibold text-warmgrey"
        role="status"
      >
        {t("Loading…")}
      </div>
    );
  }

  return (
    <div data-no-translate>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded-2xl ring-1 ring-black/5 transition hover:opacity-95"
        aria-label={t("Open photo")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={t("Shared photo")}
          className="h-44 w-60 max-w-full object-cover"
          loading="lazy"
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-espresso/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("Photo")}
          onClick={() => setOpen(false)}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/90 text-espresso shadow-lg transition hover:bg-white"
            aria-label={t("Close")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={t("Shared photo")}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ChatAttachment({ message }: { message: ChatMessage }) {
  if (message.kind === "voice") {
    return <VoiceAttachment message={message} />;
  }
  if (message.kind === "image") {
    return <ImageAttachment message={message} />;
  }
  return null;
}
