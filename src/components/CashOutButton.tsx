"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestCashOutAction } from "@/app/dashboard/earnings/actions";
import { formatMoney } from "@/lib/format";
import { PAYOUT_METHODS, payoutMethodLabel, type PayoutMethod } from "@/lib/types";

// The "Cash out $X" moment. The dialog is the ONE place fees get itemized —
// the earnings page itself stays celebratory (founder call: fees are shown at
// the cash-out moment, not on the main view).

const METHOD_HINTS: Record<PayoutMethod, string> = {
  zelle: "The email or US mobile number on your Zelle account",
  venmo: "Your Venmo username, e.g. @maya-chen",
  paypal: "The email on your PayPal account",
};

export function CashOutButton({
  balanceCents,
  collectedCents,
  feeCents,
  paidOutCents,
  savedMethod,
  savedHandle,
}: {
  balanceCents: number;
  collectedCents: number;
  feeCents: number;
  paidOutCents: number;
  savedMethod: string;
  savedHandle: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>(
    (PAYOUT_METHODS as readonly string[]).includes(savedMethod)
      ? (savedMethod as PayoutMethod)
      : "venmo",
  );

  // Honor the dialog's aria-modal: Escape closes it (and lock body scroll while
  // it's open so the page behind doesn't move).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn-primary text-base !px-6 !py-3"
        onClick={() => setOpen(true)}
      >
        💸 Cash out {formatMoney(balanceCents)}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          // Close only when the press BEGAN on the backdrop — otherwise a
          // text-selection drag that starts in the input and releases out here
          // would close the dialog and discard the typed handle.
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cash out"
            className="card w-full max-w-md space-y-5 !p-6 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-semibold">
                Cash out {formatMoney(balanceCents)}
              </h2>
              <p className="text-sm text-muted">
                David sends your money directly — usually within 1–2 business
                days.
              </p>
            </div>

            {/* The full math, shown only here at the cash-out moment. */}
            <div className="rounded-xl bg-background p-4 text-sm space-y-1.5">
              <div className="flex justify-between text-muted">
                <span>Collected from students</span>
                <span>{formatMoney(collectedCents)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Payment processing fees</span>
                <span>− {formatMoney(feeCents)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Already cashed out</span>
                <span>− {formatMoney(paidOutCents)}</span>
              </div>
              <div className="border-t border-border !my-2" />
              <div className="flex justify-between font-semibold">
                <span>Available now</span>
                <span className="text-brand-dark">
                  {formatMoney(balanceCents)}
                </span>
              </div>
            </div>

            <form action={requestCashOutAction} className="space-y-4">
              <div>
                <span className="label">Where should we send it?</span>
                <div className="grid grid-cols-3 gap-2">
                  {PAYOUT_METHODS.map((m) => (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        method === m
                          ? "border-brand bg-brand-tint text-brand-dark"
                          : "border-border text-muted hover:bg-brand-tint"
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={m}
                        checked={method === m}
                        onChange={() => setMethod(m)}
                        className="sr-only"
                      />
                      {payoutMethodLabel(m)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" htmlFor="cashout-handle">
                  Your {payoutMethodLabel(method)}{" "}
                  {method === "venmo" ? "username" : "email or number"}
                </label>
                <input
                  id="cashout-handle"
                  name="handle"
                  required
                  maxLength={120}
                  defaultValue={savedHandle}
                  placeholder={METHOD_HINTS[method]}
                  className="input"
                />
                <p className="hint">
                  Just a handle on an app you already use — we never ask for
                  bank account numbers.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <SubmitButton amount={formatMoney(balanceCents)} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton({ amount }: { amount: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Requesting…" : `Request ${amount} cash-out`}
    </button>
  );
}
