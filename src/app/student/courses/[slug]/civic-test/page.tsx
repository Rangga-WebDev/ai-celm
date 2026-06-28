/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentCivicTestClient from "@/components/student/student-civic-test-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentCivicTestPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug } = await params;

  return <StudentCivicTestClient user={user} courseSlug={slug} />;
}
