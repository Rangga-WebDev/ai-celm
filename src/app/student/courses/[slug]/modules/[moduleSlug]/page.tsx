/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentModuleDetailClient from "@/components/student/student-module-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    moduleSlug: string;
  }>;
};

export default async function StudentModuleDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, moduleSlug } = await params;

  return (
    <StudentModuleDetailClient
      user={user}
      courseSlug={slug}
      moduleSlug={moduleSlug}
    />
  );
}
