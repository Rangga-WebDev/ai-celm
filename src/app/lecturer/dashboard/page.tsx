/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LecturerDashboardClient from "@/components/lecturer/lecturer-dashboard-client";

export const dynamic = "force-dynamic";

export default async function LecturerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const lecturerCourses = await prisma.course.findMany({
    where: {
      lecturerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          modules: true,
          resources: true,
        },
      },
      modules: {
        orderBy: {
          order: "asc",
        },
        take: 3,
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

  const courses = lecturerCourses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    code: course.code,
    description: course.description,
    isPublished: course.isPublished,
    enrollmentCount: course._count.enrollments,
    moduleCount: course._count.modules,
    resourceCount: course._count.resources,
    modules: course.modules.map((courseModule) => ({
      id: courseModule.id,
      title: courseModule.title,
      slug: courseModule.slug,
      status: courseModule.status,
      order: courseModule.order,
      unitCount: courseModule._count.units,
      resourceCount: courseModule._count.resources,
    })),
  }));

  return <LecturerDashboardClient user={user} courses={courses} />;
}
