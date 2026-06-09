"use client";

// The message composer: a text field with a send button, an image-attach
// button, and a microphone button that records a voice note in the browser
// (MediaRecorder API) with a clear recording state and a cancel option.
//
// The composer only emits intents (send text / image / voice); the parent
// ChatWindow performs the upload + RPC and reports success so the field can
// reset. Mobile-first: large touch targets, works on a phone.

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Mic, Paperclip, Send, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VOICE_SECONDS = 300; // 5 min safety cap

function pickAudioMimeType(): string | undefined {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ChatComposer({
  isOpen,
  sending,
  onSendText,
  onSendImage,
  onSendVoice,
  disabledReason,
}: {
  isOpen: boolean;
  sending: boolean;
  onSendText: (text: string) => Promise<boolean>;
  onSendImage: (file: File) => Promise<boolean>;
  onSendVoice: (blob: Blob, durationSeconds: number) => Promise<boolean>;
  disabledReason?: string | null;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latest elapsed seconds, readable from the (closure-captured) onstop handler.
  const elapsedRef = useRef(0);
  // When a recording is cancelled we still get an onstop event — this flag tells
  // the handler to discard the audio instead of sending it.
  const cancelledRef = useRef(false);

  const micSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  function stopTracksAndTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  // Cleanup if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      stopTracksAndTimer();
    };
  }, []);

  async function handleSubmitText(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }
    setLocalError(null);
    const ok = await onSendText(trimmed);
    if (ok) {
      setText("");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmitText();
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Allow re-selecting the same file later.
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setLocalError(t("Please choose a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError(t("That image is too large. Please choose one under 10 MB."));
      return;
    }
    setLocalError(null);
    await onSendImage(file);
  }

  async function startRecording() {
    if (!micSupported || recording || sending) {
      return;
    }
    setLocalError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const seconds = elapsedRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        stopTracksAndTimer();
        setRecording(false);
        setElapsed(0);
        if (cancelledRef.current || blob.size === 0 || seconds < 1) {
          return;
        }
        void onSendVoice(blob, seconds);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_VOICE_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch (error) {
      console.error("[chat] microphone error", error);
      stopTracksAndTimer();
      setRecording(false);
      setLocalError(
        t("We couldn't access the microphone. Please allow microphone access."),
      );
    }
  }

  function stopRecording() {
    if (!recorderRef.current) {
      return;
    }
    cancelledRef.current = false;
    try {
      recorderRef.current.stop();
    } catch {
      stopTracksAndTimer();
      setRecording(false);
    }
  }

  function cancelRecording() {
    if (!recorderRef.current) {
      return;
    }
    cancelledRef.current = true;
    try {
      recorderRef.current.stop();
    } catch {
      // ignore
    }
    stopTracksAndTimer();
    setRecording(false);
    setElapsed(0);
  }

  if (!isOpen) {
    return (
      <div className="border-t border-sand bg-ivory px-4 py-4 text-center">
        <p className="text-sm font-semibold text-warmgrey">
          {disabledReason ??
            t("This conversation is closed. Messages are read-only.")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-sand bg-ivory px-3 py-3 sm:px-4">
      {localError ? (
        <p
          className="mb-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          role="alert"
        >
          {localError}
        </p>
      ) : null}

      {recording ? (
        <div className="flex items-center gap-3 rounded-3xl border border-sand bg-white px-4 py-2.5 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-bold text-red-600">
            <span className="size-3 animate-pulse rounded-full bg-red-600" />
            {t("Recording…")}
          </span>
          <span
            className="font-mono text-sm font-semibold text-espresso"
            data-no-translate
          >
            {formatClock(elapsed)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="grid size-11 place-items-center rounded-full border border-sand bg-white text-warmgrey transition hover:bg-linen"
              aria-label={t("Cancel recording")}
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              disabled={sending}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-60"
              aria-label={t("Send voice message")}
            >
              <Send className="size-4" aria-hidden="true" />
              {t("Send")}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitText}
          className="flex items-end gap-2"
          aria-label={t("Send a message")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-sand bg-white text-espresso transition hover:bg-linen disabled:opacity-60"
            aria-label={t("Attach a photo")}
            title={t("Attach a photo")}
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </button>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={t("Write a message…")}
            aria-label={t("Write a message")}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-sand bg-white px-4 py-3 text-[1.02rem] leading-7 text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
            data-no-translate
          />

          {text.trim() ? (
            <button
              type="submit"
              disabled={sending}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-terracotta text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-60"
              aria-label={t("Send message")}
            >
              <Send className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={sending || !micSupported}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-terracotta text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-60"
              aria-label={t("Record a voice message")}
              title={
                micSupported
                  ? t("Record a voice message")
                  : t("Voice recording isn't supported on this device.")
              }
            >
              <Mic className="size-5" aria-hidden="true" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
