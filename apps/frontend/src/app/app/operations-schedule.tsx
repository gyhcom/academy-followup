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
      <div className="border-b border-[#B8BFD3] bg-[#E4E7F0] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-[#485A83]" size={18} />
          <h2 id="weekly-schedule-title" className="text-sm font-semibold text-stone-950">
            주간 스케줄
          </h2>
          {activeSchedules.length > 0 ? (
            <span className="ml-auto border border-[#B8BFD3] bg-[#F8F8FC] px-2 py-0.5 text-xs font-bold text-[#5A637D]">
              {activeSchedules.length}개
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#5A637D]">
          {selectedStudent
            ? `${selectedStudent.name} 학생의 수업과 보강 불가 시간을 확인합니다.`
            : "학생을 선택하면 스케줄이 표시됩니다."}
        </p>
      </div>

      <div>
        {selectedStudent ? (
          <div className="border-l-4 border-l-[#485A83] bg-[#F8F8FC] px-4 py-3">
            <p className="text-xs font-bold text-[#5A637D]">
              {selectedClassName ?? "반 미지정"}
            </p>
            <p className="mt-1 text-base font-semibold text-stone-950">
              {selectedStudent.name}
            </p>
          </div>
        ) : null}

        {selectedStudent && activeSchedules.length === 0 ? (
          <div className="border-t border-[#D9DEEA] px-4 py-4 text-sm leading-6 text-[#5A637D]">
            등록된 스케줄이 없습니다. 관리 탭에서 정규 수업이나 개인/기타 일정을 먼저
            입력해 주세요.
          </div>
        ) : null}

        {selectedStudent ? (
          <div className="divide-y divide-[#D9DEEA]">
            {activeSchedules.length > 0 ? (
              <>
                <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-3 bg-[#EAEDF4] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#5A637D]">
                  <span>요일</span>
                  <span>시간 / 수업</span>
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
          <div className="px-4 py-4 text-sm leading-6 text-[#5A637D]">
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
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 bg-[#F8F8FC] px-4 py-2.5 hover:bg-[#EEF1F8]">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center border border-[#B8BFD3] bg-[#EAEDF4] text-xs font-black text-[#485A83]">
          {weekDayShortLabel(schedule.dayOfWeek)}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black tabular-nums text-stone-950">
          <Clock3 className="shrink-0 text-[#8A92A8]" size={15} />
          <span className="shrink-0">
            {schedule.startTime}-{schedule.endTime}
          </span>
          <span className="min-w-0 truncate font-semibold text-[#4E5872]">
            {schedule.title}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] font-medium text-[#6A7288]">
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
