/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerProjectsClient from "@/components/lecturer/lecturer-projects-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseProjectsPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug } = await params;

  return <LecturerProjectsClient user={user} courseSlug={slug} />;
}
