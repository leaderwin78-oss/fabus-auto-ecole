"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSocialLinks } from "@/lib/actions/account";

const PLATFORMS: { key: string; label: string; icon: string }[] = [
  { key: "facebook", label: "Facebook", icon: "fa-brands fa-facebook" },
  { key: "instagram", label: "Instagram", icon: "fa-brands fa-instagram" },
  { key: "twitter", label: "X / Twitter", icon: "fa-brands fa-x-twitter" },
  { key: "tiktok", label: "TikTok", icon: "fa-brands fa-tiktok" },
  { key: "youtube", label: "YouTube", icon: "fa-brands fa-youtube" },
  { key: "linkedin", label: "LinkedIn", icon: "fa-brands fa-linkedin" },
];

export function SocialLinksForm({ links, isPublic }: { links: Record<string, string>; isPublic: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Liens mis à jour.</div>}
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await updateSocialLinks(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else { setSuccess(true); router.refresh(); }
          })
        }
      >
        {PLATFORMS.map((p) => (
          <div key={p.key} className="field">
            <label><i className={p.icon}></i> {p.label}</label>
            <input name={p.key} type="url" placeholder="https://..." defaultValue={links[p.key] ?? ""} />
          </div>
        ))}
        <label className="flex items-center gap-2 mb-4" style={{ cursor: "pointer" }}>
          <input type="checkbox" name="social_links_public" defaultChecked={isPublic} />
          <span className="text-sm">Rendre ces liens visibles publiquement sur mon profil</span>
        </label>
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Enregistrer"}</button>
      </form>
    </div>
  );
}
