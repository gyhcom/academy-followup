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
    <div className="hidden lg:block">
      <OperationsHeader
        academyName={props.academyName}
        classCount={props.classes.length}
        totalStudents={props.totalStudents}
      />

      <section className="grid min-w-0 overflow-hidden rounded-md border border-[#C2D1D8] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)] lg:grid-cols-[17rem_minmax(0,1fr)_19.5rem] xl:grid-cols-[18rem_minmax(0,1fr)_21rem] 2xl:grid-cols-[19rem_minmax(0,1fr)_22rem]">
        <aside className="min-w-0 border-r border-[#D5E0E4] bg-[#F8FBFC]">
          <ClassPicker
            classes={props.classes}
            selectedClass={props.selectedClass}
            onClassSelect={props.onClassSelect}
          />
          <StudentSelectionList
            selectedClass={props.selectedClass}
            selectedStudent={props.selectedStudent}
            selectedReason={props.selectedReason}
            onStudentSelect={props.onStudentSelect}
            onStudentReasonSelect={props.onStudentReasonSelect}
          />
        </aside>

        <section className="min-w-0 bg-white p-4">
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
    <section className="mb-3 rounded-md border border-[#C2D1D8] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(13,38,48,0.08)] sm:mb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007A7C]">{academyName}</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight tracking-[-0.02em] text-[#17232B]">
            수업 후 연락
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[#60717B]">
            반과 학생을 선택하면 학부모 문자 초안이 준비됩니다.
          </p>
        </div>

        <dl className="flex gap-3 border-t border-[#D2DDE2] pt-3 text-sm lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
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
    <section aria-label="반 선택" className="border-b border-[#D5E0E4] bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#60717B]">
          <UsersRound size={14} aria-hidden="true" />
          반 선택
        </p>
        {selectedClass ? (
          <p className="truncate text-xs font-semibold text-[#60717B]">
            {selectedClass.name} · {selectedClass.students.length}명
          </p>
        ) : null}
      </div>
      <div className="mt-2 max-h-[12rem] divide-y divide-[#E1EAEE] overflow-y-auto rounded-md border border-[#C7D6DD] bg-white">
        {classes.map((classItem) => {
          const isSelected = classItem.id === selectedClass?.id;
          return (
            <button
              key={classItem.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onClassSelect(classItem.id)}
              className={[
                "min-h-11 w-full border-l-[3px] px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]",
                isSelected
                  ? "border-l-[#007A7C] bg-[#F0FAF9] text-[#17232B]"
                  : "border-l-transparent bg-white text-[#17232B] hover:border-l-[#B8C9D0] hover:bg-[#F5FAFA]",
              ].join(" ")}
            >
              <span className="block text-sm font-bold">{classItem.name}</span>
              <span
                className={[
                  "mt-0.5 block text-xs",
                isSelected ? "text-[#007A7C]" : "text-[#60717B]",
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
    <section aria-labelledby="student-flow-title" className="min-w-0 lg:order-1">
      <div className="flex items-end justify-between gap-3 border-b border-[#D5E0E4] bg-white px-4 py-3">
        <div>
          <h2 id="student-flow-title" className="inline-flex items-center gap-2 text-sm font-bold text-[#17232B]">
            <MessageCircle size={15} className="text-[#007A7C]" aria-hidden="true" />
            학생 확인 목록
          </h2>
          <p className="mt-1 text-xs text-[#60717B]">
            학생을 확인하고 필요한 연락 사유를 바로 선택합니다.
          </p>
        </div>
        <span className="shrink-0 rounded-sm border border-[#D5E0E4] bg-[#F5F9FA] px-2 py-1 text-xs font-bold text-[#60717B]">
          {selectedClass?.students.length ?? 0}명
        </span>
      </div>

      <div className="max-h-[min(42rem,calc(100vh-22rem))] overflow-y-auto bg-white">
        {selectedClass?.students.length ? (
          selectedClass.students.map((student) => {
            const isSelected = student.id === selectedStudent?.id;
            const primarySchedule = getSortedActiveSchedules(student.schedules)[0];
            return (
              <article
                key={student.id}
                className={[
                  "border-b border-[#E3EAED] border-l-4 px-3 py-2.5 last:border-b-0",
                  isSelected ? "border-l-[#007A7C] bg-[#EEF8F7]" : "border-l-transparent bg-white hover:bg-[#F8FBFC]",
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
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-[#007A7C] px-2 py-0.5 text-xs font-bold text-white">
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
                          ? "border-[#BFD4D6] bg-[#EAF6F5] text-[#007A7C]"
                          : "border-[#D5E0E4] bg-[#F5F9FA] text-[#60717B]",
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

                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => onStudentSelect(student.id)}
                    className={[
                      "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#84C7CB]",
                      isSelected
                        ? "border-[#007A7C] bg-white text-[#007A7C]"
                        : "border-[#C9D6E2] bg-white text-[#334B58] hover:bg-[#F0FAF9]",
                    ].join(" ")}
                  >
                    문자 작성
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
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
                            ? "border-[#007A7C] bg-[#007A7C] text-white"
                            : "border-[#D5E0E4] bg-[#F8FBFC] text-[#405763] hover:border-[#BFD4D6] hover:bg-[#F0FAF9]",
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
    <div className={["space-y-4", className].join(" ")}>
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
    <div className="min-w-14">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-stone-950">{value}</dd>
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
