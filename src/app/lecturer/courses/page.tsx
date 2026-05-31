/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LecturerCoursesClient from "@/components/lecturer/lecturer-courses-client";

export default async function LecturerCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  return <LecturerCoursesClient user={user} />;
}
