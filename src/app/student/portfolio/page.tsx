/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import StudentPortfolioClient from "@/components/student/student-portfolio-client";

export const dynamic = "force-dynamic";

export default async function StudentPortfolioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  return <StudentPortfolioClient user={user} />;
}
