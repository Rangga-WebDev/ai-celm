/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentQuizAttemptClient from "@/components/student/student-quiz-attempt-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    quizId: string;
  }>;
};

export default async function StudentQuizAttemptPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, quizId } = await params;

  return (
    <StudentQuizAttemptClient user={user} courseSlug={slug} quizId={quizId} />
  );
}
