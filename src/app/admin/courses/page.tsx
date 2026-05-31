/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AdminCoursesClient from "@/components/admin/admin-courses-client";

export default async function AdminCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminCoursesClient currentUser={user} />;
}
