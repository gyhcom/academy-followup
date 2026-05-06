"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  RotateCcw,
  Send,
  UsersRound,
} from "lucide-react";
import { followupReasons, type FollowupReason } from "@/lib/followup-templates";

export type OperationsStudent = {
  id: string;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  maskedParentPhone: string;
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

  const totalStudents = classes.reduce(
    (total, classItem) => total + classItem.students.length,
    0,
  );

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

  function handleClassSelect(classId: string) {
    const nextClass = classes.find((classItem) => classItem.id === classId);
    setSelectedClassId(classId);
    setSelectedStudentId(nextClass?.students[0]?.id ?? "");
  }

  function handleRestorePreview() {
    if (!isPreviewReady) {
      return;
    }

    setMessageDraft({ key: messageKey, body: messagePreview.body });
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
    <div className="space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950 sm:text-3xl">
              오늘의 팔로업
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              {teacherName}님은 {roleLabel} 권한으로 접속 중입니다. 반, 학생, 사유 순서로
              선택하면 문자 초안을 바로 확인합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[390px]">
            <Metric label="반" value={`${classes.length}개`} />
            <Metric label="학생" value={`${totalStudents}명`} />
            <Metric label="문자" value={isPreviewReady ? "미리보기" : "준비"} />
          </div>
        </div>
      </section>

      <ol
        aria-label="팔로업 작성 단계"
        className="grid grid-cols-3 gap-2 text-xs font-medium lg:hidden"
      >
        <StepPill step="1" label="반" active={Boolean(selectedClass)} />
        <StepPill step="2" label="학생" active={Boolean(selectedStudent)} />
        <StepPill step="3" label="문자" active={Boolean(messageBody)} />
      </ol>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_380px] lg:items-start">
        <section
          aria-labelledby="class-list-title"
          className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
        >
          <PanelHeader
            titleId="class-list-title"
            icon={<ClipboardCheck size={18} />}
            title="반 선택"
            description="오늘 처리할 반을 고릅니다."
          />
          <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-2 lg:block lg:space-y-2 lg:overflow-visible lg:p-3">
            {classes.map((classItem) => {
              const isSelected = classItem.id === selectedClass?.id;
              return (
                <button
                  key={classItem.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleClassSelect(classItem.id)}
                  className={[
                    "min-w-[9.5rem] shrink-0 rounded-md border px-3 py-3 text-left transition lg:w-full lg:min-w-0 lg:shrink",
                    isSelected
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  <span className="block text-sm font-semibold text-stone-950">
                    {classItem.name}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {classItem.subject ?? "과목 미지정"} · {classItem.students.length}명
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="student-list-title"
          className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
        >
          <PanelHeader
            titleId="student-list-title"
            icon={<UsersRound size={18} />}
            title="학생 선택"
            description={selectedClass ? `${selectedClass.name} 학생 목록` : "학생 목록"}
          />
          <div className="max-h-[19rem] divide-y divide-stone-100 overflow-y-auto lg:max-h-none lg:overflow-visible">
            {selectedClass?.students.length ? (
              selectedClass.students.map((student) => {
                const isSelected = student.id === selectedStudent?.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={[
                      "flex min-h-16 w-full flex-col items-start gap-2 px-4 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                      isSelected ? "bg-emerald-50" : "bg-white hover:bg-stone-50",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-stone-950">
                        {student.name}
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                          "학년 정보 없음"}
                      </span>
                    </span>
                    <span className="max-w-full shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600">
                      {student.maskedParentPhone}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-sm text-stone-600">
                이 반에 등록된 학생이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="followup-panel-title"
          className="rounded-lg border border-stone-200 bg-white shadow-sm lg:sticky lg:top-5"
        >
          <PanelHeader
            titleId="followup-panel-title"
            icon={<MessageSquareText size={18} />}
            title="문자 작업"
            description="사유 선택 후 초안을 확인합니다."
          />

          <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
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
              <div className="mt-2 grid grid-cols-2 gap-2">
                {followupReasons.map((reason) => {
                  const isSelected = reason.id === selectedReason;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedReason(reason.id)}
                      className={[
                        "min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition",
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
                <div className="flex min-w-0 items-center gap-2">
                  <label
                    htmlFor="message-body"
                    className="truncate text-sm font-semibold text-stone-800"
                  >
                    {isPreviewReady ? messagePreview.title : "문자 미리보기"}
                  </label>
                  {isPreviewReady ? (
                    <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      수정 가능
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="원문으로 되돌리기"
                  title="원문으로 되돌리기"
                  disabled={!isDraftEdited}
                  onClick={handleRestorePreview}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <textarea
                id="message-body"
                value={messageBody}
                onChange={(event) =>
                  setMessageDraft({ key: messageKey, body: event.target.value })
                }
                disabled={!isPreviewReady}
                aria-busy={isPreviewLoading}
                placeholder={
                  isPreviewLoading
                    ? "문자 초안을 불러오는 중입니다."
                    : "학생과 사유를 선택하면 문자 초안이 표시됩니다."
                }
                rows={8}
                className="mt-2 min-h-36 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition disabled:bg-stone-50 disabled:text-stone-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:min-h-48"
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
                  : "선생님이 발송 전에 문구를 직접 수정할 수 있습니다."}
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
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <p>
                  {isPreviewLoading
                    ? "학원별 문자 템플릿을 불러오는 중입니다."
                    : isPreviewError
                      ? messagePreview.error
                      : isPreviewReady
                        ? "실제 발송 없이 문자 미리보기만 생성했습니다. dry-run 저장과 발송은 다음 티켓에서 연결합니다."
                        : "학생과 사유를 선택하면 문자 미리보기를 생성합니다."}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-stone-300 px-4 text-sm font-semibold text-stone-600"
            >
              <Send size={17} />
              dry-run 발송 준비 중
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}

function StepPill({
  step,
  label,
  active,
}: {
  step: string;
  label: string;
  active: boolean;
}) {
  return (
    <li
      className={[
        "flex min-h-10 items-center justify-center gap-1 rounded-md border px-2",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-stone-200 bg-white text-stone-500",
      ].join(" ")}
    >
      <span>{step}</span>
      <span>{label}</span>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function PanelHeader({
  titleId,
  icon,
  title,
  description,
}: {
  titleId: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-stone-200 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
        <span className="text-emerald-700">{icon}</span>
        <h2 id={titleId} className="text-sm font-semibold">
          {title}
        </h2>
        <CheckCircle2 className="ml-auto text-stone-300" size={16} />
      </div>
      <p className="mt-1 hidden text-xs text-stone-500 sm:block">{description}</p>
    </div>
  );
}
