import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateChapterForm } from "./CreateChapterForm";
import { CreateLessonForm } from "./CreateLessonForm";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("organization_id", profile.organization_id ?? "")
    .single();
  if (!course) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  return (
    <>
      <Link href="/admin/courses" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour aux formations
      </Link>
      <h2 className="mb-8">{course.title}</h2>

      {(chapters ?? []).map((chapter) => (
        <div key={chapter.id} className="card mb-4">
          <h4 className="mb-4">{chapter.title}</h4>
          {(chapter.lessons ?? []).length > 0 && (
            <ul className="mb-4" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {(chapter.lessons ?? [])
                .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
                .map((l: { id: string; title: string; content_type: string }) => (
                  <li key={l.id} className="text-sm">
                    <span className="badge badge-muted" style={{ marginRight: 8 }}>{l.content_type}</span>
                    {l.title}
                  </li>
                ))}
            </ul>
          )}
          <CreateLessonForm chapterId={chapter.id} courseId={courseId} />
        </div>
      ))}

      <CreateChapterForm courseId={courseId} />
    </>
  );
}
