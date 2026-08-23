"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformSettings } from "@/lib/actions/platform";

interface Settings {
  course_platform_commission_percent: number;
  registration_platform_fee_percent: number;
  extra_service_commission_percent: number;
  trial_days: number;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Paramètres mis à jour.</div>}
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await updatePlatformSettings(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Commission sur les cours vendus (%)</label>
          <input name="course_platform_commission_percent" type="number" step="0.1" min={0} max={100} defaultValue={settings.course_platform_commission_percent} />
        </div>
        <div className="field">
          <label>Frais de gestion sur inscriptions directes (%)</label>
          <input name="registration_platform_fee_percent" type="number" step="0.1" min={0} max={100} defaultValue={settings.registration_platform_fee_percent} />
        </div>
        <div className="field">
          <label>Commission sur prestations moniteur (%)</label>
          <input name="extra_service_commission_percent" type="number" step="0.1" min={0} max={100} defaultValue={settings.extra_service_commission_percent} />
        </div>
        <div className="field">
          <label>Durée de l&apos;essai gratuit (jours)</label>
          <input name="trial_days" type="number" min={0} defaultValue={settings.trial_days} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Enregistrer"}</button>
      </form>
    </div>
  );
}
