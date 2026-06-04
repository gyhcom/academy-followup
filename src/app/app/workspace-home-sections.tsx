"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import type { FollowupReason } from "@/lib/followup-templates";
import type {
  BlockedScheduleFilter,
  FollowupFilter,
  HomeCopy,
  HomeFollowupItem,
  HomeScheduleItem,
  HomeScheduleSummary,
  WorkspaceView,
} from "@/app/app/workspace-home-types";
import {
  attendanceStatusLabels,
  filterLabel,
  followupReasonForStatus,
  formatHomeDate,
  getBlockedScheduleBadgeLabel,
  getBlockedScheduleCategory,
  getBlockedScheduleCounts,
  getBlockedScheduleDetail,
  getBlockedScheduleStudentName,
  getFilteredItems,
  getTodayDate,
  isAcademyScheduleItem,
  isBlockedScheduleItem,
  normalizeText,
  scheduleTypeLabel,
  shiftDate,
  statusTone,
} from "@/app/app/workspace-home-utils";

export function HomeHero({
  academyName,
  copy,
  canManage,
  followupCount,
  unsentCount,
  scheduleSummary,
  onNavigate,
  onShowTargets,
}: {
  academyName: string;
  copy: HomeCopy;
  canManage: boolean;
  followupCount: number;
  unsentCount: number;
  scheduleSummary: HomeScheduleSummary;
  onNavigate: (view: WorkspaceView) => void;
  onShowTargets: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-slate-900 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)]">
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-100">{academyName}</p>
          <h2 className="mt-3 max-w-3xl text-[2.45rem] font-black leading-[1.08] tracking-tight sm:text-4xl">
            오늘 연락해야 할 학생이 {followupCount}명 있습니다
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            수업 후 출석 상태를 확인하고 학부모 문자 초안을 처리하세요.
          </p>
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-blue-200">{copy.description}</p>
        </div>

        <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur sm:p-3">
          <div className="grid grid-cols-2 gap-2">
            <HeroMiniMetric label="미발송" value={`${unsentCount}명`} tone="warning" />
            <HeroMiniMetric label="오늘 수업" value={`${scheduleSummary.academyScheduleCount}개`} />
          </div>
          <div className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-blue-100">
            공유/직접등록 보강 제외 일정 {scheduleSummary.blockedScheduleCount}건
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-white/8 p-3 sm:grid-cols-[1.2fr_1fr_auto_auto]">
        <button
          type="button"
          onClick={() => onNavigate("operations")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          <MessageSquareText size={18} />
          수업 후 문자 보내기
        </button>
        <button
          type="button"
          onClick={() => onNavigate("attendance")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          <ClipboardCheck size={18} />
          출석 체크하기
        </button>
        {canManage ? (
          <button
            type="button"
            onClick={() => onNavigate("management")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950/25 px-4 text-sm font-bold text-white transition hover:bg-slate-950/35 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <Settings size={17} />
            학생/반 관리
          </button>
        ) : null}
        <button
          type="button"
          onClick={onShowTargets}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950/25 px-4 text-sm font-bold text-white transition hover:bg-slate-950/35 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          <Users size={17} />
          대상 학생 보기
        </button>
      </div>
    </section>
  );
}

function HeroMiniMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={["rounded-xl px-3 py-3", tone === "warning" ? "bg-amber-300 text-amber-950" : "bg-white/15 text-white"].join(" ")}>
      <p className="text-xs font-bold opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

export function TodayKpiCards({
  followupCount,
  unsentCount,
  sentCount,
  scheduleSummary,
}: {
  followupCount: number;
  unsentCount: number;
  sentCount: number;
  scheduleSummary: HomeScheduleSummary;
}) {
  const cards = [
    { label: "오늘 문자 대상", value: `${followupCount}명`, hint: "중복 수강생 제외 기준", tone: "blue" as const },
    { label: "미발송", value: `${unsentCount}명`, hint: "아직 학부모 연락 전", tone: "amber" as const },
    { label: "발송 완료", value: `${sentCount}명`, hint: "문자 저장 완료", tone: "emerald" as const },
    { label: "오늘 수업", value: `${scheduleSummary.academyScheduleCount}개`, hint: "출석 체크 대상", tone: "slate" as const },
    { label: "보강 제외", value: `${scheduleSummary.blockedScheduleCount}건`, hint: "공유/직접등록 일정 포함", tone: "violet" as const },
  ];

  return (
    <section aria-label="오늘 핵심 지표" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <StatusBadge tone={card.tone}>{card.label}</StatusBadge>
          <p className="mt-3 text-2xl font-black tabular-nums text-slate-950">{card.value}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}

export function HomeDateControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mb-2 block text-xs font-bold text-slate-500">운영 기준 날짜</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
        <button
          type="button"
          aria-label="전날 운영 요약 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <ChevronLeft size={18} />
        </button>

        <label className="relative flex min-h-11 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-blue-100 bg-blue-50 px-3 text-left text-sm font-black text-slate-950 transition hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-200">
          <CalendarDays size={17} className="shrink-0 text-blue-700" />
          <span className="min-w-0 flex-1 truncate tabular-nums">{formatHomeDate(value)}</span>
          <span className="shrink-0 text-xs font-bold text-blue-700">달력 선택</span>
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
          className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

export function TodayScheduleSection({
  items,
  summary,
  selectedDate,
  isStaffHome = false,
  onNavigate,
}: {
  items: HomeScheduleItem[];
  summary: HomeScheduleSummary;
  selectedDate: string;
  isStaffHome?: boolean;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const academyItems = items.filter(isAcademyScheduleItem);
  const visibleItems = academyItems.slice(0, 6);
  const hiddenCount = Math.max(0, academyItems.length - visibleItems.length);
  const title = isStaffHome ? "담당 수업" : "오늘 학원 일정";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{title}</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">
            {formatHomeDate(selectedDate)} 시간순
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">출석 체크 대상 수업입니다.</p>
        </div>
        <StatusBadge tone="blue">{summary.academyScheduleCount}개</StatusBadge>
      </div>

      {visibleItems.length === 0 ? (
        <div className="px-4 py-8 text-sm font-semibold leading-6 text-slate-500 sm:px-5">
          이 날짜에는 표시할 {isStaffHome ? "담당 수업" : "학원 일정"}이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item) => (
            <ScheduleCard key={item.id} item={item} onNavigate={onNavigate} />
          ))}
          {hiddenCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="text-xs font-bold text-slate-500">
                나머지 {hiddenCount}개 수업은 출석 화면에서 확인할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("attendance")}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-950 px-3 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                전체 수업 보기
                <ArrowRight size={13} />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ScheduleCard({
  item,
  onNavigate,
}: {
  item: HomeScheduleItem;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const isRegular = item.scheduleType === "regular_class";
  const attendanceLabel = `${item.title} 출석 보기`;

  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.75rem] gap-3 px-4 py-3.5 sm:grid-cols-[6rem_minmax(0,1fr)_3rem] sm:px-5">
      <div className="pt-0.5">
        <p className="text-base font-black tabular-nums text-slate-950">{item.startTime}</p>
        <p className="text-xs font-bold tabular-nums text-slate-400">{item.endTime}</p>
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h4 className="truncate text-base font-black text-slate-950">{item.title}</h4>
          {!isRegular ? <StatusBadge tone="emerald">{scheduleTypeLabel(item.scheduleType)}</StatusBadge> : null}
          <StatusBadge tone="blue">출석 체크</StatusBadge>
          <StatusBadge tone="amber">문자 전</StatusBadge>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-500">
          {item.subtitle || item.className || "수업"}
          {item.studentCount ? ` · ${item.studentCount}명` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label={attendanceLabel}
        onClick={() => onNavigate("attendance")}
        className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <ClipboardCheck size={18} strokeWidth={2.4} />
      </button>
    </article>
  );
}

export function SharedSchedulePanel({
  items,
  summary,
  selectedDate,
}: {
  items: HomeScheduleItem[];
  summary: HomeScheduleSummary;
  selectedDate: string;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filter, setFilter] = useState<BlockedScheduleFilter>("all");
  const [query, setQuery] = useState("");
  const blockedItems = items.filter(isBlockedScheduleItem);
  const visibleItems = blockedItems.slice(0, 2);
  const hiddenCount = Math.max(0, blockedItems.length - visibleItems.length);
  const counts = getBlockedScheduleCounts(blockedItems);

  if (blockedItems.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">공유된 타 학원 일정</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">보강 시간에서 제외됩니다</h3>
          </div>
          <StatusBadge tone="violet">{summary.blockedScheduleCount}건</StatusBadge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusBadge tone="violet">공유됨 {counts.shared}</StatusBadge>
          <StatusBadge tone="slate">직접등록 {counts.manual}</StatusBadge>
          <StatusBadge tone="slate">개인 {counts.personal}</StatusBadge>
        </div>
      </div>

      <div className="divide-y divide-violet-50">
        {visibleItems.map((item) => (
          <SharedScheduleRow key={item.id} item={item} />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-black text-violet-700 transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-200"
          >
            전체 보기
            <span className="rounded-full bg-violet-100 px-2 py-0.5">+{hiddenCount}건</span>
          </button>
        ) : null}
        {summary.sharedCount > 0 ? (
          <p className="border-t border-violet-100 px-4 py-2.5 text-[11px] font-semibold leading-5 text-violet-700">
            공유된 일정은 상대 학원명과 전화번호 없이 시간만 표시됩니다.
          </p>
        ) : null}
      </div>

      {isSheetOpen ? (
        <BlockedScheduleSheet
          items={blockedItems}
          selectedDate={selectedDate}
          filter={filter}
          query={query}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
          onClose={() => setIsSheetOpen(false)}
        />
      ) : null}
    </section>
  );
}

function SharedScheduleRow({ item }: { item: HomeScheduleItem }) {
  return (
    <article className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-3 px-4 py-3">
      <div>
        <p className="text-base font-black tabular-nums text-slate-950">{item.startTime}</p>
        <p className="text-xs font-bold tabular-nums text-slate-400">{item.endTime}</p>
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-black text-slate-950">{getBlockedScheduleStudentName(item)}</p>
          <StatusBadge tone={getBlockedScheduleCategory(item) === "shared" ? "violet" : "slate"}>
            {getBlockedScheduleBadgeLabel(item)}
          </StatusBadge>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{getBlockedScheduleDetail(item)}</p>
      </div>
      <StatusBadge tone="violet">보강 제외</StatusBadge>
    </article>
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
      className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-schedule-sheet-title"
    >
      <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-[0_-18px_48px_rgba(15,23,42,0.25)] sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{formatHomeDate(selectedDate)}</p>
            <h4 id="blocked-schedule-sheet-title" className="mt-1 text-lg font-black text-slate-950">
              공유된 타 학원 일정
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="공유 일정 전체 보기 닫기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-100 px-4 py-3">
          <label className="block">
            <span className="sr-only">학생명으로 공유 일정 검색</span>
            <span className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="학생명 검색"
                className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-slate-400"
              />
            </span>
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="공유 일정 필터">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition",
                  filter === option.value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <SharedScheduleRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
              조건에 맞는 공유 일정이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickActions({
  canManage,
  onNavigate,
  onShowTargets,
}: {
  canManage: boolean;
  onNavigate: (view: WorkspaceView) => void;
  onShowTargets: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">빠른 시작</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">수업 후 처리할 일을 바로 엽니다.</p>
        </div>
        <StatusBadge tone="slate">오늘</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <QuickActionButton icon={<MessageSquareText size={18} />} title="문자" description="수업 후 연락" isPrimary onClick={() => onNavigate("operations")} />
        <QuickActionButton icon={<ClipboardCheck size={18} />} title="출석" description="도착·지각 체크" onClick={() => onNavigate("attendance")} />
        {canManage ? (
          <QuickActionButton icon={<Settings size={18} />} title="관리" description="학생·반 설정" onClick={() => onNavigate("management")} />
        ) : null}
        <QuickActionButton icon={<Users size={18} />} title="목록" description="대상 학생 보기" onClick={onShowTargets} />
      </div>
    </section>
  );
}

function QuickActionButton({
  icon,
  title,
  description,
  isPrimary = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  isPrimary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group min-h-[5.5rem] rounded-2xl p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200",
        isPrimary
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          : "border border-slate-200 bg-slate-50 text-slate-950 hover:bg-white",
      ].join(" ")}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={["flex size-9 items-center justify-center rounded-xl", isPrimary ? "bg-white/15" : "bg-white text-blue-700"].join(" ")}>
          {icon}
        </span>
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </span>
      <span className="mt-3 block text-base font-black">{title}</span>
      <span className={["mt-1 block text-xs font-bold", isPrimary ? "text-blue-100" : "text-slate-500"].join(" ")}>
        {description}
      </span>
    </button>
  );
}

export function TodaySummaryPanel({
  selectedDate,
  recordsLength,
  loadState,
  followupItems,
  unsentCount,
  sentCount,
  expandedFilter,
  onToggleFilter,
  onCollapse,
  onDateChange,
  onStudentSelect,
}: {
  selectedDate: string;
  recordsLength: number;
  loadState: { status: "idle" | "loading" | "error"; error: string };
  followupItems: HomeFollowupItem[];
  unsentCount: number;
  sentCount: number;
  expandedFilter: FollowupFilter | null;
  onToggleFilter: (filter: FollowupFilter) => void;
  onCollapse: () => void;
  onDateChange: (date: string) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const filteredItems = getFilteredItems(followupItems, expandedFilter);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">오늘 요약</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">{formatHomeDate(selectedDate)}</h3>
          </div>
          {loadState.status === "loading" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
              <Loader2 size={13} className="animate-spin" />
              불러오는 중
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          숫자를 누르면 해당 학생 목록이 펼쳐집니다.
        </p>
        {loadState.status === "error" ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
            {loadState.error}
          </div>
        ) : null}
      </div>

      {recordsLength === 0 && loadState.status !== "loading" ? (
        <HomeEmptyState selectedDate={selectedDate} onDateChange={onDateChange} />
      ) : (
        <div className="grid grid-cols-3 gap-2 p-3">
          <SummaryMetricButton label="오늘 문자 대상" value={`${followupItems.length}`} isActive={expandedFilter === "all"} onClick={() => onToggleFilter("all")} />
          <SummaryMetricButton label="미발송" value={`${unsentCount}`} tone="warning" isActive={expandedFilter === "unsent"} onClick={() => onToggleFilter("unsent")} />
          <SummaryMetricButton label="발송 완료" value={`${sentCount}`} tone="success" isActive={expandedFilter === "sent"} onClick={() => onToggleFilter("sent")} />
        </div>
      )}

      {expandedFilter && recordsLength > 0 ? (
        <div className="border-t border-slate-100">
          <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
            <p className="text-sm font-black text-slate-950">
              {filterLabel(expandedFilter)} {filteredItems.length}명
            </p>
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              접기
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <FollowupRow key={item.key} item={item} onStudentSelect={onStudentSelect} />
              ))
            ) : (
              <p className="px-4 py-5 text-sm leading-6 text-slate-600">
                선택한 조건에 해당하는 학생이 없습니다.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryMetricButton({
  label,
  value,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
  isActive: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-700",
    warning: "bg-amber-50 text-amber-800",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200",
        isActive ? "border-slate-950 bg-slate-950 text-white" : `border-transparent ${toneClass}`,
      ].join(" ")}
    >
      <span className="block text-[11px] font-black leading-4">{label}</span>
      <span className="mt-1 block text-2xl font-black tabular-nums">{value}</span>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black">
        보기
        <ArrowRight size={12} />
      </span>
    </button>
  );
}

function FollowupRow({
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
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
    >
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-base font-black text-slate-950">{item.student.name}</span>
          <StatusBadge className={statusTone(item.status)}>{attendanceStatusLabels[item.status]}</StatusBadge>
          <StatusBadge tone={isSent ? "emerald" : item.followupStatus === "draft" ? "blue" : "amber"}>
            {isSent ? "발송 완료" : item.followupStatus === "draft" ? "기록 저장" : "미발송"}
          </StatusBadge>
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-slate-600">
          {item.className} · {item.startTime}-{item.endTime}
        </span>
      </span>
      <span className="mt-1 flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
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
    <div className="border-b border-slate-100 px-4 py-5">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
        <p className="text-sm font-black text-slate-950">이 날짜에는 출석/연락 기록이 없습니다.</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {formatHomeDate(selectedDate)} 기준 기록이 아직 없어 학생 목록을 표시하지 않습니다.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {isToday ? (
            <button
              type="button"
              onClick={() => onDateChange(shiftDate(getTodayDate(), -1))}
              className="min-h-10 rounded-xl border border-blue-100 bg-white px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              어제 기록 보기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDateChange(getTodayDate())}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            오늘로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: "blue" | "amber" | "emerald" | "red" | "violet" | "slate";
  className?: string;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[tone];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-black leading-5 ring-1",
        className || toneClass,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
