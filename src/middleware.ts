import { NextResponse } from "next/server";

/**
 * Deliberately a pass-through.
 *
 * Session tokens live in `localStorage`, which middleware cannot read — so
 * "guarding" routes here would be theatre: it would either block nothing or
 * block everything. Access control for the signed-in shell is done client-side
 * in `(app)/layout.tsx`, gated on `hydrated && access`, and enforced for real by
 * the API on every request.
 *
 * When tokens also land in cookies, this is where the real guard goes.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/trades/:path*",
    "/trade/:path*",
    "/passport/:path*",
    "/alerts/:path*",
    "/settings/:path*",
  ],
};
