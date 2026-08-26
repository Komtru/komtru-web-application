"use client";

import Image from "next/image";
import { Download, FileText, ImageOff } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { formatFileSize } from "@/helpers/numbers";
import { isImageContentType } from "@/interfaces/files";
import { useRetrieveFile } from "@/services/files.services";
import { cn } from "@/lib/utils";

/**
 * The attachments on one message.
 *
 * A message carries file IDS, not urls — a ticket attachment is `PRIVATE_CASE`, so the only url that
 * works is a signed one with an expiry, resolved per render through `GET /files/:id`. That is one query
 * per attachment, which is why each is its own component: they resolve independently, and a refusal on
 * one does not blank the rest.
 *
 * A 403 is expected here, not exceptional. An agent's own upload belongs to the agent, and this customer
 * only reaches it if the case granted them access — so a file that will not resolve renders as a stated
 * "not available" rather than a broken image or an error the customer can do nothing about.
 */
export function MessageAttachments({
  refs,
  fromCustomer,
}: {
  refs: string[];
  fromCustomer: boolean;
}) {
  if (refs.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {refs.map((fileId) => (
        <MessageAttachment key={fileId} fileId={fileId} fromCustomer={fromCustomer} />
      ))}
    </ul>
  );
}

function MessageAttachment({ fileId, fromCustomer }: { fileId: string; fromCustomer: boolean }) {
  const { data, isLoading, isError } = useRetrieveFile(fileId);

  /** The bubble behind this is dark for the customer's own messages and light otherwise. */
  const surface = fromCustomer
    ? "border-white/25 bg-white/10 text-white"
    : "border-border bg-background text-foreground";
  const muted = fromCustomer ? "text-white/60" : "text-kumtru-slate-400";

  if (isLoading) {
    return (
      <li className={cn("flex items-center gap-2 rounded-kumtru-sm border px-2.5 py-2", surface)}>
        <Spinner className={cn("size-3.5", muted)} />
        <span className={cn("text-[11px]", muted)}>Loading attachment…</span>
      </li>
    );
  }

  if (isError || !data) {
    return (
      <li className={cn("flex items-center gap-2 rounded-kumtru-sm border px-2.5 py-2", surface)}>
        <ImageOff className={cn("size-3.5 shrink-0", muted)} aria-hidden="true" />
        <span className={cn("text-[11px]", muted)}>
          This attachment isn&apos;t available to you.
        </span>
      </li>
    );
  }

  if (isImageContentType(data.contentType)) {
    return (
      <li>
        {/* Opens the signed url directly rather than a lightbox — on a phone the browser's own image
            viewer already pinches, zooms and saves, and a custom one would do all three worse. */}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("block overflow-hidden rounded-kumtru-sm border", surface)}
        >
          {/* `unoptimized`: the url is signed and short-lived, so Next's optimizer would cache bytes
              behind a link that has already expired — the same reasoning as `ProfileAvatar`. */}
          <Image
            src={data.url}
            alt="Attachment"
            width={480}
            height={360}
            unoptimized
            className="max-h-56 w-full object-cover"
          />
        </a>
      </li>
    );
  }

  return (
    <li>
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 rounded-kumtru-sm border px-2.5 py-2 transition-opacity hover:opacity-80",
          surface,
        )}
      >
        <FileText className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-medium">PDF document</span>
          <span className={cn("text-[10px]", muted)}>{formatFileSize(data.sizeBytes)}</span>
        </span>
        <Download className={cn("size-3.5 shrink-0", muted)} aria-hidden="true" />
      </a>
    </li>
  );
}
