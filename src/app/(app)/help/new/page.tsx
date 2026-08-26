"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ScreenHeader } from "@/components/general/app/screen-header";
import { StickyActionBar } from "@/components/general/app/sticky-action-bar";
import { SafetyCallout } from "@/components/general/safety-callout";
import { AttachmentChips, AttachmentPicker } from "@/components/general/ticket/attachment-tray";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toErrorMessage } from "@/helpers/errors";
import { useCustomToast } from "@/hooks/useCustomToast";
import { useTicketAttachments } from "@/hooks/useTicketAttachments";
import { SUPPORT_TOPICS } from "@/interfaces/tickets";
import { useCreateTicket } from "@/services/tickets.services";

const CATEGORY_MAX = 120;
const BODY_MAX = 4_000;

/** A pushed screen off Help & Support — `ScreenHeader` gives it the back button that a form here needs
 * and the tab-root screen below it does not. */
export default function NewTicketPage() {
  const router = useRouter();
  const { showToast } = useCustomToast();
  const { mutate: createTicket, isPending } = useCreateTicket();

  const [queueCode, setQueueCode] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const attachments = useTicketAttachments();

  /**
   * `isUploading` gates submit but `hasFailures` does not.
   *
   * Waiting on files still in flight is the difference between attaching them and silently dropping
   * them. A file that has already failed is a decision the customer has made visible to them — they can
   * retry it, remove it, or file without it — and blocking on one would trap someone whose 12MB photo
   * is never going to fit behind a button that will not explain itself.
   */
  const canSubmit =
    Boolean(queueCode) &&
    category.trim().length > 0 &&
    body.trim().length > 0 &&
    !attachments.isUploading;

  function handleSubmit() {
    if (!canSubmit || isPending) return;
    setError(null);

    createTicket(
      {
        queueCode,
        category: category.trim(),
        body: body.trim(),
        attachmentRefs: attachments.readyRefs,
      },
      {
        onSuccess: (ticket) => {
          showToast({ title: "Ticket submitted", type: "success" });
          router.replace(`/help/${ticket.id}`);
        },
        onError: (err) => {
          const message = toErrorMessage(err, "We couldn't submit that. Try again.");
          setError(message);
          showToast({ title: "Submission failed", description: message, type: "error" });
        },
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="New ticket" onBack={() => router.push("/help")} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <SafetyCallout variant="warning" title="Komtru support will never ask for an OTP.">
          Not your login code, not a one-time payment code, not your password — not here, not on a
          call. Anyone who does is not really Komtru.
        </SafetyCallout>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="topic" className="text-[11px] font-semibold tracking-wide uppercase">
              What&apos;s this about?
            </Label>
            <Select value={queueCode} onValueChange={setQueueCode}>
              <SelectTrigger id="topic" className="mt-1.5 h-12 w-full">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TOPICS.map((topic) => (
                  <SelectItem key={topic.queueCode} value={topic.queueCode}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category" className="text-[11px] font-semibold tracking-wide uppercase">
              Subject
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value.slice(0, CATEGORY_MAX))}
              placeholder="A short summary — e.g. 'Payment taken twice'"
              className="mt-1.5 h-12"
            />
          </div>

          <div>
            <Label htmlFor="body" className="text-[11px] font-semibold tracking-wide uppercase">
              Tell us what happened
            </Label>
            <Textarea
              id="body"
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
              placeholder="Include the trade code or amount if this is about a payment — it saves a round trip."
              className="mt-1.5"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[11px] text-kumtru-slate-400">
                {body.length}/{BODY_MAX}
              </span>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold tracking-wide uppercase">Attachments</Label>
            <p className="mt-0.5 text-[11px] text-kumtru-slate-400">
              A screenshot or receipt saves a round trip. Images and PDFs.
            </p>
            <AttachmentChips tray={attachments} disabled={isPending} className="mt-2" />
            <AttachmentPicker
              tray={attachments}
              disabled={isPending}
              onNotice={(message) => showToast({ title: message, type: "info" })}
              className="mt-2"
            />
          </div>

          {error ? <p className="text-xs text-kumtru-risk">{error}</p> : null}
        </div>
      </div>

      <StickyActionBar>
        <Button
          size="xl"
          className="w-full"
          disabled={!canSubmit || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <Spinner />
          ) : attachments.isUploading ? (
            // Named rather than left as a dead grey button — the one disabled state here that resolves
            // on its own, so the customer needs to know it is worth waiting a moment for.
            "Uploading…"
          ) : (
            "Submit"
          )}
        </Button>
      </StickyActionBar>
    </div>
  );
}
