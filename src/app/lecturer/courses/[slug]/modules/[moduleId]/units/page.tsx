/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerUnitsClient from "@/components/lecturer/lecturer-units-client";

type PageProps = {
  params: Promise<{
    slug: string;
    moduleId: string;
  }>;
};

export default async function LecturerModuleUnitsPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, moduleId } = await params;

  return (
    <LecturerUnitsClient user={user} courseSlug={slug} moduleId={moduleId} />
  );
}
