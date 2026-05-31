/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AdminUsersClient from "@/components/admin/admin-users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminUsersClient currentUser={user} />;
}
