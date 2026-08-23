"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAnnouncementStatus } from "@/lib/actions/announcements";

export function AnnouncementStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateAnnouncementStatus(id, e.target.value as "draft" | "published" | "archived");
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
    >
      <option value="draft">Brouillon</option>
      <option value="published">Publiée</option>
      <option value="archived">Archivée</option>
    </select>
  );
}
