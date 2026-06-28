"use client";

import { useMemo, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Search,
  UsersRound,
  X,
} from "lucide-react";
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
  studentSearchQuery: string;
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
  onStudentSearchChange: (value: string) => void;
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

      <section className="grid min-h-[42rem] min-w-0 overflow-hidden border border-[var(--academy-border)] bg-white lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <ClassPicker
            classes={props.classes}
            selectedClass={props.selectedClass}
            onClassSelect={props.onClassSelect}
          />

          <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18.5rem_minmax(0,1fr)]">
            <div className="min-h-0 min-w-0 border-r border-[var(--academy-border)] bg-white">
              <StudentSelectionList
                selectedClass={props.selectedClass}
                selectedStudent={props.selectedStudent}
                selectedReason={props.selectedReason}
                searchQuery={props.studentSearchQuery}
                onSearchChange={props.onStudentSearchChange}
                onStudentSelect={props.onStudentSelect}
                onStudentReasonSelect={props.onStudentReasonSelect}
              />
            </div>

            <section className="message-zone-plan min-w-0 border-r p-3 2xl:p-4">
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
          searchQuery={props.studentSearchQuery}
          onSearchChange={props.onStudentSearchChange}
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
    <section className="mb-3 border border-[var(--academy-border)] bg-white px-4 py-2.5 sm:mb-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-lg font-semibold leading-tight text-[var(--academy-ink)]">
              수업 후 연락
            </h2>
            <span className="truncate text-sm font-semibold text-[var(--academy-muted)]">
              {academyName}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
            학생 row를 선택한 뒤 기록 저장과 테스트 발송을 단계별로 처리합니다.
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--academy-muted)]">
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
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--academy-muted)]">
          <UsersRound size={14} aria-hidden="true" />
          반 선택
        </p>
        {selectedClass ? (
          <p className="truncate text-xs font-semibold text-[var(--academy-muted)]">
            {selectedClass.name} · {selectedClass.students.length}명
          </p>
        ) : null}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {classes.map((classItem) => {
          const isSelected = classItem.id === selectedClass?.id;
          return (
            <button
              key={classItem.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onClassSelect(classItem.id)}
              className={[
                "min-h-10 w-[12.5rem] shrink-0 border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--academy-focus)]",
                isSelected
                  ? "border-[var(--academy-accent)] bg-[var(--academy-surface)] text-[var(--academy-ink)] ring-1 ring-inset ring-[var(--academy-accent-soft)]"
                  : "border-[var(--academy-border)] bg-white text-[var(--academy-muted-strong)] hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]",
              ].join(" ")}
            >
              <span className="block truncate text-sm font-bold">{classItem.name}</span>
              <span
                className={[
                  "mt-0.5 block truncate text-xs",
                isSelected ? "text-[var(--academy-muted-strong)]" : "text-[var(--academy-muted)]",
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
  searchQuery,
  onSearchChange,
  onStudentSelect,
  onStudentReasonSelect,
}: {
  selectedClass: OperationsClass | undefined;
  selectedStudent: OperationsStudent | undefined;
  selectedReason: FollowupReason;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onStudentSelect: (studentId: string) => void;
  onStudentReasonSelect: (studentId: string, reasonId: FollowupReason) => void;
}) {
  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const students = selectedClass?.students ?? [];

    if (!normalizedQuery) {
      return students;
    }

    return students.filter((student) =>
      [
        student.name,
        student.schoolName,
        student.gradeLabel,
        student.parentName,
        student.maskedParentPhone,
        student.maskedStudentPhone,
        ...student.schedules.map((schedule) => schedule.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [searchQuery, selectedClass?.students]);
  const totalStudentCount = selectedClass?.students.length ?? 0;
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <section aria-labelledby="student-flow-title" className="min-w-0 lg:order-1 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="message-zone-select border-b px-4 py-3">
        <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="student-flow-title" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--academy-ink)]">
            <MessageCircle size={15} className="text-[var(--academy-muted)]" aria-hidden="true" />
            학생 확인 목록
          </h2>
          <p className="mt-1 text-xs text-[var(--academy-muted)]">
            학생을 확인하고 필요한 연락 사유를 바로 선택합니다.
          </p>
        </div>
        <span className="message-zone-select-panel shrink-0 border px-2 py-1 text-xs font-semibold text-[var(--academy-muted-strong)]">
          {hasSearchQuery ? `${filteredStudents.length}/${totalStudentCount}명` : `${totalStudentCount}명`}
        </span>
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">학생 이름 검색</span>
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--academy-muted)]"
            aria-hidden="true"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="학생 이름, 학교, 학부모 검색"
            className="min-h-10 w-full border border-[var(--academy-border)] bg-white pl-9 pr-10 text-sm font-medium text-[var(--academy-ink)] outline-none placeholder:text-[#9A9CA3] focus:border-[var(--academy-accent)] focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[var(--academy-accent-soft)]"
          />
          {hasSearchQuery ? (
            <button
              type="button"
              aria-label="학생 검색어 지우기"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center border border-[var(--academy-border)] bg-[var(--academy-surface-muted)] text-[var(--academy-muted)] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--academy-focus)]"
            >
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="message-zone-select-panel overflow-y-auto lg:min-h-0 lg:flex-1">
        {filteredStudents.length ? (
          filteredStudents.map((student) => {
            const isSelected = student.id === selectedStudent?.id;
            const primarySchedule = getSortedActiveSchedules(student.schedules)[0];
            return (
              <article
                key={student.id}
                className={[
                  "border-b px-3 py-2.5 outline outline-1 outline-offset-[-1px] last:border-b-0",
                  isSelected
                    ? "border-[var(--academy-accent)] bg-[var(--academy-surface)] outline-[var(--academy-accent)] ring-1 ring-inset ring-[var(--academy-accent-soft)]"
                    : "border-[var(--academy-border)] bg-white outline-transparent hover:bg-[var(--academy-surface-muted)]",
                ].join(" ")}
              >
                <div className="grid gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-[var(--academy-ink)]">
                          {student.name}
                        </p>
                        {isSelected ? (
                          <span className="inline-flex shrink-0 items-center gap-1 border border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--academy-accent)]">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            선택됨
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--academy-muted)]">
                        {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
                          "학년 정보 없음"}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--academy-muted)]">
                        {student.parentName ?? "학부모"} · {student.maskedParentPhone}
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-sm border px-2 py-1 text-xs font-bold",
                        primarySchedule
                          ? "border-[var(--academy-border)] bg-[var(--academy-surface-muted)] text-[var(--academy-muted-strong)]"
                          : "border-[var(--academy-border)] bg-[var(--academy-surface-muted)] text-[var(--academy-muted)]",
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

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onStudentSelect(student.id)}
                    className={[
                      "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--academy-focus)]",
                      isSelected
                        ? "border-[var(--academy-accent)] bg-white text-[var(--academy-accent)]"
                        : "border-[var(--academy-border)] bg-white text-[var(--academy-muted-strong)] hover:bg-[var(--academy-surface-muted)]",
                    ].join(" ")}
                  >
                    문자 작성
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                  {isSelected ? (
                    <>
                      <span className="inline-flex min-h-8 shrink-0 items-center px-1 text-[11px] font-semibold text-[var(--academy-muted)]">
                        사유:
                      </span>
                      {quickReasonIds.map((reasonId) => {
                        const isReasonSelected = selectedReason === reasonId;
                        return (
                          <button
                            key={reasonId}
                            type="button"
                            aria-pressed={isReasonSelected}
                            onClick={() => onStudentReasonSelect(student.id, reasonId)}
                            className={[
                              "min-h-8 shrink-0 rounded-sm border px-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--academy-focus)]",
                              isReasonSelected
                                ? "border-[var(--academy-accent)] bg-white text-[var(--academy-accent)]"
                                : "border-[var(--academy-border)] bg-white text-[var(--academy-muted-strong)] hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]",
                            ].join(" ")}
                          >
                            {isReasonSelected ? "선택됨 · " : ""}
                            {reasonLabel(reasonId)}
                          </button>
                        );
                      })}
                    </>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-5 text-sm text-[#62656f]">
            {hasSearchQuery
              ? "검색 결과가 없습니다. 학생 이름이나 학교명을 다시 확인해 주세요."
              : "이 반에 등록된 학생이 없습니다."}
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
          className="min-h-11 shrink-0 rounded-md border border-[#c9cdd2] bg-[#fffefa] px-4 text-sm font-semibold text-[#2f3437] transition hover:border-[#aeb5bf] hover:bg-[#f6f7f8]"
        >
          초안 확인
        </button>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <dt className="truncate text-[#858895]">{label}</dt>
      <dd className="shrink-0 font-black tabular-nums text-[#2f3437]">{value}</dd>
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
