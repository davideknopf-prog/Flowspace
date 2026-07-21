"use client";

import { useState } from "react";
import type { AudienceMember } from "@/lib/repo";
import { formatMoney } from "@/lib/format";

// Client-side table for the Audience page: copy an address, copy them all, or
// export a CSV. Read-only for now — Kuleo-powered bulk email comes later.

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function csvCell(v: string): string {
  // Quote if the value contains a comma, quote, or newline; double interior quotes.
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function AudienceTable({ audience }: { audience: AudienceMember[] }) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  async function copy(text: string, mark: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      mark();
    } catch {
      // Clipboard can be blocked on insecure origins — no-op rather than throw.
    }
  }

  function copyAll() {
    const emails = audience.map((m) => m.email).join(", ");
    copy(emails, () => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    });
  }

  function exportCsv() {
    const header = [
      "Name",
      "Email",
      "Classes booked",
      "Passes bought",
      "Total spent (USD)",
      "First seen",
      "Last class",
    ];
    const lines = audience.map((m) =>
      [
        csvCell(m.name),
        csvCell(m.email),
        String(m.classesBooked),
        String(m.passesBought),
        (m.totalSpentCents / 100).toFixed(2),
        formatDate(m.firstSeenISO),
        formatDate(m.lastClassISO),
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kuleo-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary text-sm" onClick={copyAll}>
          {copiedAll ? "Copied ✓" : "Copy all emails"}
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={exportCsv}>
          ⬇ Export CSV
        </button>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium text-right">Classes</th>
              <th className="px-4 py-3 font-medium text-right">Passes</th>
              <th className="px-4 py-3 font-medium text-right">Spent</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">
                Last class
              </th>
              <th className="px-4 py-3 font-medium text-right">Email</th>
            </tr>
          </thead>
          <tbody>
            {audience.map((m, i) => (
              <tr
                key={m.email}
                className="border-b border-border last:border-0 hover:bg-brand-tint/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && m.classesBooked > 0 && (
                      <span title="Your top fan" aria-label="Top fan">
                        ⭐
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted truncate">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {m.classesBooked}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {m.passesBought || "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {m.totalSpentCents > 0 ? formatMoney(m.totalSpentCents) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-muted whitespace-nowrap">
                  {formatDate(m.lastClassISO)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1 text-xs"
                    onClick={() =>
                      copy(m.email, () => {
                        setCopiedEmail(m.email);
                        setTimeout(() => setCopiedEmail(null), 1500);
                      })
                    }
                  >
                    {copiedEmail === m.email ? "Copied ✓" : "Copy"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
