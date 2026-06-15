"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  attendanceStatusLabels,
  isAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import type { OperationsClass, OperationsStudent } from "@/app/app/operations-board";
import { getSortedActiveSchedules } from "@/app/app/operations-schedule";
import { weekDayShortLabel } from "@/app/app/management-utils";
import type { FollowupReason } from "@/lib/followup-templates";

type WorkspaceView = "home" | "operations" | "attendance" | "management";

type WorkspaceHomeProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  canManage: boolean;
  classes: OperationsClass[];
  scheduleItems: HomeScheduleItem[];
  scheduleSummaryItems: HomeScheduleItem[];
  selectedDate: string;
  records: AttendanceRecordItem[];
  loadState: {
    status: "idle" | "loading" | "error";
    error: string;
  };
  onDateChange: (date: string) => void;
  onNavigate: (view: WorkspaceView) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
};

type FollowupFilter = "all" | "unsent" | "sent";
type BlockedScheduleFilter = "all" | "shared" | "manual" | "personal";
type PcStudentBoardFilter =
  | "all"
  | "unchecked"
  | "present"
  | "late"
  | "absent"
  | "needs_check"
  | "attention"
  | "makeup";

type HomeFollowupItem = {
  key: string;
  classId: string;
  className: string;
  student: OperationsStudent;
  status: AttendanceStatus;
  startTime: string;
  endTime: string;
  followupStatus: string | null;
  followupSentAt: string | null;
};

type HomeScheduleKind =
  | "class_session"
  | "student_schedule"
  | "manual_external_class"
  | "shared_schedule";

type HomeScheduleItem = {
  id: string;
  kind: HomeScheduleKind;
  scheduleType: string;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
  studentName: string | null;
  className: string | null;
  classId: string | null;
  studentId: string | null;
  studentCount: number | null;
  isShared: boolean;
  canOpenAttendance: boolean;
};

type HomeScheduleSummary = {
  academyScheduleCount: number;
  classSessionCount: number;
  manualExternalCount: number;
  sharedCount: number;
  blockedScheduleCount: number;
  totalCount: number;
};

type PcStudentBoardRow = {
  key: string;
  classId: string;
  className: string;
  subject: string | null;
  gradeLabel: string | null;
  student: OperationsStudent;
  status: AttendanceStatus;
  startTime: string;
  endTime: string;
  followupStatus: string | null;
  followupSentAt: string | null;
  hasBlockedSchedule: boolean;
};

const actionableStatuses: AttendanceStatus[] = [
  "needs_check",
  "late",
  "absent",
  "makeup",
  "pending",
];

