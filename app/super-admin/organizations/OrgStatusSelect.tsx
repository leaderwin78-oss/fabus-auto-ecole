"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationStatus, type OrgStatus } from "@/lib/actions/organizations";

export function OrgStatusSelect({ orgId, status }: { orgId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateOrganizationStatus(orgId, e.target.value as OrgStatus);
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
    >
      <option value="pending">En attente</option>
      <option value="active">Approuvée</option>
      <option value="suspended">Suspendue</option>
      <option value="rejected">Rejetée</option>
      <option value="archived">Archivée</option>
    </select>
  );
}
