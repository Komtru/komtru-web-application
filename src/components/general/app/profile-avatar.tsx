import Image from "next/image";

import {
  AVATAR_PIXELS,
  InitialsAvatar,
  type AvatarSize,
} from "@/components/general/app/initials-avatar";
import { cn } from "@/lib/utils";

/**
 * The uploaded photo when there is one, initials when there is not.
 *
 * One component rather than the branch repeated at each call site — the sidebar
 * shipped without it, which is how an uploaded avatar could appear on the
 * settings card and nowhere else.
 *
 * `unoptimized` on purpose. The URL from `GET /me` is a short-lived signed link,
 * so routing it through Next's image optimizer would cache bytes behind a URL
 * that has already expired, and the cached copy would outlive the permission it
 * was granted under.
 */
export function ProfileAvatar({
  url,
  name,
  size = "md",
  tone,
  className,
}: {
  url?: string | null;
  /** Used for the initials fallback. Never rendered next to the photo. */
  name: string;
  size?: AvatarSize;
  tone?: React.ComponentProps<typeof InitialsAvatar>["tone"];
  className?: string;
}) {
  if (!url) return <InitialsAvatar name={name} size={size} tone={tone} className={className} />;

  const pixels = AVATAR_PIXELS[size];

  return (
    <Image
      src={url}
      alt=""
      width={pixels}
      height={pixels}
      unoptimized
      style={{ width: pixels, height: pixels }}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
