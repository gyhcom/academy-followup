"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MessageSquareText,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { followupReasons, type FollowupReason } from "@/lib/followup-templates";
import {
  getSortedActiveSchedules,
  type OperationsStudentSchedule,
  WeeklySchedulePanel,
} from "@/app/app/operations-schedule";
import { scheduleTypeLabel, weekDayShortLabel } from "@/app/app/management-utils";

export type OperationsStudent = {
  id: string;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  maskedParentPhone: string;
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

const quickReasonIds: FollowupReason[] = ["absence", "retest", "homework_missing"];

export function OperationsBoard({
  academyName,
  teacherName,
  roleLabel,
  classes,
}: OperationsBoardProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) ?? classes[0],
    [classes, selectedClassId],
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    selectedClass?.students[0]?.id ?? "",
  );
  const [selectedReason, setSelectedReason] = useState<FollowupReason>("absence");
  const [hasMobileFollowupSelection, setHasMobileFollowupSelection] = useState(false);
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);

  const selectedStudent = useMemo(() => {
    if (!selectedClass) {
      return undefined;
    }

    return (
      selectedClass.students.find((student) => student.id === selectedStudentId) ??
      selectedClass.students[0]
    );
  }, [selectedClass, selectedStudentId]);

  const messageKey = `${selectedClass?.id ?? ""}:${selectedStudent?.id ?? ""}:${selectedReason}`;
  const selectedStudentIdForPreview = selectedStudent?.id ?? "";
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
  }, [messageKey, selectedReason, selectedStudentIdForPreview]);

  useEffect(() => {
    if (!isMobileComposerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileComposerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileComposerOpen]);

  function handleClassSelect(classId: string) {
    const nextClass = classes.find((classItem) => classItem.id === classId);
    setSelectedClassId(classId);
    setSelectedStudentId(nextClass?.students[0]?.id ?? "");
    setHasMobileFollowupSelection(false);
    setIsMobileComposerOpen(false);
  }

  function handleStudentSelect(studentId: string) {
    setSelectedStudentId(studentId);
    setHasMobileFollowupSelection(false);
    setIsMobileComposerOpen(false);
  }

  function handleStudentReasonSelect(studentId: string, reasonId: FollowupReason) {
    setSelectedStudentId(studentId);
    setSelectedReason(reasonId);
    setHasMobileFollowupSelection(true);
    setIsMobileComposerOpen(false);
  }

  function handleComposerReasonChange(reasonId: FollowupReason) {
    setSelectedReason(reasonId);
    setHasMobileFollowupSelection(Boolean(selectedStudent));
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

  if (classes.length === 0) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 text-amber-700" size={21} />
          <div>
            <h2 className="text-lg font-semibold text-stone-950">등록된 반이 없습니다</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              파일럿 시연을 위해 먼저 반과 학생 데이터를 추가해야 합니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className={[
        "mx-auto max-w-6xl space-y-4 sm:space-y-5",
        shouldShowMobileSelectionBar
          ? "pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "pb-[max(1rem,env(safe-area-inset-bottom))]",
      ].join(" ")}
    >
      <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              수업 후 바로 보내기
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {teacherName}님은 {roleLabel} 권한입니다. 학생 옆 사유를 누르면 학부모
              문자 초안 확인 바가 열립니다.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-2 border-t border-stone-200 pt-3 text-sm lg:min-w-[21rem] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <StatusItem label="반" value={`${classes.length}개`} />
            <StatusItem label="학생" value={`${totalStudents}명`} />
            <StatusItem label="일정" value={`${activeScheduleCount}개`} />
          </dl>
        </div>
      </section>

      <section aria-label="반 선택" className="space-y-2">
        <p className="px-1 text-xs font-semibold text-stone-500">오늘 수업</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {classes.map((classItem) => {
            const isSelected = classItem.id === selectedClass?.id;
            return (
              <button
                key={classItem.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleClassSelect(classItem.id)}
                className={[
                  "min-h-11 shrink-0 rounded-md border px-3 text-left transition",
                  isSelected
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">{classItem.name}</span>
                <span
                  className={[
                    "mt-0.5 block text-xs",
                    isSelected ? "text-stone-300" : "text-stone-500",
                  ].join(" ")}
                >
                  {classItem.subject ?? "과목 미지정"} · {classItem.students.length}명
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(250px,0.9fr)_minmax(300px,1fr)_390px] lg:items-start">
        <section aria-labelledby="student-flow-title" className="space-y-3">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <h2 id="student-flow-title" className="text-base font-semibold text-stone-950">
                {selectedClass?.name ?? "학생 목록"}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                자주 쓰는 사유는 학생 옆에서 바로 선택합니다.
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-stone-500">
              {selectedClass?.students.length ?? 0}명
            </span>
          </div>

          <div className="space-y-2">
            {selectedClass?.students.length ? (
              selectedClass.students.map((student) => {
                const isSelected = student.id === selectedStudent?.id;
                const primarySchedule = getSortedActiveSchedules(student.schedules)[0];
                return (
                  <article
                    key={student.id}
                    className={[
                      "rounded-lg border bg-white p-3 shadow-sm transition",
                      isSelected
                        ? "border-emerald-600 shadow-emerald-900/10"
                        : "border-stone-200",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleStudentSelect(student.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="block text-base font-semibold text-stone-950">
                            {student.name}
                          </span>
                          <span
                            className={[
                              "rounded-md px-2 py-0.5 text-xs font-semibold",
                              primarySchedule
                                ? "bg-blue-50 text-blue-800"
                                : "bg-stone-100 text-stone-500",
                            ].join(" ")}
                          >
                            {primarySchedule
                              ? `${weekDayShortLabel(primarySchedule.dayOfWeek)} ${primarySchedule.startTime}`
                              : "스케줄 없음"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-stone-500">
                          {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                            "학년 정보 없음"}
                        </span>
                        <span className="mt-2 block text-xs text-stone-500">
                          {student.parentName ?? "학부모"} · {student.maskedParentPhone}
                        </span>
                        {primarySchedule ? (
                          <span className="mt-2 block text-xs font-medium text-stone-600">
                            {primarySchedule.endTime}까지 ·{" "}
                            {scheduleTypeLabel(primarySchedule.scheduleType)} ·{" "}
                            {primarySchedule.title}
                          </span>
                        ) : null}
                      </button>

                      {isSelected ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                          선택됨
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
                      {quickReasonIds.map((reasonId) => {
                        const isReasonSelected =
                          isSelected && selectedReason === reasonId;
                        return (
                          <button
                            key={reasonId}
                            type="button"
                            aria-pressed={isReasonSelected}
                            onClick={() => handleStudentReasonSelect(student.id, reasonId)}
                            className={[
                              "min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition",
                              isReasonSelected
                                ? "border-emerald-600 bg-emerald-700 text-white"
                                : "border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-300 hover:bg-emerald-50",
                            ].join(" ")}
                          >
                            {reasonLabel(reasonId)}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
                이 반에 등록된 학생이 없습니다.
              </div>
            )}
          </div>
        </section>

        <WeeklySchedulePanel
          selectedClassName={selectedClass?.name}
          selectedStudent={selectedStudent}
        />

        <MessageComposer
          className="hidden lg:block"
          composerId="desktop-message-composer"
          isDraftEdited={isDraftEdited}
          isMessageBlank={isMessageBlank}
          isFollowupSaved={isFollowupSaved}
          isFollowupSaving={isFollowupSaving}
          isPreviewError={isPreviewError}
          isPreviewLoading={isPreviewLoading}
          isPreviewReady={isPreviewReady}
          followupSaveError={followupSaveError}
          messageBody={messageBody}
          messagePreview={messagePreview}
          selectedReason={selectedReason}
          selectedStudent={selectedStudent}
          onReasonChange={handleComposerReasonChange}
          onRestorePreview={handleRestorePreview}
          onSaveFollowup={handleSaveFollowup}
          onMessageChange={(body) => setMessageDraft({ key: messageKey, body })}
        />
      </section>

      {shouldShowMobileSelectionBar ? (
        <MobileSelectionBar
          isPreviewLoading={isPreviewLoading}
          isPreviewReady={isPreviewReady}
          selectedReason={selectedReason}
          selectedStudent={selectedStudent}
          onOpenComposer={() => setIsMobileComposerOpen(true)}
        />
      ) : null}

      {isMobileComposerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="문자 작성 닫기"
            className="absolute inset-0 bg-stone-950/35"
            onClick={() => setIsMobileComposerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
            <MessageComposer
              className="rounded-none border-0 shadow-none"
              composerId="mobile-message-composer"
              isDraftEdited={isDraftEdited}
              isMessageBlank={isMessageBlank}
              isFollowupSaved={isFollowupSaved}
              isFollowupSaving={isFollowupSaving}
              isPreviewError={isPreviewError}
              isPreviewLoading={isPreviewLoading}
              isPreviewReady={isPreviewReady}
              followupSaveError={followupSaveError}
              messageBody={messageBody}
              messagePreview={messagePreview}
              selectedReason={selectedReason}
              selectedStudent={selectedStudent}
              onClose={() => setIsMobileComposerOpen(false)}
              onReasonChange={handleComposerReasonChange}
              onRestorePreview={handleRestorePreview}
              onSaveFollowup={handleSaveFollowup}
              onMessageChange={(body) => setMessageDraft({ key: messageKey, body })}
            />
          </div>
        </div>
      ) : null}
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
  isPreviewError,
  isPreviewLoading,
  isPreviewReady,
  followupSaveError,
  messageBody,
  messagePreview,
  selectedReason,
  selectedStudent,
  onClose,
  onReasonChange,
  onRestorePreview,
  onSaveFollowup,
  onMessageChange,
}: {
  className?: string;
  composerId: string;
  isDraftEdited: boolean;
  isMessageBlank: boolean;
  isFollowupSaved: boolean;
  isFollowupSaving: boolean;
  isPreviewError: boolean;
  isPreviewLoading: boolean;
  isPreviewReady: boolean;
  followupSaveError: string;
  messageBody: string;
  messagePreview: MessagePreviewState;
  selectedReason: FollowupReason;
  selectedStudent: OperationsStudent | undefined;
  onClose?: () => void;
  onReasonChange: (reason: FollowupReason) => void;
  onRestorePreview: () => void;
  onSaveFollowup: () => void;
  onMessageChange: (body: string) => void;
}) {
  const canSaveFollowup = isPreviewReady && !isMessageBlank && !isFollowupSaving;

  return (
    <section
      aria-labelledby={`${composerId}-title`}
      className={[
        "rounded-lg border border-stone-200 bg-white shadow-sm lg:sticky lg:top-5",
        className,
      ].join(" ")}
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="text-emerald-700" size={18} />
          <h2 id={`${composerId}-title`} className="text-sm font-semibold text-stone-950">
            학부모 문자
          </h2>
          {isPreviewReady ? (
            <span className="ml-auto rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
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
            ? `${selectedStudent.name} 학생 안내를 작성 중입니다.`
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
                      ? "border-emerald-600 bg-emerald-700 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>
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
            className="mt-2 min-h-36 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition disabled:bg-stone-50 disabled:text-stone-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:min-h-44"
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
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={17} />
            ) : (
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
            )}
            <p>
              {isPreviewLoading
                ? "학원별 문자 템플릿을 불러오는 중입니다."
                : isPreviewError
                  ? messagePreview.error
                  : isPreviewReady
                    ? "발송 전에 먼저 팔로업 기록으로 저장합니다. dry-run 발송은 다음 티켓에서 연결합니다."
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
                : "border-emerald-200 bg-emerald-50 text-emerald-900",
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

        <button
          type="button"
          disabled={!canSaveFollowup}
          onClick={onSaveFollowup}
          className={[
            "flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
            canSaveFollowup
              ? "bg-stone-950 text-white hover:bg-stone-800"
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
      </div>
    </section>
  );
}

function MobileSelectionBar({
  isPreviewLoading,
  isPreviewReady,
  selectedReason,
  selectedStudent,
  onOpenComposer,
}: {
  isPreviewLoading: boolean;
  isPreviewReady: boolean;
  selectedReason: FollowupReason;
  selectedStudent: OperationsStudent | undefined;
  onOpenComposer: () => void;
}) {
  if (!selectedStudent) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(28,25,23,0.12)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-950">
            {selectedStudent.name} · {reasonLabel(selectedReason)}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {isPreviewLoading
              ? "문자 초안을 준비하는 중입니다."
              : isPreviewReady
                ? "문자 초안이 준비됐습니다."
                : "확인 후 문구를 수정할 수 있습니다."}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenComposer}
          className="min-h-11 shrink-0 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white"
        >
          확인/수정
        </button>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function reasonLabel(reasonId: FollowupReason) {
  return (
    followupReasons.find((reason) => reason.id === reasonId)?.label ?? reasonId
  );
}
