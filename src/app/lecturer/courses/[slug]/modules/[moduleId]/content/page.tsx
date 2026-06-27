/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerModuleContentClient from "@/components/lecturer/lecturer-module-content-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    moduleId: string;
  }>;
};

export default async function LecturerModuleContentPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, moduleId } = await params;

  return (
    <LecturerModuleContentClient
      user={user}
      courseSlug={slug}
      moduleId={moduleId}
    />
  );
}
