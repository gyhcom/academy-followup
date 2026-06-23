import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Link2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  type FollowupHistoryState,
  StudentFollowupHistory,
} from "@/app/app/operations-history";
import { fetchFollowupHistory } from "@/lib/client/followups";
import type {
  ManagementClass,
  ManagementStudent,
  ManagementStudentSchedule,
  StudentScheduleFilter,
  StudentSortMode,
} from "@/app/app/management-types";
import { StatusBadge } from "@/app/app/management-common";
import {
  activeScheduleCount,
  compareStudents,
  getActiveSchedules,
  getPrimarySchedule,
  groupSchedulesByDay,
  scheduleTypeLabel,
  weekDayLabel,
  weekDayShortLabel,
} from "@/app/app/management-utils";
import {
  fetchStudentScheduleSharing,
  postStudentScheduleSharing,
} from "@/lib/client/student-schedule-sharing";
import { saveExternalAcademyClass } from "@/lib/client/external-academy-classes";

type SharedSchedule = {
  id: string;
  academyName: string;
  scheduleType: string;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
};

type SharedScheduleLink = {
  id: string;
  academyName: string;
  connectedAt: string;
  schedules: SharedSchedule[];
};

type SharedScheduleState = {
  studentId: string;
  status: "idle" | "loading" | "ready" | "error";
  canManage: boolean;
  links: SharedScheduleLink[];
  error: string;
  generatedCode: string;
  expiresAt: string;
  actionStatus: "idle" | "saving" | "error";
  actionMessage: string;
};

const staleStudentContextMessage =
  "현재 로그인한 학원과 선택한 학생 정보가 맞지 않습니다. 다른 학원 계정으로 로그인했거나 화면이 오래된 상태일 수 있습니다. 새로고침 후 다시 확인해 주세요.";

