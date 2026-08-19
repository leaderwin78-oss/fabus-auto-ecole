import type { SupabaseClient } from "@supabase/supabase-js";

export interface EnrollmentProgress {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  category: string;
  totalLessons: number;
  completedLessons: number;
  percent: number;
}

export interface NextAppointment {
  id: string;
  title: string;
  type: string;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  location: string | null;
  instructor_name: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getNextAppointment(supabase: SupabaseClient<any>, studentId: string): Promise<NextAppointment | null> {
  const { data } = await supabase
    .from("appointments")
    .select("id, title, type, start_time, end_time, meeting_url, location, instructor:instructor_id(full_name)")
    .eq("student_id", studentId)
    .in("status", ["scheduled", "confirmed"])
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const instructor = Array.isArray(data.instructor) ? data.instructor[0] : data.instructor;
  return {
    id: data.id,
    title: data.title,
    type: data.type,
    start_time: data.start_time,
    end_time: data.end_time,
    meeting_url: data.meeting_url,
    location: data.location,
    instructor_name: instructor?.full_name ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEnrollmentsWithProgress(supabase: SupabaseClient<any>, studentId: string): Promise<EnrollmentProgress[]> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, course_id, status, courses(title, category)")
    .eq("student_id", studentId)
    .eq("status", "active");

  if (!enrollments || enrollments.length === 0) return [];

  const results: EnrollmentProgress[] = [];
  for (const enrollment of enrollments) {
    const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
    const { data: chapters } = await supabase.from("chapters").select("id").eq("course_id", enrollment.course_id);
    const chapterIds = (chapters ?? []).map((c: { id: string }) => c.id);

    let totalLessons = 0;
    let completedLessons = 0;

    if (chapterIds.length > 0) {
      const { data: lessons } = await supabase.from("lessons").select("id").in("chapter_id", chapterIds);
      const lessonIds = (lessons ?? []).map((l: { id: string }) => l.id);
      totalLessons = lessonIds.length;

      if (lessonIds.length > 0) {
        const { count } = await supabase
          .from("lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .in("lesson_id", lessonIds)
          .not("completed_at", "is", null);
        completedLessons = count ?? 0;
      }
    }

    results.push({
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      courseTitle: course?.title ?? "Formation",
      category: course?.category ?? "code",
      totalLessons,
      completedLessons,
      percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    });
  }

  return results;
}
