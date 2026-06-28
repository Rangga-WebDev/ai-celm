/** @format */

import { LetterGrade } from "@/generated/prisma/client";

/**
 * Indonesian higher-education letter grade thresholds (PAP scale).
 * A score equal to or above the threshold earns that letter grade.
 */
const LETTER_THRESHOLDS: ReadonlyArray<{ min: number; grade: LetterGrade }> = [
  { min: 85, grade: LetterGrade.A },
  { min: 80, grade: LetterGrade.AB },
  { min: 75, grade: LetterGrade.B },
  { min: 70, grade: LetterGrade.BC },
  { min: 60, grade: LetterGrade.C },
  { min: 50, grade: LetterGrade.D },
  { min: 0, grade: LetterGrade.E },
];

const GRADE_POINTS: Record<LetterGrade, number> = {
  A: 4,
  AB: 3.5,
  B: 3,
  BC: 2.5,
  C: 2,
  D: 1,
  E: 0,
};

export function toLetterGrade(
  numericScore: number | null | undefined,
): LetterGrade | null {
  if (
    numericScore === null ||
    numericScore === undefined ||
    Number.isNaN(numericScore)
  ) {
    return null;
  }

  const clamped = Math.max(0, Math.min(100, numericScore));
  const match = LETTER_THRESHOLDS.find((entry) => clamped >= entry.min);
  return match ? match.grade : LetterGrade.E;
}

export function toGradePoint(
  letter: LetterGrade | null | undefined,
): number | null {
  if (!letter) return null;
  return GRADE_POINTS[letter];
}
