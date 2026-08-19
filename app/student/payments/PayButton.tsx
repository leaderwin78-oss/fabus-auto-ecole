"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initiatePayment } from "@/lib/actions/payments";
import type { ProviderId } from "@/lib/payments/provider";

export function PayButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pay(provider: ProviderId) {
    startTransition(async () => {
      const result = await initiatePayment(paymentId, provider);
      setMessage(result.message ?? result.error ?? null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => pay("wave")}>Wave</button>
        <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => pay("orange_money")}>Orange Money</button>
      </div>
      {message && <p className="text-sm text-muted-color mt-2" style={{ maxWidth: 260 }}>{message}</p>}
    </div>
  );
}