export function StudentDirectory({
  students,
  classes,
  selectedStudentId,
  searchQuery,
  classFilter,
  statusFilter,
  scheduleFilter,
  sortMode,
  onSelectStudent,
  onSearchChange,
  onClassFilterChange,
  onStatusFilterChange,
  onScheduleFilterChange,
  onSortModeChange,
  onEditStudent,
  onCreateSchedule,
  onEditSchedule,
}: {
  students: ManagementStudent[];
  classes: ManagementClass[];
  selectedStudentId: string | null;
  searchQuery: string;
  classFilter: string;
  statusFilter: string;
  scheduleFilter: StudentScheduleFilter;
  sortMode: StudentSortMode;
  onSelectStudent: (studentId: string) => void;
  onSearchChange: (value: string) => void;
  onClassFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onScheduleFilterChange: (value: StudentScheduleFilter) => void;
  onSortModeChange: (value: StudentSortMode) => void;
  onEditStudent: (student: ManagementStudent) => void;
  onCreateSchedule: (student: ManagementStudent) => void;
  onEditSchedule: (student: ManagementStudent, schedule: ManagementStudentSchedule) => void;
}) {
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return students
      .filter((student) => {
        if (statusFilter !== "all" && student.status !== statusFilter) {
          return false;
        }

        if (classFilter !== "all" && student.classId !== classFilter) {
          return false;
        }

        if (scheduleFilter === "has_schedule" && activeScheduleCount(student) === 0) {
          return false;
        }

        if (scheduleFilter === "missing_schedule" && activeScheduleCount(student) > 0) {
          return false;
        }

        if (
          scheduleFilter === "external" &&
          !student.schedules.some(
            (schedule) => schedule.isActive && schedule.scheduleType === "external",
          )
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          student.name,
          student.className,
          student.schoolName,
          student.gradeLabel,
          student.parentName,
          student.studentPhone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => compareStudents(a, b, sortMode));
  }, [classFilter, scheduleFilter, searchQuery, sortMode, statusFilter, students]);
  const selectedStudent =
    filteredStudents.find((student) => student.id === selectedStudentId) ??
    filteredStudents[0] ??
    null;

  function selectStudent(studentId: string, openDetail = false) {
    onSelectStudent(studentId);
    setIsMobileDetailOpen(openDetail);
  }

  return (
    <div className="min-w-0 overflow-hidden bg-transparent sm:border sm:border-[#B8C9D0] sm:bg-[#F4F8F9]">
      <StudentDirectoryToolbar
        students={students}
        classes={classes}
        visibleCount={filteredStudents.length}
        searchQuery={searchQuery}
        classFilter={classFilter}
        statusFilter={statusFilter}
        scheduleFilter={scheduleFilter}
        sortMode={sortMode}
        onSearchChange={onSearchChange}
        onClassFilterChange={onClassFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        onScheduleFilterChange={onScheduleFilterChange}
        onSortModeChange={onSortModeChange}
      />

      {students.length === 0 ? (
      <div className="border-t border-[#E6E0D5] px-4 py-12 text-center">
        <p className="text-sm font-semibold text-stone-900">아직 등록된 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">
          CSV 일괄 등록 또는 학생 등록으로 시작하면 출석부와 문자 대상 목록을 바로 만들 수 있습니다.
        </p>
      </div>
      ) : (
        <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 border-t border-[#B8C9D0] lg:border-r lg:border-[#B8C9D0]">
            <StudentResourceTable
              students={filteredStudents}
              selectedStudentId={selectedStudent?.id ?? null}
              onSelectStudent={(studentId) => selectStudent(studentId, false)}
              onOpenMobileDetail={(studentId) => selectStudent(studentId, true)}
            />
          </div>

          <div className="hidden min-w-0 border-t border-[#B8C9D0] bg-[#EDF3F5] lg:block">
            <StudentDetailPanel
              student={selectedStudent}
              onEditStudent={onEditStudent}
              onCreateSchedule={onCreateSchedule}
              onEditSchedule={onEditSchedule}
            />
          </div>

          <StudentDetailSheet
            student={selectedStudent}
            isOpen={isMobileDetailOpen}
            onClose={() => setIsMobileDetailOpen(false)}
            onEditStudent={onEditStudent}
            onCreateSchedule={onCreateSchedule}
            onEditSchedule={onEditSchedule}
          />
        </div>
      )}
    </div>
  );
}

export function StudentDirectoryToolbar({
  students,
  classes,
  visibleCount,
  searchQuery,
  classFilter,
  statusFilter,
  scheduleFilter,
  sortMode,
  onSearchChange,
  onClassFilterChange,
  onStatusFilterChange,
  onScheduleFilterChange,
  onSortModeChange,
}: {
  students: ManagementStudent[];
  classes: ManagementClass[];
  visibleCount: number;
  searchQuery: string;
  classFilter: string;
  statusFilter: string;
  scheduleFilter: StudentScheduleFilter;
  sortMode: StudentSortMode;
  onSearchChange: (value: string) => void;
  onClassFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onScheduleFilterChange: (value: StudentScheduleFilter) => void;
  onSortModeChange: (value: StudentSortMode) => void;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const missingScheduleCount = students.filter((student) => activeScheduleCount(student) === 0).length;
  const activeFilterCount = [
    classFilter !== "all",
    statusFilter !== "active",
    scheduleFilter !== "all",
    sortMode !== "time",
  ].filter(Boolean).length;

  return (
    <div className="border-b border-[#B8C9D0] bg-[#E7EEF1]">
      <div className="grid gap-0 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-stretch">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#60717B]"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="학생명, 반, 학교, 학부모 검색"
            className="min-h-11 w-full border-0 border-b border-[#B8C9D0] bg-[#F7FAFA] pl-9 pr-3 text-sm font-medium text-[var(--clinic-text)] outline-none placeholder:text-[#8799A1] focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#84C7CB] xl:border-b-0 xl:border-r"
          />
        </label>

        <div className="flex items-center justify-between gap-2 border-b border-[#B8C9D0] bg-[#F4F8F9] px-3 py-2 text-xs font-bold text-[var(--clinic-muted)] xl:min-h-11 xl:border-b-0">
          <button
            type="button"
            onClick={() =>
              onScheduleFilterChange(
                scheduleFilter === "missing_schedule" ? "all" : "missing_schedule",
              )
            }
            className={[
              "flex min-h-8 min-w-0 items-center gap-2 border px-2 text-left transition lg:hidden",
              scheduleFilter === "missing_schedule"
                ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                : "border-[#C9D7DC] bg-[#F7FAFA] text-[var(--clinic-text)] hover:bg-[#f8f9fa]",
            ].join(" ")}
          >
            <CalendarDays size={13} className="shrink-0" />
            <span className="truncate">
              {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
            </span>
          </button>
          <div className="hidden min-h-8 min-w-0 items-center gap-2 border border-[#C9D7DC] bg-[#EDF3F5] px-2 text-left text-[var(--clinic-text)] lg:flex">
            <CalendarDays size={13} className="shrink-0 text-[#60717B]" aria-hidden="true" />
            <span className="truncate">
              {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="flex min-h-8 shrink-0 items-center gap-1 border border-[#C9D7DC] bg-[#F7FAFA] px-2 text-xs font-bold text-[var(--clinic-text)] lg:hidden"
          >
            <SlidersHorizontal size={13} />
            필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-[#B8C9D0] bg-[#F4F8F9] px-3 py-2 lg:hidden">
          {classFilter !== "all" ? (
            <FilterChip label={classes.find((item) => item.id === classFilter)?.name ?? "반 필터"} />
          ) : null}
          {statusFilter !== "active" ? <FilterChip label={studentStatusLabel(statusFilter)} /> : null}
          {scheduleFilter !== "all" ? <FilterChip label={scheduleFilterLabel(scheduleFilter)} /> : null}
          {sortMode !== "time" ? <FilterChip label={sortModeLabel(sortMode)} /> : null}
        </div>
      ) : null}

      <div
        className={[
          "gap-0 border-b border-[#B8C9D0] bg-[#F4F8F9] sm:grid-cols-2 lg:grid lg:grid-cols-4",
          isFilterOpen ? "grid" : "hidden",
        ].join(" ")}
      >
        <select
          value={classFilter}
          onChange={(event) => onClassFilterChange(event.target.value)}
          className="min-h-11 border-0 border-r border-[#B8C9D0] bg-[#F4F8F9] px-3 text-sm font-semibold text-[var(--clinic-text)] outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
        >
          <option value="all">전체 반</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="min-h-11 border-0 border-r border-[#B8C9D0] bg-[#F4F8F9] px-3 text-sm font-semibold text-[var(--clinic-text)] outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
        >
          <option value="all">전체 상태</option>
          <option value="active">재원</option>
          <option value="paused">휴원</option>
          <option value="left">퇴원</option>
        </select>

        <select
          value={scheduleFilter}
          onChange={(event) => onScheduleFilterChange(event.target.value as StudentScheduleFilter)}
          className="min-h-11 border-0 border-r border-[#B8C9D0] bg-[#F4F8F9] px-3 text-sm font-semibold text-[var(--clinic-text)] outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
        >
          <option value="all">전체 스케줄</option>
          <option value="has_schedule">스케줄 있음</option>
          <option value="missing_schedule">스케줄 미등록</option>
          <option value="external">개인/기타 일정 있음</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as StudentSortMode)}
          className="min-h-11 border-0 bg-[#F4F8F9] px-3 text-sm font-semibold text-[var(--clinic-text)] outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
        >
          <option value="time">요일·시간순</option>
          <option value="name">이름순</option>
          <option value="class">반순</option>
        </select>
      </div>
    </div>
  );
}

function StudentResourceTable({
  students,
  selectedStudentId,
  onSelectStudent,
  onOpenMobileDetail,
}: {
  students: ManagementStudent[];
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string) => void;
  onOpenMobileDetail: (studentId: string) => void;
}) {
  if (students.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-semibold text-stone-900">조건에 맞는 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">
          검색어를 지우거나 반/상태/스케줄 필터를 `전체`로 바꿔 다시 확인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="hidden grid-cols-[minmax(170px,1.15fr)_minmax(160px,0.95fr)_minmax(150px,0.9fr)_116px_88px] border-b border-[#B8C9D0] bg-[#E7EEF1] px-3 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-[#60717B] lg:grid">
        <span>학생</span>
        <span>반·학년</span>
        <span>대표 일정</span>
        <span>공유 동의</span>
        <span className="text-right">상태</span>
      </div>
      <div
        className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA] sm:max-h-[680px] sm:overflow-y-auto sm:border-0 sm:bg-transparent"
        role="listbox"
        aria-label="학생 명단"
      >
        {students.map((student) => (
          <StudentResourceRow
            key={student.id}
            student={student}
            isSelected={student.id === selectedStudentId}
            onSelect={() => onSelectStudent(student.id)}
            onOpenMobileDetail={() => onOpenMobileDetail(student.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StudentResourceRow({
  student,
  isSelected,
  onSelect,
  onOpenMobileDetail,
}: {
  student: ManagementStudent;
  isSelected: boolean;
  onSelect: () => void;
  onOpenMobileDetail: () => void;
}) {
  const primarySchedule = getPrimarySchedule(student);
  const activeSchedules = getActiveSchedules(student);
  const scheduleLabel = primarySchedule
    ? `${primarySchedule.scheduleDate ? formatShortDate(primarySchedule.scheduleDate) : weekDayShortLabel(primarySchedule.dayOfWeek)} ${primarySchedule.startTime}`
    : "스케줄 미등록";

  return (
    <div
      className={[
        "border-b border-[#D6E0E5] transition last:border-b-0",
        isSelected ? "bg-[#f6f7f8] ring-1 ring-inset ring-[#d7dbe0]" : "bg-[#F7FAFA] hover:bg-[#f8f9fa]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpenMobileDetail}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-4 text-left sm:px-3 sm:py-3 lg:hidden"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-950">{student.name}</span>
          <span className="mt-1 block truncate text-xs text-stone-500">
            {student.className ?? "미배정"} · {student.gradeLabel ?? "학년 미지정"}
          </span>
          <span className="mt-1 block truncate text-xs text-stone-500">
            {primarySchedule
              ? `${primarySchedule.scheduleDate ? formatShortDate(primarySchedule.scheduleDate) : weekDayShortLabel(primarySchedule.dayOfWeek)} ${primarySchedule.startTime}`
              : "스케줄 미등록"} · {student.maskedParentPhone}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusBadge status={student.status} />
          <ChevronRight size={16} className="text-stone-400" />
        </span>
      </button>

      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-label={`${student.name} 학생 상세 보기, ${student.className ?? "미배정"}, ${student.gradeLabel ?? "학년 미지정"}, ${scheduleLabel}, 공유 동의 ${student.scheduleShareConsentConfirmed ? "완료" : "없음"}, 상태 ${studentStatusLabel(student.status)}`}
        onClick={onSelect}
        className="hidden w-full grid-cols-[minmax(170px,1.15fr)_minmax(160px,0.95fr)_minmax(150px,0.9fr)_116px_88px] items-center gap-3 px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB] lg:grid"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-950">{student.name}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {student.schoolName ?? "학교 미지정"}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-stone-700">{student.className ?? "미배정"}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {student.gradeLabel ?? "학년 미지정"} · {student.parentName ?? "학부모"}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-stone-700">
            {scheduleLabel}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{activeSchedules.length}개 일정</span>
        </span>
        <span
          className={[
            "w-fit rounded-full px-2 py-1 text-[11px] font-semibold",
            student.scheduleShareConsentConfirmed
              ? "border border-violet-200 bg-violet-50 text-violet-800"
              : "border border-[#C9D7DC] bg-[#EDF3F5] text-[#60717B]",
          ].join(" ")}
        >
          {student.scheduleShareConsentConfirmed ? "공유 동의" : "미동의"}
        </span>
        <span className="flex justify-end">
          <StatusBadge status={student.status} />
        </span>
      </button>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="border border-[#d7dbe0] bg-[#f6f7f8] px-2 py-1 text-[11px] font-semibold text-[#494d5a]">
      {label}
    </span>
  );
}

function studentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    all: "전체 상태",
    active: "재원",
    paused: "휴원",
    left: "퇴원",
  };

  return labels[status] ?? status;
}

function scheduleFilterLabel(filter: StudentScheduleFilter) {
  const labels: Record<StudentScheduleFilter, string> = {
    all: "전체 스케줄",
    has_schedule: "스케줄 있음",
    missing_schedule: "스케줄 미등록",
    external: "개인/기타 일정 있음",
  };

  return labels[filter];
}

function sortModeLabel(sortMode: StudentSortMode) {
  const labels: Record<StudentSortMode, string> = {
    time: "요일·시간순",
    name: "이름순",
    class: "반순",
  };

  return labels[sortMode];
}

function StudentDetailSheet({
  student,
  isOpen,
  onClose,
  onEditStudent,
  onCreateSchedule,
  onEditSchedule,
}: {
  student: ManagementStudent | null;
  isOpen: boolean;
  onClose: () => void;
  onEditStudent: (student: ManagementStudent) => void;
  onCreateSchedule: (student: ManagementStudent) => void;
  onEditSchedule: (student: ManagementStudent, schedule: ManagementStudentSchedule) => void;
}) {
  if (!isOpen || !student) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="학생 상세 닫기"
        className="absolute inset-0 bg-[#111827]/35"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-2xl border border-[#E6E0D5] bg-[#FFFCF7] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#E6E0D5] bg-[#FFFCF7] px-4 py-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-300" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">학생 상세</p>
              <p className="mt-0.5 truncate text-xs text-stone-500">목록에서 선택한 학생의 운영 정보</p>
            </div>
            <button
              type="button"
              aria-label="학생 상세 닫기"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <StudentDetailPanel
          student={student}
          onEditStudent={(selectedStudent) => {
            onClose();
            onEditStudent(selectedStudent);
          }}
          onCreateSchedule={(selectedStudent) => {
            onClose();
            onCreateSchedule(selectedStudent);
          }}
          onEditSchedule={(selectedStudent, schedule) => {
            onClose();
            onEditSchedule(selectedStudent, schedule);
          }}
        />
      </div>
    </div>
  );
}

function StudentDetailPanel({
  student,
  onEditStudent,
  onCreateSchedule,
  onEditSchedule,
}: {
  student: ManagementStudent | null;
  onEditStudent: (student: ManagementStudent) => void;
  onCreateSchedule: (student: ManagementStudent) => void;
  onEditSchedule: (student: ManagementStudent, schedule: ManagementStudentSchedule) => void;
}) {
  const history = useStudentHistory(student?.id ?? null);
  const sharedSchedules = useSharedSchedules(student?.id ?? null);

  if (!student) {
    return (
      <aside className="p-5 text-center">
        <p className="text-sm font-semibold text-stone-900">선택된 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">
          학생을 선택하면 스케줄, 연락 기록, 타 학원 공유 상태를 한 번에 확인할 수 있습니다.
        </p>
      </aside>
    );
  }

  const groupedSchedules = groupSchedulesByDay(
    student.schedules.filter((schedule) => schedule.isActive),
  );

  return (
    <aside className="bg-[#F4F8F9] lg:sticky lg:top-4">
      <section className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
        <div className="border-b border-[#0B3E49] bg-[var(--clinic-primary-dark)] px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
                Student File
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-white">{student.name}</h3>
              <p className="mt-1 truncate text-xs font-medium text-cyan-50/72">
                {student.className ?? "미배정"} · {student.gradeLabel ?? "학년 미지정"} · {student.parentName ?? "학부모"}
              </p>
            </div>
            <StatusBadge status={student.status} />
          </div>
        </div>

        <div className="border-b border-[#C9D7DC] bg-[#f6f7f8] px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#40616B]">
                보호자 연락처
              </p>
              <p className="mt-1 truncate text-sm font-bold text-[var(--clinic-text)]">
                {student.maskedParentPhone}
              </p>
            </div>
            <span
              className={[
                "h-fit border px-2 py-1 text-[11px] font-black",
                student.scheduleShareConsentConfirmed
                  ? "border-violet-200 bg-violet-50 text-violet-800"
                  : "border-[#C9D7DC] bg-[#EDF3F5] text-[#60717B]",
              ].join(" ")}
            >
              {student.scheduleShareConsentConfirmed ? "공유 동의" : "공유 미동의"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEditStudent(student)}
              className="flex min-h-10 items-center justify-center gap-1 border border-[#8FA6B0] bg-[#F7FAFA] px-3 text-xs font-bold text-[var(--clinic-text)] transition hover:bg-[#EDF3F5]"
            >
              <Pencil size={13} />
              학생 수정
            </button>
            <button
              type="button"
              onClick={() => onCreateSchedule(student)}
              className="flex min-h-10 items-center justify-center gap-1 border border-[var(--clinic-primary)] bg-[var(--clinic-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--clinic-primary-dark)]"
            >
              <CalendarDays size={13} />
              스케줄 추가
            </button>
          </div>
        </div>

        <section className="border-b border-[#C9D7DC]">
          <StudentFileSectionHeader
            title="우리 학원 일정"
            meta={`활성 ${activeScheduleCount(student)}개`}
          />

          {groupedSchedules.length === 0 ? (
            <div className="border-t border-[#C9D7DC] bg-[#F7FAFA] px-4 py-4 text-sm text-[var(--clinic-muted)]">
              <p className="font-bold text-[var(--clinic-text)]">등록된 스케줄이 없습니다.</p>
              <p className="mt-1 leading-5">
                출석부와 보강 후보에서 빠질 수 있습니다. 정규 수업 시간을 먼저 추가해 주세요.
              </p>
              <button
                type="button"
                onClick={() => onCreateSchedule(student)}
                className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 border border-[var(--clinic-primary)] bg-[var(--clinic-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--clinic-primary-dark)]"
              >
                <CalendarDays size={13} />
                스케줄 바로 추가
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#C9D7DC] border-t border-[#C9D7DC]">
              {groupedSchedules.map(({ dayOfWeek, schedules }) => (
                <div key={dayOfWeek} className="bg-[#F7FAFA]">
                  <p className="border-b border-[#E1EAEE] bg-[#EDF3F5] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#60717B]">
                    {weekDayLabel(dayOfWeek)}
                  </p>
                  {schedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => onEditSchedule(student, schedule)}
                      className="grid w-full grid-cols-[72px_minmax(0,1fr)_42px] items-center gap-3 border-b border-[#E1EAEE] px-4 py-2.5 text-left transition last:border-b-0 hover:bg-[#f8f9fa]"
                    >
                      <span className="text-sm font-black tabular-nums text-[var(--clinic-text)]">{schedule.startTime}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-[var(--clinic-text)]">{schedule.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
                          {[schedule.subject, schedule.memo].filter(Boolean).join(" · ") || "메모 없음"}
                        </span>
                      </span>
                      <span className="border border-[#C9D7DC] bg-[#EDF3F5] px-1.5 py-0.5 text-center text-[11px] font-bold text-[#60717B]">
                        {scheduleTypeLabel(schedule.scheduleType)}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-b border-[#C9D7DC] bg-[#F7FAFA] p-3">
          <StudentFollowupHistory selectedStudentName={student.name} history={history} compact />
        </section>

        <section className="border-b border-[#C9D7DC] bg-[#F7FAFA] p-3">
          <ExternalClassPanel student={student} />
        </section>

        <section className="bg-[#F7FAFA] p-3">
          <SharedSchedulePanel
            student={student}
            state={sharedSchedules}
            onCreateCode={sharedSchedules.createCode}
            onConnect={sharedSchedules.connect}
            onRevoke={sharedSchedules.revoke}
          />
        </section>
      </section>
    </aside>
  );
}

function StudentFileSectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#F4F8F9] px-4 py-3">
      <p className="text-sm font-black text-[var(--clinic-text)]">{title}</p>
      {meta ? (
        <p className="text-xs font-bold text-[var(--clinic-muted)]">{meta}</p>
      ) : null}
    </div>
  );
}

type ExternalClassFormState = {
  academyName: string;
  classTitle: string;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  memo: string;
};

function ExternalClassPanel({ student }: { student: ManagementStudent }) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ExternalClassFormState>({
    academyName: "",
    classTitle: "",
    subject: "",
    dayOfWeek: 2,
    startTime: "19:30",
    endTime: "20:30",
    memo: "",
  });
  const [status, setStatus] = useState<{
    state: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ state: "idle", message: "" });
  const activeEnrollments = student.externalClassEnrollments.filter(
    (enrollment) => enrollment.isActive,
  );
  const isSaving = status.state === "saving";

  async function saveExternalClass() {
    setStatus({ state: "saving", message: "" });

    try {
      const payload = await saveExternalAcademyClass({
        action: "create_class_and_enroll",
        studentId: student.id,
        academyName: form.academyName,
        classTitle: form.classTitle,
        subject: form.subject,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        memo: form.memo,
      });

      setStatus({
        state: "saved",
        message: payload.message ?? "타 학원 수업을 연결했습니다.",
      });
      setIsFormOpen(false);
      setForm({
        academyName: "",
        classTitle: "",
        subject: "",
        dayOfWeek: 2,
        startTime: "19:30",
        endTime: "20:30",
        memo: "",
      });
      router.refresh();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "타 학원 수업을 저장하지 못했습니다.",
      });
    }
  }

  async function deactivateEnrollment(enrollmentId: string) {
    const confirmed = window.confirm(
      "이 학생의 타 학원 수업 연결을 해제하시겠습니까?\n해제하면 해당 시간은 보강 제외 일정에서 빠집니다.",
    );

    if (!confirmed) {
      return;
    }

    setStatus({ state: "saving", message: "" });

    try {
      const payload = await saveExternalAcademyClass({
        action: "deactivate_enrollment",
        enrollmentId,
      });

      setStatus({
        state: "saved",
        message: payload.message ?? "타 학원 수업 연결을 해제했습니다.",
      });
      router.refresh();
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "타 학원 수업 연결을 해제하지 못했습니다.",
      });
    }
  }

  return (
    <section aria-labelledby="external-class-title">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p id="external-class-title" className="text-sm font-semibold text-stone-950">
            타 학원 수업
          </p>
          <p className="mt-0.5 text-xs leading-5 text-stone-500">
            SaaS를 쓰지 않는 학원의 수업은 원장이 직접 등록해 보강 불가 시간으로
            관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen((current) => !current)}
          className="flex min-h-8 shrink-0 items-center gap-1 rounded-sm bg-[var(--clinic-primary)] px-2.5 text-[11px] font-semibold text-white"
        >
          <Plus size={13} />
          등록
        </button>
      </div>

      {activeEnrollments.length === 0 ? (
        <div className="mt-3 border border-dashed border-[#B8C9D0] bg-[#F4F8F9] p-3 text-xs leading-5 text-stone-600">
          등록된 타 학원 수업이 없습니다. 예: 논술학원 화/목 19:30-20:30.
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {activeEnrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="grid grid-cols-[66px_minmax(0,1fr)_auto] items-center gap-2 border border-[#C9D7DC] bg-[#EDF3F5] px-2 py-2"
            >
              <span className="text-xs font-semibold tabular-nums text-stone-950">
                {enrollment.startTime}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-stone-900">
                  {weekDayShortLabel(enrollment.dayOfWeek)} · {enrollment.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                  {enrollment.externalAcademyName}
                  {enrollment.subject ? ` · ${enrollment.subject}` : ""}
                  {` · ${enrollment.endTime}까지`}
                </span>
              </span>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => deactivateEnrollment(enrollment.id)}
                className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-red-200 bg-[#FFF7F7] text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                aria-label={`${enrollment.title} 연결 해제`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isFormOpen ? (
        <div className="mt-3 space-y-2 border border-[#B8C9D0] bg-[#F4F8F9] p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              타 학원명
              <input
                value={form.academyName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, academyName: event.target.value }))
                }
                placeholder="예: 논술학원"
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              수업명
              <input
                value={form.classTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, classTitle: event.target.value }))
                }
                placeholder="예: 논술 정규반"
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              요일
              <select
                value={form.dayOfWeek}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dayOfWeek: Number(event.target.value),
                  }))
                }
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              >
                {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => (
                  <option key={dayOfWeek} value={dayOfWeek}>
                    {weekDayShortLabel(dayOfWeek)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              시작
              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startTime: event.target.value }))
                }
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              종료
              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endTime: event.target.value }))
                }
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              과목
              <input
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
                placeholder="예: 논술"
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-stone-600">
              메모
              <input
                value={form.memo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, memo: event.target.value }))
                }
                placeholder="선택 입력"
                className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm text-stone-950 outline-none focus:border-[var(--clinic-primary)]"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={saveExternalClass}
            className="min-h-10 w-full rounded-md bg-stone-950 px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중" : "학생에게 연결"}
          </button>
        </div>
      ) : null}

      {status.message ? (
        <p
          className={[
            "mt-3 rounded-sm px-3 py-2 text-xs font-semibold",
            status.state === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}

function SharedSchedulePanel({
  student,
  state,
  onCreateCode,
  onConnect,
  onRevoke,
}: {
  student: ManagementStudent;
  state: SharedScheduleState & {
    createCode: () => Promise<void>;
    connect: (code: string) => Promise<void>;
    revoke: (linkId: string) => Promise<void>;
  };
  onCreateCode: () => Promise<void>;
  onConnect: (code: string) => Promise<void>;
  onRevoke: (linkId: string) => Promise<void>;
}) {
  const [codeInput, setCodeInput] = useState("");
  const isSaving = state.actionStatus === "saving";
  const hasShareConsent = student.scheduleShareConsentConfirmed;

  async function handleConnect() {
    if (!hasShareConsent) {
      return;
    }

    await onConnect(codeInput);
    setCodeInput("");
  }

  return (
    <section aria-labelledby="shared-schedule-title">
      <div className="flex items-center gap-2">
        <Link2 className="text-[#315C7C]" size={16} />
        <div className="min-w-0">
          <p id="shared-schedule-title" className="text-sm font-semibold text-stone-950">
            타 학원 스케줄 공유
          </p>
          <p className="mt-0.5 text-xs leading-5 text-stone-500">
            보호자 동의가 확인된 학생끼리 보강 시간 확인용 바쁜 시간만 공유합니다.
          </p>
        </div>
      </div>

      {!hasShareConsent ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          보호자 동의 확인 후 공유 코드를 만들거나 연결할 수 있습니다. 학생 정보 수정에서
          `타 학원 스케줄 공유 동의 확인`을 체크해 주세요.
        </div>
      ) : (
        <div className="mt-3 border border-[#d7dbe0] bg-[#f6f7f8] px-3 py-2 text-xs leading-5 text-[#494d5a]">
          같은 학생으로 확인되는 다른 학원 일정은 자동으로 연결됩니다. 연결 기준은
          이름·학교·학년·전화번호이며, 상대 학원명과 전화번호는 공개되지 않습니다.
        </div>
      )}

      {state.status === "loading" ? (
        <p className="mt-3 border border-[#C9D7DC] bg-[#EDF3F5] px-3 py-2 text-xs font-medium text-stone-500">
          공유 스케줄을 불러오는 중입니다.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {state.error}
        </p>
      ) : null}

      {state.links.length === 0 && state.status !== "loading" ? (
        <div className="mt-3 border border-dashed border-[#B8C9D0] bg-[#F4F8F9] p-3 text-xs leading-5 text-stone-600">
          {hasShareConsent
            ? "동의 확인된 같은 학생이 다른 학원에 등록되면 자동으로 바쁜 시간이 연결됩니다."
            : "동의 확인 전에는 공유 연결을 만들지 않습니다."}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {state.links.map((link) => (
            <div key={link.id} className="border border-[#C9D7DC] bg-[#EDF3F5] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">
                    {link.academyName}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-stone-500">
                    연결일 {formatDate(link.connectedAt)}
                  </p>
                </div>
                {state.canManage ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => onRevoke(link.id)}
                    className="shrink-0 rounded-sm border border-red-200 bg-[#FFF7F7] px-2 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    공유 해제
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-stone-500">
                동의 확인된 동일 학생과 자동 연결됐습니다. 양쪽 학원 모두 바쁜 시간대만 볼 수
                있으며, 공유 해제 시 양쪽 모두 상대 스케줄을 볼 수 없습니다.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["동의 확인", "이름·학교·학년·전화번호 기준", "상대 학원명 비공개"].map((label) => (
                  <span
                    key={label}
                    className="border border-[#D6E0E5] bg-[#F7FAFA] px-1.5 py-0.5 text-[11px] font-semibold text-stone-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {link.schedules.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {link.schedules.slice(0, 4).map((schedule) => (
                    <div
                      key={`${link.id}:${schedule.id}`}
                      className="grid grid-cols-[66px_minmax(0,1fr)_auto] items-center gap-2 border border-[#D6E0E5] bg-[#F7FAFA] px-2 py-1.5"
                    >
                      <span className="text-xs font-semibold tabular-nums text-stone-900">
                        {schedule.startTime}
                      </span>
                      <span className="min-w-0 truncate text-xs font-medium text-stone-600">
                        {schedule.scheduleDate
                          ? `${schedule.scheduleDate} · ${schedule.title}`
                          : `${weekDayShortLabel(schedule.dayOfWeek)} · ${schedule.title}`}
                      </span>
                      <span className="border border-[#d7dbe0] bg-[#f6f7f8] px-1.5 py-0.5 text-[11px] font-semibold text-[#494d5a]">
                        {scheduleTypeLabel(schedule.scheduleType)}
                      </span>
                    </div>
                  ))}
                  {link.schedules.length > 4 ? (
                    <p className="text-[11px] font-medium text-stone-500">
                      외 {link.schedules.length - 4}개 일정
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 border border-[#D6E0E5] bg-[#F7FAFA] px-2 py-1.5 text-xs text-stone-500">
                  연결된 학생의 활성 스케줄이 없습니다.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {state.canManage ? (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
          <p className="rounded-md bg-[#F7F5F0] px-3 py-2 text-[11px] leading-4 text-stone-600">
            자동 연결이 되지 않는 경우에만 공유 코드를 만들어 상대 학원에 전달하거나, 상대
            학원에서 받은 코드를 아래에 입력합니다.
          </p>
          <button
            type="button"
            disabled={isSaving || !hasShareConsent}
            onClick={onCreateCode}
            className="flex min-h-9 w-full items-center justify-center rounded-sm bg-[var(--clinic-primary)] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            공유 코드 만들기
          </button>
          {state.generatedCode ? (
            <div className="border border-[#d7dbe0] bg-[#f6f7f8] p-3">
              <p className="text-xs font-semibold text-[#494d5a]">
                {student.name} 학생 공유 코드
              </p>
              <p className="mt-1 break-all font-mono text-lg font-bold tracking-wide text-stone-950">
                {state.generatedCode}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-stone-600">
                {formatDate(state.expiresAt)}까지 유효합니다. 보호자 동의가 확인된 상대 학원에만 전달하세요.
              </p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              disabled={!hasShareConsent}
              placeholder="상대 학원 공유 코드"
              className="min-h-10 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 text-sm font-medium text-stone-950 outline-none focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[#EAF1F8]"
            />
            <button
              type="button"
              disabled={isSaving || !hasShareConsent || !codeInput.trim()}
              onClick={handleConnect}
              className="min-h-10 rounded-sm border border-[var(--clinic-primary)] px-3 text-xs font-semibold text-[#315C7C] disabled:border-stone-200 disabled:text-stone-400"
            >
              코드로 연결
            </button>
          </div>
          <p className="text-[11px] leading-4 text-stone-500">
            이름·학교·학년이 같은 학생에게만 연결됩니다.
          </p>
          <p className="text-[11px] leading-4 text-stone-500">
            연결 후 어느 한쪽에서 공유를 해제하면 양쪽 학원의 공유가 함께 종료됩니다.
          </p>
          {state.actionMessage ? (
            <p
              className={[
                "rounded-sm px-3 py-2 text-xs font-semibold",
                state.actionStatus === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-800",
              ].join(" ")}
            >
              {state.actionMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 border border-[#C9D7DC] bg-[#EDF3F5] px-3 py-2 text-xs leading-5 text-stone-500">
          공유 코드 발급과 연결 해제는 원장/관리자만 가능합니다.
        </p>
      )}
    </section>
  );
}

function useStudentHistory(studentId: string | null): FollowupHistoryState {
  const [history, setHistory] = useState<FollowupHistoryState>({
    studentId: studentId ?? "",
    status: "idle",
    items: [],
    error: "",
  });

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const controller = new AbortController();
    const activeStudentId = studentId;

    async function loadHistory() {
      setHistory((current) => ({
        studentId: activeStudentId,
        status: "loading",
        items: current.studentId === activeStudentId ? current.items : [],
        error: "",
      }));

      try {
        const payload = await fetchFollowupHistory(activeStudentId, controller.signal);

        setHistory({
          studentId: activeStudentId,
          status: "ready",
          items: payload.followups ?? [],
          error: "",
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setHistory({
          studentId: activeStudentId,
          status: "error",
          items: [],
          error: mapStudentContextError(
            error instanceof Error ? error.message : "연락 기록을 불러오지 못했습니다.",
          ),
        });
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [studentId]);

  return history;
}

function useSharedSchedules(studentId: string | null) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<SharedScheduleState>({
    studentId: studentId ?? "",
    status: "idle",
    canManage: false,
    links: [],
    error: "",
    generatedCode: "",
    expiresAt: "",
    actionStatus: "idle",
    actionMessage: "",
  });

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const controller = new AbortController();
    const activeStudentId = studentId;

    async function loadSharedSchedules() {
      setState((current) => ({
        ...current,
        studentId: activeStudentId,
        status: "loading",
        links: current.studentId === activeStudentId ? current.links : [],
        error: "",
      }));

      try {
        const payload = await fetchStudentScheduleSharing(activeStudentId, controller.signal);

        setState((current) => ({
          ...current,
          studentId: activeStudentId,
          status: "ready",
          canManage: payload.canManage ?? false,
          links: payload.links ?? [],
          error: "",
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          ...current,
          studentId: activeStudentId,
          status: "error",
          links: [],
          error: mapStudentContextError(
            error instanceof Error ? error.message : "공유 스케줄을 불러오지 못했습니다.",
          ),
        }));
      }
    }

    void loadSharedSchedules();

    return () => {
      controller.abort();
    };
  }, [refreshToken, studentId]);

  async function runAction(body: Record<string, string>) {
    if (!studentId || state.actionStatus === "saving") {
      return;
    }

    setState((current) => ({
      ...current,
      actionStatus: "saving",
      actionMessage: "",
    }));

    try {
      const payload = await postStudentScheduleSharing({ studentId, ...body });

      setState((current) => ({
        ...current,
        actionStatus: "idle",
        actionMessage: payload.message ?? "스케줄 공유 요청을 처리했습니다.",
        generatedCode: payload.code ?? current.generatedCode,
        expiresAt: payload.expiresAt ?? current.expiresAt,
      }));
      setRefreshToken((value) => value + 1);
    } catch (error) {
      setState((current) => ({
        ...current,
        actionStatus: "error",
        actionMessage: mapStudentContextError(
          error instanceof Error ? error.message : "스케줄 공유 요청을 처리하지 못했습니다.",
        ),
      }));
    }
  }

  return {
    ...state,
    createCode: async () => {
      await runAction({ action: "create_token" });
    },
    connect: async (code: string) => {
      await runAction({ action: "connect", code });
    },
    revoke: async (linkId: string) => {
      const confirmed = window.confirm(
        "스케줄 공유를 해제하시겠습니까?\n해제하면 양쪽 학원 모두 상대 스케줄을 볼 수 없습니다.",
      );

      if (!confirmed) {
        return;
      }

      await runAction({ action: "revoke", linkId });
    },
  };
}

function mapStudentContextError(message: string) {
  return message === "선택한 학생을 찾을 수 없습니다."
    ? staleStudentContextMessage
    : message;
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10).replaceAll("-", ".");
}

function formatShortDate(dateValue: string) {
  const [, month, day] = dateValue.split("-");

  return `${Number(month)}/${Number(day)}`;
}
