"use client";

// One conversation. A thin, full-height client page that resolves the thread id
// from the route and renders the ChatWindow inside an ErrorBoundary, so any
// Supabase/realtime failure shows a friendly fallback instead of crashing the
// app. The height is the viewport minus the sticky site header, so the
// transcript scrolls on its own and the composer stays visible on a phone.

import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatWindow } from "@/components/chat/ChatWindow";

function ChatFallback() {
  return (
    <div className="grid h-full place-items-center bg-linen p-8 text-center">
      <div>
        <h2 className="text-xl font-bold text-espresso">
          This conversation hit a snag
        </h2>
        <p className="mt-2 text-sm text-warmgrey">
          Please refresh the page to try again.
        </p>
        <Link
          href="/messages"
          className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
        >
          Back to messages
        </Link>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams();
  const raw = params?.threadId;
  const threadId = Array.isArray(raw) ? raw[0] : (raw ?? "");

  return (
    <section className="h-[calc(100dvh-4.5rem)] min-h-[28rem] overflow-hidden">
      <ErrorBoundary label="ChatWindow" fallback={<ChatFallback />}>
        <ChatWindow threadId={threadId} />
      </ErrorBoundary>
    </section>
  );
}
