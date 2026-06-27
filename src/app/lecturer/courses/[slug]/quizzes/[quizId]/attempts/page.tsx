/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerQuizAttemptsClient from "@/components/lecturer/lecturer-quiz-attempts-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    quizId: string;
  }>;
};

export default async function LecturerQuizAttemptsPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, quizId } = await params;

  return (
    <LecturerQuizAttemptsClient user={user} courseSlug={slug} quizId={quizId} />
  );
}
