/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import StudentSettingsClient from "@/components/student/student-settings-client";

export const dynamic = "force-dynamic";

export default async function StudentSettingsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/login");

  return (
    <StudentSettingsClient
      user={{
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nim: user.nim ?? "",
        kelas: user.kelas ?? "",
        hasAvatar: Boolean(user.avatarUrl),
      }}
    />
  );
}
