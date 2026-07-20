import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";

// Client-side direct-to-Blob upload: the browser never sends the image
// through our own server (avoids server-action body-size limits) — it asks
// this route for a short-lived upload token, then uploads straight to Vercel
// Blob. Gated behind a real signed-in teacher so randoms can't use this as a
// free file host.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const teacher = await getCurrentTeacher();
  if (!teacher) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
          maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
          tokenPayload: JSON.stringify({ teacherId: teacher.id, pathname }),
        };
      },
      onUploadCompleted: async () => {
        // No DB write here — the profile form saves avatarUrl itself once
        // the client receives the uploaded blob's URL.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[avatar upload] failed:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
