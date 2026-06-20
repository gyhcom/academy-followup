"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  UserCheck,
  X,
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
  onNavigate?: (view: "operations" | "students" | "management") => void;
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
type AttendanceBoardView = "calendar" | "today" | "ledger";
type AttendanceDayDetailTab = "classes" | "students" | "attention";
type AttendanceDayStatusFilter =
  | "all"
  | "present"
  | "late"
  | "absent"
  | "pending"
  | "needs_check";

type AttendanceDayStudentRow = {
  id: string;
  student: AttendanceStudent;
  session: AttendanceSession;
  status: AttendanceStatus;
  record: AttendanceRecordItem | undefined;
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
  onNavigate,
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
  const [attendanceReloadKey, setAttendanceReloadKey] = useState(0);
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
  const canUseCalendarView = role === "owner" || role === "manager";
  const [attendanceView, setAttendanceView] = useState<AttendanceBoardView>(
    canUseCalendarView ? "calendar" : "today",
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    normalizeMonthValue(selectedDate),
  );
  const [dayDetailTab, setDayDetailTab] =
    useState<AttendanceDayDetailTab>("classes");
  const [drawerStudentRow, setDrawerStudentRow] =
    useState<AttendanceDayStudentRow | null>(null);
  const selectedDayStudentRows = useMemo(
    () => buildDayStudentRows(sessions, dateAttendanceRecords),
    [dateAttendanceRecords, sessions],
  );
  const effectiveAttendanceView = canUseCalendarView ? attendanceView : "today";

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
  }, [applyAttendanceRecords, attendanceReloadKey, selectedDate]);

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
    <div className="mx-auto max-w-6xl space-y-3 sm:space-y-5 lg:max-w-none xl:max-w-none">
      <AttendanceViewTabs
        value={effectiveAttendanceView}
        canUseCalendarView={canUseCalendarView}
        onChange={setAttendanceView}
      />

      {effectiveAttendanceView === "calendar" && canUseCalendarView ? (
        <AttendanceCalendarView
          classes={classes}
          records={attendanceRecords}
          selectedDate={selectedDate}
          selectedMonth={calendarMonth}
          sessions={sessions}
          dateAttendanceRecords={dateAttendanceRecords}
          selectedDayStudentRows={selectedDayStudentRows}
          selectedDayOverview={overview}
          dayDetailTab={dayDetailTab}
          drawerStudentRow={drawerStudentRow}
          teacherName={teacherName}
          onMonthChange={setCalendarMonth}
          onDateSelect={(date) => {
            onDateChange(date);
            setDayDetailTab("classes");
            setCalendarMonth(normalizeMonthValue(date));
            setDrawerStudentRow(null);
          }}
          onTodaySelect={() => {
            const today = getTodayDate();
            onDateChange(today);
            setCalendarMonth(normalizeMonthValue(today));
            setDayDetailTab("classes");
            setDrawerStudentRow(null);
          }}
          onDayDetailTabChange={setDayDetailTab}
          onOpenStudent={setDrawerStudentRow}
          onCloseDrawer={() => setDrawerStudentRow(null)}
          onOpenToday={() => setAttendanceView("today")}
          onOpenTodaySession={(sessionKey) => {
            setSelectedSessionKey(sessionKey);
            setAttendanceFilter("all");
            setExpandedExceptionKey("");
            setBulkTarget(null);
            setBulkSelectedStudentIds([]);
            setSelectedWorkbenchStudentId("");
            setAttendanceView("today");
          }}
          onOpenMessages={() => onNavigate?.("operations")}
        />
      ) : null}

      {effectiveAttendanceView === "ledger" && canUseCalendarView ? (
        <AttendanceLedgerSkeleton onOpenCalendar={() => setAttendanceView("calendar")} />
      ) : null}

      {effectiveAttendanceView === "today" ? (
        <>
      <div className="hidden lg:block">
        <AttendanceWorkbench
          teacherName={teacherName}
          selectedDate={selectedDate}
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
          onRefresh={() => setAttendanceReloadKey((current) => current + 1)}
          onOpenClassManagement={() => onNavigate?.("management")}
          onOpenStudentProfile={() => onNavigate?.("students")}
          onOpenMessages={() => onNavigate?.("operations")}
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
          selectedDate={selectedDate}
          overview={overview}
          teacherName={teacherName}
          onOpenClassManagement={() => onNavigate?.("management")}
          onOpenMessages={() => onNavigate?.("operations")}
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
        </>
      ) : null}
    </div>
  );
}

function AttendanceViewTabs({
  value,
  canUseCalendarView,
  onChange,
}: {
  value: AttendanceBoardView;
  canUseCalendarView: boolean;
  onChange: (view: AttendanceBoardView) => void;
}) {
  const tabs: Array<{
    id: AttendanceBoardView;
    label: string;
    description: string;
    ownerOnly?: boolean;
  }> = [
    {
      id: "calendar",
      label: "달력 보기",
      description: "월간 운영 현황",
      ownerOnly: true,
    },
    {
      id: "today",
      label: "오늘 처리",
      description: "수업 직후 출석/문자",
    },
    {
      id: "ledger",
      label: "학생별 장부",
      description: "준비 중",
      ownerOnly: true,
    },
  ];
  const actionableTabs = tabs.filter(
    (tab) => (!tab.ownerOnly || canUseCalendarView) && tab.id !== "ledger",
  );
  const showLedgerNotice = canUseCalendarView;

  return (
    <div className="rounded-md border border-[#B9CAD1] bg-[#F7F9F7] px-2 py-2 shadow-[0_1px_2px_rgba(13,38,48,0.05)]">
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="출석부 보기 전환">
        {actionableTabs.map((tab) => {
          const isActive = value === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                onChange(tab.id);
              }}
              className={[
                "min-h-10 shrink-0 rounded-sm border px-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                isActive
                    ? "border-[#0F766E] bg-[#DDEEEB] text-[#0B3F46] shadow-[inset_3px_0_0_#0F766E]"
                    : "border-transparent bg-[#F7F9F7] text-[#526A75] hover:bg-[#EDF4F2]",
              ].join(" ")}
            >
              <span className="block text-sm font-bold">{tab.label}</span>
              <span className="hidden text-[11px] font-medium text-[#6F8188] sm:block">
                {tab.description}
              </span>
            </button>
          );
        })}
        {showLedgerNotice ? (
          <div className="ml-auto hidden min-h-10 shrink-0 items-center border border-dashed border-[#C7D7DC] bg-[#EEF3F5] px-3 text-xs font-semibold text-[#6D818A] sm:flex">
            학생별 장부는 후속 범위
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AttendanceCalendarView({
  classes,
  records,
  selectedDate,
  selectedMonth,
  sessions,
  dateAttendanceRecords,
  selectedDayStudentRows,
  selectedDayOverview,
  dayDetailTab,
  drawerStudentRow,
  teacherName,
  onMonthChange,
  onDateSelect,
  onTodaySelect,
  onDayDetailTabChange,
  onOpenStudent,
  onCloseDrawer,
  onOpenToday,
  onOpenTodaySession,
  onOpenMessages,
}: {
  classes: AttendanceClass[];
  records: AttendanceRecordItem[];
  selectedDate: string;
  selectedMonth: string;
  sessions: AttendanceSession[];
  dateAttendanceRecords: AttendanceRecordItem[];
  selectedDayStudentRows: AttendanceDayStudentRow[];
  selectedDayOverview: AttendanceOverview;
  dayDetailTab: AttendanceDayDetailTab;
  drawerStudentRow: AttendanceDayStudentRow | null;
  teacherName: string;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
  onTodaySelect: () => void;
  onDayDetailTabChange: (tab: AttendanceDayDetailTab) => void;
  onOpenStudent: (row: AttendanceDayStudentRow) => void;
  onCloseDrawer: () => void;
  onOpenToday: () => void;
  onOpenTodaySession: (sessionKey: string) => void;
  onOpenMessages: () => void;
}) {
  return (
    <section className="relative overflow-hidden border border-[#B9CAD1] bg-[#E8EEF0]">
      <div className="border-b border-[#C9D8DD] bg-[#EEF4F3] px-3 py-3 sm:px-4 lg:px-5">
        <div className="border border-[#B9CAD1] bg-[#F8FAF8]">
          <div className="flex flex-col gap-3 border-b border-[#D4E0E4] px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-[#A9C6C5] bg-[#E3F1EF] text-[#0F766E]">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#007A7C]">
                  Attendance Calendar
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold tracking-[-0.02em] text-[#14262D] sm:text-2xl">
                  {formatMonthTitle(selectedMonth)}
                </h2>
                <p className="mt-1 text-sm leading-5 text-[#60717B]">
                  날짜를 선택하면 해당 날짜의 수업과 학생 목록을 확인할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex min-h-9 items-center gap-2 border border-[#C3D2D7] bg-[#EEF5F4] px-3 text-sm text-[#526A75]">
                <span className="text-xs font-bold text-[#78909A]">선택 날짜</span>
                <b className="font-extrabold text-[#14262D]">{formatDateKoreanShort(selectedDate)}</b>
              </div>
              <div className="inline-flex border border-[#B9CAD1] bg-[#FBFCFA] p-0.5">
                <button
                  type="button"
                  onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))}
                  className="inline-flex min-h-8 items-center gap-1 px-2.5 text-sm font-semibold text-[#334B58] hover:bg-[#EEF5F3] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  이전 달
                </button>
                <button
                  type="button"
                  onClick={onTodaySelect}
                  className="inline-flex min-h-8 items-center border border-[#0F766E] bg-[#DDEEEB] px-3 text-sm font-bold text-[#0B625D] hover:bg-[#CFE7E2] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))}
                  className="inline-flex min-h-8 items-center gap-1 px-2.5 text-sm font-semibold text-[#334B58] hover:bg-[#EEF5F3] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  다음 달
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-0 divide-y divide-[#D4E0E4] px-3 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-4">
            <CompactScopeLabel label="조회 반" value="전체 반" />
            <CompactScopeLabel label="담당" value="전체 선생님" />
            <CompactScopeLabel label="상태" value="전체 상태" />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <AttendanceMonthCalendar
          classes={classes}
          records={records}
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          onDateSelect={onDateSelect}
        />
        <AttendanceDayDetailPanel
          selectedDate={selectedDate}
          sessions={sessions}
          records={dateAttendanceRecords}
          overview={selectedDayOverview}
          studentRows={selectedDayStudentRows}
          activeTab={dayDetailTab}
          onTabChange={onDayDetailTabChange}
          onOpenStudent={onOpenStudent}
          onOpenToday={onOpenToday}
          onOpenTodaySession={onOpenTodaySession}
        />
      </div>

      {drawerStudentRow ? (
        <StudentScheduleDrawer
          key={drawerStudentRow.id}
          row={drawerStudentRow}
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          teacherName={teacherName}
          records={records}
          onClose={onCloseDrawer}
          onOpenMessages={onOpenMessages}
        />
      ) : null}
    </section>
  );
}

function CompactScopeLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-0 py-1 text-sm sm:px-3">
      <span className="font-semibold text-[#78909A]">{label}</span>
      <span className="font-extrabold text-[#263A45]">{value}</span>
    </div>
  );
}

