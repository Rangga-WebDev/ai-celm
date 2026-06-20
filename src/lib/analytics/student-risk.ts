/** @format */

/**
 * Perhitungan "mahasiswa berisiko" untuk dosen.
 *
 * Tujuannya membantu dosen cepat mengenali mahasiswa yang butuh perhatian,
 * dengan ALASAN yang jelas (bukan kotak hitam). Setiap sinyal menambah skor
 * risiko dan menyertakan penjelasan yang bisa dibaca dosen.
 */

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type RiskFactorInput = {
  /** Rata-rata progres modul 0-100 (null bila belum ada progres sama sekali). */
  avgProgressPercent: number | null;
  /** Hari sejak aktivitas terakhir (null bila belum pernah mengakses). */
  daysSinceLastActive: number | null;
  /** Rata-rata persentase nilai kuis 0-100 (null bila belum ada kuis dikerjakan). */
  avgQuizPercent: number | null;
  /** Jumlah kuis terbit yang tersedia di kelas. */
  totalQuizzes: number;
  /** Jumlah kuis yang sudah dikerjakan mahasiswa. */
  attemptedQuizzes: number;
  /** Jumlah tugas argumentasi aktif yang belum dikumpulkan / perlu revisi. */
  pendingTasks: number;
  /** Jumlah total tugas argumentasi aktif. */
  totalTasks: number;
};

export type RiskReason = {
  label: string;
  severity: "high" | "medium";
};

export type RiskResult = {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
};

const HIGH_THRESHOLD = 5;
const MEDIUM_THRESHOLD = 2;

export function computeRisk(input: RiskFactorInput): RiskResult {
  const reasons: RiskReason[] = [];
  let score = 0;

  // 1) Keaktifan / kehadiran
  if (input.daysSinceLastActive === null) {
    score += 3;
    reasons.push({
      label: "Belum pernah membuka materi kelas",
      severity: "high",
    });
  } else if (input.daysSinceLastActive > 14) {
    score += 3;
    reasons.push({
      label: `Tidak aktif selama ${input.daysSinceLastActive} hari`,
      severity: "high",
    });
  } else if (input.daysSinceLastActive >= 7) {
    score += 1;
    reasons.push({
      label: `Kurang aktif (terakhir ${input.daysSinceLastActive} hari lalu)`,
      severity: "medium",
    });
  }

  // 2) Progres belajar
  if (input.avgProgressPercent === null || input.avgProgressPercent < 25) {
    score += 3;
    reasons.push({
      label:
        input.avgProgressPercent === null
          ? "Progres belajar masih 0%"
          : `Progres belajar sangat rendah (${Math.round(
              input.avgProgressPercent,
            )}%)`,
      severity: "high",
    });
  } else if (input.avgProgressPercent < 50) {
    score += 1;
    reasons.push({
      label: `Progres belajar di bawah setengah (${Math.round(
        input.avgProgressPercent,
      )}%)`,
      severity: "medium",
    });
  }

  // 3) Nilai kuis
  if (input.attemptedQuizzes > 0 && input.avgQuizPercent !== null) {
    if (input.avgQuizPercent < 60) {
      score += 2;
      reasons.push({
        label: `Rata-rata nilai kuis rendah (${Math.round(
          input.avgQuizPercent,
        )})`,
        severity: "high",
      });
    } else if (input.avgQuizPercent < 75) {
      score += 1;
      reasons.push({
        label: `Nilai kuis masih di bawah standar (${Math.round(
          input.avgQuizPercent,
        )})`,
        severity: "medium",
      });
    }
  } else if (input.totalQuizzes > 0 && input.attemptedQuizzes === 0) {
    score += 1;
    reasons.push({
      label: "Belum mengerjakan satu kuis pun",
      severity: "medium",
    });
  }

  // 4) Tugas tertunda
  if (input.totalTasks > 0 && input.pendingTasks > 0) {
    score += input.pendingTasks >= 2 ? 2 : 1;
    reasons.push({
      label: `${input.pendingTasks} tugas argumentasi belum dikumpulkan`,
      severity: input.pendingTasks >= 2 ? "high" : "medium",
    });
  }

  let level: RiskLevel = "LOW";
  if (score >= HIGH_THRESHOLD) {
    level = "HIGH";
  } else if (score >= MEDIUM_THRESHOLD) {
    level = "MEDIUM";
  }

  return { score, level, reasons };
}
