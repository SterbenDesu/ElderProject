"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

type RevealDirection = "up" | "left" | "right";

type RevealProps = {
  children: ReactNode;
  /** Rendered element. Defaults to a div; pass "article"/"section" to keep semantics. */
  as?: ElementType;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  /** Entrance direction. */
  direction?: RevealDirection;
};

/**
 * Scroll-triggered entrance wrapper.
 *
 * The animation itself lives in CSS (.reveal / .reveal-visible in globals.css).
 * This component only flips a class once the element scrolls into view using
 * the native IntersectionObserver API — no JavaScript animation library.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  direction = "up",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    // Safety net: if observers are unavailable, just show the content.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const directionClass =
    direction === "left"
      ? "reveal-left"
      : direction === "right"
        ? "reveal-right"
        : "";

  const style: CSSProperties | undefined =
    delay > 0 ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <Tag
      ref={ref}
      style={style}
      className={`reveal ${directionClass} ${visible ? "reveal-visible" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
