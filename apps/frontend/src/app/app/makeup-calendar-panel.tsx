"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  fetchStudentScheduleSharing,
} from "@/lib/client/student-schedule-sharing";

type MakeupCalendarPanelProps = {
  selectedStudent:
    | {
        id: string;
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
  const sharedSchedules = useSharedSchedules(selectedStudent?.id ?? null);
  const scheduleSource = useMemo(
    () => [...(selectedStudent?.schedules ?? []), ...sharedSchedules.schedules],
    [selectedStudent?.schedules, sharedSchedules.schedules],
  );
  const planner = useMemo(
    () => new MakeupSchedulePlanner({ schedules: scheduleSource, today }),
    [scheduleSource, today],
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
  const hasConflicts = conflicts.length > 0;
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
      className="message-zone-plan overflow-hidden border"
    >
      <div className="border-b border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-[var(--academy-muted)]" size={18} />
          <h2 id="makeup-calendar-title" className="text-sm font-semibold text-[var(--academy-ink)]">
            보강 달력
          </h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--academy-muted)]">
          날짜를 누르고 그날의 수업·보강 불가 시간을 보면서 보강 시간을 정합니다.
        </p>
      </div>

      <div className="space-y-3 p-3 2xl:p-4">
        <div className="grid gap-3 2xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="message-zone-plan-panel border px-3 py-3">
            <div className="mx-auto w-full max-w-[17.5rem]">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="이전 달"
                  title="이전 달"
                  onClick={() => moveMonth(-1)}
                  className="flex size-8 shrink-0 items-center justify-center border border-[var(--academy-border)] bg-white text-[var(--academy-muted)] transition hover:border-[var(--academy-border-strong)] hover:text-[var(--academy-ink)]"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-[var(--academy-ink)]">
                  {MakeupSchedulePlanner.getMonthLabel(displayMonth)}
                </p>
                <button
                  type="button"
                  aria-label="다음 달"
                  title="다음 달"
                  onClick={() => moveMonth(1)}
                  className="flex size-8 shrink-0 items-center justify-center border border-[var(--academy-border)] bg-white text-[var(--academy-muted)] transition hover:border-[var(--academy-border-strong)] hover:text-[var(--academy-ink)]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-0.5 text-center">
                {weekDayHeaders.map((dayOfWeek) => (
                  <div
                    key={dayOfWeek}
                    className="py-1 text-[11px] font-semibold text-[var(--academy-muted)]"
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
                        "relative flex aspect-square min-h-0 items-center justify-center rounded-sm border px-1 text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--academy-focus)]",
                        isActive
                            ? "border-[var(--academy-accent)] bg-[var(--academy-accent)] text-white"
                          : day.isCurrentMonth
                            ? "border-[var(--academy-border)] bg-white text-[var(--academy-ink)] hover:border-[var(--academy-border-strong)] hover:bg-[var(--academy-surface-muted)]"
                            : "border-[var(--academy-border)] bg-[var(--academy-surface-strong)] text-[#b7b4c2]",
                      ].join(" ")}
                    >
                      <span className="text-xs font-bold leading-none tabular-nums">
                        {day.dayOfMonth}
                      </span>
                      <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
                        {day.scheduleCount > 0 ? (
                          <span
                            aria-label="일정 있음"
                            className={[
                              "h-1 w-3 rounded-full",
                              day.hasExternalSchedule
                                ? "bg-amber-400"
                                : isActive
                                  ? "bg-white"
                                  : "bg-[var(--academy-accent)]",
                            ].join(" ")}
                          />
                        ) : null}
                        {day.isToday ? (
                          <span
                            aria-label="오늘"
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              isActive ? "bg-white" : "bg-[var(--academy-muted)]",
                            ].join(" ")}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            {selectedStudent ? (
              <SelectedDateSchedule
                date={selectedDate}
                schedules={selectedSummary.schedules}
                isSharedLoading={sharedSchedules.status === "loading"}
                sharedError={sharedSchedules.error}
              />
            ) : (
              <div className="border border-dashed border-[#D8D6DE] bg-[#FFFEFA] p-3 text-sm leading-6 text-[#62656f]">
                학생을 선택하면 날짜별 스케줄이 표시됩니다.
              </div>
            )}

            <div className="message-zone-plan-panel border">
              <div className="border-b border-[#D8D6DE] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--academy-muted)]">선택 날짜 / 보강 시간</p>
                <p className="mt-1 text-sm font-semibold text-[var(--academy-ink)]">
                  {formatDateForCandidate(selectedDate)}
                </p>
              </div>
              <div className="px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--academy-muted)]">
                    시작 시간
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="min-h-11 border border-[var(--academy-border)] bg-white px-3 text-sm font-medium text-[var(--academy-ink)] outline-none focus:border-[var(--academy-accent)] focus:ring-2 focus:ring-[var(--academy-accent-soft)]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-[var(--academy-muted)]">
                    종료 시간
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="min-h-11 border border-[var(--academy-border)] bg-white px-3 text-sm font-medium text-[var(--academy-ink)] outline-none focus:border-[var(--academy-accent)] focus:ring-2 focus:ring-[var(--academy-accent-soft)]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <ScheduleConflictWarning conflicts={conflicts} />
        ) : null}

        <button
          type="button"
          disabled={!selectedStudent || !isTimeRangeValid || hasConflicts}
          onClick={() => onCandidateSelect(candidate)}
          className={[
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
            selectedStudent && isTimeRangeValid && !hasConflicts
              ? isSelected
                ? "bg-[var(--academy-accent)] text-white"
                : "bg-[var(--academy-accent)] text-white hover:bg-[var(--academy-accent-strong)]"
              : "bg-[var(--academy-surface-strong)] text-[var(--academy-muted)]",
          ].join(" ")}
        >
          <Clock3 size={16} />
          {hasConflicts
            ? "기존 일정과 겹쳐 선택 불가"
            : isSelected
              ? "보강 후보 적용됨"
              : "보강 문자 초안에 적용"}
        </button>
        <p className="text-xs leading-5 text-[var(--academy-muted)]">
          선택하면 오른쪽 문자 초안의 사유와 보강 시간이 바뀝니다. 실제 발송은 초안 저장 후 따로 진행합니다.
        </p>

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
                    {conflict.isShared && conflict.sharedAcademyName
                      ? `${conflict.sharedAcademyName} · ${conflict.title}`
                      : conflict.title}
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
            이 시간은 보강 후보로 선택할 수 없습니다. 겹치지 않는 시간을 입력해 주세요.
            {conflicts.some((conflict) => conflict.isShared)
              ? " 연결 학원 일정과 겹치는 시간도 제외됩니다."
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectedDateSchedule({
  date,
  schedules,
  isSharedLoading,
  sharedError,
}: {
  date: string;
  schedules: OperationsStudentSchedule[];
  isSharedLoading: boolean;
  sharedError: string;
}) {
  return (
    <div className="border-y border-[var(--academy-border)] bg-[var(--academy-surface-muted)] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--academy-muted)]">
          {formatDateForCandidate(date)} 일정
        </p>
        <span className="border border-[var(--academy-border)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--academy-muted-strong)]">
          {schedules.length}개
        </span>
      </div>

      {schedules.length > 0 ? (
        <div className="mt-2 divide-y divide-[var(--academy-border)] overflow-hidden border border-[var(--academy-border)] bg-white">
          {schedules.map((schedule) => (
            <div
              key={`${schedule.id}:${schedule.scheduleDate ?? "weekly"}`}
              className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2"
            >
              <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-[var(--academy-ink)]">
                <Clock3 size={13} className="text-[var(--academy-muted)]" />
                {schedule.startTime}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-[var(--academy-muted-strong)]">
                {schedule.isShared && schedule.sharedAcademyName
                  ? `${schedule.sharedAcademyName} · ${schedule.title}`
                  : schedule.title}
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
        <p className="mt-2 border border-dashed border-[var(--academy-border)] bg-white px-3 py-2 text-xs leading-5 text-[var(--academy-muted)]">
          이 날짜에 겹치는 등록 일정이 없습니다.
        </p>
      )}
      {isSharedLoading ? (
        <p className="mt-2 border border-[var(--academy-border)] bg-white px-3 py-2 text-[11px] font-medium text-[var(--academy-muted)]">
          연결 학원 일정을 불러오는 중입니다.
        </p>
      ) : null}
      {sharedError ? (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-800">
          {sharedError}
        </p>
      ) : null}
    </div>
  );
}

function useSharedSchedules(studentId: string | null) {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    schedules: OperationsStudentSchedule[];
    error: string;
  }>({
    status: "idle",
    schedules: [],
    error: "",
  });

  useEffect(() => {
    if (!studentId) {
      return;
    }

    const controller = new AbortController();
    const activeStudentId = studentId;

    async function loadSharedSchedules() {
      setState((current) => ({
        status: "loading",
        schedules: current.schedules,
        error: "",
      }));

      try {
        const payload = await fetchStudentScheduleSharing(activeStudentId, controller.signal);

        setState({
          status: "ready",
          schedules: (payload.links ?? []).flatMap((link) =>
            link.schedules.map((schedule) => ({
              id: `shared:${schedule.id}`,
              classId: null,
              sharedAcademyName: schedule.academyName,
              isShared: true,
              scheduleType: schedule.scheduleType,
              scheduleDate: schedule.scheduleDate,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              subject: schedule.subject,
              title: schedule.title,
              memo: null,
              isActive: true,
              sourceFollowupId: null,
            })),
          ),
          error: "",
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          schedules: [],
          error:
            error instanceof Error
              ? error.message
              : "연결 학원 일정을 불러오지 못했습니다.",
        });
      }
    }

    void loadSharedSchedules();

    return () => {
      controller.abort();
    };
  }, [studentId]);

  return studentId ? state : { status: "idle" as const, schedules: [], error: "" };
}
