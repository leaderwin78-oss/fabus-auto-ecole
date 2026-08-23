"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnAvatar } from "@/lib/actions/account";

export function AvatarUpload({ avatarUrl, fullName }: { avatarUrl: string | null; fullName: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={fullName} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div className="avatar" style={{ width: 64, height: 64, fontSize: "1.5rem" }}>{fullName.charAt(0).toUpperCase()}</div>
      )}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await updateOwnAvatar(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <input
          type="file"
          name="file"
          accept="image/*"
          disabled={isPending}
          onChange={(e) => e.target.form?.requestSubmit()}
        />
        {isPending && <p className="text-sm text-muted-color mb-0">Envoi...</p>}
        {error && <p className="field-error mb-0">{error}</p>}
      </form>
    </div>
  );
}
