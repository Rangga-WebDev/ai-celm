/** @format */

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentForumThreadClient from "@/components/student/student-forum-thread-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    threadId: string;
  }>;
};

export default async function StudentForumThreadPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/login");
  }

  const { slug, threadId } = await params;

  return (
    <StudentForumThreadClient
      user={user}
      courseSlug={slug}
      threadId={threadId}
    />
  );
}
