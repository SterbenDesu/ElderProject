"use client";

// A small, reusable React error boundary.
//
// WHY: authenticated-only widgets (the notification bell, the account menu) talk
// to Supabase — realtime channels, RPCs, table reads. If any of those throw
// during render, an UNGUARDED error propagates to the root layout and React
// unmounts the whole tree, blanking the app for a signed-in user. Wrapping each
// widget in this boundary contains the failure: the widget renders its small
// inline fallback (or nothing) and the rest of the page keeps working.
//
// Error boundaries MUST be class components — there is no hook equivalent for
// getDerivedStateFromError / componentDidCatch.

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Rendered in place of the children when they crash. Defaults to nothing. */
  fallback?: ReactNode;
  /** Optional label to make the logged error easier to find in the console. */
  label?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log instead of throwing onward — the failure stops here.
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
