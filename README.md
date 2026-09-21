# Carmel Portal

Parent web portal for Carmel Public School (schoolCode `0875`), reverse-engineered
from the `com.appscook.parentconnect.carmelpsvtt` Android app. Fresh modern UI,
same school backends — all traffic goes through local proxy routes at
`/api/pc/*` (see `src/lib/pc.ts` for the backend map), so no CORS issues and no
secrets in the repo.

## Run

```bash
npm install
npm run dev -- --port 3100
# open http://localhost:3100/login
```

Login with parent mobile number + password (same as the app), or OTP by SMS.
Session lives in `localStorage` only.

## Routes

| Route | Source endpoints |
|---|---|
| `/login` | `getSchoolByMobile`, `login.html`, `signup` (OTP), `pcOtpVerification`, `forgotPassword` |
| `/dashboard` | `profile.html`, `getCountForParentAppBadging.html` |
| `/circular` | `circulars/countwise` |
| `/newsletter` | `loadNewsLetterForParentApp.html` |
| `/daily-report`, `/daily-report/homework`, `/daily-report/portion`, `/daily-report/files` | `dailyreport/dayReport`, `dailyreport/{homeWork,portionTaken,file}/countwise`, `saveOrUpadteStudentFeedback`, `loadStudentFeedbackById.html`, `saveStudentAnswerPaper.html` |
| `/activities` | `dailyLMSReport/countwise`, `saveActivityReadStatusAndCount` |
| `/exams`, `/marks`, `/timetable`, `/hallticket`, `/online-class`, `/previous-classes` | `findExamDetailsbyStudentIdAndSchoolId.html`, `loadStudentExamReportForParentAppByYear`, `dwonloadExamReportForParentApp`, `deleteDownloadedReportFileForParentApp`, `loadStudentFeePaidStatusInMarksCard.html`, `loadAllAcademicYearList`, `loadClassTimetable`, `loadHallTicketWithFeePaidStatus.html`, `downloadActiveHallTicketbyStudent.html`, `onlineClassFeatureFlag.html`, `findClassAvailable.html`, `hostDetails.html`, `findbyStudentIdAndSchoolId.html`, `loadPreviousClassesByStudentId.html` |
| `/attendance`, `/leave` | `academic/absentReport`, `academic/applyLeave`, `academic/cancelLeave`, `getStudentOnlineAttDetailsByStudentId.html` |
| `/medical` | `findStudentMedicalConditions.html`, `saveOrUpdateStudentMedicalDetails.html`, `deactivateStudentMedicalDetails.html` |
| `/transport` | `loadTrackingDetailsByStudentId.html` (bus route from profile) |
| `/library` | `findAllCirculationDetailHistory` |
| `/gallery` | `gallery/schoolImageGallery` + Spaces bucket listing |
| `/calendar` | `academiccalendar/loadStudentEventsByParentAndSchool.html` |
| `/feedback` | `loadParentFeedbackHistory`, `loadIssues`, `saveFeedbackFormDetails.html`, `findEmailIdByparentId.html`, `findParentFeedbackSubmitOrNot.html` |

## Deliberately out of scope

- **Fees & payments** (`loadFeePayment`, gateways, receipts, `paymentRequest`, discounts, scholarships, transaction history) — excluded by request.
- **FAQ** (`loadFAQDetails`) — routed but no callable contract found in any bundle; endpoint never answers.
- **`busTracking` / `gpsTracking`** — referenced by the interceptor but no caller/params found; transport uses the tracker list instead.
- **Ecom store, staff project endpoints** (`addnewproject`, …) — no parent-facing contract found.
- **LMS file upload/delete** (`createOrUpdateActivityResponseFileUpload`, …) — payload unknown; list + read-status + downloads implemented.
- **OTP verify / forgot-password SMS** — implemented against the app's exact calls but needs a live-SMS test.

## Notes

- No secrets in git. Runtime config is per-browser (localStorage). Optional local-only `.env.local` (gitignored) for future backend work.
- `index.ts` is an unrelated Vercel AI Gateway smoke test, not part of the portal.
