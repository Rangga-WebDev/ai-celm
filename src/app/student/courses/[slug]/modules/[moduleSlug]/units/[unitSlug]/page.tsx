/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentUnitDetailClient from "@/components/student/student-unit-detail-client";

type PageProps = {
  params: Promise<{
    slug: string;
    moduleSlug: string;
    unitSlug: string;
  }>;
};

export default async function StudentUnitDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, moduleSlug, unitSlug } = await params;

  return (
    <StudentUnitDetailClient
      user={user}
      courseSlug={slug}
      moduleSlug={moduleSlug}
      unitSlug={unitSlug}
    />
  );
}
