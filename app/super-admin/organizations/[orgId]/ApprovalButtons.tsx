"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationStatus, rejectOrganization } from "@/lib/actions/organizations";

export function ApprovalButtons({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          disabled={isPending}
          onClick={() => startTransition(async () => { await updateOrganizationStatus(orgId, "active"); router.refresh(); })}
        >
          <i className="fa-solid fa-check"></i> Approuver
        </button>
        <button className="btn btn-danger" disabled={isPending} onClick={() => setShowReject((s) => !s)}>
          <i className="fa-solid fa-xmark"></i> Rejeter
        </button>
      </div>
      {showReject && (
        <div className="mt-2 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif du rejet"
            style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
          />
          <button
            className="btn btn-danger btn-sm"
            disabled={isPending}
            onClick={() => startTransition(async () => { await rejectOrganization(orgId, reason); router.refresh(); })}
          >
            Confirmer le rejet
          </button>
        </div>
      )}
    </div>
  );
}