export function WorkspaceHome({
  academyName,
  teacherName,
  role,
  roleLabel,
  canManage,
  classes,
  scheduleItems,
  scheduleSummaryItems,
  selectedDate,
  records,
  loadState,
  onDateChange,
  onNavigate,
  onStudentSelect,
}: WorkspaceHomeProps) {
  const [expandedFilter, setExpandedFilter] = useState<FollowupFilter | null>(null);
  const [pcStudentFilter, setPcStudentFilter] = useState<PcStudentBoardFilter>("all");
  const [selectedPcStudentKey, setSelectedPcStudentKey] = useState("");
  const followupItems = useMemo(
    () => buildHomeFollowupItems(classes, records),
    [classes, records],
  );
  const selectedScheduleItems = useMemo(
    () => filterScheduleItemsForDate(scheduleItems, selectedDate),
    [scheduleItems, selectedDate],
  );
  const selectedScheduleSummary = useMemo(
    () => buildHomeScheduleSummary(scheduleSummaryItems, selectedDate),
    [scheduleSummaryItems, selectedDate],
  );
  const sentCount = followupItems.filter((item) => item.followupStatus === "sent").length;
  const unsentCount = followupItems.length - sentCount;
  const filteredItems = getFilteredItems(followupItems, expandedFilter);
  const pcStudentRows = useMemo(
    () =>
      buildPcStudentBoardRows({
        classes,
        records,
        scheduleItems: selectedScheduleItems,
        selectedDate,
      }),
    [classes, records, selectedScheduleItems, selectedDate],
  );
  const filteredPcStudentRows = useMemo(
    () => filterPcStudentBoardRows(pcStudentRows, pcStudentFilter),
    [pcStudentRows, pcStudentFilter],
  );
  const selectedPcStudent =
    pcStudentRows.find((item) => item.key === selectedPcStudentKey) ??
    filteredPcStudentRows[0] ??
    pcStudentRows[0];
  const pcBoardSummary = summarizePcStudentBoardRows(pcStudentRows);
  const copy = getRoleHomeCopy({ academyName, teacherName, role, roleLabel });
  const isStaffHome = role === "teacher" || role === "assistant";
  const isToday = selectedDate === getTodayDate();

  function toggleFilter(filter: FollowupFilter) {
    setExpandedFilter((current) => (current === filter ? null : filter));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 sm:space-y-5 xl:max-w-[82rem] 2xl:max-w-[88rem]">
      <MobileHomeExperience
        academyName={academyName}
        copy={copy}
        canManage={canManage}
        selectedDate={selectedDate}
        records={records}
        loadState={loadState}
        followupItems={followupItems}
        scheduleItems={selectedScheduleItems}
        scheduleSummary={selectedScheduleSummary}
        isStaffHome={isStaffHome}
        unsentCount={unsentCount}
        sentCount={sentCount}
        expandedFilter={expandedFilter}
        filteredItems={filteredItems}
        onDateChange={onDateChange}
        onNavigate={onNavigate}
        onToggleFilter={toggleFilter}
        onCollapse={() => setExpandedFilter(null)}
        onStudentSelect={onStudentSelect}
      />

      <PcOperationsDashboard
        academyName={academyName}
        copy={copy}
        canManage={canManage}
        selectedDate={selectedDate}
        loadState={loadState}
        scheduleItems={selectedScheduleItems}
        scheduleSummary={selectedScheduleSummary}
        isStaffHome={isStaffHome}
        followupItems={followupItems}
        unsentCount={unsentCount}
        sentCount={sentCount}
        studentRows={pcStudentRows}
        filteredStudentRows={filteredPcStudentRows}
        selectedStudentRow={selectedPcStudent}
        studentFilter={pcStudentFilter}
        boardSummary={pcBoardSummary}
        onDateChange={onDateChange}
        onNavigate={onNavigate}
        onStudentSelect={onStudentSelect}
        onStudentFilterChange={setPcStudentFilter}
        onPcStudentSelect={setSelectedPcStudentKey}
      />

      <section className="hidden border-b border-[#DED8CE] bg-transparent px-1 pb-4 sm:block sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-5 sm:shadow-sm xl:hidden">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#315C7C]">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {copy.description}
            </p>
          </div>

          <HomeDateControl
            value={selectedDate}
            onChange={onDateChange}
          />
        </div>
      </section>

      <section
        aria-label="주요 바로가기"
        className="hidden overflow-hidden rounded-lg border border-[#DED8CE] bg-white shadow-sm sm:block xl:hidden"
      >
        <HomeActionButton
          icon={<MessageSquareText size={18} />}
          title="수업 후 문자 보내기"
          description="학생을 고르고 사유를 선택해 학부모 문자 초안을 확인합니다."
          onClick={() => onNavigate("operations")}
        />
        <HomeActionButton
          icon={<ClipboardCheck size={18} />}
          title="출석 체크하기"
          description="수업별 도착, 지각, 결석, 확인 필요 상태를 빠르게 기록합니다."
          onClick={() => onNavigate("attendance")}
        />
        {canManage ? (
          <HomeActionButton
            icon={<Settings size={18} />}
            title="학생/반 관리"
            description="학생, 반, 구성원, 문자 발송 정책을 관리합니다."
            onClick={() => onNavigate("management")}
          />
        ) : null}
      </section>

      <TodayScheduleSection
        className="hidden sm:block xl:hidden"
        items={selectedScheduleItems}
        summary={selectedScheduleSummary}
        selectedDate={selectedDate}
        isStaffHome={isStaffHome}
        onNavigate={onNavigate}
      />

      <section className="hidden overflow-hidden rounded-lg border border-[#DED8CE] bg-white shadow-sm sm:block xl:hidden">
        <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#315C7C]">
              {isToday ? "오늘 요약" : "선택 날짜 요약"}
            </p>
            {loadState.status === "loading" ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">
                <Loader2 size={13} className="animate-spin" />
                불러오는 중
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-stone-950">
            {formatHomeDate(selectedDate)} 기준 운영 현황
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            결석/지각 학생은 기록 저장과 테스트 발송 후 연락 완료로 표시됩니다.
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            숫자를 누르면 해당 학생 목록만 아래에 펼쳐집니다.
          </p>
          {loadState.status === "error" ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
              {loadState.error}
            </div>
          ) : null}
        </div>

        {records.length === 0 && loadState.status !== "loading" ? (
          <HomeEmptyState selectedDate={selectedDate} onDateChange={onDateChange} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-stone-200 p-4 sm:p-5">
              <SummaryButton
                label="확인할 학생"
                value={`${followupItems.length}명`}
                isActive={expandedFilter === "all"}
                onClick={() => toggleFilter("all")}
              />
              <SummaryButton
                label="연락 필요"
                value={`${unsentCount}명`}
                tone="danger"
                isActive={expandedFilter === "unsent"}
                onClick={() => toggleFilter("unsent")}
              />
              <SummaryButton
                label="연락 완료"
                value={`${sentCount}명`}
                tone="success"
                isActive={expandedFilter === "sent"}
                onClick={() => toggleFilter("sent")}
              />
            </div>
          </>
        )}

        {expandedFilter && records.length > 0 ? (
          <div>
            <div className="flex items-center justify-between gap-3 bg-stone-50 px-4 py-3 text-sm sm:px-5">
              <p className="font-semibold text-stone-900">
                {filterLabel(expandedFilter)} {filteredItems.length}명
              </p>
              <button
                type="button"
                onClick={() => setExpandedFilter(null)}
                className="text-xs font-semibold text-stone-500 transition hover:text-stone-900"
              >
                접기
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <HomeFollowupRow
                    key={item.key}
                    item={item}
                    onStudentSelect={onStudentSelect}
                  />
                ))
              ) : (
                <p className="p-4 text-sm leading-6 text-stone-600 sm:px-5">
                  선택한 조건에 해당하는 학생이 없습니다.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function PcOperationsDashboard({
  academyName,
  copy,
  canManage,
  selectedDate,
  loadState,
  scheduleItems,
  scheduleSummary,
  isStaffHome,
  followupItems,
  unsentCount,
  sentCount,
  studentRows,
  filteredStudentRows,
  selectedStudentRow,
  studentFilter,
  boardSummary,
  onDateChange,
  onNavigate,
  onStudentSelect,
  onStudentFilterChange,
  onPcStudentSelect,
}: {
  academyName: string;
  copy: { title: string; description: string };
  canManage: boolean;
  selectedDate: string;
  loadState: {
    status: "idle" | "loading" | "error";
    error: string;
  };
  scheduleItems: HomeScheduleItem[];
  scheduleSummary: HomeScheduleSummary;
  isStaffHome: boolean;
  followupItems: HomeFollowupItem[];
  unsentCount: number;
  sentCount: number;
  studentRows: PcStudentBoardRow[];
  filteredStudentRows: PcStudentBoardRow[];
  selectedStudentRow: PcStudentBoardRow | undefined;
  studentFilter: PcStudentBoardFilter;
  boardSummary: ReturnType<typeof summarizePcStudentBoardRows>;
  onDateChange: (date: string) => void;
  onNavigate: (view: WorkspaceView) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
  onStudentFilterChange: (filter: PcStudentBoardFilter) => void;
  onPcStudentSelect: (key: string) => void;
}) {
  const academyItems = scheduleItems.filter(isAcademyScheduleItem);
  const blockedItems = scheduleItems.filter(isBlockedScheduleItem);
  const recentAttentionItems = followupItems.slice(0, 4);

  return (
    <div className="hidden xl:block">
      <section className="rounded-md border border-[#CAD8DE] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--clinic-primary)]">{academyName}</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--clinic-text)]">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--clinic-muted)]">
              {copy.description}
            </p>
          </div>
          <HomeDateControl value={selectedDate} onChange={onDateChange} />
        </div>

        <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-md border border-[#D2DDE2] bg-[#F4F8F9]">
          <PcKpi label="오늘 수업" value={`${scheduleSummary.academyScheduleCount}개`} />
          <PcKpi label="학생 체크" value={`${studentRows.length}명`} />
          <PcKpi label="체크 필요" value={`${boardSummary.unchecked}명`} tone="warning" />
          <PcKpi label="연락 필요" value={`${boardSummary.attention}명`} tone="danger" />
          <PcKpi label="보강 제외" value={`${scheduleSummary.blockedScheduleCount}건`} tone="muted" />
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)_24rem] 2xl:grid-cols-[21rem_minmax(0,1fr)_26rem] xl:items-start">
        <aside className="space-y-4">
          <section className="overflow-hidden rounded-md border border-[#C7D6DD] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
            <div className="border-b border-[#D6E0E5] bg-[#F7FAFB] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--clinic-text)]">
                    {isStaffHome ? "오늘 담당 수업" : "오늘 학원 수업"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--clinic-muted)]">수업을 누르면 출석부로 이동합니다.</p>
                </div>
                <span className="rounded-full bg-[#DCECEF] px-2 py-1 text-xs font-bold text-[var(--clinic-primary-dark)]">
                  {academyItems.length}개
                </span>
              </div>
            </div>
            <div className="max-h-[31rem] divide-y divide-[#E1EAEE] overflow-y-auto">
              {academyItems.length > 0 ? (
                academyItems.map((item) => (
                  <PcScheduleButton key={item.id} item={item} onNavigate={onNavigate} />
                ))
              ) : (
                <p className="px-4 py-5 text-sm leading-6 text-stone-500">
                  이 날짜에는 표시할 수업이 없습니다.
                </p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-[#C7D6DD] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
            <div className="border-b border-[#D6E0E5] bg-[#F7FAFB] px-4 py-3">
              <h3 className="text-sm font-bold text-[var(--clinic-text)]">작업</h3>
            </div>
            <HomeActionButton
              icon={<ClipboardCheck size={18} />}
              title="출석부 열기"
              description="도착·지각·예외를 바로 처리합니다."
              onClick={() => onNavigate("attendance")}
            />
            <HomeActionButton
              icon={<MessageSquareText size={18} />}
              title="문자 화면 열기"
              description="학생 확인과 연락 기록을 처리합니다."
              onClick={() => onNavigate("operations")}
            />
            {canManage ? (
              <HomeActionButton
                icon={<Settings size={18} />}
                title="관리 화면"
                description="학생, 반, 직원 설정을 확인합니다."
                onClick={() => onNavigate("management")}
              />
            ) : null}
          </section>
        </aside>

        <section className="overflow-hidden rounded-md border border-[#C7D6DD] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
          <div className="border-b border-[#D6E0E5] bg-[#F7FAFB] px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--clinic-text)]">
                  {isStaffHome ? "담당 학생 현황" : "오늘 학생 체크 보드"}
                </h3>
                <p className="mt-1 text-xs text-[var(--clinic-muted)]">
                  학생을 누르면 오른쪽에서 수업, 연락, 보강 제외 일정을 확인합니다.
                </p>
              </div>
              {loadState.status === "loading" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">
                  <Loader2 size={13} className="animate-spin" />
                  불러오는 중
                </span>
              ) : null}
            </div>
            <PcStudentFilterBar
              value={studentFilter}
              summary={boardSummary}
              totalCount={studentRows.length}
              onChange={onStudentFilterChange}
            />
            {loadState.status === "error" ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
                {loadState.error}
              </div>
            ) : null}
          </div>

          <div className="max-h-[38rem] divide-y divide-[#E1EAEE] overflow-y-auto bg-white" role="listbox" aria-label="오늘 학생 상태 목록">
            {filteredStudentRows.length > 0 ? (
              filteredStudentRows.map((row) => (
                <PcStudentBoardRowItem
                  key={row.key}
                  row={row}
                  isSelected={row.key === selectedStudentRow?.key}
                  onClick={() => onPcStudentSelect(row.key)}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm leading-6 text-stone-500">
                선택한 조건에 해당하는 학생이 없습니다. 필터를 바꿔 확인해 주세요.
              </div>
            )}
          </div>
        </section>

        <PcStudentDetailPanel
          row={selectedStudentRow}
          blockedItems={blockedItems}
          recentAttentionItems={recentAttentionItems}
          sentCount={sentCount}
          unsentCount={unsentCount}
          onNavigate={onNavigate}
          onStudentSelect={onStudentSelect}
        />
      </section>
    </div>
  );
}

function PcKpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "muted";
}) {
  const toneClass = {
    default: "text-[var(--clinic-text)]",
    warning: "text-[var(--clinic-warning)]",
    danger: "text-[var(--clinic-danger)]",
    muted: "text-[var(--clinic-primary)]",
  }[tone];

  return (
    <div className="border-r border-[#D2DDE2] px-4 py-3 last:border-r-0">
      <p className="text-xs font-semibold text-[var(--clinic-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function PcScheduleButton({
  item,
  onNavigate,
}: {
  item: HomeScheduleItem;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const content = (
    <>
      <span className="w-[4.4rem] shrink-0">
        <span className="block text-sm font-black tabular-nums text-[var(--clinic-text)]">
          {item.startTime}
        </span>
        <span className="block text-xs font-semibold tabular-nums text-[var(--clinic-muted)]">
          {item.endTime}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--clinic-text)]">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
          {item.subtitle}
          {item.studentCount ? ` · ${item.studentCount}명` : ""}
        </span>
      </span>
      <span className="rounded-md bg-[var(--clinic-primary-dark)] px-2.5 py-1 text-[11px] font-bold text-white">
        출석
      </span>
    </>
  );

  if (!item.canOpenAttendance) {
    return <div className="flex min-h-[4.25rem] items-center gap-3 px-4 py-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate("attendance")}
      className="flex min-h-[4.25rem] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F2F8F8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]"
    >
      {content}
    </button>
  );
}

