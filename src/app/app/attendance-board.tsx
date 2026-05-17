"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getMessageLengthMetrics } from "@/lib/message-length";
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
  selectedDate: string;
  onDateChange: (date: string) => void;
  initialRecords: AttendanceRecordItem[];
  onRecordsChange?: (records: AttendanceRecordItem[]) => void;
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

type AttendanceOverview = {
  totalSessions: number;
  totalStudents: number;
  counts: Record<AttendanceStatus, number>;
};

type AttendanceFilter = "all" | "unchecked" | "attention";

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
const exceptionStatuses: AttendanceStatus[] = ["late", "absent", "needs_check", "makeup"];
const attendanceFilterLabels: Record<AttendanceFilter, string> = {
  all: "전체",
  unchecked: "미체크만",
  attention: "연락 필요만",
};

export function AttendanceBoard({
  academyName,
  teacherName,
  classes,
  selectedDate,
  onDateChange,
  initialRecords,
  onRecordsChange,
}: AttendanceBoardProps) {
  const [attendanceRecords, setAttendanceRecords] = useState(initialRecords);
  const attendanceRecordsRef = useRef(initialRecords);
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>("all");
  const [expandedExceptionKey, setExpandedExceptionKey] = useState("");
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
  const filteredStudents = selectedSession
    ? selectedSession.students.filter((student) => {
        const status = normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status);

        if (attendanceFilter === "unchecked") {
          return status === "pending";
        }

        if (attendanceFilter === "attention") {
          return status === "absent" || status === "late" || status === "needs_check";
        }

        return true;
      })
    : [];
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

  const applyAttendanceRecords = useCallback((nextRecords: AttendanceRecordItem[]) => {
    attendanceRecordsRef.current = nextRecords;
    setAttendanceRecords(nextRecords);
    onRecordsChange?.(nextRecords);
  }, [onRecordsChange]);

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

        const nextRecords = payload.records ?? [];
        applyAttendanceRecords(nextRecords);
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
  }, [applyAttendanceRecords, selectedDate]);

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

    const previousRecords = attendanceRecordsRef.current;
    const optimisticRecord = createOptimisticAttendanceRecord({
      previousRecords,
      studentId: student.id,
      classId: selectedSession.classId,
      attendanceDate: selectedDate,
      scheduledStartTime: selectedSession.startTime,
      scheduledEndTime: selectedSession.endTime,
      status,
    });

    applyAttendanceRecords(mergeAttendanceRecord(previousRecords, optimisticRecord));

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
      const nextRecords = mergeAttendanceRecord(attendanceRecordsRef.current, savedRecord);

      applyAttendanceRecords(nextRecords);
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
      applyAttendanceRecords(previousRecords);
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
      applyAttendanceRecords(
        attendanceRecordsRef.current.map((record) =>
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
      applyAttendanceRecords(
        attendanceRecordsRef.current.map((record) =>
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
      <section className="border-b border-[#DED8CE] bg-transparent px-1 pb-3 sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-4 sm:shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#315C7C]">{academyName}</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              반별 출석부
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {teacherName}님, 수업을 선택하고 도착한 학생만 빠르게 체크합니다.
            </p>
          </div>

          <AttendanceDateControl value={selectedDate} onChange={onDateChange} />
        </div>
      </section>

      <AttendanceOverviewStrip overview={overview} />

      <section className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <SessionList
          sessions={sessions}
          selectedSessionKey={selectedSession?.key ?? ""}
          records={dateAttendanceRecords}
          loadState={loadState.status}
          onSelect={(sessionKey) => {
            setSelectedSessionKey(sessionKey);
            setAttendanceFilter("all");
            setExpandedExceptionKey("");
          }}
        />

        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3 sm:px-5">
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

            {selectedSession ? (
              <AttendanceFilterBar
                value={attendanceFilter}
                summary={summary}
                totalCount={selectedSession.students.length}
                onChange={setAttendanceFilter}
              />
            ) : null}

            {loadState.status === "error" ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
                {loadState.error}
              </div>
            ) : null}
          </div>

          {selectedSession ? (
            <div>
              <div className="hidden grid-cols-[minmax(16rem,1fr)_5.5rem_7rem] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-500 sm:grid sm:px-5">
                <span>학생</span>
                <span>도착</span>
                <span>상태</span>
              </div>

              <div className="divide-y divide-stone-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
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
                    const isSaved =
                      saveState.key === updateKey && saveState.status === "saved";
                    const saveError =
                      saveState.key === updateKey && saveState.status === "error"
                        ? saveState.error
                        : "";
                    const isExceptionOpen = expandedExceptionKey === updateKey;

                    return (
                      <AttendanceStudentRow
                        key={student.id}
                        student={student}
                        status={status}
                        record={record}
                        isSaving={isSaving}
                        isSaved={isSaved}
                        saveError={saveError}
                        isExceptionOpen={isExceptionOpen}
                        onToggleException={() =>
                          setExpandedExceptionKey((current) =>
                            current === updateKey ? "" : updateKey,
                          )
                        }
                        onStatusChange={(nextStatus) => {
                          setExpandedExceptionKey("");
                          handleStatusChange(student, nextStatus);
                        }}
                      />
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-sm leading-6 text-stone-500 sm:px-5">
                    현재 필터에 해당하는 학생이 없습니다.
                  </div>
                )}
              </div>

              {summary ? (
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-stone-200 bg-white/95 px-4 py-2 text-sm shadow-[0_-8px_20px_rgba(28,25,23,0.06)] backdrop-blur sm:px-5">
                  <span className="font-medium text-stone-600">이 수업 미체크</span>
                  <span className="rounded-full bg-stone-950 px-2.5 py-1 text-xs font-semibold text-white">
                    {summary.pending}명
                  </span>
                </div>
              ) : null}
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

function AttendanceOverviewStrip({ overview }: { overview: AttendanceOverview }) {
  const uncheckedCount = overview.counts.pending;
  const needsAttentionCount =
    overview.counts.absent + overview.counts.late + overview.counts.needs_check;

  return (
    <section className="grid grid-cols-4 overflow-hidden rounded-lg border border-stone-200 bg-white text-center shadow-sm">
      <CompactOverviewItem label="수업" value={`${overview.totalSessions}개`} />
      <CompactOverviewItem label="학생" value={`${overview.totalStudents}명`} />
      <CompactOverviewItem label="미체크" value={`${uncheckedCount}명`} />
      <CompactOverviewItem
        label="연락 필요"
        value={`${needsAttentionCount}명`}
      />
    </section>
  );
}

function CompactOverviewItem({
  className = "",
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={["border-r border-stone-200 px-3 py-3 last:border-r-0", className].join(" ")}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-stone-950">{value}</p>
    </div>
  );
}

function SessionList({
  sessions,
  selectedSessionKey,
  records,
  loadState,
  onSelect,
}: {
  sessions: AttendanceSession[];
  selectedSessionKey: string;
  records: AttendanceRecordItem[];
  loadState: "idle" | "loading" | "error";
  onSelect: (sessionKey: string) => void;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-950">오늘 수업</h3>
          {loadState === "loading" ? (
            <Loader2 size={16} className="animate-spin text-stone-400" />
          ) : (
            <span className="text-xs font-medium text-stone-500">{sessions.length}개</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-stone-100">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isSelected = session.key === selectedSessionKey;
            const progress = getSessionProgress(session, records);

            return (
              <button
                key={session.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(session.key)}
                className={[
                  "grid min-h-[4.25rem] w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition",
                  isSelected
                    ? "bg-[#EAF1F8] text-stone-950"
                    : "bg-white text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-9 items-center justify-center rounded-full text-sm font-semibold",
                    isSelected ? "bg-[#315C7C] text-white" : "bg-stone-100 text-stone-500",
                  ].join(" ")}
                >
                  {getClassInitial(session.className)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {session.className}
                  </span>
                  <span
                    className={[
                      "mt-0.5 flex items-center gap-1 truncate text-xs",
                      isSelected ? "text-[#315C7C]" : "text-stone-500",
                    ].join(" ")}
                  >
                    <Clock3 size={13} className="shrink-0" />
                    {session.startTime} · {session.subject ?? "과목 미지정"} ·{" "}
                    {session.students.length}명
                  </span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-xs font-semibold",
                      progress.pending > 0
                        ? "bg-stone-950 text-white"
                        : "bg-stone-100 text-stone-500",
                    ].join(" ")}
                  >
                    {progress.pending} 미체크
                  </span>
                  {progress.attention > 0 ? (
                    <span
                      className={[
                        "rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-800",
                      ].join(" ")}
                    >
                      {progress.attention} 연락
                    </span>
                  ) : null}
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

function AttendanceFilterBar({
  value,
  summary,
  totalCount,
  onChange,
}: {
  value: AttendanceFilter;
  summary: Record<AttendanceStatus, number> | null;
  totalCount: number;
  onChange: (filter: AttendanceFilter) => void;
}) {
  const attentionCount = summary
    ? summary.absent + summary.late + summary.needs_check
    : 0;
  const counts: Record<AttendanceFilter, number> = {
    all: totalCount,
    unchecked: summary?.pending ?? 0,
    attention: attentionCount,
  };

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="출석 학생 필터">
      {(Object.keys(attendanceFilterLabels) as AttendanceFilter[]).map((filter) => {
        const isSelected = value === filter;

        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(filter)}
            className={[
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
              isSelected
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
            ].join(" ")}
          >
            {attendanceFilterLabels[filter]}
            <span
              className={[
                "rounded-full px-1.5 py-0.5 tabular-nums",
                isSelected ? "bg-white/15 text-white" : "bg-stone-100 text-stone-500",
              ].join(" ")}
            >
              {counts[filter]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AttendanceSummary({
  summary,
}: {
  summary: Record<AttendanceStatus, number>;
}) {
  return (
    <dl className="grid grid-cols-5 divide-x divide-stone-200 rounded-md border border-stone-200 bg-stone-50 text-center text-xs">
      {editableStatuses.map((status) => (
        <div key={status} className="min-w-0 px-2 py-2">
          <dt className="truncate font-medium text-stone-500">
            {attendanceDisplayLabel(status)}
          </dt>
          <dd className="mt-1 text-base font-semibold text-stone-950">{summary[status]}</dd>
        </div>
      ))}
    </dl>
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
  isSaved,
  isExceptionOpen,
  saveError,
  onToggleException,
  onStatusChange,
}: {
  student: AttendanceStudent;
  status: AttendanceStatus;
  record: AttendanceRecordItem | undefined;
  isSaving: boolean;
  isSaved: boolean;
  isExceptionOpen: boolean;
  saveError: string;
  onToggleException: () => void;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  const isPresent = status === "present";
  const isPending = status === "pending";
  const isExceptionStatus = !isPresent && !isPending;

  return (
    <article className="px-4 py-3 sm:px-5">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600">
          {getStudentInitial(student.name)}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-stone-950 sm:text-base">
              {student.name}
            </p>
            {isExceptionStatus ? (
              <span
                className={[
                  "inline-flex min-h-5 items-center rounded-full px-2 text-[11px] font-semibold",
                  attendanceStatusClass(status),
                ].join(" ")}
              >
                {attendanceDisplayLabel(status)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
              "학년 정보 없음"}{" "}
            · {student.maskedParentPhone}
          </p>
          <AttendanceSaveStatus
            isSaving={isSaving}
            isSaved={isSaved}
            checkedAt={record?.checkedAt}
          />
        </div>

        <div className="grid justify-items-end gap-1.5">
          <AttendanceArrivalToggle
            isPresent={isPresent}
            isSaving={isSaving}
            onToggle={() => onStatusChange(isPresent ? "pending" : "present")}
          />
          <button
            type="button"
            disabled={isSaving}
            aria-expanded={isExceptionOpen}
            onClick={onToggleException}
            className={[
              "min-h-7 rounded-full border px-2.5 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
              isExceptionOpen
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
              isSaving ? "cursor-wait opacity-60" : "",
            ].join(" ")}
          >
            예외
          </button>
        </div>
      </div>

      {isExceptionOpen ? (
        <div
          className="mt-3 flex gap-1.5 overflow-x-auto pl-12"
          role="group"
          aria-label={`${student.name} 출석 예외 상태 변경`}
        >
          {exceptionStatuses.map((nextStatus) => {
            const isSelected = status === nextStatus;

            return (
              <button
                key={nextStatus}
                type="button"
                disabled={isSaving}
                aria-pressed={isSelected}
                onClick={() => onStatusChange(nextStatus)}
                className={[
                  "flex min-h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
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
      ) : null}

      {saveError ? (
        <p className="mt-2 flex items-start gap-1.5 pl-12 text-xs leading-5 text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {saveError}
        </p>
      ) : null}
    </article>
  );
}

function AttendanceArrivalToggle({
  isPresent,
  isSaving,
  onToggle,
}: {
  isPresent: boolean;
  isSaving: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPresent}
      disabled={isSaving}
      onClick={onToggle}
      className={[
        "inline-flex min-h-8 w-[3.25rem] items-center rounded-full border p-0.5 transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        isPresent
          ? "justify-end border-[#315C7C] bg-[#315C7C]"
          : "justify-start border-stone-300 bg-stone-100 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
        isSaving ? "cursor-wait opacity-60" : "",
      ].join(" ")}
    >
      <span className="sr-only">{isPresent ? "도착을 미체크로 변경" : "도착으로 변경"}</span>
      <span
        className={[
          "flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition",
          isPresent ? "text-[#315C7C]" : "text-stone-400",
        ].join(" ")}
      >
        {isPresent ? <Check size={14} /> : null}
      </span>
    </button>
  );
}

function AttendanceSaveStatus({
  isSaving,
  isSaved,
  checkedAt,
}: {
  isSaving: boolean;
  isSaved: boolean;
  checkedAt: string | null | undefined;
}) {
  if (isSaving) {
    return <p className="text-[11px] font-medium text-stone-400">저장 중</p>;
  }

  if (isSaved) {
    return <p className="text-[11px] font-medium text-[#315C7C]">저장됨</p>;
  }

  if (checkedAt) {
    return <p className="text-[11px] text-stone-400">{formatTime(checkedAt)}</p>;
  }

  return <p className="text-[11px] text-stone-400">대기</p>;
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
  const messageMetrics = getMessageLengthMetrics(messageBody);
  const canSaveFollowup =
    isPreviewReady && !isMessageBlank && !messageMetrics.isOverLimit && !isFollowupSaving;
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
                isMessageBlank || messageMetrics.isOverLimit
                  ? "text-red-700"
                  : messageMetrics.transportType === "lms"
                    ? "text-amber-700"
                    : "text-stone-500",
              ].join(" ")}
            >
              {messageMetrics.charCount}자 · {messageMetrics.byteCount}byte ·{" "}
              {isMessageBlank
                ? "본문이 비어 있으면 발송할 수 없습니다."
                : messageMetrics.isOverLimit
                  ? "2000byte를 초과해 저장할 수 없습니다."
                  : messageMetrics.transportType === "lms"
                    ? "LMS로 발송될 수 있습니다."
                    : "SMS 예상"}
              {messageMetrics.hasEmoji ? " · 이모지/특수문자 확인 필요" : ""}
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

function getSessionProgress(session: AttendanceSession, records: AttendanceRecordItem[]) {
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
  const summary = summarizeSession(session.students, recordsByStudent);

  return {
    pending: summary.pending,
    attention: summary.absent + summary.late + summary.needs_check,
  };
}

function getClassInitial(className: string) {
  return className.trim().charAt(0) || "수";
}

function getStudentInitial(studentName: string) {
  return studentName.trim().charAt(0) || "학";
}

function buildAttendanceOverview(
  sessions: AttendanceSession[],
  records: AttendanceRecordItem[],
): AttendanceOverview {
  const counts = createEmptyAttendanceCounts();

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
  });

  return {
    totalSessions: sessions.length,
    totalStudents: sessions.reduce((total, session) => total + session.students.length, 0),
    counts,
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

function createOptimisticAttendanceRecord({
  previousRecords,
  studentId,
  classId,
  attendanceDate,
  scheduledStartTime,
  scheduledEndTime,
  status,
}: {
  previousRecords: AttendanceRecordItem[];
  studentId: string;
  classId: string;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: AttendanceStatus;
}): AttendanceRecordItem {
  const updateKey = getAttendanceUpdateKey({
    studentId,
    classId,
    attendanceDate,
    scheduledStartTime,
    scheduledEndTime,
  });
  const currentRecord = previousRecords.find(
    (record) =>
      getAttendanceUpdateKey({
        studentId: record.studentId,
        classId: record.classId,
        attendanceDate: record.attendanceDate,
        scheduledStartTime: record.scheduledStartTime,
        scheduledEndTime: record.scheduledEndTime,
      }) === updateKey,
  );
  const checkedAt = status === "pending" ? null : new Date().toISOString();

  return {
    id: currentRecord?.id ?? `optimistic:${updateKey}`,
    studentId,
    classId,
    teacherId: currentRecord?.teacherId ?? null,
    attendanceDate,
    scheduledStartTime,
    scheduledEndTime,
    status,
    checkedAt,
    arrivedAt: hasArrivedAttendanceStatus(status) ? checkedAt : null,
    note: createDefaultNote(status),
    followupId: currentRecord?.followupId ?? null,
    followupStatus: currentRecord?.followupStatus ?? null,
    followupSentAt: currentRecord?.followupSentAt ?? null,
  };
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

function hasArrivedAttendanceStatus(status: AttendanceStatus) {
  return status === "present" || status === "late" || status === "makeup";
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
