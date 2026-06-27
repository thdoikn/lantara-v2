import type { FocusEvent } from "react";

/**
 * onFocus handler that scrolls the focused field to the centre of the viewport
 * after a short delay — keeps inputs above the on-screen keyboard on mobile.
 * No-op on pointer-capable / large screens where occlusion isn't a problem.
 */
export function scrollIntoViewOnFocus(e: FocusEvent<HTMLElement>) {
  if (typeof window === "undefined" || window.innerWidth >= 768) return;
  const el = e.currentTarget;
  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
}
