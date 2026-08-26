import { useMutation, useQuery } from "@tanstack/react-query";

import type { IResponse } from "@/interfaces/IAxios";
import type {
  CreateUploadUrlPayload,
  FinalizedFile,
  RetrievedFile,
  UploadTicket,
} from "@/interfaces/files";
import http from "@/services/base";

export const fileKeys = {
  all: ["files"] as const,
  detail: (id: string) => [...fileKeys.all, "detail", id] as const,
};

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
 * Resolves a stored file id into a URL something can actually render.
 *
 * A ticket attachment is `PRIVATE_CASE`, so what comes back is a SIGNED url with an expiry — which is
 * why this is a query keyed on the id rather than a field baked into the message. `staleTime` is
 * deliberately short of any plausible signature lifetime: re-resolving costs one cheap call, and
 * serving a cached url past its expiry shows the user a broken image.
 *
 * A 403 here is a normal outcome, not a bug — an agent's own upload is a file this customer was never
 * granted. Hence no retry: the answer will not change, and the caller renders the refusal as an
 * unavailable chip.
 */
export function useRetrieveFile(fileId: string | undefined) {
  return useQuery<RetrievedFile>({
    queryKey: fileKeys.detail(fileId ?? ""),
    enabled: Boolean(fileId),
    staleTime: 4 * 60 * 1_000,
    retry: false,
    queryFn: async () => {
      const response = await http.get<IResponse<RetrievedFile>>({ url: `files/${fileId}` });
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
