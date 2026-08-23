"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireStaff() {
  const { userId, profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "super_admin") {
    return { ok: false as const, error: "Action réservée aux administrateurs." };
  }
  return { ok: true as const, userId, profile };
}

export async function createCourse(formData: FormData): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "code");
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price_fcfa") ?? 0);

  if (!title) return { ok: false, error: "Le titre est requis." };
  if (!check.profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    organization_id: check.profile.organization_id,
    title,
    category,
    description,
    price_fcfa: Number.isFinite(price) ? price : 0,
    status: "draft",
    created_by: check.userId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/courses");
  return { ok: true };
}

export async function updateCourseStatus(courseId: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ status }).eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/courses");
  revalidatePath("/student/courses");
  return { ok: true };
}

export async function createChapter(formData: FormData): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title || !courseId) return { ok: false, error: "Titre et cours requis." };

  const supabase = await createClient();
  const { count } = await supabase.from("chapters").select("id", { count: "exact", head: true }).eq("course_id", courseId);

  const { error } = await supabase.from("chapters").insert({
    course_id: courseId,
    title,
    position: count ?? 0,
    status: "published",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function createLesson(formData: FormData): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const chapterId = String(formData.get("chapter_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "text");
  const contentBody = String(formData.get("content_body") ?? "").trim() || null;
  const contentUrl = String(formData.get("content_url") ?? "").trim() || null;

  if (!title || !chapterId) return { ok: false, error: "Titre et chapitre requis." };

  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("chapter_id", chapterId);

  const { error } = await supabase.from("lessons").insert({
    chapter_id: chapterId,
    title,
    content_type: contentType,
    content_body: contentBody,
    content_url: contentUrl,
    position: count ?? 0,
    status: "published",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function enrollInCourse(courseId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "student") return { ok: false, error: "Réservé aux élèves." };
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("organization_id, price_fcfa").eq("id", courseId).single();
  if (!course) return { ok: false, error: "Formation introuvable." };
  if (course.organization_id !== profile.organization_id) {
    return { ok: false, error: "Cette formation appartient à une autre auto-école — contactez-la pour vous y inscrire." };
  }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({
      organization_id: profile.organization_id,
      student_id: userId,
      course_id: courseId,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Vous êtes déjà inscrit à cette formation." };
    return { ok: false, error: error.message };
  }

  // Paid courses create a pending payment the school settles (commission
  // computed server-side at settlement — see lib/payments/commission.ts).
  if (course.price_fcfa > 0) {
    await supabase.from("payments").insert({
      organization_id: profile.organization_id,
      student_id: userId,
      enrollment_id: enrollment.id,
      course_id: courseId,
      amount_fcfa: course.price_fcfa,
      payment_type: "course",
      provider: "manual",
      status: "pending",
    });
  }

  revalidatePath("/student/courses");
  revalidatePath("/student");
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function markLessonComplete(lessonId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "student") return { ok: false, error: "Réservé aux élèves." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ student_id: userId, lesson_id: lessonId, completed_at: new Date().toISOString() }, { onConflict: "student_id,lesson_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/student");
  revalidatePath("/student/courses");
  return { ok: true };
}
