"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_BYTES = 8 * 1024 * 1024;

// Cover-photo upload for the teacher's public page header. Same blob flow as
// AvatarUpload; feeds the surrounding profile form via a hidden input.
export function BannerUpload({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("error");
      setError("Please choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setError("Image is too large — please choose one under 8MB.");
      return;
    }

    setStatus("uploading");
    setError("");

    const uploadOnce = () =>
      Promise.race([
        upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Upload timed out")), 45_000),
        ),
      ]);

    try {
      let blob;
      try {
        blob = await uploadOnce();
      } catch {
        blob = await uploadOnce();
      }
      setUrl(blob.url);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
      setError(`Upload failed${detail} — please try again or use a different image.`);
    }
  }

  return (
    <div>
      <label className="label">Cover photo</label>
      <div className="relative overflow-hidden rounded-xl border border-border bg-brand-tint">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Cover"
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center text-sm text-muted">
            A wide photo of you teaching, your studio, or a place you love.
          </div>
        )}
        {status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="btn-secondary text-sm"
        >
          {status === "uploading"
            ? "Uploading…"
            : url
              ? "Change cover photo"
              : "Upload cover photo"}
        </button>
        {url && status !== "uploading" && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="btn-ghost text-sm"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      <p className="hint">Wide images work best — roughly 3:1, like a LinkedIn banner.</p>
      {/* Feeds the surrounding profile form — saved on "Save profile" click. */}
      <input type="hidden" name="bannerUrl" value={url} />
    </div>
  );
}
