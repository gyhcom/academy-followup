import { useMemo } from "react";
import { CalendarDays, ListFilter, Pencil, Search } from "lucide-react";
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
  scheduleTypeChipClass,
  scheduleTypeLabel,
  weekDayLabel,
  weekDayShortLabel,
} from "@/app/app/management-utils";

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

  return (
    <div className="space-y-3">
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
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
          <p className="text-sm font-semibold text-stone-900">아직 등록된 학생이 없습니다.</p>
          <p className="mt-1 text-sm text-stone-500">학생을 먼저 등록하면 운영 보드에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="grid grid-cols-[104px_minmax(0,1fr)_86px] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500 sm:grid-cols-[132px_minmax(0,1fr)_128px]">
              <span>시간</span>
              <span>학생</span>
              <span className="text-right">상태</span>
            </div>
            <div className="max-h-[680px] overflow-y-auto">
              {filteredStudents.map((student) => (
                <StudentListRow
                  key={student.id}
                  student={student}
                  isSelected={student.id === selectedStudent?.id}
                  onSelect={() => onSelectStudent(student.id)}
                />
              ))}
              {filteredStudents.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-stone-900">조건에 맞는 학생이 없습니다.</p>
                  <p className="mt-1 text-sm text-stone-500">검색어와 필터를 조정해 주세요.</p>
                </div>
              ) : null}
            </div>
          </div>

          <StudentDetailPanel
            student={selectedStudent}
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
  const missingScheduleCount = students.filter((student) => activeScheduleCount(student) === 0).length;

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="학생명, 반, 학교, 학부모 검색"
            className="min-h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-stone-600">
          <ListFilter size={14} />
          {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

function StudentListRow({
  student,
  isSelected,
  onSelect,
}: {
  student: ManagementStudent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const primarySchedule = getPrimarySchedule(student);
  const activeSchedules = getActiveSchedules(student);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid w-full grid-cols-[104px_minmax(0,1fr)_86px] gap-3 border-b border-stone-100 px-3 py-3 text-left transition last:border-b-0 sm:grid-cols-[132px_minmax(0,1fr)_128px]",
        isSelected ? "bg-emerald-50" : "bg-white hover:bg-stone-50",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-md border px-2.5 py-2",
          primarySchedule
            ? "border-stone-300 bg-stone-950 text-white"
            : "border-dashed border-stone-300 bg-stone-50 text-stone-500",
        ].join(" ")}
      >
        <p className="text-[11px] font-semibold leading-none">
          {primarySchedule
            ? primarySchedule.scheduleDate
              ? "1회"
              : weekDayShortLabel(primarySchedule.dayOfWeek)
            : "미등록"}
        </p>
        <p className="mt-1 text-base font-semibold leading-none">
          {primarySchedule ? primarySchedule.startTime : "--:--"}
        </p>
        <p className="mt-1 text-[11px] leading-none opacity-75">
          {primarySchedule ? `~ ${primarySchedule.endTime}` : "스케줄 없음"}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-stone-950">{student.name}</p>
          <span className="hidden shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 sm:inline">
            {student.gradeLabel ?? "학년 미지정"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-stone-500">
          {student.className ?? "미배정"} · {student.schoolName ?? "학교 미지정"}
        </p>
        <div className="mt-2 flex gap-1 overflow-hidden">
          {activeSchedules.slice(0, 3).map((schedule) => (
            <span
              key={schedule.id}
              className={[
                "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold",
                scheduleTypeChipClass(schedule.scheduleType),
              ].join(" ")}
            >
              {schedule.scheduleDate
                ? `${formatShortDate(schedule.scheduleDate)} ${schedule.startTime}`
                : `${weekDayShortLabel(schedule.dayOfWeek)} ${schedule.startTime}`}
            </span>
          ))}
          {activeSchedules.length === 0 ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
              스케줄 미등록
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={student.status} />
        <span className="text-right text-xs font-medium text-stone-500">
          {activeSchedules.length}개 일정
        </span>
      </div>
    </button>
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
  if (!student) {
    return (
      <aside className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
        <p className="text-sm font-semibold text-stone-900">선택된 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">왼쪽 리스트에서 학생을 선택해 주세요.</p>
      </aside>
    );
  }

  const groupedSchedules = groupSchedulesByDay(student.schedules);

  return (
    <aside className="rounded-lg border border-stone-200 bg-white p-4 lg:sticky lg:top-4 lg:self-start">
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
          className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          <Pencil size={13} />
          학생 수정
        </button>
        <button
          type="button"
          onClick={() => onCreateSchedule(student)}
          className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <CalendarDays size={13} />
          스케줄 추가
        </button>
      </div>

      <div className="mt-4 border-t border-stone-200 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-950">주간 스케줄</p>
          <p className="text-xs font-medium text-stone-500">
            활성 {activeScheduleCount(student)}개
          </p>
        </div>

        {groupedSchedules.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
            등록된 스케줄이 없습니다. 정규 수업이나 외부 일정을 추가해 주세요.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {groupedSchedules.map(({ dayOfWeek, schedules }) => (
              <div key={dayOfWeek}>
                <p className="mb-1.5 text-xs font-semibold text-stone-500">
                  {weekDayLabel(dayOfWeek)}
                </p>
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => onEditSchedule(student, schedule)}
                      className={[
                        "grid w-full grid-cols-[94px_minmax(0,1fr)] gap-3 rounded-md border px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50",
                        schedule.isActive ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50 opacity-60",
                      ].join(" ")}
                    >
                      <span className="rounded-md bg-stone-950 px-2 py-1.5 text-center text-white">
                        <span className="block text-sm font-semibold leading-none">
                          {schedule.startTime}
                        </span>
                        <span className="mt-1 block text-[11px] leading-none text-white/70">
                          {schedule.endTime}
                        </span>
                        {schedule.scheduleDate ? (
                          <span className="mt-1 block text-[10px] leading-none text-white/70">
                            {formatShortDate(schedule.scheduleDate)}
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1">
                          <span
                            className={[
                              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                              scheduleTypeChipClass(schedule.scheduleType),
                            ].join(" ")}
                          >
                            {scheduleTypeLabel(schedule.scheduleType)}
                          </span>
                          {!schedule.isActive ? (
                            <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                              비활성
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-stone-950">
                          {schedule.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-stone-500">
                          {[schedule.subject, schedule.memo].filter(Boolean).join(" · ") ||
                            "메모 없음"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function formatShortDate(dateValue: string) {
  const [, month, day] = dateValue.split("-");

  return `${Number(month)}/${Number(day)}`;
}
