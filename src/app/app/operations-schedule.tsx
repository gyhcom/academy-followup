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
  scheduleType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
  isActive: boolean;
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
      className="rounded-lg border border-stone-200 bg-white shadow-sm"
    >
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-emerald-700" size={18} />
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
            ? `${selectedStudent.name} 학생의 수업과 외부 일정을 확인합니다.`
            : "학생을 선택하면 스케줄이 표시됩니다."}
        </p>
      </div>

      <div className="space-y-3 p-4">
        {selectedStudent ? (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800">
              {selectedClassName ?? "반 미지정"}
            </p>
            <p className="mt-1 text-base font-semibold text-stone-950">
              {selectedStudent.name}
            </p>
          </div>
        ) : null}

        {selectedStudent && activeSchedules.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            등록된 스케줄이 없습니다. 관리 탭에서 정규 수업이나 외부 일정을 먼저
            입력해 주세요.
          </div>
        ) : null}

        {selectedStudent ? (
          <div className="space-y-2">
            {weekDays.map((dayOfWeek) => {
              const daySchedules = schedulesByDay.get(dayOfWeek) ?? [];

              return (
                <div
                  key={dayOfWeek}
                  className={[
                    "grid grid-cols-[2.6rem_minmax(0,1fr)] gap-3 rounded-md border p-3",
                    daySchedules.length > 0
                      ? "border-stone-200 bg-white"
                      : "border-stone-100 bg-stone-50",
                  ].join(" ")}
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-stone-950 text-sm font-semibold text-white">
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
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
            왼쪽 학생 목록에서 학생을 선택하면 주간 시간표가 여기에 표시됩니다.
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleRow({
  schedule,
  onMakeupCandidateSelect,
}: {
  schedule: OperationsStudentSchedule;
  onMakeupCandidateSelect: (schedule: OperationsStudentSchedule) => void;
}) {
  const canUseAsMakeupCandidate = schedule.scheduleType !== "external";

  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
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

      {canUseAsMakeupCandidate ? (
        <button
          type="button"
          onClick={() => onMakeupCandidateSelect(schedule)}
          className="mt-3 min-h-9 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          이 시간으로 보강 안내
        </button>
      ) : (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          외부 일정 시간은 보강 후보에서 제외합니다.
        </p>
      )}
    </div>
  );
}
