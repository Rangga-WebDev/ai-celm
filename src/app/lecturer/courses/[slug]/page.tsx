/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LecturerCourseDetailClient from "@/components/lecturer/lecturer-course-detail-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug } = await params;

  return <LecturerCourseDetailClient user={user} slug={slug} />;
}
