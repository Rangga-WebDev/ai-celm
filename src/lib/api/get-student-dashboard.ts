/** @format */

export type StudentDashboardResponse = {
  success: boolean;
  message: string;
  data: {
    student: {
      id: string;
      name: string;
      email: string;
    };
    summary: {
      totalCourses: number;
      completedCourses: number;
      activeCourses: number;
    };
    courses: Array<{
      enrollmentId: string;
      enrolledAt: string;
      course: {
        id: string;
        title: string;
        slug: string;
        code: string | null;
        description: string | null;
        coverImage: string | null;
        lecturer: {
          id: string;
          name: string;
          email: string;
        } | null;
        summary: {
          totalModules: number;
          completedModules: number;
          inProgressModules: number;
          overallProgress: number;
        };
        nextModule: {
          id: string;
          title: string;
          slug: string;
          order: number;
        } | null;
      };
    }>;
  };
};

export async function getStudentDashboard(userId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/students/${userId}/dashboard`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch student dashboard");
  }

  return (await res.json()) as StudentDashboardResponse;
}
