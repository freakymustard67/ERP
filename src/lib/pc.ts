// Upstream bases reverse-engineered from seito.in main.js (AytR env + interceptor).
// School: Carmel Public School, schoolCode 0875.

export const UPSTREAM = {
  API: "https://mob.parentconnect.in/ssdiary/parentApp",
  API1: "https://mob.parentconnect.in/ssdiary/parentApp",
  payment: "https://ssdiary.com/ssdiary/parentapp",
  busTracking: "https://be.ssdiary.com",
  busTrackingPort: "8080",
  fees: "https://parentconnect.in/ssdiary/parentapp",
  feesDiscountPartial: "https://ssdiary.com/ssdiary/parentApp",
  txnHistory: "https://parentconnect.in/ssdiary/parentapp",
  home: "https://parentconnect.in",
  gps: "https://mob.parentconnect.in/ssdiary",
  gallery: "https://appscook.ams3.digitaloceanspaces.com",
  studentExamReport: "https://be.ssdiary.com:8080",
  faq: "https://ssdiary.com/ssdiary/faqModule/",
  medicalConsent: "https://ssdiary.com/ssdiary/medicalConsent/",
  lms: "https://ssdiary.com/ssdiary/Lms",
} as const;

const has = (p: string, ...keys: string[]) => keys.some((k) => p.includes(k));

export function resolveUpstream(path: string, search: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const withParams = `${p}${search}`;

  if (
    has(
      p,
      "addnewproject",
      "project-status-to-launch",
      "editproject",
      "updateproject",
      "process-flow-doc",
      "document-upload",
      "loadClassTimetable",
      "loadStudentExamReportForParentApp",
      "findAllCirculationDetailHistory",
      "dwonloadExamReportForParentApp",
      "deleteDownloadedReportFileForParentApp"
    )
  )
    return `${UPSTREAM.API1}${withParams}`;

  if (has(p, "busTracking"))
    return `${UPSTREAM.busTracking}:${UPSTREAM.busTrackingPort}${withParams}`;

  if (
    has(
      p,
      "loadFeePayment",
      "loadReceiptNo",
      "upiVpacheck",
      "loadPrevReceiptNo",
      "onlineFeepaymentGatewayHDFCUPI",
      "onlineFeepaymentGateway",
      "onlineFeepaymentGatewayRazorpay",
      "onlineFeepaymentGatewayBillDesk",
      "loadHash",
      "verifyPayment",
      "duplicateReceiptForApp",
      "deletereceipt",
      "updateParentMailId",
      "forceCancelOnlineTransaction",
      "paymentThroughAppscook",
      "upiVpacheckFreeCharge",
      "loadDiscountFromSchoolDiscountDetails",
      "isScholarShipbyStudent",
      "billDeskRetrieveTransaction"
    )
  )
    return `${UPSTREAM.fees}${withParams}`;

  if (has(p, "paymentRequest")) return `${UPSTREAM.payment}${p}`;

  // Long tail (order mirrors the Angular interceptor)
  if (has(p, "loadFutureFeeAcademicYear")) return `${UPSTREAM.API}${withParams}`;
  if (has(p, "previousYearPendingForStudent"))
    return `${UPSTREAM.fees}${withParams}`;
  if (has(p, "loadTrackingDetailsByStudentId"))
    return `${UPSTREAM.API1}${withParams}`;
  if (has(p, "academiccalendar")) return `${UPSTREAM.home}${withParams}`;
  if (has(p, "schoolGallery", "delimiter"))
    return `${UPSTREAM.gallery}${withParams}`;
  if (has(p, "gpsTracking")) return `${UPSTREAM.gps}${withParams}`;
  if (has(p, "transactionHistory")) return `${UPSTREAM.txnHistory}${withParams}`;
  if (has(p, "SnapToRoad")) return withParams; // roadMap URL is empty in app
  if (
    has(
      p,
      "findStudentMedicalConditions",
      "saveOrUpdateStudentMedicalDetails",
      "deactivateStudentMedicalDetails"
    )
  )
    return `${UPSTREAM.medicalConsent}${p.replace(/^\//, "")}${search}`;
  if (has(p, "featureStatus.html"))
    return `https://ssdiary.com/ssdiary/parentApp${withParams}`;
  if (has(p, "loadPreviousClassesByStudentId"))
    return `${UPSTREAM.API}${withParams}`;
  if (has(p, "loadFAQDetails")) return `${UPSTREAM.faq}${p.replace(/^\//, "")}${search}`;
  if (
    has(
      p,
      "dailyLMSReport",
      "getAllActivityResponseFilesByStudentIdAndActivityId",
      "createOrUpdateActivityResponseFileUpload",
      "deleteActivityResponseIndividualFiles",
      "saveActivityReadStatusAndCount",
      "getAllActivityResponseFilesByStudentId",
      "deleteActivityResponseFileUpload"
    )
  )
    return `${UPSTREAM.lms}${withParams}`;
  if (
    has(p, "sandbox-axispg.freecharge.in/payment/v1") ||
    has(p, "secure-axispg.freecharge.in/payment/v1")
  )
    return withParams;
  if (has(p, "loadOnlineSpotDiscountByStudent", "loadPartialPaymentDetails"))
    return `${UPSTREAM.feesDiscountPartial}${withParams}`;

  return `${UPSTREAM.API}${withParams}`;
}
