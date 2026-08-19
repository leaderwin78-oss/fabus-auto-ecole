"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDocumentStatus } from "@/lib/actions/documents";
import type { DocumentRow as DocumentRowType } from "@/types/database";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-muted",
  submitted: "badge-info",
  validated: "",
  rejected: "badge-danger",
};

export function DocumentReviewRow({ document }: { document: DocumentRowType }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(status: "validated" | "rejected") {
    startTransition(async () => {
      await updateDocumentStatus(document.id, status);
      router.refresh();
    });
  }

  return (
    <div className="card card-flat flex items-center justify-between">
      <div>
        <p className="mb-0" style={{ fontWeight: 600 }}>{document.title}</p>
        <span className="text-sm text-muted-color">{document.category}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${STATUS_BADGE[document.status]}`}>{document.status}</span>
        {document.status === "submitted" && (
          <>
            <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => setStatus("validated")}>Valider</button>
            <button className="btn btn-danger btn-sm" disabled={isPending} onClick={() => setStatus("rejected")}>Rejeter</button>
          </>
        )}
      </div>
    </div>
  );
}
