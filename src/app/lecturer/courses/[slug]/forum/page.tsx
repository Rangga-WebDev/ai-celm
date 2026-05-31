/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerForumsClient from "@/components/lecturer/lecturer-forums-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseForumsPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug } = await params;

  return <LecturerForumsClient user={user} courseSlug={slug} />;
}
