/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import AdminAiUsageClient from "@/components/admin/admin-ai-usage-client";

export const dynamic = "force-dynamic";

export default async function AdminAiUsagePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminAiUsageClient />;
}
