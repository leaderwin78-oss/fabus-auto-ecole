import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEnrollmentsWithProgress } from "@/lib/data/student";
import { MarketplaceGrid, type MarketplaceCourse } from "./MarketplaceGrid";

export default async function StudentCoursesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [enrollments, { data: allCourses }, { data: myEnrollments }, { data: schools }] = await Promise.all([
    getEnrollmentsWithProgress(supabase, userId),
    supabase
      .from("courses")
      .select("*, organizations(name)")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("enrollments").select("course_id").eq("student_id", userId),
    supabase.from("organizations").select("id, name").eq("status", "active").order("name"),
  ]);

  const enrolledCourseIds = new Set((myEnrollments ?? []).map((e) => e.course_id));
  const marketplaceCourses: MarketplaceCourse[] = (allCourses ?? [])
    .filter((c) => !enrolledCourseIds.has(c.id))
    .map((c) => {
      const org = Array.isArray(c.organizations) ? c.organizations[0] : c.organizations;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        price_fcfa: c.price_fcfa,
        organization_id: c.organization_id,
        organization_name: org?.name ?? "Auto-école",
      };
    });
  const categories = Array.from(new Set(marketplaceCourses.map((c) => c.category)));

  return (
    <>
      <h3 className="mb-4">Mes formations</h3>
      {enrollments.length === 0 ? (
        <div className="card empty-state mb-8">
          <p className="mb-0">Vous n&apos;êtes inscrit à aucune formation. Explorez le catalogue ci-dessous.</p>
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

      <h3 className="mb-4">Catalogue de formations</h3>
      <MarketplaceGrid
        courses={marketplaceCourses}
        ownOrganizationId={profile.organization_id}
        categories={categories}
        schools={schools ?? []}
      />
    </>
  );
}
