"use client";

import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, MessageCircle, UsersRound } from "lucide-react";
import type { FollowupReason } from "@/lib/followup-templates";
import type { FollowupHistoryState } from "@/app/app/operations-history";
import { StudentFollowupHistory } from "@/app/app/operations-history";
import { MakeupCalendarPanel } from "@/app/app/makeup-calendar-panel";
import type { MakeupCandidate } from "@/app/app/makeup-scheduling";
import {
  getSortedActiveSchedules,
  type OperationsStudentSchedule,
  WeeklySchedulePanel,
} from "@/app/app/operations-schedule";
import type { OperationsClass, OperationsStudent } from "@/app/app/operations-board";
import { scheduleTypeLabel, weekDayShortLabel } from "@/app/app/management-utils";

const quickReasonIds: FollowupReason[] = ["absence", "retest", "homework_missing"];

type OperationsViewProps = {
  academyName: string;
  teacherName: string;
  classes: OperationsClass[];
  selectedClass: OperationsClass | undefined;
  selectedStudent: OperationsStudent | undefined;
  selectedReason: FollowupReason;
  selectedMakeupCandidate: MakeupCandidate | null;
  visibleFollowupHistory: FollowupHistoryState;
  totalStudents: number;
  activeScheduleCount: number;
  desktopComposer: ReactNode;
  mobileComposer: ReactNode;
  isMobileComposerOpen: boolean;
  shouldShowMobileSelectionBar: boolean;
  isPreviewLoading: boolean;
  isPreviewReady: boolean;
  onClassSelect: (classId: string) => void;
  onStudentSelect: (studentId: string) => void;
  onStudentReasonSelect: (studentId: string, reasonId: FollowupReason) => void;
  onDateMakeupCandidateSelect: (candidate: MakeupCandidate) => void;
  onMakeupCandidateSelect: (schedule: OperationsStudentSchedule) => void;
  onOpenMobileComposer: () => void;
  onCloseMobileComposer: () => void;
};

export function OperationsDesktopView(props: OperationsViewProps) {
  return (
    <div className="message-workbench hidden lg:block">
      <OperationsHeader
        academyName={props.academyName}
        classCount={props.classes.length}
        totalStudents={props.totalStudents}
      />

      <section className="grid min-h-[42rem] min-w-0 overflow-hidden border border-[#B8C9D0] bg-[#F7F6F1] lg:grid-cols-[minmax(0,1fr)_18.5rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <ClassPicker
            classes={props.classes}
            selectedClass={props.selectedClass}
            onClassSelect={props.onClassSelect}
          />

          <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[12rem_minmax(0,1fr)] 2xl:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="min-h-0 min-w-0 border-r border-[#D9DCE8]">
              <StudentSelectionList
                selectedClass={props.selectedClass}
                selectedStudent={props.selectedStudent}
                selectedReason={props.selectedReason}
                onStudentSelect={props.onStudentSelect}
                onStudentReasonSelect={props.onStudentReasonSelect}
              />
            </div>

            <section className="message-zone-plan min-w-0 border-r p-4">
              <ScheduleAndHistoryPanel
                selectedClassName={props.selectedClass?.name}
                selectedStudent={props.selectedStudent}
                selectedMakeupCandidate={props.selectedMakeupCandidate}
                visibleFollowupHistory={props.visibleFollowupHistory}
                onDateMakeupCandidateSelect={props.onDateMakeupCandidateSelect}
                onMakeupCandidateSelect={props.onMakeupCandidateSelect}
                className="min-w-0"
              />
            </section>
          </div>
        </div>

        {props.desktopComposer}
      </section>
    </div>
  );
}

