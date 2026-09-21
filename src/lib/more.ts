import { pcGet, pcPost, pcPostForm, pcPostLoose, pcPostText } from "./session";

/* ---------- OTP + forgot password ---------- */

export function sendSchoolCode(mobile: string, schoolCode: string) {
  return pcGet<unknown>(
    `/signup?mobileNo=${encodeURIComponent(mobile)}&schoolCode=${encodeURIComponent(schoolCode)}`
  );
}

export function verifyOtp(userName: string, otp: string, schoolCode: string, mobile: string) {
  return pcGet<unknown>(
    `/pcOtpVerification?otp=${encodeURIComponent(otp)}&schoolCode=${encodeURIComponent(schoolCode)}&mobileNo=${encodeURIComponent(mobile || userName)}`
  );
}

export function forgotPassword(mobileNo: string, schoolCode: string) {
  return pcPost<{ message?: string; success?: boolean }>("/forgotPassword", {
    mobileNo,
    schoolCode,
  });
}

/* ---------- Newsletter ---------- */

export type NewsFile = {
  fileName?: string;
  fileType?: string;
  description?: string;
  fileUrl?: string;
  mode?: string;
  className?: string | null;
  isActive?: boolean;
  [k: string]: unknown;
};

export function loadNewsLetter(body: {
  studentIds: string;
  type: string;
  searchData: string;
  fromDate: string | null;
  toDate: string | null;
}) {
  return pcPostLoose<Record<string, NewsFile[]>>(
    "/loadNewsLetterForParentApp.html",
    body
  );
}

/* ---------- Gallery ---------- */

export type GalleryFolder = {
  folderName?: string;
  thumbNailImages?: string[];
  gallerylUrl?: string;
  [k: string]: unknown;
};

export function galleryFolders(schoolCode: string) {
  return pcPost<{ galleryFolderList?: GalleryFolder[] }>(
    `/gallery/schoolImageGallery?schoolId=${encodeURIComponent(schoolCode)}`,
    ""
  );
}

/* ---------- Calendar ---------- */

export type CalEvent = {
  [k: string]: unknown;
};

export function monthRange(ym: string): { startDate: string; endDate: string } {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const p = (x: number) => String(x).padStart(2, "0");
  return {
    startDate: `${y}-${p(m)}-01`,
    endDate: `${y}-${p(m)}-${last}`,
  };
}

export function calendarEvents(body: {
  endDate: string;
  parentId: number;
  schoolId: string;
  startDate: string;
  studentId: number;
}) {
  const q = new URLSearchParams({
    endDate: body.endDate,
    parentId: String(body.parentId),
    schoolId: body.schoolId,
    startDate: body.startDate,
    studentId: String(body.studentId),
  }).toString();
  return pcGet<CalEvent[]>(
    `/academiccalendar/loadStudentEventsByParentAndSchool.html?${q}`
  );
}

/* ---------- Timetable ---------- */

export function classTimetable(standardId: number, divisionId: number) {
  return pcPost<unknown[]>("/loadClassTimetable", { standardId, divisionId });
}

/* ---------- Hall ticket ---------- */

export function hallTicketStatus(schoolId: string, studentId: number) {
  return pcPost<{ response?: string }>(
    "/loadHallTicketWithFeePaidStatus.html",
    { schoolId, studentId }
  );
}

export function hallTicketLink(studentId: number, hallTicketId: number) {
  return pcPost<{ response?: string }>(
    "/downloadActiveHallTicketbyStudent.html",
    { studentId, hallTicketId }
  );
}

/* ---------- Online class ---------- */

export function onlineClassFlag(studentId: number) {
  return pcGet<unknown>(`/onlineClassFeatureFlag.html?studentId=${studentId}`);
}

export function examDetails(studentId: number, schoolId: number | string) {
  return pcPost<unknown>("/findExamDetailsbyStudentIdAndSchoolId.html", {
    studentId,
    schoolId,
  });
}

export function classAvailable(studentId: number) {
  return pcPost<{ success?: boolean; message?: string }>(
    `/findClassAvailable.html?studentId=${studentId}`,
    {}
  );
}

export function hostDetails(studentId: number) {
  return pcPost<Record<string, unknown>>(
    `/hostDetails.html?studentId=${studentId}`,
    {}
  );
}

export function classroomDetails(studentId: number, schoolId: number | string) {
  return pcPost<unknown>("/findbyStudentIdAndSchoolId.html", {
    studentId,
    schoolId,
  });
}

/* ---------- Medical consent ---------- */

export type MedicalCondition = {
  medicalConditionId?: number;
  allergies?: string;
  precautions?: string;
  precaution?: string;
  currentMedication?: string;
  emergencyAction?: string;
  symptomNature?: string;
  hospital?: string;
  hospitalName?: string;
  physician?: string;
  physicianName?: string;
  physicianPhNo?: string;
  description?: string;
  emergencyPhNo?: string;
  lastOccurred?: string;
  tetanusDate?: string;
  tetanusdate?: string;
  [k: string]: unknown;
};

export function medicalList(schoolId: string, studentId: number, parentId: number) {
  return pcPost<unknown>("/findStudentMedicalConditions.html", {
    schoolId,
    studentId,
    parentId,
  });
}

