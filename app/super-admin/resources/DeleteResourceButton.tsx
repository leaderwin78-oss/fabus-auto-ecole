"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteResourceLink } from "@/lib/actions/resources";

export function DeleteResourceButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="btn btn-danger btn-sm"
      disabled={isPending}
      onClick={() => startTransition(async () => { await deleteResourceLink(id); router.refresh(); })}
    >
      Supprimer
    </button>
  );
}
