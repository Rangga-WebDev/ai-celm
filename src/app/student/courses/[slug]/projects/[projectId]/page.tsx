/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentProjectDetailClient from "@/components/student/student-project-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    projectId: string;
  }>;
};

export default async function StudentProjectDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, projectId } = await params;

  return (
    <StudentProjectDetailClient
      user={user}
      courseSlug={slug}
      projectId={projectId}
    />
  );
}
