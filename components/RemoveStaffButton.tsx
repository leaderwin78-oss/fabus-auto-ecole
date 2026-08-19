"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeStaffMember } from "@/lib/actions/people";

export function RemoveStaffButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-danger btn-sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Supprimer ce compte ? Cette action est irréversible.")) return;
        startTransition(async () => {
          await removeStaffMember(userId);
          router.refresh();
        });
      }}
    >
      {isPending ? "..." : "Supprimer"}
    </button>
  );
}
