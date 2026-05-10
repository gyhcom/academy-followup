import type {
  ManagementStudent,
  ManagementStudentSchedule,
  StudentSortMode,
} from "@/app/app/management-types";

export const weekDayOptions = [
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
  { value: 0, label: "일요일" },
];

export function compareStudents(
  first: ManagementStudent,
  second: ManagementStudent,
  sortMode: StudentSortMode,
) {
  if (sortMode === "name") {
    return first.name.localeCompare(second.name, "ko");
  }

  if (sortMode === "class") {
    return (
      (first.className ?? "zz").localeCompare(second.className ?? "zz", "ko") ||
      first.name.localeCompare(second.name, "ko")
    );
  }

  const firstSchedule = getPrimarySchedule(first);
  const secondSchedule = getPrimarySchedule(second);

  if (!firstSchedule && !secondSchedule) {
    return first.name.localeCompare(second.name, "ko");
  }

  if (!firstSchedule) {
    return 1;
  }

  if (!secondSchedule) {
    return -1;
  }

  return (
    compareScheduleOrder(firstSchedule, secondSchedule) ||
    firstSchedule.startTime.localeCompare(secondSchedule.startTime) ||
    first.name.localeCompare(second.name, "ko")
  );
}

export function getActiveSchedules(student: ManagementStudent) {
  return student.schedules
    .filter((schedule) => schedule.isActive)
    .sort(
      (first, second) =>
        compareScheduleOrder(first, second),
    );
}

export function getPrimarySchedule(student: ManagementStudent) {
  return getActiveSchedules(student)[0] ?? null;
}

export function activeScheduleCount(student: ManagementStudent) {
  return student.schedules.filter((schedule) => schedule.isActive).length;
}

export function groupSchedulesByDay(schedules: ManagementStudentSchedule[]) {
  const sortedSchedules = schedules
    .slice()
    .sort(
      (first, second) =>
        compareScheduleOrder(first, second),
    );
  const grouped = new Map<number, ManagementStudentSchedule[]>();

  sortedSchedules.forEach((schedule) => {
    const daySchedules = grouped.get(schedule.dayOfWeek) ?? [];
    daySchedules.push(schedule);
    grouped.set(schedule.dayOfWeek, daySchedules);
  });

  return Array.from(grouped.entries()).map(([dayOfWeek, daySchedules]) => ({
    dayOfWeek,
    schedules: daySchedules,
  }));
}

export function weekDayLabel(dayOfWeek: number) {
  return weekDayOptions.find((day) => day.value === dayOfWeek)?.label ?? `${dayOfWeek}`;
}

export function weekDayShortLabel(dayOfWeek: number) {
  const labels: Record<number, string> = {
    0: "일",
    1: "월",
    2: "화",
    3: "수",
    4: "목",
    5: "금",
    6: "토",
  };

  return labels[dayOfWeek] ?? `${dayOfWeek}`;
}

export function daySortValue(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

export function compareScheduleOrder(
  first: Pick<ManagementStudentSchedule, "scheduleDate" | "dayOfWeek" | "startTime">,
  second: Pick<ManagementStudentSchedule, "scheduleDate" | "dayOfWeek" | "startTime">,
) {
  if (first.scheduleDate || second.scheduleDate) {
    if (!first.scheduleDate) {
      return 1;
    }

    if (!second.scheduleDate) {
      return -1;
    }

    return (
      first.scheduleDate.localeCompare(second.scheduleDate) ||
      first.startTime.localeCompare(second.startTime)
    );
  }

  return (
    daySortValue(first.dayOfWeek) - daySortValue(second.dayOfWeek) ||
    first.startTime.localeCompare(second.startTime)
  );
}

export function scheduleTypeLabel(scheduleType: string) {
  const labels: Record<string, string> = {
    regular_class: "정규",
    makeup: "보강",
    external: "외부",
    consultation: "상담",
  };

  return labels[scheduleType] ?? scheduleType;
}

export function scheduleTypeChipClass(scheduleType: string) {
  const styles: Record<string, string> = {
    regular_class: "bg-blue-50 text-blue-800",
    makeup: "bg-[#EAF1F8] text-[#244B67]",
    external: "bg-amber-50 text-amber-800",
    consultation: "bg-violet-50 text-violet-800",
  };

  return styles[scheduleType] ?? "bg-stone-100 text-stone-700";
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조",
  };

  return labels[role] ?? role;
}
