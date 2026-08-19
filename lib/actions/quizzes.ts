"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

async function requireStaff() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false as const, error: "Action réservée aux administrateurs." };
  }
  return { ok: true as const, userId, profile };
}

export async function createQuiz(formData: FormData): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;
  if (!check.profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const title = String(formData.get("title") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "") || null;
  const kind = String(formData.get("kind") ?? "quiz");
  const passScore = Number(formData.get("pass_score_percent") ?? 80);

  if (!title) return { ok: false, error: "Le titre est requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").insert({
    organization_id: check.profile.organization_id,
    course_id: courseId,
    kind,
    title,
    pass_score_percent: Number.isFinite(passScore) ? passScore : 80,
    status: "draft",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/quizzes");
  return { ok: true };
}

export async function updateQuizStatus(quizId: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").update({ status }).eq("id", quizId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath("/student/quizzes");
  return { ok: true };
}

// A question plus its answer options are created together: exactly one
// answer must be marked correct, decided by the "correct_index" field.
export async function addQuizQuestion(formData: FormData): Promise<ActionResult> {
  const check = await requireStaff();
  if (!check.ok) return check;

  const quizId = String(formData.get("quiz_id") ?? "");
  const questionText = String(formData.get("question_text") ?? "").trim();
  const correctIndex = Number(formData.get("correct_index") ?? -1);
  const options = formData.getAll("options").map((v) => String(v).trim()).filter(Boolean);

  if (!quizId || !questionText) return { ok: false, error: "Question requise." };
  if (options.length < 2) return { ok: false, error: "Au moins 2 réponses requises." };
  if (correctIndex < 0 || correctIndex >= options.length) return { ok: false, error: "Choisissez la bonne réponse." };

  const supabase = await createClient();
  const { count } = await supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);

  const { data: question, error: questionError } = await supabase
    .from("quiz_questions")
    .insert({ quiz_id: quizId, question_text: questionText, position: count ?? 0 })
    .select()
    .single();

  if (questionError || !question) return { ok: false, error: questionError?.message ?? "Erreur." };

  const { error: answersError } = await supabase.from("quiz_answers").insert(
    options.map((text, i) => ({
      question_id: question.id,
      answer_text: text,
      is_correct: i === correctIndex,
      position: i,
    }))
  );

  if (answersError) return { ok: false, error: answersError.message };
  revalidatePath(`/admin/quizzes/${quizId}`);
  return { ok: true };
}

export interface QuizForTaking {
  id: string;
  title: string;
  kind: string;
  pass_score_percent: number;
  questions: {
    id: string;
    question_text: string;
    image_url: string | null;
    position: number;
    answers: { id: string; answer_text: string; position: number }[];
  }[];
}

export async function getQuizForTaking(quizId: string): Promise<QuizForTaking | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_quiz_for_taking", { p_quiz_id: quizId });
  if (error) throw new Error(error.message);
  return data as QuizForTaking | null;
}

export interface QuizAttemptResult {
  attempt_id: string;
  score_percent: number;
  correct_count: number;
  total: number;
  passed: boolean;
}

export async function submitQuizAttempt(quizId: string, answers: Record<string, string>): Promise<{ ok: true; result: QuizAttemptResult } | { ok: false; error: string }> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_quiz_id: quizId, p_answers: answers });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/student/quizzes");
  return { ok: true, result: data as QuizAttemptResult };
}
