"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  MessageSquareText,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { followupReasons, type FollowupReason } from "@/lib/followup-templates";
import { sendBulkMessage } from "@/lib/client/bulk-message-send";
import { fetchBulkMessagePreview } from "@/lib/client/bulk-message-preview";
import { createFollowup, fetchFollowupHistory } from "@/lib/client/followups";
import { saveStudentSchedule } from "@/lib/client/management-api";
import { sendFollowupMessage } from "@/lib/client/message-send";
import { fetchMessagePreview } from "@/lib/client/message-preview";
import { getMessageLengthMetrics } from "@/lib/message-length";
import {
  messageRecipientLabels,
  messageRecipientTypes,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  type FollowupHistoryState,
} from "@/app/app/operations-history";
import {
  getSortedActiveSchedules,
  type OperationsStudentSchedule,
} from "@/app/app/operations-schedule";
import { weekDayShortLabel } from "@/app/app/management-utils";
import type { MakeupCandidate } from "@/app/app/makeup-scheduling";
import {
  OperationsDesktopView,
  OperationsMobileView,
} from "@/app/app/operations-views";

export type OperationsStudent = {
  id: string;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  maskedParentPhone: string;
  maskedStudentPhone: string | null;
  schedules: OperationsStudentSchedule[];
};

export type OperationsClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  students: OperationsStudent[];
};

type OperationsBoardProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  allowAssistantSend: boolean;
  canManage: boolean;
  classes: OperationsClass[];
  initialSelection?: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  } | null;
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

type BulkMessageState = {
  status: "idle" | "sending" | "sent" | "error";
  message: string;
  error: string;
  dryRun: boolean;
  targetStudentCount: number;
  candidateRecipientCount: number;
  recipientCount: number;
  duplicateExcludedCount: number;
};

type BulkMessagePreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  targetStudentCount: number;
  candidateRecipientCount: number;
  recipientCount: number;
  duplicateExcludedCount: number;
};

type MakeupScheduleSaveState = {
  followupId: string;
  status: "idle" | "saving" | "saved" | "error";
  message: string;
  scheduleId: string;
};

