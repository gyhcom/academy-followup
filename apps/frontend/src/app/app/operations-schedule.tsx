"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import {
  daySortValue,
  scheduleTypeChipClass,
  scheduleTypeLabel,
  weekDayShortLabel,
} from "@/app/app/management-utils";

export type OperationsStudentSchedule = {
  id: string;
  classId: string | null;
  sharedAcademyName?: string;
  isShared?: boolean;
  scheduleType: string;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
  isActive: boolean;
  sourceFollowupId: string | null;
};

type WeeklySchedulePanelProps = {
  selectedClassName: string | undefined;
  selectedStudent:
    | {
        name: string;
        schedules: OperationsStudentSchedule[];
      }
    | undefined;
  onMakeupCandidateSelect: (schedule: OperationsStudentSchedule) => void;
};

const weekDays = [1, 2, 3, 4, 5, 6, 0];

export function getSortedActiveSchedules(schedules: OperationsStudentSchedule[]) {
  return schedules
    .filter((schedule) => schedule.isActive)
    .sort(
      (first, second) =>
        compareScheduleDate(first.scheduleDate, second.scheduleDate) ||
        daySortValue(first.dayOfWeek) - daySortValue(second.dayOfWeek) ||
        first.startTime.localeCompare(second.startTime),
    );
}

export function WeeklySchedulePanel({
  selectedClassName,
  selectedStudent,
  onMakeupCandidateSelect,
}: WeeklySchedulePanelProps) {
  const activeSchedules = selectedStudent
    ? getSortedActiveSchedules(selectedStudent.schedules)
    : [];
  const schedulesByDay = new Map<number, OperationsStudentSchedule[]>();

  activeSchedules.forEach((schedule) => {
    const daySchedules = schedulesByDay.get(schedule.dayOfWeek) ?? [];
    daySchedules.push(schedule);
    schedulesByDay.set(schedule.dayOfWeek, daySchedules);
  });

  return (
    <section
      aria-labelledby="weekly-schedule-title"
      className="rounded-lg border border-stone-200 bg-white"
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-[#315C7C]" size={18} />
          <h2 id="weekly-schedule-title" className="text-sm font-semibold text-stone-950">
            주간 스케줄
          </h2>
          {activeSchedules.length > 0 ? (
            <span className="ml-auto rounded-md border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
              {activeSchedules.length}개
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {selectedStudent
            ? `${selectedStudent.name} 학생의 수업과 보강 불가 시간을 확인합니다.`
            : "학생을 선택하면 스케줄이 표시됩니다."}
        </p>
      </div>

      <div>
        {selectedStudent ? (
          <div className="border-l-2 border-l-[#315C7C] bg-[#F8FBFD] px-4 py-3">
            <p className="text-xs font-medium text-[#315C7C]">
              {selectedClassName ?? "반 미지정"}
            </p>
            <p className="mt-1 text-base font-semibold text-stone-950">
              {selectedStudent.name}
            </p>
          </div>
        ) : null}

        {selectedStudent && activeSchedules.length === 0 ? (
          <div className="border-t border-stone-100 px-4 py-4 text-sm leading-6 text-stone-600">
            등록된 스케줄이 없습니다. 관리 탭에서 정규 수업이나 개인/기타 일정을 먼저
            입력해 주세요.
          </div>
        ) : null}

        {selectedStudent ? (
          <div className="divide-y divide-stone-100">
            {weekDays.map((dayOfWeek) => {
              const daySchedules = schedulesByDay.get(dayOfWeek) ?? [];

              return (
                <div
                  key={dayOfWeek}
                  className={[
                    "grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3 px-4 py-3",
                    daySchedules.length > 0
                      ? "bg-white"
                      : "bg-stone-50/60",
                  ].join(" ")}
                >
                  <div className="flex size-9 items-center justify-center rounded bg-[#315C7C] text-sm font-semibold text-white">
                    {weekDayShortLabel(dayOfWeek)}
                  </div>

                  <div className="min-w-0 space-y-2">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((schedule) => (
                        <ScheduleRow
                          key={schedule.id}
                          schedule={schedule}
                          onMakeupCandidateSelect={onMakeupCandidateSelect}
                        />
                      ))
                    ) : (
                      <p className="py-2 text-sm text-stone-400">일정 없음</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-4 text-sm leading-6 text-stone-600">
            왼쪽 학생 목록에서 학생을 선택하면 주간 시간표가 여기에 표시됩니다.
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleRow({
  schedule,
}: {
  schedule: OperationsStudentSchedule;
  onMakeupCandidateSelect: (schedule: OperationsStudentSchedule) => void;
}) {
  return (
    <div className="border-l-2 border-l-stone-200 bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-lg font-semibold tabular-nums text-stone-950">
            <Clock3 className="shrink-0 text-stone-400" size={16} />
            {schedule.startTime}
            <span className="text-sm font-medium text-stone-400">-</span>
            {schedule.endTime}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-stone-800">
            {schedule.title}
          </p>
          {schedule.scheduleDate ? (
            <p className="mt-1 text-xs font-semibold text-[#315C7C]">
              {schedule.scheduleDate} 1회 일정
            </p>
          ) : null}
        </div>
        <span
          className={[
            "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
            scheduleTypeChipClass(schedule.scheduleType),
          ].join(" ")}
        >
          {scheduleTypeLabel(schedule.scheduleType)}
        </span>
      </div>

      {schedule.subject || schedule.memo ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
          {[schedule.subject, schedule.memo].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <p className="mt-2 border-t border-amber-100 pt-2 text-xs font-medium text-amber-800">
        이미 등록된 일정입니다. 이 시간은 보강 후보에서 제외합니다.
      </p>
    </div>
  );
}

function compareScheduleDate(firstDate: string | null, secondDate: string | null) {
  if (!firstDate && !secondDate) {
    return 0;
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return firstDate.localeCompare(secondDate);
}
