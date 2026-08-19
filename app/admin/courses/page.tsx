import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateCourseForm } from "./CreateCourseForm";
import { CourseStatusSelect } from "./CourseStatusSelect";

export default async function AdminCoursesPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("organization_id", profile.organization_id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Formations</h3>
        {(courses ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Créez votre première formation.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(courses ?? []).map((c) => (
              <div key={c.id} className="card card-flat flex items-center justify-between">
                <div>
                  <Link href={`/admin/courses/${c.id}`} style={{ fontWeight: 600 }}>{c.title}</Link>
                  <div className="text-sm text-muted-color">{c.category} • {c.price_fcfa.toLocaleString("fr-FR")} F CFA</div>
                </div>
                <CourseStatusSelect courseId={c.id} status={c.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateCourseForm />
    </div>
  );
}
