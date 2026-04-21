/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LecturerDashboardClient from "@/components/lecturer/lecturer-dashboard-client";

export default async function LecturerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  return <LecturerDashboardClient user={user} />;
}
