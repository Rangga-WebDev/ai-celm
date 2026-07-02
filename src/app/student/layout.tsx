/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import StudentShell from "@/components/student/student-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const profileComplete = Boolean(user.nim?.trim() && user.kelas?.trim());

  return (
    <StudentShell user={user} profileComplete={profileComplete}>
      {children}
    </StudentShell>
  );
}
