import { useMutation } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type { CreateUploadUrlPayload, FinalizedFile, UploadTicket } from "@/interfaces/files";
import http from "@/services/base";

/**
 * The three-step upload.
 *
 * 1. `POST /files/upload-url` — the API records the intent and hands back a
 *    signed ticket. Nothing has been uploaded yet.
 * 2. `POST <ticket.uploadUrl>` — the bytes go **straight to storage**, not
 *    through this app or the API.
 * 3. `POST /files/:id/finalize` — the API asks storage what actually arrived and
 *    reconciles size and content type. Skipping this leaves a file id that
 *    resolves to nothing.
 *
 * A file id is only safe to attach to anything (a profile, a dispute) after
 * step 3.
 */

export function useCreateUploadUrl() {
  return useMutation<UploadTicket, unknown, CreateUploadUrlPayload>({
    mutationFn: async (payload) => {
      const response = await http.post<IResponse<UploadTicket>>({
        url: "files/upload-url",
        body: payload,
      });
      return response.data;
    },
  });
}

export function useFinalizeUpload() {
  return useMutation<FinalizedFile, unknown, { fileId: string }>({
    mutationFn: async ({ fileId }) => {
      const response = await http.post<IResponse<FinalizedFile>>({
        url: `files/${fileId}/finalize`,
      });
      return response.data;
    },
  });
}

/**
 * Step two, deliberately outside the HTTP facade.
 *
 * `services/base.ts` attaches a `Bearer` token and points at the same-origin
 * `/api` proxy; both are wrong here. This is a cross-origin POST to a storage
 * provider, and sending our access token to it would hand a third party a live
 * session credential. Plain `fetch`, no interceptors, no auth header.
 *
 * `params` is posted verbatim and `file` goes last — the ticket's signature
 * covers those exact fields, so anything added or renamed here is rejected by
 * the provider rather than by us.
 */
export async function uploadToStorage(ticket: UploadTicket, file: File): Promise<void> {
  const form = new FormData();

  for (const [key, value] of Object.entries(ticket.params)) {
    form.append(key, value);
  }
  form.append("file", file);

  const response = await fetch(ticket.uploadUrl, { method: "POST", body: form });

  if (!response.ok) {
    throw new Error("The upload was rejected. Try a different image.");
  }
}
