/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentDashboardClient from "@/components/student/student-dashboard-client";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  return <StudentDashboardClient user={user} />;
}
