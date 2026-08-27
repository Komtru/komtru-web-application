"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from "formik";
import { Camera, Trash2 } from "lucide-react";
import * as Yup from "yup";

import { FormError } from "@/components/forms/form-error";
import { ProfileAvatar } from "@/components/general/app/profile-avatar";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
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
import type { UpdateProfilePayload } from "@/interfaces/auth";
import { PROFILE_PHOTO_CONTENT_TYPES } from "@/interfaces/files";
import { authKeys, useUpdateProfile } from "@/services/auth.services";
import { useCreateUploadUrl, useFinalizeUpload, uploadToStorage } from "@/services/files.services";
import { useAuthStore } from "@/store/auth.store";

const BIO_MAX = 500;
const NAME_MAX = 100;

/**
 * Free text, max 40, on the API side. A fixed list keeps the values consistent
 * enough to be worth storing, and "Prefer not to say" is a real answer rather
 * than an absence.
 */
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;

interface ProfileFormValues {
  displayName: string;
  gender: string;
  dateOfBirth: string;
  bio: string;
}

const ProfileSchema = Yup.object({
  displayName: Yup.string().trim().max(NAME_MAX, "Too long."),
  gender: Yup.string().max(40),
  dateOfBirth: Yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Use the date picker.",
    excludeEmptyString: true,
  }),
  bio: Yup.string().max(BIO_MAX, `At most ${BIO_MAX} characters.`),
});

