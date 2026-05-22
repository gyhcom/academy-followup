import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Link2,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  type FollowupHistoryItem,
  type FollowupHistoryState,
  StudentFollowupHistory,
} from "@/app/app/operations-history";
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

type FollowupHistoryResponse = {
  followups?: FollowupHistoryItem[];
  error?: string;
};

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

type SharedScheduleResponse = {
  canManage?: boolean;
  links?: SharedScheduleLink[];
  code?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
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
    <div className="min-w-0 overflow-hidden bg-transparent sm:rounded-lg sm:border sm:border-[#E6E0D5] sm:bg-white">
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
          <p className="mt-1 text-sm text-stone-500">CSV 일괄 등록 또는 학생 등록으로 시작합니다.</p>
        </div>
      ) : (
        <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 border-t border-[#E6E0D5] lg:border-r lg:border-[#E6E0D5]">
            <StudentResourceTable
              students={filteredStudents}
              selectedStudentId={selectedStudent?.id ?? null}
              onSelectStudent={(studentId) => selectStudent(studentId, false)}
              onOpenMobileDetail={(studentId) => selectStudent(studentId, true)}
            />
          </div>

          <div className="hidden min-w-0 border-t border-[#E6E0D5] bg-[#F7F5F0]/70 lg:block">
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
    <div className="space-y-2 bg-transparent pb-3 sm:bg-[#FFFCF7] sm:p-3">
      <div className="grid gap-2 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-center">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="학생명, 반, 학교, 학부모 검색"
            className="min-h-10 w-full rounded-md border border-[#D8D0C4] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
        </label>

        <div className="flex items-center justify-between gap-2 rounded-md border border-[#E6E0D5] bg-white px-3 py-2 text-xs font-semibold text-stone-600 sm:bg-[#F7F5F0]">
          <button
            type="button"
            onClick={() =>
              onScheduleFilterChange(
                scheduleFilter === "missing_schedule" ? "all" : "missing_schedule",
              )
            }
            className={[
              "flex min-h-8 min-w-0 items-center gap-2 rounded-md px-2 text-left transition",
              scheduleFilter === "missing_schedule"
                ? "bg-[#315C7C] text-white"
                : "bg-white text-stone-700 hover:bg-[#EAF1F8]",
            ].join(" ")}
          >
            <CalendarDays size={13} className="shrink-0" />
            <span className="truncate">
              {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-[#E6E0D5] bg-white px-2 text-xs font-semibold text-stone-700 lg:hidden"
          >
            <SlidersHorizontal size={13} />
            필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ""}
          </button>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <div className="flex flex-wrap gap-1.5 lg:hidden">
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
          "gap-2 sm:grid-cols-2 lg:grid lg:grid-cols-4",
          isFilterOpen ? "grid" : "hidden",
        ].join(" ")}
      >
        <select
          value={classFilter}
          onChange={(event) => onClassFilterChange(event.target.value)}
          className="min-h-10 rounded-md border border-[#D8D0C4] bg-white px-3 text-sm outline-none focus:border-[#315C7C]"
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
          className="min-h-10 rounded-md border border-[#D8D0C4] bg-white px-3 text-sm outline-none focus:border-[#315C7C]"
        >
          <option value="all">전체 상태</option>
          <option value="active">재원</option>
          <option value="paused">휴원</option>
          <option value="left">퇴원</option>
        </select>

        <select
          value={scheduleFilter}
          onChange={(event) => onScheduleFilterChange(event.target.value as StudentScheduleFilter)}
          className="min-h-10 rounded-md border border-[#D8D0C4] bg-white px-3 text-sm outline-none focus:border-[#315C7C]"
        >
          <option value="all">전체 스케줄</option>
          <option value="has_schedule">스케줄 있음</option>
          <option value="missing_schedule">스케줄 미등록</option>
          <option value="external">외부 일정 있음</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as StudentSortMode)}
          className="min-h-10 rounded-md border border-[#D8D0C4] bg-white px-3 text-sm outline-none focus:border-[#315C7C]"
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
        <p className="mt-1 text-sm text-stone-500">검색어와 필터를 조정해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="hidden grid-cols-[minmax(150px,1.2fr)_minmax(150px,1fr)_80px_128px_104px_78px] border-b border-[#E6E0D5] bg-[#FBFAF7] px-3 py-2.5 text-xs font-semibold text-stone-500 lg:grid">
        <span>학생</span>
        <span>반</span>
        <span>학년</span>
        <span>보호자</span>
        <span>스케줄</span>
        <span className="text-right">상태</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#DED8CE] bg-white sm:max-h-[680px] sm:overflow-y-auto sm:rounded-none sm:border-0 sm:bg-transparent">
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

  return (
    <div
      className={[
        "border-b border-[#EFE9DE] transition last:border-b-0",
        isSelected ? "bg-[#EAF1F8]" : "bg-white hover:bg-[#FBFAF7]",
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
        onClick={onSelect}
        className="hidden w-full grid-cols-[minmax(150px,1.2fr)_minmax(150px,1fr)_80px_128px_104px_78px] items-center gap-3 px-3 py-3 text-left lg:grid"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-950">{student.name}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {student.schoolName ?? "학교 미지정"}
          </span>
        </span>
        <span className="truncate text-sm text-stone-700">{student.className ?? "미배정"}</span>
        <span className="text-sm text-stone-600">{student.gradeLabel ?? "-"}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-stone-700">{student.parentName ?? "학부모"}</span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{student.maskedParentPhone}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-stone-700">
            {primarySchedule
              ? `${primarySchedule.scheduleDate ? formatShortDate(primarySchedule.scheduleDate) : weekDayShortLabel(primarySchedule.dayOfWeek)} ${primarySchedule.startTime}`
              : "미등록"}
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{activeSchedules.length}개 일정</span>
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
    <span className="rounded-md bg-[#EAF1F8] px-2 py-1 text-[11px] font-semibold text-[#315C7C]">
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
    external: "외부 일정 있음",
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
        <p className="mt-1 text-sm text-stone-500">왼쪽 테이블에서 학생을 선택해 주세요.</p>
      </aside>
    );
  }

  const groupedSchedules = groupSchedulesByDay(
    student.schedules.filter((schedule) => schedule.isActive),
  );

  return (
    <aside className="bg-[#FFFCF7] p-4 lg:sticky lg:top-4 lg:bg-transparent">
      <div className="rounded-lg border border-[#E6E0D5] bg-white p-4 shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-stone-950">{student.name}</p>
            <p className="mt-1 truncate text-sm text-stone-500">
              {student.className ?? "미배정"} · {student.gradeLabel ?? "학년 미지정"}
            </p>
            <p className="mt-1 truncate text-xs text-stone-500">
              {student.parentName ?? "학부모"} · {student.maskedParentPhone}
            </p>
          </div>
          <StatusBadge status={student.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onEditStudent(student)}
            className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-[#E6E0D5] bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-[#F7F5F0]"
          >
            <Pencil size={13} />
            학생 수정
          </button>
          <button
            type="button"
            onClick={() => onCreateSchedule(student)}
            className="flex min-h-10 items-center justify-center gap-1 rounded-md bg-[#315C7C] px-3 text-xs font-semibold text-white transition hover:bg-[#244B67]"
          >
            <CalendarDays size={13} />
            스케줄 추가
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#E6E0D5] bg-white p-4 shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-950">스케줄</p>
          <p className="text-xs font-medium text-stone-500">활성 {activeScheduleCount(student)}개</p>
        </div>

        {groupedSchedules.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-[#D8D0C4] bg-[#FBFAF7] p-4 text-sm text-stone-500">
            <p className="font-semibold text-stone-900">등록된 스케줄이 없습니다.</p>
            <p className="mt-1 leading-5">
              이 학생은 출석부와 보강 후보에서 빠질 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => onCreateSchedule(student)}
              className="mt-3 flex min-h-9 w-full items-center justify-center gap-1 rounded-md bg-[#315C7C] px-3 text-xs font-semibold text-white transition hover:bg-[#244B67]"
            >
              <CalendarDays size={13} />
              스케줄 바로 추가
            </button>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-stone-100">
            {groupedSchedules.map(({ dayOfWeek, schedules }) => (
              <div key={dayOfWeek} className="py-3 first:pt-0 last:pb-0">
                <p className="mb-2 text-xs font-semibold text-stone-500">{weekDayLabel(dayOfWeek)}</p>
                <div className="space-y-1.5">
                  {schedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => onEditSchedule(student, schedule)}
                      className="grid w-full grid-cols-[72px_minmax(0,1fr)_42px] items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-[#F7F5F0]"
                    >
                      <span className="text-sm font-semibold tabular-nums text-stone-950">{schedule.startTime}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-stone-900">{schedule.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-stone-500">
                          {[schedule.subject, schedule.memo].filter(Boolean).join(" · ") || "메모 없음"}
                        </span>
                      </span>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-stone-600">
                        {scheduleTypeLabel(schedule.scheduleType)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-[#E6E0D5] bg-white p-4 shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
        <StudentFollowupHistory selectedStudentName={student.name} history={history} />
      </div>

      <div className="mt-3 rounded-lg border border-[#E6E0D5] bg-white p-4 shadow-[0_8px_20px_rgba(28,25,23,0.04)]">
        <SharedSchedulePanel
          student={student}
          state={sharedSchedules}
          onCreateCode={sharedSchedules.createCode}
          onConnect={sharedSchedules.connect}
          onRevoke={sharedSchedules.revoke}
        />
      </div>
    </aside>
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
        <div className="mt-3 rounded-md border border-[#C9D6E2] bg-[#EAF1F8] px-3 py-2 text-xs leading-5 text-[#315C7C]">
          연결 전에는 다른 학원 존재 여부를 확인하지 않습니다. 연결 후에도 실제 학원명은 숨기고
          바쁜 시간대만 표시합니다.
        </div>
      )}

      {state.status === "loading" ? (
        <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500">
          공유 스케줄을 불러오는 중입니다.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {state.error}
        </p>
      ) : null}

      {state.links.length === 0 && state.status !== "loading" ? (
        <div className="mt-3 rounded-md border border-dashed border-[#D8D0C4] bg-[#FBFAF7] p-3 text-xs leading-5 text-stone-600">
          {hasShareConsent
            ? "연결된 학원이 없습니다. 상대 학원도 이 서비스를 쓰는 경우, 보호자 동의 확인 후 공유 코드로 연결하세요."
            : "동의 확인 전에는 공유 연결을 만들지 않습니다."}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {state.links.map((link) => (
            <div key={link.id} className="rounded-md border border-stone-200 bg-stone-50 p-3">
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
                    className="shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-50"
                  >
                    공유 해제
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-stone-500">
                양쪽 학원 모두 이 학생의 바쁜 시간대를 볼 수 있습니다. 공유 해제 시 양쪽 모두 상대 스케줄을 볼 수 없습니다.
              </p>
              {link.schedules.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {link.schedules.slice(0, 4).map((schedule) => (
                    <div
                      key={`${link.id}:${schedule.id}`}
                      className="grid grid-cols-[66px_minmax(0,1fr)_auto] items-center gap-2 rounded bg-white px-2 py-1.5"
                    >
                      <span className="text-xs font-semibold tabular-nums text-stone-900">
                        {schedule.startTime}
                      </span>
                      <span className="min-w-0 truncate text-xs font-medium text-stone-600">
                        {schedule.scheduleDate
                          ? `${schedule.scheduleDate} · ${schedule.title}`
                          : `${weekDayShortLabel(schedule.dayOfWeek)} · ${schedule.title}`}
                      </span>
                      <span className="rounded bg-[#EAF1F8] px-1.5 py-0.5 text-[11px] font-semibold text-[#315C7C]">
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
                <p className="mt-2 rounded bg-white px-2 py-1.5 text-xs text-stone-500">
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
            이 학원에서 코드를 만들어 상대 학원에 전달하거나, 상대 학원에서 받은 코드를 아래에 입력할 수 있습니다.
          </p>
          <button
            type="button"
            disabled={isSaving || !hasShareConsent}
            onClick={onCreateCode}
            className="flex min-h-9 w-full items-center justify-center rounded-md bg-[#315C7C] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            공유 코드 만들기
          </button>
          {state.generatedCode ? (
            <div className="rounded-md border border-[#C9D6E2] bg-[#EAF1F8] p-3">
              <p className="text-xs font-semibold text-[#315C7C]">
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
              className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-950 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
            <button
              type="button"
              disabled={isSaving || !hasShareConsent || !codeInput.trim()}
              onClick={handleConnect}
              className="min-h-10 rounded-md border border-[#315C7C] px-3 text-xs font-semibold text-[#315C7C] disabled:border-stone-200 disabled:text-stone-400"
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
                "rounded-md px-3 py-2 text-xs font-semibold",
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
        <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-500">
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
        const response = await fetch(`/api/followups?studentId=${activeStudentId}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as FollowupHistoryResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "연락 기록을 불러오지 못했습니다.");
        }

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
        const response = await fetch(
          `/api/student-schedule-sharing?studentId=${activeStudentId}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as SharedScheduleResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "공유 스케줄을 불러오지 못했습니다.");
        }

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
      const response = await fetch("/api/student-schedule-sharing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, ...body }),
      });
      const payload = (await response.json()) as SharedScheduleResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "스케줄 공유 요청을 처리하지 못했습니다.");
      }

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