function AttendanceMonthCalendar({
  classes,
  records,
  selectedDate,
  selectedMonth,
  onDateSelect,
}: {
  classes: AttendanceClass[];
  records: AttendanceRecordItem[];
  selectedDate: string;
  selectedMonth: string;
  onDateSelect: (date: string) => void;
}) {
  const days = useMemo(() => getCalendarGridDays(selectedMonth), [selectedMonth]);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="min-w-0 border-r border-[#C9D8DD] bg-[#EFF4F5] p-3 sm:p-4">
      <div className="grid grid-cols-7 overflow-hidden border-b border-l border-[#C9D8DD] bg-[#E0EAED] text-center text-[12px] font-bold text-[#526A75]">
        {weekdays.map((weekday) => (
          <div key={weekday} className="border-r border-[#C9D8DD] px-2 py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 overflow-hidden border-l border-[#C9D8DD] sm:grid-cols-7">
        {days.map((date) => {
          const summary = buildDateSummary(classes, records, date);
          return (
            <AttendanceCalendarDayCell
              key={date}
              date={date}
              selectedMonth={selectedMonth}
              isSelected={date === selectedDate}
              isToday={date === getTodayDate()}
              summary={summary}
              onSelect={onDateSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

function AttendanceCalendarDayCell({
  date,
  selectedMonth,
  isSelected,
  isToday,
  summary,
  onSelect,
}: {
  date: string;
  selectedMonth: string;
  isSelected: boolean;
  isToday: boolean;
  summary: AttendanceOverview;
  onSelect: (date: string) => void;
}) {
  const dateObject = new Date(`${date}T00:00:00`);
  const dayNumber = dateObject.getDate();
  const weekdayLabel = weekdayShortLabel(dateObject.getDay());
  const isCurrentMonth = normalizeMonthValue(date) === selectedMonth;
  const attentionCount =
    summary.counts.late + summary.counts.absent + summary.counts.needs_check;
  const hasClass = summary.totalSessions > 0;
  const hasUnchecked = summary.counts.pending > 0;
  const hasMakeup = summary.counts.makeup > 0;
  const visibleStatusRows: Array<{
    label: string;
    value: number;
    tone: "default" | "muted" | "warning" | "danger" | "info";
  }> = [
    summary.counts.pending > 0
      ? {
          label: "미체크",
          value: summary.counts.pending,
          tone: "warning" as const,
        }
      : undefined,
    attentionCount > 0
      ? {
          label: "연락",
          value: attentionCount,
          tone: "danger" as const,
        }
      : undefined,
    summary.counts.late > 0
      ? {
          label: "지각",
          value: summary.counts.late,
          tone: "warning" as const,
        }
      : undefined,
    summary.counts.absent > 0
      ? {
          label: "결석",
          value: summary.counts.absent,
          tone: "danger" as const,
        }
      : undefined,
    hasMakeup
      ? {
          label: "보강",
          value: summary.counts.makeup,
          tone: "info" as const,
        }
      : undefined,
  ].filter((row): row is NonNullable<typeof row> => row !== undefined);
  const displayedStatusRows = visibleStatusRows.slice(0, 3);
  const hiddenStatusCount = visibleStatusRows.length - displayedStatusRows.length;
  const statusLabel = !hasClass
    ? "수업 없음"
    : attentionCount > 0
      ? "연락"
      : hasUnchecked
        ? "미체크"
        : "정상";
  const statusClass = !hasClass
    ? "border-[#D6E0E3] bg-[#E7EEF0] text-[#78909A]"
    : attentionCount > 0
      ? "border-red-200 bg-red-50 text-red-700"
      : hasUnchecked
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const selectedClassName = isSelected
    ? "border-[#0F766E] bg-[#E2F1EE] shadow-[inset_4px_0_0_#0F766E,0_1px_6px_rgba(15,118,110,0.08)] ring-1 ring-inset ring-[#0F766E]/35"
    : attentionCount > 0 && hasClass
      ? "bg-[#FFF4EF] hover:bg-[#FCEBE4]"
      : hasUnchecked && hasClass
        ? "bg-[#FBF4E6] hover:bg-[#F6EDD8]"
        : "bg-[#F8FAF8] hover:bg-[#EDF5F3]";

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-pressed={isSelected}
      className={[
        "group relative min-h-[7rem] overflow-hidden border-b border-r border-[#C9D8DD] p-2 text-left transition duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB] sm:min-h-[8.25rem] sm:p-2.5",
        !isCurrentMonth
          ? "bg-[#E3EAEC] text-[#9BAAB0] hover:bg-[#DDE6E8]"
          : selectedClassName,
      ].join(" ")}
    >
      {isSelected ? (
        <span className="absolute right-2 top-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-[0_2px_6px_rgba(15,118,110,0.18)]">
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </span>
      ) : null}
      {!isSelected ? (
        <span
          className={[
            "absolute right-2 top-2 max-w-[4.85rem] truncate rounded-sm border px-1.5 py-0.5 text-[10px] font-bold",
            statusClass,
          ].join(" ")}
        >
          {statusLabel}
        </span>
      ) : null}
      <div className="flex min-w-0 items-start pr-7">
        <div
          className={[
            "inline-flex max-w-full min-w-[3.9rem] shrink-0 items-baseline gap-1 overflow-hidden rounded-sm border px-1.5 py-1 sm:min-w-[4.25rem] sm:gap-1.5 sm:px-2",
            isSelected
              ? "border-[#9FCFCA] bg-[#F6FBF9] text-[#063B3A]"
              : isToday
                ? "border-[#B7D7D6] bg-[#EEF8F6] text-[#0B4B56]"
                : "border-transparent bg-transparent text-[#17232B]",
          ].join(" ")}
        >
          <span className="text-lg font-extrabold leading-none tabular-nums">{dayNumber}</span>
          <span className="whitespace-nowrap text-xs font-bold text-[#60717B]">
            {weekdayLabel}
          </span>
          {isToday ? (
            <span className="ml-0.5 hidden whitespace-nowrap rounded-sm bg-[#D7EDEA] px-1 py-0.5 text-[10px] font-bold text-[#0B4B56] lg:inline">
              오늘
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 min-w-0 space-y-1.5 text-[12px] leading-5 text-[#405763]">
        <div
          className={[
            "min-w-0 rounded-sm px-1.5 py-1 text-[11px] font-semibold leading-4",
            hasClass
              ? isSelected
                ? "bg-[#F4FAF8] text-[#174D50]"
                : "bg-[#F6F9F8] text-[#3A505A]"
              : "bg-transparent text-[#96A6AD]",
          ].join(" ")}
        >
          {hasClass ? (
            <span className="block min-w-0 truncate">
              수업 <b className="font-extrabold tabular-nums text-[#17232B]">{summary.totalSessions}</b>
              <span className="mx-1 text-[#A3B0B6]">·</span>
              <b className="font-extrabold tabular-nums text-[#17232B]">{summary.totalStudents}</b>명
            </span>
          ) : (
            <span className="block truncate">등록 수업 없음</span>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-y-0.5 text-[11px] leading-4">
          {visibleStatusRows.length > 0 ? (
            displayedStatusRows.map((row) => (
              <MetricLine
                key={row.label}
                label={row.label}
                value={row.value}
                tone={row.tone}
              />
            ))
          ) : null}
          {hiddenStatusCount > 0 ? (
            <span className="truncate text-[11px] font-bold text-[#60717B]">
              외 {hiddenStatusCount}개 상태
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function MetricLine({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "muted" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
        ? "text-red-700"
        : tone === "info"
          ? "text-blue-700"
        : tone === "muted"
          ? "text-[#8CA0A8]"
          : "text-[#17232B]";
  const dotClass =
    tone === "warning"
      ? "bg-amber-400"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "info"
          ? "bg-blue-500"
        : tone === "muted"
          ? "bg-[#B8C6CB]"
          : "bg-[#0F766E]";

  return (
    <span className="flex min-w-0 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-[#78909A]">
        <span
          className={["size-1.5 shrink-0 rounded-full", dotClass].join(" ")}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </span>
      <b className={["shrink-0 tabular-nums", toneClass].join(" ")}>{value}</b>
    </span>
  );
}

function AttendanceDayDetailPanel({
  selectedDate,
  sessions,
  records,
  overview,
  studentRows,
  activeTab,
  onTabChange,
  onOpenStudent,
  onOpenToday,
  onOpenTodaySession,
}: {
  selectedDate: string;
  sessions: AttendanceSession[];
  records: AttendanceRecordItem[];
  overview: AttendanceOverview;
  studentRows: AttendanceDayStudentRow[];
  activeTab: AttendanceDayDetailTab;
  onTabChange: (tab: AttendanceDayDetailTab) => void;
  onOpenStudent: (row: AttendanceDayStudentRow) => void;
  onOpenToday: () => void;
  onOpenTodaySession: (sessionKey: string) => void;
}) {
  const [studentStatusFilter, setStudentStatusFilter] =
    useState<AttendanceDayStatusFilter>("all");
  const attentionRows = studentRows.filter(
    (row) =>
      row.status === "late" || row.status === "absent" || row.status === "needs_check",
  );
  const filteredStudentRows = filterDayStudentRows(studentRows, studentStatusFilter);
  const tabs: Array<{ id: AttendanceDayDetailTab; label: string; count: number }> = [
    { id: "classes", label: "수업별", count: sessions.length },
    { id: "students", label: "학생별", count: studentRows.length },
    { id: "attention", label: "연락 필요", count: attentionRows.length },
  ];
  const activeStudentFilterLabel = dayStatusFilterLabel(studentStatusFilter);
  const activeStudentFilterCount = filteredStudentRows.length;

  function openClassesTab() {
    onTabChange("classes");
  }

  function openStudentFilter(filter: AttendanceDayStatusFilter) {
    setStudentStatusFilter(filter);
    onTabChange("students");
  }

  function openTab(tab: AttendanceDayDetailTab) {
    if (tab === "students") {
      setStudentStatusFilter("all");
    }

    onTabChange(tab);
  }

  return (
    <aside className="min-w-0 border-l border-[#C9D8DD] bg-[#E5ECEE] p-3 sm:p-4">
      <div className="console-work-panel overflow-hidden">
        <div className="border-b border-[#0B3E49] bg-[#073342] p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7DD6D4]">
                선택 날짜
              </p>
              <h3 className="mt-1 text-xl font-extrabold tracking-[-0.01em] text-white">
                {formatDateKoreanLong(selectedDate)}
              </h3>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center border border-[#7DD6D4]/40 bg-white/8 text-[#7DD6D4]">
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-bold text-[#B8D0D6]">
            <span>요약 숫자를 누르면 아래 목록이 바로 필터됩니다.</span>
            <span className="shrink-0 text-[#7DD6D4]">필터 선택</span>
          </div>
          <div className="mt-2 overflow-hidden border border-[#C4D5DA] bg-[#F7FAF8] text-xs">
            <SummaryFilterButton
              label="수업"
              value={overview.totalSessions}
              isActive={activeTab === "classes"}
              onClick={openClassesTab}
            />
            <SummaryFilterButton
              label="학생"
              value={overview.totalStudents}
              isActive={activeTab === "students" && studentStatusFilter === "all"}
              onClick={() => openStudentFilter("all")}
            />
            <SummaryFilterButton
              label="출석"
              value={overview.counts.present}
              tone="success"
              isActive={activeTab === "students" && studentStatusFilter === "present"}
              onClick={() => openStudentFilter("present")}
            />
            <SummaryFilterButton
              label="지각"
              value={overview.counts.late}
              tone="warning"
              isActive={activeTab === "students" && studentStatusFilter === "late"}
              onClick={() => openStudentFilter("late")}
            />
            <SummaryFilterButton
              label="결석"
              value={overview.counts.absent}
              tone="danger"
              isActive={activeTab === "students" && studentStatusFilter === "absent"}
              onClick={() => openStudentFilter("absent")}
            />
            <SummaryFilterButton
              label="미체크"
              value={overview.counts.pending}
              isActive={activeTab === "students" && studentStatusFilter === "pending"}
              onClick={() => openStudentFilter("pending")}
            />
            <SummaryFilterButton
              label="확인 필요"
              value={overview.counts.needs_check}
              tone="warning"
              isActive={activeTab === "students" && studentStatusFilter === "needs_check"}
              onClick={() => openStudentFilter("needs_check")}
            />
          </div>
          <button
            type="button"
            onClick={onOpenToday}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center border border-[#7DD6D4]/50 bg-[#007A7C] px-3 text-sm font-bold text-white hover:bg-[#00686A] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
          >
            오늘 처리 화면에서 출석 체크
          </button>
        </div>

        <div className="flex border-b border-[#C4D5DA] bg-[#DFE9EC] p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => openTab(tab.id)}
              className={[
                "min-h-9 flex-1 px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                activeTab === tab.id
                  ? "bg-[#F7FAF8] text-[#0B3F46] shadow-[inset_0_-2px_0_#0F766E]"
                  : "text-[#60717B] hover:bg-[#F7FAF8]/80",
              ].join(" ")}
            >
              {tab.label} <span className="font-semibold text-[#8CA0A8]">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[43rem] overflow-y-auto bg-[#EEF4F4] p-3">
          {activeTab === "classes" ? (
            <AttendanceClassSummaryList
              sessions={sessions}
              records={records}
              onOpenSession={onOpenTodaySession}
            />
          ) : null}
          {activeTab === "students" ? (
            <>
              {studentStatusFilter !== "all" ? (
                <div className="mb-2 flex items-center justify-between gap-2 border border-[#C4D5DA] bg-[#F7FAF8] px-3 py-2 text-xs font-bold text-[#405763]">
                  <span>
                    {activeStudentFilterLabel} {activeStudentFilterCount}명 표시 중
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudentStatusFilter("all")}
                    className="text-[var(--clinic-primary)] underline-offset-2 hover:underline"
                  >
                    전체 보기
                  </button>
                </div>
              ) : null}
              <AttendanceDayStudentList
                rows={filteredStudentRows}
                onOpenStudent={onOpenStudent}
                emptyMessage={`${activeStudentFilterLabel} 학생이 없습니다.`}
              />
            </>
          ) : null}
          {activeTab === "attention" ? (
            <AttendanceDayStudentList
              rows={attentionRows}
              onOpenStudent={onOpenStudent}
              emptyMessage="연락 필요 학생이 없습니다."
              selectable
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SummaryFilterButton({
  label,
  value,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  isActive: boolean;
  onClick: () => void;
}) {
  const isDisabled = value === 0 && !isActive;
  const toneClass =
    tone === "success"
      ? "border-l-emerald-600 text-emerald-800 hover:border-emerald-500"
      : tone === "warning"
        ? "border-l-amber-500 text-amber-800 hover:border-amber-500"
        : tone === "danger"
          ? "border-l-red-600 text-red-800 hover:border-red-500"
          : "border-l-[#60717B] text-[#334B58] hover:border-[#7D929B]";

  return (
    <button
      type="button"
      aria-pressed={isActive}
      disabled={isDisabled}
      onClick={onClick}
      title={`${label} 목록 보기`}
      className={[
        "group relative grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-l-[3px] px-3 py-2 text-left font-extrabold transition last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]",
        isDisabled
          ? "cursor-not-allowed border-l-transparent bg-[#EEF3F5] text-[#8CA0A8]"
          : isActive
          ? "border-l-[#0F766E] bg-[#0B3F46] text-white"
          : `cursor-pointer border-l-transparent bg-[#F8FAF8] hover:border-l-[#0F766E] hover:bg-[#EEF5F3] ${toneClass}`,
      ].join(" ")}
    >
      <span
        className={[
          "block truncate text-[11px] font-black uppercase tracking-[0.08em]",
          isActive ? "text-white/70" : "opacity-75",
        ].join(" ")}
      >
        {label}
      </span>
      <span className="text-lg leading-5 tabular-nums">{value}</span>
      <span
        className={[
          "inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-[0.08em] transition-transform group-hover:translate-x-0.5",
          isDisabled ? "text-[#B5C3C9]" : isActive ? "text-white/75" : "text-[#60717B]",
        ].join(" ")}
      >
        보기
        <ChevronRight size={13} aria-hidden="true" />
      </span>
    </button>
  );
}

function AttendanceClassSummaryList({
  sessions,
  records,
  onOpenSession,
}: {
  sessions: AttendanceSession[];
  records: AttendanceRecordItem[];
  onOpenSession: (sessionKey: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-sm border border-[#D3E0E5] bg-[#F8FBFC] p-4 text-sm leading-6 text-[#60717B]">
        선택 날짜에 등록된 수업이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-hidden border border-[#C4D5DA] bg-[#F7FAF8]">
      {sessions.map((session) => {
        const summary = getSessionSummary(session, records);
        const contactNeeded = summary.late + summary.absent + summary.needs_check;

        return (
          <button
            key={session.key}
            type="button"
            onClick={() => onOpenSession(session.key)}
            className="group w-full border-b border-[#DCE8EA] bg-[#F7FAF8] p-3 text-left transition last:border-b-0 hover:bg-[#EEF5F3] hover:shadow-[inset_3px_0_0_#0F766E] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
            aria-label={`${session.className} ${session.startTime} 수업 오늘 처리에서 열기`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-[#C4D5DA] bg-[#EEF4F3] px-1.5 py-0.5 text-[11px] font-extrabold text-[#334B58] tabular-nums">
                    {session.startTime}
                  </span>
                  <p className="text-sm font-extrabold text-[#17232B]">
                    {session.className}
                  </p>
                </div>
                <p className="mt-1.5 text-xs font-medium text-[#60717B]">
                  담당 {session.subject ?? "과목 미지정"} · 학생 {session.students.length}명
                </p>
              </div>
              {contactNeeded > 0 ? (
                <span className="shrink-0 rounded-sm border border-amber-200 bg-[#FFF3D8] px-2 py-1 text-[11px] font-bold text-amber-700">
                  연락 {contactNeeded}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-4 border border-[#DCE8EA] text-center text-[11px]">
              <MiniStat label="출석" value={summary.present} tone="success" />
              <MiniStat label="지각" value={summary.late} tone="warning" />
              <MiniStat label="결석" value={summary.absent} tone="danger" />
              <MiniStat label="미체크" value={summary.pending} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#DCE8EA] pt-2 text-[11px] font-extrabold text-[#60717B]">
              <span>수업별 출석 체크로 이동</span>
              <span className="inline-flex items-center gap-1 text-[#0F766E]">
                열기
                <ChevronRight
                  size={13}
                  aria-hidden="true"
                  className="transition group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-[#60717B]";

  return (
    <span className="border-r border-[#DCE8EA] bg-[#EEF4F3] px-1.5 py-1 last:border-r-0">
      <span className="block font-medium text-[#78909A]">{label}</span>
      <b className={["tabular-nums", toneClass].join(" ")}>{value}</b>
    </span>
  );
}

function AttendanceDayStudentList({
  rows,
  onOpenStudent,
  emptyMessage = "선택 날짜의 학생이 없습니다.",
  selectable = false,
}: {
  rows: AttendanceDayStudentRow[];
  onOpenStudent: (row: AttendanceDayStudentRow) => void;
  emptyMessage?: string;
  selectable?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-sm border border-[#D3E0E5] bg-[#F8FBFC] p-4 text-sm leading-6 text-[#60717B]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden border border-[#C4D5DA] bg-[#F7FAF8]">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onOpenStudent(row)}
          className="group w-full border-b border-[#DCE8EA] bg-[#F7FAF8] px-3 py-2.5 text-left shadow-[inset_3px_0_0_transparent] transition last:border-b-0 hover:bg-[#FBFCFA] hover:shadow-[inset_3px_0_0_#0F766E] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
        >
          <div className="flex items-start gap-2.5">
            {selectable ? (
              <span
                className="mt-1 flex size-4 shrink-0 rounded-[3px] border border-[#9DB4BD] bg-[#FBFCFA] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                aria-hidden="true"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-extrabold text-[#17232B]">
                      {row.student.name}
                    </p>
                    {row.record?.note ? (
                      <span className="shrink-0 rounded-sm border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                        메모
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-[#60717B]">
                    {[row.student.schoolName, row.student.gradeLabel].filter(Boolean).join(" · ") ||
                      "학교/학년 미등록"}{" "}
                    · {row.session.className}
                  </p>
                </div>
                <StatusLozenge status={row.status} />
              </div>
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                <span className="rounded-sm border border-[#C4D5DA] bg-[#EEF4F3] px-1.5 py-0.5 text-[11px] font-extrabold text-[#334B58] tabular-nums">
                  {row.session.startTime}-{row.session.endTime}
                </span>
                <div className="flex min-w-0 items-center justify-end gap-1.5">
                  <ContactLozenge record={row.record} status={row.status} />
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-[#9DB1B8] transition group-hover:translate-x-0.5 group-hover:text-[#0F766E]"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StudentScheduleDrawer({
  row,
  selectedDate,
  selectedMonth,
  teacherName,
  records,
  onClose,
  onOpenMessages,
}: {
  row: AttendanceDayStudentRow;
  selectedDate: string;
  selectedMonth: string;
  teacherName: string;
  records: AttendanceRecordItem[];
  onClose: () => void;
  onOpenMessages: () => void;
}) {
  const [historyState, setHistoryState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    items: Array<{ id: string; reason: string; status: string; sentAt: string | null; createdAt: string }>;
  }>({ status: "loading", items: [] });
  const monthlyRecords = records.filter(
    (record) =>
      record.studentId === row.student.id &&
      normalizeMonthValue(record.attendanceDate) === selectedMonth,
  );
  const monthlySummary = createEmptyAttendanceCounts();

  monthlyRecords.forEach((record) => {
    monthlySummary[normalizeAttendanceStatus(record.status)] += 1;
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchFollowupHistory(row.student.id, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) {
          setHistoryState({ status: "ready", items: (payload.followups ?? []).slice(0, 5) });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHistoryState({ status: "error", items: [] });
        }
      });

    return () => {
      controller.abort();
    };
  }, [row.student.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B2530]/30 backdrop-blur-[1px]">
      <aside className="h-full w-full max-w-[27rem] overflow-y-auto border-l border-[#C2D1D8] bg-[#F8FBFC] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0B3E49] bg-[#073342] px-4 py-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7DD6D4]">
              학생 스케줄
            </p>
            <h3 className="text-lg font-bold text-white">{row.student.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center border border-white/20 bg-white/8 text-[#D7E8ED] hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
            aria-label="학생 스케줄 drawer 닫기"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="border-x border-[#C2D1D8] bg-[#F7FAFA]">
          <section className="border-b border-[#C9D7DC] border-l-4 border-l-[#007A7C] bg-[#E1F0EF] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-bold text-[#17232B]">{row.student.name}</p>
                <p className="mt-1 text-sm text-[#60717B]">
                  {[row.student.schoolName, row.student.gradeLabel].filter(Boolean).join(" · ") ||
                    "학교/학년 미등록"}
                </p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-[#405763]">
                  {row.student.maskedStudentPhone ?? row.student.maskedParentPhone}
                </p>
              </div>
              <StatusLozenge status={row.status} />
            </div>
          </section>

          <DrawerSection title="선택 날짜 수업 정보">
            <InfoRow label="날짜" value={formatDateKoreanLong(selectedDate)} />
            <InfoRow label="수업" value={row.session.className} />
            <InfoRow label="시간" value={`${row.session.startTime} - ${row.session.endTime}`} />
            <InfoRow label="담당" value={`${teacherName} 선생님`} />
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusLozenge status={row.status} />
              <ContactLozenge record={row.record} status={row.status} />
            </div>
          </DrawerSection>

          <DrawerSection title="주간 스케줄">
            <div className="space-y-2">
              {getSortedActiveSchedules(row.student.schedules).length > 0 ? (
                getSortedActiveSchedules(row.student.schedules)
                  .slice(0, 6)
                  .map((schedule) => (
                    <div
                      key={`${schedule.dayOfWeek}:${schedule.startTime}:${schedule.title}`}
                      className="flex items-center justify-between gap-3 border-b border-[#EDF2F4] pb-2 text-sm last:border-b-0 last:pb-0"
                    >
                      <span className="font-bold text-[#263A45]">
                        {weekdayShortLabel(schedule.dayOfWeek)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[#526A75]">
                        {schedule.startTime} {schedule.title}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-[#60717B]">등록된 주간 스케줄이 없습니다.</p>
              )}
            </div>
          </DrawerSection>

          <DrawerSection title="이번 달 출석 이력">
            <div className="overflow-hidden border border-[#DCE8EA] bg-[#F7FAF8] text-xs">
              <DrawerMetricRow label="출석" value={monthlySummary.present} tone="success" />
              <DrawerMetricRow label="지각" value={monthlySummary.late} tone="warning" />
              <DrawerMetricRow label="결석" value={monthlySummary.absent} tone="danger" />
              <DrawerMetricRow label="미체크" value={monthlySummary.pending} />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#78909A]">
              데모에서는 선택 월에 불러온 출석 기록만 요약합니다.
            </p>
          </DrawerSection>

          <DrawerSection title="최근 연락 기록">
            {historyState.status === "loading" ? (
              <p className="text-sm text-[#60717B]">연락 기록을 불러오는 중입니다.</p>
            ) : historyState.items.length > 0 ? (
              <div className="space-y-2">
                {historyState.items.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-[#EDF2F4] pb-2 text-sm last:border-b-0 last:pb-0"
                  >
                    <p className="font-semibold text-[#263A45]">
                      {formatCompactDateTime(item.sentAt ?? item.createdAt)}
                    </p>
                    <p className="text-xs text-[#60717B]">
                      {reasonLabel(item.reason as FollowupReason)} · {item.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#60717B]">최근 연락 기록이 없습니다.</p>
            )}
          </DrawerSection>

          <section className="sticky bottom-0 border-t border-[#C9D7DC] bg-[#F4F8F9] p-3">
            <h4 className="mb-2 text-sm font-bold text-[#17232B]">작업</h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenMessages}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 bg-[#007A7C] px-3 text-sm font-bold text-white hover:bg-[#00686A] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
              >
                <Send size={16} aria-hidden="true" />
                문자 작성
              </button>
              <div className="grid gap-2 border border-[#C6D4DA] bg-[#F7FAFA] p-3 text-xs leading-5 text-[#60717B]">
                <div className="flex items-start gap-2">
                  <Pencil className="mt-0.5 shrink-0 text-[#8CA0A8]" size={15} aria-hidden="true" />
                  <span>
                    메모가 필요하면 문자 작성 화면에서 연락 기록으로 남겨 주세요.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <List className="mt-0.5 shrink-0 text-[#8CA0A8]" size={15} aria-hidden="true" />
                  <span>
                    전체 이력은 문자 화면에서 학생을 선택해 확인합니다.
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#C9D7DC] bg-[#F7FAFA] px-4 py-3">
      <h4 className="mb-2 text-sm font-bold text-[#17232B]">{title}</h4>
      {children}
    </section>
  );
}

function DrawerMetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-[#60717B]";

  return (
    <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[#DCE8EA] px-3 py-1.5 last:border-b-0">
      <span className="text-xs font-bold text-[#60717B]">{label}</span>
      <b className={["text-sm font-black tabular-nums", toneClass].join(" ")}>{value}</b>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EDF2F4] py-2 text-sm last:border-b-0">
      <span className="font-semibold text-[#60717B]">{label}</span>
      <span className="min-w-0 truncate text-right font-bold text-[#263A45]">{value}</span>
    </div>
  );
}

function AttendanceLedgerSkeleton({
  onOpenCalendar,
}: {
  onOpenCalendar: () => void;
}) {
  return (
    <section className="rounded-md border border-[#C2D1D8] bg-white p-6 shadow-[0_1px_2px_rgba(13,38,48,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#007A7C]">
        Student Ledger
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[#17232B]">학생별 월간 출석 장부</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60717B]">
        학생 row와 날짜 column을 사용하는 월간 matrix는 다음 단계에서 구현합니다. 학생명 column
        sticky, 날짜 column horizontal scroll, cell 상태 badge 기준으로 설계합니다.
      </p>
      <button
        type="button"
        onClick={onOpenCalendar}
        className="mt-4 inline-flex min-h-10 items-center rounded-sm bg-[#007A7C] px-4 text-sm font-bold text-white hover:bg-[#00686A] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
      >
        달력 보기로 돌아가기
      </button>
    </section>
  );
}

function AttendanceWorkbench({
  teacherName,
  selectedDate,
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
  onRefresh,
  onOpenClassManagement,
  onOpenStudentProfile,
  onOpenMessages,
  onSelectSession,
  onFilterChange,
  onStartBulk,
  onClearBulk,
  onToggleBulkStudent,
  onSelectStudent,
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
  teacherName: string;
  selectedDate: string;
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
  onRefresh: () => void;
  onOpenClassManagement: () => void;
  onOpenStudentProfile: () => void;
  onOpenMessages: () => void;
  onSelectSession: (sessionKey: string) => void;
  onFilterChange: (filter: AttendanceFilter) => void;
  onStartBulk: (reason: BulkAttendanceReason) => void;
  onClearBulk: () => void;
  onToggleBulkStudent: (studentId: string) => void;
  onSelectStudent: (studentId: string) => void;
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
    <section className="rounded-none bg-[#F3F7F8]">
      <div className="grid min-h-[calc(100vh-7.25rem)] gap-0 overflow-hidden border border-[#B8C9D0] bg-[#F4F8F9] lg:grid-cols-[15.5rem_minmax(0,1fr)_17.25rem] xl:grid-cols-[16rem_minmax(0,1fr)_18rem] 2xl:grid-cols-[19.5rem_minmax(0,1fr)_22rem]">
        <aside className="min-w-0 border-r border-[#D5E0E4] bg-[#F8FBFC]">
          <SessionList
            sessions={sessions}
            selectedSessionKey={selectedSessionKey}
            records={dateAttendanceRecords}
            loadState={loadState.status}
            selectedDate={selectedDate}
            overview={overview}
            teacherName={teacherName}
            onOpenClassManagement={onOpenClassManagement}
            onOpenMessages={onOpenMessages}
            variant="workbench"
            onSelect={onSelectSession}
          />
        </aside>

        <section className="min-w-0 overflow-hidden bg-[#F7FAFA]">
          <div className="border-b border-[#B8C9D0] bg-[#F4F8F9] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold tracking-[-0.02em] text-[#17232B]">
                  출석부 장부
                </h2>
                {selectedSession ? (
                  <p className="mt-1 text-sm font-medium text-[#60717B]">
                    {selectedSession.className} ({selectedSession.startTime} - {selectedSession.endTime}) ·{" "}
                    {teacherName} 선생님
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#60717B]">
                    이 날짜에 수업이 없습니다. 날짜나 수업 시간 등록 상태를 확인해 주세요.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-9 items-center gap-2 border border-[#AEBFC7] bg-[#F7FAFA] px-3 text-sm font-semibold text-[#334B58] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  <Printer size={16} aria-hidden="true" />
                  출석부 인쇄
                </button>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex min-h-9 items-center gap-2 border border-[#AEBFC7] bg-[#F7FAFA] px-3 text-sm font-semibold text-[#334B58] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  새로고침
                </button>
              </div>
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
            <div className="p-4">
              <AttendanceLedgerTable
                students={filteredStudents}
                session={selectedSession}
                selectedDate={selectedDate}
                recordsByStudent={recordsByStudent}
                saveState={saveState}
                selectedStudentId={selectedWorkbenchStudent?.id ?? ""}
                bulkTarget={bulkTarget}
                selectedBulkStudentIds={bulkSelectedStudentIds}
                summary={summary}
                onSelectStudent={onSelectStudent}
                onToggleBulkStudent={onToggleBulkStudent}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-sm leading-6 text-stone-500">
              선택한 날짜에 수업 기록이나 주간 스케줄이 없습니다.
            </div>
          )}
        </section>

        <aside className="min-w-0 border-l border-[#D5E0E4] bg-[#F8FBFC]">
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
              teacherName={teacherName}
              onOpenFollowup={onOpenStudentFollowup}
              onOpenStudentProfile={onOpenStudentProfile}
              onOpenMessages={onOpenMessages}
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
  summary,
  onSelectStudent,
  onToggleBulkStudent,
}: {
  students: AttendanceStudent[];
  session: AttendanceSession;
  selectedDate: string;
  recordsByStudent: Map<string, AttendanceRecordItem>;
  saveState: { key: string; status: "idle" | "saving" | "saved" | "error"; error: string };
  selectedStudentId: string;
  bulkTarget: BulkAttendanceTarget | null;
  selectedBulkStudentIds: string[];
  summary: Record<AttendanceStatus, number> | null;
  onSelectStudent: (studentId: string) => void;
  onToggleBulkStudent: (studentId: string) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm leading-6 text-stone-500">
        현재 필터에 해당하는 학생이 없습니다. 필터를 전체로 바꾸거나 출석 상태를 확인해 주세요.
      </div>
    );
  }

  const footerSummaryItems = [
    { label: "출석", value: summary?.present ?? 0, className: "text-[#007A7C]" },
    { label: "지각", value: summary?.late ?? 0, className: "text-[#B26A00]" },
    { label: "결석", value: summary?.absent ?? 0, className: "text-[#B42318]" },
    { label: "미체크", value: summary?.pending ?? 0, className: "text-[#334B58]" },
  ].filter((item) => item.value > 0);

  return (
    <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[47rem] table-fixed border-separate border-spacing-0 text-left">
          <thead className="bg-[#E7EEF1] text-[12px] font-bold text-[#405763]">
            <tr>
              <th className="w-8 border-b border-r border-[#D6E0E4] px-2 py-3">
                <span className="sr-only">선택</span>
              </th>
              <th className="w-[23%] border-b border-r border-[#D6E0E4] px-2 py-3">학생명</th>
              <th className="w-[16%] border-b border-r border-[#D6E0E4] px-2 py-3">학교 / 학년</th>
              <th className="w-[13%] border-b border-r border-[#D6E0E4] px-2 py-3">휴대폰</th>
              <th className="w-[13%] border-b border-r border-[#D6E0E4] px-2 py-3">수업시간</th>
              <th className="w-[12%] border-b border-r border-[#D6E0E4] px-2 py-3">출석 상태</th>
              <th className="w-[12%] border-b border-r border-[#D6E0E4] px-2 py-3">연락 상태</th>
              <th className="w-[8%] border-b border-[#D6E0E4] px-2 py-3">메모</th>
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
                    "group cursor-pointer border-b border-[var(--clinic-border)] transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]",
                    isSelected
                      ? "bg-[#E1F0EF] shadow-[inset_4px_0_0_var(--clinic-primary)]"
                      : "bg-[#F7FAFA] hover:bg-[#EDF3F5]",
                    isSaving ? "opacity-70" : "",
                  ].join(" ")}
                >
                  <td className="border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle">
                    <input
                      type="checkbox"
                      checked={isBulkSelected}
                      disabled={!isBulkSelectable}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => onToggleBulkStudent(student.id)}
                      className="size-4 accent-[var(--clinic-primary)] disabled:opacity-30"
                      aria-label={`${student.name} 일괄 문자 대상 선택`}
                    />
                  </td>
                  <td className="border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center border border-[#AFC3CA] bg-[#E3EEF0] text-xs font-bold text-[#005F62]">
                        {getStudentInitial(student.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-5 text-[var(--clinic-text)]">
                          {student.name}
                        </p>
                        <p className="truncate text-[11px] leading-4 text-[#78909A]">
                          학생 처리 패널
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="truncate border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle text-xs text-[#435864]">
                    {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                      "학교/학년 미등록"}
                  </td>
                  <td className="truncate border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle text-xs tabular-nums text-[#435864]">
                    {student.maskedStudentPhone ?? student.maskedParentPhone}
                  </td>
                  <td className="truncate border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle text-xs tabular-nums text-[#334B58]">
                    {session.startTime}-{session.endTime}
                  </td>
                  <td className="border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle">
                    <StatusLozenge status={status} />
                  </td>
                  <td className="border-b border-r border-[#E0E8EB] px-2 py-2.5 align-middle">
                    <ContactLozenge record={record} status={status} />
                  </td>
                  <td className="border-b border-[#E0E8EB] px-2 py-2.5 align-middle">
                    <span className="rounded-sm border border-[#d5e1e5] bg-[#f5f9fa] px-1.5 py-1 text-[11px] font-semibold text-[var(--clinic-muted)]">
                      {record?.note ? "있음" : "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#B8C9D0] bg-[#F4F8F9] px-4 py-3 text-sm text-[#405763]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold">전체 {students.length}명</span>
          {footerSummaryItems.map((item) => (
            <span key={item.label}>
              {item.label} <b className={item.className}>{item.value}</b>
            </span>
          ))}
        </div>
        <p className="shrink-0 text-xs font-semibold text-[#78909A]">
          현재 수업 학생 전체 표시
        </p>
      </div>
    </div>
  );
}

function StatusLozenge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={[
        "inline-flex min-h-6 items-center whitespace-nowrap border px-2 text-[11px] font-bold",
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
      <span className="inline-flex min-h-6 items-center whitespace-nowrap border border-emerald-300 bg-[#EEF8F3] px-2 text-[11px] font-bold text-[var(--clinic-success)]">
        문자 완료
      </span>
    );
  }

  if (status === "late" || status === "absent") {
    return (
      <span className="inline-flex min-h-6 items-center whitespace-nowrap border border-amber-300 bg-[#FFF7E8] px-2 text-[11px] font-bold text-[var(--clinic-warning)]">
        연락 필요
      </span>
    );
  }

  if (status === "needs_check") {
    return (
      <span className="inline-flex min-h-6 items-center whitespace-nowrap border border-red-300 bg-[#FFF1F0] px-2 text-[11px] font-bold text-[var(--clinic-danger)]">
        확인 필요
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-6 items-center whitespace-nowrap border border-[#C9D7DC] bg-[#EEF4F6] px-2 text-[11px] font-bold text-[var(--clinic-muted)]">
      대기
    </span>
  );
}

function WorkbenchStudentPanel({
  student,
  record,
  status,
  session,
  teacherName,
  onOpenFollowup,
  onOpenStudentProfile,
  onOpenMessages,
}: {
  student: AttendanceStudent | undefined;
  record: AttendanceRecordItem | undefined;
  status: AttendanceStatus;
  session: AttendanceSession | undefined;
  teacherName: string;
  onOpenFollowup: (student: AttendanceStudent) => void;
  onOpenStudentProfile: () => void;
  onOpenMessages: () => void;
}) {
  const [historyState, setHistoryState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    items: Array<{ id: string; reason: string; status: string; sentAt: string | null; createdAt: string }>;
  }>({ status: "idle", items: [] });
  const selectedStudentId = student?.id ?? "";
  const canOpenFollowup =
    Boolean(student && record && getFollowupReasonForAttendanceStatus(status));

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    const controller = new AbortController();

    fetchFollowupHistory(selectedStudentId, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) {
          setHistoryState({
            status: "ready",
            items: (payload.followups ?? []).slice(0, 3),
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHistoryState({ status: "error", items: [] });
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedStudentId]);

  const weeklySchedules = student
    ? getSortedActiveSchedules(student.schedules).slice(0, 3)
    : [];
  const processedAt = record?.arrivedAt ?? record?.checkedAt ?? null;
  const classDescriptor = [student?.schoolName, student?.gradeLabel, session?.className]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="sticky top-4 flex h-[calc(100vh-9rem)] flex-col overflow-hidden border-l border-[#C9D7DC] bg-[#EDF4F5]">
      <div className="flex items-center justify-between border-b border-[#0F4050] bg-[#082A3A] px-4 py-3 text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7DD6D4]">
            student case
          </p>
          <h3 className="mt-1 text-base font-bold">학생 처리 패널</h3>
        </div>
        <ChevronRight size={17} className="rotate-90 text-[#B8D0D6]" aria-hidden="true" />
      </div>

      {!student ? (
        <div className="m-3 border border-dashed border-[#B8C9CE] bg-[#F5FAFA] p-4 text-sm leading-6 text-[#60717B]">
          학생을 선택하면 오늘 처리 상태와 연락 작업이 표시됩니다.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="border-b border-[#C9D7DC] bg-[#F7FBFB] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h4 className="truncate text-2xl font-black tracking-[-0.03em] text-[#132934]">
                      {student.name}
                    </h4>
                    <span className="flex size-6 shrink-0 items-center justify-center border border-[#AFC3CA] bg-[#E3EEF0] text-[11px] font-bold text-[#005F62]">
                      {getStudentInitial(student.name)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-[#526873]">
                    {classDescriptor || "학교/학년 미등록"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenStudentProfile}
                className="min-h-8 shrink-0 border border-[#AEBFC7] bg-[#F7FAFA] px-2.5 text-xs font-bold text-[#334B58] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
                >
                  프로필
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusLozenge status={status} />
                <ContactLozenge record={record} status={status} />
                <span className="inline-flex min-h-6 items-center border border-[#C9D7DC] bg-[#F7FAFA] px-2 text-[11px] font-bold tabular-nums text-[#526873]">
                  {student.maskedStudentPhone ?? student.maskedParentPhone}
                  <span className="ml-1 font-medium text-[#78909A]">(학생)</span>
                </span>
              </div>
            </section>

            <section className="border-b border-[#C9D7DC] bg-[#E3F3F2] px-4 py-3 shadow-[inset_4px_0_0_#007A7C]">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#006266]">
                <CheckCircle2 size={14} aria-hidden="true" />
                오늘 처리
              </div>
              <p className="mt-1 text-sm font-bold text-[#132934]">
                {session ? `${session.className} · ${session.startTime}-${session.endTime}` : "선택된 수업 없음"}
              </p>
              <p className="mt-1 text-xs font-medium text-[#526873]">
                {processedAt ? `${formatCompactDateTime(processedAt)} 처리 기록` : "아직 처리 시각이 없습니다."}
              </p>
            </section>

            <PanelBlock title="수업 정보">
              <PanelDataRow icon={<Clock3 size={14} />} label="수업시간" mono>
                {session ? `${session.startTime} - ${session.endTime}` : "시간 정보 없음"}
              </PanelDataRow>
              <PanelDataRow icon={<UserCheck size={14} />} label="담당">
                {teacherName} 선생님
              </PanelDataRow>
              <PanelDataRow icon={<CheckCircle2 size={14} />} label="출석">
                <StatusLozenge status={status} />
              </PanelDataRow>
              <PanelDataRow icon={<MessageSquareText size={14} />} label="연락">
                <ContactLozenge record={record} status={status} />
              </PanelDataRow>
            </PanelBlock>

            <PanelBlock
              title="최근 연락"
              action={
                <button
                  type="button"
                  onClick={onOpenMessages}
                  className="text-xs font-bold text-[#007A7C] hover:underline"
                >
                  전체 보기
                </button>
              }
            >
              {historyState.status === "loading" ? (
                <p className="px-4 py-3 text-sm text-[#60717B]">연락 기록을 불러오는 중입니다.</p>
              ) : historyState.items.length > 0 ? (
                historyState.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid min-h-10 grid-cols-[5.8rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#E0E9EC] px-4 py-2 text-xs text-[#405763] last:border-b-0"
                  >
                    <span className="tabular-nums text-[#60717B]">{formatCompactDateTime(item.createdAt)}</span>
                    <span className="truncate font-bold">{reasonLabel(item.reason as FollowupReason)}</span>
                    <span className="rounded-sm border border-[#C8D7DD] bg-[#F7FBFB] px-1.5 py-0.5 text-[10px] font-black text-[#60717B]">
                      {item.status === "sent" ? "발송" : "기록"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-[#60717B]">아직 연락 기록이 없습니다.</p>
              )}
            </PanelBlock>

            <PanelBlock
              title="주간 스케줄"
              action={
                <button
                  type="button"
                  onClick={onOpenStudentProfile}
                  className="text-xs font-bold text-[#007A7C] hover:underline"
                >
                  관리
                </button>
              }
            >
              {weeklySchedules.length > 0 ? (
                weeklySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="grid min-h-10 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 border-b border-[#E0E9EC] px-4 py-2 text-sm text-[#405763] last:border-b-0"
                  >
                    <span className="font-black text-[#007A7C]">{weekdayShortLabel(schedule.dayOfWeek)}</span>
                    <span className="truncate tabular-nums">
                      {schedule.startTime} - {schedule.endTime} {session?.className ?? ""}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-[#60717B]">등록된 주간 스케줄이 없습니다.</p>
              )}
            </PanelBlock>
          </div>

          <div className="border-t border-[#C9D7DC] bg-[#F7FBFB] p-3 shadow-[0_-8px_18px_rgba(8,42,58,0.05)]">
            <button
              type="button"
              disabled={!canOpenFollowup}
              onClick={() => onOpenFollowup(student)}
              className={[
                "flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                canOpenFollowup
                  ? "border border-[#005F62] bg-[#007A7C] text-white hover:bg-[#006266]"
                  : "bg-[#DCE6EA] text-[#78909A]",
              ].join(" ")}
            >
              <Send size={17} aria-hidden="true" />
              문자 작성 / 보내기
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canOpenFollowup}
                onClick={() => onOpenFollowup(student)}
                className="flex min-h-10 items-center justify-center gap-2 border border-[#AEBFC7] bg-[#F7FAFA] px-3 text-sm font-bold text-[#334B58] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB] disabled:cursor-not-allowed disabled:bg-[#EEF3F5] disabled:text-[#93A3AA]"
              >
                <Pencil size={16} aria-hidden="true" />
                기록 작성
              </button>
              <button
                type="button"
                onClick={onOpenMessages}
                className="flex min-h-10 items-center justify-center gap-2 border border-[#AEBFC7] bg-[#F7FAFA] px-3 text-sm font-bold text-[#334B58] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
              >
                <List size={16} aria-hidden="true" />
                이력
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PanelBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#C9D7DC] bg-[#F7FBFB]">
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[#DCE6EA] bg-[#F0F6F7] px-4">
        <h4 className="text-[12px] font-black uppercase tracking-[0.14em] text-[#334B58]">
          {title}
        </h4>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

function PanelDataRow({
  icon,
  label,
  children,
  mono = false,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[1.25rem_5rem_minmax(0,1fr)] items-center gap-2 border-b border-[#E0E9EC] px-4 py-2 last:border-b-0">
      <span className="text-[#78909A]" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-bold text-[#60717B]">{label}</span>
      <span className={`min-w-0 truncate text-sm font-bold text-[#17232B] ${mono ? "tabular-nums" : ""}`}>
        {children}
      </span>
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
      <span className="mb-1 block text-xs font-semibold text-[var(--clinic-muted)]">조회 날짜</span>
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] gap-1.5 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-2">
        <button
          type="button"
          aria-label="전날 출석부 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-10 items-center justify-center rounded-sm border border-[#c9d8dd] bg-white text-[var(--clinic-muted)] transition hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa] sm:min-h-11"
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
            className="flex min-h-10 w-full items-center gap-2 rounded-sm border border-[#c9d8dd] bg-white px-2.5 text-left text-sm font-semibold text-[var(--clinic-text)] transition hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa] focus:border-[var(--clinic-primary)] focus:outline-none focus:ring-2 focus:ring-[#b7ece6] sm:min-h-11 sm:px-3"
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
          className="flex min-h-10 items-center justify-center rounded-sm border border-[#c9d8dd] bg-white text-[var(--clinic-muted)] transition hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa] sm:min-h-11"
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
      className="min-h-8 rounded-sm border border-[#c9d8dd] bg-[#f4f9fa] px-2 text-xs font-semibold text-[var(--clinic-muted)] transition hover:border-[var(--clinic-accent)] hover:bg-[#e4f5f3] hover:text-[var(--clinic-primary)] sm:min-h-9"
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
    <section className="grid grid-cols-4 overflow-hidden rounded-md border border-[var(--clinic-border)] bg-[var(--clinic-panel)] text-center">
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
    <div className={["border-r border-[var(--clinic-border)] px-2 py-2 last:border-r-0 sm:px-3 sm:py-3", className].join(" ")}>
      <p className="text-[11px] font-medium text-[var(--clinic-muted)] sm:text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--clinic-text)] sm:mt-1 sm:text-base">{value}</p>
    </div>
  );
}

function SessionList({
  sessions,
  selectedSessionKey,
  records,
  loadState,
  selectedDate,
  overview,
  teacherName,
  onOpenClassManagement,
  onOpenMessages,
  variant = "mobile",
  onSelect,
}: {
  sessions: AttendanceSession[];
  selectedSessionKey: string;
  records: AttendanceRecordItem[];
  loadState: "idle" | "loading" | "error";
  selectedDate: string;
  overview: AttendanceOverview;
  teacherName: string;
  onOpenClassManagement: () => void;
  onOpenMessages: () => void;
  variant?: "mobile" | "workbench";
  onSelect: (sessionKey: string) => void;
}) {
  if (variant === "mobile") {
    return (
      <section className="overflow-hidden rounded-md border border-[var(--clinic-border)] bg-[var(--clinic-panel)]">
        <div className="border-b border-[var(--clinic-border)] bg-[var(--clinic-primary-dark)] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">오늘 수업</h3>
            {loadState === "loading" ? (
              <Loader2 size={16} className="animate-spin text-white/60" />
            ) : (
              <span className="text-xs font-medium text-white/70">{sessions.length}개</span>
            )}
          </div>
        </div>

        <div className="max-h-40 divide-y divide-[#dbe6ea] overflow-y-auto overscroll-contain sm:max-h-none">
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
                      ? "border-l-[var(--clinic-accent)] bg-[#e8f5f4] text-[var(--clinic-text)]"
                      : "border-l-transparent bg-[var(--clinic-panel)] text-[var(--clinic-text)] hover:bg-[#f3f9fa]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex size-8 items-center justify-center rounded-md text-xs font-semibold sm:size-9 sm:text-sm",
                      isSelected ? "bg-[var(--clinic-primary)] text-white" : "bg-[#e6eef1] text-[var(--clinic-muted)]",
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
                        isSelected ? "text-[var(--clinic-primary)]" : "text-[var(--clinic-muted)]",
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
                          ? "bg-[var(--clinic-primary-dark)] text-white"
                          : "bg-[#eef4f6] text-[var(--clinic-muted)]",
                      ].join(" ")}
                    >
                      {progress.pending} 체크 필요
                    </span>
                    {progress.attention > 0 ? (
                      <span className="rounded-sm border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--clinic-danger)] sm:px-2 sm:py-1 sm:text-xs">
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

  return (
    <section className="h-full overflow-hidden bg-[#F8FBFC]">
      <div className="border-b border-[#D5E0E4] bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-[#17232B]">오늘 수업</h3>
            <RefreshCw size={15} className="text-[#78909A]" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onOpenClassManagement}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-[#9BADB6] bg-white px-3 text-sm font-semibold text-[#334B58] transition hover:bg-[#F2F6F7] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
          >
            <Plus size={15} aria-hidden="true" />
            수업 추가
          </button>
        </div>
        <p className="mt-5 text-base font-bold text-[#17232B]">
          {formatAttendanceDate(selectedDate)}
        </p>
        <p className="mt-1 text-sm font-medium text-[#60717B]">
          총 {overview.totalSessions}개 수업 · {overview.totalStudents}명
          {loadState === "loading" ? (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#78909A]">
              <Loader2 size={12} className="animate-spin" />
              새로고침 중
            </span>
          ) : null}
        </p>
      </div>

      <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto overscroll-contain p-3 pb-4">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isSelected = session.key === selectedSessionKey;
            const progress = getSessionProgress(session, records);
            const sessionSummary = getSessionSummary(session, records);

            return (
              <button
                key={session.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(session.key)}
                className={[
                  "w-full rounded-md border border-l-4 px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                  isSelected
                    ? "border-[#007A7C] border-l-[#007A7C] bg-[#F0FAF9] shadow-[0_0_0_1px_rgba(0,122,124,0.10)]"
                    : "border-[#D5E0E4] border-l-transparent bg-white hover:border-[#B8C8CF] hover:bg-[#FDFEFE]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums text-[#334B58]">
                      {session.startTime} - {session.endTime}
                    </p>
                    <p className="mt-1 truncate text-[15px] font-bold text-[#17232B]">
                      {session.className}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-[#60717B]">
                      {teacherName} 선생님
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-bold text-[#17232B]">{session.students.length}명</p>
                    <p className="mt-0.5 text-xs text-[#78909A]">정원</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-1.5 text-[11px] font-bold xl:text-xs">
                  <span className="whitespace-nowrap text-[#007A7C]">{sessionSummary.present} 출석</span>
                  <span className="whitespace-nowrap text-[#B26A00]">{sessionSummary.late} 지각</span>
                  <span className="whitespace-nowrap text-[#B42318]">{sessionSummary.absent} 결석</span>
                  <span className="whitespace-nowrap text-[#334B58]">{progress.pending} 미체크</span>
                </div>
              </button>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed border-[#C6D4DA] bg-white px-3 py-4 text-sm leading-6 text-stone-500">
            이 날짜에 표시할 수업이 없습니다. 다른 날짜를 선택하거나 수업 시간 등록 상태를 확인해 주세요.
          </p>
        )}
      </div>
      <div className="border-t border-[#D5E0E4] bg-white p-3">
        <button
          type="button"
          disabled={sessions.length === 0}
          onClick={onOpenMessages}
          className={[
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
            sessions.length === 0
              ? "cursor-not-allowed border-[#C6D4DA] bg-[#F2F6F7] text-[#8CA0A8]"
              : "border-[#007A7C] bg-white text-[#007A7C] hover:bg-[#F0FAF9]",
          ].join(" ")}
        >
          <Send size={16} aria-hidden="true" />
          {sessions.length === 0 ? "수업 선택 후 일괄 문자" : "총 수업 일괄 문자"}
        </button>
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
              "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--clinic-accent)] sm:min-h-9 sm:px-3",
              isSelected
                ? "border-[var(--clinic-primary-dark)] bg-[var(--clinic-primary-dark)] text-white"
                : "border-[#c9d8dd] bg-white text-[var(--clinic-muted)] hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa]",
            ].join(" ")}
          >
            {attendanceFilterLabels[filter]}
            <span
              className={[
                "rounded-full px-1.5 py-0.5 tabular-nums",
                isSelected ? "bg-white/15 text-white" : "bg-[#edf4f6] text-[var(--clinic-muted)]",
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
    <div className="mt-4 rounded-md border border-[#D6E0E4] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(13,38,48,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-[#BFD4D6] bg-[#F0FAF9] px-3 py-2 text-sm font-bold text-[#005F62]">
          {activeReason ? `${selectedCount}명 선택됨` : "일괄 처리"}
        </span>
        <button
          type="button"
          disabled={lateCount === 0}
          aria-pressed={activeReason === "late"}
          onClick={() => onStart("late")}
          className={[
            "min-h-9 rounded-sm border px-4 text-sm font-bold transition",
            activeReason === "late"
              ? "border-amber-300 bg-amber-50 text-[var(--clinic-warning)]"
              : "border-[#c9d8dd] bg-white text-[var(--clinic-text)] hover:border-amber-200 hover:bg-amber-50",
            lateCount === 0 ? "cursor-not-allowed opacity-45" : "",
          ].join(" ")}
        >
          {activeReason ? "지각 처리" : `지각 ${lateCount}명 선택`}
        </button>
        <button
          type="button"
          disabled={absentCount === 0}
          aria-pressed={activeReason === "absence"}
          onClick={() => onStart("absence")}
          className={[
            "min-h-9 rounded-sm border px-4 text-sm font-bold transition",
            activeReason === "absence"
              ? "border-red-200 bg-red-50 text-[var(--clinic-danger)]"
              : "border-[#c9d8dd] bg-white text-[var(--clinic-text)] hover:border-red-200 hover:bg-red-50",
            absentCount === 0 ? "cursor-not-allowed opacity-45" : "",
          ].join(" ")}
        >
          {activeReason ? "결석 처리" : `결석 ${absentCount}명 선택`}
        </button>
        {activeReason ? (
          <>
            <span className="ml-auto hidden text-xs font-semibold text-[#60717B] xl:inline">
              우측 패널에서 선택 학생 문자 내용을 확인합니다.
            </span>
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-[#006F73] bg-[#007A7C] px-4 text-sm font-bold text-white shadow-[0_1px_2px_rgba(0,95,98,0.18)]"
              aria-label="선택 학생 문자 보내기 패널 보기"
            >
              <Send size={15} aria-hidden="true" />
              문자 보내기
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-[#c9d8dd] bg-white px-3 text-sm font-semibold text-[var(--clinic-muted)] hover:bg-[#f3f9fa]"
            >
              <X size={15} aria-hidden="true" />
              선택 해제
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
    <dl className="grid grid-cols-5 divide-x divide-[var(--clinic-border)] rounded-sm border border-[var(--clinic-border)] bg-[#edf4f6] text-center text-[11px] sm:text-xs">
      {editableStatuses.map((status) => (
        <div key={status} className="min-w-0 px-1.5 py-1.5 sm:px-2 sm:py-2">
          <dt className="truncate font-medium text-[var(--clinic-muted)]">
            {attendanceDisplayLabel(status)}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-[var(--clinic-text)] sm:mt-1 sm:text-base">{summary[status]}</dd>
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
        "inline-flex min-h-8 w-12 items-center rounded-full border p-0.5 transition focus:outline-none focus:ring-2 focus:ring-[var(--clinic-accent)]",
        isPresent
          ? "justify-end border-[var(--clinic-primary)] bg-[var(--clinic-primary)]"
          : "justify-start border-[#c9d8dd] bg-[#e6eef1] hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa]",
        isSaving ? "cursor-wait opacity-60" : "",
      ].join(" ")}
    >
      <span className="sr-only">{isPresent ? "도착을 체크 필요로 변경" : "도착으로 변경"}</span>
      <span
        className={[
          "flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition",
          isPresent ? "text-[var(--clinic-primary)]" : "text-[var(--clinic-muted)]",
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
    return <p className="text-[11px] font-medium text-[var(--clinic-primary)]">저장됨</p>;
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
    <section className={["overflow-hidden rounded-md border border-[var(--clinic-border)] bg-[var(--clinic-panel)] xl:sticky xl:top-5", className].join(" ")}>
      <div className="border-b border-[var(--clinic-border)] bg-[var(--clinic-primary-dark)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[var(--clinic-accent)]" size={18} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">
            {reasonLabel(bulkTarget.reason)} 일괄 문자
          </h3>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto rounded-sm border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/15"
          >
            닫기
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-white/65">
          선택 학생 → 이름 치환 → 연락 기록 저장 → 테스트 발송 순서로 확인합니다.
        </p>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="border-l-4 border-l-[var(--clinic-accent)] bg-[#edf9f7] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--clinic-text)]">
              선택 학생 {selectedStudents.length}명
            </p>
            <span
              className={[
                "rounded-sm px-2 py-1 text-xs font-semibold",
                bulkTarget.reason === "late"
                  ? "border border-amber-200 bg-amber-50 text-[var(--clinic-warning)]"
                  : "border border-red-200 bg-red-50 text-[var(--clinic-danger)]",
              ].join(" ")}
            >
              {reasonLabel(bulkTarget.reason)}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--clinic-muted)]">
            {bulkTarget.session.className} · {bulkTarget.session.startTime}-
            {bulkTarget.session.endTime}
          </p>
          <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {selectedStudents.length > 0 ? (
              selectedStudents.map((student) => (
                <span
                  key={student.id}
                  className="rounded-sm border border-[#c9d8dd] bg-white px-2 py-1 text-xs font-semibold text-[var(--clinic-text)]"
                >
                  {student.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--clinic-danger)]">
                왼쪽 학생 목록에서 문자 대상 학생을 선택해 주세요.
              </span>
            )}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-[var(--clinic-text)]">수신자</legend>
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
                    "min-h-10 rounded-sm border px-2 text-xs font-semibold transition",
                    isSelected
                      ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                      : "border-[#c9d8dd] bg-white text-[var(--clinic-text)] hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa]",
                    isDisabled ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                >
                  {messageRecipientLabels[recipientType]}
                </button>
              );
            })}
          </div>
          {selectedStudentPhoneMissing ? (
            <p className="mt-2 text-xs leading-5 text-[var(--clinic-muted)]">
              학생 연락처가 없는 대상이 있어 학부모 수신으로 처리합니다.
            </p>
          ) : null}
        </fieldset>

        <div>
          <label
            htmlFor="bulk-attendance-followup-message"
            className="text-sm font-semibold text-[var(--clinic-text)]"
          >
            공통 문자 본문
          </label>
          <textarea
            id="bulk-attendance-followup-message"
            value={messageTemplate}
            onChange={(event) => onMessageTemplateChange(event.target.value)}
            rows={8}
            className="mt-2 min-h-36 w-full resize-none rounded-sm border border-[#c9d8dd] bg-white px-3 py-3 text-sm leading-6 text-[var(--clinic-text)] outline-none transition focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#b7ece6]"
          />
          <p
            className={[
              "mt-2 text-xs leading-5",
              isMessageBlank || messageMetrics.isOverLimit
                ? "text-red-700"
                : messageMetrics.transportType === "lms"
                  ? "text-amber-700"
                  : "text-[var(--clinic-muted)]",
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

        <div className="rounded-sm border border-[var(--clinic-border)] bg-[#f4f9fa] p-3 text-sm leading-6 text-[var(--clinic-text)]">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--clinic-primary)]" size={17} />
            <p>
              본문의 `{"{{studentName}}"}` 자리에는 저장/발송 시 학생 이름이 각각 들어갑니다.
              예: {selectedStudents[0]?.name ?? "학생명"}
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
                : "border-[#b7d8d4] bg-[#e3f3f1] text-[var(--clinic-primary-dark)]",
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
              "flex min-h-12 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition",
              canSave
                ? "bg-[var(--clinic-primary)] text-white hover:bg-[var(--clinic-primary-dark)]"
                : "bg-[#d7e3e7] text-[var(--clinic-muted)]",
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
              "flex min-h-12 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition",
              canSend
                ? "bg-[var(--clinic-primary-dark)] text-white hover:bg-[#052f38]"
                : "bg-[#c9d8dd] text-[var(--clinic-primary-dark)]",
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
    <section className={["overflow-hidden rounded-md border border-[var(--clinic-border)] bg-[var(--clinic-panel)] xl:sticky xl:top-5", className].join(" ")}>
      <div className="border-b border-[var(--clinic-border)] bg-[var(--clinic-primary-dark)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[var(--clinic-accent)]" size={18} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">결석/지각 문자</h3>
          {followupTarget ? (
            <button
              type="button"
              onClick={onDismiss}
              className="ml-auto rounded-sm border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/15"
            >
              닫기
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-white/65">
          결석/지각 선택 시 문자 초안이 준비됩니다.
        </p>
      </div>

      {!followupTarget ? (
        <div className="space-y-3 p-3 sm:p-4">
          <div className="rounded-sm border border-[var(--clinic-border)] bg-[#f4f9fa] p-3 text-sm leading-6 text-[var(--clinic-muted)]">
            <p className="font-semibold text-[var(--clinic-text)]">대기 상태</p>
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
          <div className="border-l-4 border-l-[var(--clinic-accent)] bg-[#edf9f7] px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--clinic-primary)]">선택 학생</p>
            <p className="mt-1 text-base font-semibold text-[var(--clinic-text)]">
              {followupTarget.student.name}
            </p>
            <p className="mt-1 text-xs text-[var(--clinic-muted)]">
              {followupTarget.session.className} · {followupTarget.session.startTime}-
              {followupTarget.session.endTime}
            </p>
            <p className="mt-2 inline-flex rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-[var(--clinic-danger)]">
              {reasonLabel(followupTarget.reason)} 안내
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-[var(--clinic-text)]">수신자</legend>
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
                      "min-h-10 rounded-sm border px-2 text-xs font-semibold transition",
                      isSelected
                        ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                        : "border-[#c9d8dd] bg-white text-[var(--clinic-text)] hover:border-[var(--clinic-accent)] hover:bg-[#f4fbfa]",
                      isDisabled ? "cursor-not-allowed opacity-45" : "",
                    ].join(" ")}
                  >
                    {messageRecipientLabels[recipientType]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--clinic-muted)]">
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
                className="truncate text-sm font-semibold text-[var(--clinic-text)]"
              >
                {isPreviewReady ? messagePreview.title : "문자 미리보기"}
              </label>
              <button
                type="button"
                aria-label="원문으로 되돌리기"
                title="원문으로 되돌리기"
                disabled={!isDraftEdited}
                onClick={onRestorePreview}
                className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-[#c9d8dd] bg-white text-[var(--clinic-muted)] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-2 min-h-36 w-full resize-none rounded-sm border border-[#c9d8dd] bg-white px-3 py-3 text-sm leading-6 text-[var(--clinic-text)] outline-none transition disabled:bg-[#eef4f6] disabled:text-[var(--clinic-muted)] focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#b7ece6]"
            />
            <p
              className={[
                "mt-2 text-xs",
                isMessageBlank || messageMetrics.isOverLimit
                  ? "text-red-700"
                  : messageMetrics.transportType === "lms"
                    ? "text-amber-700"
                    : "text-[var(--clinic-muted)]",
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
              "rounded-sm border p-3 text-sm leading-6",
              isPreviewError
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-[var(--clinic-border)] bg-[#f4f9fa] text-[var(--clinic-text)]",
            ].join(" ")}
          >
            <div className="flex items-start gap-2">
              {isPreviewReady && !isPreviewError ? (
                <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--clinic-primary)]" size={17} />
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
                "rounded-sm border p-3 text-sm leading-6",
                followupSaveError
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-[#b7d8d4] bg-[#e3f3f1] text-[var(--clinic-primary-dark)]",
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
              "flex min-h-12 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition",
              canSaveFollowup
                ? "bg-[var(--clinic-primary)] text-white hover:bg-[var(--clinic-primary-dark)]"
                : "bg-[#d7e3e7] text-[var(--clinic-muted)]",
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
                  "flex min-h-12 w-full items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition",
                  canSendMessage
                    ? "bg-[var(--clinic-primary-dark)] text-white hover:bg-[#052f38]"
                    : "bg-[#c9d8dd] text-[var(--clinic-primary-dark)]",
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
                    "rounded-sm border p-3 text-sm leading-6",
                    messageSendError
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-[#b7d8d4] bg-[#e3f3f1] text-[var(--clinic-primary-dark)]",
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

function getSessionSummary(session: AttendanceSession, records: AttendanceRecordItem[]) {
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

  return summarizeSession(session.students, recordsByStudent);
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

function filterDayStudentRows(
  rows: AttendanceDayStudentRow[],
  filter: AttendanceDayStatusFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function dayStatusFilterLabel(filter: AttendanceDayStatusFilter) {
  const labels: Record<AttendanceDayStatusFilter, string> = {
    all: "전체",
    present: "출석",
    late: "지각",
    absent: "결석",
    pending: "미체크",
    needs_check: "확인 필요",
  };

  return labels[filter];
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
    pending: "border-[#C9D7DC] bg-[#EEF4F6] text-[var(--clinic-muted)]",
    present: "border-[#8BC9BF] bg-[#EAF6F4] text-[var(--clinic-primary)]",
    late: "border-amber-300 bg-[#FFF7E8] text-[var(--clinic-warning)]",
    absent: "border-red-300 bg-[#FFF1F0] text-[var(--clinic-danger)]",
    makeup: "border-violet-300 bg-[#F1ECF8] text-[var(--clinic-violet)]",
    excused: "border-violet-300 bg-[#F1ECF8] text-[var(--clinic-violet)]",
    needs_check: "border-red-300 bg-[#FFF1F0] text-[var(--clinic-danger)]",
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

function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function weekdayShortLabel(dayOfWeek: number) {
  return ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek] ?? "-";
}

function normalizeMonthValue(dateOrMonth: string) {
  return dateOrMonth.slice(0, 7);
}

function shiftMonth(monthValue: string, monthOffset: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + monthOffset, 1));

  return date.toISOString().slice(0, 7);
}

function formatMonthTitle(monthValue: string) {
  const [year, month] = monthValue.split("-");

  return `${year}년 ${Number(month)}월 출석부`;
}

function formatDateKoreanLong(dateString: string) {
  const [year, month, day] = dateString.split("-");
  const dayLabel = weekdayShortLabel(getDayOfWeek(dateString));

  return `${year}.${month}.${day} ${dayLabel}요일`;
}

function formatDateKoreanShort(dateString: string) {
  const [, month, day] = dateString.split("-");
  const dayLabel = weekdayShortLabel(getDayOfWeek(dateString));

  return `${Number(month)}.${Number(day)} ${dayLabel}`;
}

function getCalendarGridDays(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const startOffset = firstDay.getUTCDay();
  const endOffset = 6 - lastDay.getUTCDay();
  const startDate = new Date(Date.UTC(year, month - 1, 1 - startOffset));
  const totalDays = lastDay.getUTCDate() + startOffset + endOffset;

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function buildDateSummary(
  classes: AttendanceClass[],
  records: AttendanceRecordItem[],
  dateString: string,
) {
  const dayOfWeek = getDayOfWeek(dateString);
  const dateRecords = records.filter((record) => record.attendanceDate === dateString);
  const sessions = buildAttendanceSessions(classes, dateRecords, dayOfWeek);

  return buildAttendanceOverview(sessions, dateRecords);
}

function buildDayStudentRows(
  sessions: AttendanceSession[],
  records: AttendanceRecordItem[],
): AttendanceDayStudentRow[] {
  return sessions.flatMap((session) => {
    const sessionRecords = records.filter(
      (record) =>
        record.classId === session.classId &&
        record.scheduledStartTime === session.startTime &&
        record.scheduledEndTime === session.endTime,
    );
    const recordsByStudent = new Map(
      sessionRecords.map((record) => [record.studentId, record]),
    );

    return session.students.map((student) => {
      const record = recordsByStudent.get(student.id);

      return {
        id: `${session.key}:${student.id}`,
        student,
        session,
        record,
        status: normalizeAttendanceStatus(record?.status),
      };
    });
  });
}
