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
import { getMessageLengthMetrics } from "@/lib/message-length";
import {
  messageRecipientLabels,
  messageRecipientTypes,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  type FollowupHistoryItem,
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
  roleLabel: string;
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

type MessagePreviewResponse = {
  title?: string;
  body?: string;
  metrics?: ReturnType<typeof getMessageLengthMetrics>;
  error?: string;
};

type FollowupSaveState = {
  key: string;
  body: string;
  status: "idle" | "saving" | "saved" | "error";
  error: string;
  followupId: string;
};

type CreateFollowupResponse = {
  followup?: {
    id: string;
    status: string;
    createdAt: string;
  };
  error?: string;
};

type MessageSendState = {
  followupId: string;
  status: "idle" | "sending" | "sent" | "error";
  dryRun: boolean;
  message: string;
  error: string;
};

type SendMessageResponse = {
  dryRun?: boolean;
  message?: string;
  recipientPhone?: string;
  followupId?: string;
  error?: string;
};

type ScheduleCreateResponse = {
  schedule?: {
    id: string;
    scheduleDate: string | null;
    startTime: string;
    endTime: string;
  };
  error?: string;
};

type MakeupScheduleSaveState = {
  followupId: string;
  status: "idle" | "saving" | "saved" | "error";
  message: string;
  scheduleId: string;
};

type FollowupHistoryResponse = {
  followups?: FollowupHistoryItem[];
  error?: string;
};

export function OperationsBoard({
  academyName,
  teacherName,
  roleLabel,
  classes,
  initialSelection,
}: OperationsBoardProps) {
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

  useEffect(() => {
    if (!selectedStudentIdForPreview) {
      return;
    }

    const controller = new AbortController();
    const nextMessageKey = messageKey;

    async function loadPreview() {
      try {
        const response = await fetch("/api/messages/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: selectedStudentIdForPreview,
            reason: selectedReason,
            makeupCandidateTime,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as MessagePreviewResponse;

        if (!response.ok || !payload.body) {
          throw new Error(payload.error ?? "문자 미리보기를 만들지 못했습니다.");
        }

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
        const response = await fetch(`/api/followups?studentId=${studentId}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as FollowupHistoryResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "팔로업 기록을 불러오지 못했습니다.");
        }

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
              : "팔로업 기록을 불러오지 못했습니다.",
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
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          reason: selectedReason,
          messageBody: bodyToSave,
          recipientType: effectiveRecipientType,
        }),
      });
      const payload = (await response.json()) as CreateFollowupResponse;

      if (!response.ok || !payload.followup) {
        throw new Error(payload.error ?? "팔로업 기록을 저장하지 못했습니다.");
      }

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
            : "팔로업 기록을 저장하지 못했습니다.",
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
      const response = await fetch("/api/student-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      });
      const payload = (await response.json()) as ScheduleCreateResponse;

      if (!response.ok || !payload.schedule) {
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
      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
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
        "mx-auto max-w-6xl space-y-4 sm:space-y-5",
        shouldShowMobileSelectionBar
          ? "pb-[calc(13rem+env(safe-area-inset-bottom))] lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "pb-[max(1rem,env(safe-area-inset-bottom))]",
      ].join(" ")}
    >
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
            className="lg:order-2 xl:order-3"
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
    </div>
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
  const canSendMessage = isFollowupSaved && !isMessageSending;

  return (
    <section
      id={composerId}
      aria-labelledby={`${composerId}-title`}
      className={[
        "rounded-lg border border-stone-200 bg-white shadow-sm lg:sticky lg:top-5",
        className,
      ].join(" ")}
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-[#315C7C]" size={18} />
          <h2 id={`${composerId}-title`} className="text-sm font-semibold text-stone-950">
            문자 초안
          </h2>
          {isPreviewReady ? (
            <span className="ml-auto rounded-md border border-[#C9D6E2] bg-[#EAF1F8] px-2 py-0.5 text-xs font-medium text-[#315C7C]">
              수정 가능
            </span>
          ) : null}
          {onClose ? (
            <button
              type="button"
              aria-label="문자 작성 닫기"
              title="닫기"
              onClick={onClose}
              className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {selectedStudent
            ? `현재 선택: ${selectedStudent.name} · ${followupReasons.find((reason) => reason.id === selectedReason)?.label ?? selectedReason}`
            : "학생을 선택하면 문자 초안이 표시됩니다."}
        </p>
      </div>

      <div className="space-y-4 p-4">
        {selectedStudent ? (
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-medium text-stone-500">선택 학생</p>
            <p className="mt-1 text-base font-semibold text-stone-950">
              {selectedStudent.name}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {selectedStudent.parentName ?? "학부모"} · {selectedStudent.maskedParentPhone}
            </p>
            {selectedReason === "makeup" && makeupCandidateTime ? (
              <p className="mt-2 rounded-md bg-[#EAF1F8] px-2 py-1 text-xs font-semibold text-[#315C7C]">
                보강 후보 {makeupCandidateTime}
              </p>
            ) : null}
            {selectedReason === "makeup" && !selectedMakeupCandidate && makeupCandidateTime ? (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                주간 반복 시간 기준입니다. 날짜별 보강 등록은 달력에서 날짜를 선택해야 합니다.
              </p>
            ) : null}
          </div>
        ) : null}

        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">사유</legend>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {followupReasons.map((reason) => {
              const isSelected = reason.id === selectedReason;
              return (
                <button
                  key={reason.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onReasonChange(reason.id)}
                  className={[
                    "min-h-10 shrink-0 rounded-md border px-3 text-sm font-medium transition",
                    isSelected
                      ? "border-[#315C7C] bg-[#315C7C] text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
                  ].join(" ")}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">수신자</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
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
            학생 연락처: {selectedStudent?.maskedStudentPhone ?? "미등록"}
          </p>
        </fieldset>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`${composerId}-message-body`}
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
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={15} />
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
            className="mt-2 min-h-36 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition disabled:bg-stone-50 disabled:text-stone-500 focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8] sm:min-h-44"
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
                  : isPreviewReady
                    ? "발송 전에 먼저 팔로업 기록으로 저장합니다. 저장 후 문자 발송 테스트를 진행할 수 있습니다."
                    : "학생과 사유를 선택하면 문자 미리보기를 생성합니다."}
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
                  "팔로업 기록을 저장했습니다. 다음 단계에서 dry-run 발송을 이어갑니다."}
              </p>
            </div>
          </div>
        ) : null}

        {duplicateDraftWarning && !isFollowupSaved ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <p>{duplicateDraftWarning}</p>
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

            {selectedReason === "makeup" && selectedMakeupCandidate ? (
              <div className="rounded-md border border-[#C9D6E2] bg-[#EAF1F8] p-3">
                <p className="text-sm font-semibold text-[#244B67]">
                  보강 스케줄 등록
                </p>
                <p className="mt-1 text-xs leading-5 text-[#244B67]">
                  {selectedMakeupCandidate.label} 일정으로 학생 스케줄에 1회성 보강을
                  등록합니다.
                </p>
                {!canRegisterMakeupSchedule &&
                makeupScheduleSave.status !== "saving" &&
                makeupScheduleSave.status !== "saved" ? (
                  <p className="mt-2 rounded-md bg-white px-2 py-2 text-xs font-semibold text-[#244B67]">
                    보강 스케줄은 문자 발송 테스트가 완료된 뒤 등록할 수 있습니다.
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
                      ? "bg-[#315C7C] text-white hover:bg-[#244B67]"
                      : "bg-[#C9D6E2] text-[#244B67]",
                  ].join(" ")}
                >
                  <CalendarDays size={16} />
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
                        : "bg-white text-[#244B67]",
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
    </section>
  );
}

function normalizeMessageBody(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