export function OperationsBoard({
  academyName,
  teacherName,
  role,
  roleLabel,
  allowAssistantSend,
  canManage,
  classes,
  initialSelection,
}: OperationsBoardProps) {
  const [messageMode, setMessageMode] = useState<"individual" | "bulk">("individual");
  const contactClasses = useMemo(
    () => classes.filter((classItem) => classItem.students.length > 0),
    [classes],
  );
  const visibleClasses = contactClasses.length > 0 ? contactClasses : classes;
  const [selectedClassId, setSelectedClassId] = useState(
    initialSelection?.classId ?? visibleClasses[0]?.id ?? "",
  );
  const selectedClass = useMemo(
    () =>
      visibleClasses.find((classItem) => classItem.id === selectedClassId) ??
      visibleClasses[0],
    [selectedClassId, visibleClasses],
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    initialSelection?.studentId ?? selectedClass?.students[0]?.id ?? "",
  );
  const [selectedReason, setSelectedReason] = useState<FollowupReason>(
    initialSelection?.reason ?? "absence",
  );
  const [selectedRecipientType, setSelectedRecipientType] =
    useState<MessageRecipientType>("parent");
  const [hasMobileFollowupSelection, setHasMobileFollowupSelection] =
    useState(Boolean(initialSelection));
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [makeupCandidateTime, setMakeupCandidateTime] = useState("");
  const [selectedMakeupCandidate, setSelectedMakeupCandidate] =
    useState<MakeupCandidate | null>(null);
  const [makeupScheduleSave, setMakeupScheduleSave] =
    useState<MakeupScheduleSaveState>({
      followupId: "",
      status: "idle",
      message: "",
      scheduleId: "",
    });

  const selectedStudent = useMemo(() => {
    if (!selectedClass) {
      return undefined;
    }

    return (
      selectedClass.students.find((student) => student.id === selectedStudentId) ??
      selectedClass.students[0]
    );
  }, [selectedClass, selectedStudentId]);

  const selectedStudentIdForPreview = selectedStudent?.id ?? "";
  const effectiveRecipientType =
    selectedStudent?.maskedStudentPhone ? selectedRecipientType : "parent";
  const messageKey = `${selectedClass?.id ?? ""}:${selectedStudent?.id ?? ""}:${selectedReason}:${makeupCandidateTime}:${effectiveRecipientType}`;

  const [messagePreview, setMessagePreview] = useState<MessagePreviewState>({
    key: "",
    status: "idle",
    title: "",
    body: "",
    error: "",
  });
  const [messageDraft, setMessageDraft] = useState({ key: "", body: "" });
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
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [followupHistory, setFollowupHistory] = useState<FollowupHistoryState>({
    studentId: "",
    status: "idle",
    items: [],
    error: "",
  });
  const [bulkTargetType, setBulkTargetType] = useState<"all" | "class" | "grade">("all");
  const [bulkClassId, setBulkClassId] = useState(visibleClasses[0]?.id ?? "");
  const [bulkGradeLabel, setBulkGradeLabel] = useState("");
  const [bulkRecipientType, setBulkRecipientType] =
    useState<MessageRecipientType>("parent");
  const [bulkExcludeDuplicates, setBulkExcludeDuplicates] = useState(true);
  const [bulkMessageBody, setBulkMessageBody] = useState(
    `[${academyName}] 안녕하세요. 학원 공지 안내드립니다.\n확인 부탁드립니다.`,
  );
  const [bulkMessageState, setBulkMessageState] = useState<BulkMessageState>({
    status: "idle",
    message: "",
    error: "",
    dryRun: true,
    targetStudentCount: 0,
    candidateRecipientCount: 0,
    recipientCount: 0,
    duplicateExcludedCount: 0,
  });
  const [bulkPreviewState, setBulkPreviewState] = useState<BulkMessagePreviewState>({
    status: "idle",
    error: "",
    targetStudentCount: 0,
    candidateRecipientCount: 0,
    recipientCount: 0,
    duplicateExcludedCount: 0,
  });

  const messageBody =
    messageDraft.key === messageKey
      ? messageDraft.body
      : messagePreview.key === messageKey
        ? messagePreview.body
        : "";
  const isPreviewLoading =
    Boolean(selectedStudentIdForPreview) && messagePreview.key !== messageKey;
  const isPreviewReady =
    messagePreview.key === messageKey && messagePreview.status === "ready";
  const isPreviewError =
    messagePreview.key === messageKey && messagePreview.status === "error";
  const isDraftEdited = isPreviewReady && messageBody !== messagePreview.body;
  const isMessageBlank = isPreviewReady && messageBody.trim().length === 0;
  const isFollowupSaving =
    followupSave.key === messageKey &&
    followupSave.body === messageBody &&
    followupSave.status === "saving";
  const isFollowupSaved =
    followupSave.key === messageKey &&
    followupSave.body === messageBody &&
    followupSave.status === "saved";
  const savedFollowupId = isFollowupSaved ? followupSave.followupId : "";
  const isMessageSending =
    messageSend.followupId === savedFollowupId && messageSend.status === "sending";
  const isMessageSent =
    Boolean(savedFollowupId) &&
    messageSend.followupId === savedFollowupId &&
    messageSend.status === "sent";
  const messageSendError =
    Boolean(savedFollowupId) &&
    messageSend.followupId === savedFollowupId &&
    messageSend.status === "error"
      ? messageSend.error
      : "";
  const followupSaveError =
    followupSave.key === messageKey && followupSave.status === "error"
      ? followupSave.error
      : "";
  const shouldShowMobileSelectionBar =
    hasMobileFollowupSelection && Boolean(selectedStudent);
  const totalStudents = classes.reduce(
    (total, classItem) => total + classItem.students.length,
    0,
  );
  const activeScheduleCount = selectedStudent
    ? getSortedActiveSchedules(selectedStudent.schedules).length
    : 0;
  const visibleFollowupHistory = useMemo(
    () =>
      selectedStudentIdForPreview
        ? followupHistory
        : {
            studentId: "",
            status: "idle" as const,
            items: [],
            error: "",
          },
    [followupHistory, selectedStudentIdForPreview],
  );
  const duplicateDraft = useMemo(() => {
    if (
      !isPreviewReady ||
      !messageBody.trim() ||
      visibleFollowupHistory.status !== "ready"
    ) {
      return null;
    }

    return (
      visibleFollowupHistory.items.find(
        (item) =>
          item.status === "draft" &&
          item.reason === selectedReason &&
          normalizeMessageBody(item.messageBody) === normalizeMessageBody(messageBody),
      ) ?? null
    );
  }, [isPreviewReady, messageBody, selectedReason, visibleFollowupHistory]);
  const duplicateDraftWarning = duplicateDraft
    ? "같은 학생에게 같은 내용의 저장된 초안이 있습니다. 기존 초안을 발송하거나 문구를 수정해 새 기록으로 저장해 주세요."
    : "";
  const bulkGradeOptions = useMemo(() => {
    const grades = new Set<string>();

    visibleClasses.forEach((classItem) => {
      if (classItem.gradeLabel) {
        grades.add(classItem.gradeLabel);
      }

      classItem.students.forEach((student) => {
        if (student.gradeLabel) {
          grades.add(student.gradeLabel);
        }
      });
    });

    return Array.from(grades).sort((left, right) => left.localeCompare(right, "ko"));
  }, [visibleClasses]);

  useEffect(() => {
    if (!canManage) {
      return;
    }

    if (
      (bulkTargetType === "class" && !bulkClassId) ||
      (bulkTargetType === "grade" && !bulkGradeLabel)
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadBulkPreview() {
      setBulkPreviewState((previousState) => ({
        ...previousState,
        status: "loading",
        error: "",
      }));

      try {
        const payload = await fetchBulkMessagePreview(
          {
            targetType: bulkTargetType,
            classId: bulkTargetType === "class" ? bulkClassId : undefined,
            gradeLabel: bulkTargetType === "grade" ? bulkGradeLabel : undefined,
            recipientType: bulkRecipientType,
            excludeDuplicateRecipients: bulkExcludeDuplicates,
          },
          controller.signal,
        );

        setBulkPreviewState({
          status: "ready",
          error: "",
          targetStudentCount: payload.targetStudentCount ?? 0,
          candidateRecipientCount: payload.candidateRecipientCount ?? 0,
          recipientCount: payload.recipientCount ?? 0,
          duplicateExcludedCount: payload.duplicateExcludedCount ?? 0,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setBulkPreviewState({
          status: "error",
          error:
            error instanceof Error ? error.message : "전체문자 대상을 확인하지 못했습니다.",
          targetStudentCount: 0,
          candidateRecipientCount: 0,
          recipientCount: 0,
          duplicateExcludedCount: 0,
        });
      }
    }

    void loadBulkPreview();

    return () => {
      controller.abort();
    };
  }, [
    canManage,
    bulkTargetType,
    bulkClassId,
    bulkGradeLabel,
    bulkRecipientType,
    bulkExcludeDuplicates,
  ]);

  useEffect(() => {
    if (!selectedStudentIdForPreview) {
      return;
    }

    const controller = new AbortController();
    const nextMessageKey = messageKey;

    async function loadPreview() {
      try {
        const payload = await fetchMessagePreview(
          {
            studentId: selectedStudentIdForPreview,
            reason: selectedReason,
            makeupCandidateTime,
          },
          controller.signal,
        );

        setMessagePreview({
          key: nextMessageKey,
          status: "ready",
          title: payload.title ?? "문자 미리보기",
          body: payload.body,
          error: "",
        });
        setMessageDraft({ key: nextMessageKey, body: payload.body });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setMessagePreview({
          key: nextMessageKey,
          status: "error",
          title: "",
          body: "",
          error:
            error instanceof Error
              ? error.message
              : "문자 미리보기를 만들지 못했습니다.",
        });
        setMessageDraft({ key: "", body: "" });
      }
    }

    void loadPreview();

    return () => {
      controller.abort();
    };
  }, [makeupCandidateTime, messageKey, selectedReason, selectedStudentIdForPreview]);

  useEffect(() => {
    if (!selectedStudentIdForPreview) {
      return;
    }

    const controller = new AbortController();
    const studentId = selectedStudentIdForPreview;

    async function loadHistory() {
      setFollowupHistory((current) => ({
        studentId,
        status: "loading",
        items: current.studentId === studentId ? current.items : [],
        error: "",
      }));

      try {
        const payload = await fetchFollowupHistory(studentId, controller.signal);

        setFollowupHistory({
          studentId,
          status: "ready",
          items: payload.followups ?? [],
          error: "",
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setFollowupHistory({
          studentId,
          status: "error",
          items: [],
          error:
            error instanceof Error
              ? error.message
              : "연락 기록을 불러오지 못했습니다.",
        });
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [historyRefreshToken, selectedStudentIdForPreview]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    function handleViewportChange() {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);

      if (!isMobile) {
        setIsMobileComposerOpen(false);
        document.body.style.overflow = "";
      }
    }

    handleViewportChange();
    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!isMobileComposerOpen || !isMobileViewport) {
      document.body.style.overflow = "";
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileComposerOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileComposerOpen, isMobileViewport]);

  function handleClassSelect(classId: string) {
    const nextClass = visibleClasses.find((classItem) => classItem.id === classId);
    setSelectedClassId(classId);
    setSelectedStudentId(nextClass?.students[0]?.id ?? "");
    setHasMobileFollowupSelection(false);
    setIsMobileComposerOpen(false);
    setMakeupCandidateTime("");
    setSelectedMakeupCandidate(null);
    setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
  }

  function resetBulkMessageResult() {
    setBulkMessageState({
      status: "idle",
      message: "",
      error: "",
      dryRun: true,
      targetStudentCount: 0,
      candidateRecipientCount: 0,
      recipientCount: 0,
      duplicateExcludedCount: 0,
    });
  }

  function resetBulkPreview() {
    setBulkPreviewState({
      status: "idle",
      error: "",
      targetStudentCount: 0,
      candidateRecipientCount: 0,
      recipientCount: 0,
      duplicateExcludedCount: 0,
    });
  }

  function handleBulkTargetTypeChange(nextTargetType: "all" | "class" | "grade") {
    setBulkTargetType(nextTargetType);
    resetBulkMessageResult();

    if (
      (nextTargetType === "class" && !bulkClassId) ||
      (nextTargetType === "grade" && !bulkGradeLabel)
    ) {
      resetBulkPreview();
    }
  }

  function handleBulkClassIdChange(nextClassId: string) {
    setBulkClassId(nextClassId);
    resetBulkMessageResult();

    if (!nextClassId) {
      resetBulkPreview();
    }
  }

  function handleBulkGradeLabelChange(nextGradeLabel: string) {
    setBulkGradeLabel(nextGradeLabel);
    resetBulkMessageResult();

    if (!nextGradeLabel) {
      resetBulkPreview();
    }
  }

  function handleBulkRecipientTypeChange(nextRecipientType: MessageRecipientType) {
    setBulkRecipientType(nextRecipientType);
    resetBulkMessageResult();
  }

  function handleBulkExcludeDuplicatesChange(enabled: boolean) {
    setBulkExcludeDuplicates(enabled);
    resetBulkMessageResult();
  }

  async function handleSendBulkMessage() {
    const normalizedBody = bulkMessageBody.trim();

    if (!canManage || !normalizedBody || bulkMessageState.status === "sending") {
      return;
    }

    setBulkMessageState({
      status: "sending",
      message: "",
      error: "",
      dryRun: true,
      targetStudentCount: 0,
      candidateRecipientCount: 0,
      recipientCount: 0,
      duplicateExcludedCount: 0,
    });

    try {
      const payload = await sendBulkMessage({
        targetType: bulkTargetType,
        classId: bulkTargetType === "class" ? bulkClassId : undefined,
        gradeLabel: bulkTargetType === "grade" ? bulkGradeLabel : undefined,
        recipientType: bulkRecipientType,
        messageBody: normalizedBody,
        excludeDuplicateRecipients: bulkExcludeDuplicates,
      });

      setBulkMessageState({
        status: "sent",
        message:
          payload.message ??
          (payload.dryRun ? "전체문자 테스트 발송 기록을 저장했습니다." : "전체문자를 발송했습니다."),
        error: "",
        dryRun: payload.dryRun ?? true,
        targetStudentCount: payload.targetStudentCount ?? 0,
        candidateRecipientCount: payload.candidateRecipientCount ?? 0,
        recipientCount: payload.recipientCount ?? 0,
        duplicateExcludedCount: payload.duplicateExcludedCount ?? 0,
      });
    } catch (error) {
      setBulkMessageState({
        status: "error",
        message: "",
        error:
          error instanceof Error ? error.message : "전체문자를 처리하지 못했습니다.",
        dryRun: true,
        targetStudentCount: 0,
        candidateRecipientCount: 0,
        recipientCount: 0,
        duplicateExcludedCount: 0,
      });
    }
  }

  function handleStudentSelect(studentId: string) {
    setSelectedStudentId(studentId);
    setHasMobileFollowupSelection(true);
    setIsMobileComposerOpen(isMobileViewport);
    setMakeupCandidateTime("");
    setSelectedMakeupCandidate(null);
    setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
  }

  function handleStudentReasonSelect(studentId: string, reasonId: FollowupReason) {
    setSelectedStudentId(studentId);
    setSelectedReason(reasonId);
    setHasMobileFollowupSelection(true);
    setIsMobileComposerOpen(isMobileViewport);
    setMakeupCandidateTime("");
    setSelectedMakeupCandidate(null);
    setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
  }

  function handleComposerReasonChange(reasonId: FollowupReason) {
    setSelectedReason(reasonId);
    setHasMobileFollowupSelection(Boolean(selectedStudent));
    if (reasonId !== "makeup") {
      setMakeupCandidateTime("");
      setSelectedMakeupCandidate(null);
      setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
    }
  }

  function handleMakeupCandidateSelect(schedule: OperationsStudentSchedule) {
    setSelectedReason("makeup");
    setMakeupCandidateTime(
      `${weekDayShortLabel(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`,
    );
    setSelectedMakeupCandidate(null);
    setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
    setHasMobileFollowupSelection(Boolean(selectedStudent));
    setIsMobileComposerOpen(false);
  }

  function handleDateMakeupCandidateSelect(candidate: MakeupCandidate) {
    setSelectedReason("makeup");
    setSelectedMakeupCandidate(candidate);
    setMakeupCandidateTime(candidate.label);
    setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
    setHasMobileFollowupSelection(Boolean(selectedStudent));
    setIsMobileComposerOpen(false);
  }

  function handleRestorePreview() {
    if (!isPreviewReady) {
      return;
    }

    setMessageDraft({ key: messageKey, body: messagePreview.body });
  }

  async function handleSaveFollowup() {
    if (!selectedStudent || !isPreviewReady || isMessageBlank) {
      return;
    }

    const bodyToSave = messageBody.trim();

    setFollowupSave({
      key: messageKey,
      body: bodyToSave,
      status: "saving",
      error: "",
      followupId: "",
    });

    try {
      const payload = await createFollowup({
        studentId: selectedStudent.id,
        reason: selectedReason,
        messageBody: bodyToSave,
        recipientType: effectiveRecipientType,
      });

      setFollowupSave({
        key: messageKey,
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
      setMakeupScheduleSave({ followupId: "", status: "idle", message: "", scheduleId: "" });
      setHistoryRefreshToken((value) => value + 1);
    } catch (error) {
      setFollowupSave({
        key: messageKey,
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

  async function handleSendMessage() {
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
      setHistoryRefreshToken((value) => value + 1);
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

  async function handleRegisterMakeupSchedule() {
    if (
      !selectedStudent ||
      !selectedClass ||
      !selectedMakeupCandidate ||
      !savedFollowupId ||
      makeupScheduleSave.status === "saving"
    ) {
      return;
    }

    setMakeupScheduleSave({
      followupId: savedFollowupId,
      status: "saving",
      message: "",
      scheduleId: "",
    });

    try {
      const payload = await saveStudentSchedule({
        studentId: selectedStudent.id,
        classId: selectedClass.id,
        teacherId: "",
        scheduleType: "makeup",
        scheduleDate: selectedMakeupCandidate.date,
        dayOfWeek: selectedMakeupCandidate.dayOfWeek,
        startTime: selectedMakeupCandidate.startTime,
        endTime: selectedMakeupCandidate.endTime,
        subject: selectedClass.subject ?? "",
        title: `${selectedStudent.name} 보강`,
        memo: `${selectedMakeupCandidate.label} 문자 발송 후 자동 등록`,
        isActive: true,
        sourceFollowupId: savedFollowupId,
      }, "create");

      if (!payload.schedule) {
        throw new Error(payload.error ?? "보강 스케줄을 등록하지 못했습니다.");
      }

      setMakeupScheduleSave({
        followupId: savedFollowupId,
        status: "saved",
        message: "보강 스케줄을 등록했습니다. 관리 탭에서 수정할 수 있습니다.",
        scheduleId: payload.schedule.id,
      });
    } catch (error) {
      setMakeupScheduleSave({
        followupId: savedFollowupId,
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "보강 스케줄을 등록하지 못했습니다.",
        scheduleId: "",
      });
    }
  }

  if (classes.length === 0) {
    const emptyMessage = roleLabel.includes("보조")
      ? "아직 담당 반이 배정되지 않았습니다. 원장 또는 관리자에게 담당 반 배정을 요청해 주세요."
      : roleLabel.includes("선생")
        ? "아직 담당 반이 없습니다. 원장 또는 관리자가 반의 담당 선생님으로 지정하면 수업과 학생 목록이 표시됩니다."
        : "파일럿 시연을 위해 먼저 반과 학생 데이터를 추가해야 합니다.";

    return (
        <section className="border border-[#B8C9D0] bg-[#F4F8F9] p-6">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 text-amber-700" size={21} />
          <div>
            <h2 className="text-lg font-semibold text-stone-950">등록된 반이 없습니다</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {emptyMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const canRegisterMakeupSchedule =
    selectedReason === "makeup" &&
    Boolean(selectedMakeupCandidate) &&
    Boolean(savedFollowupId) &&
    isMessageSent;
  const assistantSendBlockedMessage =
    role === "assistant" && !allowAssistantSend
      ? "보조 선생님은 현재 테스트 발송 권한이 없습니다. 연락 기록 저장은 가능하며, 발송은 원장/관리자에게 요청하세요."
      : "";
  const commonComposerProps = {
    isDraftEdited,
    isMessageBlank,
    isFollowupSaved,
    isFollowupSaving,
    isMessageSending,
    isMessageSent,
    isPreviewError,
    isPreviewLoading,
    isPreviewReady,
    followupSaveError,
    messageBody,
    messagePreview,
    messageSend,
    messageSendError,
    duplicateDraftWarning,
    makeupCandidateTime,
    makeupScheduleSave,
    selectedMakeupCandidate,
    selectedReason,
    selectedStudent,
    selectedRecipientType: effectiveRecipientType,
    sendBlockedMessage: assistantSendBlockedMessage,
    canRegisterMakeupSchedule,
    onReasonChange: handleComposerReasonChange,
    onRecipientTypeChange: setSelectedRecipientType,
    onRegisterMakeupSchedule: handleRegisterMakeupSchedule,
    onRestorePreview: handleRestorePreview,
    onSaveFollowup: handleSaveFollowup,
    onSendMessage: handleSendMessage,
    onMessageChange: (body: string) => setMessageDraft({ key: messageKey, body }),
  };

  return (
    <div
      className={[
        "mx-auto max-w-none space-y-4 sm:space-y-5",
        shouldShowMobileSelectionBar
          ? "pb-[calc(13rem+env(safe-area-inset-bottom))] lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "pb-[max(1rem,env(safe-area-inset-bottom))]",
      ].join(" ")}
    >
      {canManage ? (
        <MessageModeTabs activeMode={messageMode} onChange={setMessageMode} />
      ) : null}

      {canManage && messageMode === "bulk" ? (
        <BulkMessagePanel
          classes={visibleClasses}
          gradeOptions={bulkGradeOptions}
          targetType={bulkTargetType}
          classId={bulkClassId}
          gradeLabel={bulkGradeLabel}
          recipientType={bulkRecipientType}
          excludeDuplicates={bulkExcludeDuplicates}
          messageBody={bulkMessageBody}
          previewState={bulkPreviewState}
          state={bulkMessageState}
          onTargetTypeChange={handleBulkTargetTypeChange}
          onClassIdChange={handleBulkClassIdChange}
          onGradeLabelChange={handleBulkGradeLabelChange}
          onRecipientTypeChange={handleBulkRecipientTypeChange}
          onExcludeDuplicatesChange={handleBulkExcludeDuplicatesChange}
          onMessageBodyChange={setBulkMessageBody}
          onSend={handleSendBulkMessage}
        />
      ) : (
        <>
      <OperationsDesktopView
        academyName={academyName}
        teacherName={teacherName}
        classes={visibleClasses}
        selectedClass={selectedClass}
        selectedStudent={selectedStudent}
        selectedReason={selectedReason}
        selectedMakeupCandidate={selectedMakeupCandidate}
        visibleFollowupHistory={visibleFollowupHistory}
        totalStudents={totalStudents}
        activeScheduleCount={activeScheduleCount}
        desktopComposer={
          <MessageComposer
            {...commonComposerProps}
            className="min-w-0 lg:col-span-2 xl:col-span-1"
            composerId="desktop-message-composer"
          />
        }
        mobileComposer={null}
        isMobileComposerOpen={false}
        shouldShowMobileSelectionBar={false}
        isPreviewLoading={isPreviewLoading}
        isPreviewReady={isPreviewReady}
        onClassSelect={handleClassSelect}
        onStudentSelect={handleStudentSelect}
        onStudentReasonSelect={handleStudentReasonSelect}
        onDateMakeupCandidateSelect={handleDateMakeupCandidateSelect}
        onMakeupCandidateSelect={handleMakeupCandidateSelect}
        onOpenMobileComposer={() => undefined}
        onCloseMobileComposer={() => undefined}
      />

      <OperationsMobileView
        academyName={academyName}
        teacherName={teacherName}
        classes={visibleClasses}
        selectedClass={selectedClass}
        selectedStudent={selectedStudent}
        selectedReason={selectedReason}
        selectedMakeupCandidate={selectedMakeupCandidate}
        visibleFollowupHistory={visibleFollowupHistory}
        totalStudents={totalStudents}
        activeScheduleCount={activeScheduleCount}
        desktopComposer={null}
        mobileComposer={
          <MessageComposer
            {...commonComposerProps}
            className="rounded-none border-0 shadow-none"
            composerId="mobile-message-composer"
            onClose={() => setIsMobileComposerOpen(false)}
          />
        }
        isMobileComposerOpen={isMobileComposerOpen && isMobileViewport}
        shouldShowMobileSelectionBar={shouldShowMobileSelectionBar}
        isPreviewLoading={isPreviewLoading}
        isPreviewReady={isPreviewReady}
        onClassSelect={handleClassSelect}
        onStudentSelect={handleStudentSelect}
        onStudentReasonSelect={handleStudentReasonSelect}
        onDateMakeupCandidateSelect={handleDateMakeupCandidateSelect}
        onMakeupCandidateSelect={handleMakeupCandidateSelect}
        onOpenMobileComposer={() => setIsMobileComposerOpen(true)}
        onCloseMobileComposer={() => setIsMobileComposerOpen(false)}
      />
        </>
      )}
    </div>
  );
}

function MessageModeTabs({
  activeMode,
  onChange,
}: {
  activeMode: "individual" | "bulk";
  onChange: (mode: "individual" | "bulk") => void;
}) {
  return (
    <div className="flex flex-wrap border border-[#D8D6DE] bg-[#F4F4F1]">
      {[
        { id: "individual" as const, label: "개별 연락", detail: "학생별 문자" },
        { id: "bulk" as const, label: "전체문자", detail: "중복 번호 제외" },
      ].map((item) => {
        const isActive = activeMode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.id)}
            className={[
              "min-h-10 min-w-[10rem] border-r border-r-[#DEDEE4] px-3 text-left transition last:border-r-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D8DAFA]",
              isActive
                ? "bg-[#FFFEFA] text-[#17232B]"
                : "bg-[#F4F4F1] text-[#5F6368] hover:bg-[#F7F7FA]",
            ].join(" ")}
          >
            <span className="block text-sm font-bold">{item.label}</span>
            <span className={["mt-0.5 block text-xs", isActive ? "text-[#2f3437]" : "text-[#6F737C]"].join(" ")}>
              {item.detail}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BulkMessagePanel({
  classes,
  gradeOptions,
  targetType,
  classId,
  gradeLabel,
  recipientType,
  excludeDuplicates,
  messageBody,
  previewState,
  state,
  onTargetTypeChange,
  onClassIdChange,
  onGradeLabelChange,
  onRecipientTypeChange,
  onExcludeDuplicatesChange,
  onMessageBodyChange,
  onSend,
}: {
  classes: OperationsClass[];
  gradeOptions: string[];
  targetType: "all" | "class" | "grade";
  classId: string;
  gradeLabel: string;
  recipientType: MessageRecipientType;
  excludeDuplicates: boolean;
  messageBody: string;
  previewState: BulkMessagePreviewState;
  state: BulkMessageState;
  onTargetTypeChange: (targetType: "all" | "class" | "grade") => void;
  onClassIdChange: (classId: string) => void;
  onGradeLabelChange: (gradeLabel: string) => void;
  onRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onExcludeDuplicatesChange: (enabled: boolean) => void;
  onMessageBodyChange: (body: string) => void;
  onSend: () => void;
}) {
  const metrics = getMessageLengthMetrics(messageBody);
  const canSend =
    messageBody.trim().length > 0 &&
    !metrics.isOverLimit &&
    previewState.status === "ready" &&
    previewState.recipientCount > 0 &&
    state.status !== "sending" &&
    (targetType !== "class" || Boolean(classId)) &&
    (targetType !== "grade" || Boolean(gradeLabel));

  return (
    <section className="border border-[#B8C9D0] bg-[#F4F8F9]">
      <div className="border-b border-stone-200 px-4 py-4">
        <p className="text-sm font-semibold text-[#62656f]">전체문자</p>
        <h2 className="mt-1 text-xl font-semibold text-stone-950">
          여러 반에 같은 안내를 한 번에 보냅니다
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          같은 학생이 여러 반에 있거나 같은 보호자 번호가 반복되면 중복 제외 기준으로 1건만 발송 후보에 남깁니다.
        </p>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-stone-800">대상 범위</legend>
            <div className="mt-2 grid grid-cols-3 border border-[#D8D6DE] bg-[#F4F4F1]">
              {[
                { id: "all" as const, label: "전체 학생" },
                { id: "class" as const, label: "반 선택" },
                { id: "grade" as const, label: "학년 선택" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={targetType === item.id}
                  onClick={() => onTargetTypeChange(item.id)}
                  className={[
                    "min-h-10 border-r border-r-[#DEDEE4] px-2 text-xs font-bold transition last:border-r-0",
                    targetType === item.id
                      ? "bg-[#FFFEFA] text-[#1F2328]"
                      : "bg-[#F4F4F1] text-[#5F6368] hover:bg-[#F7F7FA]",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          {targetType === "class" ? (
            <label className="grid gap-1.5 text-sm font-medium text-stone-800">
              반
              <select
                value={classId}
                onChange={(event) => onClassIdChange(event.target.value)}
                className="min-h-11 border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#007A7C] focus:ring-2 focus:ring-[#84C7CB]"
              >
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} · {classItem.students.length}명
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {targetType === "grade" ? (
            <label className="grid gap-1.5 text-sm font-medium text-stone-800">
              학년
              <select
                value={gradeLabel}
                onChange={(event) => onGradeLabelChange(event.target.value)}
                className="min-h-11 border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#007A7C] focus:ring-2 focus:ring-[#84C7CB]"
              >
                <option value="">학년 선택</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <fieldset>
            <legend className="text-sm font-semibold text-stone-800">수신자</legend>
            <div className="mt-2 grid grid-cols-3 border border-[#D8D6DE] bg-[#F4F4F1]">
              {messageRecipientTypes.map((nextType) => (
                <button
                  key={nextType}
                  type="button"
                  aria-pressed={recipientType === nextType}
                  onClick={() => onRecipientTypeChange(nextType)}
                  className={[
                    "min-h-10 border-r border-r-[#DEDEE4] px-2 text-xs font-bold transition last:border-r-0",
                    recipientType === nextType
                      ? "bg-[#FFFEFA] text-[#1F2328]"
                      : "bg-[#F4F4F1] text-[#5F6368] hover:bg-[#F7F7FA]",
                  ].join(" ")}
                >
                  {messageRecipientLabels[nextType]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 border border-amber-300 bg-[#FFF7E8] p-3 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={excludeDuplicates}
              onChange={(event) => onExcludeDuplicatesChange(event.target.checked)}
              className="mt-1 size-4 accent-[#2f3437]"
            />
            <span>
              <span className="block font-semibold">중복 수신자 제외</span>
              <span className="mt-1 block leading-6">
                같은 전화번호가 여러 반/학생에 있으면 발송 후보에서 한 번만 남깁니다.
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
            문자 본문
            <textarea
              value={messageBody}
              onChange={(event) => onMessageBodyChange(event.target.value)}
              rows={9}
              className="min-h-52 border border-[#B8C9D0] bg-[#F7FAFA] px-3 py-3 text-sm leading-6 outline-none focus:border-[#007A7C] focus:ring-2 focus:ring-[#84C7CB]"
            />
          </label>
          <p
            className={[
              "text-xs",
              metrics.isOverLimit
                ? "text-red-700"
                : metrics.transportType === "lms"
                  ? "text-amber-700"
                  : "text-stone-500",
            ].join(" ")}
          >
            {metrics.charCount}자 · {metrics.byteCount}byte ·{" "}
            {metrics.isOverLimit
              ? "2000byte 초과"
              : metrics.transportType === "lms"
                ? "LMS 예상"
                : "SMS 예상"}
          </p>

          <div className="border border-[#D8D6DE] bg-[#FFFEFA] px-3 py-2.5 text-sm text-[#3F434A]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="font-bold text-[#1F3F58]">발송 전 확인</p>
              {previewState.status === "loading" ? (
                <span className="text-xs font-medium text-[#557A96]">확인 중</span>
              ) : null}
            </div>
            {previewState.status === "error" ? (
              <p className="mt-2 leading-6 text-red-700">{previewState.error}</p>
            ) : (
              <p className="mt-2 leading-6">
                대상 {previewState.targetStudentCount}명 · 발송 후보{" "}
                {previewState.candidateRecipientCount}건 · 실제 발송{" "}
                {previewState.recipientCount}건 · 중복 제외{" "}
                {previewState.duplicateExcludedCount}건
              </p>
            )}
            <p className="mt-1 text-xs leading-5 text-[#557A96]">
              실제 발송 건수는 중복 수신자 제외 설정과 연락처 등록 상태를 반영합니다.
            </p>
          </div>

          {state.status === "sent" ? (
            <div className="border border-[#D8D6DE] bg-[#FFFEFA] px-3 py-2.5 text-sm leading-6 text-[#3F434A]">
              <p className="font-semibold">{state.message}</p>
              <p className="mt-1">
                대상 {state.targetStudentCount}명 · 발송 후보 {state.candidateRecipientCount}건 · 실제 발송 {state.recipientCount}건 · 중복 제외 {state.duplicateExcludedCount}건
              </p>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="border border-red-300 bg-[#FFF1F0] p-3 text-sm leading-6 text-red-900">
              {state.error}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSend}
            onClick={onSend}
            className={[
              "flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm font-bold transition",
              canSend
                ? "bg-[#2f3437] text-white hover:bg-[#17191f]"
                : "bg-stone-300 text-stone-600",
            ].join(" ")}
          >
            <Send size={17} />
            {state.status === "sending" ? "전체문자 처리 중" : "전체문자 테스트 발송"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MessageComposer({
  className = "",
  composerId,
  isDraftEdited,
  isMessageBlank,
  isFollowupSaved,
  isFollowupSaving,
  isMessageSending,
  isMessageSent,
  isPreviewError,
  isPreviewLoading,
  isPreviewReady,
  followupSaveError,
  messageBody,
  messagePreview,
  messageSend,
  messageSendError,
  duplicateDraftWarning,
  makeupCandidateTime,
  makeupScheduleSave,
  selectedMakeupCandidate,
  selectedReason,
  selectedStudent,
  selectedRecipientType,
  canRegisterMakeupSchedule,
  sendBlockedMessage,
  onClose,
  onReasonChange,
  onRecipientTypeChange,
  onRegisterMakeupSchedule,
  onRestorePreview,
  onSaveFollowup,
  onSendMessage,
  onMessageChange,
}: {
  className?: string;
  composerId: string;
  isDraftEdited: boolean;
  isMessageBlank: boolean;
  isFollowupSaved: boolean;
  isFollowupSaving: boolean;
  isMessageSending: boolean;
  isMessageSent: boolean;
  isPreviewError: boolean;
  isPreviewLoading: boolean;
  isPreviewReady: boolean;
  followupSaveError: string;
  messageBody: string;
  messagePreview: MessagePreviewState;
  messageSend: MessageSendState;
  messageSendError: string;
  duplicateDraftWarning: string;
  makeupCandidateTime: string;
  makeupScheduleSave: MakeupScheduleSaveState;
  selectedMakeupCandidate: MakeupCandidate | null;
  selectedReason: FollowupReason;
  selectedStudent: OperationsStudent | undefined;
  selectedRecipientType: MessageRecipientType;
  canRegisterMakeupSchedule: boolean;
  sendBlockedMessage: string;
  onClose?: () => void;
  onReasonChange: (reason: FollowupReason) => void;
  onRecipientTypeChange: (recipientType: MessageRecipientType) => void;
  onRegisterMakeupSchedule: () => void;
  onRestorePreview: () => void;
  onSaveFollowup: () => void;
  onSendMessage: () => void;
  onMessageChange: (body: string) => void;
}) {
  const messageMetrics = getMessageLengthMetrics(messageBody);
  const canSaveFollowup =
    isPreviewReady &&
    !isMessageBlank &&
    !messageMetrics.isOverLimit &&
    !isFollowupSaving &&
    !duplicateDraftWarning;
  const canSendMessage = isFollowupSaved && !isMessageSending && !sendBlockedMessage;

  return (
    <section
      id={composerId}
      aria-labelledby={`${composerId}-title`}
      className={[
        "message-zone-compose border lg:sticky lg:top-4 lg:self-start",
        className,
      ].join(" ")}
    >
      <div className="border-b border-[#DED8CF] bg-[#F7F6F2] px-4 py-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[#62656f]" size={18} aria-hidden="true" />
          <h2 id={`${composerId}-title`} className="text-base font-bold text-[#1F2328]">
            문자 초안
          </h2>
          {isPreviewReady ? (
            <span className="ml-auto border border-[#d7dbe0] bg-[#f6f7f8] px-2 py-0.5 text-xs font-bold text-[#62656f]">
              수정 가능
            </span>
          ) : null}
          {onClose ? (
            <button
              type="button"
              aria-label="문자 작성 닫기"
              title="닫기"
              onClick={onClose}
              className="ml-1 flex size-8 shrink-0 items-center justify-center border border-[#d7dbe0] bg-[#f6f7f8] text-[#62656f]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#5F6368]">
          {selectedStudent
            ? `현재 선택: ${selectedStudent.name} · ${followupReasons.find((reason) => reason.id === selectedReason)?.label ?? selectedReason}`
            : "학생을 선택하면 문자 초안이 표시됩니다."}
        </p>
      </div>

      <div className="space-y-3 p-3">
        {selectedStudent ? (
          <div className="message-zone-compose-panel overflow-hidden border">
            <div className="border-b border-[#DEDEE4] bg-[#F7F7FA] px-4 py-3">
              <p className="text-xs font-bold text-[#6A6F7D]">선택 학생</p>
              <p className="mt-1 truncate text-lg font-bold tracking-[-0.01em] text-[#17232B]">
                {selectedStudent.name}
              </p>
              <p className="mt-1 truncate text-xs text-[#5F6368]">
                {selectedStudent.parentName ?? "학부모"} · {selectedStudent.maskedParentPhone}
              </p>
            </div>
            <ComposerSummaryRow
              label="처리 사유"
              value={followupReasons.find((reason) => reason.id === selectedReason)?.label ?? selectedReason}
            />
            <ComposerSummaryRow
              label="학생 연락처"
              value={selectedStudent.maskedStudentPhone ?? "미등록"}
            />
            {selectedReason === "makeup" && makeupCandidateTime ? (
              <ComposerSummaryRow label="보강 후보" value={makeupCandidateTime} tone="blue" />
            ) : null}
            {selectedReason === "makeup" && !selectedMakeupCandidate && makeupCandidateTime ? (
              <p className="border-t border-[#DED8CF] px-4 py-2 text-xs font-semibold text-[#5F6368]">
                주간 반복 시간 기준입니다. 날짜별 보강 등록은 달력에서 날짜를 선택해야 합니다.
              </p>
            ) : null}
          </div>
        ) : null}

        <fieldset className="message-zone-compose-panel border p-3">
          <legend className="px-1 text-sm font-bold text-[#1F2328]">사유 선택</legend>
          <p className="mt-1 text-xs leading-5 text-[#5F6368]">
            사유를 바꾸면 아래 문자 초안만 다시 준비됩니다. 기록 저장과 테스트 발송은 하단 버튼에서 따로 실행합니다.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {followupReasons.map((reason) => {
              const isSelected = reason.id === selectedReason;
              return (
                <button
                  key={reason.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onReasonChange(reason.id)}
                  className={[
                    "min-h-10 border px-3 text-left text-sm font-bold transition",
                    isSelected
                      ? "border-[#B9B8F0] bg-[#F6F6FF] text-[#34396F]"
                      : "border-[#DEDEE4] bg-[#FFFEFA] text-[#3F434A] hover:border-[#C9C7D2] hover:bg-[#F7F7FA]",
                  ].join(" ")}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="message-zone-compose-panel border p-3">
          <legend className="px-1 text-sm font-bold text-[#1F2328]">수신자</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {messageRecipientTypes.map((recipientType) => {
              const needsStudentPhone = recipientType !== "parent";
              const isDisabled =
                needsStudentPhone && !selectedStudent?.maskedStudentPhone;
              const isSelected = selectedRecipientType === recipientType;

              return (
                <button
                  key={recipientType}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => onRecipientTypeChange(recipientType)}
                  className={[
                    "min-h-10 border px-2 text-xs font-bold transition",
                    isSelected
                      ? "border-[#B9B8F0] bg-[#F6F6FF] text-[#34396F]"
                      : "border-[#DEDEE4] bg-[#FFFEFA] text-[#3F434A] hover:border-[#C9C7D2] hover:bg-[#F7F7FA]",
                    isDisabled ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                >
                  {messageRecipientLabels[recipientType]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#5F6368]">
            학생 연락처: {selectedStudent?.maskedStudentPhone ?? "미등록"}
          </p>
        </fieldset>

        <div className="message-zone-compose-panel border p-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`${composerId}-message-body`}
              className="truncate text-sm font-bold text-[#17232B]"
            >
              {isPreviewReady ? messagePreview.title : "문자 미리보기"}
            </label>
            <button
              type="button"
              aria-label="원문으로 되돌리기"
              title="원문으로 되돌리기"
              disabled={!isDraftEdited}
              onClick={onRestorePreview}
              className="flex size-8 shrink-0 items-center justify-center border border-[#DED8CF] bg-[#FFFEFA] text-[#5F6368] transition hover:border-[#C9CDF5] hover:bg-[#F7F7FF] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          </div>
          <textarea
            id={`${composerId}-message-body`}
            value={messageBody}
            onChange={(event) => onMessageChange(event.target.value)}
            disabled={!isPreviewReady}
            aria-busy={isPreviewLoading}
            placeholder={
              isPreviewLoading
                ? "문자 초안을 불러오는 중입니다."
                : "학생과 사유를 선택하면 문자 초안이 표시됩니다."
            }
            rows={8}
            className="mt-2 h-40 w-full resize-none border border-[#D6D0C6] bg-[#FFFEFA] px-3 py-3 text-sm leading-6 text-[#1F2328] outline-none transition disabled:bg-[#F0EEE8] disabled:text-[#8A8780] focus:border-[#aeb5bf] focus:ring-2 focus:ring-[#e1e4e8] sm:h-44"
          />
          <p
            className={[
              "mt-2 text-xs",
              isMessageBlank || messageMetrics.isOverLimit
                ? "text-red-700"
                : messageMetrics.transportType === "lms"
                  ? "text-amber-700"
                : "text-[#60717B]",
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
            "border px-3 py-2.5 text-sm leading-6",
            isPreviewError
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-[#DEDEE4] bg-[#FFFEFA] text-[#3F434A]",
          ].join(" ")}
        >
          <div className="flex items-start gap-2">
            {isPreviewReady && !isPreviewError ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-[#62656f]" size={17} aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
            )}
            <p>
              {isPreviewLoading
                ? "학원별 문자 템플릿을 불러오는 중입니다."
                : isPreviewError
                  ? messagePreview.error
                  : isPreviewReady
                    ? "발송 전에 먼저 연락 기록으로 저장합니다. 저장 후 테스트 발송을 진행할 수 있습니다."
                    : "학생과 사유를 선택하면 문자 미리보기를 생성합니다."}
            </p>
          </div>
        </div>

        {followupSaveError || isFollowupSaved ? (
          <div
            className={[
              "border px-3 py-2.5 text-sm leading-6",
              followupSaveError
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-[#DEDEE4] bg-[#FFFEFA] text-[#3F434A]",
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
                  "연락 기록을 저장했습니다. 다음 단계에서 테스트 발송을 이어갑니다."}
              </p>
            </div>
          </div>
        ) : null}

        {duplicateDraftWarning && !isFollowupSaved ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <p>{duplicateDraftWarning}</p>
            </div>
          </div>
        ) : null}

        <div className="border border-[#DED8CF] bg-[#F7F6F2] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#62656f]">
              실행 단계
            </p>
            <span className="text-[11px] font-bold text-[#5F6368]">
              저장 후 테스트 발송
            </span>
          </div>
          <button
            type="button"
            disabled={!canSaveFollowup}
            onClick={onSaveFollowup}
            className={[
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border px-4 text-sm font-bold transition",
              canSaveFollowup
                ? "border-[#c9cdd2] bg-[#fffefa] text-[#2f3437] hover:border-[#aeb5bf] hover:bg-[#f6f7f8]"
                : "border-[#DED8CF] bg-[#E9E7E1] text-[#8A8780]",
            ].join(" ")}
          >
            <Send size={17} aria-hidden="true" />
            {isFollowupSaving
              ? "1단계 저장 중"
              : isFollowupSaved
                ? "1단계 저장 완료"
                : "1단계 기록 저장"}
          </button>

          {isFollowupSaved ? (
            <div className="mt-2 space-y-2">
            {sendBlockedMessage ? (
              <div className="border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950">
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
                "flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border px-4 text-sm font-bold transition",
                canSendMessage
                  ? "border-[#1F2328] bg-[#1F2328] text-white hover:bg-[#111318]"
                  : "border-[#DED8CF] bg-[#E9E7E1] text-[#8A8780]",
              ].join(" ")}
            >
              <Send size={17} aria-hidden="true" />
              {isMessageSending
                ? "2단계 발송 처리 중"
                : isMessageSent
                  ? messageSend.dryRun
                    ? "2단계 테스트 발송 완료"
                    : "2단계 문자 발송 완료"
                  : "2단계 테스트 발송"}
            </button>

            {messageSendError || isMessageSent ? (
              <div
                className={[
                  "border px-3 py-2.5 text-sm leading-6",
                  messageSendError
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-[#DEDEE4] bg-[#FFFEFA] text-[#3F434A]",
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

            {selectedReason === "makeup" && selectedMakeupCandidate ? (
              <div className="border border-[#DED8CF] bg-[#FFFEFA] p-3">
                <p className="text-sm font-semibold text-[#1F2328]">
                  보강 스케줄 등록
                </p>
                <p className="mt-1 text-xs leading-5 text-[#5F6368]">
                  {selectedMakeupCandidate.label} 일정으로 학생 스케줄에 1회성 보강을
                  등록합니다.
                </p>
                {!canRegisterMakeupSchedule &&
                makeupScheduleSave.status !== "saving" &&
                makeupScheduleSave.status !== "saved" ? (
                  <p className="mt-2 bg-[#F0EEE8] px-2 py-2 text-xs font-semibold text-[#5F6368]">
                    보강 스케줄은 테스트 발송이 완료된 뒤 등록할 수 있습니다.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={
                    !canRegisterMakeupSchedule ||
                    makeupScheduleSave.status === "saving" ||
                    makeupScheduleSave.status === "saved"
                  }
                  onClick={onRegisterMakeupSchedule}
                  className={[
                    "mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                    canRegisterMakeupSchedule &&
                    makeupScheduleSave.status !== "saving" &&
                    makeupScheduleSave.status !== "saved"
                      ? "bg-[#2f3437] text-white hover:bg-[#17191f]"
                      : "bg-[#E9E7E1] text-[#8A8780]",
                  ].join(" ")}
                >
                  <CalendarDays size={16} aria-hidden="true" />
                  {makeupScheduleSave.status === "saving"
                    ? "등록 중"
                    : makeupScheduleSave.status === "saved"
                      ? "스케줄 등록 완료"
                      : "스케줄에 입력"}
                </button>
                {makeupScheduleSave.message ? (
                  <p
                    className={[
                      "mt-2 rounded-md px-2 py-2 text-xs font-semibold",
                      makeupScheduleSave.status === "error"
                        ? "bg-red-50 text-red-900"
                        : "bg-[#F0EEE8] text-[#3F434A]",
                    ].join(" ")}
                  >
                    {makeupScheduleSave.message}
                  </p>
                ) : null}
              </div>
            ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ComposerSummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "blue";
}) {
  return (
    <div className="grid min-h-9 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-t border-[#DED8CF] px-4 py-2">
      <span className="text-xs font-semibold text-[#5F6368]">{label}</span>
      <span
        className={[
          "truncate text-sm font-semibold",
          tone === "blue" ? "text-[#62656f]" : "text-[#1F2328]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function normalizeMessageBody(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
