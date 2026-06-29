"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Grid2X2,
  Home,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { LogoutButton } from "@/app/app/logout-button";

export type PrototypeWorkspaceData = {
  academyName: string;
  academyCategory: string;
  userName: string;
  userRole: string;
  canManage: boolean;
  date: string;
  summary: {
    todaySessionCount: number;
    todayStudentCount: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    uncheckedCount: number;
    contactNeedCount: number;
    missingScheduleCount: number;
    activeStudentCount: number;
    classCount: number;
    recentAuditCount: number;
  };
  sessions: Array<{
    id: string;
    title: string;
    time: string;
    teacherLabel: string;
    studentCount: number;
    lateCount: number;
    absentCount: number;
    uncheckedCount: number;
    studentPreviewNames: string[];
  }>;
  attendanceRows: Array<{
    id: string;
    sessionId: string;
    studentId: string;
    studentName: string;
    schoolGrade: string;
    className: string;
    time: string;
    status: string;
    contactStatus: "done" | "needed" | "none";
    maskedPhone: string;
  }>;
  recentLogs: Array<{
    id: string;
    action: string;
    target: string;
    summary: string;
    createdAt: string;
  }>;
};

type TaskGroupId = "attendance" | "messages" | "management" | "records";

type PrototypeTask = {
  id: string;
  groupId: TaskGroupId;
  title: string;
  description: string;
  status: string;
  metric: string;
  detailTitle: string;
  detailDescription: string;
  details: string[];
  href: string;
};

type PrototypeMode = "home" | "attendance";
type HomeNavSelection = "dashboard" | "today" | null;

type SidebarChild =
  | {
      kind: "button";
      id: string;
      title: string;
      description: string;
      taskId: string;
    }
  | {
      kind: "link";
      id: string;
      title: string;
      description: string;
      href: string;
    };

