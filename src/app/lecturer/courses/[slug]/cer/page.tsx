/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerCerClient from "@/components/lecturer/lecturer-cer-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseCerPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug } = await params;

  return <LecturerCerClient user={user} courseSlug={slug} />;
}
