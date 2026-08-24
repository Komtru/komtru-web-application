"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Below Tailwind's `sm`, the app is a phone: one column, thumb at the bottom. */
const PHONE_QUERY = "(max-width: 639px)";

/**
 * Clears the tab bar and the raised centre action standing above it, plus the
 * home indicator underneath. A toast is transient and the bar is not, so the
 * toast is what moves.
 */
const PHONE_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // Starts true: the first paint is the phone layout, and correcting to the
  // desktop position on mount is invisible (nothing is on screen yet), whereas
  // guessing desktop would flash a toast at the wrong edge on a phone.
  const [isPhone, setIsPhone] = useState(true);

  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    setIsPhone(query.matches);

    const onChange = (event: MediaQueryListEvent) => setIsPhone(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // On a phone the toast belongs at the bottom, beside the thumb and out of
      // the way of the header; on a wide screen it stays at the top.
      position={isPhone ? "bottom-center" : "top-center"}
      // Both, because sonner only reads `mobileOffset` under 600px — between
      // that and `sm` it is still the phone layout but the plain offset applies.
      offset={{ bottom: PHONE_BOTTOM_OFFSET }}
      mobileOffset={{ bottom: PHONE_BOTTOM_OFFSET, left: "1rem", right: "1rem" }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
