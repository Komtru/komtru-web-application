"use client";

import { useEffect, useState } from "react";

/**
 * A software keyboard typically eats 25–50% of the screen. Anything smaller than
 * this is browser chrome collapsing on scroll, not a keyboard.
 */
const KEYBOARD_THRESHOLD_PX = 150;

/** Written to `<html>` so any component can lay out against the real usable height. */
const HEIGHT_VAR = "--app-height";

export interface ViewportState {
  /** True while a software keyboard is covering part of the viewport. */
  keyboardOpen: boolean;
}

/**
 * Measures the height the browser actually leaves us, and publishes it as
 * `--app-height`.
 *
 * `100dvh` alone is close, but it is the height with browser chrome *retracted*,
 * so on a phone mid-scroll the shell is briefly taller than the screen and the
 * bottom bar sits below the fold. `visualViewport.height` is what is genuinely
 * visible right now, which is the number a bar pinned to the bottom needs.
 *
 * Deliberately NOT remeasured while the keyboard is open. If it were, the shell
 * would collapse to the space above the keyboard and drag the tab bar up over
 * the field being typed into — the opposite of what a native app does, which is
 * to let the keyboard cover the bar. `keyboardOpen` is returned instead so the
 * shell can hide the bar for the duration.
 */
export function useViewportHeight(): ViewportState {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const visual = window.visualViewport;

    function measure() {
      const visible = visual?.height ?? window.innerHeight;
      const covered = window.innerHeight - visible;
      const keyboard = covered > KEYBOARD_THRESHOLD_PX;

      setKeyboardOpen(keyboard);

      // Freeze the shell height while the keyboard is up.
      if (!keyboard) {
        document.documentElement.style.setProperty(HEIGHT_VAR, `${Math.round(visible)}px`);
      }
    }

    measure();

    visual?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      visual?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return { keyboardOpen };
}
