"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  UserCheck,
} from "lucide-react";
import {
  attendanceStatusLabels,
  getFollowupReasonForAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";
import { followupReasons, type FollowupReason } from "@/lib/followup-templates";
import {
  messageRecipientLabels,
  messageRecipientTypes,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  getSortedActiveSchedules,
  type OperationsStudentSchedule,
} from "@/app/app/operations-schedule";

export type AttendanceStudent = {
  id: string;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  maskedParentPhone: string;
  maskedStudentPhone: string | null;
  schedules: OperationsStudentSchedule[];
};

export type AttendanceClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  students: AttendanceStudent[];
};

export type AttendanceRecordItem = {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string | null;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  checkedAt: string | null;
  arrivedAt: string | null;
  note: string | null;
  followupId: string | null;
  followupStatus: string | null;
  followupSentAt: string | null;
};

type AttendanceBoardProps = {
  academyName: string;
  teacherName: string;
  classes: AttendanceClass[];
  initialDate: string;
  initialRecords: AttendanceRecordItem[];
};

type AttendanceApiResponse = {
  records?: AttendanceRecordItem[];
  record?: AttendanceRecordItem;
  error?: string;
};

type AttendanceSession = {
  key: string;
  classId: string;
  className: string;
  subject: string | null;
  gradeLabel: string | null;
  startTime: string;
  endTime: string;
  students: AttendanceStudent[];
};

type AttendanceFollowupTarget = {
  key: string;
  student: AttendanceStudent;
  session: AttendanceSession;
  record: AttendanceRecordItem;
  reason: FollowupReason;
};

type AttendanceActionItem = {
  key: string;
  studentName: string;
  className: string;
  startTime: string;
  endTime: string;
  status: AttendanceStatus;
  followupId: string | null;
  followupStatus: string | null;
  followupSentAt: string | null;
};

type AttendanceClassSummary = {
  key: string;
  className: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  counts: Record<AttendanceStatus, number>;
};

type AttendanceOverview = {
  totalSessions: number;
  totalStudents: number;
  counts: Record<AttendanceStatus, number>;
  actionItems: AttendanceActionItem[];
  classSummaries: AttendanceClassSummary[];
};

type MessagePreviewState = {
  key: string;
  status: "idle" | "ready" | "error";
  title: string;
  body: string;
  error: string;
};

type FollowupSaveState = {
  key: string;
  body: string;
  status: "idle" | "saving" | "saved" | "error";
  error: string;
  followupId: string;
};

type MessageSendState = {
  followupId: string;
  status: "idle" | "sending" | "sent" | "error";
  dryRun: boolean;
  message: string;
  error: string;
};

type MessagePreviewResponse = {
  title?: string;
  body?: string;
  error?: string;
};

type CreateFollowupResponse = {
  followup?: {
    id: string;
    status: string;
    createdAt: string;
    attendanceRecordId?: string | null;
  };
  error?: string;
};

type SendMessageResponse = {
  dryRun?: boolean;
  message?: string;
  recipientPhone?: string;
  followupId?: string;
  error?: string;
};

type FollowupHistoryResponse = {
  followups?: Array<{
    id: string;
    reason: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }>;
  error?: string;
};

const editableStatuses: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "needs_check",
  "makeup",
];

