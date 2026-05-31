/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminDashboardClient from "@/components/admin/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminDashboardClient user={user} />;
}
