/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerCerSubmissionsClient from "@/components/lecturer/lecturer-cer-submissions-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    assignmentId: string;
  }>;
};

export default async function LecturerCerSubmissionsPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, assignmentId } = await params;

  return (
    <LecturerCerSubmissionsClient
      user={user}
      courseSlug={slug}
      assignmentId={assignmentId}
    />
  );
}
