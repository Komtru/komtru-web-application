"use client";

import { useRef } from "react";
import Image from "next/image";
import { AlertCircle, FileText, Paperclip, RotateCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatFileSize } from "@/helpers/numbers";
import type { PendingAttachment, useTicketAttachments } from "@/hooks/useTicketAttachments";
import { cn } from "@/lib/utils";

type Tray = ReturnType<typeof useTicketAttachments>;

/**
 * The picker button, and the chips for what has been picked, as two pieces.
 *
 * Split rather than one component, because the two composers want them in different places: the
 * new-ticket form stacks chips under a labelled button, while the reply composer needs the paperclip
 * inline with the textarea and the chips on their own row above it — a single component would have to
 * take a layout flag and render both arrangements badly.
 *
 * Each chip shows its own state. One file failing does not block the others or the message: the customer
 * can retry it, drop it, or send without it, and the send button only waits on uploads still in flight.
 */
export function AttachmentPicker({
  tray,
  disabled = false,
  onNotice,
  compact = false,
  className,
}: {
  tray: Tray;
  disabled?: boolean;
  /** Called when a selection was trimmed — wrong type, or past the cap. */
  onNotice?: (message: string) => void;
  /** The reply composer's variant: an icon button rather than a labelled one. */
  compact?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    // Cleared so re-picking the same file after removing it still fires a change event.
    event.target.value = "";
    if (!files?.length) return;

    const notice = tray.add(files);
    if (notice) onNotice?.(notice);
  }

  const pickDisabled = disabled || tray.isFull;

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          disabled={pickDisabled}
          onClick={() => inputRef.current?.click()}
          aria-label="Attach a file"
          className={className}
        >
          <Paperclip className="size-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pickDisabled}
          onClick={() => inputRef.current?.click()}
          className={className}
        >
          <Paperclip className="size-3.5" aria-hidden="true" />
          Attach a file
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={tray.accept}
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}

export function AttachmentChips({
  tray,
  disabled = false,
  className,
}: {
  tray: Tray;
  disabled?: boolean;
  className?: string;
}) {
  if (tray.attachments.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {tray.attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.localId}
          attachment={attachment}
          disabled={disabled}
          onRemove={() => tray.remove(attachment.localId)}
          onRetry={() => tray.retry(attachment.localId)}
        />
      ))}
    </ul>
  );
}

function AttachmentChip({
  attachment,
  disabled,
  onRemove,
  onRetry,
}: {
  attachment: PendingAttachment;
  disabled: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const failed = attachment.status === "failed";
  const uploading = attachment.status === "uploading";

  return (
    <li
      className={cn(
        "relative flex items-center gap-2 rounded-kumtru-sm border py-1.5 pr-8 pl-2",
        failed ? "border-kumtru-risk/40 bg-kumtru-risk/5" : "border-border bg-secondary",
      )}
    >
      <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-background">
        {attachment.previewUrl ? (
          <Image
            src={attachment.previewUrl}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-8 object-cover"
          />
        ) : (
          <FileText className="size-4 text-kumtru-slate-400" aria-hidden="true" />
        )}

        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Spinner className="size-3 text-white" />
          </span>
        ) : null}
      </span>

      <span className="min-w-0">
        <span className="block max-w-36 truncate text-[11.5px] font-medium">{attachment.name}</span>
        <span
          className={cn(
            "flex items-center gap-1 text-[10px]",
            failed ? "text-kumtru-risk" : "text-kumtru-slate-400",
          )}
        >
          {failed ? (
            <>
              <AlertCircle className="size-2.5" aria-hidden="true" />
              {attachment.error ?? "Upload failed."}
            </>
          ) : uploading ? (
            "Uploading…"
          ) : (
            formatFileSize(attachment.sizeBytes)
          )}
        </span>
      </span>

      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          aria-label={`Retry uploading ${attachment.name}`}
          className="absolute top-1 right-4.5 text-kumtru-slate-400 hover:text-foreground"
        >
          <RotateCw className="size-3" aria-hidden="true" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${attachment.name}`}
        className="absolute top-1 right-1 text-kumtru-slate-400 hover:text-foreground"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </li>
  );
}
