/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentAssignmentListClient from "@/components/student/student-assignment-list-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentAssignmentListPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug } = await params;

  return <StudentAssignmentListClient user={user} courseSlug={slug} />;
}