export function AttendanceBoard({
  academyName,
  teacherName,
  classes,
  initialDate,
  initialRecords,
}: AttendanceBoardProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [attendanceRecords, setAttendanceRecords] = useState(initialRecords);
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [loadState, setLoadState] = useState<{
    status: "idle" | "loading" | "error";
    error: string;
  }>({ status: "idle", error: "" });
  const [saveState, setSaveState] = useState<{
    key: string;
    status: "idle" | "saving" | "saved" | "error";
    error: string;
  }>({ key: "", status: "idle", error: "" });
  const [followupTarget, setFollowupTarget] = useState<AttendanceFollowupTarget | null>(
    null,
  );
  const [messagePreview, setMessagePreview] = useState<MessagePreviewState>({
    key: "",
    status: "idle",
    title: "",
    body: "",
    error: "",
  });
  const [messageDraft, setMessageDraft] = useState({ key: "", body: "" });
  const [selectedRecipientType, setSelectedRecipientType] =
    useState<MessageRecipientType>("parent");
  const [followupSave, setFollowupSave] = useState<FollowupSaveState>({
    key: "",
    body: "",
    status: "idle",
    error: "",
    followupId: "",
  });
  const [messageSend, setMessageSend] = useState<MessageSendState>({
    followupId: "",
    status: "idle",
    dryRun: true,
    message: "",
    error: "",
  });
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const selectedDayOfWeek = getDayOfWeek(selectedDate);
  const dateAttendanceRecords = useMemo(
    () => attendanceRecords.filter((record) => record.attendanceDate === selectedDate),
    [attendanceRecords, selectedDate],
  );
  const sessions = useMemo(
    () => buildAttendanceSessions(classes, dateAttendanceRecords, selectedDayOfWeek),
    [classes, dateAttendanceRecords, selectedDayOfWeek],
  );
  const selectedSession =
    sessions.find((session) => session.key === selectedSessionKey) ?? sessions[0];
  const selectedSessionRecords = useMemo(
    () =>
      selectedSession
        ? dateAttendanceRecords.filter(
            (record) =>
              record.classId === selectedSession.classId &&
              record.scheduledStartTime === selectedSession.startTime &&
              record.scheduledEndTime === selectedSession.endTime,
          )
        : [],
    [dateAttendanceRecords, selectedSession],
  );
  const recordsByStudent = new Map(
    selectedSessionRecords.map((record) => [record.studentId, record]),
  );
  const summary = selectedSession
    ? summarizeSession(selectedSession.students, recordsByStudent)
    : null;
  const overview = useMemo(
    () => buildAttendanceOverview(sessions, dateAttendanceRecords),
    [dateAttendanceRecords, sessions],
  );
  const needsCheckStudents = selectedSession
    ? selectedSession.students.filter(
        (student) =>
          normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status) ===
          "needs_check",
      )
    : [];
  const effectiveRecipientType =
    followupTarget?.student.maskedStudentPhone ? selectedRecipientType : "parent";
  const followupTargetKey = followupTarget
    ? `${followupTarget.key}:${effectiveRecipientType}`
    : "";
  const messageBody =
    messageDraft.key === followupTargetKey
      ? messageDraft.body
      : messagePreview.key === followupTargetKey
        ? messagePreview.body
        : "";
  const isPreviewLoading =
    Boolean(followupTarget) && messagePreview.key !== followupTargetKey;
  const isPreviewReady =
    messagePreview.key === followupTargetKey && messagePreview.status === "ready";
  const isPreviewError =
    messagePreview.key === followupTargetKey && messagePreview.status === "error";
  const isDraftEdited = isPreviewReady && messageBody !== messagePreview.body;
  const isMessageBlank = isPreviewReady && messageBody.trim().length === 0;
  const isFollowupSaving =
    followupSave.key === followupTargetKey &&
    followupSave.body === messageBody &&
    followupSave.status === "saving";
  const isFollowupSaved =
    followupSave.key === followupTargetKey &&
    followupSave.body === messageBody &&
    followupSave.status === "saved";
  const savedFollowupId = isFollowupSaved ? followupSave.followupId : "";
  const isMessageSending =
    messageSend.followupId === savedFollowupId && messageSend.status === "sending";
  const isMessageSent =
    Boolean(savedFollowupId) &&
    messageSend.followupId === savedFollowupId &&
    messageSend.status === "sent";
  const followupSaveError =
    followupSave.key === followupTargetKey && followupSave.status === "error"
      ? followupSave.error
      : "";
  const messageSendError =
    Boolean(savedFollowupId) &&
    messageSend.followupId === savedFollowupId &&
    messageSend.status === "error"
      ? messageSend.error
      : "";

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttendance() {
      setLoadState({ status: "loading", error: "" });

      try {
        const response = await fetch(`/api/attendance?date=${selectedDate}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as AttendanceApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "출석 기록을 불러오지 못했습니다.");
        }

        setAttendanceRecords(payload.records ?? []);
        setLoadState({ status: "idle", error: "" });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "출석 기록을 불러오지 못했습니다.",
        });
      }
    }

    void loadAttendance();

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!followupTarget) {
      return;
    }

    const target = followupTarget;
    const controller = new AbortController();
    const nextKey = `${target.key}:${effectiveRecipientType}`;

    async function loadPreview() {
      try {
        const response = await fetch("/api/messages/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: target.student.id,
            reason: target.reason,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as MessagePreviewResponse;

        if (!response.ok || !payload.body) {
          throw new Error(payload.error ?? "문자 초안을 만들지 못했습니다.");
        }

        setMessagePreview({
          key: nextKey,
          status: "ready",
          title: payload.title ?? "문자 미리보기",
          body: payload.body,
          error: "",
        });
        setMessageDraft({ key: nextKey, body: payload.body });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setMessagePreview({
          key: nextKey,
          status: "error",
          title: "",
          body: "",
          error: error instanceof Error ? error.message : "문자 초안을 만들지 못했습니다.",
        });
        setMessageDraft({ key: "", body: "" });
      }
    }

    async function loadDuplicateWarning() {
      try {
        const response = await fetch(`/api/followups?studentId=${target.student.id}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as FollowupHistoryResponse;

        if (!response.ok) {
          return;
        }

        const warning = getRecentDuplicateWarning({
          followups: payload.followups ?? [],
          reason: target.reason,
        });
        setDuplicateWarning(warning);
      } catch {
        if (!controller.signal.aborted) {
          setDuplicateWarning("");
        }
      }
    }

    void loadPreview();
    void loadDuplicateWarning();

    return () => {
      controller.abort();
    };
  }, [followupTarget, effectiveRecipientType]);

  async function handleStatusChange(student: AttendanceStudent, status: AttendanceStatus) {
    if (!selectedSession) {
      return;
    }

    const updateKey = getAttendanceUpdateKey({
      studentId: student.id,
      classId: selectedSession.classId,
      attendanceDate: selectedDate,
      scheduledStartTime: selectedSession.startTime,
      scheduledEndTime: selectedSession.endTime,
    });

    setSaveState({ key: updateKey, status: "saving", error: "" });

    try {
      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          classId: selectedSession.classId,
          attendanceDate: selectedDate,
          scheduledStartTime: selectedSession.startTime,
          scheduledEndTime: selectedSession.endTime,
          status,
          note: createDefaultNote(status),
        }),
      });
      const payload = (await response.json()) as AttendanceApiResponse;

      if (!response.ok || !payload.record) {
        throw new Error(payload.error ?? "출석 상태를 저장하지 못했습니다.");
      }

      const savedRecord = payload.record;
      const followupReason = getFollowupReasonForAttendanceStatus(status);

      setAttendanceRecords((current) => mergeAttendanceRecord(current, savedRecord));
      setSaveState({ key: updateKey, status: "saved", error: "" });

      if (followupReason) {
        setDuplicateWarning("");
        setFollowupTarget({
          key: `${savedRecord.id}:${followupReason}`,
          student,
          session: selectedSession,
          record: savedRecord,
          reason: followupReason,
        });
      } else if (followupTarget?.record.id === savedRecord.id) {
        setDuplicateWarning("");
        setFollowupTarget(null);
      }
    } catch (error) {
      setSaveState({
        key: updateKey,
        status: "error",
        error:
          error instanceof Error ? error.message : "출석 상태를 저장하지 못했습니다.",
      });
    }
  }

  function handleRestorePreview() {
    if (!isPreviewReady) {
      return;
    }

    setMessageDraft({ key: followupTargetKey, body: messagePreview.body });
  }

  async function handleSaveAttendanceFollowup() {
    if (!followupTarget || !isPreviewReady || isMessageBlank || isFollowupSaving) {
      return;
    }

    const bodyToSave = messageBody.trim();

    setFollowupSave({
      key: followupTargetKey,
      body: bodyToSave,
      status: "saving",
      error: "",
      followupId: "",
    });

    try {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: followupTarget.student.id,
          reason: followupTarget.reason,
          messageBody: bodyToSave,
          attendanceRecordId: followupTarget.record.id,
          recipientType: effectiveRecipientType,
        }),
      });
      const payload = (await response.json()) as CreateFollowupResponse;

      if (!response.ok || !payload.followup) {
        throw new Error(payload.error ?? "팔로업 기록을 저장하지 못했습니다.");
      }

      setFollowupSave({
        key: followupTargetKey,
        body: bodyToSave,
        status: "saved",
        error: "",
        followupId: payload.followup.id,
      });
      setMessageSend({
        followupId: "",
        status: "idle",
        dryRun: true,
        message: "",
        error: "",
      });
      setAttendanceRecords((current) =>
        current.map((record) =>
          record.id === followupTarget.record.id
            ? {
                ...record,
                followupId: payload.followup?.id ?? record.followupId,
                followupStatus: payload.followup?.status ?? record.followupStatus,
                followupSentAt: null,
              }
            : record,
        ),
      );
    } catch (error) {
      setFollowupSave({
        key: followupTargetKey,
        body: bodyToSave,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "팔로업 기록을 저장하지 못했습니다.",
        followupId: "",
      });
    }
  }

  async function handleSendAttendanceMessage() {
    if (!savedFollowupId || isMessageSending) {
      return;
    }

    setMessageSend({
      followupId: savedFollowupId,
      status: "sending",
      dryRun: true,
      message: "",
      error: "",
    });

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          followupId: savedFollowupId,
        }),
      });
      const payload = (await response.json()) as SendMessageResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "문자를 발송하지 못했습니다.");
      }

      setMessageSend({
        followupId: savedFollowupId,
        status: "sent",
        dryRun: payload.dryRun ?? true,
        message:
          payload.message ??
          (payload.dryRun ? "dry-run 발송을 기록했습니다." : "문자를 발송했습니다."),
        error: "",
      });
      setAttendanceRecords((current) =>
        current.map((record) =>
          record.followupId === savedFollowupId
            ? {
                ...record,
                followupStatus: "sent",
                followupSentAt: new Date().toISOString(),
              }
            : record,
        ),
      );
    } catch (error) {
      setMessageSend({
        followupId: savedFollowupId,
        status: "error",
        dryRun: true,
        message: "",
        error:
          error instanceof Error ? error.message : "문자를 발송하지 못했습니다.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <section className="border-b border-[#DED8CE] bg-transparent px-1 pb-4 sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-4 sm:shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#315C7C]">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              반별 출석부
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {teacherName}님이 수업별 도착 여부를 체크합니다. 연락 필요 학생과 체크
              필요 수업을 바로 확인합니다.
            </p>
          </div>

          <AttendanceDateControl value={selectedDate} onChange={setSelectedDate} />
        </div>
      </section>

      <AttendanceOverviewPanel overview={overview} />

      <section className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        <SessionList
          sessions={sessions}
          selectedSessionKey={selectedSession?.key ?? ""}
          loadState={loadState.status}
          onSelect={setSelectedSessionKey}
        />

        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[#315C7C]" />
                  <h3 className="text-base font-semibold text-stone-950">
                    {selectedSession?.className ?? "선택된 수업 없음"}
                  </h3>
                </div>
                {selectedSession ? (
                  <p className="mt-1 text-sm text-stone-500">
                    {selectedSession.startTime} - {selectedSession.endTime} ·{" "}
                    {selectedSession.subject ?? "과목 미지정"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">
                    선택한 날짜에 표시할 수업이 없습니다.
                  </p>
                )}
              </div>

              {summary ? <AttendanceSummary summary={summary} /> : null}
            </div>

            {loadState.status === "error" ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
                {loadState.error}
              </div>
            ) : null}
          </div>

          {selectedSession ? (
            <div>
              <div className="hidden grid-cols-[minmax(9rem,1fr)_8rem_minmax(24rem,1.4fr)] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-500 sm:grid sm:px-5">
                <span>학생</span>
                <span>상태</span>
                <span>체크</span>
              </div>

              <div className="divide-y divide-stone-200">
                {selectedSession.students.map((student) => {
                  const record = recordsByStudent.get(student.id);
                  const status = normalizeAttendanceStatus(record?.status);
                  const updateKey = getAttendanceUpdateKey({
                    studentId: student.id,
                    classId: selectedSession.classId,
                    attendanceDate: selectedDate,
                    scheduledStartTime: selectedSession.startTime,
                    scheduledEndTime: selectedSession.endTime,
                  });
                  const isSaving =
                    saveState.key === updateKey && saveState.status === "saving";
                  const saveError =
                    saveState.key === updateKey && saveState.status === "error"
                      ? saveState.error
                      : "";

                  return (
                    <AttendanceStudentRow
                      key={student.id}
                      student={student}
                      status={status}
                      record={record}
                      isSaving={isSaving}
                      saveError={saveError}
                      onStatusChange={(nextStatus) =>
                        handleStatusChange(student, nextStatus)
                      }
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-600">
              선택한 날짜에 수업 기록이나 주간 스케줄이 없습니다.
            </div>
          )}
        </section>

        <AttendanceFollowupPanel
          className="lg:col-span-2 xl:col-span-1"
          duplicateWarning={duplicateWarning}
          followupSaveError={followupSaveError}
          followupTarget={followupTarget}
          selectedRecipientType={effectiveRecipientType}
          isDraftEdited={isDraftEdited}
          isFollowupSaved={isFollowupSaved}
          isFollowupSaving={isFollowupSaving}
          isMessageBlank={isMessageBlank}
          isMessageSending={isMessageSending}
          isMessageSent={isMessageSent}
          isPreviewError={isPreviewError}
          isPreviewLoading={isPreviewLoading}
          isPreviewReady={isPreviewReady}
          messageBody={messageBody}
          messagePreview={messagePreview}
          messageSend={messageSend}
          messageSendError={messageSendError}
          needsCheckStudents={needsCheckStudents}
          onDismiss={() => {
            setDuplicateWarning("");
            setFollowupTarget(null);
          }}
          onMessageChange={(body) => setMessageDraft({ key: followupTargetKey, body })}
          onRecipientTypeChange={setSelectedRecipientType}
          onRestorePreview={handleRestorePreview}
          onSaveFollowup={handleSaveAttendanceFollowup}
          onSendMessage={handleSendAttendanceMessage}
        />
      </section>
    </div>
  );
}

function AttendanceDateControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // 일부 모바일 브라우저는 showPicker를 노출해도 숨김 input에서는 실패합니다.
    }

    input.focus();
    input.click();
  }

  return (
    <div className="w-full lg:max-w-sm">
      <span className="mb-1 block text-xs font-semibold text-stone-500">조회 날짜</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
        <button
          type="button"
          aria-label="전날 출석부 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="relative">
          <input
            ref={inputRef}
            type="date"
            value={value}
            onChange={(event) => {
              if (event.target.value) {
                onChange(event.target.value);
              }
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={openCalendar}
            className="flex min-h-11 w-full items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-left text-sm font-semibold text-stone-900 transition hover:border-[#315C7C] hover:bg-[#EAF1F8] focus:border-[#315C7C] focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
          >
            <CalendarDays size={17} className="shrink-0 text-stone-500" />
            <span className="min-w-0 flex-1 truncate tabular-nums">
              {formatAttendanceDate(value)}
            </span>
            <CalendarDays size={16} className="shrink-0 text-stone-400" />
          </button>
        </div>

        <button
          type="button"
          aria-label="다음날 출석부 보기"
          onClick={() => onChange(shiftDate(value, 1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <DateShortcutButton label="어제" date={shiftDate(getTodayDate(), -1)} onChange={onChange} />
        <DateShortcutButton label="오늘" date={getTodayDate()} onChange={onChange} />
        <DateShortcutButton label="내일" date={shiftDate(getTodayDate(), 1)} onChange={onChange} />
      </div>
    </div>
  );
}

function DateShortcutButton({
  label,
  date,
  onChange,
}: {
  label: string;
  date: string;
  onChange: (date: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(date)}
      className="min-h-9 rounded-md border border-stone-200 bg-stone-50 px-2 text-xs font-semibold text-stone-600 transition hover:border-[#C9D6E2] hover:bg-[#EAF1F8] hover:text-[#315C7C]"
    >
      {label}
    </button>
  );
}

function SessionList({
  sessions,
  selectedSessionKey,
  loadState,
  onSelect,
}: {
  sessions: AttendanceSession[];
  selectedSessionKey: string;
  loadState: "idle" | "loading" | "error";
  onSelect: (sessionKey: string) => void;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-950">수업 시간</h3>
          {loadState === "loading" ? (
            <Loader2 size={16} className="animate-spin text-stone-400" />
          ) : (
            <span className="text-xs font-medium text-stone-500">{sessions.length}개</span>
          )}
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:block lg:space-y-2">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isSelected = session.key === selectedSessionKey;

            return (
              <button
                key={session.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(session.key)}
                className={[
                  "grid min-h-[4.75rem] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-3 text-left transition",
                  isSelected
                    ? "border-[#315C7C] bg-[#315C7C] text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-base font-semibold tabular-nums">
                    <Clock3 size={16} className={isSelected ? "text-white/70" : "text-stone-400"} />
                    {session.startTime} - {session.endTime}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">
                    {session.className}
                  </span>
                  <span
                    className={[
                      "mt-1 block truncate text-xs",
                      isSelected ? "text-white/70" : "text-stone-500",
                    ].join(" ")}
                  >
                    {session.subject ?? "과목 미지정"} · {session.students.length}명
                  </span>
                </span>
                <span
                  className={[
                    "rounded-md px-2 py-1 text-xs font-semibold",
                    isSelected ? "bg-white/14 text-white" : "bg-stone-100 text-stone-500",
                  ].join(" ")}
                >
                  {session.students.length}명
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-1 py-2 text-sm leading-6 text-stone-500">
            이 날짜에 표시할 수업이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function AttendanceSummary({
  summary,
}: {
  summary: Record<AttendanceStatus, number>;
}) {
  return (
    <dl className="flex gap-2 overflow-x-auto pb-1 text-center text-xs sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
      {editableStatuses.map((status) => (
        <div key={status} className="min-w-16 rounded-md border border-stone-200 bg-stone-50 px-2 py-2">
          <dt className="truncate font-medium text-stone-500">
            {attendanceDisplayLabel(status)}
          </dt>
          <dd className="mt-1 text-base font-semibold text-stone-950">{summary[status]}</dd>
        </div>
      ))}
    </dl>
  );
}

function AttendanceOverviewPanel({ overview }: { overview: AttendanceOverview }) {
  const uncheckedCount = overview.counts.pending;
  const needsAttentionCount =
    overview.counts.absent + overview.counts.late + overview.counts.needs_check;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <div className="overflow-hidden border-y border-[#DED8CE] bg-white sm:rounded-lg sm:border sm:border-stone-200 sm:shadow-sm">
        <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#315C7C]">오늘 출석 요약</p>
              <h3 className="mt-1 text-lg font-semibold text-stone-950">
                연락 필요 {needsAttentionCount}명 · 체크 필요 {uncheckedCount}명
              </h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                수업 직후 확인할 학생과 아직 체크하지 않은 수업만 빠르게 봅니다.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-72">
              <OverviewMetric label="수업" value={`${overview.totalSessions}개`} />
              <OverviewMetric label="학생" value={`${overview.totalStudents}명`} />
              <OverviewMetric label="체크 필요" value={`${uncheckedCount}명`} />
            </dl>
          </div>
        </div>

        <div className="border-b border-stone-200 px-4 py-3 sm:px-5">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(["present", "late", "absent", "needs_check", "pending"] as AttendanceStatus[]).map(
              (status) => (
                <CompactStatusMetric
                  key={status}
                  status={status}
                  value={overview.counts[status]}
                />
              ),
            )}
          </dl>
        </div>

        <div>
          <div className="hidden grid-cols-[minmax(8rem,1fr)_5.5rem_repeat(4,4.75rem)] gap-2 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-500 md:grid sm:px-5">
            <span>수업</span>
            <span>시간</span>
            <span>출석</span>
            <span>지각</span>
            <span>결석</span>
            <span>체크 필요</span>
          </div>
          <div className="divide-y divide-stone-200">
            {overview.classSummaries.length > 0 ? (
              overview.classSummaries.map((summary) => (
                <div
                  key={summary.key}
                  className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(8rem,1fr)_5.5rem_repeat(4,4.75rem)] md:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">{summary.className}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      대상 {summary.studentCount}명
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-stone-700 md:text-base">
                    {summary.startTime}
                  </p>
                  <div className="flex flex-wrap gap-1.5 md:contents">
                    <StatusCount status="present" value={summary.counts.present} />
                    <StatusCount status="late" value={summary.counts.late} />
                    <StatusCount status="absent" value={summary.counts.absent} />
                    <StatusCount status="pending" value={summary.counts.pending} />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-sm leading-6 text-stone-600 sm:px-5">
                선택한 날짜에 표시할 수업이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-[#DED8CE] bg-white sm:rounded-lg sm:border sm:border-stone-200 sm:shadow-sm">
        <div className="border-b border-stone-200 px-4 py-4">
          <h3 className="text-sm font-semibold text-stone-950">오늘 연락 필요</h3>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            결석/지각은 팔로업 저장 또는 발송 상태를 함께 표시합니다.
          </p>
        </div>

        <div className="divide-y divide-stone-200">
          {overview.actionItems.length > 0 ? (
            overview.actionItems.map((item) => (
              <div key={item.key} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-950">{item.studentName}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.className} · {item.startTime}-{item.endTime}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                      attendanceStatusClass(item.status),
                    ].join(" ")}
                  >
                    {attendanceDisplayLabel(item.status)}
                  </span>
                </div>

                <p
                  className={[
                    "mt-3 rounded-md px-2 py-2 text-xs font-semibold",
                    contactStatusClass(item),
                  ].join(" ")}
                >
                  {contactStatusLabel(item)}
                </p>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm leading-6 text-stone-600">
              현재 연락 필요 학생이 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2">
      <dt className="font-medium text-stone-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function CompactStatusMetric({
  status,
  value,
}: {
  status: AttendanceStatus;
  value: number;
}) {
  return (
    <div
      className={[
        "flex min-h-9 items-center justify-between gap-2 rounded-md border px-2.5 text-sm",
        value > 0 ? compactStatusActiveClass(status) : "border-stone-200 bg-stone-50",
      ].join(" ")}
    >
      <dt className="min-w-0 truncate text-xs font-semibold text-stone-600">
        {attendanceDisplayLabel(status)}
      </dt>
      <dd className="shrink-0 text-base font-semibold tabular-nums text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function StatusCount({ status, value }: { status: AttendanceStatus; value: number }) {
  return (
    <span
      className={[
        "inline-flex min-h-8 w-fit items-center rounded-md px-2.5 text-xs font-semibold sm:w-auto sm:justify-center",
        attendanceStatusClass(status),
      ].join(" ")}
    >
      {attendanceDisplayLabel(status)} {value}
    </span>
  );
}

function attendanceDisplayLabel(status: AttendanceStatus) {
  if (status === "pending") {
    return "체크 필요";
  }

  return attendanceStatusLabels[status];
}

function AttendanceStudentRow({
  student,
  status,
  record,
  isSaving,
  saveError,
  onStatusChange,
}: {
  student: AttendanceStudent;
  status: AttendanceStatus;
  record: AttendanceRecordItem | undefined;
  isSaving: boolean;
  saveError: string;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(9rem,1fr)_8rem_minmax(24rem,1.4fr)] sm:items-center sm:px-5">
      <div className="min-w-0">
        <p className="text-base font-semibold text-stone-950">{student.name}</p>
        <p className="mt-1 text-xs text-stone-500">
          {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
            "학년 정보 없음"}{" "}
          · {student.maskedParentPhone}
        </p>
      </div>

      <div>
        <span
          className={[
            "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold",
            attendanceStatusClass(status),
          ].join(" ")}
        >
          {attendanceDisplayLabel(status)}
        </span>
        {record?.checkedAt ? (
          <p className="mt-1 text-xs text-stone-400">{formatTime(record.checkedAt)}</p>
        ) : null}
      </div>

      <div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {editableStatuses.map((nextStatus) => {
            const isSelected = status === nextStatus;

            return (
              <button
                key={nextStatus}
                type="button"
                disabled={isSaving}
                aria-pressed={isSelected}
                onClick={() => onStatusChange(nextStatus)}
                className={[
                  "flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition",
                  isSelected
                    ? "border-[#315C7C] bg-[#315C7C] text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
                  isSaving ? "cursor-wait opacity-60" : "",
                ].join(" ")}
              >
                {isSelected ? <Check size={14} /> : null}
                {attendanceDisplayLabel(nextStatus)}
              </button>
            );
          })}
        </div>

        {saveError ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {saveError}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function AttendanceFollowupPanel({
  className = "",
  duplicateWarning,
  followupSaveError,
  followupTarget,
  isDraftEdited,
  isFollowupSaved,
  isFollowupSaving,
  isMessageBlank,
  isMessageSending,
  isMessageSent,
  isPreviewError,
  isPreviewLoading,
  isPreviewReady,
  messageBody,
  messagePreview,
  messageSend,
  messageSendError,
  needsCheckStudents,
  selectedRecipientType,
  onDismiss,
  onMessageChange,
  onRecipientTypeChange,
  onRestorePreview,
  onSaveFollowup,
  onSendMessage,
}: {
  className?: string;
  duplicateWarning: string;
  followupSaveError: string;
  followupTarget: AttendanceFollowupTarget | null;
  isDraftEdited: boolean;
  isFollowupSaved: boolean;
  isFollowupSaving: boolean;
  isMessageBlank: boolean;
  isMessageSending: boolean;
  isMessageSent: boolean;
  isPreviewError: boolean;
  isPreviewLoading: boolean;
  isPreviewReady: boolean;
  messageBody: string;
  messagePreview: MessagePreviewState;
  messageSend: MessageSendState;
  messageSendError: string;
  needsCheckStudents: AttendanceStudent[];
  selectedRecipientType: MessageRecipientType;
  onDismiss: () => void;
  onMessageChange: (body: string) => void;
  onRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onRestorePreview: () => void;
  onSaveFollowup: () => void;
  onSendMessage: () => void;
}) {
  const canSaveFollowup = isPreviewReady && !isMessageBlank && !isFollowupSaving;
  const canSendMessage = isFollowupSaved && !isMessageSending;

  return (
    <section className={["rounded-lg border border-stone-200 bg-white shadow-sm xl:sticky xl:top-5", className].join(" ")}>
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[#315C7C]" size={18} />
          <h3 className="text-sm font-semibold text-stone-950">결석/지각 문자</h3>
          {followupTarget ? (
            <button
              type="button"
              onClick={onDismiss}
              className="ml-auto rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-600"
            >
              닫기
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          결석 또는 지각으로 체크하면 학부모 문자 초안이 여기서 바로 준비됩니다.
        </p>
      </div>

      {!followupTarget ? (
        <div className="space-y-3 p-4">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-600">
            <p className="font-semibold text-stone-900">대기 상태</p>
            <p className="mt-1">
              `확인 필요`는 바로 문자를 만들지 않습니다. 미도착 학생을 잠시 대기시킨
              뒤 결석이나 지각으로 확정하면 문자 초안이 생성됩니다.
            </p>
          </div>

          {needsCheckStudents.length > 0 ? (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm font-semibold text-orange-950">
                확인 필요 {needsCheckStudents.length}명
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {needsCheckStudents.map((student) => (
                  <span
                    key={student.id}
                    className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-orange-900"
                  >
                    {student.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-medium text-stone-500">선택 학생</p>
            <p className="mt-1 text-base font-semibold text-stone-950">
              {followupTarget.student.name}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {followupTarget.session.className} · {followupTarget.session.startTime}-
              {followupTarget.session.endTime}
            </p>
            <p className="mt-2 inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
              {reasonLabel(followupTarget.reason)} 안내
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-stone-800">수신자</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {messageRecipientTypes.map((recipientType) => {
                const needsStudentPhone = recipientType !== "parent";
                const isDisabled =
                  needsStudentPhone && !followupTarget.student.maskedStudentPhone;
                const isSelected = selectedRecipientType === recipientType;

                return (
                  <button
                    key={recipientType}
                    type="button"
                    disabled={isDisabled}
                    aria-pressed={isSelected}
                    onClick={() => onRecipientTypeChange(recipientType)}
                    className={[
                      "min-h-10 rounded-md border px-2 text-xs font-semibold transition",
                      isSelected
                        ? "border-[#315C7C] bg-[#315C7C] text-white"
                        : "border-stone-200 bg-white text-stone-700 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
                      isDisabled ? "cursor-not-allowed opacity-45" : "",
                    ].join(" ")}
                  >
                    {messageRecipientLabels[recipientType]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              학생 연락처: {followupTarget.student.maskedStudentPhone ?? "미등록"}
            </p>
          </fieldset>

          {duplicateWarning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <p>{duplicateWarning}</p>
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="attendance-followup-message"
                className="truncate text-sm font-semibold text-stone-800"
              >
                {isPreviewReady ? messagePreview.title : "문자 미리보기"}
              </label>
              <button
                type="button"
                aria-label="원문으로 되돌리기"
                title="원문으로 되돌리기"
                disabled={!isDraftEdited}
                onClick={onRestorePreview}
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <textarea
              id="attendance-followup-message"
              value={messageBody}
              onChange={(event) => onMessageChange(event.target.value)}
              disabled={!isPreviewReady}
              aria-busy={isPreviewLoading}
              placeholder={
                isPreviewLoading
                  ? "문자 초안을 불러오는 중입니다."
                  : "결석 또는 지각 학생을 선택하면 문자 초안이 표시됩니다."
              }
              rows={8}
              className="mt-2 min-h-36 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition disabled:bg-stone-50 disabled:text-stone-500 focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
            <p
              className={[
                "mt-2 text-xs",
                isMessageBlank ? "text-red-700" : "text-stone-500",
              ].join(" ")}
            >
              {messageBody.length}자 ·{" "}
              {isMessageBlank
                ? "본문이 비어 있으면 발송할 수 없습니다."
                : "발송 전 문구를 직접 수정할 수 있습니다."}
            </p>
          </div>

          <div
            className={[
              "rounded-md border p-3 text-sm leading-6",
              isPreviewError
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-stone-200 bg-stone-50 text-stone-700",
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              {isPreviewReady && !isPreviewError ? (
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#315C7C]" size={17} />
              ) : (
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
              )}
              <p>
                {isPreviewLoading
                  ? "학원별 문자 템플릿을 불러오는 중입니다."
                  : isPreviewError
                    ? messagePreview.error
                    : "저장하면 출석 기록과 팔로업 기록이 연결됩니다."}
              </p>
            </div>
          </div>

          {followupSaveError || isFollowupSaved ? (
            <div
              className={[
                "rounded-md border p-3 text-sm leading-6",
                followupSaveError
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                {followupSaveError ? (
                  <AlertCircle className="mt-0.5 shrink-0" size={17} />
                ) : (
                  <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
                )}
                <p>
                  {followupSaveError ||
                    "팔로업 기록을 저장했고 출석 기록과 연결했습니다."}
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSaveFollowup}
            onClick={onSaveFollowup}
            className={[
              "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
              canSaveFollowup
                ? "bg-[#315C7C] text-white hover:bg-[#244B67]"
                : "bg-stone-300 text-stone-600",
            ].join(" ")}
          >
            <Send size={17} />
            {isFollowupSaving
              ? "저장 중"
              : isFollowupSaved
                ? "저장 완료"
                : "팔로업 기록 저장"}
          </button>

          {isFollowupSaved ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled={!canSendMessage}
                onClick={onSendMessage}
                className={[
                  "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
                  canSendMessage
                    ? "bg-[#315C7C] text-white hover:bg-[#244B67]"
                    : "bg-[#C9D6E2] text-[#244B67]",
                ].join(" ")}
              >
                <Send size={17} />
                {isMessageSending
                  ? "발송 처리 중"
                  : isMessageSent
                    ? messageSend.dryRun
                      ? "dry-run 기록 완료"
                      : "문자 발송 완료"
                    : "문자 발송 테스트"}
              </button>

              {messageSendError || isMessageSent ? (
                <div
                  className={[
                    "rounded-md border p-3 text-sm leading-6",
                    messageSendError
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    {messageSendError ? (
                      <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    ) : (
                      <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
                    )}
                    <p>
                      {messageSendError ||
                        (messageSend.dryRun
                          ? "실제 문자는 보내지 않고 발송 로그만 저장했습니다."
                          : messageSend.message)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function buildAttendanceSessions(
  classes: AttendanceClass[],
  records: AttendanceRecordItem[],
  dayOfWeek: number,
): AttendanceSession[] {
  const sessionMap = new Map<string, AttendanceSession>();
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const studentsById = new Map<string, AttendanceStudent>();

  classes.forEach((classItem) => {
    classItem.students.forEach((student) => {
      studentsById.set(student.id, student);
    });
  });

  classes.forEach((classItem) => {
    classItem.students.forEach((student) => {
      getSortedActiveSchedules(student.schedules)
        .filter(
          (schedule) =>
            schedule.classId === classItem.id &&
            schedule.dayOfWeek === dayOfWeek &&
            (schedule.scheduleType === "regular_class" || schedule.scheduleType === "makeup"),
        )
        .forEach((schedule) => {
          addSessionStudent({
            sessionMap,
            classItem,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            student,
          });
        });
    });
  });

  records.forEach((record) => {
    const classItem = classMap.get(record.classId);

    if (!classItem) {
      return;
    }

    const session = ensureSession({
      sessionMap,
      classItem,
      startTime: record.scheduledStartTime,
      endTime: record.scheduledEndTime,
    });

    classItem.students.forEach((student) => {
      if (!session.students.some((item) => item.id === student.id)) {
        session.students.push(student);
      }
    });

    const recordStudent = studentsById.get(record.studentId);

    if (recordStudent && !session.students.some((item) => item.id === recordStudent.id)) {
      session.students.push(recordStudent);
    }
  });

  return Array.from(sessionMap.values())
    .map((session) => ({
      ...session,
      students: [...session.students].sort((first, second) =>
        first.name.localeCompare(second.name, "ko"),
      ),
    }))
    .sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.className.localeCompare(second.className, "ko"),
    );
}

function addSessionStudent({
  sessionMap,
  classItem,
  startTime,
  endTime,
  student,
}: {
  sessionMap: Map<string, AttendanceSession>;
  classItem: AttendanceClass;
  startTime: string;
  endTime: string;
  student: AttendanceStudent;
}) {
  const session = ensureSession({ sessionMap, classItem, startTime, endTime });

  if (!session.students.some((item) => item.id === student.id)) {
    session.students.push(student);
  }
}

function ensureSession({
  sessionMap,
  classItem,
  startTime,
  endTime,
}: {
  sessionMap: Map<string, AttendanceSession>;
  classItem: AttendanceClass;
  startTime: string;
  endTime: string;
}) {
  const key = getSessionKey(classItem.id, startTime, endTime);
  const current = sessionMap.get(key);

  if (current) {
    return current;
  }

  const session: AttendanceSession = {
    key,
    classId: classItem.id,
    className: classItem.name,
    subject: classItem.subject,
    gradeLabel: classItem.gradeLabel,
    startTime,
    endTime,
    students: [],
  };

  sessionMap.set(key, session);
  return session;
}

function summarizeSession(
  students: AttendanceStudent[],
  recordsByStudent: Map<string, AttendanceRecordItem>,
) {
  const summary: Record<AttendanceStatus, number> = {
    pending: 0,
    present: 0,
    late: 0,
    absent: 0,
    makeup: 0,
    excused: 0,
    needs_check: 0,
  };

  students.forEach((student) => {
    const status = normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status);
    summary[status] += 1;
  });

  return summary;
}

function buildAttendanceOverview(
  sessions: AttendanceSession[],
  records: AttendanceRecordItem[],
): AttendanceOverview {
  const counts = createEmptyAttendanceCounts();
  const actionItems: AttendanceActionItem[] = [];
  const classSummaries: AttendanceClassSummary[] = [];

  sessions.forEach((session) => {
    const recordsByStudent = new Map(
      records
        .filter(
          (record) =>
            record.classId === session.classId &&
            record.scheduledStartTime === session.startTime &&
            record.scheduledEndTime === session.endTime,
        )
        .map((record) => [record.studentId, record]),
    );
    const sessionCounts = summarizeSession(session.students, recordsByStudent);

    Object.keys(sessionCounts).forEach((key) => {
      const status = key as AttendanceStatus;
      counts[status] += sessionCounts[status];
    });

    classSummaries.push({
      key: session.key,
      className: session.className,
      startTime: session.startTime,
      endTime: session.endTime,
      studentCount: session.students.length,
      counts: sessionCounts,
    });

    session.students.forEach((student) => {
      const record = recordsByStudent.get(student.id);
      const status = normalizeAttendanceStatus(record?.status);

      if (
        !record ||
        (status !== "absent" && status !== "late" && status !== "needs_check")
      ) {
        return;
      }

      actionItems.push({
        key: `${session.key}:${student.id}:${status}`,
        studentName: student.name,
        className: session.className,
        startTime: session.startTime,
        endTime: session.endTime,
        status,
        followupId: record.followupId,
        followupStatus: record.followupStatus,
        followupSentAt: record.followupSentAt,
      });
    });
  });

  return {
    totalSessions: sessions.length,
    totalStudents: sessions.reduce((total, session) => total + session.students.length, 0),
    counts,
    actionItems: actionItems.sort(
      (first, second) =>
        statusActionSortValue(first.status) - statusActionSortValue(second.status) ||
        first.startTime.localeCompare(second.startTime) ||
        first.studentName.localeCompare(second.studentName, "ko"),
    ),
    classSummaries,
  };
}

function createEmptyAttendanceCounts(): Record<AttendanceStatus, number> {
  return {
    pending: 0,
    present: 0,
    late: 0,
    absent: 0,
    makeup: 0,
    excused: 0,
    needs_check: 0,
  };
}

function statusActionSortValue(status: AttendanceStatus) {
  const sortMap: Partial<Record<AttendanceStatus, number>> = {
    absent: 0,
    needs_check: 1,
    late: 2,
  };

  return sortMap[status] ?? 9;
}

function normalizeAttendanceStatus(status: string | undefined): AttendanceStatus {
  if (
    status === "present" ||
    status === "late" ||
    status === "absent" ||
    status === "makeup" ||
    status === "excused" ||
    status === "needs_check"
  ) {
    return status;
  }

  return "pending";
}

function mergeAttendanceRecord(
  current: AttendanceRecordItem[],
  nextRecord: AttendanceRecordItem,
) {
  const nextKey = getAttendanceUpdateKey({
    studentId: nextRecord.studentId,
    classId: nextRecord.classId,
    attendanceDate: nextRecord.attendanceDate,
    scheduledStartTime: nextRecord.scheduledStartTime,
    scheduledEndTime: nextRecord.scheduledEndTime,
  });
  const found = current.some(
    (record) =>
      getAttendanceUpdateKey({
        studentId: record.studentId,
        classId: record.classId,
        attendanceDate: record.attendanceDate,
        scheduledStartTime: record.scheduledStartTime,
        scheduledEndTime: record.scheduledEndTime,
      }) === nextKey,
  );

  if (!found) {
    return [...current, nextRecord];
  }

  return current.map((record) =>
    getAttendanceUpdateKey({
      studentId: record.studentId,
      classId: record.classId,
      attendanceDate: record.attendanceDate,
      scheduledStartTime: record.scheduledStartTime,
      scheduledEndTime: record.scheduledEndTime,
    }) === nextKey
      ? nextRecord
      : record,
  );
}

function getAttendanceUpdateKey({
  studentId,
  classId,
  attendanceDate,
  scheduledStartTime,
  scheduledEndTime,
}: {
  studentId: string;
  classId: string;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
}) {
  return `${attendanceDate}:${classId}:${studentId}:${scheduledStartTime}:${scheduledEndTime}`;
}

function getSessionKey(classId: string, startTime: string, endTime: string) {
  return `${classId}:${startTime}:${endTime}`;
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function formatAttendanceDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  const dayLabel = ["일", "월", "화", "수", "목", "금", "토"][getDayOfWeek(dateString)];

  return `${year}. ${month}. ${day}. ${dayLabel}`;
}

function shiftDate(dateString: string, dayOffset: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return date.toISOString().slice(0, 10);
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function createDefaultNote(status: AttendanceStatus) {
  if (status === "needs_check") {
    return "수업 시작 후 미도착. 결석 확정 전 확인 필요";
  }

  if (status === "late") {
    return "수업 시작 후 도착";
  }

  if (status === "absent") {
    return "결석 연락 필요";
  }

  if (status === "makeup") {
    return "보강 출석";
  }

  return null;
}

function attendanceStatusClass(status: AttendanceStatus) {
  const classes: Record<AttendanceStatus, string> = {
    pending: "bg-stone-100 text-stone-600",
    present: "bg-[#EAF1F8] text-[#315C7C]",
    late: "bg-amber-50 text-amber-800",
    absent: "bg-red-50 text-red-800",
    makeup: "bg-blue-50 text-blue-800",
    excused: "bg-purple-50 text-purple-800",
    needs_check: "bg-orange-50 text-orange-800",
  };

  return classes[status];
}

function compactStatusActiveClass(status: AttendanceStatus) {
  const classes: Record<AttendanceStatus, string> = {
    pending: "border-stone-300 bg-stone-100",
    present: "border-[#C9D6E2] bg-[#EAF1F8]",
    late: "border-amber-200 bg-amber-50",
    absent: "border-red-200 bg-red-50",
    makeup: "border-blue-200 bg-blue-50",
    excused: "border-purple-200 bg-purple-50",
    needs_check: "border-orange-200 bg-orange-50",
  };

  return classes[status];
}

function contactStatusLabel(item: AttendanceActionItem) {
  if (item.status === "needs_check") {
    return "확인 대기: 결석 확정 전입니다.";
  }

  if (!item.followupId) {
    return "연락 필요: 아직 문자 기록이 없습니다.";
  }

  if (item.followupStatus === "sent") {
    return item.followupSentAt
      ? `발송 기록 완료: ${formatTime(item.followupSentAt)}`
      : "발송 기록 완료";
  }

  if (item.followupStatus === "failed") {
    return "발송 실패: 다시 확인이 필요합니다.";
  }

  return "초안 저장됨: 발송 확인이 필요합니다.";
}

function contactStatusClass(item: AttendanceActionItem) {
  if (item.status === "needs_check") {
    return "bg-orange-50 text-orange-900";
  }

  if (!item.followupId) {
    return "bg-red-50 text-red-900";
  }

  if (item.followupStatus === "sent") {
    return "bg-[#EAF1F8] text-[#244B67]";
  }

  if (item.followupStatus === "failed") {
    return "bg-red-50 text-red-900";
  }

  return "bg-amber-50 text-amber-900";
}

function reasonLabel(reasonId: FollowupReason) {
  return followupReasons.find((reason) => reason.id === reasonId)?.label ?? reasonId;
}

function getRecentDuplicateWarning({
  followups,
  reason,
}: {
  followups: NonNullable<FollowupHistoryResponse["followups"]>;
  reason: FollowupReason;
}) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const recentFollowup = followups.find((followup) => {
    if (followup.reason !== reason) {
      return false;
    }

    const createdAt = new Date(followup.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt < oneDay;
  });

  if (!recentFollowup) {
    return "";
  }

  return `최근 24시간 안에 같은 학생에게 ${reasonLabel(reason)} 기록이 있습니다. 발송 전 중복 여부를 확인해 주세요.`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
