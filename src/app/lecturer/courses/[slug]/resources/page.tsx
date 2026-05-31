/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerResourcesClient from "@/components/lecturer/lecturer-resources-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseResourcesPage({
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

  return <LecturerResourcesClient user={user} courseSlug={slug} />;
}
