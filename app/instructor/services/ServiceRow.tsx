"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleInstructorService, deleteInstructorService } from "@/lib/actions/services";

interface Service {
  id: string;
  title: string;
  price_fcfa: number;
  duration_minutes: number | null;
  is_active: boolean;
}

export function ServiceRow({ service }: { service: Service }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card card-flat flex items-center justify-between">
      <div>
        <p className="mb-0" style={{ fontWeight: 600 }}>{service.title}</p>
        <span className="text-sm text-muted-color">
          {service.price_fcfa.toLocaleString("fr-FR")} F{service.duration_minutes ? ` • ${service.duration_minutes} min` : ""}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-secondary btn-sm"
          disabled={isPending}
          onClick={() => startTransition(async () => { await toggleInstructorService(service.id, !service.is_active); router.refresh(); })}
        >
          {service.is_active ? "Désactiver" : "Activer"}
        </button>
        <button
          className="btn btn-danger btn-sm"
          disabled={isPending}
          onClick={() => { if (confirm("Supprimer cette prestation ?")) startTransition(async () => { await deleteInstructorService(service.id); router.refresh(); }); }}
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
