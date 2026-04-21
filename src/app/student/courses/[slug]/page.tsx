/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentCourseDetailClient from "@/components/student/student-course-detail-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentCourseDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug } = await params;

  return <StudentCourseDetailClient user={user} slug={slug} />;
}
