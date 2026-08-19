import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LessonRow } from "./LessonRow";

const CONTENT_ICON: Record<string, string> = {
  text: "fa-solid fa-file-lines",
  video: "fa-solid fa-video",
  pdf: "fa-solid fa-file-pdf",
  audio: "fa-solid fa-headphones",
  quiz: "fa-solid fa-circle-question",
  exercise: "fa-solid fa-pen",
  link: "fa-solid fa-link",
};

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (!course) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const allLessonIds = (chapters ?? []).flatMap((ch) => (ch.lessons ?? []).map((l: { id: string }) => l.id));
  const { data: progress } = allLessonIds.length
    ? await supabase.from("lesson_progress").select("lesson_id").eq("student_id", userId).in("lesson_id", allLessonIds).not("completed_at", "is", null)
    : { data: [] };
  const completedSet = new Set((progress ?? []).map((p) => p.lesson_id));

  return (
    <>
      <Link href="/student/courses" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour aux formations
      </Link>
      <h2 className="mb-2">{course.title}</h2>
      <p className="text-muted-color mb-8">{course.description}</p>

      {(chapters ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Cette formation ne contient pas encore de chapitres.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {(chapters ?? []).map((chapter) => (
            <div key={chapter.id} className="card">
              <h4 className="mb-4">{chapter.title}</h4>
              {(chapter.lessons ?? []).length === 0 ? (
                <p className="text-sm text-muted-color mb-0">Aucune leçon pour l&apos;instant.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(chapter.lessons ?? [])
                    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
                    .map((lesson: { id: string; title: string; content_type: string; content_body: string | null; content_url: string | null }) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        icon={CONTENT_ICON[lesson.content_type] ?? "fa-solid fa-file"}
                        completed={completedSet.has(lesson.id)}
                      />
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
