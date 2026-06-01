/** @format */

import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegacyLecturerCourseForumPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/lecturer/courses/${slug}/forums`);
}
