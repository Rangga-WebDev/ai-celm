/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import StudentLearningClient from "@/components/student/student-learning-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentCourseLearningPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/login");

  const { slug } = await params;

  return <StudentLearningClient user={user} courseSlug={slug} />;
}
