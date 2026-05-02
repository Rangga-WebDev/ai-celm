/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LecturerModuleManagerClient from "@/components/lecturer/lecturer-module-manager-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LecturerCourseModulesPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug } = await params;

  const course = await prisma.course.findFirst({
    where: {
      slug,
      lecturerId: user.id,
    },
    include: {
      modules: {
        orderBy: {
          order: "asc",
        },
        include: {
          _count: {
            select: {
              units: true,
              resources: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    redirect("/lecturer/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <LecturerModuleManagerClient
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            code: course.code,
          }}
          modules={course.modules}
        />
      </div>
    </main>
  );
}