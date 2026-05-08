"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import {
  scheduleTypeChipClass,
  scheduleTypeLabel,
  weekDayShortLabel,
} from "@/app/app/management-utils";
import type { OperationsStudentSchedule } from "@/app/app/operations-schedule";
import {
  formatDateForCandidate,
  type MakeupCandidate,
  MakeupSchedulePlanner,
  type ScheduleConflict,
} from "@/app/app/makeup-scheduling";

type MakeupCalendarPanelProps = {
  selectedStudent:
    | {
        name: string;
        schedules: OperationsStudentSchedule[];
      }
    | undefined;
  selectedCandidate: MakeupCandidate | null;
  onCandidateSelect: (candidate: MakeupCandidate) => void;
};

const weekDayHeaders = [1, 2, 3, 4, 5, 6, 0];

export function MakeupCalendarPanel({
  selectedStudent,
  selectedCandidate,
  onCandidateSelect,
}: MakeupCalendarPanelProps) {
  const today = MakeupSchedulePlanner.getTodayDateValue();
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(
    MakeupSchedulePlanner.getMonthValue(today),
  );
  const [startTime, setStartTime] = useState("20:30");
  const [endTime, setEndTime] = useState("21:30");
  const planner = useMemo(
    () => new MakeupSchedulePlanner({ schedules: selectedStudent?.schedules ?? [], today }),
    [selectedStudent?.schedules, today],
  );
  const days = planner.getCalendarDays(displayMonth);
  const selectedSummary = selectedStudent
    ? planner.getSchedulesForDate(selectedDate)
    : { schedules: [], oneOffSchedules: [], weeklySchedules: [] };
  const isTimeRangeValid = planner.isValidTimeRange(startTime, endTime);
  const conflicts =
    selectedStudent && isTimeRangeValid
      ? planner.getScheduleConflicts({
          date: selectedDate,
          startTime,
          endTime,
        })
      : [];
  const candidate = planner.createCandidate({
    date: selectedDate,
    startTime,
    endTime,
  });
  const isSelected =
    selectedCandidate?.date === selectedDate &&
    selectedCandidate.startTime === startTime &&
    selectedCandidate.endTime === endTime;

  function moveMonth(offset: number) {
    const nextMonth = MakeupSchedulePlanner.moveMonth(displayMonth, offset);
    setDisplayMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setDisplayMonth(MakeupSchedulePlanner.getMonthValue(date));
  }

  return (
    <section
      aria-labelledby="makeup-calendar-title"
      className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-emerald-700" size={18} />
          <h2 id="makeup-calendar-title" className="text-sm font-semibold text-stone-950">
            보강 달력
          </h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          날짜를 누르고 그날의 수업·외부 일정을 보면서 보강 시간을 정합니다.
        </p>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="이전 달"
              title="이전 달"
              onClick={() => moveMonth(-1)}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700"
            >
              <ChevronLeft size={17} />
            </button>
            <p className="text-sm font-semibold text-stone-950">
              {MakeupSchedulePlanner.getMonthLabel(displayMonth)}
            </p>
            <button
              type="button"
              aria-label="다음 달"
              title="다음 달"
              onClick={() => moveMonth(1)}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekDayHeaders.map((dayOfWeek) => (
              <div
                key={dayOfWeek}
                className="py-1 text-[11px] font-semibold text-stone-500"
              >
                {weekDayShortLabel(dayOfWeek)}
              </div>
            ))}
            {days.map((day) => {
              const isActive = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectDate(day.date)}
                  className={[
                    "relative min-h-12 rounded-md border px-1 py-1 text-left transition",
                    isActive
                      ? "border-stone-950 bg-stone-950 text-white"
                      : day.isCurrentMonth
                        ? "border-stone-200 bg-white text-stone-900 hover:border-emerald-300"
                        : "border-stone-100 bg-stone-100 text-stone-400",
                  ].join(" ")}
                >
                  <span className="block text-xs font-semibold leading-none">
                    {day.dayOfMonth}
                  </span>
                  <span className="mt-1 flex items-center gap-0.5">
                    {day.scheduleCount > 0 ? (
                      <span
                        className={[
                          "h-1.5 w-4 rounded-full",
                          day.hasExternalSchedule ? "bg-amber-400" : "bg-emerald-400",
                        ].join(" ")}
                      />
                    ) : null}
                    {day.isToday ? (
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          isActive ? "bg-white" : "bg-stone-950",
                        ].join(" ")}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedStudent ? (
          <SelectedDateSchedule
            date={selectedDate}
            schedules={selectedSummary.schedules}
          />
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-3 text-sm leading-6 text-stone-600">
            학생을 선택하면 날짜별 스케줄이 표시됩니다.
          </div>
        )}

        <div className="rounded-md border border-stone-200 p-3">
          <p className="text-xs font-semibold text-stone-500">선택 날짜</p>
          <p className="mt-1 text-sm font-semibold text-stone-950">
            {formatDateForCandidate(selectedDate)}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
              시작 시간
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
              종료 시간
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <ScheduleConflictWarning conflicts={conflicts} />
        ) : null}

        <button
          type="button"
          disabled={!selectedStudent || !isTimeRangeValid}
          onClick={() => onCandidateSelect(candidate)}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
            selectedStudent && isTimeRangeValid
              ? isSelected
                ? "bg-emerald-800 text-white"
                : "bg-emerald-700 text-white hover:bg-emerald-800"
              : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Clock3 size={16} />
          {isSelected ? "보강 후보 선택됨" : "이 날짜/시간으로 보강 문자"}
        </button>

        {!isTimeRangeValid ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            종료 시간은 시작 시간보다 늦어야 합니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ScheduleConflictWarning({ conflicts }: { conflicts: ScheduleConflict[] }) {
  const visibleConflicts = conflicts.slice(0, 3);
  const hiddenCount = conflicts.length - visibleConflicts.length;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={16} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-950">
            선택 시간이 기존 일정과 겹칩니다.
          </p>
          <div className="mt-2 space-y-1.5">
            {visibleConflicts.map((conflict) => (
              <div
                key={`${conflict.id}:${conflict.scheduleDate ?? "weekly"}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-white/75 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-stone-900">
                    {conflict.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium tabular-nums text-stone-500">
                    {conflict.startTime}-{conflict.endTime}
                  </p>
                </div>
                <span
                  className={[
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                    scheduleTypeChipClass(conflict.scheduleType),
                  ].join(" ")}
                >
                  {scheduleTypeLabel(conflict.scheduleType)}
                </span>
              </div>
            ))}
          </div>
          {hiddenCount > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-900">
              외 {hiddenCount}개 일정이 더 겹칩니다.
            </p>
          ) : null}
          <p className="mt-2 text-[11px] leading-4 text-amber-900">
            필요하면 그대로 보강 후보를 선택할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectedDateSchedule({
  date,
  schedules,
}: {
  date: string;
  schedules: OperationsStudentSchedule[];
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-stone-600">
          {formatDateForCandidate(date)} 일정
        </p>
        <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-stone-500">
          {schedules.length}개
        </span>
      </div>

      {schedules.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {schedules.map((schedule) => (
            <div
              key={`${schedule.id}:${schedule.scheduleDate ?? "weekly"}`}
              className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-white px-2 py-2"
            >
              <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-stone-900">
                <Clock3 size={13} className="text-stone-400" />
                {schedule.startTime}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-stone-600">
                {schedule.title}
              </span>
              <span
                className={[
                  "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                  scheduleTypeChipClass(schedule.scheduleType),
                ].join(" ")}
              >
                {scheduleTypeLabel(schedule.scheduleType)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs leading-5 text-stone-500">
          이 날짜에 겹치는 등록 일정이 없습니다.
        </p>
      )}
    </div>
  );
}
