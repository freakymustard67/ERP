import { pcPost } from "./session";

export type DayItem = {
  id?: number;
  subject?: string;
  templateName?: string | null;
  chapters?: string;
  pageNo?: string;
  description?: string;
  date?: string;
  fileUrl?: string;
  uploadEnable?: boolean;
  studentFeedbackId?: number;
  [k: string]: unknown;
};

export type DayReport = {
  date?: string | null;
  paPortioncovereds?: DayItem[] | null;
  paHomeworks?: DayItem[] | null;
  paClassTests?: DayItem[] | null;
  paInstructions?: DayItem[] | null;
  dailyReportFiles?: DayItem[] | null;
};

export type FileGroup = { date: string; dailyReportFiles: DayItem[] };
export type PortionGroup = { date: string; portionCoveredList: DayItem[] };
export type HomeworkGroup = { date: string; homeworkList: DayItem[] };

/** "2026-09-21" -> JS Date.toString() payload the backend expects. */
export function toAppDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toString();
}

/** "2026-09-21" -> "21 September 2026" (deterministic, no locale). */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export function prettyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function todayLocal(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export function dayReport(studentId: number, ymd: string) {
  return pcPost<DayReport>("/dailyreport/dayReport", {
    date: toAppDate(ymd),
    studentId,
  });
}

export function fileHistory(studentId: number, offset: number, count = 10) {
  return pcPost<FileGroup[]>("/dailyreport/file/countwise", {
    studentId,
    offset,
    count,
  });
}

export function portionHistory(studentId: number, offset: number, count = 10) {
  return pcPost<PortionGroup[]>("/dailyreport/portionTaken/countwise", {
    studentId,
    offset,
    count,
  });
}

export function homeworkHistory(studentId: number, offset: number, count = 10) {
  return pcPost<HomeworkGroup[]>("/dailyreport/homeWork/countwise", {
    studentId,
    offset,
    count,
  });
}

export function fileName(url: string): string {
  try {
    return decodeURIComponent(url.split("?")[0].split("/").pop() || "file");
  } catch {
    return "file";
  }
}
