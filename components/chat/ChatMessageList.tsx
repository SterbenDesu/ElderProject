"use client";

// The scrollable transcript: message bubbles (mine on the right, the other
// person on the left), grouped under day separators, with timestamps and an
// avatar/initial for the counterparty. Auto-scrolls to the newest message.
//
// Large, high-contrast text for an older audience. User-typed content and the
// counterparty's name are marked data-no-translate so the runtime DOM
// translator never rewrites real conversation data.

import { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { ChatAttachment } from "@/components/chat/ChatAttachment";
import type { ChatMessage } from "@/lib/supabase/chat";

function initialsFromName(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "?";
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase();
}

function CounterpartyAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-9 shrink-0 self-end rounded-full object-cover ring-1 ring-sand"
        data-no-translate
      />
    );
  }
  return (
    <span
      className="grid size-9 shrink-0 self-end place-items-center rounded-full bg-terracotta-light text-sm font-bold text-white"
      aria-hidden="true"
      data-no-translate
    >
      {initialsFromName(name)}
    </span>
  );
}

export function ChatMessageList({
  messages,
  myUserId,
  counterpartyName,
  counterpartyAvatarUrl,
}: {
  messages: ChatMessage[];
  myUserId: string | null;
  counterpartyName: string | null;
  counterpartyAvatarUrl: string | null;
}) {
  const { t, language } = useI18n();
  const locale = language === "bg" ? "bg" : "en";
  const endRef = useRef<HTMLDivElement | null>(null);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [locale],
  );

  // Auto-scroll to the newest message whenever the count changes.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-1.5">
      {messages.map((message, index) => {
        const isMine = myUserId != null && message.senderId === myUserId;
        const createdAt = new Date(message.createdAt);
        const dayKey = createdAt.toDateString();
        const previousDayKey =
          index > 0
            ? new Date(messages[index - 1].createdAt).toDateString()
            : null;
        const showDay = dayKey !== previousDayKey;

        const bubbleClass = isMine
          ? "rounded-3xl rounded-br-md bg-terracotta text-white"
          : "rounded-3xl rounded-bl-md bg-white text-espresso ring-1 ring-sand";
        const timeClass = isMine ? "text-white/70" : "text-warmgrey";

        return (
          <div key={message.id}>
            {showDay ? (
              <div className="my-3 flex items-center justify-center">
                <span className="rounded-full bg-ivory px-3 py-1 text-xs font-bold uppercase tracking-wide text-warmgrey ring-1 ring-sand">
                  {dayFmt.format(createdAt)}
                </span>
              </div>
            ) : null}

            <div
              className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
            >
              {!isMine ? (
                <CounterpartyAvatar
                  name={counterpartyName}
                  avatarUrl={counterpartyAvatarUrl}
                />
              ) : null}

              <div
                className={`max-w-[78%] px-4 py-2.5 shadow-sm sm:max-w-[70%] ${bubbleClass}`}
              >
                {message.kind === "text" ? (
                  <p
                    className="whitespace-pre-wrap break-words text-[1.02rem] leading-7"
                    data-no-translate
                  >
                    {message.body}
                  </p>
                ) : (
                  <ChatAttachment message={message} />
                )}
                <p
                  className={`mt-1 text-right text-xs font-medium ${timeClass}`}
                  data-no-translate
                >
                  {timeFmt.format(createdAt)}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {messages.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-ivory ring-1 ring-sand">
            <span className="text-2xl" aria-hidden="true">
              👋
            </span>
          </span>
          <p className="mt-4 text-lg font-bold text-espresso">
            {t("Say hello to start the conversation")}
          </p>
          <p className="mt-1 max-w-xs text-sm text-warmgrey">
            {t("Only the two of you can see these messages.")}
          </p>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
