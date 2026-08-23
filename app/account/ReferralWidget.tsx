"use client";

import { useEffect, useState } from "react";
import { getOrCreateReferralCode } from "@/lib/actions/referrals";

export function ReferralWidget() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOrCreateReferralCode().then((result) => {
      if ("code" in result) {
        setLink(`${window.location.origin}/signup?ref=${result.code}`);
      }
    });
  }, []);

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappUrl = link
    ? `https://wa.me/?text=${encodeURIComponent(`Rejoins-moi sur L'Auto École : ${link}`)}`
    : "#";

  return (
    <div>
      <p className="text-sm text-muted-color mb-4">
        Partagez ce lien : toute personne qui s&apos;inscrit grâce à vous est enregistrée comme filleul.
      </p>
      {link ? (
        <>
          <div className="flex gap-2 mb-4">
            <input readOnly value={link} style={{ flex: 1, padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }} />
            <button className="btn btn-secondary" onClick={copy}>{copied ? "Copié !" : "Copier"}</button>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            <i className="fa-brands fa-whatsapp"></i> Partager sur WhatsApp
          </a>
        </>
      ) : (
        <p className="text-muted-color">Chargement...</p>
      )}
    </div>
  );
}
