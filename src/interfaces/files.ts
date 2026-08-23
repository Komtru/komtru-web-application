/**
 * M20 file contracts, mirrored from `backend-apis/src/modules/files`.
 *
 * Uploads never pass through this app's own API. The client asks for a signed
 * ticket, POSTs the bytes straight to storage, then tells the API it landed —
 * three calls, because the API deliberately does not proxy file bodies.
 */

export type FileCategory =
  | "LISTING_IMAGE"
  | "KYC_DOCUMENT"
  | "DISPUTE_EVIDENCE"
  | "PROOF_OF_DELIVERY"
  | "TICKET_ATTACHMENT"
  | "PROFILE_PHOTO"
  | "CHAT_ATTACHMENT"
  | "OTHER";

/**
 * Required on every upload, with no default.
 *
 * The API refuses to infer it: the failure mode of guessing in the permissive
 * direction is a KYC document served to the internet. Each category also
 * declares which classes are legal for it — `PROFILE_PHOTO` is `PUBLIC` only,
 * because the whole point is that a counterparty can see it.
 */
export type FileVisibility = "PUBLIC" | "PRIVATE_OWNER" | "PRIVATE_CASE" | "INTERNAL_ONLY";

/** What the API accepts for a profile photo. Re-checked server-side at finalize. */
export const PROFILE_PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface CreateUploadUrlPayload {
  category: FileCategory;
  visibility: FileVisibility;
  contentType: string;
}

/**
 * A signed, single-use ticket for a direct-to-storage upload.
 *
 * `params` carries the signature and api key and must be posted verbatim
 * alongside the file — adding, dropping or reordering a field invalidates the
 * signature the storage provider recomputes.
 */
export interface UploadTicket {
  fileId: string;
  cloudName: string;
  uploadUrl: string;
  params: Record<string, string>;
  maxBytes: number;
  expiresAt: string;
}

export interface FinalizedFile {
  fileId: string;
  category: FileCategory;
  visibility: FileVisibility;
  contentType: string;
  sizeBytes: number;
  finalizedAt: string;
}
