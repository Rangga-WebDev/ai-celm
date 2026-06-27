/** @format */

"use client";

import { useMemo } from "react";
import {
  BookOpenText,
  ClipboardCheck,
  GraduationCap,
  Library,
  Lightbulb,
  ListChecks,
  Target,
} from "lucide-react";
import {
  normalizeModuleLearningContent,
  type ModuleLearningContent,
} from "@/lib/validators/module-content.schema";
import Markdown from "@/components/ui/markdown";

type Props = {
  learningContent: unknown;
};

function hasContent(content: ModuleLearningContent): boolean {
  const intro = content.introduction;
  const introFilled =
    intro.learningOutcomes.length > 0 ||
    intro.description.trim().length > 0 ||
    intro.prerequisites.trim().length > 0 ||
    intro.usageGuide.trim().length > 0;

  const activitiesFilled = content.activities.some(
    (a) => a.title.trim().length > 0 || a.content.trim().length > 0,
  );

  const assessment = content.assessment;
  const assessmentFilled =
    assessment.assignment.trim().length > 0 ||
    assessment.rubric.trim().length > 0 ||
    assessment.formativeQuestions.length > 0 ||
    assessment.masteryRule.trim().length > 0;

  const support = content.support;
  const supportFilled =
    support.glossary.length > 0 ||
    support.references.length > 0 ||
    support.furtherReading.length > 0;

  return introFilled || activitiesFilled || assessmentFilled || supportFilled;
}

export default function ModuleLearningContentView({ learningContent }: Props) {
  const content = useMemo(
    () => normalizeModuleLearningContent(learningContent),
    [learningContent],
  );

  if (!hasContent(content)) {
    return null;
  }

  const { introduction, activities, assessment, support } = content;

  return (
    <section className="space-y-4">
      {/* I. Pendahuluan */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap size={20} className="text-teal-600" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">Pendahuluan</h2>
        </div>

        <div className="grid gap-4">
          {introduction.learningOutcomes.length > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 text-base font-semibold text-slate-800">
                <Target size={16} className="text-teal-600" aria-hidden />
                Capaian Pembelajaran
              </div>
              <ul className="mt-2 grid gap-1.5">
                {introduction.learningOutcomes.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-base leading-7 text-slate-700"
                  >
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    <span className="wrap-break-word">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {introduction.description.trim() ? (
            <Block label="Deskripsi Singkat" text={introduction.description} />
          ) : null}
          {introduction.prerequisites.trim() ? (
            <Block label="Prasyarat" text={introduction.prerequisites} />
          ) : null}
          {introduction.usageGuide.trim() ? (
            <Block
              label="Petunjuk Penggunaan Modul"
              text={introduction.usageGuide}
            />
          ) : null}
        </div>
      </div>

      {/* II. Kegiatan Belajar */}
      {activities.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText size={20} className="text-teal-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">
              Kegiatan Belajar
            </h2>
          </div>

          <div className="space-y-5">
            {activities.map((activity, index) => (
              <article
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="wrap-break-word text-lg font-bold text-slate-900">
                  {activity.title || `Kegiatan Belajar ${index + 1}`}
                </h3>

                {activity.content.trim() ? (
                  <Markdown className="mt-3 text-base leading-8">
                    {activity.content}
                  </Markdown>
                ) : null}

                {activity.caseStudy.trim() ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-base font-semibold text-amber-800">
                      Studi Kasus
                    </div>
                    <Markdown className="mt-1 text-base leading-7 text-amber-900">
                      {activity.caseStudy}
                    </Markdown>
                  </div>
                ) : null}

                {activity.reflectionPrompts.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                    <div className="flex items-center gap-1.5 text-base font-semibold text-teal-800">
                      <Lightbulb size={16} aria-hidden />
                      Pertanyaan Refleksi
                    </div>
                    <ul className="mt-2 grid gap-1.5">
                      {activity.reflectionPrompts.map((prompt, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-base leading-7 text-teal-900"
                        >
                          <span className="font-semibold">{i + 1}.</span>
                          <span className="wrap-break-word">{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {activity.summary.trim() ? (
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <div className="text-base font-semibold text-slate-800">
                      Rangkuman
                    </div>
                    <Markdown className="mt-1 text-base leading-7">
                      {activity.summary}
                    </Markdown>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {/* III. Evaluasi & Tindak Lanjut */}
      {assessment.assignment.trim() ||
      assessment.rubric.trim() ||
      assessment.formativeQuestions.length > 0 ||
      assessment.masteryRule.trim() ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-teal-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">
              Evaluasi &amp; Tindak Lanjut
            </h2>
          </div>

          <div className="grid gap-4">
            {assessment.assignment.trim() ? (
              <Block label="Tugas Mandiri" text={assessment.assignment} />
            ) : null}
            {assessment.rubric.trim() ? (
              <Block label="Rubrik Penilaian" text={assessment.rubric} />
            ) : null}

            {assessment.formativeQuestions.length > 0 ? (
              <div>
                <div className="flex items-center gap-1.5 text-base font-semibold text-slate-800">
                  <ListChecks size={16} className="text-teal-600" aria-hidden />
                  Tes Formatif
                </div>
                <ol className="mt-2 grid gap-3">
                  {assessment.formativeQuestions.map((item, index) => (
                    <li
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="wrap-break-word text-base font-medium text-slate-900">
                        {index + 1}. {item.question}
                      </p>
                      {item.answer.trim() ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-semibold text-teal-700">
                            Lihat kunci jawaban
                          </summary>
                          <Markdown className="mt-1 text-base leading-7">
                            {item.answer}
                          </Markdown>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {assessment.masteryRule.trim() ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-base font-semibold text-emerald-800">
                  Aturan Ketuntasan
                </div>
                <Markdown className="mt-1 text-base leading-7 text-emerald-900">
                  {assessment.masteryRule}
                </Markdown>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* IV. Pendukung */}
      {support.glossary.length > 0 ||
      support.references.length > 0 ||
      support.furtherReading.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Library size={20} className="text-teal-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">Pendukung</h2>
          </div>

          <div className="grid gap-4">
            {support.glossary.length > 0 ? (
              <div>
                <div className="text-base font-semibold text-slate-800">
                  Glosarium
                </div>
                <dl className="mt-2 grid gap-2">
                  {support.glossary.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <dt className="wrap-break-word text-base font-semibold text-slate-900">
                        {item.term}
                      </dt>
                      <dd className="mt-0.5 wrap-break-word text-base leading-7 text-slate-700">
                        {item.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {support.references.length > 0 ? (
              <div>
                <div className="text-base font-semibold text-slate-800">
                  Daftar Pustaka
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {support.references.map((item, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-base leading-7 text-slate-700"
                    >
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span className="wrap-break-word">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {support.furtherReading.length > 0 ? (
              <div>
                <div className="text-base font-semibold text-slate-800">
                  Link Pengayaan
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {support.furtherReading.map((item, index) => (
                    <li key={index} className="text-base leading-7">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wrap-break-word font-medium text-teal-700 underline transition hover:text-teal-800"
                        >
                          {item.label || item.url}
                        </a>
                      ) : (
                        <span className="wrap-break-word text-slate-700">
                          {item.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-base font-semibold text-slate-800">{label}</div>
      <Markdown className="mt-1 text-base leading-7">{text}</Markdown>
    </div>
  );
}
