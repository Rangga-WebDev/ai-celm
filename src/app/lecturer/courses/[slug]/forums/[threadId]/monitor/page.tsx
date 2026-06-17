/** @format */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LecturerForumMonitorClient from "@/components/lecturer/lecturer-forum-monitor-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    threadId: string;
  }>;
};

export default async function LecturerForumMonitorPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "LECTURER") {
    redirect("/login");
  }

  const { slug, threadId } = await params;

  return (
    <LecturerForumMonitorClient
      user={user}
      courseSlug={slug}
      threadId={threadId}
    />
  );
}
