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
import {
  fetchAttendanceRecords,
  saveAttendanceRecord,
  type AttendanceRecordItem as AttendanceClientRecordItem,
} from "@/lib/client/attendance";
import {
  createBulkAttendanceFollowups,
  createFollowup,
  fetchFollowupHistory,
} from "@/lib/client/followups";
import { sendFollowupMessage } from "@/lib/client/message-send";
import { fetchMessagePreview } from "@/lib/client/message-preview";
import {
  followupReasons,
  getDefaultFollowupTemplate,
  type FollowupReason,
} from "@/lib/followup-templates";
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

export type AttendanceRecordItem = AttendanceClientRecordItem;

type AttendanceBoardProps = {
  academyName: string;
  teacherName: string;
  role: string;
  allowAssistantSend: boolean;
  classes: AttendanceClass[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  initialRecords: AttendanceRecordItem[];
  onRecordsChange?: (records: AttendanceRecordItem[]) => void;
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

type BulkAttendanceReason = Extract<FollowupReason, "late" | "absence">;

type BulkAttendanceTarget = {
  reason: BulkAttendanceReason;
  session: AttendanceSession;
  students: AttendanceStudent[];
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

type BulkSubmitState = {
  status: "idle" | "saving" | "saved" | "sending" | "sent" | "error";
  message: string;
  error: string;
  dryRun: boolean;
  savedFollowupCount: number;
  messageLogCount: number;
};

const editableStatuses: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "needs_check",
  "makeup",
];
const exceptionStatuses: AttendanceStatus[] = ["absent", "needs_check", "makeup"];
const attendanceFilterLabels: Record<AttendanceFilter, string> = {
  all: "전체",
  unchecked: "체크 필요만",
  attention: "연락 필요만",
};

export function AttendanceBoard({
  academyName,
  teacherName,
  role,
  allowAssistantSend,
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
  const [bulkTarget, setBulkTarget] = useState<BulkAttendanceTarget | null>(null);
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState<string[]>([]);
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState("");
  const [bulkRecipientType, setBulkRecipientType] =
    useState<MessageRecipientType>("parent");
  const [selectedWorkbenchStudentId, setSelectedWorkbenchStudentId] = useState("");
  const [bulkSubmit, setBulkSubmit] = useState<BulkSubmitState>({
    status: "idle",
    message: "",
    error: "",
    dryRun: true,
    savedFollowupCount: 0,
    messageLogCount: 0,
  });
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
  const lateStudents = selectedSession
    ? selectedSession.students.filter(
        (student) => normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status) === "late",
      )
    : [];
  const absentStudents = selectedSession
    ? selectedSession.students.filter(
        (student) =>
          normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status) === "absent",
      )
    : [];
  const selectedBulkStudents = bulkTarget
    ? bulkTarget.students.filter((student) => bulkSelectedStudentIds.includes(student.id))
    : [];
  const effectiveBulkRecipientType =
    selectedBulkStudents.some((student) => !student.maskedStudentPhone) &&
    bulkRecipientType !== "parent"
      ? "parent"
      : bulkRecipientType;
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
  const selectedWorkbenchStudent =
    filteredStudents.find((student) => student.id === selectedWorkbenchStudentId) ??
    filteredStudents[0];

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
        const payload = await fetchAttendanceRecords(selectedDate, controller.signal);
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
        const payload = await fetchMessagePreview(
          {
            studentId: target.student.id,
            reason: target.reason,
          },
          controller.signal,
        );

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
        const payload = await fetchFollowupHistory(target.student.id, controller.signal);

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
      const payload = await saveAttendanceRecord({
        studentId: student.id,
        classId: selectedSession.classId,
        attendanceDate: selectedDate,
        scheduledStartTime: selectedSession.startTime,
        scheduledEndTime: selectedSession.endTime,
        status,
        note: createDefaultNote(status),
      });

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
      const payload = await createFollowup({
        studentId: followupTarget.student.id,
        reason: followupTarget.reason,
        messageBody: bodyToSave,
        attendanceRecordId: followupTarget.record.id,
        recipientType: effectiveRecipientType,
      });

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
            : "연락 기록을 저장하지 못했습니다.",
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
      const payload = await sendFollowupMessage(savedFollowupId);

      setMessageSend({
        followupId: savedFollowupId,
        status: "sent",
        dryRun: payload.dryRun ?? true,
        message:
          payload.message ??
          (payload.dryRun ? "테스트 발송을 완료했습니다." : "문자를 발송했습니다."),
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

  function handleStartBulkAttendance(reason: BulkAttendanceReason) {
    if (!selectedSession) {
      return;
    }

    const students = reason === "late" ? lateStudents : absentStudents;

    if (students.length === 0) {
      return;
    }

    setFollowupTarget(null);
    setDuplicateWarning("");
    setBulkTarget({ reason, session: selectedSession, students });
    setBulkSelectedStudentIds(students.map((student) => student.id));
    setBulkMessageTemplate(getDefaultFollowupTemplate(reason));
    setBulkRecipientType("parent");
    setBulkSubmit({
      status: "idle",
      message: "",
      error: "",
      dryRun: true,
      savedFollowupCount: 0,
      messageLogCount: 0,
    });
  }

  function handleToggleBulkStudent(studentId: string) {
    setBulkSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
    setBulkSubmit((current) => ({ ...current, status: "idle", message: "", error: "" }));
  }

  async function handleSubmitBulkAttendance(sendNow: boolean) {
    if (!bulkTarget || selectedBulkStudents.length === 0) {
      return;
    }

    setBulkSubmit({
      status: sendNow ? "sending" : "saving",
      message: "",
      error: "",
      dryRun: true,
      savedFollowupCount: 0,
      messageLogCount: 0,
    });

    try {
      const payload = await createBulkAttendanceFollowups({
        reason: bulkTarget.reason,
        studentIds: selectedBulkStudents.map((student) => student.id),
        classId: bulkTarget.session.classId,
        attendanceDate: selectedDate,
        scheduledStartTime: bulkTarget.session.startTime,
        scheduledEndTime: bulkTarget.session.endTime,
        recipientType: effectiveBulkRecipientType,
        messageTemplate: bulkMessageTemplate,
        sendNow,
      });
      const recordsPayload = await fetchAttendanceRecords(selectedDate);

      applyAttendanceRecords(recordsPayload.records ?? attendanceRecordsRef.current);
      setBulkSubmit({
        status: sendNow ? "sent" : "saved",
        message: sendNow
          ? payload.dryRun
            ? "실제 문자는 보내지 않고 학생별 발송 로그를 저장했습니다."
            : "선택 학생에게 문자를 발송했습니다."
          : "선택 학생의 연락 기록을 저장했습니다.",
        error: "",
        dryRun: payload.dryRun,
        savedFollowupCount: payload.savedFollowupCount,
        messageLogCount: payload.messageLogCount,
      });
    } catch (error) {
      setBulkSubmit({
        status: "error",
        message: "",
        error:
          error instanceof Error
            ? error.message
            : "일괄 문자 처리를 완료하지 못했습니다.",
        dryRun: true,
        savedFollowupCount: 0,
        messageLogCount: 0,
      });
    }
  }

  const assistantSendBlockedMessage =
    role === "assistant" && !allowAssistantSend
      ? "보조 선생님은 현재 테스트 발송 권한이 없습니다. 연락 기록 저장은 가능하며, 발송은 원장/관리자에게 요청하세요."
      : "";

  function handleOpenWorkbenchFollowup(student: AttendanceStudent) {
    if (!selectedSession) {
      return;
    }

    const record = recordsByStudent.get(student.id);
    const status = normalizeAttendanceStatus(record?.status);
    const followupReason = getFollowupReasonForAttendanceStatus(status);

    if (!record || !followupReason) {
      return;
    }

    setBulkTarget(null);
    setBulkSelectedStudentIds([]);
    setDuplicateWarning("");
    setFollowupTarget({
      key: `${record.id}:${followupReason}`,
      student,
      session: selectedSession,
      record,
      reason: followupReason,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 sm:space-y-5 xl:max-w-[90rem]">
      <div className="hidden lg:block">
        <AttendanceWorkbench
          academyName={academyName}
          teacherName={teacherName}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          sessions={sessions}
          selectedSession={selectedSession}
          selectedSessionKey={selectedSession?.key ?? ""}
          dateAttendanceRecords={dateAttendanceRecords}
          loadState={loadState}
          overview={overview}
          summary={summary}
          attendanceFilter={attendanceFilter}
          filteredStudents={filteredStudents}
          recordsByStudent={recordsByStudent}
          saveState={saveState}
          selectedWorkbenchStudent={selectedWorkbenchStudent}
          bulkTarget={bulkTarget}
          selectedBulkStudents={selectedBulkStudents}
          bulkSelectedStudentIds={bulkSelectedStudentIds}
          bulkMessageTemplate={bulkMessageTemplate}
          bulkSubmit={bulkSubmit}
          effectiveBulkRecipientType={effectiveBulkRecipientType}
          lateStudents={lateStudents}
          absentStudents={absentStudents}
          followupTarget={followupTarget}
          duplicateWarning={duplicateWarning}
          effectiveRecipientType={effectiveRecipientType}
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
          followupSaveError={followupSaveError}
          messageSendError={messageSendError}
          needsCheckStudents={needsCheckStudents}
          sendBlockedMessage={assistantSendBlockedMessage}
          onSelectSession={(sessionKey) => {
            setSelectedSessionKey(sessionKey);
            setAttendanceFilter("all");
            setExpandedExceptionKey("");
            setBulkTarget(null);
            setBulkSelectedStudentIds([]);
            setSelectedWorkbenchStudentId("");
          }}
          onFilterChange={setAttendanceFilter}
          onStartBulk={handleStartBulkAttendance}
          onClearBulk={() => {
            setBulkTarget(null);
            setBulkSelectedStudentIds([]);
          }}
          onToggleBulkStudent={handleToggleBulkStudent}
          onSelectStudent={(studentId) => setSelectedWorkbenchStudentId(studentId)}
          onStatusChange={handleStatusChange}
          onOpenStudentFollowup={handleOpenWorkbenchFollowup}
          onDismissBulk={() => {
            setBulkTarget(null);
            setBulkSelectedStudentIds([]);
          }}
          onBulkMessageTemplateChange={(body) => {
            setBulkMessageTemplate(body);
            setBulkSubmit((current) => ({
              ...current,
              status: "idle",
              message: "",
              error: "",
            }));
          }}
          onBulkRecipientTypeChange={setBulkRecipientType}
          onSubmitBulk={handleSubmitBulkAttendance}
          onDismissFollowup={() => {
            setDuplicateWarning("");
            setFollowupTarget(null);
          }}
          onMessageChange={(body) => setMessageDraft({ key: followupTargetKey, body })}
          onRecipientTypeChange={setSelectedRecipientType}
          onRestorePreview={handleRestorePreview}
          onSaveFollowup={handleSaveAttendanceFollowup}
          onSendMessage={handleSendAttendanceMessage}
        />
      </div>

      <div className="lg:hidden">
      <section className="border-b border-[#DED8CE] bg-transparent px-1 pb-2 sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-4 sm:shadow-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#315C7C] sm:text-sm">{academyName}</p>
            <h2 className="mt-0.5 text-xl font-semibold leading-tight text-stone-950 sm:mt-1 sm:text-3xl">
              반별 출석부
            </h2>
            <p className="mt-1 text-sm leading-5 text-stone-600 sm:leading-6">
              {teacherName}님, 수업을 고르고 도착만 빠르게 체크합니다.
            </p>
          </div>

          <AttendanceDateControl value={selectedDate} onChange={onDateChange} />
        </div>
      </section>

      <AttendanceOverviewStrip overview={overview} />

      <section className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[18rem_minmax(0,1.15fr)_24rem] 2xl:grid-cols-[20rem_minmax(0,1.25fr)_26rem]">
        <SessionList
          sessions={sessions}
          selectedSessionKey={selectedSession?.key ?? ""}
          records={dateAttendanceRecords}
          loadState={loadState.status}
          onSelect={(sessionKey) => {
            setSelectedSessionKey(sessionKey);
            setAttendanceFilter("all");
            setExpandedExceptionKey("");
            setBulkTarget(null);
            setBulkSelectedStudentIds([]);
          }}
        />

        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-[#315C7C] sm:size-[18px]" />
                  <h3 className="text-sm font-semibold text-stone-950 sm:text-base">
                    {selectedSession?.className ?? "선택된 수업 없음"}
                  </h3>
                </div>
                {selectedSession ? (
                  <p className="mt-0.5 text-xs text-stone-500 sm:mt-1 sm:text-sm">
                    {selectedSession.startTime} - {selectedSession.endTime} ·{" "}
                    {selectedSession.subject ?? "과목 미지정"}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-stone-500 sm:mt-1 sm:text-sm">
                    선택한 날짜에 수업이 없습니다. 다른 날짜를 보거나 관리 탭에서 수업 시간을 등록해 주세요.
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

            {selectedSession ? (
              <AttendanceBulkActionBar
                lateCount={lateStudents.length}
                absentCount={absentStudents.length}
                activeReason={bulkTarget?.reason ?? null}
                selectedCount={selectedBulkStudents.length}
                onStart={handleStartBulkAttendance}
                onClear={() => {
                  setBulkTarget(null);
                  setBulkSelectedStudentIds([]);
                }}
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
              <div className="hidden grid-cols-[minmax(18rem,1fr)_6.25rem_8rem] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-500 sm:grid sm:px-5 xl:grid-cols-[minmax(20rem,1fr)_7rem_8.5rem]">
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
                    const isBulkSelectable =
                      bulkTarget !== null &&
                      status === attendanceStatusForBulkReason(bulkTarget.reason);
                    const isBulkSelected = bulkSelectedStudentIds.includes(student.id);

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
                        isBulkSelectable={isBulkSelectable}
                        isBulkSelected={isBulkSelected}
                        bulkReason={bulkTarget?.reason ?? null}
                        onToggleBulkSelection={() => handleToggleBulkStudent(student.id)}
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
                    현재 필터에 해당하는 학생이 없습니다. 필터를 `전체`로 바꾸거나 학생의 출석 상태를 확인해 주세요.
                  </div>
                )}
              </div>

              {summary ? (
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-stone-200 bg-white/95 px-4 py-2 text-sm shadow-[0_-8px_20px_rgba(28,25,23,0.06)] backdrop-blur sm:px-5">
                  <span className="font-medium text-stone-600">이 수업 체크 필요</span>
                  <span className="rounded-full bg-stone-950 px-2.5 py-1 text-xs font-semibold text-white">
                    {summary.pending}명
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-600">
              선택한 날짜에 수업 기록이나 주간 스케줄이 없습니다. 관리 탭에서 반 공통 수업 시간을 등록하면 출석부에 표시됩니다.
            </div>
          )}
        </section>

        {bulkTarget ? (
          <BulkAttendanceFollowupPanel
            className="lg:col-span-2 xl:col-span-1"
            bulkTarget={bulkTarget}
            messageTemplate={bulkMessageTemplate}
            selectedRecipientType={effectiveBulkRecipientType}
            selectedStudents={selectedBulkStudents}
            submitState={bulkSubmit}
            sendBlockedMessage={assistantSendBlockedMessage}
            onDismiss={() => {
              setBulkTarget(null);
              setBulkSelectedStudentIds([]);
            }}
            onMessageTemplateChange={(body) => {
              setBulkMessageTemplate(body);
              setBulkSubmit((current) => ({
                ...current,
                status: "idle",
                message: "",
                error: "",
              }));
            }}
            onRecipientTypeChange={setBulkRecipientType}
            onSubmit={handleSubmitBulkAttendance}
          />
        ) : (
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
            sendBlockedMessage={assistantSendBlockedMessage}
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
        )}
      </section>
      </div>
    </div>
  );
}

function AttendanceWorkbench({
  academyName,
  teacherName,
  selectedDate,
  onDateChange,
  sessions,
  selectedSession,
  selectedSessionKey,
  dateAttendanceRecords,
  loadState,
  overview,
  summary,
  attendanceFilter,
  filteredStudents,
  recordsByStudent,
  saveState,
  selectedWorkbenchStudent,
  bulkTarget,
  selectedBulkStudents,
  bulkSelectedStudentIds,
  bulkMessageTemplate,
  bulkSubmit,
  effectiveBulkRecipientType,
  lateStudents,
  absentStudents,
  followupTarget,
  duplicateWarning,
  effectiveRecipientType,
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
  followupSaveError,
  messageSendError,
  needsCheckStudents,
  sendBlockedMessage,
  onSelectSession,
  onFilterChange,
  onStartBulk,
  onClearBulk,
  onToggleBulkStudent,
  onSelectStudent,
  onStatusChange,
  onOpenStudentFollowup,
  onDismissBulk,
  onBulkMessageTemplateChange,
  onBulkRecipientTypeChange,
  onSubmitBulk,
  onDismissFollowup,
  onMessageChange,
  onRecipientTypeChange,
  onRestorePreview,
  onSaveFollowup,
  onSendMessage,
}: {
  academyName: string;
  teacherName: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  sessions: AttendanceSession[];
  selectedSession: AttendanceSession | undefined;
  selectedSessionKey: string;
  dateAttendanceRecords: AttendanceRecordItem[];
  loadState: { status: "idle" | "loading" | "error"; error: string };
  overview: AttendanceOverview;
  summary: Record<AttendanceStatus, number> | null;
  attendanceFilter: AttendanceFilter;
  filteredStudents: AttendanceStudent[];
  recordsByStudent: Map<string, AttendanceRecordItem>;
  saveState: { key: string; status: "idle" | "saving" | "saved" | "error"; error: string };
  selectedWorkbenchStudent: AttendanceStudent | undefined;
  bulkTarget: BulkAttendanceTarget | null;
  selectedBulkStudents: AttendanceStudent[];
  bulkSelectedStudentIds: string[];
  bulkMessageTemplate: string;
  bulkSubmit: BulkSubmitState;
  effectiveBulkRecipientType: MessageRecipientType;
  lateStudents: AttendanceStudent[];
  absentStudents: AttendanceStudent[];
  followupTarget: AttendanceFollowupTarget | null;
  duplicateWarning: string;
  effectiveRecipientType: MessageRecipientType;
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
  followupSaveError: string;
  messageSendError: string;
  needsCheckStudents: AttendanceStudent[];
  sendBlockedMessage: string;
  onSelectSession: (sessionKey: string) => void;
  onFilterChange: (filter: AttendanceFilter) => void;
  onStartBulk: (reason: BulkAttendanceReason) => void;
  onClearBulk: () => void;
  onToggleBulkStudent: (studentId: string) => void;
  onSelectStudent: (studentId: string) => void;
  onStatusChange: (student: AttendanceStudent, status: AttendanceStatus) => void;
  onOpenStudentFollowup: (student: AttendanceStudent) => void;
  onDismissBulk: () => void;
  onBulkMessageTemplateChange: (body: string) => void;
  onBulkRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onSubmitBulk: (sendNow: boolean) => void;
  onDismissFollowup: () => void;
  onMessageChange: (body: string) => void;
  onRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onRestorePreview: () => void;
  onSaveFollowup: () => void;
  onSendMessage: () => void;
}) {
  const selectedRecord = selectedWorkbenchStudent
    ? recordsByStudent.get(selectedWorkbenchStudent.id)
    : undefined;
  const selectedStatus = normalizeAttendanceStatus(selectedRecord?.status);

  return (
    <section className="space-y-3">
      <header className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#315C7C]">{academyName}</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-950">출석부 장부</h2>
            <p className="mt-1 text-sm leading-5 text-stone-600">
              {teacherName}님, 수업을 선택하고 학생 row에서 출석·지각·결석을 바로 처리합니다.
            </p>
          </div>
          <div className="w-72 shrink-0">
            <AttendanceDateControl value={selectedDate} onChange={onDateChange} />
          </div>
        </div>
      </header>

      <div className="grid min-h-[42rem] gap-3 lg:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:grid-cols-[17rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
        <aside className="space-y-3">
          <AttendanceOverviewStrip overview={overview} />
          <SessionList
            sessions={sessions}
            selectedSessionKey={selectedSessionKey}
            records={dateAttendanceRecords}
            loadState={loadState.status}
            onSelect={onSelectSession}
          />
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 bg-[#FBFAF7] px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[#315C7C]" />
                  <h3 className="truncate text-base font-semibold text-stone-950">
                    {selectedSession?.className ?? "선택된 수업 없음"}
                  </h3>
                </div>
                {selectedSession ? (
                  <p className="mt-1 text-sm text-stone-500">
                    {selectedSession.startTime}-{selectedSession.endTime} ·{" "}
                    {selectedSession.subject ?? "과목 미지정"} ·{" "}
                    {selectedSession.students.length}명
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">
                    이 날짜에 수업이 없습니다. 날짜나 수업 시간 등록 상태를 확인해 주세요.
                  </p>
                )}
              </div>
              {summary ? <AttendanceSummary summary={summary} /> : null}
            </div>

            {selectedSession ? (
              <>
                <AttendanceFilterBar
                  value={attendanceFilter}
                  summary={summary}
                  totalCount={selectedSession.students.length}
                  onChange={onFilterChange}
                />
                <AttendanceBulkActionBar
                  lateCount={lateStudents.length}
                  absentCount={absentStudents.length}
                  activeReason={bulkTarget?.reason ?? null}
                  selectedCount={selectedBulkStudents.length}
                  onStart={onStartBulk}
                  onClear={onClearBulk}
                />
              </>
            ) : null}

            {loadState.status === "error" ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
                {loadState.error}
              </div>
            ) : null}
          </div>

          {selectedSession ? (
            <AttendanceLedgerTable
              students={filteredStudents}
              session={selectedSession}
              selectedDate={selectedDate}
              recordsByStudent={recordsByStudent}
              saveState={saveState}
              selectedStudentId={selectedWorkbenchStudent?.id ?? ""}
              bulkTarget={bulkTarget}
              selectedBulkStudentIds={bulkSelectedStudentIds}
              onSelectStudent={onSelectStudent}
              onToggleBulkStudent={onToggleBulkStudent}
              onStatusChange={onStatusChange}
            />
          ) : (
            <div className="p-8 text-center text-sm leading-6 text-stone-500">
              선택한 날짜에 수업 기록이나 주간 스케줄이 없습니다.
            </div>
          )}
        </section>

        <aside className="min-w-0">
          {bulkTarget ? (
            <BulkAttendanceFollowupPanel
              bulkTarget={bulkTarget}
              messageTemplate={bulkMessageTemplate}
              selectedRecipientType={effectiveBulkRecipientType}
              selectedStudents={selectedBulkStudents}
              submitState={bulkSubmit}
              sendBlockedMessage={sendBlockedMessage}
              onDismiss={onDismissBulk}
              onMessageTemplateChange={onBulkMessageTemplateChange}
              onRecipientTypeChange={onBulkRecipientTypeChange}
              onSubmit={onSubmitBulk}
            />
          ) : followupTarget ? (
            <AttendanceFollowupPanel
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
              sendBlockedMessage={sendBlockedMessage}
              onDismiss={onDismissFollowup}
              onMessageChange={onMessageChange}
              onRecipientTypeChange={onRecipientTypeChange}
              onRestorePreview={onRestorePreview}
              onSaveFollowup={onSaveFollowup}
              onSendMessage={onSendMessage}
            />
          ) : (
            <WorkbenchStudentPanel
              student={selectedWorkbenchStudent}
              record={selectedRecord}
              status={selectedStatus}
              session={selectedSession}
              onOpenFollowup={onOpenStudentFollowup}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function AttendanceLedgerTable({
  students,
  session,
  selectedDate,
  recordsByStudent,
  saveState,
  selectedStudentId,
  bulkTarget,
  selectedBulkStudentIds,
  onSelectStudent,
  onToggleBulkStudent,
  onStatusChange,
}: {
  students: AttendanceStudent[];
  session: AttendanceSession;
  selectedDate: string;
  recordsByStudent: Map<string, AttendanceRecordItem>;
  saveState: { key: string; status: "idle" | "saving" | "saved" | "error"; error: string };
  selectedStudentId: string;
  bulkTarget: BulkAttendanceTarget | null;
  selectedBulkStudentIds: string[];
  onSelectStudent: (studentId: string) => void;
  onToggleBulkStudent: (studentId: string) => void;
  onStatusChange: (student: AttendanceStudent, status: AttendanceStatus) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm leading-6 text-stone-500">
        현재 필터에 해당하는 학생이 없습니다. 필터를 전체로 바꾸거나 출석 상태를 확인해 주세요.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[54rem] w-full border-separate border-spacing-0 text-left">
        <thead className="bg-white text-xs font-semibold text-stone-500">
          <tr>
            <th className="w-10 border-b border-stone-200 px-3 py-2">선택</th>
            <th className="border-b border-stone-200 px-3 py-2">학생</th>
            <th className="border-b border-stone-200 px-3 py-2">수업시간</th>
            <th className="border-b border-stone-200 px-3 py-2">출석 상태</th>
            <th className="border-b border-stone-200 px-3 py-2">연락 상태</th>
            <th className="border-b border-stone-200 px-3 py-2">메모</th>
            <th className="border-b border-stone-200 px-3 py-2 text-right">처리</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const record = recordsByStudent.get(student.id);
            const status = normalizeAttendanceStatus(record?.status);
            const updateKey = getAttendanceUpdateKey({
              studentId: student.id,
              classId: session.classId,
              attendanceDate: selectedDate,
              scheduledStartTime: session.startTime,
              scheduledEndTime: session.endTime,
            });
            const isSaving = saveState.key === updateKey && saveState.status === "saving";
            const isSelected = selectedStudentId === student.id;
            const isBulkSelectable =
              bulkTarget !== null &&
              status === attendanceStatusForBulkReason(bulkTarget.reason);
            const isBulkSelected = selectedBulkStudentIds.includes(student.id);

            return (
              <tr
                key={student.id}
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => onSelectStudent(student.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectStudent(student.id);
                  }
                }}
                className={[
                  "group cursor-pointer border-b border-stone-100 transition focus:outline-none",
                  isSelected ? "bg-[#F8FBFD]" : "bg-white hover:bg-stone-50",
                ].join(" ")}
              >
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <input
                    type="checkbox"
                    checked={isBulkSelected}
                    disabled={!isBulkSelectable}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onToggleBulkStudent(student.id)}
                    className="size-4 accent-[#315C7C] disabled:opacity-30"
                    aria-label={`${student.name} 일괄 문자 대상 선택`}
                  />
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">
                      {getStudentInitial(student.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-950">
                        {student.name}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                          "학교/학년 미등록"}{" "}
                        · {student.maskedParentPhone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle text-sm tabular-nums text-stone-700">
                  {session.startTime}-{session.endTime}
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <StatusLozenge status={status} />
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <ContactLozenge record={record} status={status} />
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">
                    {record?.note ? "메모 있음" : "메모 없음"}
                  </span>
                </td>
                <td className="border-b border-stone-100 px-3 py-2.5 align-middle">
                  <div className="flex justify-end gap-1">
                    <LedgerStatusButton
                      label="출석"
                      active={status === "present"}
                      disabled={isSaving}
                      onClick={() => onStatusChange(student, status === "present" ? "pending" : "present")}
                    />
                    <LedgerStatusButton
                      label="지각"
                      active={status === "late"}
                      disabled={isSaving}
                      tone="amber"
                      onClick={() => onStatusChange(student, status === "late" ? "pending" : "late")}
                    />
                    <LedgerStatusButton
                      label="결석"
                      active={status === "absent"}
                      disabled={isSaving}
                      tone="red"
                      onClick={() => onStatusChange(student, status === "absent" ? "pending" : "absent")}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LedgerStatusButton({
  label,
  active,
  disabled,
  tone = "blue",
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  tone?: "blue" | "amber" | "red";
  onClick: () => void;
}) {
  const activeClass =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-[#315C7C] bg-[#EAF1F8] text-[#244B67]";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={[
        "min-h-8 rounded-md border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        active ? activeClass : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
        disabled ? "cursor-wait opacity-60" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatusLozenge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold",
        attendanceStatusClass(status),
      ].join(" ")}
    >
      {attendanceDisplayLabel(status)}
    </span>
  );
}

function ContactLozenge({
  record,
  status,
}: {
  record: AttendanceRecordItem | undefined;
  status: AttendanceStatus;
}) {
  if (record?.followupStatus === "sent") {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700">
        문자 완료
      </span>
    );
  }

  if (status === "late" || status === "absent") {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full bg-amber-50 px-2.5 text-xs font-semibold text-amber-800">
        연락 필요
      </span>
    );
  }

  if (status === "needs_check") {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full bg-orange-50 px-2.5 text-xs font-semibold text-orange-800">
        확인 필요
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-6 items-center rounded-full bg-stone-100 px-2.5 text-xs font-semibold text-stone-500">
      대기
    </span>
  );
}

function WorkbenchStudentPanel({
  student,
  record,
  status,
  session,
  onOpenFollowup,
}: {
  student: AttendanceStudent | undefined;
  record: AttendanceRecordItem | undefined;
  status: AttendanceStatus;
  session: AttendanceSession | undefined;
  onOpenFollowup: (student: AttendanceStudent) => void;
}) {
  const canOpenFollowup =
    Boolean(student && record && getFollowupReasonForAttendanceStatus(status));

  return (
    <section className="sticky top-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-[#FBFAF7] px-4 py-3">
        <h3 className="text-sm font-semibold text-stone-950">작업 패널</h3>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          학생 row를 선택하면 문자, 메모, 연락 상태를 확인합니다.
        </p>
      </div>

      {!student ? (
        <div className="p-4 text-sm leading-6 text-stone-500">
          학생을 선택하면 상세 정보가 표시됩니다.
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs font-medium text-stone-500">선택 학생</p>
            <h4 className="mt-1 text-xl font-semibold text-stone-950">{student.name}</h4>
            <p className="mt-1 text-sm text-stone-500">
              {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                "학교/학년 미등록"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-medium text-stone-500">출석 상태</p>
              <div className="mt-2">
                <StatusLozenge status={status} />
              </div>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-medium text-stone-500">연락 상태</p>
              <div className="mt-2">
                <ContactLozenge record={record} status={status} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-medium text-stone-500">오늘 수업</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {session?.className ?? "선택된 수업 없음"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {session ? `${session.startTime}-${session.endTime}` : "시간 정보 없음"}
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-medium text-stone-500">연락/메모</p>
            <p className="mt-1 text-sm leading-6 text-stone-700">
              {record?.note ?? "등록된 메모가 없습니다."}
            </p>
          </div>

          <button
            type="button"
            disabled={!canOpenFollowup}
            onClick={() => {
              if (student) {
                onOpenFollowup(student);
              }
            }}
            className={[
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
              canOpenFollowup
                ? "bg-[#315C7C] text-white hover:bg-[#244B67]"
                : "bg-stone-200 text-stone-500",
            ].join(" ")}
          >
            <MessageSquareText size={17} />
            문자 작성
          </button>
        </div>
      )}
    </section>
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
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-1.5 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-2">
        <button
          type="button"
          aria-label="전날 출석부 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 sm:min-h-11"
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
            className="flex min-h-10 w-full items-center gap-2 rounded-md border border-stone-300 bg-white px-2.5 text-left text-sm font-semibold text-stone-900 transition hover:border-[#315C7C] hover:bg-[#EAF1F8] focus:border-[#315C7C] focus:outline-none focus:ring-2 focus:ring-[#C9D6E2] sm:min-h-11 sm:px-3"
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
          className="flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 sm:min-h-11"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:mt-2 sm:gap-2">
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
      className="min-h-8 rounded-md border border-stone-200 bg-stone-50 px-2 text-xs font-semibold text-stone-600 transition hover:border-[#C9D6E2] hover:bg-[#EAF1F8] hover:text-[#315C7C] sm:min-h-9"
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
      <CompactOverviewItem label="체크 필요" value={`${uncheckedCount}명`} />
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
    <div className={["border-r border-stone-200 px-2 py-2 last:border-r-0 sm:px-3 sm:py-3", className].join(" ")}>
      <p className="text-[11px] font-medium text-stone-500 sm:text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-950 sm:mt-1 sm:text-base">{value}</p>
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
      <div className="border-b border-stone-200 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-950">오늘 수업</h3>
          {loadState === "loading" ? (
            <Loader2 size={16} className="animate-spin text-stone-400" />
          ) : (
            <span className="text-xs font-medium text-stone-500">{sessions.length}개</span>
          )}
        </div>
      </div>

      <div className="max-h-40 divide-y divide-stone-100 overflow-y-auto overscroll-contain sm:max-h-none">
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
                  "grid min-h-[3.55rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 border-l-4 px-2.5 py-2 text-left transition sm:min-h-[4.25rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-4 sm:py-3",
                  isSelected
                    ? "border-l-[#315C7C] bg-[#F8FBFD] text-stone-950"
                    : "border-l-transparent bg-white text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-full text-xs font-semibold sm:size-9 sm:text-sm",
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
                      "mt-0.5 flex items-center gap-1 truncate text-[11px] sm:text-xs",
                      isSelected ? "text-[#315C7C]" : "text-stone-500",
                    ].join(" ")}
                  >
                    <Clock3 size={13} className="shrink-0" />
                    {session.startTime} · {session.subject ?? "과목"} ·{" "}
                    {session.students.length}명
                  </span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[11px] font-semibold sm:px-2 sm:py-1 sm:text-xs",
                      progress.pending > 0
                        ? "bg-stone-950 text-white"
                        : "bg-stone-100 text-stone-500",
                    ].join(" ")}
                  >
                    {progress.pending} 체크 필요
                  </span>
                  {progress.attention > 0 ? (
                    <span
                      className={[
                        "rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-800 sm:px-2 sm:py-1 sm:text-xs",
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
            이 날짜에 표시할 수업이 없습니다. 다른 날짜를 선택하거나 수업 시간 등록 상태를 확인해 주세요.
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
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:mt-4 sm:gap-2" aria-label="출석 학생 필터">
      {(Object.keys(attendanceFilterLabels) as AttendanceFilter[]).map((filter) => {
        const isSelected = value === filter;

        return (
          <button
            key={filter}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(filter)}
            className={[
              "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2] sm:min-h-9 sm:px-3",
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

function AttendanceBulkActionBar({
  lateCount,
  absentCount,
  activeReason,
  selectedCount,
  onStart,
  onClear,
}: {
  lateCount: number;
  absentCount: number;
  activeReason: BulkAttendanceReason | null;
  selectedCount: number;
  onStart: (reason: BulkAttendanceReason) => void;
  onClear: () => void;
}) {
  if (lateCount === 0 && absentCount === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-2 sm:mt-3 sm:px-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-semibold text-stone-600">
          일괄 문자
        </span>
        <button
          type="button"
          disabled={lateCount === 0}
          aria-pressed={activeReason === "late"}
          onClick={() => onStart("late")}
          className={[
            "min-h-8 rounded-full border px-2.5 text-xs font-semibold transition",
            activeReason === "late"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-stone-200 bg-white text-stone-700 hover:border-amber-200 hover:bg-amber-50",
            lateCount === 0 ? "cursor-not-allowed opacity-45" : "",
          ].join(" ")}
        >
          지각 {lateCount}명 선택
        </button>
        <button
          type="button"
          disabled={absentCount === 0}
          aria-pressed={activeReason === "absence"}
          onClick={() => onStart("absence")}
          className={[
            "min-h-8 rounded-full border px-2.5 text-xs font-semibold transition",
            activeReason === "absence"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-stone-200 bg-white text-stone-700 hover:border-red-200 hover:bg-red-50",
            absentCount === 0 ? "cursor-not-allowed opacity-45" : "",
          ].join(" ")}
        >
          결석 {absentCount}명 선택
        </button>
        {activeReason ? (
          <>
            <span className="ml-auto rounded-full bg-stone-950 px-2 py-1 text-[11px] font-semibold text-white">
              {selectedCount}명 선택됨
            </span>
            <button
              type="button"
              onClick={onClear}
              className="min-h-8 rounded-full border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              해제
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function AttendanceSummary({
  summary,
}: {
  summary: Record<AttendanceStatus, number>;
}) {
  return (
    <dl className="grid grid-cols-5 divide-x divide-stone-200 rounded-md border border-stone-200 bg-stone-50 text-center text-[11px] sm:text-xs">
      {editableStatuses.map((status) => (
        <div key={status} className="min-w-0 px-1.5 py-1.5 sm:px-2 sm:py-2">
          <dt className="truncate font-medium text-stone-500">
            {attendanceDisplayLabel(status)}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-stone-950 sm:mt-1 sm:text-base">{summary[status]}</dd>
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
  isBulkSelectable,
  isBulkSelected,
  bulkReason,
  saveError,
  onToggleBulkSelection,
  onToggleException,
  onStatusChange,
}: {
  student: AttendanceStudent;
  status: AttendanceStatus;
  record: AttendanceRecordItem | undefined;
  isSaving: boolean;
  isSaved: boolean;
  isExceptionOpen: boolean;
  isBulkSelectable: boolean;
  isBulkSelected: boolean;
  bulkReason: BulkAttendanceReason | null;
  saveError: string;
  onToggleBulkSelection: () => void;
  onToggleException: () => void;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  const isPresent = status === "present";
  const isLate = status === "late";
  const isPending = status === "pending";
  const isExceptionStatus = !isPresent && !isPending;

  return (
    <article className="px-3 py-2.5 sm:px-5 sm:py-3 xl:py-2.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          {isBulkSelectable ? (
            <label className="flex size-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 transition hover:border-[#315C7C] hover:bg-[#EAF1F8]">
              <input
                type="checkbox"
                checked={isBulkSelected}
                onChange={onToggleBulkSelection}
                className="size-4 accent-[#315C7C]"
                aria-label={`${student.name} ${bulkReason === "late" ? "지각" : "결석"} 문자 대상 선택`}
              />
            </label>
          ) : null}
          <span className="flex size-8 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600 sm:size-9 sm:text-sm">
            {getStudentInitial(student.name)}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <p className="truncate text-sm font-semibold text-stone-950">
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
              "학년 정보 없음"}
            <span className="hidden sm:inline"> · {student.maskedParentPhone}</span>
          </p>
          <AttendanceSaveStatus
            isSaving={isSaving}
            isSaved={isSaved}
            checkedAt={record?.checkedAt}
          />
        </div>

        <div className="flex items-center justify-end gap-1 xl:gap-1.5">
          <AttendanceArrivalToggle
            isPresent={isPresent}
            isSaving={isSaving}
            onToggle={() => onStatusChange(isPresent ? "pending" : "present")}
          />
          <button
            type="button"
            disabled={isSaving}
            aria-pressed={isLate}
            onClick={() => onStatusChange(isLate ? "pending" : "late")}
            className={[
              "inline-flex min-h-8 items-center rounded-full border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
              isLate
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-900",
              isSaving ? "cursor-wait opacity-60" : "",
            ].join(" ")}
          >
            지각
          </button>
          <button
            type="button"
            disabled={isSaving}
            aria-expanded={isExceptionOpen}
            onClick={onToggleException}
            className={[
              "inline-flex min-h-8 items-center rounded-full border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
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
          className="mt-2 flex gap-1.5 overflow-x-auto pl-10 sm:mt-3 sm:pl-12"
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
                  "flex min-h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2] sm:min-h-8 sm:px-2.5",
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
        <p className="mt-2 flex items-start gap-1.5 pl-10 text-xs leading-5 text-red-700 sm:pl-12">
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
        "inline-flex min-h-8 w-12 items-center rounded-full border p-0.5 transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        isPresent
          ? "justify-end border-[#315C7C] bg-[#315C7C]"
          : "justify-start border-stone-300 bg-stone-100 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
        isSaving ? "cursor-wait opacity-60" : "",
      ].join(" ")}
    >
      <span className="sr-only">{isPresent ? "도착을 체크 필요로 변경" : "도착으로 변경"}</span>
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

function BulkAttendanceFollowupPanel({
  className = "",
  bulkTarget,
  messageTemplate,
  selectedRecipientType,
  selectedStudents,
  submitState,
  sendBlockedMessage,
  onDismiss,
  onMessageTemplateChange,
  onRecipientTypeChange,
  onSubmit,
}: {
  className?: string;
  bulkTarget: BulkAttendanceTarget;
  messageTemplate: string;
  selectedRecipientType: MessageRecipientType;
  selectedStudents: AttendanceStudent[];
  submitState: BulkSubmitState;
  sendBlockedMessage: string;
  onDismiss: () => void;
  onMessageTemplateChange: (body: string) => void;
  onRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onSubmit: (sendNow: boolean) => void;
}) {
  const messageMetrics = getMessageLengthMetrics(messageTemplate);
  const isMessageBlank = messageTemplate.trim().length === 0;
  const isBusy = submitState.status === "saving" || submitState.status === "sending";
  const canSave =
    selectedStudents.length > 0 &&
    !isMessageBlank &&
    !messageMetrics.isOverLimit &&
    !isBusy;
  const canSend = canSave && !sendBlockedMessage;
  const selectedStudentPhoneMissing = selectedStudents.some(
    (student) => !student.maskedStudentPhone,
  );

  return (
    <section className={["rounded-lg border border-stone-200 bg-white shadow-sm xl:sticky xl:top-5", className].join(" ")}>
      <div className="border-b border-stone-200 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[#315C7C]" size={18} />
          <h3 className="text-sm font-semibold text-stone-950">
            {reasonLabel(bulkTarget.reason)} 일괄 문자
          </h3>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-600"
          >
            닫기
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          선택 학생마다 이름 변수를 치환해 개별 연락 기록을 저장합니다.
        </p>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-stone-950">
              선택 학생 {selectedStudents.length}명
            </p>
            <span
              className={[
                "rounded-full px-2 py-1 text-xs font-semibold",
                bulkTarget.reason === "late"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-800",
              ].join(" ")}
            >
              {reasonLabel(bulkTarget.reason)}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {bulkTarget.session.className} · {bulkTarget.session.startTime}-
            {bulkTarget.session.endTime}
          </p>
          <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {selectedStudents.length > 0 ? (
              selectedStudents.map((student) => (
                <span
                  key={student.id}
                  className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700"
                >
                  {student.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-red-700">
                왼쪽 학생 목록에서 문자 대상 학생을 선택해 주세요.
              </span>
            )}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">수신자</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {messageRecipientTypes.map((recipientType) => {
              const needsStudentPhone = recipientType !== "parent";
              const isDisabled = needsStudentPhone && selectedStudentPhoneMissing;
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
          {selectedStudentPhoneMissing ? (
            <p className="mt-2 text-xs leading-5 text-stone-500">
              학생 연락처가 없는 대상이 있어 학부모 수신으로 처리합니다.
            </p>
          ) : null}
        </fieldset>

        <div>
          <label
            htmlFor="bulk-attendance-followup-message"
            className="text-sm font-semibold text-stone-800"
          >
            공통 문자 본문
          </label>
          <textarea
            id="bulk-attendance-followup-message"
            value={messageTemplate}
            onChange={(event) => onMessageTemplateChange(event.target.value)}
            rows={8}
            className="mt-2 min-h-36 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
          <p
            className={[
              "mt-2 text-xs leading-5",
              isMessageBlank || messageMetrics.isOverLimit
                ? "text-red-700"
                : messageMetrics.transportType === "lms"
                  ? "text-amber-700"
                  : "text-stone-500",
            ].join(" ")}
          >
            공통 본문 {messageMetrics.charCount}자 · {messageMetrics.byteCount}byte ·{" "}
            {isMessageBlank
              ? "본문이 비어 있으면 저장할 수 없습니다."
              : messageMetrics.isOverLimit
                ? "2000byte를 초과해 저장할 수 없습니다."
                : messageMetrics.transportType === "lms"
                  ? "학생별 치환 후 LMS로 발송될 수 있습니다."
                  : "학생별 이름으로 치환됩니다."}
          </p>
        </div>

        <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[#315C7C]" size={17} />
            <p>
              `{"{{studentName}}"}` 변수는 학생별 이름으로 바뀝니다. 예:{" "}
              {selectedStudents[0]?.name ?? "학생명"}
            </p>
          </div>
        </div>

        {sendBlockedMessage ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <p>{sendBlockedMessage}</p>
            </div>
          </div>
        ) : null}

        {submitState.status === "error" ||
        submitState.status === "saved" ||
        submitState.status === "sent" ? (
          <div
            className={[
              "rounded-md border p-3 text-sm leading-6",
              submitState.status === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]",
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              {submitState.status === "error" ? (
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
              ) : (
                <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
              )}
              <p>
                {submitState.error ||
                  `${submitState.message} 연락 기록 ${submitState.savedFollowupCount}건${
                    submitState.messageLogCount > 0
                      ? ` · 발송 로그 ${submitState.messageLogCount}건`
                      : ""
                  }`}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSubmit(false)}
            className={[
              "flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
              canSave
                ? "bg-[#315C7C] text-white hover:bg-[#244B67]"
                : "bg-stone-300 text-stone-600",
            ].join(" ")}
          >
            <Send size={17} />
            {submitState.status === "saving" ? "저장 중" : "기록 저장"}
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => onSubmit(true)}
            className={[
              "flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
              canSend
                ? "bg-stone-950 text-white hover:bg-stone-800"
                : "bg-[#C9D6E2] text-[#244B67]",
            ].join(" ")}
          >
            <Send size={17} />
            {submitState.status === "sending"
              ? "발송 처리 중"
              : submitState.status === "sent"
                ? submitState.dryRun
                  ? "테스트 발송 완료"
                  : "문자 발송 완료"
                : "테스트 발송"}
          </button>
        </div>
      </div>
    </section>
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
  sendBlockedMessage,
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
  sendBlockedMessage: string;
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
  const canSendMessage = isFollowupSaved && !isMessageSending && !sendBlockedMessage;

  return (
    <section className={["rounded-lg border border-stone-200 bg-white shadow-sm xl:sticky xl:top-5", className].join(" ")}>
      <div className="border-b border-stone-200 px-3 py-2.5 sm:px-4 sm:py-3">
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
          결석/지각 선택 시 문자 초안이 준비됩니다.
        </p>
      </div>

      {!followupTarget ? (
        <div className="space-y-3 p-3 sm:p-4">
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
        <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
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
                    : "저장하면 출석 기록과 연락 기록이 연결됩니다."}
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
                    "연락 기록을 저장했고 출석 기록과 연결했습니다."}
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
                : "기록 저장"}
          </button>

          {isFollowupSaved ? (
            <div className="space-y-2">
              {sendBlockedMessage ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    <p>{sendBlockedMessage}</p>
                  </div>
                </div>
              ) : null}

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
                      ? "테스트 발송 완료"
                      : "문자 발송 완료"
                    : "테스트 발송"}
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

function attendanceStatusForBulkReason(reason: BulkAttendanceReason): AttendanceStatus {
  return reason === "late" ? "late" : "absent";
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
  followups: Array<{ reason: string; createdAt: string }>;
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
