"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationStatus } from "@/lib/actions/organizations";

export function OrgStatusSelect({ orgId, status }: { orgId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateOrganizationStatus(orgId, e.target.value as "active" | "suspended" | "archived");
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
    >
      <option value="active">Active</option>
      <option value="suspended">Suspendue</option>
      <option value="archived">Archivée</option>
    </select>
  );
}
