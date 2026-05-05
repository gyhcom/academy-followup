"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  Send,
  UsersRound,
} from "lucide-react";
import {
  buildFollowupMessage,
  followupReasons,
  type FollowupReason,
} from "@/lib/followup-templates";

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
  senderName: string;
  teacherName: string;
  roleLabel: string;
  classes: OperationsClass[];
};

export function OperationsBoard({
  academyName,
  senderName,
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

  const generatedMessage = useMemo(() => {
    if (!selectedStudent) {
      return "";
    }

    return buildFollowupMessage({
      academyName: senderName,
      studentName: selectedStudent.name,
      teacherName,
      reason: selectedReason,
    });
  }, [selectedReason, selectedStudent, senderName, teacherName]);

  const messageKey = `${selectedClass?.id ?? ""}:${selectedStudent?.id ?? ""}:${selectedReason}`;
  const [messageDraft, setMessageDraft] = useState({ key: "", body: "" });
  const messageBody =
    messageDraft.key === messageKey ? messageDraft.body : generatedMessage;

  const totalStudents = classes.reduce(
    (total, classItem) => total + classItem.students.length,
    0,
  );

  function handleClassSelect(classId: string) {
    const nextClass = classes.find((classItem) => classItem.id === classId);
    setSelectedClassId(classId);
    setSelectedStudentId(nextClass?.students[0]?.id ?? "");
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
    <div className="space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">
              오늘의 팔로업
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              {teacherName}님은 {roleLabel} 권한으로 접속 중입니다. 반과 학생을 선택한 뒤
              학부모에게 보낼 안내 문구를 확인합니다.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[390px]">
            <Metric label="반" value={`${classes.length}개`} />
            <Metric label="학생" value={`${totalStudents}명`} />
            <Metric label="발송" value="dry-run 준비" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <section
          aria-labelledby="class-list-title"
          className="rounded-lg border border-stone-200 bg-white shadow-sm"
        >
          <PanelHeader
            icon={<ClipboardCheck size={18} />}
            title="반 선택"
            description="오늘 처리할 반을 고릅니다."
          />
          <div className="space-y-2 p-3">
            {classes.map((classItem) => {
              const isSelected = classItem.id === selectedClass?.id;
              return (
                <button
                  key={classItem.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleClassSelect(classItem.id)}
                  className={[
                    "w-full rounded-md border px-3 py-3 text-left transition",
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
          className="rounded-lg border border-stone-200 bg-white shadow-sm"
        >
          <PanelHeader
            icon={<UsersRound size={18} />}
            title="학생 선택"
            description={selectedClass ? `${selectedClass.name} 학생 목록` : "학생 목록"}
          />
          <div className="divide-y divide-stone-100">
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
                      "flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition",
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
                    <span className="shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600">
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
          className="rounded-lg border border-stone-200 bg-white shadow-sm"
        >
          <PanelHeader
            icon={<MessageSquareText size={18} />}
            title="문자 작업"
            description="사유 선택 후 초안을 확인합니다."
          />

          <div className="space-y-5 p-4">
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
              <label
                htmlFor="message-body"
                className="text-sm font-semibold text-stone-800"
              >
                문자 미리보기
              </label>
              <textarea
                id="message-body"
                value={messageBody}
                onChange={(event) =>
                  setMessageDraft({ key: messageKey, body: event.target.value })
                }
                rows={8}
                className="mt-2 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <p className="mt-2 text-xs text-stone-500">
                {messageBody.length}자 · 실제 발송 전 원장/선생님이 문구를 수정할 수 있습니다.
              </p>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 shrink-0" size={17} />
                <p>
                  지금은 화면 흐름 확인 단계입니다. 다음 티켓에서 미리보기 API와 dry-run
                  저장을 연결합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-300 px-4 text-sm font-semibold text-stone-600"
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-stone-200 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
        <span className="text-emerald-700">{icon}</span>
        <span>{title}</span>
        <CheckCircle2 className="ml-auto text-stone-300" size={16} />
      </div>
      <p className="mt-1 text-xs text-stone-500">{description}</p>
    </div>
  );
}
