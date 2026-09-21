import { pcGet } from "./session";

export type AcademicYear = {
  id: number;
  startDate: number;
  endDate: number;
  academicYearStatus: string;
  promotionStatus?: string;
};

export type MarkCell = {
  value?: string;
  bold?: boolean;
  colspan?: number;
  rowspan?: number;
};

export type MarkTable = { head?: MarkCell[][] | null; body?: MarkCell[][] | null };

export type MarkReport = {
  reportId?: number;
  examName?: string;
  rptDate?: string;
  pdfUrl?: string;
  totalMarkAndRemark?: Record<string, string> | string | null;
  gradeScale?: string;
  scholasticMark?: MarkTable | string | null;
  attendance?: MarkTable | string | null;
  coCurricular?: MarkTable | string | null;
  studentDetails?: Record<string, unknown>;
  schoolDetails?: Record<string, unknown>;
  [k: string]: unknown;
};

export function academicYears(schoolId: string) {
  return pcGet<AcademicYear[]>(`/loadAllAcademicYearList?schoolId=${schoolId}`);
}

export function feePendingStatus(schoolId: string, studentId: number) {
  return pcGet<{ feePendingStatus?: boolean }>(
    `/loadStudentFeePaidStatusInMarksCard.html?schoolId=${schoolId}&studentId=${studentId}`
  );
}

export async function markDetails(studentId: number, academicYearId: number) {
  const data = await pcGet<unknown>(
    `/loadStudentExamReportForParentAppByYear?studentId=${studentId}&academicYearId=${academicYearId}`
  );
  const inner = typeof data === "string" ? JSON.parse(data) : data;
  return inner as MarkReport[];
}

export async function generatePdfLink(
  reportId: number,
  studentId: number,
  academicYearId: number
): Promise<string> {
  const data = await pcGet<unknown>(
    `/dwonloadExamReportForParentApp?reportId=${reportId}&studentId=${studentId}&academicYearId=${academicYearId}`
  );
  if (typeof data === "string") return data;
  throw new Error("PDF generation failed on the server.");
}

export function deletePdf(path: string) {
  return pcGet<unknown>(
    `/deleteDownloadedReportFileForParentApp?path=${encodeURIComponent(path)}`
  );
}

export function yearLabel(y: AcademicYear): string {
  const a = y.startDate ? new Date(y.startDate).getFullYear() : "";
  const b = y.endDate ? new Date(y.endDate).getFullYear() : "";
  return `${a}-${b}`;
}

/** Normalize the backend's loose table fields (dict | "{}" | "" | null). */
export function asTable(v: MarkTable | string | null | undefined): MarkTable | null {
  if (!v || v === "{}" || v === "") return null;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v) as MarkTable;
      if (!p || (!p.head?.length && !p.body?.length)) return null;
      return p;
    } catch {
      return null;
    }
  }
  if (!v.head?.length && !v.body?.length) return null;
  return v;
}
