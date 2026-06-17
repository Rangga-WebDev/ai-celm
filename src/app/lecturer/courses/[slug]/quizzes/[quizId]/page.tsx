/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerQuizBuilderClient from "@/components/lecturer/lecturer-quiz-builder-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    quizId: string;
  }>;
};

export default async function LecturerQuizBuilderPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, quizId } = await params;

  return (
    <LecturerQuizBuilderClient user={user} courseSlug={slug} quizId={quizId} />
  );
}
