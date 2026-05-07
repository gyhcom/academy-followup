"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  UserCheck,
} from "lucide-react";
import {
  attendanceStatusLabels,
  type AttendanceStatus,
} from "@/lib/attendance";
import {
  getSortedActiveSchedules,
  type OperationsStudentSchedule,
} from "@/app/app/operations-schedule";

export type AttendanceStudent = {
  id: string;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  maskedParentPhone: string;
  schedules: OperationsStudentSchedule[];
};

export type AttendanceClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  students: AttendanceStudent[];
};

export type AttendanceRecordItem = {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string | null;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  checkedAt: string | null;
  arrivedAt: string | null;
  note: string | null;
};

type AttendanceBoardProps = {
  academyName: string;
  teacherName: string;
  classes: AttendanceClass[];
  initialDate: string;
  initialRecords: AttendanceRecordItem[];
};

type AttendanceApiResponse = {
  records?: AttendanceRecordItem[];
  record?: AttendanceRecordItem;
  error?: string;
};

type AttendanceSession = {
  key: string;
  classId: string;
  className: string;
  subject: string | null;
  gradeLabel: string | null;
  startTime: string;
  endTime: string;
  students: AttendanceStudent[];
};

const editableStatuses: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "needs_check",
  "makeup",
];

export function AttendanceBoard({
  academyName,
  teacherName,
  classes,
  initialDate,
  initialRecords,
}: AttendanceBoardProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [attendanceRecords, setAttendanceRecords] = useState(initialRecords);
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [loadState, setLoadState] = useState<{
    status: "idle" | "loading" | "error";
    error: string;
  }>({ status: "idle", error: "" });
  const [saveState, setSaveState] = useState<{
    key: string;
    status: "idle" | "saving" | "saved" | "error";
    error: string;
  }>({ key: "", status: "idle", error: "" });
  const selectedDayOfWeek = getDayOfWeek(selectedDate);
  const sessions = useMemo(
    () => buildAttendanceSessions(classes, attendanceRecords, selectedDayOfWeek),
    [attendanceRecords, classes, selectedDayOfWeek],
  );
  const selectedSession =
    sessions.find((session) => session.key === selectedSessionKey) ?? sessions[0];
  const selectedSessionRecords = useMemo(
    () =>
      selectedSession
        ? attendanceRecords.filter(
            (record) =>
              record.classId === selectedSession.classId &&
              record.attendanceDate === selectedDate &&
              record.scheduledStartTime === selectedSession.startTime &&
              record.scheduledEndTime === selectedSession.endTime,
          )
        : [],
    [attendanceRecords, selectedDate, selectedSession],
  );
  const recordsByStudent = new Map(
    selectedSessionRecords.map((record) => [record.studentId, record]),
  );
  const summary = selectedSession
    ? summarizeSession(selectedSession.students, recordsByStudent)
    : null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttendance() {
      setLoadState({ status: "loading", error: "" });

      try {
        const response = await fetch(`/api/attendance?date=${selectedDate}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as AttendanceApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "출석 기록을 불러오지 못했습니다.");
        }

        setAttendanceRecords(payload.records ?? []);
        setLoadState({ status: "idle", error: "" });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "출석 기록을 불러오지 못했습니다.",
        });
      }
    }

    void loadAttendance();

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  async function handleStatusChange(student: AttendanceStudent, status: AttendanceStatus) {
    if (!selectedSession) {
      return;
    }

    const updateKey = getAttendanceUpdateKey({
      studentId: student.id,
      classId: selectedSession.classId,
      attendanceDate: selectedDate,
      scheduledStartTime: selectedSession.startTime,
      scheduledEndTime: selectedSession.endTime,
    });

    setSaveState({ key: updateKey, status: "saving", error: "" });

    try {
      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          classId: selectedSession.classId,
          attendanceDate: selectedDate,
          scheduledStartTime: selectedSession.startTime,
          scheduledEndTime: selectedSession.endTime,
          status,
          note: createDefaultNote(status),
        }),
      });
      const payload = (await response.json()) as AttendanceApiResponse;

      if (!response.ok || !payload.record) {
        throw new Error(payload.error ?? "출석 상태를 저장하지 못했습니다.");
      }

      setAttendanceRecords((current) => mergeAttendanceRecord(current, payload.record!));
      setSaveState({ key: updateKey, status: "saved", error: "" });
    } catch (error) {
      setSaveState({
        key: updateKey,
        status: "error",
        error:
          error instanceof Error ? error.message : "출석 상태를 저장하지 못했습니다.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              반별 출석부
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {teacherName}님이 수업별 도착 여부를 확인합니다. 결석 문자는 다음 단계에서
              이 상태와 연결합니다.
            </p>
          </div>

          <label className="w-full max-w-xs">
            <span className="mb-1 block text-xs font-semibold text-stone-500">
              조회 날짜
            </span>
            <span className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-800">
              <CalendarDays size={17} className="text-stone-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-9 flex-1 bg-transparent outline-none"
              />
            </span>
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <SessionList
          sessions={sessions}
          selectedSessionKey={selectedSession?.key ?? ""}
          loadState={loadState.status}
          onSelect={setSelectedSessionKey}
        />

        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-700" />
                  <h3 className="text-base font-semibold text-stone-950">
                    {selectedSession?.className ?? "선택된 수업 없음"}
                  </h3>
                </div>
                {selectedSession ? (
                  <p className="mt-1 text-sm text-stone-500">
                    {selectedSession.startTime} - {selectedSession.endTime} ·{" "}
                    {selectedSession.subject ?? "과목 미지정"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">
                    선택한 날짜에 표시할 수업이 없습니다.
                  </p>
                )}
              </div>

              {summary ? <AttendanceSummary summary={summary} /> : null}
            </div>

            {loadState.status === "error" ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
                {loadState.error}
              </div>
            ) : null}
          </div>

          {selectedSession ? (
            <div>
              <div className="hidden grid-cols-[minmax(9rem,1fr)_8rem_minmax(24rem,1.4fr)] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-500 sm:grid sm:px-5">
                <span>학생</span>
                <span>상태</span>
                <span>체크</span>
              </div>

              <div className="divide-y divide-stone-200">
                {selectedSession.students.map((student) => {
                  const record = recordsByStudent.get(student.id);
                  const status = normalizeAttendanceStatus(record?.status);
                  const updateKey = getAttendanceUpdateKey({
                    studentId: student.id,
                    classId: selectedSession.classId,
                    attendanceDate: selectedDate,
                    scheduledStartTime: selectedSession.startTime,
                    scheduledEndTime: selectedSession.endTime,
                  });
                  const isSaving =
                    saveState.key === updateKey && saveState.status === "saving";
                  const saveError =
                    saveState.key === updateKey && saveState.status === "error"
                      ? saveState.error
                      : "";

                  return (
                    <AttendanceStudentRow
                      key={student.id}
                      student={student}
                      status={status}
                      record={record}
                      isSaving={isSaving}
                      saveError={saveError}
                      onStatusChange={(nextStatus) =>
                        handleStatusChange(student, nextStatus)
                      }
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-600">
              선택한 날짜에 수업 기록이나 주간 스케줄이 없습니다.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function SessionList({
  sessions,
  selectedSessionKey,
  loadState,
  onSelect,
}: {
  sessions: AttendanceSession[];
  selectedSessionKey: string;
  loadState: "idle" | "loading" | "error";
  onSelect: (sessionKey: string) => void;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-950">수업 시간</h3>
          {loadState === "loading" ? (
            <Loader2 size={16} className="animate-spin text-stone-400" />
          ) : (
            <span className="text-xs font-medium text-stone-500">{sessions.length}개</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-2">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const isSelected = session.key === selectedSessionKey;

            return (
              <button
                key={session.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(session.key)}
                className={[
                  "min-w-56 rounded-md border px-3 py-3 text-left transition lg:w-full",
                  isSelected
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 text-base font-semibold tabular-nums">
                  <Clock3 size={16} className={isSelected ? "text-white/70" : "text-stone-400"} />
                  {session.startTime} - {session.endTime}
                </span>
                <span className="mt-1 block text-sm font-semibold">{session.className}</span>
                <span
                  className={[
                    "mt-1 block text-xs",
                    isSelected ? "text-white/70" : "text-stone-500",
                  ].join(" ")}
                >
                  {session.subject ?? "과목 미지정"} · {session.students.length}명
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-1 py-2 text-sm leading-6 text-stone-500">
            이 날짜에 표시할 수업이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function AttendanceSummary({
  summary,
}: {
  summary: Record<AttendanceStatus, number>;
}) {
  return (
    <dl className="grid grid-cols-5 gap-2 text-center text-xs">
      {editableStatuses.map((status) => (
        <div key={status} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-2">
          <dt className="font-medium text-stone-500">{attendanceStatusLabels[status]}</dt>
          <dd className="mt-1 text-base font-semibold text-stone-950">{summary[status]}</dd>
        </div>
      ))}
    </dl>
  );
}

function AttendanceStudentRow({
  student,
  status,
  record,
  isSaving,
  saveError,
  onStatusChange,
}: {
  student: AttendanceStudent;
  status: AttendanceStatus;
  record: AttendanceRecordItem | undefined;
  isSaving: boolean;
  saveError: string;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(9rem,1fr)_8rem_minmax(24rem,1.4fr)] sm:items-center sm:px-5">
      <div className="min-w-0">
        <p className="text-base font-semibold text-stone-950">{student.name}</p>
        <p className="mt-1 text-xs text-stone-500">
          {[student.schoolName, student.gradeLabel].filter(Boolean).join(" · ") ||
            "학년 정보 없음"}{" "}
          · {student.maskedParentPhone}
        </p>
      </div>

      <div>
        <span
          className={[
            "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold",
            attendanceStatusClass(status),
          ].join(" ")}
        >
          {attendanceStatusLabels[status]}
        </span>
        {record?.checkedAt ? (
          <p className="mt-1 text-xs text-stone-400">{formatTime(record.checkedAt)}</p>
        ) : null}
      </div>

      <div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {editableStatuses.map((nextStatus) => {
            const isSelected = status === nextStatus;

            return (
              <button
                key={nextStatus}
                type="button"
                disabled={isSaving}
                aria-pressed={isSelected}
                onClick={() => onStatusChange(nextStatus)}
                className={[
                  "flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition",
                  isSelected
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-emerald-50",
                  isSaving ? "cursor-wait opacity-60" : "",
                ].join(" ")}
              >
                {isSelected ? <Check size={14} /> : null}
                {attendanceStatusLabels[nextStatus]}
              </button>
            );
          })}
        </div>

        {saveError ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {saveError}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function buildAttendanceSessions(
  classes: AttendanceClass[],
  records: AttendanceRecordItem[],
  dayOfWeek: number,
): AttendanceSession[] {
  const sessionMap = new Map<string, AttendanceSession>();
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const studentsById = new Map<string, AttendanceStudent>();

  classes.forEach((classItem) => {
    classItem.students.forEach((student) => {
      studentsById.set(student.id, student);
    });
  });

  classes.forEach((classItem) => {
    classItem.students.forEach((student) => {
      getSortedActiveSchedules(student.schedules)
        .filter(
          (schedule) =>
            schedule.classId === classItem.id &&
            schedule.dayOfWeek === dayOfWeek &&
            (schedule.scheduleType === "regular_class" || schedule.scheduleType === "makeup"),
        )
        .forEach((schedule) => {
          addSessionStudent({
            sessionMap,
            classItem,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            student,
          });
        });
    });
  });

  records.forEach((record) => {
    const classItem = classMap.get(record.classId);

    if (!classItem) {
      return;
    }

    const session = ensureSession({
      sessionMap,
      classItem,
      startTime: record.scheduledStartTime,
      endTime: record.scheduledEndTime,
    });

    classItem.students.forEach((student) => {
      if (!session.students.some((item) => item.id === student.id)) {
        session.students.push(student);
      }
    });

    const recordStudent = studentsById.get(record.studentId);

    if (recordStudent && !session.students.some((item) => item.id === recordStudent.id)) {
      session.students.push(recordStudent);
    }
  });

  return Array.from(sessionMap.values())
    .map((session) => ({
      ...session,
      students: [...session.students].sort((first, second) =>
        first.name.localeCompare(second.name, "ko"),
      ),
    }))
    .sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.className.localeCompare(second.className, "ko"),
    );
}

function addSessionStudent({
  sessionMap,
  classItem,
  startTime,
  endTime,
  student,
}: {
  sessionMap: Map<string, AttendanceSession>;
  classItem: AttendanceClass;
  startTime: string;
  endTime: string;
  student: AttendanceStudent;
}) {
  const session = ensureSession({ sessionMap, classItem, startTime, endTime });

  if (!session.students.some((item) => item.id === student.id)) {
    session.students.push(student);
  }
}

function ensureSession({
  sessionMap,
  classItem,
  startTime,
  endTime,
}: {
  sessionMap: Map<string, AttendanceSession>;
  classItem: AttendanceClass;
  startTime: string;
  endTime: string;
}) {
  const key = getSessionKey(classItem.id, startTime, endTime);
  const current = sessionMap.get(key);

  if (current) {
    return current;
  }

  const session: AttendanceSession = {
    key,
    classId: classItem.id,
    className: classItem.name,
    subject: classItem.subject,
    gradeLabel: classItem.gradeLabel,
    startTime,
    endTime,
    students: [],
  };

  sessionMap.set(key, session);
  return session;
}

function summarizeSession(
  students: AttendanceStudent[],
  recordsByStudent: Map<string, AttendanceRecordItem>,
) {
  const summary: Record<AttendanceStatus, number> = {
    pending: 0,
    present: 0,
    late: 0,
    absent: 0,
    makeup: 0,
    excused: 0,
    needs_check: 0,
  };

  students.forEach((student) => {
    const status = normalizeAttendanceStatus(recordsByStudent.get(student.id)?.status);
    summary[status] += 1;
  });

  return summary;
}

function normalizeAttendanceStatus(status: string | undefined): AttendanceStatus {
  if (
    status === "present" ||
    status === "late" ||
    status === "absent" ||
    status === "makeup" ||
    status === "excused" ||
    status === "needs_check"
  ) {
    return status;
  }

  return "pending";
}

function mergeAttendanceRecord(
  current: AttendanceRecordItem[],
  nextRecord: AttendanceRecordItem,
) {
  const nextKey = getAttendanceUpdateKey({
    studentId: nextRecord.studentId,
    classId: nextRecord.classId,
    attendanceDate: nextRecord.attendanceDate,
    scheduledStartTime: nextRecord.scheduledStartTime,
    scheduledEndTime: nextRecord.scheduledEndTime,
  });
  const found = current.some(
    (record) =>
      getAttendanceUpdateKey({
        studentId: record.studentId,
        classId: record.classId,
        attendanceDate: record.attendanceDate,
        scheduledStartTime: record.scheduledStartTime,
        scheduledEndTime: record.scheduledEndTime,
      }) === nextKey,
  );

  if (!found) {
    return [...current, nextRecord];
  }

  return current.map((record) =>
    getAttendanceUpdateKey({
      studentId: record.studentId,
      classId: record.classId,
      attendanceDate: record.attendanceDate,
      scheduledStartTime: record.scheduledStartTime,
      scheduledEndTime: record.scheduledEndTime,
    }) === nextKey
      ? nextRecord
      : record,
  );
}

function getAttendanceUpdateKey({
  studentId,
  classId,
  attendanceDate,
  scheduledStartTime,
  scheduledEndTime,
}: {
  studentId: string;
  classId: string;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
}) {
  return `${attendanceDate}:${classId}:${studentId}:${scheduledStartTime}:${scheduledEndTime}`;
}

function getSessionKey(classId: string, startTime: string, endTime: string) {
  return `${classId}:${startTime}:${endTime}`;
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function createDefaultNote(status: AttendanceStatus) {
  if (status === "needs_check") {
    return "수업 시작 후 미도착. 결석 확정 전 확인 필요";
  }

  if (status === "late") {
    return "수업 시작 후 도착";
  }

  if (status === "absent") {
    return "결석 연락 필요";
  }

  if (status === "makeup") {
    return "보강 출석";
  }

  return null;
}

function attendanceStatusClass(status: AttendanceStatus) {
  const classes: Record<AttendanceStatus, string> = {
    pending: "bg-stone-100 text-stone-600",
    present: "bg-emerald-50 text-emerald-800",
    late: "bg-amber-50 text-amber-800",
    absent: "bg-red-50 text-red-800",
    makeup: "bg-blue-50 text-blue-800",
    excused: "bg-purple-50 text-purple-800",
    needs_check: "bg-orange-50 text-orange-800",
  };

  return classes[status];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
