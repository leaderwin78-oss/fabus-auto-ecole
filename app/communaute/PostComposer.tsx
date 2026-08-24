"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/community";

const MAX_FICHIERS = 4;

interface Apercu {
  url: string;
  nom: string;
  video: boolean;
}

export function PostComposer() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [apercus, setApercus] = useState<Apercu[]>([]);
  const [isPending, startTransition] = useTransition();

  function surSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = [...(e.target.files ?? [])];
    if (fichiers.length > MAX_FICHIERS) {
      setError(`Maximum ${MAX_FICHIERS} fichiers par publication.`);
      e.target.value = "";
      setApercus([]);
      return;
    }
    setError(null);
    // Les aperçus locaux évitent d'envoyer quoi que ce soit avant de publier :
    // on voit ce qu'on partage, et on peut se raviser.
    apercus.forEach((a) => URL.revokeObjectURL(a.url));
    setApercus(
      fichiers.map((f) => ({ url: URL.createObjectURL(f), nom: f.name, video: f.type.startsWith("video/") }))
    );
  }

  function viderFichiers() {
    apercus.forEach((a) => URL.revokeObjectURL(a.url));
    setApercus([]);
    if (champFichier.current) champFichier.current.value = "";
  }

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createPost(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              viderFichiers();
              router.refresh();
            }
          })
        }
      >
        <textarea
          name="body"
          rows={3}
          placeholder="Partagez votre expérience, une réussite, une question..."
          style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontFamily: "inherit", marginBottom: "0.75rem", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />

        {apercus.length > 0 && (
          <div className="apercus">
            {apercus.map((a) => (
              <figure key={a.url} className="apercu">
                {a.video ? (
                  <video src={a.url} muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), non optimisable par next/image
                  <img src={a.url} alt={a.nom} />
                )}
                <figcaption>{a.video ? "Vidéo" : "Photo"}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <input
          ref={champFichier}
          type="file"
          name="media"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={surSelection}
          style={{ display: "none" }}
          id="media-post"
        />

        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          <label htmlFor="media-post" className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
            <i className="fa-solid fa-image"></i> Photo ou vidéo
          </label>
          {apercus.length > 0 && (
            <button type="button" className="btn btn-text btn-sm" onClick={viderFichiers}>
              Retirer ({apercus.length})
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-shine" disabled={isPending} style={{ marginLeft: "auto" }}>
            {isPending ? "Publication..." : "Publier"}
          </button>
        </div>
        <p className="text-sm text-muted-color mt-2 mb-0">
          Jusqu&apos;à {MAX_FICHIERS} fichiers, 50 Mo chacun. JPEG, PNG, WebP, GIF, MP4, WebM, MOV.
        </p>
      </form>
    </div>
  );
}
