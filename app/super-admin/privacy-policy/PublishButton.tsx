"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishPrivacyPolicy } from "@/lib/actions/privacy";

export function PublishButton({ policyId }: { policyId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-secondary btn-sm"
      disabled={isPending}
      onClick={() => startTransition(async () => { await publishPrivacyPolicy(policyId); router.refresh(); })}
    >
      {isPending ? "..." : "Publier"}
    </button>
  );
}
