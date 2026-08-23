"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Organization } from "@/types/database";

// The centred pill on the home page, echoing Google's search box: one input,
// one action, nothing else. Picking a school jumps straight into the élève
// wizard with that school pre-selected.
export function SchoolPicker({ schools }: { schools: Organization[] }) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");

  function go() {
    router.push(schoolId ? `/signup/eleve?school=${schoolId}` : "/signup");
  }

  if (schools.length === 0) return null;

  return (
    <div className="hero-search">
      <i className="fa-solid fa-magnifying-glass"></i>
      <select
        aria-label="Choisir une auto-école"
        value={schoolId}
        onChange={(e) => setSchoolId(e.target.value)}
      >
        <option value="">Rechercher une auto-école...</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
            {school.city ? ` — ${school.city}` : ""}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-primary btn-sm" onClick={go}>
        S&apos;inscrire
      </button>
    </div>
  );
}
