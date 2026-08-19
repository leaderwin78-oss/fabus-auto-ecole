import { QuizRunner } from "./QuizRunner";

export default async function StudentQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return <QuizRunner quizId={quizId} />;
}
