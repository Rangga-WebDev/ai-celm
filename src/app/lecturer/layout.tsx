/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerShell from "@/components/lecturer/lecturer-shell";

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "LECTURER") redirect("/login");

  return <LecturerShell user={user}>{children}</LecturerShell>;
}
