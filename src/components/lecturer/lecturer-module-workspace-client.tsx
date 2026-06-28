/** @format */

"use client";

import { useState } from "react";
import { ClipboardList, FileText, HelpCircle } from "lucide-react";
import LecturerModuleContentClient from "@/components/lecturer/lecturer-module-content-client";
import LecturerQuizzesClient from "@/components/lecturer/lecturer-quizzes-client";
import LecturerAssignmentsClient from "@/components/lecturer/lecturer-assignments-client";

type LecturerModuleWorkspaceClientProps = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  courseSlug: string;
  moduleId: string;
};

type TabKey = "materi" | "quiz" | "tugas";

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "materi", label: "Materi", icon: FileText },
  { key: "quiz", label: "Quiz", icon: HelpCircle },
  { key: "tugas", label: "Tugas", icon: ClipboardList },
];

export default function LecturerModuleWorkspaceClient({
  user,
  courseSlug,
  moduleId,
}: LecturerModuleWorkspaceClientProps) {
  const [tab, setTab] = useState<TabKey>("materi");

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-2">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold transition ${
                  active
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "materi" ? (
        <LecturerModuleContentClient
          user={user}
          courseSlug={courseSlug}
          moduleId={moduleId}
        />
      ) : null}

      {tab === "quiz" ? (
        <LecturerQuizzesClient
          user={user}
          courseSlug={courseSlug}
          scopedModuleId={moduleId}
          embedded
        />
      ) : null}

      {tab === "tugas" ? (
        <LecturerAssignmentsClient
          user={user}
          courseSlug={courseSlug}
          scopedModuleId={moduleId}
          embedded
          variant="task"
        />
      ) : null}
    </div>
  );
}
