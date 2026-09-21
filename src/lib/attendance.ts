import { pcPost } from "./session";

export type AbsentEntry = {
  id?: number;
  studentLeaveId?: number;
  absentDate?: string;
  status?: string;
  reason?: string | null;
  [k: string]: unknown;
};

export function absentReport(studentId: number) {
  return pcPost<AbsentEntry[]>("/academic/absentReport", { studentId });
}

export function onlineAttendance(studentId: number) {
  return pcPost<{ success: boolean; response: string }>(
    "/getStudentOnlineAttDetailsByStudentId.html",
    { studentId }
  );
}
