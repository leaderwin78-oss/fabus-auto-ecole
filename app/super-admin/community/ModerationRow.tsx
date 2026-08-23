"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hidePost, deletePost, resolveReport } from "@/lib/actions/community";

export function ModerationRow({ postId, reportId, status }: { postId: string; reportId?: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      if (reportId) await resolveReport(reportId);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {status !== "hidden" && (
        <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => run(() => hidePost(postId))}>Masquer</button>
      )}
      <button
        className="btn btn-danger btn-sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("Supprimer définitivement cette publication ?")) run(() => deletePost(postId));
        }}
      >
        Supprimer
      </button>
      {reportId && (
        <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => run(async () => {})}>Ignorer le signalement</button>
      )}
    </div>
  );
}
