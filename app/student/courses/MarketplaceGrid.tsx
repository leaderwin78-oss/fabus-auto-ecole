"use client";

import { useMemo, useState } from "react";
import { EnrollButton } from "./EnrollButton";

export interface MarketplaceCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_fcfa: number;
  organization_id: string;
  organization_name: string;
}

export function MarketplaceGrid({
  courses,
  ownOrganizationId,
  categories,
  schools,
}: {
  courses: MarketplaceCourse[];
  ownOrganizationId: string | null;
  categories: string[];
  schools: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [school, setSchool] = useState("");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && c.category !== category) return false;
      if (school && c.organization_id !== school) return false;
      if (priceFilter === "free" && c.price_fcfa > 0) return false;
      if (priceFilter === "paid" && c.price_fcfa === 0) return false;
      return true;
    });
  }, [courses, search, category, school, priceFilter]);

  return (
    <>
      <div className="card card-flat mb-6 flex gap-2" style={{ flexWrap: "wrap" }}>
        <input
          placeholder="Rechercher une formation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={school} onChange={(e) => setSchool(e.target.value)} style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <option value="">Toutes auto-écoles</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as "all" | "free" | "paid")} style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          <option value="all">Gratuit et payant</option>
          <option value="free">Gratuit</option>
          <option value="paid">Payant</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune formation ne correspond à votre recherche.</p></div>
      ) : (
        <div className="grid grid-cols-3">
          {filtered.map((c) => {
            const isOwnSchool = c.organization_id === ownOrganizationId;
            return (
              <div key={c.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
                <span className="badge mb-2">{c.category}</span>
                <h4 className="mb-1">{c.title}</h4>
                <p className="text-sm text-muted-color mb-2"><i className="fa-solid fa-graduation-cap"></i> {c.organization_name}</p>
                <p className="text-muted-color mb-4" style={{ flex: 1 }}>{c.description ?? "Aucune description."}</p>
                <p className="font-bold mb-4">{c.price_fcfa > 0 ? `${c.price_fcfa.toLocaleString("fr-FR")} F CFA` : "Gratuit"}</p>
                {isOwnSchool ? (
                  <EnrollButton courseId={c.id} />
                ) : (
                  <p className="text-sm text-muted-color mb-0">
                    Formation d&apos;une autre auto-école — contactez <strong>{c.organization_name}</strong> pour vous y inscrire.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
