"use client";

// Elder account / profile page: view and edit your own details. The phone
// number is shown ONLY here, to the signed-in owner (RLS guarantees no one else
// can read it). Warm green design, large readable fields for older users.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { Camera, Lock, Pencil, ShieldCheck } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getAccountInitials,
  updateOwnProfile,
  uploadAvatar,
  type AccountProfile,
} from "@/lib/auth/account";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const inputClass =
  "min-h-14 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-lg font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";
const labelClass = "grid gap-2 text-base font-bold text-espresso";

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function AvatarBubble({
  url,
  initials,
  className = "size-20",
}: {
  url: string | null;
  initials: string;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Your profile photo"
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-sand`}
      />
    );
  }

  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-terracotta text-2xl font-bold text-white`}
    >
      {initials}
    </span>
  );
}

export default function AccountPage() {
  const { status, user, profile, isAdmin, isCaregiver, profileError, envError, refresh } =
    useCurrentUser();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function startEditing(current: AccountProfile) {
    setFirstName(current.first_name ?? "");
    setLastName(current.last_name ?? "");
    setPhone(current.phone ?? "");
    setAge(current.age != null ? String(current.age) : "");
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditing(true);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) {
      return;
    }

    const parsedAge = age.trim() === "" ? null : Number(age);
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 16 || parsedAge > 120)) {
      setErrorMessage("Please enter an age between 16 and 120, or leave it blank.");
      return;
    }

    const { supabase, envError: configError } = getSupabaseBrowserClient();
    if (configError || !supabase) {
      setErrorMessage(configError);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let avatarUrl = profile.avatar_url ?? null;
    if (photoFile) {
      const uploadResult = await uploadAvatar(supabase, user.id, photoFile);
      if (uploadResult.errorMessage) {
        setErrorMessage(`Could not upload the photo: ${uploadResult.errorMessage}`);
        setIsSaving(false);
        return;
      }
      avatarUrl = uploadResult.url;
    }

    const result = await updateOwnProfile(supabase, user.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      age: parsedAge,
      avatarUrl,
    });

    if (result.errorMessage) {
      setErrorMessage(`Could not save your changes: ${result.errorMessage}`);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsEditing(false);
    setSuccessMessage("Your profile was saved.");
    await refresh();
  }

  const initials = getAccountInitials(
    profile?.first_name ?? null,
    profile?.last_name ?? null,
    user?.email ?? null,
  );
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Your account"
        title="My profile"
        description="View and update your details. Your phone number is private and only you can see it here."
      />

      {status === "loading" ? (
        <div className="mt-8 rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm" role="status">
          Loading your profile…
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">Setup needed</h2>
          <p className="mt-4 leading-7">{envError}</p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-espresso">Please sign in</h2>
          <p className="mt-4 text-lg leading-8 text-espresso-light">
            Sign in to view and edit your profile.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-terracotta transition hover:bg-linen"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : null}

      {status === "signed-in" && profileError && !profile ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">Profile setup needs attention</h2>
          <p className="mt-3 text-sm leading-6">{profileError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-white transition hover:bg-terracotta-dark"
          >
            Try again
          </button>
        </div>
      ) : null}

      {status === "signed-in" && profile ? (
        <div className="mt-8 grid gap-5">
          <div className="rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-5">
              <AvatarBubble url={profile.avatar_url} initials={initials} />
              <div className="min-w-0">
                <h2 className="font-display text-3xl font-extrabold text-espresso">
                  {fullName || "Welcome"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-linen px-3 py-1 text-xs font-bold uppercase tracking-wide text-terracotta">
                    Elder account
                  </span>
                  {isCaregiver ? (
                    <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-terracotta-dark">
                      Caregiver
                    </span>
                  ) : null}
                  {isAdmin ? (
                    <span className="rounded-full bg-espresso px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Admin
                    </span>
                  ) : null}
                </div>
              </div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => startEditing(profile)}
                  className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-terracotta-dark"
                >
                  <Pencil className="size-4" strokeWidth={2.2} aria-hidden="true" />
                  Edit profile
                </button>
              ) : null}
            </div>

            {successMessage ? (
              <p
                className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-800"
                role="status"
              >
                {successMessage}
              </p>
            ) : null}

            {!isEditing ? (
              <dl className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-bold uppercase tracking-wide text-warmgrey">First name</dt>
                  <dd className="mt-1 text-lg text-espresso">{profile.first_name || "Not set yet"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold uppercase tracking-wide text-warmgrey">Last name</dt>
                  <dd className="mt-1 text-lg text-espresso">{profile.last_name || "Not set yet"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold uppercase tracking-wide text-warmgrey">Email</dt>
                  <dd className="mt-1 break-words text-lg text-espresso">{profile.email}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-warmgrey">
                    <Lock className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                    Phone — private to you
                  </dt>
                  <dd className="mt-1 text-lg text-espresso">{profile.phone || "Not set yet"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold uppercase tracking-wide text-warmgrey">Age</dt>
                  <dd className="mt-1 text-lg text-espresso">
                    {profile.age != null ? profile.age : "Not set yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold uppercase tracking-wide text-warmgrey">Member since</dt>
                  <dd className="mt-1 text-lg text-espresso">{formatDate(profile.created_at)}</dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={handleSave} className="mt-7 grid gap-6" noValidate>
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className={labelClass}>
                    First name
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                      autoComplete="given-name"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Last name
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className={labelClass}>
                  Phone number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    className={inputClass}
                  />
                  <span className="flex items-start gap-2 rounded-2xl bg-linen px-4 py-3 text-sm font-normal leading-6 text-espresso-light">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-terracotta" strokeWidth={2} aria-hidden="true" />
                    Your phone number stays private and is never shown to others.
                  </span>
                </label>

                <label className={`${labelClass} sm:max-w-[12rem]`}>
                  Age
                  <input
                    type="number"
                    inputMode="numeric"
                    min={16}
                    max={120}
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-base font-bold text-espresso">Profile photo</span>
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-sand bg-ivory p-4">
                    <AvatarBubble
                      url={photoPreview ?? profile.avatar_url}
                      initials={initials}
                    />
                    <div className="grid gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="block max-w-full text-sm text-espresso file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-terracotta file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-terracotta-dark"
                      />
                      <span className="flex items-center gap-1.5 text-sm font-normal text-warmgrey">
                        <Camera className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        Optional — choose a new photo to replace the current one.
                      </span>
                    </div>
                  </div>
                </div>

                <p className="rounded-2xl bg-linen px-4 py-3 text-sm leading-6 text-espresso-light">
                  To change your sign-in email, please contact support for now.
                </p>

                {errorMessage ? (
                  <div
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
                    role="alert"
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-14 items-center justify-center rounded-full bg-terracotta px-6 py-3 text-lg font-bold text-white shadow-lg shadow-terracotta/30 transition hover:-translate-y-0.5 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="inline-flex min-h-14 items-center justify-center rounded-full border border-sand bg-white px-6 py-3 text-lg font-bold text-espresso transition hover:bg-linen disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-[2rem] bg-ivory p-6 ring-1 ring-sand sm:p-8">
            <h2 className="font-display text-2xl font-extrabold text-espresso">Things you can do</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/helpers"
                className="inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
              >
                Browse caregivers
              </Link>
              {isCaregiver ? (
                <Link
                  href="/dashboard/helper-profile"
                  className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-terracotta transition hover:bg-linen"
                >
                  Caregiver dashboard
                </Link>
              ) : (
                <Link
                  href="/helper/apply"
                  className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-terracotta transition hover:bg-linen"
                >
                  Become a caregiver
                </Link>
              )}
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-terracotta transition hover:bg-linen"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
