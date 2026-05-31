/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AdminEnrollmentsClient from "@/components/admin/admin-enrollments-client";

export default async function AdminEnrollmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminEnrollmentsClient currentUser={user} />;
}