const hopeBlue = "#3a57e8";
const hopeCyan = "#08b1ba";
export function PrototypeWorkspace({ data }: { data: PrototypeWorkspaceData }) {
  const groups = useMemo(() => buildGroups(data), [data]);
  const tasks = useMemo(() => buildTasks(data), [data]);
  const visibleGroups = groups.filter((group) => data.canManage || !group.managerOnly);
  const visibleTasks = tasks.filter((task) => data.canManage || !isManagerTask(task));
  const [searchQuery, setSearchQuery] = useState("");
  const [prototypeMode, setPrototypeMode] = useState<PrototypeMode>("home");
  const [homeNavSelection, setHomeNavSelection] =
    useState<HomeNavSelection>("dashboard");
  const [activeGroup, setActiveGroup] = useState<TaskGroupId>("attendance");
  const [expandedMenuId, setExpandedMenuId] = useState<TaskGroupId | null>("attendance");
  const [selectedTaskId, setSelectedTaskId] = useState(
    visibleTasks.find((task) => task.groupId === "attendance")?.id ?? visibleTasks[0]?.id ?? "",
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const groupTasks =
    normalizedSearchQuery.length > 0
      ? visibleTasks.filter((task) =>
          [task.title, task.description, task.status, task.metric, task.detailTitle, ...task.details]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearchQuery),
        )
      : visibleTasks.filter((task) => task.groupId === activeGroup);
  const selectedTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ?? groupTasks[0] ?? visibleTasks[0];
  const summaryCards = buildSummaryCards(data);
  const sessionBars = buildSessionBars(data);
  const attendanceCompletionRate = getAttendanceCompletionRate(data);

  function toggleMenuGroup(groupId: TaskGroupId) {
    setPrototypeMode("home");
    setHomeNavSelection(null);
    setActiveGroup(groupId);
    setExpandedMenuId((current) => (current === groupId ? null : groupId));
    const firstTask = visibleTasks.find((task) => task.groupId === groupId);
    if (firstTask) setSelectedTaskId(firstTask.id);
  }

  function selectHomeDashboard() {
    setPrototypeMode("home");
    setHomeNavSelection("dashboard");
    setExpandedMenuId(null);
    setActiveGroup("attendance");
    const firstTask = visibleTasks.find((task) => task.groupId === "attendance");
    if (firstTask) setSelectedTaskId(firstTask.id);
  }

  function selectTodayHome() {
    setPrototypeMode("home");
    setHomeNavSelection("today");
    setExpandedMenuId(null);
    setActiveGroup("attendance");
    const todayTask =
      visibleTasks.find((task) => task.id === "today-lessons") ??
      visibleTasks.find((task) => task.groupId === "attendance");
    if (todayTask) setSelectedTaskId(todayTask.id);
  }

  function openAttendancePrototype() {
    setPrototypeMode("attendance");
    setHomeNavSelection(null);
    setActiveGroup("attendance");
    setExpandedMenuId("attendance");
  }

  function selectTask(groupId: TaskGroupId, taskId: string) {
    setPrototypeMode("home");
    setHomeNavSelection(null);
    setActiveGroup(groupId);
    setExpandedMenuId(groupId);
    setSelectedTaskId(taskId);
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] text-[#232d42]">
      <div className="min-h-screen lg:grid lg:grid-cols-[257px_minmax(0,1fr)]">
        <aside className="border-b border-[#e9ecef] bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-[76px] items-center justify-between px-6">
            <Link href="/app/prototype" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3a57e8] text-white shadow-[0_10px_22px_rgba(58,87,232,0.25)]">
                <Grid2X2 size={18} aria-hidden="true" />
              </span>
              <span className="text-[28px] font-semibold tracking-[-0.04em] text-[#232d42]">
                Academy OS
              </span>
            </Link>
            <Link
              href="/app"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#3a57e8] text-white shadow-sm transition hover:bg-[#2f49d6]"
              aria-label="기존 앱으로 이동"
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
          </div>

          <nav className="space-y-6 px-3 pb-8 pt-3">
            <SidebarSection title="운영 홈">
              <SidebarItem
                active={prototypeMode === "home" && homeNavSelection === "dashboard"}
                icon={Grid2X2}
                title="업무 대시보드"
                onClick={selectHomeDashboard}
              />
              <SidebarItem
                active={prototypeMode === "home" && homeNavSelection === "today"}
                icon={Home}
                title="오늘 업무"
                onClick={selectTodayHome}
              />
            </SidebarSection>

            <SidebarSection title="업무 메뉴">
              {visibleGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <SidebarMenuGroup
                    key={group.id}
                    active={homeNavSelection === null && activeGroup === group.id}
                    expanded={expandedMenuId === group.id}
                    icon={Icon}
                    title={group.title}
                    onToggle={() => toggleMenuGroup(group.id)}
                  >
                    {getSidebarChildren(group.id, data.canManage).map((child) =>
                      child.kind === "button" ? (
                        <SidebarSubItem
                          key={child.id}
                          active={
                            (child.id === "attendance-prototype" && prototypeMode === "attendance") ||
                            (prototypeMode === "home" && selectedTaskId === child.taskId)
                          }
                          title={child.title}
                          description={child.description}
                          onClick={() => {
                            if (child.id === "attendance-prototype") openAttendancePrototype();
                            else selectTask(group.id, child.taskId);
                          }}
                        />
                      ) : (
                        <SidebarSubLink
                          key={child.id}
                          href={child.href}
                          title={child.title}
                          description={child.description}
                        />
                      ),
                    )}
                  </SidebarMenuGroup>
                );
              })}
            </SidebarSection>
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-[76px] flex-col gap-3 border-b border-[#e9ecef] bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <label className="flex w-full max-w-[420px] items-center gap-3 rounded border border-[#eee] bg-white px-4 py-2.5 text-[#8a92a6] shadow-sm focus-within:border-[#3a57e8] focus-within:ring-2 focus-within:ring-[#3a57e8]/10">
              <Search size={19} aria-hidden="true" />
              <span className="sr-only">업무 검색</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="출석부, 문자, 학생, 리포트 검색"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#232d42] outline-none placeholder:text-[#8a92a6]"
              />
            </label>
            <div className="flex items-center gap-4">
              <span className="hidden rounded-full bg-[#f2f5ff] px-3 py-1 text-sm font-semibold text-[#3a57e8] sm:inline">
                {formatKoreanDate(data.date)}
              </span>
              <TopIcon
                icon={Home}
                label="업무 홈"
                onClick={selectHomeDashboard}
              />
              <TopIcon icon={Bell} label="알림" />
              <TopIcon icon={Mail} label="메시지" />
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#3a57e8] to-[#85f4f9] text-base font-bold text-white shadow-md">
                  {data.userName.slice(0, 1)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-[#232d42]">{data.userName}</p>
                  <p className="text-xs text-[#8a92a6]">{data.userRole}</p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </header>

          {prototypeMode === "attendance" ? (
            <PrototypeAttendanceWorkbench data={data} />
          ) : (
            <>
          <section className="px-5 py-8 lg:px-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#232d42]">
                  오늘 운영 업무
                </h1>
                <p className="mt-3 max-w-3xl text-[17px] leading-7 text-[#8a92a6]">
                  {data.userName} {data.userRole}님, {data.academyName}의 출석 체크와 연락 필요 업무를
                  실제 처리 화면으로 바로 이어갑니다.
                </p>
              </div>
              <Link
                href="/app?view=history"
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-[#dfe5ef] bg-white px-5 text-sm font-semibold text-[#596579] shadow-sm transition hover:border-[#3a57e8] hover:text-[#3a57e8]"
              >
                <Megaphone size={17} aria-hidden="true" />
                변경 이력 보기
              </Link>
            </div>
          </section>

          <div className="px-4 pb-10 lg:px-10">
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {summaryCards.map((card) => (
                <SummaryCard key={card.title} {...card} />
              ))}
            </section>

            <section className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,2fr)_420px]">
              <div className="min-w-0 space-y-8">
                <Panel className="min-h-[400px]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-2xl font-semibold tracking-[-0.03em] text-[#232d42]">
                        {data.summary.todayStudentCount}명
                      </p>
                      <p className="mt-1 text-sm text-[#8a92a6]">오늘 수업 진행판</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#8a92a6]">
                      <LegendDot color={hopeBlue} label="출석" />
                      <LegendDot color={hopeCyan} label="체크 필요" />
                      <Link href="/app?view=attendance" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3a57e8]">
                        출석부 열기
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-8 space-y-4">
                    {data.sessions.length > 0 ? (
                      data.sessions.slice(0, 6).map((session) => {
                        const checkedCount = Math.max(0, session.studentCount - session.uncheckedCount);
                        const progress = session.studentCount > 0 ? Math.round((checkedCount / session.studentCount) * 100) : 0;
                        return (
                          <Link
                            key={session.id}
                            href="/app?view=attendance"
                            className="grid gap-3 rounded-lg border border-[#e9ecef] bg-[#fbfcff] px-4 py-3 transition hover:border-[#3a57e8]/35 hover:bg-white hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_8rem]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[#232d42]">
                                {session.title}
                              </span>
                              <span className="mt-1 block text-sm text-[#8a92a6]">
                                {session.time} · {session.teacherLabel} · 학생 {session.studentCount}명
                              </span>
                              <span className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#edf0f5]">
                                <span
                                  className="bg-[#3a57e8]"
                                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                />
                              </span>
                            </span>
                            <span className="flex items-center justify-between gap-3 text-sm sm:block sm:text-right">
                              <span className="font-semibold text-[#232d42]">{progress}%</span>
                              <span className="block text-[#8a92a6]">
                                미체크 {session.uncheckedCount}
                              </span>
                            </span>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#d7dce3] px-4 py-10 text-center text-sm text-[#8a92a6]">
                        오늘 등록된 수업이 없습니다.
                      </div>
                    )}
                  </div>
                </Panel>

                <div className="grid gap-8 lg:grid-cols-2">
                  <Panel>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#232d42]">출석 분포</h2>
                      <Link href="/app?view=attendance" className="text-sm font-semibold text-[#3a57e8]">
                        출석부 열기
                      </Link>
                    </div>
                    <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative h-36 w-36 shrink-0 rounded-full border-[10px] border-[#edf0f5] sm:h-40 sm:w-40">
                        <div className="absolute inset-2 rounded-full border-[10px] border-[#3a57e8] border-r-transparent" />
                        <div className="absolute inset-8 rounded-full border-[8px] border-[#85f4f9] border-l-transparent" />
                        <div className="absolute inset-0 grid place-items-center text-center">
                          <span>
                            <span className="block text-2xl font-semibold text-[#232d42]">
                              {attendanceCompletionRate}%
                            </span>
                            <span className="block text-xs text-[#8a92a6]">완료</span>
                          </span>
                        </div>
                      </div>
                      <div className="min-w-[8rem] space-y-4 text-sm sm:space-y-5">
                        <LegendDot color={hopeBlue} label={`출석 ${data.summary.presentCount}`} />
                        <LegendDot color="#f59e0b" label={`지각 ${data.summary.lateCount}`} />
                        <LegendDot color="#ef4444" label={`결석 ${data.summary.absentCount}`} />
                        <LegendDot color="#85f4f9" label={`미체크 ${data.summary.uncheckedCount}`} />
                      </div>
                    </div>
                  </Panel>

                  <Panel>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#232d42]">수업별 체크 현황</h2>
                      <Link href="/app?view=reports" className="text-sm font-semibold text-[#3a57e8]">
                        리포트 보기
                      </Link>
                    </div>
                    <div className="mt-7 flex h-48 items-end gap-5 border-b border-[#e9ecef] px-4">
                      {sessionBars.map((bar) => (
                        <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex h-36 w-full items-end justify-center">
                            <span
                              className="block w-3 rounded-t-full bg-[#3a57e8]"
                              style={{ height: `${Math.max(18, bar.checkedHeight)}px` }}
                            />
                            <span
                              className="block w-3 rounded-t-full bg-[#85f4f9]"
                              style={{ height: `${Math.max(18, bar.uncheckedHeight)}px` }}
                            />
                          </div>
                          <span className="text-xs text-[#8a92a6]">
                            {bar.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>

                <Panel className="overflow-hidden p-0">
                  <div className="flex items-center justify-between px-6 py-5">
                    <div>
                      <h2 className="text-lg font-semibold text-[#232d42]">업무 레코드</h2>
                      <p className="mt-1 text-sm text-[#8a92a6]">
                        {normalizedSearchQuery.length > 0
                          ? `"${searchQuery}" 검색 결과`
                          : "오늘 업무 진입점"}
                      </p>
                    </div>
                    <ChevronDown size={18} className="text-[#232d42]" aria-hidden="true" />
                  </div>
                  <div className="hidden grid-cols-[minmax(0,1.5fr)_7rem_8rem_9rem_5rem] bg-[#f5f6fa] px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#8a92a6] sm:grid">
                    <span>업무</span>
                    <span>상태</span>
                    <span>대상</span>
                    <span>완료율</span>
                    <span className="text-right">실행</span>
                  </div>
                  <div className="divide-y divide-[#eef0f3]">
                    {groupTasks.slice(0, 8).map((task, index) => {
                      const isSelected = selectedTask?.id === task.id;
                      const progress = getTaskProgress(task, data, index);
                      return (
                        <div
                          key={task.id}
                          className={[
                            "grid grid-cols-1 gap-3 px-6 py-4 transition sm:grid-cols-[minmax(0,1.5fr)_7rem_8rem_9rem_5rem] sm:items-center",
                            isSelected ? "bg-[#f8f9ff]" : "bg-white hover:bg-[#fbfcff]",
                          ].join(" ")}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveGroup(task.groupId);
                              setSelectedTaskId(task.id);
                            }}
                            className="flex min-w-0 items-center gap-4 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-[#3a57e8]/30 sm:pr-3"
                          >
                            <span className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded bg-[#eef2ff] text-sm font-bold text-[#3a57e8]">
                              {task.title.slice(0, 1)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[#232d42]">
                                {task.title}
                              </span>
                              <span className="block truncate text-xs text-[#8a92a6]">
                                {task.description}
                              </span>
                            </span>
                          </button>
                          <span className="flex items-center text-sm text-[#232d42]">
                            {task.status}
                          </span>
                          <span className="flex items-center text-sm text-[#232d42]">
                            {task.metric}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-sm text-[#232d42]">
                              {progress}%
                            </span>
                            <span className="h-2 flex-1 rounded-full bg-[#e9ecef]">
                              <span
                                className={[
                                  "block h-2 rounded-full",
                                  progress >= 100 ? "bg-[#1aa053]" : "bg-[#3a57e8]",
                                ].join(" ")}
                                style={{ width: `${progress}%` }}
                              />
                            </span>
                          </span>
                          <Link
                            href={task.href}
                            className="inline-flex min-h-9 items-center justify-center rounded border border-[#d7dce3] px-3 text-sm font-semibold text-[#232d42] transition hover:border-[#3a57e8] hover:text-[#3a57e8]"
                          >
                            열기
                          </Link>
                        </div>
                      );
                    })}
                    {groupTasks.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm text-[#8a92a6]">
                        검색 결과가 없습니다. 출석부, 문자, 학생, 리포트로 검색해보세요.
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </div>

              <aside className="min-w-0 space-y-8">
                <Panel className="overflow-hidden p-0">
                  <div className="relative h-[248px] overflow-hidden bg-gradient-to-br from-[#0048b8] via-[#3a57e8] to-[#85f4f9] p-8 text-white">
                    <div className="absolute -right-14 -top-10 h-48 w-48 rounded-full bg-white/12" />
                    <div className="absolute right-7 top-16 h-14 w-14 rounded-full bg-white/22" />
                    <p className="text-3xl font-bold">운영 큐</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/85">
                      {formatKoreanDate(data.date)}
                    </p>
                    <p className="mt-14 text-2xl font-semibold tracking-[-0.03em]">
                      {selectedTask?.title ?? "업무 선택"}
                    </p>
                    <div className="mt-7 flex justify-between text-sm text-white/90">
                      <span>{data.academyName}</span>
                      <span>{selectedTask?.status ?? "대기"}</span>
                    </div>
                  </div>
                  <div className="space-y-6 px-7 py-7">
                    <div className="grid grid-cols-2 gap-5">
                      <MiniMetric icon={WalletCards} label="재원 학생" value={data.summary.activeStudentCount} />
                      <MiniMetric icon={ClipboardCheck} label="오늘 수업" value={data.summary.todaySessionCount} />
                    </div>
                    <div>
                      <p className="text-3xl font-semibold tracking-[-0.03em] text-[#232d42]">
                        {data.summary.contactNeedCount}명
                      </p>
                      <p className="mt-1 text-sm text-[#08b1ba]">오늘 연락 필요</p>
                      <p className="mt-3 text-sm leading-6 text-[#8a92a6]">
                        {selectedTask?.detailDescription ?? "업무를 선택하면 오른쪽에서 처리 기준을 확인합니다."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Link
                        href={selectedTask?.href ?? "/app"}
                        className="inline-flex min-h-11 items-center justify-center rounded bg-[#3a57e8] text-sm font-semibold text-white transition hover:bg-[#2f49d6]"
                      >
                        선택 업무 열기
                      </Link>
                      <Link
                        href="/app?view=reports"
                        className="inline-flex min-h-11 items-center justify-center rounded bg-[#08b1ba] text-sm font-semibold text-white transition hover:bg-[#079ca4]"
                      >
                        리포트 보기
                      </Link>
                    </div>
                  </div>
                </Panel>

                <Panel className="grid grid-cols-2 divide-x divide-[#e9ecef] py-7">
                  <div className="px-4 text-center">
                    <p className="text-2xl font-semibold text-[#232d42]">
                      {data.summary.todayStudentCount}
                    </p>
                    <p className="mt-1 text-sm text-[#8a92a6]">출석 대상</p>
                  </div>
                  <div className="px-4 text-center">
                    <p className="text-2xl font-semibold text-[#232d42]">
                      {data.summary.classCount}
                    </p>
                    <p className="mt-1 text-sm text-[#8a92a6]">운영 반</p>
                  </div>
                </Panel>

                <Panel>
                  <h2 className="text-lg font-semibold text-[#232d42]">최근 변경 이력</h2>
                  <p className="mt-1 text-sm text-[#1aa053]">↑ 실데이터 기준 최신 업무</p>
                  <div className="mt-6 space-y-7">
                    {(data.recentLogs.length > 0
                      ? data.recentLogs.slice(0, 5)
                      : [
                          {
                            id: "empty-1",
                            action: "attendance",
                            target: "prototype",
                            summary: "오늘 출석부 확인 대기",
                            createdAt: data.date,
                          },
                        ]
                    ).map((log) => (
                      <div key={log.id} className="relative pl-8">
                        <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-[#3a57e8] bg-white" />
                        <span className="absolute bottom-[-1.6rem] left-[7px] top-6 w-px bg-[#e9ecef]" />
                        <p className="font-medium text-[#232d42]">{log.summary}</p>
                        <p className="mt-1 text-sm text-[#8a92a6]">{formatShortDate(log.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </aside>
            </section>
          </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function PrototypeAttendanceWorkbench({
  data,
}: {
  data: PrototypeWorkspaceData;
}) {
  const [currentMonth, setCurrentMonth] = useState(getMonthStart(data.date));
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("month");
  const [selectedSessionId, setSelectedSessionId] = useState(data.sessions[0]?.id ?? "");
  const calendarDays = useMemo(
    () => buildAttendanceCalendarDays(currentMonth, data, selectedDate),
    [currentMonth, data, selectedDate],
  );
  const selectedDay =
    calendarDays.find((day) => day.date === selectedDate) ??
    buildAttendanceCalendarDay(selectedDate, data, selectedDate, isSameMonth(selectedDate, currentMonth));
  const selectedDateSessions = useMemo(
    () => buildCalendarSessionsForDate(data, selectedDate),
    [data, selectedDate],
  );
  const selectedSession =
    selectedDateSessions.find((session) => session.id === selectedSessionId) ??
    selectedDateSessions[0];

  function moveMonth(direction: -1 | 1) {
    setCurrentMonth((previous) => addMonths(previous, direction));
  }

  function selectCalendarDate(date: string) {
    setSelectedDate(date);
    const sessions = buildCalendarSessionsForDate(data, date);
    setSelectedSessionId(sessions[0]?.id ?? "");
  }

  return (
    <>
      <div className="px-4 py-8 lg:px-9">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#232d42]">
              출석부 캘린더
            </h1>
            <p className="mt-2 text-sm text-[#8a92a6]">
              월간 일정을 먼저 보고, 날짜와 수업을 선택해 기존 출석 처리 화면으로 이어갑니다.
            </p>
          </div>
          <Link
            href="/app?view=attendance"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-[#3a57e8] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(58,87,232,0.22)] transition hover:bg-[#2f49d6]"
          >
            <ClipboardCheck size={17} aria-hidden="true" />
            기존 출석부에서 처리
          </Link>
        </div>

        <section className="grid min-h-[720px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe5ef] bg-white shadow-[0_12px_30px_rgba(35,45,66,0.06)]">
            <div className="border-b border-[#eef0f4] px-7 py-7">
              <Link
                href="/app?view=classes"
                className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#5b86f7] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(91,134,247,0.28)] transition hover:bg-[#4d76e4]"
              >
                <Plus size={18} aria-hidden="true" />
                수업 추가
              </Link>
              <div className="mt-7 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#232d42]">
                    오늘 수업
                  </h2>
                  <p className="mt-1 text-sm text-[#8a92a6]">
                    {formatCalendarDateLabel(selectedDate)}
                  </p>
                </div>
                <span className="rounded-full bg-[#f2f5ff] px-3 py-1 text-xs font-semibold text-[#3a57e8]">
                  {selectedDateSessions.length}개
                </span>
              </div>
            </div>

            <div className="max-h-[610px] overflow-y-auto">
              {selectedDateSessions.length > 0 ? (
                <div className="divide-y divide-[#eef0f4]">
                  {selectedDateSessions.map((session, index) => {
                    const active = selectedSession?.id === session.id;
                    return (
                      <button
                        key={`${session.id}-${index}`}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className={[
                          "grid w-full grid-cols-[56px_minmax(0,1fr)] gap-4 px-7 py-6 text-left transition",
                          active ? "bg-[#f6f8ff]" : "bg-white hover:bg-[#fbfcff]",
                        ].join(" ")}
                      >
                        <span className="mt-1 flex flex-col items-center gap-2">
                          <NameAvatar
                            name={session.teacherLabel}
                            size="lg"
                            colorIndex={index}
                          />
                          <span className="text-[10px] font-semibold text-[#8a92a6]">
                            담당
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-base font-semibold text-[#232d42]">
                                {session.title}
                              </span>
                              <span className="mt-1 block text-sm text-[#8a92a6]">
                                {session.time} · {session.teacherLabel}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-[#dfe5ef] px-2 py-1 text-xs font-semibold text-[#5b86f7]">
                              {session.studentCount}명
                            </span>
                          </span>
                          <SessionStatusLine session={session} />
                          <StudentAvatarStack
                            names={session.studentPreviewNames}
                            totalCount={session.studentCount}
                            className="mt-4"
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-7 py-16 text-center text-sm text-[#8a92a6]">
                  선택한 날짜에 등록된 수업이 없습니다.
                </div>
              )}
            </div>

            <div className="border-t border-[#eef0f4] px-7 py-5">
              <Link
                href="/app?view=attendance"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#eef3ff] text-sm font-semibold text-[#3a57e8] transition hover:bg-[#e4ebff]"
              >
                더 보기
              </Link>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe5ef] bg-white shadow-[0_12px_30px_rgba(35,45,66,0.06)]">
            <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <button
                type="button"
                onClick={() => selectCalendarDate(data.date)}
                className="w-fit text-sm font-semibold text-[#8a92a6] transition hover:text-[#3a57e8]"
              >
                Today
              </button>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#596579] transition hover:bg-[#f5f6fa] hover:text-[#232d42]"
                  aria-label="이전 달"
                >
                  <ChevronRight className="rotate-180" size={24} aria-hidden="true" />
                </button>
                <h2 className="min-w-[13rem] text-center text-[28px] font-semibold tracking-[-0.04em] text-[#232d42]">
                  {formatCalendarMonthTitle(currentMonth)}
                </h2>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[#596579] transition hover:bg-[#f5f6fa] hover:text-[#232d42]"
                  aria-label="다음 달"
                >
                  <ChevronRight size={24} aria-hidden="true" />
                </button>
              </div>
              <div className="inline-flex w-fit overflow-hidden rounded-xl border border-[#e2e7f0] bg-white">
                {(["day", "week", "month"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCalendarView(mode)}
                    className={[
                      "min-h-11 px-5 text-sm font-semibold capitalize transition",
                      calendarView === mode
                        ? "bg-[#5b86f7] text-white"
                        : "text-[#596579] hover:bg-[#f5f6fa] hover:text-[#232d42]",
                    ].join(" ")}
                  >
                    {mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 pb-6 sm:px-8">
              <div className="overflow-hidden rounded-2xl border border-[#e5e9f0]">
                <div className="grid grid-cols-7 bg-[#f4f6fb] text-center text-sm font-bold text-[#232d42]">
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((label) => (
                    <div key={label} className="border-r border-[#e5e9f0] px-2 py-4 last:border-r-0">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => selectCalendarDate(day.date)}
                      className={[
                        "group relative min-h-[118px] border-r border-t border-[#e5e9f0] p-3 text-left transition last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b86f7]/40",
                        day.inMonth ? "bg-white hover:bg-[#fbfcff]" : "bg-[#fbfcff] text-[#b7bfcc]",
                        day.isSelected ? "z-10 bg-[#f5f8ff] ring-2 ring-inset ring-[#5b86f7]" : "",
                      ].join(" ")}
                    >
                      {!day.inMonth ? (
                        <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(145deg,transparent_0,transparent_10px,rgba(91,134,247,0.11)_10px,rgba(91,134,247,0.11)_12px)]" />
                      ) : null}
                      <span className="relative flex items-center justify-between">
                        <span
                          className={[
                            "grid h-8 w-8 place-items-center rounded-full text-base font-semibold",
                            day.isToday ? "bg-[#eef3ff] text-[#3a57e8]" : "text-[#232d42]",
                            day.isSelected ? "bg-[#5b86f7] text-white" : "",
                          ].join(" ")}
                        >
                          {day.day}
                        </span>
                        {day.metrics.uncheckedCount > 0 ? (
                          <span className="rounded-full bg-[#fff8ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#d97706]">
                            {day.metrics.uncheckedCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="relative mt-5 block space-y-1.5">
                        {day.eventBars.map((event) => (
                          <span
                            key={event.id}
                            className="block truncate rounded-r-md px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              borderLeft: `3px solid ${event.color}`,
                              backgroundColor: event.background,
                              color: event.color,
                            }}
                          >
                            {event.label}
                          </span>
                        ))}
                      </span>
                      {day.metrics.contactNeedCount > 0 ? (
                        <span className="absolute bottom-3 left-3 h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 rounded-2xl border border-[#e5e9f0] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(35,45,66,0.04)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#8a92a6]">
                    <CalendarDays size={16} aria-hidden="true" />
                    선택 날짜
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#232d42]">
                    {formatCalendarDateLabel(selectedDate)}
                  </p>
                  <p className="mt-1 text-sm text-[#8a92a6]">
                    {selectedSession?.title ?? "수업 없음"} {selectedSession ? `· ${selectedSession.time}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                  <CalendarDetailMetric label="수업" value={selectedDay.metrics.sessionCount} />
                  <CalendarDetailMetric label="학생" value={selectedDay.metrics.studentCount} />
                  <CalendarDetailMetric label="지각" value={selectedDay.metrics.lateCount} tone="amber" />
                  <CalendarDetailMetric label="결석" value={selectedDay.metrics.absentCount} tone="red" />
                  <CalendarDetailMetric label="미체크" value={selectedDay.metrics.uncheckedCount} />
                  <Link
                    href="/app?view=attendance"
                    className="inline-flex min-h-9 items-center rounded-lg bg-[#eef3ff] px-3 text-xs font-bold text-[#3a57e8] transition hover:bg-[#e4ebff]"
                  >
                    처리 화면
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-4 pb-3 text-sm font-medium text-[#8a92a6]">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SidebarItem({
  title,
  icon: Icon,
  active = false,
  onClick,
}: {
  title: string;
  icon: typeof Grid2X2;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-11 w-full items-center justify-between rounded-lg px-4 text-left text-sm font-medium transition",
        active
          ? "bg-[#eef3ff] text-[#3a57e8]"
          : "text-[#8a92a6] hover:bg-[#f5f6fa] hover:text-[#232d42]",
      ].join(" ")}
    >
      <span className="flex items-center gap-4">
        <Icon size={19} aria-hidden="true" />
        {title}
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

function SidebarMenuGroup({
  title,
  icon: Icon,
  active = false,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: typeof Grid2X2;
  active?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          "flex min-h-11 w-full items-center justify-between rounded-lg px-4 text-left text-sm font-semibold transition",
          active || expanded
            ? "border border-[#d8e2ff] bg-[#f3f6ff] text-[#3a57e8]"
            : "border border-transparent text-[#8a92a6] hover:bg-[#f5f6fa] hover:text-[#232d42]",
        ].join(" ")}
      >
        <span className="flex items-center gap-4">
          <Icon size={19} aria-hidden="true" />
          {title}
        </span>
        {expanded ? (
          <ChevronDown size={17} aria-hidden="true" />
        ) : (
          <ChevronRight size={17} aria-hidden="true" />
        )}
      </button>
      {expanded ? (
        <div className="ml-6 mt-2 space-y-1 border-l border-[#e1e5ec] pl-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SidebarSubItem({
  title,
  description,
  active = false,
  onClick,
}: {
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "block w-full rounded-lg px-3 py-2 text-left transition",
        active ? "bg-[#eef3ff] text-[#3a57e8]" : "text-[#8a92a6] hover:bg-[#f5f6fa] hover:text-[#232d42]",
      ].join(" ")}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-current/70">{description}</span>
    </button>
  );
}

function SidebarSubLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-left text-[#8a92a6] transition hover:bg-[#f5f6fa] hover:text-[#232d42]"
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-current/70">{description}</span>
    </Link>
  );
}

function TopIcon({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="hidden h-9 w-9 place-items-center rounded-full text-[#8a92a6] transition hover:bg-[#f5f6fa] hover:text-[#3a57e8] sm:grid"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

function SummaryCard({
  title,
  value,
  color,
  href,
}: {
  title: string;
  value: string;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative z-10 flex min-h-[98px] items-center justify-between gap-3 rounded-2xl border border-[#dfe5ef] bg-white px-5 shadow-[0_10px_24px_rgba(35,45,66,0.05)] transition hover:-translate-y-0.5 hover:border-[#d8e2ff] hover:shadow-[0_14px_30px_rgba(35,45,66,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3a57e8]/30"
      aria-label={`${title} 업무 열기`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-[#8a92a6]">{title}</p>
        <p className="mt-2 whitespace-nowrap text-xl font-semibold text-[#232d42]">{value}</p>
      </div>
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm transition group-hover:scale-105"
        style={{ backgroundColor: color }}
      >
        <ArrowUpRight size={18} aria-hidden="true" />
      </span>
    </Link>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "min-w-0 overflow-hidden rounded-lg bg-white p-5 shadow-[0_12px_32px_rgba(35,45,66,0.08)] sm:p-7",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletCards;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded bg-[#eef2ff] text-[#3a57e8]">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#232d42]">{value}</span>
        <span className="block text-xs text-[#8a92a6]">{label}</span>
      </span>
    </div>
  );
}

function NameAvatar({
  name,
  size = "sm",
  colorIndex,
}: {
  name: string;
  size?: "sm" | "lg";
  colorIndex?: number;
}) {
  const color = getAvatarColor(name, colorIndex);
  const sizeClass =
    size === "lg"
      ? "h-12 w-12 text-sm ring-4 ring-white"
      : "h-7 w-7 text-[11px] ring-2 ring-white";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white shadow-sm ${sizeClass}`}
      style={{ backgroundColor: color }}
      title={name}
      aria-label={name}
    >
      {getNameInitial(name)}
    </span>
  );
}

function StudentAvatarStack({
  names,
  totalCount,
  className = "",
}: {
  names: string[];
  totalCount: number;
  className?: string;
}) {
  const visibleNames = names.slice(0, 3);
  const moreCount = Math.max(0, totalCount - visibleNames.length);
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <span className="flex -space-x-2">
        {visibleNames.length > 0 ? (
          visibleNames.map((name, index) => (
            <NameAvatar key={`${name}-${index}`} name={name} colorIndex={index + 3} />
          ))
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e5e9f0] text-[11px] font-bold text-[#8a92a6] ring-2 ring-white">
            학
          </span>
        )}
      </span>
      {moreCount > 0 ? (
        <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-full border border-[#5b86f7] bg-white px-2 text-[11px] font-bold text-[#5b86f7]">
          {moreCount}+
        </span>
      ) : null}
      <span className="text-xs font-medium text-[#8a92a6]">
        학생 {totalCount}명
      </span>
    </span>
  );
}

function SessionStatusLine({
  session,
}: {
  session: PrototypeWorkspaceData["sessions"][number];
}) {
  const presentCount = Math.max(
    0,
    session.studentCount - session.uncheckedCount - session.lateCount - session.absentCount,
  );
  const visibleItems = [
    { label: "출석", value: presentCount, color: "text-[#1aa053]" },
    { label: "지각", value: session.lateCount, color: "text-[#f59e0b]" },
    { label: "결석", value: session.absentCount, color: "text-[#ef4444]" },
    { label: "미체크", value: session.uncheckedCount, color: "text-[#8a92a6]" },
  ].filter((item) => item.value > 0 || item.label === "미체크");

  return (
    <span className="mt-4 flex flex-wrap gap-1.5">
      {visibleItems.map((item) => (
        <span
          key={item.label}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-[#f5f6fa] px-2 text-[11px] font-semibold text-[#596579]"
        >
          <span className={item.color}>{item.label}</span>
          <span>{item.value}</span>
        </span>
      ))}
    </span>
  );
}

function getNameInitial(name: string) {
  return name.trim().charAt(0) || "?";
}

function getAvatarColor(name: string, forcedIndex?: number) {
  const colors = ["#5b86f7", "#f25bb2", "#6d5dfc", "#08b1ba", "#f97316", "#10b981"];
  if (typeof forcedIndex === "number") return colors[Math.abs(forcedIndex) % colors.length];
  const index = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

type PrototypeCalendarMetrics = {
  sessionCount: number;
  studentCount: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  uncheckedCount: number;
  contactNeedCount: number;
};

type PrototypeCalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  metrics: PrototypeCalendarMetrics;
  eventBars: Array<{
    id: string;
    label: string;
    color: string;
    background: string;
  }>;
};

function CalendarDetailMetric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "amber" | "red";
}) {
  const className =
    tone === "red"
      ? "border-[#ffd9df] bg-[#fff7f8] text-[#dc2626]"
      : tone === "amber"
        ? "border-[#ffe5b8] bg-[#fffaf0] text-[#b45309]"
        : "border-[#e5e9f0] bg-[#fbfcff] text-[#232d42]";
  return (
    <span className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 ${className}`}>
      <span className="text-[11px] font-semibold text-[#8a92a6]">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </span>
  );
}

function buildAttendanceCalendarDays(
  monthDate: string,
  data: PrototypeWorkspaceData,
  selectedDate: string,
): PrototypeCalendarDay[] {
  const [year, month] = monthDate.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const mondayFirstIndex = (firstDay.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month - 1, 1 - mondayFirstIndex + index);
    const isoDate = formatISODate(date);
    return buildAttendanceCalendarDay(isoDate, data, selectedDate, isSameMonth(isoDate, monthDate));
  });
}

function buildAttendanceCalendarDay(
  date: string,
  data: PrototypeWorkspaceData,
  selectedDate: string,
  inMonth: boolean,
): PrototypeCalendarDay {
  const parsedDate = parseISODate(date);
  const metrics = inMonth ? buildCalendarMetricsForDate(data, date) : emptyCalendarMetrics();
  return {
    date,
    day: parsedDate.getDate(),
    inMonth,
    isToday: date === data.date,
    isSelected: date === selectedDate,
    metrics,
    eventBars: inMonth ? buildCalendarEventBars(data, date, metrics) : [],
  };
}

function buildCalendarSessionsForDate(data: PrototypeWorkspaceData, date: string) {
  const metrics = buildCalendarMetricsForDate(data, date);
  if (metrics.sessionCount <= 0) return [];
  const source =
    data.sessions.length > 0
      ? data.sessions
      : [
          {
            id: "empty-session",
            title: "수업 대기",
            time: "16:30-19:00",
            teacherLabel: data.userName,
            studentCount: metrics.studentCount,
            lateCount: metrics.lateCount,
            absentCount: metrics.absentCount,
            uncheckedCount: metrics.uncheckedCount,
            studentPreviewNames: data.attendanceRows
              .slice(0, 4)
              .map((row) => row.studentName),
          },
        ];
  return source.slice(0, metrics.sessionCount).map((session, index) => {
    if (date === data.date) return session;
    const variation = (getDateSeed(date) + index) % 3;
    const studentCount = Math.max(8, session.studentCount + variation - 1);
    const lateCount = variation === 0 ? Math.min(2, studentCount) : 0;
    const absentCount = variation === 1 ? 1 : 0;
    const uncheckedCount = variation === 2 ? Math.min(3, studentCount) : 0;
    return {
      ...session,
      id: `${session.id}-${date}`,
      studentCount,
      lateCount,
      absentCount,
      uncheckedCount,
      studentPreviewNames:
        session.studentPreviewNames.length > 0
          ? session.studentPreviewNames
          : data.attendanceRows
              .filter((row) => row.sessionId === session.id)
              .slice(0, 4)
              .map((row) => row.studentName),
    };
  });
}

function buildCalendarMetricsForDate(
  data: PrototypeWorkspaceData,
  date: string,
): PrototypeCalendarMetrics {
  if (date === data.date) {
    return {
      sessionCount: data.summary.todaySessionCount,
      studentCount: data.summary.todayStudentCount,
      presentCount: data.summary.presentCount,
      lateCount: data.summary.lateCount,
      absentCount: data.summary.absentCount,
      uncheckedCount: data.summary.uncheckedCount,
      contactNeedCount: data.summary.contactNeedCount,
    };
  }
  const weekday = getDayOfWeekFromISODate(date);
  if (weekday === 0) return emptyCalendarMetrics();
  const seed = getDateSeed(date);
  const baseSessionCount = Math.max(1, data.summary.todaySessionCount || data.sessions.length || 4);
  const sessionCount =
    weekday === 6
      ? Math.max(1, Math.round(baseSessionCount * 0.45))
      : Math.max(1, baseSessionCount + ((seed % 3) - 1));
  const averageStudents = Math.max(
    10,
    Math.round((data.summary.todayStudentCount || 60) / Math.max(1, data.summary.todaySessionCount || 4)),
  );
  const studentCount = Math.max(sessionCount * 8, sessionCount * averageStudents + (seed % 5) - 2);
  const lateCount = seed % 4 === 0 ? Math.min(2, studentCount) : seed % 7 === 0 ? 1 : 0;
  const absentCount = seed % 9 === 0 ? 1 : 0;
  const uncheckedCount = seed % 5 === 0 ? Math.max(1, Math.round(studentCount * 0.12)) : 0;
  const contactNeedCount = lateCount + absentCount + (seed % 11 === 0 ? 1 : 0);
  return {
    sessionCount,
    studentCount,
    presentCount: Math.max(0, studentCount - lateCount - absentCount - uncheckedCount),
    lateCount,
    absentCount,
    uncheckedCount,
    contactNeedCount,
  };
}

function buildCalendarEventBars(
  data: PrototypeWorkspaceData,
  date: string,
  metrics: PrototypeCalendarMetrics,
) {
  if (metrics.sessionCount <= 0) return [];
  const palette = [
    { color: "#6d5dfc", background: "#f0edff" },
    { color: "#f25bb2", background: "#fff0f8" },
    { color: "#5b86f7", background: "#edf3ff" },
    { color: "#f97316", background: "#fff3e8" },
  ];
  const source = data.sessions.length > 0 ? data.sessions : [{ id: "session", title: "수업" }];
  const visibleCount = Math.min(2, metrics.sessionCount);
  return Array.from({ length: visibleCount }, (_, index) => {
    const session = source[(getDateSeed(date) + index) % source.length];
    const colors = palette[index % palette.length];
    return {
      id: `${date}-${session.id}-${index}`,
      label: session.title,
      ...colors,
    };
  });
}

function emptyCalendarMetrics(): PrototypeCalendarMetrics {
  return {
    sessionCount: 0,
    studentCount: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    uncheckedCount: 0,
    contactNeedCount: 0,
  };
}

function getMonthStart(date: string) {
  const parsedDate = parseISODate(date);
  return formatISODate(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1));
}

function addMonths(date: string, amount: number) {
  const parsedDate = parseISODate(date);
  return formatISODate(new Date(parsedDate.getFullYear(), parsedDate.getMonth() + amount, 1));
}

function isSameMonth(date: string, monthDate: string) {
  return date.slice(0, 7) === monthDate.slice(0, 7);
}

function parseISODate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatISODate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayOfWeekFromISODate(date: string) {
  return parseISODate(date).getDay();
}

function getDateSeed(date: string) {
  return Number(date.replace(/\D/g, "").slice(-6)) || 1;
}

function formatCalendarMonthTitle(date: string) {
  const parsedDate = parseISODate(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function formatCalendarDateLabel(date: string) {
  const parsedDate = parseISODate(date);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(parsedDate);
}

function getAttendanceCompletionRate(data: PrototypeWorkspaceData) {
  if (data.summary.todayStudentCount <= 0) return 0;
  return Math.round(
    ((data.summary.todayStudentCount - data.summary.uncheckedCount) /
      data.summary.todayStudentCount) *
      100,
  );
}

function buildSessionBars(data: PrototypeWorkspaceData) {
  const source =
    data.sessions.length > 0
      ? data.sessions.slice(0, 10)
      : [
          {
            id: "empty",
            title: "대기",
            time: "",
            teacherLabel: "",
            studentCount: 0,
            lateCount: 0,
            absentCount: 0,
            uncheckedCount: 0,
          },
        ];
  const maxStudents = Math.max(1, ...source.map((session) => session.studentCount));
  return source.map((session, index) => {
    const checkedCount = Math.max(0, session.studentCount - session.uncheckedCount);
    return {
      label: session.time ? session.time.slice(0, 2) : `${index + 1}`,
      checkedHeight: (checkedCount / maxStudents) * 128,
      uncheckedHeight: (session.uncheckedCount / maxStudents) * 128,
    };
  });
}

function getTaskProgress(task: PrototypeTask, data: PrototypeWorkspaceData, fallbackIndex: number) {
  if (task.groupId === "attendance") return getAttendanceCompletionRate(data);
  if (task.id === "late-absence-message" || task.id === "individual-message") {
    if (data.summary.contactNeedCount <= 0) return 100;
    const completedContactCount = Math.max(
      0,
      data.summary.lateCount + data.summary.absentCount - data.summary.contactNeedCount,
    );
    const denominator = Math.max(1, data.summary.lateCount + data.summary.absentCount);
    return Math.round((completedContactCount / denominator) * 100);
  }
  if (task.id === "students" || task.id === "missing-schedule") {
    if (data.summary.activeStudentCount <= 0) return 0;
    return Math.round(
      ((data.summary.activeStudentCount - data.summary.missingScheduleCount) /
        data.summary.activeStudentCount) *
        100,
    );
  }
  if (task.id === "classes") return data.summary.classCount > 0 ? 100 : 0;
  if (task.groupId === "records") return data.summary.recentAuditCount > 0 ? 100 : 60;
  return fallbackIndex % 2 === 0 ? 75 : 60;
}

function buildSummaryCards(data: PrototypeWorkspaceData) {
  return [
    {
      title: "오늘 수업",
      value: `${data.summary.todaySessionCount}개`,
      color: hopeBlue,
      href: "/app?view=attendance",
    },
    {
      title: "출석 대상",
      value: `${data.summary.todayStudentCount}명`,
      color: hopeCyan,
      href: "/app?view=attendance",
    },
    {
      title: "출석 완료",
      value: `${data.summary.presentCount}명`,
      color: hopeBlue,
      href: "/app?view=attendance",
    },
    {
      title: "미체크",
      value: `${data.summary.uncheckedCount}명`,
      color: hopeCyan,
      href: "/app?view=attendance",
    },
    {
      title: "연락 필요",
      value: `${data.summary.contactNeedCount}명`,
      color: hopeBlue,
      href: "/app?view=operations",
    },
    {
      title: "재원 학생",
      value: `${data.summary.activeStudentCount}명`,
      color: hopeCyan,
      href: "/app?view=students",
    },
  ];
}

function buildGroups(data: PrototypeWorkspaceData): Array<{
  id: TaskGroupId;
  title: string;
  description: string;
  icon: typeof ClipboardCheck;
  managerOnly?: boolean;
}> {
  return [
    {
      id: "attendance",
      title: "수업 처리",
      description: `${data.summary.todaySessionCount}개 수업 · ${data.summary.uncheckedCount}명 체크 필요`,
      icon: ClipboardCheck,
    },
    {
      id: "messages",
      title: "문자 처리",
      description: `${data.summary.contactNeedCount}명 연락 필요`,
      icon: MessageSquare,
    },
    {
      id: "management",
      title: "관리",
      description: `학생 ${data.summary.activeStudentCount}명 · 미등록 ${data.summary.missingScheduleCount}명`,
      icon: UsersRound,
      managerOnly: true,
    },
    {
      id: "records",
      title: "운영 기록",
      description: `리포트 · 이력 ${data.summary.recentAuditCount}건`,
      icon: BarChart3,
      managerOnly: true,
    },
  ];
}

function getSidebarChildren(groupId: TaskGroupId, canManage: boolean): SidebarChild[] {
  if (groupId === "attendance") {
    return [
      {
        kind: "button",
        id: "attendance-prototype",
        title: "출석부 prototype",
        description: "Hope UI형 미리보기",
        taskId: "open-attendance",
      },
      {
        kind: "link",
        id: "attendance-current",
        title: "기존 출석부",
        description: "출석·지각·결석 처리",
        href: "/app?view=attendance",
      },
      {
        kind: "button",
        id: "today-lessons",
        title: "오늘 수업",
        description: "수업별 처리 현황",
        taskId: "today-lessons",
      },
    ];
  }
  if (groupId === "messages") {
    return [
      {
        kind: "link",
        id: "operations-current",
        title: "개별 연락",
        description: "학생 검색·문자 초안",
        href: "/app?view=operations",
      },
      {
        kind: "button",
        id: "late-absence-message",
        title: "지각/결석 문자",
        description: "출석부 후처리",
        taskId: "late-absence-message",
      },
      {
        kind: "button",
        id: "contact-history",
        title: "연락 기록",
        description: "저장·테스트 발송 이력",
        taskId: "contact-history",
      },
    ];
  }
  if (groupId === "management" && canManage) {
    return [
      {
        kind: "link",
        id: "students-current",
        title: "학생 관리",
        description: "명단·스케줄",
        href: "/app?view=students",
      },
      {
        kind: "link",
        id: "classes-current",
        title: "클래스 관리",
        description: "반·시간표",
        href: "/app?view=classes",
      },
      {
        kind: "button",
        id: "missing-schedule",
        title: "스케줄 미등록",
        description: "확인 필요 학생",
        taskId: "missing-schedule",
      },
    ];
  }
  if (groupId === "records" && canManage) {
    return [
      {
        kind: "link",
        id: "reports-current",
        title: "리포트",
        description: "요약·CSV",
        href: "/app?view=reports",
      },
      {
        kind: "link",
        id: "history-current",
        title: "변경 이력",
        description: "운영 로그",
        href: "/app?view=history",
      },
    ];
  }
  return [];
}

function buildTasks(data: PrototypeWorkspaceData): PrototypeTask[] {
  return [
    {
      id: "open-attendance",
      groupId: "attendance",
      title: "출석부 열기",
      description: "오늘 수업의 출석, 지각, 결석 상태를 기존 출석부에서 처리합니다.",
      metric: `${data.summary.todaySessionCount}수업`,
      status: data.summary.uncheckedCount > 0 ? "체크 필요" : "정상",
      detailTitle: "오늘 출석 처리",
      detailDescription: "원장과 선생님이 가장 먼저 확인할 업무입니다.",
      details: [
        `출석 대상 ${data.summary.todayStudentCount}명`,
        `출석 ${data.summary.presentCount} · 지각 ${data.summary.lateCount} · 결석 ${data.summary.absentCount}`,
        `미체크 ${data.summary.uncheckedCount}명`,
      ],
      href: "/app?view=attendance",
    },
    {
      id: "today-lessons",
      groupId: "attendance",
      title: "오늘 수업 확인",
      description: "수업 시간, 담당자, 미체크 학생 수를 먼저 보고 출석부로 이동합니다.",
      metric: `${data.sessions.length}개 표시`,
      status: "레코드",
      detailTitle: "수업별 처리 순서",
      detailDescription: "수업 레코드 목록에서 기존 화면으로 연결합니다.",
      details: ["수업별 학생 수 확인", "미체크/지각/결석 기준으로 다음 작업 판단"],
      href: "/app?view=attendance",
    },
    {
      id: "unchecked-students",
      groupId: "attendance",
      title: "체크 필요 학생",
      description: "아직 도착, 지각, 결석 상태가 정리되지 않은 학생을 확인합니다.",
      metric: `${data.summary.uncheckedCount}명`,
      status: data.summary.uncheckedCount > 0 ? "처리 전" : "없음",
      detailTitle: "체크 필요 학생",
      detailDescription: "출석 상태가 비어 있는 학생을 기존 출석부에서 정리합니다.",
      details: [`미체크 ${data.summary.uncheckedCount}명`, "기존 개별 처리 흐름 유지"],
      href: "/app?view=attendance",
    },
    {
      id: "late-absence-message",
      groupId: "messages",
      title: "지각/결석 문자",
      description: "출석부에서 선택한 지각/결석 학생에게 같은 템플릿으로 개별 치환합니다.",
      metric: `${data.summary.contactNeedCount}명`,
      status: data.summary.contactNeedCount > 0 ? "연락 필요" : "대기",
      detailTitle: "지각/결석 문자 처리",
      detailDescription: "학생 이름 변수 치환과 기록 저장/테스트 발송 흐름은 기존 화면에서 확인합니다.",
      details: [`연락 필요 ${data.summary.contactNeedCount}명`, "학생별 {{studentName}} 치환 기준"],
      href: "/app?view=attendance",
    },
    {
      id: "individual-message",
      groupId: "messages",
      title: "개별 연락",
      description: "반과 학생을 검색한 뒤 사유를 선택하고 문자 초안을 확인합니다.",
      metric: "학생 선택",
      status: "기존 기능",
      detailTitle: "개별 연락 workspace",
      detailDescription: "프로토타입에서는 흐름만 보여주고 실제 작성은 기존 문자 화면에서 처리합니다.",
      details: ["반/학생 검색은 문자 화면에 연결", "보강 달력과 문자 초안은 기존 기능 유지"],
      href: "/app?view=operations",
    },
    {
      id: "contact-history",
      groupId: "messages",
      title: "연락 기록",
      description: "저장된 문자 기록과 테스트 발송 결과를 확인합니다.",
      metric: "기록",
      status: "조회",
      detailTitle: "연락 기록 확인",
      detailDescription: "기록은 학생 처리와 문자 검증의 근거로 사용합니다.",
      details: ["최근 연락 기록은 학생 drawer와 문자 화면에서 확인"],
      href: "/app?view=operations",
    },
    {
      id: "students",
      groupId: "management",
      title: "학생 관리",
      description: "학생 상태, 소속 반, 스케줄 등록 여부를 확인합니다.",
      metric: `${data.summary.activeStudentCount}명`,
      status: data.summary.missingScheduleCount > 0 ? "미등록 있음" : "정상",
      detailTitle: "학생 관리",
      detailDescription: "운영 데이터 투입 전 가장 많이 쓰는 관리 업무입니다.",
      details: [
        `재원 학생 ${data.summary.activeStudentCount}명`,
        `스케줄 미등록 ${data.summary.missingScheduleCount}명`,
        "학생 삭제 대신 퇴원 상태 관리 기준 유지",
      ],
      href: "/app?view=students",
    },
    {
      id: "classes",
      groupId: "management",
      title: "클래스 관리",
      description: "반, 시간표, 담당 선생님 배정을 확인합니다.",
      metric: `${data.summary.classCount}개`,
      status: "관리",
      detailTitle: "클래스 관리",
      detailDescription: "반 이름은 CSV 등록과 정확히 맞아야 합니다.",
      details: ["반 이름 불일치 시 일괄 등록에서 확인 필요", "수업 시간표 기준으로 출석부가 구성됩니다."],
      href: "/app?view=classes",
    },
    {
      id: "missing-schedule",
      groupId: "management",
      title: "스케줄 미등록",
      description: "재원 상태지만 수업 스케줄이 없는 학생을 먼저 정리합니다.",
      metric: `${data.summary.missingScheduleCount}명`,
      status: data.summary.missingScheduleCount > 0 ? "조치 필요" : "없음",
      detailTitle: "스케줄 미등록",
      detailDescription: "출석부에 나타나지 않는 학생을 찾기 위한 운영 점검입니다.",
      details: ["반 배정과 주간 스케줄 입력 필요", "실데이터 투입 후 첫 확인 대상입니다."],
      href: "/app?view=students",
    },
    {
      id: "reports",
      groupId: "records",
      title: "리포트",
      description: "출석, 문자, 운영 기록을 CSV와 요약으로 확인합니다.",
      metric: "CSV",
      status: "조회",
      detailTitle: "운영 리포트",
      detailDescription: "원장 확인용 리포트와 감사 로그를 분리해 볼 수 있게 유지합니다.",
      details: ["리포트는 원장/관리자만 접근", "Spring 전환은 로컬 검증 기준으로만 유지"],
      href: "/app?view=reports",
    },
    {
      id: "history",
      groupId: "records",
      title: "변경 이력",
      description: "학생, 반, 정책 변경의 최근 로그를 확인합니다.",
      metric: `${data.summary.recentAuditCount}건`,
      status: "감사",
      detailTitle: "변경 이력",
      detailDescription: "운영 중 누가 어떤 변경을 했는지 확인하는 기록입니다.",
      details: ["최근 변경만 우측 패널에 표시", "상세 목록은 기존 관리 화면에서 확인"],
      href: "/app?view=history",
    },
  ];
}

function isManagerTask(task: PrototypeTask) {
  return task.groupId === "management" || task.groupId === "records";
}

function formatKoreanDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(year, month - 1, day));
}

function formatShortDate(value: string) {
  const dateValue = value.includes("T") ? value.slice(0, 10) : value;
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${month.toString().padStart(2, "0")}.${day.toString().padStart(2, "0")}`;
}
