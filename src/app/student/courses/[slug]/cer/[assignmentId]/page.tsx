/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentCerDetailClient from "@/components/student/student-cer-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    assignmentId: string;
  }>;
};

export default async function StudentCerDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, assignmentId } = await params;

  return (
    <StudentCerDetailClient
      user={user}
      courseSlug={slug}
      assignmentId={assignmentId}
    />
  );
}
