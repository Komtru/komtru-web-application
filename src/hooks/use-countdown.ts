"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Seconds left until a deadline.
 *
 * Computed from a stored timestamp rather than by decrementing a counter. A
 * backgrounded tab has its timers throttled to roughly once a minute, so a
 * counter that subtracted one per tick would still read "40 seconds" after two
 * minutes away — and the resend button it locks would stay locked. Reading the
 * clock instead means the value is right on the first tick back.
 */
export function useCountdown(): {
  secondsLeft: number;
  isRunning: boolean;
  start: (seconds: number) => void;
  reset: () => void;
} {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (deadline === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) setDeadline(null);
    };

    tick();
    // Twice a second: on a one-second interval the displayed number lags the
    // real one by up to a full second, which is visible on a countdown.
    const timer = window.setInterval(tick, 500);

    return () => window.clearInterval(timer);
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
    setDeadline(Date.now() + seconds * 1000);
  }, []);

  const reset = useCallback(() => {
    setDeadline(null);
    setSecondsLeft(0);
  }, []);

  return { secondsLeft, isRunning: secondsLeft > 0, start, reset };
}
