import type { OperationsStudentSchedule } from "@/app/app/operations-schedule";
import { weekDayShortLabel } from "@/app/app/management-utils";

export type MakeupCandidate = {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
};

export type CalendarDay = {
  date: string;
  dayOfWeek: number;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  scheduleCount: number;
  hasExternalSchedule: boolean;
};

export type DateScheduleSummary = {
  weeklySchedules: OperationsStudentSchedule[];
  oneOffSchedules: OperationsStudentSchedule[];
  schedules: OperationsStudentSchedule[];
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  year: "numeric",
});

export class MakeupSchedulePlanner {
  private readonly schedules: OperationsStudentSchedule[];
  private readonly today: string;

  constructor({
    schedules,
    today = getTodayDateValue(),
  }: {
    schedules: OperationsStudentSchedule[];
    today?: string;
  }) {
    this.schedules = schedules.filter((schedule) => schedule.isActive);
    this.today = today;
  }

  static getTodayDateValue() {
    return getTodayDateValue();
  }

  static getMonthValue(dateValue: string) {
    return dateValue.slice(0, 7);
  }

  static getDayOfWeek(dateValue: string) {
    return getDayOfWeek(dateValue);
  }

  static getMonthLabel(monthValue: string) {
    const [year, month] = monthValue.split("-").map(Number);

    return dateFormatter.format(new Date(year, month - 1, 1));
  }

  static moveMonth(monthValue: string, offset: number) {
    const [year, month] = monthValue.split("-").map(Number);
    const nextMonth = new Date(year, month - 1 + offset, 1);

    return toDateValue(nextMonth).slice(0, 7);
  }

  getCalendarDays(monthValue: string) {
    const [year, month] = monthValue.split("-").map(Number);
    const firstDate = new Date(year, month - 1, 1);
    const firstGridDate = new Date(firstDate);
    firstGridDate.setDate(firstDate.getDate() - toMondayStartIndex(firstDate.getDay()));

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstGridDate);
      date.setDate(firstGridDate.getDate() + index);
      const dateValue = toDateValue(date);
      const summary = this.getSchedulesForDate(dateValue);

      return {
        date: dateValue,
        dayOfWeek: date.getDay(),
        dayOfMonth: date.getDate(),
        isCurrentMonth: date.getMonth() === month - 1,
        isToday: dateValue === this.today,
        scheduleCount: summary.schedules.length,
        hasExternalSchedule: summary.schedules.some(
          (schedule) => schedule.scheduleType === "external",
        ),
      };
    });
  }

  getSchedulesForDate(dateValue: string): DateScheduleSummary {
    const dayOfWeek = getDayOfWeek(dateValue);
    const oneOffSchedules = this.schedules.filter(
      (schedule) => schedule.scheduleDate === dateValue,
    );
    const weeklySchedules = this.schedules.filter(
      (schedule) => !schedule.scheduleDate && schedule.dayOfWeek === dayOfWeek,
    );
    const schedules = [...oneOffSchedules, ...weeklySchedules].sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.endTime.localeCompare(second.endTime),
    );

    return {
      weeklySchedules,
      oneOffSchedules,
      schedules,
    };
  }

  createCandidate({
    date,
    startTime,
    endTime,
  }: {
    date: string;
    startTime: string;
    endTime: string;
  }): MakeupCandidate {
    return {
      date,
      dayOfWeek: getDayOfWeek(date),
      startTime,
      endTime,
      label: `${formatDateForCandidate(date)} ${startTime}-${endTime}`,
    };
  }

  isValidTimeRange(startTime: string, endTime: string) {
    return Boolean(startTime && endTime && startTime < endTime);
  }
}

export function formatDateForCandidate(dateValue: string) {
  return `${dateValue}(${weekDayShortLabel(getDayOfWeek(dateValue))})`;
}

function getTodayDateValue() {
  return toDateValue(new Date());
}

function getDayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  return date.getDay();
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toMondayStartIndex(dayOfWeek: number) {
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}