export function medicalSave(body: Record<string, unknown>) {
  return pcPost<{ success?: boolean; message?: string }>(
    "/saveOrUpdateStudentMedicalDetails.html",
    body
  );
}

export function medicalDeactivate(
  schoolId: string,
  studentId: number,
  medicalConditionId: number
) {
  return pcPost<{ success?: boolean; message?: string }>(
    "/deactivateStudentMedicalDetails.html",
    { schoolId, studentId, medicalConditionId }
  );
}

/* ---------- Transport ---------- */

export function trackerList(studentId: number | string) {
  return pcPost<{ response?: string }>("/loadTrackingDetailsByStudentId.html", {
    studentId,
  });
}

/* ---------- Library ---------- */

export function libraryHistory(studentId: number) {
  return pcPostLoose<unknown>(`/findAllCirculationDetailHistory?studentId=${studentId}`, {});
}

/* ---------- Previous classes ---------- */

export function previousClasses(studentId: number) {
  return pcPost<{ success?: boolean; response?: string }>(
    "/loadPreviousClassesByStudentId.html",
    { studentId }
  );
}

/* ---------- Feedback (per-item + parent history + report issue) ---------- */

export function saveItemFeedback(body: {
  studentId: number;
  feedbackText: string;
  dailyreportId: number;
  studentFeedbackId: number;
  category: string;
}) {
  const q = new URLSearchParams({
    studentId: String(body.studentId),
    feedbackText: body.feedbackText,
    dailyreportId: String(body.dailyreportId),
    dailyreportCategory: body.category,
    studentFeedbackId: String(body.studentFeedbackId),
  }).toString();
  return pcPostText(`/saveOrUpadteStudentFeedback?${q}`, {});
}

export function parentFeedbackHistory(parentId: number | string) {
  return pcPost<unknown>(`/loadParentFeedbackHistory?parentId=${parentId}`, {});
}

export function studentFeedbackById(studentFeedbackId: number) {
  return pcPost<{ success?: boolean; [k: string]: unknown }>(
    "/loadStudentFeedbackById.html",
    { studentFeedbackId }
  );
}

export function issueList(schoolId: string) {
  return pcPostLoose<{ issueList?: { id?: number; name?: string }[] } & Record<string, unknown>>(
    "/loadIssues",
    { SchoolId: schoolId }
  );
}

export function submitIssue(body: Record<string, unknown>) {
  return pcPost<{ success?: number | boolean }>("/saveFeedbackFormDetails.html", body);
}

export function parentEmail(parentId: number | string) {
  return pcPost<{ success?: number | boolean; response?: string }>(
    "/findEmailIdByparentId.html",
    { parentId }
  );
}

export function feedbackSubmitCheck(parentId: number | string, schoolId: string) {
  return pcPost<unknown>("/findParentFeedbackSubmitOrNot.html", {
    parentId,
    schoolId,
  });
}

/* ---------- LMS activities ---------- */

export type LmsActivity = {
  activityId?: number;
  description?: string;
  sendDate?: string;
  dueDate?: string;
  attachmentIdJson?: string;
  [k: string]: unknown;
};

export function lmsActivities(
  studentId: number,
  offset: number,
  count: number,
  type: string
) {
  return pcPost<LmsActivity[]>("/dailyLMSReport/countwise", {
    studentId,
    offset,
    count,
    type,
  });
}

export function lmsMarkRead(activityId: number, studentId: number, studentName: string) {
  return pcPost<unknown>("/saveActivityReadStatusAndCount", {
    activityId,
    studentId,
    studentName,
  });
}

/* ---------- Answer-paper upload ---------- */

export function uploadAnswerPaper(
  studentId: number,
  dailyReportFileId: number,
  files: File[]
) {
  const form = new FormData();
  for (const f of files) form.append("answerPapers", f);
  form.append("studentId", String(studentId));
  form.append("dailyReportFileId", String(dailyReportFileId));
  return pcPostForm<{ success?: boolean }>("/saveStudentAnswerPaper.html", form);
}

/* ---------- Leave ---------- */

export function applyLeave(body: {
  startDate: string;
  endDate: string;
  reason: string;
  studentId: number;
}) {
  return pcPost<{ id?: number }[]>("/academic/applyLeave", body);
}

export function cancelLeave(studentLeaveId: number) {
  return pcPost<{ message?: string }>("/academic/cancelLeave", {
    studentLeaveId,
  });
}

/* ---------- Badging (dashboard counts) ---------- */

export type BadgeCounts = {
  galleryCount?: number;
  circularCount?: number;
  newsLetterCount?: number;
  pendingFeeStatus?: boolean;
  studentWiseBadgeCounts?: Record<string, number | boolean>[];
};

export async function parentBadging(parentId: number, schoolId: string | number) {
  const data = await pcPost<{ response?: string }>(
    "/getCountForParentAppBadging.html",
    { parentId, schoolId }
  );
  try {
    return JSON.parse(data.response || "{}") as BadgeCounts;
  } catch {
    return {} as BadgeCounts;
  }
}
