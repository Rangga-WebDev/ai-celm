/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ValidatorShell from "@/components/validator/validator-shell";

export default async function ValidatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "VALIDATOR") redirect("/login");

  return <ValidatorShell user={user}>{children}</ValidatorShell>;
}
