import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEnrollmentsWithProgress } from "@/lib/data/student";
import { EnrollButton } from "./EnrollButton";

export default async function StudentCoursesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [enrollments, { data: allCourses }, { data: myEnrollments }] = await Promise.all([
    getEnrollmentsWithProgress(supabase, userId),
    supabase
      .from("courses")
      .select("*")
      .eq("organization_id", profile.organization_id ?? "")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("enrollments").select("course_id").eq("student_id", userId),
  ]);

  const enrolledCourseIds = new Set((myEnrollments ?? []).map((e) => e.course_id));
  const availableCourses = (allCourses ?? []).filter((c) => !enrolledCourseIds.has(c.id));

  return (
    <>
      <h3 className="mb-4">Mes formations</h3>
      {enrollments.length === 0 ? (
        <div className="card empty-state mb-8">
          <p className="mb-0">Vous n&apos;êtes inscrit à aucune formation. Choisissez-en une ci-dessous.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 mb-8">
          {enrollments.map((e) => (
            <a key={e.enrollmentId} href={`/student/courses/${e.courseId}`} className="card">
              <span className="badge mb-2">{e.category}</span>
              <h4 className="mb-2">{e.courseTitle}</h4>
              <div className="progress-container mb-2">
                <div className="progress-bar" style={{ width: `${e.percent}%` }}></div>
              </div>
              <p className="text-sm text-muted-color mb-0">{e.percent}% terminé</p>
            </a>
          ))}
        </div>
      )}

      <h3 className="mb-4">Formations disponibles</h3>
      {availableCourses.length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune nouvelle formation disponible pour l&apos;instant.</p></div>
      ) : (
        <div className="grid grid-cols-3">
          {availableCourses.map((c) => (
            <div key={c.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
              <span className="badge mb-2">{c.category}</span>
              <h4 className="mb-2">{c.title}</h4>
              <p className="text-muted-color mb-4" style={{ flex: 1 }}>{c.description ?? "Aucune description."}</p>
              <p className="font-bold mb-4">{c.price_fcfa.toLocaleString("fr-FR")} F CFA</p>
              <EnrollButton courseId={c.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