export function OperationsMobileView(props: OperationsViewProps) {
  return (
    <div className="lg:hidden">
      <OperationsHeader
        academyName={props.academyName}
        classCount={props.classes.length}
        totalStudents={props.totalStudents}
      />
      <ClassPicker
        classes={props.classes}
        selectedClass={props.selectedClass}
        onClassSelect={props.onClassSelect}
      />

      <div className="space-y-4">
        <StudentSelectionList
          selectedClass={props.selectedClass}
          selectedStudent={props.selectedStudent}
          selectedReason={props.selectedReason}
          onStudentSelect={props.onStudentSelect}
          onStudentReasonSelect={props.onStudentReasonSelect}
        />

        <ScheduleAndHistoryPanel
          selectedClassName={props.selectedClass?.name}
          selectedStudent={props.selectedStudent}
          selectedMakeupCandidate={props.selectedMakeupCandidate}
          visibleFollowupHistory={props.visibleFollowupHistory}
          onDateMakeupCandidateSelect={props.onDateMakeupCandidateSelect}
          onMakeupCandidateSelect={props.onMakeupCandidateSelect}
        />
      </div>

      {props.shouldShowMobileSelectionBar ? (
        <MobileSelectionBar
          isPreviewLoading={props.isPreviewLoading}
          isPreviewReady={props.isPreviewReady}
          selectedReason={props.selectedReason}
          selectedStudent={props.selectedStudent}
          onOpenComposer={props.onOpenMobileComposer}
        />
      ) : null}

      {props.isMobileComposerOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="문자 작성 닫기"
            className="absolute inset-0 bg-[#111827]/35"
            onClick={props.onCloseMobileComposer}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
            {props.mobileComposer}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OperationsHeader({
  academyName,
  classCount,
  totalStudents,
}: {
  academyName: string;
  classCount: number;
  totalStudents: number;
}) {
  return (
    <section className="mb-3 border border-[#B8C9D0] border-l-4 border-l-[#007A7C] bg-[#F4F8F9] px-4 py-3 sm:mb-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#315C7C]">
            Message Workbench
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-lg font-black leading-tight text-[#17232B]">
              수업 후 연락
            </h2>
            <span className="border border-[#C9D7DC] bg-[#E7EEF1] px-2 py-0.5 text-[11px] font-bold text-[#405763]">
              {academyName}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#60717B]">
            학생 row를 선택하고 오른쪽 작업 패널에서 기록 저장과 테스트 발송을 분리해 처리합니다.
          </p>
        </div>

        <dl className="grid min-w-[11rem] divide-y divide-[#C9D7DC] border-y border-[#C9D7DC] text-sm lg:min-w-[13rem]">
          <StatusItem label="반" value={`${classCount}개`} />
          <StatusItem label="학생" value={`${totalStudents}명`} />
        </dl>
      </div>
    </section>
  );
}

function ClassPicker({
  classes,
  selectedClass,
  onClassSelect,
}: {
  classes: OperationsClass[];
  selectedClass: OperationsClass | undefined;
  onClassSelect: (classId: string) => void;
}) {
  return (
    <section aria-label="반 선택" className="message-zone-select shrink-0 border-b px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#2F5F7E]">
          <UsersRound size={14} aria-hidden="true" />
          반 선택
        </p>
        {selectedClass ? (
          <p className="truncate text-xs font-semibold text-[#52697A]">
            {selectedClass.name} · {selectedClass.students.length}명
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {classes.map((classItem) => {
          const isSelected = classItem.id === selectedClass?.id;
          return (
            <button
              key={classItem.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onClassSelect(classItem.id)}
              className={[
                "min-h-11 w-[13.5rem] shrink-0 border border-b-[3px] px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]",
                isSelected
                  ? "border-[#9DA9D6] border-b-[#4F5BE7] bg-[#EEEFFD] text-[#142A38]"
                  : "border-[#D9DCE8] border-b-[#C9CEDD] bg-[#FFFEFA] text-[#142A38] hover:border-[#B9BEE0] hover:border-b-[#6B72C9] hover:bg-[#F7F7FF]",
              ].join(" ")}
            >
              <span className="block truncate text-sm font-bold">{classItem.name}</span>
              <span
                className={[
                  "mt-0.5 block truncate text-xs",
                isSelected ? "text-[#2F5F7E]" : "text-[#52697A]",
                ].join(" ")}
              >
                {classItem.subject ?? "과목 미지정"} · {classItem.students.length}명
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StudentSelectionList({
  selectedClass,
  selectedStudent,
  selectedReason,
  onStudentSelect,
  onStudentReasonSelect,
}: {
  selectedClass: OperationsClass | undefined;
  selectedStudent: OperationsStudent | undefined;
  selectedReason: FollowupReason;
  onStudentSelect: (studentId: string) => void;
  onStudentReasonSelect: (studentId: string, reasonId: FollowupReason) => void;
}) {
  return (
    <section aria-labelledby="student-flow-title" className="min-w-0 lg:order-1 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="message-zone-select flex items-end justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 id="student-flow-title" className="inline-flex items-center gap-2 text-sm font-bold text-[#17232B]">
            <MessageCircle size={15} className="text-[#2F5F7E]" aria-hidden="true" />
            학생 확인 목록
          </h2>
          <p className="mt-1 text-xs text-[#52697A]">
            학생을 확인하고 필요한 연락 사유를 바로 선택합니다.
          </p>
        </div>
        <span className="message-zone-select-panel shrink-0 border px-2 py-1 text-xs font-bold text-[#52697A]">
          {selectedClass?.students.length ?? 0}명
        </span>
      </div>

      <div className="message-zone-select-panel max-h-[min(42rem,calc(100vh-22rem))] overflow-y-auto lg:min-h-0 lg:flex-1">
        {selectedClass?.students.length ? (
          selectedClass.students.map((student) => {
            const isSelected = student.id === selectedStudent?.id;
            const primarySchedule = getSortedActiveSchedules(student.schedules)[0];
            return (
              <article
                key={student.id}
                className={[
                  "border-b border-[#E3EAED] border-l-4 px-3 py-2.5 last:border-b-0",
                  isSelected ? "border-l-[#2F5F7E] bg-[#DDEAF4]" : "border-l-transparent bg-[#F6F9FC] hover:bg-[#E7EFF6]",
                ].join(" ")}
              >
                <div className="grid gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-bold text-[#17232B]">
                          {student.name}
                        </p>
                        {isSelected ? (
                          <span className="inline-flex shrink-0 items-center gap-1 border border-[#264F68] bg-[#2F5F7E] px-2 py-0.5 text-xs font-bold text-white">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            선택됨
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[#60717B]">
                        {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                          "학년 정보 없음"}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#60717B]">
                        {student.parentName ?? "학부모"} · {student.maskedParentPhone}
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-sm border px-2 py-1 text-xs font-bold",
                        primarySchedule
                          ? "border-[#9DB9CC] bg-[#E5EFF7] text-[#2F5F7E]"
                          : "border-[#C9D7DC] bg-[#EEF4F6] text-[#60717B]",
                      ].join(" ")}
                    >
                      {primarySchedule
                        ? `${weekDayShortLabel(primarySchedule.dayOfWeek)} ${primarySchedule.startTime}`
                        : "스케줄 없음"}
                    </span>
                  </div>

                  {primarySchedule ? (
                    <p className="truncate text-xs font-medium text-stone-600">
                      {primarySchedule.endTime}까지 ·{" "}
                      {scheduleTypeLabel(primarySchedule.scheduleType)} ·{" "}
                      {primarySchedule.title}
                    </p>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onStudentSelect(student.id)}
                    className={[
                      "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                      isSelected
                        ? "border-[#2F5F7E] bg-[#DDEAF4] text-[#234C66]"
                        : "border-[#AFC0CD] bg-[#F6F9FC] text-[#334B58] hover:bg-[#E7EFF6]",
                    ].join(" ")}
                  >
                    문자 작성
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                  <span className="inline-flex min-h-8 shrink-0 items-center px-1 text-[11px] font-bold text-[#78909A]">
                    사유:
                  </span>
                  {quickReasonIds.map((reasonId) => {
                    const isReasonSelected = isSelected && selectedReason === reasonId;
                    return (
                      <button
                        key={reasonId}
                        type="button"
                        aria-pressed={isReasonSelected}
                        onClick={() => onStudentReasonSelect(student.id, reasonId)}
                        className={[
                          "min-h-8 shrink-0 rounded-sm border px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                          isReasonSelected
                            ? "border-[#264F68] bg-[#2F5F7E] text-white"
                            : "border-[#AFC0CD] bg-[#F6F9FC] text-[#405763] hover:border-[#6E8BA0] hover:bg-[#E7EFF6]",
                        ].join(" ")}
                      >
                        {isReasonSelected ? "선택됨 · " : ""}
                        {reasonLabel(reasonId)}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-5 text-sm text-stone-600">
            이 반에 등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleAndHistoryPanel({
  selectedClassName,
  selectedStudent,
  selectedMakeupCandidate,
  visibleFollowupHistory,
  onDateMakeupCandidateSelect,
  onMakeupCandidateSelect,
  className = "",
}: {
  selectedClassName: string | undefined;
  selectedStudent: OperationsStudent | undefined;
  selectedMakeupCandidate: MakeupCandidate | null;
  visibleFollowupHistory: FollowupHistoryState;
  onDateMakeupCandidateSelect: (candidate: MakeupCandidate) => void;
  onMakeupCandidateSelect: (schedule: OperationsStudentSchedule) => void;
  className?: string;
}) {
  return (
    <div className={["space-y-3", className].join(" ")}>
      <MakeupCalendarPanel
        selectedStudent={selectedStudent}
        selectedCandidate={selectedMakeupCandidate}
        onCandidateSelect={onDateMakeupCandidateSelect}
      />
      <WeeklySchedulePanel
        selectedClassName={selectedClassName}
        selectedStudent={selectedStudent}
        onMakeupCandidateSelect={onMakeupCandidateSelect}
      />
      <StudentFollowupHistory
        selectedStudentName={selectedStudent?.name}
        history={visibleFollowupHistory}
      />
    </div>
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
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 border-t border-stone-200 bg-white/95 px-4 pb-3 pt-3 shadow-[0_-10px_30px_rgba(28,25,23,0.12)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-950">
            {selectedStudent.name} · {reasonLabel(selectedReason)} 초안 확인
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
          className="min-h-11 shrink-0 rounded-md bg-[#315C7C] px-4 text-sm font-semibold text-white"
        >
          초안 확인
        </button>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1.5 py-1">
      <dt className="truncate text-xs font-semibold text-[#60717B]">{label}</dt>
      <dd className="shrink-0 text-sm font-black tabular-nums text-[#17232B]">{value}</dd>
    </div>
  );
}

function reasonLabel(reasonId: FollowupReason) {
  const labels: Record<FollowupReason, string> = {
    absence: "결석",
    late: "지각",
    homework_missing: "숙제 미완료",
    retest: "재시험",
    makeup: "보강 안내",
    materials_missing: "준비물 미지참",
    class_attitude: "수업 태도",
    consultation: "상담 권장",
  };

  return labels[reasonId] ?? reasonId;
}