function PcStudentFilterBar({
  value,
  summary,
  totalCount,
  onChange,
}: {
  value: PcStudentBoardFilter;
  summary: ReturnType<typeof summarizePcStudentBoardRows>;
  totalCount: number;
  onChange: (filter: PcStudentBoardFilter) => void;
}) {
  const options: Array<{
    value: PcStudentBoardFilter;
    label: string;
    count: number;
    tone: "default" | "blue" | "green" | "amber" | "red" | "violet";
  }> = [
    { value: "all", label: "전체", count: totalCount, tone: "default" },
    { value: "unchecked", label: "체크 필요", count: summary.unchecked, tone: "blue" },
    { value: "present", label: "도착", count: summary.present, tone: "green" },
    { value: "late", label: "지각", count: summary.late, tone: "amber" },
    { value: "absent", label: "결석", count: summary.absent, tone: "red" },
    { value: "needs_check", label: "확인 필요", count: summary.needsCheck, tone: "red" },
    { value: "attention", label: "연락 필요", count: summary.attention, tone: "amber" },
    { value: "makeup", label: "보강 예정", count: summary.makeup, tone: "violet" },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="학생 상태 필터">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={[
              "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--clinic-accent)]",
              isSelected
                ? selectedChipTone(option.tone)
                : "border-[#CAD8DE] bg-white text-[var(--clinic-muted)] hover:border-[#9FB7C0] hover:bg-[#F4F8F9]",
            ].join(" ")}
          >
            {option.label}
            <span
              className={[
                "rounded-full px-1.5 py-0.5 tabular-nums",
                isSelected ? "bg-white/20 text-white" : "bg-[#E8F0F2] text-[var(--clinic-muted)]",
              ].join(" ")}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PcStudentBoardRowItem({
  row,
  isSelected,
  onClick,
}: {
  row: PcStudentBoardRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isSent = row.followupStatus === "sent";
  const needsContact = isAttentionStatus(row.status) && !isSent;
  const contactLabel = isSent ? "연락 완료" : needsContact ? "연락 필요" : "대기";

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      aria-label={`${row.student.name} 학생 상세 보기, ${row.className}, ${row.startTime}-${row.endTime}, 출석 ${attendanceDisplayLabel(row.status)}, 연락 ${contactLabel}`}
      onClick={onClick}
      className={[
        "flex min-h-[4.35rem] w-full items-center gap-3 border-l-[3px] px-3.5 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]",
        isSelected
          ? "border-l-[var(--clinic-primary)] bg-[#EAF6F5]"
          : "border-l-transparent bg-white hover:border-l-[#B8C9D0] hover:bg-[#F5FAFA]",
      ].join(" ")}
    >
      <span className="min-w-0 flex-[1.25]">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-[var(--clinic-text)]">
            {row.student.name}
          </span>
          {row.hasBlockedSchedule ? (
            <span className="shrink-0 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800">
              보강 제외
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
          {[row.student.schoolName, row.student.gradeLabel].filter(Boolean).join(" · ") ||
            "학년 정보 없음"}
        </span>
      </span>
      <span className="min-w-0 flex flex-[1.15] items-center gap-2">
        <span className="shrink-0 rounded-md bg-[#F0F6F7] px-2 py-1 text-xs font-bold tabular-nums text-[var(--clinic-text)]">
          {row.startTime}-{row.endTime}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold text-[var(--clinic-muted)]">
          {row.className}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={[
            "rounded-full px-2 py-1 text-[11px] font-semibold",
            statusTone(row.status),
          ].join(" ")}
        >
          {attendanceDisplayLabel(row.status)}
        </span>
        <span
          className={[
            "rounded-full px-2 py-1 text-[11px] font-semibold",
            isSent
              ? "bg-emerald-50 text-emerald-800"
              : needsContact
              ? "bg-amber-50 text-amber-800"
              : "bg-stone-100 text-stone-600",
          ].join(" ")}
        >
          {contactLabel}
        </span>
      </span>
    </button>
  );
}

function PcStudentDetailPanel({
  row,
  blockedItems,
  recentAttentionItems,
  sentCount,
  unsentCount,
  onNavigate,
  onStudentSelect,
}: {
  row: PcStudentBoardRow | undefined;
  blockedItems: HomeScheduleItem[];
  recentAttentionItems: HomeFollowupItem[];
  sentCount: number;
  unsentCount: number;
  onNavigate: (view: WorkspaceView) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const studentBlockedItems = row
    ? blockedItems.filter((item) => item.studentId === row.student.id)
    : [];
  const studentSchedules = row ? getSortedActiveSchedules(row.student.schedules).slice(0, 5) : [];

  return (
    <aside className="sticky top-4 space-y-3">
      <section className="overflow-hidden rounded-md border border-[#C7D6DD] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
        <div className="border-b border-[#0B3E49] bg-[var(--clinic-primary-dark)] px-4 py-3 text-white">
          <h3 className="text-sm font-bold">학생 차트</h3>
          <p className="mt-0.5 text-xs text-cyan-50/72">
            오늘 처리할 출석, 연락, 보강 제외 시간을 확인합니다.
          </p>
        </div>

        {row ? (
          <div>
            <div className="border-l-[3px] border-l-[var(--clinic-accent)] bg-[#EAF6F5] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-[var(--clinic-text)]">
                    {row.student.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--clinic-muted)]">
                    {[row.student.schoolName, row.student.gradeLabel].filter(Boolean).join(" · ") ||
                      "학년 정보 없음"}
                  </p>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    statusTone(row.status),
                  ].join(" ")}
                >
                  {attendanceDisplayLabel(row.status)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#E1EAEE]">
              <ConsoleDetailRow label="오늘 수업" value={row.className} />
              <ConsoleDetailRow label="수업 시간" value={`${row.startTime}-${row.endTime}`} mono />
              <ConsoleDetailRow
                label="연락 상태"
                value={
                  row.followupStatus === "sent"
                    ? "연락 완료"
                    : isAttentionStatus(row.status)
                      ? "연락 필요"
                      : "대기"
                }
                tone={
                  row.followupStatus === "sent"
                    ? "success"
                    : isAttentionStatus(row.status)
                      ? "warning"
                      : "default"
                }
              />
              <ConsoleDetailRow
                label="보강 제외"
                value={studentBlockedItems.length > 0 ? `${studentBlockedItems.length}건` : "없음"}
                tone={studentBlockedItems.length > 0 ? "violet" : "default"}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#E1EAEE] px-4 py-3">
              <button
                type="button"
                onClick={() => onNavigate("attendance")}
                className="min-h-11 rounded-md border border-[#B8C9D0] bg-white px-3 text-sm font-bold text-[var(--clinic-text)] transition hover:bg-[#F4F8F9] focus:outline-none focus:ring-2 focus:ring-[var(--clinic-accent)]"
              >
                출석부로 이동
              </button>
              <button
                type="button"
                onClick={() =>
                  row
                    ? onStudentSelect({
                        classId: row.classId,
                        studentId: row.student.id,
                        reason: followupReasonForStatus(row.status),
                      })
                    : undefined
                }
                className="min-h-11 rounded-md bg-[var(--clinic-primary)] px-3 text-sm font-bold text-white transition hover:bg-[var(--clinic-primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--clinic-accent)] focus:ring-offset-2"
              >
                문자 화면
              </button>
            </div>

            <DetailBlock title="주간 스케줄">
              {studentSchedules.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {studentSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5"
                    >
                      <p className="text-xs font-semibold tabular-nums text-stone-500">
                        {weekDayShortLabel(schedule.dayOfWeek)} · {schedule.startTime}-
                        {schedule.endTime}
                      </p>
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {schedule.title}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-stone-500">등록된 주간 스케줄이 없습니다.</p>
              )}
            </DetailBlock>

            <DetailBlock title="보강 제외 일정">
              {studentBlockedItems.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {studentBlockedItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5">
                      <p className="text-xs font-semibold tabular-nums text-violet-800">
                        {item.startTime}-{item.endTime} · {getBlockedScheduleBadgeLabel(item)}
                      </p>
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {getBlockedScheduleDetail(item)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-stone-500">오늘 보강 제외 일정이 없습니다.</p>
              )}
            </DetailBlock>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-stone-500">
            왼쪽 학생 보드에서 학생을 선택해 주세요.
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-[#C7D6DD] bg-white shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
        <div className="border-b border-[#D6E0E5] bg-[#F7FAFB] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--clinic-text)]">오늘 연락 큐</h3>
          <p className="mt-0.5 text-xs text-[var(--clinic-muted)]">
            미발송 {unsentCount}명 · 발송 완료 {sentCount}명
          </p>
        </div>
        <div className="divide-y divide-[#E1EAEE]">
          {recentAttentionItems.length > 0 ? (
            recentAttentionItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  onStudentSelect({
                    classId: item.classId,
                    studentId: item.student.id,
                    reason: followupReasonForStatus(item.status),
                  })
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F4F8F9] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--clinic-text)]">
                    {item.student.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
                    {item.className} · {attendanceStatusLabels[item.status]}
                  </span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-stone-400" />
              </button>
            ))
          ) : (
            <p className="px-4 py-5 text-sm leading-6 text-stone-500">
              아직 연락 큐에 표시할 학생이 없습니다.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-stone-100">
      <h4 className="bg-stone-50/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ConsoleDetailRow({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "violet";
  mono?: boolean;
}) {
  const toneClass = {
    default: "text-stone-900",
    success: "text-emerald-700",
    warning: "text-amber-800",
    violet: "text-violet-800",
  }[tone];

  return (
    <div className="grid min-h-10 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 px-4 py-2">
      <span className="text-xs font-semibold text-stone-500">{label}</span>
      <span className={`truncate text-sm font-semibold ${toneClass} ${mono ? "tabular-nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function MobileHomeExperience({
  academyName,
  copy,
  canManage,
  selectedDate,
  records,
  loadState,
  followupItems,
  scheduleItems,
  scheduleSummary,
  isStaffHome,
  unsentCount,
  sentCount,
  expandedFilter,
  filteredItems,
  onDateChange,
  onNavigate,
  onToggleFilter,
  onCollapse,
  onStudentSelect,
}: {
  academyName: string;
  copy: { title: string; description: string };
  canManage: boolean;
  selectedDate: string;
  records: AttendanceRecordItem[];
  loadState: {
    status: "idle" | "loading" | "error";
    error: string;
  };
  followupItems: HomeFollowupItem[];
  scheduleItems: HomeScheduleItem[];
  scheduleSummary: HomeScheduleSummary;
  isStaffHome: boolean;
  unsentCount: number;
  sentCount: number;
  expandedFilter: FollowupFilter | null;
  filteredItems: HomeFollowupItem[];
  onDateChange: (date: string) => void;
  onNavigate: (view: WorkspaceView) => void;
  onToggleFilter: (filter: FollowupFilter) => void;
  onCollapse: () => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const isToday = selectedDate === getTodayDate();

  return (
    <div className="space-y-4 sm:hidden">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#48B77A] px-5 pb-5 pt-5 text-white shadow-[0_22px_58px_rgba(38,101,73,0.22)]">
        <div className="absolute right-[-1.5rem] top-5 h-28 w-32 rotate-6 rounded-[2rem] bg-[#05765D]" />
        <div className="absolute right-5 top-9 h-16 w-24 -rotate-6 rounded-3xl bg-[#7EDFB0]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles size={13} />
              오늘 운영
            </span>
            {loadState.status === "loading" ? (
              <Loader2 size={18} className="animate-spin text-white/80" />
            ) : null}
          </div>
          <p className="mt-5 text-sm font-semibold text-white/85">{academyName}</p>
          <h2 className="mt-1 max-w-[16rem] text-[2rem] font-black leading-[1.08] tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/80">
            {copy.description}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <MobileHeroMetric label="확인할 학생" value={`${followupItems.length}명`} />
            <MobileHeroMetric label="연락 필요" value={`${unsentCount}명`} tone="warm" />
          </div>
          <p className="mt-3 text-xs font-bold text-white/80">
            오늘 {isStaffHome ? "담당 수업" : "학원 일정"}{" "}
            {scheduleSummary.academyScheduleCount}개 · 보강 불가{" "}
            {scheduleSummary.blockedScheduleCount}건
          </p>

          <div className="mt-4 rounded-2xl bg-white/95 p-3 text-stone-950 shadow-[0_14px_32px_rgba(20,83,45,0.16)]">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#E9F8EF] text-[#05765D]">
                <Image
                  src="/icons/education/education-book.svg"
                  alt=""
                  width={30}
                  height={30}
                  style={{ width: 30, height: 30 }}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">오늘 바로 할 일</p>
                <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                  문자, 출석, 관리 흐름을 이어서 처리합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeDateControl value={selectedDate} onChange={onDateChange} />

      <TodayScheduleSection
        items={scheduleItems}
        summary={scheduleSummary}
        selectedDate={selectedDate}
        isStaffHome={isStaffHome}
        onNavigate={onNavigate}
      />

      <section aria-label="오늘 바로가기" className="space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-lg font-black text-stone-950">빠른 시작</p>
            <p className="mt-0.5 text-xs font-medium text-stone-500">수업 후 처리할 일을 바로 엽니다.</p>
          </div>
          <span className="rounded-full bg-[#F2EFE7] px-2.5 py-1 text-xs font-bold text-stone-600">
            {isToday ? "오늘" : "선택일"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MobileActionCard
            icon={<MessageSquareText size={18} />}
            iconSrc="/icons/education/education-discuss.svg"
            title="문자"
            description="수업 후 연락"
            tone="coral"
            onClick={() => onNavigate("operations")}
          />
          <MobileActionCard
            icon={<ClipboardCheck size={18} />}
            iconSrc="/icons/education/education-schedule.svg"
            title="출석"
            description="도착·지각 체크"
            tone="violet"
            onClick={() => onNavigate("attendance")}
          />
          {canManage ? (
            <MobileActionCard
              icon={<Settings size={18} />}
              iconSrc="/icons/education/education-school.svg"
              title="관리"
              description="학생·반 설정"
              tone="mint"
              onClick={() => onNavigate("management")}
            />
          ) : null}
          <MobileActionCard
            icon={<Users size={18} />}
            iconSrc="/icons/education/education-knowledge.svg"
            title="목록"
            description="대상 학생 보기"
            tone="amber"
            onClick={() => onToggleFilter("all")}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-[#E6E0D5] bg-white shadow-[0_14px_42px_rgba(33,32,30,0.08)]">
        <div className="border-b border-stone-100 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#05765D]">
                {isToday ? "오늘 요약" : "선택 날짜 요약"}
              </p>
              <h3 className="mt-1 text-xl font-black leading-tight text-stone-950">
                {formatHomeDate(selectedDate)}
              </h3>
            </div>
            <span className="rounded-full bg-[#F2F7F0] px-2.5 py-1 text-xs font-bold text-[#05765D]">
              운영 현황
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            숫자를 누르면 해당 학생 목록이 펼쳐집니다.
          </p>
          {loadState.status === "error" ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
              {loadState.error}
            </div>
          ) : null}
        </div>

        {records.length === 0 && loadState.status !== "loading" ? (
          <HomeEmptyState selectedDate={selectedDate} onDateChange={onDateChange} />
        ) : (
          <div className="grid grid-cols-3 gap-2 p-3">
            <MobileSummaryButton
              label="확인할 학생"
              value={`${followupItems.length}`}
              isActive={expandedFilter === "all"}
              onClick={() => onToggleFilter("all")}
            />
            <MobileSummaryButton
              label="연락 필요"
              value={`${unsentCount}`}
              tone="danger"
              isActive={expandedFilter === "unsent"}
              onClick={() => onToggleFilter("unsent")}
            />
            <MobileSummaryButton
              label="완료"
              value={`${sentCount}`}
              tone="success"
              isActive={expandedFilter === "sent"}
              onClick={() => onToggleFilter("sent")}
            />
          </div>
        )}

        {expandedFilter && records.length > 0 ? (
          <div className="border-t border-stone-100">
            <div className="flex items-center justify-between gap-3 bg-[#FBFAF7] px-4 py-3">
              <p className="text-sm font-black text-stone-950">
                {filterLabel(expandedFilter)} {filteredItems.length}명
              </p>
              <button
                type="button"
                onClick={onCollapse}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-500 shadow-sm"
              >
                접기
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <MobileFollowupRow
                    key={item.key}
                    item={item}
                    onStudentSelect={onStudentSelect}
                  />
                ))
              ) : (
                <p className="px-4 py-5 text-sm leading-6 text-stone-600">
                  선택한 조건에 해당하는 학생이 없습니다.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function HomeDateControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="w-full rounded-lg border border-[#DED8CE] bg-[#F8FAFC] p-3">
      <span className="mb-2 block text-xs font-semibold text-stone-500">운영 기준 날짜</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
        <button
          type="button"
          aria-label="전날 운영 요약 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          <ChevronLeft size={18} />
        </button>

        <label className="relative flex min-h-11 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border border-[#C9D6E2] bg-white px-3 text-left text-sm font-semibold text-stone-900 transition hover:border-[#315C7C] hover:bg-[#EAF1F8] focus-within:border-[#315C7C] focus-within:ring-2 focus-within:ring-[#C9D6E2]">
          <CalendarDays size={17} className="shrink-0 text-[#315C7C]" />
          <span className="min-w-0 flex-1 truncate tabular-nums">
            {formatHomeDate(value)}
          </span>
          <span className="shrink-0 text-xs font-semibold text-[#315C7C]">
            달력 선택
          </span>
          <input
            type="date"
            value={value}
            aria-label="운영 기준 날짜 선택"
            onChange={(event) => {
              if (event.target.value) {
                onChange(event.target.value);
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          aria-label="다음날 운영 요약 보기"
          onClick={() => onChange(shiftDate(value, 1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function MobileHeroMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warm";
}) {
  return (
    <div
      className={[
        "rounded-2xl px-3 py-3 backdrop-blur",
        tone === "warm" ? "bg-[#FFEFDD] text-[#7D3A15]" : "bg-white/20 text-white",
      ].join(" ")}
    >
      <p className={["text-xs font-bold", tone === "warm" ? "text-[#A0531D]" : "text-white/78"].join(" ")}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function MobileActionCard({
  icon,
  iconSrc,
  title,
  description,
  tone,
  onClick,
}: {
  icon: ReactNode;
  iconSrc?: string;
  title: string;
  description: string;
  tone: "coral" | "violet" | "mint" | "amber";
  onClick: () => void;
}) {
  const toneClass = {
    coral: "bg-[#FF714D] text-white shadow-[0_12px_28px_rgba(255,113,77,0.22)]",
    violet: "bg-[#8387F5] text-white shadow-[0_12px_28px_rgba(103,107,230,0.20)]",
    mint: "bg-[#087A61] text-white shadow-[0_12px_28px_rgba(8,122,97,0.20)]",
    amber: "bg-[#FFB65C] text-[#3B2507] shadow-[0_12px_28px_rgba(255,182,92,0.20)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group min-h-[7.2rem] overflow-hidden rounded-[1.35rem] p-3 text-left transition active:scale-[0.98]",
        toneClass,
      ].join(" ")}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-white/20">
          {iconSrc ? (
            <Image
              src={iconSrc}
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
              style={{ width: 28, height: 28 }}
            />
          ) : (
            icon
          )}
        </span>
        <ArrowRight size={16} className="mt-1 transition group-active:translate-x-0.5" />
      </span>
      <span className="mt-4 block text-lg font-black leading-none">{title}</span>
      <span className="mt-1.5 block text-xs font-bold opacity-[0.82]">{description}</span>
    </button>
  );
}

function TodayScheduleSection({
  items,
  summary,
  selectedDate,
  isStaffHome = false,
  className = "",
  onNavigate,
}: {
  items: HomeScheduleItem[];
  summary: HomeScheduleSummary;
  selectedDate: string;
  isStaffHome?: boolean;
  className?: string;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const [isBlockedSheetOpen, setIsBlockedSheetOpen] = useState(false);
  const [blockedFilter, setBlockedFilter] = useState<BlockedScheduleFilter>("all");
  const [blockedQuery, setBlockedQuery] = useState("");
  const academyItems = items.filter(isAcademyScheduleItem);
  const blockedItems = items.filter(isBlockedScheduleItem);
  const blockedCounts = getBlockedScheduleCounts(blockedItems);
  const visibleAcademyItems = academyItems.slice(0, 6);
  const hiddenAcademyCount = Math.max(0, academyItems.length - visibleAcademyItems.length);
  const visibleBlockedItems = blockedItems.slice(0, 2);
  const hiddenBlockedCount = Math.max(0, blockedItems.length - visibleBlockedItems.length);
  const hasAnySchedule = academyItems.length > 0 || blockedItems.length > 0;
  const hasBlockedSchedules = blockedItems.length > 0;
  const academyScheduleLabel = isStaffHome ? "담당 수업" : "학원 일정";
  const academyScheduleDescription = isStaffHome ? "내 수업 출석 체크" : "출석 체크";

  return (
    <section
      aria-label="오늘 일정"
      className={[
        "overflow-hidden rounded-[1.5rem] border border-[#E6E0D5] bg-white shadow-[0_14px_42px_rgba(33,32,30,0.08)] sm:rounded-lg sm:shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="border-b border-stone-100 px-4 py-3.5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#315C7C]">
              오늘 일정
            </p>
            <h3 className="mt-1 text-lg font-black leading-tight text-stone-950 sm:text-xl">
              {formatHomeDate(selectedDate)} 시간순
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-[#EAF1F8] px-2.5 py-1 text-xs font-bold text-[#315C7C]">
            {isStaffHome ? "담당 " : ""}수업 {summary.academyScheduleCount} · 공유일정{" "}
            {summary.blockedScheduleCount}
          </span>
        </div>
      </div>

      {!hasAnySchedule ? (
        <div className="px-4 py-5 text-sm leading-6 text-stone-600 sm:px-5">
          {isStaffHome
            ? "이 날짜에는 담당 수업이 없습니다. 담당 반 배정이나 수업 시간이 맞는지 원장에게 확인해 주세요."
            : "이 날짜에는 학원 일정이 없습니다. 관리 탭에서 수업 시간이나 타 학원 일정을 등록하면 여기에 표시됩니다."}
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          <div className="px-4 py-2.5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-stone-950">{academyScheduleLabel}</p>
                <p className="mt-0.5 text-xs font-medium text-stone-500">
                  {academyScheduleDescription}
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-black text-stone-600">
                {academyItems.length}개
              </span>
            </div>
          </div>
          {visibleAcademyItems.length === 0 ? (
            <div className="px-4 pb-4 text-sm leading-6 text-stone-500 sm:px-5">
              {isStaffHome
                ? "담당 수업이 없습니다. 다른 날짜를 보거나 담당 반 배정을 확인해 주세요."
                : `${academyScheduleLabel}이 없습니다. 수업 시간 등록 후 출석 체크를 시작할 수 있습니다.`}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {visibleAcademyItems.map((item) => (
                <TodayScheduleRow key={item.id} item={item} onNavigate={onNavigate} />
              ))}
              {hiddenAcademyCount > 0 ? (
                <div className="bg-[#FBFAF7] px-4 py-3 text-center text-xs font-bold text-stone-500 sm:px-5">
                  그 외 학원 일정 {hiddenAcademyCount}건은 출석/관리 화면에서 확인하세요.
                </div>
              ) : null}
            </div>
          )}

          {hasBlockedSchedules ? (
            <div className="bg-[#FFFDF8]">
              <div className="border-t border-[#F1E7D6] px-4 py-2.5 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#7A4A08]">공유된 타 학원 일정</p>
                    <p className="mt-0.5 text-xs font-medium text-[#98610F]">보강 시간에서 제외됩니다</p>
                  </div>
                  <span className="rounded-full bg-[#FFECC7] px-2 py-1 text-[11px] font-black text-[#8A5206]">
                    {blockedItems.length}건
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <BlockedSummaryChip label="공유됨" count={blockedCounts.shared} />
                  <BlockedSummaryChip label="직접등록" count={blockedCounts.manual} />
                  <BlockedSummaryChip label="개인" count={blockedCounts.personal} />
                </div>
              </div>
              <div className="divide-y divide-[#F5E3C7]">
                {visibleBlockedItems.map((item) => (
                  <TodayScheduleRow
                    key={item.id}
                    item={item}
                    onNavigate={onNavigate}
                    variant="blocked"
                  />
                ))}
                {hiddenBlockedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsBlockedSheetOpen(true)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 text-center text-xs font-black text-[#7A4A08] transition active:bg-[#FFF7EA] sm:px-5"
                  >
                    전체 보기
                    <span className="rounded-full bg-[#FFECC7] px-2 py-0.5 text-[11px]">
                      +{hiddenBlockedCount}건
                    </span>
                  </button>
                ) : null}
                {summary.sharedCount > 0 ? (
                  <div className="border-t border-[#F1E7D6] px-4 py-2.5 text-[11px] font-semibold text-[#98610F] sm:px-5">
                    공유된 일정은 상대 학원명과 전화번호 없이 시간만 표시됩니다.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
      {isBlockedSheetOpen ? (
        <BlockedScheduleSheet
          items={blockedItems}
          selectedDate={selectedDate}
          filter={blockedFilter}
          query={blockedQuery}
          onFilterChange={setBlockedFilter}
          onQueryChange={setBlockedQuery}
          onClose={() => setIsBlockedSheetOpen(false)}
        />
      ) : null}
    </section>
  );
}

function BlockedSummaryChip({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[11px] font-black text-[#8A5206] ring-1 ring-[#F3DEB7]">
      {label}
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

function BlockedScheduleSheet({
  items,
  selectedDate,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onClose,
}: {
  items: HomeScheduleItem[];
  selectedDate: string;
  filter: BlockedScheduleFilter;
  query: string;
  onFilterChange: (filter: BlockedScheduleFilter) => void;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}) {
  const normalizedQuery = normalizeText(query);
  const filteredItems = items.filter((item) => {
    const category = getBlockedScheduleCategory(item);
    const matchesFilter = filter === "all" || category === filter;
    if (!matchesFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return normalizeText(getBlockedScheduleStudentName(item)).includes(normalizedQuery);
  });
  const filterOptions: Array<{ value: BlockedScheduleFilter; label: string }> = [
    { value: "all", label: "전체" },
    { value: "shared", label: "공유됨" },
    { value: "manual", label: "직접등록" },
    { value: "personal", label: "개인" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-stone-950/35 px-0 sm:items-center sm:justify-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-schedule-sheet-title"
    >
      <div className="max-h-[82vh] w-full overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-18px_48px_rgba(28,25,23,0.25)] sm:max-w-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#98610F]">
              {formatHomeDate(selectedDate)}
            </p>
            <h4
              id="blocked-schedule-sheet-title"
              className="mt-1 text-lg font-black text-stone-950"
            >
              공유된 타 학원 일정
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="공유 일정 전체 보기 닫기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition active:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 border-b border-stone-100 px-4 py-3">
          <label className="block">
            <span className="sr-only">학생명으로 공유 일정 검색</span>
            <span className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-700">
              <Search size={16} className="shrink-0 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="학생명 검색"
                className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-stone-400"
              />
            </span>
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="공유 일정 필터">
            {filterOptions.map((option) => {
              const isActive = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFilterChange(option.value)}
                  className={[
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition",
                    isActive
                      ? "bg-stone-950 text-white"
                      : "bg-stone-100 text-stone-600 active:bg-stone-200",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {filteredItems.map((item) => (
                <BlockedScheduleSheetRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm font-semibold text-stone-500">
              조건에 맞는 공유 일정이 없습니다. 학생명이나 필터를 바꿔 다시 확인해 주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockedScheduleSheetRow({ item }: { item: HomeScheduleItem }) {
  return (
    <div className="flex min-h-[4.25rem] items-start gap-3 px-4 py-3">
      <div className="w-[4.35rem] shrink-0 pt-0.5">
        <p className="text-base font-black tabular-nums text-stone-950">{item.startTime}</p>
        <p className="text-xs font-semibold tabular-nums text-stone-400">{item.endTime}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-black text-stone-950">
            {getBlockedScheduleStudentName(item)}
          </p>
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black",
              getBlockedScheduleBadgeTone(item),
            ].join(" ")}
          >
            {getBlockedScheduleBadgeLabel(item)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-stone-500">
          {getBlockedScheduleDetail(item)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[#FFECC7] px-2.5 py-1 text-[11px] font-black text-[#7A4A08]">
        보강 제외
      </span>
    </div>
  );
}

function TodayScheduleRow({
  item,
  onNavigate,
  variant = "academy",
}: {
  item: HomeScheduleItem;
  onNavigate: (view: WorkspaceView) => void;
  variant?: "academy" | "blocked";
}) {
  const isBlockedSchedule = isBlockedScheduleItem(item);
  const isRegularAcademyClass = !isBlockedSchedule && item.scheduleType === "regular_class";
  const badgeLabel = isBlockedSchedule
    ? getBlockedScheduleBadgeLabel(item)
    : scheduleTypeLabel(item.scheduleType);
  const badgeTone = isBlockedSchedule
    ? getBlockedScheduleBadgeTone(item)
    : scheduleTypeTone(item.scheduleType);
  const detailLabel = isBlockedSchedule
    ? getBlockedScheduleDetail(item)
    : item.subtitle || item.className || "일정";
  const actionLabel = item.canOpenAttendance ? "출석 보기" : isBlockedSchedule ? "보강 제외" : "읽기 전용";
  const attendanceLabel = `${item.title} 출석 보기`;
  const rowClassName =
    variant === "blocked" || isBlockedSchedule
      ? "flex min-h-[3.75rem] w-full items-start gap-3 bg-[#FFFDF8] px-4 py-2.5 text-left sm:px-5"
      : "flex min-h-[4rem] w-full items-center gap-2.5 px-4 py-2.5 text-left sm:px-5";
  const actionClassName = item.canOpenAttendance
    ? "bg-stone-950 text-white"
    : isBlockedSchedule
    ? "bg-[#FFECC7] text-[#7A4A08]"
    : "bg-stone-100 text-stone-500";

  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="mt-0.5 flex w-[4.1rem] shrink-0 flex-col text-left">
          <span className="text-base font-black tabular-nums text-stone-950">
            {item.startTime}
          </span>
          <span className="text-xs font-semibold tabular-nums text-stone-400">
            {item.endTime}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-black text-stone-950">
              {item.title}
            </span>
            {!isRegularAcademyClass ? (
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black",
                  badgeTone,
                ].join(" ")}
              >
                {badgeLabel}
              </span>
            ) : null}
          </span>
          <span className="mt-1 block truncate text-xs font-medium text-stone-500">
            {detailLabel}
            {item.studentCount ? ` · ${item.studentCount}명` : ""}
          </span>
        </span>
      </span>
      {item.canOpenAttendance ? (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white shadow-sm"
        >
          <ClipboardCheck size={18} strokeWidth={2.4} />
        </span>
      ) : (
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
            actionClassName,
          ].join(" ")}
        >
          {actionLabel}
        </span>
      )}
    </>
  );

  if (item.canOpenAttendance) {
    return (
      <button
        type="button"
        aria-label={attendanceLabel}
        onClick={() => onNavigate("attendance")}
        className={`${rowClassName} transition active:bg-stone-50`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName}>
      {content}
    </div>
  );
}

function MobileSummaryButton({
  label,
  value,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  isActive: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    default: "bg-[#EEF8F2] text-[#087A61]",
    danger: "bg-[#FFF0E8] text-[#B64C1E]",
    success: "bg-[#EEF1FF] text-[#555CD8]",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98]",
        isActive ? "border-stone-950 bg-stone-950 text-white" : `border-transparent ${toneClass}`,
      ].join(" ")}
    >
      <span className="block text-xs font-black">{label}</span>
      <span className="mt-1 block text-2xl font-black tabular-nums">{value}</span>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black">
        보기
        <ArrowRight size={12} />
      </span>
    </button>
  );
}

function MobileFollowupRow({
  item,
  onStudentSelect,
}: {
  item: HomeFollowupItem;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const isSent = item.followupStatus === "sent";

  return (
    <button
      type="button"
      onClick={() =>
        onStudentSelect({
          classId: item.classId,
          studentId: item.student.id,
          reason: followupReasonForStatus(item.status),
        })
      }
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition active:bg-stone-50"
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-black text-stone-950">
            {item.student.name}
          </span>
          <span className={["shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black", statusTone(item.status)].join(" ")}>
            {attendanceStatusLabels[item.status]}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm font-medium text-stone-600">
          {item.className} · {item.startTime}-{item.endTime}
        </span>
        <span className="mt-1 block text-xs font-medium text-stone-500">
          {isSent ? "연락 완료" : item.followupStatus === "draft" ? "기록 저장" : "연락 필요"}
        </span>
      </span>
      <span className="mt-1 flex size-9 items-center justify-center rounded-full bg-[#F2F7F0] text-[#087A61]">
        <ArrowRight size={15} />
      </span>
    </button>
  );
}

function HomeEmptyState({
  selectedDate,
  onDateChange,
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const isToday = selectedDate === getTodayDate();

  return (
    <div className="border-b border-stone-200 px-4 py-5 sm:px-5">
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-stone-950">
          이 날짜에는 출석/연락 기록이 없습니다.
        </p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          {formatHomeDate(selectedDate)} 기준으로 처리할 기록이 없습니다. 날짜를 이동하거나 출석 탭에서 수업을 먼저 체크해 주세요.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {isToday ? (
            <button
              type="button"
              onClick={() => onDateChange(shiftDate(getTodayDate(), -1))}
              className="min-h-10 rounded-md border border-[#C9D6E2] bg-white px-4 text-sm font-semibold text-[#315C7C] transition hover:bg-[#EAF1F8]"
            >
              어제 기록 보기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDateChange(getTodayDate())}
            className="min-h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            오늘로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeActionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[4.75rem] w-full items-center gap-3 border-b border-stone-100 bg-white px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C9D6E2] sm:px-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#EAF1F8] text-[#315C7C]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-stone-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-stone-600">{description}</span>
      </span>
      <ArrowRight
        size={17}
        className="shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#315C7C]"
      />
    </button>
  );
}

function SummaryButton({
  label,
  value,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  isActive: boolean;
  onClick: () => void;
}) {
  const valueClass = {
    default: "text-stone-950",
    danger: "text-red-700",
    success: "text-[#315C7C]",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        isActive
          ? "border-[#315C7C] bg-[#EAF1F8]"
          : "border-stone-300 bg-white hover:border-[#315C7C] hover:bg-[#F8FAFC]",
      ].join(" ")}
    >
      <span className="block text-xs font-medium text-stone-500">{label}</span>
      <span className={`mt-1 block text-xl font-semibold ${valueClass}`}>{value}</span>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#315C7C]">
        목록 보기
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function HomeFollowupRow({
  item,
  onStudentSelect,
}: {
  item: HomeFollowupItem;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const isSent = item.followupStatus === "sent";

  return (
    <article className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-950">
            {item.student.name}
          </p>
          <span
            className={[
              "rounded-md px-2 py-1 text-xs font-semibold",
              statusTone(item.status),
            ].join(" ")}
          >
            {attendanceStatusLabels[item.status]}
          </span>
          <span
            className={[
              "rounded-md px-2 py-1 text-xs font-semibold",
              isSent ? "bg-[#EAF1F8] text-[#244B67]" : "bg-amber-50 text-amber-800",
            ].join(" ")}
          >
            {isSent ? "연락 완료" : item.followupStatus === "draft" ? "기록 저장" : "연락 필요"}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {item.className} · {item.student.gradeLabel ?? "학년 미지정"}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <Clock3 size={13} />
          {item.startTime} - {item.endTime}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() =>
            onStudentSelect({
              classId: item.classId,
              studentId: item.student.id,
              reason: followupReasonForStatus(item.status),
            })
          }
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#C9D6E2] bg-white px-3 text-xs font-semibold text-[#315C7C] transition hover:bg-[#EAF1F8] focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          문자 작성
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}

function getRoleHomeCopy({
  academyName,
  teacherName,
  role,
  roleLabel,
}: {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
}) {
  if (role === "teacher") {
    return {
      title: `${teacherName} 선생님, 오늘 수업을 확인하세요.`,
      description:
        "담당 반의 출석을 체크하고 수업 후 필요한 학부모 연락을 바로 이어갈 수 있습니다.",
    };
  }

  if (role === "assistant") {
    return {
      title: `${teacherName} 보조 선생님, 출석 체크부터 시작하세요.`,
      description:
        "담당 수업의 도착 여부와 확인 필요 학생을 먼저 정리하면 원장과 선생님이 바로 후속 연락을 할 수 있습니다.",
    };
  }

  return {
    title: "오늘 학원 운영 요약",
    description: `${teacherName} ${roleLabel}님이 ${academyName}의 출석, 연락, 학생 관리를 한곳에서 시작할 수 있습니다.`,
  };
}

function buildHomeFollowupItems(
  classes: OperationsClass[],
  records: AttendanceRecordItem[],
): HomeFollowupItem[] {
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));

  return records
    .filter((record) => isAttendanceStatus(record.status))
    .filter((record) => actionableStatuses.includes(record.status as AttendanceStatus))
    .map((record) => {
      const classItem = classMap.get(record.classId);
      const student = classItem?.students.find((item) => item.id === record.studentId);

      if (!classItem || !student) {
        return null;
      }

      return {
        key: record.id,
        className: classItem.name,
        classId: classItem.id,
        student,
        status: record.status as AttendanceStatus,
        startTime: record.scheduledStartTime,
        endTime: record.scheduledEndTime,
        followupStatus: record.followupStatus,
        followupSentAt: record.followupSentAt,
      };
    })
    .filter((item): item is HomeFollowupItem => Boolean(item))
    .sort((a, b) => {
      if (a.followupStatus === "sent" && b.followupStatus !== "sent") {
        return 1;
      }

      if (a.followupStatus !== "sent" && b.followupStatus === "sent") {
        return -1;
      }

      return `${a.startTime}-${a.student.name}`.localeCompare(`${b.startTime}-${b.student.name}`);
    });
}

function buildPcStudentBoardRows({
  classes,
  records,
  scheduleItems,
  selectedDate,
}: {
  classes: OperationsClass[];
  records: AttendanceRecordItem[];
  scheduleItems: HomeScheduleItem[];
  selectedDate: string;
}): PcStudentBoardRow[] {
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const blockedStudentIds = new Set(
    scheduleItems
      .filter(isBlockedScheduleItem)
      .map((item) => item.studentId)
      .filter((studentId): studentId is string => Boolean(studentId)),
  );

  return scheduleItems
    .filter((item) => item.canOpenAttendance && item.classId)
    .flatMap((item) => {
      const classItem = classMap.get(item.classId ?? "");

      if (!classItem) {
        return [];
      }

      return classItem.students.map((student) => {
        const record = records.find(
          (candidate) =>
            candidate.attendanceDate === selectedDate &&
            candidate.classId === classItem.id &&
            candidate.studentId === student.id &&
            candidate.scheduledStartTime === item.startTime &&
            candidate.scheduledEndTime === item.endTime,
        );
        const status = isAttendanceStatus(record?.status)
          ? (record?.status as AttendanceStatus)
          : "pending";

        return {
          key: `${item.id}:${student.id}`,
          classId: classItem.id,
          className: classItem.name,
          subject: classItem.subject,
          gradeLabel: classItem.gradeLabel,
          student,
          status,
          startTime: item.startTime,
          endTime: item.endTime,
          followupStatus: record?.followupStatus ?? null,
          followupSentAt: record?.followupSentAt ?? null,
          hasBlockedSchedule: blockedStudentIds.has(student.id),
        };
      });
    })
    .sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.className.localeCompare(second.className, "ko") ||
        first.student.name.localeCompare(second.student.name, "ko"),
    );
}

function summarizePcStudentBoardRows(rows: PcStudentBoardRow[]) {
  const summary = {
    unchecked: 0,
    present: 0,
    late: 0,
    absent: 0,
    needsCheck: 0,
    makeup: 0,
    attention: 0,
  };

  rows.forEach((row) => {
    if (row.status === "pending") {
      summary.unchecked += 1;
    }

    if (row.status === "present") {
      summary.present += 1;
    }

    if (row.status === "late") {
      summary.late += 1;
    }

    if (row.status === "absent") {
      summary.absent += 1;
    }

    if (row.status === "needs_check") {
      summary.needsCheck += 1;
    }

    if (row.status === "makeup") {
      summary.makeup += 1;
    }

    if (isAttentionStatus(row.status) && row.followupStatus !== "sent") {
      summary.attention += 1;
    }
  });

  return summary;
}

function filterPcStudentBoardRows(
  rows: PcStudentBoardRow[],
  filter: PcStudentBoardFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "unchecked") {
    return rows.filter((row) => row.status === "pending");
  }

  if (filter === "attention") {
    return rows.filter((row) => isAttentionStatus(row.status) && row.followupStatus !== "sent");
  }

  if (filter === "needs_check") {
    return rows.filter((row) => row.status === "needs_check");
  }

  return rows.filter((row) => row.status === filter);
}

function filterScheduleItemsForDate(items: HomeScheduleItem[], dateValue: string) {
  const dayOfWeek = getDayOfWeek(dateValue);

  return items
    .filter((item) => item.scheduleDate === dateValue || (!item.scheduleDate && item.dayOfWeek === dayOfWeek))
    .sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.endTime.localeCompare(second.endTime) ||
        first.title.localeCompare(second.title, "ko"),
    );
}

function buildHomeScheduleSummary(items: HomeScheduleItem[], dateValue: string): HomeScheduleSummary {
  const filteredItems = filterScheduleItemsForDate(items, dateValue);
  const manualExternalCount = filteredItems.filter((item) => item.kind === "manual_external_class").length;
  const sharedCount = filteredItems.filter((item) => item.isShared).length;
  const blockedScheduleCount = filteredItems.filter(isBlockedScheduleItem).length;

  return {
    academyScheduleCount: filteredItems.length - blockedScheduleCount,
    classSessionCount: filteredItems.filter((item) => item.kind === "class_session").length,
    manualExternalCount,
    sharedCount,
    blockedScheduleCount,
    totalCount: filteredItems.length,
  };
}

function isBlockedScheduleItem(item: HomeScheduleItem) {
  return item.kind === "manual_external_class" || item.isShared || item.scheduleType === "external";
}

function isAcademyScheduleItem(item: HomeScheduleItem) {
  return !isBlockedScheduleItem(item);
}

function getBlockedScheduleCategory(item: HomeScheduleItem): Exclude<BlockedScheduleFilter, "all"> {
  if (item.isShared) {
    return "shared";
  }

  if (item.kind === "manual_external_class") {
    return "manual";
  }

  return "personal";
}

function getBlockedScheduleCounts(items: HomeScheduleItem[]) {
  return items.reduce(
    (counts, item) => {
      counts[getBlockedScheduleCategory(item)] += 1;
      return counts;
    },
    { shared: 0, manual: 0, personal: 0 },
  );
}

function getBlockedScheduleBadgeLabel(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "공유됨";
  }

  if (category === "manual") {
    return "직접등록";
  }

  return "개인";
}

function getBlockedScheduleBadgeTone(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "bg-[#EAF1F8] text-[#315C7C]";
  }

  if (category === "manual") {
    return "bg-[#FFF4E4] text-[#A05A00]";
  }

  return "bg-stone-100 text-stone-700";
}

function getBlockedScheduleDetail(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "연결 학원 수업 · 학원명 비공개";
  }

  if (category === "manual") {
    return `${item.subtitle || "타 학원 수업"} · 타 학원 수업`;
  }

  return `${item.subtitle || "개인/기타 일정"} · 개인 일정`;
}

function getBlockedScheduleStudentName(item: HomeScheduleItem) {
  return item.studentName || item.title;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function getFilteredItems(items: HomeFollowupItem[], filter: FollowupFilter | null) {
  if (filter === "unsent") {
    return items.filter((item) => item.followupStatus !== "sent");
  }

  if (filter === "sent") {
    return items.filter((item) => item.followupStatus === "sent");
  }

  return filter === "all" ? items : [];
}

function filterLabel(filter: FollowupFilter) {
  const labels: Record<FollowupFilter, string> = {
    all: "확인할 학생",
    unsent: "연락 필요",
    sent: "연락 완료",
  };

  return labels[filter];
}

function statusTone(status: AttendanceStatus) {
  if (status === "absent") {
    return "bg-red-50 text-red-700";
  }

  if (status === "late" || status === "needs_check") {
    return "bg-amber-50 text-amber-800";
  }

  if (status === "present") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "pending") {
    return "bg-stone-100 text-stone-700";
  }

  return "bg-violet-50 text-violet-800";
}

function selectedChipTone(tone: "default" | "blue" | "green" | "amber" | "red" | "violet") {
  const tones = {
    default: "border-stone-900 bg-stone-900 text-white",
    blue: "border-[#315C7C] bg-[#315C7C] text-white",
    green: "border-emerald-700 bg-emerald-700 text-white",
    amber: "border-amber-700 bg-amber-700 text-white",
    red: "border-red-700 bg-red-700 text-white",
    violet: "border-violet-700 bg-violet-700 text-white",
  };

  return tones[tone];
}

function attendanceDisplayLabel(status: AttendanceStatus) {
  if (status === "pending") {
    return "체크 필요";
  }

  return attendanceStatusLabels[status];
}

function isAttentionStatus(status: AttendanceStatus) {
  return status === "late" || status === "absent" || status === "needs_check";
}

function scheduleTypeLabel(scheduleType: string) {
  const labels: Record<string, string> = {
    regular_class: "정규",
    makeup: "보강",
    external: "개인/기타",
    manual_external_class: "타 학원",
    consultation: "상담",
  };

  return labels[scheduleType] ?? scheduleType;
}

function scheduleTypeTone(scheduleType: string) {
  const tones: Record<string, string> = {
    regular_class: "bg-blue-50 text-blue-800",
    makeup: "bg-[#EAF1F8] text-[#244B67]",
    external: "bg-stone-100 text-stone-700",
    manual_external_class: "bg-amber-50 text-amber-800",
    consultation: "bg-violet-50 text-violet-800",
  };

  return tones[scheduleType] ?? "bg-stone-100 text-stone-700";
}

function followupReasonForStatus(status: AttendanceStatus): FollowupReason {
  if (status === "late") {
    return "late";
  }

  if (status === "makeup") {
    return "makeup";
  }

  if (status === "needs_check") {
    return "consultation";
  }

  return "absence";
}

function formatHomeDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  return date.getDay();
}

function shiftDate(dateValue: string, amount: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const nextDay = `${date.getDate()}`.padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}
