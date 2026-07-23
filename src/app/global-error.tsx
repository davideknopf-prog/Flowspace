"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself (where the normal error.tsx
// can't render). Must supply its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem",
          textAlign: "center",
          color: "#26211c",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: "2.5rem", margin: 0 }}>🌀</p>
          <h1 style={{ fontSize: "1.4rem", margin: "0.75rem 0 0.25rem" }}>
            Something went sideways
          </h1>
          <p style={{ color: "#6b6259", margin: "0 0 1.25rem" }}>
            That&apos;s on us. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#4a7c59",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "0.6rem 1.1rem",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
