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

  return (
    <section
      aria-labelledby="weekly-schedule-title"
      className="message-zone-plan overflow-hidden border"
    >
      <div className="border-b border-[#D8D6DE] bg-[#FBFAF7] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-[#62656f]" size={18} />
          <h2 id="weekly-schedule-title" className="text-sm font-semibold text-stone-950">
            주간 스케줄
          </h2>
          {activeSchedules.length > 0 ? (
            <span className="ml-auto border border-[#D8D6DE] bg-[#F4F4F1] px-2 py-0.5 text-xs font-bold text-[#62656f]">
              {activeSchedules.length}개
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#73777F]">
          {selectedStudent
            ? `${selectedStudent.name} · ${selectedClassName ?? "반 미지정"} 기준으로 보강 가능 시간을 확인합니다.`
            : "학생을 선택하면 스케줄이 표시됩니다."}
        </p>
      </div>

      <div>
        {selectedStudent && activeSchedules.length === 0 ? (
          <div className="border-t border-[#D8D6DE] px-4 py-4 text-sm leading-6 text-[#62656f]">
            등록된 스케줄이 없습니다. 관리 탭에서 정규 수업이나 개인/기타 일정을 먼저
            입력해 주세요.
          </div>
        ) : null}

        {selectedStudent ? (
          <div className="divide-y divide-[#D8D6DE]">
            {activeSchedules.length > 0 ? (
              <>
                <div className="grid grid-cols-[3.5rem_7rem_minmax(0,1fr)_auto] gap-3 bg-[#F4F4F1] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#62656f]">
                  <span>요일</span>
                  <span>시간</span>
                  <span>수업</span>
                  <span>유형</span>
                </div>
                {activeSchedules.map((schedule) => (
                  <ScheduleRow
                    key={schedule.id}
                    schedule={schedule}
                    onMakeupCandidateSelect={onMakeupCandidateSelect}
                  />
                ))}
              </>
            ) : null}
          </div>
        ) : (
          <div className="px-4 py-4 text-sm leading-6 text-[#62656f]">
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
  return (
    <button
      type="button"
      onClick={() => onMakeupCandidateSelect(schedule)}
      className="grid w-full grid-cols-[3.5rem_7rem_minmax(0,1fr)_auto] items-center gap-3 bg-[#FFFEFA] px-4 py-2.5 text-left transition hover:bg-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D8DAFA]"
      aria-label={`${weekDayShortLabel(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime} 스케줄을 보강 후보로 적용`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center border border-[#D8D6DE] bg-[#F4F4F1] text-xs font-black text-[#62656f]">
          {weekDayShortLabel(schedule.dayOfWeek)}
        </span>
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-1 text-sm font-black tabular-nums text-stone-950">
          <Clock3 className="shrink-0 text-[#858895]" size={14} />
          {schedule.startTime}
        </p>
        <p className="mt-0.5 text-[11px] font-medium tabular-nums text-[#73777F]">
          {schedule.endTime}까지
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#4B4F58]">
          {schedule.title}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-[#73777F]">
          {[schedule.scheduleDate ? `${schedule.scheduleDate} 1회 일정` : null, schedule.subject, schedule.memo]
            .filter(Boolean)
            .join(" · ") || "반복 수업"}
        </p>
      </div>

      <div className="flex justify-end">
        <span
          className={[
            "shrink-0 px-2 py-1 text-xs font-semibold",
            scheduleTypeChipClass(schedule.scheduleType),
          ].join(" ")}
        >
          {scheduleTypeLabel(schedule.scheduleType)}
        </span>
      </div>
    </button>
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
