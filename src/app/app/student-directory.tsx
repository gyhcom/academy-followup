import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Pencil, Search, SlidersHorizontal, X } from "lucide-react";
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
    <div className="min-w-0 rounded-md border border-stone-200 bg-white">
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
        <div className="border-t border-stone-200 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-stone-900">아직 등록된 학생이 없습니다.</p>
          <p className="mt-1 text-sm text-stone-500">CSV 일괄 등록 또는 학생 등록으로 시작합니다.</p>
        </div>
      ) : (
        <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 border-t border-stone-200 lg:border-r lg:border-stone-200">
            <StudentResourceTable
              students={filteredStudents}
              selectedStudentId={selectedStudent?.id ?? null}
              onSelectStudent={(studentId) => selectStudent(studentId, false)}
              onOpenMobileDetail={(studentId) => selectStudent(studentId, true)}
            />
          </div>

          <div className="hidden min-w-0 border-t border-stone-200 bg-stone-50/40 lg:block">
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
    <div className="space-y-2 p-3">
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
            className="min-h-10 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600">
          <span className="truncate">
            {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
          </span>
          <button
            type="button"
            onClick={() => setIsFilterOpen((current) => !current)}
            className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-700 lg:hidden"
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
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
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
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">전체 상태</option>
          <option value="active">재원</option>
          <option value="paused">휴원</option>
          <option value="left">퇴원</option>
        </select>

        <select
          value={scheduleFilter}
          onChange={(event) => onScheduleFilterChange(event.target.value as StudentScheduleFilter)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">전체 스케줄</option>
          <option value="has_schedule">스케줄 있음</option>
          <option value="missing_schedule">스케줄 미등록</option>
          <option value="external">외부 일정 있음</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as StudentSortMode)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
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
      <div className="hidden grid-cols-[minmax(150px,1.2fr)_minmax(150px,1fr)_80px_128px_104px_78px] border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500 lg:grid">
        <span>학생</span>
        <span>반</span>
        <span>학년</span>
        <span>보호자</span>
        <span>스케줄</span>
        <span className="text-right">상태</span>
      </div>
      <div className="max-h-[680px] overflow-y-auto">
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
        "border-b border-stone-100 transition last:border-b-0",
        isSelected ? "bg-emerald-50/60" : "bg-white hover:bg-stone-50",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpenMobileDetail}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 text-left lg:hidden"
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
    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
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
        className="absolute inset-0 bg-stone-950/35"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
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

  if (!student) {
    return (
      <aside className="p-5 text-center">
        <p className="text-sm font-semibold text-stone-900">선택된 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">왼쪽 테이블에서 학생을 선택해 주세요.</p>
      </aside>
    );
  }

  const groupedSchedules = groupSchedulesByDay(student.schedules);

  return (
    <aside className="bg-white p-4 lg:sticky lg:top-4 lg:bg-transparent">
      <div className="rounded-md border border-stone-200 bg-white p-4">
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
            className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            <Pencil size={13} />
            학생 수정
          </button>
          <button
            type="button"
            onClick={() => onCreateSchedule(student)}
            className="flex min-h-10 items-center justify-center gap-1 rounded-md bg-stone-950 px-3 text-xs font-semibold text-white transition hover:bg-stone-800"
          >
            <CalendarDays size={13} />
            스케줄 추가
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-950">스케줄</p>
          <p className="text-xs font-medium text-stone-500">활성 {activeScheduleCount(student)}개</p>
        </div>

        {groupedSchedules.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
            등록된 스케줄이 없습니다.
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
                      className="grid w-full grid-cols-[72px_minmax(0,1fr)_42px] items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-stone-50"
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

      <div className="mt-3 rounded-md border border-stone-200 bg-white p-4">
        <StudentFollowupHistory selectedStudentName={student.name} history={history} />
      </div>
    </aside>
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
          error:
            error instanceof Error
              ? error.message
              : "연락 기록을 불러오지 못했습니다.",
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

function formatShortDate(dateValue: string) {
  const [, month, day] = dateValue.split("-");

  return `${Number(month)}/${Number(day)}`;
}
