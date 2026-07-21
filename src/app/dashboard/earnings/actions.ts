"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import {
  getEarningsSummary,
  getPendingPayoutRequest,
  createPayoutRequest,
  setTeacherPayoutMethod,
} from "@/lib/repo";
import { sendCashOutRequestedEmail } from "@/lib/email";
import { PAYOUT_METHODS, type PayoutMethod } from "@/lib/types";

// Postgres unique-violation SQLSTATE, surfaced on Neon's NeonDbError as `code`.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

// "Cash out" always requests the teacher's FULL balance, computed server-side
// at this moment — the client never supplies an amount. The founder pays it
// by hand (Zelle/Venmo/PayPal) and marks it paid from the dashboard overview.
export async function requestCashOutAction(formData: FormData) {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const method = String(formData.get("method") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().slice(0, 120);
  if (!(PAYOUT_METHODS as readonly string[]).includes(method) || !handle) {
    redirect("/dashboard/earnings?error=method");
  }

  // Remember where this teacher gets paid so next cash-out is one click.
  await setTeacherPayoutMethod(teacher.id, method as PayoutMethod, handle);

  const [summary, alreadyPending] = await Promise.all([
    getEarningsSummary(teacher.id),
    getPendingPayoutRequest(teacher.id),
  ]);
  if (alreadyPending) redirect("/dashboard/earnings?requested=1");

  const amountCents = summary.balanceCents;
  if (amountCents <= 0) redirect("/dashboard/earnings?error=empty");

  let request;
  try {
    request = await createPayoutRequest(
      teacher.id,
      amountCents,
      method as PayoutMethod,
      handle,
    );
  } catch (err) {
    // ONLY the unique pending-per-teacher index (Postgres 23505) means a
    // double-submit lost the race — the cash-out is already in, so that's a
    // success from the teacher's seat. Any other error (a transient DB/network
    // blip) must NOT masquerade as success, or the teacher waits for money that
    // was never requested. Surface it so they can retry.
    if (isUniqueViolation(err)) {
      redirect("/dashboard/earnings?requested=1");
    }
    redirect("/dashboard/earnings?error=retry");
  }

  await sendCashOutRequestedEmail({ teacher, request });

  revalidatePath("/dashboard/earnings");
  revalidatePath("/dashboard");
  redirect("/dashboard/earnings?requested=1");
}
