/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentAssignmentDetailClient from "@/components/student/student-assignment-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    assignmentId: string;
  }>;
};

export default async function StudentAssignmentDetailPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, assignmentId } = await params;

  return (
    <StudentAssignmentDetailClient
      user={user}
      courseSlug={slug}
      assignmentId={assignmentId}
    />
  );
}
