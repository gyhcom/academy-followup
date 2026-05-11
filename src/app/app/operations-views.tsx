"use client";

import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
        teacherName={props.teacherName}
        classCount={props.classes.length}
        totalStudents={props.totalStudents}
        activeScheduleCount={props.activeScheduleCount}
      />
      <ClassPicker
        classes={props.classes}
        selectedClass={props.selectedClass}
        onClassSelect={props.onClassSelect}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(260px,0.95fr)_minmax(360px,1.05fr)] lg:items-start xl:grid-cols-[320px_minmax(380px,1fr)_400px]">
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
          className="lg:order-3 lg:col-span-2 xl:order-2 xl:col-span-1"
        />

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
        teacherName={props.teacherName}
        classCount={props.classes.length}
        totalStudents={props.totalStudents}
        activeScheduleCount={props.activeScheduleCount}
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
  teacherName,
  classCount,
  totalStudents,
  activeScheduleCount,
}: {
  academyName: string;
  teacherName: string;
  classCount: number;
  totalStudents: number;
  activeScheduleCount: number;
}) {
  return (
    <section className="mb-4 border-b border-[#DED8CE] bg-transparent px-1 pb-4 sm:mb-5 sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-4 sm:shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#315C7C]">{academyName}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
            수업 후 문자 보내기
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {teacherName}님이 학생을 고르고 결석, 재시험, 숙제 미완료 같은 사유를
            누르면 학부모에게 보낼 문자 초안이 바로 열립니다.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 border-t border-stone-200 pt-3 text-sm lg:min-w-[21rem] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <StatusItem label="반" value={`${classCount}개`} />
          <StatusItem label="학생" value={`${totalStudents}명`} />
          <StatusItem label="일정" value={`${activeScheduleCount}개`} />
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
    <section aria-label="반 선택" className="mb-4 space-y-2 sm:mb-5">
      <p className="px-1 text-xs font-semibold text-stone-500">오늘 수업</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {classes.map((classItem) => {
          const isSelected = classItem.id === selectedClass?.id;
          return (
            <button
              key={classItem.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onClassSelect(classItem.id)}
              className={[
                "min-h-11 shrink-0 rounded-md border px-3 text-left transition",
                isSelected
                  ? "border-[#315C7C] bg-[#315C7C] text-white"
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
    <section aria-labelledby="student-flow-title" className="space-y-3 lg:order-1">
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

      <div className="overflow-hidden rounded-lg border border-[#DED8CE] bg-white shadow-sm">
        {selectedClass?.students.length ? (
          selectedClass.students.map((student) => {
            const isSelected = student.id === selectedStudent?.id;
            const primarySchedule = getSortedActiveSchedules(student.schedules)[0];
            return (
              <article
                key={student.id}
                className={[
                  "border-b border-stone-100 p-4 last:border-b-0",
                  isSelected ? "bg-[#F3F8FC]" : "bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                  </div>

                  {isSelected ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#315C7C] px-2 py-1 text-xs font-semibold text-white">
                      <CheckCircle2 size={13} />
                      선택됨
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => onStudentSelect(student.id)}
                    className={[
                      "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
                      isSelected
                        ? "border-[#315C7C] bg-white text-[#315C7C]"
                        : "border-[#C9D6E2] bg-white text-[#315C7C] hover:bg-[#EAF1F8]",
                    ].join(" ")}
                  >
                    문자 작성
                    <ArrowRight size={13} />
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
                          "min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
                          isReasonSelected
                            ? "border-[#315C7C] bg-[#315C7C] text-white"
                            : "border-stone-200 bg-stone-50 text-stone-700 hover:border-[#C9D6E2] hover:bg-[#EAF1F8]",
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
            {selectedStudent.name} · {reasonLabel(selectedReason)} 문자 작성
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
          문자 작성
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
