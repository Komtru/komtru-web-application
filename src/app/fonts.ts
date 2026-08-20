import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

/**
 * Brand type stack. `display` sets headings, `body` sets prose, `mono` is
 * reserved for trade codes, amounts and anything that must be read literally.
 */
export const fonts = {
  display: spaceGrotesk,
  body: inter,
  mono: ibmPlexMono,
};

/** All font CSS variables, for the `<html>` element. */
export const fontVariables = [spaceGrotesk.variable, inter.variable, ibmPlexMono.variable].join(
  " ",
);
