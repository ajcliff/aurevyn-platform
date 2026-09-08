"use client";

import { useEffect, useRef, useState, Children, isValidElement, type ReactNode } from "react";

type Variant = "up" | "fade" | "scale" | "left" | "right";

export default function RevealOnScroll({
  children,
  delay = 0,
  variant = "up",
  /** When set, each direct child fades in with an incrementing delay (ms). */
  stagger,
  /** Applied to the outer wrapper — use to turn it into the grid/flex container itself. */
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  variant?: Variant;
  stagger?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (stagger) {
    const items = Children.toArray(children);
    return (
      <div ref={ref} className={className}>
        {items.map((child, i) =>
          isValidElement(child) ? (
            <div
              key={child.key ?? i}
              className={`mkt-reveal mkt-reveal--${variant} ${visible ? "mkt-reveal--visible" : ""}`}
              style={{ transitionDelay: `${delay + i * stagger}ms` }}
            >
              {child}
            </div>
          ) : (
            child
          )
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`mkt-reveal mkt-reveal--${variant} ${className} ${visible ? "mkt-reveal--visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}