/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LecturerResourceManagerClient from "@/components/lecturer/lecturer-resource-manager-client";

type PageProps = {
  params: Promise<{
    slug: string;
    moduleId: string;
  }>;
};

export default async function LecturerModuleResourcesPage({
  params,
}: PageProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "LECTURER") redirect("/login");

  const { slug, moduleId } = await params;

  const courseModule = await prisma.module.findFirst({
    where: {
      id: moduleId,
      course: {
        slug,
        lecturerId: user.id,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      resources: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!courseModule) {
    redirect(`/lecturer/courses/${slug}/modules`);
  }

  const materials = await prisma.courseMaterial.findMany({
    where: {
      courseId: courseModule.course.id,
      status: "READY",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      charCount: true,
    },
  });

  return (
    <main className="space-y-6 p-6">
      <LecturerResourceManagerClient
        userId={user.id}
        courseModule={{
          id: courseModule.id,
          title: courseModule.title,
          courseSlug: courseModule.course.slug,
        }}
        resources={courseModule.resources}
        materials={materials}
      />
    </main>
  );
}