/** `<input type="date">` gives an ISO value already, and the API wants ISO 8601. */
function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useCustomToast();

  const me = useAuthStore((state) => state.me);

  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { mutateAsync: createUploadUrl } = useCreateUploadUrl();
  const { mutateAsync: finalizeUpload } = useFinalizeUpload();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Local preview plus the finalized file id.
   *
   * `undefined` means untouched, so the field is omitted from the PATCH and the
   * stored photo is left alone. `null` means the user removed it, which the API
   * reads as "clear".
   */
  const [avatarFileId, setAvatarFileId] = useState<string | null | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const profile = me?.profile ?? null;

  const initialValues: ProfileFormValues = {
    displayName: profile?.displayName ?? "",
    // Neither is returned by `GET /me`, so there is nothing to prefill. Leaving
    // one blank must therefore mean "don't touch it", not "clear it" — which is
    // what the diffed payload below gives us.
    gender: "",
    dateOfBirth: "",
    bio: profile?.bio ?? "",
  };

  const currentAvatar = avatarFileId === null ? null : (previewUrl ?? profile?.avatarUrl ?? null);
  const fallbackName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    me?.username ||
    "You";

  /**
   * Uploaded on selection rather than on save.
   *
   * Three round-trips hidden behind a submit button is a long, silent wait with
   * three different ways to fail. Doing it here means the picture is confirmed
   * on screen before the user commits to anything, and save stays one request.
   */
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // The same file twice in a row is a legitimate retry after a failure.
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (
      !PROFILE_PHOTO_CONTENT_TYPES.includes(
        file.type as (typeof PROFILE_PHOTO_CONTENT_TYPES)[number],
      )
    ) {
      setError("Photos must be a JPEG, PNG or WebP.");
      return;
    }

    setUploading(true);

    try {
      const ticket = await createUploadUrl({
        category: "PROFILE_PHOTO",
        // The only class the API allows for a profile photo — a picture a
        // counterparty cannot see would not do its job.
        visibility: "PUBLIC",
        contentType: file.type,
      });

      if (file.size > ticket.maxBytes) {
        setError(
          `That image is too large. The limit is ${Math.floor(ticket.maxBytes / 1_000_000)}MB.`,
        );
        return;
      }

      await uploadToStorage(ticket, file);
      // Not optional: until the API has confirmed with storage what arrived, the
      // id resolves to nothing and attaching it would give us a blank avatar.
      const finalized = await finalizeUpload({ fileId: ticket.fileId });

      setAvatarFileId(finalized.fileId);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(toErrorMessage(err, "We couldn't upload that photo. Try again."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(
    values: ProfileFormValues,
    { setSubmitting }: FormikHelpers<ProfileFormValues>,
  ) {
    setError(null);

    // Only what changed. The API treats an empty string as "clear", so posting
    // every field would wipe the two it never let us read.
    const payload: UpdateProfilePayload = {};

    // No `firstName`/`lastName` here, deliberately. The API still accepts both,
    // but a self-typed legal name is worth nothing on a payments platform — it
    // comes from identity verification, which is the only thing that checks it.
    if (values.displayName.trim() !== initialValues.displayName)
      payload.displayName = values.displayName.trim();
    if (values.bio.trim() !== initialValues.bio) payload.bio = values.bio.trim();
    if (values.gender) payload.gender = values.gender;
    if (values.dateOfBirth) payload.dateOfBirth = values.dateOfBirth;
    if (avatarFileId !== undefined) payload.avatarFileId = avatarFileId;

    if (Object.keys(payload).length === 0) {
      // The API 400s on an empty body rather than recording a no-op update, and
      // "nothing to save" is a better answer than that error.
      showToast({ title: "Nothing to save", type: "info" });
      setSubmitting(false);
      return;
    }

    try {
      await updateProfile(payload);

      /**
       * Refetched, not merged from the response.
       *
       * `PATCH /me/profile` returns the stored row, whose `avatarUrl` is the
       * social-provider column — null once a photo is uploaded, because the
       * uploaded one lives behind `avatarFileId`. Only `GET /me` resolves that
       * id into a signed URL. Merging the row would therefore blank the avatar
       * everywhere the store feeds, which is exactly the bug this replaced.
       *
       * Awaited so the shell has the new profile before we navigate to it.
       */
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });

      showToast({ title: "Profile updated", type: "success" });
      router.push("/settings");
    } catch (err) {
      const message = toErrorMessage(err, "We couldn't save those changes. Try again.");
      setError(message);
      showToast({ title: "Save failed", description: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 px-4 pt-4 pb-6">
      <h1 className="text-lg font-semibold">Edit profile</h1>
      <p className="mt-1 text-[11.5px] text-kumtru-slate-500">
        What a counterparty sees when they are deciding whether to trade with you.
      </p>

      {/* Avatar ------------------------------------------------------------ */}
      <div className="mt-5 flex items-center gap-4">
        <div className="relative">
          <ProfileAvatar url={currentAvatar} name={fallbackName} size="xl" />

          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Spinner className="text-white" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-3.5" />
            {currentAvatar ? "Change photo" : "Add photo"}
          </Button>

          {currentAvatar ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                setAvatarFileId(null);
                setPreviewUrl(null);
              }}
              className="justify-start text-kumtru-risk"
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={PROFILE_PHOTO_CONTENT_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Fields ------------------------------------------------------------ */}
      <Formik<ProfileFormValues>
        initialValues={initialValues}
        validationSchema={ProfileSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form className="mt-6 space-y-4">
            <div>
              <Field
                name="displayName"
                as={FloatingLabelInput}
                label="Display name"
                maxLength={NAME_MAX}
                hint="What counterparties see. Not editable here: your legal name, which comes from identity verification."
              />
              <ErrorMessage
                name="displayName"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <div>
              <Label htmlFor="gender" className="text-[11px] font-semibold tracking-wide uppercase">
                Gender
              </Label>
              <Select
                value={values.gender}
                onValueChange={(value) => void setFieldValue("gender", value)}
              >
                <SelectTrigger id="gender" className="mt-1.5 h-12 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="dateOfBirth"
                className="text-[11px] font-semibold tracking-wide uppercase"
              >
                Date of birth
              </Label>
              {/* A native date input rather than the calendar popover: on a phone
                  it opens the OS date wheel, which beats paging a calendar back
                  thirty years. */}
              <Input
                id="dateOfBirth"
                type="date"
                value={values.dateOfBirth}
                max={toDateInputValue(new Date().toISOString())}
                onChange={(event) => void setFieldValue("dateOfBirth", event.target.value)}
                className="mt-1.5 h-12"
              />
              <ErrorMessage
                name="dateOfBirth"
                component="span"
                className="mt-1 block text-xs text-kumtru-risk"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-[11px] font-semibold tracking-wide uppercase">
                Bio
              </Label>
              <Field
                as={Textarea}
                id="bio"
                name="bio"
                rows={4}
                maxLength={BIO_MAX}
                placeholder="What you trade, and how you work."
                className="mt-1.5"
              />
              <div className="mt-1 flex justify-between">
                <ErrorMessage name="bio" component="span" className="text-xs text-kumtru-risk" />
                <span className="ms-auto text-[11px] text-kumtru-slate-400">
                  {values.bio.length}/{BIO_MAX}
                </span>
              </div>
            </div>

            <FormError message={error} />

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="xl"
                className="flex-1"
                onClick={() => router.push("/settings")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="xl"
                disabled={isSubmitting || uploading}
                className="flex-1"
              >
                {isSubmitting ? <Spinner /> : "Save"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
