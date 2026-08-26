"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toErrorMessage } from "@/helpers/errors";
import {
  TICKET_ATTACHMENT_CONTENT_TYPES,
  TICKET_ATTACHMENT_MAX,
  isImageContentType,
} from "@/interfaces/files";
import { useCreateUploadUrl, useFinalizeUpload, uploadToStorage } from "@/services/files.services";

/**
 * The attachment tray behind both ticket composers — new ticket and reply.
 *
 * One hook rather than the state machine written twice, because it is not a small one: each file goes
 * through three network calls independently of every other, any of them can fail on its own, and the
 * submit button has to know whether the whole tray has settled.
 *
 * Files upload the moment they are picked, not on submit. Same reasoning as the avatar picker: three
 * round-trips per file hidden behind a Send button is a long silent wait with three ways to fail, and
 * a customer attaching a receipt wants to see it land before they commit to the message.
 */

export type AttachmentStatus = "uploading" | "ready" | "failed";

export interface PendingAttachment {
  /** Client-side only, stable across retries — the React key. The API's id is `fileId`. */
  localId: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  status: AttachmentStatus;
  /** Set once `POST /files/:id/finalize` has returned. Only these are safe to send. */
  fileId?: string;
  /** An object URL for images, so the thumbnail is local rather than a round trip to storage. */
  previewUrl?: string;
  error?: string;
}

const ACCEPT = TICKET_ATTACHMENT_CONTENT_TYPES.join(",");

function isAllowedType(contentType: string): boolean {
  return (TICKET_ATTACHMENT_CONTENT_TYPES as readonly string[]).includes(contentType.toLowerCase());
}

export function useTicketAttachments() {
  const { mutateAsync: createUploadUrl } = useCreateUploadUrl();
  const { mutateAsync: finalizeUpload } = useFinalizeUpload();

  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  /**
   * The `File` objects, keyed by `localId`, outside React state.
   *
   * A retry needs the original bytes, but a `File` is not serialisable and nothing renders it — keeping
   * it in state would put a non-comparable blob in every diff for no gain.
   */
  const filesRef = useRef(new Map<string, File>());

  /**
   * Every object URL handed out, so unmount can revoke them.
   *
   * Revoking only on `remove` leaks each preview whose ticket got submitted, which on this screen is
   * the common path, not the edge case.
   */
  const previewsRef = useRef(new Set<string>());

  /**
   * A synchronous mirror of `attachments.length`, for the cap check in `add`.
   *
   * Reading `attachments.length` from the closure would be one render stale, so picking twice in quick
   * succession could push the tray past the API's limit and 400 the whole message on send.
   */
  const countRef = useRef(0);

  useEffect(() => {
    const previews = previewsRef.current;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
      previews.clear();
    };
  }, []);

  const update = useCallback((localId: string, patch: Partial<PendingAttachment>) => {
    setAttachments((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    );
  }, []);

  /** The three-step upload for one file. Never throws — failure is recorded on the row instead. */
  const upload = useCallback(
    async (localId: string, file: File) => {
      update(localId, { status: "uploading", error: undefined });

      try {
        const ticket = await createUploadUrl({
          category: "TICKET_ATTACHMENT",
          // The only class the API allows for this category: a support attachment is case evidence,
          // readable by its uploader and by whoever is granted the case — never public.
          visibility: "PRIVATE_CASE",
          contentType: file.type,
        });

        // Only knowable once the ticket comes back, since the cap is per storage pool.
        if (file.size > ticket.maxBytes) {
          update(localId, {
            status: "failed",
            error: `Too large — the limit is ${Math.floor(ticket.maxBytes / 1_000_000)}MB.`,
          });
          return;
        }

        await uploadToStorage(ticket, file);
        // Not optional: until the API has reconciled with storage, the id resolves to nothing, and a
        // message would be sent referencing an attachment that renders as a blank.
        const finalized = await finalizeUpload({ fileId: ticket.fileId });

        update(localId, { status: "ready", fileId: finalized.fileId });
      } catch (error) {
        update(localId, {
          status: "failed",
          error: toErrorMessage(error, "Upload failed."),
        });
      }
    },
    [createUploadUrl, finalizeUpload, update],
  );

  /**
   * Returns the reason the selection was trimmed, if it was — the caller surfaces it. Silently dropping
   * the files past the cap would look like the picker had simply lost them.
   *
   * Everything here happens OUTSIDE the state updater. `URL.createObjectURL` and the two ref writes are
   * side effects, and `reactStrictMode` double-invokes updaters in development — running them in there
   * would allocate two object URLs per image and leak the one React discards.
   */
  const add = useCallback(
    (selected: FileList | File[]): string | null => {
      const incoming = Array.from(selected);
      if (incoming.length === 0) return null;

      const allowed = incoming.filter((file) => isAllowedType(file.type));
      const room = Math.max(TICKET_ATTACHMENT_MAX - countRef.current, 0);
      const accepted = allowed.slice(0, room);

      const notice =
        allowed.length < incoming.length
          ? "Only images and PDFs can be attached."
          : accepted.length < allowed.length
            ? `You can attach up to ${TICKET_ATTACHMENT_MAX} files.`
            : null;

      if (accepted.length === 0) return notice;

      const rows: PendingAttachment[] = accepted.map((file) => {
        const localId = crypto.randomUUID();
        filesRef.current.set(localId, file);

        let previewUrl: string | undefined;
        if (isImageContentType(file.type)) {
          previewUrl = URL.createObjectURL(file);
          previewsRef.current.add(previewUrl);
        }

        return {
          localId,
          name: file.name,
          sizeBytes: file.size,
          contentType: file.type,
          status: "uploading",
          ...(previewUrl ? { previewUrl } : {}),
        };
      });

      countRef.current += rows.length;
      setAttachments((current) => [...current, ...rows]);

      // Each file's three calls run independently — one slow scan of a 9MB PDF does not hold up the
      // screenshot picked alongside it.
      rows.forEach((row) => void upload(row.localId, filesRef.current.get(row.localId)!));

      return notice;
    },
    [upload],
  );

  const remove = useCallback((localId: string) => {
    setAttachments((current) => {
      const row = current.find((item) => item.localId === localId);
      if (row?.previewUrl) {
        URL.revokeObjectURL(row.previewUrl);
        previewsRef.current.delete(row.previewUrl);
      }
      const next = current.filter((item) => item.localId !== localId);
      countRef.current = next.length;
      return next;
    });
    filesRef.current.delete(localId);
  }, []);

  const retry = useCallback(
    (localId: string) => {
      const file = filesRef.current.get(localId);
      if (file) void upload(localId, file);
    },
    [upload],
  );

  const reset = useCallback(() => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current.clear();
    filesRef.current.clear();
    countRef.current = 0;
    setAttachments([]);
  }, []);

  const readyRefs = attachments
    .filter((item) => item.status === "ready" && item.fileId)
    .map((item) => item.fileId!);

  return {
    accept: ACCEPT,
    attachments,
    add,
    remove,
    retry,
    reset,
    /** Only finalized ids. A tray mid-upload contributes nothing here, which is what gates submit. */
    readyRefs,
    isUploading: attachments.some((item) => item.status === "uploading"),
    hasFailures: attachments.some((item) => item.status === "failed"),
    isFull: attachments.length >= TICKET_ATTACHMENT_MAX,
  };
}
