"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaymentPaid } from "@/lib/actions/payments";

export function MarkPaidButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-secondary btn-sm"
      disabled={isPending}
      onClick={() => startTransition(async () => { await markPaymentPaid(paymentId); router.refresh(); })}
    >
      {isPending ? "..." : "Marquer payé"}
    </button>
  );
}
