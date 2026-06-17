/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerProjectSubmissionsClient from "@/components/lecturer/lecturer-project-submissions-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    projectId: string;
  }>;
};

export default async function LecturerProjectSubmissionsPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, projectId } = await params;

  return (
    <LecturerProjectSubmissionsClient
      user={user}
      courseSlug={slug}
      projectId={projectId}
    />
  );
}
