"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Avatar } from "./Avatar";

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUpload({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string;
}) {
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
      setError("Image is too large — please choose one under 5MB.");
      return;
    }

    setStatus("uploading");
    setError("");
    try {
      // Clerk's short-lived session token occasionally rotates mid-flight,
      // which can fail the very first token request — one silent retry
      // covers that without bothering the user.
      let blob;
      try {
        blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
        });
      } catch {
        blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
        });
      }
      setUrl(blob.url);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Upload failed — please try again.");
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name} src={url} size={64} />
        {status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <label className="label">Photo</label>
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="btn-secondary text-sm"
        >
          {status === "uploading"
            ? "Uploading…"
            : url
              ? "Change photo"
              : "Upload photo"}
        </button>
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
        {/* Feeds the surrounding profile form — saved on "Save profile" click. */}
        <input type="hidden" name="avatarUrl" value={url} />
      </div>
    </div>
  );
}
